// game-ui.js
// 各種ボタン・タブ・セレクトのイベントバインドとUI制御

console.log("game-ui.js srt");

// 画面サイズに応じてレイアウトクラスを付ける
function applyResponsiveLayout() {
  const w = window.innerWidth;
  const root = document.documentElement;

  root.classList.remove("layout-mobile", "layout-tablet", "layout-desktop");

  if (w < 600) {
    root.classList.add("layout-mobile");
  } else if (w < 1024) {
root.classList.add("layout-tablet");
  } else {
    root.classList.add("layout-desktop");
  }
}

// 素材詳細テキスト更新（採取タブ用）
function updateGatherMatDetailText() {
  const label = document.getElementById("gatherMaterials");
  const area  = document.getElementById("gatherMatDetail");
  if (!label || !area || typeof window.materials === "undefined") return;

  const names = {
    wood:   "木",
    ore:    "鉱石",
    herb:   "草",
    cloth:  "布",
    leather:"皮",
    water:  "水"
  };

  const keys = ["wood","ore","herb","cloth","leather","water"];
  const lines = keys.map(k => {
    const m  = window.materials[k] || {};
    const t1 = m.t1 || 0;
    const t2 = m.t2 || 0;
    const t3 = m.t3 || 0;
    return `${names[k]}: ${t1}/${t2}/${t3}`;
  });
  area.textContent = lines.join("\n");

  let labelText = "所持素材：-";

  const info = window.lastGatherInfo;

  // ▼ 通常素材（従来仕様のまま、ただし所持数を見る）
  if (info && info.baseKey) {
    const baseKey = info.baseKey;
    const mat = window.materials[baseKey] || {};
    const t1Have = mat.t1 || 0;
    const t2Have = mat.t2 || 0;
    const t3Have = mat.t3 || 0;
    const name   = names[baseKey] || baseKey;

    let picked = "";
    if (t3Have > 0)      picked = `T3${name} x${t3Have}`;
    else if (t2Have > 0) picked = `T2${name} x${t2Have}`;
    else if (t1Have > 0) picked = `T1${name} x${t1Have}`;

    if (picked) {
      labelText = `所持素材：${picked}`;
    }
  }

  // ▼ 料理素材（game-core-4 で kind: "cooking", gained: {...} を入れている）
  if (info && info.kind === "cooking" && info.gained && window.cookingMats) {
    // 直近で増えた料理素材のうち、最後の1種を代表で表示
    const ids = Object.keys(info.gained);
    if (ids.length > 0) {
      const lastId = ids[ids.length - 1];
      const have   = window.cookingMats[lastId] || 0;
      const name   = (typeof COOKING_MAT_NAMES !== "undefined"
        ? COOKING_MAT_NAMES[lastId]
        : lastId);
      labelText = `所持素材：${name} x${have}`;
    }
  }

  label.textContent = labelText;
}

// 素材詳細テキスト更新（クラフトタブ用）
function updateCraftMatDetailText() {
  const label = document.getElementById("craftMaterials");
  const area  = document.getElementById("craftMatDetail");
  if (!label || !area || typeof window.materials === "undefined") return;

  const names = {
    wood:   "木",
    ore:    "鉱石",
    herb:   "草",
    cloth:  "布",
    leather:"皮",
    water:  "水"
  };

  function formatTierNums(matObj) {
    const m = matObj || {};
    const t1 = m.t1 || 0;
    const t2 = m.t2 || 0;
    const t3 = m.t3 || 0;
    return `${t1}/${t2}/${t3}`;
  }

  const keys = ["wood","ore","herb","cloth","leather","water"];

  const lines = keys.map(k => {
    const m = window.materials[k] || {};
    return `${names[k]}: ${formatTierNums(m)}`;
  });
  area.textContent = lines.join("\n");

  let labelText = "所持素材：-";

  if (window.lastGatherInfo && window.lastGatherInfo.baseKey) {
    const info    = window.lastGatherInfo;
    const baseKey = info.baseKey;
    const tiers   = info.tiers || {};
    const t1 = tiers.t1 || 0;
    const t2 = tiers.t2 || 0;
    const t3 = tiers.t3 || 0;

    let picked = "";
    if (t3 > 0)      picked = `T3${names[baseKey]}`;
    else if (t2 > 0) picked = `T2${names[baseKey]}`;
    else if (t1 > 0) picked = `T1${names[baseKey]}`;

    if (picked) {
      labelText = `所持素材：${picked}`;
    }
  }

  label.textContent = labelText;
}

