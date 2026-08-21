import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Cultivos() {
  const [cultivos, setCultivos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [form, setForm] = useState({ nombre: "", tipoCultivo: "lechuga", fechaInicio: new Date().toISOString().slice(0, 10), fechaCosechaEsperada: "", idUbicacion: "" });
  const { hasRole } = useAuth();

  const load = () => api.get("/cultivos").then((r) => setCultivos(r.data));
  useEffect(() => { load(); api.get("/organizaciones/ubicaciones").then((r) => setUbicaciones(r.data)).catch(() => {}); }, []);

  const crear = async (e) => {
    e.preventDefault();
    await api.post("/cultivos", { ...form, idUbicacion: form.idUbicacion ? parseInt(form.idUbicacion) : null });
    setForm({ nombre: "", tipoCultivo: "lechuga", fechaInicio: new Date().toISOString().slice(0, 10), fechaCosechaEsperada: "", idUbicacion: "" });
    load();
  };

  const eliminar = async (id) => { if (!confirm("¿Eliminar cultivo?")) return; await api.delete(`/cultivos/${id}`); load(); };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0f5b5a]">Gestión de Cultivos Ebb and Flow</h1>

      {hasRole("admin", "tecnico") && (
        <form onSubmit={crear} className="bg-white rounded-2xl p-6 grid md:grid-cols-5 gap-3">
          <input placeholder="Nombre (ej: Mostaza Bandeja A)" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="border rounded-xl px-3 py-2" required />
          <select value={form.tipoCultivo} onChange={(e) => setForm({ ...form, tipoCultivo: e.target.value })} className="border rounded-xl px-3 py-2">
            <option value="lechuga">Lechuga</option><option value="mostaza">Mostaza</option><option value="albahaca">Albahaca</option><option value="espinaca">Espinaca</option><option value="tomate">Tomate</option>
          </select>
          <input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} className="border rounded-xl px-3 py-2" />
          <select value={form.idUbicacion} onChange={(e) => setForm({ ...form, idUbicacion: e.target.value })} className="border rounded-xl px-3 py-2">
            <option value="">Sin ubicación</option>{ubicaciones.map((u) => <option key={u.idUbicacion} value={u.idUbicacion}>{u.nombre}</option>)}
          </select>
          <button type="submit" className="bg-[#0f5b5a] text-white rounded-xl py-2 font-semibold">Crear cultivo</button>
        </form>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cultivos.map((c) => (
          <div key={c.idCultivo} className="bg-white rounded-2xl p-5 border hover:shadow-lg transition">
            <div className="flex justify-between"><span className={`text-xs px-2 py-1 rounded-full ${c.estado === "activo" ? "bg-green-100 text-green-700" : "bg-gray-100"}`}>{c.estado}</span><span className="text-xs text-gray-400">#{c.idCultivo}</span></div>
            <h3 className="font-bold mt-2">{c.nombre}</h3>
            <p className="text-sm text-gray-500">{c.tipoCultivo} • {c.variedad || "—"}</p>
            <p className="text-xs text-gray-400 mt-2">Inicio: {c.fechaInicio} • Cosecha: {c.fechaCosechaEsperada || "—"}</p>
            <p className="text-xs mt-1">Inundación {c.cicloInundacionMin}′ / Drenaje {c.cicloDrenajeMin}′</p>
            <div className="flex gap-2 mt-4">
              <a href={`/cultivo/${c.idCultivo}`} className="flex-1 text-center bg-[#0f5b5a] text-white text-sm py-2 rounded-xl">Ver detalle</a>
              {hasRole("admin") && <button onClick={() => eliminar(c.idCultivo)} className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-sm">Eliminar</button>}
            </div>
          </div>
        ))}
      </div>
      {cultivos.length === 0 && <p className="text-center text-gray-400 py-10">Sin cultivos. Crea el primero arriba.</p>}
    </div>
  );
}
