import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAppointment } from "@/lib/notifications";
import { addDays, format } from "date-fns";

// GET /api/cron/reminders
// Llamar cada 5–15 min desde Vercel Cron, GitHub Actions, o un cron externo.
// Autenticación: header "Authorization: Bearer <CRON_SECRET>"
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth   = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();

  const { data: settings } = await db
    .from("notification_settings")
    .select("reminder_24h_enabled,reminder_1h_enabled")
    .eq("id", 1)
    .single();

  const wants24h = settings?.reminder_24h_enabled ?? true;
  const wants1h  = settings?.reminder_1h_enabled  ?? true;

  const now = new Date();
  const tomorrow = format(addDays(now, 1), "yyyy-MM-dd");
  const todayStr = format(now, "yyyy-MM-dd");

  // Fetch appointments for the 24h window and 1h window
  const { data: appts, error } = await db
    .from("appointments")
    .select(`
      id, appointment_date, appointment_time, status,
      guest_name, guest_email, guest_phone,
      reminder_24h_sent, reminder_1h_sent,
      services (name),
      professionals (name),
      profiles (full_name, phone)
    `)
    .in("status", ["pending", "confirmed"])
    .or(`appointment_date.eq.${tomorrow},appointment_date.eq.${todayStr}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: biz } = await db.from("business_config").select("name").limit(1).single();
  const businessName = biz?.name ?? "TurnosPro";

  let sent24 = 0, sent1 = 0;

  for (const a of (appts ?? []) as Array<Record<string, unknown>>) {
    const date = a.appointment_date as string;
    const time = String(a.appointment_time as string).slice(0, 5);
    const apptAt = new Date(`${date}T${time}:00`);
    const diffMin = (apptAt.getTime() - now.getTime()) / 60000;

    const svc = a.services as { name?: string } | null;
    const pro = a.professionals as { name?: string } | null;
    const prof = a.profiles as { full_name?: string; phone?: string } | null;

    const ctx = {
      name:         (a.guest_name as string) || prof?.full_name || "Cliente",
      date,
      time,
      professional: pro?.name ?? "tu profesional",
      service:      svc?.name ?? "Tu servicio",
      businessName,
    };
    const phone = (a.guest_phone as string) || prof?.phone || null;
    const email = (a.guest_email as string) || null;
    const id = a.id as string;

    // 24h window: between 23h and 25h before appt
    if (wants24h && !a.reminder_24h_sent && diffMin >= 60 * 23 && diffMin <= 60 * 25) {
      const r = await notifyAppointment({ appointmentId: id, type: "reminder_24h", phone, email, ctx });
      if (r.sent) {
        await db.from("appointments").update({ reminder_24h_sent: true }).eq("id", id);
        sent24++;
      }
    }

    // 1h window: between 30 min and 90 min before appt
    if (wants1h && !a.reminder_1h_sent && diffMin >= 30 && diffMin <= 90) {
      const r = await notifyAppointment({ appointmentId: id, type: "reminder_1h", phone, email, ctx });
      if (r.sent) {
        await db.from("appointments").update({ reminder_1h_sent: true }).eq("id", id);
        sent1++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: appts?.length ?? 0,
    sent_24h: sent24,
    sent_1h: sent1,
    timestamp: now.toISOString(),
  });
}

