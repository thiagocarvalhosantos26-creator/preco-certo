import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { createApp } from "../src/app.js";
import { createProductSearchService } from "../src/productSearchService.js";

const config = {
  productSearch: {
    provider: "amazon-creators",
    mode: "mock",
  },
  frontendOrigins: ["https://usuario.github.io"],
};

async function withServer(searchItems, callback) {
  const provider = { searchProducts: searchItems };
  const productSearchService = createProductSearchService({
    provider,
    providerName: "test",
  });
  const server = createApp({ config, productSearchService }).listen(0);
  await once(server, "listening");

  try {
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("GET /api/search valida o termo", async () => {
  await withServer(async () => [], async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/search?q=a`);
    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.match(payload.mensagem, /2 e 200/);
  });
});

test("GET /api/search retorna produtos no contrato esperado", async () => {
  const product = {
    id: "B012345678",
    asin: "B012345678",
    nome: "Produto",
    imagem: "https://m.media-amazon.com/image.jpg",
    preco: null,
    disponibilidade: "Consulte a disponibilidade",
    linkAfiliado: "https://www.amazon.com.br/dp/B012345678?tag=teste-20",
  };

  await withServer(async () => [product], async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/search?q=produto`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.total, 1);
    assert.deepEqual(payload.produtos, [product]);
  });
});
