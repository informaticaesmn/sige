import { describe, it, expect } from 'vitest'
import {
  normalizarEmail,
  normalizarDni,
  normalizarRoles,
  normalizarFecha,
  resolverCodigoPlan,
  validarDatosUsuario,
  validarCSVUsuarios,
  construirDocumentoUsuario,
  construirLegajo
} from '@/utils/validacionUsuarios.js'
import { setCatalogoPlanes } from '@/utils/planes.js'

setCatalogoPlanes({
  planes: [
    { codigo: '662', nombre: '662 Profesorado de Música', disponible: true },
    { codigo: '708', nombre: '708 Plan de Estudio', disponible: true },
    { codigo: '666', nombre: '666 Composición', disponible: false },
    { codigo: '662G', nombre: '662G Guitarra', disponible: false },
    { codigo: '709', nombre: '709', disponible: true }
  ]
})

const nombresDePlanes = {
  '662': '662 Profesorado de Música',
  '708': '708 Plan de Estudio'
}

// ---------------------------------------------------------------------------
// normalizarEmail
// ---------------------------------------------------------------------------
describe('normalizarEmail', () => {
  it('pasa a lowercase y elimina espacios de los extremos', () => {
    expect(normalizarEmail('  MAJO@Ejemplo.COM  ')).toBe('majo@ejemplo.com')
  })

  it('no modifica el interior del email', () => {
    expect(normalizarEmail('maria.jose@ejemplo.com')).toBe('maria.jose@ejemplo.com')
  })

  it('convierte valor no string a string', () => {
    expect(normalizarEmail(123)).toBe('123')
  })
})

// ---------------------------------------------------------------------------
// normalizarDni
// ---------------------------------------------------------------------------
describe('normalizarDni', () => {
  it('elimina puntos y espacios de un DNI con formato argentino', () => {
    expect(normalizarDni('37.348.389')).toBe('37348389')
    expect(normalizarDni('37 348 389')).toBe('37348389')
    expect(normalizarDni('37.348.389 ')).toBe('37348389')
  })

  it('devuelve string vacío si el valor está vacío', () => {
    expect(normalizarDni('')).toBe('')
    expect(normalizarDni(null)).toBe('')
    expect(normalizarDni(undefined)).toBe('')
  })
})

// ---------------------------------------------------------------------------
// normalizarRoles
// ---------------------------------------------------------------------------
describe('normalizarRoles', () => {
  it('normaliza un array: lowercase, sin duplicados (no trim en elementos de array)', () => {
    expect(normalizarRoles(['Estudiante', 'ESTUDIANTE', 'docente', 'Docente'])).toEqual([
      'estudiante',
      'docente'
    ])
  })

  it('normaliza una string separada por comas', () => {
    expect(normalizarRoles('Estudiante, Docente, estudiante')).toEqual(['estudiante', 'docente'])
  })

  it('array vacío devuelve array vacío', () => {
    expect(normalizarRoles([])).toEqual([])
  })

  it('string vacío devuelve array con un elemento vacío', () => {
    expect(normalizarRoles('')).toEqual([''])
  })
})

// ---------------------------------------------------------------------------
// normalizarFecha
// ---------------------------------------------------------------------------
describe('normalizarFecha', () => {
  it('convierte una fecha ISO válida a objeto Timestamp-like', () => {
    const resultado = normalizarFecha('2026-03-02')
    expect(resultado).toHaveProperty('seconds')
    expect(resultado).toHaveProperty('nanoseconds')
    expect(typeof resultado.seconds).toBe('number')
    expect(typeof resultado.nanoseconds).toBe('number')
  })

  it('acepta un objeto Date', () => {
    const resultado = normalizarFecha(new Date('2025-08-11'))
    expect(resultado).toHaveProperty('seconds')
  })

  it('lanza Error si la fecha es inválida', () => {
    expect(() => normalizarFecha('fecha-invalida')).toThrow(Error)
    expect(() => normalizarFecha('')).toThrow(Error)
  })

  it('no lanza Error para null (Date(null) es epoch válido)', () => {
    expect(() => normalizarFecha(null)).not.toThrow(Error)
  })
})

