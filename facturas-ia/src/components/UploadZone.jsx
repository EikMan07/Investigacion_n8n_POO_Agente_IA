import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Sparkles, RefreshCw, Layers, Trash2 } from 'lucide-react';
import { enviarAlAgente, aBase64 } from '../api/n8nClient';

export function UploadZone({ onFacturaProcesada }) {
  const [archivo, setArchivo] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [extrayendo, setExtrayendo] = useState(false);
  const [mensajeExtraccion, setMensajeExtraccion] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Formulario inicia completamente limpio (sin datos hardcodeados inventados)
  const [formDatos, setFormDatos] = useState({
    proveedor: '',
    identificacion_fiscal: '',
    folio: '',
    fecha: '',
    subtotal: '',
    impuestos: '',
    total: '',
    moneda: 'CRC'
  });

  const [permitirReprocesar, setPermitirReprocesar] = useState(false);

  // Función para extraer datos del PDF / comprobante subido
  const extraerDatosDeComprobante = async (file) => {
    if (!file) return;
    setArchivo(file);
    setErrorMsg(null);
    setResultado(null);
    setExtrayendo(true);
    setMensajeExtraccion('📄 Extrayendo datos del comprobante PDF en tiempo real...');

    try {
      const base64 = await aBase64(file);
      const resp = await fetch('http://localhost:3001/api/facturas/extraer-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archivo_nombre: file.name,
          archivo_base64: base64
        })
      });

      const resJson = await resp.json();
      if (resJson.ok && resJson.data) {
        const d = resJson.data;
        setFormDatos({
          proveedor: d.proveedor || '',
          identificacion_fiscal: d.identificacion_fiscal || '',
          folio: d.folio || `FOL-${Date.now()}`,
          fecha: d.fecha || new Date().toISOString().split('T')[0],
          subtotal: d.subtotal !== undefined ? d.subtotal : '',
          impuestos: d.impuestos !== undefined ? d.impuestos : '',
          total: d.total !== undefined ? d.total : '',
          moneda: 'CRC'
        });
        setMensajeExtraccion(`✅ Datos extraídos automáticamente de '${file.name}'`);
      } else {
        setMensajeExtraccion('⚠️ No se pudieron extraer automáticamente todos los campos. Por favor completa los datos en el formulario.');
      }
    } catch (err) {
      console.warn('Error al extraer comprobante:', err);
      setMensajeExtraccion('⚠️ No fue posible comunicarse con el extractor local. Completa los datos manualmente o usa un preset.');
    } finally {
      setExtrayendo(false);
    }
  };

  // Generador dinámico de nuevo folio
  const generarNuevoFolio = () => {
    const nuevoFolio = `A-${Math.floor(1000 + Math.random() * 9000)}`;
    setFormDatos((prev) => ({ ...prev, folio: nuevoFolio }));
    setErrorMsg(null);
  };

  const limpiarFormulario = () => {
    setArchivo(null);
    setFormDatos({
      proveedor: '',
      identificacion_fiscal: '',
      folio: '',
      fecha: '',
      subtotal: '',
      impuestos: '',
      total: '',
      moneda: 'CRC'
    });
    setResultado(null);
    setErrorMsg(null);
    setMensajeExtraccion(null);
  };

  const manejarDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      extraerDatosDeComprobante(e.dataTransfer.files[0]);
    }
  };

  const seleccionarArchivo = (e) => {
    if (e.target.files && e.target.files[0]) {
      extraerDatosDeComprobante(e.target.files[0]);
    }
  };

  const procesarFactura = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setResultado(null);

    // Validación estricta en el frontend para evitar enviar registros en 0 o vacíos
    const totalNum = Number(formDatos.total);
    if (!formDatos.proveedor || !formDatos.identificacion_fiscal || !formDatos.folio || isNaN(totalNum) || totalNum <= 0) {
      setErrorMsg('⚠️ Sube un comprobante digital (PDF o imagen) o completa los campos requeridos (Proveedor, Cédula, Folio y Total mayor a 0) antes de procesar.');
      return;
    }

    setCargando(true);

    try {
      const payloadEnvio = {
        proveedor: formDatos.proveedor.trim(),
        identificacion_fiscal: formDatos.identificacion_fiscal.trim(),
        folio: formDatos.folio.trim(),
        subtotal: Number(formDatos.subtotal) || 0,
        impuestos: Number(formDatos.impuestos) || 0,
        total: totalNum,
        fecha: formDatos.fecha || new Date().toISOString().split('T')[0],
        moneda: formDatos.moneda || 'CRC'
      };

      const res = await enviarAlAgente({
        accion: 'registrar',
        mensaje: `Registrar nueva factura con folio ${formDatos.folio} de ${formDatos.proveedor}`,
        archivo: archivo,
        payloadExtra: payloadEnvio,
        sessionId: 'SES-UPLOAD-' + Date.now(),
        permitirReprocesar: permitirReprocesar
      });

      if (!res.ok) {
        throw new Error(res.error || 'La factura no superó la validación determinista');
      }

      setResultado(res);
      if (onFacturaProcesada && res.data?.factura) {
        onFacturaProcesada(res.data.factura);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setCargando(false);
    }
  };

  // Presets para facilitar pruebas en vivo
  const aplicarPreset = (tipo) => {
    const seq = Math.floor(1000 + Math.random() * 9000);
    setErrorMsg(null);
    setResultado(null);
    setMensajeExtraccion(null);

    switch (tipo) {
      case 'valida_normal':
        setFormDatos({
          proveedor: 'Papelería López S.A.',
          identificacion_fiscal: '3-101-123456',
          folio: `A-${seq}`,
          fecha: new Date().toISOString().split('T')[0],
          subtotal: 1200.00,
          impuestos: 192.00,
          total: 1392.00,
          moneda: 'CRC'
        });
        break;
      case 'error_aritmetico':
        setFormDatos({
          proveedor: 'Papelería López S.A.',
          identificacion_fiscal: '3-101-123456',
          folio: `ERR-${seq}`,
          fecha: new Date().toISOString().split('T')[0],
          subtotal: 1200.00,
          impuestos: 192.00,
          total: 2000.00, // Error intencional: 1200 + 192 != 2000
          moneda: 'CRC'
        });
        break;
      case 'monto_alto':
        setFormDatos({
          proveedor: 'Servicios de Nube y Redes CloudTech S.A.',
          identificacion_fiscal: '3-102-445566',
          folio: `CLOUD-${seq}`,
          fecha: new Date().toISOString().split('T')[0],
          subtotal: 60000.00,
          impuestos: 9600.00,
          total: 69600.00, // Supera umbral de 50K
          moneda: 'CRC'
        });
        break;
      case 'proveedor_moroso':
        setFormDatos({
          proveedor: 'Distribuidora Central S.A.',
          identificacion_fiscal: '3-101-654321', // Moroso
          folio: `MOR-${seq}`,
          fecha: new Date().toISOString().split('T')[0],
          subtotal: 3000.00,
          impuestos: 480.00,
          total: 3480.00,
          moneda: 'CRC'
        });
        break;
      case 'proveedor_omiso':
        setFormDatos({
          proveedor: 'Consultores Técnicos Alfa Ltda.',
          identificacion_fiscal: '3-101-998877', // Omiso
          folio: `OMI-${seq}`,
          fecha: new Date().toISOString().split('T')[0],
          subtotal: 15000.00,
          impuestos: 2400.00,
          total: 17400.00,
          moneda: 'CRC'
        });
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Botones de Presets para Pruebas Rápidas */}
      <div className="glass-panel p-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-300">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Presets de Prueba Rápida (Validación Determinista y Reglas de Negocio):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => aplicarPreset('valida_normal')}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-all"
          >
            ✅ Factura Válida (Cuadra &lt;50K)
          </button>
          <button
            type="button"
            onClick={() => aplicarPreset('error_aritmetico')}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all"
          >
            ❌ Error Aritmético (Rechazo Código)
          </button>
          <button
            type="button"
            onClick={() => aplicarPreset('monto_alto')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-all"
          >
            ⚠️ Monto Alto (&gt;50K Aprobación)
          </button>
          <button
            type="button"
            onClick={() => aplicarPreset('proveedor_moroso')}
            className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-medium transition-all"
          >
            🚨 Proveedor Moroso (Alerta Fiscal)
          </button>
          <button
            type="button"
            onClick={() => aplicarPreset('proveedor_omiso')}
            className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all"
          >
            📋 Proveedor Omiso (Retención)
          </button>
          <button
            type="button"
            onClick={limpiarFormulario}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all flex items-center gap-1 ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" /> Limpiar Formulario
          </button>
        </div>
      </div>

      {/* Indicador de Extracción en tiempo real */}
      {extrayendo && (
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center justify-center gap-2 animate-pulse shadow-lg">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
          <span className="font-semibold">📄 Extrayendo datos del comprobante PDF en tiempo real...</span>
        </div>
      )}

      {mensajeExtraccion && !extrayendo && (
        <div className={`p-3 rounded-2xl text-xs flex items-center justify-between border ${
          mensajeExtraccion.startsWith('✅')
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <span>{mensajeExtraccion}</span>
          <button
            type="button"
            onClick={() => setMensajeExtraccion(null)}
            className="text-slate-400 hover:text-white text-[11px] font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Zona de Arrastre y Soltado */}
      <div
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={manejarDrop}
        className={`glass-panel border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-300 ${
          arrastrando
            ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
            : 'border-slate-700/80 hover:border-slate-600'
        }`}
      >
        <input
          type="file"
          id="archivo-factura"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={seleccionarArchivo}
        />

        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-white mb-1 font-['Outfit']">
            Arrastra tu factura aquí o explora tus archivos
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Formatos aceptados: PDF, PNG, JPG (Se extraen campos y valida sumas con n8n)
          </p>

          <label
            htmlFor="archivo-factura"
            className="cursor-pointer px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-medium transition-all"
          >
            Seleccionar Comprobante Digital
          </label>

          {archivo && (
            <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center gap-3 w-full text-left">
              <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">{archivo.name}</p>
                <p className="text-[10px] text-slate-400">{(archivo.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={() => setArchivo(null)}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                Quitar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Formulario de Campos de Factura */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Datos de la Factura para Envío al Agente Orquestador
          </h4>
          <span className="text-[11px] text-slate-400">Persistencia: db.json</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Proveedor / Razón Social</label>
            <input
              type="text"
              value={formDatos.proveedor}
              onChange={(e) => setFormDatos({ ...formDatos, proveedor: e.target.value })}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Cédula / Identificación Fiscal</label>
            <input
              type="text"
              value={formDatos.identificacion_fiscal}
              onChange={(e) => setFormDatos({ ...formDatos, identificacion_fiscal: e.target.value })}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-slate-400">Folio de Factura</label>
              <button
                type="button"
                onClick={generarNuevoFolio}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                title="Generar folio aleatorio para evitar duplicados en pruebas"
              >
                <RefreshCw className="w-3 h-3" /> Nuevo Folio
              </button>
            </div>
            <input
              type="text"
              value={formDatos.folio}
              onChange={(e) => setFormDatos({ ...formDatos, folio: e.target.value })}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Fecha Emisión</label>
            <input
              type="date"
              value={formDatos.fecha}
              onChange={(e) => setFormDatos({ ...formDatos, fecha: e.target.value })}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Subtotal (CRC)</label>
            <input
              type="number"
              step="0.01"
              value={formDatos.subtotal}
              onChange={(e) => setFormDatos({ ...formDatos, subtotal: parseFloat(e.target.value) || 0 })}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Impuestos (CRC)</label>
            <input
              type="number"
              step="0.01"
              value={formDatos.impuestos}
              onChange={(e) => setFormDatos({ ...formDatos, impuestos: parseFloat(e.target.value) || 0 })}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Total Informado (CRC)</label>
            <input
              type="number"
              step="0.01"
              value={formDatos.total}
              onChange={(e) => setFormDatos({ ...formDatos, total: parseFloat(e.target.value) || 0 })}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={procesarFactura}
              disabled={cargando}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              {cargando ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Orquestando con IA...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Procesar con Agente n8n
                </>
              )}
            </button>
          </div>

          <div className="col-span-full flex items-center justify-between pt-3 mt-1 border-t border-white/5 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={permitirReprocesar}
                onChange={(e) => setPermitirReprocesar(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-[11px]">Permitir re-procesar / actualizar si el folio ya existe en db.json (UPSERT)</span>
            </label>
            <span className="text-[10px] text-slate-400">
              * Desactivado por defecto para validar prevención de duplicados
            </span>
          </div>
        </div>
      </div>

      {/* Resultados de la Invocación */}
      {resultado && (
        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h4 className="text-sm font-semibold text-white font-['Outfit']">
                  Factura Procesada con Éxito
                </h4>
                {resultado.origen_ejecucion === 'n8n_agent' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    🟢 Ejecutado por AI Agent en n8n
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    🟡 {resultado.aviso_n8n || 'Modo Validador Local db.json'}
                  </span>
                )}
              </div>

              <p className="text-xs text-emerald-200 mt-1">{resultado.data.mensaje}</p>

              {resultado.data.alertas_fiscales && resultado.data.alertas_fiscales.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  <span className="font-semibold block mb-1">Alertas detectadas por la validación:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {resultado.data.alertas_fiscales.map((alerta, idx) => (
                      <li key={idx}>{alerta}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="glass-panel p-5 rounded-2xl border border-rose-500/30 bg-rose-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-rose-300 font-['Outfit']">
                Rechazo en Validación Determinista
              </h4>
              <p className="text-xs text-rose-200 mt-1">{errorMsg}</p>

              {errorMsg.includes('Folio duplicado') && (
                <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-rose-500/20">
                  <button
                    type="button"
                    onClick={generarNuevoFolio}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Generar Nuevo Folio y Reintentar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPermitirReprocesar(true); setErrorMsg(null); }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-medium"
                  >
                    Activar Actualizar Factura (UPSERT)
                  </button>
                </div>
              )}

              <p className="text-[11px] text-slate-400 mt-2">
                * Por diseño seguro, ninguna factura con error aritmético o folio duplicado es almacenada en db.json.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
