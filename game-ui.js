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

// 素材詳細テキスト更新（クラフト表示用）
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

  // ▼ ここから追加: 中間素材の在庫一覧も表示
  if (typeof window.intermediateMats !== "undefined" &&
      Array.isArray(window.INTERMEDIATE_MATERIALS || INTERMEDIATE_MATERIALS)) {

    const mats = window.intermediateMats || {};
    const src  = window.INTERMEDIATE_MATERIALS || INTERMEDIATE_MATERIALS;

    const interLines = src.map(m => {
      const have = mats[m.id] || 0;
      return `${m.name}: ${have}`;
    });

    if (interLines.length > 0) {
      area.textContent += "\n--- 中間素材 ---\n" + interLines.join("\n");
    }
  }

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

// 買い注文用セレクトの初期化（追加）
function initMarketOrderItemSelect() {
  const sel = document.getElementById("marketOrderItem");
  if (!sel) return;

  sel.innerHTML = "";

  const addOpt = (value, label) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    sel.appendChild(opt);
  };

  // 武器
  if (Array.isArray(window.weapons)) {
    weapons.forEach(w => {
      addOpt(`weapon:${w.id}`, `武器: ${w.name}`);
    });
  }

  // 防具
  if (Array.isArray(window.armors)) {
    armors.forEach(a => {
      addOpt(`armor:${a.id}`, `防具: ${a.name}`);
    });
  }

  // ポーション
  if (Array.isArray(window.potions)) {
    potions.forEach(p => {
      addOpt(`potion:${p.id}`, `ポーション: ${p.name}`);
    });
  }

  // 基本素材
  const baseNames = {
    wood:   "木",
    ore:    "鉱石",
    herb:   "草",
    cloth:  "布",
    leather:"皮",
    water:  "水"
  };
  Object.keys(baseNames).forEach(id => {
    addOpt(`material:${id}`, `素材: ${baseNames[id]}`);
  });
  if (typeof RARE_GATHER_ITEM_ID !== "undefined" && typeof RARE_GATHER_ITEM_NAME !== "undefined") {
    addOpt(`material:${RARE_GATHER_ITEM_ID}`, `素材: ${RARE_GATHER_ITEM_NAME}`);
  }

  // 中間素材
  if (Array.isArray(window.INTERMEDIATE_MATERIALS)) {
    INTERMEDIATE_MATERIALS.forEach(m => {
      addOpt(`material:${m.id}`, `中間素材: ${m.name}`);
    });
  }

  // 料理
  if (typeof COOKING_RECIPES !== "undefined") {
    COOKING_RECIPES.food.forEach(r => {
      addOpt(`material:${r.id}`, `料理: ${r.name}`);
    });
    COOKING_RECIPES.drink.forEach(r => {
      addOpt(`material:${r.id}`, `飲み物: ${r.name}`);
    });
  }
}