window.addEventListener("DOMContentLoaded", () => {
  // =======================
  // 初期化
  // =======================
  if (typeof initGame === "function") {
    initGame();
  }

  applyResponsiveLayout();
  window.addEventListener("resize", applyResponsiveLayout);

  // =======================
  // タブ切り替え
  // =======================

  const tabButtonsMap = {
    tabGather:    "pageGather",
    tabCraft:     "pageCraft",
    tabEquip:     "pageEquip",
    tabExplore:   "pageExplore",
    tabShop:      "pageShop",
    tabMarket:    "pageMarket",
    tabWarehouse: "pageWarehouse",
    tabStatus:    "pageStatus"
  };

  const tabPages = Object.values(tabButtonsMap).map(id => document.getElementById(id));

  function showTabByPageId(pageId) {
    if (window.isExploring || window.currentEnemy) {
      const allowed = ["pageExplore", "pageStatus"];
      if (!allowed.includes(pageId)) {
        if (typeof appendLog === "function") {
          appendLog("探索中はその行動はできない！");
        }
        pageId = "pageExplore";
      }
    }

    tabPages.forEach(p => {
      if (!p) return;
      p.classList.remove("active");
      p.style.display = (p.id === pageId) ? "block" : "none";
    });

    Object.entries(tabButtonsMap).forEach(([btnId, pid]) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      if (pid === pageId) btn.classList.add("active");
      else                btn.classList.remove("active");
    });

    if (pageId === "pageCraft") {
      if (typeof refreshEquipSelects === "function") {
        refreshEquipSelects();
      }

      if (typeof COOKING_RECIPES !== "undefined") {
        populateCookingSelects();
      }

      const infoEl   = document.getElementById("craftCostInfo");
      const activeCatBtn = document.querySelector(".craft-cat-tab.active");
      const activeCat = activeCatBtn ? activeCatBtn.dataset.cat : "weapon";

      const w        = document.getElementById("weaponSelect");
      const a        = document.getElementById("armorSelect");
      const p        = document.getElementById("potionSelect");
      const t        = document.getElementById("toolSelect");
      const interSel = document.getElementById("intermediateSelect");
      const foodSel  = document.getElementById("foodSelect");
      const drinkSel = document.getElementById("drinkSelect");

      if (activeCat === "weapon" && w && w.value) {
        updateCraftCostInfo("weapon", w.value);
      } else if (activeCat === "armor" && a && a.value) {
        updateCraftCostInfo("armor", a.value);
      } else if (activeCat === "potion" && p && p.value) {
        updateCraftCostInfo("potion", p.value);
      } else if (activeCat === "tool" && t && t.value) {
        updateCraftCostInfo("tool", t.value);
      } else if (activeCat === "material" && interSel && interSel.value) {
        updateCraftCostInfo("material", interSel.value);
      } else if (activeCat === "cooking") {
        if (typeof COOKING_RECIPES !== "undefined") {
          const activeSubTab = document.querySelector(".cook-sub-tab.active");
          const sub = activeSubTab ? activeSubTab.dataset.sub : "food";

          if (sub === "drink") {
            // 飲み物タブがアクティブのときは drinkSelect 優先
            if (drinkSel && drinkSel.value) {
              const r = COOKING_RECIPES.drink.find(x => x.id === drinkSel.value) || null;
              updateCookingCostInfo(r);
            } else {
              updateCookingCostInfo(null);
            }
          } else {
            // 食べ物タブ（または不明時）は foodSelect 優先
            if (foodSel && foodSel.value) {
              const r = COOKING_RECIPES.food.find(x => x.id === foodSel.value) || null;
              updateCookingCostInfo(r);
            } else {
              updateCookingCostInfo(null);
            }
          }
        } else if (infoEl) {
          infoEl.textContent = "必要素材：-";
        }
      } else if (infoEl) {
        infoEl.textContent = "必要素材：-";
      }

      updateCraftMatDetailText();
    }

    if (pageId === "pageMarket") {
      if (!window.isExploring && !window.currentEnemy) {
        if (typeof refreshMarketSellCandidates === "function") {
          refreshMarketSellCandidates();
        }
        if (typeof refreshMarketBuyList === "function") {
          refreshMarketBuyList();
        }
        if (typeof refreshMarketOrderList === "function") {
          refreshMarketOrderList();
        }
      }
    }

    if (pageId === "pageWarehouse") {
      if (typeof refreshWarehouseUI === "function") {
        refreshWarehouseUI();
      }
    }
  }

  Object.entries(tabButtonsMap).forEach(([btnId, pageId]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("click", () => {
      showTabByPageId(pageId);
    });
  });

  showTabByPageId("pageGather");

  // =======================
  // ステータス詳細 ON/OFF
  // =======================

  const toggleDetailBtn = document.getElementById("toggleDetailBtn");
  const detailPanel = document.getElementById("detailPanel");
  if (toggleDetailBtn && detailPanel) {
    toggleDetailBtn.addEventListener("click", () => {
      const visible = detailPanel.style.display === "block";
      detailPanel.style.display = visible ? "none" : "block";
      toggleDetailBtn.textContent = visible ? "▼詳細" : "▲詳細";
    });
  }

  // 素材詳細 ON/OFF（採取）
  const toggleMatDetailBtn = document.getElementById("toggleMatDetailBtn");
  const gatherMatDetail = document.getElementById("gatherMatDetail");
  if (toggleMatDetailBtn && gatherMatDetail) {
    toggleMatDetailBtn.addEventListener("click", () => {
      updateGatherMatDetailText();
      const visible = gatherMatDetail.style.display === "block" ||
                      getComputedStyle(gatherMatDetail).display === "block";
      gatherMatDetail.style.display = visible ? "none" : "block";
      toggleMatDetailBtn.textContent = visible ? "詳細▼" : "詳細▲";
    });
  }

  // 素材詳細 ON/OFF（クラフト）
  const toggleMatDetailBtn2 = document.getElementById("toggleMatDetailBtn2");
  const craftMatDetail = document.getElementById("craftMatDetail");
  if (toggleMatDetailBtn2 && craftMatDetail) {
    toggleMatDetailBtn2.addEventListener("click", () => {
      updateCraftMatDetailText();
      const visible = craftMatDetail.style.display === "block" ||
                      getComputedStyle(craftMatDetail).display === "block";
      craftMatDetail.style.display = visible ? "none" : "block";
      toggleMatDetailBtn2.textContent = visible ? "詳細▼" : "詳細▲";
    });
  }

  // =======================
  // 探索・戦闘関連
  // =======================

  const exploreStartBtn = document.getElementById("exploreStartBtn");
  if (exploreStartBtn && typeof doExploreEvent === "function") {
    exploreStartBtn.addEventListener("click", () => {
      if (!window.isExploring) {
        const sel = document.getElementById("exploreTarget");
        window.exploringArea = sel ? sel.value : "field";
        window.isExploring = true;
        if (typeof appendLog === "function") {
          appendLog(`${window.exploringArea} での探索を開始した`);
        }
      }
      doExploreEvent(window.exploringArea);
    });
  }

  const attackBtn = document.getElementById("exploreBtn");
  if (attackBtn && typeof playerAttack === "function") {
    attackBtn.addEventListener("click", () => playerAttack());
  }

  const escapeBtn = document.getElementById("escapeBtn");
  if (escapeBtn && typeof tryEscape === "function") {
    escapeBtn.addEventListener("click", () => tryEscape());
  }

  const bossBtn = document.getElementById("bossStartBtn");
  if (bossBtn && typeof startBossBattleFromUI === "function") {
    bossBtn.addEventListener("click", () => startBossBattleFromUI());
  }

  const returnTownBtn = document.getElementById("returnTownBtn");
  if (returnTownBtn) {
    returnTownBtn.addEventListener("click", () => {
      if (window.currentEnemy) {
        appendLog("戦闘中は帰還できない！");
        return;
      }
      window.isExploring = false;
      window.exploringArea = null;
      appendLog("街へ戻った。探索を終了した。");
      if (typeof updateReturnTownButton === "function") {
        updateReturnTownButton();
      }
      if (typeof updateDisplay === "function") {
        updateDisplay();
      }
    });
  }

  const battleItemUseBtn = document.getElementById("useBattleItemBtn");
  if (battleItemUseBtn && typeof useBattleItem === "function") {
    battleItemUseBtn.addEventListener("click", () => useBattleItem());
  }

  const useItemBtn = document.getElementById("useItemBtn");
  if (useItemBtn && typeof usePotionOutsideBattle === "function") {
    useItemBtn.addEventListener("click", () => usePotionOutsideBattle());
  }

  // フィールド料理・飲み物使用
  const eatFoodBtn = document.getElementById("eatFoodBtn");
  if (eatFoodBtn && typeof eatFoodInField === "function") {
    eatFoodBtn.addEventListener("click", () => {
      if (window.currentEnemy) {
        appendLog("戦闘中は料理を食べられない！");
        return;
      }
      eatFoodInField();
    });
  }

  const drinkBtn = document.getElementById("drinkBtn");
  if (drinkBtn && typeof drinkInField === "function") {
    drinkBtn.addEventListener("click", () => {
      if (window.currentEnemy) {
        appendLog("戦闘中は飲み物を飲めない！");
        return;
      }
      drinkInField();
    });
  }

  // =======================
  // 採取関連
  // =======================

  const gatherFieldSel = document.getElementById("gatherField");
  if (gatherFieldSel) {
    const onFieldChange = () => {
      if (typeof refreshGatherTargetSelect === "function") {
        refreshGatherTargetSelect();
      }
    };
    gatherFieldSel.addEventListener("change", onFieldChange);
  }

  const gatherBtn = document.getElementById("gather");
  if (gatherBtn && typeof gather === "function") {
    gatherBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は採取できない！");
        return;
      }
      gather();
      updateGatherMatDetailText();
      updateCraftMatDetailText();
    });
  }

  if (typeof refreshGatherFieldSelect === "function") {
    refreshGatherFieldSelect();
  }

  // =======================
  // 中間素材クラフト
  // =======================

  function initIntermediateCraft() {
    const sel = document.getElementById("intermediateSelect");
    const btn = document.getElementById("craftIntermediateBtn");
    if (!sel || !btn || !Array.isArray(INTERMEDIATE_MATERIALS)) return;

    sel.innerHTML = "";
    INTERMEDIATE_MATERIALS.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      sel.appendChild(opt);
    });

    function updateIntermediateInfo() {
      const id = sel.value;
      const infoEl = document.getElementById("craftCostInfo");
      if (!id) {
        if (infoEl) infoEl.textContent = "必要素材：-";
        return;
      }
      updateCraftCostInfo("material", id);
    }

    sel.addEventListener("change", updateIntermediateInfo);
    updateIntermediateInfo();

    btn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中はクラフトできない！");
        return;
      }
      const id = sel.value;
      if (!id) return;
      if (typeof craftIntermediate === "function") {
        craftIntermediate(id);
        updateIntermediateInfo();
        updateGatherMatDetailText();
        updateCraftMatDetailText();
      }
    });
  }

  initIntermediateCraft();

  // =======================
  // クラフトカテゴリタブ
  // =======================

  const craftCatTabs = document.querySelectorAll(".craft-cat-tab");
  const craftPanels = {
    weapon:   document.getElementById("craftPanelWeapon"),
    armor:    document.getElementById("craftPanelArmor"),
    potion:   document.getElementById("craftPanelPotion"),
    tool:     document.getElementById("craftPanelTool"),
    material: document.getElementById("craftPanelMaterial"),
    cooking:  document.getElementById("craftPanelCooking")
  };

  function setCraftCategory(cat) {
    craftCatTabs.forEach(btn => {
      if (btn.dataset.cat === cat) btn.classList.add("active");
      else                         btn.classList.remove("active");
    });

    Object.keys(craftPanels).forEach(k => {
      if (!craftPanels[k]) return;
      craftPanels[k].style.display = (k === cat) ? "" : "none";
    });

    const infoEl = document.getElementById("craftCostInfo");

    if (cat === "weapon") {
      const sel = document.getElementById("weaponSelect");
      if (sel && sel.value) { updateCraftCostInfo("weapon", sel.value); return; }
    } else if (cat === "armor") {
      const sel = document.getElementById("armorSelect");
      if (sel && sel.value) { updateCraftCostInfo("armor", sel.value); return; }
    } else if (cat === "potion") {
      const sel = document.getElementById("potionSelect");
      if (sel && sel.value) { updateCraftCostInfo("potion", sel.value); return; }
    } else if (cat === "tool") {
      const sel = document.getElementById("toolSelect");
      if (sel && sel.value) { updateCraftCostInfo("tool", sel.value); return; }
    } else if (cat === "material") {
      const sel = document.getElementById("intermediateSelect");
      if (sel && sel.value) { updateCraftCostInfo("material", sel.value); return; }
    } else if (cat === "cooking") {
      if (typeof COOKING_RECIPES !== "undefined") {
        populateCookingSelects();
        const foodSel  = document.getElementById("foodSelect");
        const drinkSel = document.getElementById("drinkSelect");
        const idFood   = foodSel?.value;
        const idDrink  = drinkSel?.value;
        const recipe =
          COOKING_RECIPES.food.find(r => r.id === idFood) ||
          COOKING_RECIPES.drink.find(r => r.id === idDrink) ||
          null;
        updateCookingCostInfo(recipe);
        return;
      }
    }

    if (infoEl) infoEl.textContent = "必要素材：-";
  }

  craftCatTabs.forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat || "weapon";
      setCraftCategory(cat);
    });
  });

  setCraftCategory("weapon");

  // =======================
  // 料理サブタブ初期化
  // =======================

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
      if (sub === "food") {
        panelFood.style.display  = "";
        panelDrink.style.display = "none";

        // ★ 食べ物タブになった瞬間、そのとき選択されている食べ物で必要素材を更新
        const foodSel = document.getElementById("foodSelect");
        if (foodSel && foodSel.value && typeof COOKING_RECIPES !== "undefined") {
          const r = COOKING_RECIPES.food.find(x => x.id === foodSel.value) || null;
          updateCookingCostInfo(r);
        } else {
          updateCookingCostInfo(null);
        }
      } else {
        panelFood.style.display  = "none";
        panelDrink.style.display = "";

        // ★ 飲み物タブになった瞬間、そのとき選択されている飲み物で必要素材を更新
        const drinkSel = document.getElementById("drinkSelect");
        if (drinkSel && drinkSel.value && typeof COOKING_RECIPES !== "undefined") {
          const r = COOKING_RECIPES.drink.find(x => x.id === drinkSel.value) || null;
          updateCookingCostInfo(r);
        } else {
          updateCookingCostInfo(null);
        }
      }
    });
  });

  const first = subTabs[0];
  if (first) first.click();
}

  initCookingSubTabs();

  // =======================
  // 料理クラフトUI初期化
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

    updateGatherMatDetailText();
    updateCraftMatDetailText();
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

  initCookingCraftUI();

  // =======================
  // クラフトボタン・セレクト
  // =======================

  const weaponCraftBtn = document.getElementById("craftWeaponBtn");
  if (weaponCraftBtn && typeof craftWeapon === "function") {
    weaponCraftBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中はクラフトできない！");
        return;
      }
      craftWeapon();
      updateGatherMatDetailText();
      updateCraftMatDetailText();
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
      updateGatherMatDetailText();
      updateCraftMatDetailText();
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
      updateGatherMatDetailText();
      updateCraftMatDetailText();
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
      updateGatherMatDetailText();
      updateCraftMatDetailText();
    });
  }

  const craftTierSelect = document.getElementById("craftTierSelect");
  if (craftTierSelect && typeof refreshEquipSelects === "function") {
    craftTierSelect.addEventListener("change", () => {
      refreshEquipSelects();
      populateCookingSelects();
    });
  }

  const weaponSelect = document.getElementById("weaponSelect");
  if (weaponSelect) {
    weaponSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("weapon", id);
    });
  }

  const armorSelect = document.getElementById("armorSelect");
  if (armorSelect) {
    armorSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("armor", id);
    });
  }

  const potionSelect = document.getElementById("potionSelect");
  if (potionSelect) {
    potionSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("potion", id);
    });
  }

  const toolSelect = document.getElementById("toolSelect");
  if (toolSelect) {
    toolSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("tool", id);
    });
  }

  // =======================
  // 装備関連
  // =======================

  const weaponEquipBtn = document.getElementById("equipWeaponBtn");
  if (weaponEquipBtn && typeof equipWeapon === "function") {
    weaponEquipBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は装備を変更できない！");
        return;
      }
      equipWeapon();
    });
  }

  const armorEquipBtn = document.getElementById("equipArmorBtn");
  if (armorEquipBtn && typeof equipArmor === "function") {
    armorEquipBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は装備を変更できない！");
        return;
      }
      equipArmor();
    });
  }

  const enhanceWeaponBtn = document.getElementById("enhanceWeaponBtn");
  if (enhanceWeaponBtn && typeof enhanceWeapon === "function") {
    enhanceWeaponBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は装備を強化できない！");
        return;
      }
      enhanceWeapon();
    });
  }

  const enhanceArmorBtn = document.getElementById("enhanceArmorBtn");
  if (enhanceArmorBtn && typeof enhanceArmor === "function") {
    enhanceArmorBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は装備を強化できない！");
        return;
      }
      enhanceArmor();
    });
  }

  // =======================
  // 職業・ペット
  // =======================

  const changeJobBtn2 = document.getElementById("changeJobBtn");
  if (changeJobBtn2 && typeof openJobModal === "function") {
    changeJobBtn2.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は職業変更できない！");
        return;
      }
      openJobModal();
    });
  }

  const jobWarriorBtn = document.getElementById("jobWarriorBtn");
  if (jobWarriorBtn && typeof applyJobChange === "function") {
    jobWarriorBtn.addEventListener("click", () => applyJobChange(0));
  }

  const jobMageBtn = document.getElementById("jobMageBtn");
  if (jobMageBtn && typeof applyJobChange === "function") {
    jobMageBtn.addEventListener("click", () => applyJobChange(1));
  }

  const jobTamerBtn = document.getElementById("jobTamerBtn");
  if (jobTamerBtn && typeof applyJobChange === "function") {
    jobTamerBtn.addEventListener("click", () => applyJobChange(2));
  }

  const changePetGrowthBtn2 = document.getElementById("changePetGrowthBtn");
  if (changePetGrowthBtn2 && typeof changePetGrowthType === "function") {
    changePetGrowthBtn2.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中はペット成長タイプを変更できない！");
        return;
      }
      changePetGrowthType();
    });
  }

  const petGrowthModal = document.getElementById("petGrowthModal");
  const petGrowthButtons = document.querySelectorAll("#petGrowthButtons button");
  const petGrowthCloseBtn2 = document.getElementById("petGrowthCloseBtn");
  if (petGrowthModal) {
    petGrowthButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const val = parseInt(btn.dataset.growth, 10);
        if (jobId !== 2) {
          appendLog("動物使いのみ変更できます");
          return;
        }
        window.petGrowthType = val;
        appendLog("ペット成長タイプを変更した");
        if (typeof updateDisplay === "function") updateDisplay();
        petGrowthModal.style.display = "none";
      });
    });
    if (petGrowthCloseBtn2) {
      petGrowthCloseBtn2.addEventListener("click", () => {
        petGrowthModal.style.display = "none";
      });
    }
    petGrowthModal.addEventListener("click", (e) => {
      if (e.target === petGrowthModal) petGrowthModal.style.display = "none";
    });
  }

  // =======================
  // 転生
  // =======================

  const rebirthBtn2 = document.getElementById("rebirthBtn");
  if (rebirthBtn2 && typeof doRebirth === "function") {
    rebirthBtn2.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は転生できない！");
        return;
      }
      doRebirth();
    });
  }

  // =======================
  // ショップ
  // =======================

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

  // =======================
  // 市場
  // =======================

  const marketTabSell = document.getElementById("marketTabSell");
  const marketTabBuy  = document.getElementById("marketTabBuy");
  const marketSellPanel = document.getElementById("marketSellPanel");
  const marketBuyPanel  = document.getElementById("marketBuyPanel");
  if (marketTabSell && marketTabBuy && marketSellPanel && marketBuyPanel) {
    marketTabSell.addEventListener("click", () => {
      marketTabSell.classList.add("active");
      marketTabBuy.classList.remove("active");
      marketSellPanel.style.display = "";
      marketBuyPanel.style.display  = "none";
    });
    marketTabBuy.addEventListener("click", () => {
      marketTabBuy.classList.add("active");
      marketTabSell.classList.remove("active");
      marketBuyPanel.style.display  = "";
      marketSellPanel.style.display = "none";
    });
  }

  const marketSubTabPurchase = document.getElementById("marketSubTabPurchase");
  const marketSubTabOrders   = document.getElementById("marketSubTabOrders");
  const marketSubPagePurchase = document.getElementById("marketSubPagePurchase");
  const marketSubPageOrders   = document.getElementById("marketSubPageOrders");
  if (marketSubTabPurchase && marketSubTabOrders && marketSubPagePurchase && marketSubPageOrders) {
    marketSubTabPurchase.addEventListener("click", () => {
      marketSubTabPurchase.classList.add("active");
      marketSubTabOrders.classList.remove("active");
      marketSubPagePurchase.classList.add("active");
      marketSubPageOrders.classList.remove("active");
      marketSubPagePurchase.style.display = "";
      marketSubPageOrders.style.display   = "none";
    });
    marketSubTabOrders.addEventListener("click", () => {
      marketSubTabOrders.classList.add("active");
      marketSubTabPurchase.classList.remove("active");
      marketSubPageOrders.classList.add("active");
      marketSubPagePurchase.classList.remove("active");
      marketSubPageOrders.style.display   = "";
      marketSubPagePurchase.style.display = "none";
    });
  }

  const marketSellRefreshBtn = document.getElementById("marketSellRefreshBtn");
  if (marketSellRefreshBtn && typeof refreshMarketSellCandidates === "function") {
    marketSellRefreshBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は市場を利用できない！");
        return;
      }
      refreshMarketSellCandidates();
    });
  }

  const marketSellCategory = document.getElementById("marketSellCategory");
  if (marketSellCategory && typeof refreshMarketSellItems === "function") {
    marketSellCategory.addEventListener("change", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は市場を利用できない！");
        return;
      }
      refreshMarketSellItems();
    });
  }

  const marketSellBtn = document.getElementById("marketSellBtn");
  if (marketSellBtn && typeof doMarketSell === "function") {
    marketSellBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は市場を利用できない！");
        return;
      }
      doMarketSell();
    });
  }

  const marketBuyRefreshBtn = document.getElementById("marketBuyRefreshBtn");
  if (marketBuyRefreshBtn && typeof refreshMarketBuyList === "function") {
    marketBuyRefreshBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は市場を利用できない！");
        return;
      }
      refreshMarketBuyList();
    });
  }

  const marketCatTabs2 = document.querySelectorAll(".market-cat-tab");
  marketCatTabs2.forEach(btn => {
    btn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は市場を利用できない！");
        return;
      }
      const cat = btn.dataset.cat || "all";
      if (typeof filterMarketBuyListByCategory === "function") {
        filterMarketBuyListByCategory(cat);
      }
    });
  });

  const marketOrderBtn = document.getElementById("marketOrderBtn");
  if (marketOrderBtn && typeof doMarketOrder === "function") {
    marketOrderBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は市場を利用できない！");
        return;
      }
      doMarketOrder();
    });
  }

  if (typeof refreshMarketSellCandidates === "function") {
    refreshMarketSellCandidates();
  }
  if (typeof refreshMarketBuyList === "function") {
    refreshMarketBuyList();
  }
  if (typeof refreshMarketOrderList === "function") {
    refreshMarketOrderList();
  }

  // =======================
  // 最終表示更新
  // =======================

  if (typeof refreshEquipSelects === "function") {
    refreshEquipSelects();
  }

  updateGatherMatDetailText();
  updateCraftMatDetailText();

  if (typeof refreshCarryFoodDrinkSelects === "function") {
    refreshCarryFoodDrinkSelects();
  }

  if (typeof updateDisplay === "function") {
    updateDisplay();
  }

  if (typeof refreshWarehouseUI === "function") {
    refreshWarehouseUI();
  }
});