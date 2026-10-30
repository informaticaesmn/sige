import { describe, it, expect, vi } from 'vitest'
import { normalizarEmail, normalizarDni, normalizarRoles, resolverCodigoPlan, construirDocumentoUsuario, construirLegajo, validarDatosUsuario } from '@/utils/validacionUsuarios.js'

vi.mock('@/utils/planes.js', () => ({
  catalogoDePlanes: vi.fn(() => ['662', '708']),
  esPlanDisponible: vi.fn((codigo) => ['662', '708'].includes(codigo))
}))

describe('validacionUsuarios.js', () => {
  describe('normalizarEmail', () => {
    it('debe normalizar un email a minúsculas y sin espacios', () => {
      expect(normalizarEmail('  TEST@EJEMPLO.COM  ')).toBe('test@ejemplo.com')
    })
  })

  describe('normalizarDni', () => {
    it('debe eliminar puntos y espacios', () => {
      expect(normalizarDni('37.348.389')).toBe('37348389')
    })
  })

  describe('normalizarRoles', () => {
    it('debe normalizar roles a minúsculas y eliminar duplicados', () => {
      expect(normalizarRoles(['ESTUDIANTE', 'Docente', 'ESTUDIANTE'])).toEqual(['estudiante', 'docente'])
    })
  })

  describe('resolverCodigoPlan', () => {
    it('debe resolver un código canónico', () => {
      const nombresDePlanes = { '662': '662 Profesorado de Música', '708': '708 Técnico Superior en Sonido' }
      expect(resolverCodigoPlan('662', nombresDePlanes)).toEqual({ codigo: '662', nombre: '662 Profesorado de Música' })
    })

    it('debe resolver un alias legacy', () => {
      const nombresDePlanes = { '662G': '662G Profesorado de Música con orientación en Guitarra' }
      expect(resolverCodigoPlan('62G', nombresDePlanes)).toEqual({ codigo: '662G', nombre: '662G Profesorado de Música con orientación en Guitarra' })
    })

    it('debe resolver un nombre completo v1', () => {
      const nombresDePlanes = { '662': '662 Profesorado de Música' }
      expect(resolverCodigoPlan('662 Profesorado de Música', nombresDePlanes)).toEqual({ codigo: '662', nombre: '662 Profesorado de Música' })
    })

    it('debe devolver null si no se puede resolver', () => {
      const nombresDePlanes = {}
      expect(resolverCodigoPlan('INVALIDO', nombresDePlanes)).toBeNull()
    })
  })

  describe('construirDocumentoUsuario', () => {
    it('debe construir un documento de usuario con el shape v2', () => {
      const datos = {
        email: '  TEST@EJEMPLO.COM  ',
        dni: '37.348.389',
        nombre: '  MARÍA JOSÉ  ',
        apellido: '  ORTEGA  ',
        roles: ['ESTUDIANTE'],
        planes: ['662'],
        fechaInscripcion: '2026-03-02',
        numeroLegajo: '2026-0001',
        nombresDePlanes: { '662': '662 Profesorado de Música' },
        estadoPorPlan: { '662': 'ingresante' },
        fechaInscripcionPorPlan: { '662': '2026-03-02' },
        origen: 'carga_masiva'
      }
      const personaId = '3f2a-uuid'
      const documento = construirDocumentoUsuario(datos, personaId)

      expect(documento.personaId).toBe(personaId)
      expect(documento.email).toBe('test@ejemplo.com')
      expect(documento.dni).toBe('37348389')
      expect(documento.nombre).toBe('MARÍA JOSÉ')
      expect(documento.apellido).toBe('ORTEGA')
      expect(documento.roles).toEqual(['estudiante'])
      expect(documento.estadoRegistro).toBe('pendiente_registro')
      expect(documento.estadoUsuario).toBe('activo')
      expect(documento.planes).toHaveProperty('662')
      expect(documento.planes['662'].id).toBe('662')
      expect(documento.planes['662'].nombre).toBe('662 Profesorado de Música')
      expect(documento.planes['662'].estado).toBe('ingresante')
      expect(documento.numeroLegajo).toBe('2026-0001')
    })
  })

  describe('construirLegajo', () => {
    it('debe construir un legajo', () => {
      const datos = {
        personaId: '3f2a-uuid',
        numeroLegajo: '2026-0001',
        email: 'test@ejemplo.com',
        dni: '37348389',
        nombre: 'María José',
        apellido: 'ORTGA',
        fechaNacimiento: '1990-01-01',
        domicilios: [],
        telefonos: [],
        datosAdministrativos: {},
        documentacion: []
      }
      const legajo = construirLegajo(datos)

      expect(legajo.personaId).toBe(datos.personaId)
      expect(legajo.numeroLegajo).toBe(datos.numeroLegajo)
      expect(legajo.usuarioDocId).toBe(datos.email)
      expect(legajo.dni).toBe(datos.dni)
      expect(legajo.nombre).toBe(datos.nombre)
      expect(legajo.apellido).toBe(datos.apellido)
    })
  })

  describe('validarDatosUsuario', () => {
    it('debe validar datos de usuario válidos', () => {
      const datos = {
        email: 'test@ejemplo.com',
        dni: '37348389',
        nombre: 'María José',
        apellido: 'ORTGA',
        roles: ['estudiante'],
        planes: ['662'],
        fechaInscripcion: '2026-03-02'
      }
      const resultado = validarDatosUsuario(datos)

      expect(resultado.exito).toBe(true)
      expect(resultado.datos).toBeDefined()
      expect(resultado.error).toBeNull()
    })

    it('debe rechazar un email inválido', () => {
      const datos = {
        email: 'invalid-email',
        dni: '37348389',
        nombre: 'María José',
        apellido: 'ORTGA',
        roles: ['estudiante'],
        planes: ['662'],
        fechaInscripcion: '2026-03-02'
      }
      const resultado = validarDatosUsuario(datos)

      expect(resultado.exito).toBe(false)
      expect(resultado.error).toBeDefined()
      expect(resultado.error.errores).toContain('El email tiene un formato inválido')
    })

    it('debe rechazar un DNI vacío', () => {
      const datos = {
        email: 'test@ejemplo.com',
        dni: '',
        nombre: 'María José',
        apellido: 'ORTGA',
        roles: ['estudiante'],
        planes: ['662'],
        fechaInscripcion: '2026-03-02'
      }
      const resultado = validarDatosUsuario(datos)

      expect(resultado.exito).toBe(false)
      expect(resultado.error).toBeDefined()
      expect(resultado.error.errores).toContain('Falta el DNI')
    })

    it('debe rechazar un plan no disponible', () => {
      const datos = {
        email: 'test@ejemplo.com',
        dni: '37348389',
        nombre: 'María José',
        apellido: 'ORTGA',
        roles: ['estudiante'],
        planes: ['INVALIDO'],
        fechaInscripcion: '2026-03-02'
      }
      const resultado = validarDatosUsuario(datos)

      expect(resultado.exito).toBe(false)
      expect(resultado.error).toBeDefined()
      expect(resultado.error.errores).toContain('Código de plan inválido: INVALIDO')
    })
  })
})