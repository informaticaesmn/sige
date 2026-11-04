# Plan: separar entornos (dev/staging vs producción)

> **Estado:** implementado (04/11/2026). Quedan solo dos tareas de consola —presupuesto con
> alertas (Fase 4) y revocación de la key vieja (Fase 1)— y el primer deploy manual de
> functions a producción.
> **Objetivo:** que las pruebas de desarrollo no consuman la cuota ni los datos de producción,
> y que las reglas de Firestore de `dev` se desplieguen siempre.
> **Datos verificados:** 03/11/2026 con la CLI de Firebase y las APIs de Firebase Rules,
> Identity Toolkit, Cloud Functions v2, Hosting, Firestore y Cloud Billing.

---

## 0. Situación inicial (verificada el 03/11/2026)

| | `sige-esmn` | `prueba1-esmn` |
|---|---|---|
| Nombre visible en consola | sige-esmn | **sige-esmn-prueba** |
| Proyecto N° | 475513552201 | 155924203510 |
| Usuarios Auth | 1 | 4 (con emails reales) |
| Colecciones raíz Firestore | `usuarios`, `planesPendientes`, `ofertaAcademica_2026` | `usuarios` (3 docs) |
| Reglas activas | **2026-11-03** (incluye `planesPendientes`, `comentarios`, `legajos`, `importaciones`) | 2025-10-04 (obsoletas) |
| Hosting | `sige-esmn.web.app` | `prueba1-esmn.web.app` |
| `registrarUsuario` (v2, southamerica-east1) | **ACTIVE** (2026-01-07) | **ACTIVE** (2026-01-07) |
| `billingEnabled` (API Cloud Billing) | `false` | `false` |
| Uso hoy | Producción + Vercel de `dev` | En desuso |

Observaciones:

1. **Las dos funciones se desplegaron con 4 minutos de diferencia** (mismo timestamp al
   segundo), señal de que en algún momento se deployó a ambos proyectos.
2. Producción tiene una colección **huérfana** `ofertaAcademica_2026`: la app lee y escribe
   `ofertaAcademica` (`useCargaOferta.js`, `useOfertaAcademica.js`). Parece de una versión
   anterior. Conviene exportarla y borrarla.
3. `billingEnabled = false` en ambos, pero hay Cloud Functions activas. Esto es
   contradictorio: Functions exige Blaze para deployar. **Hipótesis:** se deployaron con
   billing habilitado y después se desvinculó la cuenta de facturación. **Hay que
   confirmarlo en la consola** (Project Settings → Usage and billing).

---

## 1. Corrección de una premisa: las cuotas son por proyecto

La idea original era *"crear el proyecto de dev desde otra cuenta para no gastarle las
cuotas del plan gratuito al proyecto en producción"*.

**Abrir una segunda cuenta de Google no suma cuota.** La cuota gratuita de Firestore es
**por proyecto**, no por cuenta. La documentación es explícita:

> "Cloud Firestore allows **exactly one free database per project**."
> — <https://firebase.google.com/docs/firestore/quotas>

Free tier por proyecto: 1 GiB almacenado, **50.000 lecturas/día**, 20.000 escrituras/día,
20.000 borrados/día, 10 GiB/mes de salida.

Consecuencias:

- Un proyecto separado **en la misma cuenta** ya te da una cuota separada. Es lo que se busca.
- Una cuenta separada solo aporta **separación de titularidad** (ej. que producción quede a
  nombre de la institución). Es una decisión de gobernanza, no de cuotas. Y encarece la
  operación: otro login de CLI, otro owner, otra service account.
- **Riesgo real actual:** producción está en Spark. Si un día se pasan de 50.000 lecturas,
  Firestore **deja de responder para todos** hasta la medianoche del Pacífico. No es una
  factura: es una caída. Ese es el argumento fuerte para sacar las pruebas de producción.

---

## 2. El problema de Cloud Functions (a resolver antes de elegir)

> "Cloud Functions for Firebase requires that your project be on the Blaze pricing plan."
> — <https://firebase.google.com/docs/functions/quotas>

