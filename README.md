# Hidroponía Ebb and Flow — Plataforma de Monitoreo y Control

Sistema web **responsive** inspirado en el diseño Dribbble `Mustard Plant Area` (teal #0f5b5a + acento ámbar + mint) para automatizar cultivos hidropónicos **flujo y reflujo**.

## Arquitectura
- **Backend**: Node.js + Express + JWT (jsonwebtoken) + bcryptjs + cors + dotenv + **mqtt** (suscriptor) + **Drizzle ORM** + PostgreSQL (pgAdmin)
- **Frontend**: React 18 + Vite + TailwindCSS + Axios + Chart.js (react-chartjs-2) + React Router
- **Hardware**: Arduino UNO WiFi Rev2 → publica por MQTT
- **BD**: PostgreSQL con 13 tablas (ver `backend/src/db/schema.js`)

## Tablas (incluye las 4 obligatorias solicitadas)
`organizaciones`, `ubicaciones`, `usuarios`, `cultivos`, `sensores`, `umbrales`, `mediciones`, `alertas`, `nutrientes`, `programas_nutricion`, `aplicaciones_nutrientes`, `ciclos_riego`, `auditoria_logs`, `sesiones`, `notificaciones`

> Las 4 obligatorias (`cultivos`, `sensores`, `mediciones`, `alertas`) usan exactamente los constraints/nombres pedidos y se extienden con `id_organizacion`, `topic_mqtt`, etc. para multi-tenant.

## Paleta Dribbble extraída
- Primary teal: `#0f5b5a` (sidebar, gauge, botones)
- Accent ámbar: `#f59e0b` / `#fbbf24` (alertas, gauge highlight)
- Mint: `#e8f5f2` / `#eef4f3` (fondo)
- Blanco + gris superficie

## Inicio rápido

### 1. PostgreSQL (pgAdmin)
Crear BD `hidroponia` y copiar `backend/.env.example` a `backend/.env`:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/hidroponia
JWT_SECRET=cambiar_en_produccion
MQTT_BROKER_URL=mqtt://localhost:1883
```

### 2. Backend
```bash
cd backend
npm install
npx drizzle-kit push  # crea tablas en PostgreSQL
npm run db:seed       # datos demo (org + admin@hidrofarm.demo/admin123)
npm run dev           # http://localhost:4000/health
```
MQTT: instalar Mosquitto local o usar `mqtt://test.mosquitto.org:1883` para pruebas.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev           # http://localhost:5173
# build producción:
npm run build
```

### 4. Arduino UNO WiFi Rev2 — ejemplo
```cpp
#include <WiFiNINA.h>
#include <ArduinoMqttClient.h>
WiFiClient wifi; MqttClient mqtt(wifi);
void loop() {
  float ph = leerPH(); float ec = leerEC(); float t = dht.readTemperature();
  mqtt.beginMessage("hidroponia/1/ph"); mqtt.print("{\"valor\":"); mqtt.print(ph); mqtt.print("}"); mqtt.endMessage();
  mqtt.beginMessage("hidroponia/1/ec"); mqtt.print("{\"valor\":"); mqtt.print(ec); mqtt.print("}"); mqtt.endMessage();
  mqtt.beginMessage("hidroponia/1/dht_temp"); mqtt.print("{\"valor\":"); mqtt.print(t); mqtt.print("}"); mqtt.endMessage();
  delay(60000);
}
```
Sin hardware, usa **Sensores → Simular medición** que hace `POST /api/mediciones/ingest`.

## Funcionalidades clave
- **Multi-organización**: registro de empresa + admin inicial (`/registro`)
- **Roles**: admin/tecnico/operario/visor con `requireRoles` y menú filtrado
- **Cultivos Ebb and Flow**: ciclos inundación/drenaje, fases Seed/Vegetation/Bloom/Final con timeline
- **Sensores**: pH, EC (conductividad), DHT22 (temp/hum), ultrasónico (nivel agua). Auto-creación al llegar MQTT
- **Umbrales + Alertas**: configura min/max por sensor; al exceder se genera `alertas` + `notificaciones` in-app (polling 10-15s, badge)
- **Nutrientes**: catálogo, programas por fase (guías con dosis/frecuencia), generación automática de `aplicaciones_nutrientes` y marcado aplicar/omitir con histórico
- **Series temporales**: Chart.js line charts filtrados por `idCultivo`/`tipoSensor`
- **Auditoría**: `auditoria_logs` (usuario, acción, entidad, ruta, IP, body) + `sesiones` (duración, humanize) — solo admin/tecnico
- **Notificaciones**: campana con dropdown + página `/alertas`

## Endpoints principales
```
POST /api/auth/registro-organizacion  POST /api/auth/login  GET /api/auth/me
GET/POST/PUT/DELETE /api/cultivos  /api/sensores  /api/nutrientes  /api/usuarios
GET /api/mediciones?  /resumen?  /series?  POST /ingest
GET /api/alertas  PUT /:id/resolver  GET /notificaciones/mias
GET /api/organizaciones/me  /ubicaciones
GET /api/auditoria/logs  /sesiones  /resumen
```

## Estructura
```
/backend/src/{config,db,services,modules,middleware}
/frontend/src/{pages,components,context,services}
```

## Notas pgAdmin + Drizzle
- Drizzle ORM genera migraciones con `npx drizzle-kit generate` y aplica con `push`.
- Ver tablas en pgAdmin: click derecho BD → Query Tool → `\dt` o navegador.

### Migración NIT → RUC (Ecuador) — importante si ya creaste la BD antes del 21/08/2026
Si ejecutaste `npx drizzle-kit push` cuando la columna aún se llamaba `nit`, debes renombrarla manualmente en pgAdmin / psql. En instalaciones nuevas este paso no es necesario.

En pgAdmin: click derecho en BD `hidroponia` → **Query Tool** → ejecutar:

```sql
-- Renombra la columna nit a ruc (estándar SRI Ecuador, 13 dígitos)
ALTER TABLE organizaciones RENAME COLUMN nit TO ruc;
ALTER TABLE organizaciones ALTER COLUMN ruc TYPE varchar(13);
-- Verificación
\d organizaciones
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'organizaciones' AND column_name = 'ruc';
```

Alternativa por terminal:
```bash
psql "postgres://postgres:postgres@localhost:5432/hidroponia" -c "ALTER TABLE organizaciones RENAME COLUMN nit TO ruc;"
psql "postgres://postgres:postgres@localhost:5432/hidroponia" -c "ALTER TABLE organizaciones ALTER COLUMN ruc TYPE varchar(13);"
```

## Usuarios demo (seed)
- admin@hidrofarm.demo / admin123 (admin)
- tecnico@hidrofarm.demo / tecnico123
- operario@hidrofarm.demo / operario123

---
Comentarios en español en todo el código (`// ...`). Diseño 100% responsivo Tailwind.
