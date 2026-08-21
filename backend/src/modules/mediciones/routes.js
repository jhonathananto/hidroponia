import { Router } from "express";
import { db } from "../../db/connection.js";
import { mediciones, sensores, cultivos } from "../../db/schema.js";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";
import { authMiddleware } from "../../middleware/auth.js";
import { ingestMeasurement } from "../../services/mqttService.js";

const router = Router();

// GET /api/mediciones? idSensor=&idCultivo=&desde=&hasta=&limit=&groupBy=hour
router.get("/", authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "200", 10), 1000);
    const desde = req.query.desde ? new Date(req.query.desde) : null;
    const hasta = req.query.hasta ? new Date(req.query.hasta) : null;

    // Si filtra por cultivo, buscar sensores de ese cultivo
    let idsSensores = null;
    if (req.query.idCultivo) {
      const sens = await db.select().from(sensores).where(eq(sensores.idCultivo, parseInt(req.query.idCultivo)));
      idsSensores = sens.map((s) => s.idSensor);
      if (idsSensores.length === 0) return res.json([]);
    }

    let rows = await db.select().from(mediciones).orderBy(desc(mediciones.marcaTemporal)).limit(limit);

    // Filtrado en memoria (para compatibilidad SQLite/test) + SQL si PostgreSQL
    if (req.query.idSensor) rows = rows.filter((r) => String(r.idSensor) === String(req.query.idSensor));
    if (idsSensores) rows = rows.filter((r) => idsSensores.includes(r.idSensor));
    if (desde) rows = rows.filter((r) => new Date(r.marcaTemporal) >= desde);
    if (hasta) rows = rows.filter((r) => new Date(r.marcaTemporal) <= hasta);

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/mediciones/resumen?idCultivo=1 - último valor por tipo de sensor
router.get("/resumen", authMiddleware, async (req, res) => {
  const idCultivo = req.query.idCultivo ? parseInt(req.query.idCultivo) : null;
  if (!idCultivo) return res.status(400).json({ error: "idCultivo requerido" });
  const sens = await db.select().from(sensores).where(eq(sensores.idCultivo, idCultivo));
  const resultado = [];
  for (const s of sens) {
    const meds = await db.select().from(mediciones).where(eq(mediciones.idSensor, s.idSensor)).orderBy(desc(mediciones.marcaTemporal)).limit(1);
    resultado.push({ sensor: s, ultimaMedicion: meds[0] || null });
  }
  res.json(resultado);
});

// GET /api/mediciones/series?idCultivo=1&tipoSensor=pH&desde=...
router.get("/series", authMiddleware, async (req, res) => {
  const { tipoSensor, idCultivo } = req.query;
  if (!tipoSensor || !idCultivo) return res.status(400).json({ error: "tipoSensor e idCultivo requeridos" });
  const sens = await db.select().from(sensores).where(eq(sensores.idCultivo, parseInt(idCultivo)));
  const filtrados = sens.filter((s) => s.tipoSensor.toLowerCase() === String(tipoSensor).toLowerCase());
  let all = [];
  for (const s of filtrados) {
    const meds = await db.select().from(mediciones).where(eq(mediciones.idSensor, s.idSensor)).orderBy(mediciones.marcaTemporal);
    if (req.query.desde) {
      const d = new Date(req.query.desde);
      all = all.concat(meds.filter((m) => new Date(m.marcaTemporal) >= d));
    } else all = all.concat(meds);
  }
  all.sort((a, b) => new Date(a.marcaTemporal) - new Date(b.marcaTemporal));
  res.json(all);
});

// POST /api/mediciones/ingest - Ingesta manual o simulación Arduino (para pruebas sin broker)
router.post("/ingest", authMiddleware, async (req, res) => {
  const { topic, valor, marcaTemporal, idSensor, idCultivo, tipoSensor } = req.body;
  try {
    if (idSensor && valor != null) {
      await db.insert(mediciones).values({ idSensor, valor: String(valor), marcaTemporal: marcaTemporal ? new Date(marcaTemporal) : new Date(), calidadMedicion: 100 });
      return res.status(201).json({ ok: true });
    }
    // Vía topic MQTT (hidroponia/1/ph)
    let t = topic;
    if (!t && idCultivo && tipoSensor) t = `hidroponia/${idCultivo}/${String(tipoSensor).toLowerCase()}`;
    if (!t) return res.status(400).json({ error: "topic o idSensor requerido" });
    await ingestMeasurement({ topic: t, valor: parseFloat(valor), marcaTemporal });
    res.status(201).json({ ok: true, topic: t });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
