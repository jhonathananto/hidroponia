# Hidroponía Backend - Ebb and Flow

## Stack
Node.js + Express + Drizzle ORM + PostgreSQL + MQTT (Arduino UNO WiFi Rev2) + JWT + bcryptjs

## Configuración inicial
1. Copiar `.env.example` a `.env` y configurar `DATABASE_URL`
2. Crear BD en pgAdmin: `hidroponia`
3. Instalar deps: `npm install`
4. Generar y aplicar migraciones:
```bash
npx drizzle-kit push
# o
npm run db:generate
npm run db:migrate
```
5. Seed demo: `npm run db:seed`
6. Iniciar: `npm run dev` (requiere Mosquitto MQTT en localhost:1883 o configurar `MQTT_BROKER_URL`)

## Tópicos MQTT esperados
- `hidroponia/{idCultivo}/ph` payload: `{"valor": 6.2}`
- `hidroponia/{idCultivo}/ec`, `.../dht_temp`, `.../dht_hum`, `.../ultrasonico`
La placa Arduino publica JSON con `valor` y opcional `ts`.

## Roles
admin, tecnico, operario, visor - controlados por `requireRoles(...)`

## Auditoría
Todas las peticiones autenticadas se registran en `auditoria_logs`; sesiones en `sesiones`.
