const BUSINESS_INFO = {
  name: "DoozeCoofe",
  city: "Banda Aceh",
};

const BUSINESS_LINKS = {
  whatsappNumber: "+62 851-3837-8876", // Nomor WA tujuan pesanan
  navigationUrl:
    "https://www.google.com/maps/search/?api=1&query=DoozeCoofe+Banda+Aceh", // Ganti link Google Maps navigasi
  mapsEmbedUrl: "https://www.google.com/maps?q=Banda+Aceh,+Aceh&output=embed", // Ganti link embed map
  heroCoverUrl:
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1920&q=70", // Ganti dengan foto hero utama warung
  heroLocalPhotoUrl:
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=70", // Ganti dengan foto asli warung
};

const BUSINESS_PROOF = {
  googleRating: "4.8",
  googleReviews: "382",
  repeatRate: "68%",
  monthlyCups: "1.200+",
};

const OPENING_SCHEDULE = {
  0: [8 * 60, 24 * 60],
  1: [8 * 60, 23 * 60],
  2: [8 * 60, 23 * 60],
  3: [8 * 60, 23 * 60],
  4: [8 * 60, 23 * 60],
  5: [14 * 60, 23 * 60 + 30],
  6: [8 * 60, 24 * 60],
};

const ORDER_MESSAGE = `Halo ${BUSINESS_INFO.name}, saya mau pesan dari meja. Mohon rekomendasi menu terbaik hari ini.`;

const query = (selector, scope = document) => scope.querySelector(selector);
const queryAll = (selector, scope = document) =>
  Array.from(scope.querySelectorAll(selector));

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const supportsFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

const menuCart = new Map();
const cartViews = [];
let cartSendState = "idle";
let hasSubmittedOrder = false;
let previousCartLineKeys = new Set();
let hadCartItems = false;

const normalizeWhatsappNumber = (value) => value.replace(/\D/g, "");

const buildWhatsAppUrl = (message) => {
  const number = normalizeWhatsappNumber(BUSINESS_LINKS.whatsappNumber);
  const url = new URL(`https://wa.me/${number}`);
  url.searchParams.set("text", message);
  return url.toString();
};

