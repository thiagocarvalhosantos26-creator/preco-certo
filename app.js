// URL pública do backend.
// Em produção, troque pelo endereço HTTPS onde a pasta backend/ foi publicada.
// Exemplo: "https://api.seudominio.com"
const API_BASE_URL = window.PRECOCERTO_API_URL || "https://preco-certo-backend.onrender.com";

const searchForm = document.querySelector("#searchForm");
const searchInput = document.querySelector("#searchInput");
const searchButton = document.querySelector("#searchButton");
const searchFeedback = document.querySelector("#searchFeedback");
const resultsPanel = document.querySelector("#comparar");
const resultsEyebrow = document.querySelector("#resultsEyebrow");
const resultsTitle = document.querySelector("#results-title");
const resultsCount = document.querySelector("#resultsCount");
const searchState = document.querySelector("#searchState");
const productsGrid = document.querySelector("#amazonProductsGrid");
const filterButtons = document.querySelectorAll(".filter-button");
const quickSearchButtons = document.querySelectorAll(".quick-searches button");
const toast = document.querySelector("#toast");
const mobileMenuButton = document.querySelector("#mobileMenuButton");
const mainNavigation = document.querySelector("#mainNavigation");

let products = [];
let activeFilter = "relevance";
let toastTimer;
let activeRequest;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

function setLoading(isLoading) {
  resultsPanel.setAttribute("aria-busy", String(isLoading));
  searchButton.disabled = isLoading;
  searchButton.classList.toggle("loading", isLoading);
  searchButton.querySelector("span").textContent = isLoading ? "Buscando..." : "Buscar";

  if (isLoading) {
    productsGrid.hidden = true;
    searchState.hidden = false;
    searchState.className = "search-state loading-state";
    searchState.innerHTML = `
      <span class="loading-spinner" aria-hidden="true"></span>
      <h3>Consultando a Amazon...</h3>
      <p>Buscando produtos, preços e disponibilidade.</p>
    `;
  }
}

function setEmptyState(title, message, type = "empty") {
  productsGrid.hidden = true;
  productsGrid.replaceChildren();
  searchState.hidden = false;
  searchState.className = `search-state ${type === "error" ? "error-state" : ""}`;

  const icon = document.createElement("span");
  icon.className = "search-state-icon";
  icon.textContent = type === "error" ? "!" : "⌕";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const paragraph = document.createElement("p");
  paragraph.textContent = message;

  searchState.replaceChildren(icon, heading, paragraph);
}

function isAvailable(product) {
  const unavailableTerms = [
    "indisponível",
    "esgotado",
    "out of stock",
    "unavailable",
    "fora de estoque",
  ];
  const availability = String(product.disponibilidade || "").toLowerCase();

  return !unavailableTerms.some((term) => availability.includes(term));
}

function getVisibleProducts() {
  if (activeFilter === "with-price") {
    return products.filter((product) => Boolean(product.preco));
  }

  if (activeFilter === "available") {
    return products.filter(isAvailable);
  }

  return products;
}

function createProductImage(product) {
  const wrapper = document.createElement("div");
  wrapper.className = "amazon-product-image";

  if (!product.imagem) {
    wrapper.classList.add("image-placeholder");
    wrapper.textContent = "Imagem indisponível";
    return wrapper;
  }

  const image = document.createElement("img");
  image.src = product.imagem;
  image.alt = product.nome;
  image.loading = "lazy";
  image.referrerPolicy = "no-referrer";
  image.addEventListener("error", () => {
    wrapper.classList.add("image-placeholder");
    wrapper.textContent = "Imagem indisponível";
    image.remove();
  });
  wrapper.append(image);

  return wrapper;
}

function createProductCard(product) {
  const article = document.createElement("article");
  article.className = "amazon-product-card";

  const image = createProductImage(product);
  const content = document.createElement("div");
  content.className = "amazon-product-content";

  const source = document.createElement("span");
  source.className = "amazon-source";
  source.textContent = `Amazon • ASIN ${product.asin}`;

  const title = document.createElement("h3");
  title.textContent = product.nome;

  const availability = document.createElement("span");
  availability.className = `availability-badge ${isAvailable(product) ? "available" : "unavailable"}`;
  availability.textContent = product.disponibilidade || "Consulte a disponibilidade";

  const priceLabel = document.createElement("span");
  priceLabel.className = "amazon-price-label";
  priceLabel.textContent = product.preco ? "Preço informado" : "Preço não exibido pela API";

  const price = document.createElement("strong");
  price.className = `amazon-price ${product.preco ? "" : "price-unavailable"}`;
  price.textContent = product.preco || "Ver preço na Amazon";

  const link = document.createElement("a");
  link.className = "amazon-link";
  link.href = product.linkAfiliado;
  link.target = "_blank";
  link.rel = "noopener noreferrer sponsored";
  link.textContent = "Ver na Amazon";
  link.setAttribute("aria-label", `Ver ${product.nome} na Amazon`);
  link.addEventListener("click", () => showToast("Abrindo o produto na Amazon."));

  content.append(source, title, availability, priceLabel, price, link);
  article.append(image, content);

  return article;
}

