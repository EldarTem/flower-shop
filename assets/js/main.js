document.addEventListener("DOMContentLoaded", async () => {
  await includePartials?.();
  updateCartIndicator();
  // мостики высот (чтобы стрелки/картинки были синхронны)
  const popular = document.querySelector(".popular");
  if (popular) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(
      "--popular-img-h"
    );
    if (v) popular.style.setProperty("--pc-img-h", v);
  }
  const catalog = document.querySelector(".catalog");
  if (catalog) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(
      "--catalog-img-h"
    );
    if (v) catalog.style.setProperty("--pc-img-h-catalog", v);
  }

  // если есть карусель «Популярное» — отрисуем
  await renderPopularFromJson?.();

  // если мы на странице каталога — отрисуем сетку каталога
  if (document.querySelector("#catalog-grid")) {
    await renderCatalogFromJson({
      url: "assets/data/products.json",
      container: "#catalog-grid",
      // limit: 24
    });
  }

  initHeroSwiper?.();
  initPopularSwiper?.();
  initMegaMenu?.();
  initMobileNav?.(); // если используешь
  initBackToTop();
});

// --- Вставка частичных шаблонов ---
async function includePartials() {
  const headerPh = document.getElementById("header-placeholder");
  const footerPh = document.getElementById("footer-placeholder");

  if (headerPh) {
    const h = await fetch("partials/header.html").then((r) => r.text());
    headerPh.outerHTML = h;
  }
  if (footerPh) {
    const f = await fetch("partials/footer.html").then((r) => r.text());
    footerPh.outerHTML = f;
  }
}

// --- Swiper: hero ---
function initHeroSwiper() {
  if (typeof Swiper === "undefined") return;
  new Swiper(".hero-swiper", {
    loop: true,
    autoplay: { delay: 5000 },
    speed: 700,
    pagination: {
      el: ".hero-swiper .swiper-pagination",
      clickable: true,
      // без динамических буллетов — как на макете
      // dynamicBullets: false
    },
  });
}

// --- Swiper: popular (карусель) ---
function initPopularSwiper() {
  if (typeof Swiper === "undefined") return;

  new Swiper(".popular-swiper", {
    // карусель
    loop: true,
    // небольшая «подушка» для бесшовного цикла
    loopAdditionalSlides: 8,
    speed: 600,
    grabCursor: true,
    watchOverflow: false,

    navigation: {
      nextEl: ".popular-next",
      prevEl: ".popular-prev",
    },

    keyboard: { enabled: true },

    breakpoints: {
      // Мобилка — 2 карточки, компактные промежутки
      0: { slidesPerView: 2, spaceBetween: 12 },
      480: { slidesPerView: 2, spaceBetween: 16 },

      // Планшет
      768: { slidesPerView: 3, spaceBetween: 20 },

      // Десктоп
      1200: { slidesPerView: 4, spaceBetween: 28 },
    },
  });
}

// --- Мега-меню (по наведению) ---
const MEGA_MENUS = {
  flowers: [
    {
      title: "Букеты",
      href: "/bouquet-menu.html", // ← ссылка для заголовка колонки
      divided: false,
      items: [
        { label: "Авторские", href: "/catalog.html" },
        { label: "На вкус флориста", href: "/custom-bouquet.html" },
        { label: "Гиганты", href: "/catalog.html" },
        { label: "101 роза", href: "/catalog.html" },
        { label: "Свадебные букеты", href: "/catalog.html" },
      ],
    },
    {
      title: "Цветочное меню",
      href: "/flower-menu.html", // опционально
      divided: true,
      items: [
        { label: "Розы", href: "/catalog.html" },
        { label: "Кустовые розы", href: "/catalog.html" },
        { label: "Пионовидные розы", href: "/catalog.html" },
        { label: "Гортензии", href: "/catalog.html" },
        { label: "Хризантемы", href: "/catalog.html" },
        { label: "Диантусы", href: "/catalog.html" },
        { label: "Тюльпаны", href: "/catalog.html" },
        { label: "Гипсофилы", href: "/catalog.html" },
      ],
    },
    {
      title: "Композиции",
      href: "/composition-menu.html",
      divided: true,
      items: [
        { label: "Коробы", href: "/catalog.html" },
        { label: "Коробки", href: "/catalog.html" },
        { label: "Сумочки", href: "/catalog.html" },
        { label: "Корзины", href: "/catalog.html" },
      ],
    },
  ],
};

