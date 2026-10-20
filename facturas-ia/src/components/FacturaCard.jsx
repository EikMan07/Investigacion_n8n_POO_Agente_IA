import React from 'react';
import { FileText, AlertTriangle, CheckCircle, Calendar, Hash, ArrowUpRight, ShieldAlert, Trash2 } from 'lucide-react';

export function FacturaCard({ factura, onAprobar, onRechazar, onEliminar, showActions = false }) {
  if (!factura) return null;

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-5 relative overflow-hidden transition-all duration-300">
      {/* Indicador lateral de atención humana */}
      {factura.requiereAtencionHumana && (
        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-500 to-rose-500"></div>
      )}

      {/* Encabezado: Proveedor y Estado */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-white truncate text-base font-['Outfit']" title={factura.proveedor}>
              {factura.proveedor}
            </h4>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
            <span>Céd: {factura.identificacion_fiscal}</span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
              <Hash className="w-3 h-3 text-emerald-400" /> {factura.folio}
            </span>
          </p>
        </div>

        <span className={`px-2.5 py-1 rounded-full border text-xs font-medium shrink-0 flex items-center gap-1.5 ${factura.estadoBadgeColor}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
          {factura.estadoEtiqueta}
        </span>
      </div>

      {/* Alertas fiscales si existen */}
      {factura.alertas_fiscales && factura.alertas_fiscales.length > 0 && (
        <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-0.5">
            {factura.alertas_fiscales.map((alerta, i) => (
              <p key={i} className="leading-snug">{alerta}</p>
            ))}
          </div>
        </div>
      )}

      {/* Desglose Económico */}
      <div className="grid grid-cols-3 gap-2 py-3 my-2 border-y border-white/5 text-xs">
        <div>
          <span className="text-slate-400 block text-[11px]">Subtotal</span>
          <span className="font-medium text-slate-200">{factura.subtotalFormateado}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Impuestos</span>
          <span className="font-medium text-slate-200">{factura.impuestosFormateado}</span>
        </div>
        <div className="text-right">
          <span className="text-emerald-400 block text-[11px] font-semibold">Total</span>
          <span className="font-bold text-white text-sm font-['Outfit']">{factura.totalFormateado}</span>
        </div>
      </div>

      {/* Footer: Fechas y Botones */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1" title="Fecha de vencimiento">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className={factura.estaVencida ? 'text-rose-400 font-semibold' : ''}>
              Vence: {factura.vence}
            </span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-[10px] text-slate-500">{factura.id}</span>
        </div>

        <div className="flex items-center gap-2">
          {onEliminar && (
            <button
              type="button"
              onClick={() => onEliminar(factura)}
              title="Eliminar factura de db.json (con confirmación)"
              className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[10px]">Eliminar</span>
            </button>
          )}

          {showActions && factura.requiereAtencionHumana && (
            <>
              <button
                onClick={() => onRechazar && onRechazar(factura)}
                className="px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors"
              >
                Rechazar
              </button>
              <button
                onClick={() => onAprobar && onAprobar(factura)}
                className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Aprobar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
