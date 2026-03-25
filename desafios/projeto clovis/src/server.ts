/**
 * server.ts
 *
 * Ponto de entrada da aplicação. Configura o Express e monta as rotas
 * do middleware urbano sob o prefixo /api.
 */

import express from "express";
import path from "path";
import cityRoutes from "./routes/index";

const app = express();
const PORT = process.env.PORT ?? 3000;

// Middleware para parsing de JSON no corpo das requisições
app.use(express.json());

// Serve o dashboard estático em /
app.use(express.static(path.join(__dirname, "../public")));

// Monta todas as rotas da cidade sob /api
app.use("/api", cityRoutes);

export default app;
