// htmllast.js
// index.html から移せるだけ UI 初期化・イベント系をまとめたファイル
// （ゲームロジックは既存の game-core / market-core / game-ui に任せる）

// グローバル Socket 参照
window.globalSocket = window.globalSocket || null;

// -----------------------------
// 倉庫タブ / 拠点タブの表示切り替え
// -----------------------------
function updateHousingWarehouseTabs() {
  const warehouseBtn = document.getElementById("tabWarehouse");
  const housingBtn   = document.getElementById("tabHousing");

  // ボタンが存在しない場合は何もしない（古いHTMLとの互換）
  if (!warehouseBtn && !housingBtn) return;

  const unlocked = !!window.citizenshipUnlocked;

  if (warehouseBtn) {
    // 市民権が解放されるまでは倉庫タブを見せる
    // 解放されたら倉庫タブは隠す
    warehouseBtn.style.display = unlocked ? "none" : "";
  }
  if (housingBtn) {
    // 拠点タブは市民権解放後にだけ表示
    housingBtn.style.display = unlocked ? "" : "none";
  }
}

// -----------------------------
// メインタブ切り替え
// -----------------------------
function setupMainTabs() {
  const tabDefs = [
    { btn: "tabGather",    page: "pageGather" },
    { btn: "tabExplore",   page: "pageExplore" },
    { btn: "tabMagicDist", page: "pageMagicDist" },
    { btn: "tabWarehouse", page: "pageWarehouse" },
    { btn: "tabStatus",    page: "pageStatus" },
    // ★拠点タブもメインタブとして扱う（表示/非表示は updateHousingWarehouseTabs が担当）
    { btn: "tabHousing",   page: "pageHousing" },
    { btn: "tabGuild",     page: "pageGuild" },
    { btn: "tabHelp",      page: "pageHelp" },
  ];

  const buttons = tabDefs
    .map(d => document.getElementById(d.btn))
    .filter(Boolean);
  const pages = tabDefs
    .map(d => document.getElementById(d.page))
    .filter(Boolean);

  function setMainTab(pageId) {
    tabDefs.forEach(d => {
      const btn = document.getElementById(d.btn);
      const page = document.getElementById(d.page);
      if (!btn || !page) return;
      const active = (d.page === pageId);

      // 非表示のタブが指定された場合は無視（例: 拠点タブが非表示のとき）
      if (active && btn.style.display === "none") {
        return;
      }

      btn.classList.toggle("active", active);
      page.classList.toggle("active", active);
      page.style.display = active ? "" : "none";
    });
  }

  buttons.forEach(dBtn => {
    dBtn.addEventListener("click", () => {
      const def = tabDefs.find(d => d.btn === dBtn.id);
      if (!def) return;
      setMainTab(def.page);
      if (typeof onMainTabChanged === "function") {
        onMainTabChanged(def.page);
      }
    });
  });

  // 初期表示の倉庫 / 拠点タブ状態を反映
  updateHousingWarehouseTabs();

  // 初期タブは採取
  setMainTab("pageGather");
}

// -----------------------------
// ステータス内サブタブ（基本情報 / 統計 / スキルツリー / GMデバッグ）
// -----------------------------
function setStatusSubPage(pageId) {
  const pages = document.querySelectorAll(".status-sub-page");
  pages.forEach(p => {
    p.style.display = (p.id === pageId) ? "block" : "none";
  });
}

function setupStatusTabs() {
  const tabMain  = document.getElementById("statusTabMain");
  const tabStats = document.getElementById("statusTabStats");
  const tabSkill = document.getElementById("statusTabSkill");
  const tabGM    = document.getElementById("statusTabGM");

  const tabs = [tabMain, tabStats, tabSkill, tabGM];

  function activate(tab, pageId) {
    tabs.forEach(t => {
      if (!t) return;
      t.classList.remove("active");
    });
    if (tab) tab.classList.add("active");
    setStatusSubPage(pageId);
  }

  if (tabMain) {
    tabMain.addEventListener("click", () => {
      activate(tabMain, "statusPageMain");
    });
  }
  if (tabStats) {
    tabStats.addEventListener("click", () => {
      activate(tabStats, "statusPageStats");
    });
  }
  if (tabSkill) {
    tabSkill.addEventListener("click", () => {
      activate(tabSkill, "statusPageSkill");
    });
  }
  if (tabGM) {
    tabGM.addEventListener("click", () => {
      activate(tabGM, "statusPageGM");
      // GMタブに切り替えたタイミングでデバッグUIを描画/更新
      if (typeof window.renderGmDebugPanel === "function") {
        window.renderGmDebugPanel();
      } else if (typeof window.initDebugStats === "function") {
        window.initDebugStats();
      }
    });
  }

  // 初期状態: 基本情報
  setStatusSubPage("statusPageMain");
  if (tabMain) tabMain.classList.add("active");
  // GMタブ初期描画（タブを開いたときにも再描画される）
  if (typeof window.initDebugStats === "function") {
    window.initDebugStats();
  }
}

