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
    
    // تمام فائلوں کا ڈیٹا اکٹھا کرنا تاکہ AI کو پتا ہو کہ پہلے کیا بنا ہوا ہے
    const fileContext = currentFiles.map(f => `File: ${f.name}\nLanguage: ${f.language}\nContent:\n${f.content}`).join("\n\n---\n\n");
    
    const systemInstruction = `
      You are "The Mistri", a Senior IDE Architect and AI Coding Assistant.
      
      Current Project Files:
      ${fileContext}
      
      User Request: "${prompt}"
      
      Instructions:
      1. Provide updated or new files in a valid JSON format.
      2. Keep the summary clear and technical.
      3. Use correct file paths.
      4. THE RESPONSE MUST BE A VALID JSON OBJECT:
         {
           "updatedFiles": [{ "name": string, "content": string, "language": string, "path": string }],
           "summary": string
         }
      Respond ONLY with the JSON. No markdown code blocks.
    `;

    try {
      let responseText = "";

      // --- AI STUDIO / GOOGLE CLOUD API KEY LOGIC ---
      if (this.settings.source === 'studio') {
        // یہاں ہم Gemini 1.5 Pro استعمال کریں گے جو درحقیقت 3.1 Pro کے فیچرز رکھتا ہے
        const finalModel = "gemini-1.5-pro"; 
        
        onStatusUpdate(`Connecting via Cloud API (${finalModel})...`);
        
        // کلاؤڈ والی API Key کے لیے v1beta اینڈ پوائنٹ سب سے بہترین ہے
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${this.settings.geminiKey}`;
        
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
           throw new Error(err.error?.message || "Google Cloud API Error");
        }

        const data = await response.json();
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      } else {
        // --- VERTEX AI / OAUTH LOGIC ---
        const finalModel = "gemini-1.5-pro"; 
        onStatusUpdate(`Connecting to Vertex AI (${finalModel})...`);
        
        const url = `https://${this.settings.vertexLocation}-aiplatform.googleapis.com/v1/projects/${this.settings.vertexProject}/locations/${this.settings.vertexLocation}/publishers/google/models/${finalModel}:generateContent`;
        
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
      
      // جواب سے فالتو چیزیں صاف کرنا (Cleaning Logic)
      let cleanedText = responseText.trim();
      const match = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*
```/i);
      if (match) {
        cleanedText = match[1].trim();
      } else {
        cleanedText = cleanedText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
      }

      // JSON پارس کرنا اور فائلوں کو سسٹم کے مطابق ڈھالنا
      let result = JSON.parse(cleanedText);
      
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
