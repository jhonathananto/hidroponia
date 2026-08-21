import { useEffect, useState } from "react";
import api from "../services/api";

export default function Auditoria() {
  const [logs, setLogs] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [tab, setTab] = useState("logs");

  useEffect(() => {
    api.get("/auditoria/logs").then((r) => setLogs(r.data)).catch(() => {});
    api.get("/auditoria/sesiones").then((r) => setSesiones(r.data)).catch(() => {});
    api.get("/auditoria/resumen").then((r) => setResumen(r.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0f5b5a]">Auditoría y Trazabilidad</h1>
      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4"><p className="text-xs text-gray-500">Total eventos</p><p className="text-2xl font-bold">{resumen.totalLogs}</p></div>
          <div className="bg-white rounded-2xl p-4"><p className="text-xs text-gray-500">Sesiones</p><p className="text-2xl font-bold">{resumen.totalSesiones}</p></div>
          <div className="bg-white rounded-2xl p-4"><p className="text-xs text-gray-500">Sesiones activas</p><p className="text-2xl font-bold text-amber-600">{resumen.sesionesActivas}</p></div>
          <div className="bg-white rounded-2xl p-4"><p className="text-xs text-gray-500">Por acción</p><p className="text-xs">{resumen.porAccion.map(([k, v]) => `${k}:${v}`).join(" • ")}</p></div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setTab("logs")} className={`px-4 py-2 rounded-xl text-sm ${tab === "logs" ? "bg-[#0f5b5a] text-white" : "bg-white"}`}>Logs de acciones</button>
        <button onClick={() => setTab("sesiones")} className={`px-4 py-2 rounded-xl text-sm ${tab === "sesiones" ? "bg-[#0f5b5a] text-white" : "bg-white"}`}>Sesiones</button>
      </div>

      {tab === "logs" ? (
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0"><tr className="text-xs text-gray-500"><th className="text-left p-3">Fecha</th><th className="text-left p-3">Usuario</th><th>Acción</th><th>Entidad</th><th className="text-left p-3">Ruta</th><th>IP</th></tr></thead>
              <tbody>{logs.map((l) => <tr key={l.idLog} className="border-b hover:bg-gray-50"><td className="p-3 text-xs">{new Date(l.fechaCreacion).toLocaleString()}</td><td className="p-3 text-xs">{l.usuarioNombre} <span className="text-gray-400">#{l.idUsuario}</span></td><td className="p-3 text-center"><span className={`text-xs px-2 py-1 rounded-full ${l.accion === "view" ? "bg-gray-100" : l.accion === "create" ? "bg-green-100 text-green-700" : l.accion === "delete" ? "bg-red-100 text-red-700" : "bg-amber-100"}`}>{l.accion}</span></td><td className="p-3 text-xs">{l.entidad} {l.entidadId}</td><td className="p-3 text-xs truncate max-w-[200px]">{l.ruta}</td><td className="p-3 text-xs">{l.ip}</td></tr>)}</tbody>
            </table>
            {logs.length === 0 && <p className="p-8 text-center text-gray-400 text-sm">Sin logs aún. Navega por la app y se registrarán automáticamente.</p>}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr className="text-xs text-gray-500"><th className="text-left p-3">Usuario</th><th>Inicio</th><th>Fin</th><th>Duración</th><th>IP</th></tr></thead>
            <tbody>{sesiones.map((s) => <tr key={s.idSesion} className="border-b"><td className="p-3">#{s.idUsuario}</td><td className="p-3 text-xs">{new Date(s.inicio).toLocaleString()}</td><td className="p-3 text-xs">{s.fin ? new Date(s.fin).toLocaleString() : "En curso"}</td><td className="p-3 text-xs">{s.duracionHumano}</td><td className="p-3 text-xs">{s.ip}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
