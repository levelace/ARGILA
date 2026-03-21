import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Terminal as TerminalIcon, 
  Zap, 
  Target as TargetIcon, 
  Activity, 
  Cpu, 
  Lock, 
  Eye, 
  Database, 
  ChevronRight, 
  Search, 
  Settings, 
  Bell,
  Play,
  Square,
  RefreshCw,
  Download,
  AlertCircle,
  Code,
  Globe,
  Server,
  Layers,
  Bug,
  Filter,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { figmaTargets, payloads, Target, Payload } from './data/ares_config';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ExploitChainGraph } from './components/ExploitChainGraph';
import { Finding } from './engine/RuleEngine';
import { ExploitChain } from './engine/ExploitChainBuilder';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const activityData = Array.from({ length: 30 }, (_, i) => ({
  time: i,
  requests: Math.floor(Math.random() * 150) + 50,
  latency: Math.floor(Math.random() * 40) + 5,
  threats: Math.floor(Math.random() * 5),
}));

export default function App() {
  const [activeView, setActiveView] = useState<'dashboard' | 'recon' | 'auditor' | 'payloads' | 'chains' | 'rules' | 'logs'>('dashboard');
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(figmaTargets[0]);
  const [terminalLines, setTerminalLines] = useState<string[]>([
    "[SYSTEM] ARES v3.0.0-SENTINEL Initialized...",
    "[AUTH] Argila Sentinel Level 5 Credentials Verified.",
    "[CORE] Deterministic expert engine ready.",
    "[READY] Waiting for target selection..."
  ]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [foundAnomalies, setFoundAnomalies] = useState<any[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [chains, setChains] = useState<ExploitChain[]>([]);
  const [rules, setRules] = useState<any[]>([]);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const res = await fetch('/api/rules');
        const data = await res.json();
        setRules(data);
      } catch (e) {
        console.error("Failed to fetch rules", e);
      }
    };
    fetchRules();
  }, []);

  const [deepScan, setDeepScan] = useState(false);
  const [stealthMode, setStealthMode] = useState(false);
  const [payloadEncoding, setPayloadEncoding] = useState<'none' | 'base64' | 'hex' | 'url'>('none');
  const [customTarget, setCustomTarget] = useState('');
  const [scanFindings, setScanFindings] = useState<any>(null);
  const [exploitResponse, setExploitResponse] = useState<any>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      addTerminalLine("WebSocket connection established with ARES Core.", "success");
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'LOG') {
        addTerminalLine(msg.line, msg.level);
      } else if (msg.type === 'SCAN_COMPLETE') {
        setIsScanning(false);
        setScanProgress(100);
        setFindings(msg.result.findings);
        setChains(msg.result.chains);
        addTerminalLine(`Scan complete. ${msg.result.findings.length} findings identified.`, "success");
      } else if (msg.type === 'EXPLOIT_RESPONSE') {
        setIsExploiting(false);
        setExploitResponse({
          status: msg.status,
          headers: msg.headers,
          body: msg.body
        });
        addTerminalLine(`Exploit response received: Status ${msg.status}`, msg.status < 400 ? 'success' : 'warn');
      }
    };

    ws.onclose = () => {
      addTerminalLine("WebSocket connection lost.", "error");
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  const addTerminalLine = (line: string, type: 'info' | 'warn' | 'error' | 'success' | 'raw' = 'info') => {
    const prefix = {
      info: "[INFO]",
      warn: "[WARN]",
      error: "[FAIL]",
      success: "[DONE]",
      raw: ">>>"
    }[type];
    setTerminalLines(prev => [...prev.slice(-100), `${prefix} ${line}`]);
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  const startScan = () => {
    if (!selectedTarget || !wsRef.current) return;
    setIsScanning(true);
    setScanProgress(0);
    setFindings([]);
    setChains([]);
    
    wsRef.current.send(JSON.stringify({
      type: 'START_SCAN',
      session: {
        id: `SESSION-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        target: { host: selectedTarget.host },
        deepScan,
        stealth: stealthMode
      }
    }));
  };

  const [isExploiting, setIsExploiting] = useState(false);

  const pipePayload = async (payload: Payload) => {
    if (!selectedTarget || !wsRef.current) return;
    setIsExploiting(true);
    setExploitResponse(null);
    addTerminalLine(`[PIPE] Initiating manual exploit pipe for ${payload.name}...`, 'info');
    
    wsRef.current.send(JSON.stringify({
      type: 'PIPE_PAYLOAD',
      url: selectedTarget.host + selectedTarget.endpoints[0],
      payload: payload.content
    }));
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent)] selection:text-white antialiased">
      {/* Top Navigation Bar */}
      <nav className="h-12 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <Shield className="w-5 h-5" />
            <span className="font-bold tracking-tight text-base">ARGILA SENTINEL</span>
          </div>
          <div className="flex gap-1 text-[11px] font-medium">
            <NavTab active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} label="DASHBOARD" />
            <NavTab active={activeView === 'recon'} onClick={() => setActiveView('recon')} label="RECONNAISSANCE" />
            <NavTab active={activeView === 'auditor'} onClick={() => setActiveView('auditor')} label="AUDITOR" />
            <NavTab active={activeView === 'payloads'} onClick={() => setActiveView('payloads')} label="EXPLOITATION" />
            <NavTab active={activeView === 'chains'} onClick={() => setActiveView('chains')} label="CHAINS" />
            <NavTab active={activeView === 'rules'} onClick={() => setActiveView('rules')} label="POLICIES" />
            <NavTab active={activeView === 'logs'} onClick={() => setActiveView('logs')} label="SYSTEM LOGS" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Deep Scan</span>
              <button 
                onClick={() => setDeepScan(!deepScan)}
                className={cn(
                  "w-8 h-4 rounded-full transition-all relative border border-[var(--border)]",
                  deepScan ? "bg-[var(--accent)]/20" : "bg-black/20"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all",
                  deepScan ? "right-0.5 bg-[var(--accent)]" : "left-0.5 bg-[var(--text-secondary)]"
                )} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Stealth</span>
              <button 
                onClick={() => setStealthMode(!stealthMode)}
                className={cn(
                  "w-8 h-4 rounded-full transition-all relative border border-[var(--border)]",
                  stealthMode ? "bg-[var(--accent)]/20" : "bg-black/20"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all",
                  stealthMode ? "right-0.5 bg-[var(--accent)]" : "left-0.5 bg-[var(--text-secondary)]"
                )} />
              </button>
            </div>
          </div>
          <div className="h-6 w-[1px] bg-[var(--border)]" />
          <div className="flex items-center gap-4 text-[10px] font-medium text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> 14%</div>
            <div className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> 3.1GB</div>
            <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> 128.0.0.1</div>
          </div>
          <div className="h-6 w-[1px] bg-[var(--border)]" />
          <Settings className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors" />
        </div>
      </nav>

      <div className="flex h-[calc(100vh-3rem)]">
        {/* Left Sidebar - Target Grid */}
        <aside className="w-64 border-r border-[var(--border)] bg-[var(--bg)] flex flex-col">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]/50">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Target Inventory</span>
            <Filter className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          </div>
          <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)]/30">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Enter host or IP..." 
                value={customTarget}
                onChange={(e) => setCustomTarget(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customTarget) {
                    const newTarget: Target = {
                      host: customTarget,
                      focus: "Manual Research",
                      vulnerabilityType: "Unknown",
                      endpoints: ["/"],
                      parameters: [],
                      techStack: [],
                      headers: [],
                      riskScore: 0
                    };
                    setSelectedTarget(newTarget);
                    setCustomTarget('');
                  }
                }}
                className="w-full bg-black/20 border border-[var(--border)] text-[11px] p-2.5 rounded focus:outline-none focus:border-[var(--accent)]/50 placeholder:text-[var(--text-secondary)]/50"
              />
              <ArrowRight className="w-3.5 h-3.5 absolute right-3 top-3 text-[var(--text-secondary)]/50" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {figmaTargets.map((target) => (
              <button
                key={target.host}
                onClick={() => setSelectedTarget(target)}
                className={cn(
                  "w-full text-left p-4 border-b border-[var(--border)] transition-all group relative",
                  selectedTarget?.host === target.host ? "bg-[var(--surface)] border-l-4 border-l-[var(--accent)]" : "hover:bg-[var(--surface)]/40"
                )}
              >
                <div className="text-[11px] font-semibold truncate text-[var(--text-primary)] mb-1.5">{target.host}</div>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase font-medium">{target.focus}</div>
                  <div className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded",
                    target.riskScore > 9 ? "text-red-400 bg-red-400/10" : "text-amber-400 bg-amber-400/10"
                  )}>
                    {target.riskScore}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#050506]">
          {/* Workspace Header */}
          <div className="h-14 border-b border-[#1A1A1C] bg-[#0A0A0B]/80 backdrop-blur-md flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded bg-[#1A1A1C] flex items-center justify-center">
                <TargetIcon className="w-4 h-4 text-[#00FF00]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">{selectedTarget?.host}</h2>
                <p className="text-[9px] opacity-40 uppercase tracking-widest">Active Research Session</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={startScan}
                disabled={isScanning}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded text-[10px] font-black uppercase transition-all tracking-widest",
                  isScanning ? "bg-[#1A1A1C] text-white/20" : "bg-[#00FF00] text-black hover:bg-[#00CC00] shadow-[0_0_15px_rgba(0,255,0,0.2)]"
                )}
              >
                {isScanning ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                {isScanning ? "Engaging..." : "Initiate Audit"}
              </button>
            </div>
          </div>

          {/* Workspace Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <AnimatePresence mode="wait">
              {activeView === 'dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Real-time Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <StatBox label="Audit Progress" value={`${scanProgress}%`} sub={isScanning ? "Active" : "Idle"} color="var(--accent)" />
                    <StatBox label="Findings" value={findings.length.toString()} sub="Verified" color="#F43F5E" />
                    <StatBox label="Exploit Chains" value={chains.length.toString()} sub="Correlated" color="#F59E0B" />
                    <StatBox label="Risk Index" value={chains.length > 0 ? Math.max(...chains.map(c => c.maxScore)).toFixed(1) : "0.0"} sub="CVSS 3.1" color="#38BDF8" />
                  </div>

                  {/* Technical Breakdown */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 space-y-6">
                      <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-lg">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-6">Traffic Analysis</h3>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activityData}>
                              <defs>
                                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                              <XAxis dataKey="time" hide />
                              <YAxis hide />
                              <Area type="monotone" dataKey="requests" stroke="var(--accent)" fillOpacity={1} fill="url(#colorRequests)" strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-lg">
                          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4">Technology Stack</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedTarget?.techStack.map(tech => (
                              <span key={tech} className="text-[10px] bg-black/20 px-2.5 py-1 rounded border border-[var(--border)] text-[var(--text-primary)] font-medium">{tech}</span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-lg">
                          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4">Security Headers</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedTarget?.headers.map(header => (
                              <span key={header} className="text-[10px] bg-[var(--accent)]/5 px-2.5 py-1 rounded text-[var(--accent)] border border-[var(--accent)]/20 font-medium">{header}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-lg h-full">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-6">Real-time Anomalies</h3>
                        <div className="space-y-3">
                          {foundAnomalies.length > 0 ? foundAnomalies.map(anom => (
                            <div key={anom.id} className="p-4 bg-red-400/5 border border-red-400/10 rounded-md group cursor-pointer hover:bg-red-400/10 transition-colors">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[10px] font-bold text-red-400">{anom.id}</span>
                                <span className="text-[9px] bg-red-400 text-white px-1.5 py-0.5 rounded font-bold uppercase">{anom.severity}</span>
                              </div>
                              <div className="text-[11px] font-semibold text-[var(--text-primary)]">{anom.type}</div>
                              <div className="text-[10px] text-[var(--text-secondary)] mt-1 truncate font-mono">{anom.endpoint}</div>
                            </div>
                          )) : (
                            <div className="text-center py-12 opacity-30">
                              <Bug className="w-8 h-8 mx-auto mb-3 text-[var(--text-secondary)]" />
                              <p className="text-[10px] font-bold uppercase tracking-widest">No Anomalies Detected</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeView === 'recon' && (
                <motion.div 
                  key="recon"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-lg">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-6">Reconnaissance Matrix</h3>
                    <div className="data-grid">
                      <div className="data-row bg-black/20 border-b border-[var(--border)]">
                        <div className="data-cell text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Target</div>
                        <div className="data-cell text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">IP Address</div>
                        <div className="data-cell text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Stack</div>
                        <div className="data-cell text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Status</div>
                      </div>
                      {figmaTargets.map((target, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedTarget(target)}
                          className={cn(
                            "data-row hover:bg-[var(--accent)]/5 transition-all cursor-pointer border-b border-[var(--border)]/50",
                            selectedTarget?.host === target.host && "bg-[var(--accent)]/10 border-l-2 border-l-[var(--accent)]"
                          )}
                        >
                          <div className="data-cell text-[11px] font-bold text-[var(--text-primary)]">{target.host}</div>
                          <div className="data-cell text-[11px] font-mono text-[var(--text-secondary)]">{target.dnsRecords?.[0]?.value || 'N/A'}</div>
                          <div className="data-cell">
                            <div className="flex gap-1.5">
                              {target.techStack.map(tech => (
                                <span key={tech} className="text-[9px] px-1.5 py-0.5 bg-black/20 rounded border border-[var(--border)] text-[var(--text-secondary)]">{tech}</span>
                              ))}
                            </div>
                          </div>
                          <div className="data-cell">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-400">
                              ACTIVE
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-lg">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-6">DNS Resolution</h3>
                      <div className="space-y-4">
                        {findings.filter(f => f.ruleId === 'DNS-RECON').map((f, i) => (
                          <div key={i} className="p-4 bg-black/20 border border-[var(--border)] rounded-lg">
                            <div className="text-[10px] font-bold text-[var(--accent)] mb-2 uppercase tracking-widest">A Record</div>
                            <div className="text-[12px] font-mono text-[var(--text-primary)]">{(f.evidence as any).ip}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-lg">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-6">Service Fingerprints</h3>
                      <div className="space-y-4">
                        {findings.filter(f => f.ruleId === 'PORT-SCAN').map((f, i) => (
                          <div key={i} className="flex justify-between items-center border-b border-[var(--border)] pb-3">
                            <span className="text-[11px] font-mono text-emerald-400">Port {(f.evidence as any).port}</span>
                            <span className="text-[11px] text-[var(--text-primary)] font-bold">{(f.evidence as any).service}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-lg">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-6">WAF Detection</h3>
                      <div className="space-y-4">
                        {findings.filter(f => f.ruleId === 'WAF-DETECT').map((f, i) => (
                          <div key={i} className="p-4 bg-amber-400/5 border border-amber-400/10 rounded-lg">
                            <div className="text-[10px] font-bold text-amber-400 mb-2 uppercase tracking-widest">Detected</div>
                            <div className="text-[12px] font-bold text-[var(--text-primary)]">{(f.evidence as any).waf}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeView === 'auditor' && (
                <motion.div 
                  key="auditor"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="grid grid-cols-2 gap-6"
                >
                  <div className="space-y-6">
                    <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-lg">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-6">Vulnerability Analysis</h3>
                      <div className="space-y-4">
                        {findings.filter(f => f.severity !== 'INFO').map((f, i) => (
                          <div key={i} className="p-5 bg-red-400/5 border border-red-400/10 rounded-lg group hover:bg-red-400/10 transition-all">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[11px] font-bold text-red-400">{f.ruleId}</span>
                              <span className="text-[10px] bg-red-400 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">{f.severity}</span>
                            </div>
                            <div className="text-[12px] font-bold text-[var(--text-primary)] mb-2">{f.name}</div>
                            <p className="text-[11px] text-[var(--text-secondary)] mb-4 leading-relaxed">{f.description}</p>
                            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                              <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">CVSS: {f.cvssScore?.toFixed(1) || 'N/A'}</div>
                              <button className="text-[10px] font-bold text-[var(--accent)] hover:underline uppercase tracking-wider">View Details</button>
                            </div>
                          </div>
                        ))}
                        {findings.filter(f => f.severity !== 'INFO').length === 0 && (
                          <div className="text-center py-24 opacity-30 border border-dashed border-[var(--border)] rounded-lg">
                            <Search className="w-12 h-12 mx-auto mb-4 text-[var(--text-secondary)]" />
                            <p className="text-[11px] font-bold uppercase tracking-widest">No Critical Vulnerabilities</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-lg">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-6">Asset Intelligence</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
                          <span className="text-[11px] text-[var(--text-secondary)]">Primary Stack</span>
                          <span className="text-[11px] text-[var(--text-primary)] font-bold">{selectedTarget?.techStack[0]}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
                          <span className="text-[11px] text-[var(--text-secondary)]">WAF / Proxy</span>
                          <span className="text-[11px] text-[var(--text-primary)] font-bold">{(findings.find(f => f.ruleId === 'WAF-DETECT')?.evidence as any)?.waf || 'None'}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
                          <span className="text-[11px] text-[var(--text-secondary)]">Service Matrix</span>
                          <div className="flex flex-col items-end gap-1.5">
                            {findings.filter(f => f.ruleId === 'PORT-SCAN').map(f => (
                              <span key={(f.evidence as any).port} className="text-[10px] text-emerald-400 font-mono">
                                Port {(f.evidence as any).port}: {(f.evidence as any).service}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-lg">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-6">Vulnerability Focus</h3>
                      <div className="p-5 bg-red-400/5 border border-red-400/10 rounded-lg">
                        <div className="text-[12px] font-bold text-red-400 mb-2 uppercase tracking-tight">{selectedTarget?.vulnerabilityType}</div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                          Analysis indicates high probability of {selectedTarget?.vulnerabilityType.toLowerCase()} based on stack fingerprints and endpoint patterns.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeView === 'payloads' && (
                <motion.div 
                  key="payloads"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                    {/* Exploit Response Preview */}
                    <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-lg">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Exploit Response Preview</h3>
                        <div className="flex items-center gap-6">
                          {exploitResponse?.waf && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-400/10 text-amber-400 rounded border border-amber-400/20">
                              WAF: {exploitResponse.waf}
                            </span>
                          )}
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Encoding</span>
                            <select 
                              value={payloadEncoding}
                              onChange={(e) => setPayloadEncoding(e.target.value as any)}
                              className="bg-black/40 border border-[var(--border)] text-[10px] px-2 py-1 rounded focus:outline-none focus:border-[var(--accent)]"
                            >
                              <option value="none">NONE</option>
                              <option value="base64">BASE64</option>
                              <option value="hex">HEX</option>
                              <option value="url">URL</option>
                            </select>
                          </div>
                          {exploitResponse && (
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                              exploitResponse.status < 300 ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
                            )}>
                              Status: {exploitResponse.status}
                            </span>
                          )}
                        </div>
                      </div>
                      {exploitResponse ? (
                      <div className="space-y-4">
                        <div className="p-5 bg-black/30 border border-[var(--border)] rounded-lg max-h-[400px] overflow-y-auto custom-scrollbar">
                          <pre className="text-[11px] text-[var(--text-primary)]/80 font-mono whitespace-pre-wrap break-all leading-relaxed">
                            {exploitResponse.body || 'No response body captured.'}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-24 opacity-30 border border-dashed border-[var(--border)] rounded-lg">
                        <TerminalIcon className="w-10 h-10 mx-auto mb-4 text-[var(--text-secondary)]" />
                        <p className="text-[11px] font-bold uppercase tracking-widest">Awaiting Payload Execution</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {payloads.map((payload) => (
                      <div key={payload.name} className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-lg group hover:border-[var(--accent)]/30 transition-all flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1.5">{payload.name}</h3>
                            <div className="flex gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-black/20 rounded border border-[var(--border)] text-[var(--text-secondary)]">{payload.type}</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[var(--accent)]/10 rounded border border-[var(--accent)]/20 text-[var(--accent)]">{payload.technique}</span>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button 
                              onClick={() => pipePayload(payload)}
                              disabled={isExploiting}
                              className="p-2.5 bg-[var(--accent)]/5 hover:bg-[var(--accent)]/20 rounded-md transition-all text-[var(--accent)] border border-[var(--accent)]/20"
                              title="Execute Payload"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                            <button className="p-2.5 bg-black/20 hover:bg-black/40 rounded-md transition-all border border-[var(--border)]">
                              <Code className="w-4 h-4 text-[var(--text-secondary)]" />
                            </button>
                          </div>
                        </div>
                        <div className="bg-black/40 p-5 rounded-lg border border-[var(--border)] font-mono text-[11px] text-emerald-400 break-all mb-6 leading-relaxed flex-1">
                          {payload.content}
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{payload.description}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeView === 'chains' && (
                <motion.div 
                  key="chains"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-lg">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-6">Exploit Chain Correlation</h3>
                    <ExploitChainGraph findings={findings} chains={chains} />
                  </div>

                  <div className="grid grid-cols-2 gap-6 pb-12">
                    {chains.map((chain, idx) => (
                      <div key={idx} className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-lg group hover:border-[var(--accent)]/30 transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold text-[var(--accent)]">{chain.name}</h4>
                          <span className="text-[10px] px-2 py-0.5 bg-red-400/10 text-red-400 rounded font-bold border border-red-400/20">
                            CVSS: {chain.maxScore.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mb-6 leading-relaxed">{chain.description}</p>
                        <div className="space-y-3">
                          {chain.requires.map((req, i) => (
                            <div key={i} className="flex items-center gap-3 text-[11px] text-[var(--text-secondary)]">
                              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                              <span>{req}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {chains.length === 0 && (
                      <div className="col-span-2 text-center py-24 opacity-30 border border-dashed border-[var(--border)] rounded-lg">
                        <Layers className="w-12 h-12 mx-auto mb-4 text-[var(--text-secondary)]" />
                        <p className="text-[11px] font-bold uppercase tracking-widest">No Exploit Chains Identified</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeView === 'rules' && (
                <motion.div 
                  key="rules"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-lg">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-6">Security Policy Browser</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {rules.map(rule => (
                        <div key={rule.id} className="p-5 bg-black/20 border border-[var(--border)] rounded-lg group hover:border-[var(--accent)]/30 transition-all cursor-pointer">
                          <div className="flex justify-between items-start mb-3">
                            <div className="text-[11px] font-bold text-[var(--accent)]">{rule.id}</div>
                            <div className="w-2 h-2 rounded-full bg-emerald-400/40" />
                          </div>
                          <div className="text-[12px] font-bold text-[var(--text-primary)] mb-1.5">{rule.name}</div>
                          <div className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold tracking-wider mb-3">{rule.category} | {rule.severity}</div>
                          <div className="text-[10px] text-[var(--text-secondary)]/60 line-clamp-2 leading-relaxed">{rule.remediation}</div>
                        </div>
                      ))}
                      {rules.length === 0 && (
                        <div className="col-span-3 text-center py-24 opacity-30 border border-dashed border-[var(--border)] rounded-lg">
                          <Shield className="w-12 h-12 mx-auto mb-4 text-[var(--text-secondary)]" />
                          <p className="text-[11px] font-bold uppercase tracking-widest">No Policies Loaded</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeView === 'logs' && (
                <motion.div 
                  key="logs"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-lg h-full flex flex-col overflow-hidden"
                >
                  <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-black/20">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Operational Logs</h3>
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-white/5 rounded-md transition-colors"><Download className="w-4 h-4 text-[var(--text-secondary)]" /></button>
                      <button className="p-2 hover:bg-white/5 rounded-md transition-colors"><RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" /></button>
                    </div>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] space-y-1.5 bg-black/40 custom-scrollbar">
                    {terminalLines.map((line, i) => (
                      <div key={i} className="flex gap-4 group">
                        <span className="text-[var(--text-secondary)]/30 shrink-0 select-none">{new Date().toISOString().split('T')[1].split('Z')[0]}</span>
                        <span className={cn(
                          "break-all",
                          line.includes("[FAIL]") ? "text-red-400" : 
                          line.includes("[WARN]") ? "text-amber-400" :
                          line.includes("[DONE]") ? "text-emerald-400" :
                          "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors"
                        )}>{line}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Terminal - Enhanced */}
          <div className="h-72 border-t border-[var(--border)] bg-[var(--bg)] flex flex-col">
            <div className="h-10 border-b border-[var(--border)] flex items-center justify-between px-6 bg-[var(--surface)]">
              <div className="flex items-center gap-3">
                <TerminalIcon className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">SENTINEL_CORE_ENGINE</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-[10px] font-bold text-[var(--text-secondary)]/50 uppercase tracking-widest">Session: 0x{Math.random().toString(16).substr(2, 4).toUpperCase()}</div>
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/20 border border-red-400/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400/20 border border-amber-400/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/20 border border-emerald-400/40" />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 font-mono text-[11px] leading-relaxed custom-scrollbar bg-black/40">
              {terminalLines.map((line, i) => (
                <div key={i} className={cn(
                  "mb-1 flex gap-4 group",
                  line.includes("[FAIL]") ? "text-red-400" : 
                  line.includes("[WARN]") ? "text-amber-400" :
                  line.includes("[DONE]") ? "text-emerald-400" :
                  line.includes("[SYSTEM]") ? "text-sky-400" :
                  "text-[var(--text-secondary)]/60 group-hover:text-[var(--text-primary)] transition-colors"
                )}>
                  <span className="text-[var(--text-secondary)]/20 shrink-0 select-none">{i.toString().padStart(4, '0')}</span>
                  <span className="break-all">{line}</span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1A1A1C;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #00FF00;
        }
      `}} />
    </div>
  );
}

function NavTab({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "transition-all relative py-2 px-3 rounded-md text-[10px] font-bold tracking-wider",
        active ? "text-[var(--accent)] bg-[var(--accent)]/10" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]"
      )}
    >
      {label}
    </button>
  );
}

function StatBox({ label, value, sub, color }: { label: string, value: string, sub: string, color: string }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-lg relative overflow-hidden group">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">{label}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold tracking-tight" style={{ color }}>{value}</div>
        <div className="text-[10px] font-semibold text-[var(--text-secondary)]/50 uppercase tracking-widest">{sub}</div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-1 opacity-20" style={{ backgroundColor: color }} />
    </div>
  );
}
