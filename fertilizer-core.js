// fertilizer-core.js
// 畑・菜園用 肥料システム（T1〜T10）
// 前提: farm-core.js / itemCounts / appendLog / updateDisplay / updateFarmUI などが存在

// =======================
// 肥料T1〜T10共通パラメータ生成
// =======================

// Tごとのコストポイント（T×2）
function getFertilizerCostPoint(tier) {
  return tier * 2;
}

// Tごとの効果（強くしすぎないように上限付き）
// ・growBonus: 成長ポイント倍率（+5%〜+50%）
// ・harvestBonus: 収穫量倍率（+4%〜+40%）
// ・waterSaveRate: 水やり消費軽減率（3%〜30%）
function getFertilizerEffectByTier(tier) {
  const t = Math.max(1, Math.min(10, tier));

  const growBonus    = Math.min(0.05 * t, 0.5); // +5%〜+50%
  const harvestBonus = Math.min(0.04 * t, 0.4); // +4%〜+40%
  const waterSave    = Math.min(0.03 * t, 0.4); // -3%〜-40%（上限40%）

  return {
    growBonus,
    harvestBonus,
    waterSaveRate: waterSave
  };
}

// =======================
// 肥料データ定義（T1〜T10）
// =======================
//
// ID: T1_fert 〜 T10_fert
// costPoint: T×2 （レシピ設計用）
// uses: 効果が乗る「収穫回数」
//       例: T1=22回 / T10=40回くらいのイメージ

const FERTILIZERS = {};
for (let t = 1; t <= 10; t++) {
  const ef = getFertilizerEffectByTier(t);
  FERTILIZERS[`T${t}_fert`] = {
    id: `T${t}_fert`,
    name: `T${t}肥料`,
    tier: t,
    costPoint: getFertilizerCostPoint(t),
    desc: `畑の成長・収穫量・水やりに小さなボーナスを与える肥料（T${t}）。`,
    growBonus: ef.growBonus,
    harvestBonus: ef.harvestBonus,
    waterSaveRate: ef.waterSaveRate,
    uses: 20 + 2 * t // T1=22, T5=30, T10=40
  };
}

// 他ファイルから参照できるようにグローバルへ
window.FERTILIZERS = window.FERTILIZERS || FERTILIZERS;

// =======================
// 畑スロット用の肥料状態アクセス
// =======================
//
// 各スロットは farm-core.js 側で
//   slot.fertilizer = { id: "T1_fert", remainUses: number } or null
// を持つ前提。

function isFarmSlotFertilizerActive(slotIndex) {
  const st = window.farmState;
  if (!st || !Array.isArray(st.slots)) return false;
  const slot = st.slots[slotIndex];
  if (!slot || !slot.fertilizer) return false;
  const f = slot.fertilizer;
  return !!(f.id && typeof f.remainUses === "number" && f.remainUses > 0);
}

function getFarmFertilizerInfoForSlot(slotIndex) {
  if (!isFarmSlotFertilizerActive(slotIndex)) return null;
  const st = window.farmState;
  const slot = st.slots[slotIndex];
  return FERTILIZERS[slot.fertilizer.id] || null;
}

// =======================
// 肥料アイテム使用API（スロット単位）
// =======================
//
// 例: UIボタンから useFarmFertilizerItem("T1_fert", 0) を呼ぶ
//     → 区画1に肥料T1をセット

function useFarmFertilizerItem(fertId, slotIndex) {
  const info = FERTILIZERS[fertId];
  if (!info) {
    appendLog("この肥料は畑では使えない。");
    return false;
  }

  const st = window.farmState;
  if (!st || !Array.isArray(st.slots)) {
    appendLog("畑の状態が正しくありません。");
    return false;
  }
  if (slotIndex < 0 || slotIndex >= st.slots.length) {
    appendLog("その区画は存在しない。");
    return false;
  }
  const slot = st.slots[slotIndex];

  // 肥料は「何かが植わっている枠」にだけ使える仕様にする
  if (!slot.cropId) {
    appendLog("何も植わっていない区画には肥料をまけない。");
    return false;
  }

  window.itemCounts = window.itemCounts || {};
  if ((itemCounts[fertId] || 0) <= 0) {
    appendLog(`${info.name}を持っていない。`);
    return false;
  }

  // 消費して、この枠に適用（既存があっても上書き）
  itemCounts[fertId] -= 1;
  slot.fertilizer = {
    id: fertId,
    remainUses: info.uses
  };

  const slotNo = slotIndex + 1;
  appendLog(`区画${slotNo}に${info.name}をまいた！`);
  appendLog(`この区画での収穫がしばらく少しだけ増える。`);

  if (typeof updateFarmUI === "function") updateFarmUI();
  if (typeof updateDisplay === "function") updateDisplay();
  return true;
}

