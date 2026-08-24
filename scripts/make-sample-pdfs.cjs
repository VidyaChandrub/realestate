const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "frontend", "public", "brochure");
fs.mkdirSync(dir, { recursive: true });

function makePdf(lines) {
  const content = lines
    .map((l, i) => `BT /F1 ${i === 0 ? 22 : 13} Tf 72 ${720 - i * 34} Td (${l.replace(/[()\\]/g, "")}) Tj ET`)
    .join("\n");
  const objs = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objs[3] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>";
  objs[4] = "<< /Length " + Buffer.byteLength(content) + " >>\nstream\n" + content + "\nendstream";
  objs[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 1; i <= 5; i++) {
    offsets[i] = Buffer.byteLength(pdf);
    pdf += i + " 0 obj " + objs[i] + " endobj\n";
  }
  const xrefPos = Buffer.byteLength(pdf);
  pdf += "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  pdf += "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF";
  return Buffer.from(pdf, "latin1");
}

const docs = [
  ["aurora.pdf", ["Aurora Residences - Sample Brochure", "Sarjapur Road, Bangalore", "Replace this file via the Brochure widget settings.", "3 & 4 BHK residences | RERA registered"]],
  ["skyline.pdf", ["Skyline Greens - Sample Brochure", "Electronic City, Bangalore", "Replace this file via the Downloads widget settings.", "Launch pricing valid for a limited window."]],
  ["project.pdf", ["Project Information Kit", "Plans, specifications and pricing inside.", "Replace this file with your real brochure PDF."]],
];

for (const [name, lines] of docs) fs.writeFileSync(path.join(dir, name), makePdf(lines));
console.log("written:", fs.readdirSync(dir));
