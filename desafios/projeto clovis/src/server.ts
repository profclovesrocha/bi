/**
 * server.ts
 *
 * Ponto de entrada da aplicação. Configura o Express e monta as rotas
 * do middleware urbano sob o prefixo /api.
 */

import express from "express";
import cityRoutes from "./routes/index";

const app = express();
const PORT = process.env.PORT ?? 3000;

// Middleware para parsing de JSON no corpo das requisições
app.use(express.json());

// Monta todas as rotas da cidade sob /api
app.use("/api", cityRoutes);

// Rota raiz — health check básico
app.get("/", (_req, res) => {
  res.json({
    service: "Smart City Middleware",
    version: "1.0.0",
    endpoints: [
      "GET  /api/status",
      "GET  /api/traffic",
      "GET  /api/lighting",
      "GET  /api/weather",
      "POST /api/lighting/adjust",
    ],
  });
});

app.listen(PORT, () => {
  console.log(`Smart City Middleware rodando em http://localhost:${PORT}`);
  console.log(`Documentação dos endpoints disponível em http://localhost:${PORT}/`);
});

export default app;
