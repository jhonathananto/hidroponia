import { Router } from "express";
import { db } from "../../db/connection.js";
import { nutrientes, programasNutricion, aplicacionesNutrientes, cultivos } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, requireRoles } from "../../middleware/auth.js";

const router = Router();

// Nutrientes catálogo
router.get("/", authMiddleware, async (req, res) => {
  let rows = await db.select().from(nutrientes).orderBy(desc(nutrientes.fechaCreacion));
  rows = rows.filter((r) => r.idOrganizacion === req.user.idOrganizacion);
  res.json(rows);
});

router.post("/", authMiddleware, requireRoles("admin", "tecnico"), async (req, res) => {
  const [row] = await db.insert(nutrientes).values({
    idOrganizacion: req.user.idOrganizacion,
    nombre: req.body.nombre,
    tipo: req.body.tipo,
    composicion: req.body.composicion,
    unidadMedida: req.body.unidadMedida || "ml/L",
    stockActual: req.body.stockActual || "0",
    stockMinimo: req.body.stockMinimo,
    costoPorUnidad: req.body.costoPorUnidad,
  }).returning();
  res.status(201).json(row);
});

router.put("/:id", authMiddleware, requireRoles("admin", "tecnico"), async (req, res) => {
  const [row] = await db.update(nutrientes).set(req.body).where(eq(nutrientes.idNutriente, parseInt(req.params.id))).returning();
  res.json(row);
});

router.delete("/:id", authMiddleware, requireRoles("admin"), async (req, res) => {
  await db.delete(nutrientes).where(eq(nutrientes.idNutriente, parseInt(req.params.id)));
  res.json({ ok: true });
});

// Programas de nutrición
router.get("/programas/todos", authMiddleware, async (req, res) => {
  let rows = await db.select().from(programasNutricion).orderBy(programasNutricion.diaInicio);
  if (req.query.idCultivo) rows = rows.filter((r) => String(r.idCultivo) === String(req.query.idCultivo));
  if (req.query.tipoCultivo) rows = rows.filter((r) => r.tipoCultivo === req.query.tipoCultivo);
  res.json(rows);
});

router.post("/programas", authMiddleware, requireRoles("admin", "tecnico"), async (req, res) => {
  const [row] = await db.insert(programasNutricion).values({
    idCultivo: req.body.idCultivo || null,
    idNutriente: req.body.idNutriente,
    tipoCultivo: req.body.tipoCultivo,
    fase: req.body.fase,
    diaInicio: req.body.diaInicio,
    diaFin: req.body.diaFin,
    dosis: req.body.dosis,
    frecuenciaDias: req.body.frecuenciaDias || 1,
    horaAplicacion: req.body.horaAplicacion,
    notas: req.body.notas,
  }).returning();
  // Generar aplicaciones futuras basadas en programa
  if (row.idCultivo) {
    await generarAplicaciones(row);
  }
  res.status(201).json(row);
});

// Genera registros en aplicaciones_nutrientes para cada fecha según frecuencia
async function generarAplicaciones(programa) {
  const [cultivo] = await db.select().from(cultivos).where(eq(cultivos.idCultivo, programa.idCultivo));
  if (!cultivo?.fechaInicio) return;
  const inicio = new Date(cultivo.fechaInicio);
  for (let d = programa.diaInicio; d <= programa.diaFin; d += programa.frecuenciaDias) {
    const fecha = new Date(inicio);
    fecha.setDate(fecha.getDate() + d);
    await db.insert(aplicacionesNutrientes).values({
      idPrograma: programa.idPrograma,
      idCultivo: programa.idCultivo,
      idNutriente: programa.idNutriente,
      dosisAplicada: programa.dosis,
      fechaProgramada: fecha.toISOString().slice(0,10),
      estado: "pendiente",
    });
  }
}

router.delete("/programas/:id", authMiddleware, requireRoles("admin"), async (req, res) => {
  await db.delete(programasNutricion).where(eq(programasNutricion.idPrograma, parseInt(req.params.id)));
  res.json({ ok: true });
});

// Aplicaciones (histórico y calendario)
router.get("/aplicaciones", authMiddleware, async (req, res) => {
  let rows = await db.select().from(aplicacionesNutrientes).orderBy(desc(aplicacionesNutrientes.fechaProgramada));
  if (req.query.idCultivo) rows = rows.filter((r) => String(r.idCultivo) === String(req.query.idCultivo));
  if (req.query.estado) rows = rows.filter((r) => r.estado === req.query.estado);
  res.json(rows);
});

router.put("/aplicaciones/:id/aplicar", authMiddleware, requireRoles("admin", "tecnico", "operario"), async (req, res) => {
  const [row] = await db.update(aplicacionesNutrientes).set({ estado: "aplicada", fechaAplicada: new Date(), aplicadoPor: req.user.idUsuario, observaciones: req.body.observaciones }).where(eq(aplicacionesNutrientes.idAplicacion, parseInt(req.params.id))).returning();
  res.json(row);
});

router.put("/aplicaciones/:id/omitir", authMiddleware, requireRoles("admin", "tecnico"), async (req, res) => {
  const [row] = await db.update(aplicacionesNutrientes).set({ estado: "omitida", observaciones: req.body.observaciones }).where(eq(aplicacionesNutrientes.idAplicacion, parseInt(req.params.id))).returning();
  res.json(row);
});

// Plantillas predefinidas por tipo de cultivo (guía al usuario)
router.get("/plantillas/:tipoCultivo", authMiddleware, async (req, res) => {
  // Devuelve programas tipo plantilla para ese cultivo (sin idCultivo específico)
  const rows = await db.select().from(programasNutricion).where(eq(programasNutricion.tipoCultivo, req.params.tipoCultivo));
  // Si no hay plantillas, devolver ejemplo por defecto para Ebb and Flow lechuga/mostaza
  if (rows.length === 0) {
    const ejemplos = {
      lechuga: [
        { fase: "seed", diaInicio: 0, diaFin: 15, dosis: "0.8", frecuenciaDias: 2, notas: "Solución A+B baja EC 0.8-1.0" },
        { fase: "vegetative", diaInicio: 16, diaFin: 35, dosis: "1.4", frecuenciaDias: 1, notas: "EC 1.4-1.6 pH 5.8-6.2" },
        { fase: "final", diaInicio: 36, diaFin: 45, dosis: "1.0", frecuenciaDias: 2, notas: "Reducir EC antes de cosecha" },
      ],
      mostaza: [
        { fase: "seed", diaInicio: 0, diaFin: 12, dosis: "1.0", frecuenciaDias: 2, notas: "EC 1.0" },
        { fase: "vegetative", diaInicio: 13, diaFin: 28, dosis: "1.8", frecuenciaDias: 1, notas: "EC 1.6-1.8" },
        { fase: "bloom", diaInicio: 29, diaFin: 40, dosis: "1.2", frecuenciaDias: 2, notas: "Ajustar pH" },
      ],
    };
    return res.json(ejemplos[req.params.tipoCultivo.toLowerCase()] || []);
  }
  res.json(rows);
});

export default router;
