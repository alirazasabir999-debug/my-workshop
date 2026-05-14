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
      Current Project Files:
      ${fileContext}
      User Request: "${prompt}"
      Instructions:
      1. Provide updated or new files in a valid JSON format.
      2. Keep the summary clear.
      3. THE RESPONSE MUST BE A VALID JSON OBJECT:
         {
           "updatedFiles": [{ "name": string, "content": string, "language": string, "path": string }],
           "summary": string
         }
      Respond ONLY with the JSON.
    `;

    try {
      let responseText = "";
      const targetModel = "gemini-1.5-pro";

      if (this.settings.source === 'studio') {
        onStatusUpdate(`Connecting via Cloud API (${targetModel})...`);
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
        onStatusUpdate(`Connecting to Vertex AI (${targetModel})...`);
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

      onStatusUpdate("Applying changes to project...");
      
      let cleanedText = responseText.trim();
      
      // یہاں تبدیلی کی گئی ہے: اب یہ لائن ٹوٹنے سے ایرر نہیں دے گا
      const jsonRegex = new RegExp("```(?:json)?\\s*([\\s\\S]*?)\\s*
```", "i");
      const match = cleanedText.match(jsonRegex);
      
      if (match) {
        cleanedText = match[1].trim();
      } else {
        cleanedText = cleanedText
          .replace(/^```json/i, "")
          .replace(/^
```/i, "")
          .replace(/```$/i, "")
          .trim();
      }

      let result;
      try {
        result = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error("Mistri Engine parse error:", parseError);
        throw new Error("Failed to parse AI response as JSON.");
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
        summary: result.summary || "Code updated successfully."
      };

    } catch (error: any) {
      console.error("Mistri Engine Error:", error);
      onStatusUpdate(`Error: ${error.message}`);
      throw error;
    }
  }
          }
        
