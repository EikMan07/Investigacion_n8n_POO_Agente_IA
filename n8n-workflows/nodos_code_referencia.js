/**
 * Nodos Code de Referencia - Asistente de Gestión de Facturas n8n (Arquitectura POO)
 * Contrato de Salida Unificado: { ok: boolean, data: object | array | null, error: string | null }
 */

// ==============================================================================
// 1. NODO: Normalizar Entrada (Constructor de Petición en Flujo Principal)
// ==============================================================================
function nodoNormalizarEntrada($input) {
  const item = $input.item.json;
  const body = item.body || item;

  // Constructor con valores por defecto y sanitización
  const accion = body.accion || 'consultar';
  const mensaje = body.mensaje || '';
  const archivo_base64 = body.archivo_base64 || body.archivo || null;
  const usuario_id = body.usuario_id || 'USR-ANONIMO';
  const session_id = body.session_id || `SES-${Date.now()}`;
  const payloadExtra = body.payloadExtra || {};

  return [{
    json: {
      accion: accion,
      mensaje: mensaje,
      archivo_base64: archivo_base64,
      usuario_id: usuario_id,
      session_id: session_id,
      payloadExtra: payloadExtra,
      timestamp: new Date().toISOString()
    }
  }];
}

// ==============================================================================
// 2. NODO: WF_Factura_Crear (Asignación de Identidad y Estado Inicial)
// ==============================================================================
function nodoFacturaCrear($input) {
  try {
    const item = $input.item.json;
    const datos = item.datos || item;

    const fechaHoy = new Date().toISOString().split('T')[0];
    const fechaVencimientoDefault = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Asignación de ID aleatorio determinista si no viene en payload
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const nuevoId = datos.id || `F-2026-${randomSuffix}`;

    const subtotal = Number(datos.subtotal) || 0;
    const impuestos = Number(datos.impuestos) || 0;
    const total = Number(datos.total) || Number((subtotal + impuestos).toFixed(2));

    const factura = {
      id: nuevoId,
      proveedor: datos.proveedor || 'Proveedor No Identificado',
      proveedor_id: datos.proveedor_id || null,
      identificacion_fiscal: datos.identificacion_fiscal || 'N/A',
      folio: datos.folio || `FOL-${Date.now()}`,
      fecha: datos.fecha || fechaHoy,
      subtotal: subtotal,
      impuestos: impuestos,
      total: total,
      moneda: datos.moneda || 'CRC',
      estado: 'pendiente',
      vence: datos.vence || fechaVencimientoDefault,
      requiere_aprobacion: total > 50000,
      aprobada_por: null,
      comentario_aprobacion: null,
      archivo_nombre: datos.archivo_nombre || 'factura_recibida.pdf',
      alertas_fiscales: [],
      creado_en: new Date().toISOString()
    };

    return [{
      json: {
        ok: true,
        data: factura,
        error: null
      }
    }];
  } catch (error) {
    return [{
      json: {
        ok: false,
        data: null,
        error: `Error en WF_Factura_Crear: ${error.message}`
      }
    }];
  }
}

