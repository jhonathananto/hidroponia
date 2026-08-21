import { Router } from "express";
import { db } from "../../db/connection.js";
import { cultivos } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, requireRoles } from "../../middleware/auth.js";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  let rows = await db.select().from(cultivos).orderBy(desc(cultivos.fechaCreacion));
  // Filtrar por organización del usuario
  rows = rows.filter((c) => c.idOrganizacion === req.user.idOrganizacion || !c.idOrganizacion);
  if (req.query.search) {
    const s = req.query.search.toLowerCase();
    rows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(s));
  }
  res.json(rows);
});

router.get("/:id", authMiddleware, async (req, res) => {
  const [row] = await db.select().from(cultivos).where(eq(cultivos.idCultivo, parseInt(req.params.id)));
  if (!row) return res.status(404).json({ error: "Cultivo no encontrado" });
  res.json(row);
});

router.post("/", authMiddleware, requireRoles("admin", "tecnico"), async (req, res) => {
  const [row] = await db.insert(cultivos).values({
    idOrganizacion: req.user.idOrganizacion,
    idUbicacion: req.body.idUbicacion || null,
    nombre: req.body.nombre,
    tipoCultivo: req.body.tipoCultivo,
    variedad: req.body.variedad,
    fechaInicio: req.body.fechaInicio || new Date().toISOString().slice(0,10),
    fechaCosechaEsperada: req.body.fechaCosechaEsperada,
    estado: req.body.estado || "activo",
    sustrato: req.body.sustrato,
    densidadSiembra: req.body.densidadSiembra,
    notas: req.body.notas,
    cicloInundacionMin: req.body.cicloInundacionMin,
    cicloDrenajeMin: req.body.cicloDrenajeMin,
  }).returning();
  res.status(201).json(row);
});

router.put("/:id", authMiddleware, requireRoles("admin", "tecnico"), async (req, res) => {
  const [row] = await db.update(cultivos).set(req.body).where(eq(cultivos.idCultivo, parseInt(req.params.id))).returning();
  if (!row) return res.status(404).json({ error: "No encontrado" });
  res.json(row);
});

router.delete("/:id", authMiddleware, requireRoles("admin"), async (req, res) => {
  await db.delete(cultivos).where(eq(cultivos.idCultivo, parseInt(req.params.id)));
  res.json({ ok: true });
});

export default router;
