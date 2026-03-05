const STORAGE_KEY = "drive-lanches-order-v3";
const appData = window.DriveLanchesData || {
  products: [],
  coupons: {},
  deliveryFee: 0,
};

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function createInitialProducts() {
  return appData.products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    photo: product.photo,
    price: Number(product.price) || 0,
    extras: Array.isArray(product.extras)
      ? product.extras.map((extra) => ({
          id: extra.id,
          name: extra.name,
          price: Number(extra.price) || 0,
        }))
      : [],
    active: false,
    quantity: 1,
    selectedExtraIds: [],
  }));
}

function normalizeSelectedExtras(product, selectedExtraIds) {
  if (!Array.isArray(selectedExtraIds)) {
    return [];
  }

  const validIds = new Set(product.extras.map((extra) => extra.id));
  const normalized = selectedExtraIds
    .filter((extraId) => validIds.has(extraId))
    .map((extraId) => String(extraId));

  return [...new Set(normalized)];
}

function loadState() {
  const initialProducts = createInitialProducts();
  const fallbackState = {
    products: initialProducts,
    orderType: "Balcao",
    couponCode: "",
    orderNote: "",
  };

  const storedRaw = window.localStorage.getItem(STORAGE_KEY);
  if (!storedRaw) {
    return fallbackState;
  }

  try {
    const parsed = JSON.parse(storedRaw);
    const storedProducts = Array.isArray(parsed.products) ? parsed.products : [];
    const storedMap = Object.fromEntries(storedProducts.map((item) => [item.id, item]));

    const products = initialProducts.map((product) => {
      const stored = storedMap[product.id];
      if (!stored) {
        return product;
      }

      const active = Boolean(stored.active);
      const quantity = Number(stored.quantity);

      return {
        ...product,
        active,
        quantity: active ? Math.max(1, Math.floor(quantity) || 1) : 1,
        selectedExtraIds: active
          ? normalizeSelectedExtras(product, stored.selectedExtraIds)
          : [],
      };
    });

    const orderType =
      parsed.orderType === "Drive-thru" || parsed.orderType === "Entrega"
        ? parsed.orderType
        : "Balcao";

    const couponCode =
      typeof parsed.couponCode === "string"
        ? parsed.couponCode.toUpperCase().trim()
        : "";
    const orderNote =
      typeof parsed.orderNote === "string" ? parsed.orderNote.slice(0, 140) : "";

    return {
      products,
      orderType,
      couponCode,
      orderNote,
    };
  } catch {
    return fallbackState;
  }
}

function saveState(state) {
  const minimalProducts = state.products.map((product) => ({
    id: product.id,
    active: product.active,
    quantity: product.quantity,
    selectedExtraIds: product.selectedExtraIds,
  }));

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      products: minimalProducts,
      orderType: state.orderType,
      couponCode: state.couponCode,
      orderNote: state.orderNote,
    }),
  );
}

function getCouponValidation(coupon, subtotal) {
  if (!coupon) {
    return { valid: false, message: "" };
  }

  if (subtotal < coupon.minSubtotal) {
    return {
      valid: false,
      message: `Cupom ${coupon.code} exige subtotal minimo de ${window.formatCurrencyBRL(
        coupon.minSubtotal,
      )}.`,
    };
  }

  return { valid: true, message: "" };
}

const restoredState = loadState();

