import React from 'react';
import { DollarSign, Clock, AlertTriangle, ShieldCheck, TrendingUp } from 'lucide-react';

export function KpiCards({ stats }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 animate-pulse">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className="h-32 rounded-2xl bg-slate-800/50 border border-slate-700/50"></div>
        ))}
      </div>
    );
  }

  const formatoCRC = (val) =>
    new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(val || 0);

  const kpis = [
    {
      titulo: 'Total Pendiente de Pago',
      valor: formatoCRC(stats.totalPorPagar),
      subtexto: `${stats.cantidadPorPagar || 0} facturas por procesar`,
      icono: DollarSign,
      color: 'text-emerald-400',
      bgIcono: 'bg-emerald-500/10 border-emerald-500/20',
      badge: 'Al día',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    },
    {
      titulo: 'Vencen Esta Semana',
      valor: formatoCRC(stats.vencenSemanaMonto),
      subtexto: `${stats.vencenSemanaCantidad || 0} comprobantes con plazo crítico`,
      icono: Clock,
      color: 'text-amber-400',
      bgIcono: 'bg-amber-500/10 border-amber-500/20',
      badge: stats.vencenSemanaCantidad > 0 ? 'Prioritario' : 'Normal',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    },
    {
      titulo: 'Requieren Aprobación Humana',
      valor: `${stats.pendientesAprobacionCantidad || 0} Facturas`,
      subtexto: 'Montos > 50K CRC o alertas tributarias',
      icono: AlertTriangle,
      color: 'text-rose-400',
      bgIcono: 'bg-rose-500/10 border-rose-500/20',
      badge: stats.pendientesAprobacionCantidad > 0 ? 'Atención Requerida' : 'Sin pendientes',
      badgeColor: stats.pendientesAprobacionCantidad > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-slate-500/10 text-slate-400'
    },
    {
      titulo: 'Auditoría Fiscal de Proveedores',
      valor: `${stats.proveedoresAlDia || 0} / ${(stats.proveedoresAlDia || 0) + (stats.proveedoresAlerta || 0)}`,
      subtexto: stats.proveedoresAlerta > 0 ? `${stats.proveedoresAlerta} en estado moroso/omiso` : '100% de proveedores al día',
      icono: ShieldCheck,
      color: 'text-blue-400',
      bgIcono: 'bg-blue-500/10 border-blue-500/20',
      badge: stats.proveedoresAlerta > 0 ? 'Alertas Activas' : 'Conformidad',
      badgeColor: stats.proveedoresAlerta > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icono;
        return (
          <div
            key={idx}
            className="glass-panel glass-panel-hover p-5 rounded-2xl relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{kpi.titulo}</span>
              <div className={`p-2.5 rounded-xl border ${kpi.bgIcono}`}>
                <Icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold tracking-tight text-white font-['Outfit']">{kpi.valor}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
              <span className="text-slate-400 truncate">{kpi.subtexto}</span>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium shrink-0 ${kpi.badgeColor}`}>
                {kpi.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
