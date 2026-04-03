// game-ui-2.js
// 倉庫タブ（手持ち / 倉庫）表示と出し入れボタン ＋ 料理クラフトUI ＋ 戦闘スキル＋ショップ

// 既存の inventory-core.js / craft-data.js / cook-data.js 前提
// - carryPotions, carryFoods, carryDrinks, carryWeapons, carryArmors, carryTools
// - potionCounts, weaponCounts, armorCounts, cookedFoods, cookedDrinks
// - potions, weapons, armors, COOKING_RECIPES
// - movePotionToCarry / movePotionToWarehouse
// - moveFoodToCarry / moveFoodToWarehouse
// - moveDrinkToCarry / moveDrinkToWarehouse
// - moveWeaponToCarry / moveWeaponToWarehouse
// - moveArmorToCarry / moveArmorToWarehouse
// - moveToolToCarry / moveToolToWarehouse（未実装ログのみ）
// - refreshCarryPotionSelects, refreshCarryFoodDrinkSelects

function refreshWarehouseUI() {
  // =======================
  // ヘルパ（1行描画）
  // =======================
  function createRow(name, count, moveBtnConfigs) {
    // moveBtnConfigs: [{ label: "↑手持ちへ", onClick: () => {...} }, ...]
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.gap = "4px";

    const span = document.createElement("span");
    span.textContent = `${name} x${count}`;
    div.appendChild(span);

    moveBtnConfigs.forEach(cfg => {
      const btn = document.createElement("button");
      btn.textContent = cfg.label;
      btn.style.fontSize = "10px";
      btn.addEventListener("click", cfg.onClick);
      div.appendChild(btn);
    });

    return div;
  }

  // 名前解決ヘルパ
  function getPotionName(id) {
    if (!Array.isArray(potions)) return id;
    const p = potions.find(x => x.id === id);
    return p ? p.name : id;
  }
  function getWeaponName(id) {
    if (!Array.isArray(weapons)) return id;
    const w = weapons.find(x => x.id === id);
    return w ? w.name : id;
  }
  function getArmorName(id) {
    if (!Array.isArray(armors)) return id;
    const a = armors.find(x => x.id === id);
    return a ? a.name : id;
  }
  function getFoodName(id) {
    if (typeof COOKING_RECIPES === "undefined") return id;
    const r = COOKING_RECIPES.food.find(x => x.id === id);
    return r ? r.name : id;
  }
  function getDrinkName(id) {
    if (typeof COOKING_RECIPES === "undefined") return id;
    const r = COOKING_RECIPES.drink.find(x => x.id === id);
    return r ? r.name : id;
  }

  // =======================
  // 手持ち側の描画
  // =======================

  const carryPotionsBox = document.getElementById("carryPotionsList");
  const carryFoodsBox   = document.getElementById("carryFoodsList");
  const carryDrinksBox  = document.getElementById("carryDrinksList");
  const carryWeaponsBox = document.getElementById("carryWeaponsList");
  const carryArmorsBox  = document.getElementById("carryArmorsList");
  const carryToolsBox   = document.getElementById("carryToolsList");

  if (carryPotionsBox) {
    carryPotionsBox.innerHTML = "";
    Object.keys(carryPotions).forEach(id => {
      const cnt = carryPotions[id] || 0;
      if (cnt <= 0) return;
      const name = getPotionName(id);
      const row = createRow(name, cnt, [
        {
          label: "↓倉庫へ",
          onClick: () => {
            if (movePotionToWarehouse(id, 1)) {
              if (typeof refreshCarryPotionSelects === "function") {
                refreshCarryPotionSelects();
              }
              refreshWarehouseUI();
            }
          }
        }
      ]);
      carryPotionsBox.appendChild(row);
    });
  }

  if (carryFoodsBox) {
    carryFoodsBox.innerHTML = "";
    Object.keys(carryFoods).forEach(id => {
      const cnt = carryFoods[id] || 0;
      if (cnt <= 0) return;
      const name = getFoodName(id);
      const row = createRow(name, cnt, [
        {
          label: "↓倉庫へ",
          onClick: () => {
            if (moveFoodToWarehouse(id, 1)) {
              if (typeof refreshCarryFoodDrinkSelects === "function") {
                refreshCarryFoodDrinkSelects();
              }
              refreshWarehouseUI();
            }
          }
        }
      ]);
      carryFoodsBox.appendChild(row);
    });
  }

  if (carryDrinksBox) {
    carryDrinksBox.innerHTML = "";
    Object.keys(carryDrinks).forEach(id => {
      const cnt = carryDrinks[id] || 0;
      if (cnt <= 0) return;
      const name = getDrinkName(id);
      const row = createRow(name, cnt, [
        {
          label: "↓倉庫へ",
          onClick: () => {
            if (moveDrinkToWarehouse(id, 1)) {
              if (typeof refreshCarryFoodDrinkSelects === "function") {
                refreshCarryFoodDrinkSelects();
              }
              refreshWarehouseUI();
            }
          }
        }
      ]);
      carryDrinksBox.appendChild(row);
    });
  }

  if (carryWeaponsBox) {
    carryWeaponsBox.innerHTML = "";
    Object.keys(carryWeapons).forEach(id => {
      const cnt = carryWeapons[id] || 0;
      if (cnt <= 0) return;
      const name = getWeaponName(id);
      const row = createRow(name, cnt, [
        {
          label: "↓倉庫へ",
          onClick: () => {
            if (moveWeaponToWarehouse(id, 1)) {
              refreshWarehouseUI();
            }
          }
        }
      ]);
      carryWeaponsBox.appendChild(row);
    });
  }

  if (carryArmorsBox) {
    carryArmorsBox.innerHTML = "";
    Object.keys(carryArmors).forEach(id => {
      const cnt = carryArmors[id] || 0;
      if (cnt <= 0) return;
      const name = getArmorName(id);
      const row = createRow(name, cnt, [
        {
          label: "↓倉庫へ",
          onClick: () => {
            if (moveArmorToWarehouse(id, 1)) {
              refreshWarehouseUI();
            }
          }
        }
      ]);
      carryArmorsBox.appendChild(row);
    });
  }

  if (carryToolsBox) {
    carryToolsBox.innerHTML = "";
    Object.keys(carryTools).forEach(id => {
      const cnt = carryTools[id] || 0;
      if (cnt <= 0) return;
      const name = id;
      const row = createRow(name, cnt, [
        {
          label: "↓倉庫へ",
          onClick: () => {
            // 現状はログだけ
            moveToolToWarehouse(id, 1);
            refreshWarehouseUI();
          }
        }
      ]);
      carryToolsBox.appendChild(row);
    });
  }

  // =======================
  // 倉庫側の描画
  // =======================

  const whPotionsBox  = document.getElementById("warehousePotionsList");
  const whFoodsBox    = document.getElementById("warehouseFoodsList");
  const whDrinksBox   = document.getElementById("warehouseDrinksList");
  const whWeaponsBox  = document.getElementById("warehouseWeaponsList");
  const whArmorsBox   = document.getElementById("warehouseArmorsList");
  const whToolsBox    = document.getElementById("warehouseToolsList");

  if (whPotionsBox) {
    whPotionsBox.innerHTML = "";
    Object.keys(potionCounts).forEach(id => {
      const cnt = potionCounts[id] || 0;
      if (cnt <= 0) return;
      const name = getPotionName(id);
      const row = createRow(name, cnt, [
        {
          label: "↑手持ちへ",
          onClick: () => {
            if (movePotionToCarry(id, 1)) {
              if (typeof refreshCarryPotionSelects === "function") {
                refreshCarryPotionSelects();
              }
              refreshWarehouseUI();
            }
          }
        }
      ]);
      whPotionsBox.appendChild(row);
    });
  }

  if (whFoodsBox) {
    whFoodsBox.innerHTML = "";
    Object.keys(cookedFoods).forEach(id => {
      const cnt = cookedFoods[id] || 0;
      if (cnt <= 0) return;
      const name = getFoodName(id);
      const row = createRow(name, cnt, [
        {
          label: "↑手持ちへ",
          onClick: () => {
            if (moveFoodToCarry(id, 1)) {
              if (typeof refreshCarryFoodDrinkSelects === "function") {
                refreshCarryFoodDrinkSelects();
              }
              refreshWarehouseUI();
            }
          }
        }
      ]);
      whFoodsBox.appendChild(row);
    });
  }

  if (whDrinksBox) {
    whDrinksBox.innerHTML = "";
    Object.keys(cookedDrinks).forEach(id => {
      const cnt = cookedDrinks[id] || 0;
      if (cnt <= 0) return;
      const name = getDrinkName(id);
      const row = createRow(name, cnt, [
        {
          label: "↑手持ちへ",
          onClick: () => {
            if (moveDrinkToCarry(id, 1)) {
              if (typeof refreshCarryFoodDrinkSelects === "function") {
                refreshCarryFoodDrinkSelects();
              }
              refreshWarehouseUI();
            }
          }
        }
      ]);
      whDrinksBox.appendChild(row);
    });
  }

  if (whWeaponsBox) {
    whWeaponsBox.innerHTML = "";
    Object.keys(weaponCounts).forEach(id => {
      const cnt = weaponCounts[id] || 0;
      if (cnt <= 0) return;
      const name = getWeaponName(id);
      const row = createRow(name, cnt, [
        {
          label: "↑手持ちへ",
          onClick: () => {
            if (moveWeaponToCarry(id, 1)) {
              refreshWarehouseUI();
            }
          }
        }
      ]);
      whWeaponsBox.appendChild(row);
    });
  }

  if (whArmorsBox) {
    whArmorsBox.innerHTML = "";
    Object.keys(armorCounts).forEach(id => {
      const cnt = armorCounts[id] || 0;
      if (cnt <= 0) return;
      const name = getArmorName(id);
      const row = createRow(name, cnt, [
        {
          label: "↑手持ちへ",
          onClick: () => {
            if (moveArmorToCarry(id, 1)) {
              refreshWarehouseUI();
            }
          }
        }
      ]);
      whArmorsBox.appendChild(row);
    });
  }

  if (whToolsBox) {
    whToolsBox.innerHTML = "";
    // 道具は「存在する＝倉庫」扱い、今は個別counts未実装なので空のまま維持
    // 将来、toolCounts 等を作ったらここで描画する
  }

  // =======================
  // 素材タブ用の一覧描画
  // =======================

  // 採取素材テーブル（wood/ore/herb/cloth/leather/water × T1〜T3）
  const gatherMatListBox = document.getElementById("gatherMaterialsList");
  if (gatherMatListBox && typeof window.materials !== "undefined") {
    gatherMatListBox.innerHTML = "";

    const names = {
      wood:   "木",
      ore:    "鉱石",
      herb:   "草",
      cloth:  "布",
      leather:"皮",
      water:  "水"
    };
    const keys = ["wood","ore","herb","cloth","leather","water"];

    const table = document.createElement("table");
    table.className = "mat-table";

    // ヘッダー行: 空セル + 各素材名
    const thead = document.createElement("thead");
    const headTr = document.createElement("tr");

    const emptyTh = document.createElement("th");
    emptyTh.textContent = "";
    headTr.appendChild(emptyTh);

    keys.forEach(key => {
      const th = document.createElement("th");
      th.textContent = names[key];
      headTr.appendChild(th);
    });
    thead.appendChild(headTr);
    table.appendChild(thead);

    // 本体: T1/T2/T3 行
    const tbody = document.createElement("tbody");
    ["t1", "t2", "t3"].forEach((tierKey, idx) => {
      const tr = document.createElement("tr");
      const tierTh = document.createElement("th");
      tierTh.textContent = `T${idx + 1}`;
      tr.appendChild(tierTh);

      keys.forEach(key => {
        const mat = window.materials[key] || {};
        const td = document.createElement("td");
        const val = mat[tierKey] || 0;
        td.textContent = val;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    gatherMatListBox.appendChild(table);
  }

  // 中間素材テーブル（baseName × T1〜T3）
  const intermListBox = document.getElementById("intermediateMaterialsList");
  if (intermListBox && Array.isArray(window.INTERMEDIATE_MATERIALS || INTERMEDIATE_MATERIALS)) {
    const src  = window.INTERMEDIATE_MATERIALS || INTERMEDIATE_MATERIALS;
    const mats = window.intermediateMats || {};
    intermListBox.innerHTML = "";

    // 例: name が「T1板材 / T2板材 / T3板材」の想定
    const groups = {}; // baseName -> { name, t1, t2, t3 }

    src.forEach(m => {
      let tier = "t1";
      let baseName = m.name;

      if (m.name.startsWith("T1")) {
        tier = "t1";
        baseName = m.name.replace(/^T1/, "").trim();
      } else if (m.name.startsWith("T2")) {
        tier = "t2";
        baseName = m.name.replace(/^T2/, "").trim();
      } else if (m.name.startsWith("T3")) {
        tier = "t3";
        baseName = m.name.replace(/^T3/, "").trim();
      }

      const baseId = baseName;

      if (!groups[baseId]) {
        groups[baseId] = {
          name: baseName,
          t1: 0,
          t2: 0,
          t3: 0
        };
      }

      const cnt = mats[m.id] || 0;
      groups[baseId][tier] = cnt;
    });

    const table = document.createElement("table");
    table.className = "mat-table";

    const thead = document.createElement("thead");
    const htr = document.createElement("tr");
    const thName = document.createElement("th");
    thName.textContent = "素材";
    const thT1 = document.createElement("th");
    thT1.textContent = "T1";
    const thT2 = document.createElement("th");
    thT2.textContent = "T2";
    const thT3 = document.createElement("th");
    thT3.textContent = "T3";
    htr.appendChild(thName);
    htr.appendChild(thT1);
    htr.appendChild(thT2);
    htr.appendChild(thT3);
    thead.appendChild(htr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    Object.values(groups).forEach(g => {
      const tr = document.createElement("tr");
      const tdName = document.createElement("td");
      const tdT1   = document.createElement("td");
      const tdT2   = document.createElement("td");
      const tdT3   = document.createElement("td");
      tdName.textContent = g.name;
      tdT1.textContent   = g.t1 || 0;
      tdT2.textContent   = g.t2 || 0;
      tdT3.textContent   = g.t3 || 0;
      tr.appendChild(tdName);
      tr.appendChild(tdT1);
      tr.appendChild(tdT2);
      tr.appendChild(tdT3);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    intermListBox.appendChild(table);
  }

  // 料理素材テーブル（素材名 × 個数）
  const cookingMatListBox = document.getElementById("cookingMaterialsList");
  if (cookingMatListBox) {
    cookingMatListBox.innerHTML = "";

    if (typeof COOKING_MAT_NAMES !== "undefined") {
      const mats = window.cookingMats || {};

      const table = document.createElement("table");
      table.className = "mat-table";

      const thead = document.createElement("thead");
      const htr = document.createElement("tr");
      const thName = document.createElement("th");
      thName.textContent = "素材";
      const thCount = document.createElement("th");
      thCount.textContent = "個数";
      htr.appendChild(thName);
      htr.appendChild(thCount);
      thead.appendChild(htr);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      Object.keys(COOKING_MAT_NAMES).forEach(id => {
        const tr = document.createElement("tr");
        const tdName = document.createElement("td");
        const tdCount = document.createElement("td");
        tdName.textContent = COOKING_MAT_NAMES[id];
        tdCount.textContent = mats[id] || 0;
        tr.appendChild(tdName);
        tr.appendChild(tdCount);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      cookingMatListBox.appendChild(table);
    }
  }

  // =======================
  // 採取拠点UI（魔巧区サブページ内: #gatherBaseStatus）
  // =======================

  if (typeof getGatherBaseLevel === "function" &&
      typeof tryUpgradeGatherBase === "function") {
    const container = document.getElementById("gatherBaseStatus");
    if (container) {
      container.innerHTML = "";

      const materialDefs = [
        { key: "wood",    label: "木拠点" },
        { key: "ore",     label: "鉱石拠点" },
        { key: "herb",    label: "草拠点" },
        { key: "cloth",   label: "布拠点" },
        { key: "leather", label: "皮拠点" },
        { key: "water",   label: "水拠点" }
      ];

      materialDefs.forEach(def => {
        const level = getGatherBaseLevel(def.key);

        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "4px";

        const labelSpan = document.createElement("span");
        labelSpan.textContent = `${def.label} Lv${level}`;
        row.appendChild(labelSpan);

        // Lv+1 ボタン → コスト/条件チェック込みの tryUpgradeGatherBase を呼ぶ
        const upBtn = document.createElement("button");
        upBtn.textContent = "Lv+1";
        upBtn.style.fontSize = "10px";
        upBtn.addEventListener("click", () => {
          tryUpgradeGatherBase(def.key);
          refreshWarehouseUI();
        });
        row.appendChild(upBtn);

        container.appendChild(row);
      });

      // 自動採取ストックの簡易表示（存在する場合のみ）
      if (typeof window.gatherBaseStockTicks !== "undefined") {
        const stockInfo = document.createElement("div");
        stockInfo.style.marginTop = "4px";
        stockInfo.textContent = `自動採取ストック: ${window.gatherBaseStockTicks} tick`;
        container.appendChild(stockInfo);
      }
    }
  }
}

// =======================
// 料理クラフト UI 関連
// =======================

function populateCookingSelects() {
  if (typeof COOKING_RECIPES === "undefined") return;

  const foodSelect  = document.getElementById("foodSelect");
  const drinkSelect = document.getElementById("drinkSelect");
  const tierFilter  = document.getElementById("craftTierSelect");
  const tier = tierFilter ? tierFilter.value : "all";

  const prevFoodId  = foodSelect  ? foodSelect.value  : null;
  const prevDrinkId = drinkSelect ? drinkSelect.value : null;

  if (foodSelect) {
    foodSelect.innerHTML = "";
    COOKING_RECIPES.food.forEach(r => {
      if (tier !== "all" && r.tier !== tier) return;
      const opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = `[${r.tier}] ${r.name}`;
      foodSelect.appendChild(opt);
    });
    if (prevFoodId &&
        Array.from(foodSelect.options).some(o => o.value === prevFoodId)) {
      foodSelect.value = prevFoodId;
    }
  }

  if (drinkSelect) {
    drinkSelect.innerHTML = "";
    COOKING_RECIPES.drink.forEach(r => {
      if (tier !== "all" && r.tier !== tier) return;
      const opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = `[${r.tier}] ${r.name}`;
      drinkSelect.appendChild(opt);
    });
    if (prevDrinkId &&
        Array.from(drinkSelect.options).some(o => o.value === prevDrinkId)) {
      drinkSelect.value = prevDrinkId;
    }
  }

  const initId = foodSelect?.value || drinkSelect?.value || null;
  const initRecipe =
    COOKING_RECIPES.food.find(r => r.id === initId) ||
    COOKING_RECIPES.drink.find(r => r.id === initId) ||
    null;
  updateCookingCostInfo(initRecipe);
}

function updateCookingCostInfo(recipe) {
  const costInfo = document.getElementById("craftCostInfo");
  if (!costInfo) return;

  if (!recipe) {
    costInfo.textContent = "必要素材：-";
    return;
  }

  const parts = recipe.requires.map(req => {
    const id   = req.id;
    const need = req.amount;
    const have = (window.cookingMats && window.cookingMats[id]) || 0;
    const name = COOKING_MAT_NAMES[id] || id;
    return `${name} ${have}/${need}`;
  });

  costInfo.textContent = "必要素材：" + parts.join(" / ");
}

function getCookingMaterialAmount(id) {
  if (!window.cookingMats) return 0;
  return window.cookingMats[id] || 0;
}

function consumeCookingMaterial(id, amount) {
  if (!window.cookingMats) return;
  window.cookingMats[id] = Math.max(0, (window.cookingMats[id] || 0) - amount);
}

function addCookingItemToInventory(itemId, amount) {
  if (typeof addItemToInventory === "function") {
    addItemToInventory(itemId, amount);
  }

  if (typeof COOKING_RECIPES !== "undefined") {
    window.cookedFoods  = window.cookedFoods  || {};
    window.cookedDrinks = window.cookedDrinks || {};

    const foodRecipe  = COOKING_RECIPES.food.find(r => r.id === itemId);
    const drinkRecipe = COOKING_RECIPES.drink.find(r => r.id === itemId);

    if (foodRecipe) {
      window.cookedFoods[itemId] = (window.cookedFoods[itemId] || 0) + (amount || 0);
    } else if (drinkRecipe) {
      window.cookedDrinks[itemId] = (window.cookedDrinks[itemId] || 0) + (amount || 0);
    }
  }
}

function canCraftCooking(recipe) {
  if (!recipe || !recipe.requires) return false;
  return recipe.requires.every(req => {
    const have = getCookingMaterialAmount(req.id);
    return have >= req.amount;
  });
}

function doCraftCooking(recipe) {
  if (!recipe) return;

  if (window.isExploring || window.currentEnemy) {
    if (typeof appendLog === "function") {
      appendLog("探索中はクラフトできない！");
    }
    return;
  }

  if (!canCraftCooking(recipe)) {
    if (typeof appendLog === "function") {
      appendLog("素材が足りません。");
    }
    return;
  }

  const foodSelect   = document.getElementById("foodSelect");
  const drinkSelect  = document.getElementById("drinkSelect");
  const prevFoodId   = foodSelect  ? foodSelect.value  : null;
  const prevDrinkId  = drinkSelect ? drinkSelect.value : null;

  recipe.requires.forEach(req => {
    consumeCookingMaterial(req.id, req.amount);
  });

  addCookingItemToInventory(recipe.id, 1);

  if (typeof refreshWarehouseUI === "function") {
    refreshWarehouseUI();
  }

  if (typeof appendLog === "function") {
    appendLog(`${recipe.name} を作成した！`);
  }

  if (foodSelect && prevFoodId &&
      Array.from(foodSelect.options).some(o => o.value === prevFoodId)) {
    foodSelect.value = prevFoodId;
  }
  if (drinkSelect && prevDrinkId &&
      Array.from(drinkSelect.options).some(o => o.value === prevDrinkId)) {
    drinkSelect.value = prevDrinkId;
  }

  const idFood  = foodSelect  ? foodSelect.value  : null;
  const idDrink = drinkSelect ? drinkSelect.value : null;
  const nextRecipe =
    (idFood  && COOKING_RECIPES.food.find(r => r.id === idFood)) ||
    (idDrink && COOKING_RECIPES.drink.find(r => r.id === idDrink)) ||
    null;
  updateCookingCostInfo(nextRecipe);

  if (typeof updateGatherMatDetailText === "function") {
    updateGatherMatDetailText();
  }
  if (typeof updateCraftMatDetailText === "function") {
    updateCraftMatDetailText();
  }
}

function initCookingCraftUI() {
  if (typeof COOKING_RECIPES === "undefined") return;

  const foodSelect   = document.getElementById("foodSelect");
  const drinkSelect  = document.getElementById("drinkSelect");
  const foodBtn      = document.getElementById("craftFoodBtn");
  const drinkBtn     = document.getElementById("craftDrinkBtn");
  const tierFilter   = document.getElementById("craftTierSelect");

  populateCookingSelects();

  if (tierFilter) {
    tierFilter.addEventListener("change", () => {
      populateCookingSelects();

      const idFood  = foodSelect?.value;
      const idDrink = drinkSelect?.value;
      const recipe =
        COOKING_RECIPES.food.find(r => r.id === idFood) ||
        COOKING_RECIPES.drink.find(r => r.id === idDrink) ||
        null;
      updateCookingCostInfo(recipe);
    });
  }

  if (foodSelect) {
    foodSelect.addEventListener("change", e => {
      const id = e.target.value;
      const recipe = COOKING_RECIPES.food.find(r => r.id === id) || null;
      updateCookingCostInfo(recipe);
    });
  }

  if (drinkSelect) {
    drinkSelect.addEventListener("change", e => {
      const id = e.target.value;
      const recipe = COOKING_RECIPES.drink.find(r => r.id === id) || null;
      updateCookingCostInfo(recipe);
    });
  }

  if (foodBtn) {
    foodBtn.addEventListener("click", () => {
      const id = foodSelect?.value;
      const recipe = COOKING_RECIPES.food.find(r => r.id === id) || null;
      doCraftCooking(recipe);
    });
  }

  if (drinkBtn) {
    drinkBtn.addEventListener("click", () => {
      const id = drinkSelect?.value;
      const recipe = COOKING_RECIPES.drink.find(r => r.id === id) || null;
      doCraftCooking(recipe);
    });
  }

  const initId = foodSelect?.value || drinkSelect?.value;
  const initRecipe =
    COOKING_RECIPES.food.find(r => r.id === initId) ||
    COOKING_RECIPES.drink.find(r => r.id === initId) ||
    null;
  updateCookingCostInfo(initRecipe);
}

// =======================
// 戦闘スキルボタンのバインド＋ショップ
// =======================

window.addEventListener("DOMContentLoaded", () => {
  // 料理クラフトUI初期化
  initCookingCraftUI();

  // 戦闘スキル
  const castMagicBtn = document.getElementById("castMagicBtn");
  if (castMagicBtn && typeof castSelectedMagic === "function") {
    castMagicBtn.addEventListener("click", () => {
      castSelectedMagic();
    });
  }

  const useSkillBtn = document.getElementById("useSkillBtn");
  if (useSkillBtn && typeof useSelectedSkill === "function") {
    useSkillBtn.addEventListener("click", () => {
      useSelectedSkill();
    });
  }

  // ショップ（魔巧区サブページ内）
  if (typeof initShop === "function") {
    initShop();
  }

  document.getElementById("shopBuyPotion")  ?.addEventListener("click", () => buyPotionInShop("potion", 60));
  document.getElementById("shopBuyHiPotion")?.addEventListener("click", () => buyPotionInShop("hiPotion", 100));
  document.getElementById("shopBuyMana")    ?.addEventListener("click", () => buyPotionInShop("manaPotion", 80));
  document.getElementById("shopBuyHiMana")  ?.addEventListener("click", () => buyPotionInShop("hiManaPotion", 120));
  document.getElementById("shopBuyBomb")    ?.addEventListener("click", () => buyPotionInShop("bomb", 100));

  const shopHealHP = document.getElementById("shopHealHP");
  if (shopHealHP) {
    shopHealHP.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は宿屋を利用できない！");
        return;
      }
      const price = 80;
      if (money < price) {
        setLog("お金が足りない（宿屋 80G）");
        return;
      }
      money -= price;
      hp = hpMax;
      setLog("宿屋で休んだ。HPが全回復した。");
      if (typeof updateDisplay === "function") updateDisplay();
    });
  }
});

// =======================
// 倉庫サブタブ切り替え
// =======================

(function () {
  const tabItems      = document.getElementById("warehouseTabItems");
  const tabMaterials  = document.getElementById("warehouseTabMaterials");
  const pageItems     = document.getElementById("warehousePageItems");
  const pageMaterials = document.getElementById("warehousePageMaterials");

  if (!tabItems || !tabMaterials || !pageItems || !pageMaterials) {
    return;
  }

  function setWarehouseSubPage(key) {
    if (key === "items") {
      pageItems.style.display     = "";
      pageMaterials.style.display = "none";
      tabItems.classList.add("active");
      tabMaterials.classList.remove("active");
    } else {
      pageItems.style.display     = "none";
      pageMaterials.style.display = "";
      tabItems.classList.remove("active");
      tabMaterials.classList.add("active");
    }
  }

  tabItems.addEventListener("click", () => setWarehouseSubPage("items"));
  tabMaterials.addEventListener("click", () => setWarehouseSubPage("materials"));

  // 初期は装備・アイテム側
  setWarehouseSubPage("items");
})();