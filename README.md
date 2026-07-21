# Sistema de Aferições de Bombas de Combustível

PWA em Next.js + Supabase para registrar aferições de bicos de bombas em postos, anexar fotos e gerar um relatório único em PDF (tabela + imagens).

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (modo claro/escuro)
- Supabase (Auth, Postgres, Storage)
- jsPDF + jspdf-autotable (geração do relatório no navegador)
- PWA instalável (manifest + service worker)

## 1. Configurar o Supabase

1. Crie um projeto em https://supabase.com.
2. No **SQL Editor**, cole e execute todo o conteúdo do arquivo `supabase/schema.sql`.
   Isso cria as tabelas (`postos`, `bombas`, `bicos`, `afericoes`, `configuracoes`, `profiles`),
   as políticas de RLS e o bucket de Storage `afericoes` (privado).
3. Em **Authentication > Providers**, confirme que "Email" está habilitado.
   Se quiser liberar cadastro sem confirmação de e-mail (mais prático para uso interno em campo),
   desative "Confirm email" em Authentication > Settings.
4. Em **Project Settings > API**, copie a **Project URL** e a **anon public key**.

## 2. Configurar o projeto localmente

```bash
npm install
cp .env.local.example .env.local
```

Edite `.env.local` e cole a URL e a chave anônima do Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
```

Rodar em desenvolvimento:

```bash
npm run dev
```

Acesse http://localhost:3000, crie uma conta na tela de login e comece a cadastrar postos.

## 3. Deploy na Vercel

1. Suba este projeto para um repositório no GitHub/GitLab.
2. Em https://vercel.com, clique em **New Project** e importe o repositório.
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em **Deploy**.
5. Após o deploy, acesse a URL gerada pelo celular e use "Adicionar à tela inicial"
   (Android/Chrome) ou "Compartilhar > Adicionar à Tela de Início" (iOS/Safari) para instalar o PWA.

## 4. Fluxo de uso

1. **Postos**: cadastre o posto (nome, CNPJ, endereço). Entre no posto para cadastrar as
   **bombas** e, dentro de cada bomba, os **bicos** (número + produto).
2. **Aferições**: selecione posto → bomba → bico, escolha o resultado (mL) ou marque
   "interditado", anexe a foto da aferição e do comprovante (câmera, galeria ou arquivo) e salve.
   O formulário mantém o posto/bomba selecionados para agilizar o registro do próximo bico.
3. **Histórico**: filtre os registros por data, posto, bomba, bico ou produto.
4. **Relatórios**: escolha postos e período e gere um único PDF contendo a tabela de todas as
   aferições (agrupadas por posto) seguida de todas as fotos (aferição + comprovante),
   com cabeçalho `POSTO / BOMBA / BICO / TIPO` antes de cada imagem, em ordem crescente.
5. **Configurações**: ajuste as faixas (em mL) que definem quando uma aferição é
   Regular / Alerta / Crítico, e alterne entre modo claro e escuro.

## Regras de situação (padrão, editável em Configurações)

- `|erro| < 100 mL` → **Regular**
- `100 mL ≤ |erro| < 150 mL` → **Alerta**
- `|erro| ≥ 150 mL` → **Crítico** (observação automática "ACIMA DO PERMITIDO!")
- Bico marcado manualmente como interditado → **Interditado** (observação "INTERDITADA!")

## Estrutura do banco

- `postos` — cadastro de postos
- `bombas` — bombas de cada posto
- `bicos` — bicos de cada bomba (produto associado)
- `afericoes` — cada registro de aferição, com caminho das fotos no Storage
- `configuracoes` — limites de Alerta/Crítico (linha única, id = 1)
- `profiles` — perfil básico vinculado ao usuário do Supabase Auth

As fotos ficam no bucket privado `afericoes` do Supabase Storage, organizadas por
`posto/bomba/bico/arquivo.jpg`. O relatório em PDF baixa as imagens do Storage no navegador
do usuário autenticado e as insere no arquivo final — nada é enviado a servidores externos.

## Ícones do PWA

Os ícones em `public/icons/icon-192.png` e `icon-512.png` são placeholders simples.
Substitua-os pela logo real da empresa (mesmos nomes e tamanhos) antes de publicar.

## Personalização

- Produtos disponíveis: edite a constante `PRODUTOS` em `src/lib/types.ts`.
- Opções de valor do dropdown de aferição: constante `VALOR_OPCOES` em `src/lib/types.ts`.
- Cores/tema: `tailwind.config.ts` e `src/app/globals.css`.
