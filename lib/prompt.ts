import { readFile } from "node:fs/promises";
import path from "node:path";

// Le prompt système est dans prompts/firi.md pour être modifié facilement.
// Les commentaires HTML (<!-- ... -->) sont retirés avant l'envoi à l'IA.
export async function chargerPromptSysteme(): Promise<string> {
  const fichier = path.join(process.cwd(), "prompts", "firi.md");
  const contenu = await readFile(fichier, "utf8");
  return contenu.replace(/<!--[\s\S]*?-->/g, "").trim();
}

export const CONSIGNE_UTILISATEUR =
  "Voici la photo d'un document. Analyse-le en suivant tes règles et réponds uniquement avec le JSON demandé.";
