// game-ui-3.js
// 職業・ペット・転生まわりのUI初期化


// ★修正: 農園UIの表示制御ヘルパ（現行レイアウト用の簡易版）
function updateFarmAreaVisibility() {
  // 現在のHTMLでは farmSelectRow / farmSelect / farmArea は存在せず、
  // 「採取 > 食材調達 > 農園」タブの切り替えで表示非表示を制御している。
  // ここでは存在チェックだけに留め、何も隠さない。
  const farmAreaCooking = document.getElementById("farmAreaCooking");
  const farmSlots       = document.getElementById("farmSlots");

  if (!farmAreaCooking || !farmSlots) {
    // 農園UI自体がないレイアウトなら何もしない
    return;
  }

  // 将来レイアウトを変えるとき用のフックとして残すだけ。
  // 必要であればここで farmAreaCooking.style.display をいじる。
}

// farm-core.js の updateFarmUI の最後から呼ぶためのフック
window.onFarmUIUpdated = function() {
  updateFarmAreaVisibility();
};

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


function initJobPetRebirthUI() {
  // =======================
  // 職業・ペット
  // =======================

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
  if (jobWarriorBtn && typeof applyJobChange === "function") {
    jobWarriorBtn.addEventListener("click", () => applyJobChange(0));
  }

  const jobMageBtn = document.getElementById("jobMageBtn");
  if (jobMageBtn && typeof applyJobChange === "function") {
    jobMageBtn.addEventListener("click", () => applyJobChange(1));
  }

  const jobTamerBtn = document.getElementById("jobTamerBtn");
  if (jobTamerBtn && typeof applyJobChange === "function") {
    jobTamerBtn.addEventListener("click", () => applyJobChange(2));
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

  // =======================
  // 転生
  // =======================

  const rebirthBtn2 = document.getElementById("rebirthBtn");
  if (rebirthBtn2 && typeof doRebirth === "function") {
    rebirthBtn2.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は転生できない！");
        return;
      }
      doRebirth();
    });
  }

  // =======================
  // 最終表示更新
  // =======================

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
}