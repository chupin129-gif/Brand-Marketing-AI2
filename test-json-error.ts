import { GoogleGenAI, Type, Schema } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
const schema: Schema = { type: Type.OBJECT, properties: { result: { type: Type.STRING } }, required: ["result"] };
async function test() {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: 'Write a very long story',
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });
    console.log("Success");
  } catch (e: any) {
    console.error("Error Without Search:", e.message);
  }
}
test();
