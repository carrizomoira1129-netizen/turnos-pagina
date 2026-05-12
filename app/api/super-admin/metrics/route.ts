import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessContext } from "@/lib/auth/business";
import { NextResponse } from "next/server";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";
import { PLANS } from "@/lib/plans";

export async function GET() {
  const ctx = await getBusinessContext();
  if (!ctx?.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = createAdminClient();
  const now = new Date();

  const { data: businesses } = await db
    .from("businesses")
    .select("id,name,slug,niche,plan,plan_status,created_at,subscription_cancelled_at")
    .order("created_at", { ascending: false });

  const all = businesses ?? [];

  // MRR = sum of plan prices for active businesses
  const mrr = all
    .filter((b) => b.plan_status === "active")
    .reduce((s, b) => s + (PLANS[b.plan as keyof typeof PLANS]?.price ?? 0), 0);

  const activeCount    = all.filter((b) => b.plan_status === "active").length;
  const cancelledCount = all.filter((b) => b.plan_status === "cancelled").length;
  const churnRate      = all.length > 0 ? Math.round((cancelledCount / all.length) * 100) : 0;

  const planBreakdown = {
    basic:   all.filter((b) => b.plan === "basic"   && b.plan_status === "active").length,
    pro:     all.filter((b) => b.plan === "pro"     && b.plan_status === "active").length,
    premium: all.filter((b) => b.plan === "premium" && b.plan_status === "active").length,
  };

  // Growth: signups per month for last 6 months
  const growth = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const start = startOfMonth(d).toISOString();
      const end   = endOfMonth(d).toISOString();
      const count = all.filter((b) => b.created_at >= start && b.created_at <= end).length;
      return { month: format(d, "MMM", { locale: es }), count };
    })
  );

  return NextResponse.json({
    mrr, activeCount, cancelledCount, churnRate,
    totalBusinesses: all.length,
    planBreakdown, growth,
    businesses: all.map((b) => ({
      id: b.id, name: b.name, slug: b.slug, niche: b.niche,
      plan: b.plan, plan_status: b.plan_status, created_at: b.created_at,
    })),
  });
}
