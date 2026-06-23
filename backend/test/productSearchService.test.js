import assert from "node:assert/strict";
import test from "node:test";
import { createProductSearchService } from "../src/productSearchService.js";

test("mantém o contrato público e descarta produtos sem link HTTPS", async () => {
  const provider = {
    async searchProducts() {
      return [
        {
          asin: "VALIDO",
          nome: "Produto válido",
          imagem: "http://imagem-insegura.example/produto.jpg",
          preco: null,
          linkAfiliado: "https://www.amazon.com.br/dp/VALIDO",
        },
        {
          asin: "INVALIDO",
          nome: "Produto inválido",
          linkAfiliado: "javascript:alert(1)",
        },
      ];
    },
  };
  const service = createProductSearchService({ provider, providerName: "test" });

  const products = await service.search("produto");

  assert.equal(products.length, 1);
  assert.equal(products[0].imagem, null);
  assert.equal(products[0].disponibilidade, "Consulte a disponibilidade");
});
