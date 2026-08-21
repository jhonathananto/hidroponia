import dotenv from "dotenv";
dotenv.config();

// Centraliza validación de variables de entorno
export const env = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || "cambiar_secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "8h",
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
  MQTT_USERNAME: process.env.MQTT_USERNAME || undefined,
  MQTT_PASSWORD: process.env.MQTT_PASSWORD || undefined,
  MQTT_BASE_TOPIC: process.env.MQTT_BASE_TOPIC || "hidroponia/#",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  NODE_ENV: process.env.NODE_ENV || "development",
};

if (!env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL no definida. Usa .env.example como plantilla");
}