// ---------------------------------------------------------------------------
// resolverCodigoPlan
// ---------------------------------------------------------------------------
describe('resolverCodigoPlan', () => {
  it('resuelve un código canónico disponible', () => {
    expect(resolverCodigoPlan('662', nombresDePlanes)).toEqual({
      codigo: '662',
      nombre: '662 Profesorado de Música'
    })
    expect(resolverCodigoPlan('708', nombresDePlanes)).toEqual({
      codigo: '708',
      nombre: '708 Plan de Estudio'
    })
  })

  it('resuelve el alias legacy "62G" a "662G"', () => {
    expect(resolverCodigoPlan('62G', nombresDePlanes)).toEqual({
      codigo: '662G',
      nombre: '662G'
    })
  })

  it('resuelve por nombre completo v1', () => {
    expect(resolverCodigoPlan('662 Profesorado de Música', nombresDePlanes)).toEqual({
      codigo: '662',
      nombre: '662 Profesorado de Música'
    })
    expect(resolverCodigoPlan('708 Plan de Estudio', nombresDePlanes)).toEqual({
      codigo: '708',
      nombre: '708 Plan de Estudio'
    })
  })

  it('devuelve null si no se puede resolver', () => {
    // 999 no está en planes.json, así que no se resuelve
    expect(resolverCodigoPlan('999', nombresDePlanes)).toBeNull()
    expect(resolverCodigoPlan('', nombresDePlanes)).toBeNull()
    expect(resolverCodigoPlan(null, nombresDePlanes)).toBeNull()
    // '662G' está en el catálogo (planes.json) pero su JSON no es usable;
    // resolverCodigoPlan lo resuelve como código, la disponibilidad se chequea aparte
    expect(resolverCodigoPlan('662G', nombresDePlanes)).toEqual({
      codigo: '662G',
      nombre: '662G'
    })
  })

  it('resuelve cualquier código listado en planes.json (incluso sin JSON de materias)', () => {
    expect(resolverCodigoPlan('666', nombresDePlanes)).toEqual({
      codigo: '666',
      nombre: '666'
    })
    expect(resolverCodigoPlan('709', nombresDePlanes)).toEqual({
      codigo: '709',
      nombre: '709'
    })
  })

  it('resuelve el alias legacy "62G" a "662G"', () => {
    expect(resolverCodigoPlan('62G', nombresDePlanes)).toEqual({
      codigo: '662G',
      nombre: '662G'
    })
  })
})

