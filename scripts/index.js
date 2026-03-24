(function () {
  const lib = window.BouquetOptions;
  if (!lib) {
    return;
  }

  const DEFAULT_COUNTS = {
    rose: 2,
    daisy: 2,
    sunflower: 1,
    lily: 1,
  };

  const DEFAULT_MESSAGE =
    "Semoga harimu selalu seindah bunga-bunga ini. Terima kasih sudah hadir dan memberi warna.";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getTotal(counts) {
    return Object.values(counts || {}).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
  }

  function hashString(value) {
    const input = String(value || "");
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createSeededRandom(seedValue) {
    let seed = hashString(seedValue) || 1;
    return function seeded() {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomBetween(rng, min, max) {
    return min + (max - min) * rng();
  }

  function pointOnQuadratic(p0, p1, p2, t) {
    const oneMinusT = 1 - t;
    const x = oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x;
    const y = oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y;
    return { x, y };
  }

  function tangentOnQuadratic(p0, p1, p2, t) {
    const x = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const y = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    return { x, y };
  }

  function angleFromVector(vector) {
    return (Math.atan2(vector.y, vector.x) * 180) / Math.PI;
  }

  function uniqueFlowerIds(counts) {
    return Object.entries(counts || {})
      .filter(([, qty]) => Number(qty) > 0)
      .map(([id]) => id);
  }

  function buildPetalPalette(counts) {
    const ids = uniqueFlowerIds(counts);
    const palette = [];

    ids.forEach((id) => {
      const flower = lib.getFlower(id);
      palette.push({ a: flower.colors[0], b: flower.colors[1] });
      palette.push({ a: flower.colors[1], b: flower.core });
    });

    if (palette.length > 0) {
      return palette;
    }

    return [
      { a: "#ffd5e3", b: "#ffabc3" },
      { a: "#fff1d9", b: "#f4c77f" },
      { a: "#f2ecff", b: "#c7b8ff" },
    ];
  }

  function renderPetalRain(container, counts, seedSource) {
    if (!container) {
      return;
    }

    container.innerHTML = "";
    const palette = buildPetalPalette(counts);
    const rng = createSeededRandom(`${seedSource}|rain`);
    const density = window.innerWidth <= 640 ? 18 : 26;
    const shapes = [
      "74% 36% 70% 38%",
      "58% 44% 76% 38%",
      "66% 42% 62% 46%",
      "80% 42% 68% 34%",
    ];

    for (let i = 0; i < density; i += 1) {
      const petal = document.createElement("span");
      const pair = palette[Math.floor(rng() * palette.length)];
      const isAlt = rng() > 0.52;
      petal.className = isAlt ? "rain-petal alt" : "rain-petal";
      petal.style.left = `${(rng() * 102 - 1).toFixed(2)}%`;
      petal.style.top = `${(rng() * 92).toFixed(2)}%`;
      petal.style.setProperty("--petal-a", pair.a);
      petal.style.setProperty("--petal-b", pair.b);
      petal.style.setProperty("--petal-w", `${(rng() * 8 + 8).toFixed(2)}px`);
      petal.style.setProperty("--petal-h", `${(rng() * 11 + 10).toFixed(2)}px`);
      petal.style.setProperty("--petal-radius", shapes[Math.floor(rng() * shapes.length)]);
      petal.style.setProperty("--petal-radius-alt", shapes[Math.floor(rng() * shapes.length)]);
      petal.style.setProperty("--fall-duration", `${(rng() * 5 + 10).toFixed(2)}s`);
      petal.style.setProperty("--spin-duration", `${(rng() * 2.8 + 2.5).toFixed(2)}s`);
      petal.style.setProperty("--fall-delay", `${(rng() * -12).toFixed(2)}s`);
      petal.style.setProperty("--fall-drift", `${(rng() * 52 - 26).toFixed(2)}px`);
      container.appendChild(petal);
    }
  }

  function readQueryParam(query, keys, fallback) {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) {
      const value = query.get(key);
      if (value !== null && String(value).trim() !== "") {
        return value;
      }
    }
    return fallback;
  }

  function normalizeBasePath(pathname) {
    let path = String(pathname || "/");
    path = path.replace(/\/(index|custom)\.html$/, "/");
    path = path.replace(/\/buket\/?$/, "/");
    path = path.replace(/\/buket\/index\.html$/, "/");
    return path.endsWith("/") ? path : `${path}/`;
  }

  function inferAppBasePath(pathname) {
    const path = String(pathname || "/");
    const markers = ["/buket/index.html", "/buket/", "/buket", "/custom.html", "/custom", "/index.html"];
    for (const marker of markers) {
      const index = path.indexOf(marker);
      if (index >= 0) {
        const base = path.slice(0, index + 1);
        return base || "/";
      }
    }
    const fallback = normalizeBasePath(path);
    return fallback || "/";
  }

  function buildBouquetUrl(searchParams) {
    const baseUrl = new URL(window.location.href);
    const path = inferAppBasePath(baseUrl.pathname);
    const query = searchParams.toString();
    return `${baseUrl.origin}${path}buket${query ? `?${query}` : ""}`;
  }

  function buildCustomizerUrl(searchParams) {
    const baseUrl = new URL(window.location.href);
    const path = inferAppBasePath(baseUrl.pathname);
    const query = searchParams.toString();
    return `${baseUrl.origin}${path}${query ? `?${query}` : ""}`;
  }

  function formatSelectionSummary(counts) {
    return Object.entries(counts)
      .map(([id, qty]) => `${lib.getFlower(id).name} x${qty}`)
      .join(" | ");
  }

  function applyTheme(themeId) {
    const theme = lib.getTheme(themeId);
    document.body.dataset.theme = theme.id;
    document.body.style.setProperty("--theme-bg", theme.background);
    document.body.style.setProperty("--theme-card", theme.card);
    document.body.style.setProperty("--theme-accent", theme.accent);
    return theme;
  }

  function tryCopy(text) {
    if (!text) {
      return Promise.resolve(false);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard
        .writeText(text)
        .then(() => true)
        .catch(() => false);
    }

    return Promise.resolve(false);
  }

  function initCustomizer() {
    const picker = document.getElementById("flowerPicker");
    const chips = document.getElementById("selectionChips");
    const totalValue = document.getElementById("totalValue");
    const helperText = document.getElementById("selectionHelper");
    const nameInput = document.getElementById("recipientInput");
    const senderInput = document.getElementById("senderInput");
    const messageInput = document.getElementById("messageInput");
    const themeInput = document.getElementById("themeInput");
    const shareLinkInput = document.getElementById("shareLink");
    const previewButton = document.getElementById("previewButton");
    const copyButton = document.getElementById("copyButton");

    if (!picker) {
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const prefillCounts = lib.decodeFlowers(
      readQueryParam(query, ["flowers", "blooms", "bouquet"], "")
    );
    const counts = Object.assign(
      {},
      getTotal(prefillCounts) > 0 ? prefillCounts : DEFAULT_COUNTS
    );

    const controlsById = new Map();

    themeInput.innerHTML = "";
    lib.THEMES.forEach((theme) => {
      const option = document.createElement("option");
      option.value = theme.id;
      option.textContent = theme.label;
      themeInput.appendChild(option);
    });

    nameInput.value = readQueryParam(query, ["name", "to", "recipient"], "").trim();
    senderInput.value = readQueryParam(query, ["from", "sender"], "").trim();
    messageInput.value = readQueryParam(query, ["message", "msg", "card"], DEFAULT_MESSAGE).trim();
    themeInput.value = lib.getTheme(readQueryParam(query, ["theme", "mode"], lib.THEMES[0].id)).id;

    lib.FLOWERS.forEach((flower) => {
      const card = document.createElement("article");
      card.className = "flower-option";

      const icon = lib.createFlowerNode(flower.id, {
        size: "sm",
        title: flower.name,
      });

      const heading = document.createElement("h3");
      heading.textContent = flower.name;

      const controls = document.createElement("div");
      controls.className = "option-controls";

      const minusButton = document.createElement("button");
      minusButton.type = "button";
      minusButton.className = "qty-button";
      minusButton.textContent = "-";

      const qty = document.createElement("span");
      qty.className = "qty-value";
      qty.textContent = String(counts[flower.id] || 0);

      const plusButton = document.createElement("button");
      plusButton.type = "button";
      plusButton.className = "qty-button";
      plusButton.textContent = "+";

      controls.append(minusButton, qty, plusButton);
      card.append(icon, heading, controls);
      picker.appendChild(card);
      controlsById.set(flower.id, { qty, card, minusButton, plusButton });

      minusButton.addEventListener("click", () => adjust(flower.id, -1));
      plusButton.addEventListener("click", () => adjust(flower.id, 1));
    });

    function adjust(id, delta) {
      const current = counts[id] || 0;
      const next = clamp(current + delta, 0, lib.MAX_BLOOMS);
      const preview = Object.assign({}, counts, { [id]: next });
      if (getTotal(preview) > lib.MAX_BLOOMS) {
        helperText.textContent = `Maksimal ${lib.MAX_BLOOMS} bunga per buket.`;
        return;
      }
      counts[id] = next;
      render();
    }

    function renderChips() {
      chips.innerHTML = "";
      Object.entries(counts)
        .filter(([, qty]) => qty > 0)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([id, qty]) => {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "selection-chip";
          chip.textContent = `${lib.getFlower(id).name} x${qty}`;
          chip.addEventListener("click", () => {
            counts[id] = clamp((counts[id] || 0) - 1, 0, lib.MAX_BLOOMS);
            render();
          });
          chips.appendChild(chip);
        });
    }

    function makeShareUrl() {
      const params = new URLSearchParams();
      const normalized = lib.normalizeCounts(counts);
      const encoded = lib.encodeFlowers(normalized);

      if (encoded) {
        params.set("flowers", encoded);
      }

      const name = nameInput.value.trim();
      const from = senderInput.value.trim();
      const message = messageInput.value.trim();
      const theme = themeInput.value;

      if (name) {
        params.set("name", name);
      }

      if (from) {
        params.set("from", from);
      }

      if (message) {
        params.set("message", message);
      }

      if (theme) {
        params.set("theme", theme);
      }

      return buildBouquetUrl(params);
    }

    function updateButtons(shareUrl, hasSelection) {
      previewButton.disabled = !hasSelection;
      copyButton.disabled = !hasSelection;
      shareLinkInput.value = hasSelection
        ? shareUrl
        : "Pilih minimal 1 bunga untuk membuat link";
    }

    function render() {
      const total = getTotal(counts);

      controlsById.forEach(({ qty, card, minusButton, plusButton }, id) => {
        const value = counts[id] || 0;
        qty.textContent = String(value);
        card.classList.toggle("active", value > 0);
        minusButton.disabled = value === 0;
        plusButton.disabled = total >= lib.MAX_BLOOMS;
      });

      totalValue.textContent = String(total);

      if (total === 0) {
        helperText.textContent = "Pilih bunga dulu, lalu buat link untuk dibagikan.";
      } else if (total < lib.MIN_RECOMMENDED_BLOOMS) {
        helperText.textContent = `Rekomendasi: ${lib.MIN_RECOMMENDED_BLOOMS}-${lib.MAX_BLOOMS} bunga agar buket terlihat penuh.`;
      } else {
        helperText.textContent = "Bagus, komposisi buket sudah terlihat seimbang.";
      }

      renderChips();
      const currentTheme = applyTheme(themeInput.value);
      const shareUrl = makeShareUrl();
      const hasSelection = total > 0;
      updateButtons(shareUrl, hasSelection);

      document.querySelectorAll(".theme-pill").forEach((pill) => {
        pill.classList.toggle("selected", pill.dataset.themeId === currentTheme.id);
      });
    }

    const themeQuickPick = document.getElementById("themeQuickPick");
    if (themeQuickPick) {
      lib.THEMES.forEach((theme) => {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "theme-pill";
        pill.dataset.themeId = theme.id;
        pill.textContent = theme.label;
        pill.addEventListener("click", () => {
          themeInput.value = theme.id;
          render();
        });
        themeQuickPick.appendChild(pill);
      });
    }

    [nameInput, senderInput, messageInput].forEach((input) => {
      input.addEventListener("input", render);
    });

    themeInput.addEventListener("change", render);

    previewButton.addEventListener("click", () => {
      const url = makeShareUrl();
      window.open(url, "_blank", "noopener,noreferrer");
    });

    copyButton.addEventListener("click", async () => {
      const url = makeShareUrl();
      const copied = await tryCopy(url);
      const originalLabel = copyButton.textContent;
      copyButton.textContent = copied ? "Link copied" : "Copy manual";
      if (!copied) {
        window.prompt("Copy link bouquet ini:", url);
      }
      setTimeout(() => {
        copyButton.textContent = originalLabel;
      }, 1600);
    });

    render();
  }

  function initBouquet() {
    const toName = document.getElementById("toName");
    const fromName = document.getElementById("fromName");
    const messageText = document.getElementById("messageText");
    const bouquetCanvas = document.getElementById("bouquetCanvas");
    const bouquetStemCanvas = document.getElementById("bouquetStemCanvas");
    const petalRain = document.getElementById("petalRain");
    const bloomMeta = document.getElementById("bloomMeta");
    const editLink = document.getElementById("editLink");
    const copyShareButton = document.getElementById("copyShareButton");

    if (!bouquetCanvas || !bouquetStemCanvas || !petalRain) {
      return;
    }

    const query = new URLSearchParams(window.location.search);

    const name = readQueryParam(query, ["name", "to", "recipient"], "Sahabat Tersayang").trim();
    const from = readQueryParam(query, ["from", "sender"], "Seseorang yang peduli").trim();
    const message = readQueryParam(query, ["message", "msg", "card"], DEFAULT_MESSAGE).trim();

    const themeId = lib.getTheme(readQueryParam(query, ["theme", "mode"], lib.THEMES[0].id)).id;
    applyTheme(themeId);

    const decoded = lib.decodeFlowers(
      readQueryParam(query, ["flowers", "blooms", "bouquet"], "")
    );
    const counts = getTotal(decoded) > 0 ? decoded : DEFAULT_COUNTS;

    toName.textContent = name;
    fromName.textContent = from;
    messageText.textContent = message;

    const bouquetSeed = [name, from, message, themeId, lib.encodeFlowers(counts)].join("|");
    const redraw = () => renderBouquet(bouquetCanvas, bouquetStemCanvas, petalRain, counts, bouquetSeed);
    redraw();

    const summary = formatSelectionSummary(counts);
    bloomMeta.textContent = `${getTotal(counts)} blooms | ${summary}`;

    const editParams = new URLSearchParams();
    editParams.set("flowers", lib.encodeFlowers(counts));
    editParams.set("name", name);
    editParams.set("from", from);
    editParams.set("message", message);
    editParams.set("theme", themeId);

    editLink.href = buildCustomizerUrl(editParams);

    copyShareButton.addEventListener("click", async () => {
      const copied = await tryCopy(window.location.href);
      const originalLabel = copyShareButton.textContent;
      copyShareButton.textContent = copied ? "Link copied" : "Copy manual";
      if (!copied) {
        window.prompt("Copy link bouquet ini:", window.location.href);
      }
      setTimeout(() => {
        copyShareButton.textContent = originalLabel;
      }, 1600);
    });

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(redraw, 120);
    });
  }

  function renderBouquet(container, stemCanvas, rainContainer, counts, seedSource) {
    const svgNs = "http://www.w3.org/2000/svg";
    const flowerIds = lib.expandFlowers(counts);
    container.innerHTML = "";
    stemCanvas.innerHTML = "";
    renderPetalRain(rainContainer, counts, seedSource);

    const total = flowerIds.length;
    if (total === 0) {
      return;
    }

    const rng = createSeededRandom(seedSource || flowerIds.join(","));
    const orderedFlowers = flowerIds
      .map((flowerId, index) => ({ flowerId, sortKey: rng() + index * 0.0001 }))
      .sort((a, b) => a.sortKey - b.sortKey);

    const stageWidth = container.clientWidth || 900;
    const isDesktop = stageWidth >= 980;
    const widthScale = stageWidth >= 1220 ? 1.1 : stageWidth >= 980 ? 1 : stageWidth >= 760 ? 0.9 : 0.82;
    const rowCount = total >= 10 ? 4 : total >= 7 ? 3 : 2;
    const rowProfiles = [
      { y: 7.4, span: 16.2, scale: 0.86, angle: 10, gap: 6.6, edgeLift: 2.1 },
      { y: 13.2, span: 21.2, scale: 0.95, angle: 12, gap: 6.0, edgeLift: 2.8 },
      { y: 20.2, span: 26.7, scale: 1.04, angle: 14, gap: 5.6, edgeLift: 3.4 },
      { y: 28.2, span: 31.8, scale: 1.11, angle: 16, gap: 5.2, edgeLift: 3.8 },
    ].slice(0, rowCount);
    const rowWeights =
      rowCount === 2 ? [0.42, 0.58] : rowCount === 3 ? [0.24, 0.34, 0.42] : [0.16, 0.24, 0.28, 0.32];
    const rowCounts = rowWeights.map((w) => Math.floor(total * w));
    let allocated = rowCounts.reduce((sum, count) => sum + count, 0);
    while (allocated < total) {
      let pick = 0;
      let best = -Infinity;
      for (let i = 0; i < rowWeights.length; i += 1) {
        const score = total * rowWeights[i] - rowCounts[i];
        if (score > best) {
          best = score;
          pick = i;
        }
      }
      rowCounts[pick] += 1;
      allocated += 1;
    }

    for (let i = 0; i < rowCounts.length; i += 1) {
      if (rowCounts[i] === 0) {
        const donor = rowCounts.findIndex((count) => count > 1);
        if (donor >= 0) {
          rowCounts[donor] -= 1;
          rowCounts[i] = 1;
        }
      }
    }

    const placements = [];
    rowProfiles.forEach((row, rowIndex) => {
      const count = rowCounts[rowIndex];
      const span = row.span * widthScale;
      const minX = 50 - span;
      const maxX = 50 + span;
      const xs = [];

      if (count <= 1) {
        xs.push(50 + randomBetween(rng, -2.2, 2.2));
      } else {
        for (let i = 0; i < count; i += 1) {
          const t = i / (count - 1);
          const base = minX + t * (maxX - minX);
          xs.push(base + randomBetween(rng, -1.4, 1.4));
        }
        xs.sort((a, b) => a - b);
        for (let i = 1; i < xs.length; i += 1) {
          if (xs[i] - xs[i - 1] < row.gap) {
            xs[i] = xs[i - 1] + row.gap;
          }
        }
        const overflow = xs[xs.length - 1] - maxX;
        if (overflow > 0) {
          for (let i = 0; i < xs.length; i += 1) {
            xs[i] -= overflow;
          }
        }
        const underflow = minX - xs[0];
        if (underflow > 0) {
          for (let i = 0; i < xs.length; i += 1) {
            xs[i] += underflow;
          }
        }
      }

      xs.forEach((x) => {
        const centered = (x - 50) / Math.max(span, 1);
        const edge = Math.abs(centered);
        const y = row.y + edge * row.edgeLift + randomBetween(rng, -1.0, 1.1);
        placements.push({
          rowIndex,
          x: clamp(x, 24, 76),
          y: clamp(y, 7.5, 33),
          centered,
          scale: row.scale + randomBetween(rng, -0.018, 0.02),
          angle: centered * row.angle + randomBetween(rng, -3.6, 3.6),
        });
      });
    });

    placements.sort((a, b) => a.rowIndex - b.rowIndex || a.x - b.x);
    const stemColors = ["#49ad76", "#46a66f", "#59b880", "#62b58a"];
    const foliageColors = ["#8ac98f", "#6fbd88", "#7ec7a8", "#9ccf7a", "#76bca2"];
    const stemWidthRange = isDesktop ? [0.45, 0.72] : [0.66, 0.95];

    const decorativeCount = clamp(Math.round(total * 0.62), 3, 7);
    for (let i = 0; i < decorativeCount; i += 1) {
      const baseX = rng() > 0.5 ? randomBetween(rng, 7, 24) : randomBetween(rng, 76, 93);
      const endX = clamp(baseX + randomBetween(rng, -9, 9), 8, 92);
      const endY = randomBetween(rng, 54, 82);
      const controlX = (baseX + endX) / 2 + randomBetween(rng, -8, 8);
      const controlY = randomBetween(rng, 70, 92);
      const grass = document.createElementNS(svgNs, "path");
      grass.setAttribute("class", "foliage-path");
      grass.setAttribute("stroke", foliageColors[Math.floor(rng() * foliageColors.length)]);
      grass.setAttribute("stroke-width", `${randomBetween(rng, 0.45, 0.9).toFixed(2)}`);
      grass.setAttribute("d", `M ${baseX.toFixed(2)} 100 Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${endX.toFixed(2)} ${endY.toFixed(2)}`);
      stemCanvas.appendChild(grass);

      if (rng() > 0.72) {
        const tip = document.createElementNS(svgNs, "ellipse");
        tip.setAttribute("class", "foliage-tip");
        tip.setAttribute("cx", endX.toFixed(2));
        tip.setAttribute("cy", endY.toFixed(2));
        tip.setAttribute("rx", `${randomBetween(rng, 0.65, 1.4).toFixed(2)}`);
        tip.setAttribute("ry", `${randomBetween(rng, 1.35, 2.45).toFixed(2)}`);
        tip.setAttribute("fill", foliageColors[Math.floor(rng() * foliageColors.length)]);
        tip.setAttribute("transform", `rotate(${randomBetween(rng, -42, 42).toFixed(2)} ${endX.toFixed(2)} ${endY.toFixed(2)})`);
        stemCanvas.appendChild(tip);
      }
    }

    orderedFlowers.forEach(({ flowerId }, index) => {
      const placement = placements[index] || placements[placements.length - 1];
      const centered = placement.centered;
      const edge = Math.abs(centered);
      const tier = placement.rowIndex;
      const x = placement.x;
      const y = placement.y;
      const angle = placement.angle;
      const scale = placement.scale;
      const z = 220 + tier * 32 + Math.round((50 - y) * 2.2) + index;

      const stemStart = {
        x: x + randomBetween(rng, -1.2, 1.2),
        y: y + randomBetween(rng, 6.6, 8.8),
      };
      const anchorSpread = 6.4 + tier * 1.25;
      const targetStemLength =
        randomBetween(rng, 54, 84) +
        tier * randomBetween(rng, 3.1, 6.1) -
        edge * randomBetween(rng, 4.2, 7.4);
      const stemEnd = {
        x: clamp(50 + centered * anchorSpread + randomBetween(rng, -1.8, 1.8), 40, 60),
        y: clamp(stemStart.y + targetStemLength, 84.2, 99),
      };
      const stemControl = {
        x: (stemStart.x + stemEnd.x) / 2 + randomBetween(rng, -2.6, 2.6),
        y: clamp((stemStart.y + stemEnd.y) / 2 + randomBetween(rng, 7, 18), 46, 78),
      };

      const stemGroup = document.createElementNS(svgNs, "g");
      stemGroup.setAttribute("class", "stem-group");
      stemGroup.style.setProperty("--stem-delay", `${index * 0.1}s`);

      const stemPath = document.createElementNS(svgNs, "path");
      stemPath.setAttribute(
        "d",
        `M ${stemStart.x} ${stemStart.y} Q ${stemControl.x} ${stemControl.y} ${stemEnd.x} ${stemEnd.y}`
      );
      stemPath.setAttribute("class", "stem-path");
      stemPath.setAttribute("stroke", stemColors[Math.floor(rng() * stemColors.length)]);
      stemPath.setAttribute(
        "stroke-width",
        `${randomBetween(rng, stemWidthRange[0], stemWidthRange[1]).toFixed(2)}`
      );
      stemGroup.appendChild(stemPath);

      const leafCount = 1 + Math.floor(rng() * 2);
      const leafSlots =
        leafCount === 1
          ? [randomBetween(rng, 0.47, 0.64)]
          : [randomBetween(rng, 0.34, 0.45), randomBetween(rng, 0.58, 0.72)];

      leafSlots.forEach((leafT, leafIndex) => {
        const point = pointOnQuadratic(stemStart, stemControl, stemEnd, leafT);
        const tangent = tangentOnQuadratic(stemStart, stemControl, stemEnd, leafT);
        const baseAngle = angleFromVector(tangent);
        const length = Math.hypot(tangent.x, tangent.y) || 1;
        const normal = {
          x: -tangent.y / length,
          y: tangent.x / length,
        };
        const leafOffset = randomBetween(rng, 0.7, 1.25);
        const leaf = document.createElementNS(svgNs, "ellipse");
        const outward = centered >= 0 ? 1 : -1;
        const direction = leafIndex % 2 === 0 ? outward : -outward;
        leaf.setAttribute("class", "stem-leaf");
        leaf.setAttribute("cx", (point.x + normal.x * direction * leafOffset).toFixed(2));
        leaf.setAttribute("cy", (point.y + normal.y * direction * leafOffset - 0.55).toFixed(2));
        leaf.setAttribute("rx", randomBetween(rng, 0.72, 1.26).toFixed(2));
        leaf.setAttribute("ry", randomBetween(rng, 1.25, 2.2).toFixed(2));
        leaf.setAttribute("fill", foliageColors[Math.floor(rng() * foliageColors.length)]);
        leaf.setAttribute(
          "transform",
          `rotate(${(baseAngle + direction * randomBetween(rng, 54, 96)).toFixed(2)} ${(point.x +
            normal.x * direction * leafOffset).toFixed(2)} ${(point.y +
            normal.y * direction * leafOffset -
            0.55).toFixed(2)})`
        );
        stemGroup.appendChild(leaf);
      });

      stemCanvas.appendChild(stemGroup);

      const bloom = document.createElement("div");
      bloom.className = "bloom-item";
      bloom.style.left = `${x}%`;
      bloom.style.top = `${y}%`;
      bloom.style.zIndex = String(z);
      bloom.style.setProperty("--bloom-angle", `${angle}deg`);
      bloom.style.setProperty("--bloom-scale", String(scale));
      bloom.style.setProperty("--bloom-delay", `${index * 0.12}s`);
      bloom.style.setProperty("--wind-amp", `${randomBetween(rng, 1.2, 3.5).toFixed(2)}deg`);
      bloom.style.setProperty("--wind-duration", `${randomBetween(rng, 3.9, 6.7).toFixed(2)}s`);
      bloom.style.setProperty("--wind-delay", `${(index * 0.2 + randomBetween(rng, 0, 1.2)).toFixed(2)}s`);

      const size = tier === 0 ? "sm" : tier === 1 ? "md" : "lg";
      const flower = lib.createFlowerNode(flowerId, {
        size,
        withStem: false,
        title: lib.getFlower(flowerId).name,
      });

      const sway = document.createElement("div");
      sway.className = "bloom-sway";
      sway.appendChild(flower);
      bloom.appendChild(sway);
      container.appendChild(bloom);
    });
  }

  const pageType = document.body.dataset.page;
  if (pageType === "customizer") {
    initCustomizer();
  }

  if (pageType === "bouquet") {
    initBouquet();
  }
})();
