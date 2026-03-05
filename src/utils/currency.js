(function attachCurrencyFormatter(globalScope) {
  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  globalScope.formatCurrencyBRL = function formatCurrencyBRL(value) {
    return formatter.format(Number(value) || 0);
  };
})(window);