const applyHrefToAll = (selector, href) => {
  queryAll(selector).forEach((element) => {
    element.href = href;
  });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const getPrepEstimateText = (totalItems) => {
  if (!totalItems) {
    return "-";
  }

  const minMinute = 8 + Math.max(0, totalItems - 1) * 2;
  const maxMinute = minMinute + 7;
  return `${minMinute}-${maxMinute} menit`;
};

const formatWibDateTime = (date) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(date);

const buildOrderCode = (date = new Date()) => {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const seed = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DZC-${year}${month}${day}-${seed}`;
};

const getOrderMode = () => "dinein";

const sanitizeTableNumber = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 12);

const setOrderModeStatus = (message, tone = "error") => {
  const status = query("#orderModeStatus");
  if (!status) {
    return;
  }

  if (!message) {
    status.classList.add("hidden");
    status.textContent = "";
    status.classList.remove("text-emerald-700");
    status.classList.add("text-rose-700");
    return;
  }

  status.textContent = message;
  status.classList.remove("hidden");
  status.classList.toggle("text-rose-700", tone !== "success");
  status.classList.toggle("text-emerald-700", tone === "success");
};

const getOrderIdentityState = () => {
  const tableInput = query("#orderTableNumber");
  const customerInput = query("#orderCustomerName");

  const tableNumber = sanitizeTableNumber(tableInput?.value || "");
  const customerName = String(customerInput?.value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);

  if (tableInput) {
    tableInput.value = tableNumber;
  }
  if (customerInput) {
    customerInput.value = customerName;
  }

  return {
    tableInput,
    customerInput,
    tableNumber,
    customerName,
    missingTable: !tableNumber,
    missingName: !customerName,
  };
};

const focusMissingOrderField = () => {
  const identity = getOrderIdentityState();
  if (identity.missingTable && identity.tableInput) {
    identity.tableInput.focus();
    return;
  }

  if (identity.missingName && identity.customerInput) {
    identity.customerInput.focus();
  }
};

const getOrderContext = () => {
  const mode = getOrderMode();
  const identity = getOrderIdentityState();

  if (identity.missingTable && identity.missingName) {
    return {
      isValid: false,
      error: "Nomor meja dan nama pemesan wajib diisi untuk melanjutkan pesanan.",
    };
  }

  if (identity.missingTable) {
    return {
      isValid: false,
      error: "Nomor meja wajib diisi untuk pesanan dari meja.",
    };
  }

  if (identity.missingName) {
    return {
      isValid: false,
      error: "Nama pemesan wajib diisi untuk kirim pesanan.",
    };
  }

  return {
    isValid: true,
    mode,
    tableNumber: identity.tableNumber,
    customerName: identity.customerName,
  };
};

const toggleOrderModeFields = () => {
  const tableInput = query("#orderTableNumber");
  const customerInput = query("#orderCustomerName");
  if (!tableInput) {
    return;
  }

  tableInput.disabled = false;
  tableInput.required = true;
  tableInput.classList.remove("opacity-60");
  if (customerInput) {
    customerInput.disabled = false;
    customerInput.required = true;
    customerInput.classList.remove("opacity-60");
  }

  updateOrderFlowSteps();
};

const initOrderModeControls = () => {
  const tableInput = query("#orderTableNumber");
  const customerInput = query("#orderCustomerName");

  if (!tableInput) {
    return;
  }

  tableInput.addEventListener("input", () => {
    tableInput.value = sanitizeTableNumber(tableInput.value);
    updateOrderFlowSteps();
  });

  const searchParams = new URLSearchParams(window.location.search);
  const tableFromUrl =
    searchParams.get("meja") ||
    searchParams.get("table") ||
    searchParams.get("nomormeja");

  if (tableFromUrl) {
    tableInput.value = sanitizeTableNumber(tableFromUrl);
  }

  if (customerInput) {
    customerInput.addEventListener("input", () => {
      updateOrderFlowSteps();
    });
  }

  toggleOrderModeFields();
};

const getOpenNowStatus = (date = new Date()) => {
  const schedule = OPENING_SCHEDULE[date.getDay()];
  if (!schedule) {
    return false;
  }

  const [openMinute, closeMinute] = schedule;
  const currentMinute = date.getHours() * 60 + date.getMinutes();

  return currentMinute >= openMinute && currentMinute < closeMinute;
};

const applyOpenStatus = () => {
  const isOpen = getOpenNowStatus();

  queryAll("[data-open-status]").forEach((element) => {
    element.textContent = isOpen ? "Open Now" : "Closed";

    const statusPill = element.closest(".status-open");
    if (statusPill) {
      statusPill.classList.toggle("is-closed", !isOpen);
      return;
    }

    element.classList.toggle("text-emerald-700", isOpen);
    element.classList.toggle("text-rose-700", !isOpen);
  });
};

const applyBusinessProof = () => {
  const proofBindings = [
    ["[data-proof-rating]", BUSINESS_PROOF.googleRating],
    ["[data-proof-reviews]", BUSINESS_PROOF.googleReviews],
    ["[data-proof-repeat]", BUSINESS_PROOF.repeatRate],
    ["[data-proof-cups]", BUSINESS_PROOF.monthlyCups],
  ];

  proofBindings.forEach(([selector, value]) => {
    queryAll(selector).forEach((element) => {
      if (!value) {
        return;
      }

      element.textContent = value;
    });
  });
};

const applyHeroLocalPhoto = () => {
  const heroSection = query(".hero-bg");
  if (heroSection && BUSINESS_LINKS.heroCoverUrl) {
    heroSection.style.setProperty(
      "--hero-cover-image",
      `url("${BUSINESS_LINKS.heroCoverUrl}")`
    );
  }

  const heroImage = query("#heroLocalPhoto");
  if (!heroImage || !BUSINESS_LINKS.heroLocalPhotoUrl) {
    return;
  }

  heroImage.src = BUSINESS_LINKS.heroLocalPhotoUrl;
};

const initPrimaryCtas = () => {
  queryAll("[data-order-btn]").forEach((element) => {
    element.href = "#menu";
    element.removeAttribute("target");
    element.removeAttribute("rel");
  });
  applyHrefToAll("[data-map-btn]", BUSINESS_LINKS.navigationUrl);

  const mapEmbed = query("#mapEmbed");
  if (mapEmbed) {
    mapEmbed.src = BUSINESS_LINKS.mapsEmbedUrl;
  }
};

const getButtonOriginalLabel = (button) => {
  const originalLabel = button.dataset.originalLabel || button.textContent.trim();
  button.dataset.originalLabel = originalLabel;
  return originalLabel;
};

const updateMenuLayoutByCartState = (hasItems) => {
  const menuLayout = query("#menuLayoutGrid");
  if (menuLayout) {
    menuLayout.classList.toggle("is-cart-active", hasItems);
  }

  const cartPrompt = query("#cartPrompt");
  if (cartPrompt) {
    cartPrompt.classList.toggle("hidden", hasItems);
  }
};

const revealCartPanel = ({ shouldScroll = false } = {}) => {
  const cartPanel = query("#orderCartPanel");
  if (!cartPanel) {
    return;
  }

  cartPanel.classList.remove("is-cart-reveal");
  void cartPanel.offsetWidth;
  cartPanel.classList.add("is-cart-reveal");

  if (shouldScroll) {
    const behavior = prefersReducedMotion.matches ? "auto" : "smooth";
    window.setTimeout(() => {
      cartPanel.scrollIntoView({ behavior, block: "start" });
    }, 80);
  }

  window.setTimeout(() => {
    cartPanel.classList.remove("is-cart-reveal");
  }, 720);
};

const setFlowStepState = (stepName, state) => {
  const stepItem = query(`[data-flow-step="${stepName}"]`);
  if (!stepItem) {
    return;
  }

  stepItem.dataset.stepState = state;
};

const updateOrderFlowSteps = () => {
  if (!query("#orderFlowSteps")) {
    return;
  }

  const hasMenu = menuCart.size > 0;
  const orderContext = getOrderContext();
  const tableReady = hasMenu && Boolean(orderContext.isValid);

  const menuState = hasMenu ? "done" : "active";
  const tableState = hasMenu ? (tableReady ? "done" : "active") : "pending";
  const sendState = hasSubmittedOrder ? "done" : tableReady ? "active" : "pending";

  setFlowStepState("menu", menuState);
  setFlowStepState("table", tableState);
  setFlowStepState("send", sendState);

  const progressStep = hasSubmittedOrder ? 3 : tableReady ? 2 : hasMenu ? 1 : 0;
  const percent = Math.round((progressStep / 3) * 100);

  const ratioElement = query("#orderFlowRatio");
  if (ratioElement) {
    ratioElement.textContent = `${progressStep}/3`;
  }

  const percentElement = query("#orderFlowPercent");
  if (percentElement) {
    percentElement.textContent = `${percent}%`;
  }

  const barElement = query("#orderFlowBar");
  if (barElement) {
    barElement.style.width = `${percent}%`;
  }
};

const applySendButtonVisualState = (button, hasItems) => {
  if (!button) {
    return;
  }

  const originalLabel = getButtonOriginalLabel(button);
  button.classList.remove("is-processing", "is-sent");

  if (!hasItems) {
    button.textContent = originalLabel;
    button.disabled = true;
    button.classList.add("opacity-60", "cursor-not-allowed");
    return;
  }

  if (cartSendState === "processing") {
    button.textContent = "Memproses...";
    button.disabled = true;
    button.classList.add("is-processing", "opacity-60", "cursor-not-allowed");
    return;
  }

  if (cartSendState === "sent") {
    button.textContent = "Terkirim ✓";
    button.disabled = true;
    button.classList.add("is-sent", "opacity-60", "cursor-not-allowed");
    return;
  }

  button.textContent = originalLabel;
  button.disabled = false;
  button.classList.remove("opacity-60", "cursor-not-allowed");
};

const setCartSendState = (state) => {
  cartSendState = state;
  updateCartViews();

  if (state !== "sent") {
    return;
  }

  window.setTimeout(() => {
    if (cartSendState !== "sent") {
      return;
    }

    cartSendState = "idle";
    updateCartViews();
  }, 1200);
};

const playMenuButtonFeedback = (button) => {
  if (button.dataset.feedbackLock === "1") {
    return;
  }

  const originalLabel = getButtonOriginalLabel(button);
  button.dataset.feedbackLock = "1";
  button.classList.add("is-processing");
  button.textContent = "Memproses...";

  window.setTimeout(() => {
    button.classList.remove("is-processing");
    button.classList.add("is-added");
    button.textContent = "Ditambahkan ✓";

    window.setTimeout(() => {
      button.textContent = originalLabel;
      button.classList.remove("is-added");
      delete button.dataset.feedbackLock;
    }, 650);
  }, 170);
};

const getCartSummary = () => {
  const lines = [];
  let totalItems = 0;
  let totalPrice = 0;

  menuCart.forEach((entry, itemName) => {
    totalItems += entry.qty;
    totalPrice += entry.qty * entry.price;
    lines.push({
      itemName,
      qty: entry.qty,
      unitPrice: entry.price,
      subtotal: entry.qty * entry.price,
    });
  });

  return { lines, totalItems, totalPrice };
};

const renderCartList = (listElement, lines, oldKeys = new Set()) => {
  if (!listElement) {
    return;
  }

  listElement.innerHTML = "";

  lines.forEach((line, index) => {
    const li = document.createElement("li");
    li.className = "order-cart-line";
    const lineKey = `${line.itemName}|${line.qty}`;
    if (!oldKeys.has(lineKey)) {
      li.classList.add("is-entering");
    }

    const topRow = document.createElement("div");
    topRow.className = "order-cart-line-main";

    const leftWrap = document.createElement("div");
    leftWrap.className = "min-w-0";

    const left = document.createElement("p");
    left.className = "order-cart-title text-xs font-semibold text-mocha-700";
    const indexBadge = document.createElement("span");
    indexBadge.className = "order-cart-index";
    indexBadge.textContent = String(index + 1);
    const itemName = document.createElement("span");
    itemName.className = "order-cart-name";
    itemName.textContent = line.itemName;
    left.appendChild(indexBadge);
    left.appendChild(itemName);

    const meta = document.createElement("p");
    meta.className = "order-cart-meta";
    meta.textContent = `${line.qty} x ${formatCurrency(line.unitPrice)}`;

    const right = document.createElement("span");
    right.className = "order-cart-subtotal text-xs font-extrabold text-mocha-900";
    right.textContent = formatCurrency(line.subtotal);

    const actionRow = document.createElement("div");
    actionRow.className = "order-cart-line-actions";

    const qtyControl = document.createElement("div");
    qtyControl.className = "order-qty-control";
    qtyControl.setAttribute("role", "group");
    qtyControl.setAttribute("aria-label", `Ubah jumlah ${line.itemName}`);

    const decreaseButton = document.createElement("button");
    decreaseButton.type = "button";
    decreaseButton.className = "btn-focus order-qty-btn";
    decreaseButton.dataset.cartAction = "decrease";
    decreaseButton.dataset.cartItem = line.itemName;
    decreaseButton.setAttribute("aria-label", `Kurangi ${line.itemName}`);
    decreaseButton.textContent = "−";

    const qtyValue = document.createElement("span");
    qtyValue.className = "order-qty-value";
    qtyValue.textContent = String(line.qty);

    const increaseButton = document.createElement("button");
    increaseButton.type = "button";
    increaseButton.className = "btn-focus order-qty-btn";
    increaseButton.dataset.cartAction = "increase";
    increaseButton.dataset.cartItem = line.itemName;
    increaseButton.setAttribute("aria-label", `Tambah ${line.itemName}`);
    increaseButton.textContent = "+";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "btn-focus order-remove-btn";
    removeButton.dataset.cartAction = "remove";
    removeButton.dataset.cartItem = line.itemName;
    removeButton.setAttribute("aria-label", `Hapus ${line.itemName}`);
    removeButton.textContent = "Hapus";

    leftWrap.appendChild(left);
    leftWrap.appendChild(meta);
    topRow.appendChild(leftWrap);
    topRow.appendChild(right);

    qtyControl.appendChild(decreaseButton);
    qtyControl.appendChild(qtyValue);
    qtyControl.appendChild(increaseButton);
    actionRow.appendChild(qtyControl);
    actionRow.appendChild(removeButton);

    li.appendChild(topRow);
    li.appendChild(actionRow);
    listElement.appendChild(li);
  });
};

const updateCartViews = () => {
  const { lines, totalItems, totalPrice } = getCartSummary();
  const hasItems = lines.length > 0;
  const becameActive = hasItems && !hadCartItems;
  const nextKeys = new Set(lines.map((line) => `${line.itemName}|${line.qty}`));
  const prepEstimateText = getPrepEstimateText(totalItems);

  updateMenuLayoutByCartState(hasItems);

  cartViews.forEach((view) => {
    if (view.count) {
      view.count.textContent = String(totalItems);
    }

    if (view.total) {
      view.total.textContent = formatCurrency(totalPrice);
    }

    if (view.list) {
      renderCartList(view.list, lines, previousCartLineKeys);
      view.list.classList.toggle("hidden", !hasItems);
    }

    if (view.estimate) {
      view.estimate.textContent = prepEstimateText;
    }

    if (view.empty) {
      view.empty.classList.toggle("hidden", hasItems);
    }

    if (view.hideWhenEmpty && view.wrapper) {
      view.wrapper.classList.toggle("hidden", !hasItems);
    }

    if (view.sendButton) {
      applySendButtonVisualState(view.sendButton, hasItems);
    }

    if (view.clearButton) {
      view.clearButton.disabled = !hasItems;
      view.clearButton.classList.toggle("opacity-60", !hasItems);
      view.clearButton.classList.toggle("cursor-not-allowed", !hasItems);
    }
  });

  if (becameActive) {
    const shouldScroll = window.matchMedia("(max-width: 1023px)").matches;
    revealCartPanel({ shouldScroll });
  }

  hadCartItems = hasItems;
  previousCartLineKeys = nextKeys;
  updateOrderFlowSteps();
};

const addToCart = (itemName, itemPrice) => {
  const safePrice = Number.isFinite(itemPrice) && itemPrice > 0 ? itemPrice : 0;
  const current = menuCart.get(itemName) || { qty: 0, price: safePrice };

  current.qty += 1;
  if (!current.price && safePrice) {
    current.price = safePrice;
  }

  hasSubmittedOrder = false;
  cartSendState = "idle";
  menuCart.set(itemName, current);
  updateCartViews();
};

const adjustCartItemQty = (itemName, delta) => {
  const current = menuCart.get(itemName);
  if (!current || !Number.isFinite(delta) || delta === 0) {
    return;
  }

  const nextQty = current.qty + delta;
  hasSubmittedOrder = false;
  cartSendState = "idle";

  if (nextQty <= 0) {
    menuCart.delete(itemName);
  } else {
    menuCart.set(itemName, { ...current, qty: nextQty });
  }

  updateCartViews();
};

const removeFromCart = (itemName) => {
  if (!menuCart.has(itemName)) {
    return;
  }

  hasSubmittedOrder = false;
  cartSendState = "idle";
  menuCart.delete(itemName);
  updateCartViews();
};

const buildCartMessage = (orderContext) => {
  const { lines, totalItems, totalPrice } = getCartSummary();
  if (!lines.length) {
    return ORDER_MESSAGE;
  }

  const createdAt = new Date();
  const orderCode = buildOrderCode(createdAt);
  const orderTime = `${formatWibDateTime(createdAt)} WIB`;
  const orderType = `Dine-in (Meja ${orderContext.tableNumber})`;
  const customerLine = `Nama Pemesan: ${orderContext.customerName}\n`;

  const lineText = lines
    .map(
      (line, index) =>
        `${index + 1}. ${line.itemName}\n   ${line.qty} x ${formatCurrency(
          line.unitPrice
        )} = ${formatCurrency(line.subtotal)}`
    )
    .join("\n");

  return `Halo ${BUSINESS_INFO.name}, berikut struk pesanan:

STRUK PESANAN ${BUSINESS_INFO.name.toUpperCase()}
Kode Pesanan: ${orderCode}
Waktu: ${orderTime}
Jenis Pesanan: ${orderType}
${customerLine}------------------------------
${lineText}
------------------------------
Total Item: ${totalItems}
Total Bayar: ${formatCurrency(totalPrice)}

Mohon diproses. Terima kasih.`;
};

const sendCartToWhatsApp = () => {
  if (!menuCart.size) {
    return;
  }

  const orderContext = getOrderContext();
  if (!orderContext.isValid) {
    setCartSendState("idle");
    setOrderModeStatus(orderContext.error);
    revealCartPanel({ shouldScroll: true });
    focusMissingOrderField();
    updateOrderFlowSteps();
    return;
  }

  setCartSendState("processing");
  const message = buildCartMessage(orderContext);
  setOrderModeStatus("Struk pesanan siap dikirim ke WhatsApp.", "success");
  window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");
  hasSubmittedOrder = true;
  updateOrderFlowSteps();
  window.setTimeout(() => {
    setCartSendState("sent");
  }, 220);
};

const clearCart = () => {
  menuCart.clear();
  hasSubmittedOrder = false;
  cartSendState = "idle";
  setOrderModeStatus("");
  updateCartViews();
};

const registerCartView = ({
  wrapper,
  count,
  total,
  estimate,
  list,
  empty,
  sendButton,
  clearButton,
  hideWhenEmpty,
}) => {
  if (!wrapper) {
    return;
  }

  const view = {
    wrapper,
    count,
    total,
    estimate,
    list,
    empty,
    sendButton,
    clearButton,
    hideWhenEmpty: Boolean(hideWhenEmpty),
  };

  if (sendButton) {
    sendButton.addEventListener("click", sendCartToWhatsApp);
  }

  if (clearButton) {
    clearButton.addEventListener("click", clearCart);
  }

  cartViews.push(view);
};

const initCartViews = () => {
  registerCartView({
    wrapper: query("#orderCartPanel"),
    count: query("#orderCartCount"),
    total: query("#orderCartTotal"),
    estimate: query("#orderPrepEstimate"),
    list: query("#orderCartList"),
    empty: query("#orderCartEmpty"),
    sendButton: query("#orderCartSendBtn"),
    clearButton: query("#orderCartClearBtn"),
    hideWhenEmpty: true,
  });

  registerCartView({
    wrapper: query("#miniCartBar"),
    count: query("#miniCartCount"),
    total: query("#miniCartTotal"),
    estimate: null,
    list: null,
    empty: null,
    sendButton: query("#sendCartBtn"),
    clearButton: query("#clearCartBtn"),
    hideWhenEmpty: true,
  });

  registerCartView({
    wrapper: query("#deskCartBar"),
    count: query("#deskCartCount"),
    total: query("#deskCartTotal"),
    estimate: query("#deskCartEstimate"),
    list: null,
    empty: null,
    sendButton: query("#deskCartSendBtn"),
    clearButton: null,
    hideWhenEmpty: true,
  });

  updateCartViews();
};

const initCartLineActions = () => {
  const cartList = query("#orderCartList");
  if (!cartList) {
    return;
  }

  cartList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const actionButton = target.closest("[data-cart-action]");
    if (!actionButton || !cartList.contains(actionButton)) {
      return;
    }

    const action = String(actionButton.dataset.cartAction || "");
    const itemName = String(actionButton.dataset.cartItem || "").trim();
    if (!itemName) {
      return;
    }

    if (action === "increase") {
      adjustCartItemQty(itemName, 1);
      return;
    }

    if (action === "decrease") {
      adjustCartItemQty(itemName, -1);
      return;
    }

    if (action === "remove") {
      removeFromCart(itemName);
    }
  });
};

const initMenuOrderButtons = () => {
  queryAll("[data-menu-item]").forEach((button) => {
    const itemName = button.dataset.menuItem?.trim();
    const itemPrice = Number(button.dataset.menuPrice || 0);

    if (!itemName) {
      return;
    }

    const message = `Halo ${BUSINESS_INFO.name}, saya mau pesan ${itemName} 1 porsi. Mohon info total dan estimasi waktunya.`;
    button.href = buildWhatsAppUrl(message);

    button.addEventListener("click", (event) => {
      event.preventDefault();
      playMenuButtonFeedback(button);
      addToCart(itemName, itemPrice);

      const orderContext = getOrderContext();
      if (!orderContext.isValid) {
        setOrderModeStatus(orderContext.error);
        revealCartPanel({ shouldScroll: true });
        focusMissingOrderField();
        return;
      }

      setOrderModeStatus("");
    });
  });
};

const initMenuFilters = () => {
  const filterGroup = query("[data-menu-filter-group]");
  if (!filterGroup) {
    return;
  }

  const filterButtons = queryAll("[data-menu-filter]", filterGroup);
  const menuCards = queryAll("[data-menu-category]");
  const emptyState = query("#menuFilterEmpty");

  if (!filterButtons.length || !menuCards.length) {
    return;
  }

  const applyFilter = (filterName) => {
    let visibleCount = 0;

    filterButtons.forEach((button) => {
      const isActive = button.dataset.menuFilter === filterName;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    menuCards.forEach((card) => {
      const categories = String(card.dataset.menuCategory || "")
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

      const shouldShow = filterName === "all" || categories.includes(filterName);
      card.classList.toggle("is-filter-hidden", !shouldShow);

      if (shouldShow) {
        visibleCount += 1;
      }
    });

    if (emptyState) {
      emptyState.classList.toggle("hidden", visibleCount > 0);
    }
  };

  filterButtons.forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      applyFilter(String(button.dataset.menuFilter || "all"));
    });
  });

  applyFilter("all");
};

const setAccordionState = (item, isOpen) => {
  const trigger = query("[data-accordion-trigger]", item);
  const panel = query("[data-accordion-panel]", item);
  const icon = query("[data-accordion-icon]", item);

  if (!trigger || !panel || !icon) {
    return;
  }

  trigger.setAttribute("aria-expanded", String(isOpen));
  panel.hidden = !isOpen;
  icon.textContent = isOpen ? "-" : "+";
};

const initAccordion = () => {
  const accordion = query("[data-accordion]");
  if (!accordion) {
    return;
  }

  const items = queryAll("[data-accordion-item]", accordion);
  items.forEach((item) => setAccordionState(item, false));

  accordion.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-accordion-trigger]");
    if (!trigger || !accordion.contains(trigger)) {
      return;
    }

    const parentItem = trigger.closest("[data-accordion-item]");
    if (!parentItem) {
      return;
    }

    const isCurrentlyOpen = trigger.getAttribute("aria-expanded") === "true";

    items.forEach((item) => setAccordionState(item, false));
    if (!isCurrentlyOpen) {
      setAccordionState(parentItem, true);
    }
  });
};

const initPromoForm = () => {
  const form = query("#promoForm");
  const status = query("#promoStatus");

  if (!form || !status) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();

    if (!name || !phone) {
      status.textContent = "Nama dan nomor WhatsApp wajib diisi.";
      status.classList.remove("hidden");
      return;
    }

    const promoMessage = `Halo ${BUSINESS_INFO.name}, saya ingin klaim diskon 15% kunjungan pertama. Nama: ${name}. Nomor WhatsApp: ${phone}.`;
    window.open(buildWhatsAppUrl(promoMessage), "_blank", "noopener,noreferrer");

    status.textContent = "Data siap diproses dan terkirim ke WhatsApp pemilik.";
    status.classList.remove("hidden");
    form.reset();
  });
};

const initScrollReveal = () => {
  const revealItems = queryAll(".reveal-on-scroll");
  if (!revealItems.length) {
    return;
  }

  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  document.body.classList.add("reveal-init");

  revealItems.forEach((item, index) => {
    item.style.setProperty("--reveal-order", String(index % 5));
  });

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  revealItems.forEach((item) => {
    if (item.getBoundingClientRect().top <= window.innerHeight * 0.92) {
      item.classList.add("is-visible");
    }

    revealObserver.observe(item);
  });
};

const initTiltCards = () => {
  if (prefersReducedMotion.matches || !supportsFinePointer.matches) {
    return;
  }

  queryAll(".tilt-card").forEach((card) => {
    let rafId = 0;

    const updateTilt = (event) => {
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }

      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const percentX = Math.min(Math.max(pointerX / rect.width, 0), 1);
      const percentY = Math.min(Math.max(pointerY / rect.height, 0), 1);

      const rotateY = (percentX - 0.5) * 8;
      const rotateX = (0.5 - percentY) * 8;

      card.style.setProperty("--tilt-glow-x", `${(percentX * 100).toFixed(2)}%`);
      card.style.setProperty("--tilt-glow-y", `${(percentY * 100).toFixed(2)}%`);
      card.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-3px)`;
      card.classList.add("is-tilting");
    };

    const onPointerMove = (event) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => updateTilt(event));
    };

    const resetTilt = () => {
      cancelAnimationFrame(rafId);
      card.classList.remove("is-tilting");
      card.style.transform = "";
      card.style.removeProperty("--tilt-glow-x");
      card.style.removeProperty("--tilt-glow-y");
    };

    card.addEventListener("pointermove", onPointerMove);
    card.addEventListener("pointerleave", resetTilt);
    card.addEventListener("pointercancel", resetTilt);
  });
};

const init = () => {
  applyHeroLocalPhoto();
  applyBusinessProof();
  applyOpenStatus();

  initPrimaryCtas();
  initOrderModeControls();
  initCartViews();
  initCartLineActions();
  initMenuOrderButtons();
  initMenuFilters();
  initAccordion();
  initPromoForm();
  initScrollReveal();
  initTiltCards();
};

init();
