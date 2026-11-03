# Plan: separar entornos (dev/staging vs producción)

> **Estado:** propuesto (03/11/2026). Pendiente de decisión. **No hay cambios de código
> propuestos acá todavía**: primero hay que elegir el proyecto de staging.
> **Objetivo:** que las pruebas de desarrollo no consuman la cuota ni los datos de producción,
> y que las reglas de Firestore de `dev` se desplieguen siempre.
> **Datos verificados:** 03/11/2026 con la CLI de Firebase y las APIs de Firebase Rules,
> Identity Toolkit, Cloud Functions v2, Hosting, Firestore y Cloud Billing.

---

## 0. Situación actual (verificada)

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

- [ ] Confirmar en la consola el plan real (Spark/Blaze) de `sige-esmn` y `prueba1-esmn`.
- [ ] Decidir titularidad: ¿producción sigue en `informaticaesmn@gmail.com`?
- [ ] Decidir si se usa `prueba1-esmn` (A) o se crea uno nuevo (B).
- [ ] Confirmar en Vercel cuál es la **Production Branch** (si es `dev`, hoy el "producción"
      de Vercel está apuntando a datos de producción desde el código de `dev`).

### Fase 1 — Limpiar staging

- [ ] Exportar/archivar los 4 usuarios de Auth y la colección `usuarios` de `prueba1-esmn`
      (por si alguno sirve).
- [ ] Borrar los usuarios de Auth.
- [ ] Vaciar `usuarios`.
- [ ] Crear una service account key para `prueba1-esmn`; guardarla en `secrets/`
      (ya está en `.gitignore`) y **nunca** versionarla.

### Fase 2 — Config multi-proyecto

- [ ] `.firebaserc` con alias:

  ```json
  { "projects": { "default": "sige-esmn", "production": "sige-esmn", "staging": "prueba1-esmn" } }
  ```

- [ ] Workflow `.github/workflows/firebase-hosting-dev.yml` (push a `dev`): `firestore:rules`
      + `functions` + `hosting` contra `--project staging`, con el secreto
      `FIREBASE_SERVICE_ACCOUNT_KEY_STAGING`.
- [ ] Vercel: `Production` → proyecto de producción; `Preview` → staging.
- [ ] Documentar en `README.md` qué entorno usa cada rama.

### Fase 3 — Que staging sea usable

- [ ] `scripts/seed-dev.js`: un usuario por rol con sus custom claims, una oferta de prueba y
      un borrador de plan. Sin esto, cada purga deja staging inservible.
- [ ] **Nunca** datos reales de estudiantes en staging (`data/*.csv` ya está ignorado por
      contener datos personales).

### Fase 4 — Endurecer producción

- [ ] Habilitar Blaze + *budget alert* + *spend cap* en Cloud Run functions, **o** asumir
      explícitamente el techo de 50k lecturas/día.
- [ ] Exportar y borrar `ofertaAcademica_2026` (colección huérfana).
- [ ] Evaluar si `functions` debe sumarse al workflow de `main` (hoy se deploya a mano).

---

## 6. Guardarraíles (evitar el próximo incidente)

El bug de v0.8.27 fue posible porque `main` publicaba reglas y `dev` no. Con dos proyectos,
el riesgo se multiplica: un `firebase deploy` en el proyecto equivocado pisa producción.

- Los workflows usan `--project` **explícito y literal**; nunca una variable que pueda venir vacía.
- `scripts/preflight.js` imprime `proyecto → entorno` y aborta si el branch no coincide.
- Comandos documentados: `npm run deploy:staging` / `npm run deploy:production`. Nada de
  `firebase deploy` a mano.
- `firebase use staging` como default local en la rama `dev`.
- El deploy de reglas sigue siendo **gate** en `main` (ya implementado en v0.8.28).

---

## 7. Decisiones abiertas

| # | Pregunta | Impacto |
|---|---|---|
| 1 | ¿A o B? | Define todo el resto del plan |
| 2 | ¿Spark o Blaze en producción? | Si es Spark, hay riesgo de caída por cuota; si es Blaze, hay que poner alertas |
| 3 | ¿Funciones en el workflow de `main`? | Hoy un cambio de `registrarUsuario` requiere deploy manual |
| 4 | ¿Vercel sigue siendo el front de `dev`? | Con hosting de staging (`prueba1-esmn.web.app`) se podría abandonar Vercel en dev y simplificar |
| 5 | ¿Staging comparte código con `dev` en todo momento? | Es lo natural: `dev` → staging, `main` → producción |

---

## 8. Costos

| Concepto | Ahora | Con staging separado |
|---|---|---|
| Firestore | 1 proyecto Spark (50k lecturas/día) | 2 proyectos Spark (50k c/u) |
| Functions | 1 deploy manual | 1 deploy manual + 1 por workflow (requiere Blaze si se actualiza) |
| Hosting | `sige-esmn.web.app` | + `prueba1-esmn.web.app` (incluido) |
| Dinero | $0 | $0, salvo que se habilite Blaze para Functions |

En Blaze, el *no-cost usage* sigue siendo por proyecto; lo que se comparte es la forma de
pago, no la cuota. Con *budget alerts* y *spend cap* el riesgo de factura sorpresa es bajo.

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

# Deploy a staging (cuando exista el alias)
npx firebase deploy --only firestore:rules --project staging

# Emuladores (no consume cuota, no toca ningún proyecto)
npm run test:integration
```

---

## 10. Referencias

- Cuotas de Firestore (una base gratis por proyecto): <https://firebase.google.com/docs/firestore/quotas>
- Requisito de Blaze para Functions: <https://firebase.google.com/docs/functions/quotas>
- Planes de precios: <https://firebase.google.com/docs/projects/billing/firebase-pricing-plans>