// src/composables/academico/usePlanesPublicos.js
//
// Lógica de la vista pública de planes de estudio.
//
// Extrae del `script setup` de `src/views/auth/PlanesEstudioPublico.vue` el
// catálogo público, la carga del plan, la selección de una materia, la
// sincronización con la URL (`?plan=...&materia=...`) y la vuelta al origen
// (login o estado anterior del usuario). La vista queda como consumidora, en
// línea con AGENTS.md §3.
//
// El catálogo se reutiliza de `useCatalogoPlanes.js` (mismo `fetch` que la
// app ya calienta en `main.js`); la carga del detalle del plan, de
// `usePlanesEstudio.js`.
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/auth/useAuth.js'
import { useCatalogoPlanes } from '@/composables/academico/useCatalogoPlanes.js'
import { usePlanesEstudio } from '@/composables/academico/usePlanesEstudio.js'
import { anioDeMateria } from '@/utils/planes.js'

/**
 * Catálogo de respaldo si `planes.json` no se puede leer. Permite que la
 * vidriera siga siendo navegable aunque el `fetch` falle.
 * @type {ReadonlyArray<{ codigo: string, nombre: string }>}
 */
export const PLANES_FALLBACK = Object.freeze([
  { codigo: '662', nombre: '662 Profesorado de Música' },
  { codigo: '662G', nombre: '662G Profesorado de Música con orientación en Guitarra' },
  { codigo: '663', nombre: '663 Profesorado de Música con orientación en Dirección Coral' },
  { codigo: '664', nombre: '664 Profesorado de Música con orientación en Canto Lírico' },
  { codigo: '665', nombre: '665 Profesorado de Música con orientación en Dirección Orquestal' },
  { codigo: '666', nombre: '666 Profesorado de Música con orientación en Composición' },
  { codigo: '389', nombre: '389 Cantante' },
  { codigo: '390', nombre: '390 Compositor' },
  { codigo: '391', nombre: '391 Director Coral' },
  { codigo: '392', nombre: '392 Director Orquestal' },
  { codigo: '393', nombre: '393 Instrumentista' },
  { codigo: '708', nombre: '708 Técnico Superior en Sonido' }
])

/**
 * Composable de la vista pública de planes.
 */
