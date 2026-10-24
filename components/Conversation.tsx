"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { AnalyseDocument } from "@/lib/schema";
import type { MessageConversation, ReponseConversation } from "@/lib/conversation";
import { convertirEnWav, demarrerEnregistrement, microDisponible, type Enregistrement } from "@/lib/audio";
import BoutonEcouter from "./BoutonEcouter";

type Message = MessageConversation & {
  id: number;
  // Les échanges pas compris ne sont pas renvoyés à l'IA.
  compris: boolean;
};

type Statut = "pret" | "ecoute" | "envoi";

const DUREE_MIN_MS = 800;
const DUREE_MAX_MS = 30_000;

const pasDeSouscription = () => () => {};

type Props = { image: string; analyse: AnalyseDocument };

export default function Conversation({ image, analyse }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [statut, setStatut] = useState<Statut>("pret");
  const [info, setInfo] = useState("");
  const disponible = useSyncExternalStore(pasDeSouscription, microDisponible, () => false);

  const appuye = useRef(false);
  const enregistrement = useRef<Enregistrement | null>(null);
  const debut = useRef(0);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fin = useRef<HTMLDivElement>(null);
  const compteur = useRef(0);

  // Si on quitte l'écran pendant l'enregistrement, on coupe le micro.
  useEffect(
    () => () => {
      enregistrement.current?.annuler();
      if (minuteur.current) clearTimeout(minuteur.current);
    },
    [],
  );

  useEffect(() => {
    if (messages.length) fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, statut]);

  async function commencer() {
    if (statut !== "pret" || appuye.current) return;
    appuye.current = true;
    setInfo("");
    window.speechSynthesis?.cancel();
    try {
      const enr = await demarrerEnregistrement();
      if (!appuye.current) {
        // Doigt relâché pendant la demande d'autorisation du micro.
        enr.annuler();
        setInfo("C'est bon ! Maintenant, garde le doigt appuyé pendant que tu parles.");
        return;
      }
      enregistrement.current = enr;
      debut.current = Date.now();
      setStatut("ecoute");
      minuteur.current = setTimeout(terminer, DUREE_MAX_MS);
    } catch {
      appuye.current = false;
      setInfo("Firi n'a pas accès au micro. Autorise le micro dans les réglages du navigateur.");
    }
  }

  async function terminer() {
    appuye.current = false;
    if (minuteur.current) clearTimeout(minuteur.current);
    const enr = enregistrement.current;
    if (!enr) return;
    enregistrement.current = null;

    if (Date.now() - debut.current < DUREE_MIN_MS) {
      enr.annuler();
      setStatut("pret");
      setInfo("Garde le doigt appuyé pendant que tu parles, puis relâche.");
      return;
    }

    setStatut("envoi");
    try {
      const audio = await convertirEnWav(await enr.arreter());
      const reponse = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          analyse,
          audio,
          historique: messages
            .filter((m) => m.compris)
            .map(({ role, wolof, francais }) => ({ role, wolof, francais })),
        }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) throw new Error(donnees.erreur);
      const r = donnees as ReponseConversation;
      setMessages((precedents) => [
        ...precedents,
        {
          id: ++compteur.current,
          role: "utilisateur",
          wolof: "",
          francais: r.compris ? r.question_comprise : "…",
          compris: r.compris,
        },
        {
          id: ++compteur.current,
          role: "firi",
          wolof: r.reponse_wolof,
          francais: r.reponse_francais,
          compris: r.compris,
        },
      ]);
    } catch (e) {
      setInfo(e instanceof Error && e.message ? e.message : "Problème de connexion. Réessaie.");
    } finally {
      setStatut("pret");
    }
  }

  if (!disponible) return null;

  return (
    <section className="flex flex-col gap-4" aria-label="Conversation avec Firi">
      {messages.length > 0 && (
        <div className="flex flex-col gap-3 rounded-3xl bg-[#efe7dd] p-3" aria-live="polite">
          {messages.map((m) =>
            m.role === "utilisateur" ? (
              <div key={m.id} className="ml-10 self-end rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-4 py-3 shadow-sm">
                <p className="text-lg text-stone-800">
                  <span aria-hidden="true">🎤 </span>
                  {m.francais}
                </p>
              </div>
            ) : (
              <div key={m.id} className="mr-6 self-start rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
                <p className="text-xl font-bold leading-snug text-stone-900">{m.wolof}</p>
                <p className="mt-2 text-lg leading-snug text-stone-600">{m.francais}</p>
                <BoutonEcouter texteFrancais={m.francais} texteWolof={m.wolof} compact />
              </div>
            ),
          )}
          {statut === "envoi" && (
            <div className="self-start rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-2xl shadow-sm" role="status">
              <span className="animate-pulse">💬 …</span>
            </div>
          )}
        </div>
      )}

      <div ref={fin} />

      {info && (
        <p className="rounded-2xl bg-sky-100 px-4 py-3 text-center text-lg text-sky-900" role="alert">
          {info}
        </p>
      )}

      {/* Bouton micro fixé en bas de l'écran : toujours à portée de pouce. */}
      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-orange-50 via-orange-50/95 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            disabled={statut === "envoi"}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              commencer();
            }}
            onPointerUp={terminer}
            onPointerCancel={terminer}
            onKeyDown={(e) => {
              if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                e.preventDefault();
                commencer();
              }
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") terminer();
            }}
            onContextMenu={(e) => e.preventDefault()}
            style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
            className={`flex min-h-24 w-full flex-col items-center justify-center rounded-3xl px-4 py-3 text-white shadow-xl transition-transform ${
              statut === "ecoute"
                ? "scale-[1.03] bg-red-600"
                : statut === "envoi"
                  ? "bg-stone-400"
                  : "bg-emerald-700 active:bg-emerald-800"
            }`}
          >
            {statut === "pret" && (
              <>
                <span className="flex items-center gap-3 text-2xl font-extrabold">
                  <span aria-hidden="true" className="text-4xl">🎤</span> Pose ta question
                </span>
                <span className="text-base font-semibold opacity-90">Bësal te wax · Appuie et parle</span>
              </>
            )}
            {statut === "ecoute" && (
              <>
                <span className="flex items-center gap-3 text-2xl font-extrabold">
                  <span aria-hidden="true" className="animate-pulse text-3xl">🔴</span> Maa ngi lay déglu…
                </span>
                <span className="text-base font-semibold">Relâche quand tu as fini</span>
              </>
            )}
            {statut === "envoi" && (
              <span className="flex items-center gap-3 text-2xl font-extrabold">
                <span className="h-7 w-7 animate-spin rounded-full border-4 border-white/40 border-t-white" />
                Firi mi ngi xalaat…
              </span>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
