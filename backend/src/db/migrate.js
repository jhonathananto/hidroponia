import { pool } from "./connection.js";
import fs from "fs";
import path from "path";

// Ejecuta SQL de inicialización (crea extensiones y verifica tablas)
// En producción usa drizzle-kit push/migrate; este script es helper rápido
async function migrate() {
  console.log("Ejecutando verificación de conexión...");
  const client = await pool.connect();
  try {
    // Crear tablas si no existen usando Drizzle push equivalente manual
    // Para simplificar, intentamos crear con SQL directo si drizzle no está migrado
    console.log("Conexión OK. Si es primera vez, ejecuta: npm run db:generate && npm run db:migrate o npx drizzle-kit push");
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' LIMIT 5");
    console.log("Tablas existentes:", res.rows.map((r) => r.table_name));
  } finally {
    client.release();
    await pool.end();
  }
}
migrate().catch((e) => { console.error(e); process.exit(1); });
