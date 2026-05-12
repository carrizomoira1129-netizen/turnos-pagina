import twilio from "twilio";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// ─── Clients (lazy) ──────────────────────────────────────────────────────────
function twilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !tok || sid.startsWith("your_")) return null;
  return twilio(sid, tok);
}

function resendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("your_")) return null;
  return new Resend(key);
}

// ─── Phone normalization (Argentina default) ─────────────────────────────────
export function toE164(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (phone.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("54")) return `+${digits}`;
  return `+54${digits}`;
}

// ─── Message templates ───────────────────────────────────────────────────────
export type NotifType = "confirmation" | "reminder_24h" | "reminder_1h";

interface ApptContext {
  name: string;
  date: string;        // YYYY-MM-DD
  time: string;        // HH:mm
  professional: string;
  service: string;
  businessName?: string;
}

export function renderMessage(type: NotifType, ctx: ApptContext): string {
  const dateLabel = ctx.date
    ? format(parseISO(ctx.date), "d 'de' MMMM", { locale: es })
    : "—";
  const biz = ctx.businessName ?? "TurnosPro";

  switch (type) {
    case "confirmation":
      return `Hola ${ctx.name}! Tu turno fue confirmado: ${dateLabel} a las ${ctx.time} con ${ctx.professional}. ${ctx.service}. Te esperamos! — ${biz}`;
    case "reminder_24h":
      return `Recordatorio: Tu turno es MAÑANA ${dateLabel} a las ${ctx.time}. Respondé CANCELAR si no podés asistir. — ${biz}`;
    case "reminder_1h":
      return `Tu turno es en 1 HORA: ${ctx.time} con ${ctx.professional}. ¡Te esperamos! — ${biz}`;
  }
}

// ─── Logging ─────────────────────────────────────────────────────────────────
async function logNotification(entry: {
  appointment_id: string;
  business_id?: string;
  type: NotifType;
  channel: "whatsapp" | "email";
  status: "sent" | "failed";
  recipient: string;
  message: string;
  error?: string;
  provider_id?: string;
}) {
  const db = createAdminClient();
  await db.from("notification_logs").insert(entry);
}

// ─── Senders ─────────────────────────────────────────────────────────────────
async function sendWhatsApp(toPhone: string, body: string) {
  const client = twilioClient();
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!client || !from) throw new Error("Twilio no está configurado");
  const msg = await client.messages.create({
    from,
    to: `whatsapp:${toPhone}`,
    body,
  });
  return msg.sid;
}

async function sendEmail(toEmail: string, subject: string, body: string) {
  const client = resendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!client || !from) throw new Error("Resend no está configurado");
  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0D0D0D;background:#fff;padding:24px;max-width:520px;margin:auto;border-radius:12px">
    <p style="font-size:15px;white-space:pre-wrap">${body}</p>
  </div>`;
  const { data, error } = await client.emails.send({ from, to: toEmail, subject, html });
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

// ─── Public API: send with email fallback + logging ─────────────────────────
export async function notifyAppointment(opts: {
  appointmentId: string;
  businessId?: string;
  type: NotifType;
  phone: string | null;
  email: string | null;
  ctx: ApptContext;
}) {
  const { appointmentId, businessId, type, phone, email, ctx } = opts;
  const message = renderMessage(type, ctx);
  const subject =
    type === "confirmation" ? "Turno confirmado"
    : type === "reminder_24h" ? "Recordatorio: tu turno es mañana"
    : "Tu turno es en 1 hora";

  // Try WhatsApp first
  const e164 = phone ? toE164(phone) : null;
  if (e164) {
    try {
      const sid = await sendWhatsApp(e164, message);
      await logNotification({
        appointment_id: appointmentId, business_id: businessId, type, channel: "whatsapp",
        status: "sent", recipient: e164, message, provider_id: sid,
      });
      return { sent: true, channel: "whatsapp" as const };
    } catch (e) {
      const err = e instanceof Error ? e.message : "WhatsApp failed";
      await logNotification({
        appointment_id: appointmentId, business_id: businessId, type, channel: "whatsapp",
        status: "failed", recipient: e164, message, error: err,
      });
      // fall through to email
    }
  }

  // Email fallback — read setting scoped to this business
  const db = createAdminClient();
  let emailEnabled = true;
  if (businessId) {
    const { data: settings } = await db
      .from("notification_settings")
      .select("email_backup_enabled")
      .eq("business_id", businessId)
      .maybeSingle();
    emailEnabled = settings?.email_backup_enabled ?? true;
  }

  if (emailEnabled && email) {
    try {
      const id = await sendEmail(email, subject, message);
      await logNotification({
        appointment_id: appointmentId, business_id: businessId, type, channel: "email",
        status: "sent", recipient: email, message, provider_id: id ?? undefined,
      });
      return { sent: true, channel: "email" as const };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Email failed";
      await logNotification({
        appointment_id: appointmentId, business_id: businessId, type, channel: "email",
        status: "failed", recipient: email, message, error: err,
      });
    }
  }

  return { sent: false, channel: null };
}
