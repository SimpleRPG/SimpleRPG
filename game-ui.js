// game-ui.js
// 各種ボタン・タブ・セレクトのイベントバインドとUI制御

console.log("game-ui.js start");

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
// クラフトコスト再計算ヘルパー
// ---------------------------------------
function refreshCurrentCraftCost() {
  const infoEl = document.getElementById("craftCostInfo");
  if (!infoEl) return;

  const activeCatBtn = document.querySelector(".craft-cat-tab.active");
  const cat = activeCatBtn ? activeCatBtn.dataset.cat : "weapon";

  console.log("[refreshCurrentCraftCost] activeCat =", cat);

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
  } else if (cat === "tool") {
    const sel = document.getElementById("toolSelect");
    if (sel && sel.value) {
      updateCraftCostInfo("tool", sel.value);
      return;
    }
  } else if (cat === "material") {
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
      if (drinkSel && drinkSel.value) {
        updateCraftCostInfo("cookingDrink", drinkSel.value);
        return;
      }
    } else {
      if (foodSel && foodSel.value) {
        updateCraftCostInfo("cookingFood", foodSel.value);
        return;
      }
    }
  } else if (cat === "life") {
    // 生活タブ（農園など）のコスト更新
    const activeLifeSubTab = document.querySelector(".life-sub-tab.active");
    const sub = activeLifeSubTab ? activeLifeSubTab.dataset.sub : "farm";
    console.log("[refreshCurrentCraftCost] life sub =", sub);

    if (sub === "farm") {
      const fertSel = document.getElementById("fertilizerSelect");
      console.log("[refreshCurrentCraftCost] fertSel =", fertSel, "value =", fertSel && fertSel.value);
      if (fertSel && fertSel.value) {
        updateCraftCostInfo("fertilizer", fertSel.value);
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
    opt.textContent = f.name;
    fertSelect.appendChild(opt);
  });

  console.log("[initFertilizerSelect] after append, options length =", fertSelect.options.length);
  console.log("[initFertilizerSelect] current value =", fertSelect.value);

  if (fertSelect.value && typeof updateCraftCostInfo === "function") {
    console.log("[initFertilizerSelect] call updateCraftCostInfo('fertilizer',", fertSelect.value, ")");
    updateCraftCostInfo("fertilizer", fertSelect.value);
  } else {
    console.log("[initFertilizerSelect] skip updateCraftCostInfo, value or function missing");
  }

  console.log("=== initFertilizerSelect LEAVE ===");
}

