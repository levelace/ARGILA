import dns from 'dns';
import axios from 'axios';
import { RuleEngine, Finding, ProbeResult } from './RuleEngine';
import { PayloadMutator } from './PayloadMutator';
import { WafProfiler, HttpResponse } from './WafProfiler';
import { ExploitChainBuilder, ExploitChain } from './ExploitChainBuilder';
import { RiskScorer } from './RiskScorer';
import { FindingStore } from './FindingStore';
import { LogEmitter, LogCallback } from './LogEmitter';

const dnsPromises = dns.promises;

export interface ScanTarget {
  host: string;
  focus?: string;
}

export interface ScanSession {
  id: string;
  target: ScanTarget;
  deepScan: boolean;
  stealth: boolean;
}

export interface ScanResult {
  sessionId: string;
  target: string;
  findings: Finding[];
  chains: ExploitChain[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export class Orchestrator {
  private emitter: LogEmitter;
  private ruleEngine: RuleEngine;
  private payloadMutator: PayloadMutator;
  private wafProfiler: WafProfiler;
  private chainBuilder: ExploitChainBuilder;
  private scorer: RiskScorer;
  private findings: FindingStore;

  constructor(logCallback: LogCallback) {
    this.emitter = new LogEmitter(logCallback);
    this.ruleEngine = new RuleEngine();
    this.payloadMutator = new PayloadMutator();
    this.wafProfiler = new WafProfiler();
    this.chainBuilder = new ExploitChainBuilder();
    this.scorer = new RiskScorer();
    this.findings = new FindingStore();
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getRules() {
    return this.ruleEngine.getRules();
  }

  async run(session: ScanSession): Promise<ScanResult> {
    this.emitter.info(`[ASE] Argila Sentinel Engine v3.0 — session ${session.id}`);
    this.emitter.info(`[ASE] Target: ${session.target.host} | Mode: ${session.deepScan ? 'DEEP' : 'SURFACE'} | Stealth: ${session.stealth}`);

    const host = session.target.host.replace(/^https?:\/\//, '').split('/')[0];

    // Phase 1: DNS
    this.emitter.info(`PROGRESS:10`);
    this.emitter.info(`[PHASE 1] Starting DNS reconnaissance for ${host}...`);
    try {
      const records: any = {};
      const [a, mx, txt] = await Promise.allSettled([
        dnsPromises.resolve4(host),
        dnsPromises.resolveMx(host),
        dnsPromises.resolveTxt(host)
      ]);

      if (a.status === 'fulfilled') {
        this.emitter.success(`[DNS] A records: ${a.value.join(', ')}`);
        records.a = a.value;
      }
      if (mx.status === 'fulfilled') {
        this.emitter.info(`[DNS] MX records: ${mx.value.map(m => m.exchange).join(', ')}`);
        records.mx = mx.value;
      }
      if (txt.status === 'fulfilled') {
        this.emitter.info(`[DNS] TXT records: ${txt.value.flat().join(' | ')}`);
        records.txt = txt.value;
      }
    } catch (e) {
      this.emitter.warn(`[DNS] Reconnaissance partially failed or host unreachable.`);
    }

    // Phase 2: HTTP Discovery
    this.emitter.info(`PROGRESS:20`);
    this.emitter.info(`[PHASE 2] Probing HTTP/HTTPS endpoints...`);
    const protocols = ['https', 'http'];
    let activeUrl = '';
    let serverHeader = 'Unknown';

    for (const proto of protocols) {
      try {
        const url = `${proto}://${host}`;
        const res = await axios.get(url, { 
          timeout: 5000, 
          validateStatus: () => true,
          headers: { 'User-Agent': 'Argila-Sentinel-Engine/3.0' }
        });
        this.emitter.success(`[HTTP] ${url} is active (Status: ${res.status})`);
        activeUrl = url;
        serverHeader = res.headers['server'] || 'Unknown';
        this.emitter.info(`[HTTP] Server: ${serverHeader}`);
        break;
      } catch (e) {
        this.emitter.warn(`[HTTP] ${proto}://${host} unreachable.`);
      }
    }

    if (!activeUrl) {
      this.emitter.error(`[ASE] Target host is completely unreachable. Aborting scan.`);
      return this.emptyResult(session);
    }

    // Phase 3: WAF Fingerprint
    this.emitter.info(`PROGRESS:30`);
    this.emitter.info(`[PHASE 3] Profiling security perimeter (WAF)...`);
    const wafVendor = await this.wafProfiler.fingerprint(host, {
      get: async (url: string) => {
        const res = await axios.get(url, { 
          timeout: 5000, 
          validateStatus: () => true,
          headers: { 'User-Agent': 'Argila-Sentinel-Engine/3.0' }
        });
        return {
          status: res.status,
          headers: res.headers as any,
          body: typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
        };
      }
    });

    if (wafVendor) {
      this.emitter.warn(`[WAF] Detected: ${wafVendor} — selecting bypass strategy`);
    } else {
      this.emitter.info(`[WAF] No known WAF signatures identified. Direct access probable.`);
    }

    // Phase 4: Endpoint Discovery (Wordlist expansion)
    this.emitter.info(`PROGRESS:40`);
    this.emitter.info(`[PHASE 4] Initiating targeted endpoint discovery...`);
    const wordlist = [
      '/.well-known/openid-configuration',
      '/.well-known/assetlinks.json',
      '/.git/config',
      '/.env',
      '/api/v1/health',
      '/api/v1/users',
      '/admin',
      '/administrator',
      '/login',
      '/authorize',
      '/token',
      '/callback',
      '/config',
      '/info.php',
      '/phpinfo.php',
      '/.htaccess',
      '/robots.txt',
      '/sitemap.xml'
    ];

    if (session.deepScan) {
      wordlist.push(
        '/api/v1/admin',
        '/backup',
        '/v2/authorize',
        '/.aws/credentials',
        '/server-status',
        '/actuator/health'
      );
    }

    const probeResults: ProbeResult[] = [];
    const scanDelay = session.stealth ? 1500 : 300;

    for (const path of wordlist) {
      try {
        const url = `${activeUrl}${path}`;
        this.emitter.info(`[RECON] Probing: ${path}`);

        const res = await axios.get(url, { 
          timeout: 4000,
          validateStatus: () => true,
          headers: {
            'User-Agent': session.stealth
              ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              : 'Argila-Sentinel-Engine/3.0'
          }
        });
        
        if (res.status !== 404) {
          this.emitter.success(`[RECON] Found endpoint: ${path} (Status: ${res.status})`);
          probeResults.push({
            probeId: 'recon_discovery',
            endpoint: path,
            statusCode: res.status,
            responseHeaders: res.headers as any,
            responseBody: typeof res.data === 'string' ? res.data : JSON.stringify(res.data),
            params: { query: {} }
          });
        }
      } catch (e) {
        this.emitter.warn(`[RECON] Skip path ${path}: Unreachable or timed out`);
      } finally {
        await this.sleep(scanDelay);
      }
    }

    // Phase 5: Vulnerability Analysis
    this.emitter.info(`PROGRESS:60`);
    this.emitter.info(`[PHASE 5] Running intensive rule engine against ${probeResults.length} endpoints...`);
    for (const probe of probeResults) {
      this.emitter.info(`[AUDIT] Evaluating: ${probe.endpoint}`);
      const newFindings = this.ruleEngine.evaluate(probe);
      for (const finding of newFindings) {
        finding.cvssScore = this.scorer.score(finding.cvss);
        this.findings.add(finding);
        this.emitter.success(`[FIND] ${finding.ruleId}: ${finding.name} — CVSS ${finding.cvssScore}`);
      }
      if (session.deepScan) await this.sleep(100);
    }

    // Phase 6: Exploit Chain Correlation
    this.emitter.info(`PROGRESS:85`);
    this.emitter.info(`[PHASE 6] Performing exploit chain correlation...`);
    const chains = this.chainBuilder.buildChains(this.findings.all());
    for (const chain of chains) {
      this.emitter.success(`[CHAIN] ${chain.id}: ${chain.name} — ${chain.severity}`);
    }

    const finalResult: ScanResult = {
      sessionId: session.id,
      target: host,
      findings: this.findings.all(),
      chains,
      summary: {
        critical: this.findings.bySeverity('CRITICAL').length,
        high:     this.findings.bySeverity('HIGH').length,
        medium:   this.findings.bySeverity('MEDIUM').length,
        low:      this.findings.bySeverity('LOW').length,
      }
    };

    this.emitter.info(`PROGRESS:100`);
    this.emitter.info(`[ASE] Audit complete. ${finalResult.findings.length} findings, ${finalResult.chains.length} chains.`);
    return finalResult;
  }

  private emptyResult(session: ScanSession): ScanResult {
    return {
      sessionId: session.id,
      target: session.target.host,
      findings: [],
      chains: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0 }
    };
  }
}
