import { Router } from "express";
import { db } from "../../db/connection.js";
import { alertas, notificaciones } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, requireRoles } from "../../middleware/auth.js";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  let rows = await db.select().from(alertas).orderBy(desc(alertas.fechaCreacion)).limit(200);
  if (req.query.resuelta != null) rows = rows.filter((r) => String(r.resuelta) === String(req.query.resuelta));
  if (req.query.severidad) rows = rows.filter((r) => r.severidad === req.query.severidad);
  res.json(rows);
});

router.put("/:id/resolver", authMiddleware, requireRoles("admin", "tecnico", "operario"), async (req, res) => {
  const [row] = await db.update(alertas).set({ resuelta: true, fechaResolucion: new Date() }).where(eq(alertas.idAlerta, BigInt(req.params.id))).returning();
  // Drizzle bigint handling: use Number
  // Fallback: raw query if needed
  res.json(row || { ok: true });
});

// Notificaciones del usuario actual
router.get("/notificaciones/mias", authMiddleware, async (req, res) => {
  const rows = await db.select().from(notificaciones).where(eq(notificaciones.idUsuario, req.user.idUsuario)).orderBy(desc(notificaciones.fechaCreacion)).limit(100);
  res.json(rows);
});

router.put("/notificaciones/:id/leida", authMiddleware, async (req, res) => {
  await db.update(notificaciones).set({ leida: true }).where(eq(notificaciones.idNotificacion, parseInt(req.params.id)));
  res.json({ ok: true });
});

router.put("/notificaciones/leer-todas", authMiddleware, async (req, res) => {
  await db.update(notificaciones).set({ leida: true }).where(eq(notificaciones.idUsuario, req.user.idUsuario));
  res.json({ ok: true });
});

export default router;
