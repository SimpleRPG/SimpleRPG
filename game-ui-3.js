// game-ui-3.js
// 職業・ペット・転生 ＋ ログ ＋ 採取UIまわり

const MAX_LOG_LINES = 50;

function appendLog(msg) {
  const el = document.getElementById("log");
  if (!el) return;

  // ログ内部は本物の改行で管理する
  if (typeof msg === "string") {
    // もしメッセージ側が「\\n」（リテラル）を含んでいたら、本物の改行に変換
    msg = msg.replace(/\\n/g, "\n");
  }

  let lines = el.textContent.split("\n").filter(line => line.trim() !== "");
  lines.unshift(msg);
  if (lines.length > MAX_LOG_LINES) {
    lines = lines.slice(0, MAX_LOG_LINES);
  }
  el.textContent = lines.join("\n");
  el.scrollTop = 0;
}

// ==========================
// 統計系・採取系 UI 共通ヘルパー
// ==========================

// 採取拠点UIを任意コンテナに描画する共通関数
function renderGatherBaseStatusInto(container) {
  if (!container) return;

  container.innerHTML = "";

  if (typeof getGatherBaseLevel !== "function" ||
      typeof tryUpgradeGatherBase !== "function") {
    return;
  }

  const materialDefs = [
    { key: "wood",    label: "木拠点" },
    { key: "ore",     label: "鉱石拠点" },
    { key: "herb",    label: "草拠点" },
    { key: "cloth",   label: "布拠点" },
    { key: "leather", label: "皮拠点" },
    { key: "water",   label: "水拠点" }
  ];

  materialDefs.forEach(def => {
    const level = getGatherBaseLevel(def.key);
    const mode  = (typeof getGatherBaseMode === "function")
      ? getGatherBaseMode(def.key)
      : "normal";

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "4px";
    row.style.fontSize = "11px";

    const labelSpan = document.createElement("span");
    labelSpan.textContent = `${def.label} Lv${level}`;
    row.appendChild(labelSpan);

    const modeLabel = document.createElement("span");
    let modeText = "ノーマル";
    if (mode === "quantity") modeText = "量特化";
    else if (mode === "quality") modeText = "質特化";
    modeLabel.textContent = `（${modeText}）`;
    modeLabel.style.color = "#c0bedf";
    row.appendChild(modeLabel);

    const upBtn = document.createElement("button");
    upBtn.textContent = "Lv+1";
    upBtn.style.fontSize = "10px";
    upBtn.style.padding = "2px 6px";
    upBtn.addEventListener("click", () => {
      tryUpgradeGatherBase(def.key);

      const s1 = document.querySelector("#statusGatherMaterials #gatherBaseStatus");
      if (s1) renderGatherBaseStatusInto(s1);

      const s2 = document.querySelector("#magicPageGather #gatherBaseStatus");
      if (s2) renderGatherBaseStatusInto(s2);
    });
    row.appendChild(upBtn);

    if (typeof setGatherBaseMode === "function") {
      const mkBtn = (txt, modeVal) => {
        const b = document.createElement("button");
        b.textContent = txt;
        b.style.fontSize = "10px";
        b.style.padding = "2px 6px";
        b.addEventListener("click", () => {
          setGatherBaseMode(def.key, modeVal);

          const s1 = document.querySelector("#statusGatherMaterials #gatherBaseStatus");
          if (s1) renderGatherBaseStatusInto(s1);

          const s2 = document.querySelector("#magicPageGather #gatherBaseStatus");
          if (s2) renderGatherBaseStatusInto(s2);
        });
        return b;
      };
      row.appendChild(mkBtn("ノーマル", "normal"));
      row.appendChild(mkBtn("量特化", "quantity"));
      row.appendChild(mkBtn("質特化", "quality"));
    }

    container.appendChild(row);
  });

  if (typeof window.gatherBaseStockTicks !== "undefined") {
    const stockInfo = document.createElement("div");
    stockInfo.style.marginTop = "4px";
    stockInfo.style.fontSize = "11px";
    stockInfo.style.color = "#c0bedf";
    stockInfo.textContent = `自動採取ストック: ${window.gatherBaseStockTicks} tick`;
    container.appendChild(stockInfo);
  }
}

