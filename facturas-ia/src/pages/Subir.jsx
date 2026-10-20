import React, { useState } from 'react';
import { UploadZone } from '../components/UploadZone';
import { FacturaCard } from '../components/FacturaCard';
import { ModalEliminarFactura } from '../components/ModalEliminarFactura';
import { Factura } from '../models/Factura';
import { ShieldCheck, Cpu, CheckCircle2, ArrowRight } from 'lucide-react';

export function Subir({ onNavegar }) {
  const [facturaReciente, setFacturaReciente] = useState(null);
  const [facturaAEliminar, setFacturaAEliminar] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  const manejarFacturaProcesada = (datos) => {
    if (datos) {
      setFacturaReciente(new Factura(datos));
    }
  };

  const manejarFacturaEliminada = (f) => {
    setFacturaReciente(null);
    setFacturaAEliminar(null);
    setMensajeExito(`Factura ${f.folio || f.id} eliminada permanentemente de db.json.`);
    setTimeout(() => setMensajeExito(null), 4000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-white font-['Outfit']">
          Carga y Validación Determinista de Facturas
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Sube tus facturas (PDF o imagen) o utiliza los botones de prueba para verificar el ciclo ReAct y la persistencia en <span className="font-mono text-emerald-400">db.json</span>.
        </p>
      </div>

      {/* Explicación de la Arquitectura Híbrida */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">1. La IA Propone</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              El LLM extrae datos y decide qué herramienta POO ejecutar (buscar proveedor, crear factura).
            </p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">2. El Código Valida</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              El nodo determinista verifica sumas exactas (<span className="font-mono text-[10px]">subtotal + imp == total</span>) y duplicados de folio.
            </p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">3. El Humano Aprueba</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Si el total supera 50,000 CRC o el proveedor está moroso/omiso, se retiene para autorización.
            </p>
          </div>
        </div>
      </div>

      {/* Zona de Carga */}
      <UploadZone onFacturaProcesada={manejarFacturaProcesada} />

      {/* Notificación de Éxito al Eliminar */}
      {mensajeExito && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Factura Procesada en esta sesión */}
      {facturaReciente && (
        <div className="space-y-3 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-['Outfit']">
              Comprobante Generado en db.json
            </h3>
            {facturaReciente.requiereAtencionHumana && (
              <button
                onClick={() => onNavegar('aprobaciones')}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
              >
                Ir a Bandeja de Aprobaciones <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="max-w-xl">
            <FacturaCard
              factura={facturaReciente}
              onEliminar={(f) => setFacturaAEliminar(f)}
            />
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
