"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome } },
        });
        if (error) throw error;
      }
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setErro(err.message ?? "Ocorreu um erro. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm card">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⛽</div>
          <h1 className="text-xl font-bold">Sistema de Aferições</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {modo === "entrar" ? "Entre com sua conta" : "Crie sua conta"}
          </p>
        </div>

        <form onSubmit={submeter} className="space-y-3">
          {modo === "criar" && (
            <input
              type="text"
              placeholder="Nome completo"
              className="w-full"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="E-mail"
            className="w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            className="w-full"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={6}
          />
          {erro && <p className="text-sm text-crit">{erro}</p>}
          <button type="submit" disabled={carregando} className="btn-primary w-full">
            {carregando ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          className="w-full text-center text-sm text-brand-600 mt-4 font-medium"
          onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
        >
          {modo === "entrar" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
