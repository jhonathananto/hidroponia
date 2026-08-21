import mqtt from "mqtt";
import { env } from "../config/env.js";
import { db } from "../db/connection.js";
import { sensores, mediciones, umbrales, alertas, notificaciones, usuarios } from "../db/schema.js";
import { eq } from "drizzle-orm";

let client = null;

// Mapeo de tópicos MQTT a tipo de sensor
// Formato esperado de publicación Arduino: hidroponia/{idCultivo}/{tipo}  payload: {"valor": 6.2, "ts": 171...}
// Tipos soportados: ph, ec, conductividad, dht_temp, dht_hum, ultrasonico, temperatura, humedad
const TOPIC_REGEX = /^hidroponia\/(\d+)\/([\w\-]+)$/;

// Evalúa umbrales y genera alerta + notificación si corresponde
async function evaluarUmbrales(idSensor, valor, tipoSensor, idCultivo) {
  // Buscar umbrales activos para ese sensor o tipo en cultivo
  const lista = await db.select().from(umbrales).where(eq(umbrales.activo, true));
  const aplicables = lista.filter(
    (u) =>
      (u.idSensor === idSensor || (u.tipoSensor === tipoSensor && u.idCultivo === idCultivo)) &&
      u.valorMin != null &&
      u.valorMax != null
  );

  for (const u of aplicables) {
    const min = parseFloat(u.valorMin);
    const max = parseFloat(u.valorMax);
    const v = parseFloat(valor);
    if (v < min || v > max) {
      const severidad = u.severidad || (Math.abs(v - (min + max) / 2) > (max - min) ? "alta" : "media");
      const mensaje = u.mensajeTemplate
        ? u.mensajeTemplate.replace("{valor}", v).replace("{min}", min).replace("{max}", max)
        : `Sensor ${tipoSensor} fuera de rango: ${v} (rango ${min}-${max})`;

      const [alerta] = await db
        .insert(alertas)
        .values({
          idSensor,
          idUmbral: u.idUmbral,
          valorMedido: String(v),
          tipoAlerta: "umbral",
          mensaje,
          severidad,
        })
        .returning();

      // Notificar a usuarios de la organización (admin y tecnico)
      // Buscar cultivo para obtener idOrganizacion
      const { cultivos } = await import("../db/schema.js");
      const [cultivo] = await db.select().from(cultivos).where(eq(cultivos.idCultivo, idCultivo));
      if (cultivo?.idOrganizacion) {
        const usersToNotify = await db
          .select()
          .from(usuarios)
          .where(eq(usuarios.idOrganizacion, cultivo.idOrganizacion));
        for (const uUser of usersToNotify) {
          await db.insert(notificaciones).values({
            idUsuario: uUser.idUsuario,
            idAlerta: alerta.idAlerta,
            titulo: `Alerta ${severidad}: ${tipoSensor}`,
            mensaje,
          });
        }
      }
      console.log(`🚨 Alerta generada: ${mensaje}`);
    }
  }
}

// Callback al recibir mensaje MQTT
async function handleMessage(topic, message) {
  try {
    const payloadStr = message.toString();
    let data;
    try {
      data = JSON.parse(payloadStr);
    } catch {
      // Si no es JSON, asumir que el payload es un número directo
      data = { valor: parseFloat(payloadStr) };
    }
    const valor = data.valor ?? data.value ?? data.v ?? null;
    if (valor == null || isNaN(valor)) {
      console.warn(`MQTT valor inválido en ${topic}: ${payloadStr}`);
      return;
    }

    // Parsear cultivo y tipo desde topic
    const match = topic.match(TOPIC_REGEX);
    if (!match) {
      console.warn(`Tópico no reconocido: ${topic}`);
      return;
    }
    const idCultivo = parseInt(match[1], 10);
    const tipoRaw = match[2].toLowerCase();

    // Normalizar tipo
    const tipoMap = {
      ph: "pH",
      ec: "EC",
      conductividad: "EC",
      temperatura: "DHT22_TEMP",
      temp: "DHT22_TEMP",
      humedad: "DHT22_HUM",
      hum: "DHT22_HUM",
      dht_temp: "DHT22_TEMP",
      dht_hum: "DHT22_HUM",
      ultrasonico: "ULTRASONICO",
      distancia: "ULTRASONICO",
      nivel: "ULTRASONICO",
    };
    const tipoSensor = tipoMap[tipoRaw] || tipoRaw.toUpperCase();

    // Buscar sensor correspondiente (por cultivo y tipo)
    let sensorList = await db
      .select()
      .from(sensores)
      .where(eq(sensores.idCultivo, idCultivo));
    let sensor = sensorList.find((s) => s.tipoSensor.toLowerCase() === tipoSensor.toLowerCase());

    // Si no existe, crearlo automáticamente (útil para onboarding de Arduino)
    if (!sensor) {
      console.log(`Creando sensor automático: cultivo ${idCultivo} tipo ${tipoSensor}`);
      const unidadMap = { pH: "pH", EC: "mS/cm", DHT22_TEMP: "°C", DHT22_HUM: "%", ULTRASONICO: "cm" };
      const [nuevo] = await db
        .insert(sensores)
        .values({
          idCultivo,
          tipoSensor,
          nombreSensor: `${tipoSensor} auto`,
          topicMqtt: topic,
          unidad: unidadMap[tipoSensor] || "",
          activo: true,
          estado: "ok",
        })
        .returning();
      sensor = nuevo;
    }

    // Guardar medición
    const ts = data.ts ? new Date(data.ts) : data.marca_temporal ? new Date(data.marca_temporal) : new Date();
    await db.insert(mediciones).values({
      idSensor: sensor.idSensor,
      valor: String(valor),
      marcaTemporal: ts,
      calidadMedicion: data.calidad ?? 100,
    });
    console.log(`📈 Medición: ${tipoSensor} cultivo ${idCultivo} = ${valor} @ ${ts.toISOString()}`);

    // Evaluar umbrales
    await evaluarUmbrales(sensor.idSensor, valor, tipoSensor, idCultivo);
  } catch (e) {
    console.error("Error handleMessage MQTT:", e);
  }
}

export function iniciarMqtt() {
  if (client) return client;
  const opts = {};
  if (env.MQTT_USERNAME) opts.username = env.MQTT_USERNAME;
  if (env.MQTT_PASSWORD) opts.password = env.MQTT_PASSWORD;

  console.log(`🔌 Conectando MQTT a ${env.MQTT_BROKER_URL} tópico ${env.MQTT_BASE_TOPIC}`);
  client = mqtt.connect(env.MQTT_BROKER_URL, opts);

  client.on("connect", () => {
    console.log("✅ MQTT conectado");
    client.subscribe(env.MQTT_BASE_TOPIC, (err) => {
      if (err) console.error("MQTT subscribe error:", err);
      else console.log(`📡 Suscrito a ${env.MQTT_BASE_TOPIC}`);
    });
  });

  client.on("message", handleMessage);
  client.on("error", (e) => console.error("MQTT error:", e.message));
  client.on("reconnect", () => console.log("MQTT reconectando..."));
  client.on("close", () => console.log("MQTT desconectado"));

  return client;
}

export function getMqttClient() {
  return client;
}

// Permite inyección de mediciones vía HTTP para pruebas sin broker
export async function ingestMeasurement({ topic, valor, marcaTemporal }) {
  // Simula mensaje MQTT
  const fakeMsg = Buffer.from(JSON.stringify({ valor, ts: marcaTemporal }));
  await handleMessage(topic, fakeMsg);
}
