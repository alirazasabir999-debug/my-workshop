import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { X, ChevronLeft, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FileExplorer from './FileExplorer';
import CodeEditor from './CodeEditor';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function FilesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentProject } = useProject();
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  if (!open || !currentProject) return null;

  const activeFile = currentProject.files.find(f => f.id === activeFileId);

  const downloadProject = async () => {
    if (!currentProject) return;
    const zip = new JSZip();
    
    // Add all user-generated files to src/
    currentProject.files.forEach(f => {
      const filePath = f.path || f.name;
      // If the AI generated an App.tsx etc, put it in src/ unless it already includes src/
      const finalPath = filePath.startsWith('src/') ? filePath : `src/${filePath}`;
      zip.file(finalPath, f.content);
    });

    const safeName = currentProject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `mistri-app-${Date.now()}`;

    // Add Cloudflare wrangler.toml
    zip.file('wrangler.toml', `name = "${safeName}"
compatibility_date = "2024-03-20"
pages_build_output_dir = "dist"
`);

    // Add standard package.json
    zip.file('package.json', JSON.stringify({
      name: safeName,
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview"
      },
      dependencies: {
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "lucide-react": "^0.263.1",
        "motion": "^12.23.24"
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.0.3",
        "tailwindcss": "^3.3.0",
        "autoprefixer": "^10.4.15",
        "postcss": "^8.4.27",
        "vite": "^4.4.5"
      }
    }, null, 2));

    // Add vite.config.ts
    zip.file('vite.config.ts', `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})
`);

    // Add tailwind setup
    zip.file('tailwind.config.js', `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`);

    zip.file('postcss.config.js', `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`);

    // Add public index.html
    zip.file('index.html', `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${currentProject.name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`);

    // Add index.css if not provided by user
    const hasCss = currentProject.files.some(f => (f.path || f.name).endsWith('.css'));
    if (!hasCss) {
      zip.file('src/index.css', `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-black text-white antialiased;
  }
}
`);
    }

    // Add main.tsx if not provided by user
    const hasMain = currentProject.files.some(f => (f.path || f.name) === 'main.tsx' || (f.path || f.name) === 'src/main.tsx');
    if (!hasMain) {
      zip.file('src/main.tsx', `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${safeName}.zip`);
  };

  return (
    <div className="absolute inset-0 z-[60] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-lg shrink-0">
        <div className="flex items-center gap-3">
          {activeFileId && (
            <button onClick={() => setActiveFileId(null)} className="p-1 hover:bg-zinc-800 rounded-lg transition-colors text-white">
              <ChevronLeft size={20} />
            </button>
          )}
          <h2 className="font-semibold text-sm text-white">
            {activeFileId ? activeFile?.name : 'Project Files'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {!activeFileId && (
            <button 
              onClick={downloadProject} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-200 text-black rounded-md transition-colors text-xs font-bold shadow-sm"
            >
              <Download size={14} />
              <span>Download ZIP</span>
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {!activeFileId ? (
            <motion.div 
              key="explorer"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 overflow-y-auto"
            >
              <FileExplorer 
                activeFileId={null} 
                onFileSelect={(id) => setActiveFileId(id)} 
              />
            </motion.div>
          ) : (
            <motion.div 
              key="editor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0 flex flex-col"
            >
              <CodeEditor file={activeFile} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
