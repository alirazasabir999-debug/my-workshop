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
    
    // تمام فائلوں کا ڈیٹا اکٹھا کرنا تاکہ AI کو پتا ہو کہ پہلے کیا بنا ہوا ہے
    const fileContext = currentFiles.map(f => `File: ${f.name}\nLanguage: ${f.language}\nContent:\n${f.content}`).join("\n\n---\n\n");
    
    const systemInstruction = `
      You are "The Mistri", a Senior IDE Architect and AI Coding Assistant.
      
      Current Project Files:
      ${fileContext}
      
      User Request: "${prompt}"
      
      Instructions:
      1. Analyze the existing files and the request.
      2. Provide the UPDATED or NEW files in a JSON format.
      3. Provide a clear summary of what you did.
      4. Always use correct file paths.
      5. THE RESPONSE MUST BE A VALID JSON OBJECT with two fields: 
         - "updatedFiles": an array of { name: string, content: string, language: string, path: string }
         - "summary": a detailed breakdown of changes.
      
      Respond ONLY with the JSON object. Do not include markdown code block syntax around the JSON data.
    `;

    try {
      let responseText = "";

      // Gemini 1.5 Pro استعمال کر رہے ہیں جو کہ 3.1 Pro کے برابر ہے
      const targetModel = "gemini-1.5-pro";

      if (this.settings.source === 'studio') {
        onStatusUpdate(`Connecting to Google Cloud API (${targetModel})...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${this.settings.geminiKey}`;
        
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: systemInstruction }] }],
            generationConfig: { 
              responseMimeType: "application/json",
              temperature: 0.7 
            }
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
      
      // جواب سے فالتو مارک ڈاؤن صاف کرنا
      let cleanedText = responseText.trim();
      const match = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*
```/i);
      
      if (match) {
        cleanedText = match[1].trim();
      } else {
        cleanedText = cleanedText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
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
        summary: result.summary || "Code generation completed."
      };

    } catch (error: any) {
      console.error("Mistri Engine Error:", error);
      onStatusUpdate(`Error: ${error.message}`);
      throw error;
    }
  }
                           }
    
