export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

interface WafSignature {
  vendor: string;
  indicators: {
    headers?: { [key: string]: string };
    body_pattern?: string;
    status_on_attack?: number;
    block_page_pattern?: string;
  };
}

const WAF_SIGNATURES: WafSignature[] = [
  {
    vendor: 'cloudflare',
    indicators: {
      headers: { 'cf-ray': '*', 'server': 'cloudflare' },
      block_page_pattern: '__cf_chl_',
      status_on_attack: 403,
    }
  },
  {
    vendor: 'akamai',
    indicators: {
      headers: { 'x-check-cacheable': '*' },
      body_pattern: 'AkamaiGHost',
      status_on_attack: 403,
    }
  },
  {
    vendor: 'aws_waf',
    indicators: {
      headers: { 'x-amzn-requestid': '*' },
      body_pattern: 'AWS WAF',
      status_on_attack: 403,
    }
  },
  {
    vendor: 'nginx_modsec',
    indicators: {
      headers: { 'server': 'nginx' },
      body_pattern: 'ModSecurity',
      status_on_attack: 403,
    }
  },
];

export class WafProfiler {
  async fingerprint(host: string, httpClient: { get: (url: string) => Promise<HttpResponse> }): Promise<string | null> {
    try {
      // Step 1: Normal request — observe baseline headers
      const baseline = await httpClient.get(`https://${host}/`);

      // Step 2: Attack canary — XSS probe to trigger WAF
      const canary = await httpClient.get(
        `https://${host}/?q=<script>alert(1)</script>&x=../../../etc/passwd`
      );

      for (const sig of WAF_SIGNATURES) {
        if (this.matches(sig, baseline, canary)) {
          return sig.vendor;
        }
      }
    } catch (e) {
      // Fallback or error handling
    }

    return null; // No known WAF detected
  }

  private matches(
    sig: WafSignature,
    baseline: HttpResponse,
    canary: HttpResponse
  ): boolean {
    const ind = sig.indicators;

    if (ind.status_on_attack && canary.status !== ind.status_on_attack) return false;

    if (ind.headers) {
      for (const [key, val] of Object.entries(ind.headers)) {
        const actual = baseline.headers[key.toLowerCase()];
        if (!actual) return false;
        if (val !== '*' && actual !== val) return false;
      }
    }

    if (ind.body_pattern && !canary.body.includes(ind.body_pattern)) return false;
    if (ind.block_page_pattern && !canary.body.includes(ind.block_page_pattern)) return false;

    return true;
  }
}
