import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Registro() {
  const [form, setForm] = useState({ orgNombre: "", orgRuc: "", adminNombre: "", adminEmail: "", adminPass: "" });
  const [err, setErr] = useState("");
  const { registroOrg } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await registroOrg({
        organizacion: { nombre: form.orgNombre, ruc: form.orgRuc },
        admin: { nombre: form.adminNombre, email: form.adminEmail, password: form.adminPass },
      });
      navigate("/");
    } catch (e2) { setErr(e2.response?.data?.error || JSON.stringify(e2.response?.data) || "Error al registrar"); }
  };

  return (
    <div className="min-h-screen bg-[#eef4f3] flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl p-8 max-w-lg w-full shadow">
        <h1 className="text-2xl font-bold text-[#0f5b5a]">Registrar Organización</h1>
        <p className="text-sm text-gray-500 mb-6">Crea tu empresa y tu usuario administrador</p>
        {err && <p className="bg-red-50 text-red-700 p-3 rounded-xl text-sm mb-4">{String(err)}</p>}
        <div className="space-y-3">
          <input placeholder="Nombre organización *" value={form.orgNombre} onChange={(e) => setForm({ ...form, orgNombre: e.target.value })} className="w-full border rounded-xl px-4 py-3" required />
          <input placeholder="RUC (opcional, 13 dígitos)" value={form.orgRuc} onChange={(e) => setForm({ ...form, orgRuc: e.target.value })} maxLength={13} pattern="\d{13}" className="w-full border rounded-xl px-4 py-3" />
          <hr className="my-2" />
          <input placeholder="Tu nombre *" value={form.adminNombre} onChange={(e) => setForm({ ...form, adminNombre: e.target.value })} className="w-full border rounded-xl px-4 py-3" required />
          <input placeholder="Email admin *" type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} className="w-full border rounded-xl px-4 py-3" required />
          <input placeholder="Contraseña (min 6)" type="password" value={form.adminPass} onChange={(e) => setForm({ ...form, adminPass: e.target.value })} className="w-full border rounded-xl px-4 py-3" required />
        </div>
        <button type="submit" className="mt-6 w-full bg-[#0f5b5a] text-white py-3 rounded-xl font-semibold">Crear organización</button>
        <p className="text-center text-sm mt-4"><Link to="/login" className="text-[#0f5b5a] font-semibold">Volver al login</Link></p>
      </form>
    </div>
  );
}
