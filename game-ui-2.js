// game-ui-2.js
// 倉庫タブ（手持ち / 倉庫）表示と出し入れボタン ＋ 料理クラフトUI ＋ 戦闘スキル＋ショップ

// 既存の inventory-core.js / craft-data.js / cook-data.js 前提
// - carryPotions, carryFoods, carryDrinks, carryWeapons, carryArmors, carryTools
// - potionCounts, weaponCounts, armorCounts, cookedFoods, cookedDrinks, toolCounts
// - potions, weapons, armors, COOKING_RECIPES
// - movePotionToCarry / movePotionToWarehouse
// - moveFoodToCarry / moveFoodToWarehouse
// - moveDrinkToCarry / moveDrinkToWarehouse
// - moveWeaponToCarry / moveWeaponToWarehouse
// - moveArmorToCarry / moveArmorToWarehouse
// - moveToolToCarry / moveToolToWarehouse
// - refreshCarryPotionSelects, refreshCarryFoodDrinkSelects

// ★追加：直近に表示した料理レシピを保存するグローバル
window.lastCookingKind = window.lastCookingKind || null; // "food" | "drink"
window.lastCookingId   = window.lastCookingId   || null;

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
  function getWeaponMaster(id) {
    if (!Array.isArray(weapons)) return null;
    return weapons.find(x => x.id === id) || null;
  }
  function getWeaponName(id) {
    const w = getWeaponMaster(id);
    return w ? w.name : id;
  }
  function getArmorMaster(id) {
    if (!Array.isArray(armors)) return null;
    return armors.find(x => x.id === id) || null;
  }
  function getArmorName(id) {
    const a = getArmorMaster(id);
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
  function getToolName(id) {
    // とりあえずIDベース＋爆弾だけラベル補正
    if (id === "bomb") return "爆弾";
    if (id === "bomb_T1") return "爆弾T1";
    if (id === "bomb_T2") return "爆弾T2";
    if (id === "bomb_T3") return "爆弾T3";
    return id;
  }

  // インスタンス一覧から「そのIDの代表ラベル」を作る（品質/強化/耐久を反映）
  function getWeaponInstanceLabel(id) {
    if (!Array.isArray(window.weaponInstances)) {
      return getWeaponName(id);
    }
    const base = getWeaponMaster(id);
    const name = base ? base.name : id;

    const insts = window.weaponInstances.filter(w => w.id === id);
    if (!insts.length) return name;

    // 今は代表として「最も良い1本」（quality→enhance→durability降順）を表示ラベルに使う
    insts.sort((a, b) => {
      const qa = a.quality || 0;
      const qb = b.quality || 0;
      if (qa !== qb) return qb - qa;
      const ea = a.enhance || 0;
      const eb = b.enhance || 0;
      if (ea !== eb) return eb - ea;
      const da = a.durability ?? MAX_DURABILITY;
      const db = b.durability ?? MAX_DURABILITY;
      return db - da;
    });
    const best = insts[0];

    let qLabel = "";
    if (best.quality === 2) qLabel = "【傑作】";
    else if (best.quality === 1) qLabel = "【良品】";

    const enh = best.enhance || 0;
    const enhLabel = enh > 0 ? `+${enh}` : "";

    const dur = best.durability ?? MAX_DURABILITY;
    const durLabel = `耐久${dur}`;

    return `${qLabel}${name}${enhLabel ? " " + enhLabel : ""} ${durLabel}`;
  }

  function getArmorInstanceLabel(id) {
    if (!Array.isArray(window.armorInstances)) {
      return getArmorName(id);
    }
    const base = getArmorMaster(id);
    const name = base ? base.name : id;

    const insts = window.armorInstances.filter(a => a.id === id);
    if (!insts.length) return name;

    insts.sort((a, b) => {
      const qa = a.quality || 0;
      const qb = b.quality || 0;
      if (qa !== qb) return qb - qa;
      const ea = a.enhance || 0;
      const eb = b.enhance || 0;
      if (ea !== eb) return eb - ea;
      const da = a.durability ?? MAX_DURABILITY;
      const db = b.durability ?? MAX_DURABILITY;
      return db - da;
    });
    const best = insts[0];

    let qLabel = "";
    if (best.quality === 2) qLabel = "【傑作】";
    else if (best.quality === 1) qLabel = "【良品】";

    const enh = best.enhance || 0;
    const enhLabel = enh > 0 ? `+${enh}` : "";

    const dur = best.durability ?? MAX_DURABILITY;
    const durLabel = `耐久${dur}`;

    return `${qLabel}${name}${enhLabel ? " " + enhLabel : ""} ${durLabel}`;
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

      const label = getWeaponInstanceLabel(id);
      const row = createRow(label, cnt, [
        {
          label: "装備",
          onClick: () => {
            // ★インスタンス方式での装備
            if (Array.isArray(window.weaponInstances)) {
              // そのIDの中でとりあえず最初の1本を装備（UIから個別選択するのは別実装）
              const idx = window.weaponInstances.findIndex(w => w.id === id);
              if (idx >= 0) {
                window.equippedWeaponIndex = idx;
                window.equippedWeaponId    = id;
                appendLog("武器を装備した");
                if (typeof recalcStats === "function") {
                  recalcStats();
                } else if (typeof updateDisplay === "function") {
                  updateDisplay();
                }
              }
            } else if (typeof equipWeapon === "function") {
              // 旧仕様フォールバック
              equippedWeaponId = id;
              appendLog("武器を装備した");
              if (typeof updateDisplay === "function") updateDisplay();
            }
          }
        },
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

      const label = getArmorInstanceLabel(id);
      const row = createRow(label, cnt, [
        {
          label: "装備",
          onClick: () => {
            if (Array.isArray(window.armorInstances)) {
              const idx = window.armorInstances.findIndex(a => a.id === id);
              if (idx >= 0) {
                window.equippedArmorIndex = idx;
                window.equippedArmorId    = id;
                appendLog("防具を装備した");
                if (typeof recalcStats === "function") {
                  recalcStats();
                } else if (typeof updateDisplay === "function") {
                  updateDisplay();
                }
              }
            } else if (typeof equipArmor === "function") {
              // 旧仕様フォールバック
              equippedArmorId = id;
              appendLog("防具を装備した");
              if (typeof updateDisplay === "function") updateDisplay();
            }
          }
        },
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
      const name = getToolName(id);
      const row = createRow(name, cnt, [
        {
          label: "↓倉庫へ",
          onClick: () => {
            if (moveToolToWarehouse(id, 1)) {
              refreshWarehouseUI();
            }
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
          label: "食べる",
          onClick: () => {
            if (typeof consumeFoodFromWarehouse === "function") {
              consumeFoodFromWarehouse(id);
              refreshWarehouseUI();
            }
          }
        },
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
          label: "飲む",
          onClick: () => {
            if (typeof consumeDrinkFromWarehouse === "function") {
              consumeDrinkFromWarehouse(id);
              refreshWarehouseUI();
            }
          }
        },
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

      const label = getWeaponInstanceLabel(id);
      const row = createRow(label, cnt, [
        {
          label: "装備",
          onClick: () => {
            if (typeof equipWeaponFromWarehouse === "function") {
              equipWeaponFromWarehouse(id);
            } else if (Array.isArray(window.weaponInstances)) {
              // 簡易フォールバック：倉庫側からも代表1本を装備
              const idx = window.weaponInstances.findIndex(w => w.id === id);
              if (idx >= 0) {
                window.equippedWeaponIndex = idx;
                window.equippedWeaponId    = id;
                appendLog("武器を装備した");
                if (typeof recalcStats === "function") {
                  recalcStats();
                } else if (typeof updateDisplay === "function") {
                  updateDisplay();
                }
              }
            }
          }
        },
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

      const label = getArmorInstanceLabel(id);
      const row = createRow(label, cnt, [
        {
          label: "装備",
          onClick: () => {
            if (typeof equipArmorFromWarehouse === "function") {
              equipArmorFromWarehouse(id);
            } else if (Array.isArray(window.armorInstances)) {
              const idx = window.armorInstances.findIndex(a => a.id === id);
              if (idx >= 0) {
                window.equippedArmorIndex = idx;
                window.equippedArmorId    = id;
                appendLog("防具を装備した");
                if (typeof recalcStats === "function") {
                  recalcStats();
                } else if (typeof updateDisplay === "function") {
                  updateDisplay();
                }
              }
            }
          }
        },
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
    // 倉庫側の道具（toolCounts）を一覧表示し、手持ちへ移動可能にする
    if (typeof toolCounts === "object") {
      Object.keys(toolCounts).forEach(id => {
        const cnt = toolCounts[id] || 0;
        if (cnt <= 0) return;
        const name = getToolName(id);
        const row = createRow(name, cnt, [
          {
            label: "↑手持ちへ",
            onClick: () => {
              if (moveToolToCarry(id, 1)) {
                refreshWarehouseUI();
              }
            }
          }
        ]);
        whToolsBox.appendChild(row);
      });
    }
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

  // 中間素材テーブル（横=素材、縦=ティア）
  const intermListBox = document.getElementById("intermediateMaterialsList");
  if (intermListBox && Array.isArray(window.INTERMEDIATE_MATERIALS || INTERMEDIATE_MATERIALS)) {
    const src  = window.INTERMEDIATE_MATERIALS || INTERMEDIATE_MATERIALS;
    const mats = window.intermediateMats || {};
    intermListBox.innerHTML = "";

    const groups = {}; // baseName -> { name, t1, t2, t3 }

    src.forEach(m => {
      let tierKey = "t1";
      let baseName = m.name;

      if (m.name.startsWith("T1")) {
        tierKey = "t1";
        baseName = m.name.replace(/^T1/, "").trim();
      } else if (m.name.startsWith("T2")) {
        tierKey = "t2";
        baseName = m.name.replace(/^T2/, "").trim();
      } else if (m.name.startsWith("T3")) {
        tierKey = "t3";
        baseName = m.name.replace(/^T3/, "").trim();
      }

      const baseId = baseName;
      if (!groups[baseId]) {
        groups[baseId] = { name: baseName, t1: 0, t2: 0, t3: 0 };
      }

      const cnt = mats[m.id] || 0;
      groups[baseId][tierKey] = cnt;
    });

    const table = document.createElement("table");
    table.className = "mat-table";

    const thead = document.createElement("thead");
    const htr = document.createElement("tr");

    // 「ティア」は不要なので空ヘッダにする
    const thTier = document.createElement("th");
    thTier.textContent = "";
    htr.appendChild(thTier);

    // 採取素材の順番に対応した中間素材の表示順を固定
    const baseOrder = [
      "板材",         // wood
      "鉄インゴット", // ore
      "調合用薬草",   // herb
      "布束",         // cloth
      "強化皮",       // leather
      "蒸留水"        // water
    ];

    baseOrder.forEach(baseName => {
      if (groups[baseName]) {
        const th = document.createElement("th");
        th.textContent = baseName;
        htr.appendChild(th);
      }
    });

    thead.appendChild(htr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    ["t1", "t2", "t3"].forEach((tierKey, idx) => {
      const tr = document.createElement("tr");
      const thT = document.createElement("th");
      thT.textContent = `T${idx + 1}`;
      tr.appendChild(thT);

      baseOrder.forEach(baseName => {
        if (groups[baseName]) {
          const g = groups[baseName];
          const td = document.createElement("td");
          td.textContent = g[tierKey] || 0;
          tr.appendChild(td);
        }
      });

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
// 倉庫から直接食べる／飲む用ヘルパ
// =======================

function consumeFoodFromWarehouse(id) {
  if (window.isExploring || window.currentEnemy) {
    if (typeof appendLog === "function") {
      appendLog("探索中は倉庫から食事できない！");
    }
    return;
  }
  if (!window.cookedFoods || !window.cookedFoods[id]) {
    return;
  }

  const recipe = (typeof COOKING_RECIPES !== "undefined" && COOKING_RECIPES.food)
    ? COOKING_RECIPES.food.find(r => r.id === id)
    : null;
  if (!recipe || !recipe.effect) return;

  if (typeof applyFoodEffect === "function") {
    applyFoodEffect(recipe.effect, id);
  }

  window.cookedFoods[id] = Math.max(0, (window.cookedFoods[id] || 0) - 1);

  if (typeof appendLog === "function") {
    appendLog(`${recipe.name} を食べた！`);
  }
}

function consumeDrinkFromWarehouse(id) {
  if (window.isExploring || window.currentEnemy) {
    if (typeof appendLog === "function") {
      appendLog("探索中は倉庫から飲み物を飲めない！");
    }
    return;
  }
  if (!window.cookedDrinks || !window.cookedDrinks[id]) {
    return;
  }

  const recipe = (typeof COOKING_RECIPES !== "undefined" && COOKING_RECIPES.drink)
    ? COOKING_RECIPES.drink.find(r => r.id === id)
    : null;
  if (!recipe || !recipe.effect) return;

  if (typeof applyDrinkEffect === "function") {
    applyDrinkEffect(recipe.effect, id);
  }

  window.cookedDrinks[id] = Math.max(0, (window.cookedDrinks[id] || 0) - 1);

  if (typeof appendLog === "function") {
    appendLog(`${recipe.name} を飲んだ！`);
  }
}

// =======================
// 戦闘スキルボタンのバインド＋ショップ＋料理UIイベント
// =======================

window.addEventListener("DOMContentLoaded", () => {
  // まず全クラフトセレクトを game-core-6 側で構築
  if (typeof refreshEquipSelects === "function") {
    refreshEquipSelects();
  }

  // 料理クラフトUI（セレクトは refreshEquipSelects で生成される前提）
  const foodSelect   = document.getElementById("foodSelect");
  const drinkSelect  = document.getElementById("drinkSelect");
  const foodBtn      = document.getElementById("craftFoodBtn");
  const drinkBtn     = document.getElementById("craftDrinkBtn");

  if (foodSelect) {
    foodSelect.addEventListener("change", e => {
      const id = e.target.value;
      window.lastCraftCategory = "cookingFood";
      window.lastCookingKind = "food";
      window.lastCookingId = id;
      if (typeof updateCraftCostInfo === "function" && id) {
        updateCraftCostInfo("cookingFood", id);
      }
    });
  }

  if (drinkSelect) {
    drinkSelect.addEventListener("change", e => {
      const id = e.target.value;
      window.lastCraftCategory = "cookingDrink";
      window.lastCookingKind = "drink";
      window.lastCookingId = id;
      if (typeof updateCraftCostInfo === "function" && id) {
        updateCraftCostInfo("cookingDrink", id);
      }
    });
  }

  if (foodBtn && typeof craftFood === "function") {
    foodBtn.addEventListener("click", () => {
      window.lastCraftCategory = "cookingFood";
      const id = foodSelect?.value;
      window.lastCookingKind = "food";
      window.lastCookingId = id;
      craftFood();
      if (typeof updateCraftCostInfo === "function" && id) {
        updateCraftCostInfo("cookingFood", id);
      }
    });
  }

  if (drinkBtn && typeof craftDrink === "function") {
    drinkBtn.addEventListener("click", () => {
      window.lastCraftCategory = "cookingDrink";
      const id = drinkSelect?.value;
      window.lastCookingKind = "drink";
      window.lastCookingId = id;
      craftDrink();
      if (typeof updateCraftCostInfo === "function" && id) {
        updateCraftCostInfo("cookingDrink", id);
      }
    });
  }

  // 初期表示：前回のレシピ or 先頭
  const costInfo = document.getElementById("craftCostInfo");
  if (costInfo && typeof updateCraftCostInfo === "function") {
    if (window.lastCraftCategory === "cookingFood" && foodSelect && foodSelect.value) {
      window.lastCookingKind = "food";
      window.lastCookingId = foodSelect.value;
      updateCraftCostInfo("cookingFood", foodSelect.value);
    } else if (window.lastCraftCategory === "cookingDrink" && drinkSelect && drinkSelect.value) {
      window.lastCookingKind = "drink";
      window.lastCookingId = drinkSelect.value;
      updateCraftCostInfo("cookingDrink", drinkSelect.value);
    }
  }

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