import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { GeminiService } from '../services/gemini';
import { Send, Brain, History, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { MistriSettings } from '../types';

export default function ChatInterface() {
  const { currentProject, applyAIChanges, addChatMessage } = useProject();
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const history = currentProject?.chatHistory || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, status, loading]);

  const handleSend = async () => {
    if (!prompt.trim() || loading || !currentProject) return;

    // Load settings from storage
    const saved = localStorage.getItem('mistri_settings');
    let settings: MistriSettings | null = null;
    
    if (saved) {
      settings = JSON.parse(saved);
    } else {
      const gKey = localStorage.getItem('mistri_gemini_key') || '';
      if (gKey) {
        settings = {
          source: 'studio',
          model: 'gemini-3.1-pro-latest', // 2026 کا لیٹسٹ ماڈل
          geminiKey: gKey,
          vertexProject: '',
          vertexLocation: 'us-central1',
          vertexToken: '',
          githubToken: ''
        };
      }
    }

    if (!settings || (settings.source === 'studio' && !settings.geminiKey)) {
      addChatMessage({ 
        role: 'assistant', 
        content: "⚠️ **ترتیب (Settings) مکمل نہیں!** براہ کرم سیٹنگز میں جا کر اپنی API Key چیک کریں۔" 
      });
      return;
    }

    const currentPrompt = prompt;
    setPrompt('');
    setLoading(true);
    addChatMessage({ role: 'user', content: currentPrompt });

    try {
      // اے آئی سروس کو کال کرنا
      const gemini = new GeminiService(settings);
      
      // ہم سٹیٹس کو یہاں اپ ڈیٹ کریں گے
      const result = await gemini.generateCode(
        currentPrompt,
        currentProject.files,
        (msg) => setStatus(msg)
      );

      if (result && result.files && result.files.length > 0) {
        setStatus("فائلوں میں تبدیلیاں لاگو کی جا رہی ہیں...");
        
        // یہاں ہم AI کی طرف سے آنے والی تبدیلیوں کو پروجیکٹ میں ڈالتے ہیں
        await applyAIChanges(result.files);
        
        addChatMessage({ 
          role: 'assistant', 
          content: result.summary || "✅ مستری نے آپ کی درخواست کے مطابق کوڈ اپڈیٹ کر دیا ہے۔" 
        });
      } else {
        addChatMessage({ 
          role: 'assistant', 
          content: "⚠️ **نوٹ:** AI نے جواب تو دیا ہے لیکن کوئی نئی فائل یا کوڈ میں تبدیلی نہیں ملی۔ دوبارہ کوشش کریں۔" 
        });
      }

    } catch (error: any) {
      console.error("ChatInterface Error:", error);
      const errorMsg = error?.message || String(error);
      addChatMessage({ 
        role: 'assistant', 
        content: `⚠️ **مستری انجن میں خرابی:**\n\n${errorMsg}\n\nبراہ کرم اپنا نیٹ ورک یا کنفیگریشن چیک کریں۔` 
      });
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <div className="h-full bg-zinc-950 flex flex-col z-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-zinc-900 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-blue-400" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Mistri Engine v3.1 Pro</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-600">
           <History size={12} />
           <span className="text-[9px] uppercase tracking-tighter">Live Session</span>
        </div>
      </div>

      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 to-transparent">
        {history.length === 0 && (
          <div className="text-zinc-500 text-sm flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="p-4 rounded-full bg-zinc-900/50 border border-zinc-800">
              <Brain size={40} className="text-blue-500/50" />
            </div>
            <div>
              <h3 className="text-zinc-300 font-bold mb-1 tracking-tight">مستری ڈیولپر آن لائن ہے</h3>
              <p className="text-xs text-zinc-600">بتائیے، آج آپ کے پراجیکٹ میں کیا نیا بنانا ہے؟</p>
            </div>
          </div>
        )}
        
        {history.map((item, i) => (
          <div key={i} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] p-3 rounded-2xl text-sm ${
              item.role === 'user' 
                ? 'bg-blue-600/10 border border-blue-500/20 text-blue-50' 
                : 'bg-zinc-900 border border-zinc-800 text-zinc-300 shadow-lg'
            }`}>
              {item.role === 'assistant' ? (
                <div className="markdown-body prose prose-invert prose-sm leading-relaxed">
                  <ReactMarkdown>{item.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="leading-snug">{item.content}</p>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-white">
              <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                >
                  <Brain size={18} className="text-blue-400" />
                </motion.div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Mistri is thinking...</span>
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={status}
                  className="text-xs text-blue-400 font-medium"
                >
                  {status || "کنکشن قائم کیا جا رہا ہے..."}
                </motion.span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-900 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
        <div className="flex gap-2 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="مثلاً: 'ایک ڈارک موڈ ٹوگل شامل کریں'..."
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-zinc-600 text-zinc-200"
          />
          <button
            onClick={handleSend}
            disabled={loading || !prompt.trim()}
            className="p-2.5 bg-white text-black rounded-xl active:scale-90 transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center shadow-lg"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
            }
    
