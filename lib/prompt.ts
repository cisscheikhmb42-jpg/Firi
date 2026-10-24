import { readFile } from "node:fs/promises";
import path from "node:path";

// Les prompts sont dans le dossier prompts/ pour être modifiés facilement.
// Les commentaires HTML (<!-- ... -->) sont retirés avant l'envoi à l'IA.
async function lirePrompt(nom: string): Promise<string> {
  const contenu = await readFile(path.join(process.cwd(), "prompts", nom), "utf8");
  return contenu.replace(/<!--[\s\S]*?-->/g, "").trim();
}

export async function chargerPromptSysteme(): Promise<string> {
  return lirePrompt("firi.md");
}

// Conversation vocale : prompt principal + règles de conversation.
export async function chargerPromptConversation(): Promise<string> {
  const [firi, conversation] = await Promise.all([lirePrompt("firi.md"), lirePrompt("conversation.md")]);
  return `${firi}\n\n---\n\n${conversation}`;
}

export const CONSIGNE_UTILISATEUR =
  "Voici la photo d'un document. Analyse-le en suivant tes règles et réponds uniquement avec le JSON demandé.";
