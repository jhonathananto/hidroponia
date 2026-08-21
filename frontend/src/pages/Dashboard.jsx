import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function Dashboard() {
  const [cultivos, setCultivos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [resumen, setResumen] = useState([]);
  const [seriesPh, setSeriesPh] = useState([]);
  const [seriesEc, setSeriesEc] = useState([]);
  const [alertas, setAlertas] = useState([]);

  useEffect(() => {
    api.get("/cultivos").then((r) => { setCultivos(r.data); if (r.data[0]) setSelected(r.data[0]); });
    api.get("/alertas").then((r) => setAlertas(r.data.slice(0, 5)));
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get(`/mediciones/resumen?idCultivo=${selected.idCultivo}`).then((r) => setResumen(r.data)).catch(() => setResumen([]));
    api.get(`/mediciones/series?idCultivo=${selected.idCultivo}&tipoSensor=pH`).then((r) => setSeriesPh(r.data.slice(-20))).catch(() => {});
    api.get(`/mediciones/series?idCultivo=${selected.idCultivo}&tipoSensor=EC`).then((r) => setSeriesEc(r.data.slice(-20))).catch(() => {});
  }, [selected]);

  const valorDe = (tipo) => {
    const f = resumen.find((r) => r.sensor.tipoSensor.toLowerCase().includes(tipo.toLowerCase()));
    return f?.ultimaMedicion ? parseFloat(f.ultimaMedicion.valor).toFixed(2) : "--";
  };

  const chartData = (label, data, color) => ({
    labels: data.map((d) => new Date(d.marcaTemporal).toLocaleTimeString().slice(0, 5)),
    datasets: [{ label, data: data.map((d) => parseFloat(d.valor)), borderColor: color, backgroundColor: color + "20", fill: true, tension: 0.4, pointRadius: 0 }],
  });

  if (!selected) return <div className="p-8 text-center text-gray-500">Cargando cultivos... <Link to="/cultivos" className="text-[#0f5b5a] underline">Crear cultivo</Link></div>;

  // Cálculo de fase según días transcurridos (seed 0-15, vegetative 16-35, bloom 36-50, final resto)
  const dias = selected.fechaInicio ? Math.floor((Date.now() - new Date(selected.fechaInicio)) / 86400000) : 0;
  const fase = dias <= 15 ? "Seed Phase" : dias <= 35 ? "Vegetation" : dias <= 50 ? "Bloom" : "Final";

  return (
    <div className="space-y-6">
      {/* Selector cultivo */}
      <div className="flex flex-wrap gap-2 items-center">
        <h1 className="text-xl font-bold text-[#0f5b5a] flex-1">Dashboard • Ebb and Flow</h1>
        <select value={selected.idCultivo} onChange={(e) => setSelected(cultivos.find((c) => String(c.idCultivo) === e.target.value))} className="border rounded-xl px-4 py-2 bg-white">
          {cultivos.map((c) => <option key={c.idCultivo} value={c.idCultivo}>{c.nombre} ({c.tipoCultivo})</option>)}
        </select>
      </div>

      {/* Grid principal estilo Dribbble */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Card circular temperatura + gráfico barras */}
        <div className="bg-[#0f5b5a] rounded-[24px] p-6 text-white relative overflow-hidden">
          <div className="flex justify-between items-start">
            <p className="text-sm opacity-80">Mustard Plant Area • {selected.nombre}</p>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs">● {selected.estado}</span>
          </div>
          {/* Gauge circular simulado */}
          <div className="flex justify-center my-6">
            <div className="relative w-44 h-44 rounded-full border-[8px] border-white/10 flex items-center justify-center">
              <div className="absolute inset-2 rounded-full border-[6px] border-amber-400 border-t-transparent rotate-[-30deg]" style={{ borderColor: "#fbbf24 transparent #fbbf24 #fbbf24" }}></div>
              <div className="text-center">
                <p className="text-4xl font-bold">{valorDe("DHT22_TEMP") !== "--" ? valorDe("DHT22_TEMP") : "26"}<span className="text-lg align-super">°C</span></p>
                <p className="text-xs opacity-60">ROOM TEMP</p>
              </div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] opacity-60 mb-2"><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span></div>
          <div className="h-20 flex items-end gap-1">
            {Array.from({ length: 20 }).map((_, i) => <div key={i} className={`flex-1 rounded-t ${i === 15 ? "bg-amber-400" : "bg-white/60"}`} style={{ height: `${20 + Math.random() * 60}%` }} />)}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-white rounded-2xl p-3 text-center text-gray-900"><p className="text-xs">💧</p><p className="font-bold">{valorDe("DHT22_HUM")}%</p><p className="text-[10px] text-gray-500">Humidity</p></div>
            <div className="bg-white rounded-2xl p-3 text-center text-gray-900"><p className="text-xs">🧪</p><p className="font-bold">{valorDe("pH")}</p><p className="text-[10px] text-gray-500">Water pH</p></div>
            <div className="bg-white rounded-2xl p-3 text-center text-gray-900"><p className="text-xs">⚡</p><p className="font-bold">{valorDe("EC")}</p><p className="text-[10px] text-gray-500">Water EC</p></div>
          </div>
        </div>

        {/* Imagen + timeline fases */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[24px] overflow-hidden">
            <img src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80" alt="cultivo" className="w-full h-64 object-cover" />
            <div className="p-6">
              <div className="flex justify-between text-[11px] text-gray-400 mb-2"><span>0 days</span><span>21 days</span><span>88 days</span></div>
              <div className="h-1 bg-gray-200 rounded-full relative"><div className="absolute h-1 bg-[#0f5b5a] rounded-full" style={{ width: `${Math.min(100, (dias / 88) * 100)}%` }} /><div className="absolute w-3 h-3 bg-amber-400 rounded-full -top-1" style={{ left: `${Math.min(100, (dias / 88) * 100)}%` }} /></div>
              <div className="grid grid-cols-4 gap-2 mt-6 text-center">
                {[
                  { label: "Seed Phase", days: "16 Days", active: fase === "Seed Phase" },
                  { label: "Vegetation", days: "38 Days", active: fase === "Vegetation" },
                  { label: "Bloom", days: "34 Days", active: fase === "Bloom" },
                  { label: "Final", days: "16 Days", active: fase === "Final" },
                ].map((f) => (
                  <div key={f.label} className={`p-3 rounded-2xl ${f.active ? "bg-[#0f5b5a] text-white" : "bg-gray-50"}`}>
                    <p className="text-xs font-semibold">{f.label}</p><p className="text-[10px] opacity-60">{f.days}</p>
                    {f.active && <p className="text-[10px] mt-1">● Día {dias}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos temporales */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6">
          <h3 className="font-semibold mb-4">pH • serie temporal</h3>
          {seriesPh.length ? <Line data={chartData("pH", seriesPh, "#0f5b5a")} options={{ responsive: true, plugins: { legend: { display: false } } }} /> : <p className="text-sm text-gray-400">Sin datos aún. Envía mediciones vía MQTT o ingesta manual.</p>}
        </div>
        <div className="bg-white rounded-2xl p-6">
          <h3 className="font-semibold mb-4">EC (Conductividad) • mS/cm</h3>
          {seriesEc.length ? <Line data={chartData("EC", seriesEc, "#f59e0b")} options={{ responsive: true, plugins: { legend: { display: false } } }} /> : <p className="text-sm text-gray-400">Sin datos de conductividad.</p>}
        </div>
      </div>

      {/* Alertas recientes + nivel ultrasónico */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4"><h3 className="font-semibold">Alertas recientes</h3><Link to="/alertas" className="text-sm text-[#0f5b5a]">Ver todas →</Link></div>
          {alertas.length === 0 ? <p className="text-sm text-gray-400">Sin alertas</p> : alertas.map((a) => (
            <div key={a.idAlerta} className={`p-3 rounded-xl mb-2 flex justify-between items-center ${a.severidad === "critica" ? "bg-red-50 border border-red-200" : a.severidad === "alta" ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}>
              <div><p className="text-sm font-medium">{a.mensaje}</p><p className="text-xs text-gray-500">{new Date(a.fechaCreacion).toLocaleString()} • {a.severidad}</p></div>
              <span className={`text-xs px-2 py-1 rounded-full ${a.resuelta ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{a.resuelta ? "Resuelta" : "Activa"}</span>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-6 text-center">
          <h3 className="font-semibold">Nivel agua</h3><p className="text-xs text-gray-500">Sensor ultrasónico</p>
          <div className="mt-4 mx-auto w-24 h-40 border-2 border-[#0f5b5a] rounded-2xl relative overflow-hidden bg-gray-50">
            <div className="absolute bottom-0 w-full bg-[#0f5b5a] transition-all" style={{ height: `${30 + (parseFloat(valorDe("ULTRASONICO")) || 15) * 2}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold drop-shadow">{valorDe("ULTRASONICO")} cm</span>
          </div>
          <p className="text-xs mt-2 text-gray-500">Ebb and Flow • Inundación {selected.cicloInundacionMin} min / Drenaje {selected.cicloDrenajeMin} min</p>
        </div>
      </div>
    </div>
  );
}
