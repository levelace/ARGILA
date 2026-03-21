import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050506] flex items-center justify-center p-6 font-mono">
          <div className="max-w-md w-full bg-[#0A0A0B] border border-red-500/30 p-8 rounded shadow-[0_0_30px_rgba(255,0,0,0.1)]">
            <div className="text-red-500 mb-4 font-black tracking-tighter text-xl uppercase">Critical System Failure</div>
            <div className="text-white/60 text-xs leading-relaxed mb-6">
              The ARES Core Engine encountered an unrecoverable error. Diagnostic data has been logged to the secure console.
            </div>
            <div className="bg-black/40 p-4 rounded border border-white/5 text-[10px] text-red-400/80 break-all mb-6">
              {this.state.error?.message}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-red-500 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-red-600 transition-colors"
            >
              Reboot System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
