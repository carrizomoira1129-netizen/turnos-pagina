"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Users, Loader2, Mail, Phone, CalendarDays, ArrowUpDown } from "lucide-react";

interface Client {
  name: string; email: string; phone: string;
  total: number; lastDate: string;
}

type SortKey = "name" | "total" | "lastDate";

export default function ClientesPage() {
  const [all,       setAll]       = useState<Client[]>([]);
  const [filtered,  setFiltered]  = useState<Client[]>([]);
  const [query,     setQuery]     = useState("");
  const [sortKey,   setSortKey]   = useState<SortKey>("total");
  const [sortAsc,   setSortAsc]   = useState(false);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/admin/clients")
      .then((r) => r.json())
      .then((d) => {
        setAll(d.clients ?? []);
        setFiltered(d.clients ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = query.toLowerCase();
    let result = all.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
    result = [...result].sort((a, b) => {
      let av: string | number = a[sortKey];
      let bv: string | number = b[sortKey];
      if (sortKey === "total") { av = a.total; bv = b.total; }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    });
    setFiltered(result);
  }, [query, all, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((p) => !p);
    else { setSortKey(key); setSortAsc(false); }
  };

  return (
    <div className="pt-14 md:pt-0 p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Clientes</h1>
        <p className="text-white/40 text-sm mt-1">{all.length} clientes registrados</p>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#e4c69a]/40 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-[#e4c69a] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-white/10 mb-4" />
          <p className="text-white/40">{query ? "Sin resultados" : "No hay clientes"}</p>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 px-5 py-3 border-b border-white/5 text-xs text-white/30 font-medium uppercase tracking-wider">
            <div className="col-span-4">
              <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-white/60 transition-colors">
                Cliente <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>
            <div className="col-span-3 hidden md:block">Contacto</div>
            <div className="col-span-2 text-center">
              <button onClick={() => toggleSort("total")} className="flex items-center gap-1 mx-auto hover:text-white/60 transition-colors">
                Turnos <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>
            <div className="col-span-3 hidden sm:block">
              <button onClick={() => toggleSort("lastDate")} className="flex items-center gap-1 hover:text-white/60 transition-colors">
                Último turno <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Rows */}
          {filtered.map((c, i) => (
            <div
              key={i}
              className="grid grid-cols-12 px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-all items-center"
            >
              {/* Name */}
              <div className="col-span-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#e4c69a]/10 border border-[#e4c69a]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#e4c69a] text-xs font-bold">
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{c.name}</p>
                    <p className="text-white/30 text-xs truncate md:hidden">{c.email}</p>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="col-span-3 hidden md:block space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{c.email === "—" ? "—" : c.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span>{c.phone === "—" ? "—" : c.phone}</span>
                </div>
              </div>

              {/* Total */}
              <div className="col-span-2 text-center">
                <span className="text-[#e4c69a] font-bold text-sm">{c.total}</span>
              </div>

              {/* Last appointment */}
              <div className="col-span-3 hidden sm:flex items-center gap-1.5 text-xs text-white/40">
                <CalendarDays className="w-3 h-3 flex-shrink-0" />
                <span className="capitalize">
                  {c.lastDate
                    ? format(parseISO(c.lastDate), "d MMM yyyy", { locale: es })
                    : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
