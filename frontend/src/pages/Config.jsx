import { useEffect, useState } from "react";
import api from "../services/api";

export default function Config() {
  const [org, setOrg] = useState(null);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [formUbi, setFormUbi] = useState({ nombre: "", descripcion: "" });

  useEffect(() => {
    api.get("/organizaciones/me").then((r) => setOrg(r.data));
    api.get("/organizaciones/ubicaciones").then((r) => setUbicaciones(r.data));
  }, []);

  const crearUbi = async (e) => { e.preventDefault(); await api.post("/organizaciones/ubicaciones", formUbi); setFormUbi({ nombre: "", descripcion: "" }); const r = await api.get("/organizaciones/ubicaciones"); setUbicaciones(r.data); };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-[#0f5b5a]">Configuración</h1>
      {org && (
        <div className="bg-white rounded-2xl p-6">
          <h3 className="font-semibold mb-3">Organización</h3>
          <p className="text-sm"><b>{org.nombre}</b> • RUC: {org.ruc || "—"}</p>
          <p className="text-xs text-gray-500">{org.email} • {org.direccion}</p>
        </div>
      )}
      <div className="bg-white rounded-2xl p-6">
        <h3 className="font-semibold mb-3">Ubicaciones / Invernaderos (Ebb and Flow)</h3>
        {ubicaciones.map((u) => <div key={u.idUbicacion} className="border rounded-xl p-3 mb-2 flex justify-between"><div><p className="font-medium text-sm">{u.nombre}</p><p className="text-xs text-gray-500">{u.descripcion} • {u.tipoSistema} • Bandejas: {u.capacidadBandejas}</p></div><button onClick={async () => { await api.delete(`/organizaciones/ubicaciones/${u.idUbicacion}`); setUbicaciones(ubicaciones.filter((x) => x.idUbicacion !== u.idUbicacion)); }} className="text-xs text-red-600">Eliminar</button></div>)}
        <form onSubmit={crearUbi} className="mt-4 flex gap-2">
          <input placeholder="Nombre invernadero" value={formUbi.nombre} onChange={(e) => setFormUbi({ ...formUbi, nombre: e.target.value })} className="flex-1 border rounded-xl px-3 py-2 text-sm" required />
          <input placeholder="Descripción" value={formUbi.descripcion} onChange={(e) => setFormUbi({ ...formUbi, descripcion: e.target.value })} className="flex-1 border rounded-xl px-3 py-2 text-sm" />
          <button type="submit" className="bg-[#0f5b5a] text-white px-4 rounded-xl text-sm">Agregar</button>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6">
        <h3 className="font-semibold">MQTT • Arduino UNO WiFi Rev2</h3>
        <p className="text-xs text-gray-600 mt-2">Tópicos: <code className="bg-gray-100 px-1 rounded">hidroponia/{"{idCultivo}"}/ph</code>, <code className="bg-gray-100 px-1 rounded">ec</code>, <code className="bg-gray-100 px-1 rounded">dht_temp</code>, <code className="bg-gray-100 px-1 rounded">dht_hum</code>, <code className="bg-gray-100 px-1 rounded">ultrasonico</code>. Payload JSON: <code className="bg-gray-100 px-1 rounded">{"{"}"valor": 6.2{"}"}</code>. Broker configurable vía <code>MQTT_BROKER_URL</code> en backend .env.</p>
        <p className="text-xs text-gray-500 mt-2">Ejemplo Arduino: <code>client.publish(&quot;hidroponia/1/ph&quot;, &quot;&#123;&quot;valor&quot;:6.1&#125;&quot;);</code></p>
      </div>
    </div>
  );
}
