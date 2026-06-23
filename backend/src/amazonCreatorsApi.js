import { ProductSearchError } from "./productSearchService.js";

const DEFAULT_API_BASE_URL = "https://creatorsapi.amazon";
const TOKEN_EXPIRY_MARGIN_MS = 60 * 1000;

const TOKEN_ENDPOINTS = {
  "2.1": "https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token",
  "2.2": "https://creatorsapi.auth.eu-south-2.amazoncognito.com/oauth2/token",
  "2.3": "https://creatorsapi.auth.us-west-2.amazoncognito.com/oauth2/token",
  "3.1": "https://api.amazon.com/auth/o2/token",
  "3.2": "https://api.amazon.co.uk/auth/o2/token",
  "3.3": "https://api.amazon.co.jp/auth/o2/token",
};

const AVAILABILITY_LABELS = {
  AVAILABLE_DATE: "Disponível em data futura",
  IN_STOCK: "Em estoque",
  IN_STOCK_SCARCE: "Últimas unidades",
  LEADTIME: "Disponível sob encomenda",
  OUT_OF_STOCK: "Fora de estoque",
  PREORDER: "Pré-venda",
  UNAVAILABLE: "Indisponível",
  UNKNOWN: "Consulte a disponibilidade",
};

function firstListing(item) {
  const listings = item.offersV2?.listings || [];

  return (
    listings.find((listing) => listing.isBuyBoxWinner) ||
    listings[0] ||
    null
  );
}

function displayPrice(listing) {
  return listing?.price?.money?.displayAmount || null;
}

function displayAvailability(listing) {
  const availability = listing?.availability;

  if (!availability) {
    return "Consulte a disponibilidade";
  }

  return (
    availability.message ||
    availability.displayValue ||
    AVAILABILITY_LABELS[availability.type] ||
    "Consulte a disponibilidade"
  );
}

export function normalizeCreatorsApiItem(item) {
  const asin = item.asin;
  const listing = firstListing(item);

  return {
    id: asin,
    asin,
    nome: item.itemInfo?.title?.displayValue || "Produto sem título",
    imagem:
      item.images?.primary?.large?.url ||
      item.images?.primary?.medium?.url ||
      item.images?.primary?.small?.url ||
      null,
    preco: displayPrice(listing),
    disponibilidade: displayAvailability(listing),
    linkAfiliado: item.detailPageURL,
  };
}

function extractApiError(payload, responseStatus) {
  const apiError = payload?.errors?.[0] || payload?.error || {};
  const code =
    apiError.code ||
    apiError.error ||
    payload?.error_code ||
    `CreatorsApiHttp${responseStatus}`;
  const message =
    apiError.message ||
    apiError.error_description ||
    payload?.error_description ||
    "A Amazon não conseguiu processar a solicitação.";

  if (String(code).includes("NoResults")) {
    return new ProductSearchError(message, { status: 404, code });
  }

  if (responseStatus === 429 || String(code).includes("TooManyRequests")) {
    return new ProductSearchError(message, { status: 503, code: "TooManyRequests" });
  }

  if (responseStatus === 401 || responseStatus === 403) {
    return new ProductSearchError(message, { status: 502, code: "CreatorsAuthError" });
  }

  return new ProductSearchError(message, {
    status: responseStatus >= 500 ? 503 : 502,
    code,
  });
}

