import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { GitHubService } from '../services/github';
import { X, Key, Github, Download, Upload, CheckCircle2, Settings, Cloud, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MistriSettings } from '../types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { currentProject, applyAIChanges, setLinkedRepo } = useProject();
  const [settings, setSettings] = useState<MistriSettings>({
    source: 'studio',
    model: 'gemini-3.1-pro',
    geminiKey: '',
    vertexProject: '',
    vertexLocation: 'us-central1',
    vertexToken: '',
    githubToken: ''
  });

  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('mistri_settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    } else {
      // Fallback to legacy
      setSettings(prev => ({
        ...prev,
        geminiKey: localStorage.getItem('mistri_gemini_key') || '',
        githubToken: localStorage.getItem('mistri_github_token') || ''
      }));
    }
  }, [open]);

  const saveSettings = () => {
    localStorage.setItem('mistri_settings', JSON.stringify(settings));
    // Save legacy for fallback
    localStorage.setItem('mistri_gemini_key', settings.geminiKey);
    localStorage.setItem('mistri_github_token', settings.githubToken);
    
    setStatus('Saved!');
    setTimeout(() => setStatus(''), 2000);
  };

  const updateSetting = (key: keyof MistriSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const fetchRepos = async () => {
    if (!settings.githubToken) {
      setStatus('GitHub Token missing!');
      setTimeout(() => setStatus(''), 3000);
      return;
    }
    setLoadingRepos(true);
    try {
      const github = new GitHubService(settings.githubToken);
      const data = await github.getUserRepositories();
      setRepos(data);
    } catch (e) {
      setStatus('Failed to fetch repos. Check token.');
      setTimeout(() => setStatus(''), 3000);
    } finally {
      setLoadingRepos(false);
    }
  };

  const importRepo = async (repoPath: string) => {
    setStatus(`Importing ${repoPath}...`);
    try {
      const github = new GitHubService(settings.githubToken);
      const files = await github.getRepoContents(repoPath);
      applyAIChanges(files);
      setStatus('Imported!');
      setTimeout(() => {
        setStatus('');
        onClose();
      }, 1000);
    } catch (e) {
      setStatus('Failed to import repository.');
      setTimeout(() => setStatus(''), 3000);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="w-full max-w-lg bg-zinc-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-zinc-800 shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh]"
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="text-white" />
            Workspace Settings
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
          
          {/* AI Engine Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-zinc-300">
              <Zap size={16} className="text-white" />
              The Mistri AI Engine
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => updateSetting('source', 'studio')}
                className={`p-3 rounded-xl border flex flex-col gap-1 items-start transition-colors ${settings.source === 'studio' ? 'bg-white text-black border-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}
              >
                <span className="font-bold text-sm">AI Studio</span>
                <span className="text-[10px] uppercase tracking-wider">Fast / API Key</span>
              </button>
              <button
                onClick={() => updateSetting('source', 'vertex')}
                className={`p-3 rounded-xl border flex flex-col gap-1 items-start transition-colors ${settings.source === 'vertex' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}
              >
                <span className="font-bold text-sm">Vertex AI</span>
                <span className="text-[10px] uppercase tracking-wider">GCP / OAuth</span>
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">AI Model</label>
              <select 
                value={settings.model}
                onChange={e => updateSetting('model', e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white appearance-none"
              >
                <option value="gemini-3.1-pro">Gemini 3.1 Pro</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              </select>
            </div>

            {settings.source === 'studio' ? (
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Gemini API Key</label>
                <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center px-4 gap-3 focus-within:border-white transition-colors">
                  <Key size={16} className="text-zinc-600" />
                  <input 
                    type="password"
                    value={settings.geminiKey}
                    onChange={e => updateSetting('geminiKey', e.target.value)}
                    placeholder="AIzaSy..."
                    className="bg-transparent w-full py-3 text-sm outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">GCP Project ID</label>
                  <input 
                    type="text"
                    value={settings.vertexProject}
                    onChange={e => updateSetting('vertexProject', e.target.value)}
                    placeholder="my-gcp-project"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">GCP Location</label>
                  <input 
                    type="text"
                    value={settings.vertexLocation}
                    onChange={e => updateSetting('vertexLocation', e.target.value)}
                    placeholder="us-central1"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">GCP Access Token</label>
                  <input 
                    type="password"
                    value={settings.vertexToken}
                    onChange={e => updateSetting('vertexToken', e.target.value)}
                    placeholder="ya29.a0..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* GitHub Actions */}
          <div className="pt-6 border-t border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-zinc-300">
              <Github size={16} />
              GitHub Integration
            </h3>
            
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Personal Access Token</label>
              <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center px-4 gap-3 focus-within:border-white transition-colors">
                <Github size={16} className="text-zinc-600" />
                <input 
                  type="password"
                  value={settings.githubToken}
                  onChange={e => updateSetting('githubToken', e.target.value)}
                  placeholder="ghp_..."
                  className="bg-transparent w-full py-3 text-sm outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2">
              <button 
                onClick={fetchRepos}
                className="flex items-center justify-center gap-2 p-3 bg-zinc-800 rounded-xl text-xs font-semibold hover:bg-zinc-700 transition-colors"
              >
                <Download size={14} />
                {loadingRepos ? 'Fetching...' : 'Fetch Repositories'}
              </button>
            </div>

            {repos.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-1">Link / Import Repository</span>
                <div className="bg-zinc-950 rounded-xl p-2 max-h-40 overflow-y-auto border border-zinc-800 custom-scrollbar flex flex-col gap-1">
                  {repos.map(r => (
                    <button 
                      key={r.id}
                      onClick={() => setLinkedRepo(r.full_name)}
                      className={`w-full text-left p-2 rounded-lg text-xs truncate flex items-center justify-between ${currentProject?.linkedRepo === r.full_name ? 'bg-white text-black' : 'hover:bg-zinc-900'}`}
                    >
                      <span>{r.full_name}</span>
                      {currentProject?.linkedRepo === r.full_name && <CheckCircle2 size={14} />}
                    </button>
                  ))}
                </div>
                {currentProject?.linkedRepo && (
                  <button 
                    onClick={() => importRepo(currentProject.linkedRepo!)}
                    className="flex items-center justify-center gap-2 p-3 bg-white text-black rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors w-full mt-2"
                  >
                    <Download size={14} />
                    Import from Selected Repo
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between shrink-0">
          <div className="flex-1">
            {status && (
              <span className="flex items-center gap-2 text-green-500 font-bold text-xs bg-green-500/10 px-3 py-1.5 rounded-lg w-fit">
                <CheckCircle2 size={14} />
                {status}
              </span>
            )}
          </div>
          <button onClick={saveSettings} className="px-6 py-3 bg-white text-black font-bold rounded-xl text-sm active:scale-95 transition-transform">
            Save All Settings
          </button>
        </div>
      </motion.div>
    </div>
  );
}
