import type { Question } from "../data/applicationForms";

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

export function isUploadedFile(value: AnswerValue | undefined): value is UploadedFile {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "veri" in value;
}

export function isEmptyAnswer(value: AnswerValue | undefined): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (isUploadedFile(value)) return value.veri.length === 0;
  return value.trim().length === 0;
}

export function readFileAsBase64(file: File): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.onload = () => {
      const result = String(reader.result);
      // FileReader "data:<tür>;base64,<gövde>" döndürür; sunucuya sadece gövde gidiyor.
      const comma = result.indexOf(",");
      resolve({
        adi: file.name,
        tur: file.type || "application/octet-stream",
        boyut: file.size,
        veri: comma === -1 ? "" : result.slice(comma + 1),
      });
    };
    reader.readAsDataURL(file);
  });
}

type SubmitArgs = {
  committeeName: string;
  questions: Question[];
  answers: Answers;
  /** Bal küpü alanının değeri; insan doldurmadığı için boş olmalı. */
  honeypot: string;
};

/**
 * Başvuruyu Apps Script uç noktasına gönderir.
 *
 * İstek bilerek sade tutuldu: gövde düz bir string, üstüne özel başlık
 * eklenmiyor. Böylece tarayıcı bunu "basit istek" sayıp ön kontrol (preflight)
 * göndermiyor — Apps Script web uygulamaları OPTIONS isteğine cevap veremediği
 * için Content-Type ayarlarsak istek CORS'a takılır.
 */
export async function submitApplication({
  committeeName,
  questions,
  answers,
  honeypot,
}: SubmitArgs): Promise<void> {
  const endpoint = import.meta.env.VITE_BASVURU_ENDPOINT;
  const key = import.meta.env.VITE_BASVURU_ANAHTARI;

  if (!endpoint || !key) {
    throw new Error("Başvuru uç noktası tanımlı değil (VITE_BASVURU_ENDPOINT / VITE_BASVURU_ANAHTARI).");
  }

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

  const response = await fetch(endpoint, {
    method: "POST",
    body: JSON.stringify({
      anahtar: key,
      komiteAdi: committeeName,
      botTuzagi: honeypot,
      cevaplar,
      dosya,
    }),
  });

  if (!response.ok) throw new Error(`Sunucu ${response.status} döndü.`);

  const result = (await response.json()) as { durum?: string; mesaj?: string };
  if (result.durum !== "ok") throw new Error(result.mesaj || "Başvuru kaydedilemedi.");
}
