"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Posto } from "@/lib/types";
import { gerarRelatorioPDF } from "@/lib/pdfReport";

export default function RelatoriosPage() {
  const supabase = createClient();

  const [postos, setPostos] = useState<Posto[]>([]);
  const [postosSelecionados, setPostosSelecionados] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [gerando, setGerando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [totalEncontrado, setTotalEncontrado] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("postos").select("*").order("nome").then(({ data }) => setPostos((data as Posto[]) ?? []));
  }, []);

  function alternarPosto(id: string) {
    setPostosSelecionados((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function buscarRegistros() {
    let query = supabase
      .from("afericoes")
      .select("*, bico:bicos(*, bomba:bombas(*, posto:postos(*)))")
      .order("data_afericao", { ascending: true });

    if (dataInicio) query = query.gte("data_afericao", new Date(dataInicio).toISOString());
    if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);
      query = query.lte("data_afericao", fim.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    let registros = data ?? [];
    if (postosSelecionados.length > 0) {
      registros = registros.filter((r: any) => postosSelecionados.includes(r.bico?.bomba?.posto?.id));
    }
    return registros as any[];
  }

  async function gerar() {
    setErro(null);
    setGerando(true);
    setProgresso(0);
    setStatusMsg("Buscando registros...");
    try {
      const registros = await buscarRegistros();
      setTotalEncontrado(registros.length);
      if (registros.length === 0) {
        setStatusMsg("Nenhum registro encontrado para os filtros selecionados.");
        setGerando(false);
        return;
      }
      const doc = await gerarRelatorioPDF(registros, (pct, msg) => {
        setProgresso(pct);
        setStatusMsg(msg);
      });
      const nomeArquivo = `relatorio-afericoes-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(nomeArquivo);
      setStatusMsg("✅ Relatório gerado e baixado com sucesso!");
    } catch (err: any) {
      setErro(err.message ?? "Erro ao gerar relatório.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold">Relatórios</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Gere um único PDF com a tabela de todas as aferições e as fotos anexadas.
      </p>

      <div className="card space-y-3">
        <div>
          <label className="text-sm font-semibold block mb-2">Postos (deixe vazio para todos)</label>
          <div className="flex flex-wrap gap-2">
            {postos.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => alternarPosto(p.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                  postosSelecionados.includes(p.id)
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-transparent border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {p.nome}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold block mb-1">Data início</label>
            <input type="date" className="w-full" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Data fim</label>
            <input type="date" className="w-full" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>
      </div>

      <button onClick={gerar} disabled={gerando} className="btn-primary w-full text-lg py-4">
        {gerando ? "Gerando PDF..." : "📄 Gerar Relatório em PDF"}
      </button>

      {gerando && (
        <div className="card">
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div className="bg-brand-600 h-2.5 rounded-full transition-all" style={{ width: `${progresso}%` }} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{statusMsg}</p>
        </div>
      )}

      {!gerando && statusMsg && (
        <p className={`text-sm font-medium ${statusMsg.startsWith("✅") ? "text-ok" : "text-slate-500"}`}>{statusMsg}</p>
      )}
      {totalEncontrado !== null && !gerando && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{totalEncontrado} registro(s) incluído(s).</p>
      )}
      {erro && <p className="text-sm text-crit font-medium">{erro}</p>}
    </div>
  );
}
