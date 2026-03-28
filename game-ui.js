// game-ui.js
// 画面側のイベント紐付けとタブ制御

function showTab(tabId) {
  const pages = document.querySelectorAll(".tab-page");
  pages.forEach(p => p.classList.remove("active"));
  const target = document.getElementById(tabId);
  if (target) target.classList.add("active");

  const tabButtons = document.querySelectorAll("#tabs .tab-button");
  tabButtons.forEach(b => b.classList.remove("active"));
  if (tabId === "pageGather")  document.getElementById("tabGather") ?.classList.add("active");
  if (tabId === "pageCraft")   document.getElementById("tabCraft")  ?.classList.add("active");
  if (tabId === "pageEquip")   document.getElementById("tabEquip")  ?.classList.add("active");
  if (tabId === "pageExplore") document.getElementById("tabExplore")?.classList.add("active");
  if (tabId === "pageShop")    document.getElementById("tabShop")   ?.classList.add("active");
  if (tabId === "pageMarket")  document.getElementById("tabMarket") ?.classList.add("active");
  if (tabId === "pageStatus")  document.getElementById("tabStatus") ?.classList.add("active");
}

// タブボタン
function initTabs() {
  document.getElementById("tabGather") ?.addEventListener("click", () => showTab("pageGather"));
  document.getElementById("tabCraft")  ?.addEventListener("click", () => showTab("pageCraft"));
  document.getElementById("tabEquip")  ?.addEventListener("click", () => showTab("pageEquip"));
  document.getElementById("tabExplore")?.addEventListener("click", () => showTab("pageExplore"));
  document.getElementById("tabShop")   ?.addEventListener("click", () => showTab("pageShop"));
  document.getElementById("tabMarket") ?.addEventListener("click", () => showTab("pageMarket"));
  document.getElementById("tabStatus") ?.addEventListener("click", () => showTab("pageStatus"));
}

// 詳細パネル（ステータスバー）
function initDetailPanel() {
  const btn = document.getElementById("toggleDetailBtn");
  const panel = document.getElementById("detailPanel");
  if (!btn || !panel) return;
  btn.addEventListener("click", () => {
    if (panel.style.display === "none" || panel.style.display === "") {
      panel.style.display = "block";
      btn.textContent = "▲詳細";
    } else {
      panel.style.display = "none";
      btn.textContent = "▼詳細";
    }
  });
}

// 採取
function initGather() {
  document.getElementById("gather")?.addEventListener("click", () => gather());

  // 素材詳細トグル（採取タブ）
  const btn1 = document.getElementById("toggleMatDetailBtn");
  const detail1 = document.getElementById("gatherMatDetail");
  if (btn1 && detail1) {
    btn1.addEventListener("click", () => {
      const shown = detail1.style.display === "block";
      detail1.style.display = shown ? "none" : "block";
      btn1.textContent = shown ? "詳細▼" : "詳細▲";
    });
  }

  // 素材詳細トグル（クラフトタブ）
  const btn2 = document.getElementById("toggleMatDetailBtn2");
  const detail2 = document.getElementById("craftMatDetail");
  if (btn2 && detail2) {
    btn2.addEventListener("click", () => {
      const shown = detail2.style.display === "block";
      detail2.style.display = shown ? "none" : "block";
      btn2.textContent = shown ? "詳細▼" : "詳細▲";
    });
  }
}

// 中間素材クラフト初期化
// game-ui.js
function initIntermediateCraft(){
  const sel = document.getElementById("intermediateSelect");
  const btn = document.getElementById("craftIntermediateBtn");
  const info = document.getElementById("intermediateInfo");
  if (!sel || !btn || !info) return;

  if (Array.isArray(INTERMEDIATE_MATERIALS)) {
    sel.innerHTML = "";
    INTERMEDIATE_MATERIALS.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      sel.appendChild(opt);
    });
  }

  // ★ 選択中中間素材の必要素材を表示
  const baseNames = {
    wood:   "木",
    ore:    "鉱石",
    herb:   "草",
    cloth:  "布",
    leather:"皮",
    water:  "水"
  };

  function updateIntermediateInfo(){
    const id = sel.value;
    const def = INTERMEDIATE_MATERIALS.find(m => m.id === id);
    if (!def || !def.from) {
      info.textContent = "素材から板材・インゴットなどを作成します。";
      return;
    }
    const parts = [];
    Object.keys(def.from).forEach(baseKey => {
      const tierInfo = def.from[baseKey]; // 例: { t1:3 }
      Object.keys(tierInfo).forEach(tierKey => {
        const need = tierInfo[tierKey];
        const m = materials[baseKey];
        const have = m ? (m[tierKey] || 0) : 0;
        const tierLabel = tierKey.toUpperCase(); // "t1" → "T1"
        const name = baseNames[baseKey] || baseKey;
        parts.push(`${tierLabel}${name} ${have}/${need}`);
      });
    });
    info.textContent = "必要素材：" + parts.join("、");
  }

  sel.addEventListener("change", updateIntermediateInfo);
  updateIntermediateInfo(); // 初期表示

  btn.addEventListener("click", () => {
    const id = sel.value;
    if (!id) return;
    if (typeof craftIntermediate === "function") {
      craftIntermediate(id);
      updateIntermediateInfo(); // 作成後に所持数更新
    }
  });
}

