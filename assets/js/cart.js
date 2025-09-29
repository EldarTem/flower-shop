/* ==============================
   Cart (unified, full items)
   ============================== */

(() => {
  const CART_KEY = "cart";

  // ---------- utils ----------
  const money = (n) => Number(n || 0).toLocaleString("ru-RU") + " ₽";
  const readLS = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const writeLS = (key, val) => {
    localStorage.setItem(key, JSON.stringify(val));
    document.dispatchEvent(new CustomEvent("cart:change"));
  };
  const fmtPriceNumber = (val) => {
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "string") {
      // выкинем пробелы, &nbsp; и знак ₽
      const num = val.replace(/\u00A0|&nbsp;|₽|\s/g, "").replace(",", ".");
      const n = Number(num);
      if (isFinite(n)) return n;
    }
    return 0;
  };

  // ---------- storage API (полные строки) ----------
  function getCart() {
    const raw = readLS(CART_KEY, []);
    return Array.isArray(raw)
      ? raw.filter(Boolean).map((row) => ({
          id: String(row.id),
          title: String(row.title || ""),
          price: fmtPriceNumber(row.price),
          img: String(row.img || ""),
          excerpt: String(row.excerpt || ""),
          qty: Math.max(1, Number(row.qty) || 1),
        }))
      : [];
  }
  function setCart(rows) {
    writeLS(CART_KEY, rows);
  }
  function addItemToCart(item, qty = 1) {
    const id = String(item.id);
    const inc = Math.max(1, Number(qty) || 1);

    const cart = getCart();
    const idx = cart.findIndex((r) => r.id === id);
    if (idx >= 0) {
      cart[idx].qty += inc;
      // Обновим данные товара (на случай, если изменились имя/цена/картинка)
      cart[idx].title = item.title ?? cart[idx].title;
      cart[idx].price = fmtPriceNumber(item.price ?? cart[idx].price);
      cart[idx].img = item.img ?? cart[idx].img;
      cart[idx].excerpt = item.excerpt ?? cart[idx].excerpt;
    } else {
      cart.push({
        id,
        title: String(item.title || ""),
        price: fmtPriceNumber(item.price),
        img: String(item.img || ""),
        excerpt: String(item.excerpt || ""),
        qty: inc,
      });
    }
    setCart(cart);
    return cart.reduce((s, r) => s + (r.qty || 0), 0);
  }
  function removeFromCart(id) {
    id = String(id);
    setCart(getCart().filter((r) => r.id !== id));
  }
  function changeQty(id, delta) {
    id = String(id);
    const cart = getCart();
    const row = cart.find((r) => r.id === id);
    if (!row) return;
    row.qty = Math.max(1, row.qty + (Number(delta) || 0));
    setCart(cart);
  }
  function getCartCount() {
    return getCart().reduce((s, r) => s + (r.qty || 0), 0);
  }

  // ---------- toast ----------
  function ensureToastHost() {
    let host = document.getElementById("toast-root");
    if (!host) {
      host = document.createElement("div");
      host.id = "toast-root";
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    return host;
  }
  function showToast(text) {
    const host = ensureToastHost();
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = text;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-open"));
    setTimeout(() => {
      el.classList.remove("is-open");
      el.addEventListener("transitionend", () => el.remove(), { once: true });
    }, 2400);
  }

  // ---------- header badge ----------
  function updateCartBadge() {
    const ind = document.querySelector("[data-open-cart] .cart-indicator");
    if (!ind) return;
    const count = getCartCount();
    ind.classList.toggle("is-on", count > 0);
    ind.textContent = count > 0 ? String(count) : "";
  }

  // ---------- modal refs ----------
  const modal = document.getElementById("cart-modal");
  const listEl = modal ? modal.querySelector("#cart-list") : null;
  const totalEl = modal ? modal.querySelector("#cart-total") : null;
  const upsellEl = modal ? modal.querySelector("#cart-upsell") : null;

  function openCart() {
    if (!modal) return;
    renderCart();
    modal.classList.add("is-open");
    document.documentElement.classList.add("no-scroll");
  }
  function closeCart() {
    if (!modal) return;
    modal.classList.remove("is-open");
    document.documentElement.classList.remove("no-scroll");
  }
  modal?.addEventListener("click", (e) => {
    if (e.target.matches("[data-cart-close], .cart__backdrop")) closeCart();
  });

  // ---------- rendering from LS (без window.PRODUCTS) ----------
  function renderCart() {
    if (!listEl || !totalEl) return;

    const cart = getCart();
    let sum = 0;
    listEl.innerHTML = "";

    cart.forEach((row) => {
      const line = (Number(row.price) || 0) * row.qty;
      sum += line;

      const li = document.createElement("li");
      li.className = "cart__item";
      li.innerHTML = `
        <div class="cart__thumb"><img src="${row.img || ""}" alt=""></div>
        <div>
          <h4 class="cart__name">${row.title || "Товар"}</h4>
          ${row.excerpt ? `<p class="cart__meta">${row.excerpt}</p>` : ""}
          <div class="cart__ctrls">
            <div class="qty" data-id="${row.id}">
              <button class="qty__btn" data-act="dec" aria-label="Минус">−</button>
              <span class="qty__val">${row.qty}</span>
              <button class="qty__btn" data-act="inc" aria-label="Плюс">+</button>
            </div>
            <button class="cart__remove" data-remove="${
              row.id
            }" type="button">Удалить</button>
          </div>
        </div>
        <div class="cart__price">${money(line)}</div>
      `;
      listEl.appendChild(li);
    });

    totalEl.textContent = money(sum);
    renderUpsell();
  }

  // (опционально) апселл — можешь оставить пустым или заполнить как нужно
  function renderUpsell() {
    if (!upsellEl) return;
    upsellEl.innerHTML = ""; // тут можно подставить произвольные товары
  }
  upsellEl?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    // здесь ожидается полный объект; если будет только id — дополни сам
  });

  // qty +/- и удаление
  listEl?.addEventListener("click", (e) => {
    const dec = e.target.closest('[data-act="dec"]');
    const inc = e.target.closest('[data-act="inc"]');
    const rm = e.target.closest("[data-remove]");

    if (dec || inc) {
      const wrap = e.target.closest(".qty");
      const id = wrap?.dataset.id;
      if (id) changeQty(id, inc ? +1 : -1);
      renderCart();
      updateCartBadge();
    } else if (rm) {
      removeFromCart(rm.dataset.remove);
      renderCart();
      updateCartBadge();
    }
  });

  // ---------- delegated clicks ----------
  function getItemFromCard(btn) {
    const card = btn.closest(".product-card");
    if (!card) return null;

    // 1) Пытаемся взять из data-product (правильный путь)
    try {
      const raw = card.getAttribute("data-product");
      if (raw) {
        const obj = JSON.parse(raw);
        return {
          id: obj.id,
          title: obj.title,
          price: obj.price,
          img: obj.img,
          excerpt: obj.excerpt,
        };
      }
    } catch {}

    // 2) Фолбэк: собираем из DOM
    const id =
      new URL(
        card.getAttribute("href") || "",
        location.origin
      ).searchParams.get("sku") || "";
    const title =
      card.querySelector(".product-card__title")?.textContent?.trim() || "";
    const img =
      card.querySelector(".product-card__img img")?.getAttribute("src") || "";
    const priceText =
      card.querySelector(".product-card__price")?.textContent || "";
    return { id, title, img, price: fmtPriceNumber(priceText), excerpt: "" };
  }

  function bindDelegatedOnce() {
    if (document.documentElement.dataset.cartBound) return;
    document.documentElement.dataset.cartBound = "1";

    // Открыть корзину по иконке
    document.addEventListener("click", (e) => {
      const opener = e.target.closest("[data-open-cart]");
      if (!opener) return;
      e.preventDefault();
      openCart();
    });

    // Добавить в корзину
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-add-to-cart]");
      if (!btn) return;

      // защита от повторной обработки этим же событием
      if (btn.dataset.cartHandled === "1") return;
      btn.dataset.cartHandled = "1";
      // сбросим флажок после текущего стека вызовов
      setTimeout(() => {
        btn.dataset.cartHandled = "";
      }, 0);

      const item = getItemFromCard(btn);
      if (!item || !item.id) return;

      addItemToCart(item, 1);

      // Визуальный отклик
      const prevHTML = btn.innerHTML;
      btn.classList.add("is-added");
      btn.innerHTML = "Добавлено&nbsp;✓";
      btn.style.transform = "scale(0.98)";
      setTimeout(() => {
        btn.style.transform = "";
      }, 120);
      clearTimeout(btn._restoreTimer);
      btn._restoreTimer = setTimeout(() => {
        btn.classList.remove("is-added");
        btn.innerHTML = prevHTML;
      }, 1200);

      showToast(`«${item.title}» добавлен в корзину`);
      updateCartBadge();

      e.preventDefault();
      e.stopImmediatePropagation(); // жёстко останавливаем другие click-слушатели
    });

    // держим бэйдж в актуальном состоянии
    document.addEventListener("cart:change", updateCartBadge);
  }

  // ---------- init ----------
  function initCartUI() {
    bindDelegatedOnce();
    updateCartBadge();
  }

  document.addEventListener("DOMContentLoaded", initCartUI);
  // после includePartials триггерим повторную синхронизацию
  document.addEventListener("partials:loaded", initCartUI);

  // ---- экспорт (по желанию) ----
  window.Cart = { open: openCart, render: renderCart, badge: updateCartBadge };
})();