// ★採取素材: T1〜Tn × 基本素材テーブル（在庫表示用）
function renderBasicMaterialTableInto(container) {
  if (!container || typeof window.materials === "undefined") return;

  container.innerHTML = "";

  const names = { wood:"木", ore:"鉱石", herb:"草", cloth:"布", leather:"皮", water:"水" };
  const keys  = ["wood","ore","herb","cloth","leather","water"];

  const table = document.createElement("table");
  table.className = "mat-table";

  const thead = document.createElement("thead");
  const headTr = document.createElement("tr");
  const emptyTh = document.createElement("th");
  emptyTh.textContent = "";
  headTr.appendChild(emptyTh);
  keys.forEach(key => {
    const th = document.createElement("th");
    th.textContent = names[key];
    headTr.appendChild(th);
  });
  thead.appendChild(headTr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  // MATERIAL_MAX_T が定義されていなければ 3 にフォールバック
  const maxTier = (typeof window.MATERIAL_MAX_T === "number" && window.MATERIAL_MAX_T > 0)
    ? window.MATERIAL_MAX_T
    : 3;

  for (let tierNum = 1; tierNum <= maxTier; tierNum++) {
    const tr = document.createElement("tr");
    const tierTh = document.createElement("th");
    tierTh.textContent = `T${tierNum}`;
    tr.appendChild(tierTh);

    keys.forEach(key => {
      const td = document.createElement("td");
      let val = 0;

      // materials-core.js のAPIを優先
      if (typeof getMatTierCount === "function") {
        val = getMatTierCount(key, tierNum);
      } else {
        // フォールバック：配列 index から読む（initMaterials 後の構造）
        const matArr = window.materials[key] || [];
        const idxArr = tierNum - 1;
        val = matArr[idxArr] || 0;
      }

      td.textContent = val;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);

  container.appendChild(table);
}

// 採取統計テーブル（ステータス＞統計タブ内）
// 仕様変更: 「サマリーだけ」にするので、ここでは何も描画しない
function renderGatherStatsTable() {
  const container = document.getElementById("gatherStatsContainer");
  if (!container) return;
  container.innerHTML = "";
}

// 採取素材テーブル群（基本素材 / 料理素材）描画
// ※在庫テーブルは描画せず、拠点ステータスと統計 UI 呼び出しだけ
function renderGatherMaterialTables() {
  const gatherMatListBox = document.getElementById("gatherMaterialsList");
  if (gatherMatListBox) {
    gatherMatListBox.innerHTML = "";
  }

  const cookingMatListBox = document.getElementById("cookingMaterialsList");
  if (cookingMatListBox) {
    cookingMatListBox.innerHTML = "";
  }

  if (typeof getGatherBaseLevel === "function" &&
      typeof tryUpgradeGatherBase === "function") {
    const container = document.getElementById("gatherBaseStatus");
    if (container) renderGatherBaseStatusInto(container);
  }

  // 採取統計 UI 初期化（サマリー＋統計テーブル）
  if (typeof initGatherStatsUI === "function") {
    initGatherStatsUI();
  }
}

// 魚図鑑（ステータス＞統計タブ内）描画
function renderFishDexInGatherTab() {
  const summaryBox = document.getElementById("gatherFishDexSummary");
  const listBox    = document.getElementById("gatherFishDexList");
  if (!summaryBox || !listBox) return;

  listBox.innerHTML = "";

  if (typeof getFishDexList !== "function") {
    summaryBox.textContent = "図鑑: データがありません。";
    return;
  }

  const list = getFishDexList();
  if (!list || !list.length) {
    summaryBox.textContent = "図鑑: まだ魚を釣っていない…";
    return;
  }

  const discovered = list.filter(f => f.discovered);
  const total      = list.length;
  const rareCount  = discovered.filter(f => f.rarity === "legend" || f.rarity === "rare").length;

  summaryBox.textContent = `図鑑: ${discovered.length}/${total} 種（レア魚 ${rareCount}種）`;

  const table = document.createElement("table");
  table.className = "mat-table";

  const thead = document.createElement("thead");
  const htr = document.createElement("tr");
  ["名前", "レア度", "累計匹数", "最大サイズ"].forEach(label => {
    const th = document.createElement("th");
    th.textContent = label;
    htr.appendChild(th);
  });
  thead.appendChild(htr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  list.forEach(f => {
    const tr = document.createElement("tr");
    if (!f.discovered) {
      tr.style.opacity = "0.6";
    }

    const tdName = document.createElement("td");
    tdName.textContent = f.discovered ? f.name : "？？？";

    const tdRare = document.createElement("td");
    let rareText = "-";
    if (f.rarity === "legend")      rareText = "伝説";
    else if (f.rarity === "rare")   rareText = "レア";
    else if (f.rarity === "uncommon") rareText = "アンコモン";
    else rareText = "ノーマル";
    tdRare.textContent = rareText;

    const tdCount = document.createElement("td");
    tdCount.textContent = f.discovered ? (f.count || 0) : 0;

    const tdSize = document.createElement("td");
    tdSize.textContent = f.discovered ? ((f.maxSize || 0) + "cm") : "-";

    tr.appendChild(tdName);
    tr.appendChild(tdRare);
    tr.appendChild(tdCount);
    tr.appendChild(tdSize);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  listBox.appendChild(table);
}

// ステータス＞統計：採取タブ内サブタブ初期化（旧レイアウト用・今は未使用想定）
function initStatusGatherSubTabs() {
  const gatherTabStats  = document.getElementById("statusGatherTabStats");
  const gatherTabFish   = document.getElementById("statusGatherTabFish");
  const gatherPageStats = document.getElementById("statusGatherPageStats");
  const gatherPageFish  = document.getElementById("statusGatherPageFish");

  if (!gatherTabStats || !gatherTabFish || !gatherPageStats || !gatherPageFish) {
    return;
  }

  function setStatusGatherSubPage(kind) {
    const isStats = kind === "stats";
    const isFish  = kind === "fish";

    gatherTabStats.classList.toggle("active", isStats);
    gatherTabFish.classList.toggle("active", isFish);

    gatherPageStats.style.display = isStats ? "" : "none";
    gatherPageFish.style.display  = isFish  ? "" : "none";

    if (isStats) {
      renderGatherStatsTable();
      renderGatherMaterialTables();
      if (typeof initGatherStatsUI === "function") {
        initGatherStatsUI();
      }
    }
    if (isFish) {
      renderFishDexInGatherTab();
    }
  }

  gatherTabStats.addEventListener("click", () => setStatusGatherSubPage("stats"));
  gatherTabFish.addEventListener("click",  () => setStatusGatherSubPage("fish"));

  setStatusGatherSubPage("stats");
}

// --------------------
// 採取統計タブ: 統計サブタブ（採取/クラフト/戦闘/釣り図鑑）
// --------------------
let statusStatsTabsInitialized = false;

// ★ペット選択モーダル（動物使い初回用）
function openCompanionModalIfNeeded() {
  if (window.companionTypeId) return;
  if (window.companionSkipForever) return;

  const modal      = document.getElementById("companionModal");
  const buttons    = modal ? modal.querySelectorAll("#companionButtons button") : null;
  const descArea   = document.getElementById("companionDescArea");
  const confirmBtn = document.getElementById("companionConfirmBtn");
  const cancelBtn  = document.getElementById("companionCancelBtn");

  if (!modal || !buttons || buttons.length === 0 || !confirmBtn || !cancelBtn) return;

  let selectedTypeTemp = null;

  modal.classList.remove("hidden");

  function updateDesc(typeId) {
    if (!descArea || typeof COMPANION_TYPES === "undefined") return;
    const data = COMPANION_TYPES.find(c => String(c.id) === String(typeId));
    descArea.textContent = data ? data.desc : "";
  }

  buttons.forEach(btn => {
    const typeId = btn.dataset.companionType;

    btn.addEventListener("click", () => {
      if (!typeId) return;
      buttons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedTypeTemp = typeId;
      confirmBtn.disabled = false;
      updateDesc(typeId);
    });

    btn.addEventListener("mouseenter", () => {
      if (typeId) updateDesc(typeId);
    });
  });

  confirmBtn.addEventListener("click", () => {
    if (!selectedTypeTemp) return;
    if (typeof setCompanionByTypeId === "function") {
      setCompanionByTypeId(selectedTypeTemp);
    }
    if (typeof recalcStats === "function")  recalcStats();
    if (typeof updateDisplay === "function") updateDisplay();
    modal.classList.add("hidden");
  });

  cancelBtn.addEventListener("click", (e) => {
    if (!window.companionSkipOnce) {
      const ok = window.confirm(
        "最初のペットを選ばずに、今は選ばないを選びますか？\n" +
        "このあとも草原のランダムイベント等で動物と出会える予定です。\n\n" +
        "本当に今はペットを選びませんか？"
      );
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      window.companionSkipOnce = true;
      modal.classList.add("hidden");
      return;
    }

    window.companionSkipForever = true;
    modal.classList.add("hidden");
  });

  confirmBtn.disabled = true;

  if (buttons.length > 0) {
    const firstTypeId = buttons[0].dataset.companionType;
    if (firstTypeId) updateDesc(firstTypeId);
  }
}

// ★UI初期化（職業・ペット・転生まわり）
function initJobPetRebirthUI() {
  if (typeof buildStatusPage === "function") {
    buildStatusPage();
  }

  if (typeof initMarketOrderItemSelect === "function") {
    initMarketOrderItemSelect();
  }

  function bindChangeJobButtonOnce() {
    const changeJobBtn2 = document.getElementById("changeJobBtn");
    if (!changeJobBtn2 || typeof openJobModal !== "function") return false;

    changeJobBtn2.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は職業変更できない！");
        return;
      }
      openJobModal();
    });
    return true;
  }

  if (!bindChangeJobButtonOnce()) {
    window.addEventListener("load", () => {
      bindChangeJobButtonOnce();
    }, { once: true });
  }

  if (typeof setupJobSelectUI === "function") {
    setupJobSelectUI();
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
        if (typeof petGrowthType !== "undefined") {
          petGrowthType = val;
        }
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

  const rebirthBtn2 = document.getElementById("rebirthBtn");
  if (rebirthBtn2 && typeof openRebirthModal === "function") {
    rebirthBtn2.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は転生できない！");
        return;
      }
      openRebirthModal();
    });
  }

  const dailyBonusLabelEl = document.getElementById("dailyBonusLabel");
  if (dailyBonusLabelEl && typeof getTodayDailyBonusLabel === "function") {
    const labelText = getTodayDailyBonusLabel();
    if (labelText && labelText !== "なし") {
      dailyBonusLabelEl.textContent = "今日のボーナス：" + labelText;
    } else {
      dailyBonusLabelEl.textContent = "今日のボーナス：なし";
    }

    dailyBonusLabelEl.addEventListener("click", () => {
      const detailBtn = document.getElementById("toggleDailyBonusDetailBtn");

      if (detailBtn) {
        // ラベルクリックで詳細パネルのトグルボタンを代理クリック
        detailBtn.click();
      } else if (typeof getTodayDailyBonusDetailsText === "function" &&
                 typeof showModal === "function") {
        // パネルがない環境向けフォールバック：詳細テキストをモーダル表示
        showModal("日替わりボーナス", getTodayDailyBonusDetailsText());
      } else {
        // さらに簡易なフォールバック：ラベルだけログに出す
        const currentLabel = getTodayDailyBonusLabel();
        appendLog("今日の日替わりボーナス：" + currentLabel);
      }
    });
  }

  if (typeof refreshEquipSelects === "function") {
    refreshEquipSelects();
  }
  if (typeof updateGatherMatDetailText === "function") {
    updateGatherMatDetailText();
  }
  if (typeof updateCraftMatDetailText === "function") {
    updateCraftMatDetailText();
  }
  if (typeof refreshCarryFoodDrinkSelects === "function") {
    refreshCarryFoodDrinkSelects();
  }
  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
  if (typeof refreshExploreAreaSelect === "function") {
    refreshExploreAreaSelect();
  }
  if (typeof refreshWarehouseUI === "function") {
    refreshWarehouseUI();
  }
  if (typeof refreshHousingStatusAndTab === "function") {
    refreshHousingStatusAndTab();
  }

  if (typeof initGatherStatsUI === "function") {
    initGatherStatsUI();
  }

  const craftCatTabs = document.querySelectorAll("#craftCategoryTabs .craft-cat-tab");
  if (craftCatTabs && craftCatTabs.length > 0) {
    craftCatTabs.forEach(btn => {
      btn.addEventListener("click", () => {
        if (typeof updateCraftMatDetailText === "function") {
          updateCraftMatDetailText();
        }
      });
    });
  }

  // ★拠点タブ内サブタブ（拠点 / 倉庫 / ペット）の初期化
  if (typeof initHousingSubTabs === "function") {
    initHousingSubTabs();
  }
}

// --------------------
// 採取UI初期化
// --------------------
function initGatherUI() {
  const gatherFieldSel = document.getElementById("gatherField");
  if (gatherFieldSel) {
    const onFieldChange = () => {
      if (typeof refreshGatherTargetSelect === "function") {
        refreshGatherTargetSelect();
      }
      if (typeof updateFarmAreaVisibility === "function") {
        updateFarmAreaVisibility();
      }
    };
    gatherFieldSel.addEventListener("change", onFieldChange);
  }

  const farmSelect = document.getElementById("farmSelect");
  if (farmSelect && typeof updateFarmAreaVisibility === "function") {
    farmSelect.addEventListener("change", () => {
      updateFarmAreaVisibility();
    });
  }

  const gatherBtn = document.getElementById("gather");
  if (gatherBtn && typeof gather === "function") {
    const doGatherOnce = () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は採取できない！");
        return;
      }
      gather();
      if (typeof updateGatherMatDetailText === "function") {
        updateGatherMatDetailText();
      }
      if (typeof updateCraftMatDetailText === "function") {
        updateCraftMatDetailText();
      }
      if (typeof refreshGatherStatsUI === "function") {
        refreshGatherStatsUI();
      }
    };

    gatherBtn.addEventListener("click", () => {
      doGatherOnce();
    });

    setupAutoRepeatButton(gatherBtn, () => {
      doGatherOnce();
    }, 100);
  }

  const gatherTabNormal  = document.getElementById("gatherTabNormal");
  const gatherTabCooking = document.getElementById("gatherTabCooking");
  const gatherPageNormal  = document.getElementById("gatherPageNormal");
  const gatherPageCooking = document.getElementById("gatherPageCooking");

  function setGatherSubTab(kind) {
    if (!gatherPageNormal || !gatherPageCooking) return;
    const tabs = [gatherTabNormal, gatherTabCooking];

    tabs.forEach(btn => {
      if (!btn) return;
      const isActive =
        (kind === "normal"  && btn === gatherTabNormal) ||
        (kind === "cooking" && btn === gatherTabCooking);
      btn.classList.toggle("active", isActive);
    });

    if (kind === "normal") {
      gatherPageNormal.style.display  = "";
      gatherPageCooking.style.display = "none";
    } else {
      gatherPageNormal.style.display  = "none";
      gatherPageCooking.style.display = "";
    }
  }

  if (gatherTabNormal && gatherTabCooking) {
    gatherTabNormal.addEventListener("click", () => setGatherSubTab("normal"));
    gatherTabCooking.addEventListener("click", () => setGatherSubTab("cooking"));
    setGatherSubTab("normal");
  }

  const gatherCookTabHunt = document.getElementById("gatherCookTabHunt");
  const gatherCookTabFish = document.getElementById("gatherCookTabFish");
  const gatherCookTabFarm = document.getElementById("gatherCookTabFarm");

  const gatherCookPageHunt = document.getElementById("gatherCookPageHunt");
  const gatherCookPageFish = document.getElementById("gatherCookPageFish");
  const gatherCookPageFarm = document.getElementById("gatherCookPageFarm");

  function setGatherCookingSubTab(kind) {
    if (!gatherCookPageHunt || !gatherCookPageFish || !gatherCookPageFarm) return;

    const tabs = [gatherCookTabHunt, gatherCookTabFish, gatherCookTabFarm];
    tabs.forEach(btn => {
      if (!btn) return;
      const isActive =
        (kind === "hunt" && btn === gatherCookTabHunt) ||
        (kind === "fish" && btn === gatherCookTabFish) ||
        (kind === "farm" && btn === gatherCookTabFarm);
      btn.classList.toggle("active", isActive);
    });

    gatherCookPageHunt.style.display = (kind === "hunt") ? "" : "none";
    gatherCookPageFish.style.display = (kind === "fish") ? "" : "none";
    gatherCookPageFarm.style.display = (kind === "farm") ? "" : "none";

    if (kind === "farm") {
      if (typeof updateFarmAreaVisibility === "function") {
        updateFarmAreaVisibility();
      }
    }
  }

  if (gatherCookTabHunt && gatherCookTabFish && gatherCookTabFarm) {
    gatherCookTabHunt.addEventListener("click", () => setGatherCookingSubTab("hunt"));
    gatherCookTabFish.addEventListener("click", () => setGatherCookingSubTab("fish"));
    gatherCookTabFarm.addEventListener("click", () => setGatherCookingSubTab("farm"));
    setGatherCookingSubTab("hunt");
  }

  window.currentFishingArea = window.currentFishingArea || "river";
  window.currentFishingBait = window.currentFishingBait || "default";

  const fishingAreaSelect = document.getElementById("fishingAreaSelect");
  const fishingBaitSelect = document.getElementById("fishingBaitSelect");

  if (fishingAreaSelect) {
    fishingAreaSelect.addEventListener("change", () => {
      window.currentFishingArea = fishingAreaSelect.value || "river";
    });
  }
  if (fishingBaitSelect) {
    fishingBaitSelect.addEventListener("change", () => {
      window.currentFishingBait = fishingBaitSelect.value || "default";
    });
  }

  const gatherHuntBtn = document.getElementById("gatherHuntBtn");
  const gatherFishBtn = document.getElementById("gatherFishBtn");

  if (gatherHuntBtn && typeof gatherCooking === "function") {
    const doHuntOnce = () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は採取できない！");
        return;
      }
      gatherCooking("hunt");
      if (typeof updateGatherMatDetailText === "function") {
        updateGatherMatDetailText();
      }
      if (typeof refreshGatherStatsUI === "function") {
        refreshGatherStatsUI();
      }
    };

    gatherHuntBtn.addEventListener("click", () => {
      doHuntOnce();
    });

    setupAutoRepeatButton(gatherHuntBtn, () => {
      doHuntOnce();
    }, 100);
  }

  if (gatherFishBtn && typeof gatherCooking === "function") {
    const doFishOnce = () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は採取できない！");
        return;
      }
      gatherCooking("fish");
      if (typeof updateGatherMatDetailText === "function") {
        updateGatherMatDetailText();
      }
      if (typeof refreshGatherStatsUI === "function") {
        refreshGatherStatsUI();
      }
    };

    gatherFishBtn.addEventListener("click", () => {
      doFishOnce();
    });

    setupAutoRepeatButton(gatherFishBtn, () => {
      doFishOnce();
    }, 100);
  }

  if (typeof refreshGatherFieldSelect === "function") {
    refreshGatherFieldSelect();
  }
  if (typeof updateFarmAreaVisibility === "function") {
    updateFarmAreaVisibility();
  }

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
        if (typeof updateGatherMatDetailText === "function") {
          updateGatherMatDetailText();
        }
        if (typeof updateCraftMatDetailText === "function") {
          updateCraftMatDetailText();
        }
        if (typeof refreshEquipSelects === "function") {
          refreshEquipSelects();
        }
        if (typeof refreshCurrentCraftCost === "function") {
          refreshCurrentCraftCost();
        }
      }
    });
  }

  initIntermediateCraft();
}

