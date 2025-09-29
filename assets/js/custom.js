// assets/js/custom.js
(function () {
  function initCustomBouquet() {
    var form = document.getElementById("cb-form");
    if (!form) return;

    // ---- настройки цены ----
    var STEP = 500; // шаг изменения
    var MIN_PRICE = 1500; // минимальная
    var MAX_PRICE = 200000; // разумный потолок, при желании измени

    // элементы
    var priceWrap = form.querySelector(".cb__price"); // содержит #cb-price (сейчас span)
    var priceSpan = form.querySelector("#cb-price");
    var decBtn, incBtn, priceInput;

    // форматирование / парсинг
    function fmt(n) {
      return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
    }
    function parsePrice(s) {
      // извлекаем цифры: "1 500 ₽" -> 1500
      var str = String(s || "")
        .replace(/\u00A0|&nbsp;|₽|\s/g, "")
        .replace(",", ".");
      var num = Number(str);
      return isFinite(num) ? Math.round(num) : 0;
    }
    function clampToStep(n) {
      // кратность шагу + границы
      n = Math.round(n / STEP) * STEP;
      if (n < MIN_PRICE) n = MIN_PRICE;
      if (n > MAX_PRICE) n = MAX_PRICE;
      return n;
    }

    // превращаем span#cb-price -> input, если это ещё не input
    (function ensureEditablePrice() {
      if (!priceWrap) return;
      if (priceSpan && priceSpan.tagName !== "INPUT") {
        var initVal = parsePrice(priceSpan.textContent) || MIN_PRICE;
        priceInput = document.createElement("input");
        priceInput.id = "cb-price";
        priceInput.className = "cb__price-input";
        priceInput.type = "text";
        priceInput.inputMode = "numeric";
        priceInput.autocomplete = "off";
        priceInput.value = initVal; // без форматирования в самом поле
        priceSpan.replaceWith(priceInput);
      } else {
        priceInput = priceSpan; // уже input
        var v = parsePrice(priceInput.value) || MIN_PRICE;
        priceInput.value = v;
      }
    })();

    // используем уже существующие +/- из блока количества
    var qtyBlock = form.querySelector(".qty");
    decBtn = qtyBlock?.querySelector('[data-act="dec"]');
    incBtn = qtyBlock?.querySelector('[data-act="inc"]');

    function getPrice() {
      return clampToStep(parsePrice(priceInput.value));
    }
    function setPrice(n) {
      n = clampToStep(n);
      priceInput.value = n; // отображаем как число; ₽ будет вокруг стилями
      // если хочешь сразу формат с ₽ внутри input — раскомментируй:
      // priceInput.value = fmt(n);
    }

    // начальное значение
    setPrice(parsePrice(priceInput.value) || MIN_PRICE);

    // обработчики +/- : меняют цену на шаг
    function onDec() {
      setPrice(getPrice() - STEP);
    }
    function onInc() {
      setPrice(getPrice() + STEP);
    }
    decBtn?.addEventListener("click", onDec);
    incBtn?.addEventListener("click", onInc);

    // ручной ввод: разрешаем цифры, всё остальное отбрасываем
    priceInput.addEventListener("input", function () {
      // оставляем только цифры
      var digits = String(this.value).replace(/[^\d]/g, "");
      this.value = digits;
    });
    priceInput.addEventListener("blur", function () {
      setPrice(parsePrice(this.value) || MIN_PRICE);
    });
    // Enter -> зафиксировать
    priceInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        this.blur();
      }
    });

    // --- выбор сегментов (палитра/упаковка/для кого) как было ---
    form.addEventListener("click", function (e) {
      var btn = e.target.closest(".seg__btn");
      if (!btn) return;
      var seg = btn.closest(".seg");
      if (!seg) return;
      var all = seg.querySelectorAll(".seg__btn");
      for (var i = 0; i < all.length; i++) all[i].classList.remove("is-active");
      btn.classList.add("is-active");
    });

    function pick(name) {
      var seg = form.querySelector('.seg[data-name="' + name + '"]');
      var act = seg ? seg.querySelector(".seg__btn.is-active") : null;
      return act ? act.getAttribute("data-val") : "";
    }

    // --- добавление в корзину (1 товар с выбранной ценой) ---
    function addCustomToCart() {
      var palette = pick("palette");
      var wrap = pick("wrap");
      var forWho = pick("for");
      var noteInput = form.querySelector('[name="note"]');
      var note = noteInput ? (noteInput.value || "").trim() : "";

      var title = "Букет на вкус флориста";
      var excerpt =
        "Гамма: " +
        palette +
        "; Оформление: " +
        wrap +
        "; Для кого: " +
        forWho +
        (note ? ". Пожелания: " + note : "");

      var price = getPrice(); // выбранная пользователем цена

      // стабильный id зависящий от опций и цены, чтобы разные наборы не склеивались
      var key = btoa(
        unescape(
          encodeURIComponent(palette + "|" + wrap + "|" + forWho + "|" + price)
        )
      )
        .replace(/=+$/, "")
        .slice(0, 12);
      var id = "florist-" + key;

      var item = {
        id: id,
        title: title,
        price: price, // одна позиция с этой ценой
        img: "assets/images/izobr/cert-1-1.jpg",
        href: "/custom.html",
        excerpt: excerpt,
      };

      // «тень»-карточка -> используем общий обработчик add-to-cart
      var shadow = document.getElementById("cb-shadow-card");
      if (!shadow) return;
      var btn = shadow.querySelector("[data-add-to-cart]");
      if (!btn) return;

      shadow.setAttribute("data-product", JSON.stringify(item));
      btn.click(); // добавляем РОВНО 1 раз
    }

    // --- submit ---
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      addCustomToCart();

      var submit = form.querySelector(".cb__submit");
      if (submit) {
        var prevHTML = submit.innerHTML;
        submit.classList.add("is-added");
        submit.innerHTML = "Добавлено&nbsp;✓";
        submit.style.transform = "scale(0.98)";
        setTimeout(function () {
          submit.style.transform = "";
        }, 120);
        setTimeout(function () {
          submit.classList.remove("is-added");
          submit.innerHTML = prevHTML;
        }, 1200);
      }

      if (typeof window.showToast === "function") {
        window.showToast("«Букет на вкус флориста» добавлен в корзину");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initCustomBouquet();
  });
})();
