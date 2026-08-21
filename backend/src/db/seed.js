import { db, pool } from "./connection.js";
import { organizaciones, ubicaciones, usuarios, cultivos, sensores, umbrales, nutrientes, programasNutricion } from "./schema.js";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Iniciando seed...");

  // Organización demo
  const [org] = await db.insert(organizaciones).values({ nombre: "HidroFarm Demo", ruc: "1790011223001", email: "contacto@hidrofarm.demo", direccion: "Quito, Ecuador" }).onConflictDoNothing().returning().catch(async () => {
    const existing = await db.select().from(organizaciones).limit(1);
    return existing;
  });
  const orgId = org?.idOrganizacion || (await db.select().from(organizaciones).limit(1))[0].idOrganizacion;

  // Ubicación
  let ubic = await db.select().from(ubicaciones).limit(1);
  if (!ubic.length) {
    [ubic[0]] = await db.insert(ubicaciones).values({ idOrganizacion: orgId, nombre: "Invernadero Principal - Ebb and Flow", descripcion: "Sistema flujo y reflujo 4 bandejas", tipoSistema: "ebb_and_flow", capacidadBandejas: 4 }).returning();
  }

  // Usuario admin
  const hash = await bcrypt.hash("admin123", 10);
  try {
    await db.insert(usuarios).values({ idOrganizacion: orgId, nombre: "Admin Demo", email: "admin@hidrofarm.demo", passwordHash: hash, rol: "admin" });
    console.log("Usuario admin creado: admin@hidrofarm.demo / admin123");
    await db.insert(usuarios).values({ idOrganizacion: orgId, nombre: "Técnico Demo", email: "tecnico@hidrofarm.demo", passwordHash: await bcrypt.hash("tecnico123", 10), rol: "tecnico" });
    await db.insert(usuarios).values({ idOrganizacion: orgId, nombre: "Operario Demo", email: "operario@hidrofarm.demo", passwordHash: await bcrypt.hash("operario123", 10), rol: "operario" });
  } catch (e) { console.log("Usuarios ya existen", e.message); }

  // Cultivo demo
  let cult = await db.select().from(cultivos).limit(1);
  if (!cult.length) {
    const [c] = await db.insert(cultivos).values({
      idOrganizacion: orgId,
      idUbicacion: ubic[0].idUbicacion,
      nombre: "Mostaza - Bandeja A",
      tipoCultivo: "mostaza",
      variedad: "Mustard Green",
      fechaInicio: new Date().toISOString().slice(0,10),
      fechaCosechaEsperada: new Date(Date.now() + 30*24*3600*1000).toISOString().slice(0,10),
      estado: "activo",
      cicloInundacionMin: 15,
      cicloDrenajeMin: 45,
    }).returning();
    cult = [c];
    console.log("Cultivo demo creado:", c.nombre);

    // Sensores demo
    const tipos = [
      { tipoSensor: "pH", nombreSensor: "pH Bandeja A", unidad: "pH", rangoMinimo: "5.5", rangoMaximo: "6.5", topicMqtt: `hidroponia/${c.idCultivo}/ph` },
      { tipoSensor: "EC", nombreSensor: "EC Bandeja A", unidad: "mS/cm", rangoMinimo: "1.2", rangoMaximo: "2.0", topicMqtt: `hidroponia/${c.idCultivo}/ec` },
      { tipoSensor: "DHT22_TEMP", nombreSensor: "Temp Aire", unidad: "°C", rangoMinimo: "18", rangoMaximo: "28", topicMqtt: `hidroponia/${c.idCultivo}/dht_temp` },
      { tipoSensor: "DHT22_HUM", nombreSensor: "Humedad Aire", unidad: "%", rangoMinimo: "50", rangoMaximo: "80", topicMqtt: `hidroponia/${c.idCultivo}/dht_hum` },
      { tipoSensor: "ULTRASONICO", nombreSensor: "Nivel Agua", unidad: "cm", rangoMinimo: "5", rangoMaximo: "30", topicMqtt: `hidroponia/${c.idCultivo}/ultrasonico` },
    ];
    for (const t of tipos) {
      const [s] = await db.insert(sensores).values({ idCultivo: c.idCultivo, ...t }).returning();
      await db.insert(umbrales).values({ idSensor: s.idSensor, tipoSensor: s.tipoSensor, idCultivo: c.idCultivo, valorMin: t.rangoMinimo, valorMax: t.rangoMaximo, severidad: "alta", mensajeTemplate: `${s.nombreSensor} fuera de rango: {valor}` });
    }
    console.log("Sensores y umbrales creados");
  }

  // Nutrientes demo
  let nuts = await db.select().from(nutrientes).limit(1);
  if (!nuts.length) {
    const [n1] = await db.insert(nutrientes).values({ idOrganizacion: orgId, nombre: "Solución A+B Hidroponía", tipo: "macro", composicion: "N-P-K + Ca, Mg, microelementos", unidadMedida: "ml/L", stockActual: "5000", stockMinimo: "500" }).returning();
    const [n2] = await db.insert(nutrientes).values({ idOrganizacion: orgId, nombre: "pH Down", tipo: "corrector", composicion: "Ácido fosfórico", unidadMedida: "ml/L", stockActual: "1000" }).returning();
    console.log("Nutrientes demo creados");
    // Programa nutrición
    await db.insert(programasNutricion).values([
      { idCultivo: cult[0].idCultivo, idNutriente: n1.idNutriente, fase: "seed", diaInicio: 0, diaFin: 15, dosis: "0.8", frecuenciaDias: 2 },
      { idCultivo: cult[0].idCultivo, idNutriente: n1.idNutriente, fase: "vegetative", diaInicio: 16, diaFin: 30, dosis: "1.6", frecuenciaDias: 1 },
    ]);
  }

  console.log("✅ Seed completado");
  await pool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
