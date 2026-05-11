import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_all_payments");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payments = data ?? [];

  // Monthly totals (current month)
  const now = new Date();
  const monthlyPayments = payments.filter((p: { created_at: string; payment_status: string }) => {
    const d = new Date(p.created_at);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth()    === now.getMonth()    &&
      p.payment_status === "paid"
    );
  });

  const monthlyTotal = monthlyPayments.reduce(
    (sum: number, p: { payment_amount: number }) => sum + (p.payment_amount || 0),
    0
  );

  return NextResponse.json({ payments, monthlyTotal });
}
