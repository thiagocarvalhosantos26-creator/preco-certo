import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { createSearchCache } from "./cache.js";
import { ProductSearchError } from "./productSearchService.js";

function corsOptions(frontendOrigins) {
  return {
    origin(origin, callback) {
      // Requisições sem Origin incluem health checks e ferramentas como curl.
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");
      const allowed = frontendOrigins.includes(normalizedOrigin);

      callback(allowed ? null : new Error("Origem não autorizada pelo CORS."), allowed);
    },
    methods: ["GET"],
  };
}

function friendlyProductSearchMessage(error) {
  if (error.code?.includes("NoResults")) {
    return "Nenhum produto foi encontrado para essa pesquisa.";
  }

  if (error.code?.includes("TooManyRequests")) {
    return "A busca recebeu muitas solicitações. Aguarde alguns instantes e tente novamente.";
  }

  if (
    error.code?.includes("Auth") ||
    error.code?.includes("Credential") ||
    error.code?.includes("PartnerTag")
  ) {
    return "A integração com a Amazon precisa ser verificada pelo administrador.";
  }

  if (error.code?.includes("Timeout") || error.code?.includes("NetworkError")) {
    return "A Amazon demorou para responder. Tente novamente em alguns instantes.";
  }

  return "Não foi possível consultar a Amazon agora. Tente novamente mais tarde.";
}

export function createApp({ config, productSearchService }) {
  if (!productSearchService || typeof productSearchService.search !== "function") {
    throw new TypeError("productSearchService é obrigatório.");
  }

  const app = express();
  const searchCache = createSearchCache();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(cors(corsOptions(config.frontendOrigins)));

  app.use((request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Cache-Control", "no-store");
    next();
  });

  const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      mensagem: "Muitas pesquisas foram feitas. Aguarde um minuto e tente novamente.",
    },
  });

  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      provider: productSearchService.providerName,
      mode: config.productSearch.mode,
    });
  });

  app.get("/api/search", searchLimiter, async (request, response) => {
    const query = String(request.query.q || "").trim().replace(/\s+/g, " ");

    if (query.length < 2 || query.length > 200) {
      response.status(400).json({
        mensagem: "A pesquisa deve ter entre 2 e 200 caracteres.",
      });
      return;
    }

    const cachedProducts = searchCache.get(query);

    if (cachedProducts) {
      response.json({
        consulta: query,
        total: cachedProducts.length,
        produtos: cachedProducts,
        cache: true,
      });
      return;
    }

    try {
      const products = await productSearchService.search(query);
      searchCache.set(query, products);

      response.json({
        consulta: query,
        total: products.length,
        produtos: products,
        cache: false,
      });
    } catch (error) {
      if (error instanceof ProductSearchError && error.code?.includes("NoResults")) {
        response.json({
          consulta: query,
          total: 0,
          produtos: [],
          cache: false,
        });
        return;
      }

      console.error("Erro ao consultar a Amazon:", {
        code: error.code,
        message: error.message,
        details: error.details,
      });

      response.status(error.status || 500).json({
        mensagem:
          error instanceof ProductSearchError
            ? friendlyProductSearchMessage(error)
            : "O servidor encontrou um erro inesperado.",
      });
    }
  });

  app.use((error, _request, response, _next) => {
    if (error.message?.includes("CORS")) {
      response.status(403).json({ mensagem: "Origem não autorizada." });
      return;
    }

    console.error("Erro não tratado:", error);
    response.status(500).json({ mensagem: "Erro interno do servidor." });
  });

  return app;
}