function buildMegaPopover(columns) {
  const el = document.createElement("div");
  el.className = "mega-popover";
  const grid = document.createElement("div");
  grid.className = "mega-grid";

  columns.forEach((col) => {
    const c = document.createElement("div");
    c.className = col.divided ? "mega-col mega-col--divided" : "mega-col";

    // Заголовок: если есть col.href — делаем ссылкой
    let titleEl;
    if (col.href) {
      const a = document.createElement("a");
      a.className = "mega-title mega-title__link";
      a.href = col.href;
      a.textContent = col.title;
      // внешние — в новой вкладке
      if (/^https?:\/\//i.test(a.href)) {
        //a.target = "_blank";
        a.rel = "noopener";
      }
      titleEl = a;
    } else {
      const h = document.createElement("h3");
      h.className = "mega-title";
      h.textContent = col.title;
      titleEl = h;
    }

    const ul = document.createElement("ul");
    ul.className = "mega-list";

    col.items.forEach((item) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.className = "mega-link";
      a.href = item.href || "#";
      a.textContent = item.label;
      if (/^https?:\/\//i.test(a.href)) {
        //a.target = "_blank";
        a.rel = "noopener";
      }
      li.appendChild(a);
      ul.appendChild(li);
    });

    c.append(titleEl, ul);
    grid.appendChild(c);
  });

  el.appendChild(grid);
  document.body.appendChild(el);
  return el;
}

function positionPopover(popover, { anchorContainer, navBar }, offset = 12) {
  const contRect = anchorContainer.getBoundingClientRect();
  const navRect = navBar.getBoundingClientRect();
  const vw = window.innerWidth;
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const scrollX = window.scrollX || document.documentElement.scrollLeft;

  const maxWidth = Math.min(1280, vw * 0.98);
  const availableWidth = Math.min(maxWidth, contRect.width);

  const left = Math.round(contRect.left + scrollX);
  const top = Math.round(navRect.bottom + scrollY + offset);

  popover.style.width = availableWidth + "px";
  popover.style.left = left + "px";
  popover.style.top = top + "px";
}

