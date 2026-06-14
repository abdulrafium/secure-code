import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Settings, FileText, Code, FileCode, Info, CheckSquare, File as GenericFile, Folder, FolderOpen } from 'lucide-react';
import { 
  SiPython, SiJavascript, SiTypescript, SiReact, SiHtml5, SiCss, SiMarkdown, 
  SiDocker, SiC, SiCplusplus, SiGit, SiJupyter, SiPhp, SiRuby, 
  SiRust, SiGo, SiSwift, SiKotlin, SiYaml, SiVuedotjs, SiSvelte,
  SiGraphql, SiMysql
} from 'react-icons/si';
import { FaJava } from 'react-icons/fa';
import { TbBrandCSharp } from 'react-icons/tb';
import { VscJson } from 'react-icons/vsc';
import { api } from '@/lib/api';

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  isOpen?: boolean;
}

interface FileTreeProps {
  nodes: FileNode[];
  onFileClick: (node: FileNode) => void;
  level?: number;
  projectId?: string | null;
  isViewer?: boolean;
  activeNodePath?: string;
  onNodeSelect?: (node: FileNode) => void;
  refreshToggle?: number;
  showNewItemInput?: 'file' | 'folder' | null;
  activeFolderPath?: string;
  newItemName?: string;
  setNewItemName?: (name: string) => void;
  handleCreateItem?: () => void;
  setShowNewItemInput?: (val: 'file' | 'folder' | null) => void;
  currentPath?: string;
}

const getFileIcon = (fileName: string) => {
  const name = fileName.toLowerCase();
  if (name.includes('.env')) return <Settings className="w-3.5 h-3.5 mr-1.5 text-slate-400" />;
  if (name.includes('readme')) return <Info className="w-3.5 h-3.5 mr-1.5 text-blue-400" />;
  if (name === 'package.json') return <VscJson className="w-3.5 h-3.5 mr-1.5 text-green-500" />;
  if (name.includes('todo')) return <CheckSquare className="w-3.5 h-3.5 mr-1.5 text-blue-400" />;
  if (name === 'dockerfile' || name.includes('docker-compose')) return <SiDocker className="w-3.5 h-3.5 mr-1.5 text-[#2496ED]" />;
  if (name === '.gitignore') return <SiGit className="w-3.5 h-3.5 mr-1.5 text-[#F05032]" />;

  if (name.endsWith('.py')) return <SiPython className="w-3.5 h-3.5 mr-1.5 text-[#3776AB]" />;
  if (name.endsWith('.js') || name.endsWith('.mjs')) return <SiJavascript className="w-3.5 h-3.5 mr-1.5 text-[#F7DF1E]" />;
  if (name.endsWith('.ts')) return <SiTypescript className="w-3.5 h-3.5 mr-1.5 text-[#3178C6]" />;
  if (name.endsWith('.jsx') || name.endsWith('.tsx')) return <SiReact className="w-3.5 h-3.5 mr-1.5 text-[#61DAFB]" />;
  if (name.endsWith('.json')) return <VscJson className="w-3.5 h-3.5 mr-1.5 text-[#cbcb41]" />;
  if (name.endsWith('.html') || name.endsWith('.htm')) return <SiHtml5 className="w-3.5 h-3.5 mr-1.5 text-[#E34F26]" />;
  if (name.endsWith('.css')) return <SiCss className="w-3.5 h-3.5 mr-1.5 text-[#1572B6]" />;
  if (name.endsWith('.md')) return <SiMarkdown className="w-3.5 h-3.5 mr-1.5 text-slate-400" />;
  if (name.endsWith('.txt')) return <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-400" />;
  if (name.endsWith('.c')) return <SiC className="w-3.5 h-3.5 mr-1.5 text-[#A8B9CC]" />;
  if (name.endsWith('.cpp') || name.endsWith('.cc') || name.endsWith('.cxx')) return <SiCplusplus className="w-3.5 h-3.5 mr-1.5 text-[#00599C]" />;
  if (name.endsWith('.sh') || name.endsWith('.bash')) return <Code className="w-3.5 h-3.5 mr-1.5 text-green-400" />;
  if (name.endsWith('.ipynb')) return <SiJupyter className="w-3.5 h-3.5 mr-1.5 text-[#F37626]" />;
  if (name.endsWith('.java')) return <FaJava className="w-3.5 h-3.5 mr-1.5 text-[#007396]" />;
  if (name.endsWith('.cs')) return <TbBrandCSharp className="w-3.5 h-3.5 mr-1.5 text-[#239120]" />;
  if (name.endsWith('.php')) return <SiPhp className="w-3.5 h-3.5 mr-1.5 text-[#777BB4]" />;
  if (name.endsWith('.rb')) return <SiRuby className="w-3.5 h-3.5 mr-1.5 text-[#CC342D]" />;
  if (name.endsWith('.rs')) return <SiRust className="w-3.5 h-3.5 mr-1.5 text-[#DEA584]" />;
  if (name.endsWith('.go')) return <SiGo className="w-3.5 h-3.5 mr-1.5 text-[#00ADD8]" />;
  if (name.endsWith('.swift')) return <SiSwift className="w-3.5 h-3.5 mr-1.5 text-[#F05138]" />;
  if (name.endsWith('.kt') || name.endsWith('.kts')) return <SiKotlin className="w-3.5 h-3.5 mr-1.5 text-[#7F52FF]" />;
  if (name.endsWith('.vue')) return <SiVuedotjs className="w-3.5 h-3.5 mr-1.5 text-[#4FC08D]" />;
  if (name.endsWith('.svelte')) return <SiSvelte className="w-3.5 h-3.5 mr-1.5 text-[#FF3E00]" />;
  if (name.endsWith('.graphql') || name.endsWith('.gql')) return <SiGraphql className="w-3.5 h-3.5 mr-1.5 text-[#E10098]" />;
  if (name.endsWith('.sql')) return <SiMysql className="w-3.5 h-3.5 mr-1.5 text-[#4479A1]" />;
  if (name.endsWith('.yml') || name.endsWith('.yaml')) return <SiYaml className="w-3.5 h-3.5 mr-1.5 text-[#CB171E]" />;
  
  return <GenericFile className="w-3.5 h-3.5 mr-1.5 text-slate-500" />;
};

