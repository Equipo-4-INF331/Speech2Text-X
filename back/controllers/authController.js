import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../database.js";

// POST /api/auth/register
// { username, password }
export const register = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Faltan username o password" });
    }

    // ¿ya existe?
    const existing = await db`
      SELECT id FROM users WHERE username = ${username}
    `;
    if (existing.length > 0) {
      return res.status(409).json({ message: "El usuario ya existe" });
    }

    const hash = await bcrypt.hash(password, 10);

    const inserted = await db`
      INSERT INTO users (username, password_hash)
      VALUES (${username}, ${hash})
      RETURNING id, username, created_at
    `;

    const user = inserted[0];

    res.status(201).json({
      message: "Usuario creado",
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (err) {
    console.error("Error en /auth/register", err);
    res.status(500).json({ message: "Error interno" });
  }
};

// POST /api/auth/login
// { username, password }
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Faltan username o password" });
    }

    const rows = await db`
      SELECT id, username, password_hash
      FROM users
      WHERE username = ${username}
    `;

    if (rows.length === 0) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const user = rows[0];

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username, // 👈 este es el mismo username que usas en audios
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (err) {
    console.error("Error en /auth/login", err);
    res.status(500).json({ message: "err.message" });
  }
};