#!/usr/bin/env bash
# deploy-firebase.sh — Deploy a Firebase desde GitHub Actions.
#
# Uso:  bash .github/scripts/deploy-firebase.sh <targets> <proyecto>
#   ej: bash .github/scripts/deploy-firebase.sh firestore:rules sige-esmn
#       bash .github/scripts/deploy-firebase.sh hosting prueba1-esmn
#
# El proyecto es un argumento OBLIGATORIO y se escribe literal en cada workflow
# (nunca una variable que pueda quedar vacía): un deploy al proyecto equivocado
# pisa producción. Además se verifica que la key corresponda a ese proyecto.
#
# Autenticación: la cuenta de servicio del secreto que el workflow pasa como variable
# de entorno `FIREBASE_SERVICE_ACCOUNT_KEY` (nunca en la línea de comandos, para que no
# quede en el log). Cada workflow mapea ahí el secreto de su entorno.
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
PROJECT="${2:?Falta el proyecto (sige-esmn | prueba1-esmn)}"
SA_FILE="$RUNNER_TEMP/firebase-sa.json"

# --- 0. Proyecto permitido -> entorno (guardarraíl contra deploy cruzado) ---
case "$PROJECT" in
  sige-esmn)    ENTORNO="produccion" ;;
  prueba1-esmn) ENTORNO="staging" ;;
  *)
    echo "::error title=Proyecto invalido::'$PROJECT' no es un proyecto conocido (sige-esmn | prueba1-esmn)"
    exit 1
    ;;
esac
echo "Destino: $PROJECT ($ENTORNO)"

# --- 1. Credenciales ---
if [ -z "${FIREBASE_SERVICE_ACCOUNT_KEY:-}" ]; then
  echo "::error title=Credenciales::El secreto de la cuenta de servicio está vacío"
  exit 1
fi
printf '%s' "$FIREBASE_SERVICE_ACCOUNT_KEY" > "$SA_FILE"
echo "Credenciales: $SA_FILE ($(wc -c < "$SA_FILE") bytes)"

# Diagnóstico útil (no expone secretos): confirma que el JSON es una service account
# usable y que pertenece al proyecto destino.
KEY_PROJECT=$(SA_JSON="$SA_FILE" node -e "const k=require(process.env.SA_JSON); console.error('  project_id:', k.project_id, '| client_email:', k.client_email, '| private_key:', k.private_key ? 'presente' : 'FALTA'); process.stdout.write(k.project_id || '')") \
  || KEY_PROJECT=""
if [ "$KEY_PROJECT" != "$PROJECT" ]; then
  echo "::error title=Credenciales cruzadas::La key es de '${KEY_PROJECT:-desconocido}' pero el deploy apunta a '$PROJECT'"
  exit 1
fi

# --- 2. CLI local (devDependency instalada por `npm install`) ---
# Evita depender de la red, de la caché de npm o de una versión distinta a la del repo.
CLI="node_modules/.bin/firebase"
if [ ! -x "$CLI" ]; then
  echo "Aviso: no existe $CLI, se usa npx."
  CLI="npx firebase"
fi

# --- 3. Deploy, capturando la salida para poder anotarla ---
echo "Deployando '$TARGETS' en el proyecto '$PROJECT' ($ENTORNO)..."
set +e
OUT=$(GOOGLE_APPLICATION_CREDENTIALS="$SA_FILE" $CLI deploy --only "$TARGETS" --project "$PROJECT" --non-interactive 2>&1)
CODE=$?
set -e
echo "$OUT"

# --- 4. Resultado como anotación del run ---
if [ "$CODE" -ne 0 ]; then
  MSG=$(echo "$OUT" | grep -iE "error|denied|permission|failed|invalid|cannot|not found" | tail -n 3 | tr -d '\r' | tr '\n' ' ')
  echo "::error title=Deploy de '$TARGETS' fallo::${MSG:-ver el log del paso}"
else
  echo "::notice title=Deploy de '$TARGETS' OK::publicado en $PROJECT ($ENTORNO)"
fi

exit "$CODE"
