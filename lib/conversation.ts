// Conversation vocale à propos du document analysé.
// Toujours avec Gemini : il comprend directement l'audio (wolof ou français).

import { GoogleGenAI, type Content } from "@google/genai";
import { chargerPromptConversation } from "./prompt";
import { RAPPEL_ORDONNANCE, type AnalyseDocument } from "./schema";
import type { ImageEntree } from "./analyse";
import { MODELE_GEMINI } from "./providers/gemini";

export type MessageConversation = {
  role: "utilisateur" | "firi";
  // Pour l'utilisateur : la question comprise. Pour Firi : la réponse.
  wolof: string;
  francais: string;
};

export type ReponseConversation = {
  compris: boolean;
  question_comprise: string;
  reponse_wolof: string;
  reponse_francais: string;
  question_medicale: boolean;
};

export type DemandeConversation = {
  image: ImageEntree;
  analyse: AnalyseDocument;
  historique: MessageConversation[];
  audio: { base64: string; mimeType: string };
};

const SCHEMA_REPONSE = {
  type: "object",
  properties: {
    compris: { type: "boolean", description: "false si l'audio n'a pas été compris" },
    question_comprise: { type: "string", description: "La question, en français simple" },
    reponse_wolof: { type: "string" },
    reponse_francais: { type: "string" },
    question_medicale: { type: "boolean" },
  },
  required: ["compris", "question_comprise", "reponse_wolof", "reponse_francais", "question_medicale"],
  additionalProperties: false,
} as const;

export const MESSAGE_PAS_COMPRIS = {
  wolof: "Baal ma, dégguma bu baax. Waxaatal, jege telefon bi te nekk ci bérab bu ñëpp noppi.",
  francais: "Désolé, je n'ai pas bien entendu. Répète, plus près du téléphone, dans un endroit calme.",
};

export async function repondreQuestion(demande: DemandeConversation): Promise<ReponseConversation> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const systeme = await chargerPromptConversation();

  // 1er message : le document (photo + analyse déjà faite).
  const contexte: Content = {
    role: "user",
    parts: [
      { inlineData: { mimeType: demande.image.mediaType, data: demande.image.base64 } },
      {
        text:
          "Voici le document et l'analyse que tu en as faite :\n" +
          JSON.stringify(demande.analyse, null, 2),
      },
    ],
  };
  const accuse: Content = { role: "model", parts: [{ text: "D'accord, j'ai le document. J'attends la question." }] };

  // Les échanges précédents sont renvoyés en texte (l'audio n'est jamais gardé).
  const historique: Content[] = demande.historique.map((m) => ({
    role: m.role === "utilisateur" ? "user" : "model",
    parts: [{ text: m.role === "utilisateur" ? m.francais : `${m.wolof}\n\n${m.francais}` }],
  }));

  const question: Content = {
    role: "user",
    parts: [
      { inlineData: { mimeType: demande.audio.mimeType, data: demande.audio.base64 } },
      { text: "Voici ma question à l'oral. Réponds avec le JSON demandé." },
    ],
  };

  const reponse = await ai.models.generateContent({
    model: MODELE_GEMINI,
    contents: fusionnerTours([contexte, accuse, ...historique, question]),
    config: {
      systemInstruction: systeme,
      responseMimeType: "application/json",
      responseJsonSchema: SCHEMA_REPONSE,
    },
  });

  if (!reponse.text) throw new Error("Réponse vide de Gemini.");
  return normaliserReponse(JSON.parse(reponse.text), demande.analyse.est_ordonnance);
}

// Gemini préfère que les rôles alternent : on fusionne deux tours consécutifs du même rôle.
function fusionnerTours(tours: Content[]): Content[] {
  const resultat: Content[] = [];
  for (const tour of tours) {
    const precedent = resultat.at(-1);
    if (precedent && precedent.role === tour.role) {
      precedent.parts = [...(precedent.parts ?? []), ...(tour.parts ?? [])];
    } else {
      resultat.push({ ...tour, parts: [...(tour.parts ?? [])] });
    }
  }
  return resultat;
}

function normaliserReponse(brut: unknown, estOrdonnance: boolean): ReponseConversation {
  const d = (brut ?? {}) as Partial<ReponseConversation>;
  const texte = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const r: ReponseConversation = {
    compris: d.compris !== false,
    question_comprise: texte(d.question_comprise),
    reponse_wolof: texte(d.reponse_wolof),
    reponse_francais: texte(d.reponse_francais),
    question_medicale: d.question_medicale === true,
  };

  if (!r.compris || !r.reponse_francais) {
    return {
      compris: false,
      question_comprise: "",
      reponse_wolof: r.reponse_wolof || MESSAGE_PAS_COMPRIS.wolof,
      reponse_francais: r.reponse_francais || MESSAGE_PAS_COMPRIS.francais,
      question_medicale: false,
    };
  }

  // Règle : pour toute question de santé (ou sur une ordonnance), rappeler
  // de confirmer avec un professionnel, même si l'IA l'a oublié.
  if ((r.question_medicale || estOrdonnance) && !/pharmacien|médecin|medecin/i.test(r.reponse_francais)) {
    r.reponse_wolof = `${r.reponse_wolof} ${RAPPEL_ORDONNANCE.wolof}`.trim();
    r.reponse_francais = `${r.reponse_francais} ${RAPPEL_ORDONNANCE.francais}`;
  }
  return r;
}
