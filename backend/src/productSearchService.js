export class ProductSearchError extends Error {
  constructor(message, { status = 502, code = "ProductSearchError", details } = {}) {
    super(message);
    this.name = "ProductSearchError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isValidHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeProduct(product) {
  const asin = String(product.asin || product.id || "").trim();
  const affiliateUrl = String(product.linkAfiliado || "").trim();

  if (!asin || !isValidHttpsUrl(affiliateUrl)) {
    return null;
  }

  return {
    id: String(product.id || asin),
    asin,
    nome: String(product.nome || "Produto sem título"),
    imagem: product.imagem && isValidHttpsUrl(product.imagem) ? product.imagem : null,
    preco: product.preco ? String(product.preco) : null,
    disponibilidade: String(
      product.disponibilidade || "Consulte a disponibilidade",
    ),
    linkAfiliado: affiliateUrl,
  };
}

/**
 * Contrato genérico usado pela rota HTTP.
 * Qualquer provedor futuro precisa implementar apenas searchProducts(query).
 */
export function createProductSearchService({ provider, providerName = "unknown" }) {
  if (!provider || typeof provider.searchProducts !== "function") {
    throw new TypeError("O provedor deve implementar searchProducts(query).");
  }

  return {
    providerName,

    async search(query) {
      const products = await provider.searchProducts(query);

      if (!Array.isArray(products)) {
        throw new ProductSearchError("O provedor retornou uma resposta inválida.", {
          code: "InvalidProviderResponse",
        });
      }

      return products.map(normalizeProduct).filter(Boolean);
    },
  };
}
