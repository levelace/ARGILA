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
  const [activeView, setActiveView] = useState<'dashboard' | 'recon' | 'auditor' | 'payloads' | 'logs'>('dashboard');
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(figmaTargets[0]);
  const [terminalLines, setTerminalLines] = useState<string[]>([
    "[SYSTEM] ARES v2.5.0-PRO Initialized...",
    "[AUTH] SecOps Level 5 Credentials Verified.",
    "[CORE] Multi-threaded auditing engine ready.",
    "[READY] Waiting for target selection..."
  ]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [foundAnomalies, setFoundAnomalies] = useState<any[]>([]);
  const [deepScan, setDeepScan] = useState(false);
  const [stealthMode, setStealthMode] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const addTerminalLine = (line: string, type: 'info' | 'warn' | 'error' | 'success' | 'raw' = 'info') => {
    const prefix = {
      info: "[INFO]",
      warn: "[WARN]",
      error: "[ERR!]",
      success: "[OK!!]",
      raw: ">>>"
    }[type];
    setTerminalLines(prev => [...prev.slice(-100), `${prefix} ${line}`]);
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  const startScan = async () => {
    if (!selectedTarget) return;
    setIsScanning(true);
    setScanProgress(0);
    setFoundAnomalies([]);
    addTerminalLine(`[CORE] Initializing expert audit for ${selectedTarget.host}...`, 'info');
    
    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          targetHost: selectedTarget.host,
          deepScan: deepScan
        })
      });

      if (!response.ok) throw new Error('Failed to connect to ARES Core Engine');

      const data = await response.json();
      
      // Simulate real-time log streaming for UX
      let currentLog = 0;
      const logInterval = setInterval(() => {
        if (currentLog < data.logs.length) {
          const log = data.logs[currentLog];
          const type = log.includes('[WARN]') ? 'warn' : 
                       log.includes('[ERR!]') ? 'error' : 
                       log.includes('[OK!!]') ? 'success' : 'info';
          addTerminalLine(log.replace(/\[(INFO|WARN|ERR!|OK!!)\] /, ''), type);
          setScanProgress(Math.round(((currentLog + 1) / data.logs.length) * 100));
          currentLog++;
        } else {
          clearInterval(logInterval);
          setFoundAnomalies(data.anomalies);
          setIsScanning(false);
          addTerminalLine(`[CORE] Audit complete. ${data.anomalies.length} high-risk vectors identified.`, 'success');
        }
      }, 200);

    } catch (error) {
      console.error('Audit error:', error);
      addTerminalLine(`[ERR!] Critical failure in ARES Core Engine: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setIsScanning(false);
    }
  };

  const [isExploiting, setIsExploiting] = useState(false);

  const pipePayload = async (payload: Payload) => {
    if (!selectedTarget) return;
    setIsExploiting(true);
    addTerminalLine(`[PIPE] Initiating manual exploit pipe for ${payload.name}...`, 'info');
    
    try {
      const response = await fetch('/api/exploit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          targetHost: selectedTarget.host,
          endpoint: selectedTarget.endpoints[0],
          payload: payload,
          stealthMode: stealthMode
        })
      });

      const data = await response.json();
      
      data.logs.forEach((log: string, i: number) => {
        setTimeout(() => {
          const type = log.includes('[OK!!]') ? 'success' : 'info';
          addTerminalLine(log.replace(/\[(INFO|WARN|ERR!|OK!!|PIPE|DATA)\] /, ''), type);
          if (i === data.logs.length - 1) setIsExploiting(false);
        }, i * 150);
      });

    } catch (error) {
      addTerminalLine(`[ERR!] Pipe failure: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setIsExploiting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050506] text-[#E0E0E0] font-mono selection:bg-[#00FF00] selection:text-black antialiased">
      {/* Top Navigation Bar */}
      <nav className="h-12 border-b border-[#1A1A1C] bg-[#0A0A0B] flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[#00FF00]">
            <Zap className="w-4 h-4 fill-[#00FF00]" />
            <span className="font-black tracking-tighter text-sm italic">ARES PRO</span>
          </div>
          <div className="flex gap-4 text-[10px] uppercase tracking-widest font-bold">
            <NavTab active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} label="Overview" />
            <NavTab active={activeView === 'recon'} onClick={() => setActiveView('recon')} label="Recon" />
            <NavTab active={activeView === 'auditor'} onClick={() => setActiveView('auditor')} label="Auditor" />
            <NavTab active={activeView === 'payloads'} onClick={() => setActiveView('payloads')} label="Payloads" />
            <NavTab active={activeView === 'logs'} onClick={() => setActiveView('logs')} label="Raw Logs" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-bold opacity-30 uppercase tracking-widest">Deep Scan</span>
              <button 
                onClick={() => setDeepScan(!deepScan)}
                className={cn(
                  "w-6 h-3 rounded-full transition-all relative border border-[#1A1A1C]",
                  deepScan ? "bg-[#00FF00]/20" : "bg-black"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-2 h-2 rounded-full transition-all",
                  deepScan ? "right-0.5 bg-[#00FF00]" : "left-0.5 bg-white/20"
                )} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-bold opacity-30 uppercase tracking-widest">Stealth</span>
              <button 
                onClick={() => setStealthMode(!stealthMode)}
                className={cn(
                  "w-6 h-3 rounded-full transition-all relative border border-[#1A1A1C]",
                  stealthMode ? "bg-[#00FF00]/20" : "bg-black"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-2 h-2 rounded-full transition-all",
                  stealthMode ? "right-0.5 bg-[#00FF00]" : "left-0.5 bg-white/20"
                )} />
              </button>
            </div>
          </div>
          <div className="h-4 w-[1px] bg-[#1A1A1C]" />
          <div className="flex items-center gap-4 text-[9px] font-bold opacity-40">
            <div className="flex items-center gap-1"><Cpu className="w-3 h-3" /> 14%</div>
            <div className="flex items-center gap-1"><Database className="w-3 h-3" /> 3.1GB</div>
            <div className="flex items-center gap-1"><Globe className="w-3 h-3" /> 128.0.0.1</div>
          </div>
          <div className="h-4 w-[1px] bg-[#1A1A1C]" />
          <Settings className="w-4 h-4 opacity-30 hover:opacity-100 cursor-pointer transition-opacity" />
        </div>
      </nav>

      <div className="flex h-[calc(100vh-3rem)]">
        {/* Left Sidebar - Target Grid */}
        <aside className="w-64 border-r border-[#1A1A1C] bg-[#080809] flex flex-col">
          <div className="p-3 border-b border-[#1A1A1C] flex items-center justify-between bg-[#0D0D0F]">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-30">Target Matrix</span>
            <Filter className="w-3 h-3 opacity-30" />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {figmaTargets.map((target) => (
              <button
                key={target.host}
                onClick={() => setSelectedTarget(target)}
                className={cn(
                  "w-full text-left p-3 border-b border-[#1A1A1C] transition-all group relative",
                  selectedTarget?.host === target.host ? "bg-[#111113] border-l-2 border-l-[#00FF00]" : "hover:bg-[#111113]/50"
                )}
              >
                <div className="text-[10px] font-bold truncate text-white/90 mb-1">{target.host}</div>
                <div className="flex items-center justify-between">
                  <div className="text-[8px] opacity-30 uppercase tracking-tight">{target.focus}</div>
                  <div className={cn(
                    "text-[8px] font-bold px-1 rounded",
                    target.riskScore > 9 ? "text-red-500 bg-red-500/10" : "text-yellow-500 bg-yellow-500/10"
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
                    <StatBox label="Audit Progress" value={`${scanProgress}%`} sub={isScanning ? "Active" : "Idle"} color="#00FF00" />
                    <StatBox label="Risk Index" value={selectedTarget?.riskScore.toString() || "0"} sub="CVSS 3.1" color="#FF4444" />
                    <StatBox label="Anomalies" value={foundAnomalies.length.toString()} sub="Verified" color="#FFAA00" />
                    <StatBox label="Latency" value="14ms" sub="Avg Response" color="#00AAFF" />
                  </div>

                  {/* Technical Breakdown */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 space-y-6">
                      <div className="bg-[#0A0A0B] border border-[#1A1A1C] p-5 rounded">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 mb-6">Traffic Analysis</h3>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activityData}>
                              <defs>
                                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#00FF00" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#00FF00" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1C" vertical={false} />
                              <XAxis dataKey="time" hide />
                              <YAxis hide />
                              <Area type="stepAfter" dataKey="requests" stroke="#00FF00" fillOpacity={1} fill="url(#colorRequests)" strokeWidth={1} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#0A0A0B] border border-[#1A1A1C] p-5 rounded">
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 mb-4">Tech Stack</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedTarget?.techStack.map(tech => (
                              <span key={tech} className="text-[9px] bg-[#1A1A1C] px-2 py-1 rounded text-white/60 border border-white/5">{tech}</span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-[#0A0A0B] border border-[#1A1A1C] p-5 rounded">
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 mb-4">Critical Headers</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedTarget?.headers.map(header => (
                              <span key={header} className="text-[9px] bg-[#00FF00]/5 px-2 py-1 rounded text-[#00FF00] border border-[#00FF00]/10">{header}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-[#0A0A0B] border border-[#1A1A1C] p-5 rounded h-full">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 mb-6">Anomaly Feed</h3>
                        <div className="space-y-3">
                          {foundAnomalies.length > 0 ? foundAnomalies.map(anom => (
                            <div key={anom.id} className="p-3 bg-red-500/5 border border-red-500/20 rounded group cursor-pointer hover:bg-red-500/10 transition-colors">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] font-bold text-red-500">{anom.id}</span>
                                <span className="text-[8px] bg-red-500 text-white px-1 rounded">{anom.severity}</span>
                              </div>
                              <div className="text-[10px] font-bold text-white/80">{anom.type}</div>
                              <div className="text-[8px] opacity-40 mt-1 truncate">{anom.endpoint}</div>
                            </div>
                          )) : (
                            <div className="text-center py-12 opacity-20">
                              <Bug className="w-8 h-8 mx-auto mb-2" />
                              <p className="text-[10px] uppercase tracking-widest">No Anomalies</p>
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
                  className="grid grid-cols-2 gap-6"
                >
                  <div className="space-y-6">
                    <div className="bg-[#0A0A0B] border border-[#1A1A1C] p-6 rounded">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 mb-6">Endpoint Enumeration</h3>
                      <div className="space-y-2">
                        {selectedTarget?.endpoints.map(ep => (
                          <div key={ep} className="flex items-center justify-between p-2 bg-[#050506] border border-[#1A1A1C] rounded group hover:border-[#00FF00]/20 transition-all">
                            <span className="text-[10px] text-white/80 font-mono">{ep}</span>
                            <span className="text-[8px] px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded font-bold">200 OK</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#0A0A0B] border border-[#1A1A1C] p-6 rounded">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 mb-6">Subdomain Matrix</h3>
                      <div className="space-y-2">
                        {selectedTarget?.subdomains?.map(sub => (
                          <div key={sub} className="flex items-center justify-between p-2 bg-[#050506] border border-[#1A1A1C] rounded group hover:border-[#00FF00]/20 transition-all">
                            <span className="text-[10px] text-white/80 font-mono">{sub}</span>
                            <div className="flex gap-2">
                              <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded font-bold">ACTIVE</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#0A0A0B] border border-[#1A1A1C] p-6 rounded">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 mb-6">DNS Intelligence</h3>
                      <div className="space-y-2">
                        {selectedTarget?.dnsRecords?.map((record, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-[#050506] border border-[#1A1A1C] rounded text-[10px] font-mono">
                            <span className="text-[#00FF00]/60">{record.type}</span>
                            <span className="text-white/40 truncate ml-4">{record.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#0A0A0B] border border-[#1A1A1C] p-6 rounded">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 mb-6">Directory Map</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedTarget?.directories?.map(dir => (
                          <div key={dir} className="p-2 bg-[#050506] border border-[#1A1A1C] rounded text-[10px] font-mono text-[#00FF00]/40">
                            {dir}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-[#0A0A0B] border border-[#1A1A1C] p-6 rounded">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 mb-6">Infrastructure Intelligence</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-[#1A1A1C] pb-2">
                          <span className="text-[10px] opacity-40">Primary Stack</span>
                          <span className="text-[10px] text-white font-bold">{selectedTarget?.techStack[0]}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-[#1A1A1C] pb-2">
                          <span className="text-[10px] opacity-40">WAF / Proxy</span>
                          <span className="text-[10px] text-white font-bold">{selectedTarget?.waf || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-[#1A1A1C] pb-2">
                          <span className="text-[10px] opacity-40">Service Versions</span>
                          <div className="flex flex-col items-end gap-1">
                            {selectedTarget?.serviceVersions?.map(sv => (
                              <span key={sv.port} className="text-[10px] text-[#00FF00] font-mono">
                                Port {sv.port}: {sv.service} ({sv.version})
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between items-center border-b border-[#1A1A1C] pb-2">
                          <span className="text-[10px] opacity-40">IP Address</span>
                          <span className="text-[10px] text-[#00FF00] font-mono">104.16.24.5</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#0A0A0B] border border-[#1A1A1C] p-6 rounded">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 mb-6">Vulnerability Focus</h3>
                      <div className="p-4 bg-red-500/5 border border-red-500/20 rounded">
                        <div className="text-[11px] font-bold text-red-500 mb-2 uppercase tracking-tighter">{selectedTarget?.vulnerabilityType}</div>
                        <p className="text-[10px] opacity-40 leading-relaxed">
                          Expert analysis indicates a high probability of {selectedTarget?.vulnerabilityType.toLowerCase()} due to the identified tech stack and endpoint patterns.
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
                  className="grid grid-cols-2 gap-4"
                >
                  {payloads.map((payload) => (
                    <div key={payload.name} className="bg-[#0A0A0B] border border-[#1A1A1C] p-5 rounded group hover:border-[#00FF00]/30 transition-all flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xs font-bold text-white mb-1">{payload.name}</h3>
                          <div className="flex gap-2">
                            <span className="text-[8px] uppercase tracking-widest px-1.5 py-0.5 bg-[#1A1A1C] rounded text-white/50">{payload.type}</span>
                            <span className="text-[8px] uppercase tracking-widest px-1.5 py-0.5 bg-[#00FF00]/10 rounded text-[#00FF00]">{payload.technique}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => pipePayload(payload)}
                            disabled={isExploiting}
                            className="p-2 hover:bg-[#00FF00]/10 rounded transition-colors text-[#00FF00]/40 hover:text-[#00FF00]"
                            title="Pipe to Target"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <button className="p-2 hover:bg-[#1A1A1C] rounded transition-colors">
                            <Code className="w-4 h-4 opacity-20 group-hover:opacity-100" />
                          </button>
                        </div>
                      </div>
                      <div className="bg-[#050506] p-4 rounded border border-[#1A1A1C] font-mono text-[10px] text-[#00FF00] break-all mb-4 leading-relaxed flex-1">
                        {payload.content}
                      </div>
                      <p className="text-[10px] opacity-40 leading-relaxed">{payload.description}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Terminal - Enhanced */}
          <div className="h-72 border-t border-[#1A1A1C] bg-[#080809] flex flex-col">
            <div className="h-8 border-b border-[#1A1A1C] flex items-center justify-between px-4 bg-[#0D0D0F]">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-3 h-3 text-[#00FF00]" />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">ARES_CORE_ENGINE</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-[8px] font-bold text-[#00FF00]/50 uppercase tracking-widest">Thread: 0x4F2A</div>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/30" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/30" />
                  <div className="w-2 h-2 rounded-full bg-green-500/30" />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] leading-relaxed custom-scrollbar bg-[#050506]">
              {terminalLines.map((line, i) => (
                <div key={i} className={cn(
                  "mb-0.5 flex gap-3",
                  line.includes("[ERR!]") ? "text-red-500" : 
                  line.includes("[WARN]") ? "text-yellow-500" :
                  line.includes("[OK!!]") ? "text-[#00FF00]" :
                  line.includes("[SYSTEM]") ? "text-blue-500" :
                  "text-white/40"
                )}>
                  <span className="opacity-20 shrink-0">{i.toString().padStart(4, '0')}</span>
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
        "transition-all relative py-1 px-1",
        active ? "text-[#00FF00]" : "text-white/30 hover:text-white/60"
      )}
    >
      {label}
      {active && <motion.div layoutId="nav-underline" className="absolute -bottom-1 left-0 w-full h-[1px] bg-[#00FF00]" />}
    </button>
  );
}

function StatBox({ label, value, sub, color }: { label: string, value: string, sub: string, color: string }) {
  return (
    <div className="bg-[#0A0A0B] border border-[#1A1A1C] p-4 rounded relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-30 mb-2">{label}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-black tracking-tighter" style={{ color }}>{value}</div>
        <div className="text-[9px] font-bold opacity-20 uppercase tracking-widest">{sub}</div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-[1px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: color }} />
    </div>
  );
}
