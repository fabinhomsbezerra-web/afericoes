"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Configuracoes } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";

export default function ConfiguracoesPage() {
  const supabase = createClient();
  const { theme, toggle } = useTheme();

  const [config, setConfig] = useState<Configuracoes>({ id: 1, alerta_min: 100, critico_min: 150 });
  const [email, setEmail] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("configuracoes")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => data && setConfig(data as Configuracoes));
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMensagem(null);
    const { error } = await supabase
      .from("configuracoes")
      .update({ alerta_min: config.alerta_min, critico_min: config.critico_min })
      .eq("id", 1);
    setSalvando(false);
    setMensagem(error ? `Erro: ${error.message}` : "✅ Configurações salvas.");
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <div className="card space-y-2">
        <p className="font-semibold">Conta</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{email}</p>
      </div>

      <div className="card space-y-2">
        <p className="font-semibold">Aparência</p>
        <button onClick={toggle} className="btn-secondary w-full">
          {theme === "light" ? "🌙 Ativar modo escuro" : "☀️ Ativar modo claro"}
        </button>
      </div>

      <form onSubmit={salvar} className="card space-y-3">
        <p className="font-semibold">Faixas de Situação (valor absoluto em mL)</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Define a partir de que erro de medição uma aferição é marcada como Alerta ou Crítico.
        </p>
        <div>
          <label className="text-sm font-semibold block mb-1">Alerta a partir de (mL)</label>
          <input
            type="number"
            className="w-full"
            value={config.alerta_min}
            onChange={(e) => setConfig({ ...config, alerta_min: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="text-sm font-semibold block mb-1">Crítico a partir de (mL)</label>
          <input
            type="number"
            className="w-full"
            value={config.critico_min}
            onChange={(e) => setConfig({ ...config, critico_min: Number(e.target.value) })}
          />
        </div>
        <button type="submit" disabled={salvando} className="btn-primary w-full">
          {salvando ? "Salvando..." : "Salvar Configurações"}
        </button>
        {mensagem && (
          <p className={`text-sm font-medium ${mensagem.startsWith("✅") ? "text-ok" : "text-crit"}`}>{mensagem}</p>
        )}
      </form>
    </div>
  );
}
