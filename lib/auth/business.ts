import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/lib/plans";

export interface BusinessContext {
  userId: string;
  businessId: string;
  plan: Plan;
  planStatus: string;
  isSuperAdmin: boolean;
}

// Returns the current user's business context, or null if not auth/setup
export async function getBusinessContext(): Promise<BusinessContext | null> {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;

  const db = createAdminClient();
  const { data: profile } = await db
    .from("profiles")
    .select("business_id, is_super_admin")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  // Super admins without a business still get a context (no businessId)
  if (!profile.business_id) {
    if (profile.is_super_admin) {
      return {
        userId: user.id, businessId: "", plan: "premium",
        planStatus: "active", isSuperAdmin: true,
      };
    }
    return null;
  }

  const { data: biz } = await db
    .from("businesses")
    .select("plan, plan_status")
    .eq("id", profile.business_id)
    .single();

  return {
    userId: user.id,
    businessId: profile.business_id,
    plan: (biz?.plan as Plan) ?? "basic",
    planStatus: biz?.plan_status ?? "active",
    isSuperAdmin: !!profile.is_super_admin,
  };
}
