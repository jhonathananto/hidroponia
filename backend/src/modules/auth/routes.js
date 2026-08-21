import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "../../db/connection.js";
import { usuarios, organizaciones, sesiones } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { env } from "../../config/env.js";

const router = Router();

// Esquema de validación para registro de organización + admin inicial
const registroSchema = z.object({
  organizacion: z.object({
    nombre: z.string().min(2),
    ruc: z.string().regex(/^\d{13}$/, "RUC debe tener 13 dígitos").optional().or(z.literal("")),
    email: z.string().email().optional(),
  }),
  admin: z.object({
    nombre: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/registro-organizacion - Crea organización y usuario admin
router.post("/registro-organizacion", async (req, res) => {
  try {
    const parsed = registroSchema.parse(req.body);
    // Verificar email no exista
    const existente = await db.select().from(usuarios).where(eq(usuarios.email, parsed.admin.email));
    if (existente.length) return res.status(409).json({ error: "Email ya registrado" });

    const [org] = await db.insert(organizaciones).values({ nombre: parsed.organizacion.nombre, ruc: parsed.organizacion.ruc || null, email: parsed.organizacion.email }).returning();
    const hash = await bcrypt.hash(parsed.admin.password, 10);
    const [user] = await db
      .insert(usuarios)
      .values({
        idOrganizacion: org.idOrganizacion,
        nombre: parsed.admin.nombre,
        email: parsed.admin.email,
        passwordHash: hash,
        rol: "admin",
      })
      .returning();

    const token = jwt.sign({ idUsuario: user.idUsuario, email: user.email, rol: user.rol, idOrganizacion: user.idOrganizacion }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
    res.status(201).json({ organizacion: org, usuario: { ...user, passwordHash: undefined }, token });
  } catch (e) {
    if (e.name === "ZodError") return res.status(400).json({ error: e.errors });
    console.error(e);
    res.status(500).json({ error: "Error al registrar organización" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const [user] = await db.select().from(usuarios).where(eq(usuarios.email, email));
    if (!user || !user.activo) return res.status(401).json({ error: "Credenciales inválidas" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = jwt.sign(
      { idUsuario: user.idUsuario, email: user.email, rol: user.rol, idOrganizacion: user.idOrganizacion },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    // Registrar sesión
    await db.insert(sesiones).values({ idUsuario: user.idUsuario, inicio: new Date(), ip: req.ip, userAgent: req.headers["user-agent"] });
    await db.update(usuarios).set({ ultimoAcceso: new Date() }).where(eq(usuarios.idUsuario, user.idUsuario));

    res.json({ token, usuario: { idUsuario: user.idUsuario, nombre: user.nombre, email: user.email, rol: user.rol, idOrganizacion: user.idOrganizacion } });
  } catch (e) {
    if (e.name === "ZodError") return res.status(400).json({ error: e.errors });
    console.error(e);
    res.status(500).json({ error: "Error en login" });
  }
});

// POST /api/auth/logout - cierra sesión (marca fin)
router.post("/logout", async (req, res) => {
  // El token se invalida en cliente; aquí solo registramos fin de sesión si viene auth
  try {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      const payload = jwt.verify(header.split(" ")[1], env.JWT_SECRET);
      // Buscar última sesión abierta
      const ses = await db.select().from(sesiones).where(eq(sesiones.idUsuario, payload.idUsuario));
      const abierta = ses.filter((s) => !s.fin).pop();
      if (abierta) {
        await db.update(sesiones).set({ fin: new Date() }).where(eq(sesiones.idSesion, abierta.idSesion));
      }
    }
  } catch {}
  res.json({ ok: true });
});

// GET /api/auth/me - perfil actual
router.get("/me", async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "No autenticado" });
  try {
    const payload = jwt.verify(header.split(" ")[1], env.JWT_SECRET);
    const [user] = await db.select().from(usuarios).where(eq(usuarios.idUsuario, payload.idUsuario));
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ idUsuario: user.idUsuario, nombre: user.nombre, email: user.email, rol: user.rol, idOrganizacion: user.idOrganizacion });
  } catch (e) {
    res.status(401).json({ error: "Token inválido" });
  }
});

export default router;
