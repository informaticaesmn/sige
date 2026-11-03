<!-- src/views/coordinacion/CargaDatos.vue -->
<template>
  <div class="bg-stone-100 min-h-screen font-sans">
    <div class="container mx-auto px-4 py-6 max-w-4xl">
      <h1 class="text-2xl font-medium mb-2">Carga de Datos</h1>
      <p class="text-muted mb-6">
        Importación de usuarios, oferta académica y planes de estudio.
      </p>

      <!-- Guardia extra en UI: la seguridad real la dan las reglas de Firestore -->
      <div v-if="!puedeCargar" class="alert alert-danger mb-6">
        Esta sección está reservada al rol de Coordinación.
      </div>

      <template v-else>
        <!-- ============================ USUARIOS ============================ -->
        <section class="card mb-6">
          <h2 class="card-header">1. Importar usuarios</h2>
          <p class="text-muted mb-4">
            Columnas esperadas: <code>dni, nombre, apellido, email, roles, plan</code>.
            Los usuarios quedan en estado <strong>pendiente_registro</strong>: se registran solos
            con su email. Cualquier fila inválida cancela la importación completa.
          </p>

          <label class="form-label" for="archivo-usuarios">Archivo CSV de usuarios</label>
          <input
            id="archivo-usuarios"
            type="file"
            accept=".csv,text/csv"
            class="form-input"
            @change="onArchivoUsuarios"
          />

          <div class="mt-4">
            <button
              class="btn btn-primary"
              :disabled="!textoUsuarios || loadingUsuarios"
              @click="importarUsuarios"
            >
              {{ loadingUsuarios ? 'Importando...' : 'Importar usuarios' }}
            </button>
          </div>

          <!-- Resultado -->
          <div v-if="resultadoUsuarios" class="mt-4 space-y-2">
            <div v-if="resultadoUsuarios.exito" class="alert alert-info">
              ✅ Se importaron <strong>{{ resultadoUsuarios.datos.importados }}</strong>
              usuario(s) en {{ resultadoUsuarios.datos.lotes }} lote(s) atómico(s).
            </div>
            <div v-else class="alert alert-danger">
              <p>No se importó ningún usuario.</p>
              <ul v-if="resultadoUsuarios.datos?.errores?.length" class="mt-2 text-sm list-disc pl-5">
                <li v-for="(fila, i) in resultadoUsuarios.datos.errores.slice(0, 10)" :key="i">
                  Fila {{ fila.fila }} ({{ fila.email }}): {{ fila.detalle.join(' — ') }}
                </li>
                <li v-if="resultadoUsuarios.datos.errores.length > 10">
                  …y {{ resultadoUsuarios.datos.errores.length - 10 }} error(es) más.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ============================= OFERTA ============================= -->
        <section class="card mb-6">
          <h2 class="card-header">2. Cargar oferta académica</h2>
          <p class="text-muted mb-4">
            Columnas esperadas: <code>ciclo_lectivo, materia_codigo, secuencia_codigo, cupo,
            horario, aula, docente_nombre, periodo_inicio, periodo_fin</code> (+ opcionales
            <code>materia_nombre</code>, <code>etapa_nombre</code>, <code>etapa_descripcion</code>).
            <strong>Reemplaza por completo</strong> la oferta del ciclo.
          </p>

          <label class="form-label" for="ciclo-destino">Ciclo destino (ej: 2026-1)</label>
          <input id="ciclo-destino" v-model="cicloDestino" type="text" class="form-input" placeholder="2026-1" />

          <label class="form-label mt-4" for="archivo-oferta">Archivo CSV de oferta</label>
          <input
            id="archivo-oferta"
            type="file"
            accept=".csv,text/csv"
            class="form-input"
            @change="onArchivoOferta"
          />

          <div class="mt-4 flex flex-wrap gap-2">
            <button
              class="btn btn-primary"
              :disabled="!textoOferta || !cicloDestino || loadingOferta"
              @click="publicarOferta"
            >
              {{ loadingOferta ? 'Publicando...' : 'Publicar oferta del ciclo' }}
            </button>
            <button
              class="btn btn-secondary"
              :disabled="!cicloDestino || loadingOferta"
              @click="limpiarOferta"
            >
              Borrar oferta del ciclo
            </button>
          </div>

          <!-- Resultado -->
          <div v-if="resultadoOferta" class="mt-4 space-y-2">
            <div v-if="resultadoOferta.exito" class="alert alert-info">
              ✅ Oferta del ciclo <strong>{{ resultadoOferta.datos.ciclo }}</strong> publicada:
              {{ resultadoOferta.datos.etapas }} etapa(s), {{ resultadoOferta.datos.materias }}
              materia(s), {{ resultadoOferta.datos.comisiones }} comisión(es).
            </div>
            <div v-else class="alert alert-danger">
              <p>{{ resultadoOferta.error?.message || 'No se pudo publicar la oferta.' }}</p>
              <ul v-if="resultadoOferta.datos?.errores?.length" class="mt-2 text-sm list-disc pl-5">
                <li v-for="(fila, i) in resultadoOferta.datos.errores.slice(0, 10)" :key="i">
                  Fila {{ fila.fila }} ({{ fila.materia }}): {{ fila.detalle.join(' — ') }}
                </li>
                <li v-if="resultadoOferta.datos.errores.length > 10">
                  …y {{ resultadoOferta.datos.errores.length - 10 }} error(es) más.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ============================ PLANES (JSON) ============================ -->
        <section class="card mb-6">
          <h2 class="card-header">3. Planes de estudio (JSON)</h2>
          <p class="text-muted mb-4">
            Gestión de borradores en la nube. Importa un JSON para crear un borrador o continúa uno guardado.
          </p>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Listado -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-semibold text-stone-700">Borradores guardados</h3>
                <button class="btn btn-secondary text-xs" :disabled="cargandoLista" @click="refrescarLista">
                  {{ cargandoLista ? '...' : 'Actualizar' }}
                </button>
              </div>
              <div v-if="errorLista" class="alert alert-danger text-xs mb-3">
                {{ errorLista }}
              </div>
              <div v-if="planesGuardados.length === 0" class="text-xs text-stone-500 italic p-3 bg-stone-100 rounded">
                No hay borradores guardados.
              </div>
              <div v-else class="overflow-x-auto border border-stone-200 rounded">
                <table class="min-w-full text-left text-xs">
                  <thead class="bg-stone-100 font-semibold text-stone-600">
                    <tr>
                      <th class="px-2 py-1.5">Código</th>
                      <th class="px-2 py-1.5">Estado</th>
                      <th class="px-2 py-1.5">Actualizado</th>
                      <th class="px-2 py-1.5 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="plan in planesGuardados" :key="plan.codigo" class="border-b border-stone-100 hover:bg-stone-50">
                      <td class="px-2 py-1.5 font-mono font-medium">{{ plan.codigo }}</td>
                      <td class="px-2 py-1.5">{{ ETIQUETAS_ESTADO_REVISION[plan.estadoRevision] || 'En edición' }}</td>
                      <td class="px-2 py-1.5 text-stone-500">{{ formatearFechaHora(plan.actualizadoEn) }}</td>
                      <td class="px-2 py-1.5 text-center flex items-center justify-center gap-1">
                        <router-link
                          :to="{ name: 'CoordinacionEditorPlanes', query: { abrir: plan.codigo } }"
                          class="btn-link font-medium"
                        >
                          Abrir
                        </router-link>
                        <button class="btn-link text-red-600" @click="onEliminarBorrador(plan.codigo)">×</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Importación -->
            <div>
              <h3 class="text-sm font-semibold text-stone-700 mb-2">Importar nuevo JSON</h3>
              <input type="file" accept=".json" class="form-input text-xs w-full bg-white mb-3" @change="onArchivoJSON" />
              <div v-if="mensajeGuardado" class="alert alert-info text-xs p-2">
                {{ mensajeGuardado }}
              </div>
            </div>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/composables/auth/useAuth.js'
