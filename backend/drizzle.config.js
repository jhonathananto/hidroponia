import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config();

// Configuración de Drizzle Kit para PostgreSQL
// Se usa DATABASE_URL para conectar y generar migraciones
export default defineConfig({
  schema: "./src/db/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/hidroponia",
  },
  verbose: true,
  strict: true,
});
