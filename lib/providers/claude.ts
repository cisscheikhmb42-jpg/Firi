import Anthropic from "@anthropic-ai/sdk";
import { ANALYSE_JSON_SCHEMA } from "../schema";
import { CONSIGNE_UTILISATEUR } from "../prompt";
import type { ImageEntree } from "../analyse";

const MODELE = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

export async function analyserAvecClaude(image: ImageEntree, systeme: string): Promise<unknown> {
  // La clé est lue côté serveur uniquement (ANTHROPIC_API_KEY).
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const reponse = await client.beta.messages.create({
    model: MODELE,
    max_tokens: 8000,
    system: systeme,
    // Si le modèle refuse une requête (filtre de sécurité), l'API relance
    // automatiquement sur un modèle de secours adapté.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: ANALYSE_JSON_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: image.mediaType, data: image.base64 },
          },
          { type: "text", text: CONSIGNE_UTILISATEUR },
        ],
      },
    ],
  });

  if (reponse.stop_reason === "refusal") {
    throw new Error("Le modèle a refusé d'analyser ce document.");
  }

  const texte = reponse.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  return JSON.parse(texte);
}