Vue.createApp({
  data() {
    return {
      products: restoredState.products,
      searchTerm: "",
      selectedCategory: "Todos",
      orderType: restoredState.orderType,
      couponInput: restoredState.couponCode,
      appliedCouponCode: restoredState.couponCode,
      couponFeedback: "",
      orderNote: restoredState.orderNote,
      isReviewOpen: false,
      reviewOrder: null,
      reviewStep: "review",
    };
  },
  computed: {
    categories() {
      return [
        "Todos",
        ...new Set(this.products.map((product) => product.category)),
      ];
    },
    filteredProducts() {
      const term = this.searchTerm.trim().toLowerCase();

      return this.products.filter((product) => {
        const categoryMatch =
          this.selectedCategory === "Todos" ||
          product.category === this.selectedCategory;
        const textMatch =
          term === "" ||
          product.name.toLowerCase().includes(term) ||
          product.description.toLowerCase().includes(term);

        return categoryMatch && textMatch;
      });
    },
    selectedProducts() {
      return this.products
        .filter((product) => product.active)
        .map((product) => {
          const selectedExtras = product.extras.filter((extra) =>
            product.selectedExtraIds.includes(extra.id),
          );
          const extrasUnitTotal = selectedExtras.reduce(
            (total, extra) => total + extra.price,
            0,
          );
          const unitPrice = round2(product.price + extrasUnitTotal);

          return {
            ...product,
            selectedExtras,
            extrasUnitTotal,
            unitPrice,
            subtotal: round2(unitPrice * product.quantity),
          };
        });
    },
    selectedUnits() {
      return this.selectedProducts.reduce(
        (total, product) => total + product.quantity,
        0,
      );
    },
    subtotal() {
      return round2(
        this.selectedProducts.reduce((total, product) => total + product.subtotal, 0),
      );
    },
    couponCatalog() {
      return appData.coupons;
    },
    activeCoupon() {
      return this.couponCatalog[this.appliedCouponCode] || null;
    },
    couponValidation() {
      return getCouponValidation(this.activeCoupon, this.subtotal);
    },
    discountAmount() {
      if (!this.activeCoupon || !this.couponValidation.valid) {
        return 0;
      }

      if (this.activeCoupon.type === "percent") {
        return round2(this.subtotal * this.activeCoupon.value);
      }

      if (this.activeCoupon.type === "fixed") {
        return round2(Math.min(this.activeCoupon.value, this.subtotal));
      }

      return 0;
    },
    deliveryFeeAmount() {
      return this.orderType === "Entrega" ? appData.deliveryFee : 0;
    },
    totalValue() {
      return round2(
        Math.max(0, this.subtotal - this.discountAmount + this.deliveryFeeAmount),
      );
    },
    estimatedMinutes() {
      if (this.selectedUnits === 0) {
        return 0;
      }

      const baseTime = 8 + this.selectedUnits * 2;

      if (this.orderType === "Entrega") {
        return baseTime + 12;
      }

      if (this.orderType === "Drive-thru") {
        return baseTime + 4;
      }

      return baseTime;
    },
    canFinalize() {
      return this.selectedProducts.length > 0;
    },
  },
  methods: {
    persistState() {
      saveState({
        products: this.products,
        orderType: this.orderType,
        couponCode: this.appliedCouponCode,
        orderNote: this.orderNote,
      });
    },
    formatCurrency(value) {
      if (typeof window.formatCurrencyBRL === "function") {
        return window.formatCurrencyBRL(value);
      }

      return `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;
    },
    toggleProduct(product) {
      product.active = !product.active;

      if (!product.active) {
        product.quantity = 1;
        product.selectedExtraIds = [];
      }
    },
    increaseQuantity(product) {
      if (!product.active) {
        product.active = true;
      }

      product.quantity += 1;
    },
    decreaseQuantity(product) {
      if (product.quantity <= 1) {
        return;
      }

      product.quantity -= 1;
    },
    isExtraSelected(product, extraId) {
      return product.selectedExtraIds.includes(extraId);
    },
    toggleExtra(product, extraId) {
      if (!product.active) {
        product.active = true;
      }

      const currentIndex = product.selectedExtraIds.indexOf(extraId);

      if (currentIndex >= 0) {
        product.selectedExtraIds.splice(currentIndex, 1);
        return;
      }

      product.selectedExtraIds.push(extraId);
    },
    applyCoupon() {
      const code = this.couponInput.trim().toUpperCase();

      if (!code) {
        this.couponFeedback = "Digite um cupom para aplicar.";
        return;
      }

      const coupon = this.couponCatalog[code];

      if (!coupon) {
        this.couponFeedback = "Cupom invalido.";
        return;
      }

      const validation = getCouponValidation(coupon, this.subtotal);
      if (!validation.valid) {
        this.couponFeedback = validation.message;
        return;
      }

      this.appliedCouponCode = code;
      this.couponInput = code;
      this.couponFeedback = `${code} aplicado com sucesso.`;
    },
    removeCoupon() {
      this.appliedCouponCode = "";
      this.couponInput = "";
      this.couponFeedback = "Cupom removido.";
    },
    resetOrderData() {
      this.products = createInitialProducts();
      this.orderType = "Balcao";
      this.appliedCouponCode = "";
      this.couponInput = "";
      this.orderNote = "";
      this.couponFeedback = "";
    },
    clearOrder() {
      this.resetOrderData();
      this.isReviewOpen = false;
      this.reviewOrder = null;
      this.reviewStep = "review";
    },
    closeCheckoutReview() {
      this.isReviewOpen = false;
      this.reviewOrder = null;
      this.reviewStep = "review";
    },
    finalizeOrder() {
      if (!this.canFinalize) {
        return;
      }

      const orderCode = `DL-${String(Date.now()).slice(-6)}`;
      this.reviewOrder = {
        code: orderCode,
        createdAt: new Date().toLocaleString("pt-BR"),
        items: this.selectedProducts.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          extras: item.selectedExtras.map((extra) => extra.name),
        })),
        orderType: this.orderType,
        couponCode: this.appliedCouponCode,
        orderNote: this.orderNote,
        estimatedMinutes: this.estimatedMinutes,
        subtotal: this.subtotal,
        discountAmount: this.discountAmount,
        deliveryFeeAmount: this.deliveryFeeAmount,
        totalValue: this.totalValue,
        confirmedAt: "",
        confirmationMessage: "",
      };
      this.reviewStep = "review";
      this.isReviewOpen = true;
    },
    confirmOrder() {
      if (!this.reviewOrder) {
        return;
      }

      const confirmedAt = new Date().toLocaleString("pt-BR");
      const confirmationMessage =
        `Pedido ${this.reviewOrder.code} confirmado com sucesso. ` +
        `Total ${this.formatCurrency(this.reviewOrder.totalValue)} | ` +
        `Tempo estimado ${this.reviewOrder.estimatedMinutes} min.`;

      const confirmedOrder = {
        ...this.reviewOrder,
        confirmedAt,
        confirmationMessage,
      };
      this.reviewOrder = confirmedOrder;
      this.reviewStep = "confirmed";
      this.resetOrderData();
    },
    buildReceiptLines(order) {
      const divider = "----------------------------------------";
      const lines = [
        "DRIVE LANCHES",
        "NOTINHA DO PEDIDO",
        divider,
        `Pedido: ${order.code}`,
        `Data: ${order.confirmedAt || order.createdAt}`,
        `Tipo: ${order.orderType}`,
        `Cupom: ${order.couponCode || "Sem cupom"}`,
        divider,
        "ITENS",
      divider,
      ];

      order.items.forEach((item) => {
        lines.push(`${item.quantity}x ${item.name} - ${this.formatCurrency(item.subtotal)}`);

        if (Array.isArray(item.extras) && item.extras.length > 0) {
          lines.push(`  + ${item.extras.join(", ")}`);
        }
      });

      lines.push(
        divider,
        `Subtotal: ${this.formatCurrency(order.subtotal)}`,
        `Desconto: - ${this.formatCurrency(order.discountAmount)}`,
        `Taxa de entrega: ${this.formatCurrency(order.deliveryFeeAmount)}`,
        `TOTAL: ${this.formatCurrency(order.totalValue)}`,
        divider,
        `Tempo estimado: ${order.estimatedMinutes} min`,
        `Observacoes: ${order.orderNote || "Sem observacoes"}`,
        divider,
        "Obrigado pela preferencia!",
      );

      return lines;
    },
    buildReceiptText(order) {
      if (!order) {
        return "";
      }

      const lines = this.buildReceiptLines(order);
      return `${lines.join("\n")}\n`;
    },
    downloadReceipt(order) {
      if (!order) {
        return;
      }

      const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
      if (!jsPDFConstructor) {
        return;
      }

      const lines = this.buildReceiptLines(order);
      const pageWidth = 226.77;
      const margin = 12;
      const lineHeight = 12;
      const maxCharsPerLine = 34;
      const wrappedLines = [];

      lines.forEach((line) => {
        const content = String(line || "");

        if (content.length <= maxCharsPerLine) {
          wrappedLines.push(content);
          return;
        }

        const words = content.split(" ");
        let currentLine = "";

        words.forEach((word) => {
          const candidate = currentLine ? `${currentLine} ${word}` : word;

          if (candidate.length > maxCharsPerLine) {
            if (currentLine) {
              wrappedLines.push(currentLine);
            }
            currentLine = word;
          } else {
            currentLine = candidate;
          }
        });

        if (currentLine) {
          wrappedLines.push(currentLine);
        }
      });

      const pageHeight = Math.max(240, margin * 2 + wrappedLines.length * lineHeight + 12);
      const pdf = new jsPDFConstructor({
        unit: "pt",
        format: [pageWidth, pageHeight],
      });

      pdf.setFont("courier", "normal");
      pdf.setFontSize(9.5);

      let y = margin + 6;
      wrappedLines.forEach((line) => {
        pdf.text(line, margin, y);
        y += lineHeight;
      });

      const fileNameSafeCode = String(order.code || "pedido").replace(
        /[^a-zA-Z0-9-_]/g,
        "",
      );
      pdf.save(`notinha-${fileNameSafeCode}.pdf`);
    },
    downloadConfirmedReceipt() {
      this.downloadReceipt(this.reviewOrder);
    },
  },
  watch: {
    products: {
      deep: true,
      handler() {
        this.persistState();
      },
    },
    orderType() {
      this.persistState();
    },
    appliedCouponCode() {
      this.persistState();
    },
    orderNote() {
      this.persistState();
    },
    subtotal() {
      if (this.appliedCouponCode && !this.couponValidation.valid) {
        this.couponFeedback = this.couponValidation.message;
      }
    },
  },
  mounted() {
    if (this.appliedCouponCode && this.activeCoupon) {
      const validation = getCouponValidation(this.activeCoupon, this.subtotal);
      this.couponFeedback = validation.valid
        ? `${this.appliedCouponCode} aplicado com sucesso.`
        : validation.message;
    }
  },
}).mount("#app");
