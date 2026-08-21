import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Dashboard from "./pages/Dashboard";
import Cultivos from "./pages/Cultivos";
import Sensores from "./pages/Sensores";
import Nutrientes from "./pages/Nutrientes";
import Alertas from "./pages/Alertas";
import Auditoria from "./pages/Auditoria";
import Usuarios from "./pages/Usuarios";
import Config from "./pages/Config";

function Protected({ children, roles }) {
  const { usuario, token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario?.rol)) return <div className="p-8 text-center">No autorizado (rol: {usuario?.rol}) <a href="/" className="text-[#0f5b5a] underline">Volver</a></div>;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/cultivos" element={<Protected><Cultivos /></Protected>} />
          <Route path="/sensores" element={<Protected><Sensores /></Protected>} />
          <Route path="/nutrientes" element={<Protected><Nutrientes /></Protected>} />
          <Route path="/alertas" element={<Protected><Alertas /></Protected>} />
          <Route path="/auditoria" element={<Protected roles={["admin", "tecnico"]}><Auditoria /></Protected>} />
          <Route path="/usuarios" element={<Protected roles={["admin"]}><Usuarios /></Protected>} />
          <Route path="/config" element={<Protected><Config /></Protected>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
