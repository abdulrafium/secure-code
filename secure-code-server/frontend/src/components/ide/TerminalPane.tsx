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

      // Connect to WebSocket backend
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
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

      // Cleanup function specifically for the inner async
      (term as any)._customCleanup = () => {
        resizeObserver.disconnect();
      };
    });

    return () => {
      isDisposed = true;
      if (socketRef.current) socketRef.current.disconnect();
      if ((term as any)._customCleanup) (term as any)._customCleanup();
      try { term.dispose(); } catch (e) {}
    };
  }, [projectId]);

  return <div ref={terminalRef} className="w-full h-full" />;
}