function buildTokenRequest(config) {
  if (config.credentialVersion.startsWith("2.")) {
    const basicCredentials = Buffer.from(
      `${config.credentialId}:${config.credentialSecret}`,
      "utf8",
    ).toString("base64");

    return {
      headers: {
        Authorization: `Basic ${basicCredentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "creatorsapi/default",
      }).toString(),
    };
  }

  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: config.credentialId,
      client_secret: config.credentialSecret,
      scope: "creatorsapi::default",
    }),
  };
}

function authorizationHeader(accessToken, credentialVersion) {
  if (credentialVersion.startsWith("2.")) {
    return `Bearer ${accessToken}, Version ${credentialVersion}`;
  }

  return `Bearer ${accessToken}`;
}

export function createAmazonCreatorsApiProvider(config, { fetchImpl = fetch } = {}) {
  let cachedToken = null;
  let pendingTokenRequest = null;
  let apiRequestQueue = Promise.resolve();
  let lastApiRequestAt = 0;

  const tokenEndpoint =
    config.tokenUrl || TOKEN_ENDPOINTS[config.credentialVersion];
  const apiBaseUrl = config.apiBaseUrl || DEFAULT_API_BASE_URL;
  const parsedInterval = Number(config.minRequestIntervalMs);
  const minRequestIntervalMs = Number.isFinite(parsedInterval)
    ? Math.max(parsedInterval, 0)
    : 1100;

  function enqueueApiRequest(callback) {
    const queuedRequest = apiRequestQueue.then(async () => {
      const elapsed = Date.now() - lastApiRequestAt;
      const waitTime = Math.max(minRequestIntervalMs - elapsed, 0);

      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      lastApiRequestAt = Date.now();
      return callback();
    });

    apiRequestQueue = queuedRequest.catch(() => {});
    return queuedRequest;
  }

  async function requestAccessToken() {
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
      return cachedToken.value;
    }

    if (pendingTokenRequest) {
      return pendingTokenRequest;
    }

    pendingTokenRequest = (async () => {
      const tokenRequest = buildTokenRequest(config);
      let response;

      try {
        response = await fetchImpl(tokenEndpoint, {
          method: "POST",
          headers: tokenRequest.headers,
          body: tokenRequest.body,
          signal: AbortSignal.timeout(10_000),
        });
      } catch (error) {
        throw new ProductSearchError("Falha ao autenticar na Creators API.", {
          status: 503,
          code: error.name === "TimeoutError" ? "CreatorsTokenTimeout" : "CreatorsTokenNetworkError",
          details: error.message,
        });
      }

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.access_token) {
        throw extractApiError(payload, response.status);
      }

      const lifetimeSeconds = Math.max(Number(payload.expires_in) || 3600, 120);
      cachedToken = {
        value: payload.access_token,
        expiresAt:
          Date.now() + lifetimeSeconds * 1000 - TOKEN_EXPIRY_MARGIN_MS,
      };

      return cachedToken.value;
    })();

    try {
      return await pendingTokenRequest;
    } finally {
      pendingTokenRequest = null;
    }
  }

  return {
    async searchProducts(keywords) {
      const accessToken = await requestAccessToken();
      const requestPayload = {
        keywords,
        itemCount: 10,
        languagesOfPreference:
          config.marketplace === "www.amazon.com.br" ? ["pt_BR"] : undefined,
        marketplace: config.marketplace,
        partnerTag: config.partnerTag,
        resources: [
          "images.primary.large",
          "itemInfo.title",
          "offersV2.listings.availability",
          "offersV2.listings.isBuyBoxWinner",
          "offersV2.listings.price",
        ],
        searchIndex: "All",
      };

      Object.keys(requestPayload).forEach((key) => {
        if (requestPayload[key] === undefined) delete requestPayload[key];
      });

      let response;

      try {
        response = await enqueueApiRequest(() =>
          fetchImpl(`${apiBaseUrl}/catalog/v1/searchItems`, {
            method: "POST",
            headers: {
              Authorization: authorizationHeader(
                accessToken,
                config.credentialVersion,
              ),
              "Content-Type": "application/json",
              "x-marketplace": config.marketplace,
            },
            body: JSON.stringify(requestPayload),
            signal: AbortSignal.timeout(12_000),
          }),
        );
      } catch (error) {
        throw new ProductSearchError("Falha de comunicação com a Creators API.", {
          status: 503,
          code: error.name === "TimeoutError" ? "CreatorsApiTimeout" : "CreatorsApiNetworkError",
          details: error.message,
        });
      }

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload?.errors?.length) {
        // Força uma nova autenticação caso o token tenha sido invalidado antes do prazo.
        if (response.status === 401) cachedToken = null;
        throw extractApiError(payload, response.status);
      }

      const items = payload.searchResult?.items || [];
      return items.map(normalizeCreatorsApiItem);
    },
  };
}
