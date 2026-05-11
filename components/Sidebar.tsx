"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  ClipboardList,
  LogOut,
  Menu,
  X,
  User,
} from "lucide-react";

interface SidebarProps {
  user: { email?: string };
  profile: { full_name: string | null } | null;
}

const navItems = [
  { href: "/dashboard", label: "Reservar Turno", icon: CalendarDays },
  { href: "/mis-turnos", label: "Mis Turnos", icon: ClipboardList },
];

export default function Sidebar({ user, profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const displayName =
    profile?.full_name || user.email?.split("@")[0] || "Usuario";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-[#e4c69a]/10 border border-[#e4c69a]/30 flex items-center justify-center flex-shrink-0">
          <CalendarDays className="w-5 h-5 text-[#e4c69a]" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-none">TurnosPro</h1>
          <p className="text-white/30 text-xs mt-0.5">Panel de reservas</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#e4c69a]/10 text-[#e4c69a] border border-[#e4c69a]/20"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#e4c69a]/20 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-[#e4c69a]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{displayName}</p>
            <p className="text-white/30 text-xs truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all"
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
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#e4c69a]/10 border border-[#e4c69a]/30 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-[#e4c69a]" />
          </div>
          <span className="text-white font-bold">TurnosPro</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-white/50 hover:text-white transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 z-40 w-72 bg-[#0D0D0D] border-r border-white/5 transform transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 bg-[#0D0D0D] border-r border-white/5 flex-col">
        <SidebarContent />
      </div>
    </>
  );
}