// クラフトカテゴリ切り替え
function setCraftCategory(cat){
  const tabs   = document.querySelectorAll("#craftCategoryTabs .craft-cat-tab");
  const panels = {
    weapon:   document.getElementById("craftPanelWeapon"),
    armor:    document.getElementById("craftPanelArmor"),
    potion:   document.getElementById("craftPanelPotion"),
    tool:     document.getElementById("craftPanelTool"),
    material: document.getElementById("craftPanelMaterial")
  };

  tabs.forEach(btn => {
    if (btn.dataset.cat === cat) btn.classList.add("active");
    else                         btn.classList.remove("active");
  });

  Object.keys(panels).forEach(k => {
    if (!panels[k]) return;
    panels[k].style.display = (k === cat) ? "" : "none";
  });

  const infoEl = document.getElementById("craftCostInfo");

  if (cat === "weapon") {
    const sel = document.getElementById("weaponSelect");
    if (sel && sel.value) {
      updateCraftCostInfo("weapon", sel.value);
      return;
    }
  } else if (cat === "armor") {
    const sel = document.getElementById("armorSelect");
    if (sel && sel.value) {
      updateCraftCostInfo("armor", sel.value);
      return;
    }
  } else if (cat === "potion") {
    const sel = document.getElementById("potionSelect");
    if (sel && sel.value) {
      updateCraftCostInfo("potion", sel.value);
      return;
    }
  } else if (cat === "tool") {                         // ★これを追加
    const sel = document.getElementById("toolSelect");
    if (sel && sel.value) {
      updateCraftCostInfo("tool", sel.value);
      return;
    }
  }

  if (infoEl) infoEl.textContent = "必要素材：-";
}

function initCraftCategoryTabs(){
  const container = document.getElementById("craftCategoryTabs");
  if (!container) return;
  const tabs = container.querySelectorAll(".craft-cat-tab");
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat || "weapon";
      setCraftCategory(cat);
    });
  });

  setCraftCategory("weapon");
}

// クラフト
function initCraft() {
  const wSel = document.getElementById("weaponSelect");
  const aSel = document.getElementById("armorSelect");
  const pSel = document.getElementById("potionSelect");

  document.getElementById("craftWeaponBtn")
    ?.addEventListener("click", () => craftWeapon());
  document.getElementById("craftArmorBtn")
    ?.addEventListener("click", () => craftArmor());
  document.getElementById("craftPotionBtn")
    ?.addEventListener("click", () => craftPotion());

  if (wSel) {
    wSel.addEventListener("change", () => {
      updateCraftCostInfo("weapon", wSel.value);
    });
  }
  if (aSel) {
    aSel.addEventListener("change", () => {
      updateCraftCostInfo("armor", aSel.value);
    });
  }
  if (pSel) {
    pSel.addEventListener("change", () => {
      updateCraftCostInfo("potion", pSel.value);
    });
  }

  const tierSel = document.getElementById("craftTierSelect");
  if (tierSel) {
    tierSel.addEventListener("change", () => {
      if (typeof refreshEquipSelects === "function") {
        refreshEquipSelects();
      }
    });
  }

  initCraftCategoryTabs();
  initIntermediateCraft();
}

// 装備
function initEquip() {
  document.getElementById("equipWeaponBtn")  ?.addEventListener("click", () => equipWeapon());
  document.getElementById("equipArmorBtn")   ?.addEventListener("click", () => equipArmor());
  document.getElementById("enhanceWeaponBtn")?.addEventListener("click", () => enhanceWeapon());
  document.getElementById("enhanceArmorBtn") ?.addEventListener("click", () => enhanceArmor());
}

