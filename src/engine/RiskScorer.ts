const CVSS_WEIGHTS = {
  AV:  { N: 0.85, A: 0.62, L: 0.55, P: 0.20 },
  AC:  { L: 0.77, H: 0.44 },
  PR:  { N: 0.85, L: 0.62, H: 0.27 },
  UI:  { N: 0.85, R: 0.62 },
  C:   { N: 0.00, L: 0.22, H: 0.56 },
  I:   { N: 0.00, L: 0.22, H: 0.56 },
  A:   { N: 0.00, L: 0.22, H: 0.56 },
};

export class RiskScorer {
  score(cvssVector: string): number {
    try {
      const parts = cvssVector.split('/').slice(1); // skip CVSS:3.1
      const metrics: { [k: string]: string } = {};
      for (const p of parts) {
        const [k, v] = p.split(':');
        metrics[k] = v;
      }

      const ISCBase =
        1 - (1 - CVSS_WEIGHTS.C[metrics.C as keyof typeof CVSS_WEIGHTS.C]) *
            (1 - CVSS_WEIGHTS.I[metrics.I as keyof typeof CVSS_WEIGHTS.I]) *
            (1 - CVSS_WEIGHTS.A[metrics.A as keyof typeof CVSS_WEIGHTS.A]);

      const ISC = metrics.S === 'C'
        ? 7.52 * (ISCBase - 0.029) - 3.25 * Math.pow(ISCBase - 0.02, 15)
        : 6.42 * ISCBase;

      const exploitability =
        8.22 *
        CVSS_WEIGHTS.AV[metrics.AV as keyof typeof CVSS_WEIGHTS.AV] *
        CVSS_WEIGHTS.AC[metrics.AC as keyof typeof CVSS_WEIGHTS.AC] *
        CVSS_WEIGHTS.PR[metrics.PR as keyof typeof CVSS_WEIGHTS.PR] *
        CVSS_WEIGHTS.UI[metrics.UI as keyof typeof CVSS_WEIGHTS.UI];

      if (ISC <= 0) return 0;

      const base = metrics.S === 'C'
        ? Math.min(1.08 * (ISC + exploitability), 10)
        : Math.min(ISC + exploitability, 10);

      return Math.round(base * 10) / 10;
    } catch (e) {
      return 0;
    }
  }
}
