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
      console.log("Socket.io client library not loaded (io is undefined)");
      if (typeof appendLog === "function") {
        appendLog("[SYS] Socket.ioクライアントが読み込まれていません");
      }
      return;
    }

    const socket = io({
      transports: ["websocket"],
      withCredentials: false,
    });
    window.globalSocket = socket;

    socket.on("connect", () => {
      console.log("Socket.io connected:", socket.id);
      if (typeof appendLog === "function") {
        appendLog("[SYS] Socket.io接続: " + socket.id);
      }
      socket.emit("ping-from-client");

      if (typeof window.setupMarketSocketSync === "function") {
        window.setupMarketSocketSync();
      }
    });

    socket.on("pong-from-server", () => {
      console.log("Received pong-from-server");
      if (typeof appendLog === "function") {
        appendLog("[SYS] サーバーからpong受信");
      }
    });

    socket.on("connect_error", (err) => {
      console.log("Socket.io connect_error:", err.message);
      if (typeof appendLog === "function") {
        appendLog("[SYS] Socket接続エラー: " + err.message);
      }
    });
  } catch (e) {
    console.log("Socket.io init error:", e);
    if (typeof appendLog === "function") {
      appendLog("[SYS] Socket.io初期化エラー: " + e.message);
    }
  }
}

// -----------------------------
// DOMContentLoaded 後の一括初期化
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  setupMainTabs();
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