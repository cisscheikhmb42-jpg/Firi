import type { ReactNode } from "react";

type Props = {
  icone: string;
  titre: string;
  couleur?: "orange" | "vert" | "rouge" | "bleu";
  children: ReactNode;
};

const COULEURS = {
  orange: "border-orange-300 bg-white",
  vert: "border-emerald-300 bg-emerald-50",
  rouge: "border-red-300 bg-red-50",
  bleu: "border-sky-300 bg-sky-50",
};

export default function Carte({ icone, titre, couleur = "orange", children }: Props) {
  return (
    <section className={`rounded-3xl border-4 p-5 shadow-sm ${COULEURS[couleur]}`}>
      <h2 className="mb-3 flex items-center gap-3 text-2xl font-extrabold text-stone-900">
        <span aria-hidden="true" className="text-4xl">{icone}</span>
        {titre}
      </h2>
      {children}
    </section>
  );
}
