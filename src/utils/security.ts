
export const encodePayload = (payload: string, format: 'base64' | 'hex' | 'url' | 'none' = 'none'): string => {
  switch (format) {
    case 'base64':
      return Buffer.from(payload).toString('base64');
    case 'hex':
      return Buffer.from(payload).toString('hex');
    case 'url':
      return encodeURIComponent(payload);
    default:
      return payload;
  }
};

export const detectWAF = (headers: Record<string, string>): string | null => {
  const headerKeys = Object.keys(headers).map(k => k.toLowerCase());
  const headerValues = Object.values(headers).map(v => v.toLowerCase());

  // Cloudflare
  if (headerKeys.includes('cf-ray') || headerValues.some(v => v.includes('cloudflare'))) return 'Cloudflare WAF';
  
  // Akamai
  if (headerKeys.includes('x-akamai-transformed') || headerKeys.includes('akamai-grn')) return 'Akamai Kona Site Defender';
  
  // AWS WAF
  if (headerKeys.includes('x-amz-cf-id') || headerValues.some(v => v.includes('aws-waf'))) return 'AWS WAF';
  
  // Azure WAF
  if (headerKeys.includes('x-ms-request-id') || headerValues.some(v => v.includes('azure-waf'))) return 'Azure WAF';
  
  // Imperva
  if (headerKeys.includes('x-iinfo') || headerKeys.includes('incap-ses')) return 'Imperva Incapsula';

  // Generic/Other
  if (headerValues.some(v => v.includes('waf') || v.includes('shield') || v.includes('firewall'))) return 'Generic WAF Detected';

  return null;
};

export const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
  "ARES-Sentinel/2.5.0 (Security Audit Tool; +https://ares-sentinel.io)"
];

export const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];
