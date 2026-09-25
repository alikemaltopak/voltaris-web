/**
 * The one Apps Script web app behind every form on the site (applications and
 * the contact form). See apps-script/Kod.gs for what it does with each.
 *
 * Everything here hangs on the request staying a CORS "simple request", which
 * the browser sends without asking first. Apps Script web apps cannot answer
 * the OPTIONS preflight, so anything that triggers one blocks the request
 * before it leaves — the script never runs, and no row is written.
 *
 * Two things trigger one, and neither may come back:
 *  - a custom header, such as a JSON Content-Type. The body is sent as a bare
 *    string, which goes out as text/plain.
 *  - any listener on xhr.upload. Upload progress events cannot be observed
 *    without a preflight, so the browser adds one as soon as one is attached.
 *    An upload percentage broke every form on the site this way.
 */
/** Where Apps Script sends the browser to collect a web app's reply. */
const DELIVERY_HOST = "https://script.googleusercontent.com/";

/** Stands in for the reply when the script ran but its reply got lost. */
const DELIVERED = JSON.stringify({ durum: "ok", mesaj: "teslim edildi" });

export async function postToFormEndpoint(payload: Record<string, unknown>): Promise<void> {
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

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve(xhr.responseText);
      // Apps Script runs doPost first and only then redirects to
      // script.googleusercontent.com to hand back the result — and that
      // second hop intermittently answers 404. Having landed there means the
      // script already ran and the row is written; every such 404 we tested
      // had its row in the sheet. Reporting failure here told applicants who
      // had applied that they hadn't, and the ones who tried again were
      // entered twice.
      if (xhr.responseURL.startsWith(DELIVERY_HOST)) return resolve(DELIVERED);
      reject(new Error(`Sunucu ${xhr.status} döndü.`));
    };
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
