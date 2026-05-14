import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Project, FileItem, ChatMessage } from '../types';

interface ProjectContextType {
  loadingProjects: boolean;
  currentProject: Project | null;
  projects: Project[];
  createNewProject: (name: string) => void;
  openProject: (projectId: string) => void;
  updateFile: (fileId: string, content: string) => void;
  addFile: (name: string, content: string) => void;
  deleteFile: (fileId: string) => void;
  applyAIChanges: (files: FileItem[]) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setLinkedRepo: (repoFullName: string) => void;
  closeProject: () => void;
  cfSyncStatus: 'idle' | 'syncing' | 'success' | 'error';
  cfSyncError: string | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);
const CF_URL = "https://my-workshop-app.contact-indrvx.workers.dev/";

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [cfSyncStatus, setCfSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [cfSyncError, setCfSyncError] = useState<string | null>(null);

  const userId = useMemo(() => {
    let uid = localStorage.getItem('mistri_user_id');
    if (!uid) { 
      uid = Math.random().toString(36).substr(2, 9); 
      localStorage.setItem('mistri_user_id', uid); 
    }
    return uid;
  }, []);

  // Initial Fetch from Cloudflare (fallback to LocalStorage)
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${CF_URL}?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.projects && Array.isArray(data.projects)) {
            setProjects(data.projects);
          } else if (Array.isArray(data)) {
            setProjects(data);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch from CF, using LocalStorage', e);
        const saved = localStorage.getItem('mistri_projects');
        if (saved) setProjects(JSON.parse(saved));
      } finally {
        const currentSavedId = localStorage.getItem('mistri_current_project');
        if (currentSavedId) setCurrentProjectId(currentSavedId);
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, [userId]);

  // Sync to LocalStorage and Cloudflare with debounce
  useEffect(() => {
    if (loadingProjects) return;

    localStorage.setItem('mistri_projects', JSON.stringify(projects));
    if (currentProjectId) {
      localStorage.setItem('mistri_current_project', currentProjectId);
    } else {
      localStorage.removeItem('mistri_current_project');
    }

    const timeoutId = setTimeout(async () => {
      setCfSyncStatus('syncing');
      try {
        const res = await fetch(CF_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
          body: JSON.stringify({ userId, projects })
        });
        if (!res.ok) {
          throw new Error(`Cloudflare sync failed: ${res.statusText}`);
        }
        setCfSyncStatus('success');
        setCfSyncError(null);
      } catch (e: any) {
        console.error('CF Sync failed:', e);
        setCfSyncStatus('error');
        setCfSyncError(e.message || 'Unknown CF Sync Error');
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [projects, currentProjectId, userId, loadingProjects]);

  const createNewProject = (name: string) => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      files: [
        { id: '1', name: 'index.html', content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>New Project</title>\n</head>\n<body>\n  <h1 class="text-3xl font-bold p-4">Hello Mistri</h1>\n</body>\n</html>', language: 'html', path: 'index.html' }
      ],
      chatHistory: [],
      lastModified: Date.now()
    };
    setProjects(prev => [...prev, newProject]);
    setCurrentProjectId(newProject.id);
  };

  const openProject = (projectId: string) => {
    setCurrentProjectId(projectId);
  };

  const updateFile = useCallback((fileId: string, content: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === currentProjectId) {
        return {
          ...p,
          lastModified: Date.now(),
          files: p.files.map(f => f.id === fileId ? { ...f, content } : f)
        };
      }
      return p;
    }));
  }, [currentProjectId]);

  const addFile = (name: string, content: string) => {
    if (!currentProjectId) return;
    const language = name.split('.').pop() || 'text';
    setProjects(prev => prev.map(p => {
      if (p.id === currentProjectId) {
        return {
          ...p,
          lastModified: Date.now(),
          files: [...p.files, { id: Math.random().toString(36).substr(2, 9), name, content, language, path: name }]
        };
      }
      return p;
    }));
  };

  const deleteFile = (fileId: string) => {
    if (!currentProjectId) return;
    setProjects(prev => prev.map(p => {
      if (p.id === currentProjectId) {
        return {
          ...p,
          lastModified: Date.now(),
          files: p.files.filter(f => f.id !== fileId)
        };
      }
      return p;
    }));
  };

  const applyAIChanges = (newFiles: FileItem[]) => {
    if (!currentProjectId) return;
    setProjects(prev => prev.map(p => {
      if (p.id === currentProjectId) {
        let updatedFiles = [...p.files];
        newFiles.forEach(nf => {
          const index = updatedFiles.findIndex(uf => uf.path === nf.path || uf.name === nf.name);
          if (index !== -1) {
            updatedFiles[index] = { ...updatedFiles[index], content: nf.content };
          } else {
            updatedFiles.push(nf);
          }
        });
        return { ...p, lastModified: Date.now(), files: updatedFiles };
      }
      return p;
    }));
  };

  const addChatMessage = (msg: ChatMessage) => {
    if (!currentProjectId) return;
    setProjects(prev => prev.map(p => {
      if (p.id === currentProjectId) {
        return { ...p, chatHistory: [...(p.chatHistory || []), msg] };
      }
      return p;
    }));
  };

  const setLinkedRepo = (repoFullName: string) => {
    if (!currentProjectId) return;
    setProjects(prev => prev.map(p => {
      if (p.id === currentProjectId) {
        return { ...p, linkedRepo: repoFullName };
      }
      return p;
    }));
  };

  const closeProject = () => {
    setCurrentProjectId(null);
  };

  const currentProject = projects.find(p => p.id === currentProjectId) || null;

  return (
    <ProjectContext.Provider value={{
      loadingProjects,
      currentProject,
      projects,
      createNewProject,
      openProject,
      updateFile,
      addFile,
      deleteFile,
      applyAIChanges,
      addChatMessage,
      setLinkedRepo,
      closeProject,
      cfSyncStatus,
      cfSyncError
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within ProjectProvider');
  return context;
};
