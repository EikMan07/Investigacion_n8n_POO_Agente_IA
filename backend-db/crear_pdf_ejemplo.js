const fs = require('fs');
const path = require('path');

// Generador de PDF estándar 1.4 en JavaScript puro (sin dependencias externas)
function generarPdfFactura(outputPath) {
  const contenido = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 520 >>
stream
BT
/F1 20 Tf
50 720 Td
(FACTURA ELECTRONICA - COMPROBANTE FISCAL) Tj
0 -30 Td
/F1 12 Tf
(Emisor: Papeleria Lopez S.A.) Tj
0 -18 Td
(Cedula Juridica: 3-101-123456) Tj
0 -18 Td
(Folio: A-8831 | Fecha: 2026-10-20) Tj
0 -30 Td
/F1 14 Tf
(DETALLE DE ARTICULOS:) Tj
0 -20 Td
/F1 11 Tf
(1. Resmas de Papel Bond Carta x20 .............. Subtotal: CRC 800.00) Tj
0 -18 Td
(2. Tinta Negra para Impresora Epson x2 ......... Subtotal: CRC 400.00) Tj
0 -35 Td
(------------------------------------------------------------------------) Tj
0 -20 Td
/F1 12 Tf
(SUBTOTAL: ....................................... CRC 1,200.00) Tj
0 -18 Td
(IMPUESTO IVA (16%): ............................. CRC   192.00) Tj
0 -22 Td
/F1 14 Tf
(TOTAL A PAGAR: ................................. CRC 1,392.00) Tj
0 -40 Td
/F1 10 Tf
(Comprobante de prueba determinista para Asistente n8n y persistencia db.json) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000816 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
895
%%EOF`;

  fs.writeFileSync(outputPath, contenido, 'utf-8');
  console.log('PDF generado exitosamente en:', outputPath);
}

const targetPath = path.join(__dirname, '..', 'comprobantes_ejemplo', 'factura_ejemplo_papeleria.pdf');
generarPdfFactura(targetPath);
