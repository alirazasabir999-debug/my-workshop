import { GoogleGenAI } from "@google/genai";
import { FileItem, MistriSettings } from "../types";

export class GeminiService {
  private settings: MistriSettings;

  constructor(settings: MistriSettings) {
    this.settings = settings;
  }

  async generateCode(
    prompt: string,
    currentFiles: FileItem[],
    onStatusUpdate: (status: string) => void
  ): Promise<{ files: FileItem[]; summary: string }> {
    onStatusUpdate("Analyzing current project structure...");
    
    const fileContext = currentFiles.map(f => `File: ${f.name}\nLanguage: ${f.language}\nContent:\n${f.content}`).join("\n\n---\n\n");
    
    const systemInstruction = `
      You are "The Mistri", a Senior IDE Architect and AI Coding Assistant.
      You are helping a developer build a project.
      
      Current Project Files:
      ${fileContext}
      
      User Request: "${prompt}"
      
      Instructions:
      1. Analyze the existing files and the request.
      2. Provide the UPDATED or NEW files in a JSON format.
      3. Provide a clear summary of what you did. DO NOT include any HTML buttons (like <button>Launch!</button>) in your summary. Only plain text and markdown formatting.
      4. Always use correct file paths.
      5. THE RESPONSE MUST BE A VALID JSON OBJECT with two fields: 
         - "updatedFiles": an array of { name: string, content: string, language: string, path: string }
         - "summary": a detailed breakdown of changes.
      
      Respond ONLY with the JSON object. Do not include markdown code block syntax around the JSON data.
    `;

    try {
      let responseText = "";

      if (this.settings.source === 'studio') {
        let finalModel = this.settings.model;
        if (finalModel === 'gemini-3.1-pro') {
          finalModel = 'gemini-3.1-pro-preview';
        }
        
        onStatusUpdate(`Connecting to AI Studio (${this.settings.model})...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${this.settings.geminiKey}`;
        
        onStatusUpdate("The Mistri is thinking...");
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: systemInstruction }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (!response.ok) {
           const err = await response.json();
           throw new Error(err.error?.message || "AI Studio API Error");
        }

        const data = await response.json();
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      } else {
        let finalModel = this.settings.model;
        if (finalModel === 'gemini-3.1-pro') {
          finalModel = 'gemini-3.1-pro-preview';
        }

        onStatusUpdate(`Connecting to Google Cloud Vertex AI (${this.settings.model})...`);
        
        const url = `https://${this.settings.vertexLocation}-aiplatform.googleapis.com/v1/projects/${this.settings.vertexProject}/locations/${this.settings.vertexLocation}/publishers/google/models/${finalModel}:generateContent`;
        
        onStatusUpdate("The Mistri is thinking...");
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.settings.vertexToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: systemInstruction }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (!response.ok) {
           const err = await response.json();
           throw new Error(err.error?.message || "Vertex AI API Error");
        }

        const data = await response.json();
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      }

      onStatusUpdate("Applying changes to project...");
      
      let cleanedText = responseText.trim();
      const match = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (match) {
        cleanedText = match[1].trim();
      } else {
        cleanedText = cleanedText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
      }

      let result;
      try {
        result = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error("Mistri Engine parse error:", parseError, "Raw context:", responseText);
        throw new Error("Failed to parse AI response as JSON.");
      }
      
      const updatedFiles: FileItem[] = (result.updatedFiles || []).map((f: any) => ({
        id: f.id || Math.random().toString(36).substr(2, 9),
        name: f.name,
        content: f.content,
        language: f.language,
        path: f.path || f.name
      }));

      return {
        files: updatedFiles,
        summary: result.summary || "Code generation completed."
      };
    } catch (error) {
      console.error("Mistri Engine Error:", error);
      onStatusUpdate("Error occurred during generation.");
      throw error;
    }
  }
}
