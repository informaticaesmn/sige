<!-- src/views/coordinacion/CargaMasiva.vue -->
<template>
  <div class="bg-stone-100 min-h-screen font-sans">
    <div class="container mx-auto px-4 py-6 max-w-4xl">
      <h1 class="text-2xl font-medium mb-2">Carga Masiva</h1>
      <p class="text-muted mb-6">
        Importación de usuarios y oferta académica desde archivos CSV (formato Google Sheets).
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
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/composables/auth/useAuth.js'
import {
  useImportarUsuarios,
  mapaDePlanesDesdeJson
} from '@/composables/usuarios/useImportarUsuarios.js'
import { useCargaOferta } from '@/composables/inscripciones/useCargaOferta.js'

// --- Permisos en UI (la seguridad real la aplican las reglas de Firestore) ---
const { user } = useAuth()
const puedeCargar = computed(() =>
  user.value?.roles?.some((r) => r === 'coordinacion' || r === 'admin')
)

// --- Carga de usuarios ---
const { importarUsuariosDesdeCSV, loading: loadingUsuarios } = useImportarUsuarios()
const textoUsuarios = ref(null)
const resultadoUsuarios = ref(null)

// Mapa { código de plan: nombre completo } desde public/planes/planes.json
const nombresDePlanes = ref({})

onMounted(async () => {
  try {
    const respuesta = await fetch('/planes/planes.json')
    if (respuesta.ok) {
      nombresDePlanes.value = mapaDePlanesDesdeJson(await respuesta.json())
    }
  } catch (e) {
    console.error('No se pudo cargar planes.json (los planes quedarán como códigos):', e)
  }
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
</script>