Implicaciones:

1. Un proyecto **nuevo** en Spark **no puede deployar** `registrarUsuario`. El flujo de
   registro no se podría probar end-to-end en staging.
2. **Producción ya tiene este problema latente:** el día que haya que modificar
   `registrarUsuario`, `firebase deploy --only functions` va a fallar hasta habilitar Blaze.
   Hoy las funciones se deployan **a mano** (el workflow de `main` solo publica reglas y
   hosting), así que el problema no se descubre hasta ese momento.

Salidas posibles:

| | Salida | Costo |
|---|---|---|
| a | Habilitar Blaze en staging (con *budget alerts* + *spend cap* en Cloud Run functions) | Gratis dentro de la cuota; el spend cap evita sorpresas |
| b | No tocar la función en staging: usar la que ya está desplegada en `prueba1-esmn` | $0, pero no se pueden probar cambios de la función |
| c | Probar el registro solo con emuladores (`npm run test:integration`) | $0, pero no es un entorno desplegado |

---

## 3. Opciones

| | Opción | Pros | Contras |
|---|---|---|---|
| **A** | Reusar `prueba1-esmn` como staging | Ya tiene Auth, Firestore en `southamerica-east1`, hosting y función activa. Cero setup. Gratis. No depende de Blaze para *usar* la función existente | ID inconsistente con el nombre visible. Hay que purgar 4 usuarios y datos viejos. Reglas obsoletas |
| **B** | Proyecto nuevo `sige-esmn-dev` (misma cuenta) | Limpio y coherente. Cuota separada | Recrear Firestore (la location es **permanente**: `southamerica-east1`), Auth, hosting y función. En Spark no puede deployar functions → requiere Blaze o la salida (b/c) |
| **C** | Proyecto nuevo en otra cuenta Google | Separación de titularidad | Todo lo de B + administración doble. **No suma cuota** |
| **D** | Un solo proyecto, separar por prefijo de colecciones (`_dev`) | Cero infraestructura | Comparte cuota y reglas; tarde o temprano un dato de prueba termina en producción. **Descartar** |

### Recomendación: **A**, con reservas

Reusar `prueba1-esmn` porque:

1. Ya tiene todo lo que un staging necesita, incluida la función activa (evita el bloqueo de
   Blaze de la §2).
2. Es gratis (Spark) y **su cuota es independiente de la de producción**, que es el objetivo.
3. Ya se llama "prueba": el nombre visible se puede editar a "SIGE Staging" sin tocar el ID
   (el ID de proyecto es permanente; el display name no).

Condiciones:

- Purga completa: usuarios de Auth **y** sus documentos en `usuarios`. Borrar un usuario de
  Auth **no** borra su doc de Firestore.
- Las reglas viejas (2025-10-04) se pisan en el primer deploy del workflow de staging.
- Si hay que tocar `registrarUsuario`, se decide ahí entre la salida (a) o (c).

**Cuándo elegir B igual:** si preferís no arrastrar un proyecto con datos y usuarios viejos,
o si el proyecto viejo tiene APIs/credenciales que no recordás. En ese caso, asumir que
Functions necesita Blaze.

---

## 4. Arquitectura objetivo

```
                        ┌─────────────────────────────┐
  push a dev  ────────▶ │ workflow dev                │
                        │  rules + functions + hosting│──▶ prueba1-esmn (staging)
                        └─────────────────────────────┘        ↳ prueba1-esmn.web.app
                                                                 ↳ Vercel Preview (env vars staging)

                        ┌─────────────────────────────┐
  push a main ────────▶ │ workflow main               │
                        │  rules (gate) + hosting     │──▶ sige-esmn (producción)
                        └─────────────────────────────┘        ↳ sige-esmn.web.app
                                                                 ↳ Vercel Production (env vars prod)
```

Sin cambios de código en la app: `src/config/firebase.js` ya lee todo de `VITE_FIREBASE_*`.

---

## 5. Fases

### Fase 0 — Decisiones (antes de tocar nada)

