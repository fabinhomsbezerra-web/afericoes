"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Posto, Bomba, Bico, PRODUTOS } from "@/lib/types";
import { situacaoCor } from "@/lib/afericaoStatus";
import SwipeToDelete from "@/components/SwipeToDelete";

export default function HistoricoPage() {
  const supabase = createClient();

  const [postos, setPostos] = useState<Posto[]>([]);
  const [bombas, setBombas] = useState<Bomba[]>([]);
  const [bicos, setBicos] = useState<Bico[]>([]);
  const [registros, setRegistros] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  const [postoId, setPostoId] = useState("");
  const [bombaId, setBombaId] = useState("");
  const [bicoId, setBicoId] = useState("");
  const [produto, setProduto] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    supabase.from("postos").select("*").order("nome").then(({ data }) => setPostos((data as Posto[]) ?? []));
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setBombaId("");
    setBicoId("");
    if (!postoId) {
      setBombas([]);
      return;
    }
    supabase
      .from("bombas")
      .select("*")
      .eq("posto_id", postoId)
      .order("numero")
      .then(({ data }) => setBombas((data as Bomba[]) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postoId]);

  useEffect(() => {
    setBicoId("");
    if (!bombaId) {
      setBicos([]);
      return;
    }
    supabase
      .from("bicos")
      .select("*")
      .eq("bomba_id", bombaId)
      .order("numero")
      .then(({ data }) => setBicos((data as Bico[]) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bombaId]);

  async function buscar() {
    setCarregando(true);
    let query = supabase
      .from("afericoes")
      .select("*, bico:bicos(numero, produto, bomba:bombas(numero, posto:postos(nome, id)))")
      .order("data_afericao", { ascending: false })
      .limit(200);

    if (bicoId) query = query.eq("bico_id", bicoId);
    if (dataInicio) query = query.gte("data_afericao", new Date(dataInicio).toISOString());
    if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);
      query = query.lte("data_afericao", fim.toISOString());
    }

    const { data } = await query;
    let resultado = data ?? [];

    // filtros que dependem de dados relacionados (aplicados em memória)
    if (postoId) resultado = resultado.filter((r: any) => r.bico?.bomba?.posto?.id === postoId);
    if (bombaId) resultado = resultado.filter((r: any) => r.bico?.bomba?.numero !== undefined);
    if (produto) resultado = resultado.filter((r: any) => r.bico?.produto === produto);

    setRegistros(resultado);
    setCarregando(false);
  }

  async function excluir(registro: any) {
    if (!confirm("Excluir esta aferição permanentemente? Essa ação não pode ser desfeita.")) return;
    const caminhos = [registro.foto_afericao_path, registro.foto_comprovante_path].filter(
      (p): p is string => !!p
    );
    if (caminhos.length > 0) {
      await supabase.storage.from("afericoes").remove(caminhos);
    }
    await supabase.from("afericoes").delete().eq("id", registro.id);
    setRegistros((prev) => prev.filter((r) => r.id !== registro.id));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Histórico de Aferições</h1>

      <div className="card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold block mb-1">Posto</label>
            <select className="w-full" value={postoId} onChange={(e) => setPostoId(e.target.value)}>
              <option value="">Todos</option>
              {postos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Bomba</label>
            <select className="w-full" value={bombaId} onChange={(e) => setBombaId(e.target.value)} disabled={!postoId}>
              <option value="">Todas</option>
              {bombas.map((b) => (
                <option key={b.id} value={b.id}>
                  Bomba {b.numero}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Bico</label>
            <select className="w-full" value={bicoId} onChange={(e) => setBicoId(e.target.value)} disabled={!bombaId}>
              <option value="">Todos</option>
              {bicos.map((b) => (
                <option key={b.id} value={b.id}>
                  Bico {b.numero}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Produto</label>
            <select className="w-full" value={produto} onChange={(e) => setProduto(e.target.value)}>
              <option value="">Todos</option>
              {PRODUTOS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Data início</label>
            <input type="date" className="w-full" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Data fim</label>
            <input type="date" className="w-full" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>
        <button onClick={buscar} className="btn-primary w-full">
          Filtrar
        </button>
      </div>

      <div className="space-y-2">
        {carregando && <p className="text-slate-500">Carregando...</p>}
        {!carregando && registros.length === 0 && (
          <p className="text-slate-500 dark:text-slate-400 text-center py-8">Nenhuma aferição encontrada.</p>
        )}
        {!carregando && registros.length > 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500">← Arraste um item para o lado para excluir</p>
        )}
        {registros.map((r) => (
          <SwipeToDelete key={r.id} onDelete={() => excluir(r)}>
            <div className="card flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {r.bico?.bomba?.posto?.nome} · Bomba {r.bico?.bomba?.numero} · Bico {r.bico?.numero}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {r.bico?.produto} · {r.litros_aferidos ? `${r.litros_aferidos}L · ` : ""}
                  {r.valor_label} ·{" "}
                  {new Date(r.data_afericao).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </p>
                {r.observacao && <p className="text-sm font-semibold text-crit">{r.observacao}</p>}
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full border shrink-0 ${situacaoCor(r.situacao)}`}>
                {r.situacao}
              </span>
            </div>
          </SwipeToDelete>
        ))}
      </div>
    </div>
  );
}
