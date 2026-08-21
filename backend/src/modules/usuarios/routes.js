import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../../db/connection.js";
import { usuarios } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { authMiddleware, requireRoles } from "../../middleware/auth.js";

const router = Router();
const schema = z.object({
  nombre: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  rol: z.enum(["admin", "tecnico", "operario", "visor"]).default("operario"),
});

// Lista usuarios de la organización del solicitante (admin ve todos, otros solo su org)
router.get("/", authMiddleware, async (req, res) => {
  const rows = await db.select().from(usuarios);
  // Filtrar por organización si no es super admin global (aquí todos pertenecen a org)
  const filtered = rows.filter((u) => u.idOrganizacion === req.user.idOrganizacion);
  res.json(filtered.map((u) => ({ ...u, passwordHash: undefined })));
});

router.post("/", authMiddleware, requireRoles("admin"), async (req, res) => {
  try {
    const data = schema.parse(req.body);
    const existe = await db.select().from(usuarios).where(eq(usuarios.email, data.email));
    if (existe.length) return res.status(409).json({ error: "Email ya existe" });
    const hash = await bcrypt.hash(data.password || "changeme123", 10);
    const [nuevo] = await db
      .insert(usuarios)
      .values({
        idOrganizacion: req.user.idOrganizacion,
        nombre: data.nombre,
        email: data.email,
        passwordHash: hash,
        rol: data.rol,
      })
      .returning();
    res.status(201).json({ ...nuevo, passwordHash: undefined });
  } catch (e) {
    if (e.name === "ZodError") return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: e.message });
  }
});

router.put("/:id", authMiddleware, requireRoles("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = z.object({ nombre: z.string().optional(), email: z.string().email().optional(), rol: z.enum(["admin", "tecnico", "operario", "visor"]).optional(), activo: z.boolean().optional() }).parse(req.body);
    const [upd] = await db.update(usuarios).set(data).where(eq(usuarios.idUsuario, id)).returning();
    if (!upd) return res.status(404).json({ error: "No encontrado" });
    res.json({ ...upd, passwordHash: undefined });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", authMiddleware, requireRoles("admin"), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(usuarios).where(eq(usuarios.idUsuario, id));
  res.json({ ok: true });
});

export default router;