- [x] Confirmar en la consola el plan real (Spark/Blaze) de `sige-esmn` y `prueba1-esmn`.
      → Hecho (04/11/2026): ambos proyectos pasaron a **Blaze**.
- [x] Decidir titularidad: ¿producción sigue en `informaticaesmn@gmail.com`?
      → Resuelto: no se crea una cuenta nueva; producción sigue en la cuenta actual.
- [x] Decidir si se usa `prueba1-esmn` (A) o se crea uno nuevo (B).
      → **A**: `prueba1-esmn` es staging.
- [x] Confirmar en Vercel cuál es la **Production Branch** (si es `dev`, hoy el "producción"
      de Vercel está apuntando a datos de producción desde el código de `dev`).
      → Hecho (04/11/2026): Production Branch = `dev`, con las env vars apuntando a
      `prueba1-esmn`. Vercel queda como front de staging; producción es Firebase Hosting.

### Fase 1 — Limpiar staging

- [x] ~~Exportar/archivar los 4 usuarios de Auth y la colección `usuarios`~~
      → Descartado (04/11/2026): se borraron usuarios y colecciones sin backup. Eran datos
      de prueba; si hacía falta algo, se recrea con `scripts/seed-dev.js` (Fase 3).
- [x] Borrar los usuarios de Auth. → Hecho (04/11/2026): `listUsers` devuelve 0.
- [x] Vaciar `usuarios`. → Hecho (04/11/2026): `listCollections` devuelve 0 colecciones raíz.
      Ojo: si quedaron subcolecciones huérfanas de docs borrados, no las lista la API; no
      afectan el uso (no son accesibles) y se pueden ignorar en staging.
- [x] Crear una service account key para `prueba1-esmn`; guardarla en `secrets/`
      (ya está en `.gitignore`) y **nunca** versionarla.
      → Hecho (04/11/2026): key nueva de `firebase-adminsdk-9p782@prueba1-esmn` con los
      roles `Firebase Hosting Admin` + `Firebase Rules Admin`. Verificada con
      `projects.get`, `hosting.sites.list` y `firebaserules.projects:test` (200; la key
      vieja daba 403 acá). Archivo local: `secrets/prueba1-esmn-ba3fad6bfcff.json`.
      La key vieja (`...-180d01ef9a.json`) no tenía `Rules Admin` (el `rules.test` daba 403);
      su archivo local se borró el 04/11/2026. **Pendiente:** revocarla en la consola
      (Service accounts → `firebase-adminsdk-9p782` → Keys → key ID `180d01ef…`).

### Fase 2 — Config multi-proyecto

- [x] `.firebaserc` con alias `staging` → `prueba1-esmn`, `production` → `sige-esmn` y
      `default` → `prueba1-esmn` (04/11/2026). Antes `default` era `sige-esmn`, así que un
      `firebase deploy` local olvidado publicaba en producción; ahora publica en staging.
      Los workflows no dependen del default: pasan `--project` literal.

- [x] Workflow `.github/workflows/firebase-hosting-dev.yml` (push a `dev`): `firestore:rules`
      + `functions` + `hosting` contra `--project prueba1-esmn`, con el secreto
      `FIREBASE_SERVICE_ACCOUNT_KEY_STAGING`.
      → Hecho (04/11/2026). Con Blaze habilitado, `functions` se sumó y se verificó el
      deploy de `registrarUsuario` a staging con la key de CI. Orden: reglas → functions →
      hosting (el front no se publica si falla lo anterior). `deploy-firebase.sh` recibe el
      proyecto como segundo argumento y aborta si la key no pertenece a ese proyecto.
- [x] Vercel: `Production` → proyecto de producción; `Preview` → staging.
      → Resuelto distinto por el plan Hobby: Production Branch = `dev` y todas las env vars
      apuntan a `prueba1-esmn`. Vercel queda como front de staging; producción es Firebase
      Hosting. No se usan sufijos `_STAGING` en Vercel (se separa por ámbito).
