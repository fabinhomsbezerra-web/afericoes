"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/client";
import { Posto, Bomba, Bico, Configuracoes, VALOR_OPCOES } from "@/lib/types";
import { calcularSituacao, situacaoCor } from "@/lib/afericaoStatus";
import PhotoInput from "@/components/PhotoInput";

export default function AfericoesPage() {
  const supabase = createClient();

  const [postos, setPostos] = useState<Posto[]>([]);
  const [bombas, setBombas] = useState<Bomba[]>([]);
  const [bicos, setBicos] = useState<Bico[]>([]);
  const [config, setConfig] = useState<Configuracoes>({ id: 1, alerta_min: 100, critico_min: 150 });

  const [postoId, setPostoId] = useState("");
  const [bombaId, setBombaId] = useState("");
  const [bicoId, setBicoId] = useState("");
  const [valorLabel, setValorLabel] = useState<string>("");
  const [litrosAferidos, setLitrosAferidos] = useState<string>("20");
  const [interditado, setInterditado] = useState(false);
  const [observacaoManual, setObservacaoManual] = useState("");
  const [fotoAfericao, setFotoAfericao] = useState<File | null>(null);
  const [fotoComprovante, setFotoComprovante] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [salvosNaSessao, setSalvosNaSessao] = useState(0);
  const [fotosResetKey, setFotosResetKey] = useState(0);

  useEffect(() => {
    if (!mensagem) return;
    const t = setTimeout(() => setMensagem(null), 4000);
    return () => clearTimeout(t);
  }, [mensagem]);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from("postos").select("*").eq("status", "Ativo").order("nome"),
        supabase.from("configuracoes").select("*").eq("id", 1).single(),
      ]);
      setPostos((p as Posto[]) ?? []);
      if (c) setConfig(c as Configuracoes);
    })();
  }, []);

  useEffect(() => {
    setBombaId("");
    setBicos([]);
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

  const opcaoSelecionada = VALOR_OPCOES.find((o) => o.label === valorLabel);
  const previa = bicoId
    ? calcularSituacao(interditado ? null : opcaoSelecionada?.valor ?? null, interditado, config)
    : null;

  function limparParaProximo() {
    setValorLabel("");
    setInterditado(false);
    setObservacaoManual("");
    setFotoAfericao(null);
    setFotoComprovante(null);
    setFotosResetKey((k) => k + 1);
    // mantém posto/bomba/bico selecionados para agilizar o próximo bico
  }

  async function uploadFoto(file: File, prefixo: string): Promise<string> {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${postoId}/${bombaId}/${bicoId}/${prefixo}-${uuidv4()}.${ext}`;
    const { error } = await supabase.storage.from("afericoes").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    return path;
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!bicoId) {
      setMensagem("Selecione posto, bomba e bico.");
      return;
    }
    if (!interditado && !valorLabel) {
      setMensagem("Selecione o resultado da aferição.");
      return;
    }
    setSalvando(true);
    setMensagem(null);
    try {
      let fotoAfericaoPath: string | null = null;
      let fotoComprovantePath: string | null = null;
      if (fotoAfericao) fotoAfericaoPath = await uploadFoto(fotoAfericao, "afericao");
      if (fotoComprovante) fotoComprovantePath = await uploadFoto(fotoComprovante, "comprovante");

      const { data: userData } = await supabase.auth.getUser();
      const { situacao, observacao: observacaoAuto } = calcularSituacao(
        interditado ? null : opcaoSelecionada?.valor ?? null,
        interditado,
        config
      );
      const manual = observacaoManual.trim();
      const observacao =
        observacaoAuto && manual ? `${observacaoAuto} ${manual}` : observacaoAuto || manual || null;

      const litros = litrosAferidos.trim() ? Number(litrosAferidos.replace(",", ".")) : null;

      const { error } = await supabase.from("afericoes").insert({
        bico_id: bicoId,
        litros_aferidos: litros !== null && !isNaN(litros) ? litros : null,
        valor: interditado ? null : opcaoSelecionada?.valor ?? null,
        valor_label: interditado ? "—" : valorLabel,
        situacao,
        interditado,
        observacao,
        foto_afericao_path: fotoAfericaoPath,
        foto_comprovante_path: fotoComprovantePath,
        criado_por: userData.user?.id,
      });
      if (error) throw error;

      setSalvosNaSessao((n) => n + 1);
      setMensagem("✅ Aferição registrada com sucesso!");
      limparParaProximo();
    } catch (err: any) {
      setMensagem(`Erro ao salvar: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  }

  const semPostos = postos.length === 0;

  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nova Aferição</h1>
          <Link href="/afericoes/historico" className="text-sm text-brand-600 font-medium">
            Ver histórico →
          </Link>
        </div>
        {salvosNaSessao > 0 && (
          <span className="text-sm font-medium text-ok bg-ok/10 px-3 py-1 rounded-full">
            {salvosNaSessao} registrado(s) agora
          </span>
        )}
      </div>

      {semPostos && (
        <div className="card">
          <p>Nenhum posto ativo cadastrado.</p>
          <Link href="/postos" className="text-brand-600 font-medium">
            Cadastrar um posto →
          </Link>
        </div>
      )}

      {!semPostos && (
        <form onSubmit={salvar} className="space-y-4">
          <div className="card space-y-3">
            <div>
              <label className="text-sm font-semibold block mb-1">1. Posto</label>
              <select className="w-full" value={postoId} onChange={(e) => setPostoId(e.target.value)} required>
                <option value="">Selecione o posto</option>
                {postos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-1">2. Bomba</label>
              <select
                className="w-full"
                value={bombaId}
                onChange={(e) => setBombaId(e.target.value)}
                disabled={!postoId}
                required
              >
                <option value="">{postoId ? "Selecione a bomba" : "Selecione um posto primeiro"}</option>
                {bombas.map((b) => (
                  <option key={b.id} value={b.id}>
                    Bomba {b.numero}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-1">3. Bico</label>
              <select
                className="w-full"
                value={bicoId}
                onChange={(e) => setBicoId(e.target.value)}
                disabled={!bombaId}
                required
              >
                <option value="">{bombaId ? "Selecione o bico" : "Selecione uma bomba primeiro"}</option>
                {bicos.map((b) => (
                  <option key={b.id} value={b.id}>
                    Bico {b.numero} · {b.produto}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {bicoId && (
            <>
              <div className="card space-y-3">
                <label className="text-sm font-semibold block">4. Resultado da aferição</label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={interditado}
                    onChange={(e) => setInterditado(e.target.checked)}
                    className="w-5 h-5"
                  />
                  Bico interditado (sem condições de aferir)
                </label>

                <div>
                  <label className="text-sm font-semibold block mb-1">Quantidade de litros aferidos</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full"
                    placeholder="Ex: 20 ou 20,200"
                    value={litrosAferidos}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^[0-9]*[.,]?[0-9]{0,3}$/.test(v)) setLitrosAferidos(v);
                    }}
                  />
                </div>

                {!interditado && (
                  <select className="w-full" value={valorLabel} onChange={(e) => setValorLabel(e.target.value)} required>
                    <option value="">Selecione o valor (mL)</option>
                    {VALOR_OPCOES.map((o) => (
                      <option key={o.label} value={o.label}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )}

                {previa && (
                  <div className={`text-sm font-semibold px-3 py-2 rounded-xl border ${situacaoCor(previa.situacao)}`}>
                    Situação: {previa.situacao} {previa.observacao ? `· ${previa.observacao}` : ""}
                  </div>
                )}

                <div>
                  <label className="text-sm font-semibold block mb-1">Observação (opcional)</label>
                  <textarea
                    className="w-full"
                    rows={2}
                    placeholder="Ex: bomba com vazamento, bico substituído, etc."
                    value={observacaoManual}
                    onChange={(e) => setObservacaoManual(e.target.value)}
                  />
                </div>
              </div>

              <div className="card space-y-4">
                <PhotoInput key={`afericao-${fotosResetKey}`} label="5. Foto da Aferição" onChange={setFotoAfericao} />
                <PhotoInput key={`comprovante-${fotosResetKey}`} label="6. Foto do Comprovante" onChange={setFotoComprovante} />
              </div>

              {mensagem && (
                <p className={`text-sm font-medium ${mensagem.startsWith("✅") ? "text-ok" : "text-crit"}`}>{mensagem}</p>
              )}

              <button type="submit" disabled={salvando} className="btn-primary w-full text-lg py-4">
                {salvando ? "Salvando..." : "💾 Salvar Registro"}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
