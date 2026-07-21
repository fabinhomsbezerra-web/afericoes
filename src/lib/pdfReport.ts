import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AfericaoCompleta } from "./types";
import { createClient } from "./supabase/client";

function fmtData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

async function pathToDataUrl(path: string): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("afericoes").download(path);
    if (error || !data) return null;
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(data);
    });
  } catch {
    return null;
  }
}

function getImageDims(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.width, h: img.height });
    img.onerror = () => resolve({ w: 800, h: 600 });
    img.src = dataUrl;
  });
}

/**
 * Gera um único PDF contendo:
 * 1) Tabela geral de aferições agrupadas por posto
 * 2) Todas as imagens (aferição + comprovante) de cada registro
 */
export async function gerarRelatorioPDF(
  registros: AfericaoCompleta[],
  onProgress?: (pct: number, mensagem: string) => void
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Ordena por posto, bomba, bico, data crescente
  const ordenados = [...registros].sort((a, b) => {
    const postoCmp = a.bico.bomba.posto.nome.localeCompare(b.bico.bomba.posto.nome);
    if (postoCmp !== 0) return postoCmp;
    const bombaCmp = a.bico.bomba.numero.localeCompare(b.bico.bomba.numero, undefined, {
      numeric: true,
    });
    if (bombaCmp !== 0) return bombaCmp;
    const bicoCmp = a.bico.numero.localeCompare(b.bico.numero, undefined, { numeric: true });
    if (bicoCmp !== 0) return bicoCmp;
    return new Date(a.data_afericao).getTime() - new Date(b.data_afericao).getTime();
  });

  // ---------- PRIMEIRA PARTE: TABELA ----------
  doc.setFontSize(16);
  doc.text("Relatório de Aferições", margin, 50);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, margin, 66);
  doc.setTextColor(0);

  // Agrupa por posto para reproduzir o formato do relatório original
  const porPosto = new Map<string, AfericaoCompleta[]>();
  for (const r of ordenados) {
    const nome = r.bico.bomba.posto.nome;
    if (!porPosto.has(nome)) porPosto.set(nome, []);
    porPosto.get(nome)!.push(r);
  }

  let cursorY = 85;
  for (const [nomePosto, regs] of porPosto) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(nomePosto, margin, cursorY);
    doc.setFont("helvetica", "normal");
    cursorY += 8;

    const body = regs.map((r) => [
      r.bico.produto,
      r.bico.bomba.numero,
      r.bico.numero,
      r.valor_label,
      r.situacao,
      r.observacao ?? "",
      fmtData(r.data_afericao),
    ]);

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [["Produto", "Bomba", "Bico", "Litros Aferidor", "Situação", "Observações", "Data"]],
      body,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [29, 78, 216] },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const val = String(data.cell.raw);
          if (val === "Crítico" || val === "Interditado") {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = "bold";
          } else if (val === "Alerta") {
            data.cell.styles.textColor = [217, 119, 6];
            data.cell.styles.fontStyle = "bold";
          } else {
            data.cell.styles.textColor = [22, 163, 74];
          }
        }
      },
    });

    // @ts-expect-error - lastAutoTable is injected by the plugin
    cursorY = doc.lastAutoTable.finalY + 24;
    if (cursorY > 720) {
      doc.addPage();
      cursorY = 50;
    }
  }

  // ---------- SEGUNDA PARTE: IMAGENS ----------
  doc.addPage();
  doc.setFontSize(16);
  doc.text("Anexos Fotográficos", margin, 50);
  let y = 75;
  const maxImgWidth = pageWidth - margin * 2;
  const maxImgHeight = 320;

  const total = ordenados.length;
  let done = 0;

  for (const r of ordenados) {
    const cabecalho = [
      `POSTO: ${r.bico.bomba.posto.nome}`,
      `BOMBA: ${r.bico.bomba.numero}`,
      `BICO: ${r.bico.numero}`,
    ];

    const itens: { tipo: string; path: string | null }[] = [
      { tipo: "Foto da Aferição", path: r.foto_afericao_path },
      { tipo: "Comprovante da Aferição", path: r.foto_comprovante_path },
    ];

    for (const item of itens) {
      if (!item.path) continue;

      if (y > 760) {
        doc.addPage();
        y = 50;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      cabecalho.forEach((linha, i) => {
        doc.text(linha, margin, y + i * 13);
      });
      doc.text(`TIPO: ${item.tipo}`, margin, y + cabecalho.length * 13);
      doc.setFont("helvetica", "normal");
      y += cabecalho.length * 13 + 20;

      onProgress?.(Math.round((done / Math.max(total, 1)) * 100), `Carregando imagens...`);
      const dataUrl = await pathToDataUrl(item.path);

      if (dataUrl) {
        const { w, h } = await getImageDims(dataUrl);
        let drawW = maxImgWidth;
        let drawH = (h / w) * drawW;
        if (drawH > maxImgHeight) {
          drawH = maxImgHeight;
          drawW = (w / h) * drawH;
        }
        if (y + drawH > 790) {
          doc.addPage();
          y = 50;
        }
        const format = dataUrl.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(dataUrl, format, margin, y, drawW, drawH);
        y += drawH + 30;
      } else {
        doc.setTextColor(200, 0, 0);
        doc.text("(Não foi possível carregar a imagem)", margin, y);
        doc.setTextColor(0);
        y += 25;
      }
    }
    done += 1;
    onProgress?.(Math.round((done / Math.max(total, 1)) * 100), `Processando registros...`);
  }

  onProgress?.(100, "Concluído");
  return doc;
}
