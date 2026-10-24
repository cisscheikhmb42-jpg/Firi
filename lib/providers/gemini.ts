import { GoogleGenAI } from "@google/genai";
import { ANALYSE_JSON_SCHEMA } from "../schema";
import { CONSIGNE_UTILISATEUR } from "../prompt";
import type { ImageEntree } from "../analyse";

// "gemini-flash-latest" pointe toujours vers le modèle Flash actuel de Google
// (les anciens noms comme gemini-2.5-flash finissent par être retirés).
export const MODELE_GEMINI = process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";

export async function analyserAvecGemini(image: ImageEntree, systeme: string): Promise<unknown> {
  // La clé est lue côté serveur uniquement (GEMINI_API_KEY).
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const reponse = await ai.models.generateContent({
    model: MODELE_GEMINI,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: image.mediaType, data: image.base64 } },
          { text: CONSIGNE_UTILISATEUR },
        ],
      },
    ],
    config: {
      systemInstruction: systeme,
      responseMimeType: "application/json",
      responseJsonSchema: ANALYSE_JSON_SCHEMA,
    },
  });

  if (!reponse.text) throw new Error("Réponse vide de Gemini.");
  return JSON.parse(reponse.text);
}
