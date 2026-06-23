function simpleHash(value) {
  return [...value].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function titleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toLocaleUpperCase("pt-BR") + part.slice(1))
    .join(" ");
}

function amazonSearchUrl(query, marketplace, partnerTag) {
  const url = new URL(`https://${marketplace}/s`);
  url.searchParams.set("k", query);

  if (partnerTag && !partnerTag.startsWith("seu_")) {
    url.searchParams.set("tag", partnerTag);
  }

  return url.toString();
}

/**
 * Catálogo fictício apenas para desenvolvimento local.
 * Não consulta páginas da Amazon e não representa preço ou estoque reais.
 */
export function createAmazonMockProvider({ marketplace, partnerTag }) {
  return {
    async searchProducts(query) {
      const normalizedQuery = titleCase(query);
      const seed = simpleHash(query);
      const baseUrl = amazonSearchUrl(query, marketplace, partnerTag);

      return [
        {
          id: `MOCK-${seed}-1`,
          asin: `MOCK-${seed}-1`,
          nome: `${normalizedQuery} — opção popular (mock)`,
          imagem: null,
          preco: `R$ ${((seed % 800) + 99).toLocaleString("pt-BR")},90`,
          disponibilidade: "Dados simulados para desenvolvimento",
          linkAfiliado: baseUrl,
        },
        {
          id: `MOCK-${seed}-2`,
          asin: `MOCK-${seed}-2`,
          nome: `${normalizedQuery} — melhor custo-benefício (mock)`,
          imagem: null,
          preco: null,
          disponibilidade: "Consulte preço e disponibilidade na Amazon",
          linkAfiliado: baseUrl,
        },
        {
          id: `MOCK-${seed}-3`,
          asin: `MOCK-${seed}-3`,
          nome: `${normalizedQuery} — alternativa recomendada (mock)`,
          imagem: null,
          preco: `R$ ${((seed % 1200) + 249).toLocaleString("pt-BR")},00`,
          disponibilidade: "Dados simulados para desenvolvimento",
          linkAfiliado: baseUrl,
        },
      ];
    },
  };
}