// ==============================================================================
// 3. NODO: WF_Factura_Validar (Validación Determinista en Código)
// ==============================================================================
function nodoFacturaValidar($input, facturasExistentesEnDb, proveedoresEnDb) {
  try {
    const item = $input.item.json;
    const factura = item.factura || item;
    const UMBRAL_MONTO = 50000;

    const errores = [];
    const alertas_fiscales = [];

    const subtotal = Number(factura.subtotal) || 0;
    const impuestos = Number(factura.impuestos) || 0;
    const total = Number(factura.total) || 0;

    // Regla 1: Determinismo aritmético estricto
    const sumaCalculada = Number((subtotal + impuestos).toFixed(2));
    const totalInformado = Number(total.toFixed(2));
    if (sumaCalculada !== totalInformado) {
      errores.push(
        `Discrepancia aritmética: subtotal (${subtotal.toFixed(2)}) + impuestos (${impuestos.toFixed(2)}) = ${sumaCalculada.toFixed(2)}, pero total es ${totalInformado.toFixed(2)}.`
      );
    }

    // Regla 2: Formato de Cédula Jurídica / RFC / NIT
    if (!factura.identificacion_fiscal || String(factura.identificacion_fiscal).trim().length < 5) {
      errores.push('Identificación fiscal inválida o ausente.');
    }

    // Regla 3: Folio duplicado
    if (!factura.folio) {
      errores.push('El folio de la factura es obligatorio.');
    } else if (Array.isArray(facturasExistentesEnDb)) {
      const duplicada = facturasExistentesEnDb.find(f =>
        f.id !== factura.id &&
        f.folio &&
        f.folio.toLowerCase().trim() === String(factura.folio).toLowerCase().trim() &&
        f.identificacion_fiscal === factura.identificacion_fiscal
      );
      if (duplicada) {
        errores.push(`Folio '${factura.folio}' ya registrado previamente con el ID ${duplicada.id}.`);
      }
    }

    // Regla 4: Alerta fiscal (moroso u omiso)
    let requiere_aprobacion = total > UMBRAL_MONTO;

    if (Array.isArray(proveedoresEnDb)) {
      const prov = proveedoresEnDb.find(p => p.identificacion_fiscal === factura.identificacion_fiscal);
      if (prov) {
        if (prov.estado_fiscal === 'moroso') {
          alertas_fiscales.push(`Proveedor '${prov.nombre}' figura como MOROSO en la administración tributaria.`);
          requiere_aprobacion = true;
        } else if (prov.estado_fiscal === 'omiso') {
          alertas_fiscales.push(`Proveedor '${prov.nombre}' figura como OMISO en declaraciones tributarias.`);
          requiere_aprobacion = true;
        }
      }
    }

    if (total > UMBRAL_MONTO) {
      alertas_fiscales.push(`Monto de ${total.toLocaleString('es-CR')} ${factura.moneda || 'CRC'} supera el umbral de aprobación automática (${UMBRAL_MONTO}).`);
    }

    const valida = errores.length === 0;

    return [{
      json: {
        ok: true,
        data: {
          valida: valida,
          errores: errores,
          alertas_fiscales: alertas_fiscales,
          requiere_aprobacion: requiere_aprobacion,
          factura_analizada: {
            ...factura,
            requiere_aprobacion: requiere_aprobacion,
            alertas_fiscales: alertas_fiscales
          }
        },
        error: valida ? null : 'La factura no superó la validación determinista.'
      }
    }];
  } catch (error) {
    return [{
      json: {
        ok: false,
        data: null,
        error: `Error en WF_Factura_Validar: ${error.message}`
      }
    }];
  }
}

// ==============================================================================
// 4. NODO: Validar Salida (Post-procesamiento del Agente IA en Flujo Principal)
// ==============================================================================
function nodoValidarSalida($input) {
  try {
    const rawOutput = $input.item.json;
    const outputAgente = rawOutput.output || rawOutput;

    // Normalizar si viene como string JSON desde el LLM
    let parsedData = outputAgente;
    if (typeof outputAgente === 'string') {
      try {
        parsedData = JSON.parse(outputAgente);
      } catch (e) {
        parsedData = { mensaje: outputAgente };
      }
    }

    // Verificar si la respuesta trae la estructura data o requiere envolverse
    const dataFinal = parsedData.data || parsedData;
    const factura = dataFinal.factura || null;
    const alertas = dataFinal.alertas_fiscales || [];
    let requiereAprobacion = Boolean(dataFinal.requiere_aprobacion);

    if (factura && Number(factura.total) > 50000) {
      requiereAprobacion = true;
    }

    if (alertas.length > 0) {
      requiereAprobacion = true;
    }

    return [{
      json: {
        ok: true,
        data: {
          factura: factura,
          requiere_aprobacion: requiereAprobacion,
          alertas_fiscales: alertas,
          mensaje: dataFinal.mensaje || 'Operación procesada con éxito por el Agente Orquestador.'
        },
        error: parsedData.error || null,
        pasos: rawOutput.intermediateSteps || []
      }
    }];
  } catch (error) {
    return [{
      json: {
        ok: false,
        data: null,
        error: `Fallo en nodo Validar Salida: ${error.message}`,
        pasos: []
      }
    }];
  }
}

