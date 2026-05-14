
export interface FileItem {
  id: string;
  name: string;
  content: string;
  language: string;
  path: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Project {
  id: string;
  name: string;
  files: FileItem[];
  chatHistory: ChatMessage[];
  linkedRepo?: string;
  lastModified: number;
}

export interface MistriSettings {
  source: 'studio' | 'vertex';
  model: string;
  geminiKey: string;
  vertexProject: string;
  vertexLocation: string;
  vertexToken: string;
  githubToken: string;
}

export interface AIStatus {
  isGenerating: boolean;
  message: string;
}
