import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useImportarUsuarios } from '@/composables/usuarios/useImportarUsuarios.js'
import { resetCatalogoPlanes, setCatalogoPlanes } from '@/utils/planes.js'
import { asegurarCatalogo } from '@/composables/academico/useCatalogoPlanes.js'

// Operaciones de escritura capturadas para poder inspeccionar los documentos.
const { escrituras } = vi.hoisted(() => ({ escrituras: [] }))

vi.mock('@/utils/csv.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    parsearCSVUsuarios: vi.fn((texto) => {
      if (!texto) return []
      const filas = texto.split('\n').filter((line) => line.trim() !== '')
      // Saltar la fila de encabezado (primera fila)
      return filas.slice(1).map((line) => {
        const [dni, nombre, apellido, email, plan, fechaInscripcion, numeroLegajo] = line.split(',')
        return {
          dni: dni?.trim(),
          nombre: nombre?.trim(),
          apellido: apellido?.trim(),
          email: email?.trim(),
          plan: plan?.trim(),
          fecha_inscripcion: fechaInscripcion?.trim(),
          numero_legajo: numeroLegajo?.trim()
        }
      })
    })
  }
})

vi.mock('@/composables/academico/useCatalogoPlanes.js', () => ({
  asegurarCatalogo: vi.fn(async () => ({ exito: true, datos: {}, error: null }))
}))

vi.mock('@/config/firebase.js', () => ({
  db: {}
}))

vi.mock('firebase/firestore/lite', () => ({
  doc: vi.fn((db, collection, id) => ({ collection, id })),
  writeBatch: vi.fn(() => ({
    set: vi.fn((ref, data) => escrituras.push({ ref, data })),
    commit: vi.fn(() => Promise.resolve())
  })),
  serverTimestamp: vi.fn(() => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }))
}))

/** Detalles de plan que devuelve el `fetch` simulado. */
const PLANES = {
  '662': {
    plan: '662',
    nombre: '662 Profesorado de Música',
    materias: { '662-0.1': { nombre: 'Audioperceptiva' } }
  },
  '708': {
    plan: '708',
    nombre: '708 Técnico Superior en Sonido',
    materias: { '708-1.1': { nombre: 'Acústica' } }
  }
}

