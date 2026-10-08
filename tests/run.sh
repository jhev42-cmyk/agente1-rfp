#!/usr/bin/env bash
# Pruebas end-to-end en un esquema aislado (e2e_<fecha>) de la base configurada en .env.local, con
# un servidor local en el puerto 3125. Al terminar se borra el esquema, pase o falle. El nombre es
# único por corrida: el pool de conexiones de Neon guarda en caché los tipos de un esquema borrado,
# y reutilizar el mismo nombre provoca "cache lookup failed for type".
#
# Uso:
#   E2E_ADMIN_PASSWORD=... E2E_ANALISTA_PASSWORD=... npm run test:e2e
# Requiere Google Chrome (o CHROME_PATH) y .env.local (vercel env pull .env.local).
set -euo pipefail
cd "$(dirname "$0")/.."

: "${E2E_ADMIN_PASSWORD:?Define E2E_ADMIN_PASSWORD (contraseña de admin@rfp.local)}"
: "${E2E_ANALISTA_PASSWORD:?Define E2E_ANALISTA_PASSWORD (contraseña de analista1@rfp.local)}"

set -a; source .env.local; set +a
ESQUEMA="e2e_$(date +%Y%m%d%H%M%S)"
con_esquema() { node -e 'const u=process.argv[1]; console.log(u + (u.includes("?") ? "&" : "?") + "schema=" + process.argv[2])' "$1" "$ESQUEMA"; }
URL_BASE_DIRECTA="$DATABASE_URL_UNPOOLED"
export DATABASE_URL="$(con_esquema "$DATABASE_URL")"
export DATABASE_URL_UNPOOLED="$(con_esquema "$DATABASE_URL_UNPOOLED")"
export E2E_BASE="http://localhost:3125"

SERVIDOR=""
limpiar() {
  [ -n "$SERVIDOR" ] && kill "$SERVIDOR" 2>/dev/null || true
  pkill -f "next dev -p 3125" 2>/dev/null || true
  echo "DROP SCHEMA IF EXISTS \"$ESQUEMA\" CASCADE;" | npx prisma db execute --stdin --url "$URL_BASE_DIRECTA" >/dev/null
  echo "Esquema $ESQUEMA eliminado."
}
trap limpiar EXIT

npx prisma migrate deploy >/dev/null
node prisma/seed.js

npx next dev -p 3125 > /tmp/e2e-next.log 2>&1 &
SERVIDOR=$!
for _ in $(seq 1 120); do curl -s -o /dev/null http://localhost:3125/login && break; sleep 1; done

for prueba in plan modos eliminar seguridad; do
  echo ""; echo "=== $prueba"
  node "tests/$prueba.test.js"
done
