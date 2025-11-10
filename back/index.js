import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";

import audiosRoutes from "./routes/audiosRoutes.js";
import { db } from "./database.js";
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
      connectSrc: ["'self'", "http:", "https:", "http://13.58.67.175:5000"],
      mediaSrc: ["'self'", "https://speech2textx.s3.us-east-2.amazonaws.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "http:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "http:", "https:"],
      imgSrc: ["'self'", "data:", "http:", "https:"],
      fontSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: false
}));
app.use("/api/audios", audiosRoutes);

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


