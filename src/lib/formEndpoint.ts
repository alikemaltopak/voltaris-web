/**
 * The one Apps Script web app behind every form on the site (applications and
 * the contact form). See apps-script/Kod.gs for what it does with each.
 *
 * XMLHttpRequest rather than fetch: fetch can't report upload progress, and
 * Apps Script takes 2-4s even for a tiny body, so the percentage is what makes
 * the wait bearable.
 *
 * The body is a bare string with no custom headers, so the browser treats it
 * as a "simple request" and skips the CORS preflight — Apps Script web apps
 * can't answer OPTIONS, so setting Content-Type would get the request blocked.
 */
export async function postToFormEndpoint(
  payload: Record<string, unknown>,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const endpoint = import.meta.env.VITE_BASVURU_ENDPOINT;
  const key = import.meta.env.VITE_BASVURU_ANAHTARI;
  if (!endpoint || !key) {
    throw new Error("Form uç noktası tanımlı değil (VITE_BASVURU_ENDPOINT / VITE_BASVURU_ANAHTARI).");
  }

  const body = JSON.stringify({ anahtar: key, ...payload });

  const raw = await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.timeout = 120_000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    // Close out the percentage when the last byte leaves; onprogress isn't
    // guaranteed to end exactly on 100.
    xhr.upload.onload = () => onProgress?.(100);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve(xhr.responseText)
        : reject(new Error(`Sunucu ${xhr.status} döndü.`));
    xhr.onerror = () => reject(new Error("Ağ hatası."));
    xhr.ontimeout = () => reject(new Error("İstek zaman aşımına uğradı."));

    xhr.send(body);
  });

  const result = JSON.parse(raw) as { durum?: string; mesaj?: string };
  if (result.durum !== "ok") throw new Error(result.mesaj || "Gönderim kaydedilemedi.");
}

type ContactMessage = {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Package id when the visitor came from a sponsorship package (/iletisim?paket=gold). */
  packageId?: string;
  /** Hidden bot-trap field; a human leaves it empty. */
  honeypot: string;
};

/** Contact form → Apps Script, which mails it to the team with Reply-To set to the sender. */
export function sendContactMessage({ name, email, subject, message, packageId, honeypot }: ContactMessage) {
  return postToFormEndpoint({
    tur: "iletisim",
    botTuzagi: honeypot,
    ad: name,
    eposta: email,
    konu: subject,
    mesaj: message,
    // Routes the row to the "Sponsorluk" tab of the separate requests sheet.
    paket: packageId ?? "",
  });
}