// -----------------------------
// 統計タブ内サブタブ（採取 / クラフト / 戦闘 / 釣り図鑑）
// -----------------------------
function setupStatusStatsTabs() {
  const tabGather = document.getElementById("statusStatsTabGather");
  const tabCraft  = document.getElementById("statusStatsTabCraft");
  const tabBattle = document.getElementById("statusStatsTabBattle");
  const tabFish   = document.getElementById("statusStatsTabFish");

  const tabs = [tabGather, tabCraft, tabBattle, tabFish];

  function showStatsPage(pageId) {
    const pages = document.querySelectorAll(".status-stats-page");
    pages.forEach(p => {
      p.style.display = (p.id === pageId) ? "block" : "none";
    });
  }

  function activate(tab, pageId) {
    tabs.forEach(t => {
      if (!t) return;
      t.classList.remove("active");
    });
    if (tab) tab.classList.add("active");
    showStatsPage(pageId);
  }

  if (tabGather) {
    tabGather.addEventListener("click", () => {
      activate(tabGather, "statusStatsPageGather");
    });
  }
  if (tabCraft) {
    tabCraft.addEventListener("click", () => {
      activate(tabCraft, "statusStatsPageCraft");
    });
  }
  if (tabBattle) {
    tabBattle.addEventListener("click", () => {
      activate(tabBattle, "statusStatsPageBattle");
    });
  }
  if (tabFish) {
    tabFish.addEventListener("click", () => {
      activate(tabFish, "statusStatsPageFish");
    });
  }

  // 初期状態
  showStatsPage("statusStatsPageGather");
  if (tabGather) tabGather.classList.add("active");
}

// -----------------------------
// スキルタブ内サブタブ（ツリー / 効果一覧）
// -----------------------------
function setupStatusSkillTabs() {
  const tabTree  = document.getElementById("statusSkillTabTree");
  const tabBonus = document.getElementById("statusSkillTabBonus");

  const tabs = [tabTree, tabBonus];

  function showSkillPage(pageId) {
    const pages = document.querySelectorAll(".status-skill-page");
    pages.forEach(p => {
      p.style.display = (p.id === pageId) ? "block" : "none";
    });
  }

  function activate(tab, pageId) {
    tabs.forEach(t => {
      if (!t) return;
      t.classList.remove("active");
    });
    if (tab) tab.classList.add("active");
    showSkillPage(pageId);
  }

  if (tabTree) {
    tabTree.addEventListener("click", () => {
      activate(tabTree, "statusSkillTreePage");
    });
  }
  if (tabBonus) {
    tabBonus.addEventListener("click", () => {
      activate(tabBonus, "statusSkillBonusPage");
    });
  }

  // 初期状態
  showSkillPage("statusSkillTreePage");
  if (tabTree) tabTree.classList.add("active");
}

// -----------------------------
// 採取ページ内サブタブ（通常 / 食材調達）
// -----------------------------
function setupGatherSubTabs() {
  const btnNormal  = document.getElementById("gatherTabNormal");
  const btnCooking = document.getElementById("gatherTabCooking");
  const pageNormal = document.getElementById("gatherPageNormal");
  const pageCooking= document.getElementById("gatherPageCooking");
  if (!btnNormal || !btnCooking || !pageNormal || !pageCooking) return;

  function setGatherSub(kind) {
    const isNormal  = kind === "normal";
    btnNormal.classList.toggle("active", isNormal);
    btnCooking.classList.toggle("active", !isNormal);
    pageNormal.style.display  = isNormal ? "" : "none";
    pageNormal.classList.toggle("active", isNormal);
    pageCooking.style.display = !isNormal ? "" : "none";
    pageCooking.classList.toggle("active", !isNormal);
  }

  btnNormal.addEventListener("click", () => setGatherSub("normal"));
  btnCooking.addEventListener("click", () => setGatherSub("cooking"));

  setGatherSub("normal");
}