// =======================
// 畑側のフック用ヘルパ（スロット単位）
// =======================
//
// farm-core.js の addFarmGrowthPoint / harvestFarmSlot / waterFarmAll から
// slotIndex を渡して呼ぶ想定。

// 成長ポイントに肥料ボーナスを乗せるヘルパ（使う場合）
function applyFarmFertilizerToGrowth(baseDelta, slotIndex) {
  const info = getFarmFertilizerInfoForSlot(slotIndex);
  if (!info || !info.growBonus) return baseDelta;
  let d = Math.floor(baseDelta * (1 + info.growBonus));
  if (d < 1) d = 1;
  return d;
}

// 収穫量に肥料ボーナスを乗せるヘルパ
function applyFarmFertilizerToHarvest(baseAmount, slotIndex) {
  const info = getFarmFertilizerInfoForSlot(slotIndex);
  if (!info || !info.harvestBonus) return baseAmount;
  return Math.max(1, Math.floor(baseAmount * (1 + info.harvestBonus)));
}

// 水やりコストに肥料ボーナスを乗せるヘルパ（使う場合）
function applyFarmFertilizerToWaterCost(baseCost, slotIndex) {
  const info = getFarmFertilizerInfoForSlot(slotIndex);
  if (!info || !info.waterSaveRate) return baseCost;
  const c = Math.ceil(baseCost * (1 - info.waterSaveRate));
  return Math.max(0, c);
}

// 収穫1回ぶんとして肥料の残り回数を消費（スロット単位）
function consumeFarmFertilizerUse(slotIndex) {
  const st = window.farmState;
  if (!st || !Array.isArray(st.slots)) return;
  const slot = st.slots[slotIndex];
  if (!slot || !slot.fertilizer) return;

  slot.fertilizer.remainUses -= 1;
  if (slot.fertilizer.remainUses <= 0) {
    const fInfo = FERTILIZERS[slot.fertilizer.id];
    const slotNo = slotIndex + 1;
    appendLog(`区画${slotNo}にまいた${fInfo ? fInfo.name : "肥料"}の効果が切れたようだ。`);
    slot.fertilizer = null;
  }
}

// =======================
// UI補助
// =======================
//
// farm-core.js の updateFarmDetailUI 内から呼ぶと、選択中スロットの肥料状態を表示できる。

function getFarmFertilizerStatusTextForSlot(slotIndex) {
  const st = window.farmState;
  if (!st || !Array.isArray(st.slots)) return "肥料：なし";
  const slot = st.slots[slotIndex];
  if (!slot || !slot.fertilizer || !slot.fertilizer.id) return "肥料：なし";

  const info = FERTILIZERS[slot.fertilizer.id];
  if (!info) return "肥料：不明";

  return `肥料：${info.name}（残り${slot.fertilizer.remainUses}回の収穫に効果）`;
}

// =======================
// 肥料クラフト用 共通ユーティリティ
// =======================
//
// 前提: 肥料クラフトには「料理素材（cookingMat）」のみを使用。
// 通常=1pt / 銀=2pt / 金=3pt として costPoint を満たすまで消費。
// 余剰ポイントは破棄（素材も戻らない）。

// 品質→ポイント換算
function getFertilizerPointPerUnitByQuality(quality) {
  // quality の表現はプロジェクト側の実装に合わせて調整:
  // ここでは "normal"/"silver"/"gold" 前提で書いておく。
  if (quality === "gold")  return 3;
  if (quality === "silver")return 2;
  return 1; // normal その他
}

