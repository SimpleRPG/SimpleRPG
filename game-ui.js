// game-ui.js
// 各種ボタン・タブ・セレクトのイベントバインドとUI制御

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

// =======================
// 料理関連 ヘルパー
// =======================

// cook-data.js で定義される前提:
// const COOKING_RECIPES = { food: [...], drink: [...] };

// 必要素材テキスト更新（既存 craftCostInfo を流用）
function updateCookingCostInfo(recipe) {
  const costInfo = document.getElementById("craftCostInfo");
  if (!costInfo) return;

  if (!recipe) {
    costInfo.textContent = "必要素材：-";
    return;
  }

  const parts = recipe.requires.map(req => `${req.type}×${req.amount}`);
  costInfo.textContent = "必要素材：" + parts.join(" / ");
}

// 所持素材取得（既存の仕組みに合わせて後で実装）
function getCookingMaterialAmount(type) {
  // ここは craft-data / gather-data 側の実装に合わせて書き換え推奨
  if (typeof getMaterialAmount === "function") {
    return getMaterialAmount(type);
  }
  return 0;
}

// 素材消費
function consumeCookingMaterial(type, amount) {
  if (typeof consumeMaterial === "function") {
    consumeMaterial(type, amount);
  }
}

// インベントリに料理アイテム追加
function addCookingItemToInventory(itemId, amount) {
  if (typeof addItemToInventory === "function") {
    addItemToInventory(itemId, amount);
  }
}

// 素材チェック
function canCraftCooking(recipe) {
  if (!recipe || !recipe.requires) return false;
  return recipe.requires.every(req => {
    const have = getCookingMaterialAmount(req.type);
    return have >= req.amount;
  });
}

// 料理クラフト本体
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

  recipe.requires.forEach(req => {
    consumeCookingMaterial(req.type, req.amount);
  });

  addCookingItemToInventory(recipe.id, 1);

  if (typeof appendLog === "function") {
    appendLog(`${recipe.name} を作成した！`);
  }

  // 素材表示の更新が必要ならここで呼ぶ（例: updateMaterialDisplay など）
}

// 料理セレクトを埋める
function populateCookingSelects() {
  if (typeof COOKING_RECIPES === "undefined") return;

  const foodSelect  = document.getElementById("foodSelect");
  const drinkSelect = document.getElementById("drinkSelect");
  const tierFilter  = document.getElementById("craftTierSelect");
  const currentTier = tierFilter ? tierFilter.value : "all";

  if (foodSelect) {
    foodSelect.innerHTML = "";
    COOKING_RECIPES.food
      .filter(r => currentTier === "all" || r.tier === currentTier)
      .forEach(r => {
        const opt = document.createElement("option");
        opt.value = r.id;
        opt.textContent = `[${r.tier}] ${r.name}`;
        foodSelect.appendChild(opt);
      });
  }

  if (drinkSelect) {
    drinkSelect.innerHTML = "";
    COOKING_RECIPES.drink
      .filter(r => currentTier === "all" || r.tier === currentTier)
      .forEach(r => {
        const opt = document.createElement("option");
        opt.value = r.id;
        opt.textContent = `[${r.tier}] ${r.name}`;
        drinkSelect.appendChild(opt);
      });
  }
}

// 料理クラフトボタンとイベント
function initCookingCraftUI() {
  if (typeof COOKING_RECIPES === "undefined") return;

  const foodSelect   = document.getElementById("foodSelect");
  const drinkSelect  = document.getElementById("drinkSelect");
  const foodBtn      = document.getElementById("craftFoodBtn");
  const drinkBtn     = document.getElementById("craftDrinkBtn");
  const tierFilter   = document.getElementById("craftTierSelect");

  // 初回表示（ティアを見て埋める）
  populateCookingSelects();

  // ティア変更時: セレクトと必要素材更新
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
      const recipe = COOKING_RECIPES.food.find(r => r.id === id);
      updateCookingCostInfo(recipe);
    });
  }

  if (drinkSelect) {
    drinkSelect.addEventListener("change", e => {
      const id = e.target.value;
      const recipe = COOKING_RECIPES.drink.find(r => r.id === id);
      updateCookingCostInfo(recipe);
    });
  }

  if (foodBtn) {
    foodBtn.addEventListener("click", () => {
      const id = foodSelect?.value;
      const recipe = COOKING_RECIPES.food.find(r => r.id === id);
      doCraftCooking(recipe);
    });
  }

  if (drinkBtn) {
    drinkBtn.addEventListener("click", () => {
      const id = drinkSelect?.value;
      const recipe = COOKING_RECIPES.drink.find(r => r.id === id);
      doCraftCooking(recipe);
    });
  }

  // 初期コスト表示
  const initId = foodSelect?.value || drinkSelect?.value;
  const initRecipe =
    COOKING_RECIPES.food.find(r => r.id === initId) ||
    COOKING_RECIPES.drink.find(r => r.id === initId) ||
    null;
  updateCookingCostInfo(initRecipe);
}

