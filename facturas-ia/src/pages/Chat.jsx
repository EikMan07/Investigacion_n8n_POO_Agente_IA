import React from 'react';
import { ChatAgente } from '../components/ChatAgente';
import { Bot, Wrench, Shield, Database, HelpCircle } from 'lucide-react';

export function Chat() {
  const herramientas = [
    { nombre: 'buscar_proveedor', desc: 'Consulta en db.json y analiza morosidad/omisión fiscal' },
    { nombre: 'registrar_proveedor', desc: 'Registra proveedores nuevos de forma atómica' },
    { nombre: 'crear_factura', desc: 'Asigna ID tipo F-2026-XXXX y estado inicial' },
    { nombre: 'validar_factura', desc: 'Comprobación determinista de sumas y duplicados' },
    { nombre: 'guardar_factura', desc: 'UPSERT persistente en db.json' },
    { nombre: 'consultar_facturas', desc: 'Filtra facturas por proveedor, estado o rango de fechas' },
    { nombre: 'programar_pago', desc: 'Calcula fecha límite y genera recordatorio en db.json' },
    { nombre: 'notificar', desc: 'Despacha alertas por Email, Slack, Telegram o WhatsApp' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-white font-['Outfit']">
          Asistente Conversacional Inteligente
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Interactúa en lenguaje natural con el Agente de n8n impulsado por herramientas POO y memoria en búfer de 10 mensajes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Principal */}
        <div className="lg:col-span-3">
          <ChatAgente />
        </div>

        {/* Panel Lateral de Herramientas y Estado */}
        <div className="space-y-5">
          <div className="glass-panel p-5 rounded-3xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-400" />
              Herramientas Conectadas ({herramientas.length})
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              El LLM no ejecuta código libre; cada acción invoca un sub-workflow atómico tipado:
            </p>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {herramientas.map((h, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
                  <span className="font-mono text-[11px] font-semibold text-emerald-300 block">
                    {h.nombre}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-snug">
                    {h.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              Seguridad Anti-Inyección
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              El System Message del agente trata el contenido de facturas como datos pasivos, neutralizando inyecciones de comandos en PDFs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