function initMegaMenu() {
  const trigger = document.querySelector('[data-menu="flowers"]');
  if (!trigger) return;

  const navBar = document.querySelector(".main-nav__list");
  const anchorContainer =
    document.querySelector(".main-nav .container") ||
    document.querySelector(".main-nav__list");
  if (!navBar || !anchorContainer) return;

  const popover = buildMegaPopover(MEGA_MENUS.flowers);
  let isOpen = false;
  let closeTimer = null;

  function openPopover() {
    positionPopover(popover, { anchorContainer, navBar }, 12);
    popover.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    isOpen = true;
  }
  function closePopover() {
    popover.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    isOpen = false;
  }
  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closePopover, 120);
  }
  function cancelClose() {
    clearTimeout(closeTimer);
  }

  const host = trigger.closest(".main-nav__item") || trigger;

  // hover
  host.addEventListener("mouseenter", () => {
    cancelClose();
    if (!isOpen) openPopover();
  });
  host.addEventListener("mouseleave", scheduleClose);

  popover.addEventListener("mouseenter", cancelClose);
  popover.addEventListener("mouseleave", scheduleClose);

  // закрывать при клике по любому пункту внутри поповера
  popover.addEventListener("click", (ev) => {
    const link = ev.target.closest(".mega-link, .mega-title__link");
    if (!link) return;
    closePopover();
    // тут можно дать SPA-роутеру обработать переход, ничего не препятствуем
  });

  // репозиционирование
  window.addEventListener("resize", () => {
    if (isOpen) positionPopover(popover, { anchorContainer, navBar }, 12);
  });
  window.addEventListener(
    "scroll",
    () => {
      if (isOpen) positionPopover(popover, { anchorContainer, navBar }, 12);
    },
    { passive: true }
  );

  // a11y
  trigger.setAttribute("aria-haspopup", "true");
  trigger.setAttribute("aria-expanded", "false");
  trigger.addEventListener("focus", openPopover);
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && isOpen) closePopover();
  });
}
function initMobileNav() {
  const trigger = document.querySelector(".mnav-trigger");
  if (!trigger) return;

  let sheet = document.getElementById("mnav");
  if (!sheet) {
    sheet = buildMobileNavFromData({
      menus: MEGA_MENUS,
      phone: "+7 (978) 545-54-55",
      socials: [
        {
          net: "ig",
          icon: "assets/images/icons/instaIcon.svg",
          href: "#",
          label: "Instagram",
        },
        {
          net: "vk",
          icon: "assets/images/icons/vkIcon.svg",
          href: "#",
          label: "VK",
        },
        {
          net: "wa",
          icon: "assets/images/icons/whatsappIcon.svg",
          href: "#",
          label: "WhatsApp",
        },
        {
          net: "tg",
          icon: "assets/images/icons/tgIcon.svg",
          href: "#",
          label: "Telegram",
        },
      ],

      staticSections: [
        { label: "Дополнения", href: "/addition-menu.html" },
        { label: "Цветочная подписка", href: "/subscription.html" },
        { label: "Информация", href: "/info.html" },
      ],
    });
    document.body.appendChild(sheet);
  }

  let backdrop = document.querySelector(".mnav-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "mnav-backdrop";
    document.body.appendChild(backdrop);
  }

  const content = sheet.querySelector(".mnav__content");

  const setSheetHeights = () => {
    const vh =
      Math.min(window.innerHeight || 0, screen.height || 0) ||
      window.innerHeight;
    // целевая высота панели (не выше 560px, и с запасом от краёв)
    const H = Math.min(560, Math.max(360, vh - 80));
    sheet.style.height = H + "px";
    // запас ~60px под кнопки/паддинги/кроссбраузер
    content.style.maxHeight = H - 60 + "px";
  };

  const open = () => {
    setSheetHeights();
    sheet.classList.add("is-open");
    backdrop.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("no-scroll");
    window.addEventListener("resize", setSheetHeights, { passive: true });
  };
  const close = () => {
    sheet.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("no-scroll");
    window.removeEventListener("resize", setSheetHeights);
  };

  if (!trigger.dataset.bound) {
    trigger.addEventListener("click", open);
    trigger.dataset.bound = "1";
  }
  const closeBtn = sheet.querySelector(".mnav__close");
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.addEventListener("click", close);
    closeBtn.dataset.bound = "1";
  }
  if (!backdrop.dataset.bound) {
    backdrop.addEventListener("click", close);
    backdrop.dataset.bound = "1";
  }
  if (!sheet.dataset.boundLinks) {
    sheet.addEventListener("click", (ev) => {
      // закрываем ТОЛЬКО при клике по ссылке
      const a = ev.target.closest("a");
      if (a) close();
    });
    sheet.dataset.boundLinks = "1";
  }
  if (!document.documentElement.dataset.mnavEsc) {
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") close();
    });
    document.documentElement.dataset.mnavEsc = "1";
  }
}
function buildMobileNavFromData(cfg) {
  const sheet = document.createElement("div");
  sheet.id = "mnav";
  sheet.className = "mnav";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-hidden", "true");

  sheet.innerHTML = `
    <button class="mnav__close" type="button" aria-label="Закрыть">×</button>
    <nav class="mnav__content"></nav>
  `;
  const cont = sheet.querySelector(".mnav__content");

  const cols = cfg.menus && cfg.menus.flowers ? cfg.menus.flowers : [];
  const acc = document.createElement("div");
  acc.className = "mnav-acc";

  cols.forEach((col) => {
    const item = document.createElement("div");
    item.className = "mnav-acc__item";

    // head: ссылка + отдельная кнопка-стрелка
    const head = document.createElement("div");
    head.className = "mnav-acc__head";

    const link = document.createElement("a");
    link.className = "mnav-acc__link";
    link.href = col.href || "#";
    link.textContent = col.title || "";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mnav-acc__chev-btn";
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = `<span class="mnav-acc__chev"></span>`;

    head.append(link, btn);

    // panel
    const panel = document.createElement("div");
    panel.className = "mnav-acc__panel";
    panel.style.height = "0px";

    const ul = document.createElement("ul");
    ul.className = "mnav-acc__list";

    if (col.href) {
      const liAll = document.createElement("li");
      const aAll = document.createElement("a");
      aAll.href = col.href;
      aAll.textContent = `Все ${col.title?.toLowerCase() || ""}`;
      liAll.appendChild(aAll);
      ul.appendChild(liAll);
    }

    (col.items || []).forEach((it) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = it.href || "#";
      a.textContent = it.label || "";
      li.appendChild(a);
      ul.appendChild(li);
    });

    panel.appendChild(ul);
    item.append(head, panel);
    acc.appendChild(item);

    // раскрытие ТОЛЬКО по стрелке; фикс «первого клика»
    btn.addEventListener("click", () =>
      toggleAccordionSmooth(item, panel, btn)
    );
  });

  cont.appendChild(acc);

  (cfg.staticSections || []).forEach((s) => {
    const a = document.createElement("a");
    a.className = "mnav__section";
    a.href = s.href || "#";
    a.textContent = s.label || "";
    cont.appendChild(a);
  });

  const hr = document.createElement("hr");
  hr.className = "mnav__divider";
  cont.appendChild(hr);

  const social = document.createElement("div");
  social.className = "mnav__social";
  (cfg.socials || []).forEach((s) => {
    const a = document.createElement("a");
    a.className = `mnav__soc${s.net ? " mnav__soc--" + s.net : ""}`;
    a.href = s.href || "#";
    a.setAttribute("aria-label", s.label || "");
    const img = document.createElement("img");
    img.src = s.icon;
    img.alt = "";
    a.appendChild(img);
    social.appendChild(a);
  });
  cont.appendChild(social);

  const phoneWrap = document.createElement("div");
  phoneWrap.className = "mnav__phone-wrap";
  const phone = document.createElement("a");
  phone.className = "mnav__phone";
  phone.href = `tel:${(cfg.phone || "").replace(/\D/g, "")}`;
  phone.textContent = cfg.phone || "";
  phoneWrap.appendChild(phone);
  cont.appendChild(phoneWrap);

  return sheet;
}

