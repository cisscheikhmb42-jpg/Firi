"use client";

import { useRef, useState } from "react";
import type { AnalyseDocument } from "@/lib/schema";
import { compresserImage } from "@/lib/image";
import { posterJson } from "@/lib/requete";
import Resultat from "@/components/Resultat";
import Carte from "@/components/Carte";
import BoutonEcouter from "@/components/BoutonEcouter";
import Conversation from "@/components/Conversation";

type Etat =
  | { etape: "accueil" }
  | { etape: "chargement"; apercu: string }
  // L'image reste en mémoire dans le téléphone pour la conversation, jamais sur le serveur.
  | { etape: "resultat"; analyse: AnalyseDocument; image: string }
  | { etape: "erreur"; message: string; code?: string };

export default function Accueil() {
  const [etat, setEtat] = useState<Etat>({ etape: "accueil" });
  const appareilPhoto = useRef<HTMLInputElement>(null);
  const galerie = useRef<HTMLInputElement>(null);

  async function envoyer(fichier: File | undefined) {
    if (!fichier) return;
    try {
      const image = await compresserImage(fichier);
      setEtat({ etape: "chargement", apercu: image });
      const analyse = await posterJson<AnalyseDocument>("/api/analyser", { image });
      setEtat({ etape: "resultat", analyse, image });
    } catch (e) {
      setEtat({
        etape: "erreur",
        message: e instanceof Error && e.message ? e.message : "Problème de connexion. Réessaie.",
        code: (e as { code?: string }).code,
      });
    }
  }

  function recommencer() {
    window.speechSynthesis?.cancel();
    setEtat({ etape: "accueil" });
    window.scrollTo({ top: 0 });
  }

  const boutonPhoto = (
    <button
      type="button"
      onClick={() => appareilPhoto.current?.click()}
      className="flex min-h-24 w-full items-center justify-center gap-4 rounded-3xl bg-orange-600 px-6 text-2xl font-extrabold text-white shadow-lg active:scale-[0.98] active:bg-orange-700"
    >
      <span aria-hidden="true" className="text-4xl">📷</span>
      Prendre en photo
    </button>
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      {/* Les fichiers restent dans le téléphone jusqu'à l'envoi, puis ne sont gardés nulle part. */}
      <input
        ref={appareilPhoto}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          envoyer(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={galerie}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          envoyer(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <header className="text-center">
        <h1 className="text-5xl font-black tracking-tight text-orange-700">Firi</h1>
        <p className="mt-1 text-xl font-semibold text-stone-700">Dama lay firil sa kayit yi</p>
        <p className="text-base text-stone-500">Je t&apos;explique tes papiers</p>
      </header>

      {etat.etape === "accueil" && (
        <div className="flex flex-1 flex-col justify-center gap-8">
          <div className="text-center text-8xl" aria-hidden="true">📄</div>
          {boutonPhoto}
          <button
            type="button"
            onClick={() => galerie.current?.click()}
            className="mx-auto flex min-h-12 items-center gap-2 px-4 text-lg font-semibold text-orange-800 underline underline-offset-4"
          >
            <span aria-hidden="true">🖼️</span> Choisir une image
          </button>
          <p className="text-center text-sm text-stone-500">
            🔒 Tes photos ne sont pas gardées.
          </p>
        </div>
      )}

      {etat.etape === "chargement" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6" role="status" aria-live="polite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={etat.apercu} alt="Ton document" className="max-h-64 rounded-2xl border-4 border-orange-200 object-contain" />
          <div className="h-16 w-16 animate-spin rounded-full border-8 border-orange-200 border-t-orange-600" />
          <p className="text-center text-2xl font-bold text-stone-800">
            Maa ngi koy jàng…
            <span className="block text-lg font-normal text-stone-500">Je lis ton document…</span>
          </p>
        </div>
      )}

      {etat.etape === "resultat" && !etat.analyse.lisible && (
        <div className="flex flex-col gap-6">
          <Carte icone="📸" titre="Defaatal photo bi" couleur="bleu">
            <p className="text-xl font-bold leading-relaxed text-stone-900">
              {etat.analyse.message_reprendre_photo.wolof}
            </p>
            <p className="mt-3 text-lg leading-relaxed text-stone-600">
              {etat.analyse.message_reprendre_photo.francais}
            </p>
            <BoutonEcouter
              texteFrancais={etat.analyse.message_reprendre_photo.francais}
              texteWolof={etat.analyse.message_reprendre_photo.wolof}
            />
          </Carte>
          {boutonPhoto}
        </div>
      )}

      {etat.etape === "resultat" && etat.analyse.lisible && (
        // pb-32 : place pour le bouton micro fixé en bas de l'écran.
        <div className="flex flex-col gap-6 pb-32">
          <Resultat analyse={etat.analyse} />
          <Conversation image={etat.image} analyse={etat.analyse} />
          <p className="text-center text-sm text-stone-500">
            Firi mën na juum. Su dee lu am solo la, laajal ku la gëna xam.
            <br />
            Firi peut se tromper. Pour une chose importante, demande à quelqu&apos;un de confiance.
          </p>
          <button
            type="button"
            onClick={recommencer}
            className="flex min-h-20 w-full items-center justify-center gap-3 rounded-3xl bg-orange-600 text-2xl font-extrabold text-white shadow-lg active:bg-orange-700"
          >
            <span aria-hidden="true" className="text-3xl">📷</span>
            Beneen document
          </button>
        </div>
      )}

      {etat.etape === "erreur" && (
        <div className="flex flex-1 flex-col justify-center gap-6">
          <Carte icone="😕" titre="Am na jafe-jafe" couleur="rouge">
            <p className="text-xl text-stone-800">{etat.message}</p>
            {/* Petit code technique pour comprendre la panne (ex : cle_invalide). */}
            {etat.code && <p className="mt-3 text-sm text-stone-500">Code : {etat.code}</p>}
          </Carte>
          <button
            type="button"
            onClick={recommencer}
            className="flex min-h-20 w-full items-center justify-center gap-3 rounded-3xl bg-orange-600 text-2xl font-extrabold text-white shadow-lg active:bg-orange-700"
          >
            <span aria-hidden="true" className="text-3xl">🔄</span>
            Réessayer
          </button>
        </div>
      )}
    </main>
  );
}
