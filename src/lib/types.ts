export type Posto = {
  id: string;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  status: "Ativo" | "Inativo";
  created_at: string;
};

export type Bomba = {
  id: string;
  posto_id: string;
  numero: string;
  created_at: string;
};

export type Bico = {
  id: string;
  bomba_id: string;
  numero: string;
  produto: string;
  created_at: string;
};

export type Situacao = "Regular" | "Alerta" | "Crítico" | "Interditado";

export type Afericao = {
  id: string;
  bico_id: string;
  litros_aferidos: number | null;
  valor: number | null;
  valor_label: string;
  situacao: Situacao;
  interditado: boolean;
  observacao: string | null;
  foto_afericao_path: string | null;
  foto_comprovante_path: string | null;
  data_afericao: string;
  criado_por: string | null;
  created_at: string;
};

export type AfericaoCompleta = Afericao & {
  bico: Bico & {
    bomba: Bomba & {
      posto: Posto;
    };
  };
};

export type Configuracoes = {
  id: number;
  alerta_min: number;
  critico_min: number;
};

export const PRODUTOS = [
  "Gasolina Comum",
  "Gasolina Aditivada",
  "Etanol",
  "Diesel S10",
  "Diesel S500",
  "GNV",
] as const;

export const VALOR_OPCOES: { label: string; valor: number | null }[] = [
  { label: "Maior que +200", valor: 250 },
  { label: "+200", valor: 200 },
  { label: "+180", valor: 180 },
  { label: "+160", valor: 160 },
  { label: "+140", valor: 140 },
  { label: "+120", valor: 120 },
  { label: "+100", valor: 100 },
  { label: "+80", valor: 80 },
  { label: "+60", valor: 60 },
  { label: "+40", valor: 40 },
  { label: "+20", valor: 20 },
  { label: "0", valor: 0 },
  { label: "-20", valor: -20 },
  { label: "-40", valor: -40 },
  { label: "-60", valor: -60 },
  { label: "-80", valor: -80 },
  { label: "-100", valor: -100 },
  { label: "-120", valor: -120 },
  { label: "-140", valor: -140 },
  { label: "-160", valor: -160 },
  { label: "-180", valor: -180 },
  { label: "-200", valor: -200 },
  { label: "Menor que -200", valor: -250 },
];

/** Formata litros com vírgula decimal e 3 casas, ex: 20,200 */
export function formatLitros(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || isNaN(valor)) return "-";
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}
