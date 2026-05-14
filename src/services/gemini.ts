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
    
    const fileContext = currentFiles.map(f => `File: ${f.name}\nLanguage: ${f.language}\nContent:\n${f.content}`).join("\n\n---\n\n");
    
    const systemInstruction = `
      You are "The Mistri", a Senior IDE Architect.
      Current Files: ${fileContext}
      User Request: "${prompt}"
      Return ONLY a JSON object: { "updatedFiles": [...], "summary": "" }
    `;

    try {
      onStatusUpdate(`Gemini 3.1 Pro سے رابطہ ہو رہا ہے...`);

      // آپ کا درست ورکر URL
      const workerUrl = "https://my-workshop-app.contact-indrvx.workers.dev/ai-generate"; 

      const response = await fetch(workerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: systemInstruction
        })
      });

      if (!response.ok) {
         throw new Error("ورکر کنکشن میں مسئلہ ہے (Status: " + response.status + ")");
      }

      const data = await response.json();
      
      // رسپانس نکالنا
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      onStatusUpdate("ڈیٹا ایکسٹریکٹ کیا جا رہا ہے...");
      
      let cleanedText = responseText.trim();
      const firstBrace = cleanedText.indexOf('{');
      const lastBrace = cleanedText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
      }

      const result = JSON.parse(cleanedText);
      
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
