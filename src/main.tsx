import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ScorePulse App:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0f172a] border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center font-black text-xl">
              !
            </div>
            <div>
              <h2 className="text-base font-bold text-white">ScorePulse xG - โหลดระบบใหม่</h2>
              <p className="text-xs text-slate-400 mt-1">
                เกิดข้อผิดพลาดในการแสดงผลชั่วคราว กรุณากดปุ่มด้านล่างเพื่อเริ่มการทำงานใหม่
              </p>
            </div>
            {this.state.error && (
              <div className="text-[11px] font-mono text-rose-400 bg-slate-950 p-2.5 rounded-lg text-left overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-lg shadow-blue-600/30"
            >
              รีเฟรชหน้าจอ (Reload App)
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElem = document.getElementById('root');
if (rootElem) {
  createRoot(rootElem).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
}
