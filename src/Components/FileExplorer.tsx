import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { File, FileJson, FileCode, FileText, Plus, Trash2, ArrowLeft } from 'lucide-react';

interface FileExplorerProps {
  activeFileId: string | null;
  onFileSelect: (id: string) => void;
}

export default function FileExplorer({ activeFileId, onFileSelect }: FileExplorerProps) {
  const { currentProject, addFile, deleteFile, closeProject } = useProject();

  const [isAdding, setIsAdding] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html': return <FileCode size={18} className="text-white" />;
      case 'js':
      case 'ts':
      case 'tsx': return <FileCode size={18} className="text-blue-400" />;
      case 'json': return <FileJson size={18} className="text-yellow-400" />;
      default: return <FileText size={18} className="text-zinc-400" />;
    }
  };

  const handleAddFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFileName.trim()) {
      addFile(newFileName.trim(), '');
      setNewFileName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="flex items-center justify-between px-2 py-2 mb-2">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Files</span>
          <button 
            onClick={() => setIsAdding(true)}
            className="p-1 hover:bg-zinc-800 rounded text-white"
          >
            <Plus size={18} />
          </button>
        </div>
        
        {isAdding && (
          <form onSubmit={handleAddFile} className="px-2 mb-2">
            <input 
              type="text"
              autoFocus
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              placeholder="filename.ext"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white"
              onBlur={() => !newFileName.trim() && setIsAdding(false)}
            />
          </form>
        )}
        
        {currentProject?.files.map(file => (
          <div 
            key={file.id}
            className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${activeFileId === file.id ? 'bg-zinc-900 border border-zinc-800' : 'hover:bg-zinc-900/50'}`}
            onClick={() => onFileSelect(file.id)}
          >
            <div className="flex items-center gap-3">
              {getFileIcon(file.name)}
              <span className={`text-sm ${activeFileId === file.id ? 'text-white' : 'text-zinc-400'} truncate max-w-[150px]`}>
                {file.name}
              </span>
            </div>
            
            {currentProject.files.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFile(file.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-zinc-800 mt-auto">
        <button
          onClick={closeProject}
          className="w-full flex items-center justify-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors text-sm font-semibold text-zinc-300"
        >
          <ArrowLeft size={16} />
          Close Project
        </button>
      </div>
    </div>
  );
}
