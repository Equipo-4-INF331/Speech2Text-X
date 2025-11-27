import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '/var/lib/jenkins/workspace/s2t-ci-cd-pipeline/.env' });
  console.log("📦 Cargando .env desde Jenkins");
} else {
  dotenv.config({ path: path.resolve(__dirname, '.env') });
  console.log("📦 Cargando .env local");
}

import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import audiosRoutes from "./routes/audiosRoutes.js";
import authRoutes from "./routes/authRoutes.js"
import { authMiddleware } from "./middleware/authMiddleware.js";
import { db } from "./database.js";

console.log("🔑 OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "✅ cargada" : "❌ no encontrada");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors())
app.use(morgan("dev"));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "http:", "https:", "http://3.129.57.133:5000"],
      mediaSrc: ["'self'", "https://speech2textx.s3.us-east-2.amazonaws.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "http:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "http:", "https:"],
      imgSrc: ["'self'", "data:", "http:", "https:"],
      fontSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: false
}));
app.use("/api/audios", authMiddleware, audiosRoutes);
app.use("/api/auth", authRoutes);

const frontendPath = path.join(
  __dirname,
  process.env.NODE_ENV === 'production' ? '../front/dist' : '../front'
);

app.use(express.static(frontendPath));

app.get("/favicon.ico", (req, res) => {
  const faviconPath = path.join(frontendPath, "favicon.ico");
  console.log("Intentando servir favicon desde:", faviconPath);
  res.sendFile(faviconPath, (err) => {
    if (err) {
      console.error("Error sirviendo favicon:", err);
      res.status(204).end();
    }
  });
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next(); // no interferir con el backend
  res.sendFile(path.join(frontendPath, "index.html"));
});

async function initDB() {
  try {
    await db`
      CREATE TABLE IF NOT EXISTS audios (
        id SERIAL PRIMARY KEY,
        username VARCHAR(32) NOT NULL,
        name VARCHAR(32) NOT NULL,
        audio VARCHAR(255) NOT NULL,
        transcription TEXT,
        resumen TEXT,
        ideas_principales JSON,
        extractos JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    // Añadir columnas si no existen
    await db`ALTER TABLE audios ADD COLUMN IF NOT EXISTS resumen TEXT`;
    await db`ALTER TABLE audios ADD COLUMN IF NOT EXISTS ideas_principales JSON`;
    await db`ALTER TABLE audios ADD COLUMN IF NOT EXISTS extractos JSON`;
    await db`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(32) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log("Base de datos iniciada correctamente")
  } catch (error) {
    console.error("Error iniciando base de datos", error);
  }
}

initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
  });
});


