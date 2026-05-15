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
    
    // اگر پروجیکٹ خالی ہے تو بھی مستری کو بتانا ہے
    const fileContext = currentFiles.length > 0 
      ? currentFiles.map(f => `File: ${f.name}\nLanguage: ${f.language}\nContent:\n${f.content}`).join("\n\n---\n\n")
      : "No existing files. Create everything from scratch.";
    
    const systemInstruction = `
      You are "The Mistri", an expert Senior IDE Architect.
      Current Project Files:\n${fileContext}\n
      User Task: "${prompt}"\n
      Provide the complete, updated source code for the requested files. Do not truncate code.
    `;

    try {
      onStatusUpdate(`Gemini 3.1 Pro سے رابطہ ہو رہا ہے...`);
      
      const workerUrl = "https://my-workshop-app.contact-indrvx.workers.dev/ai-generate"; 

      const response = await fetch(workerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: systemInstruction })
      });

      if (!response.ok) {
         throw new Error("ورکر کنکشن میں مسئلہ ہے۔");
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        throw new Error("اے آئی نے خالی جواب دیا ہے۔");
      }

      onStatusUpdate("ڈیٹا ایکسٹریکٹ کیا جا رہا ہے...");
      
      // اب سیدھا JSON Parse ہوگا کیونکہ بیک اینڈ نے گارنٹی دی ہے
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