import { useImportarUsuarios } from '@/composables/usuarios/useImportarUsuarios.js'
import { useCargaOferta } from '@/composables/inscripciones/useCargaOferta.js'
import { useGestionPlanes } from '@/composables/academico/useGestionPlanes.js'
import { useCatalogoPlanes } from '@/composables/academico/useCatalogoPlanes.js'
import { ETIQUETAS_ESTADO_REVISION } from '@/composables/academico/usePlanesPendientes.js'
import { formatearFechaHora } from '@/utils/fechas.js'

// --- Permisos en UI (la seguridad real la aplican las reglas de Firestore) ---
const { user } = useAuth()
const puedeCargar = computed(() =>
  user.value?.roles?.some((r) => r === 'coordinacion' || r === 'admin')
)

// --- Carga de usuarios ---
const { importarUsuariosDesdeCSV, loading: loadingUsuarios } = useImportarUsuarios()
const textoUsuarios = ref(null)
const resultadoUsuarios = ref(null)

// Catálogo de planes: única fuente de códigos, nombres y disponibilidad.
const { catalogo, asegurarCatalogo } = useCatalogoPlanes()
const nombresDePlanes = computed(() =>
  Object.fromEntries(
    Object.values(catalogo.value).map((plan) => [plan.codigo, plan.nombre || plan.codigo])
  )
)

