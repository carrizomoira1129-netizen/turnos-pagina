import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAppointment } from "@/lib/notifications";
import { addDays, format } from "date-fns";

// GET /api/cron/reminders
// Authorization: Bearer <CRON_SECRET>
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth   = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const now = new Date();
  const tomorrow = format(addDays(now, 1), "yyyy-MM-dd");
  const todayStr = format(now, "yyyy-MM-dd");

  // Load all per-business notification settings up front
  const { data: allSettings } = await db
    .from("notification_settings")
    .select("business_id, reminder_24h_enabled, reminder_1h_enabled");
  const settingsByBiz = new Map<string, { r24: boolean; r1: boolean }>();
  for (const s of allSettings ?? []) {
    settingsByBiz.set(s.business_id as string, {
      r24: !!s.reminder_24h_enabled, r1: !!s.reminder_1h_enabled,
    });
  }

  // Names per business (for templated message)
  const { data: bizRows } = await db.from("businesses").select("id, name, plan, plan_status");
  const bizById = new Map<string, { name: string; plan: string; status: string }>();
  for (const b of bizRows ?? []) {
    bizById.set(b.id as string, { name: b.name as string, plan: b.plan as string, status: b.plan_status as string });
  }

  // Appointments in 24h + 1h windows
  const { data: appts, error } = await db
    .from("appointments")
    .select(`
      id, business_id, appointment_date, appointment_time, status,
      guest_name, guest_email, guest_phone,
      reminder_24h_sent, reminder_1h_sent,
      services (name),
      professionals (name),
      profiles (full_name, phone)
    `)
    .in("status", ["pending", "confirmed"])
    .or(`appointment_date.eq.${tomorrow},appointment_date.eq.${todayStr}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent24 = 0, sent1 = 0;

  for (const a of (appts ?? []) as Array<Record<string, unknown>>) {
    const bid = a.business_id as string;
    const biz = bizById.get(bid);

    // Skip cancelled/past_due businesses, or plans without WhatsApp
    if (!biz || biz.status !== "active") continue;
    if (biz.plan === "basic") continue; // WhatsApp only on pro+

    const s = settingsByBiz.get(bid) ?? { r24: true, r1: true };

    const date = a.appointment_date as string;
    const time = String(a.appointment_time as string).slice(0, 5);
    const apptAt = new Date(`${date}T${time}:00`);
    const diffMin = (apptAt.getTime() - now.getTime()) / 60000;

    const svc = a.services as { name?: string } | null;
    const pro = a.professionals as { name?: string } | null;
    const prof = a.profiles as { full_name?: string; phone?: string } | null;

    const ctx = {
      name:         (a.guest_name as string) || prof?.full_name || "Cliente",
      date, time,
      professional: pro?.name ?? "tu profesional",
      service:      svc?.name ?? "Tu servicio",
      businessName: biz.name,
    };
    const phone = (a.guest_phone as string) || prof?.phone || null;
    const email = (a.guest_email as string) || null;
    const id = a.id as string;

    if (s.r24 && !a.reminder_24h_sent && diffMin >= 60 * 23 && diffMin <= 60 * 25) {
      const r = await notifyAppointment({ appointmentId: id, businessId: bid, type: "reminder_24h", phone, email, ctx });
      if (r.sent) {
        await db.from("appointments").update({ reminder_24h_sent: true }).eq("id", id);
        sent24++;
      }
    }

    if (s.r1 && !a.reminder_1h_sent && diffMin >= 30 && diffMin <= 90) {
      const r = await notifyAppointment({ appointmentId: id, businessId: bid, type: "reminder_1h", phone, email, ctx });
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
