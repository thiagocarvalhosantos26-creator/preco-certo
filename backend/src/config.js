const VALID_CREDENTIAL_VERSIONS = new Set(["2.1", "2.2", "2.3", "3.1", "3.2", "3.3"]);

function requireVariables(env, names) {
  const missing = names.filter((name) => !env[name]?.trim());

  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente ausentes: ${missing.join(", ")}`);
  }
}

function optionalHttpsUrl(value, variableName) {
  if (!value?.trim()) return undefined;

  const url = new URL(value.trim());
  if (url.protocol !== "https:") {
    throw new Error(`${variableName} deve usar HTTPS.`);
  }

  return url.toString().replace(/\/+$/, "");
}

export function loadConfig(env = process.env) {
  const provider = (env.PRODUCT_SEARCH_PROVIDER || "amazon-creators").trim();
  const mode = (env.AMAZON_API_MODE || "mock").trim().toLowerCase();
  const credentialVersion = (env.AMAZON_CREATORS_CREDENTIAL_VERSION || "3.1").trim();
  const marketplace = (env.AMAZON_MARKETPLACE || "www.amazon.com.br").trim();

  if (provider !== "amazon-creators") {
    throw new Error(`Provedor de busca não suportado: ${provider}`);
  }

  if (!["mock", "live"].includes(mode)) {
    throw new Error("AMAZON_API_MODE deve ser mock ou live.");
  }

  if (!VALID_CREDENTIAL_VERSIONS.has(credentialVersion)) {
    throw new Error("AMAZON_CREATORS_CREDENTIAL_VERSION inválida.");
  }

  if (!/^www\.amazon\.[a-z.]+$/i.test(marketplace)) {
    throw new Error("AMAZON_MARKETPLACE deve ser um marketplace oficial www.amazon.*");
  }

  if (mode === "live") {
    requireVariables(env, [
      "AMAZON_CREATORS_CREDENTIAL_ID",
      "AMAZON_CREATORS_CREDENTIAL_SECRET",
      "AMAZON_CREATORS_CREDENTIAL_VERSION",
      "AMAZON_PARTNER_TAG",
      "AMAZON_MARKETPLACE",
    ]);
  }

  return {
    productSearch: {
      provider,
      mode,
      amazonCreators: {
        credentialId: env.AMAZON_CREATORS_CREDENTIAL_ID?.trim() || "",
        credentialSecret: env.AMAZON_CREATORS_CREDENTIAL_SECRET?.trim() || "",
        credentialVersion,
        partnerTag: env.AMAZON_PARTNER_TAG?.trim() || "",
        marketplace,
        apiBaseUrl: optionalHttpsUrl(
          env.AMAZON_CREATORS_API_BASE_URL,
          "AMAZON_CREATORS_API_BASE_URL",
        ),
        tokenUrl: optionalHttpsUrl(
          env.AMAZON_CREATORS_TOKEN_URL,
          "AMAZON_CREATORS_TOKEN_URL",
        ),
        minRequestIntervalMs:
          env.AMAZON_CREATORS_MIN_REQUEST_INTERVAL_MS === undefined
            ? 1100
            : Number(env.AMAZON_CREATORS_MIN_REQUEST_INTERVAL_MS),
      },
    },
    port: Number(env.PORT) || 3000,
    frontendOrigins: (env.FRONTEND_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim().replace(/\/+$/, ""))
      .filter(Boolean),
  };
}
