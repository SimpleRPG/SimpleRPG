// game-ui-3.js
// 職業・ペット・転生 ＋ ログ ＋ 採取UIまわり

const MAX_LOG_LINES = 50;

function appendLog(msg) {
  const el = document.getElementById("log");
  if (!el) return;

  let lines = el.textContent.split("\n").filter(line => line.trim() !== "");
  lines.unshift(msg);
  if (lines.length > MAX_LOG_LINES) {
    lines = lines.slice(0, MAX_LOG_LINES);
  }
  el.textContent = lines.join("\n");
  el.scrollTop = 0;
}

// ★ペット選択モーダル（動物使い初回用）
// 「今は選ばない」2段階仕様:
// 1回目 → 警告を出して閉じるだけ
// 2回目 → フラグを立てて、最初の機会は二度と表示しない
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
  console.log("initJobPetRebirthUI called");

  // ステータスページ本体は game-ui-4.js の buildStatusPage で構築
  if (typeof buildStatusPage === "function") {
    buildStatusPage();
  }

  // ステータスページ構築後に買い注文セレクトを初期化（実体は market-core2.js 側）
  if (typeof initMarketOrderItemSelect === "function") {
    initMarketOrderItemSelect();
  }

  // ========= 職業 =========
  // html1.js でレイアウトを組み立てる関係で、このタイミングで changeJobBtn が
  // まだ存在しない可能性があるので、あれば即時、なければ後からもう一度試す。
  function bindChangeJobButtonOnce() {
    const changeJobBtn2 = document.getElementById("changeJobBtn");
    console.log("bindChangeJobButtonOnce:", changeJobBtn2, "openJobModal typeof:", typeof openJobModal);
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

  // まずは即時にバインドを試みる
  if (!bindChangeJobButtonOnce()) {
    // うまくいかなかった場合、DOM構築完了後にもう一度だけ試す
    window.addEventListener("load", () => {
      bindChangeJobButtonOnce();
    }, { once: true });
  }

  // ★追加: 職業モーダル内ボタンのイベント初期化
  if (typeof setupJobSelectUI === "function") {
    setupJobSelectUI();
  }

  // ========= ペット成長タイプ =========
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

  // ========= 転生 =========
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

  // ========= 日替わりボーナスラベル（ヘッダー） =========
  const dailyBonusLabelEl = document.getElementById("dailyBonusLabel");
  if (dailyBonusLabelEl && typeof getTodayDailyBonusLabel === "function") {
    const labelText = getTodayDailyBonusLabel();
    if (labelText && labelText !== "なし") {
      dailyBonusLabelEl.textContent = "今日のボーナス：" + labelText;
    } else {
      dailyBonusLabelEl.textContent = "今日のボーナス：なし";
    }

    dailyBonusLabelEl.addEventListener("click", () => {
      const currentLabel = getTodayDailyBonusLabel();
      if (typeof showModal === "function") {
        const msg = [
          "今日の日替わりボーナス：",
          "  " + currentLabel,
          "",
          "・採取ボーナスの日：対象カテゴリの採取量 +10%",
          "・クラフトボーナスの日：対象カテゴリのクラフト成功率 +5%",
          "・戦闘ボーナスの日：対象職業のゴールド +10%、ドロップ率 +10%"
        ].join("\n");
        showModal("日替わりボーナス", msg);
      } else {
        appendLog("今日の日替わりボーナス：" + currentLabel);
      }
    });
  }

  // ========= 最終表示更新 =========
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
}

// --------------------
// 採取UI初期化
// --------------------
function initGatherUI() {
  // 採取フィールド選択
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

  // 採取ボタン
  const gatherBtn = document.getElementById("gather");
  if (gatherBtn && typeof gather === "function") {
    const doGatherOnce = () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は採取できない！");
        return;
      }
      gather();
      updateGatherMatDetailText();
      updateCraftMatDetailText();
    };

    gatherBtn.addEventListener("click", () => {
      doGatherOnce();
    });

    setupAutoRepeatButton(gatherBtn, () => {
      doGatherOnce();
    }, 100);
  }

  // 採取タブ内サブタブ
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

  // 食材調達内サブタブ
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

  // 釣り場・餌
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

  // 狩猟・釣りボタン
  const gatherHuntBtn = document.getElementById("gatherHuntBtn");
  const gatherFishBtn = document.getElementById("gatherFishBtn");

  if (gatherHuntBtn && typeof gatherCooking === "function") {
    const doHuntOnce = () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は採取できない！");
        return;
      }
      gatherCooking("hunt");
      updateGatherMatDetailText();
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
      updateGatherMatDetailText();
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

  // 中間素材クラフト（UI側）
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
}