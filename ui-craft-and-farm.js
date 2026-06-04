// ui-craft-and-farm.js
// クラフト関連・生活クラフト・肥料・農園UI

console.log("ui-craft-and-farm.js start");

// ---------------------------------------
// 任意ボタンを「押している間だけ連打」させるヘルパー
// ---------------------------------------
function setupAutoRepeatButton(btn, action, intervalMs = 100) {
  if (!btn || typeof action !== "function") return;

  let timer = null;

  function start() {
    if (timer) return;
    action(); // 押した瞬間に1回
    timer = setInterval(action, intervalMs);
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  // PC（マウス）
  btn.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    start();
  });
  btn.addEventListener("mouseup", stop);
  btn.addEventListener("mouseleave", stop);

  // スマホ（タッチ）
  btn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    start();
  }, { passive: false });
  btn.addEventListener("touchend", stop);
  btn.addEventListener("touchcancel", stop);
}

// ---------------------------------------
// クラフト詳細テーブル再計算ヘルパー
// （元の game-ui-4.js の仕様をベースに拡張）
// ・料理＋肥料: 料理素材一覧（倉庫と同じ：素材/普通/銀/金/合計、ただし 0 個でも全部表示）
// ・中間素材クラフト(material): 通常採取素材 Tier 表
// ・その他: 中間素材の Tier×素材 一覧（倉庫と同じ形式）
// ---------------------------------------
function updateCraftMatDetailText() {
  const label = document.getElementById("craftMaterials");
  const area  = document.getElementById("craftMatDetail");
  if (!label || !area) return;

  const names = { wood:"木", ore:"鉱石", herb:"草", cloth:"布", leather:"皮", water:"水" };

  // いまのクラフトカテゴリ（ui-craft-and-farm.js 側で管理）
  const cat = window.activeCraftCategory || "";

  // 料理タブ or 肥料タブのときは「料理素材一覧テーブル」（倉庫と同じ形式）
  const isCookingLike =
    (cat === "cookingFood" || cat === "cookingDrink" || cat === "fertilizer");

  if (isCookingLike && typeof COOKING_MAT_NAMES !== "undefined") {
    area.innerHTML = "";

    const mats  = window.cookingMats || {};
    const quality = window.cookingMatsQuality || {}; // id -> [normal, silver, gold]

    const table = document.createElement("table");
    table.className = "mat-table";

    const thead = document.createElement("thead");
    const htr = document.createElement("tr");
    ["素材","普通","銀","金","合計"].forEach(labelText => {
      const th = document.createElement("th");
      th.textContent = labelText;
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    // ★ 0 個でも全部表示するために、if (total === 0) return; を削除
    Object.keys(COOKING_MAT_NAMES).forEach(id => {
      const name = COOKING_MAT_NAMES[id] || id;

      const qArr = quality[id] || [0,0,0];
      const normal = (mats[id] || 0) + (qArr[0] || 0);
      const silver = qArr[1] || 0;
      const gold   = qArr[2] || 0;
      const total  = normal + silver + gold;
      // 0 個でも表示するため、ここでの skip はしない

      const tr = document.createElement("tr");
      const tdName   = document.createElement("td");
      const tdNormal = document.createElement("td");
      const tdSilver = document.createElement("td");
      const tdGold   = document.createElement("td");
      const tdTotal  = document.createElement("td");
      tdName.textContent   = name;
      tdNormal.textContent = normal;
      tdSilver.textContent = silver;
      tdGold.textContent   = gold;
      tdTotal.textContent  = total;

      tr.appendChild(tdName);
      tr.appendChild(tdNormal);
      tr.appendChild(tdSilver);
      tr.appendChild(tdGold);
      tr.appendChild(tdTotal);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    area.appendChild(table);

    // ★変更: 「所持素材：料理素材一覧」を出さず、ラベルは空のままにする
    label.textContent = "";
    return;
  }

  // 中間素材クラフト（material）のときは通常採取素材 Tier 表
  if (cat === "material") {
    area.innerHTML = "";

    if (!window.materials) {
      // ★変更: ここも「所持素材：-」を出さず空にする
      label.textContent = "";
      return;
    }

    const kinds = ["wood","ore","herb","cloth","leather","water"];

    const maxTier = (typeof window.MATERIAL_MAX_T === "number" && window.MATERIAL_MAX_T > 0)
      ? window.MATERIAL_MAX_T
      : 3;

    const table = document.createElement("table");
    table.className = "mat-table";

    const thead = document.createElement("thead");
    const htr = document.createElement("tr");

    const thEmpty = document.createElement("th");
    thEmpty.textContent = "Tier";
    htr.appendChild(thEmpty);

    kinds.forEach(k => {
      const th = document.createElement("th");
      th.textContent = names[k] || k;
      htr.appendChild(th);
    });

    thead.appendChild(htr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    for (let tierNum = 1; tierNum <= maxTier; tierNum++) {
      const tr = document.createElement("tr");

      const thTier = document.createElement("th");
      thTier.textContent = "T" + tierNum;
      tr.appendChild(thTier);

      kinds.forEach(k => {
        const td = document.createElement("td");
        let val = 0;

        if (typeof getMatTierCount === "function") {
          val = getMatTierCount(k, tierNum);
        } else {
          const mArr = window.materials && window.materials[k];
          const idx = tierNum - 1;
          val = (mArr && mArr[idx]) || 0;
        }

        td.textContent = val;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    area.appendChild(table);

    // ★変更: 「所持素材：採取素材一覧」を出さず空
    label.textContent = "";
    return;
  }

  // それ以外のカテゴリ: 中間素材 Tier 一覧（倉庫の中間素材表と同じ構造）
  area.innerHTML = "";

  if (!window.intermediateMats || !Array.isArray(window.INTERMEDIATE_MATERIALS)) {
    // 中間素材がまだ無い場合も「所持素材：-」を出さず空
    label.textContent = "";
    return;
  }

  const mats = window.intermediateMats;
  const src  = window.INTERMEDIATE_MATERIALS;

  // 素材ごとの tier 別在庫を集計
  // id 形式: T1_woodPlank / T2_woodPlank / ...
  const groups = {}; // baseKey -> { name, tiers: { tierNum: count } }

  src.forEach(m => {
    const id = m.id;
    if (!id) return;

    const mTierMatch = id.match(/^T([0-9]+)_(.+)$/);
    const tierNum = mTierMatch ? parseInt(mTierMatch[1], 10) : 1;
    const baseKey = mTierMatch ? mTierMatch[2] : id;

    if (!groups[baseKey]) {
      // 表示名用: "木材板T1" みたいな名前から末尾の Tn を削る
      const baseName = m.name.replace(/T[0-9]+$/, "").trim();
      groups[baseKey] = {
        name: baseName,
        tiers: {}
      };
    }

    const stock = mats[id] || 0;
    if (!groups[baseKey].tiers[tierNum]) {
      groups[baseKey].tiers[tierNum] = 0;
    }
    groups[baseKey].tiers[tierNum] += stock;
  });

  // Tier 行数は MATERIAL_MAX_T に追従
  const maxTier2 = (typeof window.MATERIAL_MAX_T === "number" && window.MATERIAL_MAX_T > 0)
    ? window.MATERIAL_MAX_T
    : 3;

  const table2 = document.createElement("table");
  table2.className = "mat-table";

  const thead2 = document.createElement("thead");
  const htr2 = document.createElement("tr");

  // 左端: Tier
  const thTier2 = document.createElement("th");
  thTier2.textContent = "Tier";
  htr2.appendChild(thTier2);

  // 右側: 各中間素材の列
  const baseKeys = Object.keys(groups);
  baseKeys.forEach(key => {
    const g = groups[key];
    const th = document.createElement("th");
    th.textContent = g.name || key;
    htr2.appendChild(th);
  });

  thead2.appendChild(htr2);
  table2.appendChild(thead2);

  const tbody2 = document.createElement("tbody");

  // 行 = T1〜maxTier
  for (let tierNum = 1; tierNum <= maxTier2; tierNum++) {
    const tr = document.createElement("tr");

    const tdTier = document.createElement("th");
    tdTier.textContent = "T" + tierNum;
    tr.appendChild(tdTier);

    baseKeys.forEach(key => {
      const g = groups[key];
      const tiers = g.tiers || {};
      const td = document.createElement("td");
      td.textContent = tiers[tierNum] || 0;
      tr.appendChild(td);
    });

    tbody2.appendChild(tr);
  }

  table2.appendChild(tbody2);
  area.appendChild(table2);

  // ★変更: 「所持素材：中間素材一覧」を出さず空
  label.textContent = "";
}

// ---------------------------------------
// クラフトコスト再計算ヘルパー
// ---------------------------------------
function refreshCurrentCraftCost() {
  const infoEl = document.getElementById("craftCostInfo");
  if (!infoEl) return;

  const activeCatBtn = document.querySelector(".craft-cat-tab.active");
  const cat = activeCatBtn ? activeCatBtn.dataset.cat : "weapon";

  console.log("[refreshCurrentCraftCost] activeCat =", cat);

  if (cat === "weapon") {
    window.activeCraftCategory = "weapon";
    const sel = document.getElementById("weaponSelect");
    if (sel && sel.value) {
      updateCraftCostInfo("weapon", sel.value);
      return;
    }
  } else if (cat === "armor") {
    window.activeCraftCategory = "armor";
    const sel = document.getElementById("armorSelect");
    if (sel && sel.value) {
      updateCraftCostInfo("armor", sel.value);
      return;
    }
  } else if (cat === "potion") {
    window.activeCraftCategory = "potion";
    const sel = document.getElementById("potionSelect");
    if (sel && sel.value) {
      updateCraftCostInfo("potion", sel.value);
      return;
    }
  } else if (cat === "tool") {
    window.activeCraftCategory = "tool";
    const sel = document.getElementById("toolSelect");
    if (sel && sel.value) {
      updateCraftCostInfo("tool", sel.value);
      return;
    }
  } else if (cat === "material") {
    window.activeCraftCategory = "material";
    const sel = document.getElementById("intermediateSelect");
    if (sel && sel.value) {
      updateCraftCostInfo("material", sel.value);
      return;
    }
  } else if (cat === "cooking") {
    const activeSubTab = document.querySelector(".cook-sub-tab.active");
    const sub = activeSubTab ? activeSubTab.dataset.sub : "food";
    const foodSel  = document.getElementById("foodSelect");
    const drinkSel = document.getElementById("drinkSelect");

    console.log("[refreshCurrentCraftCost] cooking sub =", sub);

    if (sub === "drink") {
      window.activeCraftCategory = "cookingDrink";
      if (drinkSel && drinkSel.value) {
        updateCraftCostInfo("cookingDrink", drinkSel.value);
        return;
      }
    } else {
      window.activeCraftCategory = "cookingFood";
      if (foodSel && foodSel.value) {
        updateCraftCostInfo("cookingFood", foodSel.value);
        return;
      }
    }
  } else if (cat === "life") {
    const activeLifeSubTab = document.querySelector(".life-sub-tab.active");
    const sub = activeLifeSubTab ? activeLifeSubTab.dataset.sub : "farm";
    console.log("[refreshCurrentCraftCost] life sub =", sub);

    if (sub === "farm") {
      window.activeCraftCategory = "fertilizer";
      const fertSel = document.getElementById("fertilizerSelect");
      console.log("[refreshCurrentCraftCost] fertSel =", fertSel, "value =", fertSel && fertSel.value);
      if (fertSel && fertSel.value) {
        updateCraftCostInfo("fertilizer", fertSel.value);
        return;
      }
    } else if (sub === "furniture") {
      window.activeCraftCategory = "furniture";
      const furnitureSel = document.getElementById("furnitureSelect");
      if (furnitureSel && furnitureSel.value) {
        updateCraftCostInfo("furniture", furnitureSel.value);
        return;
      }
    }
  }

  infoEl.textContent = "必要素材：-";
}

// ---------------------------------------
// 肥料セレクト初期化
// ---------------------------------------
function initFertilizerSelect() {
  console.log("=== initFertilizerSelect ENTER ===");
  const fertSelect = document.getElementById("fertilizerSelect");
  console.log("[initFertilizerSelect] fertSelect =", fertSelect);

  if (!fertSelect) {
    console.warn("[initFertilizerSelect] fertilizerSelect element not found (return)");
    console.warn("[initFertilizerSelect] appRoot =", document.getElementById("appRoot"));
    console.warn("[initFertilizerSelect] magicPageCraft =", document.getElementById("magicPageCraft"));
    return;
  }

  const defs = window.FERTILIZERS || {};
  const keys = Object.keys(defs);
  console.log("[initFertilizerSelect] window.FERTILIZERS keys =", keys);

  const ids = keys.sort((a, b) => {
    const ta = defs[a] && typeof defs[a].tier === "number" ? defs[a].tier : 0;
    const tb = defs[b] && typeof defs[b].tier === "number" ? defs[b].tier : 0;
    return ta - tb;
  });
  console.log("[initFertilizerSelect] sorted ids =", ids);

  console.log("[initFertilizerSelect] before clear, options length =", fertSelect.options.length);
  fertSelect.innerHTML = "";

  ids.forEach(id => {
    const f = defs[id];
    if (!f) return;
    const opt = document.createElement("option");
    opt.value = f.id;
    // 必要ポイントと名前をまとめて表示（仕様はポイント制のまま）
    opt.textContent = `${f.name}（必要${f.costPoint}pt）`;
    fertSelect.appendChild(opt);
  });

  console.log("[initFertilizerSelect] after append, options length =", fertSelect.options.length);
  console.log("[initFertilizerSelect] current value =", fertSelect.value);

  if (fertSelect.value && typeof updateCraftCostInfo === "function") {
    console.log("[initFertilizerSelect] call updateCraftCostInfo('fertilizer',", fertSelect.value, ")");
    // life/farm なので activeCraftCategory も合わせておく
    window.activeCraftCategory = "fertilizer";
    updateCraftCostInfo("fertilizer", fertSelect.value);
  } else {
    console.log("[initFertilizerSelect] skip updateCraftCostInfo, value or function missing");
  }

  console.log("=== initFertilizerSelect LEAVE ===");
}

// ---------------------------------------
// DOMContentLoaded 後の初期化（クラフト/農園）
// ---------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  console.log("[DOMContentLoaded craft] start");

  // --------------------
  // クラフトカテゴリタブ
  // --------------------
  const craftCatTabs = document.querySelectorAll(".craft-cat-tab");
  const craftPanels = {
    weapon:   document.getElementById("craftPanelWeapon"),
    armor:    document.getElementById("craftPanelArmor"),
    potion:   document.getElementById("craftPanelPotion"),
    tool:     document.getElementById("craftPanelTool"),
    material: document.getElementById("craftPanelMaterial"),
    cooking:  document.getElementById("craftPanelCooking"),
    life:     document.getElementById("craftPanelLife")
  };

  function setCraftCategory(cat) {
    console.log("[setCraftCategory] cat =", cat);

    craftCatTabs.forEach(btn => {
      if (btn.dataset.cat === cat) btn.classList.add("active");
      else                         btn.classList.remove("active");
    });

    Object.keys(craftPanels).forEach(k => {
      if (!craftPanels[k]) return;
      craftPanels[k].style.display = (k === cat) ? "" : "none";
    });

    // ★ 装備種別セレクトの表示/非表示切り替え
    //   craftKindRow は html1.js 側に既に存在している行をそのまま使う
    const kindRow = document.getElementById("craftKindRow");
    if (kindRow) {
      if (cat === "weapon" || cat === "armor") {
        kindRow.classList.remove("craft-kind-hidden");
      } else {
        kindRow.classList.add("craft-kind-hidden");
      }
    }

    const infoEl = document.getElementById("craftCostInfo");

    if (cat === "weapon") {
      window.activeCraftCategory = "weapon";
      const sel = document.getElementById("weaponSelect");
      if (sel && sel.value) { updateCraftCostInfo("weapon", sel.value); return; }
    } else if (cat === "armor") {
      window.activeCraftCategory = "armor";
      const sel = document.getElementById("armorSelect");
      if (sel && sel.value) { updateCraftCostInfo("armor", sel.value); return; }
    } else if (cat === "potion") {
      window.activeCraftCategory = "potion";
      const sel = document.getElementById("potionSelect");
      if (sel && sel.value) { updateCraftCostInfo("potion", sel.value); return; }
    } else if (cat === "tool") {
      window.activeCraftCategory = "tool";
      const sel = document.getElementById("toolSelect");
      if (sel && sel.value) { updateCraftCostInfo("tool", sel.value); return; }
    } else if (cat === "material") {
      window.activeCraftCategory = "material";
      const sel = document.getElementById("intermediateSelect");
      if (sel && sel.value) { updateCraftCostInfo("material", sel.value); return; }
    } else if (cat === "cooking") {
      const foodSel  = document.getElementById("foodSelect");
      const drinkSel = document.getElementById("drinkSelect");
      let activeSubTab = document.querySelector(".cook-sub-tab.active");
      
      if (!activeSubTab) {
        const firstSubTab = document.querySelector(".cook-sub-tab");
        if (firstSubTab) {
          firstSubTab.click();
          activeSubTab = firstSubTab;
        }
      }
      
      const sub = activeSubTab ? activeSubTab.dataset.sub : "food";

      console.log("[setCraftCategory] cooking sub =", sub);

      if (sub === "drink") {
        window.activeCraftCategory = "cookingDrink";
        if (drinkSel && drinkSel.value) {
          updateCraftCostInfo("cookingDrink", drinkSel.value);
          return;
        }
      } else {
        window.activeCraftCategory = "cookingFood";
        if (foodSel && foodSel.value) {
          updateCraftCostInfo("cookingFood", foodSel.value);
          return;
        }
      }
    } else if (cat === "life") {
      let activeLifeSubTab = document.querySelector(".life-sub-tab.active");
      
      if (!activeLifeSubTab) {
        const firstLifeSubTab = document.querySelector(".life-sub-tab");
        if (firstLifeSubTab) {
          firstLifeSubTab.click();
          activeLifeSubTab = firstLifeSubTab;
        }
      }
      
      const sub = activeLifeSubTab ? activeLifeSubTab.dataset.sub : "farm";
      const fertSel = document.getElementById("fertilizerSelect");

      console.log("[setCraftCategory] life sub =", sub, "fertSel =", fertSel, "options length =", fertSel ? fertSel.options.length : "N/A", "value =", fertSel && fertSel.value);

      if (sub === "farm") {
        window.activeCraftCategory = "fertilizer";
        if (fertSel && fertSel.value) {
          updateCraftCostInfo("fertilizer", fertSel.value);
          return;
        }
      } else if (sub === "furniture") {
        window.activeCraftCategory = "furniture";
        const furnitureSel = document.getElementById("furnitureSelect");
        if (furnitureSel && furnitureSel.value) {
          updateCraftCostInfo("furniture", furnitureSel.value);
          return;
        }
      }
    }

    if (infoEl) infoEl.textContent = "必要素材：-";
  }

  window.setCraftCategory = setCraftCategory;

  craftCatTabs.forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat || "weapon";
      setCraftCategory(cat);
      // カテゴリ切替時に詳細も更新（在庫一覧仕様）
      updateCraftMatDetailText?.();
    });
  });

  setCraftCategory("weapon");

  // --------------------
  // 料理サブタブ
  // --------------------
  function initCookingSubTabs() {
    const subTabs = document.querySelectorAll(".cook-sub-tab");
    const panelFood  = document.getElementById("cookPanelFood");
    const panelDrink = document.getElementById("cookPanelDrink");

    if (!subTabs.length || !panelFood || !panelDrink) return;

    subTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        subTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const sub = tab.dataset.sub;
        const infoEl = document.getElementById("craftCostInfo");
        const foodSel  = document.getElementById("foodSelect");
        const drinkSel = document.getElementById("drinkSelect");

        console.log("[cook-sub-tab] click sub =", sub);

        if (sub === "food") {
          window.activeCraftCategory = "cookingFood";
          panelFood.style.display  = "";
          panelDrink.style.display = "none";

          if (foodSel && foodSel.value) {
            updateCraftCostInfo("cookingFood", foodSel.value);
          } else if (infoEl) {
            infoEl.textContent = "必要素材：-";
          }
        } else {
          window.activeCraftCategory = "cookingDrink";
          panelFood.style.display  = "none";
          panelDrink.style.display = "";

          if (drinkSel && drinkSel.value) {
            updateCraftCostInfo("cookingDrink", drinkSel.value);
          } else if (infoEl) {
            infoEl.textContent = "必要素材：-";
          }
        }

        // 料理サブタブ切替時も詳細テーブル更新（料理/採取/中間）
        updateCraftMatDetailText?.();
      });
    });

    const first = subTabs[0];
    console.log("[initCookingSubTabs] first subTab =", first);
    if (first) first.click();
  }

  initCookingSubTabs();

  // --------------------
  // 生活サブタブ（農園 / 家具）
  // --------------------
  function initLifeSubTabs() {
    const subTabs      = document.querySelectorAll(".life-sub-tab");
    const panelFarm    = document.getElementById("lifePanelFarm");
    const panelHousing = document.getElementById("lifePanelHousing");

    console.log("[initLifeSubTabs] subTabs length =", subTabs.length, "panelFarm =", panelFarm, "panelHousing =", panelHousing);

    if (!subTabs.length || !panelFarm) return;

    subTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        subTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const sub = tab.dataset.sub;
        const infoEl = document.getElementById("craftCostInfo");
        const fertSel = document.getElementById("fertilizerSelect");

        console.log("[life-sub-tab] click: sub =", sub, "fertSel =", fertSel, "options length =", fertSel ? fertSel.options.length : "N/A", "value =", fertSel && fertSel.value);

        if (sub === "farm") {
          window.activeCraftCategory = "fertilizer";
          if (panelFarm)    panelFarm.style.display = "";
          if (panelHousing) panelHousing.style.display = "none";

          if (fertSel && fertSel.value) {
            updateCraftCostInfo("fertilizer", fertSel.value);
          } else if (infoEl) {
            infoEl.textContent = "必要素材：-";
          }
        } else {
          window.activeCraftCategory = "furniture";
          if (panelFarm)    panelFarm.style.display = "none";
          if (panelHousing) panelHousing.style.display = "";

          const furnSel = document.getElementById("furnitureSelect");
          if (furnSel && furnSel.value) {
            updateCraftCostInfo("furniture", furnSel.value);
          } else if (infoEl) {
            infoEl.textContent = "必要素材：-";
          }
        }

        // 生活サブタブ切替時も詳細テーブル更新
        updateCraftMatDetailText?.();
      });
    });

    const first = subTabs[0];
    console.log("[initLifeSubTabs] first subTab =", first);
    if (first) first.click();
  }

  initLifeSubTabs();

  // --------------------
  // クラフトボタン・セレクト
  // --------------------
  const weaponCraftBtn = document.getElementById("craftWeaponBtn");
  if (weaponCraftBtn && typeof craftWeapon === "function") {
    weaponCraftBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中はクラフトできない！");
        return;
      }
      craftWeapon();
      updateGatherMatDetailText?.();
      updateCraftMatDetailText?.();
      refreshCurrentCraftCost();
    });
  }

  const armorCraftBtn = document.getElementById("craftArmorBtn");
  if (armorCraftBtn && typeof craftArmor === "function") {
    armorCraftBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中はクラフトできない！");
        return;
      }
      craftArmor();
      updateGatherMatDetailText?.();
      updateCraftMatDetailText?.();
      refreshCurrentCraftCost();
    });
  }

  const potionCraftBtn = document.getElementById("craftPotionBtn");
  if (potionCraftBtn && typeof craftPotion === "function") {
    potionCraftBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中はクラフトできない！");
        return;
      }
      craftPotion();
      updateGatherMatDetailText?.();
      updateCraftMatDetailText?.();
      refreshCurrentCraftCost();
    });
  }

  const toolCraftBtn = document.getElementById("craftToolBtn");
  if (toolCraftBtn && typeof craftTool === "function") {
    toolCraftBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中はクラフトできない！");
        return;
      }
      craftTool();
      updateGatherMatDetailText?.();
      updateCraftMatDetailText?.();
      refreshCurrentCraftCost();
    });
  }

  // 肥料クラフト（自動）ボタン
  const fertAutoBtn = document.getElementById("craftFertilizerAutoBtn");
  console.log("[fertAutoBtn] element =", fertAutoBtn, "typeof craftFertilizerAuto =", typeof craftFertilizerAuto);
  if (fertAutoBtn && typeof craftFertilizerAuto === "function") {
    fertAutoBtn.addEventListener("click", () => {
      console.log("[fertAutoBtn] click, isExploring =", window.isExploring, "currentEnemy =", window.currentEnemy);
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中はクラフトできない！");
        return;
      }
      const fertSel = document.getElementById("fertilizerSelect");
      const fertId  = fertSel ? fertSel.value : "";
      console.log("[fertAutoBtn] selected fertId =", fertId, "fertSel =", fertSel);
      if (!fertId) {
        appendLog("作る肥料を選んでいない。");
        return;
      }
      craftFertilizerAuto(fertId);
      updateGatherMatDetailText?.();
      updateCraftMatDetailText?.();
      refreshCurrentCraftCost();
    });
  }

  // 手動クラフトボタン（UIは保留）
  const fertManualBtn = document.getElementById("craftFertilizerManualBtn");
  if (fertManualBtn && typeof craftFertilizerManual === "function") {
    fertManualBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中はクラフトできない！");
        return;
      }
      const fertSel = document.getElementById("fertilizerSelect");
      const fertId  = fertSel ? fertSel.value : "";
      if (!fertId) {
        appendLog("作る肥料を選んでいない。");
        return;
      }
      const materials = window.selectedFertilizerMaterials || [];
      if (!materials.length) {
        appendLog("手動クラフト用の素材が選択されていない。");
        return;
      }
      craftFertilizerManual(fertId, materials);
      updateGatherMatDetailText?.();
      updateCraftMatDetailText?.();
      refreshCurrentCraftCost();
    });
  }

  const craftKindSelect = document.getElementById("craftKindSelect");
  if (craftKindSelect && typeof refreshEquipSelects === "function") {
    craftKindSelect.addEventListener("change", () => {
      refreshEquipSelects();
      refreshCurrentCraftCost();
      updateCraftMatDetailText?.();
    });
  }

  const craftTierSelect = document.getElementById("craftTierSelect");
  if (craftTierSelect && typeof refreshEquipSelects === "function") {
    craftTierSelect.addEventListener("change", () => {
      refreshEquipSelects();
      refreshCurrentCraftCost();
      updateCraftMatDetailText?.();
    });
  }

  const weaponSelect = document.getElementById("weaponSelect");
  if (weaponSelect) {
    weaponSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("weapon", id);
      updateCraftMatDetailText?.();
    });
  }

  const armorSelect = document.getElementById("armorSelect");
  if (armorSelect) {
    armorSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("armor", id);
      updateCraftMatDetailText?.();
    });
  }

  const potionSelect = document.getElementById("potionSelect");
  if (potionSelect) {
    potionSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("potion", id);
      updateCraftMatDetailText?.();
    });
  }

  const toolSelect = document.getElementById("toolSelect");
  if (toolSelect) {
    toolSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("tool", id);
      updateCraftMatDetailText?.();
    });
  }

  const foodSelect = document.getElementById("foodSelect");
  if (foodSelect) {
    foodSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("cookingFood", id);
      updateCraftMatDetailText?.();
    });
  }

  const drinkSelect = document.getElementById("drinkSelect");
  if (drinkSelect) {
    drinkSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("cookingDrink", id);
      updateCraftMatDetailText?.();
    });
  }

  const fertSelect = document.getElementById("fertilizerSelect");
  console.log("[fertSelect change-bind] fertSelect =", fertSelect);
  if (fertSelect) {
    fertSelect.addEventListener("change", e => {
      const id = e.target.value;
      console.log("[fertSelect change] id =", id);
      window.activeCraftCategory = "fertilizer";
      if (id) updateCraftCostInfo("fertilizer", id);
      updateCraftMatDetailText?.();
    });
  }

  // --------------------
  // 農園お世話（連打対応）
  // --------------------
  const careFarmAllBtn = document.getElementById("careFarmAllBtn");
  if (careFarmAllBtn && typeof careFarmAll === "function") {
    const careOnce = () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は農園の世話ができない！");
        return;
      }
      careFarmAll();
    };

    // クリック1回ぶんの処理は setupAutoRepeatButton 内の action に一本化
    setupAutoRepeatButton(careFarmAllBtn, careOnce, 100);
  }

  // --------------------
  // 農園 全収穫ボタン（1クリック1回実行）
  // --------------------
  const harvestFarmAllBtn = document.getElementById("harvestFarmAllBtn");
  if (harvestFarmAllBtn && typeof harvestFarmAll === "function") {
    harvestFarmAllBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は農園の収穫ができない！");
        return;
      }
      harvestFarmAll();
    });
  }

  // ★肥料セレクト初期化
  console.log("[DOMContentLoaded craft] before initFertilizerSelect, fertSelect =", document.getElementById("fertilizerSelect"));
  initFertilizerSelect();
  console.log("[DOMContentLoaded craft] after initFertilizerSelect, fertSelect =", document.getElementById("fertilizerSelect"),
              "options length =", (document.getElementById("fertilizerSelect") || {}).options?.length);

  if (typeof openJobModal === "function" && typeof jobId !== "undefined" && jobId === null) {
    openJobModal();
  }

  console.log("[DOMContentLoaded craft] end");
});