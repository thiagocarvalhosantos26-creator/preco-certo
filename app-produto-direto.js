const PRODUCT = {
  affiliateUrl: "https://www.amazon.com.br/dp/B09Z5NH6SJ?tag=thiago2607-20",
};

const affiliateLinks = document.querySelectorAll("[data-affiliate-link]");
const menuToggle = document.querySelector("#menuToggle");
const navMenu = document.querySelector("#navMenu");

affiliateLinks.forEach((link) => {
  link.href = PRODUCT.affiliateUrl;
  link.target = "_blank";
  link.rel = "noopener sponsored nofollow";
});

if (menuToggle && navMenu) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
  });

  navMenu.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;

    navMenu.querySelectorAll("a").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
    navMenu.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menu");
  });
}
