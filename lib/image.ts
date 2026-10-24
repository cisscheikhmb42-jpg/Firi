// Réduit la photo dans le téléphone avant l'envoi : plus rapide sur une
// connexion 3G/4G et sous la limite de taille de Vercel.
const COTE_MAX = 1600;

export async function compresserImage(fichier: File): Promise<string> {
  const bitmap = await createImageBitmap(fichier);
  const echelle = Math.min(1, COTE_MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * echelle);
  canvas.height = Math.round(bitmap.height * echelle);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}