// 転生
function initRebirth() {
  document.getElementById("rebirthBtn")?.addEventListener("click", () => doRebirth());
}

// 職業・ペット
function initJobAndPet() {
  document.getElementById("changeJobBtn")      ?.addEventListener("click", () => openJobModal());
  document.getElementById("jobWarriorBtn")     ?.addEventListener("click", () => applyJobChange(0));
  document.getElementById("jobMageBtn")        ?.addEventListener("click", () => applyJobChange(1));
  document.getElementById("jobTamerBtn")       ?.addEventListener("click", () => applyJobChange(2));
  document.getElementById("changePetGrowthBtn")?.addEventListener("click", () => changePetGrowthType());
}

function initPetGrowthModal() {
  const modal   = document.getElementById("petGrowthModal");
  const buttons = document.querySelectorAll("#petGrowthButtons button");
  const closeBtn= document.getElementById("petGrowthCloseBtn");
  if (!modal) return;

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const val = parseInt(btn.dataset.growth, 10);
      if (jobId !== 2) {
        appendLog("動物使いのみ変更できます");
        return;
      }
      petGrowthType = val;
      appendLog(`ペット成長タイプを「${getPetGrowthTypeName()}」に変更した`);
      updateDisplay();
      modal.style.display = "none";
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
}

// 探索・戦闘
// 探索・戦闘
function initExploreAndBattle() {
  // 探索開始・継続ボタン
  const exploreStartBtn = document.getElementById("exploreStartBtn");
  if (exploreStartBtn) {
    exploreStartBtn.addEventListener("click", () => {
      // isExploring / exploringArea は game-core-3.js 側で定義しておく想定
      if (!window.isExploring) {
        // 初回：このエリアで探索開始
        if (typeof getCurrentArea === "function") {
          window.exploringArea = getCurrentArea();
        } else {
          window.exploringArea = "field";
        }
        window.isExploring = true;
        if (typeof appendLog === "function") {
          appendLog(`${window.exploringArea} での探索を開始した`);
        }
      }
      // 探索中：現在の探索エリアでイベント発生
      if (typeof doExploreEvent === "function") {
        doExploreEvent(window.exploringArea);
      }
    });
  }

  // 「街へ戻る」ボタン（index.html 側に returnTownBtn を追加しておく）
  const returnBtn = document.getElementById("returnTownBtn");
  if (returnBtn) {
    returnBtn.addEventListener("click", () => {
      if (window.currentEnemy) {
        if (typeof appendLog === "function") {
          appendLog("戦闘中は帰還できない！");
        }
        return;
      }
      window.isExploring = false;
      window.exploringArea = null;
      if (typeof appendLog === "function") {
        appendLog("街へ戻った。探索を終了した。");
      }
      if (typeof updateDisplay === "function") {
        updateDisplay();
      }
    });
  }

  // 通常攻撃・ボス・スキルなどはそのまま
  document.getElementById("exploreBtn")?.addEventListener("click", () => playerAttack());

  const bossBtn = document.getElementById("bossStartBtn");
  if (bossBtn) {
    bossBtn.addEventListener("click", () => {
      if (typeof startBossBattle === "function") {
        startBossBattle();
      }
    });
  }

  const castMagicBtn = document.getElementById("castMagicBtn");
  const useSkillBtn  = document.getElementById("useSkillBtn");
  if (castMagicBtn) {
    castMagicBtn.addEventListener("click", () => {
      if (typeof castSelectedMagic === "function") {
        castSelectedMagic();
      } else {
        setLog("魔法機能は未実装です");
      }
    });
  }
  if (useSkillBtn) {
    useSkillBtn.addEventListener("click", () => {
      if (typeof useSelectedSkill === "function") {
        useSelectedSkill();
      } else {
        setLog("武技機能は未実装です");
      }
    });
  }

  document.getElementById("useBattleItemBtn")?.addEventListener("click", () => useBattleItem());
  document.getElementById("useItemBtn")      ?.addEventListener("click", () => usePotionOutsideBattle());

  const escapeBtn = document.getElementById("escapeBtn");
  if (escapeBtn) {
    escapeBtn.addEventListener("click", () => {
      if (typeof tryEscape === "function") {
        tryEscape();
      }
    });
  }
}

