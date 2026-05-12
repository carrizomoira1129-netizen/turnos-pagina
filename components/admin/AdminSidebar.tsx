"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, CalendarRange, Users, CreditCard,
  Settings, LogOut, Menu, X, CalendarDays, ExternalLink,
} from "lucide-react";

interface AdminSidebarProps {
  userEmail?: string;
}

const NAV = [
  { href: "/admin",               label: "Dashboard",    icon: LayoutDashboard },
  { href: "/admin/agenda",        label: "Agenda",       icon: CalendarRange  },
  { href: "/admin/clientes",      label: "Clientes",     icon: Users          },
  { href: "/admin/pagos",         label: "Pagos",        icon: CreditCard     },
  { href: "/admin/configuracion", label: "Configuración",icon: Settings       },
];

export default function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname    = usePathname();
  const router      = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const Content = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#e4c69a]/10 border border-[#e4c69a]/30 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-[#e4c69a]" />
          </div>
          <div>
            <p className="text-white font-bold leading-none">TurnosPro</p>
            <p className="text-[#e4c69a] text-[10px] font-semibold tracking-wider uppercase mt-0.5">Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-[#e4c69a]/10 text-[#e4c69a] border border-[#e4c69a]/20"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}

        <div className="h-px bg-white/5 mx-1 my-3" />

        <Link
          href="/dashboard"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
        >
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
          Panel del cliente
        </Link>
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 mb-2">
          <p className="text-white/20 text-[10px] uppercase font-semibold tracking-wider">Administrador</p>
          <p className="text-white/50 text-xs truncate mt-0.5">{userEmail}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-white/30 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0D0D0D] border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#e4c69a]/10 border border-[#e4c69a]/30 flex items-center justify-center">
            <CalendarDays className="w-3.5 h-3.5 text-[#e4c69a]" />
          </div>
          <span className="text-white font-bold text-sm">TurnosPro</span>
          <span className="text-[#e4c69a] text-[10px] font-bold uppercase bg-[#e4c69a]/10 px-1.5 py-0.5 rounded">Admin</span>
        </div>
        <button onClick={() => setOpen(!open)} className="p-1.5 text-white/40 hover:text-white">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && <div className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />}

      <div className={`md:hidden fixed top-0 left-0 bottom-0 z-40 w-72 bg-[#0D0D0D] border-r border-white/5 transform transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <Content />
      </div>

      <div className="hidden md:flex fixed top-0 left-0 bottom-0 w-60 bg-[#0D0D0D] border-r border-white/5 flex-col">
        <Content />
      </div>
    </>
  );
}
