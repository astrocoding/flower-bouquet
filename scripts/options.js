(function () {
  const FLOWERS = [
    {
      id: "rose",
      name: "Rose",
      petals: 14,
      colors: ["#ff5b74", "#ff88a5"],
      core: "#f9d264",
      halo: "rgba(255, 92, 122, 0.25)",
    },
    {
      id: "sunflower",
      name: "Sunflower",
      petals: 18,
      colors: ["#ffd447", "#f0ab24"],
      core: "#7a4b1f",
      halo: "rgba(255, 212, 71, 0.28)",
    },
    {
      id: "lily",
      name: "Lily",
      petals: 6,
      colors: ["#b8a7ff", "#d6cbff"],
      core: "#f7cf8b",
      halo: "rgba(186, 171, 255, 0.28)",
    },
    {
      id: "daisy",
      name: "Daisy",
      petals: 16,
      colors: ["#f9fdff", "#d8eefb"],
      core: "#f7ba3a",
      halo: "rgba(215, 239, 255, 0.35)",
    },
    {
      id: "peony",
      name: "Peony",
      petals: 20,
      colors: ["#ffb5c8", "#ffd4df"],
      core: "#f7a15f",
      halo: "rgba(255, 197, 218, 0.32)",
    },
    {
      id: "tulip",
      name: "Tulip",
      petals: 7,
      colors: ["#ff7542", "#ff9b74"],
      core: "#ffd58f",
      halo: "rgba(255, 129, 70, 0.26)",
    },
    {
      id: "anemone",
      name: "Anemone",
      petals: 9,
      colors: ["#9de0d6", "#c5f3eb"],
      core: "#4f5e99",
      halo: "rgba(157, 224, 214, 0.32)",
    },
    {
      id: "gerbera",
      name: "Gerbera",
      petals: 22,
      colors: ["#ff4aa2", "#ff75bf"],
      core: "#f7d057",
      halo: "rgba(255, 88, 169, 0.28)",
    },
    {
      id: "camellia",
      name: "Camellia",
      petals: 13,
      colors: ["#ff7c97", "#f7a0b3"],
      core: "#f5bf6f",
      halo: "rgba(255, 124, 151, 0.28)",
    },
    {
      id: "orchid",
      name: "Orchid",
      petals: 5,
      colors: ["#f5c3ea", "#f3dbff"],
      core: "#f4a739",
      halo: "rgba(245, 195, 234, 0.28)",
    },
    {
      id: "gardenia",
      name: "Gardenia",
      petals: 11,
      colors: ["#fffaf0", "#f8edd9"],
      core: "#f2cc80",
      halo: "rgba(255, 248, 231, 0.32)",
    },
    {
      id: "babysbreath",
      name: "Baby's Breath",
      petals: 24,
      colors: ["#ffffff", "#e8f2ff"],
      core: "#f5d9a1",
      halo: "rgba(227, 240, 255, 0.34)",
    },
  ];

  const THEMES = [
    {
      id: "peach",
      label: "Peach Garden",
      background: "linear-gradient(140deg, #fff8ef 0%, #ffe6df 52%, #ffe9d3 100%)",
      card: "#fff7ef",
      accent: "#f57d65",
    },
    {
      id: "mint",
      label: "Mint Meadow",
      background: "linear-gradient(135deg, #f2fff9 0%, #daf5ed 48%, #e4f3ff 100%)",
      card: "#f8fffc",
      accent: "#418f7c",
    },
    {
      id: "sunset",
      label: "Sunset Glow",
      background: "linear-gradient(145deg, #fff1eb 0%, #ffd5bf 46%, #ffd0d9 100%)",
      card: "#fff7f4",
      accent: "#b9654f",
    },
  ];

  const FLOWER_BY_ID = Object.fromEntries(FLOWERS.map((flower) => [flower.id, flower]));
  const THEME_BY_ID = Object.fromEntries(THEMES.map((theme) => [theme.id, theme]));

  const MIN_RECOMMENDED_BLOOMS = 6;
  const MAX_BLOOMS = 10;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getFlower(id) {
    return FLOWER_BY_ID[id] || FLOWERS[0];
  }

  function getTheme(id) {
    return THEME_BY_ID[id] || THEMES[0];
  }

  function normalizeCounts(counts) {
    const normalized = {};
    let total = 0;

    Object.entries(counts || {}).forEach(([id, qty]) => {
      const value = clamp(Number(qty) || 0, 0, 10);
      if (!FLOWER_BY_ID[id] || value === 0) {
        return;
      }
      normalized[id] = value;
      total += value;
    });

    if (total <= MAX_BLOOMS) {
      return normalized;
    }

    const reduced = {};
    let budget = MAX_BLOOMS;
    Object.entries(normalized)
      .sort((a, b) => b[1] - a[1])
      .forEach(([id, qty]) => {
        if (budget <= 0) {
          return;
        }
        const take = Math.min(qty, budget);
        reduced[id] = take;
        budget -= take;
      });

    return reduced;
  }

  function encodeFlowers(counts) {
    const normalized = normalizeCounts(counts);
    return Object.entries(normalized)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => `${id}.${qty}`)
      .join(",");
  }

  function decodeFlowers(raw) {
    if (!raw) {
      return {};
    }

    const counts = {};

    String(raw)
      .split(",")
      .forEach((token) => {
        const [id, qtyRaw] = token.split(".");
        if (!FLOWER_BY_ID[id]) {
          return;
        }
        const qty = clamp(Number(qtyRaw) || 0, 0, 10);
        if (qty > 0) {
          counts[id] = qty;
        }
      });

    return normalizeCounts(counts);
  }

  function expandFlowers(counts) {
    const list = [];

    Object.entries(normalizeCounts(counts)).forEach(([id, qty]) => {
      for (let i = 0; i < qty; i += 1) {
        list.push(id);
      }
    });

    return list;
  }

  function createFlowerNode(id, options) {
    const opts = options || {};
    const flower = getFlower(id);
    const root = document.createElement("div");
    root.className = [
      "flower-token",
      `flower-${flower.id}`,
      `size-${opts.size || "md"}`,
      opts.withStem ? "with-stem" : "",
    ]
      .join(" ")
      .trim();

    root.style.setProperty("--petal-a", flower.colors[0]);
    root.style.setProperty("--petal-b", flower.colors[1]);
    root.style.setProperty("--core", flower.core);
    root.style.setProperty("--halo", flower.halo);
    root.style.setProperty("--petal-count", String(flower.petals));

    root.innerHTML = [
      '<span class="flower-halo"></span>',
      '<span class="flower-head">',
      '<span class="petals"></span>',
      '<span class="flower-center"></span>',
      "</span>",
      opts.withStem
        ? '<span class="flower-stem"></span><span class="flower-leaf leaf-left"></span><span class="flower-leaf leaf-right"></span>'
        : "",
    ].join("");

    const petalsWrap = root.querySelector(".petals");
    for (let i = 0; i < flower.petals; i += 1) {
      const petal = document.createElement("span");
      petal.className = "petal";
      petal.style.setProperty("--i", String(i));
      petalsWrap.appendChild(petal);
    }

    if (opts.title) {
      root.setAttribute("aria-label", opts.title);
      root.setAttribute("role", "img");
    }

    return root;
  }

  window.BouquetOptions = {
    FLOWERS,
    THEMES,
    MIN_RECOMMENDED_BLOOMS,
    MAX_BLOOMS,
    getFlower,
    getTheme,
    normalizeCounts,
    encodeFlowers,
    decodeFlowers,
    expandFlowers,
    createFlowerNode,
  };
})();
