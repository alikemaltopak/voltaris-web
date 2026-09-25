import type { Question } from "../data/applicationForms";
import { postToFormEndpoint } from "./formEndpoint";

/** Bir dosya alanının taşıdığı değer — base64 gövdesiyle birlikte. */
export type UploadedFile = {
  adi: string;
  tur: string;
  boyut: number;
  /** base64, "data:...;base64," öneki olmadan. */
  veri: string;
};

export type AnswerValue = string | string[] | UploadedFile;
export type Answers = Record<string, AnswerValue>;

export const MAX_FILE_BYTES = 8 * 1024 * 1024;

/** Bu boyutun altındaki görseli küçültmeye çalışmıyoruz, kazanç zahmete değmez. */
const COMPRESS_ABOVE_BYTES = 500 * 1024;
/** Telefon fotoğrafı 4000px gelebiliyor; CV okunurluğu için bu fazlasıyla yeterli. */
const MAX_IMAGE_EDGE = 1800;

export function isUploadedFile(value: AnswerValue | undefined): value is UploadedFile {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "veri" in value;
}

export function isEmptyAnswer(value: AnswerValue | undefined): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (isUploadedFile(value)) return value.veri.length === 0;
  return value.trim().length === 0;
}

/**
 * CV olarak yüklenen telefon fotoğraflarını küçültür — 5 MB'lık bir çekim
 * mobil veride yarım dakika sürebiliyor, oysa 1800px'lik bir JPEG hem okunur
 * hem de onda biri kadar. PDF/Word dokunulmadan geçer.
 */
async function shrinkIfLargeImage(file: File): Promise<{ blob: Blob; adi: string; tur: string }> {
  const unchanged = { blob: file as Blob, adi: file.name, tur: file.type || "application/octet-stream" };
  if (!file.type.startsWith("image/") || file.size <= COMPRESS_ABOVE_BYTES) return unchanged;

  try {
    // Telefonlar fotoğrafı sensör yönünde kaydedip dönüşü EXIF'e yazar.
    // Bu seçenek olmadan canvas ham pikselleri çizer ve dikey çekilmiş bir CV
    // yan yatmış olarak Drive'a düşer.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return unchanged;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    // Küçültme işe yaramadıysa (zaten sıkışık bir JPEG'se) aslını gönder.
    if (!blob || blob.size >= file.size) return unchanged;

    return { blob, adi: file.name.replace(/\.[^.]+$/, "") + ".jpg", tur: "image/jpeg" };
  } catch {
    // createImageBitmap desteklenmiyorsa ya da dosya bozuksa aslıyla devam et.
    return unchanged;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.onload = () => {
      // FileReader "data:<tür>;base64,<gövde>" döndürür; sunucuya gövde gidiyor.
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma === -1 ? "" : result.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Seçilen dosyayı gönderime hazırlar. Bilerek dosya seçildiği anda çağrılıyor:
 * küçültme ve base64'e çevirme, kullanıcı formu doldurmaya devam ederken
 * bitsin — "Gönder"e bastığında geriye sadece yükleme kalsın.
 */
export async function prepareFile(file: File): Promise<UploadedFile> {
  const { blob, adi, tur } = await shrinkIfLargeImage(file);
  return { adi, tur, boyut: blob.size, veri: await blobToBase64(blob) };
}

type SubmitArgs = {
  /** "mekanik" | "elektrik" | "destek" — the sheet names the group from this. */
  committeeId: string;
  committeeName: string;
  questions: Question[];
  answers: Answers;
  /** Bal küpü alanının değeri; insan doldurmadığı için boş olmalı. */
  honeypot: string;
  /** Bu e-postanın önceki başvurusunun yerine geçsin. */
  update: boolean;
};

/** Başvuruyu Apps Script uç noktasına gönderir (bkz. formEndpoint.ts). */
export async function submitApplication({
  committeeId,
  committeeName,
  questions,
  answers,
  honeypot,
  update,
}: SubmitArgs): Promise<void> {
  let dosya: UploadedFile | undefined;
  const cevaplar: { id: string; soru: string; tip: string; cevap: string | string[] }[] = [];

  for (const question of questions) {
    const value = answers[question.id];
    if (isEmptyAnswer(value)) continue;

    if (isUploadedFile(value)) {
      dosya = value;
      continue; // Dosyanın kendisi satıra değil Drive'a gidiyor.
    }
    cevaplar.push({
      id: question.id,
      soru: question.soru,
      tip: question.tip,
      cevap: value as string | string[],
    });
  }

  await postToFormEndpoint({
    komite: committeeId,
    komiteAdi: committeeName,
    botTuzagi: honeypot,
    guncelle: update,
    cevaplar,
    dosya,
  });
}