export function usePlanesPublicos() {
  const route = useRoute()
  const router = useRouter()
  const { user } = useAuth()
  const { catalogo, cargarCatalogoPlanes } = useCatalogoPlanes()
  const { planes, planSeleccionado, loading, error, cargarPlanes } = usePlanesEstudio()

  /** Código del plan abierto (binding del selector). */
  const planId = ref('')
  /** Código de la materia abierta en el detalle. */
  const codigoSeleccionado = ref('')
  /** Alterna lista/detalle en pantallas chicas. */
  const vistaMobile = ref('lista')
  /** `true` mientras se carga el catálogo público. */
  const cargandoCatalogo = ref(false)
  /** `true` si el catálogo cayó al listado de respaldo. */
  const usandoFallback = ref(false)

  /** Hay sesión activa: cambia la etiqueta y el destino del botón "volver". */
  const esAutenticado = computed(() => user.value != null)

  /** `true` mientras se resuelve el catálogo o el plan. */
  const cargando = computed(() => cargandoCatalogo.value || loading.value)

  /** Planes para el selector (catálogo normalizado o respaldo). */
  const planesDisponibles = computed(() => {
    const lista = Object.values(catalogo.value || {})
    if (lista.length > 0) return lista
    return usandoFallback.value ? PLANES_FALLBACK : []
  })

  /** Código canónico del plan abierto. */
  const planCodigo = computed(() => planSeleccionado.value?.plan || planId.value)

  /** Nombre para mostrar: el del catálogo si existe, si no el del JSON. */
  const nombrePlan = computed(() => {
    const delCatalogo = planesDisponibles.value.find((plan) => plan.codigo === planCodigo.value)
    return delCatalogo?.nombre || planSeleccionado.value?.nombre || planCodigo.value
  })

  /**
   * Materias como array plano, con año derivado del código y ordenadas por año
   * y código natural. Es lo que consume `ListaMaterias`.
   */
  const materiasOrdenadas = computed(() => {
    const materias = planSeleccionado.value?.materias
    if (!materias) return []

    return Object.entries(materias)
      .map(([codigo, materia]) => {
        const anioDerivado = anioDeMateria(codigo)
        const anio = Number.isInteger(materia?.anio)
          ? materia.anio
          : Number.isInteger(anioDerivado)
            ? anioDerivado
            : -1
        return { codigo, ...materia, anio }
      })
      .sort((a, b) => {
        if (a.anio !== b.anio) return a.anio - b.anio
        return String(a.codigo).localeCompare(String(b.codigo), 'es', { numeric: true })
      })
  })

  /** Materia abierta en el detalle, con su código incluido. */
  const materiaSeleccionada = computed(() => {
    const materia = planSeleccionado.value?.materias?.[codigoSeleccionado.value]
    return materia ? { codigo: codigoSeleccionado.value, ...materia } : null
  })

  /** Cantidad de materias del plan. */
  const materiasCount = computed(() => materiasOrdenadas.value.length)

  /** Cantidad de años distintos del plan. */
  const aniosCount = computed(
    () =>
      new Set(
        materiasOrdenadas.value
          .map((materia) => materia.anio)
          .filter((anio) => anio >= 0)
      ).size
  )

  /** Indica si el plan tiene materias de pregrado (año 0). */
  const hayPregrado = computed(() =>
    materiasOrdenadas.value.some((materia) => materia.anio === 0)
  )

  /** Refleja plan y materia en la URL (`?plan=...&materia=...`) sin recargar. */
  function actualizarQuery() {
    const query = { ...route.query }
    if (planId.value) query.plan = planId.value
    else delete query.plan
    if (codigoSeleccionado.value) query.materia = codigoSeleccionado.value
    else delete query.materia
    router.replace({ name: 'PlanesEstudioPublico', query }).catch(() => {})
  }

  /**
   * Abre un plan, restaura la materia de la URL (si corresponde) y deja la
   * selección en la primera materia cuando no hay una válida.
   * @param {string} codigo
   * @param {{ usarMateriaDeUrl?: boolean }} [opciones]
   * @returns {Promise<{ exito: boolean, datos: Object|null, error: any }>}
   */
  async function abrirPlan(codigo, { usarMateriaDeUrl = false } = {}) {
    codigoSeleccionado.value = ''
    vistaMobile.value = 'lista'

    try {
      await cargarPlanes(codigo)
      const plan = planes.value.find((p) => p.plan === codigo) || null
      planSeleccionado.value = plan
      planId.value = codigo

      if (!plan) {
        actualizarQuery()
        return { exito: false, datos: null, error: error.value }
      }

      const materiaUrl = usarMateriaDeUrl ? String(route.query?.materia || '') : ''
      if (materiaUrl && plan.materias?.[materiaUrl]) {
        codigoSeleccionado.value = materiaUrl
        vistaMobile.value = 'detalle'
      } else {
        codigoSeleccionado.value = materiasOrdenadas.value[0]?.codigo || ''
      }
      actualizarQuery()
      return { exito: true, datos: plan, error: null }
    } catch (e) {
      planSeleccionado.value = null
      codigoSeleccionado.value = ''
      return { exito: false, datos: null, error: e }
    }
  }

  /** Abre el plan elegido en el selector. */
  async function cambiarPlan() {
    return abrirPlan(planId.value)
  }

  /**
   * Selecciona una materia del plan. Ignora códigos que no pertenezcan al plan
   * (por ejemplo, una correlativa fuera de la estructura).
   * @param {string} codigo
   * @returns {boolean} `true` si la selección se aplicó.
   */
  function seleccionarMateria(codigo) {
    const code = String(codigo || '')
    if (!planSeleccionado.value?.materias?.[code]) return false

    codigoSeleccionado.value = code
    vistaMobile.value = 'detalle'
    actualizarQuery()
    return true
  }

  /** Vuelve a la lista de materias en mobile. */
  function volverALista() {
    vistaMobile.value = 'lista'
  }

  /**
   * Vuelve al origen: si hay historial en la SPA regresa al estado anterior
   * (p. ej. el tablero del rol); si se entró directo, va a la raíz (login, o
   * el dashboard si hay sesión).
   * @returns {void}
   */
  function volver() {
    if (typeof window !== 'undefined' && window.history?.state?.back) {
      router.back()
      return
    }
    router.push('/')
  }

  /**
   * Carga el catálogo y abre el plan de la URL (o el primero del catálogo).
   * @returns {Promise<void>}
   */
  async function inicializar() {
    cargandoCatalogo.value = true
    const resultado = await cargarCatalogoPlanes()
    usandoFallback.value = !resultado.exito
    cargandoCatalogo.value = false

    const desdeUrl = String(route.query?.plan || '')
    const lista = planesDisponibles.value
    const objetivo = lista.some((plan) => plan.codigo === desdeUrl)
      ? desdeUrl
      : lista[0]?.codigo || ''

    if (objetivo) await abrirPlan(objetivo, { usarMateriaDeUrl: true })
  }

  return {
    // Estado
    planesDisponibles,
    planSeleccionado,
    planId,
    codigoSeleccionado,
    vistaMobile,
    cargando,
    error,
    esAutenticado,

    // Derivados
    planCodigo,
    nombrePlan,
    materiasOrdenadas,
    materiaSeleccionada,
    materiasCount,
    aniosCount,
    hayPregrado,

    // Acciones
    inicializar,
    abrirPlan,
    cambiarPlan,
    seleccionarMateria,
    volverALista,
    volver
  }
}
