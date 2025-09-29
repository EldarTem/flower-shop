/* ==============================
   Cart modal + badge (vanilla)
   ============================== */

// ---- storage helpers ----
const CART_KEY = "cart";

function money(n) {
  return Number(n || 0).toLocaleString("ru-RU") + " ₽";
}
function readLS(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
  // уведомим слушателей
  document.dispatchEvent(new CustomEvent("cart:change"));
}

// --- public storage api ---
function getCart() {
  const raw = readLS(CART_KEY, []);
  // нормализуем
  return raw
    .filter(Boolean)
    .map((r) => ({ id: String(r.id), qty: Math.max(1, Number(r.qty) || 1) }));
}
function setCart(rows) {
  writeLS(CART_KEY, rows);
}
function addToCart(id, qty = 1) {
  id = String(id);
  const cart = getCart();
  const row = cart.find((r) => r.id === id);
  if (row) row.qty += qty;
  else cart.push({ id, qty: Math.max(1, qty) });
  setCart(cart);
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
  row.qty = Math.max(1, row.qty + delta);
  setCart(cart);
}
function getCartCount() {
  return getCart().reduce((s, r) => s + (Number(r.qty) || 0), 0);
}

// ---- products helpers (optional) ----
const P = typeof window !== "undefined" ? window.PRODUCTS || [] : [];
function findProduct(id) {
  id = String(id);
  return P.find((p) => String(p.id) === id);
}

// ---- DOM refs ----
const modal = document.getElementById("cart-modal");
const listEl = modal ? modal.querySelector("#cart-list") : null;
const totalEl = modal ? modal.querySelector("#cart-total") : null;
const upsellEl = modal ? modal.querySelector("#cart-upsell") : null;

// ---- modal open/close ----
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

// ---- rendering ----
function renderCart() {
  if (!listEl || !totalEl) return;

  const cart = getCart();
  let sum = 0;
  listEl.innerHTML = "";

  cart.forEach((row) => {
    const p = findProduct(row.id) || { title: "Товар", price: 0, image: "" };
    const line = (Number(p.price) || 0) * row.qty;
    sum += line;

    const li = document.createElement("li");
    li.className = "cart__item";
    li.innerHTML = `
      <div class="cart__thumb"><img src="${p.img || ""}" alt=""></div>
      <div>
        <h4 class="cart__name">${p.title}</h4>
        ${p.short ? `<p class="cart__meta">${p.short}</p>` : ""}
        <div class="cart__ctrls">
          <div class="qty" data-id="${p.id}">
            <button class="qty__btn" data-act="dec" aria-label="Минус">−</button>
            <span class="qty__val">${row.qty}</span>
            <button class="qty__btn" data-act="inc" aria-label="Плюс">+</button>
          </div>
          <button class="cart__remove" data-remove="${
            p.id
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

// qty +/- и удаление
listEl?.addEventListener("click", (e) => {
  const dec = e.target.closest('[data-act="dec"]');
  const inc = e.target.closest('[data-act="inc"]');
  const rm = e.target.closest("[data-remove]");

  if (dec || inc) {
    const wrap = e.target.closest(".qty");
    const id = wrap?.dataset.id;
    if (id) changeQty(id, inc ? +1 : -1);
  }
  if (rm) removeFromCart(rm.dataset.remove);

  // после любых правок перерисовываем
  renderCart();
  updateCartBadge();
});

// ---- upsell ----
function renderUpsell() {
  if (!upsellEl) return;
  // возьмём несколько первых товаров (если PRODUCTS задан)
  const picks = P.slice(0, 8);
  upsellEl.innerHTML = picks
    .map(
      (p) => `
    <button class="ups" data-add="${
      p.id
    }" type="button" title="Добавить в заказ">
      <div class="ups__thumb"><img src="${p.image || ""}" alt=""></div>
      <div class="ups__name">${p.title}</div>
      <div class="ups__price">${money(p.price)}</div>
    </button>
  `
    )
    .join("");
}
upsellEl?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add]");
  if (!btn) return;
  addToCart(btn.dataset.add, 1);
  renderCart();
  updateCartBadge();
});

// ---- badge on header cart icon ----
function ensureBadgeEl() {
  const btn = document.querySelector(".header-actions__cart");
  if (!btn) return null;
  let b = btn.querySelector(".cart-badge");
  if (!b) {
    b = document.createElement("span");
    b.className = "cart-badge";
    btn.appendChild(b);
  }
  return b;
}
function updateCartBadge() {
  const ind = document.querySelector("[data-open-cart] .cart-indicator");
  if (!ind) return;
  const count = getCartCount();
  // просто зелёная точка: есть товары -> включили
  ind.classList.toggle("is-on", count > 0);
  // если захочешь цифру — раскомментируй
  // ind.setAttribute('data-count', count > 99 ? '99+' : String(count));
}

function bindCartOpenerDelegated() {
  document.addEventListener("click", (ev) => {
    const opener = ev.target.closest("[data-open-cart]");
    if (!opener) return;
    ev.preventDefault();
    openCart();
  });
}

function initCartUI() {
  // делегирование навесится один раз — безопасно
  if (!initCartUI._bound) {
    bindCartOpenerDelegated();
    initCartUI._bound = true;
  }
  updateCartBadge();
}
initCartUI._bound = false;

// авто-инициализация
document.addEventListener("DOMContentLoaded", initCartUI);
// если после includePartials ты пошлёшь событие — обновим бейдж
document.addEventListener("partials:loaded", initCartUI);
// обновлять индикатор после любых действий с корзиной
document.addEventListener("cart:change", updateCartBadge);
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

  // сообщаем, что паршалы на месте
  document.dispatchEvent(new Event("partials:loaded"));
}

// ---- bind header cart button ----
function bindCartOpener() {
  const btn = document.querySelector(".header-actions__cart");
  if (!btn) return;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    openCart();
  });
}

// ---- auto init ----
document.addEventListener("DOMContentLoaded", () => {
  bindCartOpener();
  updateCartBadge();

  // если кто-то изменил корзину — синхронизируем бэйдж
  document.addEventListener("cart:change", () => {
    updateCartBadge();
  });
});

// ---- expose to window (optional) ----
window.Cart = { open: openCart, render: renderCart, badge: updateCartBadge };
