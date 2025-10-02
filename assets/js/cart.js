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
      const num = val.replace(/\u00A0|&nbsp;|₽|\s/g, "").replace(",", ".");
      const n = Number(num);
      if (isFinite(n)) return n;
    }
    return 0;
  };

  // ---------- storage API ----------
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

  // ---------- lazy refs ----------
  function getModal() {
    return document.getElementById("cart-modal");
  }
  function getListEl() {
    return getModal()?.querySelector("#cart-list");
  }
  function getTotalEl() {
    return getModal()?.querySelector("#cart-total");
  }
  function getUpsellEl() {
    return getModal()?.querySelector("#cart-upsell");
  }

  // ---------- modal bindings ----------
  function bindCartModalOnce() {
    const modal = getModal();
    if (!modal || modal.dataset.bound) return;
    modal.dataset.bound = "1";

    modal.addEventListener("click", (e) => {
      if (e.target.matches("[data-cart-close], .cart__backdrop")) closeCart();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCart();
    });
  }

  // ---------- open/close ----------
  function setCartSheetHeights() {
    const sheet = document.querySelector("#cart-modal .cart__sheet");
    const scroll = document.querySelector("#cart-modal .cart__scroll");
    if (!sheet || !scroll) return;

    const vh =
      Math.min(window.innerHeight || 0, screen.height || 0) ||
      window.innerHeight;
    const H = Math.min(Math.max(vh - 80, 360), 720);
    sheet.style.setProperty("--cart-sheet-h", H + "px");

    const innerMax = H - 96;
    scroll.style.maxHeight = Math.max(innerMax, 220) + "px";
  }

  function openCart() {
    const modal = getModal();
    if (!modal) return;

    setCartSheetHeights();
    modal.classList.add("is-mounted");
    void modal.offsetWidth;
    modal.classList.add("is-open");

    document.documentElement.classList.add("no-scroll");
    window.addEventListener("resize", setCartSheetHeights, { passive: true });

    renderCart();
  }

  function closeCart() {
    const modal = getModal();
    if (!modal) return;

    modal.classList.remove("is-open");
    document.documentElement.classList.remove("no-scroll");
    window.removeEventListener("resize", setCartSheetHeights);

    const onEnd = (e) => {
      if (e.target.matches(".cart__sheet")) {
        modal.classList.remove("is-mounted");
        modal.removeEventListener("transitionend", onEnd);
      }
    };
    modal.addEventListener("transitionend", onEnd);
  }

  // ---------- rendering from LS ----------
  function renderCart() {
    const listEl = getListEl();
    const totalEl = getTotalEl();
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
        </div>
        <div class="cart__ctrls">
          <div>
            <div class="qty" data-id="${row.id}">
              <button class="qty__btn" data-act="dec" aria-label="Минус">−</button>
              <span class="qty__val">${row.qty}</span>
              <button class="qty__btn" data-act="inc" aria-label="Плюс">+</button>
            </div>
            <button class="cart__remove" data-remove="${
              row.id
            }" type="button">Удалить</button>
          </div>
          <div class="cart__price">${money(line)}</div>
        </div>
      `;
      listEl.appendChild(li);
    });

    totalEl.textContent = money(sum);
    renderUpsell();
  }

  // === UPSell (статичный список) ===
  const UPS_DATA = [
    {
      id: "add-001",
      title: "Открытка с пожеланием",
      price: 0,
      img: "assets/images/izobr/cert-1-1.jpg",
      href: "/addition.html?id=add-001",
      excerpt: "Подпишем от руки",
    },
    {
      id: "add-002",
      title: "Транспортировочный бокс с водой",
      price: 400,
      img: "assets/images/izobr/cert-1.jpg",
      href: "/addition.html?id=add-002",
      excerpt: "Свежесть в дороге",
    },
    {
      id: "add-003",
      title: "Секатор",
      price: 700,
      img: "assets/images/izobr/cert-2-2.jpg",
      href: "/addition.html?id=add-003",
      excerpt: "Уход за цветами",
    },
    {
      id: "add-004",
      title: "Ваза стеклянная",
      price: 1200,
      img: "assets/images/izobr/cert-2.jpg",
      href: "/addition.html?id=add-004",
      excerpt: "Минималистичная",
    },
  ];

  // Рендеринг апселл-карточек
  function renderUpsell() {
    console.log("renderUpsell called");
    const modal = getModal?.() || document.getElementById("cart-modal");
    if (!modal) {
      console.log("Modal not found");
      return;
    }

    // Создаем секцию, если отсутствует
    let host = modal.querySelector("#cart-upsell");
    if (!host) {
      console.log("Creating upsell section");
      const scroll = modal.querySelector(".cart__scroll") || modal;
      host = document.createElement("section");
      host.id = "cart-upsell";
      host.className = "cart__upsell";
      host.setAttribute("aria-label", "Дополнить заказ");
      host.innerHTML = `
        <h4 class="cart__section-title">Дополнить заказ</h4>
        <div class="upsell__grid"></div>
        <div class="upsell__slider-wrap">
          <button class="upsell-nav upsell-prev" aria-label="Предыдущие дополнения">
            <img src="assets/images/icons/arrowLeft.svg" alt="" />
          </button>
          <button class="upsell-nav upsell-next" aria-label="Следующие дополнения">
            <img src="assets/images/icons/arrowRight.svg" alt="" />
          </button>
          <div class="swiper upsell-swiper">
            <div class="swiper-wrapper"></div>
          </div>
        </div>
      `;
      const list = modal.querySelector("#cart-list");
      (list?.parentNode === scroll ? list : scroll).insertAdjacentElement(
        "afterend",
        host
      );
    }

    const grid = host.querySelector(".upsell__grid");
    const swiperWrapper = host.querySelector(".upsell-swiper .swiper-wrapper");
    if (!grid || !swiperWrapper) {
      console.log("Grid or swiper wrapper not found");
      return;
    }

    // Очищаем оба контейнера
    grid.innerHTML = "";
    swiperWrapper.innerHTML = "";
    console.log("Cleared grid and swiper wrapper");

    // Рендерим в нужный контейнер
    const isMobile = window.innerWidth <= 640;
    const target = isMobile ? swiperWrapper : grid;
    console.log(`Rendering to ${isMobile ? "swiper-wrapper" : "upsell__grid"}`);

    UPS_DATA.forEach((p, index) => {
      const payload = {
        id: String(p.id),
        title: String(p.title),
        price: Number(p.price) || 0,
        img: String(p.img || ""),
        excerpt: String(p.excerpt || ""),
        href: String(p.href || ""),
      };
      const card = document.createElement("a");
      card.className = isMobile
        ? "swiper-slide"
        : "product-card product-card--slider product-card--upsell";
      card.href = payload.href;
      card.setAttribute(
        "data-product",
        JSON.stringify(payload).replace(/'/g, "&#39;")
      );
      card.innerHTML = `
        <div class="product-card product-card--slider product-card--upsell">
          <div class="product-card__img">
            <img src="${payload.img}" alt="${payload.title}">
          </div>
          <div class="product-card__title">${payload.title}</div>
          <button class="product-card__price" type="button" data-add-to-cart>
            ${money(payload.price)}
          </button>
        </div>
      `;
      target.appendChild(card);
      console.log(`Rendered card ${index + 1}: ${payload.title}`);
    });

    host.style.display = "";
    console.log("Upsell section displayed");

    setTimeout(initUpsellSlider, 0);
  }

  // Инициализация Swiper
  let upsellSwiper = null;
  function initUpsellSlider() {
    console.log("initUpsellSlider called");
    if (upsellSwiper) {
      upsellSwiper.destroy(true, true);
      upsellSwiper = null;
      console.log("Destroyed previous Swiper instance");
    }

    if (window.innerWidth <= 640) {
      const swiperWrapper = document.querySelector(
        ".upsell-swiper .swiper-wrapper"
      );
      if (swiperWrapper && swiperWrapper.children.length > 0) {
        console.log(
          `Swiper initializing with ${swiperWrapper.children.length} slides`
        );
        upsellSwiper = new Swiper(".upsell-swiper", {
          slidesPerView: 2,
          spaceBetween: 12,
          navigation: {
            nextEl: ".upsell-nav.upsell-next",
            prevEl: ".upsell-nav.upsell-prev",
          },
        });
        console.log("Swiper initialized");
      } else {
        console.log(
          "No slides found in swiper-wrapper, skipping Swiper initialization"
        );
      }
    }
  }

  // Обработчик кликов по кнопке «добавить» в апселле
  document.addEventListener("click", (e) => {
    const modal = document.getElementById("cart-modal");
    if (!modal || !modal.contains(e.target)) return;
    const btn = e.target.closest("[data-add-to-cart]");
    if (!btn) return;

    const card = btn.closest(".product-card");
    if (!card) return;

    try {
      const item = JSON.parse(
        card.closest("[data-product]").getAttribute("data-product") || "{}"
      );
      if (item && item.id) {
        addItemToCart(item, 1);
        showToast(`«${item.title}» добавлен в корзину`);
        renderCart();
        updateCartBadge();
      }
    } catch (e) {
      console.error("Error adding item to cart:", e);
    }
  });

  // Делегирование кликов внутри модалки (qty/удаление)
  document.addEventListener("click", (e) => {
    const modal = getModal();
    if (!modal || !modal.contains(e.target)) return;

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

  // ---------- delegated clicks (страница) ----------
  function getItemFromCard(btn) {
    const card = btn.closest(".product-card");
    if (!card) return null;

    try {
      const raw = card.closest("[data-product]").getAttribute("data-product");
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

    document.addEventListener("click", (e) => {
      const opener = e.target.closest("[data-open-cart]");
      if (opener) {
        e.preventDefault();
        openCart();
      }
    });

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-add-to-cart]");
      if (!btn) return;

      if (btn.dataset.cartHandled === "1") return;
      btn.dataset.cartHandled = "1";
      setTimeout(() => {
        btn.dataset.cartHandled = "";
      }, 0);

      const item = getItemFromCard(btn);
      if (!item || !item.id) return;

      addItemToCart(item, 1);

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
      e.stopImmediatePropagation();
    });

    document.addEventListener("cart:change", updateCartBadge);
  }

  // ---------- init ----------
  function initCartUI() {
    console.log("initCartUI called");
    bindDelegatedOnce();
    bindCartModalOnce();
    updateCartBadge();
    renderUpsell();
    initUpsellSlider();
  }

  document.addEventListener("DOMContentLoaded", initCartUI);
  document.addEventListener("partials:loaded", initCartUI);
  document.addEventListener("cart:mounted", initCartUI);

  window.addEventListener(
    "resize",
    () => {
      console.log("Window resized, reinitializing upsell slider");
      renderUpsell();
    },
    { passive: true }
  );

  // ---- экспорт ----
  window.Cart = {
    open: openCart,
    render: renderCart,
    badge: updateCartBadge,
    upsell: renderUpsell,
  };
})();

// ==== Date/Time pickers ====
(() => {
  function init() {
    if (!window.flatpickr) return;

    const dateInput = document.querySelector('input[name="delivery_date"]');
    if (dateInput) {
      flatpickr(dateInput, {
        locale: flatpickr.l10ns.ru,
        dateFormat: "d.m.Y",
        minDate: "today",
        disableMobile: true,
        onOpen: () =>
          dateInput.closest(".picker-wrap")?.classList.add("is-open"),
        onClose: () =>
          dateInput.closest(".picker-wrap")?.classList.remove("is-open"),
      });
    }

    const timeInput = document.querySelector('input[name="delivery_time"]');
    if (timeInput) {
      flatpickr(timeInput, {
        enableTime: true,
        noCalendar: true,
        time_24hr: true,
        minuteIncrement: 5,
        dateFormat: "H:i",
        disableMobile: true,
        onOpen: () =>
          timeInput.closest(".picker-wrap")?.classList.add("is-open"),
        onClose: () =>
          timeInput.closest(".picker-wrap")?.classList.remove("is-open"),
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("cart:mounted", init);
  document.addEventListener("partials:loaded", init);
})();

// ==== Select "Город доставки" ===
(() => {
  const WRAP = ".cart__select-wrap";
  const SEL = ".cart__select";
  const OPEN = "is-open";

  document.addEventListener("focusin", (e) => {
    if (e.target.matches(SEL)) {
      e.target.closest(WRAP)?.classList.add(OPEN);
    }
  });
  document.addEventListener("mousedown", (e) => {
    const sel = e.target.closest(SEL);
    if (sel) sel.closest(WRAP)?.classList.add(OPEN);
  });

  document.addEventListener(
    "change",
    (e) => {
      if (e.target.matches(SEL)) {
        e.target.closest(WRAP)?.classList.remove(OPEN);
      }
    },
    true
  );
  document.addEventListener(
    "blur",
    (e) => {
      if (e.target.matches(SEL)) {
        e.target.closest(WRAP)?.classList.remove(OPEN);
      }
    },
    true
  );

  document.addEventListener("mousedown", (e) => {
    if (!e.target.closest(WRAP)) {
      document
        .querySelectorAll(`${WRAP}.${OPEN}`)
        .forEach((w) => w.classList.remove(OPEN));
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document
        .querySelectorAll(`${WRAP}.${OPEN}`)
        .forEach((w) => w.classList.remove(OPEN));
    }
  });
})();

// ==== Fake checkout ===
(() => {
  const CART_KEY = "cart";
  let bound = false;

  function bindOnce() {
    if (bound) return;
    const modal = document.getElementById("cart-modal");
    const btn = modal?.querySelector("#cart-submit");
    if (!btn) return;

    bound = true;
    btn.addEventListener("click", async () => {
      const cart = safeReadCart();
      if (!cart.length) {
        alert("Корзина пуста. Добавьте товары.");
        return;
      }

      const m = document.getElementById("cart-modal");
      const getVal = (sel) => m.querySelector(sel)?.value?.trim() || "";
      const getRadio = (name) =>
        m.querySelector(`input[name="${name}"]:checked`)?.value || "";

      const order = {
        id: makeOrderId(),
        createdAt: new Date().toISOString(),
        payMethod: getRadio("pay") || "online",
        deliveryType: getRadio("delivery") || "delivery",
        recipient: {
          name: getVal('input[name="recipient_name"]'),
          phone: getVal('input[name="recipient_phone"]'),
        },
        customer: {
          name: getVal('input[name="customer_name"]'),
          phone: getVal('input[name="customer_phone"]'),
        },
        schedule: {
          date: getVal('input[name="delivery_date"]'),
          time: getVal('input[name="delivery_time"]'),
          city: getVal('select[name="city"]'),
          address: getVal('textarea[name="address"]'),
        },
        items: cart.map(({ id, title, price, img, qty }) => ({
          id,
          title,
          price,
          img,
          qty,
        })),
        total: cart.reduce(
          (s, r) => s + (Number(r.price) || 0) * (r.qty || 1),
          0
        ),
      };

      const btn = m.querySelector("#cart-submit");
      const prev = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add("is-loading");
      btn.innerHTML = "Отправляем…";

      try {
        await new Promise((r) => setTimeout(r, 1200));
        try {
          localStorage.setItem("last_order", JSON.stringify(order));
        } catch {}
        try {
          localStorage.setItem(CART_KEY, "[]");
          document.dispatchEvent(new CustomEvent("cart:change"));
        } catch {}
        const q = new URLSearchParams({ order: order.id }).toString();
        location.href = "/success.html?" + q;
      } catch (e) {
        console.warn("Ошибка имитации отправки", e);
        alert("Не удалось отправить заказ. Попробуйте ещё раз.");
        btn.disabled = false;
        btn.classList.remove("is-loading");
        btn.innerHTML = prev;
      }
    });
  }

  function safeReadCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }
  function makeOrderId() {
    return (
      "R" +
      Math.random().toString(36).slice(2, 5).toUpperCase() +
      "-" +
      Date.now().toString(36).slice(-6).toUpperCase()
    );
  }

  document.addEventListener("DOMContentLoaded", bindOnce);
  document.addEventListener("partials:loaded", bindOnce);
  document.addEventListener("cart:mounted", bindOnce);
})();
