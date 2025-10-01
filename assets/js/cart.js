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

  // ---------- lazy refs (важно при подгрузке partial) ----------
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

  // единоразовая привязка внутренних слушателей модалки
  function bindCartModalOnce() {
    const modal = getModal();
    if (!modal || modal.dataset.bound) return;
    modal.dataset.bound = "1";

    // закрыть по клику на фон/крестик
    modal.addEventListener("click", (e) => {
      if (e.target.matches("[data-cart-close], .cart__backdrop")) closeCart();
    });

    // закрыть по Esc
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCart();
    });
  }

  // ---------- open/close ----------
  // ---- unified bottom-sheet open/close + динамическая высота ----
  function setCartSheetHeights() {
    const sheet = document.querySelector("#cart-modal .cart__sheet");
    const scroll = document.querySelector("#cart-modal .cart__scroll");
    if (!sheet || !scroll) return;

    const vh =
      Math.min(window.innerHeight || 0, screen.height || 0) ||
      window.innerHeight;
    // целевая высота панели (как у меню): не выше 560px на невысоких экранах, но умно растём
    const H = Math.min(Math.max(vh - 80, 360), 720); // подгони при желании
    sheet.style.setProperty("--cart-sheet-h", H + "px");

    // внутренний скролл — минус отступы шапки/кнопки
    // паддинги/заголовок/кнопка закрытия ≈ 96px «съедают» высоту
    const innerMax = H - 96;
    scroll.style.maxHeight = Math.max(innerMax, 220) + "px";
  }

  function openCart() {
    const modal = getModal();
    if (!modal) return;

    // подготовим размеры ДО включения анимации
    setCartSheetHeights();

    // делаем видимым (без display:none => не рвём анимацию)
    modal.classList.add("is-mounted"); // вспомогательный флаг (см. CSS)
    // один кадр на раскладку
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

    // когда анимация закончится — снимем «mounted», чтобы не ловить фокус табом
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

  // (опционально) апселл
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

  // создаём секцию при необходимости и рендерим карточки
  function renderUpsell() {
    const modal = getModal?.() || document.getElementById("cart-modal");
    if (!modal) return;

    // секция
    let host = modal.querySelector("#cart-upsell");
    if (!host) {
      const scroll = modal.querySelector(".cart__scroll") || modal;
      host = document.createElement("section");
      host.id = "cart-upsell";
      host.className = "cart__upsell";
      host.setAttribute("aria-label", "Дополнить заказ");
      host.innerHTML = `
      <h4 class="cart__section-title">Дополнить заказ</h4>
      <div class="upsell__grid"></div>
    `;
      const list = modal.querySelector("#cart-list");
      (list?.parentNode === scroll ? list : scroll).insertAdjacentElement(
        "afterend",
        host
      );
    }

    const grid = host.querySelector(".upsell__grid");
    if (!grid) return;

    grid.innerHTML = "";
    UPS_DATA.forEach((p) => {
      const payload = {
        id: String(p.id),
        title: String(p.title),
        price: Number(p.price) || 0,
        img: String(p.img || ""),
        excerpt: String(p.excerpt || ""),
      };
      const card = document.createElement("div");
      card.className = "upsell-card";
      card.innerHTML = `
      <div class="upsell-card__img"><img src="${payload.img}" alt="${
        payload.title
      }"></div>
      <div class="upsell-card__title">${payload.title}</div>
      <button class="upsell-card__btn" type="button" data-add='${JSON.stringify(
        payload
      ).replace(/'/g, "&#39;")}'>
        ${money(payload.price)}
      </button>
    `;
      grid.appendChild(card);
    });

    host.style.display = ""; // всегда показываем
  }
  // клик по кнопке «цена» в апселле (внутри модалки)
  document.addEventListener("click", (e) => {
    const modal = document.getElementById("cart-modal");
    if (!modal || !modal.contains(e.target)) return;
    const btn = e.target.closest("[data-add]");
    if (!btn) return;

    try {
      const item = JSON.parse(btn.getAttribute("data-add") || "{}");
      if (item && item.id) {
        addItemToCart(item, 1);
        showToast(`«${item.title}» добавлен в корзину`);
        renderCart?.(); // перерисуем список и сумму
        updateCartBadge?.();
      }
    } catch {}
  });

  // Делегирование кликов ВНУТРИ модалки (qty/удаление/апселл)
  document.addEventListener("click", (e) => {
    const modal = getModal();
    if (!modal || !modal.contains(e.target)) return;

    const dec = e.target.closest('[data-act="dec"]');
    const inc = e.target.closest('[data-act="inc"]');
    const rm = e.target.closest("[data-remove]");
    const ups = e.target.closest("[data-add]");

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
    } else if (ups) {
      // обработка апселла по необходимости
    }
  });

  // ---------- delegated clicks (страница) ----------
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
      e.stopImmediatePropagation();
    });

    // держим бэйдж в актуальном состоянии
    document.addEventListener("cart:change", updateCartBadge);
  }

  // ---------- init ----------
  function initCartUI() {
    bindDelegatedOnce();
    bindCartModalOnce(); // важно при подгрузке partial
    updateCartBadge();
  }

  document.addEventListener("DOMContentLoaded", initCartUI);
  // после includePartials/подключения cart.html
  document.addEventListener("partials:loaded", initCartUI);
  document.addEventListener("cart:mounted", initCartUI);

  // ---- экспорт (по желанию) ----
  window.Cart = { open: openCart, render: renderCart, badge: updateCartBadge };
})();

