const fs = require('fs');
const path = require('path');

// Generador de PDF estándar 1.4 con cálculo exacto de longitud y tabla xref
function construirPdf(lineasTexto) {
  // Construir flujo de comandos de texto en PDF (Helvetica)
  let streamLines = [
    'BT',
    '/F1 18 Tf',
    '50 730 Td',
    `(${lineasTexto.titulo || 'FACTURA ELECTRONICA - COMPROBANTE FISCAL'}) Tj`,
    '0 -28 Td',
    '/F1 11 Tf'
  ];

  for (const item of lineasTexto.detalles) {
    streamLines.push(`0 -16 Td`);
    streamLines.push(`(${item}) Tj`);
  }

  streamLines.push('ET');
  const streamContent = streamLines.join('\n');
  const streamLength = Buffer.byteLength(streamContent, 'utf-8');

  // Definir objetos
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';
  const obj4 = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`;
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  const header = '%PDF-1.4\n';

  // Calcular offsets
  const offset1 = Buffer.byteLength(header, 'utf-8');
  const offset2 = offset1 + Buffer.byteLength(obj1, 'utf-8');
  const offset3 = offset2 + Buffer.byteLength(obj2, 'utf-8');
  const offset4 = offset3 + Buffer.byteLength(obj3, 'utf-8');
  const offset5 = offset4 + Buffer.byteLength(obj4, 'utf-8');

  const startXref = offset5 + Buffer.byteLength(obj5, 'utf-8');

  const formatOffset = (off) => String(off).padStart(10, '0') + ' 00000 n \n';

  const xref = [
    'xref\n',
    '0 6\n',
    '0000000000 65535 f \n',
    formatOffset(offset1),
    formatOffset(offset2),
    formatOffset(offset3),
    formatOffset(offset4),
    formatOffset(offset5),
    'trailer\n',
    '<< /Size 6 /Root 1 0 R >>\n',
    'startxref\n',
    `${startXref}\n`,
    '%%EOF'
  ].join('');

  return header + obj1 + obj2 + obj3 + obj4 + obj5 + xref;
}

const ejemplosCarpeta = path.join(__dirname, '..', 'comprobantes_ejemplo');
if (!fs.existsSync(ejemplosCarpeta)) {
  fs.mkdirSync(ejemplosCarpeta, { recursive: true });
}

// -------------------------------------------------------------
// DEFINICIÓN DE LOS 5 PRESETS EXACTOS DE LA INTERFAZ
// -------------------------------------------------------------

const comprobantes = [
  {
    archivoPdf: '1_factura_valida_papeleria.pdf',
    archivoJson: 'ejemplo_1_factura_valida.json',
    datos: {
      titulo: 'COMPROBANTE FISCAL DIGITAL - FACTURA VALIDA',
      proveedor: 'Papeleria Lopez S.A.',
      proveedor_formal: 'Papelería López S.A.',
      identificacion_fiscal: '3-101-123456',
      folio: 'A-8835',
      fecha: '2026-10-20',
      subtotal: 1200.00,
      impuestos: 192.00,
      total: 1392.00,
      moneda: 'CRC',
      items: [
        '1. Resmas de Papel Bond Carta x20 ........... Subtotal: CRC 800.00',
        '2. Tinta Negra Epson L3150 x2 .............. Subtotal: CRC 400.00'
      ],
      nota: 'Caso: Factura Valida (Cuadra y Monto < 50K). Pasa directo sin aprobacion.'
    }
  },
  {
    archivoPdf: '2_error_aritmetico_papeleria.pdf',
    archivoJson: 'ejemplo_2_error_aritmetico.json',
    datos: {
      titulo: 'COMPROBANTE FISCAL CON ERROR - DISCREPANCIA',
      proveedor: 'Papeleria Lopez S.A.',
      proveedor_formal: 'Papelería López S.A.',
      identificacion_fiscal: '3-101-123456',
      folio: 'ERR-FRAUDE-99',
      fecha: '2026-10-20',
      subtotal: 1200.00,
      impuestos: 192.00,
      total: 2000.00, // ERROR ARITMÉTICO: 1200 + 192 = 1392 != 2000
      moneda: 'CRC',
      items: [
        '1. Resmas de Papel Bond Carta x20 ........... Subtotal: CRC 800.00',
        '2. Tinta Negra Epson L3150 x2 .............. Subtotal: CRC 400.00'
      ],
      nota: 'Caso: Error Aritmetico (1200 + 192 != 2000). Rechazado por validacion de codigo.'
    }
  },
  {
    archivoPdf: '3_monto_alto_cloudtech.pdf',
    archivoJson: 'ejemplo_3_monto_alto_requiere_aprobacion.json',
    datos: {
      titulo: 'CLOUDTECH ENTERPRISE - SERVICIOS CLOUD',
      proveedor: 'Servicios de Nube y Redes CloudTech S.A.',
      proveedor_formal: 'Servicios de Nube y Redes CloudTech S.A.',
      identificacion_fiscal: '3-102-445566',
      folio: 'CLOUD-2026-X1',
      fecha: '2026-10-20',
      subtotal: 60000.00,
      impuestos: 9600.00,
      total: 69600.00, // SUPERA UMBRAL DE 50.000 CRC
      moneda: 'CRC',
      items: [
        '1. Servidores Dedicados AWS & Azure Trimestral Subtotal: CRC 60,000.00'
      ],
      nota: 'Caso: Monto Alto (> 50K CRC). Sumas cuadran pero requiere aprobacion de gerencia.'
    }
  },
  {
    archivoPdf: '4_proveedor_moroso_distribuidora.pdf',
    archivoJson: 'ejemplo_4_proveedor_moroso.json',
    datos: {
      titulo: 'DISTRIBUIDORA CENTRAL S.A. - SUMINISTROS',
      proveedor: 'Distribuidora Central S.A.',
      proveedor_formal: 'Distribuidora Central S.A.',
      identificacion_fiscal: '3-101-654321',
      folio: 'MOR-7712',
      fecha: '2026-10-20',
      subtotal: 3000.00,
      impuestos: 480.00,
      total: 3480.00,
      moneda: 'CRC',
      items: [
        '1. Articulos de Limpieza y Cafeteria Corporativa Subtotal: CRC 3,000.00'
      ],
      nota: 'Caso: Proveedor Moroso en Hacienda. Alerta fiscal y requiere aprobacion.'
    }
  },
  {
    archivoPdf: '5_proveedor_omiso_consultores.pdf',
    archivoJson: 'ejemplo_5_proveedor_omiso.json',
    datos: {
      titulo: 'CONSULTORES TECNICOS ALFA - AUDITORIA TI',
      proveedor: 'Consultores Tecnicos Alfa Ltda.',
      proveedor_formal: 'Consultores Técnicos Alfa Ltda.',
      identificacion_fiscal: '3-101-998877',
      folio: 'OMI-5011',
      fecha: '2026-10-20',
      subtotal: 15000.00,
      impuestos: 2400.00,
      total: 17400.00,
      moneda: 'CRC',
      items: [
        '1. Auditoria de Ciberseguridad e Infraestructura Subtotal: CRC 15,000.00'
      ],
      nota: 'Caso: Proveedor Omiso en Hacienda. Aplica retencion y requiere aprobacion.'
    }
  }
];

// Generar cada comprobante en PDF y JSON
comprobantes.forEach((comp, idx) => {
  const d = comp.datos;

  // 1. Generar PDF
  const lineasDetalles = [
    `Emisor: ${d.proveedor}`,
    `Cedula Juridica: ${d.identificacion_fiscal}`,
    `Folio: ${d.folio} | Fecha: ${d.fecha}`,
    `------------------------------------------------------------------------`,
    `DETALLE DE FACTURA:`,
    ...d.items,
    `------------------------------------------------------------------------`,
    `SUBTOTAL: ....................................... CRC ${d.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `IMPUESTO IVA: ................................... CRC   ${d.impuestos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `TOTAL A PAGAR: ................................. CRC ${d.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `------------------------------------------------------------------------`,
    `[Nota de prueba]: ${d.nota}`
  ];

  const pdfContent = construirPdf({
    titulo: d.titulo,
    detalles: lineasDetalles
  });

  const rutaPdf = path.join(ejemplosCarpeta, comp.archivoPdf);
  fs.writeFileSync(rutaPdf, pdfContent, 'utf-8');
  console.log(`[OK] PDF generado: ${comp.archivoPdf}`);

  // 2. Generar JSON de prueba listo para n8n o endpoint POST
  const payloadJson = {
    accion: 'registrar',
    mensaje: `Por favor registrar y validar la factura con folio ${d.folio} de ${d.proveedor_formal || d.proveedor}`,
    session_id: `SES-TEST-${idx + 1}`,
    factura: {
      proveedor: d.proveedor_formal || d.proveedor,
      identificacion_fiscal: d.identificacion_fiscal,
      folio: d.folio,
      fecha: d.fecha,
      subtotal: d.subtotal,
      impuestos: d.impuestos,
      total: d.total,
      moneda: d.moneda,
      archivo_nombre: comp.archivoPdf,
      permitir_reprocesar: true
    }
  };

  const rutaJson = path.join(ejemplosCarpeta, comp.archivoJson);
  fs.writeFileSync(rutaJson, JSON.stringify(payloadJson, null, 2), 'utf-8');
  console.log(`[OK] JSON generado: ${comp.archivoJson}`);
});

// 3. Generar archivo adicional para probar la acción 'consultar' de facturas
const consultaFacturasJson = {
  accion: 'consultar',
  mensaje: '¿Cuáles facturas tenemos registradas y cuál es el monto adeudado a Papelería López?',
  session_id: 'SES-TEST-CONSULTA-FACTURAS',
  payloadExtra: {
    proveedor: 'Papelería López S.A.',
    estado: 'validada'
  },
  ejemplos_preguntas_adicionales: [
    '¿Cuánto le debemos en total a Papelería López?',
    '¿Cuáles facturas requieren aprobación gerencial por monto mayor a 50000?',
    '¿Existen facturas asociadas a proveedores morosos u omisos?',
    'Listar todas las facturas en estado validada'
  ]
};

const rutaConsulta = path.join(ejemplosCarpeta, 'ejemplo_6_consultar_facturas.json');
fs.writeFileSync(rutaConsulta, JSON.stringify(consultaFacturasJson, null, 2), 'utf-8');
console.log(`[OK] JSON de consulta generado: ejemplo_6_consultar_facturas.json`);

console.log('\nTodos los ejemplos creados exitosamente en:', ejemplosCarpeta);