// 料理素材の品質を取得するヘルパ（無ければ normal 扱い）
// 実装側に別ヘルパがあれば差し替えてOK。
function getCookingMatQuality(matId) {
  // 例: ITEM_META に quality 情報がある場合の参照
  if (typeof getItemMeta === "function") {
    const meta = getItemMeta(matId);
    if (meta && meta.quality) {
      return meta.quality; // "normal"/"silver"/"gold" など
    }
  }
  return "normal";
}

// 現在の料理素材（cookingMats）の中から、
// 「肥料クラフトに使える候補」を列挙し、
// [{ id, count, quality, pointPerUnit }, ...] の配列を返す。
function getFertilizerCraftCandidates() {
  const list = [];
  if (typeof cookingMats !== "object") return list;
  if (typeof getItemMeta !== "function") return list;

  Object.keys(cookingMats).forEach(id => {
    const count = cookingMats[id] || 0;
    if (count <= 0) return;

    const meta = getItemMeta(id);
    if (!meta || meta.category !== "cookingMat") return;

    const quality = getCookingMatQuality(id);
    const ppu = getFertilizerPointPerUnitByQuality(quality);

    list.push({
      id,
      count,
      quality,
      pointPerUnit: ppu
    });
  });

  return list;
}

// =======================
// 肥料クラフト: 自動モード
// =======================
//
// costPoint を満たすまで、
// 「手持ち個数が多い順」に料理素材を1個ずつ消費。
// ポイントが足りなければ失敗。

function craftFertilizerAuto(fertId) {
  const info = FERTILIZERS[fertId];
  if (!info) {
    appendLog("この肥料はクラフトできない。");
    return false;
  }

  const costPoint = info.costPoint || 0;
  if (costPoint <= 0) {
    appendLog("この肥料にはコスト設定がされていない。");
    return false;
  }

  if (typeof cookingMats !== "object") {
    appendLog("料理素材の保管オブジェクトが未定義です（cookingMats）");
    return false;
  }

  const candidates = getFertilizerCraftCandidates();

  if (!candidates.length) {
    appendLog("料理素材が足りない。");
    return false;
  }

  // 手持ち個数が多い順にソート
  candidates.sort((a, b) => (b.count - a.count));

  let currentPoint = 0;
  const consumePlan = []; // { id, useCount }

  // 1個ずつ積んでいく
  for (let i = 0; i < candidates.length && currentPoint < costPoint; i++) {
    const c = candidates[i];
    let use = 0;
    while (use < c.count && currentPoint < costPoint) {
      currentPoint += c.pointPerUnit;
      use += 1;
    }
    if (use > 0) {
      consumePlan.push({ id: c.id, useCount: use });
    }
  }

  if (currentPoint < costPoint) {
    appendLog("肥料を作るには料理素材が足りないようだ。");
    return false;
  }

  // 実際に消費
  consumePlan.forEach(p => {
    cookingMats[p.id] = (cookingMats[p.id] || 0) - p.useCount;
    if (cookingMats[p.id] < 0) cookingMats[p.id] = 0;
  });

  window.itemCounts = window.itemCounts || {};
  itemCounts[fertId] = (itemCounts[fertId] || 0) + 1;

  // クラフト統計（成功のみ）
  if (typeof addCraftStat === "function") {
    addCraftStat("fertilizer", fertId, true);
  }

  appendLog(`${info.name}を1つクラフトした！（自動）`);

  if (typeof updateDisplay === "function") updateDisplay();
  if (typeof updateFarmUI === "function") updateFarmUI();
  return true;
}

// =======================
// 肥料クラフト: 手動モード
// =======================
//
// UI側で「どの料理素材を何個使うか」を選び、それを materials 配列で渡す。
//
// materials 形式例:
// [
//   { id: "herb_A", count: 3 },
//   { id: "herb_B", count: 2 },
//   { id: "rareVeg_C", count: 1 }
// ]
//
// → それぞれの quality に応じた 1/2/3pt でポイント換算し、
//    合計が costPoint を満たしていれば成功。