// 食材調達内サブタブ（狩猟 / 釣り / 農園）
function setupGatherCookingTabs() {
  const btnHunt = document.getElementById("gatherCookTabHunt");
  const btnFish = document.getElementById("gatherCookTabFish");
  const btnFarm = document.getElementById("gatherCookTabFarm");

  const pageHunt = document.getElementById("gatherCookPageHunt");
  const pageFish = document.getElementById("gatherCookPageFish");
  const pageFarm = document.getElementById("gatherCookPageFarm");

  if (!btnHunt || !btnFish || !btnFarm || !pageHunt || !pageFish || !pageFarm) return;

  function setCookingSub(kind) {
    const arr = [
      { kind: "hunt", btn: btnHunt, page: pageHunt },
      { kind: "fish", btn: btnFish, page: pageFish },
      { kind: "farm", btn: btnFarm, page: pageFarm },
    ];
    arr.forEach(e => {
      const active = (e.kind === kind);
      e.btn.classList.toggle("active", active);
      e.page.style.display = active ? "" : "none";
    });
  }

  btnHunt.addEventListener("click", () => setCookingSub("hunt"));
  btnFish.addEventListener("click", () => setCookingSub("fish"));
  btnFarm.addEventListener("click", () => setCookingSub("farm"));

  setCookingSub("hunt");
}

// -----------------------------
// 魔巧区サブタブ（クラフト / 強化 / ショップ / 市場 / 採取拠点）
// -----------------------------
function setupMagicDistTabs() {
  const tabContainer = document.getElementById("magicDistTabs");
  if (!tabContainer) return;

  const btns = Array.from(tabContainer.querySelectorAll(".magic-tab-button"));
  const pageMap = {
    "magic-craft":  "magicPageCraft",
    "magic-enhance":"magicPageEnhance",
    "magic-shop":   "magicPageShop",
    "magic-market": "magicPageMarket",
    "magic-gather": "magicPageGather",
  };

  function setMagicTab(pageKey) {
    btns.forEach(btn => {
      const key = btn.dataset.page;
      btn.classList.toggle("active", key === pageKey);
    });

    Object.keys(pageMap).forEach(key => {
      const pageId = pageMap[key];
      const el = document.getElementById(pageId);
      if (!el) return;
      const active = (key === pageKey);
      el.style.display = active ? "" : "none";
      el.classList.toggle("active", active);
    });
  }

  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.page;
      if (!key) return;
      setMagicTab(key);
    });
  });

  setMagicTab("magic-craft");
}

// 料理クラフト内サブタブ（食べ物 / 飲み物）
function setupCookingCraftTabs() {
  const container = document.getElementById("cookSubTabs");
  if (!container) return;
  const btns = Array.from(container.querySelectorAll(".cook-sub-tab"));
  const panelFood = document.getElementById("cookPanelFood");
  const panelDrink= document.getElementById("cookPanelDrink");
  if (!panelFood || !panelDrink) return;

  function setCookSub(kind) {
    btns.forEach(btn => {
      const k = btn.dataset.sub;
      btn.classList.toggle("active", k === kind);
    });
    const isFood = kind === "food";
    panelFood.style.display  = isFood ? "" : "none";
    panelDrink.style.display = !isFood ? "" : "none";
  }

  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      const k = btn.dataset.sub || "food";
      setCookSub(k);
    });
  });

  setCookSub("food");
}

// -----------------------------
// 倉庫内サブタブ（装備・アイテム / 素材）
// -----------------------------
function setupWarehouseTabs() {
  const btnItems = document.getElementById("warehouseTabItems");
  const btnMats  = document.getElementById("warehouseTabMaterials");
  const pageItems= document.getElementById("warehousePageItems");
  const pageMats = document.getElementById("warehousePageMaterials");
  if (!btnItems || !btnMats || !pageItems || !pageMats) return;

  function setWarehouseTab(kind) {
    const isItems = kind === "items";
    btnItems.classList.toggle("active", isItems);
    btnMats.classList.toggle("active", !isItems);
    pageItems.style.display = isItems ? "" : "none";
    pageItems.classList.toggle("active", isItems);
    pageMats.style.display  = !isItems ? "" : "none";
    pageMats.classList.toggle("active", !isItems);
  }

  btnItems.addEventListener("click", () => setWarehouseTab("items"));
  btnMats.addEventListener("click", () => setWarehouseTab("materials"));

  setWarehouseTab("items");
}

