// game-ui-3.js
// 職業・ペット・転生 ＋ ログまわり

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
  // ステータスページ本体は game-ui-4.js の buildStatusPage で構築
  if (typeof buildStatusPage === "function") {
    buildStatusPage();
  }

  // ステータスページ構築後に買い注文セレクトを初期化（実体は market-core2.js 側）
  if (typeof initMarketOrderItemSelect === "function") {
    initMarketOrderItemSelect();
  }

  // ========= 職業 =========
  const changeJobBtn2 = document.getElementById("changeJobBtn");
  if (changeJobBtn2 && typeof openJobModal === "function") {
    changeJobBtn2.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は職業変更できない！");
        return;
      }
      openJobModal();
    });
  }

  const jobWarriorBtn = document.getElementById("jobWarriorBtn");
  if (jobWarriorBtn) {
    jobWarriorBtn.addEventListener("click", () => {
      const confirmBtn = document.getElementById("jobConfirmBtn");
      const descArea   = document.getElementById("jobDescArea");
      const allBtns    = document.querySelectorAll(".job-select-btn");
      if (allBtns) {
        allBtns.forEach(b => b.classList.toggle("selected", b === jobWarriorBtn));
      }
      if (descArea && typeof JOB_DESCS !== "undefined") {
        descArea.textContent = JOB_DESCS[0] || "";
      }
      if (confirmBtn) confirmBtn.disabled = false;
      if (typeof selectedJobTemp !== "undefined") {
        selectedJobTemp = 0;
      }
    });
  }

  const jobMageBtn = document.getElementById("jobMageBtn");
  if (jobMageBtn) {
    jobMageBtn.addEventListener("click", () => {
      const confirmBtn = document.getElementById("jobConfirmBtn");
      const descArea   = document.getElementById("jobDescArea");
      const allBtns    = document.querySelectorAll(".job-select-btn");
      if (allBtns) {
        allBtns.forEach(b => b.classList.toggle("selected", b === jobMageBtn));
      }
      if (descArea && typeof JOB_DESCS !== "undefined") {
        descArea.textContent = JOB_DESCS[1] || "";
      }
      if (confirmBtn) confirmBtn.disabled = false;
      if (typeof selectedJobTemp !== "undefined") {
        selectedJobTemp = 1;
      }
    });
  }

  const jobTamerBtn = document.getElementById("jobTamerBtn");
  if (jobTamerBtn) {
    jobTamerBtn.addEventListener("click", () => {
      const confirmBtn = document.getElementById("jobConfirmBtn");
      const descArea   = document.getElementById("jobDescArea");
      const allBtns    = document.querySelectorAll(".job-select-btn");
      if (allBtns) {
        allBtns.forEach(b => b.classList.toggle("selected", b === jobTamerBtn));
      }
      if (descArea && typeof JOB_DESCS !== "undefined") {
        descArea.textContent = JOB_DESCS[2] || "";
      }
      if (confirmBtn) confirmBtn.disabled = false;
      if (typeof selectedJobTemp !== "undefined") {
        selectedJobTemp = 2;
      }
    });
  }

  const jobAlchemistBtn = document.getElementById("jobAlchemistBtn");
  if (jobAlchemistBtn) {
    jobAlchemistBtn.addEventListener("click", () => {
      const confirmBtn = document.getElementById("jobConfirmBtn");
      const descArea   = document.getElementById("jobDescArea");
      const allBtns    = document.querySelectorAll(".job-select-btn");
      if (allBtns) {
        allBtns.forEach(b => b.classList.toggle("selected", b === jobAlchemistBtn));
      }
      if (descArea && typeof JOB_DESCS !== "undefined") {
        descArea.textContent = JOB_DESCS[3] || "";
      }
      if (confirmBtn) confirmBtn.disabled = false;
      if (typeof selectedJobTemp !== "undefined") {
        selectedJobTemp = 3;
      }
    });
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