import "dotenv/config";
import { createAmazonCreatorsApiProvider } from "./amazonCreatorsApi.js";
import { createAmazonMockProvider } from "./amazonMockProvider.js";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createProductSearchService } from "./productSearchService.js";

try {
  const config = loadConfig();
  const amazonConfig = config.productSearch.amazonCreators;
  const provider =
    config.productSearch.mode === "mock"
      ? createAmazonMockProvider(amazonConfig)
      : createAmazonCreatorsApiProvider(amazonConfig);
  const productSearchService = createProductSearchService({
    provider,
    providerName: config.productSearch.provider,
  });
  const app = createApp({ config, productSearchService });

  app.listen(config.port, () => {
    console.log(`PreçoCerto backend disponível em http://localhost:${config.port}`);
    console.log(
      `Busca de produtos: ${config.productSearch.provider} (${config.productSearch.mode})`,
    );
  });
} catch (error) {
  console.error(`Não foi possível iniciar o backend: ${error.message}`);
  process.exit(1);
}