(function mountPickers() {
  function init() {
    if (!window.flatpickr) return;

    // DATE
    const dateInput = document.querySelector('input[name="delivery_date"]');
    if (dateInput) {
      flatpickr(dateInput, {
        locale: flatpickr.l10ns.ru,
        dateFormat: "d.m.Y",
        minDate: "today",
        disableMobile: true, // <— ключевой флаг!
        onOpen: () =>
          dateInput.closest(".picker-wrap")?.classList.add("is-open"),
        onClose: () =>
          dateInput.closest(".picker-wrap")?.classList.remove("is-open"),
      });
    }

    // TIME
    const timeInput = document.querySelector('input[name="delivery_time"]');
    if (timeInput) {
      flatpickr(timeInput, {
        enableTime: true,
        noCalendar: true,
        time_24hr: true,
        minuteIncrement: 5,
        dateFormat: "H:i",
        disableMobile: true, // <— тоже важно
        onOpen: () =>
          timeInput.closest(".picker-wrap")?.classList.add("is-open"),
        onClose: () =>
          timeInput.closest(".picker-wrap")?.classList.remove("is-open"),
      });
    }
  }

  // когда страница готова
  document.addEventListener("DOMContentLoaded", init);
  // когда partials и модалка подгружены
  document.addEventListener("cart:mounted", init);
  document.addEventListener("partials:loaded", init);
})();

// open на focus/click
// === Стрелка у select "Город доставки" ===
(() => {
  const WRAP = ".cart__select-wrap";
  const SEL = ".cart__select";
  const OPEN = "is-open";

  // ОТКРЫТЬ: при фокусе или mousedown по самому select
  document.addEventListener("focusin", (e) => {
    if (e.target.matches(SEL)) {
      e.target.closest(WRAP)?.classList.add(OPEN);
    }
  });
  document.addEventListener("mousedown", (e) => {
    const sel = e.target.closest(SEL);
    if (sel) sel.closest(WRAP)?.classList.add(OPEN);
  });

  // ЗАКРЫТЬ: когда значение выбрано (change) или фокус ушёл (blur)
  document.addEventListener(
    "change",
    (e) => {
      if (e.target.matches(SEL)) {
        e.target.closest(WRAP)?.classList.remove(OPEN);
      }
    },
    true
  ); // capture — надёжнее в Safari
  document.addEventListener(
    "blur",
    (e) => {
      if (e.target.matches(SEL)) {
        e.target.closest(WRAP)?.classList.remove(OPEN);
      }
    },
    true
  );

  // ЗАКРЫТЬ: клик-вне и Esc
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

// ==== Fake checkout: отправка + редирект на success ====
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

      // собираем форму
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

      // UI: блокируем кнопку и имитируем отправку
      const btn = m.querySelector("#cart-submit");
      const prev = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add("is-loading");
      btn.innerHTML = "Отправляем…";

      try {
        // имитация сети (1.2 сек)
        await new Promise((r) => setTimeout(r, 1200));

        // сохраним «последний заказ» — можно показать на success
        try {
          localStorage.setItem("last_order", JSON.stringify(order));
        } catch {}

        // очистим корзину
        try {
          localStorage.setItem(CART_KEY, "[]");
          document.dispatchEvent(new CustomEvent("cart:change"));
        } catch {}

        // редирект
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

  // привязка в нужные моменты жизненного цикла
  document.addEventListener("DOMContentLoaded", bindOnce);
  document.addEventListener("partials:loaded", bindOnce);
  document.addEventListener("cart:mounted", bindOnce);
})();
