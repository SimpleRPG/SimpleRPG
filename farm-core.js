// farm-core.js
// 畑・菜園システム（4スロット＋成長ポイント制・選択式詳細パネル）
// 前提: cookingMats, COOKING_MAT_NAMES, appendLog, updateDisplay, makeSaveData/applySaveData などが存在

// =======================
// 設定
// =======================

// スロット数（畑＋菜園あわせて4）
const FARM_SLOT_COUNT = 4;

// 成熟に必要な成長ポイント
const FARM_GROW_NEEDED = 20;

// 収穫量（1スロットあたり）を範囲指定（ここを調整すれば 4〜6 などに変更可能）
const FARM_HARVEST_MIN = 4;
const FARM_HARVEST_MAX = 6;

// 手入れの成長+2、その他（採取・探索など）は+1とする
const FARM_GROW_DELTA_CARE    = 2;
const FARM_GROW_DELTA_DEFAULT = 1;

// 謎の種ID（無料・消費なし）
const FARM_MYSTERY_SEED_ID = "farm_mystery_seed";

// 畑で育てられる料理素材一覧
// category: "field" = 畑, "garden" = 菜園
const FARM_CROPS = {
  // 野菜・穀物系（元々畑で取っていたもの） → 畑
  veg_leaf_crisp:   { name: "シャキシャキ葉菜",   category: "field" },
  veg_root_rough:   { name: "ゴロゴロ根菜",       category: "field" },
  veg_premium:      { name: "高級野菜",           category: "field" },
  grain_ancient:    { name: "古代穀物",           category: "field" },

  // それ以外 → 菜園寄り扱い
  veg_mountain:     { name: "山菜",               category: "garden" },
  veg_herb_aroma:   { name: "香草",               category: "garden" },

  // 追加食材
  veg_mushroom_aroma: { name: "香るキノコ",       category: "garden" },
  veg_spice:          { name: "香辛料",           category: "garden" },
  veg_dried:          { name: "乾物",             category: "garden" },

  grain_coarse:       { name: "粗挽き穀物",       category: "field" },
  grain_refined:      { name: "精製穀物",         category: "field" },
  grain_mochi:        { name: "もちもち穀物",     category: "field" },

  spice_salt_rock:    { name: "岩塩",             category: "garden" },
  spice_pepper:       { name: "胡椒",             category: "garden" },
  spice_premium:      { name: "高級スパイス",     category: "garden" },
  spice_secret:       { name: "秘伝スパイス",     category: "garden" }
};

// =======================
// 状態
// =======================

// slots[i] = {
//   cropId: null | 料理素材ID or FARM_MYSTERY_SEED_ID,
//   growth: 0〜FARM_GROW_NEEDED,
//   ready:  boolean（収穫可能か）
// }
// selectedIndex: 現在選択中の区画（0〜3、未選択なら null）
window.farmState = window.farmState || {
  slots: Array.from({ length: FARM_SLOT_COUNT }, () => ({
    cropId: null,
    growth: 0,
    ready: false
  })),
  selectedIndex: 0
};

// 内部ヘルパ
function getFarmSlot(index) {
  const st = window.farmState;
  if (!st || !Array.isArray(st.slots)) return null;
  if (index < 0 || index >= st.slots.length) return null;
  return st.slots[index];
}

// ランダム作物を1つ選ぶ（FARM_CROPS 全体から）
function pickRandomFarmCropId() {
  const keys = Object.keys(FARM_CROPS);
  if (!keys.length) return null;
  const idx = Math.floor(Math.random() * keys.length);
  return keys[idx];
}

