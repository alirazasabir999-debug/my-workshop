import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { 
  Menu, X, Settings, MessageSquare, Play, 
  FileCode, Cpu, Github, RefreshCw, Layers, LogOut, Cloud, CloudOff, RefreshCcw, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FileExplorer from './FileExplorer';
import ChatInterface from './ChatInterface';
import Preview from './Preview';
import SettingsModal from './SettingsModal';

export default function MainIDE() {
  const { currentProject, closeProject, cfSyncStatus, cfSyncError } = useProject();
  const [activeTab, setActiveTab] = useState<'chat' | 'preview'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  useEffect(() => {
    if (currentProject && !activeFileId) {
      setActiveFileId(currentProject.files[0]?.id || null);
    }
  }, [currentProject]);

  const activeFile = currentProject?.files.find(f => f.id === activeFileId);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-black relative">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-lg z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={closeProject}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors mr-1"
            title="Exit Project"
          >
            <LogOut size={20} />
          </button>
          <span className="font-semibold text-sm truncate max-w-[150px]">
            {currentProject?.name}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="group relative flex items-center justify-center">
            {cfSyncStatus === 'syncing' && <span title="Syncing..."><RefreshCcw size={16} className="text-blue-400 animate-spin" /></span>}
            {cfSyncStatus === 'success' && <span title="Synced to Cloudflare"><Cloud size={16} className="text-green-500" /></span>}
            {cfSyncStatus === 'error' && <span title="Cloudflare CF Sync Failed"><CloudOff size={16} className="text-red-500" /></span>}
            {cfSyncStatus === 'idle' && <span title="Saved locally"><Cloud size={16} className="text-zinc-600" /></span>}
            
            {cfSyncStatus === 'error' && cfSyncError && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-red-900 text-red-400 text-xs p-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                <div className="flex items-start gap-1">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <span>{cfSyncError}</span>
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={() => setSettingsOpen(true)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden pb-16">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' ? (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 flex flex-col pb-16"
            >
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <ChatInterface />
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0 pb-16"
            >
              <Preview />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation (Fixed Footer) */}
      <nav className="fixed bottom-0 w-full max-w-[450px] h-16 border-t border-zinc-800 flex items-center bg-zinc-950/95 backdrop-blur-xl z-[100] pb-safe" style={{ left: '50%', transform: 'translateX(-50%)' }}>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors ${activeTab === 'chat' ? 'text-white' : 'text-zinc-500'}`}
        >
          <MessageSquare size={22} />
          <span className="text-[10px] font-medium uppercase tracking-widest">Chat</span>
        </button>
        <button 
          onClick={() => setActiveTab('preview')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors ${activeTab === 'preview' ? 'text-white' : 'text-zinc-500'}`}
        >
          <Play size={22} />
          <span className="text-[10px] font-medium uppercase tracking-widest">Preview</span>
        </button>
      </nav>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 bottom-0 w-[80%] max-w-[300px] bg-zinc-950 border-r border-zinc-800 z-50 flex flex-col"
            >
              <div className="p-4 flex items-center justify-between border-b border-zinc-800">
                <h2 className="font-bold">Project Files</h2>
                <button onClick={() => setSidebarOpen(false)}>
                  <X size={24} className="text-zinc-500" />
                </button>
              </div>
              <FileExplorer 
                activeFileId={activeFileId} 
                onFileSelect={(id) => {
                  setActiveFileId(id);
                  setSidebarOpen(false);
                }} 
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
