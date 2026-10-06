// A minimal, dependency-free PDF of a plain-text letter (A4, Helvetica 11pt, wrapped, multi-page). Server only.
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
/** Latin-1 only (Helvetica's WinAnsi): curly quotes and dashes become plain ones; anything else is dropped. */
const latin1 = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "");

function wrap(text: string, max = 88): string[] {
  const out: string[] = [];
  for (const para of latin1(text).split("\n")) {
    if (!para.trim()) { out.push(""); continue; }
    let line = "";
    for (const w of para.split(/\s+/)) {
      if ((line + " " + w).trim().length > max) { out.push(line); line = w; } else line = (line + " " + w).trim();
    }
    out.push(line);
  }
  return out;
}

export function letterPdf(text: string): Uint8Array {
  const lines = wrap(text);
  const perPage = 54;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  if (!pages.length) pages.push([""]);
  const objs: string[] = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  const kids: number[] = [];
  pages.forEach((pg, i) => {
    const pageId = 4 + i * 2, contentId = pageId + 1;
    kids.push(pageId);
    const stream = `BT /F1 11 Tf 15 TL 56 780 Td ${pg.map((l) => `(${esc(l)}) Tj T*`).join(" ")} ET`;
    objs[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objs[contentId] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
  });
  objs[2] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let id = 1; id < objs.length; id++) {
    offsets[id] = Buffer.byteLength(pdf, "latin1");
    pdf += `${id} 0 obj\n${objs[id]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(pdf, "latin1"));
}