// 収穫量を [FARM_HARVEST_MIN, FARM_HARVEST_MAX] の範囲でランダム決定
function getRandomHarvestAmount() {
  const min = Math.ceil(FARM_HARVEST_MIN);
  const max = Math.floor(FARM_HARVEST_MAX);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// =======================
// 成長ポイント加算
// =======================

// source: "care" / "gather" / "explore" など
function addFarmGrowthPoint(source) {
  const st = window.farmState;
  if (!st || !Array.isArray(st.slots)) return;

  const delta = (source === "care")
    ? FARM_GROW_DELTA_CARE
    : FARM_GROW_DELTA_DEFAULT;

  if (delta <= 0) return;

  let anyChanged = false;

  st.slots.forEach(slot => {
    if (!slot) return;
    if (!slot.cropId) return;   // 何も植えてない
    if (slot.ready) return;     // すでに成熟

    slot.growth += delta;
    if (slot.growth >= FARM_GROW_NEEDED) {
      slot.growth = FARM_GROW_NEEDED;
      slot.ready = true;
      anyChanged = true;
    } else {
      anyChanged = true;
    }
  });

  if (anyChanged && typeof updateFarmUI === "function") {
    updateFarmUI();
  }
}

// =======================
// スキル経験値振り分けヘルパ
// =======================

function addFarmSkillExpByCropId(cropId) {
  // 謎の種自体にはカテゴリがないのでスキル経験値は付与しない
  if (!cropId || cropId === FARM_MYSTERY_SEED_ID || typeof addGatherSkillExp !== "function") return;

  const info = FARM_CROPS[cropId];
  const cat  = info && info.category ? info.category : "field"; // デフォ畑

  if (!window.gatherSkills) return;

  if (cat === "field") {
    if (window.gatherSkills.fieldFarm) {
      addGatherSkillExp("fieldFarm");
    }
  } else if (cat === "garden") {
    if (window.gatherSkills.garden) {
      addGatherSkillExp("garden");
    }
  }
}

// =======================
// 植える・収穫・手入れ
// =======================

// スロットに作物を植える
// index: 0〜3, selectedId: FARM_CROPS のキー or FARM_MYSTERY_SEED_ID
function plantFarmSlot(index, selectedId) {
  const slot = getFarmSlot(index);
  if (!slot) return;

  // 謎の種の場合: 消費なしで、そのまま謎の種として植える（中身は収穫時に決定）
  if (selectedId === FARM_MYSTERY_SEED_ID) {
    slot.cropId = FARM_MYSTERY_SEED_ID;
    slot.growth = 0;
    slot.ready  = false;

    appendLog("畑に 謎の種 を植えた");
    if (typeof updateFarmUI === "function") {
      updateFarmUI();
    }
    if (typeof updateDisplay === "function") {
      updateDisplay();
    }
    return;
  }

  // 通常作物の場合は FARM_CROPS にあるかチェック
  const cropId = selectedId;
  if (!FARM_CROPS[cropId]) {
    appendLog("この作物は畑では育てられない");
    return;
  }

  // 手持ちの作物を1つ消費（連作でも毎回）
  if (typeof cookingMats !== "object") {
    appendLog("料理素材の保管オブジェクトが未定義です（cookingMats）");
    return;
  }
  const have = cookingMats[cropId] || 0;
  if (have <= 0) {
    const name = COOKING_MAT_NAMES[cropId] || FARM_CROPS[cropId].name || cropId;
    appendLog(`${name}を持っていないので植えられない`);
    return;
  }
  cookingMats[cropId] = have - 1;

  // ここまで来たら cropId は必ず FARM_CROPS 上の有効ID
  slot.cropId = cropId;
  slot.growth = 0;
  slot.ready  = false;

  const name = COOKING_MAT_NAMES[cropId] || FARM_CROPS[cropId].name || cropId;
  appendLog(`畑に ${name} の種を植えた`);
  if (typeof updateFarmUI === "function") {
    updateFarmUI();
  }
  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

// スロットを収穫する（連作仕様＋収穫量ランダム）
function harvestFarmSlot(index) {
  const slot = getFarmSlot(index);
  if (!slot) return;
  if (!slot.cropId) {
    appendLog("何も植わっていない");
    return;
  }
  if (!slot.ready) {
    appendLog("まだ収穫には早いようだ");
    return;
  }

  // 実際に収穫するIDを決める
  let harvestId = slot.cropId;
  let shownNameForLog = null;

  if (slot.cropId === FARM_MYSTERY_SEED_ID) {
    // 謎の種: ここで初めて中身をランダムに決める
    const randId = pickRandomFarmCropId();
    if (!randId) {
      appendLog("育てられる作物がないようだ…");
      return;
    }
    harvestId = randId;
    shownNameForLog = COOKING_MAT_NAMES[harvestId] ||
                      FARM_CROPS[harvestId]?.name ||
                      harvestId;
    appendLog(`謎の種は ${shownNameForLog} に育っていた！`);
  }

  const id = harvestId;
  let amount = getRandomHarvestAmount();

  // ★日替わりボーナス: 農園収穫量（畑=field→gather_farm / 菜園=garden→gather_garden）
  if (typeof getDailyGatherBonus === "function") {
    const info = FARM_CROPS[id];
    if (info && info.category) {
      const key =
        (info.category === "field")  ? "farm"   :
        (info.category === "garden") ? "garden" :
        null;

      if (key) {
        const daily = getDailyGatherBonus(key);
        if (daily && typeof daily.amountRate === "number" && daily.amountRate !== 1) {
          amount = Math.max(1, Math.floor(amount * daily.amountRate));
        }
      }
    }
  }

  // ★ウサギなどのペット特性による収穫ボーナス（別枠加算）
  if (typeof getGatherBonusByTrait === "function") {
    const extra = getGatherBonusByTrait("farm") || 0;
    if (extra > 0) {
      amount += extra;
    }
  }

  if (typeof cookingMats !== "object") {
    appendLog("料理素材の保管オブジェクトが未定義です（cookingMats）");
    return;
  }

  cookingMats[id] = (cookingMats[id] || 0) + amount;

  // ★農園収穫も採取統計に反映（料理素材扱い）
  if (typeof addGatherStat === "function") {
    addGatherStat(id, amount);
  }

  const name = shownNameForLog ||
               COOKING_MAT_NAMES[id] ||
               FARM_CROPS[id]?.name ||
               id;
  appendLog(`${name}を${amount}個収穫した！`);

  addFarmSkillExpByCropId(id);

  // ★ギルド用フック：食材ギルドの素材集めクエスト進行
  if (typeof onGatherCompletedForGuild === "function") {
    onGatherCompletedForGuild({
      kind: "food",
      total: amount,
      rare: false, // 農園からは通常食材のみとして扱う（仕様は維持）
      mode: "farm" // 食材ギルドの「農園カテゴリ」クエスト用
    });
  }

  // 収穫後も連作する: 作物IDはそのまま、成長だけリセット
  slot.growth = 0;
  slot.ready  = false;

  if (typeof updateFarmUI === "function") {
    updateFarmUI();
  }

  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

// 畑・菜園全体を手入れ（全スロット growth +2）
function careFarmAll() {
  const st = window.farmState;
  if (!st || !Array.isArray(st.slots)) {
    appendLog("畑の状態が正しくありません");
    return;
  }

  st.slots.forEach(slot => {
    if (!slot || !slot.cropId || slot.ready) return;
    // 謎の種は中身未定なのでスキル経験値はここでは付与しない
    if (slot.cropId !== FARM_MYSTERY_SEED_ID) {
      addFarmSkillExpByCropId(slot.cropId);
    }
  });

  addFarmGrowthPoint("care");

  if (typeof handleHungerThirstOnAction === "function") {
    handleHungerThirstOnAction("farmCare");
  }

  appendLog("農園の世話をした");
}

// =======================
// UI 更新
// =======================

function updateFarmUI() {
  updateFarmSlotsUI();
  updateFarmDetailUI();
  if (typeof window.onFarmUIUpdated === "function") {
    window.onFarmUIUpdated();
  }
}

// 4マス部分（選択用）
function updateFarmSlotsUI() {
  const container = document.getElementById("farmSlots");
  if (!container) return;

  container.innerHTML = "";

  const st = window.farmState;
  const selectedIndex = (typeof st.selectedIndex === "number") ? st.selectedIndex : null;

  st.slots.forEach((slot, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "farm-slot";
    if (idx === selectedIndex) {
      btn.classList.add("selected");
    }

    // 区画番号
    const title = document.createElement("div");
    title.className = "farm-slot-title";
    title.textContent = `区画${idx + 1}`;
    btn.appendChild(title);

    // アイコン
    const icon = document.createElement("div");
    icon.className = "farm-slot-icon";

    // 成長バー
    const growthBar = document.createElement("div");
    growthBar.className = "farm-slot-growth";
    const growthInner = document.createElement("div");
    growthInner.className = "farm-slot-growth-inner";
    growthBar.appendChild(growthInner);
    btn.appendChild(growthBar);

    if (!slot.cropId) {
      // 何も植わっていない
      btn.classList.add("empty");
      icon.textContent = "＋";
      growthInner.style.width = "0%";
    } else {
      let cropName;
      if (slot.cropId === FARM_MYSTERY_SEED_ID) {
        cropName = "謎の種";
      } else {
        cropName = COOKING_MAT_NAMES[slot.cropId] ||
                   FARM_CROPS[slot.cropId]?.name ||
                   slot.cropId;
      }
      const g = slot.growth;
      const need = FARM_GROW_NEEDED;
      const pct = Math.floor((g / need) * 100);
      growthInner.style.width = `${pct}%`;

      // 成長段階で簡易アイコンを変える
      let stageIcon = "🌱";
      if (pct >= 80) {
        stageIcon = "🌾";
      } else if (pct >= 40) {
        stageIcon = "🌿";
      }
      if (slot.cropId === FARM_MYSTERY_SEED_ID) {
        stageIcon = "❓";
      }
      icon.textContent = stageIcon;

      if (slot.ready) {
        btn.classList.add("ready");
      }

      // ツールチップ的な情報
      btn.title = `${cropName} (${pct}%)` + (slot.ready ? " 収穫OK" : "");
    }

    btn.appendChild(icon);

    btn.onclick = () => {
      window.farmState.selectedIndex = idx;
      updateFarmUI();
    };

    container.appendChild(btn);
  });
}

// 選択中スロットの詳細＋操作
function updateFarmDetailUI() {
  const panel = document.getElementById("farmDetail");
  if (!panel) return;

  const titleEl   = document.getElementById("farmDetailTitle");
  const infoEl    = document.getElementById("farmDetailInfo");
  const plantBtn  = document.getElementById("farmDetailPlantBtn");
  const harvestBtn= document.getElementById("farmDetailHarvestBtn");

  const st = window.farmState;
  const idx = (typeof st.selectedIndex === "number") ? st.selectedIndex : null;
  const slot = (idx != null) ? getFarmSlot(idx) : null;

  if (!slot || idx == null) {
    panel.classList.add("empty");
    if (titleEl)   titleEl.textContent   = "区画 -";
    if (infoEl)    infoEl.textContent    = "区画を選択してください。";
    if (plantBtn)  plantBtn.disabled     = true;
    if (harvestBtn)harvestBtn.disabled   = true;
    return;
  }

  panel.classList.remove("empty");

  if (titleEl) {
    titleEl.textContent = `区画${idx + 1} の状態`;
  }

  let text;
  if (!slot.cropId) {
    text = "何も植わっていません。";
  } else {
    let cropName;
    if (slot.cropId === FARM_MYSTERY_SEED_ID) {
      cropName = "謎の種";
    } else {
      cropName = COOKING_MAT_NAMES[slot.cropId] ||
                 FARM_CROPS[slot.cropId]?.name ||
                 slot.cropId;
    }
    const g = slot.growth;
    const need = FARM_GROW_NEEDED;
    const pct = Math.floor((g / need) * 100);
    text = `${cropName} を育成中 / 成長 ${g}/${need} (${pct}%)` +
           (slot.ready ? " / 収穫可能です。" : " / まだ育成中です。");
  }

  if (infoEl) {
    infoEl.textContent = text;
  }

  if (plantBtn) {
    plantBtn.disabled = false;
    plantBtn.onclick = () => {
      openFarmPlantModal(idx);
    };
  }

  if (harvestBtn) {
    harvestBtn.disabled = !slot.ready;
    harvestBtn.onclick = () => {
      harvestFarmSlot(idx);
    };
  }
}

// =======================
// 作物選択モーダル（セレクト＋説明付き・ID入力なし）
// =======================

function openFarmPlantModal(slotIndex) {
  const modal      = document.getElementById("farmPlantModal");
  const select     = document.getElementById("farmPlantSelect");
  const okBtn      = document.getElementById("farmPlantOk");
  const cancelBtn  = document.getElementById("farmPlantCancel");
  const descLabel  = document.getElementById("farmPlantDesc");

  // モーダルが無い場合は何もしない（ID入力フォールバックも無し）
  if (!modal || !select || !okBtn || !cancelBtn) {
    appendLog("畑の作物選択UIが見つかりません（farmPlantModal 周りの要素）");
    return;
  }

  select.innerHTML = "";

  // 1番上に「謎の種」を追加（無料・ランダム）
  {
    const optMystery = document.createElement("option");
    optMystery.value = FARM_MYSTERY_SEED_ID;
    optMystery.textContent = "謎の種（ランダム）";
    select.appendChild(optMystery);
  }

  // 既存の作物候補
  Object.keys(FARM_CROPS).forEach(id => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = FARM_CROPS[id].name || id;
    select.appendChild(opt);
  });

  const slot = getFarmSlot(slotIndex);
  if (slot && slot.cropId) {
    // 既に謎の種が植わっている場合は謎の種を選択
    if (slot.cropId === FARM_MYSTERY_SEED_ID) {
      select.value = FARM_MYSTERY_SEED_ID;
    } else if (FARM_CROPS[slot.cropId]) {
      // 通常作物が植わっている場合はその作物を選択状態に
      select.value = slot.cropId;
    } else {
      select.value = FARM_MYSTERY_SEED_ID;
    }
  } else {
    // 何も植わっていないならデフォルトは謎の種
    select.value = FARM_MYSTERY_SEED_ID;
  }

  const getCropDescription = (cropId) => {
    if (cropId === FARM_MYSTERY_SEED_ID) {
      return "何が育つか分からない不思議な種。農園で育てられる作物からランダムに育つ。";
    }
    const info = FARM_CROPS[cropId];
    if (!info) return "";
    if (info.category === "field") {
      return "畑で育てやすい作物です（植えるときに手持ちから1つ消費）。";
    } else if (info.category === "garden") {
      return "菜園向きの作物です（植えるときに手持ちから1つ消費）。";
    }
    return "";
  };

  const updateDesc = () => {
    if (!descLabel) return;
    const cropId = select.value;
    if (cropId === FARM_MYSTERY_SEED_ID) {
      descLabel.textContent = getCropDescription(cropId);
      return;
    }
    const name = (FARM_CROPS[cropId] && FARM_CROPS[cropId].name) || cropId;
    const base = getCropDescription(cropId);
    descLabel.textContent = name + (base ? " / " + base : "");
  };

  select.onchange = updateDesc;
  updateDesc();

  modal.dataset.slotIndex = String(slotIndex);
  // 表示切り替えを display ではなくクラスで行う（.modal-center.hidden と連携）
  modal.classList.remove("hidden");

  okBtn.onclick = () => {
    const selectedId = select.value;
    plantFarmSlot(slotIndex, selectedId);
    modal.classList.add("hidden");
  };

  cancelBtn.onclick = () => {
    modal.classList.add("hidden");
  };
}

// =======================
// セーブ／ロード連携用ヘルパ
// =======================

function getFarmSaveData() {
  const st = window.farmState;
  if (!st || !Array.isArray(st.slots)) {
    return null;
  }
  return {
    slots: st.slots.map(s => ({
      cropId: s.cropId || null,
      growth: s.growth || 0,
      ready: !!s.ready
    })),
    selectedIndex: (typeof st.selectedIndex === "number") ? st.selectedIndex : 0
  };
}

function applyFarmSaveData(farmData) {
  if (!farmData || !Array.isArray(farmData.slots)) return;

  const st = window.farmState;
  if (!st || !Array.isArray(st.slots)) return;

  for (let i = 0; i < st.slots.length; i++) {
    const src = farmData.slots[i] || {};
    st.slots[i].cropId = src.cropId || null;
    st.slots[i].growth = typeof src.growth === "number" ? src.growth : 0;
    st.slots[i].ready  = !!src.ready;
  }

  st.selectedIndex = (typeof farmData.selectedIndex === "number")
    ? farmData.selectedIndex
    : 0;

  if (typeof updateFarmUI === "function") {
    updateFarmUI();
  }
}

// =======================
// 初期化ヘルパ
// =======================

function initFarmSystem() {
  if (typeof updateFarmUI === "function") {
    updateFarmUI();
  }
}

// 畑・菜園全体を収穫（ready のものだけ）
function harvestFarmAll() {
  const st = window.farmState;
  if (!st || !Array.isArray(st.slots)) {
    appendLog("畑の状態が正しくありません");
    return;
  }

  let harvestedAny = false;

  st.slots.forEach((slot, idx) => {
    if (!slot || !slot.cropId || !slot.ready) return;
    harvestFarmSlot(idx);
    harvestedAny = true;
  });

  if (!harvestedAny) {
    appendLog("収穫できる作物はないようだ");
  }
}