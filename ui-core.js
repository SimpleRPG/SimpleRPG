// ui-core.js
// レイアウト・メインタブ・魔巧区・ギルド・市場・探索/戦闘など共通UI

console.log("ui-core.js start");

// ---------------------------------------
// レイアウト切り替え
// ---------------------------------------
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

// ---------------------------------------
// DOMContentLoaded 後の初期化（コア）
// ---------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  console.log("[DOMContentLoaded core] start, window.FERTILIZERS keys =", Object.keys(window.FERTILIZERS || {}));

  // コア初期化
  if (typeof initGame === "function") {
    console.log("[DOMContentLoaded core] call initGame");
    initGame();
  }

  applyResponsiveLayout();
  window.addEventListener("resize", applyResponsiveLayout);

  // --------------------
  // メインタブ切り替え
  // --------------------
  const tabButtonsMap = {
    tabGather:    "pageGather",
    // tabEquip はHTML側でコメントアウト
    tabExplore:   "pageExplore",
    tabMagicDist: "pageMagicDist",
    tabWarehouse: "pageWarehouse",
    tabStatus:    "pageStatus",
    tabGuild:     "pageGuild",
    tabHelp:      "pageHelp"
  };

  const tabPages = Object.values(tabButtonsMap)
    .map(id => document.getElementById(id))
    .filter(Boolean);

  function showTabByPageId(pageId) {
    console.log("[showTabByPageId] pageId =", pageId);

    // 探索中制限
    if (window.isExploring || window.currentEnemy) {
      const allowed = ["pageExplore", "pageStatus"];
      if (!allowed.includes(pageId)) {
        if (typeof appendLog === "function") {
          appendLog("探索中はその行動はできない！");
        }
        pageId = "pageExplore";
      }
    }

    // ページ表示切り替え
    tabPages.forEach(p => {
      if (!p) return;
      const isActive = (p.id === pageId);
      p.classList.toggle("active", isActive);
    });

    // タブボタン active 切替
    Object.entries(tabButtonsMap).forEach(([btnId, pid]) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      const isActive = (pid === pageId);
      btn.classList.toggle("active", isActive);
    });

    // 魔巧区タブを開いたとき
    if (pageId === "pageMagicDist") {
      console.log("[showTabByPageId] enter pageMagicDist");
      setMagicSubPage("magic-craft");

      if (typeof refreshEquipSelects === "function") {
        refreshEquipSelects();
      }

      // クラフトコスト表示は ui-craft-and-farm.js 側の処理に任せる
      if (typeof refreshCurrentCraftCost === "function") {
        refreshCurrentCraftCost();
      }

      updateCraftMatDetailText?.();

      if (typeof refreshMarketSellCandidates === "function") {
        refreshMarketSellCandidates();
      }
      if (typeof refreshMarketBuyList === "function") {
        refreshMarketBuyList();
      }
      if (typeof refreshMarketOrderList === "function") {
        refreshMarketOrderList();
      }

      // 装備強化タブ用
      if (typeof refreshRepairUI === "function") {
        refreshRepairUI();
      }
    }

    // 倉庫
    if (pageId === "pageWarehouse") {
      if (typeof refreshWarehouseUI === "function") {
        refreshWarehouseUI();
      }
    }

    // ステータス
    if (pageId === "pageStatus") {
      if (typeof refreshStatusUI === "function") {
        refreshStatusUI();
      }
    }

    // ギルド
    if (pageId === "pageGuild") {
      if (typeof renderGuildUI === "function") {
        renderGuildUI();
      }
      if (typeof setGuildSubPage === "function") {
        setGuildSubPage("list");
      }
    }

    // 共通の再計算
    if (typeof recalcStats === "function") {
      recalcStats();
    }
    if (typeof updateDisplay === "function") {
      updateDisplay();
    }
    if (typeof renderPlayerStatusIcons === "function") {
      renderPlayerStatusIcons();
    }
    if (typeof updateEnemyStatusUI === "function") {
      updateEnemyStatusUI();
    }
    if (typeof refreshCarryFoodDrinkSelects === "function") {
      refreshCarryFoodDrinkSelects();
    }
  }

  Object.entries(tabButtonsMap).forEach(([btnId, pageId]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("click", () => {
      showTabByPageId(pageId);
    });
  });

  // 初期タブ
  showTabByPageId("pageGather");

  // --------------------
  // 魔巧区内サブタブ
  // --------------------
  const magicTabButtons = document.querySelectorAll(".magic-tab-button");
  const magicSubPages = {
    "magic-craft":   document.getElementById("magicPageCraft"),
    "magic-enhance": document.getElementById("magicPageEnhance"),
    "magic-shop":    document.getElementById("magicPageShop"),
    "magic-market":  document.getElementById("magicPageMarket"),
    "magic-gather":  document.getElementById("magicPageGather")
  };

  function setMagicSubPage(key) {
    console.log("[setMagicSubPage] key =", key);

    magicTabButtons.forEach(btn => {
      if (btn.dataset.page === key) btn.classList.add("active");
      else                          btn.classList.remove("active");
    });

    Object.entries(magicSubPages).forEach(([k, el]) => {
      if (!el) return;
      el.style.display = (k === key) ? "" : "none";
      if (k === key) el.classList.add("active");
      else           el.classList.remove("active");
    });

    if (key === "magic-shop") {
      if (typeof initShop === "function") {
        initShop();
      }
    } else if (key === "magic-market") {
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
        const marketSellPanel = document.getElementById("marketSellPanel");
        const marketBuyPanel  = document.getElementById("marketBuyPanel");
        const marketTabSell   = document.getElementById("marketTabSell");
        const marketTabBuy    = document.getElementById("marketTabBuy");
        if (marketSellPanel && marketBuyPanel && marketTabSell && marketTabBuy) {
          marketSellPanel.style.display = "";
          marketBuyPanel.style.display  = "none";
          marketTabSell.classList.add("active");
          marketTabBuy.classList.remove("active");
        }
      }
    } else if (key === "magic-gather") {
      if (typeof refreshWarehouseUI === "function") {
        refreshWarehouseUI();
      }
    } else if (key === "magic-enhance") {
      if (typeof refreshRepairUI === "function") {
        refreshRepairUI();
      }
    }
  }

  window.setMagicSubPage = setMagicSubPage;

  magicTabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.page || "magic-craft";
      setMagicSubPage(key);
    });
  });

  // --------------------
  // ギルド内サブタブ
  // --------------------
  const guildTabList   = document.getElementById("guildTabList");
  const guildTabQuest  = document.getElementById("guildTabQuest");
  const guildTabReward = document.getElementById("guildTabReward");

  const guildPageList   = document.getElementById("guildPageList");
  const guildPageQuest  = document.getElementById("guildPageQuest");
  const guildPageReward = document.getElementById("guildPageReward");

  function setGuildSubPage(kind) {
    console.log("[setGuildSubPage] kind =", kind);

    if (!guildPageList || !guildPageQuest || !guildPageReward) return;

    const mapping = {
      list:   guildTabList,
      quest:  guildTabQuest,
      reward: guildTabReward
    };
    [guildTabList, guildTabQuest, guildTabReward].forEach(btn => {
      if (!btn) return;
      btn.classList.toggle("active", btn === mapping[kind]);
    });

    guildPageList.style.display   = (kind === "list")   ? "" : "none";
    guildPageQuest.style.display  = (kind === "quest")  ? "" : "none";
    guildPageReward.style.display = (kind === "reward") ? "" : "none";

    if (kind === "list") {
      if (typeof renderGuildList === "function") {
        renderGuildList();
      }
    } else if (kind === "quest") {
      if (typeof renderGuildQuests === "function") {
        renderGuildQuests();
      }
    } else if (kind === "reward") {
      if (typeof renderGuildRewards === "function") {
        renderGuildRewards();
      }
    }
  }

  window.setGuildSubPage = setGuildSubPage;

  if (guildTabList && guildTabQuest && guildTabReward) {
    guildTabList.addEventListener("click", () => setGuildSubPage("list"));
    guildTabQuest.addEventListener("click", () => setGuildSubPage("quest"));
    guildTabReward.addEventListener("click", () => setGuildSubPage("reward"));
  }

  // --------------------
  // 市場タブ・ボタン
  // --------------------
  const marketSellPanel = document.getElementById("marketSellPanel");
  const marketBuyPanel  = document.getElementById("marketBuyPanel");
  const marketTabSell   = document.getElementById("marketTabSell");
  const marketTabBuy    = document.getElementById("marketTabBuy");

  if (marketSellPanel && marketBuyPanel && marketTabSell && marketTabBuy) {
    marketSellPanel.style.display = "";
    marketBuyPanel.style.display  = "none";
    marketTabSell.classList.add("active");
    marketTabBuy.classList.remove("active");

    marketTabSell.addEventListener("click", () => {
      marketSellPanel.style.display = "";
      marketBuyPanel.style.display  = "none";
      marketTabSell.classList.add("active");
      marketTabBuy.classList.remove("active");
      if (typeof refreshMarketSellCandidates === "function") {
        refreshMarketSellCandidates();
      }
    });

    marketTabBuy.addEventListener("click", () => {
      marketSellPanel.style.display = "none";
      marketBuyPanel.style.display  = "";
      marketTabSell.classList.remove("active");
      marketTabBuy.classList.add("active");
      if (typeof refreshMarketBuyList === "function") {
        refreshMarketBuyList();
      }
    });
  }

  const marketSellBtn        = document.getElementById("marketSellBtn");
  const marketSellRefreshBtn = document.getElementById("marketSellRefreshBtn");
  const marketSellCategory   = document.getElementById("marketSellCategory");

  if (marketSellBtn && typeof doMarketSell === "function") {
    marketSellBtn.addEventListener("click", () => {
      doMarketSell();
    });
  }

  if (marketSellRefreshBtn && typeof refreshMarketSellCandidates === "function") {
    marketSellRefreshBtn.addEventListener("click", () => {
      refreshMarketSellCandidates();
    });
  }

  if (marketSellCategory && typeof refreshMarketSellItems === "function") {
    marketSellCategory.addEventListener("change", () => {
      refreshMarketSellItems();
    });
  }

  const marketBuyRefreshBtn = document.getElementById("marketBuyRefreshBtn");
  if (marketBuyRefreshBtn && typeof refreshMarketBuyList === "function") {
    marketBuyRefreshBtn.addEventListener("click", () => {
      refreshMarketBuyList();
    });
  }

  const marketCatTabs = document.querySelectorAll(".market-cat-tab");
  if (marketCatTabs && marketCatTabs.length > 0 && typeof filterMarketBuyListByCategory === "function") {
    marketCatTabs.forEach(btn => {
      btn.addEventListener("click", () => {
        marketCatTabs.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const cat = btn.dataset.cat || "all";
        filterMarketBuyListByCategory(cat);
      });
    });
  }

  const marketSubTabPurchase = document.getElementById("marketSubTabPurchase");
  const marketSubTabOrders   = document.getElementById("marketSubTabOrders");
  const marketSubPagePurchase= document.getElementById("marketSubPagePurchase");
  const marketSubPageOrders  = document.getElementById("marketSubPageOrders");

  if (marketSubTabPurchase && marketSubTabOrders && marketSubPagePurchase && marketSubPageOrders) {
    marketSubPagePurchase.style.display = "";
    marketSubPageOrders.style.display   = "none";
    marketSubTabPurchase.classList.add("active");
    marketSubTabOrders.classList.remove("active");

    marketSubTabPurchase.addEventListener("click", () => {
      marketSubPagePurchase.style.display = "";
      marketSubPageOrders.style.display   = "none";
      marketSubTabPurchase.classList.add("active");
      marketSubTabOrders.classList.remove("active");
      if (typeof refreshMarketBuyList === "function") {
        refreshMarketBuyList();
      }
    });

    marketSubTabOrders.addEventListener("click", () => {
      marketSubPagePurchase.style.display = "none";
      marketSubPageOrders.style.display   = "";
      marketSubTabPurchase.classList.remove("active");
      marketSubTabOrders.classList.add("active");
      if (typeof refreshMarketOrderList === "function") {
        refreshMarketOrderList();
      }
    });
  }

  const marketOrderBtn = document.getElementById("marketOrderBtn");
  if (marketOrderBtn && typeof doMarketOrder === "function") {
    marketOrderBtn.addEventListener("click", () => {
      doMarketOrder();
    });
  }

  if (typeof initMarketOrderItemSelect === "function") {
    initMarketOrderItemSelect();
  }

  // --------------------
  // 詳細 ON/OFF（ステータス用 + 日替わりボーナス用）
  // --------------------
  // ステータス詳細（detailPanel）
  const statusDetailBtn = document.getElementById("toggleDetailBtn");
  const statusDetailPanel = document.getElementById("detailPanel");

  if (statusDetailBtn && statusDetailPanel) {
    statusDetailBtn.onclick = null;

    statusDetailBtn.addEventListener("click", () => {
      const currentDisplay = window.getComputedStyle(statusDetailPanel).display;
      const visible = currentDisplay !== "none";
      statusDetailPanel.style.display = visible ? "none" : "block";
      statusDetailBtn.textContent = visible ? "▼詳細" : "▲詳細";
    });
  }

  // 日替わりボーナス詳細（dailyBonusDetailPanel）
  const dailyBonusDetailBtn = document.getElementById("toggleDailyBonusDetailBtn");
  const dailyBonusDetailPanel = document.getElementById("dailyBonusDetailPanel");
  const dailyBonusDetailText = document.getElementById("dailyBonusDetailText");

  if (dailyBonusDetailBtn && dailyBonusDetailPanel && dailyBonusDetailText) {
    dailyBonusDetailBtn.onclick = null;

    if (typeof getTodayDailyBonusDetailsText === "function") {
      dailyBonusDetailText.textContent = getTodayDailyBonusDetailsText();
    } else if (typeof getTodayDailyBonusLabel === "function") {
      const label = getTodayDailyBonusLabel();
      dailyBonusDetailText.textContent = `今日の対象: ${label}`;
    }

    dailyBonusDetailBtn.addEventListener("click", () => {
      const visible = window.getComputedStyle(dailyBonusDetailPanel).display !== "none";

      if (!visible && typeof getTodayDailyBonusDetailsText === "function") {
        dailyBonusDetailText.textContent = getTodayDailyBonusDetailsText();
      }

      dailyBonusDetailPanel.style.display = visible ? "none" : "block";
      dailyBonusDetailBtn.textContent = visible ? "▼ボーナス詳細" : "▲ボーナス詳細";
    });
  }

  // 素材詳細 ON/OFF（採取）
  const toggleMatDetailBtn = document.getElementById("toggleMatDetailBtn");
  const gatherMatDetail = document.getElementById("gatherMatDetail");
  if (toggleMatDetailBtn && gatherMatDetail) {
    toggleMatDetailBtn.addEventListener("click", () => {
      updateGatherMatDetailText?.();
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
      updateCraftMatDetailText?.();
      const visible = craftMatDetail.style.display === "block" ||
                      getComputedStyle(craftMatDetail).display === "block";
      craftMatDetail.style.display = visible ? "none" : "block";
      toggleMatDetailBtn2.textContent = visible ? "詳細▼" : "詳細▲";
    });
  }

  // --------------------
  // 探索・戦闘関連
  // --------------------
  const exploreStartBtn = document.getElementById("exploreStartBtn");
  if (exploreStartBtn && typeof doExploreEvent === "function") {
    const exploreOnce = () => {
      if (!window.isExploring) {
        const sel = document.getElementById("exploreTarget");
        window.exploringArea = sel ? sel.value : "field";
        window.isExploring = true;
        if (typeof appendLog === "function") {
          appendLog(`${window.exploringArea} での探索を開始した`);
        }
      }
      doExploreEvent(window.exploringArea);
    };

    exploreStartBtn.addEventListener("click", () => {
      exploreOnce();
    });

    // setupAutoRepeatButton は ui-craft-and-farm.js にあるが、window に生やす想定
    if (typeof setupAutoRepeatButton === "function") {
      setupAutoRepeatButton(exploreStartBtn, () => {
        exploreOnce();
      }, 100);
    }
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
        appendLog("戦闘中は撤退を開始できない！");
        return;
      }
      if (!window.isExploring) {
        appendLog("今は街にいる。");
        return;
      }

      if (window.isRetreating) {
        appendLog(`すでに撤退中だ… 街に着くまであと${window.retreatTurnsLeft}ターン。`);
      } else {
        window.isRetreating = true;
        window.retreatTurnsLeft = (typeof RETREAT_TURNS === "number") ? RETREAT_TURNS : 3;
        appendLog(`街への撤退を開始した… 街に着くまであと${window.retreatTurnsLeft}ターン。`);
      }

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

  // --------------------
  // 装備強化・修理
  // --------------------
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

  const repairTargetSelect = document.getElementById("repairTargetSelect");
  const repairExecBtn      = document.getElementById("repairExecBtn");

  if (repairTargetSelect && typeof updateRepairInfoFromSelect === "function") {
    repairTargetSelect.addEventListener("change", () => {
      updateRepairInfoFromSelect();
    });
  }

  if (repairExecBtn && typeof execRepairSelected === "function") {
    repairExecBtn.addEventListener("click", () => {
      execRepairSelected();
    });
  }

  // --------------------
  // 分割UI初期化呼び出し
  // --------------------
  if (typeof initWarehouseAndStatusUI === "function") {
    initWarehouseAndStatusUI();
  }
  if (typeof initBattleAndShopUI === "function") {
    initBattleAndShopUI();
  }
  if (typeof initJobPetRebirthUI === "function") {
    initJobPetRebirthUI();
  }
  if (typeof initGatherUI === "function") {
    initGatherUI();
  }

  if (typeof initFarmSystem === "function") {
    initFarmSystem();
  }

  console.log("[DOMContentLoaded core] end");
});