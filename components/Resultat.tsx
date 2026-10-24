import type { AnalyseDocument, TypeVigilance } from "@/lib/schema";
import Carte from "./Carte";
import BoutonEcouter from "./BoutonEcouter";

const ICONES_VIGILANCE: Record<TypeVigilance, string> = {
  date: "📅",
  montant: "💰",
  engagement: "✍️",
  arnaque: "🚨",
  autre: "⚠️",
};

function Bilingue({ wolof, francais }: { wolof: string; francais: string }) {
  return (
    <div className="space-y-1">
      {wolof && <p className="text-xl font-bold leading-snug text-stone-900">{wolof}</p>}
      {francais && <p className="text-lg leading-snug text-stone-600">{francais}</p>}
    </div>
  );
}

export default function Resultat({ analyse }: { analyse: AnalyseDocument }) {
  const texteActions = analyse.actions.map((a) => a.francais).join(". ");
  const texteVigilance = analyse.points_vigilance.map((p) => p.francais).join(". ");

  return (
    <div className="space-y-5">
      <Carte icone={analyse.est_ordonnance ? "💊" : "📄"} titre={analyse.type_document || "Document"}>
        <p className="text-xl font-bold leading-relaxed text-stone-900">{analyse.resume_wolof}</p>
        <p className="mt-3 text-lg leading-relaxed text-stone-600">{analyse.resume_francais}</p>
        <BoutonEcouter texteFrancais={analyse.resume_francais} texteWolof={analyse.resume_wolof} />
      </Carte>

      {analyse.actions.length > 0 && (
        <Carte icone="✅" titre="Li nga war def · À faire" couleur="vert">
          <ol className="space-y-4">
            {analyse.actions.map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white">
                  {i + 1}
                </span>
                <Bilingue {...a} />
              </li>
            ))}
          </ol>
          <BoutonEcouter texteFrancais={texteActions} texteWolof={analyse.actions.map((a) => a.wolof).join(". ")} />
        </Carte>
      )}

      {analyse.points_vigilance.length > 0 && (
        <Carte icone="👀" titre="Moytul · Attention" couleur="rouge">
          <ul className="space-y-4">
            {analyse.points_vigilance.map((p, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden="true" className="text-3xl">{ICONES_VIGILANCE[p.type]}</span>
                <Bilingue {...p} />
              </li>
            ))}
          </ul>
          <BoutonEcouter
            texteFrancais={texteVigilance}
            texteWolof={analyse.points_vigilance.map((p) => p.wolof).join(". ")}
          />
        </Carte>
      )}
    </div>
  );
}
