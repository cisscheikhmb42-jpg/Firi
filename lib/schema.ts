// Forme du JSON renvoyé par l'IA. Le même schéma sert pour Claude et Gemini.

export type Bilingue = { wolof: string; francais: string };

export type TypeVigilance = "date" | "montant" | "engagement" | "arnaque" | "autre";

export type PointVigilance = Bilingue & { type: TypeVigilance };

export type AnalyseDocument = {
  lisible: boolean;
  message_reprendre_photo: Bilingue;
  type_document: string;
  est_ordonnance: boolean;
  resume_wolof: string;
  resume_francais: string;
  actions: Bilingue[];
  points_vigilance: PointVigilance[];
};

const bilingue = {
  type: "object",
  properties: {
    wolof: { type: "string" },
    francais: { type: "string" },
  },
  required: ["wolof", "francais"],
  additionalProperties: false,
} as const;

// JSON Schema standard (compatible avec les "structured outputs" de Claude
// et le "responseJsonSchema" de Gemini).
export const ANALYSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    lisible: {
      type: "boolean",
      description: "false si la photo est floue, illisible ou n'est pas un document",
    },
    message_reprendre_photo: {
      ...bilingue,
      description: "Message gentil pour reprendre la photo (vide si lisible)",
    },
    type_document: { type: "string" },
    est_ordonnance: { type: "boolean" },
    resume_wolof: { type: "string" },
    resume_francais: { type: "string" },
    actions: { type: "array", items: bilingue },
    points_vigilance: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["date", "montant", "engagement", "arnaque", "autre"],
          },
          wolof: { type: "string" },
          francais: { type: "string" },
        },
        required: ["type", "wolof", "francais"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "lisible",
    "message_reprendre_photo",
    "type_document",
    "est_ordonnance",
    "resume_wolof",
    "resume_francais",
    "actions",
    "points_vigilance",
  ],
  additionalProperties: false,
} as const;

export const RAPPEL_ORDONNANCE: Bilingue = {
  wolof: "Laajal sa pharmacien walla sa docteur.",
  francais: "Confirme avec ton pharmacien ou ton médecin.",
};

// Vérifie la réponse de l'IA et applique les règles de sécurité,
// quoi que le modèle ait renvoyé.
export function normaliserAnalyse(brut: unknown): AnalyseDocument {
  const d = (brut ?? {}) as Partial<AnalyseDocument>;
  const texte = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const bi = (v: unknown): Bilingue => {
    const o = (v ?? {}) as Partial<Bilingue>;
    return { wolof: texte(o.wolof), francais: texte(o.francais) };
  };
  const types: TypeVigilance[] = ["date", "montant", "engagement", "arnaque", "autre"];

  const analyse: AnalyseDocument = {
    lisible: d.lisible !== false,
    message_reprendre_photo: bi(d.message_reprendre_photo),
    type_document: texte(d.type_document),
    est_ordonnance: d.est_ordonnance === true,
    resume_wolof: texte(d.resume_wolof),
    resume_francais: texte(d.resume_francais),
    actions: Array.isArray(d.actions) ? d.actions.map(bi).filter((a) => a.francais || a.wolof) : [],
    points_vigilance: Array.isArray(d.points_vigilance)
      ? d.points_vigilance
          .map((p) => ({
            ...bi(p),
            type: types.includes(p?.type as TypeVigilance) ? (p.type as TypeVigilance) : "autre",
          }))
          .filter((p) => p.francais || p.wolof)
      : [],
  };

  // Pas de résumé exploitable = on considère la photo comme illisible.
  if (analyse.lisible && !analyse.resume_francais && !analyse.resume_wolof) {
    analyse.lisible = false;
  }

  if (!analyse.lisible) {
    if (!analyse.message_reprendre_photo.francais) {
      analyse.message_reprendre_photo = MESSAGE_PHOTO_ILLISIBLE;
    }
    return analyse;
  }

  // Règle : toujours rappeler de confirmer avec un professionnel de santé.
  if (analyse.est_ordonnance || /ordonnance/i.test(analyse.type_document)) {
    analyse.est_ordonnance = true;
    const dejaPresent = analyse.actions.some((a) => /pharmacien|médecin|medecin/i.test(a.francais));
    if (!dejaPresent) analyse.actions.push(RAPPEL_ORDONNANCE);
  }

  return analyse;
}

export const MESSAGE_PHOTO_ILLISIBLE: Bilingue = {
  wolof:
    "Baal ma, gisuma bu baax document bi. Defal ko ci bérab bu leer, teg ko ci kaw table, te jël photo bi ba mu set.",
  francais:
    "Désolé, je n'arrive pas à bien lire le document. Mets-le à plat, dans un endroit bien éclairé, et reprends la photo sans bouger.",
};
