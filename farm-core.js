// farm-core.js
// 畑・菜園システム（4スロット＋成長ポイント制・選択式詳細パネル）
// 前提: cookingMats, appendLog, updateDisplay, makeSaveData/applySaveData などが存在
// ＋ item-meta-core.js により、cookingMat アイテムに
//   farmGrowable: true/false
//   farmCategory: "field" | "garden"
// が設定されている前提（cook-data.js 側で登録）。

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

// =======================
// ITEM_META ベースの作物メタ取得
// =======================

// 指定IDが「畑で育てられる cookingMat か」をチェックし、farmメタも含めて返す。
function getFarmCropMeta(cropId) {
  if (!cropId || typeof getItemMeta !== "function") return null;
  const meta = getItemMeta(cropId);
  if (!meta) return null;
  if (meta.category !== "cookingMat") return null;
  if (!meta.farmGrowable) return null;

  const cat = meta.farmCategory === "garden" ? "garden" : "field"; // デフォ畑
  return {
    id: cropId,
    name: meta.name || cropId,
    category: cat,
    meta
  };
}

// 畑で育てられる作物ID一覧を取得（cookingMat ＋ farmGrowable）。
function getAllFarmCropIds() {
  if (typeof getAllItemMeta !== "function") return [];

  return getAllItemMeta()
    .filter(m => m && m.category === "cookingMat" && m.farmGrowable)
    .map(m => m.id);
}

// ランダム作物を1つ選ぶ（畑で育てられる cookingMat 全体から）
function pickRandomFarmCropId() {
  const ids = getAllFarmCropIds();
  if (!ids.length) return null;
  const idx = Math.floor(Math.random() * ids.length);
  return ids[idx];
}

