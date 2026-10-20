import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { eliminarFactura } from '../api/n8nClient';

export function ModalEliminarFactura({ factura, alCerrar, alEliminarExitoso }) {
  const [confirmadoCheck, setConfirmadoCheck] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState(null);

  if (!factura) return null;

  const handleEliminar = async () => {
    if (!confirmadoCheck || eliminando) return;
    setEliminando(true);
    setError(null);

    try {
      const resp = await eliminarFactura(factura.id, factura.folio);
      if (alEliminarExitoso) {
        alEliminarExitoso(factura, resp);
      }
      alCerrar();
    } catch (err) {
      setError(err.message || 'Error al eliminar factura de db.json');
      setEliminando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 border border-rose-500/40 shadow-2xl shadow-rose-950/50 space-y-5 relative">
        {/* Botón cerrar */}
        <button
          onClick={alCerrar}
          disabled={eliminando}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado con Icono de Advertencia */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-rose-400 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
              Doble Verificación de Seguridad
            </span>
            <h3 className="text-lg font-bold text-white mt-1 font-['Outfit']">
              ¿Eliminar Factura Permanentemente?
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Esta operación borrará los datos de <span className="font-mono text-slate-300">db.json</span>.
            </p>
          </div>
        </div>

        {/* Tarjeta con los datos de la factura a eliminar */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-slate-400">Folio:</span>
            <span className="font-mono font-bold text-white text-sm">{factura.folio || 'S/N'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Proveedor:</span>
            <span className="font-semibold text-slate-200 text-right">{factura.proveedor}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Cédula / Identificación:</span>
            <span className="font-mono text-slate-300">{factura.identificacion_fiscal || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Monto Total:</span>
            <span className="font-bold text-emerald-400 font-['Outfit'] text-sm">
              {factura.totalFormateado || `₡${Number(factura.total || 0).toLocaleString('es-CR')} CRC`}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
            <span>ID en base de datos: {factura.id}</span>
            <span>Vence: {factura.vence || 'N/A'}</span>
          </div>
        </div>

        {/* Alerta de consecuencia */}
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <p className="leading-relaxed">
            Se eliminará esta factura y <strong>todos sus pagos programados asociados</strong> en <code className="text-rose-200">db.json</code>. Esta acción es irreversible.
          </p>
        </div>

        {/* Doble Verificación con Checkbox Obligatorio */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-300 select-none">
            <input
              type="checkbox"
              checked={confirmadoCheck}
              onChange={(e) => setConfirmadoCheck(e.target.checked)}
              disabled={eliminando}
              className="mt-0.5 w-4 h-4 rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-rose-500"
            />
            <span className="leading-snug">
              He verificado los datos y <strong>confirmo que deseo eliminar definitivamente</strong> esta factura de la aplicación y de <code className="text-slate-200">db.json</code>.
            </span>
          </label>
        </div>

        {/* Error si ocurre */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={alCerrar}
            disabled={eliminando}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleEliminar}
            disabled={!confirmadoCheck || eliminando}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2"
          >
            <Trash2 className={`w-4 h-4 ${eliminando ? 'animate-spin' : ''}`} />
            {eliminando ? 'Eliminando de db.json...' : 'Confirmar y Eliminar Definitivamente'}
          </button>
        </div>
      </div>
    </div>
  );
}
