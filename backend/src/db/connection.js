import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

// Pool de PostgreSQL - maneja conexiones reutilizables
const { Pool } = pg;
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

// Instancia de Drizzle ORM con el schema completo
export const db = drizzle(pool, { schema });

// Helper para verificar conexión
export async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.log("✅ PostgreSQL conectado correctamente");
  } finally {
    client.release();
  }
}
