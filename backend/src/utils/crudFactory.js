import { eq, desc, asc, and, gte, lte, like, sql } from "drizzle-orm";

// Factory genérico para CRUD básico con Drizzle
// Evita repetir código en cada módulo
export function makeCrud(router, { table, pk, auth, requireOrg = false }) {
  // GET / - listar con filtros ?search=&page=&limit=&idOrganizacion=&idCultivo=...
  router.get("/", auth, async (req, res) => {
    try {
      let q = await dbSelect(req);
      res.json(q);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
}

// Usado internamente por cada módulo para queries con filtros comunes
// Este helper se importa donde se necesita más control
export async function paginatedQuery(db, table, req, { pk, filters = {} }) {
  const page = parseInt(req.query.page || "1", 10);
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 100);
  const offset = (page - 1) * limit;

  let rows = await db.select().from(table).limit(limit).offset(offset).orderBy(desc(table[pk]));

  // Aplicar filtros simples si vienen en query
  // Ej: ?idCultivo=1
  // Se filtra en memoria por simplicidad; para producción usar where SQL
  for (const [key, col] of Object.entries(filters)) {
    const val = req.query[key];
    if (val != null) {
      rows = rows.filter((r) => String(r[col]) === String(val));
    }
  }

  // Búsqueda textual si ?search=
  if (req.query.search && rows.length) {
    const s = String(req.query.search).toLowerCase();
    rows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(s));
  }

  return { data: rows, page, limit };
}
