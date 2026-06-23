import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config.js";

test("modo mock inicia sem credenciais reais", () => {
  const config = loadConfig({
    AMAZON_API_MODE: "mock",
    AMAZON_MARKETPLACE: "www.amazon.com.br",
  });

  assert.equal(config.productSearch.mode, "mock");
  assert.equal(config.productSearch.provider, "amazon-creators");
  assert.equal(config.productSearch.amazonCreators.credentialId, "");
});

test("modo live exige credenciais da Creators API", () => {
  assert.throws(
    () =>
      loadConfig({
        AMAZON_API_MODE: "live",
        AMAZON_CREATORS_CREDENTIAL_VERSION: "3.1",
        AMAZON_MARKETPLACE: "www.amazon.com.br",
      }),
    /AMAZON_CREATORS_CREDENTIAL_ID/,
  );
});

test("modo live aceita credenciais OAuth versionadas", () => {
  const config = loadConfig({
    AMAZON_API_MODE: "live",
    AMAZON_CREATORS_CREDENTIAL_ID: "credential-id",
    AMAZON_CREATORS_CREDENTIAL_SECRET: "credential-secret",
    AMAZON_CREATORS_CREDENTIAL_VERSION: "3.1",
    AMAZON_PARTNER_TAG: "precocerto-20",
    AMAZON_MARKETPLACE: "www.amazon.com.br",
  });

  assert.equal(config.productSearch.mode, "live");
  assert.equal(
    config.productSearch.amazonCreators.credentialVersion,
    "3.1",
  );
});
