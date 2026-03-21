import { Finding } from './RuleEngine';

export class FindingStore {
  private findings: Finding[] = [];

  add(finding: Finding) {
    if (!this.findings.some(f => f.ruleId === finding.ruleId && f.endpoint === finding.endpoint)) {
      this.findings.push(finding);
    }
  }

  all(): Finding[] {
    return [...this.findings];
  }

  bySeverity(severity: string): Finding[] {
    return this.findings.filter(f => f.severity === severity);
  }

  clear() {
    this.findings = [];
  }
}
