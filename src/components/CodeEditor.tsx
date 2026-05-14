import React from 'react';
import Editor from 'react-simple-code-editor';
// @ts-ignore
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/themes/prism-tomorrow.css';
import { useProject } from '../context/ProjectContext';
import { FileItem } from '../types';

interface CodeEditorProps {
  file?: FileItem | null;
}

export default function CodeEditor({ file }: CodeEditorProps) {
  const { updateFile } = useProject();

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 italic text-sm">
        Select a file to start editing
      </div>
    );
  }

  const highlight = (code: string) => {
    let lang = file.language;
    if (lang === 'html') lang = 'markup';
    if (!Prism.languages[lang]) lang = 'javascript';
    return Prism.highlight(code, Prism.languages[lang], lang);
  };

  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0a] relative">
      <div className="absolute top-0 left-0 right-0 h-8 bg-zinc-900/50 backdrop-blur border-b border-zinc-800 flex items-center px-4 z-10 sticky">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{file.name}</span>
      </div>
      <div className="p-4 pt-10 min-h-full font-mono text-sm leading-relaxed">
        <Editor
          value={file.content}
          onValueChange={code => updateFile(file.id, code)}
          highlight={highlight}
          padding={0}
          className="editor"
          style={{
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontSize: 14,
            minHeight: '100%',
            outline: 'none'
          }}
        />
      </div>
    </div>
  );
}
