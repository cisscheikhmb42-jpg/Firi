import { chargerPromptSysteme } from "./prompt";
import { normaliserAnalyse, type AnalyseDocument } from "./schema";
import { analyserAvecClaude } from "./providers/claude";
import { analyserAvecGemini } from "./providers/gemini";

export type MediaType = "image/jpeg" | "image/png" | "image/webp";

export type ImageEntree = { base64: string; mediaType: MediaType };

export type Fournisseur = "claude" | "gemini";

// AI_PROVIDER choisit l'IA. S'il est absent ou mal écrit, on prend celle
// dont la clé est présente (Gemini en priorité).
export function fournisseurActif(): Fournisseur {
  const choix = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (choix === "gemini" || choix === "claude") return choix;
  return process.env.GEMINI_API_KEY?.trim() || !process.env.ANTHROPIC_API_KEY?.trim() ? "gemini" : "claude";
}

// Nom de la variable de clé à configurer (jamais sa valeur).
export function variableCle(fournisseur: Fournisseur) {
  return fournisseur === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY";
}

// Choisit Claude ou Gemini selon AI_PROVIDER. L'image reste en mémoire
// le temps de la requête : rien n'est enregistré.
export async function analyserDocument(image: ImageEntree): Promise<AnalyseDocument> {
  const systeme = await chargerPromptSysteme();
  const brut =
    fournisseurActif() === "gemini"
      ? await analyserAvecGemini(image, systeme)
      : await analyserAvecClaude(image, systeme);
  return normaliserAnalyse(brut);
}
