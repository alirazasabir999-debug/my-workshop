import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { GeminiService } from '../services/gemini';
import { Send, Brain, History } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { MistriSettings } from '../types';

export default function ChatInterface() {
  const { currentProject, applyAIChanges, addChatMessage } = useProject();
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Use the context-level history
  const history = currentProject?.chatHistory || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, status, loading]);

  const handleSend = async () => {
    if (!prompt.trim() || loading || !currentProject) return;

    // Load settings
    const saved = localStorage.getItem('mistri_settings');
    let settings: MistriSettings | null = null;
    if (saved) {
      settings = JSON.parse(saved);
    } else {
      const gKey = localStorage.getItem('mistri_gemini_key') || process.env.GEMINI_API_KEY || '';
      if (gKey) {
        settings = {
          source: 'studio',
          model: 'gemini-3.1-pro',
          geminiKey: gKey,
          vertexProject: '',
          vertexLocation: 'us-central1',
          vertexToken: '',
          githubToken: ''
        };
      }
    }

    if (!settings || (settings.source === 'studio' && !settings.geminiKey) || (settings.source === 'vertex' && !settings.vertexToken)) {
      addChatMessage({ role: 'assistant', content: "⚠️ **Auth Missing!** Please open Settings (gear icon) and configure your AI source." });
      return;
    }

    const currentPrompt = prompt;
    setPrompt('');
    setLoading(true);
    addChatMessage({ role: 'user', content: currentPrompt });

    try {
      const gemini = new GeminiService(settings);
      const { files, summary } = await gemini.generateCode(
        currentPrompt,
        currentProject.files,
        (msg) => setStatus(msg)
      );

      applyAIChanges(files);
      addChatMessage({ role: 'assistant', content: summary });
      setStatus('');
    } catch (error: any) {
      console.error(error);
      const errorMsg = error?.message || String(error);
      addChatMessage({ 
        role: 'assistant', 
        content: `⚠️ **Mistri Engine Error:**\n\`\`\`json\n${errorMsg}\n\`\`\`\n\nPlease check your config or network.` 
      });
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <div className="h-full bg-zinc-950 flex flex-col z-20">
      <div className="flex items-center justify-between px-4 h-10 border-b border-zinc-900 shrink-0">
        <div className="flex items-center gap-2">
          <History size={14} className="text-zinc-500" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">The Mistri</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {history.length === 0 && (
          <div className="text-zinc-500 text-sm flex flex-col items-center justify-center h-full gap-2">
            <Brain size={32} className="opacity-20" />
            <p>Tell The Mistri what to build next...</p>
          </div>
        )}
        {history.map((item, i) => (
          <div key={i} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
              item.role === 'user' 
                ? 'bg-black border border-zinc-700 text-white' 
                : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
            }`}>
              {item.role === 'assistant' ? (
                <div className="markdown-body prose prose-invert prose-sm">
                  <ReactMarkdown>{item.content}</ReactMarkdown>
                </div>
              ) : item.content}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4 text-white">
              <div className="relative w-8 h-8 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10"
                >
                  <Brain size={24} />
                </motion.div>
              </div>
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={status}
                className="text-xs font-bold uppercase tracking-widest"
              >
                {status}
              </motion.span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-zinc-950 border-t border-zinc-800 shrink-0">
        <div className="flex gap-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 focus-within:border-white transition-colors">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="E.g., 'Add a dark mode toggle'..."
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-zinc-600"
          />
          <button
            onClick={handleSend}
            disabled={loading || !prompt.trim()}
            className="p-2 bg-white text-black rounded-lg active:scale-95 transition-transform disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
