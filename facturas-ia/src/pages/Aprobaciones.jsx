import React, { useState, useEffect } from 'react';
import { FacturaCard } from '../components/FacturaCard';
import { ModalEliminarFactura } from '../components/ModalEliminarFactura';
import { Factura } from '../models/Factura';
import { consultarFacturas, aprobarFactura } from '../api/n8nClient';
import { CheckCircle2, XCircle, AlertTriangle, ShieldAlert, RefreshCw, UserCheck } from 'lucide-react';

export function Aprobaciones() {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tabActivo, setTabActivo] = useState('pendientes'); // 'pendientes' | 'historial'

  // Modal de acción
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [facturaAEliminar, setFacturaAEliminar] = useState(null);
  const [tipoAccion, setTipoAccion] = useState(null); // 'aprobar' | 'rechazar'
  const [usuario, setUsuario] = useState('Gerente Financiero');
  const [comentario, setComentario] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);

  const cargarFacturas = async () => {
    setCargando(true);
    try {
      const lista = await consultarFacturas();
      setFacturas(lista);
    } catch (err) {
      console.error('Error al cargar facturas para aprobaciones:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarFacturas();
  }, []);

  const abrirModal = (factura, accion) => {
    setFacturaSeleccionada(factura);
    setTipoAccion(accion);
    setComentario(accion === 'aprobar' ? 'Aprobada tras revisión de umbral y fiscalidad.' : 'Rechazada por inconformidad.');
  };

  const ejecutarAccion = async (e) => {
    e.preventDefault();
    if (!facturaSeleccionada || !tipoAccion) return;

    setProcesando(true);
    try {
      const esAprobada = tipoAccion === 'aprobar';
      await aprobarFactura(facturaSeleccionada.id, esAprobada, usuario, comentario);
      setMensajeExito(`Factura ${facturaSeleccionada.id} ${esAprobada ? 'aprobada' : 'rechazada'} exitosamente en db.json.`);
      setFacturaSeleccionada(null);
      await cargarFacturas();
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err) {
      alert(`Error al procesar: ${err.message}`);
    } finally {
      setProcesando(false);
    }
  };

  const pendientes = facturas.filter(f => f.requiereAtencionHumana && f.estado !== 'aprobada' && f.estado !== 'rechazada' && f.estado !== 'pagada');
  const historial = facturas.filter(f => f.estado === 'aprobada' || f.estado === 'rechazada' || f.aprobada_por !== null);

  const listaAMostrar = tabActivo === 'pendientes' ? pendientes : historial;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-['Outfit']">
            Bandeja de Aprobación Humana (Human-in-the-Loop)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Supervisión para comprobantes con total &gt; 50,000 CRC o proveedores con alerta de morosidad u omisión tributaria.
          </p>
        </div>

        <button
          onClick={cargarFacturas}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all flex items-center gap-1.5 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
      </div>

      {/* Alerta de Éxito */}
      {mensajeExito && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Selector de Pestañas */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setTabActivo('pendientes')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            tabActivo === 'pendientes'
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-lg shadow-amber-500/5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Pendientes de Autorización ({pendientes.length})
        </button>

        <button
          onClick={() => setTabActivo('historial')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            tabActivo === 'historial'
              ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Historial Auditado ({historial.length})
        </button>
      </div>

      {/* Listado de Facturas */}
      {listaAMostrar.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {listaAMostrar.map((fac) => (
            <FacturaCard
              key={fac.id}
              factura={fac}
              showActions={tabActivo === 'pendientes'}
              onAprobar={(f) => abrirModal(f, 'aprobar')}
              onRechazar={(f) => abrirModal(f, 'rechazar')}
              onEliminar={(f) => setFacturaAEliminar(f)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-3xl text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h4 className="text-sm font-bold text-white font-['Outfit']">
            {tabActivo === 'pendientes' ? '¡Bandeja al día!' : 'Sin registros auditados aún'}
          </h4>
          <p className="text-xs text-slate-400">
            {tabActivo === 'pendientes'
              ? 'No hay comprobantes pendientes de autorización humana que superen el umbral o presenten alertas fiscales.'
              : 'Las facturas aprobadas o rechazadas manualmente aparecerán aquí con su registro de auditoría.'}
          </p>
        </div>
      )}

      {/* Modal de Confirmación de Auditoría */}
      {facturaSeleccionada && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
                {tipoAccion === 'aprobar' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
                {tipoAccion === 'aprobar' ? 'Aprobar Desembolso' : 'Rechazar Comprobante'}
              </h3>
              <button
                onClick={() => setFacturaSeleccionada(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
              <p className="font-semibold text-white">{facturaSeleccionada.proveedor}</p>
              <p className="text-slate-400">
                Folio: {facturaSeleccionada.folio} • Total: <span className="text-emerald-400 font-bold">{facturaSeleccionada.totalFormateado}</span>
              </p>
              {facturaSeleccionada.alertas_fiscales.length > 0 && (
                <p className="text-amber-400 text-[11px] pt-1">
                  ⚠️ {facturaSeleccionada.alertas_fiscales.join(' | ')}
                </p>
              )}
            </div>

            <form onSubmit={ejecutarAccion} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Usuario Aprobador (Auditoría)
                </label>
                <input
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Comentario / Justificación de la Decisión
                </label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows="3"
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs resize-none"
                  placeholder="Explique el motivo de la aprobación o rechazo..."
                  required
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFacturaSeleccionada(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesando}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                    tipoAccion === 'aprobar'
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20'
                      : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                  }`}
                >
                  {procesando ? 'Guardando en db.json...' : (tipoAccion === 'aprobar' ? 'Confirmar Aprobación' : 'Confirmar Rechazo')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Doble Verificación para Eliminar */}
      {facturaAEliminar && (
        <ModalEliminarFactura
          factura={facturaAEliminar}
          alCerrar={() => setFacturaAEliminar(null)}
          alEliminarExitoso={(f) => {
            setFacturas(prev => prev.filter(fac => fac.id !== f.id));
            setMensajeExito(`Factura ${f.folio} eliminada permanentemente de db.json.`);
            setTimeout(() => setMensajeExito(null), 4000);
          }}
        />
      )}
    </div>
  );
}
