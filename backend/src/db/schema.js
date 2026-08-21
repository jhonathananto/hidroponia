import {
  pgTable,
  serial,
  integer,
  bigint,
  varchar,
  text,
  numeric,
  boolean,
  smallint,
  timestamp,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============ ENUMS ============
// Roles del sistema - controlan qué ve cada usuario
export const rolEnum = pgEnum("rol", ["admin", "tecnico", "operario", "visor"]);
// Estados de cultivo y sensores
export const estadoCultivoEnum = pgEnum("estado_cultivo", ["planificado", "activo", "pausa", "cosechado", "archivado"]);
export const estadoSensorEnum = pgEnum("estado_sensor", ["ok", "calibrando", "error", "inactivo"]);
export const severidadEnum = pgEnum("severidad", ["baja", "media", "alta", "critica"]);
export const tipoAlertaEnum = pgEnum("tipo_alerta", ["umbral", "desconexion", "calibracion", "sistema"]);

// ============ ORGANIZACIONES (Institución/Empresa) ============
export const organizaciones = pgTable("organizaciones", {
  idOrganizacion: serial("id_organizacion").primaryKey(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  ruc: varchar("ruc", { length: 13 }),
  direccion: text("direccion"),
  telefono: varchar("telefono", { length: 50 }),
  email: varchar("email", { length: 150 }),
  logoUrl: text("logo_url"),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
});

// ============ UBICACIONES (Invernaderos / Salas Ebb and Flow) ============
export const ubicaciones = pgTable("ubicaciones", {
  idUbicacion: serial("id_ubicacion").primaryKey(),
  idOrganizacion: integer("id_organizacion").references(() => organizaciones.idOrganizacion, { onDelete: "cascade" }),
  nombre: varchar("nombre", { length: 150 }).notNull(),
  descripcion: text("descripcion"),
  tipoSistema: varchar("tipo_sistema", { length: 80 }).default("ebb_and_flow"),
  capacidadBandejas: integer("capacidad_bandejas"),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
});

// ============ USUARIOS + ROLES ============
export const usuarios = pgTable("usuarios", {
  idUsuario: serial("id_usuario").primaryKey(),
  idOrganizacion: integer("id_organizacion").references(() => organizaciones.idOrganizacion, { onDelete: "cascade" }),
  nombre: varchar("nombre", { length: 150 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  rol: rolEnum("rol").notNull().default("operario"),
  activo: boolean("activo").default(true),
  ultimoAcceso: timestamp("ultimo_acceso"),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
});

// ============ CULTIVOS (tabla obligatoria - extendida) ============
export const cultivos = pgTable("cultivos", {
  idCultivo: serial("id_cultivo").primaryKey(),
  idUbicacion: integer("id_ubicacion").references(() => ubicaciones.idUbicacion, { onDelete: "set null" }),
  idOrganizacion: integer("id_organizacion").references(() => organizaciones.idOrganizacion, { onDelete: "cascade" }),
  nombre: varchar("nombre", { length: 150 }).notNull(),
  tipoCultivo: varchar("tipo_cultivo", { length: 100 }), // ej: Lechuga, Mostaza, Albahaca
  variedad: varchar("variedad", { length: 100 }),
  fechaInicio: date("fecha_inicio"),
  fechaCosechaEsperada: date("fecha_cosecha_esperada"),
  estado: varchar("estado", { length: 50 }).default("activo"),
  sustrato: varchar("sustrato", { length: 100 }),
  densidadSiembra: integer("densidad_siembra"),
  notas: text("notas"),
  // Ebb and Flow: configuración de ciclos
  cicloInundacionMin: integer("ciclo_inundacion_min").default(15),
  cicloDrenajeMin: integer("ciclo_drenaje_min").default(45),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
});

// ============ SENSORES (tabla obligatoria) ============
export const sensores = pgTable("sensores", {
  idSensor: serial("id_sensor").primaryKey(),
  idCultivo: integer("id_cultivo").notNull().references(() => cultivos.idCultivo, { onDelete: "cascade" }),
  tipoSensor: varchar("tipo_sensor", { length: 100 }).notNull(), // pH, EC, DHT22_TEMP, DHT22_HUM, ULTRASONICO
  nombreSensor: varchar("nombre_sensor", { length: 150 }),
  fabricante: varchar("fabricante", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  topicMqtt: varchar("topic_mqtt", { length: 255 }), // ej: hidroponia/cultivo1/ph
  fechaCalibracion: date("fecha_calibracion"),
  rangoMinimo: numeric("rango_minimo"),
  rangoMaximo: numeric("rango_maximo"),
  unidad: varchar("unidad", { length: 30 }),
  activo: boolean("activo").default(true),
  estado: varchar("estado", { length: 50 }).default("ok"),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
});

// ============ UMBRALES (para generar alertas) ============
export const umbrales = pgTable("umbrales", {
  idUmbral: serial("id_umbral").primaryKey(),
  idSensor: integer("id_sensor").references(() => sensores.idSensor, { onDelete: "cascade" }),
  // Si es null, aplica a cualquier sensor del tipo en el cultivo
  tipoSensor: varchar("tipo_sensor", { length: 100 }),
  idCultivo: integer("id_cultivo").references(() => cultivos.idCultivo, { onDelete: "cascade" }),
  valorMin: numeric("valor_min"),
  valorMax: numeric("valor_max"),
  severidad: varchar("severidad", { length: 30 }).default("media"),
  mensajeTemplate: text("mensaje_template"),
  activo: boolean("activo").default(true),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
});

// ============ MEDICIONES (tabla obligatoria - time-series) ============
export const mediciones = pgTable("mediciones", {
  idMedicion: bigint("id_medicion", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  idSensor: integer("id_sensor").notNull().references(() => sensores.idSensor, { onDelete: "cascade" }),
  valor: numeric("valor").notNull(),
  marcaTemporal: timestamp("marca_temporal").notNull(),
  calidadMedicion: smallint("calidad_medicion"), // 0-100
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
});

// ============ ALERTAS (tabla obligatoria) ============
export const alertas = pgTable("alertas", {
  idAlerta: bigint("id_alerta", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  idSensor: integer("id_sensor").notNull().references(() => sensores.idSensor, { onDelete: "cascade" }),
  idUmbral: integer("id_umbral").references(() => umbrales.idUmbral, { onDelete: "set null" }),
  valorMedido: numeric("valor_medido"),
  tipoAlerta: varchar("tipo_alerta", { length: 50 }),
  mensaje: text("mensaje"),
  severidad: varchar("severidad", { length: 30 }),
  resuelta: boolean("resuelta").default(false),
  fechaResolucion: timestamp("fecha_resolucion"),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
});

// ============ NUTRIENTES (catálogo) ============
export const nutrientes = pgTable("nutrientes", {
  idNutriente: serial("id_nutriente").primaryKey(),
  idOrganizacion: integer("id_organizacion").references(() => organizaciones.idOrganizacion, { onDelete: "cascade" }),
  nombre: varchar("nombre", { length: 150 }).notNull(),
  tipo: varchar("tipo", { length: 80 }), // macro, micro, estimulante
  composicion: text("composicion"), // N-P-K y detalles
  unidadMedida: varchar("unidad_medida", { length: 30 }).default("ml/L"),
  stockActual: numeric("stock_actual").default("0"),
  stockMinimo: numeric("stock_minimo"),
  costoPorUnidad: numeric("costo_por_unidad"),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
});

// ============ PROGRAMAS DE NUTRICIÓN (guías por tipo de cultivo) ============
export const programasNutricion = pgTable("programas_nutricion", {
  idPrograma: serial("id_programa").primaryKey(),
  idCultivo: integer("id_cultivo").references(() => cultivos.idCultivo, { onDelete: "cascade" }),
  idNutriente: integer("id_nutriente").references(() => nutrientes.idNutriente, { onDelete: "cascade" }),
  tipoCultivo: varchar("tipo_cultivo", { length: 100 }), // si es plantilla genérica
  fase: varchar("fase", { length: 50 }).notNull(), // seed, vegetative, bloom, final
  diaInicio: integer("dia_inicio").notNull(), // día relativo al inicio del cultivo
  diaFin: integer("dia_fin").notNull(),
  dosis: numeric("dosis").notNull(), // ej: 1.8 ml/L
  frecuenciaDias: integer("frecuencia_dias").default(1),
  horaAplicacion: varchar("hora_aplicacion", { length: 20 }),
  notas: text("notas"),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
});

// Histórico de aplicaciones reales
export const aplicacionesNutrientes = pgTable("aplicaciones_nutrientes", {
  idAplicacion: serial("id_aplicacion").primaryKey(),
  idPrograma: integer("id_programa").references(() => programasNutricion.idPrograma, { onDelete: "set null" }),
  idCultivo: integer("id_cultivo").notNull().references(() => cultivos.idCultivo, { onDelete: "cascade" }),
  idNutriente: integer("id_nutriente").notNull().references(() => nutrientes.idNutriente),
  dosisAplicada: numeric("dosis_aplicada").notNull(),
  fechaProgramada: date("fecha_programada"),
  fechaAplicada: timestamp("fecha_aplicada"),
  aplicadoPor: integer("aplicado_por").references(() => usuarios.idUsuario),
  estado: varchar("estado", { length: 30 }).default("pendiente"), // pendiente, aplicada, omitida
  observaciones: text("observaciones"),
});

// Ciclos Ebb and Flow registrados
export const ciclosRiego = pgTable("ciclos_riego", {
  idCiclo: serial("id_ciclo").primaryKey(),
  idCultivo: integer("id_cultivo").references(() => cultivos.idCultivo, { onDelete: "cascade" }),
  inicio: timestamp("inicio").notNull(),
  fin: timestamp("fin"),
  duracionMin: integer("duracion_min"),
  estado: varchar("estado", { length: 30 }).default("completado"),
});

// ============ AUDITORÍA ============
export const auditoriaLogs = pgTable("auditoria_logs", {
  idLog: serial("id_log").primaryKey(),
  idUsuario: integer("id_usuario").references(() => usuarios.idUsuario, { onDelete: "set null" }),
  accion: varchar("accion", { length: 100 }).notNull(), // login, logout, create, update, delete, view
  entidad: varchar("entidad", { length: 100 }), // cultivos, sensores, etc.
  entidadId: varchar("entidad_id", { length: 100 }),
  detalles: text("detalles"), // JSON stringificado
  ruta: varchar("ruta", { length: 255 }), // qué opción/página
  ip: varchar("ip", { length: 50 }),
  duracionSesionSeg: integer("duracion_sesion_seg"),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
});

// Sesiones para medir tiempo dentro del sistema
export const sesiones = pgTable("sesiones", {
  idSesion: serial("id_sesion").primaryKey(),
  idUsuario: integer("id_usuario").references(() => usuarios.idUsuario, { onDelete: "cascade" }),
  tokenJti: varchar("token_jti", { length: 100 }),
  inicio: timestamp("inicio").defaultNow(),
  fin: timestamp("fin"),
  ip: varchar("ip", { length: 50 }),
  userAgent: text("user_agent"),
});

// Notificaciones internas
export const notificaciones = pgTable("notificaciones", {
  idNotificacion: serial("id_notificacion").primaryKey(),
  idUsuario: integer("id_usuario").references(() => usuarios.idUsuario, { onDelete: "cascade" }),
  idAlerta: bigint("id_alerta", { mode: "number" }).references(() => alertas.idAlerta, { onDelete: "cascade" }),
  titulo: varchar("titulo", { length: 200 }).notNull(),
  mensaje: text("mensaje"),
  leida: boolean("leida").default(false),
  canal: varchar("canal", { length: 30 }).default("in_app"),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
});

// ============ RELATIONS (para joins de Drizzle) ============
export const organizacionesRelations = relations(organizaciones, ({ many }) => ({
  ubicaciones: many(ubicaciones),
  usuarios: many(usuarios),
  cultivos: many(cultivos),
}));

export const cultivosRelations = relations(cultivos, ({ one, many }) => ({
  ubicacion: one(ubicaciones, { fields: [cultivos.idUbicacion], references: [ubicaciones.idUbicacion] }),
  organizacion: one(organizaciones, { fields: [cultivos.idOrganizacion], references: [organizaciones.idOrganizacion] }),
  sensores: many(sensores),
  programas: many(programasNutricion),
}));

export const sensoresRelations = relations(sensores, ({ one, many }) => ({
  cultivo: one(cultivos, { fields: [sensores.idCultivo], references: [cultivos.idCultivo] }),
  mediciones: many(mediciones),
  alertas: many(alertas),
}));

export const medicionesRelations = relations(mediciones, ({ one }) => ({
  sensor: one(sensores, { fields: [mediciones.idSensor], references: [sensores.idSensor] }),
}));
