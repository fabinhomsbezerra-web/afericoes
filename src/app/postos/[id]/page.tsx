"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Posto, Bomba, Bico, PRODUTOS } from "@/lib/types";

type BombaComBicos = Bomba & { bicos: Bico[] };

export default function PostoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [posto, setPosto] = useState<Posto | null>(null);
  const [bombas, setBombas] = useState<BombaComBicos[]>([]);
  const [novaBomba, setNovaBomba] = useState("");
  const [bicoForms, setBicoForms] = useState<Record<string, { numero: string; produto: string }>>({});
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    const { data: p } = await supabase.from("postos").select("*").eq("id", id).single();
    setPosto(p as Posto);

    const { data: b } = await supabase
      .from("bombas")
      .select("*, bicos(*)")
      .eq("posto_id", id)
      .order("numero");
    setBombas((b as BombaComBicos[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    if (id) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function adicionarBomba(e: React.FormEvent) {
    e.preventDefault();
    if (!novaBomba.trim()) return;
    await supabase.from("bombas").insert({ posto_id: id, numero: novaBomba.trim() });
    setNovaBomba("");
    carregar();
  }

  async function removerBomba(bombaId: string) {
    if (!confirm("Remover esta bomba e todos os seus bicos?")) return;
    await supabase.from("bombas").delete().eq("id", bombaId);
    carregar();
  }

  async function adicionarBico(bombaId: string) {
    const form = bicoForms[bombaId];
    if (!form?.numero?.trim()) return;
    await supabase.from("bicos").insert({
      bomba_id: bombaId,
      numero: form.numero.trim(),
      produto: form.produto || PRODUTOS[0],
    });
    setBicoForms((prev) => ({ ...prev, [bombaId]: { numero: "", produto: PRODUTOS[0] } }));
    carregar();
  }

  async function removerBico(bicoId: string) {
    if (!confirm("Remover este bico?")) return;
    await supabase.from("bicos").delete().eq("id", bicoId);
    carregar();
  }

  if (carregando) return <p className="text-slate-500">Carregando...</p>;
  if (!posto) return <p>Posto não encontrado.</p>;

  return (
    <div className="space-y-6">
      <button onClick={() => router.push("/postos")} className="text-sm text-brand-600 font-medium">
        ← Voltar para Postos
      </button>

      <div>
        <h1 className="text-2xl font-bold">{posto.nome}</h1>
        <p className="text-slate-500 dark:text-slate-400">{posto.cnpj} · {posto.endereco}</p>
      </div>

      <form onSubmit={adicionarBomba} className="card flex gap-2">
        <input
          placeholder="Número da nova bomba (ex: 01)"
          className="flex-1"
          value={novaBomba}
          onChange={(e) => setNovaBomba(e.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0">
          + Bomba
        </button>
      </form>

      <div className="space-y-4">
        {bombas.map((bomba) => (
          <div key={bomba.id} className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Bomba {bomba.numero}</h3>
              <button onClick={() => removerBomba(bomba.id)} className="text-crit text-sm font-medium">
                Remover bomba
              </button>
            </div>

            <div className="space-y-2">
              {bomba.bicos.map((bico) => (
                <div key={bico.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                  <div>
                    <p className="font-medium">Bico {bico.numero}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{bico.produto}</p>
                  </div>
                  <button onClick={() => removerBico(bico.id)} className="text-crit text-sm">
                    Remover
                  </button>
                </div>
              ))}
              {bomba.bicos.length === 0 && (
                <p className="text-sm text-slate-400">Nenhum bico cadastrado nesta bomba.</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <input
                placeholder="Número do bico"
                className="flex-1"
                value={bicoForms[bomba.id]?.numero ?? ""}
                onChange={(e) =>
                  setBicoForms((prev) => ({
                    ...prev,
                    [bomba.id]: { numero: e.target.value, produto: prev[bomba.id]?.produto ?? PRODUTOS[0] },
                  }))
                }
              />
              <select
                className="flex-1"
                value={bicoForms[bomba.id]?.produto ?? PRODUTOS[0]}
                onChange={(e) =>
                  setBicoForms((prev) => ({
                    ...prev,
                    [bomba.id]: { numero: prev[bomba.id]?.numero ?? "", produto: e.target.value },
                  }))
                }
              >
                {PRODUTOS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button onClick={() => adicionarBico(bomba.id)} className="btn-secondary shrink-0">
                + Bico
              </button>
            </div>
          </div>
        ))}
        {bombas.length === 0 && (
          <p className="text-slate-500 dark:text-slate-400 text-center py-8">Nenhuma bomba cadastrada ainda.</p>
        )}
      </div>
    </div>
  );
}