/* Плавное раскрытие с надёжной фиксацией первой анимации */
function toggleAccordionSmooth(item, panel, btn) {
  const isOpen = item.classList.contains("is-open");
  const start = panel.offsetHeight; // форсим reflow и берём текущую высоту
  const end = isOpen ? 0 : panel.scrollHeight; // целевая высота

  item.classList.toggle("is-open", !isOpen);
  btn.setAttribute("aria-expanded", String(!isOpen));

  // стартуем с текущего значения -> к целевому (без скачков)
  panel.style.height = start + "px";
  // ещё один reflow перед изменением (некоторые браузеры любят это)
  void panel.offsetWidth;
  requestAnimationFrame(() => {
    panel.style.height = end + "px";
  });
}

function initContactsMap() {
  if (!window.ymaps) return;

  ymaps.ready(() => {
    // координаты: [широта, долгота] — подставь свои при необходимости
    const center = [44.952, 34.108];

    const map = new ymaps.Map(
      "contacts-map",
      {
        center,
        zoom: 17,
        controls: [], // не добавляем ни одного контрола
      },
      {
        suppressMapOpenBlock: true, // убираем всплывашку "Открыть в Яндекс.Картах"
      }
    );

    // На всякий случай удалим, если что-то появится
    [
      "trafficControl",
      "geolocationControl",
      "rulerControl",
      "typeSelector",
      "fullscreenControl",
      "zoomControl",
      "searchControl",
    ].forEach((c) => map.controls.remove(c));

    // Отключить нежелательные поведения (можно оставить drag, как удобно)
    map.behaviors.disable(["scrollZoom", "rightMouseButtonMagnifier"]);

    // Маркер
    const placemark = new ymaps.Placemark(
      center,
      {
        hintContent: "Розы от Эдема",
        balloonContent: "г. Симферополь, пер. Карьерный, д.15/28а",
      },
      { preset: "islands#nightDotIcon" }
    );
    map.geoObjects.add(placemark);
  });
}

/* ---------- Helpers ---------- */
const isFinePointer = window.matchMedia("(pointer: fine)").matches;

