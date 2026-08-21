import { db } from "../db/connection.js";
import { auditoriaLogs } from "../db/schema.js";

// Middleware que registra cada request autenticado en la tabla auditoria_logs
// Guarda: usuario, acción (método), entidad (ruta), ip, detalles
export function auditoriaMiddleware(req, res, next) {
  // Solo auditar si hay usuario (después de authMiddleware) y no es GET de health
  const start = Date.now();
  res.on("finish", async () => {
    try {
      if (!req.user || req.path === "/health") return;
      // Inferir acción a partir del método HTTP
      const accionMap = { GET: "view", POST: "create", PUT: "update", PATCH: "update", DELETE: "delete" };
      const accion = accionMap[req.method] || req.method;

      // Extraer entidad de la ruta: /api/cultivos/123 -> cultivos
      const partes = req.path.split("/").filter(Boolean);
      const entidad = partes[1] || partes[0] || "sistema";
      const entidadId = partes[2] || null;

      // Solo registrar acciones relevantes (no loggear GET listados excesivos si se desea, pero aquí sí para trazabilidad completa)
      await db.insert(auditoriaLogs).values({
        idUsuario: req.user.idUsuario,
        accion,
        entidad,
        entidadId: entidadId ? String(entidadId) : null,
        detalles: JSON.stringify({
          body: req.method !== "GET" ? req.body : undefined,
          query: req.query,
          status: res.statusCode,
          duracion_ms: Date.now() - start,
        }),
        ruta: req.originalUrl,
        ip: req.ip,
      });
    } catch (e) {
      console.error("Error auditoría:", e.message);
    }
  });
  next();
}
