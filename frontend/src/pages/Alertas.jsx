import { useEffect, useState } from "react";
import api from "../services/api";

export default function Alertas() {
  const [alertas, setAlertas] = useState([]);
  const [notis, setNotis] = useState([]);
  const [filtro, setFiltro] = useState("todas");

  const load = async () => {
    const [a, n] = await Promise.all([api.get("/alertas"), api.get("/alertas/notificaciones/mias")]);
    setAlertas(a.data); setNotis(n.data);
  };
  useEffect(() => { load(); const id = setInterval(load, 10000); return () => clearInterval(id); }, []);

  const resolver = async (id) => { await api.put(`/alertas/${id}/resolver`); load(); };

  const filtradas = filtro === "todas" ? alertas : alertas.filter((a) => String(a.resuelta) === (filtro === "resuelta" ? "true" : "false"));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0f5b5a]">Alertas y Notificaciones</h1>
      <div className="flex gap-2">
        <button onClick={() => setFiltro("todas")} className={`px-4 py-2 rounded-xl text-sm ${filtro === "todas" ? "bg-[#0f5b5a] text-white" : "bg-white"}`}>Todas ({alertas.length})</button>
        <button onClick={() => setFiltro("activa")} className={`px-4 py-2 rounded-xl text-sm ${filtro === "activa" ? "bg-amber-500 text-white" : "bg-white"}`}>Activas ({alertas.filter((a) => !a.resuelta).length})</button>
        <button onClick={() => setFiltro("resuelta")} className={`px-4 py-2 rounded-xl text-sm ${filtro === "resuelta" ? "bg-green-600 text-white" : "bg-white"}`}>Resueltas</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {filtradas.map((a) => (
            <div key={a.idAlerta} className={`bg-white rounded-2xl p-4 border-l-4 ${a.severidad === "critica" ? "border-red-500" : a.severidad === "alta" ? "border-amber-500" : a.severidad === "media" ? "border-yellow-400" : "border-gray-300"}`}>
              <div className="flex justify-between">
                <div><p className="font-medium text-sm">{a.mensaje}</p><p className="text-xs text-gray-500">Sensor #{a.idSensor} • {a.tipoAlerta} • {new Date(a.fechaCreacion).toLocaleString()}</p></div>
                <span className={`h-fit text-xs px-3 py-1 rounded-full font-bold ${a.severidad === "critica" ? "bg-red-100 text-red-700" : a.severidad === "alta" ? "bg-amber-100 text-amber-700" : "bg-gray-100"}`}>{a.severidad}</span>
              </div>
              <div className="mt-3 flex gap-2">{!a.resuelta ? <button onClick={() => resolver(a.idAlerta)} className="text-sm bg-[#0f5b5a] text-white px-4 py-1.5 rounded-xl">Marcar resuelta</button> : <span className="text-sm text-green-600">✓ Resuelta {a.fechaResolucion ? new Date(a.fechaResolucion).toLocaleString() : ""}</span>}<span className="text-xs text-gray-400 self-center">Valor: {a.valorMedido}</span></div>
            </div>
          ))}
          {filtradas.length === 0 && <p className="bg-white rounded-2xl p-8 text-center text-gray-400">Sin alertas en este filtro</p>}
        </div>
        <div className="bg-white rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Notificaciones in-app</h3>
          <p className="text-xs text-gray-500 mb-3">Se generan automáticamente al dispararse umbrales. Polling cada 10s.</p>
          {notis.slice(0, 20).map((n) => (
            <div key={n.idNotificacion} className={`p-3 rounded-xl mb-2 ${n.leida ? "bg-gray-50" : "bg-amber-50 border border-amber-200"}`}>
              <p className="text-sm font-medium">{n.titulo}</p><p className="text-xs text-gray-600">{n.mensaje}</p><p className="text-[11px] text-gray-400">{new Date(n.fechaCreacion).toLocaleString()} {n.leida ? "• leída" : "• nueva"}</p>
            </div>
          ))}
          <button onClick={async () => { await api.put("/alertas/notificaciones/leer-todas"); load(); }} className="w-full mt-3 bg-gray-100 py-2 rounded-xl text-sm">Marcar todas leídas</button>
        </div>
      </div>
    </div>
  );
}
