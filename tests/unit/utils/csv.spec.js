import { describe, it, expect } from 'vitest'
import { parsearCSVUsuarios } from '@/utils/csv.js'

describe('csv.js', () => {
  describe('parsearCSVUsuarios', () => {
    it('debe parsear un CSV válido', () => {
      const texto = `dni,nombre,apellido,email,plan,fecha_inscripcion,numero_legajo
37348389,María José,ORTEGA,majo@ejemplo.com,"[""662""]","2026-03-02",
30941843,Victoria,MACLEAN,prof.vmaclean@gmail.com,"[""662"",""708""]","[""2026-03-02"",""2025-08-11""]",
12345678,Juan,PEREZ,juan@ejemplo.com,"[""708""]","2026-03-02","2026-0007"`

      const filas = parsearCSVUsuarios(texto)

      expect(filas).toHaveLength(3)
      expect(filas[0]).toEqual({
        dni: '37348389',
        nombre: 'María José',
        apellido: 'ORTEGA',
        email: 'majo@ejemplo.com',
        plan: '["662"]',
        fecha_inscripcion: '2026-03-02',
        numero_legajo: ''
      })
      expect(filas[1]).toEqual({
        dni: '30941843',
        nombre: 'Victoria',
        apellido: 'MACLEAN',
        email: 'prof.vmaclean@gmail.com',
        plan: '["662","708"]',
        fecha_inscripcion: '["2026-03-02","2025-08-11"]',
        numero_legajo: ''
      })
      expect(filas[2]).toEqual({
        dni: '12345678',
        nombre: 'Juan',
        apellido: 'PEREZ',
        email: 'juan@ejemplo.com',
        plan: '["708"]',
        fecha_inscripcion: '2026-03-02',
        numero_legajo: '2026-0007'
      })
    })

    it('debe devolver un array vacío para un CSV vacío', () => {
      const texto = ''
      const filas = parsearCSVUsuarios(texto)
      expect(filas).toEqual([])
    })

    it('debe devolver un array vacío para un CSV sin filas de datos', () => {
      const texto = 'dni,nombre,apellido,email,plan,fecha_inscripcion,numero_legajo'
      const filas = parsearCSVUsuarios(texto)
      expect(filas).toEqual([])
    })

    it('debe parsear un CSV con arrays paralelos', () => {
      const texto = `dni,nombre,apellido,email,plan,fecha_inscripcion,numero_legajo
37348389,María José,ORTEGA,majo@ejemplo.com,"[""662"",""708""]","[""2026-03-02"",""2025-08-11""]",
30941843,Victoria,MACLEAN,prof.vmaclean@gmail.com,"[""662""]","2026-03-02",`

      const filas = parsearCSVUsuarios(texto)

      expect(filas).toHaveLength(2)
      expect(filas[0].plan).toBe('["662","708"]')
      expect(filas[0].fecha_inscripcion).toBe('["2026-03-02","2025-08-11"]')
      expect(filas[1].plan).toBe('["662"]')
      expect(filas[1].fecha_inscripcion).toBe('2026-03-02')
    })
  })
})