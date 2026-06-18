import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { io, Socket } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';

export default function TerminalPane({ projectId, isViewer }: { projectId?: string | null, isViewer?: boolean }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    let isDisposed = false;

    // Initialize xterm.js
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
      fontSize: 13,
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#cccccc',
      },
      disableStdin: isViewer,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    // Defer opening to ensure DOM is ready
    requestAnimationFrame(() => {
      if (isDisposed || !terminalRef.current) return;
      term.open(terminalRef.current);
      
      const safeFit = () => {
        if (isDisposed) return;
        try {
          if (terminalRef.current && terminalRef.current.clientWidth > 0 && terminalRef.current.clientHeight > 0) {
            fitAddon.fit();
            if (socketRef.current && term.cols && term.rows) {
              socketRef.current.emit('terminal.resize', {
                cols: term.cols,
                rows: term.rows,
              });
            }
          }
        } catch (e) {
          // Ignore
        }
      };

      // Use ResizeObserver for accurate panel resizing
      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(safeFit);
      });
      resizeObserver.observe(terminalRef.current);

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // Connect directly to the backend URL to avoid Next.js WebSocket proxy drops
      const defaultApiUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:3001` : 'http://localhost:3001';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || defaultApiUrl;
      // Socket.io should connect to the root of the API
      const backendUrl = apiUrl.replace('/api', '');
      
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
        return '';
      };
      const token = getCookie('accessToken');

      const socket = io(backendUrl, {
        query: { projectId: projectId || '', token }
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (isDisposed) return;
        term.writeln('\x1b[1;32m[Terminal Connected]\x1b[0m');
        socket.emit('terminal.resize', { cols: term.cols, rows: term.rows });
      });

      socket.on('terminal.output', (data: string) => {
        if (isDisposed) return;
        term.write(data);
      });

      socket.on('disconnect', () => {
        if (isDisposed) return;
        term.writeln('\x1b[1;31m[Terminal Disconnected]\x1b[0m');
      });

      term.onData((data) => {
        if (isDisposed || isViewer) return;
        socket.emit('terminal.input', data);
      });

      // Intercept key events for Internal Clipboard (Ctrl+C / Ctrl+V / Right-Click)
      // Track whether we're in the middle of a Ctrl+V to prevent the paste event from also firing
      let isPastingFromKeyboard = false;

      term.attachCustomKeyEventHandler((arg: KeyboardEvent) => {
        if (isViewer) return false;
        
        // Ctrl+C or Cmd+C — copy selection into internal clipboard
        if ((arg.ctrlKey || arg.metaKey) && (arg.code === 'KeyC' || arg.key === 'c' || arg.key === 'C') && arg.type === 'keydown') {
          const selection = term.getSelection();
          if (selection) {
            (window as any).__internalClipboard = { text: selection, source: 'terminal' };
            term.clearSelection();
            return false; // Stop default OS copy
          }
        }
        
        // Ctrl+V or Cmd+V — mark that we're handling paste via keyboard
        // The actual paste is done by our 'paste' event interceptor below
        if ((arg.ctrlKey || arg.metaKey) && (arg.code === 'KeyV' || arg.key === 'v' || arg.key === 'V') && arg.type === 'keydown') {
          isPastingFromKeyboard = true;
          const clip = (window as any).__internalClipboard;
          if (clip) {
            if (clip.source === 'editor') {
              // Optionally dispatch a custom event here to show an alert, or rely on visual lack of paste
              const event = new CustomEvent('terminal-paste-restricted');
              window.dispatchEvent(event);
            } else {
              socket.emit('terminal.input', clip.text);
            }
            // Reset flag after a tick so paste event can be suppressed
            setTimeout(() => { isPastingFromKeyboard = false; }, 50);
            return false;
          }
          // Fallback: silently ignore native paste to enforce sandbox
          setTimeout(() => { isPastingFromKeyboard = false; }, 50);
          return false;
        }
        
        return true;
      });

      // Track selection continuously for the global clipboard handler
      term.onSelectionChange(() => {
        (window as any).__currentTerminalSelection = term.getSelection();
      });

      // Expose execute function for global paste
      (window as any).__executeTerminalPaste = (text: string) => {
        socket.emit('terminal.input', text);
      };

      // Handle Right-click Context Menu (Triggered via mouse click, fallback for when context menu native paste fails)
      const handleContextMenu = (e: MouseEvent) => {
        if (isViewer) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        const clip = (window as any).__internalClipboard;
        if (clip) {
          if (clip.source === 'editor') {
            const event = new CustomEvent('terminal-paste-restricted');
            window.dispatchEvent(event);
          } else {
            socket.emit('terminal.input', clip.text);
          }
          return;
        }
      };
      
      if (terminalRef.current) {
        terminalRef.current.addEventListener('contextmenu', handleContextMenu);
        (term as any)._customContextMenuCleanup = () => {
          if (terminalRef.current) {
            terminalRef.current.removeEventListener('contextmenu', handleContextMenu);
          }
        };
      }

      // Cleanup function specifically for the inner async
      (term as any)._customCleanup = () => {
        resizeObserver.disconnect();
      };
    });

    return () => {
      isDisposed = true;
      if (socketRef.current) socketRef.current.disconnect();
      if ((term as any)._customCleanup) (term as any)._customCleanup();
      if ((term as any)._customContextMenuCleanup) (term as any)._customContextMenuCleanup();
      try { term.dispose(); } catch (e) {}
    };
  }, [projectId]);

  return <div ref={terminalRef} className="w-full h-full" />;
}
