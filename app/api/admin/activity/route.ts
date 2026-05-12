import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { subMonths, format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

export async function GET() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db  = createAdminClient();
  const now = new Date();

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    return {
      label: format(d, "MMM", { locale: es }),
      start: format(startOfMonth(d), "yyyy-MM-dd"),
      end:   format(endOfMonth(d),   "yyyy-MM-dd"),
    };
  });

  const results = await Promise.all(
    months.map(async (m) => {
      const { count } = await db
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .neq("status", "cancelled")
        .gte("appointment_date", m.start)
        .lte("appointment_date", m.end);
      return { month: m.label, count: count ?? 0 };
    })
  );

  return NextResponse.json({ activity: results });
}