// ==========================
// ステータス＞統計タブ内サブタブ切り替え
// ==========================
function initStatusStatsSubTabs() {
  const tabGather = document.getElementById("statusStatsTabGather");
  const tabCraft  = document.getElementById("statusStatsTabCraft");
  const tabBattle = document.getElementById("statusStatsTabBattle");
  const tabFish   = document.getElementById("statusStatsTabFish");

  const pageGather = document.getElementById("statusStatsPageGather");
  const pageCraft  = document.getElementById("statusStatsPageCraft");
  const pageBattle = document.getElementById("statusStatsPageBattle");
  const pageFish   = document.getElementById("statusStatsPageFish");

  if (!tabGather || !tabCraft || !tabBattle || !tabFish ||
      !pageGather || !pageCraft || !pageBattle || !pageFish) {
    return;
  }

  function setStatsSubPage(kind) {
    const isGather = kind === "gather";
    const isCraft  = kind === "craft";
    const isBattle = kind === "battle";
    const isFish   = kind === "fish";

    tabGather.classList.toggle("active", isGather);
    tabCraft.classList.toggle("active",  isCraft);
    tabBattle.classList.toggle("active", isBattle);
    tabFish.classList.toggle("active",   isFish);

    pageGather.style.display = isGather ? "block" : "none";
    pageCraft.style.display  = isCraft  ? "block" : "none";
    pageBattle.style.display = isBattle ? "block" : "none";
    pageFish.style.display   = isFish   ? "block" : "none";

    if (isGather) {
      // 統計 UI は gather-stats-ui.js に一本化
      if (typeof renderGatherMaterialTables === "function") {
        renderGatherMaterialTables();
      } else if (typeof initGatherStatsUI === "function") {
        initGatherStatsUI();
      }
    }

    if (isCraft) {
      if (typeof initStatusCraftStats === "function") {
        initStatusCraftStats();
      } else if (typeof renderCraftStatsTable === "function") {
        renderCraftStatsTable();
      }
    }

    if (isBattle) {
      if (typeof initStatusBattleStats === "function") {
        initStatusBattleStats();
      } else if (typeof renderBattleStatsTable === "function") {
        renderBattleStatsTable();
      }
    }

    if (isFish) {
      if (typeof renderFishDexInGatherTab === "function") {
        renderFishDexInGatherTab();
      }
    }
  }

  // イベント登録は一度きりにする
  if (!statusStatsTabsInitialized) {
    statusStatsTabsInitialized = true;

    tabGather.addEventListener("click", () => setStatsSubPage("gather"));
    tabCraft.addEventListener("click",  () => setStatsSubPage("craft"));
    tabBattle.addEventListener("click", () => setStatsSubPage("battle"));
    tabFish.addEventListener("click",   () => setStatsSubPage("fish"));
  }

  // initStatusStatsSubTabs が呼ばれるたび、描画は毎回行う
  setStatsSubPage("gather");
}

