export type Plan = "basic" | "pro" | "premium";

export interface PlanDef {
  id: Plan;
  name: string;
  price: number;                      // ARS/mes
  maxProfessionals: number;           // -1 = ilimitado
  features: {
    stripe: boolean;
    whatsapp: boolean;
    multiSucursal: boolean;
    advancedReports: boolean;
  };
  bullets: string[];
}

export const PLANS: Record<Plan, PlanDef> = {
  basic: {
    id: "basic",
    name: "Básico",
    price: 2999,
    maxProfessionals: 1,
    features: { stripe: false, whatsapp: false, multiSucursal: false, advancedReports: false },
    bullets: [
      "Agenda + Reservas",
      "1 profesional",
      "Página pública de reservas",
      "Hasta 50 turnos/mes",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 5999,
    maxProfessionals: 5,
    features: { stripe: true, whatsapp: true, multiSucursal: false, advancedReports: false },
    bullets: [
      "Todo lo del plan Básico",
      "Pagos online con Stripe",
      "Notificaciones por WhatsApp",
      "Hasta 5 profesionales",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    price: 9999,
    maxProfessionals: -1,
    features: { stripe: true, whatsapp: true, multiSucursal: true, advancedReports: true },
    bullets: [
      "Todo lo del plan Pro",
      "Profesionales ilimitados",
      "Multi-sucursal",
      "Reportes avanzados",
    ],
  },
};

export function planFeature(plan: Plan, key: keyof PlanDef["features"]): boolean {
  return PLANS[plan]?.features[key] ?? false;
}

export function maxProfessionals(plan: Plan): number {
  return PLANS[plan]?.maxProfessionals ?? 1;
}
