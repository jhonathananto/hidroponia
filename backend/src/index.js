import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { testConnection } from "./db/connection.js";
import { iniciarMqtt } from "./services/mqttService.js";
import { auditoriaMiddleware } from "./middleware/auditoria.js";

import authRoutes from "./modules/auth/routes.js";
import usuariosRoutes from "./modules/usuarios/routes.js";
import orgRoutes from "./modules/organizaciones/routes.js";
import cultivosRoutes from "./modules/cultivos/routes.js";
import sensoresRoutes from "./modules/sensores/routes.js";
import medicionesRoutes from "./modules/mediciones/routes.js";
import alertasRoutes from "./modules/alertas/routes.js";
import nutrientesRoutes from "./modules/nutrientes/routes.js";
import auditoriaRoutes from "./modules/auditoria/routes.js";

const app = express();

// Middlewares globales
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log sencillo de requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Auditoría (después de json, antes de rutas - registra dentro de cada ruta con auth)
app.use(auditoriaMiddleware);

// Rutas
app.get("/health", (req, res) => res.json({ ok: true, servicio: "hidroponia-backend", version: "1.0.0", mqtt: env.MQTT_BROKER_URL }));
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/organizaciones", orgRoutes);
app.use("/api/cultivos", cultivosRoutes);
app.use("/api/sensores", sensoresRoutes);
app.use("/api/mediciones", medicionesRoutes);
app.use("/api/alertas", alertasRoutes);
app.use("/api/nutrientes", nutrientesRoutes);
app.use("/api/auditoria", auditoriaRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

// Error handler global
app.use((err, req, res, next) => {
  console.error("Error global:", err);
  res.status(500).json({ error: "Error interno", detalle: err.message });
});

const PORT = env.PORT;

async function start() {
  try {
    await testConnection();
  } catch (e) {
    console.warn("⚠️ No se pudo conectar a PostgreSQL:", e.message);
    console.warn("   Verifica DATABASE_URL y que PostgreSQL esté corriendo. El servidor iniciará igual para desarrollo.");
  }

  // Iniciar MQTT (no bloqueante - si falla, reintenta)
  try {
    iniciarMqtt();
  } catch (e) {
    console.warn("MQTT no iniciado:", e.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Backend hidroponía en http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Frontend CORS permitido: ${env.FRONTEND_URL}`);
  });
}

start();
