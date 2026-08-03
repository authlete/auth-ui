/**
 * Email transport. Sends via Resend when RESEND_API_KEY is set; otherwise logs
 * to the console so local dev needs no provider — copy the link from the
 * terminal. Server-only: the API key must never reach the client bundle.
 */

import "server-only";
import { Resend } from "resend";
import { config } from "@/config";

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (!resend) {
    console.log(`\n📧 [dev email] → ${opts.to}\n   ${opts.subject}\n   ${opts.text}\n`);
    return;
  }
  await resend.emails.send({ from: config.emailFrom, ...opts });
}