function formatPrice(num) {
  try {
    return new Intl.NumberFormat("ru-RU").format(num) + " ₽";
  } catch {
    return `${num} ₽`;
  }
}

/* ---------- Рендер карточек из JSON ---------- */
async function loadProducts(url = "assets/data/products.json") {
  const res = await fetch(url);
  return await res.json();
}

function createProductCard(p, variant = "slider") {
  // безопасные значения
  const id = p?.id ?? "";
  const title = p?.title ?? "";
  const price = Number.isFinite(p?.price) ? p.price : 0;
  const img = p?.img ?? "";
  const href = p?.href || "/product.html?sku=" + encodeURIComponent(id);

  const a = document.createElement("a");
  a.className = `product-card product-card--${variant}`;
  a.href = href;

  // храним "сырой" объект для корзины
  a.setAttribute(
    "data-product",
    JSON.stringify({ id, title, price, img, href, excerpt: p?.excerpt })
  );

  a.innerHTML = `
    <div class="product-card__img">
      <img src="${img}" alt="${title}">
    </div>
    <div class="product-card__title">${title}</div>
    <button type="button" class="product-card__price" data-add-to-cart>
      ${formatPrice(price)}
    </button>
  `;

  // Ховер/фокус МЕНЯЕМ ТОЛЬКО НА КНОПКЕ (никаких слушателей на всей карточке)
  const btn = a.querySelector("[data-add-to-cart]");
  if (btn && isFinePointer) {
    const orig = formatPrice(price);
    const toAdd = () => {
      btn.textContent = "Добавить";
    };
    const toPrice = () => {
      btn.textContent = orig;
    };

    btn.addEventListener("mouseenter", toAdd);
    btn.addEventListener("mouseleave", toPrice);
    btn.addEventListener("focus", toAdd);
    btn.addEventListener("blur", toPrice);
  }

  return a;
}

/* Вставка в слайды Swiper (пример для .popular-swiper) */
async function renderPopularFromJson() {
  const wrap = document.querySelector(".popular-swiper .swiper-wrapper");
  if (!wrap) return;
  const products = await loadProducts(); // если нужно, передай другой url
  wrap.innerHTML = ""; // очистим
  products.forEach((p) => {
    const slide = document.createElement("div");
    slide.className = "swiper-slide";
    slide.appendChild(createProductCard(p, "slider"));
    wrap.appendChild(slide);
  });
}
/* Рендер каталога в .catalog__grid */
async function renderCatalogFromJson(opts = {}) {
  const {
    url = "assets/data/products.json",
    container = "#catalog-grid",
    limit = null, // можно ограничить кол-во
  } = opts;

  const grid = document.querySelector(container);
  if (!grid) return;

  const products = await loadProducts(url);
  const list = Array.isArray(products) ? products : [];
  grid.innerHTML = "";

  (limit ? list.slice(0, limit) : list).forEach((p) => {
    const card = createProductCard(p, "catalog"); // <— модификатор для каталога
    // модификатор просто влияет на высоту картинки через CSS
    card.classList.add("product-card--catalog");

    const cell = document.createElement("div");
    // если нужна обертка-колонка — можно не делать, сетка и так раскладывает
    cell.appendChild(card);
    grid.appendChild(cell);
  });
}

/* ---------- localStorage корзина по клику на цену ---------- */
function addToCart(item) {
  const key = "cart";
  const cart = JSON.parse(localStorage.getItem(key) || "[]");
  // Простейшая логика: если уже есть — увеличим qty, иначе добавим
  const idx = cart.findIndex((x) => x.id === item.id);
  if (idx >= 0) cart[idx].qty = (cart[idx].qty || 1) + 1;
  else
    cart.push({
      id: item.id,
      title: item.title,
      price: item.price,
      img: item.img,
      excerpt: item.excerpt,
      qty: 1,
    });
  localStorage.setItem(key, JSON.stringify(cart));
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add-to-cart]");
  if (!btn) return;

  const card = btn.closest(".product-card");
  if (!card) return;

  let data = {};
  try {
    data = JSON.parse(card.getAttribute("data-product") || "{}");
  } catch {
    /* noop */
  }

  if (!data || !data.id) return;

  addToCart(data);

  // Микро-отклик
  btn.style.transform = "scale(0.98)";
  setTimeout(() => {
    btn.style.transform = "";
  }, 120);

  // Предотвратим переход по ссылке при клике на кнопку
  e.preventDefault();
  e.stopPropagation();
});

