import { Router } from "express";
import { db } from "../../db/connection.js";
import { auditoriaLogs, sesiones, usuarios } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, requireRoles } from "../../middleware/auth.js";

const router = Router();

// Solo admin y tecnico pueden ver auditoría
router.get("/logs", authMiddleware, requireRoles("admin", "tecnico"), async (req, res) => {
  let rows = await db.select().from(auditoriaLogs).orderBy(desc(auditoriaLogs.fechaCreacion)).limit(300);
  // Enriquecer con nombre de usuario
  const users = await db.select().from(usuarios);
  const map = new Map(users.map((u) => [u.idUsuario, u.nombre]));
  rows = rows.map((r) => ({ ...r, usuarioNombre: map.get(r.idUsuario) || "Sistema" }));
  if (req.query.idUsuario) rows = rows.filter((r) => String(r.idUsuario) === String(req.query.idUsuario));
  if (req.query.accion) rows = rows.filter((r) => r.accion === req.query.accion);
  res.json(rows);
});

router.get("/sesiones", authMiddleware, requireRoles("admin", "tecnico"), async (req, res) => {
  let rows = await db.select().from(sesiones).orderBy(desc(sesiones.inicio)).limit(200);
  // Calcular duración si fin existe
  rows = rows.map((s) => ({
    ...s,
    duracionSeg: s.fin ? Math.round((new Date(s.fin) - new Date(s.inicio)) / 1000) : null,
    duracionHumano: s.fin ? humanize(Math.round((new Date(s.fin) - new Date(s.inicio)) / 1000)) : "En curso",
  }));
  if (req.query.idUsuario) rows = rows.filter((r) => String(r.idUsuario) === String(req.query.idUsuario));
  res.json(rows);
});

function humanize(seg) {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  return `${h}h ${m}m ${s}s`;
}

router.get("/resumen", authMiddleware, requireRoles("admin", "tecnico"), async (req, res) => {
  const logs = await db.select().from(auditoriaLogs);
  const sesionesAll = await db.select().from(sesiones);
  res.json({
    totalLogs: logs.length,
    totalSesiones: sesionesAll.length,
    porAccion: Object.entries(logs.reduce((a, l) => ((a[l.accion] = (a[l.accion] || 0) + 1), a), {})),
    sesionesActivas: sesionesAll.filter((s) => !s.fin).length,
  });
});

export default router;
