import React, { useState, useEffect } from 'react';
import { FacturaCard } from '../components/FacturaCard';
import { ModalEliminarFactura } from '../components/ModalEliminarFactura';
import { consultarFacturas } from '../api/n8nClient';
import { FileText, Search, RefreshCw, Filter, LayoutGrid, Table as TableIcon, Trash2, ArrowUpDown, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

export function Facturas({ onNavegar }) {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas'); // 'todas' | 'validada' | 'pendiente' | 'pendiente_aprobacion' | 'pagada'
  const [orden, setOrden] = useState('recientes'); // 'recientes' | 'antiguas' | 'mayor_monto' | 'menor_monto'
  const [vista, setVista] = useState('grid'); // 'grid' | 'tabla'
  const [facturaAEliminar, setFacturaAEliminar] = useState(null);
  const [notificacion, setNotificacion] = useState(null);

  const cargarFacturas = async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const data = await consultarFacturas();
      setFacturas(data);
    } catch (err) {
      console.error('Error al cargar facturas:', err);
    } finally {
      if (!silencioso) setCargando(false);
    }
  };

  // Carga inicial y sondeo periódico en vivo (cada 3 segundos) para reflejar cambios en db.json
  useEffect(() => {
    cargarFacturas(false);
    const interval = setInterval(() => {
      cargarFacturas(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const manejarFacturaEliminada = (facturaEliminada) => {
    setFacturas(prev => prev.filter(f => f.id !== facturaEliminada.id && f.folio !== facturaEliminada.folio));
    setNotificacion(`✅ Factura ${facturaEliminada.folio || facturaEliminada.id} eliminada permanentemente de db.json`);
    setTimeout(() => setNotificacion(null), 5000);
    cargarFacturas(true);
  };

  // Filtrado y ordenamiento de facturas
  const facturasFiltradas = facturas.filter(f => {
    // Filtro por texto
    if (filtroTexto.trim()) {
      const term = filtroTexto.toLowerCase().trim();
      const matchProv = f.proveedor && f.proveedor.toLowerCase().includes(term);
      const matchFolio = f.folio && f.folio.toLowerCase().includes(term);
      const matchCed = f.identificacion_fiscal && f.identificacion_fiscal.includes(term);
      const matchId = f.id && f.id.toLowerCase().includes(term);
      if (!matchProv && !matchFolio && !matchCed && !matchId) return false;
    }

    // Filtro por estado
    if (filtroEstado === 'validada') return f.estado === 'validada';
    if (filtroEstado === 'pendiente') return f.estado === 'pendiente' && !f.requiereAtencionHumana;
    if (filtroEstado === 'pendiente_aprobacion') return f.requiereAtencionHumana && f.estado !== 'pagada';
    if (filtroEstado === 'pagada') return f.estado === 'pagada';

    return true;
  });

  // Ordenar
  const facturasOrdenadas = [...facturasFiltradas].sort((a, b) => {
    if (orden === 'recientes') {
      return (b.creado_en || b.fecha || '').localeCompare(a.creado_en || a.fecha || '');
    }
    if (orden === 'antiguas') {
      return (a.creado_en || a.fecha || '').localeCompare(b.creado_en || b.fecha || '');
    }
    if (orden === 'mayor_monto') {
      return (Number(b.total) || 0) - (Number(a.total) || 0);
    }
    if (orden === 'menor_monto') {
      return (Number(a.total) || 0) - (Number(b.total) || 0);
    }
    return 0;
  });

  const conteos = {
    todas: facturas.length,
    validada: facturas.filter(f => f.estado === 'validada').length,
    pendiente: facturas.filter(f => f.estado === 'pendiente' && !f.requiereAtencionHumana).length,
    pendiente_aprobacion: facturas.filter(f => f.requiereAtencionHumana && f.estado !== 'pagada').length,
    pagada: facturas.filter(f => f.estado === 'pagada').length
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white font-['Outfit']">
              Gestor Integral de Facturas
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
              {facturas.length} en db.json
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span>Sincronización en tiempo real con <code className="text-emerald-400">backend-db/db.json</code></span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              En vivo
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => cargarFacturas(false)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all flex items-center gap-1.5"
            title="Refrescar lista desde db.json"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
          {onNavegar && (
            <button
              onClick={() => onNavegar('subir')}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Nueva Factura
            </button>
          )}
        </div>
      </div>

      {/* Notificación flotante de eliminación exitosa */}
      {notificacion && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn shadow-lg">
          <span>{notificacion}</span>
          <button onClick={() => setNotificacion(null)} className="text-slate-400 hover:text-white text-xs font-bold">✕</button>
        </div>
      )}

      {/* Barra de Filtros por Estado */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-3">
        {[
          { id: 'todas', label: 'Todas', count: conteos.todas },
          { id: 'validada', label: 'Validadas', count: conteos.validada },
          { id: 'pendiente', label: 'Pendientes', count: conteos.pendiente },
          { id: 'pendiente_aprobacion', label: 'Requieren Aprobación', count: conteos.pendiente_aprobacion },
          { id: 'pagada', label: 'Pagadas', count: conteos.pagada }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFiltroEstado(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filtroEstado === tab.id
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 border border-white/5'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              filtroEstado === tab.id ? 'bg-slate-950/40 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Controles de Búsqueda, Orden y Vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-2xl border border-white/5">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            placeholder="Buscar por proveedor, folio (ej: A-8831) o cédula..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Ordenar */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-700">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="recientes" className="bg-slate-900">Más recientes primero</option>
              <option value="antiguas" className="bg-slate-900">Más antiguas primero</option>
              <option value="mayor_monto" className="bg-slate-900">Mayor monto</option>
              <option value="menor_monto" className="bg-slate-900">Menor monto</option>
            </select>
          </div>

          {/* Toggle Vista */}
          <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-700">
            <button
              onClick={() => setVista('grid')}
              className={`p-1.5 rounded-lg transition-colors ${vista === 'grid' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
              title="Vista de cuadrícula"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setVista('tabla')}
              className={`p-1.5 rounded-lg transition-colors ${vista === 'tabla' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
              title="Vista de tabla"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Renderizado de Facturas */}
      {cargando && facturas.length === 0 ? (
        <div className="p-16 text-center glass-panel rounded-3xl border border-white/5 space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Consultando facturas en db.json...</p>
        </div>
      ) : facturasOrdenadas.length === 0 ? (
        <div className="p-16 text-center glass-panel rounded-3xl border border-white/5 space-y-3">
          <FileText className="w-8 h-8 text-slate-500 mx-auto" />
          <h4 className="text-sm font-bold text-white font-['Outfit']">
            {filtroTexto ? 'Sin coincidencias con la búsqueda' : 'No hay facturas con este filtro'}
          </h4>
          <p className="text-xs text-slate-400">
            {filtroTexto ? `No se encontraron comprobantes que coincidan con "${filtroTexto}".` : 'No hay registros en db.json para el estado seleccionado.'}
          </p>
        </div>
      ) : vista === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {facturasOrdenadas.map((fac) => (
            <FacturaCard
              key={fac.id || fac.folio}
              factura={fac}
              onEliminar={(f) => setFacturaAEliminar(f)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/5 font-semibold">
                <tr>
                  <th className="py-3 px-4">Folio / ID</th>
                  <th className="py-3 px-4">Proveedor</th>
                  <th className="py-3 px-4">Cédula</th>
                  <th className="py-3 px-4">Emisión</th>
                  <th className="py-3 px-4">Vencimiento</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {facturasOrdenadas.map((f) => (
                  <tr key={f.id || f.folio} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {f.folio}
                      <span className="block text-[10px] text-slate-500 font-normal">{f.id}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {f.proveedor}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {f.identificacion_fiscal}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {f.fecha}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {f.vence}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400 font-['Outfit'] text-sm">
                      {f.totalFormateado || `₡${Number(f.total || 0).toLocaleString('es-CR')} CRC`}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${f.estadoBadgeColor}`}>
                        {f.estadoEtiqueta || f.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setFacturaAEliminar(f)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                        title="Eliminar factura de db.json"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Doble Verificación para Eliminar Factura */}
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
