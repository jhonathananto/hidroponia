import { useEffect, useState } from "react";
import api from "../services/api";

export default function Nutrientes() {
  const [nutrientes, setNutrientes] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const [idCultivo, setIdCultivo] = useState("");
  const [programas, setProgramas] = useState([]);
  const [aplicaciones, setAplicaciones] = useState([]);
  const [formNut, setFormNut] = useState({ nombre: "", tipo: "macro", composicion: "" });
  const [formProg, setFormProg] = useState({ idNutriente: "", fase: "vegetative", diaInicio: 0, diaFin: 15, dosis: "1.4", frecuenciaDias: 1 });

  const loadAll = async () => {
    const [n, c] = await Promise.all([api.get("/nutrientes"), api.get("/cultivos")]);
    setNutrientes(n.data); setCultivos(c.data); if (c.data[0] && !idCultivo) setIdCultivo(String(c.data[0].idCultivo));
  };
  const loadProg = async () => {
    if (!idCultivo) return;
    const [p, a] = await Promise.all([api.get(`/nutrientes/programas/todos?idCultivo=${idCultivo}`), api.get(`/nutrientes/aplicaciones?idCultivo=${idCultivo}`)]);
    setProgramas(p.data); setAplicaciones(a.data);
  };
  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (idCultivo) loadProg(); }, [idCultivo]);

  const crearNut = async (e) => { e.preventDefault(); await api.post("/nutrientes", formNut); setFormNut({ nombre: "", tipo: "macro", composicion: "" }); loadAll(); };
  const crearProg = async (e) => {
    e.preventDefault();
    await api.post("/nutrientes/programas", { ...formProg, idNutriente: parseInt(formProg.idNutriente), idCultivo: parseInt(idCultivo), diaInicio: parseInt(formProg.diaInicio), diaFin: parseInt(formProg.diaFin), frecuenciaDias: parseInt(formProg.frecuenciaDias) });
    loadProg();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0f5b5a]">Nutrientes y Programas de Alimentación</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6">
          <h3 className="font-semibold mb-3">Catálogo de nutrientes</h3>
          {nutrientes.map((n) => <div key={n.idNutriente} className="border rounded-xl p-3 mb-2"><p className="font-medium text-sm">{n.nombre}</p><p className="text-xs text-gray-500">{n.tipo} • {n.composicion} • Stock: {n.stockActual} {n.unidadMedida}</p></div>)}
          <form onSubmit={crearNut} className="mt-4 space-y-2 border-t pt-4">
            <input placeholder="Nombre nutriente *" value={formNut.nombre} onChange={(e) => setFormNut({ ...formNut, nombre: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" required />
            <select value={formNut.tipo} onChange={(e) => setFormNut({ ...formNut, tipo: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm"><option value="macro">Macro</option><option value="micro">Micro</option><option value="corrector">Corrector pH</option><option value="estimulante">Estimulante</option></select>
            <input placeholder="Composición N-P-K" value={formNut.composicion} onChange={(e) => setFormNut({ ...formNut, composicion: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
            <button type="submit" className="w-full bg-[#0f5b5a] text-white py-2 rounded-xl text-sm">Agregar nutriente</button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-6">
            <div className="flex gap-3 items-center mb-4">
              <select value={idCultivo} onChange={(e) => setIdCultivo(e.target.value)} className="border rounded-xl px-3 py-2">{cultivos.map((c) => <option key={c.idCultivo} value={c.idCultivo}>{c.nombre}</option>)}</select>
              <span className="text-sm text-gray-500">Calendario nutricional</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-400 border-b"><th className="text-left py-2">Fase</th><th>Días</th><th>Dosis</th><th>Frecuencia</th><th>Nutriente</th></tr></thead>
                <tbody>{programas.map((p) => <tr key={p.idPrograma} className="border-b"><td className="py-2 font-medium">{p.fase}</td><td>{p.diaInicio}-{p.diaFin}</td><td>{p.dosis} {nutrientes.find((n) => n.idNutriente === p.idNutriente)?.unidadMedida}</td><td>cada {p.frecuenciaDias} día(s)</td><td className="text-xs">{nutrientes.find((n) => n.idNutriente === p.idNutriente)?.nombre}</td></tr>)}</tbody>
              </table>
              {programas.length === 0 && <p className="text-sm text-gray-400 py-4">Sin programas. Crea uno abajo o usa plantilla.</p>}
            </div>

            <form onSubmit={crearProg} className="mt-6 grid md:grid-cols-6 gap-2 bg-gray-50 p-4 rounded-xl">
              <select value={formProg.idNutriente} onChange={(e) => setFormProg({ ...formProg, idNutriente: e.target.value })} className="border rounded-xl px-2 py-2 text-sm" required><option value="">Nutriente</option>{nutrientes.map((n) => <option key={n.idNutriente} value={n.idNutriente}>{n.nombre}</option>)}</select>
              <select value={formProg.fase} onChange={(e) => setFormProg({ ...formProg, fase: e.target.value })} className="border rounded-xl px-2 py-2 text-sm"><option value="seed">Seed</option><option value="vegetative">Vegetative</option><option value="bloom">Bloom</option><option value="final">Final</option></select>
              <input type="number" placeholder="Día inicio" value={formProg.diaInicio} onChange={(e) => setFormProg({ ...formProg, diaInicio: e.target.value })} className="border rounded-xl px-2 py-2 text-sm" />
              <input type="number" placeholder="Día fin" value={formProg.diaFin} onChange={(e) => setFormProg({ ...formProg, diaFin: e.target.value })} className="border rounded-xl px-2 py-2 text-sm" />
              <input placeholder="Dosis" value={formProg.dosis} onChange={(e) => setFormProg({ ...formProg, dosis: e.target.value })} className="border rounded-xl px-2 py-2 text-sm" />
              <button type="submit" className="bg-[#0f5b5a] text-white rounded-xl text-sm">Crear guía</button>
            </form>
          </div>

          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-semibold mb-3">Aplicaciones programadas (histórico)</h3>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-400 border-b"><th className="text-left py-2">Fecha</th><th>Nutriente</th><th>Dosis</th><th>Estado</th><th>Acción</th></tr></thead>
                <tbody>{aplicaciones.slice(0, 50).map((a) => (
                  <tr key={a.idAplicacion} className="border-b"><td className="py-2">{a.fechaProgramada}</td><td className="text-xs">{nutrientes.find((n) => n.idNutriente === a.idNutriente)?.nombre}</td><td>{a.dosisAplicada}</td><td><span className={`text-xs px-2 py-1 rounded-full ${a.estado === "aplicada" ? "bg-green-100 text-green-700" : a.estado === "omitida" ? "bg-gray-100" : "bg-amber-100 text-amber-700"}`}>{a.estado}</span></td><td>{a.estado === "pendiente" && <><button onClick={async () => { await api.put(`/nutrientes/aplicaciones/${a.idAplicacion}/aplicar`); loadProg(); }} className="text-xs bg-green-600 text-white px-2 py-1 rounded">Aplicar</button><button onClick={async () => { await api.put(`/nutrientes/aplicaciones/${a.idAplicacion}/omitir`); loadProg(); }} className="ml-1 text-xs bg-gray-200 px-2 py-1 rounded">Omitir</button></>}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
