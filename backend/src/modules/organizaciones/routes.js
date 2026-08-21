import { Router } from "express";
import { db } from "../../db/connection.js";
import { organizaciones, ubicaciones } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { authMiddleware, requireRoles } from "../../middleware/auth.js";
const router = Router();

// Obtener mi organización
router.get("/me", authMiddleware, async (req, res) => {
  const [org] = await db.select().from(organizaciones).where(eq(organizaciones.idOrganizacion, req.user.idOrganizacion));
  res.json(org || null);
});

router.put("/me", authMiddleware, requireRoles("admin"), async (req, res) => {
  const [upd] = await db.update(organizaciones).set(req.body).where(eq(organizaciones.idOrganizacion, req.user.idOrganizacion)).returning();
  res.json(upd);
});

// Ubicaciones (invernaderos)
router.get("/ubicaciones", authMiddleware, async (req, res) => {
  const rows = await db.select().from(ubicaciones).where(eq(ubicaciones.idOrganizacion, req.user.idOrganizacion));
  res.json(rows);
});

router.post("/ubicaciones", authMiddleware, requireRoles("admin", "tecnico"), async (req, res) => {
  const [row] = await db.insert(ubicaciones).values({ idOrganizacion: req.user.idOrganizacion, nombre: req.body.nombre, descripcion: req.body.descripcion, tipoSistema: req.body.tipoSistema || "ebb_and_flow", capacidadBandejas: req.body.capacidadBandejas }).returning();
  res.status(201).json(row);
});

router.put("/ubicaciones/:id", authMiddleware, requireRoles("admin", "tecnico"), async (req, res) => {
  const [row] = await db.update(ubicaciones).set(req.body).where(eq(ubicaciones.idUbicacion, parseInt(req.params.id))).returning();
  res.json(row);
});

router.delete("/ubicaciones/:id", authMiddleware, requireRoles("admin"), async (req, res) => {
  await db.delete(ubicaciones).where(eq(ubicaciones.idUbicacion, parseInt(req.params.id)));
  res.json({ ok: true });
});

export default router;