- [x] Documentar en `README.md` qué entorno usa cada rama.
      → Hecho (04/11/2026): tabla rama → entorno → proyecto → deploy.

### Fase 3 — Que staging sea usable

- [x] `scripts/seed-dev.js`: un usuario por rol con sus custom claims, una oferta de prueba y
      un borrador de plan. Sin esto, cada purga deja staging inservible.
      → Hecho (04/11/2026): `admin`, `coordinacion`, `bedel`, `docente`, `estudiante`
      (emails `@example.com`, password `SigeStaging2026!`), legajos, oferta `2026-1`,
      borrador `planesPendientes/663` e inscripción pendiente del estudiante. Es
      idempotente, dry-run por defecto y **aborta si las credenciales no son de
      `prueba1-esmn`**. Se corre con `npm run seed:staging [-- --apply]`.
- [x] **Nunca** datos reales de estudiantes en staging (`data/*.csv` ya está ignorado por
      contener datos personales).
      → El seed usa datos sintéticos y `@example.com` (dominio que no recibe correo) para
      que un reset de contraseña no llegue a un Gmail real.

### Fase 4 — Endurecer producción

- [x] Habilitar Blaze + *budget alert* + *spend cap* en Cloud Run functions, **o** asumir
      explícitamente el techo de 50k lecturas/día.
      → Blaze habilitado en ambos (04/11/2026). No existe un *spend cap* global en GCP: el
      techo se arma con `maxInstances` (10) + presupuesto con alertas + cuotas. El
      presupuesto es el ítem siguiente.
- [ ] Presupuesto con alertas en Cloud Billing + revisar `maxInstances` (hoy 10 en
      `codebase-functions/index.js`). No existe un "spend cap" general en GCP: el control
      real es presupuesto + alertas + límites de instancia + cuotas.
      → `maxInstances`: se mantiene en **10** (revisado 04/11/2026). Ya es un techo, no un
      objetivo de escalado, y con una sola función callable el gasto máximo está acotado.
      Bajar el número solo agrega 429 en horas pico de inscripciones.
      → **Pendiente (consola):** Billing → Budgets & alerts → Create budget → scope
      "Projects": `sige-esmn` + `prueba1-esmn`, monto USD 5, alertas 50/90/100 % al email
      de la escuela. Los presupuestos **no** cortan el servicio: avisan.
- [x] Exportar y borrar `ofertaAcademica_2026` (colección huérfana de `sige-esmn`).
      → Hecho (04/11/2026): se borró **sin export** (decisión explícita: la app lee
      `ofertaAcademica/{ciclo}`, nunca esa colección) con
      `firebase firestore:delete --recursive -f ofertaAcademica_2026 --project sige-esmn`,
      usando la sesión local de `informaticaesmn@gmail.com`. Verificado después con
      `--debug`: el `runQuery` sobre la ruta no devuelve documentos (solo `readTime`).
- [x] Evaluar si `functions` debe sumarse al workflow de `main` (hoy se deploya a mano).
      → Evaluado (04/11/2026): se creó `.github/workflows/deploy-functions.yml`
      (`workflow_dispatch`, elegís staging/producción). Producción **solo** se acepta si el
      run se lanza desde `main` (paso que aborta el run en otra rama).
      No se suma al push de `main` todavía: el secreto de producción no está probado para
      functions y un fallo ahí no debe bloquear el release. Cuando se valide el primer
      deploy manual, se puede evaluar pasarlo a automático.
      → **Pendiente:** lanzar el workflow con `entorno=production` desde `main` una vez. Si
      la key de producción no tiene permisos de functions, el error esperable es 403; la
      solución es darle a `firebase-adminsdk-9p782@sige-esmn` `Cloud Functions Developer`
      + `Service Account User` (y los que pida el error de Cloud Run/Cloud Build).

---

## 6. Guardarraíles (evitar el próximo incidente)

El bug de v0.8.27 fue posible porque `main` publicaba reglas y `dev` no. Con dos proyectos,
el riesgo se multiplica: un `firebase deploy` en el proyecto equivocado pisa producción.

