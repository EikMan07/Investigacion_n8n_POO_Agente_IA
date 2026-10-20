import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Terminal, ChevronRight, Layers, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { enviarAlAgente } from '../api/n8nClient';
import { Factura } from '../models/Factura';
import { FacturaCard } from './FacturaCard';
import { ModalEliminarFactura } from './ModalEliminarFactura';

export function ChatAgente() {
  const [mensajes, setMensajes] = useState([
    {
      id: 'msg-init',
      remitente: 'bot',
      texto: 'Hola, soy el Asistente Orquestador de Facturas para PyMEs. Puedo consultar saldos, verificar la situación fiscal de tus proveedores en db.json y procesar comprobantes con validación determinista. ¿En qué te ayudo hoy?',
      tiempo: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pasos: []
    }
  ]);
  const [inputTexto, setInputTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [pasosModal, setPasosModal] = useState(null);
  const [facturaAEliminar, setFacturaAEliminar] = useState(null);
  const scrollRef = useRef(null);

  const manejarFacturaEliminada = (facturaEliminada) => {
    setMensajes((prev) =>
      prev.map((msg) => {
        if (!msg.facturas) return msg;
        return {
          ...msg,
          facturas: msg.facturas.filter((f) => f.id !== facturaEliminada.id)
        };
      })
    );
    setFacturaAEliminar(null);
  };

  const sugerencias = [
    '¿Cuánto debo en total a Papelería López?',
    'Muéstrame las facturas que vencen esta semana',
    'Verifica si el proveedor con cédula 3-101-998877 está moroso u omiso',
    'Programa el pago de la factura F-2026-0001 y envía recordatorio por correo'
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes, cargando]);

  const enviarMensaje = async (textoAEnviar) => {
    const texto = textoAEnviar || inputTexto;
    if (!texto.trim() || cargando) return;

    const mensajeUsuario = {
      id: `usr-${Date.now()}`,
      remitente: 'usuario',
      texto: texto.trim(),
      tiempo: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMensajes((prev) => [...prev, mensajeUsuario]);
    setInputTexto('');
    setCargando(true);

    try {
      const res = await enviarAlAgente({
        accion: 'consultar',
        mensaje: texto.trim(),
        sessionId: 'SES-CHAT-PERMANENTE'
      });

      const facturasRaw = Array.isArray(res.data?.facturas_filtradas)
        ? res.data.facturas_filtradas
        : (Array.isArray(res.data?.facturas)
          ? res.data.facturas
          : (Array.isArray(res.data?.facturas_resultado)
            ? res.data.facturas_resultado
            : (res.data?.factura ? [res.data.factura] : [])));

      const facturasFiltradas = facturasRaw
        .filter(f => f && Number(f.total) > 0 && f.proveedor && f.proveedor !== 'Proveedor' && f.identificacion_fiscal !== 'N/A')
        .map(f => new Factura(f));

      const mensajeBot = {
        id: `bot-${Date.now()}`,
        remitente: 'bot',
        texto: res.data?.mensaje || 'He procesado tu consulta sobre la base de datos.',
        tiempo: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pasos: res.pasos || [],
        facturas: facturasFiltradas,
        alertas: res.data?.alertas_fiscales || []
      };

      setMensajes((prev) => [...prev, mensajeBot]);
    } catch (err) {
      setMensajes((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          remitente: 'bot',
          texto: `Hubo un inconveniente al consultar el agente: ${err.message}`,
          tiempo: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          error: true
        }
      ]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col h-[700px] glass-panel rounded-3xl overflow-hidden border border-white/10 relative">
      {/* Cabecera del Chat */}
      <div className="p-4 bg-slate-900/90 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Bot className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-['Outfit']">
              Agente Orquestador n8n
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Tools Agent • Buffer Memory (10 turnos) • Persistencia en db.json
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-mono">
            session_id: SES-CHAT-PERMANENTE
          </span>
        </div>
      </div>

      {/* Sugerencias Rápidas */}
      <div className="px-4 py-2.5 bg-slate-950/40 border-b border-white/5 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Sugerencias:
        </span>
        {sugerencias.map((sug, i) => (
          <button
            key={i}
            onClick={() => enviarMensaje(sug)}
            className="px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white whitespace-nowrap text-[11px] transition-colors"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Ventana de Mensajes */}
      <div ref={scrollRef} className="flex-1 p-5 overflow-y-auto space-y-4">
        {mensajes.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${m.remitente === 'usuario' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                m.remitente === 'usuario'
                  ? 'bg-blue-600 text-white'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              }`}
            >
              {m.remitente === 'usuario' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`max-w-[80%] space-y-2`}>
              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  m.remitente === 'usuario'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-900/90 border border-white/5 text-slate-200 rounded-tl-none'
                }`}
              >
                <p className="whitespace-pre-line">{m.texto}</p>

                {/* Si hubo alertas fiscales */}
                {m.alertas && m.alertas.length > 0 && (
                  <div className="mt-3 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] space-y-1">
                    <span className="font-semibold block">⚠️ Alertas detectadas:</span>
                    {m.alertas.map((a, i) => <p key={i}>• {a}</p>)}
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5 text-[10px] text-slate-400">
                  <span>{m.tiempo}</span>
                  {m.pasos && m.pasos.length > 0 && (
                    <button
                      onClick={() => setPasosModal(m.pasos)}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono text-[10px]"
                    >
                      <Terminal className="w-3 h-3" /> Ver ciclo ReAct ({m.pasos.length} pasos)
                    </button>
                  )}
                </div>
              </div>

              {/* Si hay facturas asociadas devueltas en la búsqueda */}
              {m.facturas && m.facturas.length > 0 && (
                <div className="grid grid-cols-1 gap-2 pt-1">
                  {m.facturas.map((fac) => (
                    <FacturaCard
                      key={fac.id}
                      factura={fac}
                      onEliminar={(f) => setFacturaAEliminar(f)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {cargando && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-slate-900/90 border border-white/5 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Consultando herramientas y verificando en db.json...
            </div>
          </div>
        )}
      </div>

      {/* Input de Enviar Mensaje */}
      <form
        onSubmit={(e) => { e.preventDefault(); enviarMensaje(); }}
        className="p-4 bg-slate-900/90 border-t border-white/5 flex items-center gap-3"
      >
        <input
          type="text"
          value={inputTexto}
          onChange={(e) => setInputTexto(e.target.value)}
          placeholder="Escribe tu consulta o instrucción (ej: ¿Cuánto debo a Papelería López?)..."
          className="flex-1 glass-input px-4 py-3 rounded-xl text-xs"
          disabled={cargando}
        />
        <button
          type="submit"
          disabled={cargando || !inputTexto.trim()}
          className="p-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Modal Inspector de Pasos Intermedios ReAct */}
      {pasosModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-3xl p-6 border border-emerald-500/30 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-white font-['Outfit']">
                  Trazabilidad del Ciclo ReAct (Razonamiento y Herramientas n8n)
                </h4>
              </div>
              <button
                onClick={() => setPasosModal(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800"
              >
                Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {pasosModal.map((paso, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5" />
                      Tool: {paso.tool || paso.action?.tool || 'Paso'}
                    </span>
                    <span className="text-[10px] text-slate-500">{paso.tiempo || `Paso #${idx + 1}`}</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{paso.descripcion || paso.action?.log}</p>
                  {paso.resultado && (
                    <pre className="p-2 rounded bg-black/40 text-[10px] font-mono text-slate-400 overflow-x-auto">
                      {JSON.stringify(paso.resultado, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
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
