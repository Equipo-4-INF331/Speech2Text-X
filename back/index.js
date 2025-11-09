import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";

import audiosRoutes from "./routes/audiosRoutes.js";
import { db } from "./database.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors())
app.use(helmet());
app.use(morgan("dev"));

app.use("/api/audios", audiosRoutes);

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
    console.log("Base de datos iniciada correctamente")
  } catch (error) {
    console.error("Error iniciando base de datos", error);
  }
}

initDB().then(() => {
  app.listen(PORT, () => {
    console.log('Servidor escuchando en el puerto', PORT);
    });
});