// 料理サブタブ（食べ物／飲み物）
function initCookingSubTabs() {
  const subTabs = document.querySelectorAll(".cook-sub-tab");
  const panelFood  = document.getElementById("cookPanelFood");
  const panelDrink = document.getElementById("cookPanelDrink");

  if (!subTabs.length || !panelFood || !panelDrink) return;

  subTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      subTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const sub = tab.dataset.sub; // "food" or "drink"
      if (sub === "food") {
        panelFood.style.display  = "";
        panelDrink.style.display = "none";
      } else {
        panelFood.style.display  = "none";
        panelDrink.style.display = "";
      }
    });
  });

  // 初期状態: 食べ物タブを表示
  const first = subTabs[0];
  if (first) first.click();
}

window.addEventListener("DOMContentLoaded", () => {
  // =======================
  // 初期化
  // =======================
  if (typeof initGame === "function") {
    initGame();
  }

  // 初回レイアウト適用
  applyResponsiveLayout();
  // リサイズ時も更新
  window.addEventListener("resize", applyResponsiveLayout);

  // =======================
  // タブ切り替え（idベース）
  // =======================

  const tabButtonsMap = {
    tabGather:  "pageGather",
    tabCraft:   "pageCraft",
    tabEquip:   "pageEquip",
    tabExplore: "pageExplore",
    tabShop:    "pageShop",
    tabMarket:  "pageMarket",
    tabStatus:  "pageStatus"
  };

  const tabPages = Object.values(tabButtonsMap).map(id => document.getElementById(id));

  function showTabByPageId(pageId) {
    // 探索中・戦闘中のタブ制限
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
      if (pid === pageId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // クラフトタブを開いたときだけクラフトUI更新
    if (pageId === "pageCraft") {
      if (typeof refreshEquipSelects === "function") {
        refreshEquipSelects();
      }

      // 料理リストも毎回更新しておく
      if (typeof COOKING_RECIPES !== "undefined") {
        populateCookingSelects();
      }

      const w = document.getElementById("weaponSelect");
      const a = document.getElementById("armorSelect");
      const p = document.getElementById("potionSelect");
      const t = document.getElementById("toolSelect");
      const interSel = document.getElementById("intermediateSelect");
      const foodSel  = document.getElementById("foodSelect");
      const drinkSel = document.getElementById("drinkSelect");
      const infoEl = document.getElementById("craftCostInfo");

      if (w && w.value)           updateCraftCostInfo("weapon", w.value);
      else if (a && a.value)      updateCraftCostInfo("armor", a.value);
      else if (p && p.value)      updateCraftCostInfo("potion", p.value);
      else if (t && t.value)      updateCraftCostInfo("tool",  t.value);
      else if (interSel && interSel.value)
        updateCraftCostInfo("material", interSel.value);
      else if (foodSel && typeof COOKING_RECIPES !== "undefined") {
        const r = COOKING_RECIPES.food.find(x => x.id === foodSel.value);
        updateCookingCostInfo(r);
      }
      else if (drinkSel && typeof COOKING_RECIPES !== "undefined") {
        const r = COOKING_RECIPES.drink.find(x => x.id === drinkSel.value);
        updateCookingCostInfo(r);
      }
      else if (infoEl)
        infoEl.textContent = "必要素材：-";
    }

    // 市場タブを開いたときに最新状態へ
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
  }

  Object.entries(tabButtonsMap).forEach(([btnId, pageId]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("click", () => {
      showTabByPageId(pageId);
    });
  });

  // 初期タブ（採取）
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
      const visible = gatherMatDetail.style.display === "block";
      gatherMatDetail.style.display = visible ? "none" : "block";
      toggleMatDetailBtn.textContent = visible ? "詳細▼" : "詳細▲";
    });
  }

  // 素材詳細 ON/OFF（クラフト）
  const toggleMatDetailBtn2 = document.getElementById("toggleMatDetailBtn2");
  const craftMatDetail = document.getElementById("craftMatDetail");
  if (toggleMatDetailBtn2 && craftMatDetail) {
    toggleMatDetailBtn2.addEventListener("click", () => {
      const visible = craftMatDetail.style.display === "block";
      craftMatDetail.style.display = visible ? "none" : "block";
      toggleMatDetailBtn2.textContent = visible ? "詳細▼" : "詳細▲";
    });
  }

  // =======================
  // 探索・戦闘関連
  // =======================

  // 探索開始
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

  // 通常攻撃（戦闘）
  const attackBtn = document.getElementById("exploreBtn");
  if (attackBtn && typeof playerAttack === "function") {
    attackBtn.addEventListener("click", () => playerAttack());
  }

  // 逃走
  const escapeBtn = document.getElementById("escapeBtn");
  if (escapeBtn && typeof tryEscape === "function") {
    escapeBtn.addEventListener("click", () => tryEscape());
  }

  // ボス
  const bossBtn = document.getElementById("bossStartBtn");
  if (bossBtn && typeof startBossBattle === "function") {
    bossBtn.addEventListener("click", () => startBossBattle());
  }

  // 街へ戻る
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
      if (typeof updateDisplay === "function") updateDisplay();
    });
  }

  // 戦闘アイテム / フィールドアイテム
  const battleItemUseBtn = document.getElementById("useBattleItemBtn");
  if (battleItemUseBtn && typeof useBattleItem === "function") {
    battleItemUseBtn.addEventListener("click", () => useBattleItem());
  }
  const useItemBtn = document.getElementById("useItemBtn");
  if (useItemBtn && typeof usePotionOutsideBattle === "function") {
    useItemBtn.addEventListener("click", () => usePotionOutsideBattle());
  }

  // =======================
  // 採取関連
  // =======================

  // 料理採取用UI（gatherField === "cook" のときに表示）
  const gatherFieldSel = document.getElementById("gatherField");
  const gatherCookingRow = document.getElementById("gatherCookingRow");
  if (gatherFieldSel && gatherCookingRow) {
    const updateCookingRow = () => {
      if (gatherFieldSel.value === "cook") {
        gatherCookingRow.style.display = "";
      } else {
        gatherCookingRow.style.display = "none";
      }
    };
    gatherFieldSel.addEventListener("change", updateCookingRow);
    updateCookingRow();
  }

  const gatherBtn = document.getElementById("gather");
  if (gatherBtn && typeof gather === "function") {
    gatherBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は採取できない！");
        return;
      }
      gather();
    });
  }

  if (gatherFieldSel && typeof refreshGatherFieldSelect === "function") {
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

    function updateIntermediateInfo(){
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

  function setCraftCategory(cat){
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

  initCookingSubTabs();
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

  const changeJobBtn = document.getElementById("changeJobBtn");
  if (changeJobBtn && typeof openJobModal === "function") {
    changeJobBtn.addEventListener("click", () => {
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

  const changePetGrowthBtn = document.getElementById("changePetGrowthBtn");
  if (changePetGrowthBtn && typeof changePetGrowthType === "function") {
    changePetGrowthBtn.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中はペット成長タイプを変更できない！");
        return;
      }
      changePetGrowthType();
    });
  }

  const petGrowthModal = document.getElementById("petGrowthModal");
  const petGrowthButtons = document.querySelectorAll("#petGrowthButtons button");
  const petGrowthCloseBtn = document.getElementById("petGrowthCloseBtn");
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
    if (petGrowthCloseBtn) {
      petGrowthCloseBtn.addEventListener("click", () => {
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

  const rebirthBtn = document.getElementById("rebirthBtn");
  if (rebirthBtn && typeof doRebirth === "function") {
    rebirthBtn.addEventListener("click", () => {
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
  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
});