// ==============================================================================
// 5. NODO: WF_Pago_Programar (Cálculo de Fechas y Vencimiento)
// ==============================================================================
function nodoPagoProgramar($input) {
  try {
    const item = $input.item.json;
    const factura = item.factura || item;

    const facturaId = factura.id || factura.factura_id || `F-${Date.now()}`;
    const folio = factura.folio || factura.folio_factura || 'S/F';
    const proveedor = factura.proveedor || 'Desconocido';
    const monto = Number(factura.total || factura.monto_total || 0);

    const hoy = new Date();
    const fechaVence = factura.vence || factura.fecha_vencimiento || new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fechaProgramada = factura.fecha_programada || new Date(new Date(fechaVence).getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const nuevoPago = {
      id: `PAG-2026-${randomSuffix}`,
      factura_id: facturaId,
      folio_factura: folio,
      proveedor: proveedor,
      monto_total: monto,
      fecha_programada: fechaProgramada,
      fecha_vencimiento: fechaVence,
      estado_pago: 'programado',
      recordatorio_enviado: false,
      creado_en: new Date().toISOString()
    };

    return [{
      json: {
        ok: true,
        data: nuevoPago,
        error: null
      }
    }];
  } catch (error) {
    return [{
      json: {
        ok: false,
        data: null,
        error: `Error en WF_Pago_Programar: ${error.message}`
      }
    }];
  }
}

// ==============================================================================
// 6. NODO: WF_Notificador_Notificar (Polimorfismo de Canales)
// ==============================================================================
function nodoNotificadorNotificar($input) {
  try {
    const item = $input.item.json;
    const canal = (item.canal || 'email').toLowerCase();
    const destinatario = item.destinatario || 'contabilidad@pyme.com';
    const mensaje = item.mensaje || 'Aviso del Sistema de Facturas';
    const facturaId = item.factura_id || null;

    let payloadCanal = {};

    switch (canal) {
      case 'slack':
        payloadCanal = {
          tipo: 'slack_webhook',
          channel: destinatario.startsWith('#') ? destinatario : '#general',
          text: `🔔 *[Alerta Facturación]*: ${mensaje}`
        };
        break;
      case 'whatsapp':
        payloadCanal = {
          tipo: 'whatsapp_cloud_api',
          to: destinatario,
          text: { body: `📋 Facturación PyME: ${mensaje}` }
        };
        break;
      case 'telegram':
        payloadCanal = {
          tipo: 'telegram_bot',
          chat_id: destinatario,
          text: `🧾 *Facturas IA*: ${mensaje}`,
          parse_mode: 'Markdown'
        };
        break;
      case 'email':
      default:
        payloadCanal = {
          tipo: 'smtp_email',
          to: destinatario,
          subject: 'Actualización en Gestión de Facturas',
          htmlBody: `<p>${mensaje}</p><p><small>ID Factura: ${facturaId || 'N/A'}</small></p>`
        };
        break;
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return [{
      json: {
        ok: true,
        data: {
          id: `NOT-2026-${randomSuffix}`,
          enviado: true,
          canal: canal,
          destinatario: destinatario,
          payload_generado: payloadCanal,
          fecha_envio: new Date().toISOString()
        },
        error: null
      }
    }];
  } catch (error) {
    return [{
      json: {
        ok: false,
        data: null,
        error: `Error en WF_Notificador_Notificar: ${error.message}`
      }
    }];
  }
}

module.exports = {
  nodoNormalizarEntrada,
  nodoFacturaCrear,
  nodoFacturaValidar,
  nodoValidarSalida,
  nodoPagoProgramar,
  nodoNotificadorNotificar
};
