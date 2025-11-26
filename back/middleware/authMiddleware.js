// middleware/authMiddleware.js
import jwt from "jsonwebtoken";

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No autorizado" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // payload: { userId, username, iat, exp }
    req.user = payload;
    next();
  } catch (err) {
    console.error("Error verificando token:", err);
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}
