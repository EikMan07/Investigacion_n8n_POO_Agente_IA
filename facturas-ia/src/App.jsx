import React, { useState, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { Facturas } from './pages/Facturas';
import { Subir } from './pages/Subir';
import { Chat } from './pages/Chat';
import { Aprobaciones } from './pages/Aprobaciones';
import { consultarDashboardStats } from './api/n8nClient';
import { LayoutDashboard, FileText, UploadCloud, MessageSquare, CheckSquare, Layers, ShieldCheck, Database, GitBranch } from 'lucide-react';

export function App() {
  const [paginaActual, setPaginaActual] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [backendConectado, setBackendConectado] = useState(false);

  useEffect(() => {
    const verificarSalud = async () => {
      try {
        const s = await consultarDashboardStats();
        if (s) {
          setStats(s);
          setBackendConectado(true);
        }
      } catch (e) {
        setBackendConectado(false);
      }
    };
    verificarSalud();
    const interval = setInterval(verificarSalud, 3000);
    return () => clearInterval(interval);
  }, [paginaActual]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icono: LayoutDashboard },
    {
      id: 'facturas',
      label: 'Facturas',
      icono: FileText,
      badge: stats?.ultimasFacturas?.length !== undefined ? stats?.ultimasFacturas?.length : null
    },
    { id: 'subir', label: 'Subir Comprobante', icono: UploadCloud },
    { id: 'chat', label: 'Chat con Agente IA', icono: MessageSquare },
    {
      id: 'aprobaciones',
      label: 'Aprobaciones',
      icono: CheckSquare,
      badge: stats?.pendientesAprobacionCantidad > 0 ? stats.pendientesAprobacionCantidad : null
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100">
      {/* Barra de Navegación Superior */}
      <header className="sticky top-0 z-40 bg-[#0b0f19]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo y Título */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-[#0d1424] rounded-[14px] flex items-center justify-center">
                <Layers className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight font-['Outfit'] flex items-center gap-2">
                Facturas IA <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">POO n8n</span>
              </h1>
              <p className="text-[10px] text-slate-400">
                Asistente Inteligente de Facturas PyME • db.json
              </p>
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/80 border border-white/5">
            {navItems.map((item) => {
              const Icon = item.icono;
              const activo = paginaActual === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setPaginaActual(item.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 relative ${
                    activo
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        activo ? 'bg-slate-950 text-white' : 'bg-rose-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Estado de Conexión Local */}
          <div className="hidden md:flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/5 text-[11px]">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300">db.json:</span>
              <span className={`w-2 h-2 rounded-full ${backendConectado ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
              <span className="text-slate-400 text-[10px]">{backendConectado ? 'Puerto 3001' : 'Conectando'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {paginaActual === 'dashboard' && <Dashboard onNavegar={setPaginaActual} />}
        {paginaActual === 'facturas' && <Facturas onNavegar={setPaginaActual} />}
        {paginaActual === 'subir' && <Subir onNavegar={setPaginaActual} />}
        {paginaActual === 'chat' && <Chat />}
        {paginaActual === 'aprobaciones' && <Aprobaciones />}
      </main>

      {/* Footer Informativo */}
      <footer className="border-t border-white/5 bg-slate-950/60 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            <span>Arquitectura POO en n8n: <span className="font-mono text-slate-300">WF_Factura</span>, <span className="font-mono text-slate-300">WF_Proveedor</span>, <span className="font-mono text-slate-300">WF_Pago</span>, <span className="font-mono text-slate-300">WF_Notificador</span></span>
          </div>
          <div>
            <span>Persistencia Atómica en <span className="font-mono text-emerald-400">backend-db/db.json</span> (Cero dependencias en nube)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default App;
