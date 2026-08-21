import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const s = localStorage.getItem("usuario");
    return s ? JSON.parse(s) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      setToken(data.token);
      setUsuario(data.usuario);
      return data.usuario;
    } finally { setLoading(false); }
  };

  const registroOrg = async (payload) => {
    const { data } = await api.post("/auth/registro-organizacion", payload);
    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario", JSON.stringify(data.usuario));
    setToken(data.token);
    setUsuario(data.usuario);
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setToken(null);
    setUsuario(null);
  };

  // Verificar token al cargar
  useEffect(() => {
    if (token && !usuario) {
      api.get("/auth/me").then((r) => {
        setUsuario(r.data);
        localStorage.setItem("usuario", JSON.stringify(r.data));
      }).catch(() => logout());
    }
  }, []);

  const hasRole = (...roles) => !roles.length || (usuario && roles.includes(usuario.rol));

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout, registroOrg, hasRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
