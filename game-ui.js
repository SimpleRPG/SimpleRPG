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

// 詳細パネル
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
}

// クラフト
function initCraft() {
  document.getElementById("craftWeaponBtn")?.addEventListener("click", () => craftWeapon());
  document.getElementById("craftArmorBtn") ?.addEventListener("click", () => craftArmor());
  document.getElementById("craftPotionBtn")?.addEventListener("click", () => craftPotion());
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

// 探索・戦闘
function initExploreAndBattle() {
  document.getElementById("exploreStartBtn")?.addEventListener("click", () => doExploreEvent());
  document.getElementById("exploreBtn")     ?.addEventListener("click", () => playerAttack());

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

  // 逃走ボタン（HTML側で id="escapeBtn" に変更して使う）
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

  initGame();
}

// DOM構築完了後に初期化
window.addEventListener("DOMContentLoaded", initUI);