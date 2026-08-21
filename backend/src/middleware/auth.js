import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// Middleware que verifica JWT en header Authorization: Bearer <token>
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autenticado: token requerido" });
  }
  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload; // { idUsuario, email, rol, idOrganizacion }
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

// Verifica que el rol del usuario esté en la lista permitida
export function requireRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "No autenticado" });
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: `Rol ${req.user.rol} no autorizado` });
    }
    next();
  };
}
