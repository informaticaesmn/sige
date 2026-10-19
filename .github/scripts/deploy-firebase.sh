#!/usr/bin/env bash
# deploy-firebase.sh — Deploy a Firebase desde GitHub Actions (rama main).
#
# Uso:  bash .github/scripts/deploy-firebase.sh <targets>
#   ej: bash .github/scripts/deploy-firebase.sh firestore:rules
#       bash .github/scripts/deploy-firebase.sh hosting
#
# Autenticación: la cuenta de servicio del secreto `FIREBASE_SERVICE_ACCOUNT_KEY`, que el
# workflow pasa como variable de entorno (nunca en la línea de comandos, para que no quede
# en el log).
#
# Por qué existe este script (en vez de la acción `FirebaseExtended/action-hosting-deploy`):
#   1. La acción usaba `npx firebase-tools` y fallaba con "npx ... exit code 2" (chocaba con
#      la versión de firebase-tools instalada como devDependency del repo).
#   2. El deploy de hosting NO publica `firestore.rules`: quedaba desincronizado del código
#      (así se coló el bug de inscripciones, ver docs/contexto.md #3).
#   3. Deja el resultado como anotación del run (`::error` / `::notice`) para poder
#      diagnosticar sin acceso al log completo.
set -uo pipefail

TARGETS="${1:?Falta el target a deployar (ej: hosting)}"
PROJECT="sige-esmn"
SA_FILE="$RUNNER_TEMP/firebase-sa.json"

# --- 1. Credenciales ---
if [ -z "${FIREBASE_SERVICE_ACCOUNT_KEY:-}" ]; then
  echo "::error title=Credenciales::El secreto FIREBASE_SERVICE_ACCOUNT_KEY está vacío"
  exit 1
fi
printf '%s' "$FIREBASE_SERVICE_ACCOUNT_KEY" > "$SA_FILE"
echo "Credenciales: $SA_FILE ($(wc -c < "$SA_FILE") bytes)"

# Diagnóstico útil (no expone secretos): confirma que el JSON es una service account usable.
SA_JSON="$SA_FILE" node -e "const k=require(process.env.SA_JSON); console.log('  project_id:', k.project_id, '| client_email:', k.client_email, '| private_key:', k.private_key ? 'presente' : 'FALTA')" \
  || echo "  Aviso: no se pudo leer el JSON del secreto"

# --- 2. CLI local (devDependency instalada por `npm install`) ---
# Evita depender de la red, de la caché de npm o de una versión distinta de la del repo.
CLI="node_modules/.bin/firebase"
if [ ! -x "$CLI" ]; then
  echo "Aviso: no existe $CLI, se usa npx."
  CLI="npx firebase"
fi

# --- 2. Deploy, capturando la salida para poder anotarla ---
echo "Deployando '$TARGETS' en el proyecto '$PROJECT'..."
set +e
OUT=$(GOOGLE_APPLICATION_CREDENTIALS="$SA_FILE" $CLI deploy --only "$TARGETS" --project "$PROJECT" --non-interactive 2>&1)
CODE=$?
set -e
echo "$OUT"

# --- 3. Resultado como anotación del run ---
if [ "$CODE" -ne 0 ]; then
  MSG=$(echo "$OUT" | grep -iE "error|denied|permission|failed|invalid|cannot|not found" | tail -n 3 | tr -d '\r' | tr '\n' ' ')
  echo "::error title=Deploy de '$TARGETS' fallo::${MSG:-ver el log del paso}"
else
  echo "::notice title=Deploy de '$TARGETS' OK::publicado en $PROJECT"
fi

exit "$CODE"
