import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

export interface ProbeResult {
  probeId: string;
  endpoint: string;
  statusCode: number;
  responseHeaders: Record<string, string>;
  responseBody: string;
  params?: {
    query?: Record<string, string>;
    body?: Record<string, string>;
  };
  [key: string]: any;
}

export interface Finding {
  ruleId: string;
  name: string;
  severity: string;
  cvss: string;
  cvssScore?: number;
  category: string;
  endpoint: string;
  description: string;
  evidence: any;
  remediation: string;
  references: string[];
  timestamp: string;
}

interface Rule {
  id: string;
  name: string;
  severity: string;
  cvss: string;
  category: string;
  description: string;
  conditions: Condition[];
  remediation: string;
  references: string[];
  requires_probe?: string;
}

interface Condition {
  type: string;
  [key: string]: any;
}

export class RuleEngine {
  private rules: Rule[] = [];

  constructor() {
    const rulesDir = path.resolve(process.cwd(), 'src/data/rules');
    if (fs.existsSync(rulesDir)) {
      fs.readdirSync(rulesDir)
        .filter(f => f.endsWith('.yaml'))
        .forEach(f => {
          try {
            const loaded = yaml.load(fs.readFileSync(path.join(rulesDir, f), 'utf8')) as Rule[];
            if (Array.isArray(loaded)) {
              this.rules.push(...loaded);
            }
          } catch (e) {
            console.error(`[ASE] Error loading rule file ${f}:`, e);
          }
        });
    }
  }

  getRules(): Rule[] {
    return this.rules;
  }

  evaluate(probeResult: ProbeResult): Finding[] {
    const findings: Finding[] = [];

    for (const rule of this.rules) {
      if (rule.requires_probe && probeResult.probeId !== rule.requires_probe) continue;

      if (this.allConditionsMet(rule.conditions, probeResult)) {
        findings.push({
          ruleId: rule.id,
          name: rule.name,
          severity: rule.severity,
          cvss: rule.cvss,
          category: rule.category,
          description: rule.description,
          endpoint: probeResult.endpoint,
          evidence: this.extractEvidence(rule.conditions, probeResult),
          remediation: rule.remediation,
          references: rule.references,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return findings;
  }

  private allConditionsMet(conditions: Condition[], result: ProbeResult): boolean {
    return conditions.every(c => this.evaluateCondition(c, result));
  }

  private evaluateCondition(c: Condition, r: ProbeResult): boolean {
    try {
      switch (c.type) {
        case 'status_code':
          return c.operator === 'in'
            ? c.values.includes(r.statusCode)
            : r.statusCode === c.value;

        case 'response_match':
          const target = r[c.target as keyof ProbeResult] as string ?? '';
          return new RegExp(c.pattern, 'i').test(target);

        case 'param_reflection':
          return c.in.some((loc: string) =>
            (r.params?.[loc as 'query' | 'body'] ?? {})[c.param] !== undefined
          );

        case 'param_absent':
          return c.in.every((loc: string) =>
            !(r.params?.[loc as 'query' | 'body'] ?? {})[c.param]
          ) && new RegExp(c.endpoint_pattern ?? '').test(r.endpoint);

        case 'not_contains':
          return !(r[c.target as keyof ProbeResult] as string ?? '').includes(c.value);

        case 'header_absent':
          return !r.responseHeaders?.[c.header.toLowerCase()];

        case 'header_value':
          const hv = r.responseHeaders?.[c.header.toLowerCase()] ?? '';
          return c.operator === 'contains'
            ? hv.includes(c.value)
            : hv === c.value;

        case 'or':
          return c.sub.some((sub: Condition) => this.evaluateCondition(sub, r));

        case 'and':
          return c.sub.every((sub: Condition) => this.evaluateCondition(sub, r));

        default:
          return false;
      }
    } catch (e) {
      return false;
    }
  }

  private extractEvidence(conditions: Condition[], r: ProbeResult): string {
    const parts: string[] = [];
    for (const c of conditions) {
      if (c.type === 'status_code') parts.push(`HTTP ${r.statusCode}`);
      if (c.type === 'response_match') parts.push(`Match: ${c.pattern} in ${c.target}`);
      if (c.type === 'header_absent') parts.push(`Missing header: ${c.header}`);
    }
    return parts.join(' | ') || 'Conditions met via probe analysis';
  }
}
