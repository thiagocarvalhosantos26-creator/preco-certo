import assert from "node:assert/strict";
import test from "node:test";
import {
  createAmazonCreatorsApiProvider,
  normalizeCreatorsApiItem,
} from "../src/amazonCreatorsApi.js";

const creatorsItem = {
  asin: "B012345678",
  detailPageURL:
    "https://www.amazon.com.br/dp/B012345678?tag=precocerto-20&linkCode=ogi",
  images: {
    primary: {
      large: { url: "https://m.media-amazon.com/images/I/exemplo.jpg" },
    },
  },
  itemInfo: {
    title: { displayValue: "Produto de teste" },
  },
  offersV2: {
    listings: [
      {
        isBuyBoxWinner: true,
        availability: { type: "IN_STOCK" },
        price: {
          money: {
            amount: 99.9,
            currency: "BRL",
            displayAmount: "R$ 99,90",
          },
        },
      },
    ],
  },
};

test("normaliza resposta lowerCamelCase da Creators API", () => {
  assert.deepEqual(normalizeCreatorsApiItem(creatorsItem), {
    id: "B012345678",
    asin: "B012345678",
    nome: "Produto de teste",
    imagem: "https://m.media-amazon.com/images/I/exemplo.jpg",
    preco: "R$ 99,90",
    disponibilidade: "Em estoque",
    linkAfiliado:
      "https://www.amazon.com.br/dp/B012345678?tag=precocerto-20&linkCode=ogi",
  });
});

test("usa OAuth v3, SearchItems e reutiliza o token em cache", async () => {
  const calls = [];

  const fetchImpl = async (url, options) => {
    calls.push({ url, options });

    if (url.includes("/auth/o2/token")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "TOKEN_TESTE",
          expires_in: 3600,
          token_type: "bearer",
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        searchResult: { items: [creatorsItem] },
      }),
    };
  };

  const provider = createAmazonCreatorsApiProvider(
    {
      credentialId: "CREDENTIAL_ID_TESTE",
      credentialSecret: "CREDENTIAL_SECRET_TESTE",
      credentialVersion: "3.1",
      partnerTag: "precocerto-20",
      marketplace: "www.amazon.com.br",
      minRequestIntervalMs: 0,
    },
    { fetchImpl },
  );

  const firstProducts = await provider.searchProducts("fone bluetooth");
  const secondProducts = await provider.searchProducts("notebook");
  const tokenCalls = calls.filter((call) => call.url.includes("/auth/o2/token"));
  const searchCalls = calls.filter((call) => call.url.includes("/searchItems"));

  assert.equal(tokenCalls.length, 1);
  assert.equal(searchCalls.length, 2);
  assert.equal(
    tokenCalls[0].url,
    "https://api.amazon.com/auth/o2/token",
  );
  assert.equal(
    JSON.parse(tokenCalls[0].options.body).scope,
    "creatorsapi::default",
  );
  assert.equal(
    searchCalls[0].url,
    "https://creatorsapi.amazon/catalog/v1/searchItems",
  );
  assert.equal(searchCalls[0].options.headers.Authorization, "Bearer TOKEN_TESTE");
  assert.equal(searchCalls[0].options.headers["x-marketplace"], "www.amazon.com.br");
  assert.equal(JSON.parse(searchCalls[0].options.body).keywords, "fone bluetooth");
  assert.equal(firstProducts[0].asin, "B012345678");
  assert.equal(secondProducts[0].asin, "B012345678");
  assert.equal(JSON.stringify(firstProducts).includes("CREDENTIAL_SECRET_TESTE"), false);
});

test("usa OAuth v2 com Basic Auth e versão no Bearer", async () => {
  const calls = [];

  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return url.includes("/oauth2/token")
      ? {
          ok: true,
          status: 200,
          json: async () => ({ access_token: "TOKEN_V2", expires_in: 3600 }),
        }
      : {
          ok: true,
          status: 200,
          json: async () => ({ searchResult: { items: [] } }),
        };
  };

  const provider = createAmazonCreatorsApiProvider(
    {
      credentialId: "ID_V2",
      credentialSecret: "SECRET_V2",
      credentialVersion: "2.1",
      partnerTag: "precocerto-20",
      marketplace: "www.amazon.com.br",
      minRequestIntervalMs: 0,
    },
    { fetchImpl },
  );

  await provider.searchProducts("televisão");

  assert.match(calls[0].options.headers.Authorization, /^Basic /);
  assert.match(calls[0].options.body, /scope=creatorsapi%2Fdefault/);
  assert.equal(
    calls[1].options.headers.Authorization,
    "Bearer TOKEN_V2, Version 2.1",
  );
});
