"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Stats = {
  postos: number;
  bicos: number;
  afericoesHoje: number;
  criticos: number;
};

export default function InicioPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentes, setRecentes] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const [postosRes, bicosRes, afericoesHojeRes, criticosRes, recentesRes] = await Promise.all([
        supabase.from("postos").select("id", { count: "exact", head: true }).eq("status", "Ativo"),
        supabase.from("bicos").select("id", { count: "exact", head: true }),
        supabase
          .from("afericoes")
          .select("id", { count: "exact", head: true })
          .gte("data_afericao", hoje.toISOString()),
        supabase
          .from("afericoes")
          .select("id", { count: "exact", head: true })
          .in("situacao", ["Crítico", "Interditado"]),
        supabase
          .from("afericoes")
          .select("id, valor_label, situacao, data_afericao, bico:bicos(numero, produto, bomba:bombas(numero, posto:postos(nome)))")
          .order("data_afericao", { ascending: false })
          .limit(6),
      ]);

      setStats({
        postos: postosRes.count ?? 0,
        bicos: bicosRes.count ?? 0,
        afericoesHoje: afericoesHojeRes.count ?? 0,
        criticos: criticosRes.count ?? 0,
      });
      setRecentes(recentesRes.data ?? []);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Início</h1>
        <p className="text-slate-500 dark:text-slate-400">Visão geral das aferições</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <p className="text-3xl font-bold text-brand-600">{stats?.postos ?? "-"}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Postos ativos</p>
        </div>
        <div className="card">
          <p className="text-3xl font-bold text-brand-600">{stats?.bicos ?? "-"}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Bicos cadastrados</p>
        </div>
        <div className="card">
          <p className="text-3xl font-bold text-brand-600">{stats?.afericoesHoje ?? "-"}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Aferições hoje</p>
        </div>
        <div className="card">
          <p className="text-3xl font-bold text-crit">{stats?.criticos ?? "-"}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Críticos/Interditados</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/afericoes" className="btn-primary text-center">
          + Nova Aferição
        </Link>
        <Link href="/relatorios" className="btn-secondary text-center">
          📄 Gerar Relatório
        </Link>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Últimas aferições</h2>
        <div className="space-y-2">
          {recentes.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma aferição registrada ainda.</p>
          )}
          {recentes.map((r: any) => (
            <div key={r.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {r.bico?.bomba?.posto?.nome} · Bomba {r.bico?.bomba?.numero} · Bico {r.bico?.numero}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {r.bico?.produto} · {r.valor_label} · {new Date(r.data_afericao).toLocaleString("pt-BR")}
                </p>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                  r.situacao === "Regular"
                    ? "text-ok bg-ok/10 border-ok/30"
                    : r.situacao === "Alerta"
                    ? "text-warn bg-warn/10 border-warn/30"
                    : "text-crit bg-crit/10 border-crit/30"
                }`}
              >
                {r.situacao}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
