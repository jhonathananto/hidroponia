import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// Layout con sidebar estilo Dribbble: teal oscuro + main claro
export default function Layout({ children }) {
  const { usuario, logout, hasRole } = useAuth();
  const [notis, setNotis] = useState([]);
  const [showNotis, setShowNotis] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const fetchNotis = async () => {
    try {
      const { data } = await api.get("/alertas/notificaciones/mias");
      setNotis(data.filter((n) => !n.leida).slice(0, 10));
    } catch {}
  };
  useEffect(() => { fetchNotis(); const id = setInterval(fetchNotis, 15000); return () => clearInterval(id); }, []);

  const menu = [
    { to: "/", icon: "◉", label: "Dashboard", roles: [] },
    { to: "/cultivos", icon: "🌱", label: "Cultivos", roles: [] },
    { to: "/sensores", icon: "📡", label: "Sensores", roles: [] },
    { to: "/nutrientes", icon: "🧪", label: "Nutrientes", roles: [] },
    { to: "/alertas", icon: "⚠️", label: "Alertas", badge: notis.length, roles: [] },
    { to: "/auditoria", icon: "📋", label: "Auditoría", roles: ["admin", "tecnico"] },
    { to: "/usuarios", icon: "👥", label: "Usuarios", roles: ["admin"] },
    { to: "/config", icon: "⚙️", label: "Configuración", roles: ["admin", "tecnico"] },
  ];

  const filteredMenu = menu.filter((m) => !m.roles.length || hasRole(...m.roles));

  return (
    <div className="min-h-screen bg-[#eef4f3] flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-[240px] bg-[#0f5b5a] text-white flex-col shrink-0">
        <div className="p-5 flex items-center gap-3 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold">H</div>
          <div><p className="font-bold leading-none">HidroFlow</p><p className="text-xs opacity-60">Ebb and Flow</p></div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredMenu.map((m) => (
            <NavLink key={m.to} to={m.to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${isActive ? "bg-white text-[#0f5b5a] font-semibold" : "hover:bg-white/10 text-white/90"}`}>
              <span className="w-6 text-center">{m.icon}</span>{m.label}
              {m.badge > 0 && <span className="ml-auto bg-amber-400 text-black text-xs px-2 py-0.5 rounded-full font-bold">{m.badge}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">{usuario?.nombre?.[0] || "U"}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{usuario?.nombre}</p><p className="text-xs opacity-60 capitalize">{usuario?.rol}</p></div>
          </div>
          <button onClick={() => { logout(); navigate("/login"); }} className="mt-3 w-full text-xs bg-white/10 hover:bg-white/20 py-2 rounded-lg">Cerrar sesión</button>
        </div>
      </aside>

      {/* Mobile header + drawer */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg bg-[#0f5b5a] text-white">☰</button>
          <span className="font-bold text-[#0f5b5a]">HidroFlow</span>
          <button onClick={() => setShowNotis(!showNotis)} className="relative p-2">🔔{notis.length > 0 && <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">{notis.length}</span>}</button>
        </header>
        {mobileOpen && (
          <div className="lg:hidden bg-[#0f5b5a] text-white p-3 space-y-1">
            {filteredMenu.map((m) => (
              <NavLink key={m.to} to={m.to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `block px-3 py-2 rounded-lg ${isActive ? "bg-white text-[#0f5b5a]" : ""}`}>{m.icon} {m.label}</NavLink>
            ))}
          </div>
        )}

        {/* Topbar desktop */}
        <div className="hidden lg:flex bg-white border-b px-6 py-3 items-center gap-4">
          <div className="flex-1 relative max-w-md">
            <input placeholder="Buscar cultivo, sensor..." className="w-full bg-gray-100 rounded-full pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0f5b5a]/20" />
            <span className="absolute left-3 top-2.5 text-gray-400">⌕</span>
          </div>
          <button onClick={() => setShowNotis(!showNotis)} className="relative p-2.5 bg-gray-100 rounded-full">🔔{notis.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center animate-pulse">{notis.length}</span>}</button>
          <div className="flex items-center gap-2">
            <img src={`https://i.pravatar.cc/100?u=${usuario?.email}`} alt="avatar" className="w-8 h-8 rounded-full" />
            <span className="text-sm font-medium">{usuario?.nombre}</span>
          </div>
        </div>

        {/* Notificaciones dropdown */}
        {showNotis && (
          <div className="absolute right-4 top-16 lg:top-16 w-[90vw] max-w-sm bg-white rounded-2xl shadow-xl border z-50 overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center"><p className="font-semibold">Notificaciones</p><button onClick={() => setShowNotis(false)} className="text-gray-400">✕</button></div>
            <div className="max-h-80 overflow-y-auto">
              {notis.length === 0 ? <p className="p-6 text-center text-gray-500 text-sm">Sin notificaciones pendientes</p> :
                notis.map((n) => (
                  <div key={n.idNotificacion} className="p-3 border-b hover:bg-gray-50">
                    <p className="text-sm font-medium">{n.titulo}</p><p className="text-xs text-gray-600">{n.mensaje}</p><p className="text-[11px] text-gray-400">{new Date(n.fechaCreacion).toLocaleString()}</p>
                  </div>
                ))}
            </div>
            <button onClick={async () => { await api.put("/alertas/notificaciones/leer-todas"); fetchNotis(); }} className="w-full py-2 text-sm text-[#0f5b5a] font-medium hover:bg-gray-50">Marcar todas como leídas</button>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
