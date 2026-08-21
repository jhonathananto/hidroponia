import { useEffect, useState } from "react";
import api from "../services/api";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function Sensores() {
  const [cultivos, setCultivos] = useState([]);
  const [sensores, setSensores] = useState([]);
  const [idCultivo, setIdCultivo] = useState("");
  const [series, setSeries] = useState([]);
  const [tipoSel, setTipoSel] = useState("pH");
  const [form, setForm] = useState({ tipoSensor: "pH", nombreSensor: "", unidad: "pH", topicMqtt: "" });
  const [sim, setSim] = useState({ valor: "", tipoSensor: "pH" });

  const loadCultivos = () => api.get("/cultivos").then((r) => { setCultivos(r.data); if (r.data[0] && !idCultivo) setIdCultivo(String(r.data[0].idCultivo)); });
  const loadSensores = () => {
    const q = idCultivo ? `?idCultivo=${idCultivo}` : "";
    api.get(`/sensores${q}`).then((r) => setSensores(r.data));
  };
  const loadSeries = () => {
    if (!idCultivo) return;
    api.get(`/mediciones/series?idCultivo=${idCultivo}&tipoSensor=${tipoSel}`).then((r) => setSeries(r.data.slice(-50))).catch(() => setSeries([]));
  };

  useEffect(() => { loadCultivos(); }, []);
  useEffect(() => { if (idCultivo) { loadSensores(); loadSeries(); } }, [idCultivo, tipoSel]);

  const crearSensor = async (e) => {
    e.preventDefault();
    await api.post("/sensores", { ...form, idCultivo: parseInt(idCultivo) });
    setForm({ tipoSensor: "pH", nombreSensor: "", unidad: "pH", topicMqtt: "" });
    loadSensores();
  };

  const simular = async () => {
    const topic = `hidroponia/${idCultivo}/${sim.tipoSensor.toLowerCase()}`;
    await api.post("/mediciones/ingest", { topic, valor: parseFloat(sim.valor) });
    loadSeries();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0f5b5a]">Sensores MQTT</h1>
      <p className="text-sm text-gray-500">Arduino UNO WiFi Rev2 publica en <code>hidroponia/{"{idCultivo}"}/{"{tipo}"}</code> (pH, ec, dht_temp, dht_hum, ultrasonico). Tipos: pH, EC, DHT22_TEMP, DHT22_HUM, ULTRASONICO.</p>

      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-2xl">
        <select value={idCultivo} onChange={(e) => setIdCultivo(e.target.value)} className="border rounded-xl px-3 py-2">
          {cultivos.map((c) => <option key={c.idCultivo} value={c.idCultivo}>{c.nombre}</option>)}
        </select>
        <select value={tipoSel} onChange={(e) => setTipoSel(e.target.value)} className="border rounded-xl px-3 py-2">
          <option value="pH">pH</option><option value="EC">EC</option><option value="DHT22_TEMP">Temperatura</option><option value="DHT22_HUM">Humedad</option><option value="ULTRASONICO">Ultrasónico</option>
        </select>
        <button onClick={loadSeries} className="bg-gray-100 px-4 py-2 rounded-xl text-sm">Actualizar</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Serie temporal: {tipoSel}</h3>
          {series.length ? <Line data={{ labels: series.map((s) => new Date(s.marcaTemporal).toLocaleTimeString()), datasets: [{ label: tipoSel, data: series.map((s) => parseFloat(s.valor)), borderColor: "#0f5b5a", tension: 0.3, pointRadius: 2 }] }} options={{ responsive: true, plugins: { legend: { display: false } } }} /> : <p className="text-sm text-gray-400">Sin datos. Usa simular medición.</p>}
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4">
            <h4 className="font-semibold text-sm mb-3">Simular medición (sin broker)</h4>
            <div className="flex gap-2">
              <select value={sim.tipoSensor} onChange={(e) => setSim({ ...sim, tipoSensor: e.target.value })} className="border rounded-xl px-2 py-2 text-sm"><option>pH</option><option>EC</option><option>dht_temp</option><option>dht_hum</option><option>ultrasonico</option></select>
              <input placeholder="valor" type="number" step="0.01" value={sim.valor} onChange={(e) => setSim({ ...sim, valor: e.target.value })} className="border rounded-xl px-3 py-2 flex-1" />
              <button onClick={simular} className="bg-[#0f5b5a] text-white px-4 rounded-xl text-sm">Enviar</button>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Envía a POST /api/mediciones/ingest que simula MQTT.</p>
          </div>

          <div className="bg-white rounded-2xl p-4">
            <h4 className="font-semibold text-sm mb-2">Sensores del cultivo</h4>
            {sensores.map((s) => (
              <div key={s.idSensor} className="flex justify-between items-center py-2 border-b last:border-0">
                <div><p className="text-sm font-medium">{s.nombreSensor || s.tipoSensor}</p><p className="text-xs text-gray-500">{s.tipoSensor} • {s.unidad} • {s.topicMqtt}</p></div>
                <span className={`text-xs px-2 py-1 rounded-full ${s.activo ? "bg-green-100 text-green-700" : "bg-gray-100"}`}>{s.activo ? "Activo" : "Inactivo"}</span>
              </div>
            ))}
            {sensores.length === 0 && <p className="text-xs text-gray-400">Sin sensores (se crean auto al llegar MQTT)</p>}
          </div>

          <form onSubmit={crearSensor} className="bg-white rounded-2xl p-4 space-y-2">
            <h4 className="font-semibold text-sm">Crear sensor manual</h4>
            <select value={form.tipoSensor} onChange={(e) => setForm({ ...form, tipoSensor: e.target.value, unidad: e.target.value === "pH" ? "pH" : e.target.value === "EC" ? "mS/cm" : e.target.value.includes("TEMP") ? "°C" : e.target.value.includes("HUM") ? "%" : "cm" })} className="w-full border rounded-xl px-3 py-2 text-sm">
              <option value="pH">pH</option><option value="EC">EC</option><option value="DHT22_TEMP">DHT22_TEMP</option><option value="DHT22_HUM">DHT22_HUM</option><option value="ULTRASONICO">ULTRASONICO</option>
            </select>
            <input placeholder="Nombre" value={form.nombreSensor} onChange={(e) => setForm({ ...form, nombreSensor: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
            <input placeholder="Topic MQTT (ej: hidroponia/1/ph)" value={form.topicMqtt} onChange={(e) => setForm({ ...form, topicMqtt: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
            <button type="submit" className="w-full bg-[#0f5b5a] text-white py-2 rounded-xl text-sm">Crear</button>
          </form>
        </div>
      </div>
    </div>
  );
}
