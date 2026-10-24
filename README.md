# Firi

Firi aide les Sénégalais à comprendre leurs documents écrits en français
(ordonnances, factures Senelec/Sen'Eau, contrats de bail, courriers de banque,
convocations…). On prend une photo, Firi explique en **wolof** et en
**français simple**, dit **quoi faire** et signale les **points de vigilance**.

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # puis mets tes vraies clés dans .env.local
npm run dev
```

Ouvre http://localhost:3000.

## Variables d'environnement

| Variable            | Rôle                                      |
| ------------------- | ----------------------------------------- |
| `AI_PROVIDER`       | `claude` (par défaut) ou `gemini`         |
| `ANTHROPIC_API_KEY` | Clé Claude                                |
| `CLAUDE_MODEL`      | Optionnel, par défaut `claude-sonnet-5-5` |
| `GEMINI_API_KEY`    | Clé Gemini                                |
| `GEMINI_MODEL`      | Optionnel, par défaut `gemini-2.5-flash`  |

Les clés ne sont lues que côté serveur (`app/api/analyser/route.ts`).
`.env.local` est ignoré par git : ne mets jamais de vraie clé dans `.env.example`.

## Modifier ce que dit Firi

Tout le comportement de l'IA est dans **`prompts/firi.md`** (style du wolof,
règles, section `EXEMPLES` à compléter). Les commentaires `<!-- -->` de ce
fichier ne sont pas envoyés à l'IA.

## Structure

```
app/page.tsx              Écran unique (accueil → chargement → résultat)
app/api/analyser/route.ts Route serveur : reçoit la photo, appelle l'IA
lib/analyse.ts            Choix Claude / Gemini (AI_PROVIDER)
lib/providers/claude.ts   Appel Claude
lib/providers/gemini.ts   Appel Gemini
lib/schema.ts             Forme du JSON + règles de sécurité (rappel ordonnance…)
lib/prompt.ts             Lecture de prompts/firi.md
lib/image.ts              Compression de la photo dans le téléphone
components/               Cartes, bouton Écouter, résultat
prompts/firi.md           Prompt système (à modifier librement)
```

## Confidentialité

Les photos sont compressées dans le téléphone, envoyées à l'IA pour une seule
analyse, puis oubliées : rien n'est enregistré (ni fichier, ni base de données,
ni journal du contenu).

## Déployer sur Vercel

1. Envoie le projet sur GitHub, puis importe-le dans Vercel.
2. Dans *Settings → Environment Variables*, ajoute les variables ci-dessus.
3. Déploie.
