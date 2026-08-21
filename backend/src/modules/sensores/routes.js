import { Router } from "express";
import { db } from "../../db/connection.js";
import { sensores, umbrales } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, requireRoles } from "../../middleware/auth.js";
const router = Router();

// Sensores
router.get("/", authMiddleware, async (req, res) => {
  let rows = await db.select().from(sensores).orderBy(desc(sensores.fechaCreacion));
  if (req.query.idCultivo) rows = rows.filter((r) => String(r.idCultivo) === String(req.query.idCultivo));
  if (req.query.tipoSensor) rows = rows.filter((r) => r.tipoSensor === req.query.tipoSensor);
  res.json(rows);
});

router.post("/", authMiddleware, requireRoles("admin", "tecnico"), async (req, res) => {
  const [row] = await db.insert(sensores).values({
    idCultivo: req.body.idCultivo,
    tipoSensor: req.body.tipoSensor,
    nombreSensor: req.body.nombreSensor,
    fabricante: req.body.fabricante,
    modelo: req.body.modelo,
    topicMqtt: req.body.topicMqtt,
    rangoMinimo: req.body.rangoMinimo,
    rangoMaximo: req.body.rangoMaximo,
    unidad: req.body.unidad,
    activo: req.body.activo ?? true,
    estado: req.body.estado || "ok",
  }).returning();
  res.status(201).json(row);
});

router.put("/:id", authMiddleware, requireRoles("admin", "tecnico"), async (req, res) => {
  const [row] = await db.update(sensores).set(req.body).where(eq(sensores.idSensor, parseInt(req.params.id))).returning();
  res.json(row);
});

router.delete("/:id", authMiddleware, requireRoles("admin"), async (req, res) => {
  await db.delete(sensores).where(eq(sensores.idSensor, parseInt(req.params.id)));
  res.json({ ok: true });
});

// Umbrales
router.get("/umbrales/todos", authMiddleware, async (req, res) => {
  let rows = await db.select().from(umbrales);
  if (req.query.idCultivo) rows = rows.filter((r) => String(r.idCultivo) === String(req.query.idCultivo));
  res.json(rows);
});

router.post("/umbrales", authMiddleware, requireRoles("admin", "tecnico"), async (req, res) => {
  const [row] = await db.insert(umbrales).values({
    idSensor: req.body.idSensor || null,
    tipoSensor: req.body.tipoSensor,
    idCultivo: req.body.idCultivo || null,
    valorMin: req.body.valorMin,
    valorMax: req.body.valorMax,
    severidad: req.body.severidad || "media",
    mensajeTemplate: req.body.mensajeTemplate,
    activo: true,
  }).returning();
  res.status(201).json(row);
});

router.put("/umbrales/:id", authMiddleware, requireRoles("admin", "tecnico"), async (req, res) => {
  const [row] = await db.update(umbrales).set(req.body).where(eq(umbrales.idUmbral, parseInt(req.params.id))).returning();
  res.json(row);
});

router.delete("/umbrales/:id", authMiddleware, requireRoles("admin"), async (req, res) => {
  await db.delete(umbrales).where(eq(umbrales.idUmbral, parseInt(req.params.id)));
  res.json({ ok: true });
});

export default router;
