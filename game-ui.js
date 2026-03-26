// game-ui.js
// 画面側のイベント紐付けとタブ制御

function showTab(tabId) {
  const pages = document.querySelectorAll(".tab-page");
  pages.forEach(p => p.classList.remove("active"));
  const target = document.getElementById(tabId);
  if (target) target.classList.add("active");

  const tabButtons = document.querySelectorAll("#tabs .tab-button");
  tabButtons.forEach(b => b.classList.remove("active"));
  if (tabId === "pageGather")  document.getElementById("tabGather").classList.add("active");
  if (tabId === "pageCraft")   document.getElementById("tabCraft").classList.add("active");
  if (tabId === "pageEquip")   document.getElementById("tabEquip").classList.add("active");
  if (tabId === "pageExplore") document.getElementById("tabExplore").classList.add("active");
  if (tabId === "pageShop")    document.getElementById("tabShop").classList.add("active");
  if (tabId === "pageMarket")  document.getElementById("tabMarket").classList.add("active");
  if (tabId === "pageStatus")  document.getElementById("tabStatus").classList.add("active");
}

// 職業選択モーダルは game-core.js 側の openJobModal/closeJobModal/applyJobChange を使う

function initTabs() {
  document.getElementById("tabGather").onclick  = function(){ showTab("pageGather"); };
  document.getElementById("tabCraft").onclick   = function(){ showTab("pageCraft"); };
  document.getElementById("tabEquip").onclick   = function(){ showTab("pageEquip"); };
  document.getElementById("tabExplore").onclick = function(){ showTab("pageExplore"); };
  document.getElementById("tabShop").onclick    = function(){ showTab("pageShop"); };
  document.getElementById("tabMarket").onclick  = function(){ showTab("pageMarket"); };
  document.getElementById("tabStatus").onclick  = function(){ showTab("pageStatus"); };
}

function initDetailPanel() {
  const btn = document.getElementById("toggleDetailBtn");
  const panel = document.getElementById("detailPanel");
  btn.onclick = function() {
    if (!panel) return;
    if (panel.style.display === "none" || panel.style.display === "") {
      panel.style.display = "block";
      btn.textContent = "▲詳細";
    } else {
      panel.style.display = "none";
      btn.textContent = "▼詳細";
    }
  };
}

function initGather() {
  document.getElementById("gather").onclick = function(){ gather(); };
}

function initCraft() {
  document.getElementById("craftWeaponBtn").onclick = function(){ craftWeapon(); };
  document.getElementById("craftArmorBtn").onclick  = function(){ craftArmor(); };
  document.getElementById("craftPotionBtn").onclick = function(){ craftPotion(); };
}

function initEquip() {
  document.getElementById("equipWeaponBtn").onclick   = function(){ equipWeapon(); };
  document.getElementById("equipArmorBtn").onclick    = function(){ equipArmor(); };
  document.getElementById("enhanceWeaponBtn").onclick = function(){ enhanceWeapon(); };
  document.getElementById("enhanceArmorBtn").onclick  = function(){ enhanceArmor(); };
}

function initRebirth() {
  document.getElementById("rebirthBtn").onclick = function(){ doRebirth(); };
}

// 職業・ペット関連
function initJobAndPet() {
  // 「職業変更」ボタン → モーダルを開く
  document.getElementById("changeJobBtn").onclick  = function(){ openJobModal(); };
  // モーダル内の3ボタン
  document.getElementById("jobWarriorBtn").onclick = function(){ applyJobChange(0); };
  document.getElementById("jobMageBtn").onclick    = function(){ applyJobChange(1); };
  document.getElementById("jobTamerBtn").onclick   = function(){ applyJobChange(2); };

  // ペット成長タイプ変更
  document.getElementById("changePetGrowthBtn").onclick = function(){ changePetGrowthType(); };
}

// 探索・戦闘系
function initExploreAndBattle() {
  // 「探索する」ボタン → 戦闘 or イベント
  document.getElementById("exploreStartBtn").onclick = function(){ doExploreEvent(); };

  // 戦闘中の「攻撃」ボタン
  document.getElementById("exploreBtn").onclick = function(){ playerAttack(); };

  // 魔法／スキルは skill-core 側の関数がある前提
  const castMagicBtn = document.getElementById("castMagicBtn");
  const useSkillBtn  = document.getElementById("useSkillBtn");
  if (castMagicBtn) {
    castMagicBtn.onclick = function() {
      if (typeof castSelectedMagic === "function") {
        castSelectedMagic();
      } else {
        setLog("魔法機能は未実装です");
      }
    };
  }
  if (useSkillBtn) {
    useSkillBtn.onclick = function() {
      if (typeof useSelectedSkill === "function") {
        useSelectedSkill();
      } else {
        setLog("武技機能は未実装です");
      }
    };
  }

  // 戦闘アイテム
  document.getElementById("useBattleItemBtn").onclick = function(){ useBattleItem(); };

  // フィールド使用アイテム
  document.getElementById("useItemBtn").onclick = function(){ usePotionOutsideBattle(); };
}

