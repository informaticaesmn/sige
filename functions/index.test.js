/** functions/index.test.js
 * Pruebas unitarias para las Cloud Functions.
 * Usamos Mocha como framework de testing y Chai para aserciones.
 */

const test = require("firebase-functions-test")({
  projectId: "prueba1-esmn",
});
const chai = require("chai");
const assert = chai.assert;
const admin = require("firebase-admin");
const myFunctions = require("../index.js");

/**
 * Pruebas para la Cloud Function `registrarUsuario`.
 */
describe("Cloud Functions: registrarUsuario", () => {
  // Guardamos el estado original de las funciones de admin
  const originalAuth = admin.auth;
  const originalFirestore = admin.firestore;

  // Después de cada test, restauramos los stubs para no afectar a otros tests.
  afterEach(() => {
    admin.auth = originalAuth;
    admin.firestore = originalFirestore;
    test.cleanup();
  });

  it("debería registrar un usuario pre-aprobado exitosamente", async () => {
    // Mock de Firestore para este test
    admin.firestore = () => ({
      collection: (path) => ({
        doc: (docId) => ({
          get: () => Promise.resolve({
            exists: true,
            data: () => ({nombre: "Usuario", apellido: "DePrueba"}),
          }),
        }),
      }),
      batch: () => ({
        set: () => {},
        delete: () => {},
        commit: () => Promise.resolve(),
      }),
    });

    // Mock de Auth para este test
    admin.auth = () => ({
      createUser: () => Promise.resolve({uid: "test-uid-123"}),
    });

    const wrapped = test.wrap(myFunctions.registrarUsuario);
    const data = {email: "test@exito.com", password: "password123"};

    const result = await wrapped(data);

    assert.equal(result.uid, "test-uid-123");
    assert.equal(result.email, "test@exito.com");
  });

  it("debería fallar si el email no está pre-aprobado", async () => {
    // Mock de Firestore para este test
    admin.firestore = () => ({
      collection: (path) => ({
        doc: (docId) => ({
          get: () => Promise.resolve({exists: false}), // El documento NO existe
        }),
      }),
    });

    const wrapped = test.wrap(myFunctions.registrarUsuario);
    const data = {email: "no-existe@dominio.com", password: "password123"};

    try {
      await wrapped(data);
      assert.fail("La función debió haber lanzado un error");
    } catch (error) {
      const expectedMessage = "auth/user-not-pre-approved-or-already-registered";
      assert.equal(error.code, "NOT_FOUND");
      assert.equal(error.message, expectedMessage);
    }
  });

  it("debería fallar si el email o la contraseña no se proveen", async () => {
    const wrapped = test.wrap(myFunctions.registrarUsuario);
    const data = {email: "test@dominio.com"}; // Sin contraseña

    try {
      await wrapped(data);
      assert.fail("La función debió haber lanzado un error");
    } catch (error) {
      const expectedMessage = "El email y la contraseña son obligatorios.";
      assert.equal(error.code, "INVALID_ARGUMENT");
      assert.equal(error.message, expectedMessage);
    }
  });
});
