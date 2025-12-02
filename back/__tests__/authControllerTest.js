// tests/authController.test.js
process.env.JWT_SECRET = 'test-secret';

// --- Mocks de dependencias ---
jest.mock('../database.js', () => ({
  db: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

// Importar después de los mocks
import { register, login } from '../controllers/authController.js';
import { db } from '../database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ========================
//   Tests de register
// ========================
describe('Auth Controller', () => {
  let res;
  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('debería devolver 400 si faltan username o password', async () => {
    const req = { body: { username: '', password: '' } };

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Faltan username o password',
    });
  });

  it('debería devolver 409 si el usuario ya existe', async () => {
    const req = { body: { username: 'pepe', password: '1234' } };

    db.mockResolvedValueOnce([{ id: 1 }]);

    await register(req, res);

    expect(db).toHaveBeenCalledTimes(1); // solo el SELECT
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: 'El usuario ya existe',
    });
  });

  it('debería crear usuario nuevo y devolver 201', async () => {
    const req = { body: { username: 'nuevo', password: 'secreto' } };

    db
      .mockResolvedValueOnce([]) // SELECT
      .mockResolvedValueOnce([
        {
          id: 10,
          username: 'nuevo',
          created_at: new Date('2025-11-25T00:00:00Z'),
        },
      ]); // INSERT

    bcrypt.hash.mockResolvedValueOnce('hash-falso');

    await register(req, res);

    expect(bcrypt.hash).toHaveBeenCalledWith('secreto', 10);
    expect(db).toHaveBeenCalledTimes(2); // SELECT + INSERT

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Usuario creado',
      user: {
        id: 10,
        username: 'nuevo',
      },
    });
  });

  it('debería devolver 500 si ocurre un error inesperado', async () => {
    const req = { body: { username: 'pepe', password: '1234' } };

    db.mockRejectedValueOnce(new Error('DB error'));

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Error interno',
    });
  });

// ========================
//   Tests de login
// ========================
  it('debería devolver 400 si faltan username o password', async () => {
    const req = { body: { username: '', password: '' } };

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Faltan username o password',
    });
  });

  it('debería devolver 401 si el usuario no existe', async () => {
    const req = { body: { username: 'noexiste', password: '1234' } };

    db.mockResolvedValueOnce([]); // SELECT sin filas

    await login(req, res);

    expect(db).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Credenciales inválidas',
    });
  });

  it('debería devolver 401 si la contraseña es incorrecta', async () => {
    const req = { body: { username: 'pepe', password: 'mala' } };

    db.mockResolvedValueOnce([
      { id: 1, username: 'pepe', password_hash: 'hash-db' },
    ]);

    bcrypt.compare.mockResolvedValueOnce(false); // password incorrecta

    await login(req, res);

    expect(bcrypt.compare).toHaveBeenCalledWith('mala', 'hash-db');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Credenciales inválidas',
    });
  });

  it('debería devolver token y user si las credenciales son correctas', async () => {
    const req = { body: { username: 'pepe', password: 'buena' } };

    db.mockResolvedValueOnce([
      { id: 1, username: 'pepe', password_hash: 'hash-db' },
    ]);

    bcrypt.compare.mockResolvedValueOnce(true);
    jwt.sign.mockReturnValue('token-falso');

    await login(req, res);

    expect(bcrypt.compare).toHaveBeenCalledWith('buena', 'hash-db');
    expect(jwt.sign).toHaveBeenCalledWith(
      { userId: 1, username: 'pepe' },
      'test-secret',
      { expiresIn: '1h' },
    );

    expect(res.json).toHaveBeenCalledWith({
      token: 'token-falso',
      user: {
        id: 1,
        username: 'pepe',
      },
    });
  });

  it('debería devolver 500 si ocurre un error inesperado en login', async () => {
    const req = { body: { username: 'pepe', password: '1234' } };

    db.mockRejectedValueOnce(new Error('DB error'));

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'err.message',
    });
  });
});
