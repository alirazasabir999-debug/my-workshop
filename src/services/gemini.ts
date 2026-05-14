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
    
    // اے آئی کے لیے سخت ہدایات تاکہ وہ صرف JSON بھیجے
    const systemInstruction = `
      You are "The Mistri", an expert Senior IDE Architect.
      You MUST return ONLY a valid JSON object. Do not include markdown formatting like \`\`\`json or any conversational text.
      
      Current Project Files: ${fileContext}
      User Task: "${prompt}"
      
      EXPECTED JSON STRUCTURE:
      {
        "updatedFiles": [
          {
            "name": "filename.js",
            "content": "source code here",
            "language": "javascript",
            "path": "path/if/needed"
          }
        ],
        "summary": "Brief technical summary in Urdu."
      }
    `;

    try {
      onStatusUpdate(`Gemini 3.1 Pro سے رابطہ ہو رہا ہے...`);

      // آپ کا درست ورکر URL
      const workerUrl = "https://my-workshop-app.contact-indrvx.workers.dev/ai-generate"; 

      const response = await fetch(workerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: systemInstruction,
          // 2026 کا لیٹسٹ ماڈل کنفیگریشن
          model: "gemini-3.1-pro-latest",
          generationConfig: {
            responseMimeType: "application/json", // JSON موڈ کو فورس کرنا
            temperature: 1.0 // ریپلیکیشن اور لاجک کے لیے بہترین ویلیو
          }
        })
      });

      if (!response.ok) {
         throw new Error("ورکر کنکشن میں مسئلہ ہے (Status: " + response.status + ")");
      }

      const data = await response.json();
      
      // گوگل کلاؤڈ API سے رسپانس نکالنا
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      onStatusUpdate("ڈیٹا ایکسٹریکٹ کیا جا رہا ہے...");
      
      let cleanedText = responseText.trim();
      const firstBrace = cleanedText.indexOf('{');
      const lastBrace = cleanedText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
      }

      const result = JSON.parse(cleanedText);
      
      // فائلوں کو پروجیکٹ کے فارمیٹ میں ڈھالنا
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
