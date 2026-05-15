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
    onStatusUpdate("پراجیکٹ کا سٹرکچر انالائز کیا جا رہا ہے...");
    
    const fileContext = currentFiles.length > 0 
      ? currentFiles.map(f => `File: ${f.name}\nLanguage: ${f.language}\nContent:\n${f.content}`).join("\n\n---\n\n")
      : "No existing files.";
    
    const systemInstruction = `
      You are "The Mistri", an expert Senior IDE Architect.
      You MUST return ONLY a valid JSON object. Do not include markdown formatting or text outside JSON.
      
      Current Project Files:\n${fileContext}\n
      User Task: "${prompt}"\n
      
      REQUIRED JSON STRUCTURE:
      {
        "updatedFiles": [
          {
            "name": "filename.js",
            "content": "code here",
            "language": "javascript",
            "path": "path/if/needed"
          }
        ],
        "summary": "Respond to the user naturally in Urdu. Explain what you did, or just reply to their greeting if they said Hi."
      }
    `;

    try {
      onStatusUpdate(`Gemini 3.1 Pro سے رابطہ ہو رہا ہے...`);
      
      const workerUrl = "https://alien-iota.vercel.app/api/generate"; 

      const response = await fetch(workerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: systemInstruction })
      });

      if (!response.ok) {
        const errData = await response.json();
         throw new Error(errData.error || "ورکر کنکشن میں مسئلہ ہے۔");
      }

      const data = await response.json();
      let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) throw new Error("اے آئی نے خالی جواب دیا ہے۔");

      onStatusUpdate("ڈیٹا ایکسٹریکٹ کیا جا رہا ہے...");
      
      // مارک ڈاؤن کلینر (یہ اب فیل نہیں ہوگا)
      responseText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      
      const firstBrace = responseText.indexOf('{');
      const lastBrace = responseText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        responseText = responseText.substring(firstBrace, lastBrace + 1);
      }

      const result = JSON.parse(responseText);
      
      const updatedFiles: FileItem[] = (result.updatedFiles || []).map((f: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: f.name,
        content: f.content,
        language: f.language,
        path: f.path || f.name
      }));

      return {
        files: updatedFiles,
        summary: result.summary || "کام مکمل ہو گیا!"
      };

    } catch (error: any) {
      console.error("Mistri Error:", error);
      onStatusUpdate(`خرابی: ${error.message}`);
      throw error;
    }
  }
}
