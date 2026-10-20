/**
 * Cliente de Conexión Unificado: n8n Webhook & Backend Local db.json
 * Incluye Fallback inteligente para operar interactivamente en desarrollo local.
 */
import { Factura } from '../models/Factura';

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/facturas';
const DB_API_URL = import.meta.env.VITE_DB_API_URL || 'http://localhost:3001/api';

/**
 * Convierte un archivo File/Blob a string Base64 limpio (sin prefijo data:*).
 */
export async function aBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64String = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64String);
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Envia petición al Agente Orquestador en n8n a través del puente anti-CORS de backend-db
 * con fallback transparente y trazabilidad de origen de ejecución.
 */
export async function enviarAlAgente({ accion = 'consultar', mensaje = '', archivo = null, payloadExtra = {}, sessionId = 'SES-CLIENT', permitirReprocesar = false }) {
  let archivoBase64 = null;
  let archivoNombre = null;

  if (archivo && archivo instanceof File) {
    archivoNombre = archivo.name;
    archivoBase64 = await aBase64(archivo);
  }

  const payload = {
    accion,
    mensaje,
    archivo_base64: archivoBase64,
    archivo_nombre: archivoNombre,
    session_id: sessionId,
    usuario_id: 'USR-FRONTEND-REACT',
    permitir_reprocesar: permitirReprocesar,
    payloadExtra: {
      ...payloadExtra,
      permitir_reprocesar: permitirReprocesar
    }
  };

  // Enrutar mediante el endpoint puente en backend-db (:3001) para eliminar bloqueo CORS
  try {
    const response = await fetch(`${DB_API_URL}/agente/procesar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const json = await response.json();
      return {
        ok: json.ok !== false,
        data: json.data || json,
        error: json.error || null,
        pasos: json.pasos || [],
        origen_ejecucion: json.origen_ejecucion || 'fallback_local_dbjson',
        aviso_n8n: json.aviso_n8n || null
      };
    }
  } catch (err) {
    console.warn('⚠️ Endpoint puente no disponible. Ejecutando fallback directo en frontend...', err.message);
  }

  // Respaldo en caso de que backend-db esté temporalmente inaccesible
  return await ejecutarFallbackLocal({ accion, mensaje, archivoNombre, payloadExtra: payload.payloadExtra });
}

/**
 * Fallback local que simula el ciclo de razonamiento del Agente invocando la API de db.json.
 */
async function ejecutarFallbackLocal({ accion, mensaje, archivoNombre, payloadExtra }) {
  const pasos = [];
  const logPaso = (herramienta, descripcion, resultado) => {
    pasos.push({
      tool: herramienta,
      descripcion,
      tiempo: new Date().toLocaleTimeString(),
      resultado
    });
  };

  try {
    // Si la acción es registrar una factura recibida
    if (accion === 'registrar' || payloadExtra.folio || payloadExtra.subtotal) {
      logPaso('buscar_proveedor', `Buscando proveedor '${payloadExtra.proveedor || payloadExtra.identificacion_fiscal}' en db.json`, { buscando: payloadExtra.identificacion_fiscal });
      
      // Buscar proveedor
      let proveedor = null;
      try {
        const respProv = await fetch(`${DB_API_URL}/proveedores/buscar?q=${encodeURIComponent(payloadExtra.identificacion_fiscal || payloadExtra.proveedor || '')}`);
        const resProvJson = await respProv.json();
        proveedor = resProvJson.data;
      } catch (e) {
        // En caso de fallo de red en búsqueda
      }

      // Si no existe, registrarlo
      if (!proveedor && (payloadExtra.proveedor || payloadExtra.identificacion_fiscal)) {
        logPaso('registrar_proveedor', `Registrando nuevo proveedor '${payloadExtra.proveedor}' en db.json`, { nombre: payloadExtra.proveedor });
        const regResp = await fetch(`${DB_API_URL}/proveedores/registrar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: payloadExtra.proveedor,
            identificacion_fiscal: payloadExtra.identificacion_fiscal || 'N/A',
            canal_preferido: 'email',
            estado_fiscal: 'al_dia'
          })
        });
        const regJson = await regResp.json();
        proveedor = regJson.data;
      }

      // Crear factura
      logPaso('crear_factura', `Instanciando objeto factura con ID temporal`, { folio: payloadExtra.folio });
      const respCrear = await fetch(`${DB_API_URL}/facturas/crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payloadExtra,
          proveedor_id: proveedor?.id,
          archivo_nombre: archivoNombre || 'factura_recibida.pdf'
        })
      });
      const jsonCrear = await respCrear.json();
      const facturaCreada = jsonCrear.data;

      // Validar determinísticamente
      logPaso('validar_factura', `Ejecutando comprobación aritmética determinista y alerta fiscal`, { subtotal: facturaCreada.subtotal, total: facturaCreada.total });
      const respVal = await fetch(`${DB_API_URL}/facturas/validar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factura: facturaCreada })
      });
      const jsonVal = await respVal.json();
      const resultadoVal = jsonVal.data;

      if (!resultadoVal.valida) {
        logPaso('error_determinista', `Factura rechazada por errores en validación`, resultadoVal.errores);
        return {
          ok: false,
          data: {
            factura: facturaCreada,
            requiere_aprobacion: true,
            alertas_fiscales: resultadoVal.alertas_fiscales,
            mensaje: `Validación fallida: ${resultadoVal.errores.join(' | ')}`
          },
          error: resultadoVal.errores.join(', '),
          pasos,
          origen: 'fallback_local'
        };
      }

      // Guardar en db.json
      logPaso('guardar_factura', `Persistiendo factura ${facturaCreada.id} en db.json`, { id: facturaCreada.id });
      const respGuardar = await fetch(`${DB_API_URL}/facturas/guardar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factura: resultadoVal.factura })
      });
      const jsonGuardar = await respGuardar.json();

      // Programar pago
      logPaso('programar_pago', `Programando fecha de vencimiento y pago`, { vence: facturaCreada.vence });
      await fetch(`${DB_API_URL}/pagos/programar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factura_id: facturaCreada.id })
      });

      // Notificar si requiere aprobación
      if (resultadoVal.requiere_aprobacion) {
        logPaso('notificar', `Enviando alerta por canal preferido debido a monto alto o alerta fiscal`, { alertas: resultadoVal.alertas_fiscales });
        await fetch(`${DB_API_URL}/notificaciones/enviar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canal: 'email',
            destinatario: 'finanzas@pyme.com',
            mensaje: `Factura ${facturaCreada.folio} de ${facturaCreada.proveedor} por ${facturaCreada.total} requiere aprobación manual.`,
            factura_id: facturaCreada.id
          })
        });
      }

      return {
        ok: true,
        data: {
          factura: resultadoVal.factura,
          requiere_aprobacion: resultadoVal.requiere_aprobacion,
          alertas_fiscales: resultadoVal.alertas_fiscales,
          mensaje: resultadoVal.requiere_aprobacion
            ? `Factura ${facturaCreada.folio} registrada en db.json pero requiere aprobación humana debido a: ${resultadoVal.alertas_fiscales.join(' | ')}.`
            : `Factura ${facturaCreada.folio} de ${facturaCreada.proveedor} registrada exitosamente y pago programado para el vencimiento.`
        },
        error: null,
        pasos,
        origen: 'fallback_local'
      };
    }

    // Si es consulta en lenguaje natural
    logPaso('consultar_facturas', `Analizando consulta en lenguaje natural: '${mensaje}'`, { filtro: mensaje });
    const respFacturas = await fetch(`${DB_API_URL}/facturas/consultar`);
    const jsonFacturas = await respFacturas.json();
    const facturas = jsonFacturas.data || [];

    const msgLower = (mensaje || '').toLowerCase();
    let facturasFiltradas = facturas;
    let respuestaTexto = '';

    if (msgLower.includes('papelería') || msgLower.includes('lopez') || msgLower.includes('lópez')) {
      facturasFiltradas = facturas.filter(f => f.proveedor.toLowerCase().includes('lópez') || f.proveedor.toLowerCase().includes('lopez'));
      const saldo = facturasFiltradas.filter(f => f.estado !== 'pagada').reduce((s, f) => s + f.total, 0);
      respuestaTexto = `Actualmente se registran ${facturasFiltradas.length} facturas con Papelería López S.A. El saldo total pendiente por pagar es de ${new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(saldo)}.`;
    } else if (msgLower.includes('vencen') || msgLower.includes('semana')) {
      const hoy = new Date();
      const finSemana = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
      facturasFiltradas = facturas.filter(f => {
        const v = new Date(f.vence);
        return v >= hoy && v <= finSemana && f.estado !== 'pagada';
      });
      respuestaTexto = `Se encontraron ${facturasFiltradas.length} facturas con vencimiento previsto durante los próximos 7 días laborables.`;
    } else if (msgLower.includes('moroso') || msgLower.includes('omiso') || msgLower.includes('cédula') || msgLower.includes('3-101-998877')) {
      const respProv = await fetch(`${DB_API_URL}/proveedores`);
      const provJson = await respProv.json();
      const proveedorBuscado = provJson.data?.find(p => p.identificacion_fiscal.includes('998877') || p.identificacion_fiscal.includes('654321'));
      if (proveedorBuscado) {
        respuestaTexto = `El proveedor '${proveedorBuscado.nombre}' (Cédula: ${proveedorBuscado.identificacion_fiscal}) se encuentra registrado con estado fiscal '${proveedorBuscado.estado_fiscal.toUpperCase()}'. Cualquier trámite requiere revisión gerencial.`;
      } else {
        respuestaTexto = `El proveedor consultado no presenta incidencias de morosidad registradas.`;
      }
    } else {
      respuestaTexto = `He consultado la base de datos db.json. Hay un total de ${facturas.length} facturas en el sistema, de las cuales ${facturas.filter(f => f.estado === 'pendiente_aprobacion').length} están en espera de aprobación.`;
    }

    return {
      ok: true,
      data: {
        factura: null,
        facturas_resultado: facturasFiltradas,
        requiere_aprobacion: false,
        alertas_fiscales: [],
        mensaje: respuestaTexto
      },
      error: null,
      pasos,
      origen: 'fallback_local'
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: `Error al procesar consulta: ${error.message}`,
      pasos,
      origen: 'fallback_local'
    };
  }
}

/**
 * Consulta de estadísticas para el Dashboard.
 */
export async function consultarDashboardStats() {
  try {
    const res = await fetch(`${DB_API_URL}/dashboard/stats`);
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.error('Error al consultar stats:', err);
    return null;
  }
}

/**
 * Consulta de facturas con filtros.
 */
export async function consultarFacturas(filtros = {}) {
  try {
    const params = new URLSearchParams(filtros).toString();
    const res = await fetch(`${DB_API_URL}/facturas/consultar?${params}`);
    const json = await res.json();
    if (Array.isArray(json.data)) {
      return json.data.map(f => new Factura(f));
    }
    return [];
  } catch (err) {
    console.error('Error al consultar facturas:', err);
    return [];
  }
}

/**
 * Aprobación o rechazo manual de facturas.
 */
export async function aprobarFactura(id, aprobada, usuario = 'Gerente de Finanzas', comentario = '') {
  const res = await fetch(`${DB_API_URL}/facturas/${id}/aprobar`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aprobada, usuario, comentario })
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return new Factura(json.data.factura);
}

/**
 * Consulta del listado de proveedores.
 */
export async function consultarProveedores() {
  try {
    const res = await fetch(`${DB_API_URL}/proveedores`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Error al consultar proveedores:', err);
    return [];
  }
}

/**
 * Eliminación permanente y atómica de factura y sus pagos asociados en db.json.
 */
export async function eliminarFactura(id, folio = null) {
  try {
    const params = folio ? `?folio=${encodeURIComponent(folio)}` : '';
    const res = await fetch(`${DB_API_URL}/facturas/${encodeURIComponent(id)}${params}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    const json = await res.json();
    if (!json.ok) {
      throw new Error(json.error || 'Error al eliminar factura');
    }
    return json;
  } catch (err) {
    console.error('Error en eliminarFactura:', err);
    throw err;
  }
}