onMounted(async () => {
  await asegurarCatalogo()
})

async function onArchivoUsuarios(event) {
  resultadoUsuarios.value = null
  const archivo = event.target.files?.[0]
  textoUsuarios.value = archivo ? await archivo.text() : null
}

async function importarUsuarios() {
  resultadoUsuarios.value = await importarUsuariosDesdeCSV(textoUsuarios.value, {
    nombresDePlanes: nombresDePlanes.value
  })
}

// --- Carga de oferta ---
const { cargarOfertaDesdeCSV, borrarOferta, loading: loadingOferta } = useCargaOferta()
const cicloDestino = ref('')
const textoOferta = ref(null)
const resultadoOferta = ref(null)

async function onArchivoOferta(event) {
  resultadoOferta.value = null
  const archivo = event.target.files?.[0]
  textoOferta.value = archivo ? await archivo.text() : null
}

async function publicarOferta() {
  resultadoOferta.value = await cargarOfertaDesdeCSV(textoOferta.value, {
    ciclo: cicloDestino.value.trim()
  })
}

async function limpiarOferta() {
  const confirmado = window.confirm(
    `¿Borrar por completo la oferta del ciclo ${cicloDestino.value.trim()}? Los estudiantes dejarían de verla.`
  )
  if (!confirmado) return

  const res = await borrarOferta(cicloDestino.value.trim())
  resultadoOferta.value = res.exito
    ? { exito: true, datos: { ciclo: res.datos.ciclo, etapas: 0, materias: 0, comisiones: 0 } }
    : res
}

// --- Gestión de Planes (JSON) ---
// Toda la orquestación (listar, importar, guardar, eliminar) vive en el
// composable; la vista solo maneja el input de archivo y el feedback.
const {
  planesGuardados,
  cargandoLista,
  errorLista,
  refrescarLista,
  importarBorradorDesdeTexto,
  eliminarBorrador
} = useGestionPlanes()

const mensajeGuardado = ref('')

async function onArchivoJSON(event) {
  const archivo = event.target.files?.[0]
  if (!archivo) return

  mensajeGuardado.value = ''
  const texto = await archivo.text()

  const resultado = await importarBorradorDesdeTexto(texto, {
    uid: user.value?.uid || '',
    email: user.value?.email || ''
  })

  mensajeGuardado.value = resultado.exito
    ? `¡Plan ${resultado.datos.codigo} importado y guardado como borrador!`
    : `No se pudo importar el JSON: ${resultado.error?.message}`
}

async function onEliminarBorrador(codigo) {
  if (!window.confirm(`¿Eliminar borrador del plan ${codigo}?`)) return
  const resultado = await eliminarBorrador(codigo)
  if (!resultado.exito) {
    errorLista.value = resultado.error?.message || 'No se pudo eliminar el borrador.'
  }
}

onMounted(() => {
  refrescarLista()
})
</script>
