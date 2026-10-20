import React, { useState, useEffect } from 'react';
import { KpiCards } from '../components/KpiCards';
import { FacturaCard } from '../components/FacturaCard';
import { ModalEliminarFactura } from '../components/ModalEliminarFactura';
import { consultarDashboardStats, consultarFacturas } from '../api/n8nClient';
import { Factura } from '../models/Factura';
import { FileText, ArrowRight, Calendar, CheckCircle2, Clock, ShieldCheck, RefreshCw, Search, Trash2 } from 'lucide-react';

export function Dashboard({ onNavegar }) {
  const [stats, setStats] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [facturaAEliminar, setFacturaAEliminar] = useState(null);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [mostrarTodas, setMostrarTodas] = useState(true);
  const [notificacion, setNotificacion] = useState(null);

  const cargarDatos = async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const [sData, fData] = await Promise.all([
        consultarDashboardStats(),
        consultarFacturas()
      ]);
      setStats(sData);
      setFacturas(fData);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
    } finally {
      if (!silencioso) setCargando(false);
    }
  };

  const manejarFacturaEliminada = (facturaEliminada, resp) => {
    setFacturas(prev => prev.filter(f => f.id !== facturaEliminada.id && f.folio !== facturaEliminada.folio));
    setNotificacion(`✅ Factura ${facturaEliminada.folio} (${facturaEliminada.proveedor}) eliminada permanentemente de db.json`);
    setTimeout(() => setNotificacion(null), 5000);
    consultarDashboardStats().then(setStats).catch(() => {});
  };

  useEffect(() => {
    cargarDatos(false);
    const interval = setInterval(() => {
      cargarDatos(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Encabezado y Acción Rápida */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-['Outfit']">
            Resumen Financiero y Control Tributario
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Persistencia en <span className="font-mono text-emerald-400">db.json</span> • Automatización de Facturas con n8n y POO
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={cargarDatos}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all flex items-center gap-1.5"
            title="Recargar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
          <button
            onClick={() => onNavegar('subir')}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Nueva Factura
          </button>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <KpiCards stats={stats} />

      {/* Sección Distribución y Próximos Pagos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución de Estados */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center justify-between">
            <span>Distribución de Estados</span>
            <span className="text-[11px] text-slate-400 font-normal">{facturas.length} Facturas Totales</span>
          </h3>

          <div className="space-y-3 pt-2 text-xs">
            {[
              { label: 'Validadas / Al Día', estado: 'validada', color: 'bg-emerald-500', count: facturas.filter(f => f.estado === 'validada').length },
              { label: 'Pendiente Aprobación (>50K o Fiscal)', estado: 'pendiente_aprobacion', color: 'bg-amber-500', count: facturas.filter(f => f.requiereAtencionHumana && f.estado !== 'pagada').length },
              { label: 'Pagadas', estado: 'pagada', color: 'bg-blue-500', count: facturas.filter(f => f.estado === 'pagada').length },
              { label: 'Pendiente de Procesar', estado: 'pendiente', color: 'bg-slate-500', count: facturas.filter(f => f.estado === 'pendiente' && !f.requiereAtencionHumana).length }
            ].map((item, idx) => {
              const porcentaje = facturas.length > 0 ? ((item.count / facturas.length) * 100).toFixed(0) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>{item.label}</span>
                    <span className="font-semibold text-white">{item.count} ({porcentaje}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${porcentaje}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Umbral automático: 50,000 CRC</span>
            <button onClick={() => onNavegar('aprobaciones')} className="text-emerald-400 hover:underline flex items-center gap-1">
              Ver aprobaciones <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Cronograma de Pagos Programados */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Cronograma de Pagos Automatizados (Clase WF_Pago)
            </h3>
            <span className="text-[11px] text-slate-400">Agendados en db.json</span>
          </div>

          <div className="space-y-2.5 overflow-x-auto">
            {stats?.ultimosPagos && stats.ultimosPagos.length > 0 ? (
              stats.ultimosPagos.map((pago) => (
                <div
                  key={pago.id}
                  className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                      💳
                    </div>
                    <div>
                      <p className="font-semibold text-white">{pago.proveedor}</p>
                      <p className="text-[11px] text-slate-400">
                        Folio: {pago.folio_factura} • Pago Previsto: <span className="text-slate-200">{pago.fecha_programada}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-white text-sm font-['Outfit']">
                      {new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(pago.monto_total)}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {pago.estado_pago}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No hay pagos registrados</p>
            )}
          </div>
        </div>
      </div>

      {/* Notificación flotante de eliminación exitosa */}
      {notificacion && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn shadow-lg">
          <span>{notificacion}</span>
          <button onClick={() => setNotificacion(null)} className="text-slate-400 hover:text-white text-xs font-bold">✕</button>
        </div>
      )}

      {/* Sección Facturas Registradas con Búsqueda y Eliminación */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Facturas Registradas en db.json ({facturas.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              Puedes buscar y eliminar comprobantes con doble verificación de seguridad permanente.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Buscar proveedor, folio o cédula..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 w-48 sm:w-64"
              />
            </div>
            <button
              type="button"
              onClick={() => onNavegar && onNavegar('facturas')}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all flex items-center gap-1"
            >
              <span>Ver Tabla Completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMostrarTodas(!mostrarTodas)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all"
            >
              {mostrarTodas ? 'Ver Recientes' : `Ver Todas (${facturas.length})`}
            </button>
          </div>
        </div>

        {/* Listado de Facturas (Más recientes primero) */}
        {(() => {
          const ordenadas = [...facturas].reverse();
          const filtradas = ordenadas.filter(f => {
            if (!filtroTexto.trim()) return true;
            const term = filtroTexto.toLowerCase().trim();
            return (
              (f.proveedor && f.proveedor.toLowerCase().includes(term)) ||
              (f.folio && f.folio.toLowerCase().includes(term)) ||
              (f.identificacion_fiscal && f.identificacion_fiscal.includes(term)) ||
              (f.id && f.id.toLowerCase().includes(term))
            );
          });
          const listado = mostrarTodas ? filtradas : filtradas.slice(0, 6);

          if (listado.length === 0) {
            return (
              <div className="p-8 text-center glass-panel rounded-2xl border border-white/5 text-slate-400 text-xs">
                {filtroTexto ? 'No se encontraron facturas con ese criterio de búsqueda.' : 'No hay facturas registradas en db.json.'}
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {listado.map((fac) => (
                <FacturaCard
                  key={fac.id}
                  factura={fac}
                  onEliminar={(f) => setFacturaAEliminar(f)}
                />
              ))}
            </div>
          );
        })()}
      </div>

      {/* Modal de Doble Verificación para Eliminar */}
      {facturaAEliminar && (
        <ModalEliminarFactura
          factura={facturaAEliminar}
          alCerrar={() => setFacturaAEliminar(null)}
          alEliminarExitoso={manejarFacturaEliminada}
        />
      )}
    </div>
  );
}
