(function attachDriveLanchesData(globalScope) {
  const products = [
    {
      id: "big-mac",
      name: "Big Mac",
      category: "Sanduiches",
      description: "Dois hamburgueres, queijo, alface e molho especial.",
      photo: "./img/bigmac.png",
      price: 29.9,
      extras: [
        { id: "extra-cheddar", name: "Extra cheddar", price: 3.5 },
        { id: "extra-bacon", name: "Bacon crocante", price: 4.5 },
      ],
    },
    {
      id: "mc-chicken",
      name: "Mc Chicken",
      category: "Sanduiches",
      description: "Frango empanado com maionese e alface.",
      photo: "./img/mcchiken.png",
      price: 23.9,
      extras: [
        { id: "extra-maionese", name: "Maionese temperada", price: 2.0 },
        { id: "extra-cheddar", name: "Extra cheddar", price: 3.5 },
      ],
    },
    {
      id: "double-salad",
      name: "Double Salad",
      category: "Sanduiches",
      description: "Dois burgers com salada fresca.",
      photo: "./img/doublesalad.png",
      price: 27.9,
      extras: [
        { id: "extra-picles", name: "Picles", price: 1.0 },
        { id: "extra-bacon", name: "Bacon crocante", price: 4.5 },
      ],
    },
    {
      id: "fries",
      name: "Fries",
      category: "Acompanhamentos",
      description: "Batata frita dourada e crocante.",
      photo: "./img/fries.png",
      price: 12.9,
      extras: [
        { id: "molho-barbecue", name: "Molho barbecue", price: 2.5 },
        { id: "molho-cheddar", name: "Molho cheddar", price: 3.0 },
      ],
    },
    {
      id: "nuggets",
      name: "Mc Nuggets",
      category: "Acompanhamentos",
      description: "Nuggets de frango empanado.",
      photo: "./img/nuggets.png",
      price: 15.9,
      extras: [
        { id: "molho-mostarda", name: "Molho mostarda e mel", price: 2.5 },
        { id: "molho-barbecue", name: "Molho barbecue", price: 2.5 },
      ],
    },
    {
      id: "salad",
      name: "Salad",
      category: "Acompanhamentos",
      description: "Opcao leve com folhas e tomate.",
      photo: "./img/salad.png",
      price: 10.9,
      extras: [
        { id: "frango-grelhado", name: "Frango grelhado", price: 5.0 },
        { id: "queijo-ralado", name: "Queijo ralado", price: 2.5 },
      ],
    },
    {
      id: "coke",
      name: "Coke",
      category: "Bebidas",
      description: "Refrigerante gelado 500ml.",
      photo: "./img/coke.png",
      price: 8.5,
      extras: [{ id: "gelo-extra", name: "Gelo extra", price: 0.5 }],
    },
    {
      id: "ice-tea",
      name: "Ice Tea",
      category: "Bebidas",
      description: "Cha gelado refrescante 500ml.",
      photo: "./img/icetea.png",
      price: 8.5,
      extras: [{ id: "limao", name: "Limao extra", price: 1.0 }],
    },
    {
      id: "water",
      name: "Water",
      category: "Bebidas",
      description: "Agua mineral sem gas 500ml.",
      photo: "./img/water.png",
      price: 6.0,
      extras: [{ id: "gelo-extra", name: "Gelo extra", price: 0.5 }],
    },
  ];

  const coupons = {
    LANCHES10: {
      code: "LANCHES10",
      type: "percent",
      value: 0.1,
      minSubtotal: 45,
      description: "10% OFF para pedidos acima de R$ 45,00.",
    },
    COMBO5: {
      code: "COMBO5",
      type: "fixed",
      value: 5,
      minSubtotal: 30,
      description: "R$ 5,00 OFF para pedidos acima de R$ 30,00.",
    },
  };

  globalScope.DriveLanchesData = {
    products,
    coupons,
    deliveryFee: 7.9,
  };
})(window);
