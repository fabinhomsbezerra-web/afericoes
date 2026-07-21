"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Configuracoes } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";

export default function ConfiguracoesPage() {
  const supabase = createClient();
  const { theme, toggle } = useTheme();

  const [config, setConfig] = useState<Configuracoes>({ id: 1, alerta_min: 100, critico_min: 150 });
  const [alertaTexto, setAlertaTexto] = useState("100");
  const [criticoTexto, setCriticoTexto] = useState("150");
  const [email, setEmail] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const [diasLimpeza, setDiasLimpeza] = useState(90);
  const [limpando, setLimpando] = useState(false);
  const [mensagemLimpeza, setMensagemLimpeza] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("configuracoes")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const c = data as Configuracoes;
        setConfig(c);
        setAlertaTexto(String(c.alerta_min));
        setCriticoTexto(String(c.critico_min));
      });
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const alerta = Number(alertaTexto);
    const critico = Number(criticoTexto);
    if (alertaTexto.trim() === "" || isNaN(alerta) || criticoTexto.trim() === "" || isNaN(critico)) {
      setMensagem("Preencha os dois valores corretamente.");
      return;
    }
    setSalvando(true);
    setMensagem(null);
    const { error } = await supabase
      .from("configuracoes")
      .update({ alerta_min: alerta, critico_min: critico })
      .eq("id", 1);
    setSalvando(false);
    if (!error) setConfig({ ...config, alerta_min: alerta, critico_min: critico });
    setMensagem(error ? `Erro: ${error.message}` : "✅ Configurações salvas.");
  }

  async function excluirAntigas() {
    const confirmar = confirm(
      `Isso vai excluir permanentemente todas as aferições com mais de ${diasLimpeza} dias, incluindo as fotos anexadas. Deseja continuar?`
    );
    if (!confirmar) return;

    setLimpando(true);
    setMensagemLimpeza(null);
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - diasLimpeza);

      const { data: antigas, error: erroBusca } = await supabase
        .from("afericoes")
        .select("id, foto_afericao_path, foto_comprovante_path")
        .lt("data_afericao", cutoff.toISOString());
      if (erroBusca) throw erroBusca;

      if (!antigas || antigas.length === 0) {
        setMensagemLimpeza("Nenhuma aferição antiga encontrada para excluir.");
        setLimpando(false);
        return;
      }

      const caminhos = antigas
        .flatMap((a: any) => [a.foto_afericao_path, a.foto_comprovante_path])
        .filter((p: string | null): p is string => !!p);
      if (caminhos.length > 0) {
        await supabase.storage.from("afericoes").remove(caminhos);
      }

      const ids = antigas.map((a: any) => a.id);
      const { error: erroDelete } = await supabase.from("afericoes").delete().in("id", ids);
      if (erroDelete) throw erroDelete;

      setMensagemLimpeza(`✅ ${antigas.length} aferição(ões) excluída(s) com sucesso.`);
    } catch (err: any) {
      setMensagemLimpeza(`Erro ao excluir: ${err.message}`);
    } finally {
      setLimpando(false);
    }
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
            type="text"
            inputMode="numeric"
            className="w-full"
            value={alertaTexto}
            onChange={(e) => {
              if (/^[0-9]*$/.test(e.target.value)) setAlertaTexto(e.target.value);
            }}
          />
        </div>
        <div>
          <label className="text-sm font-semibold block mb-1">Crítico a partir de (mL)</label>
          <input
            type="text"
            inputMode="numeric"
            className="w-full"
            value={criticoTexto}
            onChange={(e) => {
              if (/^[0-9]*$/.test(e.target.value)) setCriticoTexto(e.target.value);
            }}
          />
        </div>
        <button type="submit" disabled={salvando} className="btn-primary w-full">
          {salvando ? "Salvando..." : "Salvar Configurações"}
        </button>
        {mensagem && (
          <p className={`text-sm font-medium ${mensagem.startsWith("✅") ? "text-ok" : "text-crit"}`}>{mensagem}</p>
        )}
      </form>

      <div className="card space-y-3">
        <p className="font-semibold">Limpeza de Aferições Antigas</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Exclui permanentemente as aferições (e suas fotos) mais antigas que o período escolhido. Essa ação não pode ser desfeita.
        </p>
        <div>
          <label className="text-sm font-semibold block mb-1">Excluir aferições com mais de:</label>
          <select
            className="w-full"
            value={diasLimpeza}
            onChange={(e) => setDiasLimpeza(Number(e.target.value))}
          >
            <option value={30}>30 dias</option>
            <option value={60}>60 dias</option>
            <option value={90}>90 dias</option>
            <option value={180}>180 dias</option>
            <option value={365}>1 ano</option>
          </select>
        </div>
        <button
          type="button"
          onClick={excluirAntigas}
          disabled={limpando}
          className="w-full py-3 rounded-xl font-semibold bg-crit/10 text-crit border border-crit/30 active:scale-95 transition"
        >
          {limpando ? "Excluindo..." : "🗑️ Excluir Aferições Antigas Agora"}
        </button>
        {mensagemLimpeza && (
          <p className={`text-sm font-medium ${mensagemLimpeza.startsWith("✅") ? "text-ok" : "text-crit"}`}>
            {mensagemLimpeza}
          </p>
        )}
      </div>
    </div>
  );
}