function renderProducts() {
  const visibleProducts = getVisibleProducts();
  productsGrid.replaceChildren();

  if (!visibleProducts.length) {
    setEmptyState(
      "Nenhum produto neste filtro",
      "Tente outro filtro ou faça uma nova pesquisa.",
    );
    resultsCount.textContent = "0 produtos";
    return;
  }

  visibleProducts.forEach((product) => {
    productsGrid.append(createProductCard(product));
  });

  searchState.hidden = true;
  productsGrid.hidden = false;
  resultsCount.textContent = `${visibleProducts.length} ${
    visibleProducts.length === 1 ? "produto" : "produtos"
  }`;
}

async function searchProducts(term, { scrollToResults = true } = {}) {
  if (activeRequest) {
    activeRequest.abort();
  }

  const requestController = new AbortController();
  activeRequest = requestController;
  setLoading(true);
  resultsEyebrow.textContent = "Buscando produtos";
  resultsTitle.textContent = `Resultados para “${term}”`;
  resultsCount.textContent = "";
  searchFeedback.textContent = `Buscando produtos para: ${term}`;

  if (scrollToResults) {
    resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const pageUrl = new URL(window.location.href);
  pageUrl.searchParams.set("q", term);
  window.history.replaceState({}, "", pageUrl);

  try {
    const endpoint = `${API_BASE_URL.replace(/\/$/, "")}/api/search?q=${encodeURIComponent(term)}`;
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: requestController.signal,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        payload.mensagem ||
          "Não foi possível consultar os produtos agora. Tente novamente em instantes.",
      );
    }

    products = Array.isArray(payload.produtos) ? payload.produtos : [];
    activeFilter = "relevance";
    filterButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.filter === activeFilter);
    });

    resultsEyebrow.textContent = "Produtos encontrados";

    if (!products.length) {
      setEmptyState(
        "Nenhum produto encontrado",
        "Tente pesquisar usando menos palavras ou um termo diferente.",
      );
      resultsCount.textContent = "0 produtos";
      searchFeedback.textContent = `Nenhum resultado encontrado para: ${term}`;
      return;
    }

    renderProducts();
    searchFeedback.textContent = `${products.length} produtos encontrados para: ${term}`;
  } catch (error) {
    if (error.name === "AbortError") return;

    products = [];
    resultsEyebrow.textContent = "Não foi possível concluir";
    resultsCount.textContent = "";
    setEmptyState(
      "A busca está indisponível",
      error.message || "Ocorreu um erro inesperado. Tente novamente mais tarde.",
      "error",
    );
    searchFeedback.textContent = "Não foi possível carregar os produtos.";
    showToast("Não foi possível consultar a Amazon agora.");
  } finally {
    if (activeRequest === requestController) {
      setLoading(false);
      activeRequest = null;
    }
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const term = searchInput.value.trim();

  if (term.length < 2) {
    searchFeedback.textContent = "Digite pelo menos 2 caracteres para pesquisar.";
    searchInput.focus();
    return;
  }

  searchProducts(term);
});

quickSearchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    searchInput.value = button.dataset.query;
    searchProducts(button.dataset.query);
  });
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    if (products.length) {
      renderProducts();
    } else {
      showToast("Faça uma pesquisa para usar os filtros.");
    }
  });
});

mobileMenuButton.addEventListener("click", () => {
  const menuIsOpen = mainNavigation.classList.toggle("open");
  mobileMenuButton.setAttribute("aria-expanded", String(menuIsOpen));
  mobileMenuButton.setAttribute("aria-label", menuIsOpen ? "Fechar menu" : "Abrir menu");
});

mainNavigation.addEventListener("click", (event) => {
  if (!event.target.matches("a")) return;

  mainNavigation.querySelectorAll("a").forEach((link) => link.classList.remove("active"));
  event.target.classList.add("active");
  mainNavigation.classList.remove("open");
  mobileMenuButton.setAttribute("aria-expanded", "false");
});

const initialQuery = new URLSearchParams(window.location.search).get("q")?.trim();

if (initialQuery && initialQuery.length >= 2) {
  searchInput.value = initialQuery;
  searchProducts(initialQuery, { scrollToResults: false });
}