// ★ 追加: 今アクティブなクラフトカテゴリのコスト表示を更新する共通ヘルパ
function refreshCurrentCraftCost() {
  const infoEl = document.getElementById("craftCostInfo");
  if (!infoEl) return;

  const activeCatBtn = document.querySelector(".craft-cat-tab.active");
  const cat = activeCatBtn ? activeCatBtn.dataset.cat : "weapon";

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
  }

  infoEl.textContent = "必要素材：-";
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
  // メインタブ切り替え
  // =======================

  const tabButtonsMap = {
    tabGather:    "pageGather",
    tabEquip:     "pageEquip",
    tabExplore:   "pageExplore",
    tabMagicDist: "pageMagicDist",
    tabWarehouse: "pageWarehouse",
    tabStatus:    "pageStatus",
    tabGuild:     "pageGuild",   // ★ ギルドタブを追加
    tabHelp:      "pageHelp"
  };

  const tabPages = Object.values(tabButtonsMap)
    .map(id => document.getElementById(id))
    .filter(Boolean);

  function showTabByPageId(pageId) {
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

    // タブボタンの active 切り替え
    Object.entries(tabButtonsMap).forEach(([btnId, pid]) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      const isActive = (pid === pageId);
      btn.classList.toggle("active", isActive);
    });

    // 魔巧区タブ
    if (pageId === "pageMagicDist") {
      setMagicSubPage("magic-craft");

      if (typeof refreshEquipSelects === "function") {
        refreshEquipSelects();
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
        const activeSubTab = document.querySelector(".cook-sub-tab.active");
        const sub = activeSubTab ? activeSubTab.dataset.sub : "food";

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
    }

    // 倉庫タブ
    if (pageId === "pageWarehouse") {
      if (typeof refreshWarehouseUI === "function") {
        refreshWarehouseUI();
      }
    }

    // ステータスタブ
    if (pageId === "pageStatus") {
      if (typeof refreshStatusUI === "function") {
        refreshStatusUI();
      }
    }

    // ギルドタブ
    if (pageId === "pageGuild") {
      if (typeof renderGuildUI === "function") {
        renderGuildUI();
      }
      // ギルド内サブタブ初期表示（仕様は guild.js にある renderX を呼ぶだけ）
      if (typeof setGuildSubPage === "function") {
        setGuildSubPage("list");
      }
    }

    // 共通の再計算・UI更新
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

  // 初期タブは採取
  showTabByPageId("pageGather");

  // =======================
  // 魔巧区内サブタブ
  // =======================

  const magicTabButtons = document.querySelectorAll(".magic-tab-button");
  const magicSubPages = {
    "magic-craft":   document.getElementById("magicPageCraft"),
    "magic-enhance": document.getElementById("magicPageEnhance"),
    "magic-shop":    document.getElementById("magicPageShop"),
    "magic-market":  document.getElementById("magicPageMarket"),
    "magic-gather":  document.getElementById("magicPageGather")
  };

  function setMagicSubPage(key) {
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
    }
  }

  magicTabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.page || "magic-craft";
      setMagicSubPage(key);
    });
  });

  // =======================
  // ギルド内サブタブ
  // =======================

  const guildTabList   = document.getElementById("guildTabList");
  const guildTabQuest  = document.getElementById("guildTabQuest");
  const guildTabReward = document.getElementById("guildTabReward");

  const guildPageList   = document.getElementById("guildPageList");
  const guildPageQuest  = document.getElementById("guildPageQuest");
  const guildPageReward = document.getElementById("guildPageReward");

  function setGuildSubPage(kind) {
    if (!guildPageList || !guildPageQuest || !guildPageReward) return;

    // ボタンの active 切り替え
    const mapping = {
      list:   guildTabList,
      quest:  guildTabQuest,
      reward: guildTabReward
    };
    [guildTabList, guildTabQuest, guildTabReward].forEach(btn => {
      if (!btn) return;
      btn.classList.toggle("active", btn === mapping[kind]);
    });

    // ページ表示切り替え
    guildPageList.style.display   = (kind === "list")   ? "" : "none";
    guildPageQuest.style.display  = (kind === "quest")  ? "" : "none";
    guildPageReward.style.display = (kind === "reward") ? "" : "none";

    // 中身の再描画（仕様は guild.js にある renderX を呼ぶだけ）
    if (kind === "list") {
      if (typeof renderGuildList === "function") renderGuildList();
    } else if (kind === "quest") {
      if (typeof renderGuildQuests === "function") renderGuildQuests();
    } else if (kind === "reward") {
      if (typeof renderGuildRewards === "function") renderGuildRewards();
    }
  }

  if (guildTabList && guildTabQuest && guildTabReward) {
    guildTabList.addEventListener("click", () => setGuildSubPage("list"));
    guildTabQuest.addEventListener("click", () => setGuildSubPage("quest"));
    guildTabReward.addEventListener("click", () => setGuildSubPage("reward"));
  }

  // =======================
  // 市場タブ・ボタン
  // =======================

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

  initMarketOrderItemSelect();

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

  // ★ ここを撤退仕様に合わせて修正
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

      // game-core-5.js 側の撤退フラグを使う前提
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
        updateGatherMatDetailText();
        updateCraftMatDetailText();
        if (typeof refreshEquipSelects === "function") {
          refreshEquipSelects();
        }
        refreshCurrentCraftCost();
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
      const foodSel  = document.getElementById("foodSelect");
      const drinkSel = document.getElementById("drinkSelect");
      const activeSubTab = document.querySelector(".cook-sub-tab.active");
      const sub = activeSubTab ? activeSubTab.dataset.sub : "food";

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
        const infoEl = document.getElementById("craftCostInfo");
        const foodSel  = document.getElementById("foodSelect");
        const drinkSel = document.getElementById("drinkSelect");

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
    if (first) first.click();
  }

  initCookingSubTabs();

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

  // =======================
  // 装備関連
  // =======================

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
  // 分割UI初期化呼び出し
  // =======================

  if (typeof initWarehouseAndStatusUI === "function") {
    initWarehouseAndStatusUI();
  }
  if (typeof initBattleAndShopUI === "function") {
    initBattleAndShopUI();
  }
  if (typeof initJobPetRebirthUI === "function") {
    initJobPetRebirthUI();
  }
});