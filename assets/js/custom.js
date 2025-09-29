document.addEventListener("DOMContentLoaded", async () => {
  await includePartials?.();

  initCustomBouquet();
});
// Custom bouquet page
(function initCustomBouquet() {
  const form = document.getElementById('cb-form');
  if (!form) return;

  const basePrice = 1500; // ₽ за 1 шт
  const qtyEl = form.querySelector('#cb-qty');
  const priceEl = form.querySelector('#cb-price');

  const fmt = (n) => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';

  // --- сегменты: переключение .is-active ---
  form.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg__btn');
    if (!btn) return;
    const seg = btn.closest('.seg');
    seg.querySelectorAll('.seg__btn').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
  });

  // --- qty +/- и пересчёт цены ---
  function updatePrice() {
    const q = Math.max(1, parseInt(qtyEl.textContent, 10) || 1);
    priceEl.innerHTML = fmt(basePrice * q).replace(' ', '&nbsp;');
  }
  form.addEventListener('click', (e) => {
    const dec = e.target.closest('[data-act="dec"]');
    const inc = e.target.closest('[data-act="inc"]');
    if (!dec && !inc) return;
    let q = Math.max(1, parseInt(qtyEl.textContent, 10) || 1);
    q += inc ? 1 : -1;
    if (q < 1) q = 1;
    qtyEl.textContent = q;
    updatePrice();
  });
  updatePrice();

  // helpers
  const pick = (name) => {
    const seg = form.querySelector(`.seg[data-name="${name}"]`);
    return seg?.querySelector('.seg__btn.is-active')?.dataset.val || '';
  };

  function addCustomToCart() {
    const q = Math.max(1, parseInt(qtyEl.textContent, 10) || 1);
    const palette = pick('palette');
    const wrap = pick('wrap');
    const forWho = pick('for');
    const note = (form.querySelector('[name="note"]')?.value || '').trim();

    const title = 'Букет на вкус флориста';
    const excerpt = `Гамма: ${palette}; Оформление: ${wrap}; Для кого: ${forWho}` + (note ? `. Пожелания: ${note}` : '');

    // стабильный id под сочетание опций, чтобы одинаковые сборки суммировались
    const key = btoa(unescape(encodeURIComponent(`${palette}|${wrap}|${forWho}|${basePrice}`)))
                  .replace(/=+$/,'').slice(0,12);
    const id = `florist-${key}`;

    const item = {
      id,
      title,
      price: basePrice, // твоя корзина считает итог = price * qty
      img: 'assets/images/izobr/cert-1-1.jpg',
      href: '/custom.html',
      excerpt
    };

    // используем глобальный делегат корзины — «тень»-карточка
    const shadow = document.getElementById('cb-shadow-card');
    const btn = shadow.querySelector('[data-add-to-cart]');
    shadow.setAttribute('data-product', JSON.stringify(item));

    for (let i = 0; i < q; i++) btn.click(); // добавим нужное количество
  }

  // --- submit: в корзину + UI-отклик ---
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    addCustomToCart();

    const submit = form.querySelector('.cb__submit');
    const prevHTML = submit.innerHTML;
    submit.classList.add('is-added');
    submit.innerHTML = 'Добавлено&nbsp;✓';
    submit.style.transform = 'scale(0.98)';
    setTimeout(() => { submit.style.transform = ''; }, 120);
    setTimeout(() => {
      submit.classList.remove('is-added');
      submit.innerHTML = prevHTML;
    }, 1200);

    if (typeof showToast === 'function') {
      showToast('«Букет на вкус флориста» добавлен в корзину');
    }
    form.querySelector('[name="note"]')?.value = '';
  });
})();
