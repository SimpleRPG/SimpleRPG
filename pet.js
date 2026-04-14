// pet.js
// ペット種・特性・補正ロジックまとめ

// =======================
// ペットの選択肢（最初に選ぶ動物）
// =======================
//
// 今回は「犬／烏／兎」の3種類。
// - id: UIやセーブデータで使うID
// - name: 表示名
// - traitId: 特性ID（COMPANION_TRAITSと対応）
// - desc: モーダルに出す説明文
//
const COMPANION_TYPES = [
  {
    id: "inu",
    name: "犬",
    traitId: "inu",
    desc: "ペットのHP+5%、防御+2%。タンク寄りの相棒。"
  },
  {
    id: "karasu",
    name: "烏",
    traitId: "karasu",
    desc: "ペット攻撃+5%、HP+2%。攻撃寄りの相棒。"
  },
  {
    id: "usagi",
    name: "兎",
    traitId: "usagi",
    desc: "ペットHP/攻/防-5%。その代わり採取追加素材+10%、クラフト/強化成功+5%。"
  }
];

// =======================
// 特性データ
// =======================
//
// 各特性が「ペットのステータス」と「各種確率」に与える補正をまとめる。
// ・petHpRate / petAtkRate / petDefRate: ペットHP/攻撃/防御への乗算倍率
// ・extraGatherRate: 採取時に「ペットが追加素材を持ってくる」確率ボーナス
// ・craftSuccessRate: クラフト成功率ボーナス（0.05なら+5%）
// ・enhanceSuccessRate: 強化成功率ボーナス（0.05なら+5%）
//
const COMPANION_TRAITS = {
  inu: {
    name: "犬",
    petHpRate: 1.05,
    petAtkRate: 1.00,
    petDefRate: 1.02,
    extraGatherRate: 0.00,   // 採取追加素材 +0%
    craftSuccessRate: 0.00,  // クラフト成功率 +0
    enhanceSuccessRate: 0.00 // 強化成功率 +0
  },
  karasu: {
    name: "烏",
    petHpRate: 1.02,
    petAtkRate: 1.05,
    petDefRate: 1.00,
    extraGatherRate: 0.00,
    craftSuccessRate: 0.00,
    enhanceSuccessRate: 0.00
  },
  usagi: {
    name: "兎",
    petHpRate: 0.95,
    petAtkRate: 0.95,
    petDefRate: 0.95,
    extraGatherRate: 0.10,   // 採取追加素材 +10%
    craftSuccessRate: 0.05,  // クラフト成功率 +5%
    enhanceSuccessRate: 0.05 // 強化成功率 +5%
  }
};

// =======================
// セーブ互換用グローバル
// =======================
//
// companionTypeId : 選んだ動物そのもののID（犬/烏/兎など）
// companionTraitId: 実際の特性ID（今は同じ値を使っているが将来分ける余地）
//
window.companionTypeId  = window.companionTypeId  || null; // "inu" | "karasu" | "usagi"
window.companionTraitId = window.companionTraitId || null;

let companionTypeId  = window.companionTypeId;
let companionTraitId = window.companionTraitId;

// =======================
// セットアップ系ヘルパー
// =======================

/**
 * 動物選択モーダルで選ばれた typeId を受け取って、
 * companionTypeId / companionTraitId を更新する。
 * 
 * @param {string} typeId "inu" / "karasu" / "usagi"
 */
function setCompanionByTypeId(typeId) {
  const comp = COMPANION_TYPES.find(c => c.id === typeId);
  if (!comp) return;

  companionTypeId  = comp.id;
  companionTraitId = comp.traitId;

  window.companionTypeId  = companionTypeId;
  window.companionTraitId = companionTraitId;

  // ★修正: ペット名は初期値「ペット」を維持したいのでここでは上書きしない
  // game-core-1.js 側の petName は、ユーザーが「ペット名を変更」したときだけ変わる
}

/**
 * 現在ペットが選ばれているかどうかを返す。
 * 
 * @returns {boolean}
 */
function hasCompanion() {
  return !!companionTypeId;
}

/**
 * 現在選ばれている特性オブジェクトを返す。
 * @returns {object|null}
 */
function getCurrentCompanionTrait() {
  return COMPANION_TRAITS[companionTraitId] || null;
}

/**
 * 現在選ばれている companionType （犬/烏/兎の定義）を返す。
 * @returns {object|null}
 */
function getCurrentCompanionType() {
  return COMPANION_TYPES.find(c => c.id === companionTypeId) || null;
}

// =======================
// ペットステータス補正ヘルパー
// =======================

/**
 * ペットのベースHP/ATK/DEFに特性補正を掛けて返す。
 * 
 * 使用イメージ:
 *   const r = applyCompanionPetRates(petHpBase, petAtkBase, petDefBase);
 *   petHpMax = r.hp + petRebirthCount * 3;
 *   // getPetBaseAtk / getPetDef でも同様に使用
 * 
 * @param {number} baseHp 
 * @param {number} baseAtk 
 * @param {number} baseDef 
 * @returns {{hp:number, atk:number, def:number}}
 */
function applyCompanionPetRates(baseHp, baseAtk, baseDef) {
  const trait = COMPANION_TRAITS[companionTraitId];
  if (!trait) {
    return {
      hp:  baseHp,
      atk: baseAtk,
      def: baseDef
    };
  }
  return {
    hp:  Math.floor(baseHp  * trait.petHpRate),
    atk: Math.floor(baseAtk * trait.petAtkRate),
    def: Math.floor(baseDef * trait.petDefRate)
  };
}

// =======================
// 採取・クラフト・強化用ヘルパー
// =======================

/**
 * 採取時、「ペットが追加素材を持ってくるか」を特性込みでロールする。
 * 
 * 使い方:
 *   if (rollExtraGatherByTrait()) {
 *     // 追加素材ドロップ処理
 *   }
 * 
 * @returns {boolean}
 */
function rollExtraGatherByTrait() {
  const trait = COMPANION_TRAITS[companionTraitId];
  if (!trait || !trait.extraGatherRate) return false;
  return Math.random() < trait.extraGatherRate;
}

/**
 * クラフト成功率ボーナスを返す（0.05なら+5%）。
 * 
 * 使い方:
 *   let successRate = baseRate + getCraftSuccessBonusByTrait();
 * 
 * @returns {number}
 */
function getCraftSuccessBonusByTrait() {
  const trait = COMPANION_TRAITS[companionTraitId];
  return trait ? (trait.craftSuccessRate || 0) : 0;
}

/**
 * 強化成功率ボーナスを返す（0.05なら+5%）。
 * 
 * 使い方:
 *   let successRate = baseRate + getEnhanceSuccessBonusByTrait();
 * 
 * @returns {number}
 */
function getEnhanceSuccessBonusByTrait() {
  const trait = COMPANION_TRAITS[companionTraitId];
  return trait ? (trait.enhanceSuccessRate || 0) : 0;
}