// ショップ
function initShop() {
  document.getElementById("shopBuyPotion")  ?.addEventListener("click", () => buyPotion("potion", 60));
  document.getElementById("shopBuyHiPotion")?.addEventListener("click", () => buyPotion("hiPotion", 100));
  document.getElementById("shopBuyMana")    ?.addEventListener("click", () => buyPotion("manaPotion", 80));
  document.getElementById("shopBuyHiMana")  ?.addEventListener("click", () => buyPotion("hiManaPotion", 120));
  document.getElementById("shopBuyBomb")    ?.addEventListener("click", () => buyPotion("bomb", 100));

  const healBtn = document.getElementById("shopHealHP");
  if (healBtn) {
    healBtn.addEventListener("click", () => {
      const price = 80;
      if (money < price) {
        setLog("お金が足りない（宿屋 80G）");
        return;
      }
      money -= price;
      hp = hpMax;
      setLog("宿屋で休んだ。HPが全回復した。");
      updateDisplay();
    });
  }
}

// 市場
function initMarket() {
  const tabSell = document.getElementById("marketTabSell");
  const tabBuy  = document.getElementById("marketTabBuy");
  const sellPanel = document.getElementById("marketSellPanel");
  const buyPanel  = document.getElementById("marketBuyPanel");

  if (tabSell && tabBuy && sellPanel && buyPanel) {
    tabSell.addEventListener("click", () => {
      tabSell.classList.add("active");
      tabBuy.classList.remove("active");
      sellPanel.style.display = "";
      buyPanel.style.display  = "none";
    });
    tabBuy.addEventListener("click", () => {
      tabBuy.classList.add("active");
      tabSell.classList.remove("active");
      buyPanel.style.display  = "";
      sellPanel.style.display = "none";
    });
  }

  const subPurchaseBtn = document.getElementById("marketSubTabPurchase");
  const subOrdersBtn   = document.getElementById("marketSubTabOrders");
  const subPurchase    = document.getElementById("marketSubPagePurchase");
  const subOrders      = document.getElementById("marketSubPageOrders");

  if (subPurchaseBtn && subOrdersBtn && subPurchase && subOrders) {
    subPurchaseBtn.addEventListener("click", () => {
      subPurchaseBtn.classList.add("active");
      subOrdersBtn.classList.remove("active");
      subPurchase.classList.add("active");
      subOrders.classList.remove("active");
    });
    subOrdersBtn.addEventListener("click", () => {
      subOrdersBtn.classList.add("active");
      subPurchaseBtn.classList.remove("active");
      subOrders.classList.add("active");
      subPurchase.classList.remove("active");
    });
  }

  const sellRefresh = document.getElementById("marketSellRefreshBtn");
  if (sellRefresh) {
    sellRefresh.addEventListener("click", () => {
      if (typeof refreshMarketSellCandidates === "function") {
        refreshMarketSellCandidates();
      }
    });
  }
  const sellCat = document.getElementById("marketSellCategory");
  if (sellCat) {
    sellCat.addEventListener("change", () => {
      if (typeof refreshMarketSellItems === "function") {
        refreshMarketSellItems();
      }
    });
  }
  const sellBtn = document.getElementById("marketSellBtn");
  if (sellBtn) {
    sellBtn.addEventListener("click", () => {
      if (typeof doMarketSell === "function") {
        doMarketSell();
      }
    });
  }

  const buyRefresh = document.getElementById("marketBuyRefreshBtn");
  if (buyRefresh) {
    buyRefresh.addEventListener("click", () => {
      if (typeof refreshMarketBuyList === "function") {
        refreshMarketBuyList();
      }
    });
  }
  const catButtons = document.querySelectorAll(".market-cat-tab");
  catButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat || "all";
      if (typeof filterMarketBuyListByCategory === "function") {
        filterMarketBuyListByCategory(cat);
      }
    });
  });

  const orderBtn = document.getElementById("marketOrderBtn");
  if (orderBtn) {
    orderBtn.addEventListener("click", () => {
      if (typeof doMarketOrder === "function") {
        doMarketOrder();
      }
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
}

// 初期化
function initUI() {
  initTabs();
  initDetailPanel();
  initGather();
  initCraft();
  initEquip();
  initRebirth();
  initJobAndPet();
  initExploreAndBattle();
  initShop();
  initMarket();
  initPetGrowthModal();

  initGame();
}

window.addEventListener("DOMContentLoaded", initUI);