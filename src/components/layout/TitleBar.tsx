/**
 * TitleBar Component
 * macOS: empty drag region (native traffic lights handled by hiddenInset).
 * Windows: drag region with custom minimize/maximize/close controls; uses
 * `bg-surface-sidebar` so the frameless strip matches the sidebar rail.
 * Linux: use native window chrome (no custom title bar).
 */
import { useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { hostApi } from '@/lib/host-api';

export function TitleBar() {
  const platform = window.electron?.platform;

  if (platform === 'darwin') {
    // macOS traffic lights live inside the sidebar area; keep the shell left/right.
    return null;
  }

  // Linux keeps the native frame/title bar for better IME compatibility.
  if (platform !== 'win32') {
    return null;
  }

  return <WindowsTitleBar />;
}

function WindowsTitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    // Check initial state
    hostApi.window.isMaximized().then((val) => {
      setMaximized(val);
    });
  }, []);

  const handleMinimize = () => {
    void hostApi.window.minimize();
  };

  const handleMaximize = () => {
    hostApi.window.maximize().then(() => {
      hostApi.window.isMaximized().then((val) => {
        setMaximized(val);
      });
    });
  };

  const handleClose = () => {
    void hostApi.window.close();
  };

  return (
    <div
      data-testid="windows-titlebar"
      className="drag-region flex h-10 shrink-0 items-center justify-end border-b border-border/40 bg-surface-sidebar"
    >
      {/* Right: Window Controls — 设计图风格：柔和的浅色悬停，关闭按钮警示红 */}
      <div className="no-drag flex h-full items-center gap-0.5 px-1.5">
        <button
          onClick={handleMinimize}
          className="titlebar-btn flex h-8 w-10 items-center justify-center rounded-md text-sidebar-muted"
          title="Minimize"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="titlebar-btn flex h-8 w-10 items-center justify-center rounded-md text-sidebar-muted"
          title={maximized ? 'Restore' : 'Maximize'}
        >
          {maximized ? <Copy className="h-3 w-3" /> : <Square className="h-3 w-3" />}
        </button>
        <button
          onClick={handleClose}
          className="titlebar-btn titlebar-btn-close flex h-8 w-10 items-center justify-center rounded-md text-sidebar-muted"
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
