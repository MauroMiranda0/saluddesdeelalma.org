#!/usr/bin/env bash
set -Eeuo pipefail

REPOSITORY_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
EXPECTED_ORIGIN="MauroMiranda0/saluddesdeelalma.org"

fail() {
  printf '[ERROR] %s\n' "$1" >&2
  exit 1
}

[[ "${DEPLOY_MODE:-}" == "pilot" ]] \
  || fail 'Define DEPLOY_MODE=pilot para ejecutar el despliegue del piloto.'

cd "$REPOSITORY_ROOT"
[[ -z "$(git rev-parse --show-prefix)" ]] \
  || fail "El script debe ejecutarse desde la raíz del checkout."

ORIGIN_URL="$(git remote get-url origin 2>/dev/null)" \
  || fail "Falta el remote origin."
shopt -s nocasematch
[[ "$ORIGIN_URL" =~ (github\.com[:/])MauroMiranda0/saluddesdeelalma\.org(\.git)?$ ]] \
  || fail "El remote origin no corresponde al repositorio esperado."
shopt -u nocasematch

REVISION="$(git rev-parse --verify HEAD)" || fail "No se pudo identificar el commit."
BRANCH="$(git branch --show-current)"
[[ -n "$BRANCH" ]] || fail "No desplegar desde HEAD detached."
if [[ -n "${DEPLOY_EXPECTED_SHA:-}" && "$REVISION" != "$DEPLOY_EXPECTED_SHA" ]]; then
  fail "HEAD no coincide con DEPLOY_EXPECTED_SHA."
fi
[[ -z "$(git status --porcelain --untracked-files=normal)" ]] \
  || fail "El checkout debe estar limpio antes del despliegue."

: "${BACKEND_ENV_FILE:?BACKEND_ENV_FILE debe señalar un archivo de entorno fuera del repositorio.}"
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL es requerida solo para verificar migraciones.}"
: "${NEXT_PUBLIC_API_BASE_URL:?NEXT_PUBLIC_API_BASE_URL es requerida para el build del frontend.}"
[[ -f "$BACKEND_ENV_FILE" ]] || fail "No existe el archivo indicado por BACKEND_ENV_FILE."
BACKEND_ENV_REALPATH="$(realpath -- "$BACKEND_ENV_FILE")" \
  || fail "No se pudo resolver BACKEND_ENV_FILE."
case "$BACKEND_ENV_REALPATH" in
  "$REPOSITORY_ROOT"/*) fail "El archivo de runtime debe estar fuera del checkout." ;;
esac

for env_file in "$REPOSITORY_ROOT"/.env "$REPOSITORY_ROOT"/.env.* \
  "$REPOSITORY_ROOT"/backend/.env "$REPOSITORY_ROOT"/backend/.env.* \
  "$REPOSITORY_ROOT"/frontend/.env "$REPOSITORY_ROOT"/frontend/.env.*; do
  [[ -e "$env_file" ]] || continue
  [[ "$env_file" == *.example || "$env_file" == *.template ]] && continue
  fail "Se detectó un archivo local de entorno dentro del checkout; usa un archivo externo y variables inyectadas."
done

printf 'Repositorio: %s\n' "$EXPECTED_ORIGIN"
printf 'Rama: %s\n' "$BRANCH"
printf 'Revisión: %s\n' "$REVISION"

printf '[1/6] Preflight de variables; WhatsApp saliente debe estar apagado\n'
node backend/scripts/validate-production-env.mjs \
  --backend-env "$BACKEND_ENV_FILE" \
  --require-migration \
  --require-frontend \
  --require-whatsapp-outbound-disabled

printf '[2/6] Instalación reproducible desde el monorepo\n'
npm ci --include=dev

printf '[3/6] Build desde la raíz del monorepo\n'
NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL" npm run build

printf '[4/6] Verificación read-only del estado de migraciones\n'
DATABASE_URL="$MIGRATION_DATABASE_URL" \
  npm exec --workspace backend -- prisma migrate status --schema prisma/schema.prisma

printf '[5/6] Detener workers existentes y arrancar solo api y web\n'
workers="$(pm2 jlist | node -e '
  const apps = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
  for (const app of apps) {
    if (app.name === "reminders" || app.name === "whatsapp-inbox") {
      console.log(app.name);
    }
  }
')"
while IFS= read -r worker; do
  [[ -z "$worker" ]] || pm2 delete "$worker"
done <<< "$workers"
mkdir -p "$REPOSITORY_ROOT/logs"
pm2 startOrReload backend/ecosystem.config.js --only api --update-env
pm2 startOrReload frontend/ecosystem.config.js --only web --update-env
pm2 save

printf '[6/6] Health checks locales\n'
curl --fail --silent --show-error http://127.0.0.1:4000/api/v1/health >/dev/null
curl --fail --silent --show-error http://127.0.0.1:3000/ >/dev/null
printf 'Despliegue de piloto completado para %s.\n' "$REVISION"
