#!/usr/bin/env bash
set -Eeuo pipefail

REPOSITORY_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
EXPECTED_ORIGIN="MauroMiranda0/saluddesdeelalma.org"

fail() {
  printf '[ERROR] %s\n' "$1" >&2
  exit 1
}

: "${ROLLBACK_REVISION:?Indica el SHA conocido de código que se desea restaurar.}"
: "${ROLLBACK_WORKTREE_DIR:?Indica una ruta absoluta nueva fuera del checkout para el worktree de rollback.}"
: "${BACKEND_ENV_FILE:?BACKEND_ENV_FILE debe señalar el entorno externo de runtime.}"
: "${NEXT_PUBLIC_API_BASE_URL:?NEXT_PUBLIC_API_BASE_URL es requerida para el build.}"

[[ "$ROLLBACK_WORKTREE_DIR" = /* ]] \
  || fail "ROLLBACK_WORKTREE_DIR debe ser una ruta absoluta."
case "$ROLLBACK_WORKTREE_DIR/" in
  "$REPOSITORY_ROOT/"*) fail "El worktree de rollback debe estar fuera del checkout." ;;
esac
[[ ! -e "$ROLLBACK_WORKTREE_DIR" ]] || fail "ROLLBACK_WORKTREE_DIR ya existe."
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

ORIGIN_URL="$(git -C "$REPOSITORY_ROOT" remote get-url origin 2>/dev/null)" \
  || fail "Falta el remote origin."
shopt -s nocasematch
[[ "$ORIGIN_URL" =~ (github\.com[:/])MauroMiranda0/saluddesdeelalma\.org(\.git)?$ ]] \
  || fail "El remote origin no corresponde al repositorio esperado."
shopt -u nocasematch
git -C "$REPOSITORY_ROOT" cat-file -e "${ROLLBACK_REVISION}^{commit}" \
  || fail "ROLLBACK_REVISION no existe localmente."

node "$REPOSITORY_ROOT/backend/scripts/validate-production-env.mjs" \
  --backend-env "$BACKEND_ENV_FILE" \
  --require-frontend \
  --require-whatsapp-outbound-disabled

git -C "$REPOSITORY_ROOT" worktree add --detach \
  "$ROLLBACK_WORKTREE_DIR" "$ROLLBACK_REVISION"
cd "$ROLLBACK_WORKTREE_DIR"

printf 'Rollback de código de piloto a revisión: %s\n' "$ROLLBACK_REVISION"
npm ci --include=dev
NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL" npm run build

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
mkdir -p "$ROLLBACK_WORKTREE_DIR/logs"
pm2 startOrReload backend/ecosystem.config.js --only api --update-env
pm2 startOrReload frontend/ecosystem.config.js --only web --update-env
pm2 save

curl --fail --silent --show-error http://127.0.0.1:4000/api/v1/health >/dev/null
curl --fail --silent --show-error http://127.0.0.1:3000/ >/dev/null
printf 'Rollback de código completado. No se consultaron ni modificaron migraciones.\n'