Implementado:

- Los workflows usan `--project` **explícito y literal**; nunca una variable que pueda venir
  vacía.
- `.github/scripts/deploy-firebase.sh` valida dos cosas antes de publicar: que el proyecto
  sea conocido (`sige-esmn` | `prueba1-esmn`) y que la key del secreto pertenezca a ese
  proyecto. Probado el 04/11/2026: con la key de staging y `sige-esmn` aborta con
  *"Credenciales cruzadas"* sin tocar nada.
- `.github/workflows/deploy-functions.yml` exige `main` para desplegar en producción; un
  dispatch desde `dev` con `entorno=production` termina en rojo.
- `.firebaserc` tiene `default` = `prueba1-esmn`: un deploy local sin `--project` cae en
  staging, no en producción.
- El deploy de reglas es **gate** en `main` y en `dev` (si falla, no se publica el hosting).
- Secrets separados por entorno; los de staging llevan sufijo `_STAGING`.

Descartado a propósito:

- No hay `scripts/preflight.js` ni `npm run deploy:*`. Se evaluó y se prefirió no ofrecer un
  atajo de deploy local: todo pasa por GitHub Actions, donde el proyecto es literal y el
  secreto está acotado. Un script local que deploya producción es justamente el riesgo que
  este documento intenta evitar.

---

## 7. Decisiones abiertas

| # | Pregunta | Resolución |
|---|---|---|
| 1 | ¿A o B? | **A**: `prueba1-esmn` es staging (04/11/2026). |
| 2 | ¿Spark o Blaze en producción? | **Blaze en ambos** (04/11/2026). Con presupuesto + alertas (Fase 4). |
| 3 | ¿Funciones en el workflow de `main`? | **No por ahora**: workflow manual con guarda de rama. Se reevalúa tras el primer deploy real. |
| 4 | ¿Vercel sigue siendo el front de `dev`? | **Sí**, con env vars de staging. Producción es Firebase Hosting. |
| 5 | ¿Staging comparte código con `dev` en todo momento? | **Sí**: `dev` → staging, `main` → producción. |

---

## 8. Costos

| Concepto | Antes | Con staging separado |
|---|---|---|
| Firestore | 1 proyecto (50k lecturas/día gratis) | 2 proyectos (50k c/u) |
| Functions | 1 proyecto, deploy manual | 2 proyectos (Blaze), staging por workflow + producción manual |
| Hosting | `sige-esmn.web.app` | + `prueba1-esmn.web.app` (incluido) |
| Dinero | $0 | $0 dentro del *no-cost usage*; el riesgo es una factura sorpresa → presupuesto con alertas |

En Blaze, el *no-cost usage* sigue siendo por proyecto; lo que se comparte es la forma de
pago, no la cuota. No existe un *spend cap* general: el control real es presupuesto +
alertas + `maxInstances` + cuotas.

---

## 9. Anexo: comandos de verificación

```bash
# Ver los proyectos y sus alias
npx firebase projects:list
cat .firebaserc

# Ver qué reglas están publicadas (requiere token con scope cloud-platform)
curl -H "Authorization: Bearer $TOKEN" \
     -H "x-goog-user-project: sige-esmn" \
     https://firebaserules.googleapis.com/v1/projects/sige-esmn/releases

# Deploy de reglas a staging (alias ya existente). En la práctica, el deploy lo hace
# el workflow de push a `dev`; esto es solo para probar a mano.
npx firebase deploy --only firestore:rules --project staging

# Qué proyecto usaría un deploy local sin --project (debe ser prueba1-esmn)
npx firebase use

# Emuladores (no consume cuota, no toca ningún proyecto)
npm run test:integration
```

---

## 10. Referencias

- Cuotas de Firestore (una base gratis por proyecto): <https://firebase.google.com/docs/firestore/quotas>
- Requisito de Blaze para Functions: <https://firebase.google.com/docs/functions/quotas>
- Planes de precios: <https://firebase.google.com/docs/projects/billing/firebase-pricing-plans>