// ---------------------------------------
// DOMContentLoaded 後の初期化
// ---------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  console.log("[DOMContentLoaded] start, window.FERTILIZERS keys =", Object.keys(window.FERTILIZERS || {}));

  // コア初期化
  if (typeof initGame === "function") {
    console.log("[DOMContentLoaded] call initGame");
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

      const infoEl   = document.getElementById("craftCostInfo");
      const activeCatBtn = document.querySelector(".craft-cat-tab.active");
      const activeCat = activeCatBtn ? activeCatBtn.dataset.cat : "weapon";

      console.log("[showTabByPageId] active craft category =", activeCat);

      const w        = document.getElementById("weaponSelect");
      const a        = document.getElementById("armorSelect");
      const p        = document.getElementById("potionSelect");
      const t        = document.getElementById("toolSelect");
      const interSel = document.getElementById("intermediateSelect");
      const foodSel  = document.getElementById("foodSelect");
      const drinkSel = document.getElementById("drinkSelect");
      const fertSel  = document.getElementById("fertilizerSelect");

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
        const activeSubTab = document.querySelector(".cook-sub-tab.active");
        const sub = activeSubTab ? activeSubTab.dataset.sub : "food";
        console.log("[showTabByPageId] cooking sub =", sub);

        if (sub === "drink") {
          if (drinkSel && drinkSel.value) {
            updateCraftCostInfo("cookingDrink", drinkSel.value);
          } else if (infoEl) {
            infoEl.textContent = "必要素材：-";
          }
        } else {
          if (foodSel && foodSel.value) {
            updateCraftCostInfo("cookingFood", foodSel.value);
          } else if (infoEl) {
            infoEl.textContent = "必要素材：-";
          }
        }
      } else if (activeCat === "life") {
        const activeLifeSubTab = document.querySelector(".life-sub-tab.active");
        const sub = activeLifeSubTab ? activeLifeSubTab.dataset.sub : "farm";
        console.log("[showTabByPageId] life sub =", sub, "fertSel =", fertSel, "value =", fertSel && fertSel.value);

        if (sub === "farm") {
          if (fertSel && fertSel.value) {
            updateCraftCostInfo("fertilizer", fertSel.value);
          } else if (infoEl) {
            infoEl.textContent = "必要素材：-";
          }
        } else if (infoEl) {
          infoEl.textContent = "必要素材：-";
        }
      } else if (infoEl) {
        infoEl.textContent = "必要素材：-";
      }

      updateCraftMatDetailText();

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

    setupAutoRepeatButton(exploreStartBtn, () => {
      exploreOnce();
    }, 100);
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
      const foodSel  = document.getElementById("foodSelect");
      const drinkSel = document.getElementById("drinkSelect");
      const activeSubTab = document.querySelector(".cook-sub-tab.active");
      const sub = activeSubTab ? activeSubTab.dataset.sub : "food";

      console.log("[setCraftCategory] cooking sub =", sub);

      if (sub === "drink") {
        if (drinkSel && drinkSel.value) {
          updateCraftCostInfo("cookingDrink", drinkSel.value);
          return;
        }
      } else {
        if (foodSel && foodSel.value) {
          updateCraftCostInfo("cookingFood", foodSel.value);
          return;
        }
      }
    } else if (cat === "life") {
      const activeLifeSubTab = document.querySelector(".life-sub-tab.active");
      const sub = activeLifeSubTab ? activeLifeSubTab.dataset.sub : "farm";
      const fertSel = document.getElementById("fertilizerSelect");

      console.log("[setCraftCategory] life sub =", sub, "fertSel =", fertSel, "options length =", fertSel ? fertSel.options.length : "N/A", "value =", fertSel && fertSel.value);

      if (sub === "farm") {
        if (fertSel && fertSel.value) {
          updateCraftCostInfo("fertilizer", fertSel.value);
          return;
        }
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
          panelFood.style.display  = "";
          panelDrink.style.display = "none";

          if (foodSel && foodSel.value) {
            updateCraftCostInfo("cookingFood", foodSel.value);
          } else if (infoEl) {
            infoEl.textContent = "必要素材：-";
          }
        } else {
          panelFood.style.display  = "none";
          panelDrink.style.display = "";

          if (drinkSel && drinkSel.value) {
            updateCraftCostInfo("cookingDrink", drinkSel.value);
          } else if (infoEl) {
            infoEl.textContent = "必要素材：-";
          }
        }
      });
    });

    const first = subTabs[0];
    console.log("[initCookingSubTabs] first subTab =", first);
    if (first) first.click();
  }

  initCookingSubTabs();

  // --------------------
  // 生活サブタブ（農園など）
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
          if (panelFarm)    panelFarm.style.display = "";
          if (panelHousing) panelHousing.style.display = "none";

          if (fertSel && fertSel.value) {
            updateCraftCostInfo("fertilizer", fertSel.value);
          } else if (infoEl) {
            infoEl.textContent = "必要素材：-";
          }
        } else {
          if (panelFarm)    panelFarm.style.display = "none";
          if (panelHousing) panelHousing.style.display = "";

          if (infoEl) infoEl.textContent = "必要素材：-";
        }
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
      updateGatherMatDetailText();
      updateCraftMatDetailText();
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
      updateGatherMatDetailText();
      updateCraftMatDetailText();
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
      updateGatherMatDetailText();
      updateCraftMatDetailText();
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
      updateGatherMatDetailText();
      updateCraftMatDetailText();
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
      updateGatherMatDetailText();
      updateCraftMatDetailText();
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
      updateGatherMatDetailText();
      updateCraftMatDetailText();
      refreshCurrentCraftCost();
    });
  }

  const craftKindSelect = document.getElementById("craftKindSelect");
  if (craftKindSelect && typeof refreshEquipSelects === "function") {
    craftKindSelect.addEventListener("change", () => {
      refreshEquipSelects();
      refreshCurrentCraftCost();
    });
  }

  const craftTierSelect = document.getElementById("craftTierSelect");
  if (craftTierSelect && typeof refreshEquipSelects === "function") {
    craftTierSelect.addEventListener("change", () => {
      refreshEquipSelects();
      refreshCurrentCraftCost();
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

  const foodSelect = document.getElementById("foodSelect");
  if (foodSelect) {
    foodSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("cookingFood", id);
    });
  }

  const drinkSelect = document.getElementById("drinkSelect");
  if (drinkSelect) {
    drinkSelect.addEventListener("change", e => {
      const id = e.target.value;
      if (id) updateCraftCostInfo("cookingDrink", id);
    });
  }

  const fertSelect = document.getElementById("fertilizerSelect");
  console.log("[fertSelect change-bind] fertSelect =", fertSelect);
  if (fertSelect) {
    fertSelect.addEventListener("change", e => {
      const id = e.target.value;
      console.log("[fertSelect change] id =", id);
      if (id) updateCraftCostInfo("fertilizer", id);
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

    careFarmAllBtn.addEventListener("click", () => {
      careOnce();
    });

    setupAutoRepeatButton(careFarmAllBtn, () => {
      careOnce();
    }, 100);
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

  // ★肥料セレクト初期化
  console.log("[DOMContentLoaded] before initFertilizerSelect, fertSelect =", document.getElementById("fertilizerSelect"));
  initFertilizerSelect();
  console.log("[DOMContentLoaded] after initFertilizerSelect, fertSelect =", document.getElementById("fertilizerSelect"),
              "options length =", (document.getElementById("fertilizerSelect") || {}).options?.length);

  if (typeof openJobModal === "function" && typeof jobId !== "undefined" && jobId === null) {
    openJobModal();
  }

  console.log("[DOMContentLoaded] end");
});