function craftFertilizerManual(fertId, materials) {
  const info = FERTILIZERS[fertId];
  if (!info) {
    appendLog("この肥料はクラフトできない。");
    return false;
  }

  const costPoint = info.costPoint || 0;
  if (costPoint <= 0) {
    appendLog("この肥料にはコスト設定がされていない。");
    return false;
  }

  if (!Array.isArray(materials) || !materials.length) {
    appendLog("使用する料理素材が選択されていない。");
    return false;
  }

  if (typeof cookingMats !== "object") {
    appendLog("料理素材の保管オブジェクトが未定義です（cookingMats）");
    return false;
  }

  // まずポイント計算（消費前チェック）
  let totalPoint = 0;
  for (const m of materials) {
    if (!m || !m.id || !m.count) continue;
    const have = cookingMats[m.id] || 0;
    if (have < m.count) {
      appendLog("選択した料理素材の所持数が足りない。");
      return false;
    }

    const meta = (typeof getItemMeta === "function") ? getItemMeta(m.id) : null;
    if (!meta || meta.category !== "cookingMat") {
      appendLog("肥料には料理素材だけを使える。");
      return false;
    }

    const quality = getCookingMatQuality(m.id);
    const ppu = getFertilizerPointPerUnitByQuality(quality);
    totalPoint += ppu * m.count;
  }

  if (totalPoint < costPoint) {
    appendLog("選択した料理素材では肥料を作るにはポイントが足りない。");
    return false;
  }

  // ポイントは足りているので、実際に消費
  materials.forEach(m => {
    if (!m || !m.id || !m.count) return;
    cookingMats[m.id] = (cookingMats[m.id] || 0) - m.count;
    if (cookingMats[m.id] < 0) cookingMats[m.id] = 0;
  });

  window.itemCounts = window.itemCounts || {};
  itemCounts[fertId] = (itemCounts[fertId] || 0) + 1;

  // クラフト統計（成功のみ）
  if (typeof addCraftStat === "function") {
    addCraftStat("fertilizer", fertId, true);
  }

  appendLog(`${info.name}を1つクラフトした！（手動）`);

  if (typeof updateDisplay === "function") updateDisplay();
  if (typeof updateFarmUI === "function") updateFarmUI();
  return true;
}

// グローバル公開
window.getFarmFertilizerInfoForSlot = getFarmFertilizerInfoForSlot;
window.useFarmFertilizerItem = useFarmFertilizerItem;
window.applyFarmFertilizerToGrowth = applyFarmFertilizerToGrowth;
window.applyFarmFertilizerToHarvest = applyFarmFertilizerToHarvest;
window.applyFarmFertilizerToWaterCost = applyFarmFertilizerToWaterCost;
window.consumeFarmFertilizerUse = consumeFarmFertilizerUse;
window.getFarmFertilizerStatusTextForSlot = getFarmFertilizerStatusTextForSlot;
window.craftFertilizerAuto = craftFertilizerAuto;
window.craftFertilizerManual = craftFertilizerManual;

// =======================
// ITEM_META への登録
// =======================
//
// item-meta-core.js が先に読み込まれている前提。
// registerItemDefs が無ければ何もしない安全実装。
// カテゴリ "fertilizer" として登録し、storageKind/storageTab は meta 側で扱う。
// （storageTab は将来的に farm/garden 用のタブとして利用する想定）

if (typeof registerItemDefs === "function") {
  (function () {
    const defs = {};
    Object.keys(FERTILIZERS).forEach(id => {
      const f = FERTILIZERS[id];
      if (!f) return;
      defs[id] = {
        id: f.id,
        name: f.name,
        category: "fertilizer",
        tier: f.tier,
        // 畑専用の意味合いでタグを付けておく
        tags: ["farm"],
        // レシピ設計用のコストポイントもメタに寄せておく
        fertCostPoint: f.costPoint,
        fertGrowBonus: f.growBonus,
        fertHarvestBonus: f.harvestBonus,
        fertWaterSaveRate: f.waterSaveRate,
        fertUses: f.uses,
        // クラフトメタ（カテゴリだけ明示しておく）
        craft: {
          enabled: true,
          category: "fertilizer",
          tier: f.tier,
          kind: "farm",
          // 成功率はひとまず固定（必要なら後で段階的に変える）
          baseRate: 1.0,
          costPoint: f.costPoint
          // cost: はポイント制なのでここでは空（専用ロジックで処理）
        }
      };
    });
    registerItemDefs(defs);
  })();
}