/** Utilitários de documento (só no navegador): leitura de PDF e exportação PDF/DOC. */

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: string[] = [];
  const total = Math.min(doc.numPages, 40);
  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    );
  }
  return pages.map((t, i) => `--- página ${i + 1} ---\n${t}`).join("\n\n");
}

export async function textToPdfBlob(title: string, text: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 56;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const height = doc.internal.pageSize.getHeight();

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text(doc.splitTextToSize(title, width), margin, margin);

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  let y = margin + 34;
  for (const paragraph of text.split(/\n/)) {
    const lines = doc.splitTextToSize(paragraph || " ", width) as string[];
    for (const line of lines) {
      if (y > height - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 15;
    }
  }
  return doc.output("blob");
}

export function textToDocBlob(title: string, text: string): Blob {
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = text
    .split(/\n/)
    .map((line) => `<p>${escape(line) || "&nbsp;"}</p>`)
    .join("");
  const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${escape(
    title,
  )}</title></head><body style="font-family:Georgia,serif;font-size:12pt"><h2>${escape(
    title,
  )}</h2><p><em>rascunho — revise antes de usar</em></p>${body}</body></html>`;
  return new Blob([html], { type: "application/msword" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "aurora"
  );
}