/* ===== Toast ===== */
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
  // автозакрытие
  setTimeout(() => {
    el.classList.remove("is-open");
    el.addEventListener("transitionend", () => el.remove(), { once: true });
  }, 2400);
}

/* ===== Cart indicator ===== */
function getCartCount() {
  try {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    return cart.reduce((s, x) => s + (x.qty || 1), 0);
  } catch {
    return 0;
  }
}

function updateCartIndicator() {
  const el = document.querySelector(".cart-indicator");
  if (!el) return;
  const n = getCartCount();
  el.textContent = n > 0 ? String(n) : "";
  el.classList.toggle("is-visible", n > 0);
}

/* при старте страницы синхронизируем индикатор */
document.addEventListener("DOMContentLoaded", updateCartIndicator);

/* ===== Переопределим addToCart, чтобы возвращать счётчик ===== */
function addToCart(item) {
  const key = "cart";
  const cart = JSON.parse(localStorage.getItem(key) || "[]");
  const idx = cart.findIndex((x) => x.id === item.id);
  if (idx >= 0) cart[idx].qty = (cart[idx].qty || 1) + 1;
  else
    cart.push({
      id: item.id,
      title: item.title,
      price: item.price,
      img: item.img,
      excerpt: item.excerpt,
      qty: 1,
    });
  localStorage.setItem(key, JSON.stringify(cart));
  return cart.reduce((s, x) => s + (x.qty || 1), 0); // ← вернём общее кол-во
}

/* ===== Делегирование клика по кнопке "в корзину" — ДОПОЛНИМ ОТКЛИКОМ ===== */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add-to-cart]");
  if (!btn) return;

  const card = btn.closest(".product-card");
  if (!card) return;

  let data = {};
  try {
    data = JSON.parse(card.getAttribute("data-product") || "{}");
  } catch {}

  if (!data || !data.id) return;

  const count = addToCart(data);

  // Визуальный отклик на кнопке
  const prevHTML = btn.innerHTML;
  btn.classList.add("is-added");
  btn.innerHTML = "Добавлено&nbsp;✓";

  // микропружинка
  btn.style.transform = "scale(0.98)";
  setTimeout(() => {
    btn.style.transform = "";
  }, 120);

  // вернуть исходную цену через 1200 мс
  clearTimeout(btn._restoreTimer);
  btn._restoreTimer = setTimeout(() => {
    btn.classList.remove("is-added");
    btn.innerHTML = prevHTML;
  }, 1200);

  // Тост и индикатор
  showToast(`«${data.title}» добавлен в корзину`);
  updateCartIndicator();

  e.preventDefault();
  e.stopPropagation();
});

function initBackToTop() {
  let btn = document.getElementById("to-top");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "to-top";
    btn.className = "to-top";
    btn.type = "button";
    btn.setAttribute("aria-label", "Наверх");
    btn.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l7 7-1.4 1.4L13 10.8V19h-2v-8.2l-4.6 4.6L5 12z" fill="currentColor"/></svg>';
    document.body.appendChild(btn);
  }

  // показать, когда ниже первого экрана
  const showThreshold = () => window.scrollY > window.innerHeight;
  const updateVisibility = () => {
    btn.classList.toggle("is-visible", showThreshold());
  };

  // лёгкий троттлинг скролла
  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateVisibility();
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true }
  );

  // первичная установка
  updateVisibility();
  window.addEventListener("resize", updateVisibility);

  // клик — плавно вверх (учитываем reduce-motion)
  btn.addEventListener("click", () => {
    const preferReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if ("scrollBehavior" in document.documentElement.style && !preferReduce) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // фолбэк ручной плавности
      const start = window.scrollY || document.documentElement.scrollTop;
      const dur = 600;
      const ease = (t) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const t0 = performance.now();
      requestAnimationFrame(function raf(now) {
        const p = Math.min(1, (now - t0) / dur);
        window.scrollTo(0, Math.round(start * (1 - ease(p))));
        if (p < 1) requestAnimationFrame(raf);
      });
    }
  });
}
