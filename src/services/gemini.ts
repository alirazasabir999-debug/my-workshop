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
      // 1. ورسل (Vercel) سے جیمنی ماڈل کو ہٹ کرنا
      onStatusUpdate(`جیمنی ماڈل (ورسل بیک اینڈ) سے رابطہ ہو رہا ہے...`);
      const workerUrl = "https://alien-lyart.vercel.app/api/generate"; 

      const response = await fetch(workerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: systemInstruction })
      });

      if (!response.ok) {
        const errData = await response.json();
         throw new Error(errData.error || "ورسل کنکشن میں مسئلہ ہے۔");
      }

      const data = await response.json();
      
      // ہمارے نئے بیک اینڈ کوڈ کے مطابق، ڈیٹا 'text' فیلڈ میں صاف ہو کر آتا ہے
      // لیکن اگر پرانا فارمیٹ ہو توcandidates سے بھی ڈیٹا اٹھا سکتے ہیں
      let responseText = data.text || data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) throw new Error("اے آئی نے خالی جواب دیا ہے۔");

      onStatusUpdate("ڈیٹا ایکسٹریکٹ کیا جا رہا ہے...");
      
      // مارک ڈاؤن کلینر
      responseText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      
      // اگر ٹیکسٹ کے اندر ماڈل کا نام شامل ہے تو صرف JSON نکالنا
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

      // 🚀 2. کلاؤڈ فلیر (Cloudflare D1) میں ڈیٹا سیو کرنے کا نیا لاجک
      try {
        onStatusUpdate("ڈیٹا کلاؤڈ فلیر D1 ڈیٹا بیس میں محفوظ کیا جا رہا ہے...");
        
        // یہاں ہم کلاؤڈ فلیر کے سیو والے اینڈ پوائنٹ کو کال کر رہے ہیں
        const cloudflareSaveUrl = "https://my-workshop-app.contact-indrvx.workers.dev/api/save"; // اگر آپ کا اینڈ پوائنٹ صرف '/' ہے تو آخری والا حصہ ہٹا سکتے ہیں
        
        await fetch(cloudflareSaveUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            files: updatedFiles, 
            prompt: prompt,
            summary: result.summary 
          })
        });
        console.log("Data successfully synced with Cloudflare D1.");
      } catch (cfError: any) {
        console.error("Cloudflare D1 Saving Error:", cfError);
        // ہم یہاں پراجیکٹ کو کریش نہیں کریں گے تاکہ اگر سیونگ میں مسئلہ ہو تب بھی کوڈ یو آئی پر شو ہو جائے
        onStatusUpdate("وارننگ: ڈیٹا کلاؤڈ فلیر پر سیو نہیں ہو سکا لیکن کوڈ ریڈی ہے۔");
      }

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
