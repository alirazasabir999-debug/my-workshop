import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { RefreshCw, Smartphone, Database, Github, Loader2 } from 'lucide-react';
import FilesModal from './FilesModal';
import { GitHubService } from '../services/github';
import { MistriSettings } from '../types';

export default function Preview() {
  const { currentProject, setLinkedRepo } = useProject();
  const [key, setKey] = useState(0);
  const [filesOpen, setFilesOpen] = useState(false);
  const [pushing, setPushing] = useState(false);

  const getPreviewContent = () => {
    if (!currentProject) return '';

    const htmlFile = currentProject.files.find(f => f.name === 'index.html');
    const cssFiles = currentProject.files.filter(f => f.name.endsWith('.css'));
    const jsFiles = currentProject.files.filter(f => f.name.endsWith('.js'));

    let content = htmlFile?.content || '<!DOCTYPE html><html><head></head><body>No index.html template found</body></html>';

    // Ensure basic structure
    if (!content.includes('<head>')) content = content.replace('<html>', '<html><head></head>');
    if (!content.includes('<body>')) content = content.replace('</head>', '</head><body>').replace('</html>', '<body></body></html>');

    // Inject Tailwind CDN
    const tailwindCDN = '<script src="https://cdn.tailwindcss.com"></script>';
    if (!content.includes('cdn.tailwindcss.com')) {
      content = content.replace('</head>', `${tailwindCDN}\n</head>`);
    }

    // Inject CSS
    const styles = cssFiles.map(f => `<style data-name="${f.name}">${f.content}</style>`).join('\n');
    content = content.replace('</head>', `${styles}\n</head>`);

    // Inject JS
    const scripts = jsFiles.map(f => `<script data-name="${f.name}">${f.content}</script>`).join('\n');
    content = content.replace('</body>', `${scripts}\n</body>`);

    return content;
  };

  const handlePush = async () => {
    if (!currentProject) return;
    const saved = localStorage.getItem('mistri_settings');
    if (!saved) {
      alert("Please configure your GitHub token in Settings first.");
      return;
    }
    const settings: MistriSettings = JSON.parse(saved);
    if (!settings.githubToken) {
      alert("Please configure your GitHub token in Settings first.");
      return;
    }

    setPushing(true);
    try {
      const github = new GitHubService(settings.githubToken);
      let repoName = currentProject.linkedRepo;
      
      // If no linked repo, create one based on project name
      if (!repoName) {
        // Sanitize project name for github repo (e.g., "My App" -> "my-app")
        const safeName = currentProject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `mistri-app-${Date.now()}`;
        
        // try to find or create
        const user = await github.getUserRepositories(); // Actually just returns list if called properly, but we can just use the internal push logic
        // We'll pass just the safeName suffix, the service will create it for the user if it doesn't exist
        repoName = safeName; 
      }

      // the GitHub service gets the user's login and prepends it, so if the user passed 'owner/repo', it might break if we just use `repoName`. Let's assume the service prepends the owner. If `linkedRepo` contains `owner/repo`, we must split.
      // Wait, `linkedRepo` from the prompt UI will be chosen from fetching all repos. Let's look at `pushToRepo` in `github.ts`.

      const finalRepoPath = repoName.includes('/') ? repoName.split('/')[1] : repoName;
      // Note: github.ts pushToRepo uses `/repos/${owner}/${repoName}`. It uses the currently authenticated user's owner.

      await github.pushToRepo(finalRepoPath, currentProject.files);
      
      if (!currentProject.linkedRepo) {
        // We need the owner to store the full name. 
        // We can fetch user or just store finalRepoPath. Let's just store finalRepoPath.
        setLinkedRepo(finalRepoPath);
      }
      alert('Successfully pushed to GitHub!');
    } catch (e: any) {
      alert(`Failed to push: ${e.message}`);
    } finally {
      setPushing(false);
    }
  };

  const previewContent = getPreviewContent();

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex items-center justify-between px-3 h-12 border-b border-zinc-200 bg-zinc-50 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setKey(k => k + 1)}
            className="flex items-center gap-1.5 px-2 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-md transition-colors text-xs font-bold shadow-sm"
            title="Launch App"
          >
            <Smartphone size={14} />
            <span>Launch!</span>
          </button>
          <button 
            onClick={() => setKey(k => k + 1)}
            className="p-1.5 hover:bg-zinc-200 text-zinc-700 rounded-md transition-colors"
            title="Refresh Preview"
          >
            <RefreshCw size={14} />
          </button>
          <button 
            onClick={() => setFilesOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-zinc-200 text-zinc-700 rounded-md transition-colors text-xs font-semibold"
          >
            <Database size={14} />
            <span>Database/Files</span>
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {currentProject?.linkedRepo && (
            <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[100px] hidden sm:inline">
              {currentProject.linkedRepo}
            </span>
          )}
          <button 
            onClick={handlePush}
            disabled={pushing}
            className="flex items-center gap-1.5 px-2 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-md transition-colors text-xs font-semibold disabled:opacity-50"
          >
            {pushing ? <Loader2 size={14} className="animate-spin" /> : <Github size={14} />}
            <span>Push</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 bg-white relative">
        <iframe
          key={key}
          title="Project Preview"
          srcDoc={previewContent}
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-modals allow-same-origin"
        />
      </div>

      <FilesModal open={filesOpen} onClose={() => setFilesOpen(false)} />
    </div>
  );
}