// 収穫量を [FARM_HARVEST_MIN, FARM_HARVEST_MAX] の範囲でランダム決定
function getRandomHarvestAmount() {
  const min = Math.ceil(FARM_HARVEST_MIN);
  const max = Math.floor(FARM_HARVEST_MAX);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// =======================
// 状態
// =======================

// slots[i] = {
//   cropId: null | 料理素材ID or FARM_MYSTERY_SEED_ID,
//   growth: 0〜FARM_GROW_NEEDED,
//   ready:  boolean（収穫可能か）,
//   fertilizer: null | { id: string, remainUses: number } // 枠ごとの肥料
// }
// selectedIndex: 現在選択中の区画（0〜3、未選択なら null）
window.farmState = window.farmState || {
  slots: Array.from({ length: FARM_SLOT_COUNT }, () => ({
    cropId: null,
    growth: 0,
    ready: false,
    fertilizer: null
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

// =======================
// 成長ポイント加算
// =======================

// source: "care" / "gather" / "explore" など
function addFarmGrowthPoint(source) {
  const st = window.farmState;
  if (!st || !Array.isArray(st.slots)) return;

  const baseDelta = (source === "care")
    ? FARM_GROW_DELTA_CARE
    : FARM_GROW_DELTA_DEFAULT;

  if (baseDelta <= 0) return;

  let anyChanged = false;

  st.slots.forEach((slot, idx) => {
    if (!slot) return;
    if (!slot.cropId) return;   // 何も植えてない
    if (slot.ready) return;     // すでに成熟

    let delta = baseDelta;
    // 肥料による成長ボーナスがあれば適用
    if (typeof applyFarmFertilizerToGrowth === "function") {
      delta = applyFarmFertilizerToGrowth(delta, idx);
    }

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
  if (!window.gatherSkills) return;

  const meta = getFarmCropMeta(cropId);
  const cat  = meta ? meta.category : "field"; // デフォ畑

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
// index: 0〜3, selectedId: 畑で育てられる cookingMat の id or FARM_MYSTERY_SEED_ID
function plantFarmSlot(index, selectedId) {
  const slot = getFarmSlot(index);
  if (!slot) return;

  // 新しく植えたタイミングで肥料はリセット（枠に残さない仕様）
  slot.fertilizer = null;

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

  // 通常作物の場合は ITEM_META 上で「畑で育てられるか」チェック
  const cropId = selectedId;
  const farmMeta = getFarmCropMeta(cropId);
  if (!farmMeta) {
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
    const name = (farmMeta && farmMeta.name) || cropId;
    appendLog(`${name}を持っていないので植えられない`);
    return;
  }
  cookingMats[cropId] = have - 1;

  // ここまで来たら cropId は必ず有効な畑作物ID
  slot.cropId = cropId;
  slot.growth = 0;
  slot.ready  = false;

  const name = (farmMeta && farmMeta.name) || cropId;
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
    const meta = getFarmCropMeta(harvestId);
    shownNameForLog = (meta && meta.name) || harvestId;
    appendLog(`謎の種は ${shownNameForLog} に育っていた！`);
  }

  const id = harvestId;
  let amount = getRandomHarvestAmount();

  // 日替わりボーナス: 農園収穫量（畑=field→farm / 菜園=garden→garden）
  if (typeof getDailyGatherBonus === "function") {
    const meta = getFarmCropMeta(id);
    if (meta && meta.category) {
      const key =
        (meta.category === "field")  ? "farm"   :
        (meta.category === "garden") ? "garden" :
        null;

      if (key) {
        const daily = getDailyGatherBonus(key);
        if (daily && typeof daily.amountRate === "number" && daily.amountRate !== 1) {
          amount = Math.max(1, Math.floor(amount * daily.amountRate));
        }
      }
    }
  }

  // ペット特性による収穫ボーナス（別枠加算）
  if (typeof getGatherBonusByTrait === "function") {
    const extra = getGatherBonusByTrait("farm") || 0;
    if (extra > 0) {
      amount += extra;
    }
  }

  // 枠ごとの肥料による収穫ボーナス
  if (typeof applyFarmFertilizerToHarvest === "function") {
    amount = applyFarmFertilizerToHarvest(amount, index);
  }

  if (typeof cookingMats !== "object") {
    appendLog("料理素材の保管オブジェクトが未定義です（cookingMats）");
    return;
  }

  // 農園収穫も品質付きで cookingMats に追加
  if (typeof addCookingMatWithQuality === "function" &&
      typeof rollCookingMatQuality === "function") {
    for (let i = 0; i < amount; i++) {
      const q = rollCookingMatQuality();
      addCookingMatWithQuality(id, q);
    }
  } else {
    // フォールバック
    cookingMats[id] = (cookingMats[id] || 0) + amount;
  }

  // 農園収穫も採取統計に反映（料理素材扱い）
  if (typeof addGatherStat === "function") {
    addGatherStat(id, amount);
  }

  const metaForName = getFarmCropMeta(id);
  const name = shownNameForLog ||
               (metaForName && metaForName.name) ||
               id;
  appendLog(`${name}を${amount}個収穫した！`);

  addFarmSkillExpByCropId(id);

  // ギルド用フック：食材ギルドの素材集めクエスト進行
  if (typeof onGatherCompletedForGuild === "function") {
    onGatherCompletedForGuild({
      kind: "food",
      total: amount,
      rare: false, // 農園からは通常食材のみとして扱う（仕様は維持）
      mode: "farm" // 食材ギルドの「農園カテゴリ」クエスト用
    });
  }

  // 収穫1回ぶんとして肥料使用回数を消費
  if (typeof consumeFarmFertilizerUse === "function") {
    consumeFarmFertilizerUse(index);
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
// 肥料モーダル UI
// =======================

// モーダル DOM を lazily 生成して返す
function ensureFarmFertilizerModal() {
  let modal = document.getElementById("farmFertilizerModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "farmFertilizerModal";
  modal.className = "modal-center hidden"; // 既存のモーダルと同じクラス想定
  modal.innerHTML = `
    <div class="modal-content small">
      <h3>肥料を使う</h3>
      <p id="farmFertilizerModalSlotLabel" style="font-size:12px; margin-bottom:4px;"></p>
      <div style="margin-bottom:4px;">
        <label style="font-size:12px;">肥料:</label>
        <select id="farmFertilizerSelect" style="min-width:180px;"></select>
      </div>
      <p id="farmFertilizerDesc" style="font-size:11px; color:#ccc; min-height:1.5em;"></p>
      <div style="margin-top:8px; text-align:right;">
        <button id="farmFertilizerOk">決定</button>
        <button id="farmFertilizerCancel">キャンセル</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

// モーダルを開き、肥料一覧を表示して選択させる
function openFarmFertilizerModal(slotIndex) {
  if (typeof FERTILIZERS !== "object" ||
      typeof window.itemCounts !== "object") {
    appendLog("肥料情報が正しく読み込まれていないようだ。");
    return;
  }

  const slot = getFarmSlot(slotIndex);
  if (!slot) {
    appendLog("畑の区画情報が正しくありません。");
    return;
  }

  const modal   = ensureFarmFertilizerModal();
  const slotLbl = modal.querySelector("#farmFertilizerModalSlotLabel");
  const select  = modal.querySelector("#farmFertilizerSelect");
  const descEl  = modal.querySelector("#farmFertilizerDesc");
  const okBtn   = modal.querySelector("#farmFertilizerOk");
  const cancelBtn = modal.querySelector("#farmFertilizerCancel");

  if (!select || !okBtn || !cancelBtn) {
    appendLog("肥料選択モーダルの構成がおかしいようだ。");
    return;
  }

  // セレクト初期化
  select.innerHTML = "";

  // 所持している肥料だけをピックアップ
  const ownedFertIds = Object.keys(FERTILIZERS).filter(id => (itemCounts[id] || 0) > 0);

  if (!ownedFertIds.length) {
    appendLog("使える肥料を持っていないようだ。");
    return;
  }

  // ティアの高い順にソート
  ownedFertIds.sort((a, b) => {
    const fa = FERTILIZERS[a];
    const fb = FERTILIZERS[b];
    return (fb.tier || 0) - (fa.tier || 0);
  });

  ownedFertIds.forEach(id => {
    const meta = FERTILIZERS[id] || {};
    const opt = document.createElement("option");
    opt.value = id;
    const name = meta.name || id;
    const tierText = (meta.tier != null) ? `T${meta.tier}` : "";
    const remain = itemCounts[id] || 0;
    opt.textContent = `${name}${tierText ? " (" + tierText + ")" : ""} x${remain}`;
    select.appendChild(opt);
  });

  const updateDesc = () => {
    if (!descEl) return;
    const fertId = select.value;
    const meta = FERTILIZERS[fertId] || {};
    const name = meta.name || fertId;
    const tierText = (meta.tier != null) ? `T${meta.tier}` : "";
    const growth = (meta.growthBonusRate != null)
      ? `成長倍率: x${meta.growthBonusRate}`
      : "";
    const amount = (meta.harvestBonusRate != null)
      ? `収穫倍率: x${meta.harvestBonusRate}`
      : "";
    const remainUse = (meta.maxUses != null)
      ? `1枠あたり最大${meta.maxUses}回収穫まで有効`
      : "";
    const parts = [tierText, growth, amount, remainUse].filter(Boolean);
    descEl.textContent = name + (parts.length ? " / " + parts.join(" / ") : "");
  };

  select.onchange = updateDesc;
  updateDesc();

  if (slotLbl) {
    slotLbl.textContent = `対象: 区画${slotIndex + 1}`;
  }

  // モーダル表示
  modal.classList.remove("hidden");
  modal.dataset.slotIndex = String(slotIndex);

  okBtn.onclick = () => {
    const fertId = select.value;
    if (!fertId) {
      modal.classList.add("hidden");
      return;
    }
    if (typeof useFarmFertilizerItem === "function") {
      const used = useFarmFertilizerItem(fertId, slotIndex);
      if (!used) {
        appendLog("その肥料はこの区画には使えないようだ。");
      }
    } else {
      appendLog("肥料を使う処理が未定義です（useFarmFertilizerItem）。");
    }
    modal.classList.add("hidden");
  };

  cancelBtn.onclick = () => {
    modal.classList.add("hidden");
  };
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
        const meta = getFarmCropMeta(slot.cropId);
        cropName = (meta && meta.name) || slot.cropId;
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

  const titleEl    = document.getElementById("farmDetailTitle");
  const infoEl     = document.getElementById("farmDetailInfo");
  const plantBtn   = document.getElementById("farmDetailPlantBtn");
  const harvestBtn = document.getElementById("farmDetailHarvestBtn");
  const fertInfoEl = document.getElementById("farmDetailFertilizerInfo"); // 肥料状態表示用
  const fertBtn    = document.getElementById("farmDetailFertilizerBtn");  // 肥料を使うボタン

  const st = window.farmState;
  const idx = (typeof st.selectedIndex === "number") ? st.selectedIndex : null;
  const slot = (idx != null) ? getFarmSlot(idx) : null;

  // ボタンの onclick を毎回クリア
  if (plantBtn)  plantBtn.onclick  = null;
  if (harvestBtn)harvestBtn.onclick= null;
  if (fertBtn)   fertBtn.onclick   = null;

  if (!slot || idx == null) {
    panel.classList.add("empty");
    if (titleEl)    titleEl.textContent    = "区画 -";
    if (infoEl)     infoEl.textContent     = "区画を選択してください。";
    if (plantBtn)   plantBtn.disabled      = true;
    if (harvestBtn) harvestBtn.disabled    = true;
    if (fertInfoEl) fertInfoEl.textContent = "肥料：なし";
    if (fertBtn)    fertBtn.disabled       = true;
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
      const meta = getFarmCropMeta(slot.cropId);
      cropName = (meta && meta.name) || slot.cropId;
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

  // 肥料状態の表示
  if (fertInfoEl) {
    if (typeof getFarmFertilizerStatusTextForSlot === "function") {
      fertInfoEl.textContent = getFarmFertilizerStatusTextForSlot(idx);
    } else {
      fertInfoEl.textContent = "肥料：なし";
    }
  }

  // 植えるボタン
  if (plantBtn) {
    plantBtn.disabled = false;
    plantBtn.onclick = () => {
      openFarmPlantModal(idx);
    };
  }

  // 収穫ボタン
  if (harvestBtn) {
    harvestBtn.disabled = !slot.ready;
    harvestBtn.onclick = () => {
      harvestFarmSlot(idx);
    };
  }

  // 肥料を使うボタン
  if (fertBtn) {
    fertBtn.disabled = false;
    fertBtn.onclick = () => {
      openFarmFertilizerModal(idx);
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

  // 畑で育てられる作物候補（ITEM_META から）
  const farmIds = getAllFarmCropIds();
  farmIds.forEach(id => {
    const meta = getItemMeta(id) || {};
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = meta.name || id;
    select.appendChild(opt);
  });

  const slot = getFarmSlot(slotIndex);
  if (slot && slot.cropId) {
    if (slot.cropId === FARM_MYSTERY_SEED_ID) {
      select.value = FARM_MYSTERY_SEED_ID;
    } else if (farmIds.includes(slot.cropId)) {
      select.value = slot.cropId;
    } else {
      select.value = FARM_MYSTERY_SEED_ID;
    }
  } else {
    select.value = FARM_MYSTERY_SEED_ID;
  }

  const getCropDescription = (cropId) => {
    if (cropId === FARM_MYSTERY_SEED_ID) {
      return "何が育つか分からない不思議な種。農園で育てられる作物からランダムに育つ。";
    }
    const fm = getFarmCropMeta(cropId);
    if (!fm) return "";
    if (fm.category === "field") {
      return "畑で育てやすい作物です（植えるときに手持ちから1つ消費）。";
    } else if (fm.category === "garden") {
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
    const fm = getFarmCropMeta(cropId);
    const name = (fm && fm.name) || cropId;
    const base = getCropDescription(cropId);
    descLabel.textContent = name + (base ? " / " + base : "");
  };

  select.onchange = updateDesc;
  updateDesc();

  modal.dataset.slotIndex = String(slotIndex);
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
      ready: !!s.ready,
      fertilizer: s.fertilizer && s.fertilizer.id
        ? { id: s.fertilizer.id, remainUses: s.fertilizer.remainUses || 0 }
        : null
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
    if (src.fertilizer && src.fertilizer.id) {
      st.slots[i].fertilizer = {
        id: src.fertilizer.id,
        remainUses: typeof src.fertilizer.remainUses === "number"
          ? src.fertilizer.remainUses
          : 0
      };
    } else {
      st.slots[i].fertilizer = null;
    }
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