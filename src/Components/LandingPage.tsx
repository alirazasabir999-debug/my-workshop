import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Plus, FolderOpen, Code2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function LandingPage() {
  const { createNewProject, openProject, projects, loadingProjects } = useProject();
  const [showOpen, setShowOpen] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      createNewProject(newProjectName.trim());
      setNewProjectName('');
      setShowNew(false);
    }
  };

  if (loadingProjects) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
        <p className="text-zinc-500">Syncing with Cloud...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Code2 size={40} className="text-black" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Mistri AI Workshop</h1>
        <p className="text-zinc-400 max-w-xs mx-auto">Mobile-First IDE powered by Gemini 3.1 Pro</p>
      </motion.div>

      <div className="w-full max-w-sm space-y-4">
        {!showOpen && !showNew && (
          <>
            <button
              onClick={() => setShowNew(true)}
              className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-4 rounded-xl active:scale-95 transition-transform"
            >
              <Plus size={20} />
              Create New Project
            </button>
            <button
              onClick={() => setShowOpen(true)}
              className="w-full flex items-center justify-center gap-3 bg-zinc-800 text-white font-semibold py-4 rounded-xl active:scale-95 transition-transform border border-zinc-700"
            >
              <FolderOpen size={20} />
              Open Existing Project
            </button>
          </>
        )}

        {showNew && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">New Project</h2>
              <button 
                type="button"
                onClick={() => setShowNew(false)}
                className="text-white hover:text-zinc-300 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
            <input 
              type="text"
              autoFocus
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              placeholder="e.g. My Awesome App"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white"
            />
            <button
              type="submit"
              disabled={!newProjectName.trim()}
              className="w-full bg-white text-black hover:bg-zinc-200 font-semibold py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-50 disabled:bg-zinc-800"
            >
              Create
            </button>
          </form>
        )}

        {showOpen && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Your Projects</h2>
              <button 
                onClick={() => setShowOpen(false)}
                className="text-white hover:text-zinc-300 text-sm font-medium"
              >
                Back
              </button>
            </div>
            {projects.length === 0 ? (
              <p className="text-zinc-500 py-8">No projects found.</p>
            ) : (
              projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => openProject(p.id)}
                  className="w-full text-left p-4 bg-zinc-900 rounded-xl border border-zinc-800 active:bg-zinc-800 transition-colors"
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-zinc-500">Modified {new Date(p.lastModified).toLocaleDateString()}</div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
