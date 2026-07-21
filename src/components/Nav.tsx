"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { createClient } from "@/lib/supabase/client";

const ITEMS = [
  { href: "/", label: "Início", icon: "🏠" },
  { href: "/postos", label: "Postos", icon: "⛽" },
  { href: "/afericoes", label: "Aferições", icon: "📋" },
  { href: "/relatorios", label: "Relatórios", icon: "📄" },
  { href: "/configuracoes", label: "Ajustes", icon: "⚙️" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();

  if (pathname === "/login") return null;

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 px-2 py-4">
          <span className="text-2xl">⛽</span>
          <span className="font-bold text-lg text-slate-800 dark:text-slate-100">Aferições</span>
        </div>
        <nav className="flex-1 space-y-1 mt-4">
          {ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${
                  active
                    ? "bg-brand-600 text-white"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={toggle}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {theme === "light" ? "🌙 Modo escuro" : "☀️ Modo claro"}
        </button>
        <button
          onClick={sair}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-crit hover:bg-red-50 dark:hover:bg-red-950"
        >
          🚪 Sair
        </button>
      </aside>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium ${
                  active ? "text-brand-600" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