// ショップ
function initShop() {
  document.getElementById("shopBuyPotion").onclick   = function(){ buyPotion("potion", 60); };
  document.getElementById("shopBuyHiPotion").onclick = function(){ buyPotion("hiPotion", 100); };
  document.getElementById("shopBuyMana").onclick     = function(){ buyPotion("manaPotion", 80); };
  document.getElementById("shopBuyHiMana").onclick   = function(){ buyPotion("hiManaPotion", 120); };
  document.getElementById("shopBuyBomb").onclick     = function(){ buyPotion("bomb", 100); };

  document.getElementById("shopHealHP").onclick = function() {
    const price = 80;
    if (money < price) {
      setLog("お金が足りない（宿屋 80G）");
      return;
    }
    money -= price;
    hp = hpMax;
    setLog("宿屋で休んだ。HPが全回復した。");
    updateDisplay();
  };
}

// 市場UI（market-core.js の関数を呼ぶ想定）
function initMarket() {
  const tabSell = document.getElementById("marketTabSell");
  const tabBuy  = document.getElementById("marketTabBuy");
  const sellPanel = document.getElementById("marketSellPanel");
  const buyPanel  = document.getElementById("marketBuyPanel");

  tabSell.onclick = function() {
    tabSell.classList.add("active");
    tabBuy.classList.remove("active");
    sellPanel.style.display = "";
    buyPanel.style.display  = "none";
  };
  tabBuy.onclick = function() {
    tabBuy.classList.add("active");
    tabSell.classList.remove("active");
    buyPanel.style.display  = "";
    sellPanel.style.display = "none";
  };

  // サブタブ（購入 / 注文）
  const subPurchaseBtn = document.getElementById("marketSubTabPurchase");
  const subOrdersBtn   = document.getElementById("marketSubTabOrders");
  const subPurchase    = document.getElementById("marketSubPagePurchase");
  const subOrders      = document.getElementById("marketSubPageOrders");

  subPurchaseBtn.onclick = function() {
    subPurchaseBtn.classList.add("active");
    subOrdersBtn.classList.remove("active");
    subPurchase.classList.add("active");
    subOrders.classList.remove("active");
  };
  subOrdersBtn.onclick = function() {
    subOrdersBtn.classList.add("active");
    subPurchaseBtn.classList.remove("active");
    subOrders.classList.add("active");
    subPurchase.classList.remove("active");
  };

  // 売却側
  document.getElementById("marketSellRefreshBtn").onclick = function() {
    if (typeof refreshMarketSellCandidates === "function") {
      refreshMarketSellCandidates();
    }
  };
  document.getElementById("marketSellCategory").onchange = function() {
    if (typeof refreshMarketSellItems === "function") {
      refreshMarketSellItems();
    }
  };
  document.getElementById("marketSellBtn").onclick = function() {
    if (typeof doMarketSell === "function") {
      doMarketSell();
    }
  };

  // 購入側
  document.getElementById("marketBuyRefreshBtn").onclick = function() {
    if (typeof refreshMarketBuyList === "function") {
      refreshMarketBuyList();
    }
  };
  const catButtons = document.querySelectorAll(".market-cat-tab");
  catButtons.forEach(function(btn) {
    btn.onclick = function() {
      const cat = btn.dataset.cat || "all";
      if (typeof filterMarketBuyListByCategory === "function") {
        filterMarketBuyListByCategory(cat);
      }
    };
  });

  // 注文側
  document.getElementById("marketOrderBtn").onclick = function() {
    if (typeof doMarketOrder === "function") {
      doMarketOrder();
    }
  };

  // 初期表示更新
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

// スキルUI（skill-core.js 側で定義された更新関数）
function refreshSkillUIs() {
  if (typeof refreshMagicSelect === "function") {
    refreshMagicSelect();
  }
  if (typeof refreshSkillSelect === "function") {
    refreshSkillSelect();
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

  // 最後にゲーム側初期化
  initGame();
}

// ページ読み込み完了時に initUI を呼ぶ
window.addEventListener("load", initUI);