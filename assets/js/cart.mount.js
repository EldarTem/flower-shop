// assets/js/cart.mount.js
(() => {
  const PARTIAL_URL = "/partials/cart.html";
  const CART_ID = "cart-modal";

  // Глобальный API для открытия/закрытия (по желанию)
  window.CartUI = {
    open() {
      const el = document.getElementById(CART_ID);
      if (!el) return;
      el.classList.add("is-open");
      el.setAttribute("aria-hidden", "false");
      document.documentElement.style.overflow = "hidden";
      document.dispatchEvent(new CustomEvent("cart:open"));
    },
    close() {
      const el = document.getElementById(CART_ID);
      if (!el) return;
      el.classList.remove("is-open");
      el.setAttribute("aria-hidden", "true");
      document.documentElement.style.overflow = "";
      document.dispatchEvent(new CustomEvent("cart:close"));
    },
    mounted: false,
  };

  async function mountCart() {
    if (document.getElementById(CART_ID)) {
      window.CartUI.mounted = true;
      return; // уже вставлено
    }

    // Загружаем HTML партил
    const res = await fetch(PARTIAL_URL, { credentials: "same-origin" });
    const html = await res.text();

    // Вставляем в конец body
    const tmp = document.createElement("div");
    tmp.innerHTML = html.trim();
    const cartEl = tmp.firstElementChild;
    if (!cartEl) return;

    document.body.appendChild(cartEl);
    window.CartUI.mounted = true;

    // Делегирование кликов для открытия/закрытия
    // Любой элемент с [data-open-cart] открывает корзину
    document.addEventListener("click", (e) => {
      const opener = e.target.closest("[data-open-cart]");
      if (opener) {
        e.preventDefault();
        window.CartUI.open();
      }
      const closer = e.target.closest("[data-cart-close]");
      if (closer) {
        e.preventDefault();
        window.CartUI.close();
      }
    });

    // Закрытие по Esc
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") window.CartUI.close();
    });

    // Сообщим остальным скриптам, что корзина готова
    document.dispatchEvent(new CustomEvent("cart:mounted"));
  }

  // Монтируем, когда DOM готов
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountCart, { once: true });
  } else {
    mountCart();
  }
})();
