import { Configuracoes, Situacao } from "./types";

export function calcularSituacao(
  valor: number | null,
  interditado: boolean,
  config: Configuracoes
): { situacao: Situacao; observacao: string | null } {
  if (interditado) {
    return { situacao: "Interditado", observacao: "INTERDITADA!" };
  }
  if (valor === null) {
    return { situacao: "Regular", observacao: null };
  }
  const abs = Math.abs(valor);
  if (abs >= config.critico_min) {
    return { situacao: "Crítico", observacao: "ACIMA DO PERMITIDO!" };
  }
  if (abs >= config.alerta_min) {
    return { situacao: "Alerta", observacao: null };
  }
  return { situacao: "Regular", observacao: null };
}

export function situacaoCor(situacao: Situacao): string {
  switch (situacao) {
    case "Regular":
      return "text-ok bg-ok/10 border-ok/30";
    case "Alerta":
      return "text-warn bg-warn/10 border-warn/30";
    case "Crítico":
      return "text-crit bg-crit/10 border-crit/30";
    case "Interditado":
      return "text-crit bg-crit/10 border-crit/30";
  }
}