// ==========================
// 拠点タブ内サブタブ（拠点 / 倉庫 / ペット）
// ==========================
function initHousingSubTabs() {
  const tabContainer = document.getElementById("housingSubTabs");
  const pageMain = document.getElementById("housingPageMain");
  const pageWh   = document.getElementById("housingPageWarehouse");
  const pagePet  = document.getElementById("housingPagePet");

  if (!tabContainer || !pageMain || !pageWh) return;

  const tabs = tabContainer.querySelectorAll(".housing-sub-tab");
  if (!tabs.length) return;

  function setHousingPage(kind) {
    tabs.forEach(btn => {
      const k = btn.dataset.housingPage;
      btn.classList.toggle("active", k === kind);
    });

    const isMain = (kind === "housing-main");
    const isWh   = (kind === "housing-warehouse");
    const isPet  = (kind === "housing-pet");

    pageMain.style.display = isMain ? "" : "none";
    pageWh.style.display   = isWh ? "" : "none";
    if (pagePet) {
      pagePet.style.display = isPet ? "" : "none";
    }

    // 倉庫サブタブを開いたときに倉庫UIを更新
    if (isWh && typeof refreshWarehouseUI === "function") {
      refreshWarehouseUI();
    }

    // ペットサブタブを開いたときにペットUI描画
    if (isPet && typeof buildHousingPetPage === "function") {
      buildHousingPetPage();
    }
  }

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      const kind = btn.dataset.housingPage;
      if (!kind) return;
      setHousingPage(kind);
    });
  });

  // 初期は拠点ページを表示
  setHousingPage("housing-main");
}