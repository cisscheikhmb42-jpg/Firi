// Enregistrement de la voix dans le navigateur (MediaRecorder).
// L'audio reste en mémoire, est envoyé une fois, puis oublié.

export type Enregistrement = {
  arreter: () => Promise<Blob>;
  annuler: () => void;
};

export function microDisponible(): boolean {
  return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && "MediaRecorder" in window;
}

export async function demarrerEnregistrement(): Promise<Enregistrement> {
  const flux = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
  });
  const morceaux: Blob[] = [];
  const recorder = new MediaRecorder(flux);
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) morceaux.push(e.data);
  };
  recorder.start();

  // Coupe le micro (le voyant du téléphone s'éteint).
  const couperMicro = () => flux.getTracks().forEach((t) => t.stop());

  return {
    arreter: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          couperMicro();
          resolve(new Blob(morceaux, { type: recorder.mimeType }));
        };
        recorder.stop();
      }),
    annuler: () => {
      recorder.onstop = couperMicro;
      if (recorder.state !== "inactive") recorder.stop();
      else couperMicro();
    },
  };
}

// Convertit l'enregistrement (webm, ogg, mp4… selon le téléphone) en WAV
// mono 16 kHz : un format léger que Gemini comprend à coup sûr.
const FREQUENCE = 16000;

export async function convertirEnWav(blob: Blob): Promise<string> {
  const contexte = new AudioContext();
  let decode: AudioBuffer;
  try {
    decode = await contexte.decodeAudioData(await blob.arrayBuffer());
  } finally {
    contexte.close();
  }

  const hors = new OfflineAudioContext(1, Math.ceil(decode.duration * FREQUENCE), FREQUENCE);
  const source = hors.createBufferSource();
  source.buffer = decode;
  source.connect(hors.destination);
  source.start();
  const rendu = await hors.startRendering();

  return blobEnDataUrl(encoderWav(rendu.getChannelData(0), FREQUENCE));
}

function encoderWav(echantillons: Float32Array, frequence: number): Blob {
  const tampon = new ArrayBuffer(44 + echantillons.length * 2);
  const vue = new DataView(tampon);
  const ecrire = (pos: number, texte: string) =>
    [...texte].forEach((c, i) => vue.setUint8(pos + i, c.charCodeAt(0)));

  ecrire(0, "RIFF");
  vue.setUint32(4, 36 + echantillons.length * 2, true);
  ecrire(8, "WAVE");
  ecrire(12, "fmt ");
  vue.setUint32(16, 16, true);
  vue.setUint16(20, 1, true); // PCM
  vue.setUint16(22, 1, true); // mono
  vue.setUint32(24, frequence, true);
  vue.setUint32(28, frequence * 2, true);
  vue.setUint16(32, 2, true);
  vue.setUint16(34, 16, true);
  ecrire(36, "data");
  vue.setUint32(40, echantillons.length * 2, true);

  echantillons.forEach((v, i) => {
    const s = Math.max(-1, Math.min(1, v));
    vue.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  });
  return new Blob([tampon], { type: "audio/wav" });
}

function blobEnDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resolve(lecteur.result as string);
    lecteur.onerror = () => reject(lecteur.error);
    lecteur.readAsDataURL(blob);
  });
}
