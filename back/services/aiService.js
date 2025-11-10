import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are an expert summarization and extraction assistant. 
Your task is to analyze transcriptions and extract key information in Spanish. 
Your ONLY output must be a clean, valid JSON object that strictly follows the provided schema. 
Do not include any introductory text, explanations, or formatting outside of the JSON object. 
The final content (summary, ideas, excerpts) must be written in Spanish.`;

async function retryAI(func, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await func();
    } catch (error) {
      console.error(`Intento ${attempt} falló:`, error.message);
      if (attempt === maxRetries) {
        throw new Error(`Fallo después de ${maxRetries} intentos: ${error.message}`);
      }
      // Esperar un poco antes del siguiente intento (backoff simple)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

export const generarResumen = async (transcription) => {
  return await retryAI(async () => {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      // Prompt de Contents en inglés
      contents: `Summarize this transcription into 3-5 key sentences: ${transcription}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION, 
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            resumen: { type: "string" }
          },
          required: ["resumen"]
        }
      }
    });
    
    try {
      return JSON.parse(response.text);
    } catch (error) {
      console.error("Error al parsear el resumen como JSON:", error);
      console.error("Texto de respuesta que falló:", response.text);
      throw new Error("Fallo al obtener una respuesta JSON válida para el resumen.");
    }
  });
};

export const generarIdeasPrincipales = async (transcription) => {
  return await retryAI(async () => {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      // Prompt de Contents en inglés
      contents: `Extract the 5 main ideas from this transcription into a list, each idea starting with a dash (-): ${transcription}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION, 
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            ideas: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["ideas"]
        }
      }
    });

    try {
      return JSON.parse(response.text);
    } catch (error) {
      console.error("Error al parsear las ideas principales como JSON:", error);
      console.error("Texto de respuesta que falló:", response.text);
      throw new Error("Fallo al obtener una respuesta JSON válida para las ideas principales.");
    }
  });
};

export const generarExtractos = async (transcription) => {
  return await retryAI(async () => {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      // Prompt de Contents en inglés
      contents: `Extract 3-5 notable quotes or phrases from this transcription: ${transcription}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION, 
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            extractos: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["extractos"]
        }
      }
    });

    try {
      return JSON.parse(response.text);
    } catch (error) {
      console.error("Error al parsear los extractos como JSON:", error);
      console.error("Texto de respuesta que falló:", response.text);
      throw new Error("Fallo al obtener una respuesta JSON válida para los extractos.");
    }
  });
};