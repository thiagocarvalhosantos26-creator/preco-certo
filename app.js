// =========================================================
// DADOS DO SITE
// Edite estes objetos para atualizar produtos e ofertas.
// =========================================================

const produtoDestaque = {
  nome: "Smartphone XPro 128GB",
  precoMedio: 1964,
  avaliacao: 4.8,
  imagem: "assets/smartphone.webp",
};

const ofertas = [
  {
    id: 1,
    loja: "Loja Alfa",
    sigla: "LA",
    cor: "#0878ee",
    preco: 1899,
    frete: "Grátis",
    prazo: "2 a 4 dias",
    oferta: "10% OFF no pix",
    textoBotao: "Ir para oferta",
    linkAfiliado: "https://exemplo.com/oferta-1",
  },
  {
    id: 2,
    loja: "Mega Compra",
    sigla: "MC",
    cor: "#17233e",
    preco: 1949,
    frete: "Grátis",
    prazo: "3 a 5 dias",
    oferta: "Cupom: MEGA10",
    textoBotao: "Comprar agora",
    linkAfiliado: "https://exemplo.com/oferta-2",
  },
  {
    id: 3,
    loja: "OfertaMax",
    sigla: "OM",
    cor: "#f04444",
    preco: 1979,
    frete: "R$ 19,90",
    prazo: "4 a 6 dias",
    oferta: "5% OFF no boleto",
    textoBotao: "Ir para oferta",
    linkAfiliado: "https://exemplo.com/oferta-3",
  },
  {
    id: 4,
    loja: "Compra Rápida",
    sigla: "CR",
    cor: "#eda900",
    preco: 2029,
    frete: "Grátis",
    prazo: "2 a 3 dias",
    oferta: "Frete grátis",
    textoBotao: "Comprar agora",
    linkAfiliado: "https://exemplo.com/oferta-4",
  },
];

const produtosComparados = [
  {
    nome: "Fone Bluetooth Pro",
    preco: 219.9,
    avaliacao: 4.6,
    imagem: "assets/fone-bluetooth.webp",
  },
  {
    nome: "Notebook Ultra 15",
    preco: 4299,
    avaliacao: 4.7,
    imagem: "assets/notebook.webp",
  },
  {
    nome: 'Smart TV 50" 4K',
    preco: 2199,
    avaliacao: 4.5,
    imagem: "assets/smart-tv.webp",
  },
];

// =========================================================
// ELEMENTOS E ESTADO
// =========================================================

const offersBody = document.querySelector("#offersBody");
const productsGrid = document.querySelector("#moreProductsGrid");
const searchForm = document.querySelector("#searchForm");
const searchInput = document.querySelector("#searchInput");
const searchFeedback = document.querySelector("#searchFeedback");
const filterButtons = document.querySelectorAll(".filter-button");
const toast = document.querySelector("#toast");
const mobileMenuButton = document.querySelector("#mobileMenuButton");
const mainNavigation = document.querySelector("#mainNavigation");

let activeFilter = "lowest";
let toastTimer;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// =========================================================
// RENDERIZAÇÃO
// =========================================================

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

function getFilteredOffers(filter) {
  const sortedOffers = [...ofertas].sort((a, b) => a.preco - b.preco);

  if (filter === "free-shipping") {
    return sortedOffers.filter((offer) => offer.frete === "Grátis");
  }

  if (filter === "coupon") {
    return sortedOffers.filter((offer) => offer.oferta.toLowerCase().includes("cupom"));
  }

  // "Loja" e "Avaliação" ficam preparados como filtros de interface.
  // Enquanto não há API/reputação real, eles exibem todas as lojas.
  return sortedOffers;
}

function renderOffers(filter = activeFilter) {
  const filteredOffers = getFilteredOffers(filter);
  const lowestPrice = Math.min(...ofertas.map((offer) => offer.preco));

  if (!filteredOffers.length) {
    offersBody.innerHTML = `
      <tr>
        <td class="empty-table-message" colspan="6">
          Nenhuma oferta encontrada com este filtro.
        </td>
      </tr>
    `;
    return;
  }

  offersBody.innerHTML = filteredOffers
    .map((offer) => {
      const isLowestPrice = offer.preco === lowestPrice;
      const isFreeShipping = offer.frete === "Grátis";

      return `
        <tr>
          <td>
            <div class="store-cell">
              <span class="store-logo" style="--store-color: ${offer.cor}">
                ${offer.sigla}
              </span>
              ${offer.loja}
            </div>
          </td>
          <td class="price-cell ${isLowestPrice ? "best-price" : ""}">
            ${formatCurrency(offer.preco)}
          </td>
          <td class="${isFreeShipping ? "shipping-free" : ""}">${offer.frete}</td>
          <td>${offer.prazo}</td>
          <td><span class="offer-pill">${offer.oferta}</span></td>
          <td>
            <a
              class="buy-button ${isLowestPrice ? "green" : ""}"
              href="${offer.linkAfiliado}"
              target="_blank"
              rel="noopener noreferrer sponsored"
              data-store="${offer.loja}"
            >
              ${offer.textoBotao}
            </a>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderMoreProducts() {
  productsGrid.innerHTML = produtosComparados
    .map(
      (product) => `
        <article class="product-card">
          <div class="product-card-image">
            <img src="${product.imagem}" alt="${product.nome}" loading="lazy" />
          </div>
          <div>
            <h3>${product.nome}</h3>
            <span class="price-label">Menor preço</span>
            <strong class="product-price">${formatCurrency(product.preco)}</strong>
            <div class="mini-rating" aria-label="Avaliação ${product.avaliacao} de 5">
              <span>${product.avaliacao}</span>
              <span class="stars">★★★★★</span>
            </div>
            <button class="view-offers-button" type="button" data-product="${product.nome}">
              Ver ofertas
            </button>
          </div>
        </article>
      `,
    )
    .join("");
}

// =========================================================
// INTERAÇÕES
// =========================================================

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const term = searchInput.value.trim();

  if (!term) {
    searchFeedback.textContent = "Digite um produto para iniciar a busca.";
    searchInput.focus();
    return;
  }

  searchFeedback.textContent = `Buscando ofertas para: ${term}`;
  showToast(`Buscando ofertas para: ${term}`);

  document.querySelector("#comparar").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderOffers(activeFilter);

    const messages = {
      lowest: "Ofertas ordenadas pelo menor preço.",
      "free-shipping": "Mostrando apenas ofertas com frete grátis.",
      coupon: "Mostrando ofertas com cupom disponível.",
      store: "Todas as lojas parceiras estão visíveis.",
      rating: "Avaliações das lojas serão integradas futuramente.",
    };

    showToast(messages[activeFilter]);
  });
});

offersBody.addEventListener("click", (event) => {
  const affiliateLink = event.target.closest(".buy-button");

  if (affiliateLink) {
    showToast(`Abrindo a oferta da ${affiliateLink.dataset.store} em uma nova aba.`);
  }
});

productsGrid.addEventListener("click", (event) => {
  const productButton = event.target.closest(".view-offers-button");

  if (!productButton) return;

  searchInput.value = productButton.dataset.product;
  searchFeedback.textContent = `Buscando ofertas para: ${productButton.dataset.product}`;
  showToast(`Produto selecionado: ${productButton.dataset.product}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
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

// Renderização inicial da página.
renderOffers();
renderMoreProducts();

console.info("Produto em destaque:", produtoDestaque.nome);
