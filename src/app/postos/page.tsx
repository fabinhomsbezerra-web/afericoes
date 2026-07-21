"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Posto } from "@/lib/types";

export default function PostosPage() {
  const supabase = createClient();
  const [postos, setPostos] = useState<Posto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    const { data } = await supabase.from("postos").select("*").order("nome");
    setPostos((data as Posto[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    await supabase.from("postos").insert({ nome, cnpj, endereco, status: "Ativo" });
    setNome("");
    setCnpj("");
    setEndereco("");
    setMostrarForm(false);
    setSalvando(false);
    carregar();
  }

  async function alternarStatus(p: Posto) {
    await supabase
      .from("postos")
      .update({ status: p.status === "Ativo" ? "Inativo" : "Ativo" })
      .eq("id", p.id);
    carregar();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Postos</h1>
        <button className="btn-primary" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? "Cancelar" : "+ Novo Posto"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={salvar} className="card space-y-3">
          <input placeholder="Nome do posto" className="w-full" value={nome} onChange={(e) => setNome(e.target.value)} required />
          <input placeholder="CNPJ" className="w-full" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          <input placeholder="Endereço" className="w-full" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          <button type="submit" disabled={salvando} className="btn-primary w-full">
            {salvando ? "Salvando..." : "Salvar Posto"}
          </button>
        </form>
      )}

      {carregando && <p className="text-slate-500">Carregando...</p>}

      <div className="space-y-2">
        {postos.map((p) => (
          <div key={p.id} className="card flex items-center justify-between gap-3">
            <Link href={`/postos/${p.id}`} className="flex-1">
              <p className="font-semibold">{p.nome}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {p.cnpj || "CNPJ não informado"} · {p.endereco || "Endereço não informado"}
              </p>
            </Link>
            <button
              onClick={() => alternarStatus(p)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0 ${
                p.status === "Ativo" ? "text-ok bg-ok/10 border-ok/30" : "text-slate-500 bg-slate-100 border-slate-300 dark:bg-slate-800"
              }`}
            >
              {p.status}
            </button>
          </div>
        ))}
        {!carregando && postos.length === 0 && (
          <p className="text-slate-500 dark:text-slate-400 text-center py-8">Nenhum posto cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
}