// ---------------------------------------------------------------------------
// validarDatosUsuario
// ---------------------------------------------------------------------------
describe('validarDatosUsuario', () => {
  const datosValidos = {
    email: 'majo@ejemplo.com',
    dni: '37348389',
    nombre: 'María José',
    apellido: 'ORTEGA',
    roles: ['estudiante'],
    planes: ['662'],
    fechaInscripcion: '2026-03-02',
    nombresDePlanes,
    origen: 'carga_masiva'
  }

  it('aprueba una fila válida', () => {
    const resultado = validarDatosUsuario(datosValidos, {
      rolesPermitidos: ['estudiante', 'docente', 'bedel'],
      catalogoPlanes: ['662', '708']
    })
    expect(resultado.exito).toBe(true)
    expect(resultado.datos).not.toBeNull()
    expect(resultado.error).toBeNull()
  })

  it('rechaza email faltante', () => {
    const resultado = validarDatosUsuario({ ...datosValidos, email: '' })
    expect(resultado.exito).toBe(false)
    expect(resultado.error.errores).toContain('Falta el email')
  })

  it('rechaza email con formato inválido', () => {
    const resultado = validarDatosUsuario({ ...datosValidos, email: 'no-es-un-email' })
    expect(resultado.exito).toBe(false)
    expect(resultado.error.errores).toContain('El email tiene un formato inválido')
  })

  it('rechaza DNI faltante', () => {
    const resultado = validarDatosUsuario({ ...datosValidos, dni: '' })
    expect(resultado.exito).toBe(false)
    expect(resultado.error.errores).toContain('Falta el DNI')
  })

  it('rechaza nombre faltante', () => {
    const resultado = validarDatosUsuario({ ...datosValidos, nombre: '' })
    expect(resultado.exito).toBe(false)
    expect(resultado.error.errores).toContain('Falta el nombre')
  })

  it('rechaza apellido faltante', () => {
    const resultado = validarDatosUsuario({ ...datosValidos, apellido: '' })
    expect(resultado.exito).toBe(false)
    expect(resultado.error.errores).toContain('Falta el apellido')
  })

  it('rechaza sin roles', () => {
    const resultado = validarDatosUsuario({ ...datosValidos, roles: [] })
    expect(resultado.exito).toBe(false)
    expect(resultado.error.errores).toContain('Debe tener al menos un rol')
  })

  it('rechaza rol inválido', () => {
    const resultado = validarDatosUsuario({ ...datosValidos, roles: ['alumno'] })
    expect(resultado.exito).toBe(false)
    expect(resultado.error.errores).toContain('Roles inválidos: alumno')
  })

  it('rechaza estudiante sin planes', () => {
    const resultado = validarDatosUsuario({ ...datosValidos, planes: [] })
    expect(resultado.exito).toBe(false)
    expect(resultado.error.errores).toContain(
      'Los estudiantes deben tener al menos un plan asignado'
    )
  })

  it('no estudiante con planes: exito true (advertencias solo van en el objeto error)', () => {
    const resultado = validarDatosUsuario(
      { ...datosValidos, roles: ['docente'], planes: ['662'] },
      { catalogoPlanes: ['662', '708'] }
    )
    expect(resultado.exito).toBe(true)
    expect(resultado.error).toBeNull()
  })

  it('rechaza plan no disponible (código resuelve pero no está en catálogo)', () => {
    const resultado = validarDatosUsuario(
      { ...datosValidos, planes: ['662'] },
      { catalogoPlanes: [] }
    )
    expect(resultado.exito).toBe(false)
    expect(resultado.error.errores.some((e) => e.includes('no está disponible'))).toBe(true)
  })

  it('rechaza plan inválido (no resuelve a código)', () => {
    const resultado = validarDatosUsuario(
      { ...datosValidos, planes: ['999'] },
      { catalogoPlanes: ['662', '708'] }
    )
    expect(resultado.exito).toBe(false)
    expect(resultado.error.errores).toContain('Código de plan inválido: 999')
  })

  it('rechaza plan con código en catálogo pero no permitido por catalogoPlanes', () => {
    // 666 está en planes.json pero no en catalogoPlanes pasado
    const resultado = validarDatosUsuario(
      { ...datosValidos, planes: ['666'] },
      { catalogoPlanes: ['662', '708'] }
    )
    expect(resultado.exito).toBe(false)
    expect(resultado.error.errores.some((e) => e.includes('no está disponible'))).toBe(true)
  })

  it('rechaza plan inválido (no resuelve a código)', () => {
    const resultado = validarDatosUsuario(
      { ...datosValidos, planes: ['Plan Inexistente'] },
      { catalogoPlanes: ['662', '708'] }
    )
    expect(resultado.exito).toBe(false)
    expect(resultado.error.errores).toContain('Código de plan inválido: Plan Inexistente')
  })

  it('rechaza fecha de inscripción faltante', () => {
    const resultado = validarDatosUsuario({ ...datosValidos, fechaInscripcion: '' })
    expect(resultado.exito).toBe(false)
    expect(resultado.error.errores).toContain('Falta la fecha de inscripción')
  })

  it('rechaza fecha de inscripción inválida', () => {
    const resultado = validarDatosUsuario({ ...datosValidos, fechaInscripcion: 'fecha-invalida' })
    expect(resultado.exito).toBe(false)
    expect(resultado.error.errores).toContain('Fecha inválida: fecha-invalida')
  })

  it('acepta roles personalizados cuando se pasan rolesPermitidos', () => {
    const resultado = validarDatosUsuario(
      { ...datosValidos, roles: ['admin'] },
      { rolesPermitidos: ['admin'], catalogoPlanes: ['662', '708'] }
    )
    expect(resultado.exito).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// validarCSVUsuarios
// ---------------------------------------------------------------------------
describe('validarCSVUsuarios', () => {
  const filaValida = {
    dni: '37348389',
    nombre: 'María José',
    apellido: 'ORTEGA',
    email: 'majo@ejemplo.com',
    plan: ['662'],
    fecha_inscripcion: '2026-03-02',
    numero_legajo: ''
  }

  it('devuelve filas válidas normalizadas', () => {
    const resultado = validarCSVUsuarios([filaValida], nombresDePlanes)
    expect(resultado.filas).toHaveLength(1)
    expect(resultado.errores).toHaveLength(0)
    expect(resultado.filas[0].planes).toEqual(['662'])
    expect(resultado.filas[0].roles).toEqual(['estudiante'])
  })

  it('devuelve múltiples filas válidas', () => {
    const filas = [
      filaValida,
      { ...filaValida, dni: '30941843', email: 'prof.vmaclean@gmail.com', plan: ['708'] }
    ]
    const resultado = validarCSVUsuarios(filas, nombresDePlanes)
    expect(resultado.filas).toHaveLength(2)
    expect(resultado.errores).toHaveLength(0)
    expect(resultado.filas[1].planes).toEqual(['708'])
  })

  it('rechaza fila con plan no disponible (código no está en planes.json)', () => {
    const filas = [
      { ...filaValida, plan: ['999'] }
    ]
    const resultado = validarCSVUsuarios(filas, nombresDePlanes)
    expect(resultado.filas).toHaveLength(0)
    expect(resultado.errores).toHaveLength(1)
    expect(resultado.errores[0].fila).toBe(2)
    expect(resultado.errores[0].detalle.some((d) => d.includes('Código de plan inválido'))).toBe(true)
  })

  it('rechaza fila con código de plan no disponible en el catálogo', () => {
    // Con el nuevo gating estricto, 666 tiene disponible: false en planes.json
    // y no se puede dar de alta (requiere plan con disponible: true).
    const filas = [
      { ...filaValida, plan: ['666'] }
    ]
    const resultado = validarCSVUsuarios(filas, nombresDePlanes)
    expect(resultado.filas).toHaveLength(0)
    expect(resultado.errores).toHaveLength(1)
    expect(resultado.errores[0].fila).toBe(2)
    expect(resultado.errores[0].detalle.some((d) => d.includes('no está disponible'))).toBe(true)
  })

  it('rechaza fila con fecha inválida', () => {
    const filas = [
      { ...filaValida, fecha_inscripcion: 'fecha-invalida' }
    ]
    const resultado = validarCSVUsuarios(filas, nombresDePlanes)
    expect(resultado.filas).toHaveLength(0)
    expect(resultado.errores).toHaveLength(1)
    expect(resultado.errores[0].detalle.some((d) => d.includes('Fecha inválida'))).toBe(true)
  })

  it('rechaza fila con campo obligatorio faltante', () => {
    const filas = [
      { ...filaValida, dni: '' }
    ]
    const resultado = validarCSVUsuarios(filas, nombresDePlanes)
    expect(resultado.filas).toHaveLength(0)
    expect(resultado.errores).toHaveLength(1)
    expect(resultado.errores[0].detalle).toContain('Falta el DNI')
  })

  it('rechaza fila con email inválido', () => {
    const filas = [
      { ...filaValida, email: 'no-email' }
    ]
    const resultado = validarCSVUsuarios(filas, nombresDePlanes)
    expect(resultado.filas).toHaveLength(0)
    expect(resultado.errores).toHaveLength(1)
    expect(resultado.errores[0].detalle).toContain('El email tiene un formato inválido')
  })

  it('devuelve array vacío si no hay filas', () => {
    const resultado = validarCSVUsuarios([], nombresDePlanes)
    expect(resultado.filas).toEqual([])
    expect(resultado.errores).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// construirDocumentoUsuario
// ---------------------------------------------------------------------------
describe('construirDocumentoUsuario', () => {
  const datos = {
    email: 'majo@ejemplo.com',
    dni: '37348389',
    nombre: 'María José',
    apellido: 'ORTEGA',
    roles: ['estudiante'],
    planes: ['662'],
    fechaInscripcion: '2026-03-02',
    nombresDePlanes,
    origen: 'carga_masiva',
    numeroLegajo: '2026-0001'
  }

  it('construye un documento usuario con shape v2', () => {
    const personaId = '3f2a-uuid-estable'
    const doc = construirDocumentoUsuario(datos, personaId)

    expect(doc.personaId).toBe(personaId)
    expect(doc.dni).toBe('37348389')
    expect(doc.nombre).toBe('María José')
    expect(doc.apellido).toBe('ORTEGA')
    expect(doc.email).toBe('majo@ejemplo.com')
    expect(doc.roles).toEqual(['estudiante'])
    expect(doc.estadoRegistro).toBe('pendiente_registro')
    expect(doc.estadoUsuario).toBe('activo')
    expect(doc.numeroLegajo).toBe('2026-0001')
    expect(doc.creadoEl).toHaveProperty('seconds')
    expect(doc.actualizadoEn).toHaveProperty('seconds')
  })

  it('construye planes como mapa por código', () => {
    const doc = construirDocumentoUsuario(datos, 'persona-id')
    expect(doc.planes).toHaveProperty('662')
    expect(doc.planes['662'].id).toBe('662')
    expect(doc.planes['662'].nombre).toBe('662 Profesorado de Música')
    // Sin `estadoPorPlan` cae a 'activo' (nunca asume pregrado).
    expect(doc.planes['662'].estado).toBe('activo')
    expect(doc.planes['662'].vigente).toBe(true)
    expect(doc.planes['662'].origen).toBe('carga_masiva')
    expect(doc.planes['662'].fechaInscripcion).toBe('2026-03-02')
  })

  it('usa estadoPorPlan cuando la carga masiva calculó el estado inicial', () => {
    const doc = construirDocumentoUsuario(
      { ...datos, estadoPorPlan: { '662': 'ingresante' } },
      'persona-id'
    )
    expect(doc.planes['662'].estado).toBe('ingresante')
  })

  it('devuelve null numeroLegajo si no se provee', () => {
    const datosSinLegajo = { ...datos, numeroLegajo: undefined }
    const doc = construirDocumentoUsuario(datosSinLegajo, 'persona-id')
    expect(doc.numeroLegajo).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// construirLegajo
// ---------------------------------------------------------------------------
describe('construirLegajo', () => {
  it('construye un legajo con los campos básicos', () => {
    const datos = {
      personaId: 'persona-id',
      numeroLegajo: '2026-0001',
      email: 'majo@ejemplo.com',
      dni: '37348389',
      nombre: 'María José',
      apellido: 'ORTEGA'
    }

    const legajo = construirLegajo(datos)

    expect(legajo.personaId).toBe('persona-id')
    expect(legajo.numeroLegajo).toBe('2026-0001')
    expect(legajo.usuarioDocId).toBe('majo@ejemplo.com')
    expect(legajo.dni).toBe('37348389')
    expect(legajo.nombre).toBe('María José')
    expect(legajo.apellido).toBe('ORTEGA')
    expect(legajo.fechaNacimiento).toBeNull()
    expect(legajo.domicilios).toEqual([])
    expect(legajo.telefonos).toEqual([])
    expect(legajo.datosAdministrativos).toEqual({})
    expect(legajo.documentacion).toEqual([])
    expect(legajo.actualizadoPor).toBeNull()
  })

  it('acepta domicilios, telefonos y fecha de nacimiento opcionales', () => {
    const datos = {
      personaId: 'persona-id',
      email: 'majo@ejemplo.com',
      dni: '37348389',
      nombre: 'María José',
      apellido: 'ORTEGA',
      fechaNacimiento: { seconds: 1000, nanoseconds: 0 },
      domicilios: [{ tipo: 'real', calle: 'Falsa', numero: '123' }],
      telefonos: [{ tipo: 'celular', numero: '1122334455' }],
      datosAdministrativos: { some: 'data' },
      documentacion: [{ tipo: 'dni_frente', estado: 'valido' }]
    }

    const legajo = construirLegajo(datos)
    expect(legajo.fechaNacimiento).toEqual({ seconds: 1000, nanoseconds: 0 })
    expect(legajo.domicilios).toHaveLength(1)
    expect(legajo.telefonos).toHaveLength(1)
    expect(legajo.datosAdministrativos).toEqual({ some: 'data' })
    expect(legajo.documentacion).toHaveLength(1)
  })
})
