import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "operario" });
  const { hasRole } = useAuth();
  if (!hasRole("admin")) return <p className="p-8 text-center text-red-600">Solo admin puede gestionar usuarios.</p>;

  const load = () => api.get("/usuarios").then((r) => setUsuarios(r.data));
  useEffect(() => { load(); }, []);

  const crear = async (e) => { e.preventDefault(); await api.post("/usuarios", form); setForm({ nombre: "", email: "", password: "", rol: "operario" }); load(); };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-[#0f5b5a]">Gestión de Usuarios y Roles</h1>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
        Roles: <b>admin</b> (todo), <b>tecnico</b> (cultivos, sensores, auditoría), <b>operario</b> (operar y aplicar nutrientes), <b>visor</b> (solo lectura dashboard).
      </div>

      <form onSubmit={crear} className="bg-white rounded-2xl p-6 grid md:grid-cols-5 gap-3">
        <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="border rounded-xl px-3 py-2" required />
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border rounded-xl px-3 py-2" required />
        <input placeholder="Contraseña" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="border rounded-xl px-3 py-2" required />
        <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} className="border rounded-xl px-3 py-2"><option value="admin">admin</option><option value="tecnico">tecnico</option><option value="operario">operario</option><option value="visor">visor</option></select>
        <button type="submit" className="bg-[#0f5b5a] text-white rounded-xl font-semibold">Crear usuario</button>
      </form>

      <div className="bg-white rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr className="text-xs text-gray-500"><th className="text-left p-3">Usuario</th><th>Email</th><th>Rol</th><th>Activo</th><th>Último acceso</th><th></th></tr></thead>
          <tbody>{usuarios.map((u) => <tr key={u.idUsuario} className="border-b"><td className="p-3 font-medium">{u.nombre}</td><td className="p-3 text-xs">{u.email}</td><td className="p-3"><span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{u.rol}</span></td><td className="p-3">{u.activo ? "✓" : "✕"}</td><td className="p-3 text-xs">{u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString() : "—"}</td><td className="p-3"><button onClick={async () => { if (confirm("Eliminar?")) { await api.delete(`/usuarios/${u.idUsuario}`); load(); } }} className="text-xs text-red-600">Eliminar</button></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
