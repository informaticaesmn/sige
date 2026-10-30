import { describe, it, expect, vi } from 'vitest'
import { useImportarUsuarios } from '@/composables/usuarios/useImportarUsuarios.js'

vi.mock('@/utils/csv.js', () => ({
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
}))

vi.mock('@/utils/validacionUsuarios.js', () => ({
  validarCSVUsuarios: vi.fn((filas, nombresDePlanes) => {
    const filasValidas = []
    const errores = []

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i]
      const erroresFila = []

      if (!fila.dni) erroresFila.push('Falta el DNI')
      if (!fila.nombre) erroresFila.push('Falta el nombre')
      if (!fila.apellido) erroresFila.push('Falta el apellido')
      if (!fila.email) erroresFila.push('Falta el email')
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fila.email)) erroresFila.push('El email tiene un formato inválido')

      if (!fila.plan) erroresFila.push('Falta el plan')
      else if (!['662', '708'].includes(fila.plan)) erroresFila.push(`El plan "${fila.plan}" no está disponible (no tiene JSON revisado)`)

      if (!fila.fecha_inscripcion) erroresFila.push('Falta la fecha de inscripción')

      if (erroresFila.length > 0) {
        errores.push({
          fila: i + 2,
          email: fila.email || '(sin email)',
          detalle: erroresFila
        })
      } else {
        filasValidas.push(fila)
      }
    }

    return { filas: filasValidas, errores }
  }),
  construirDocumentoUsuario: vi.fn((fila, personaId) => ({
    personaId,
    dni: fila.dni,
    nombre: fila.nombre,
    apellido: fila.apellido,
    email: fila.email,
    roles: ['estudiante'],
    estadoRegistro: 'pendiente_registro',
    estadoUsuario: 'activo',
    planes: { [fila.plan]: { id: fila.plan, nombre: fila.plan, estado: 'ingresante', fechaInscripcion: fila.fecha_inscripcion, vigente: true, origen: 'carga_masiva', ultimaAcreditacion: null, estadoCalculadoEn: null } },
    numeroLegajo: fila.numero_legajo || null,
    creadoEl: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    actualizadoEn: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
  })),
  construirLegajo: vi.fn((datos) => ({
    personaId: datos.personaId,
    numeroLegajo: datos.numeroLegajo || null,
    usuarioDocId: datos.email,
    dni: datos.dni,
    nombre: datos.nombre,
    apellido: datos.apellido,
    fechaNacimiento: null,
    domicilios: [],
    telefonos: [],
    datosAdministrativos: {},
    documentacion: [],
    creadoEl: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    actualizadoEn: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    actualizadoPor: null
  }))
}))

vi.mock('@/config/firebase.js', () => ({
  db: {}
}))

vi.mock('firebase/firestore/lite', () => ({
  doc: vi.fn((db, collection, id) => ({ collection, id })),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn(() => Promise.resolve())
  })),
  serverTimestamp: vi.fn(() => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }))
}))

describe('useImportarUsuarios', () => {
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
      expect(resultado.datos.errores[1].detalle).toContain('El plan "INVALIDO" no está disponible (no tiene JSON revisado)')
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
