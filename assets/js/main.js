// Вставка header/footer и инициализация всего остального
document.addEventListener("DOMContentLoaded", async () => {
  await includePartials();
  initHeroSwiper();
  initPopularSwiper();
  initMegaMenu();
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
  const el = document.querySelector(".hero-slider .swiper");
  if (!el || typeof Swiper === "undefined") return;
  new Swiper(".hero-slider .swiper", {
    loop: true,
    autoplay: { delay: 5000 },
    pagination: { el: ".hero-slider .swiper-pagination", clickable: true },
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

  host.addEventListener("mouseenter", () => {
    cancelClose();
    if (!isOpen) openPopover();
  });
  host.addEventListener("mouseleave", scheduleClose);

  popover.addEventListener("mouseenter", cancelClose);
  popover.addEventListener("mouseleave", scheduleClose);

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

  trigger.setAttribute("aria-haspopup", "true");
  trigger.setAttribute("aria-expanded", "false");
  trigger.addEventListener("focus", openPopover);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) closePopover();
  });
  const link = e.target.closest(".mega-link");
  if (!link) return;
  // если это “#” или SPA-роутер — закрываем и даём вашему роутеру обработать
  closePopover();
}
