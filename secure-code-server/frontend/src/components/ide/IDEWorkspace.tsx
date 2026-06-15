"use client";

import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  ChevronDown, ChevronRight, X, Plus, Terminal as TerminalIcon,
  Search, Type, Languages, Hash, FilePlus, FolderPlus,
  RefreshCw, ChevronUp, FileText, Code, FileCode, Info,
  CheckSquare, File as GenericFile, Settings, AlertTriangle
} from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import FileTree, { FileNode } from './FileTree';

import OutputPane from './OutputPane';
import PortsPane, { ForwardedPort } from './PortsPane';

const TerminalPane = dynamic(() => import('./TerminalPane'), { ssr: false });

interface OpenFile {
  path: string;
  name: string;
  content: string;
  language?: string;
  isBinary?: boolean;
  originalContent?: string;
}

const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 14,
  wordWrap: 'on' as const,
  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  fontLigatures: true,
  smoothScrolling: true,
  cursorBlinking: 'smooth' as const,
  cursorSmoothCaretAnimation: 'on' as const,
  formatOnPaste: true,
};

export default function IDEWorkspace() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const projectName = searchParams.get('projectName') || 'APP';

  const [tree, setTree] = useState<FileNode[]>([]);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [showTerminalMenu, setShowTerminalMenu] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'terminal' | 'output' | 'ports'>('terminal');
  const [systemLogs, setSystemLogs] = useState<string[]>(['IDE initialized. Workspace ready.']);
  const [forwardedPorts, setForwardedPorts] = useState<ForwardedPort[]>([]);
  const [userRole, setUserRole] = useState('');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const activeFile = openFiles.find(f => f.path === activeFilePath) || null;
  const isViewer = userRole.toLowerCase() === 'viewer';

  const [terminals, setTerminals] = useState([{ id: 'term-1', active: true }]);
  const [showNewItemInput, setShowNewItemInput] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [activeNodePath, setActiveNodePath] = useState<string | null>(null);
  const [activeFolderPath, setActiveFolderPath] = useState<string>('');
  const [refreshToggle, setRefreshToggle] = useState(0);

  const terminalPanelRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mainAreaRef = useRef<HTMLDivElement>(null);

  // Panel sizes in percent
  const [sidebarWidth, setSidebarWidth] = useState(20);
  const [terminalHeight, setTerminalHeight] = useState(35);

  // Drag handlers for sidebar (horizontal)
  const startHDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      if (!containerRef.current) return;
      const totalW = containerRef.current.offsetWidth;
      const delta = ((ev.clientX - startX) / totalW) * 100;
      setSidebarWidth(w => Math.min(60, Math.max(10, startW + delta)));
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Drag handlers for terminal (vertical)
  const startVDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = terminalHeight;
    const onMove = (ev: MouseEvent) => {
      if (!mainAreaRef.current) return;
      const totalH = mainAreaRef.current.offsetHeight;
      const delta = (-(ev.clientY - startY) / totalH) * 100;
      setTerminalHeight(h => Math.min(85, Math.max(15, startH + delta)));
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const toggleTerminalMaximized = () => {
    setTerminalHeight(h => h > 70 ? 35 : 85);
  };

  const addTerminal = () => {
    const newId = `term-${Date.now()}`;
    setTerminals(prev => [...prev.map(t => ({ ...t, active: false })), { id: newId, active: true }]);
    setTerminalOpen(true);
  };

  const switchTerminal = (id: string) => {
    setTerminals(prev => prev.map(t => ({ ...t, active: t.id === id })));
  };

  const closeTerminal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTerminals(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (filtered.length > 0 && !filtered.find(t => t.active)) {
        filtered[filtered.length - 1].active = true;
      }
      return filtered;
    });
  };


  const handleCreateItem = async () => {
    if (!newItemName.trim()) {
      setShowNewItemInput(null);
      return;
    }
    try {
      const endpoint = showNewItemInput === 'file' ? '/editor/file/new' : '/editor/folder';
      const finalPath = activeFolderPath ? `${activeFolderPath}/${newItemName}` : newItemName;
      await api.post(endpoint, {
        path: finalPath,
        projectId: projectId || ''
      });
      setRefreshToggle(prev => prev + 1);
      const treeEndpoint = projectId ? `/editor/tree?path=&projectId=${projectId}` : `/editor/tree?path=`;
      api.get(treeEndpoint).then(data => setTree(data)).catch(() => { });
    } catch (err: any) {
      setAlertMessage("Failed to create: " + err.message);
    } finally {
      setShowNewItemInput(null);
      setNewItemName('');
    }
  };

  const handleNodeSelect = (node: FileNode) => {
    setActiveNodePath(node.path);
    if (node.isDirectory) {
      setActiveFolderPath(node.path);
    } else {
      const parts = node.path.split('/');
      parts.pop();
      setActiveFolderPath(parts.join('/'));
    }
  };

  const handleDeleteItem = async () => {
    if (!activeFile) return;
    if (!confirm(`Are you sure you want to delete ${activeFile.name}?`)) return;
    try {
      await api.delete(`/editor/item?path=${encodeURIComponent(activeFile.path)}&projectId=${projectId || ''}`);
      setOpenFiles(prev => prev.filter(f => f.path !== activeFile.path));
      setActiveFilePath(null);
      setRefreshToggle(prev => prev + 1);
      const treeEndpoint = projectId ? `/editor/tree?path=&projectId=${projectId}` : `/editor/tree?path=`;
      api.get(treeEndpoint).then(data => setTree(data)).catch(console.error);
      setSystemLogs(prev => [...prev, `Deleted: ${activeFile.name}`]);
    } catch (err: any) {
      setAlertMessage(err.message || "Failed to delete file.");
    }
  };

  // ── Workspace State Persistence (VS Code style) ─────────────────────────
  const stateKey = projectId ? `ide-workspace-${projectId}` : null;
  const hasRestoredState = useRef(false);

  // Save state to localStorage whenever anything meaningful changes
  useEffect(() => {
    if (!stateKey || !hasRestoredState.current) return;
    const state = {
      openFilePaths: openFiles.map(f => f.path),
      activeFilePath,
      terminalOpen,
      sidebarWidth,
      terminalHeight,
    };
    try {
      localStorage.setItem(stateKey, JSON.stringify(state));
    } catch { /* quota exceeded – ignore */ }
  }, [openFiles, activeFilePath, terminalOpen, sidebarWidth, terminalHeight, stateKey]);

  useEffect(() => {
    const roleCookie = document.cookie.split('; ').find(row => row.startsWith('userRole='));
    if (roleCookie) setUserRole(roleCookie.split('=')[1]);

    // Fetch tree first
    const endpoint = projectId ? `/editor/tree?path=&projectId=${projectId}` : `/editor/tree?path=`;
    
    const fetchFullTree = () => {
      api.get(endpoint).then(data => {
        setTree(data);
        setRefreshToggle(prev => prev + 1); // Triggers FileTree to also refresh expanded sub-folders
      }).catch(err => console.error('Failed to fetch tree', err));
    };

    fetchFullTree();
    const treeInterval = setInterval(fetchFullTree, 5000);

    // Restore saved workspace state
    if (!stateKey) {
      hasRestoredState.current = true;
      return;
    }
    let savedState: { openFilePaths?: string[]; activeFilePath?: string | null; terminalOpen?: boolean; sidebarWidth?: number; terminalHeight?: number } | null = null;
    try {
      const raw = localStorage.getItem(stateKey);
      if (raw) savedState = JSON.parse(raw);
    } catch { savedState = null; }

    if (!savedState) {
      hasRestoredState.current = true;
      return;
    }

    // Restore panel sizes immediately (no async needed)
    if (typeof savedState.sidebarWidth === 'number') setSidebarWidth(savedState.sidebarWidth);
    if (typeof savedState.terminalHeight === 'number') setTerminalHeight(savedState.terminalHeight);
    if (typeof savedState.terminalOpen === 'boolean') setTerminalOpen(savedState.terminalOpen);

    // Re-open files from saved paths
    const pathsToRestore = savedState.openFilePaths || [];
    const savedActivePath = savedState.activeFilePath || null;
    if (pathsToRestore.length === 0) {
      hasRestoredState.current = true;
      return;
    }

    Promise.all(
      pathsToRestore.map(async (filePath) => {
        try {
          const fileExt = filePath.split('.').pop() || '';
          if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(fileExt.toLowerCase())) {
            const url = `${process.env.NEXT_PUBLIC_API_URL}/editor/file-blob?path=${encodeURIComponent(filePath)}&projectId=${projectId}`;
            const resp = await fetch(url);
            const blob = await resp.blob();
            const objectUrl = URL.createObjectURL(blob);
            const name = filePath.split('/').pop() || filePath;
            return { path: filePath, name, content: objectUrl, isBinary: true, originalContent: '' } as OpenFile;
          } else {
            const ep = projectId
              ? `/editor/file?path=${encodeURIComponent(filePath)}&projectId=${projectId}`
              : `/editor/file?path=${encodeURIComponent(filePath)}`;
            const data = await api.get(ep);
            const name = filePath.split('/').pop() || filePath;
            const n = name.toLowerCase();
            let language = 'plaintext';
            if (n.endsWith('.ts') || n.endsWith('.tsx')) language = 'typescript';
            else if (n.endsWith('.js') || n.endsWith('.jsx')) language = 'javascript';
            else if (n.endsWith('.json')) language = 'json';
            else if (n.endsWith('.md')) language = 'markdown';
            else if (n.endsWith('.html') || n.endsWith('.htm')) language = 'html';
            else if (n.endsWith('.css')) language = 'css';
            else if (n.endsWith('.py')) language = 'python';
            else if (n.endsWith('.java')) language = 'java';
            else if (n.endsWith('.c') || n.endsWith('.h')) language = 'c';
            else if (n.endsWith('.cpp') || n.endsWith('.cc') || n.endsWith('.cxx')) language = 'cpp';
            else if (n.endsWith('.cs')) language = 'csharp';
            else if (n.endsWith('.go')) language = 'go';
            else if (n.endsWith('.rs')) language = 'rust';
            else if (n.endsWith('.php')) language = 'php';
            else if (n.endsWith('.rb')) language = 'ruby';
            else if (n.endsWith('.sql')) language = 'sql';
            else if (n.endsWith('.xml')) language = 'xml';
            else if (n.endsWith('.yaml') || n.endsWith('.yml')) language = 'yaml';
            else if (n.endsWith('.sh') || n.endsWith('.bash')) language = 'shell';
            else if (n.endsWith('.dockerfile') || n === 'dockerfile') language = 'dockerfile';
            else if (n.endsWith('.graphql') || n.endsWith('.gql')) language = 'graphql';
            else if (n.endsWith('.kt') || n.endsWith('.kts')) language = 'kotlin';
            else if (n.endsWith('.swift')) language = 'swift';
            return { path: filePath, name, content: data.content, originalContent: data.content, language } as OpenFile;
          }
        } catch {
          return null; // File may have been deleted — silently skip
        }
      })
    ).then(results => {
      const validFiles = results.filter(Boolean) as OpenFile[];
      if (validFiles.length > 0) {
        setOpenFiles(validFiles);
        // Restore active tab — default to last valid file if saved path is gone
        const restoredActive = savedActivePath && validFiles.find(f => f.path === savedActivePath)
          ? savedActivePath
          : validFiles[validFiles.length - 1].path;
        setActiveFilePath(restoredActive);
      }
      hasRestoredState.current = true;
    }).catch(() => {
      hasRestoredState.current = true;
    });

    return () => clearInterval(treeInterval);
  }, [projectId]);


  const handleFileClick = async (node: FileNode) => {
    if (node.isDirectory) return;

    const alreadyOpen = openFiles.find(f => f.path === node.path);
    if (alreadyOpen) {
      setActiveFilePath(node.path);
      return;
    }

    try {
      const fileExt = node.path.split('.').pop() || '';

      if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(fileExt.toLowerCase())) {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/editor/file-blob?path=${encodeURIComponent(node.path)}&projectId=${projectId}`;
        const resp = await fetch(url);
        const blob = await resp.blob();
        const objectUrl = URL.createObjectURL(blob);

        const newFile: OpenFile = { path: node.path, name: node.name, content: objectUrl, isBinary: true, originalContent: '' };
        setOpenFiles(prev => [...prev, newFile]);
        setActiveFilePath(node.path);
        setSystemLogs(prev => [...prev, `Opened binary file: ${node.name}`]);
      } else {
        const endpoint = projectId
          ? `/editor/file?path=${encodeURIComponent(node.path)}&projectId=${projectId}`
          : `/editor/file?path=${encodeURIComponent(node.path)}`;
        const data = await api.get(endpoint);

        let language = 'plaintext';
        const name = node.name.toLowerCase();
        if (name.endsWith('.ts') || name.endsWith('.tsx')) language = 'typescript';
        else if (name.endsWith('.js') || name.endsWith('.jsx')) language = 'javascript';
        else if (name.endsWith('.json') || name.endsWith('.ipynb')) language = 'json';
        else if (name.endsWith('.md')) language = 'markdown';
        else if (name.endsWith('.html') || name.endsWith('.htm') || name.endsWith('.vue') || name.endsWith('.svelte')) language = 'html';
        else if (name.endsWith('.css')) language = 'css';
        else if (name.endsWith('.py')) language = 'python';
        else if (name.endsWith('.java')) language = 'java';
        else if (name.endsWith('.c') || name.endsWith('.h')) language = 'c';
        else if (name.endsWith('.cpp') || name.endsWith('.hpp') || name.endsWith('.cc') || name.endsWith('.cxx')) language = 'cpp';
        else if (name.endsWith('.cs')) language = 'csharp';
        else if (name.endsWith('.go')) language = 'go';
        else if (name.endsWith('.rs')) language = 'rust';
        else if (name.endsWith('.php')) language = 'php';
        else if (name.endsWith('.rb')) language = 'ruby';
        else if (name.endsWith('.sql')) language = 'sql';
        else if (name.endsWith('.xml')) language = 'xml';
        else if (name.endsWith('.yaml') || name.endsWith('.yml')) language = 'yaml';
        else if (name.endsWith('.sh') || name.endsWith('.bash')) language = 'shell';
        else if (name.endsWith('.dockerfile') || name === 'dockerfile') language = 'dockerfile';
        else if (name.endsWith('.graphql') || name.endsWith('.gql')) language = 'graphql';
        else if (name.endsWith('.kt') || name.endsWith('.kts')) language = 'kotlin';
        else if (name.endsWith('.swift')) language = 'swift';

        const newFile: OpenFile = {
          path: node.path,
          name: node.name,
          content: data.content,
          originalContent: data.content,
          language
        };

        setOpenFiles(prev => [...prev, newFile]);
        setActiveFilePath(node.path);
        setSystemLogs(prev => [...prev, `Opened file: ${node.name}`]);
      }
    } catch (err: any) {
      console.error("Failed to load file", err);
      alert("Could not load file. See console for details.");
    }
  };

  const closeFile = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const newOpen = openFiles.filter(f => f.path !== path);
    setOpenFiles(newOpen);
    if (activeFilePath === path) {
      setActiveFilePath(newOpen.length > 0 ? newOpen[newOpen.length - 1].path : null);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (!activeFile || value === undefined) return;

    setOpenFiles(prev => prev.map(f => {
      if (f.path === activeFilePath) {
        return { ...f, content: value };
      }
      return f;
    }));
  };

  const handleSave = async () => {
    if (!activeFile || isViewer) return;
    try {
      await api.post('/editor/file', {
        projectId,
        path: activeFile.path,
        content: activeFile.content
      });
      // Could show a tiny toast here, but VS Code usually just saves silently
    } catch (err: any) {
      setAlertMessage(err.message || "Failed to save file.");
    }
  };

  // Keyboard shortcut for saving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile]);

  return (
    <div ref={containerRef} className="flex h-screen w-full bg-[#1e1e1e] text-[#cccccc] overflow-hidden font-sans select-none">

      {/* Side Bar */}
      <div style={{ width: `${sidebarWidth}%`, minWidth: '10%', maxWidth: '60%', flexShrink: 0 }} className="flex flex-col bg-[#252526] border-r border-[#3c3c3c]">
        <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#3c3c3c]">
          <span className="text-xs font-semibold text-slate-300 tracking-wider">EXPLORER</span>
          <div className="flex space-x-1">
            <FilePlus
              className={`w-4 h-4 text-slate-400 ${isViewer ? 'opacity-30 cursor-not-allowed' : 'hover:text-white cursor-pointer'}`}
              onClick={() => !isViewer && setShowNewItemInput('file')}
            />
            <FolderPlus
              className={`w-4 h-4 text-slate-400 ${isViewer ? 'opacity-30 cursor-not-allowed' : 'hover:text-white cursor-pointer'}`}
              onClick={() => !isViewer && setShowNewItemInput('folder')}
            />
            <div className="relative flex items-center">
              <div
                className="flex items-center cursor-pointer hover:bg-white/10 rounded px-1.5 py-0.5"
                onClick={() => setShowTerminalMenu(!showTerminalMenu)}
                title="Terminal Options"
              >
                {showTerminalMenu ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 hover:text-white" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 hover:text-white" />
                )}
              </div>

              {showTerminalMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTerminalMenu(false)} />
                  <div className="absolute top-6 right-0 z-50 bg-[#252526] border border-[#454545] rounded shadow-xl py-1 min-w-[140px]">
                    <button
                      className="w-full text-left px-3 py-1.5 text-[12px] text-slate-300 hover:bg-[#094771] hover:text-white flex items-center"
                      onClick={() => {
                        const newId = `term-${Date.now()}`;
                        if (!terminalOpen) {
                          setTerminals([{ id: newId, active: true }]);
                          setTerminalOpen(true);
                        } else {
                          setTerminals(prev => [...prev.map(t => ({ ...t, active: false })), { id: newId, active: true }]);
                        }
                        setShowTerminalMenu(false);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-2" />
                      New Terminal
                    </button>
                  </div>
                </>
              )}
            </div>
            <RefreshCw className="w-4 h-4 text-slate-400 hover:text-white cursor-pointer" onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setRefreshToggle(prev => prev + 1);
              const endpoint = projectId ? `/editor/tree?path=&projectId=${projectId}` : `/editor/tree?path=`;
              api.get(endpoint).then(data => setTree(data)).catch(console.error);
            }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setActiveNodePath(null);
            setActiveFolderPath('');
          }
        }}>
          <FileTree
            nodes={tree}
            onFileClick={handleFileClick}
            projectId={projectId || ''}
            isViewer={isViewer}
            activeNodePath={activeNodePath !== null ? activeNodePath : undefined}
            onNodeSelect={handleNodeSelect}
            refreshToggle={refreshToggle}
            showNewItemInput={showNewItemInput}
            activeFolderPath={activeFolderPath}
            newItemName={newItemName}
            setNewItemName={setNewItemName}
            handleCreateItem={handleCreateItem}
            setShowNewItemInput={setShowNewItemInput}
          />
        </div>
      </div>

      {/* Horizontal Resize Handle */}
      <div
        onMouseDown={startHDrag}
        className="w-[3px] flex-shrink-0 bg-[#333] hover:bg-[#007fd4] cursor-col-resize z-50 transition-colors"
      />

      {/* Main Editor & Terminal Area */}
      <div ref={mainAreaRef} className="flex flex-col flex-1 min-w-0 bg-[#1e1e1e] relative">

        {/* Floating Top Right Tools */}
        <div className="absolute top-2 right-4 z-50 flex flex-col items-end pointer-events-none">
          <div className="flex items-center space-x-1 bg-[#1e1e1e]/80 backdrop-blur border border-[#333] rounded-full px-2 py-1 mb-2 pointer-events-auto shadow-lg">
            <div className="flex flex-col items-center px-2 cursor-pointer hover:bg-white/10 rounded">
              <div className="w-4 h-4 rounded-full border border-[#00FF00] flex items-center justify-center mb-0.5"><div className="w-1.5 h-1.5 bg-[#00FF00] rounded-full"></div></div>
              <span className="text-[8px] text-slate-300">Code</span>
            </div>
            <div className="flex flex-col items-center px-2 cursor-pointer hover:bg-white/10 rounded">
              <div className="w-4 h-4 rounded-full border border-blue-400 flex items-center justify-center mb-0.5"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div></div>
              <span className="text-[8px] text-slate-300">Build</span>
            </div>
            <div className="flex flex-col items-center px-2 cursor-pointer hover:bg-white/10 rounded">
              <div className="w-4 h-4 rounded-full border border-purple-400 flex items-center justify-center mb-0.5"><div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div></div>
              <span className="text-[8px] text-slate-300">Test</span>
            </div>
            <div className="flex flex-col items-center px-2 cursor-pointer hover:bg-white/10 rounded">
              <div className="w-4 h-4 rounded-full border border-pink-400 flex items-center justify-center mb-0.5"><div className="w-1.5 h-1.5 bg-pink-400 rounded-full"></div></div>
              <span className="text-[8px] text-slate-300">Deploy</span>
            </div>
            <div className="flex flex-col items-center px-2 cursor-pointer hover:bg-white/10 rounded">
              <div className="w-4 h-4 rounded-full border border-blue-500 flex items-center justify-center mb-0.5"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div></div>
              <span className="text-[8px] text-slate-300">Live</span>
            </div>
          </div>
          <div className="flex space-x-2 pointer-events-auto">
            <button className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium px-3 py-1 rounded shadow-lg">code push</button>
            <button className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium px-3 py-1 rounded shadow-lg">Live link</button>
          </div>
        </div>

        {/* Editor Panel */}
        <div
          style={{ height: terminalOpen ? `${100 - terminalHeight}%` : '100%' }}
          className="flex flex-col min-h-0 bg-[#1e1e1e] overflow-hidden"
        >
          {/* Editor Tabs */}
          <div className="flex bg-[#2d2d2d] overflow-x-auto overflow-y-hidden h-[35px] border-b border-[#1e1e1e] flex-shrink-0">
            {openFiles.map((file) => {
              const isActive = activeFilePath === file.path;
              return (
                <div
                  key={file.path}
                  onClick={() => setActiveFilePath(file.path)}
                  className={`flex items-center px-3 h-full cursor-pointer group border-r border-[#1e1e1e] min-w-fit ${isActive ? 'bg-[#1e1e1e] text-white border-t border-t-blue-500' : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2b2b2b]'}`}
                >
                  <span className="text-[13px] mr-2">{file.name}</span>
                  <div
                    className={`w-5 h-5 flex items-center justify-center rounded-md hover:bg-[#4d4d4d] ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    onClick={(e) => closeFile(e, file.path)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Breadcrumbs & Actions */}
          {activeFile && (
            <div className="flex items-center justify-between px-4 h-[22px] bg-[#1e1e1e] flex-shrink-0">
              <span className="text-[#cccccc] text-[12px] opacity-80 truncate">{activeFile.path.split('/').join(' > ')}</span>
              {!isViewer && (
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer" onClick={handleDeleteItem}>Delete File</span>
                </div>
              )}
            </div>
          )}

          {/* Monaco Editor */}
          <div className="flex-1 relative border-t border-[#2d2d2d] min-h-0">
            {activeFile ? (
              <Editor
                height="100%"
                language={activeFile.language}
                theme="vs-dark"
                value={activeFile.content}
                onChange={handleEditorChange}
                options={{ ...EDITOR_OPTIONS, readOnly: isViewer }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-600 text-3xl font-light">
                Select a file to edit
              </div>
            )}
          </div>
        </div>

        {/* Vertical Resize Handle */}
        {terminalOpen && (
          <div
            onMouseDown={startVDrag}
            className="h-[3px] flex-shrink-0 bg-[#333] hover:bg-[#007fd4] cursor-row-resize z-50 transition-colors"
          />
        )}

        {/* Terminal Panel */}
        {terminalOpen && (
          <div
            style={{ height: `${terminalHeight}%` }}
            className="flex flex-shrink-0 min-h-0 bg-[#1e1e1e] overflow-hidden"
          >
            {/* Terminal Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex px-4 h-[35px] border-b border-[#333333] flex-shrink-0">
                <div className="flex space-x-6 text-[11px] font-medium tracking-wide items-center pt-2">
                  <button
                    className={`h-full flex items-start border-b ${activeBottomTab === 'terminal' ? 'text-white border-[#007acc]' : 'text-[#cccccc] hover:text-white border-transparent'}`}
                    onClick={() => setActiveBottomTab('terminal')}
                  >TERMINAL</button>
                  <button
                    className={`h-full flex items-start border-b ${activeBottomTab === 'output' ? 'text-white border-[#007acc]' : 'text-[#cccccc] hover:text-white border-transparent'}`}
                    onClick={() => setActiveBottomTab('output')}
                  >OUTPUT</button>
                  <button
                    className={`h-full flex items-start border-b ${activeBottomTab === 'ports' ? 'text-white border-[#007acc]' : 'text-[#cccccc] hover:text-white border-transparent'}`}
                    onClick={() => setActiveBottomTab('ports')}
                  >PORTS</button>
                </div>
              </div>
              <div className="flex-1 p-0 bg-[#1e1e1e] min-h-0 overflow-hidden relative">
                {activeBottomTab === 'terminal' && (
                  <div className="w-full h-full relative">
                    {terminals.map(term => (
                      <div key={term.id} className="w-full h-full absolute inset-0 p-2" style={{ visibility: term.active ? 'visible' : 'hidden', pointerEvents: term.active ? 'auto' : 'none' }}>
                        <TerminalPane projectId={projectId} isViewer={isViewer} />
                      </div>
                    ))}
                  </div>
                )}
                {activeBottomTab === 'output' && <OutputPane logs={systemLogs} />}
                {activeBottomTab === 'ports' && (
                  <PortsPane
                    ports={forwardedPorts}
                    onAddPort={(port, label) => setForwardedPorts(prev => [...prev, { id: `port-${Date.now()}`, port, label }])}
                    onRemovePort={(id) => setForwardedPorts(prev => prev.filter(p => p.id !== id))}
                  />
                )}
              </div>
            </div>

            {/* Terminal Sidebar (Right) */}
            {activeBottomTab === 'terminal' && (
              <div className="w-[150px] border-l border-[#333333] flex flex-col flex-shrink-0">
                <div className="flex justify-end p-2 space-x-2 text-[#cccccc]">
                  <Plus className="w-4 h-4 cursor-pointer hover:text-white" onClick={addTerminal} />
                  <ChevronUp className="w-4 h-4 cursor-pointer hover:text-white" onClick={toggleTerminalMaximized} />
                  <X className="w-4 h-4 cursor-pointer hover:text-white" onClick={() => setTerminalOpen(false)} />
                </div>
                <div className="flex flex-col px-2 space-y-1">
                  {terminals.map((term, idx) => (
                    <div
                      key={term.id}
                      onClick={() => switchTerminal(term.id)}
                      className={`flex items-center justify-between text-[#cccccc] hover:bg-[#2a2d2e] cursor-pointer px-1 py-0.5 rounded ${term.active ? 'bg-[#37373d]' : ''}`}
                    >
                      <div className="flex items-center">
                        <TerminalIcon className="w-3.5 h-3.5 mr-2" />
                        <span className="text-[12px]">powershell {idx + 1}</span>
                      </div>
                      {terminals.length > 1 && (
                        <X className="w-3 h-3 hover:text-red-400 opacity-50 hover:opacity-100" onClick={(e) => closeTerminal(term.id, e)} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Themed Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[#1e1e1e] border border-[#333333] shadow-2xl rounded-md w-[400px] overflow-hidden flex flex-col">
            <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-[#333333]">
              <div className="flex items-center space-x-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-[13px] font-medium text-[#cccccc]">Operation Blocked</span>
              </div>
              <X className="w-4 h-4 text-[#858585] cursor-pointer hover:text-[#cccccc]" onClick={() => setAlertMessage(null)} />
            </div>
            <div className="p-5 text-[13px] text-[#cccccc] leading-relaxed">
              {alertMessage}
            </div>
            <div className="px-4 py-3 bg-[#252526] border-t border-[#333333] flex justify-end space-x-3">
              <button
                onClick={() => setAlertMessage(null)}
                className="bg-[#0e639c] hover:bg-[#1177bb] text-white px-4 py-1.5 rounded text-[13px] font-medium transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
