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
      You are "The Mistri", a Senior IDE Architect.
      Current Files: ${fileContext}
      User Request: "${prompt}"
      Return ONLY a JSON object: { "updatedFiles": [...], "summary": "" }
    `;

    try {
      let responseText = "";
      const targetModel = "gemini-1.5-pro";

      if (this.settings.source === 'studio') {
        onStatusUpdate(`Connecting via Cloud API...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${this.settings.geminiKey}`;
        
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: systemInstruction }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
          })
        });

        if (!response.ok) {
           const err = await response.json();
           throw new Error(err.error?.message || "Cloud API Error");
        }

        const data = await response.json();
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      } else {
        onStatusUpdate(`Connecting via Vertex AI...`);
        const url = `https://${this.settings.vertexLocation}-aiplatform.googleapis.com/v1/projects/${this.settings.vertexProject}/locations/${this.settings.vertexLocation}/publishers/google/models/${targetModel}:generateContent`;
        
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

      onStatusUpdate("Extracting JSON data...");
      
      let cleanedText = responseText.trim();
      
      // موبائل سیف طریقہ: ریجیکس کے بغیر ڈیٹا نکالنا
      const firstBrace = cleanedText.indexOf('{');
      const lastBrace = cleanedText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
      }

      let result;
      try {
        result = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error("Parse error:", parseError);
        throw new Error("AI response was not valid JSON.");
      }
      
      const updatedFiles: FileItem[] = (result.updatedFiles || []).map((f: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: f.name,
        content: f.content,
        language: f.language,
        path: f.path || f.name
      }));

      return {
        files: updatedFiles,
        summary: result.summary || "Done!"
      };

    } catch (error: any) {
      console.error("Mistri Error:", error);
      onStatusUpdate(`Error: ${error.message}`);
      throw error;
    }
  }
        }