export default function FileTree({ 
  nodes, onFileClick, level = 0, projectId, isViewer, activeNodePath, onNodeSelect, refreshToggle,
  showNewItemInput, activeFolderPath, newItemName, setNewItemName, handleCreateItem, setShowNewItemInput, currentPath = ''
}: FileTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [loadedChildren, setLoadedChildren] = useState<Record<string, FileNode[]>>({});

  React.useEffect(() => {
    if (refreshToggle && refreshToggle > 0) {
      const paths = Object.keys(expandedNodes).filter(p => expandedNodes[p]);
      paths.forEach(async (p) => {
        try {
          const endpoint = projectId 
            ? `/editor/tree?path=${encodeURIComponent(p)}&projectId=${projectId}`
            : `/editor/tree?path=${encodeURIComponent(p)}`;
          const data = await api.get(endpoint);
          setLoadedChildren(prev => ({ ...prev, [p]: data }));
        } catch (err) {
          console.error("Failed to reload folder", err);
        }
      });
    }
  }, [refreshToggle]);

  const toggleFolder = async (node: FileNode) => {
    const isExpanded = !!expandedNodes[node.path];
    
    // Toggle state instantly
    setExpandedNodes(prev => ({ ...prev, [node.path]: !isExpanded }));

    // Fetch children if not loaded
    if (!isExpanded && !loadedChildren[node.path]) {
      try {
        const endpoint = projectId 
          ? `/editor/tree?path=${encodeURIComponent(node.path)}&projectId=${projectId}`
          : `/editor/tree?path=${encodeURIComponent(node.path)}`;
        const data = await api.get(endpoint);
        setLoadedChildren(prev => ({ ...prev, [node.path]: data }));
      } catch (err) {
        console.error("Failed to load folder", err);
      }
    }
  };

  return (
    <div className="flex flex-col w-full">
      {showNewItemInput && activeFolderPath === currentPath && (
        <div className="flex items-center py-0.5" style={{ paddingLeft: `${(level * 12) + 4}px` }}>
          {showNewItemInput === 'file' ? <GenericFile className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> : <ChevronRight className="w-4 h-4 mr-1 opacity-80" />}
          <input 
            autoFocus
            type="text" 
            value={newItemName || ''}
            onChange={e => setNewItemName && setNewItemName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && handleCreateItem) handleCreateItem();
              if (e.key === 'Escape' && setShowNewItemInput) setShowNewItemInput(null);
            }}
            onBlur={() => setShowNewItemInput && setShowNewItemInput(null)}
            className="w-full bg-[#3c3c3c] text-white text-[14px] px-1 py-0.5 outline-none border border-[#007fd4]"
          />
        </div>
      )}
      {nodes.map(node => {
        const isExpanded = !!expandedNodes[node.path];
        const children = loadedChildren[node.path] || node.children || [];

        return (
          <div key={node.path} className="flex flex-col">
            <div 
              className={`flex items-center py-0.5 cursor-pointer select-none ${activeNodePath === node.path ? 'bg-[#37373d] text-white' : 'text-[#cccccc] hover:bg-[#2a2d2e]'}`}
              style={{ paddingLeft: `${(level * 12) + 4}px` }}
              onClick={() => {
                if (onNodeSelect) onNodeSelect(node);
                if (node.isDirectory) toggleFolder(node);
                else onFileClick(node);
              }}
            >
              {node.isDirectory ? (
                <>
                  {isExpanded ? <ChevronDown className="w-4 h-4 mr-1 opacity-80" /> : <ChevronRight className="w-4 h-4 mr-1 opacity-80" />}
                  {isExpanded ? <FolderOpen className="w-3.5 h-3.5 mr-1.5 text-blue-400" /> : <Folder className="w-3.5 h-3.5 mr-1.5 text-blue-400" />}
                  <span className="truncate">{node.name}</span>
                </>
              ) : (
                <>
                  <div className="w-4 mr-1" /> {/* Spacer for file to align with folders */}
                  {getFileIcon(node.name)}
                  <span className="truncate">{node.name}</span>
                </>
              )}
            </div>
            
            {node.isDirectory && isExpanded && (
              <FileTree 
                nodes={children} 
                onFileClick={onFileClick} 
                level={level + 1} 
                projectId={projectId} 
                isViewer={isViewer} 
                activeNodePath={activeNodePath} 
                onNodeSelect={onNodeSelect} 
                refreshToggle={refreshToggle}
                showNewItemInput={showNewItemInput}
                activeFolderPath={activeFolderPath}
                newItemName={newItemName}
                setNewItemName={setNewItemName}
                handleCreateItem={handleCreateItem}
                setShowNewItemInput={setShowNewItemInput}
                currentPath={node.path}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
