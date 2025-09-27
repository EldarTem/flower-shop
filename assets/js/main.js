// Вставка header/footer и инициализация всего остального
document.addEventListener("DOMContentLoaded", async () => {
  await includePartials();
  initHeroSwiper();
  initPopularSwiper();
  initMegaMenu();
  initMobileNav(); // ← строит и подключает мобильное меню целиком через JS
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
    loop: true,
    loopAdditionalSlides: 4,
    speed: 600,
    grabCursor: true,
    spaceBetween: 28,
    navigation: {
      nextEl: ".popular-next",
      prevEl: ".popular-prev",
    },
    keyboard: { enabled: true },
    breakpoints: {
      0: { slidesPerView: 1, spaceBetween: 16 },
      640: { slidesPerView: 2, spaceBetween: 20 },
      900: { slidesPerView: 3, spaceBetween: 24 },
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
        { label: "Авторские", href: "/bouquets/author.html" },
        { label: "На вкус флориста", href: "/bouquets/florist-choice.html" },
        { label: "Гиганты", href: "/bouquets/giants.html" },
        { label: "101 роза", href: "/bouquets/101-roses.html" },
        { label: "Свадебные букеты", href: "/bouquets/wedding.html" },
      ],
    },
    {
      title: "Цветочное меню",
      href: "/flower-menu.html", // опционально
      divided: true,
      items: [
        { label: "Розы", href: "/flowers/roses.html" },
        { label: "Кустовые розы", href: "/flowers/spray-roses.html" },
        { label: "Пионовидные розы", href: "/flowers/garden-roses.html" },
        { label: "Гортензии", href: "/flowers/hydrangea.html" },
        { label: "Хризантемы", href: "/flowers/chrysanthemum.html" },
        { label: "Диантусы", href: "/flowers/dianthus.html" },
        { label: "Тюльпаны", href: "/flowers/tulips.html" },
        { label: "Гипсофилы", href: "/flowers/gypsophila.html" },
      ],
    },
    {
      title: "Композиции",
      href: "/composition-menu.html",
      divided: true,
      items: [
        { label: "Коробы", href: "/compositions/boxes.html" },
        { label: "Коробки", href: "/compositions/cases.html" },
        { label: "Сумочки", href: "/compositions/bags.html" },
        { label: "Корзины", href: "/compositions/baskets.html" },
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

const phoneWrap = document.createElement('div');
phoneWrap.className = 'mnav__phone-wrap';
const phone = document.createElement('a');
phone.className = 'mnav__phone';
phone.href = `tel:${(cfg.phone || '').replace(/\D/g,'')}`;
phone.textContent = cfg.phone || '';
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
