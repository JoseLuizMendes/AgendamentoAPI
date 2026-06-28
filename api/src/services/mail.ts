import { config } from "../config.js";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  /** Link incluído no email — logado no modo dev para facilitar o teste local. */
  devLink?: string;
}

/**
 * Envia email transacional via Resend (REST API, sem pacote npm — só `fetch`). Sem credencial
 * (`config.resend === null`), entra em **modo dev**: loga o link no console em vez de enviar,
 * permitindo testar o fluxo localmente. Lança em falha real de envio (o caller decide engolir).
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!config.resend) {
    // eslint-disable-next-line no-console
    console.log(
      `[mail:dev] to=${input.to} subject="${input.subject}"` +
        (input.devLink ? ` link=${input.devLink}` : "")
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resend.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.resend.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao enviar email (Resend): HTTP ${res.status}`);
  }
}

/** Template do email de verificação. O `link` é montado a partir de `APP_BASE_URL` + token. */
export function verificationEmail(link: string): { subject: string; html: string } {
  return {
    subject: "Confirme seu email",
    html:
      `<p>Bem-vindo! Confirme seu email para ativar a conta:</p>` +
      `<p><a href="${link}">Confirmar email</a></p>` +
      `<p>Se você não criou esta conta, ignore este email.</p>`,
  };
}

/** Template do email de redefinição de senha (link válido por 1 hora). */
export function passwordResetEmail(link: string): { subject: string; html: string } {
  return {
    subject: "Redefinição de senha",
    html:
      `<p>Recebemos um pedido para redefinir sua senha (válido por 1 hora):</p>` +
      `<p><a href="${link}">Redefinir senha</a></p>` +
      `<p>Se você não pediu, ignore — sua senha continua a mesma.</p>`,
  };
}
