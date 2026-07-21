import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AfericaoCompleta, formatLitros } from "./types";
import { createClient } from "./supabase/client";

const TZ = "America/Sao_Paulo";

function fmtData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { timeZone: TZ });
}

function fmtDataHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { timeZone: TZ });
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
  doc.text(`Gerado em ${fmtDataHora(new Date().toISOString())}`, margin, 66);
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
      r.litros_aferidos !== null && r.litros_aferidos !== undefined ? formatLitros(r.litros_aferidos) : "-",
      r.valor_label,
      r.situacao,
      r.observacao ?? "",
      fmtData(r.data_afericao),
    ]);

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
      head: [["Produto", "Bomba", "Bico", "Litros Aferidos", "Total da Aferição", "Situação", "Observações", "Data"]],
      body,
      styles: { fontSize: 8, cellPadding: 4, valign: "middle" },
      headStyles: { fillColor: [29, 78, 216], halign: "center" },
      columnStyles: {
        0: { cellWidth: 85 },
        1: { cellWidth: 38, halign: "center" },
        2: { cellWidth: 32, halign: "center" },
        3: { cellWidth: 60, halign: "center" },
        4: { cellWidth: 65, halign: "center" },
        5: { cellWidth: 55, halign: "center" },
        6: { cellWidth: 130 },
        7: { cellWidth: 50, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 5) {
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

  // ---------- SEGUNDA PARTE: IMAGENS (uma folha inteira por foto) ----------
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxImgWidth = pageWidth - margin * 2;

  const total = ordenados.reduce((acc, r) => {
    return acc + (r.foto_afericao_path ? 1 : 0) + (r.foto_comprovante_path ? 1 : 0);
  }, 0);
  let done = 0;

  for (const r of ordenados) {
    const cabecalho = [
      `POSTO: ${r.bico.bomba.posto.nome}`,
      `BOMBA: ${r.bico.bomba.numero}`,
      `BICO: ${r.bico.numero}`,
      `PRODUTO: ${r.bico.produto}`,
    ];

    const itens: { tipo: string; path: string | null }[] = [
      { tipo: "Foto da Aferição", path: r.foto_afericao_path },
      { tipo: "Comprovante da Aferição", path: r.foto_comprovante_path },
    ];

    for (const item of itens) {
      if (!item.path) continue;

      doc.addPage();
      let y = margin + 20;

      // Título preenchendo o topo da folha
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      cabecalho.forEach((linha) => {
        doc.text(linha, margin, y);
        y += 20;
      });
      doc.setFontSize(13);
      doc.text(`TIPO: ${item.tipo}`, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(fmtData(r.data_afericao), margin, y + 16);
      doc.setTextColor(0);
      y += 40;

      onProgress?.(Math.round((done / Math.max(total, 1)) * 100), `Carregando imagens...`);
      const dataUrl = await pathToDataUrl(item.path);

      if (dataUrl) {
        const { w, h } = await getImageDims(dataUrl);
        const maxImgHeight = pageHeight - y - margin;
        let drawW = maxImgWidth;
        let drawH = (h / w) * drawW;
        if (drawH > maxImgHeight) {
          drawH = maxImgHeight;
          drawW = (w / h) * drawH;
        }
        // centraliza horizontalmente, preenchendo o restante da folha
        const drawX = margin + (maxImgWidth - drawW) / 2;
        const format = dataUrl.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(dataUrl, format, drawX, y, drawW, drawH);
      } else {
        doc.setTextColor(200, 0, 0);
        doc.text("(Não foi possível carregar a imagem)", margin, y);
        doc.setTextColor(0);
      }

      done += 1;
      onProgress?.(Math.round((done / Math.max(total, 1)) * 100), `Processando imagens...`);
    }
  }

  onProgress?.(100, "Concluído");
  return doc;
}