describe('useImportarUsuarios', () => {
  beforeEach(() => {
    escrituras.length = 0
    resetCatalogoPlanes()
    setCatalogoPlanes({
      planes: [
        { codigo: '662', nombre: '662 Profesorado de Música', disponible: true },
        { codigo: '708', nombre: '708 Técnico Superior en Sonido', disponible: true },
        { codigo: '666', nombre: '666 Composición', disponible: false }
      ]
    })
    vi.mocked(asegurarCatalogo).mockResolvedValue({ exito: true, datos: {}, error: null })

    vi.stubGlobal(
      'fetch',
      vi.fn(async (ruta) => {
        const codigo = String(ruta).match(/\/planes\/(.+)\.json$/)?.[1]
        const json = PLANES[codigo]
        return json
          ? { ok: true, json: async () => json }
          : { ok: false, json: async () => ({}) }
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    resetCatalogoPlanes()
  })

  describe('importarUsuariosDesdeCSV', () => {
    it('debe importar usuarios válidos', async () => {
      const csv = `dni,nombre,apellido,email,plan,fecha_inscripcion,numero_legajo
37348389,María José,ORTEGA,majo@ejemplo.com,662,2026-03-02,
30941843,Victoria,MACLEAN,prof.vmaclean@gmail.com,708,2025-08-11,`

      const { importarUsuariosDesdeCSV } = useImportarUsuarios()
      const resultado = await importarUsuariosDesdeCSV(csv, { nombresDePlanes: {} })

      expect(resultado.exito).toBe(true)
      expect(resultado.datos.importados).toBe(2)
      expect(resultado.datos.totalFilas).toBe(2)
      expect(resultado.datos.lotes).toBe(1)
      expect(resultado.error).toBeNull()
    })

    it('calcula el estado inicial desde el detalle del plan', async () => {
      const csv = `dni,nombre,apellido,email,plan,fecha_inscripcion,numero_legajo
37348389,María José,ORTEGA,majo@ejemplo.com,662,2026-03-02,
30941843,Victoria,MACLEAN,prof.vmaclean@gmail.com,708,2025-08-11,`

      const { importarUsuariosDesdeCSV } = useImportarUsuarios()
      await importarUsuariosDesdeCSV(csv, { nombresDePlanes: {} })

      const usuarios = escrituras
        .map(({ ref, data }) => ({ ref, data }))
        .filter(({ ref }) => ref.collection === 'usuarios')

      expect(usuarios).toHaveLength(2)
      const porEmail = Object.fromEntries(usuarios.map((u) => [u.data.email, u.data]))
      // 662 tiene materias de año 0 → ingresante.
      expect(porEmail['majo@ejemplo.com'].planes['662'].estado).toBe('ingresante')
      // 708 no tiene año 0 → activo.
      expect(porEmail['prof.vmaclean@gmail.com'].planes['708'].estado).toBe('activo')
    })

    it('pide el detalle de cada plan una sola vez aunque haya varias filas', async () => {
      const filas = []
      for (let i = 0; i < 10; i++) {
        filas.push(`37348389,Usuario${i},APELLIDO,usuario${i}@ejemplo.com,662,2026-03-02,`)
      }
      const csv = `dni,nombre,apellido,email,plan,fecha_inscripcion,numero_legajo\n${filas.join('\n')}`

      const { importarUsuariosDesdeCSV } = useImportarUsuarios()
      const resultado = await importarUsuariosDesdeCSV(csv, { nombresDePlanes: {} })

      expect(resultado.exito).toBe(true)
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(String(fetch.mock.calls[0][0])).toContain('/planes/662.json')
    })

    it('aborta todo si el detalle de un plan no normaliza', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (ruta) => {
          const codigo = String(ruta).match(/\/planes\/(.+)\.json$/)?.[1]
          if (codigo === '708') {
            return {
              ok: true,
              json: async () => ({ plan: '999', materias: { '708-1.1': { nombre: 'X' } } })
            }
          }
          return { ok: true, json: async () => PLANES[codigo] }
        })
      )

      const csv = `dni,nombre,apellido,email,plan,fecha_inscripcion,numero_legajo
37348389,María José,ORTEGA,majo@ejemplo.com,708,2026-03-02,`

      const { importarUsuariosDesdeCSV } = useImportarUsuarios()
      const resultado = await importarUsuariosDesdeCSV(csv, { nombresDePlanes: {} })

      expect(resultado.exito).toBe(false)
      expect(resultado.datos.errores[0].codigo).toBe('708')
      expect(resultado.datos.errores[0].detalle[0]).toContain('no es válido')
      expect(escrituras).toHaveLength(0)
    })

    it('aborta si el catálogo de planes no está disponible', async () => {
      vi.mocked(asegurarCatalogo).mockResolvedValueOnce({
        exito: false,
        datos: {},
        error: new Error('sin catálogo')
      })

      const csv = `dni,nombre,apellido,email,plan,fecha_inscripcion,numero_legajo
37348389,María José,ORTEGA,majo@ejemplo.com,662,2026-03-02,`

      const { importarUsuariosDesdeCSV } = useImportarUsuarios()
      const resultado = await importarUsuariosDesdeCSV(csv, { nombresDePlanes: {} })

      expect(resultado.exito).toBe(false)
      expect(resultado.error.message).toContain('catálogo de planes no está disponible')
      expect(escrituras).toHaveLength(0)
    })

    it('NO debe escribir nada si alguna fila es inválida (todo-o-nada)', async () => {
      const csv = `dni,nombre,apellido,email,plan,fecha_inscripcion,numero_legajo
,María José,ORTEGA,majo@ejemplo.com,662,2026-03-02,
37348389,Victoria,MACLEAN,prof.vmaclean@gmail.com,INVALIDO,2025-08-11,`

      const { importarUsuariosDesdeCSV } = useImportarUsuarios()
      const resultado = await importarUsuariosDesdeCSV(csv, { nombresDePlanes: {} })

      expect(resultado.exito).toBe(false)
      expect(resultado.datos.errores).toHaveLength(2)
      expect(resultado.datos.errores[0].fila).toBe(2)
      expect(resultado.datos.errores[0].email).toBe('majo@ejemplo.com')
      expect(resultado.datos.errores[0].detalle).toContain('Falta el DNI')
      expect(resultado.datos.errores[1].fila).toBe(3)
      expect(resultado.datos.errores[1].email).toBe('prof.vmaclean@gmail.com')
      expect(resultado.datos.errores[1].detalle.some((d) => d.includes('Código de plan inválido'))).toBe(true)
      expect(escrituras).toHaveLength(0)
    })

    it('rechaza un plan no disponible antes de pedir su detalle', async () => {
      const csv = `dni,nombre,apellido,email,plan,fecha_inscripcion,numero_legajo
37348389,María José,ORTEGA,majo@ejemplo.com,666,2026-03-02,`

      const { importarUsuariosDesdeCSV } = useImportarUsuarios()
      const resultado = await importarUsuariosDesdeCSV(csv, { nombresDePlanes: {} })

      expect(resultado.exito).toBe(false)
      expect(resultado.datos.errores[0].detalle.some((d) => d.includes('no está disponible'))).toBe(true)
      expect(fetch).not.toHaveBeenCalled()
      expect(escrituras).toHaveLength(0)
    })

    it('debe partir en varios lotes cuando supera LIMITE_BATCH', async () => {
      const filas = []
      for (let i = 0; i < 600; i++) {
        filas.push(`37348389,Usuario${i},APELLIDO,usuario${i}@ejemplo.com,662,2026-03-02,`) // 600 filas
      }
      const csv = `dni,nombre,apellido,email,plan,fecha_inscripcion,numero_legajo\n${filas.join('\n')}`

      const { importarUsuariosDesdeCSV } = useImportarUsuarios()
      const resultado = await importarUsuariosDesdeCSV(csv, { nombresDePlanes: {} })

      expect(resultado.exito).toBe(true)
      expect(resultado.datos.importados).toBe(600)
      expect(resultado.datos.totalFilas).toBe(600)
      expect(resultado.datos.lotes).toBe(2) // 600 / 500 = 1.2 → 2 lotes (500 + 100)
    })
  })
})
