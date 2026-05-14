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
      let responseText = "";
      // 2026 کا لیٹسٹ ماڈل جو آپ کے ورکر میں ہینڈل ہوگا
      const targetModel = "gemini-3.1-pro-latest"; 

      onStatusUpdate(`کلاؤڈ فلیر ورکر کے ذریعے Gemini 3.1 Pro سے رابطہ ہو رہا ہے...`);

      // یہاں آپ نے اپنے Cloudflare Worker کا URL ڈالنا ہے
      // مثال کے طور پر: https://mistri-backend.your-subdomain.workers.dev/
      const workerUrl = "https://your-worker-url.workers.dev/"; 

      const response = await fetch(workerUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
          // اگر آپ نے ورکر پر کوئی سیکیورٹی ٹوکن رکھا ہے تو وہ یہاں آئے گا
        },
        body: JSON.stringify({
          model: targetModel,
          prompt: systemInstruction,
          // اگر آپ ورکر میں ڈائریکٹ میسجز بھیجنا چاہتے ہیں
          contents: [{ role: "user", parts: [{ text: systemInstruction }] }]
        })
      });

      if (!response.ok) {
         const err = await response.json();
         throw new Error(err.error || "ورکر کنکشن میں مسئلہ ہے");
      }

      const data = await response.json();
      
      // ورکر سے آنے والا رسپانس نکالنا
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || data.text || "{}";

      onStatusUpdate("ڈیٹا ایکسٹریکٹ کیا جا رہا ہے...");
      
      let cleanedText = responseText.trim();
      
      // بریکٹس کے درمیان سے JSON نکالنے کا محفوظ طریقہ
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
        throw new Error("AI کا جواب درست JSON فارمیٹ میں نہیں تھا۔");
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
        summary: result.summary || "کام مکمل ہو گیا!"
      };

    } catch (error: any) {
      console.error("Mistri Error:", error);
      onStatusUpdate(`خرابی: ${error.message}`);
      throw error;
    }
  }
}
