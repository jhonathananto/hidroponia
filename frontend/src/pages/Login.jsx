import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("admin@hidrofarm.demo");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setErr("");
    try { await login(email, password); navigate("/"); } catch (e2) { setErr(e2.response?.data?.error || "Error al iniciar sesión"); }
  };

  return (
    <div className="min-h-screen bg-[#0f5b5a] flex items-center justify-center p-4">
      <div className="bg-white rounded-[24px] overflow-hidden max-w-5xl w-full grid lg:grid-cols-2 shadow-2xl">
        <div className="p-8 lg:p-10 flex flex-col justify-center">
          <div className="w-12 h-12 rounded-2xl bg-[#0f5b5a] text-white flex items-center justify-center font-bold text-xl mb-6">H</div>
          <h1 className="text-3xl font-bold text-gray-900">Bienvenido a HidroFlow</h1>
          <p className="text-gray-500 mt-2">Monitoreo Ebb and Flow • MQTT + PostgreSQL</p>
          <form onSubmit={handle} className="mt-8 space-y-4">
            <div><label className="text-sm font-medium">Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0f5b5a]/20 outline-none" placeholder="admin@hidrofarm.demo" /></div>
            <div><label className="text-sm font-medium">Contraseña</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0f5b5a]/20 outline-none" /></div>
            {err && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{err}</p>}
            <button type="submit" className="w-full bg-[#0f5b5a] hover:bg-[#0a3d3c] text-white py-3 rounded-xl font-semibold transition">Ingresar</button>
          </form>
          <p className="text-sm text-center mt-6 text-gray-500">¿Sin organización? <Link to="/registro" className="text-[#0f5b5a] font-semibold">Registrar empresa</Link></p>
          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            Demo: admin@hidrofarm.demo / admin123 <br /> tecnico@hidrofarm.demo / tecnico123 <br /> operario@hidrofarm.demo / operario123
          </div>
        </div>
        <div className="hidden lg:block relative bg-[#e8f5f2] p-6">
          <img src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80" alt="hidroponia" className="w-full h-full object-cover rounded-2xl" />
          <div className="absolute bottom-10 left-10 right-10 bg-white/90 backdrop-blur rounded-2xl p-4">
            <p className="font-semibold text-[#0f5b5a]">Control total Ebb and Flow</p>
            <p className="text-sm text-gray-600">Sensores pH, EC, DHT22, ultrasónico • Alertas en tiempo real • Nutrición guiada</p>
          </div>
        </div>
      </div>
    </div>
  );
}