// -----------------------------
// 市場タブ（出品 / 購入）＋購入側サブタブ
// -----------------------------
function setupMarketTabs() {
  const tabSell = document.getElementById("marketTabSell");
  const tabBuy  = document.getElementById("marketTabBuy");
  const panelSell = document.getElementById("marketSellPanel");
  const panelBuy  = document.getElementById("marketBuyPanel");
  if (!tabSell || !tabBuy || !panelSell || !panelBuy) return;

  function setMain(mode) {
    const isSell = mode === "sell";
    tabSell.classList.toggle("active", isSell);
    tabBuy.classList.toggle("active", !isSell);
    panelSell.style.display = isSell ? "" : "none";
    panelBuy.style.display  = !isSell ? "" : "none";

    if (isSell) {
      if (typeof refreshMarketSellCandidates === "function") {
        refreshMarketSellCandidates();
      }
      if (typeof renderMyListings === "function") {
        renderMyListings();
      }
    } else {
      if (typeof refreshMarketBuyList === "function") {
        refreshMarketBuyList();
      }
      if (typeof initMarketOrderItemSelect === "function") {
        initMarketOrderItemSelect();
      }
      if (window.globalSocket) {
        try {
          window.globalSocket.emit("market:list");
          window.globalSocket.emit("market:buyOrder:list");
          window.globalSocket.emit("market:buyOrder:listAll");
        } catch (e) {
          // noop
        }
      } else {
        if (typeof renderMyListings === "function") {
          renderMyListings();
        }
      }
    }
  }

  tabSell.addEventListener("click", () => setMain("sell"));
  tabBuy.addEventListener("click",  () => setMain("buy"));

  // 購入側サブタブ
  const subPurchaseBtn = document.getElementById("marketSubTabPurchase");
  const subOrdersBtn   = document.getElementById("marketSubTabOrders");
  const subPurchasePage= document.getElementById("marketSubPagePurchase");
  const subOrdersPage  = document.getElementById("marketSubPageOrders");

  function setBuySub(kind) {
    const isPurchase = kind === "purchase";
    if (subPurchaseBtn && subOrdersBtn) {
      subPurchaseBtn.classList.toggle("active", isPurchase);
      subOrdersBtn.classList.toggle("active", !isPurchase);
    }
    if (subPurchasePage && subOrdersPage) {
      subPurchasePage.style.display = isPurchase ? "" : "none";
      subPurchasePage.classList.toggle("active", isPurchase);
      subOrdersPage.style.display   = !isPurchase ? "" : "none";
      subOrdersPage.classList.toggle("active", !isPurchase);
    }
  }

  if (subPurchaseBtn && subOrdersBtn) {
    subPurchaseBtn.addEventListener("click", () => setBuySub("purchase"));
    subOrdersBtn.addEventListener("click",   () => setBuySub("orders"));
  }

  setMain("sell");
  setBuySub("purchase");
}

// -----------------------------
// ギルド内タブ切り替え
// -----------------------------
function setupGuildInnerTabs() {
  const guildTabButtons = document.querySelectorAll(".guildTabBtn");
  const guildPaneList   = document.getElementById("guildTab_list");
  const guildPaneQuests = document.getElementById("guildTab_quests");
  const guildPaneRewards= document.getElementById("guildTab_rewards");

  function setGuildTab(tab) {
    if (!guildPaneList || !guildPaneQuests || !guildPaneRewards) return;

    guildTabButtons.forEach(btn => {
      const t = btn.dataset.guildTab;
      btn.classList.toggle("active", t === tab);
    });

    guildPaneList.style.display    = (tab === "list")   ? "" : "none";
    guildPaneQuests.style.display  = (tab === "quests") ? "" : "none";
    guildPaneRewards.style.display = (tab === "rewards")? "" : "none";
  }

  guildTabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const t = btn.dataset.guildTab || "list";
      setGuildTab(t);
    });
  });

  setGuildTab("list");
}

// -----------------------------
// Socket.io 初期化
// -----------------------------
function setupSocketIoClient() {
  try {
    if (typeof io === "undefined") {
      // Socket.io クライアントライブラリが読み込まれていない場合は、静かに諦める
      return;
    }

    const socket = io({
      transports: ["websocket"],
      withCredentials: false,
    });
    window.globalSocket = socket;

    socket.on("connect", () => {
      // 接続時のログ出力は行わない（必要なら appendLog などを再度追加）
      socket.emit("ping-from-client");

      if (typeof window.setupMarketSocketSync === "function") {
        window.setupMarketSocketSync();
      }
    });

    socket.on("pong-from-server", () => {
      // pong 受信時のログ出力は行わない
    });

    socket.on("connect_error", () => {
      // 接続エラー時のログ出力は行わない
    });
  } catch (e) {
    // 初期化エラー時のログ出力も行わない
  }
}

// -----------------------------
// DOMContentLoaded 後の一括初期化
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  setupMainTabs();
  setupStatusTabs();
  setupStatusStatsTabs();
  setupStatusSkillTabs();
  setupGatherSubTabs();
  setupGatherCookingTabs();
  // setupGatherMaterialToggle(); // ← game-ui.js の実装と競合するため削除
  setupMagicDistTabs();
  setupCookingCraftTabs();
  setupWarehouseTabs();
  setupMarketTabs();
  setupGuildInnerTabs();
  // setupStatusDetailToggle(); // ← game-ui.js の実装と競合するため削除
  setupSocketIoClient();
});

// 必要なら setStatusSubPage を他から呼べるように
if (typeof window !== "undefined") {
  window.setStatusSubPage = setStatusSubPage;
}