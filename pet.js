// pet.js
// ペット種・特性・補正ロジックまとめ

// =======================
// 親密度ブースト関連
// =======================
//
// ・petAffinity（0〜100）は別ファイル（game-core など）で管理する想定。
//   （なければここで window.petAffinity をフォールバック的に持つ）
// ・ここでは「ボーナス部分に対して最大 +50% 上乗せする」ための
//   ヘルパーだけ用意しておく。
// ・負のボーナス（デバフ）はブースト対象外とする。

// 親密度のフォールバック初期値（game-core 側で管理していれば上書きされる想定）
if (typeof window.petAffinity !== "number") {
  window.petAffinity = 0;
}

/**
 * 親密度に応じたボーナスブースト率を返す。
 * 
 * 親密度 0 → 0.0（ボーナス部分そのまま）
 * 親密度 100 → 0.5（ボーナス部分が +50%）
 * 
 * 例: baseBonus = 0.05（+5%）
 *   親密度0   → 0.05 * (1 + 0.0) = 0.05（+5%）
 *   親密度100 → 0.05 * (1 + 0.5) = 0.075（+7.5%）
 */
function getPetAffinityBoostRatio() {
  const aff = Math.max(0, Math.min(100, window.petAffinity || 0));
  return 0.5 * (aff / 100);
}

/**
 * 「正のボーナス値」にだけ親密度ブーストを掛けるヘルパー。
 * 負の値（デバフ）はそのまま返す。
 * 
 * @param {number} bonus  ボーナス率（例: 0.05 = +5%）
 * @returns {number}      親密度ブーストを反映したボーナス率
 */
function applyAffinityToBonus(bonus) {
  if (!bonus || bonus <= 0) return bonus;
  const boostRatio = getPetAffinityBoostRatio(); // 0.0〜0.5
  return bonus * (1 + boostRatio);
}

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
  },
  // ★追加: 最初の草原で捕まえられる2種（初期選択モーダルには出さず、
  //   探索中のランダムイベントから recruitAdditionalPet("hitsuji"/"shika") で入手する想定）
  {
    id: "hitsuji",
    name: "羊",
    traitId: "hitsuji",
    desc: "ペットHP+8%のみ。シンプルにタフな相棒。"
  },
  {
    id: "shika",
    name: "鹿",
    traitId: "shika",
    desc: "ペット攻撃+3%、HP+2%、防御-3%。その代わり採取追加素材+5%。俊敏な草原の相棒。"
  }
];

// =======================
// 特性データ
// =======================
//
// 各特性が「ペットのステータス」と「各種確率」に与える補正をまとめる。
// 仕様はそのまま維持するが、内部表現を「完成レート」から
// 「ボーナス部分（+5%なら0.05）」に変更する。
// 
// ・petHpBonusRate / petAtkBonusRate / petDefBonusRate:
//     ペットHP/攻撃/防御へのボーナス率（+5%なら 0.05, -5%なら -0.05）
// ・extraGatherBonusRate:
//     採取時に「ペットが追加素材を持ってくる」確率ボーナス（+10%なら 0.10）
// ・craftSuccessBonus:
//     クラフト成功率ボーナス（+5%なら 0.05）
// ・enhanceSuccessBonus:
//     強化成功率ボーナス（+5%なら 0.05）
//
// 実際の乗算レートは
//   1.0 + ボーナス部分（親密度ブースト込み）
// で求める。
//
const COMPANION_TRAITS = {
  inu: {
    name: "犬",
    // 戦闘系ボーナス
    petHpBonusRate: 0.05,  // +5%
    petAtkBonusRate: 0.00,
    petDefBonusRate: 0.02, // +2%
    // 生活系ボーナス
    extraGatherBonusRate: 0.00, // 採取追加素材 +0%
    craftSuccessBonus: 0.00,    // クラフト成功率 +0
    enhanceSuccessBonus: 0.00   // 強化成功率 +0
  },
  karasu: {
    name: "烏",
    petHpBonusRate: 0.02,  // +2%
    petAtkBonusRate: 0.05, // +5%
    petDefBonusRate: 0.00,
    extraGatherBonusRate: 0.00,
    craftSuccessBonus: 0.00,
    enhanceSuccessBonus: 0.00
  },
  usagi: {
    name: "兎",
    petHpBonusRate: -0.05, // -5%
    petAtkBonusRate: -0.05,
    petDefBonusRate: -0.05,
    extraGatherBonusRate: 0.10, // 採取追加素材 +10%
    craftSuccessBonus: 0.05,    // クラフト成功率 +5%
    enhanceSuccessBonus: 0.05   // 強化成功率 +5%
  },
  // ★追加: 最初の草原で捕まえられる2種
  hitsuji: {
    name: "羊",
    petHpBonusRate: 0.08,  // +8%
    petAtkBonusRate: 0.00,
    petDefBonusRate: 0.00,
    extraGatherBonusRate: 0.00,
    craftSuccessBonus: 0.00,
    enhanceSuccessBonus: 0.00
  },
  shika: {
    name: "鹿",
    petHpBonusRate: 0.02,  // +2%
    petAtkBonusRate: 0.03, // +3%
    petDefBonusRate: -0.03, // -3%
    extraGatherBonusRate: 0.05, // 採取追加素材 +5%（草原を駆け回るフレーバー）
    craftSuccessBonus: 0.00,
    enhanceSuccessBonus: 0.00
  }
};

// =======================
// ペットスキル：捕獲時ランダム付与
// =======================
//
// ★方針：スキルは「捕獲したペット個体ごとにランダムで決まる」（種族固定ではない）。
//   実行ロジック（doPetTurn / runBeastPartyPetAction）は id で分岐する作りなので、
//   ここでは「候補プール」と「そこからN個をランダムに重複無しで選ぶ」処理だけ持つ。
//   いずれ交配システムが入ったら、親のスキルを継承/合成する形に拡張する想定。
const PET_SKILL_POOL = [
  { id: "powerBite", name: "パワーバイト", powerRate: 1.6 },
  { id: "taunt",     name: "挑発" },
  { id: "selfHeal",  name: "セルフヒール", healRate: 0.3 },
  { id: "furyStrike", name: "フューリーストライク", powerRate: 2.2, missRate: 0.15 },
  { id: "guardStance", name: "ガードスタンス", defRate: 0.5 }
];
window.PET_SKILL_POOL = PET_SKILL_POOL;

const PET_SKILL_COUNT_ON_CAPTURE = 2; // 捕獲時に付与するスキル数

/**
 * PET_SKILL_POOL から重複無しで count 個ランダムに選んで返す。
 * （個体ごとの skills 配列に丸ごと入れる用）
 */
function rollRandomPetSkills(count) {
  const n = (typeof count === "number" && count > 0) ? count : PET_SKILL_COUNT_ON_CAPTURE;
  const pool = PET_SKILL_POOL.slice();
  const picked = [];
  const take = Math.min(n, pool.length);
  for (let i = 0; i < take; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}
window.rollRandomPetSkills = rollRandomPetSkills;

// =======================
// ペット装備：倉庫(petEquipInstances)⇔個体(rec.equip)の付け外し
// =======================
// ★実体（petEquipInstances配列・petEquipCounts）は pet-equip-data.js 側で管理。
//   ここでは weaponInstances/armorInstances と同じ「付け外し」操作だけを行う。
window.petEquipInstances = Array.isArray(window.petEquipInstances) ? window.petEquipInstances : [];
window.petEquipCounts    = (window.petEquipCounts && typeof window.petEquipCounts === "object") ? window.petEquipCounts : {};

/**
 * petList の指定ペットの名前を変更する（複数ペット対応版）。
 * アクティブペット（単体運用中のグローバルにロード済みの個体）なら
 * petName グローバルにも即反映し、表示が古いままにならないようにする。
 * @param {string} petId
 * @param {string} newName
 * @returns {boolean} 成功したか
 */
function renamePetById(petId, newName) {
  const trimmed = (newName || "").trim();
  if (!trimmed) {
    if (typeof appendLog === "function") appendLog("名前が空です。");
    return false;
  }

  const rec = Array.isArray(window.petList) ? window.petList.find(p => p.id === petId) : null;
  if (!rec) return false;

  const oldName = rec.name;
  rec.name = trimmed;

  // ★このペットが現在アクティブ（単体運用中グローバルにロード済み）なら petName も同期
  if (window.activePetId === petId && typeof window.petName !== "undefined") {
    window.petName = trimmed;
  }

  if (typeof appendLog === "function") {
    appendLog(`ペットの名前を「${oldName}」から「${trimmed}」に変更した。`);
  }
  if (typeof updateDisplay === "function") updateDisplay();
  return true;
}
window.renamePetById = renamePetById;

/**
 * petEquipInstances（倉庫）から指定インデックスの装備を
 * 指定ペットの指定スロットへ移す。元々そのスロットに何か入っていれば
 * petEquipInstances に戻す（＝入れ替え）。
 * @param {string} petId
 * @param {number} slotIndex 0 or 1
 * @param {number} inventoryIndex petEquipInstances内のインデックス
 * @returns {boolean} 成功したか
 */
function equipPetItemFromInventory(petId, slotIndex, inventoryIndex) {
  if (slotIndex !== 0 && slotIndex !== 1) return false;
  if (!Array.isArray(window.petEquipInstances)) window.petEquipInstances = [];
  const inst = window.petEquipInstances[inventoryIndex];
  if (!inst) return false;

  const rec = Array.isArray(window.petList) ? window.petList.find(p => p.id === petId) : null;
  if (!rec) return false;
  if (!Array.isArray(rec.equip)) rec.equip = [null, null];

  // 倉庫から取り出す（＝装備するので倉庫カウントは-1）
  window.petEquipInstances.splice(inventoryIndex, 1);
  if (!window.petEquipCounts) window.petEquipCounts = {};
  window.petEquipCounts[inst.id] = Math.max(0, (window.petEquipCounts[inst.id] || 0) - 1);

  // 元々そのスロットにあったものは倉庫へ戻す（＋1）
  const prev = rec.equip[slotIndex];
  if (prev) {
    window.petEquipInstances.push(prev);
    window.petEquipCounts[prev.id] = (window.petEquipCounts[prev.id] || 0) + 1;
  }

  rec.equip[slotIndex] = inst;

  // ★アクティブペット（単体運用中）ならグローバルにも即反映
  if (window.activePetId === petId && typeof loadActivePetToGlobals === "function") {
    loadActivePetToGlobals();
  }

  const meta = (typeof getItemMeta === "function") ? getItemMeta(inst.id) : null;
  const dispName = meta ? meta.name : inst.id;
  if (typeof appendLog === "function") {
    appendLog(`${rec.name}に${dispName}を装備した`);
  }
  return true;
}
window.equipPetItemFromInventory = equipPetItemFromInventory;

/**
 * 指定ペットの指定スロットの装備を外し、petEquipInstancesへ戻す。
 */
function unequipPetItemToInventory(petId, slotIndex) {
  if (slotIndex !== 0 && slotIndex !== 1) return false;
  const rec = Array.isArray(window.petList) ? window.petList.find(p => p.id === petId) : null;
  if (!rec || !Array.isArray(rec.equip)) return false;

  const inst = rec.equip[slotIndex];
  if (!inst) return false;

  rec.equip[slotIndex] = null;
  if (!Array.isArray(window.petEquipInstances)) window.petEquipInstances = [];
  window.petEquipInstances.push(inst);
  if (!window.petEquipCounts) window.petEquipCounts = {};
  window.petEquipCounts[inst.id] = (window.petEquipCounts[inst.id] || 0) + 1;

  if (window.activePetId === petId && typeof loadActivePetToGlobals === "function") {
    loadActivePetToGlobals();
  }

  const meta = (typeof getItemMeta === "function") ? getItemMeta(inst.id) : null;
  const dispName = meta ? meta.name : inst.id;
  if (typeof appendLog === "function") {
    appendLog(`${rec.name}から${dispName}を外した`);
  }
  return true;
}
window.unequipPetItemToInventory = unequipPetItemToInventory;



//
// companionTypeId : 選んだ動物そのもののID（犬/烏/兎など）
// companionTraitId: 実際の特性ID（今は同じ値を使っているが将来分ける余地）
//
window.companionTypeId  = window.companionTypeId  || null; // "inu" | "karasu" | "usagi"
window.companionTraitId = window.companionTraitId || null;

// 「今日のお世話」が終わった日付（"YYYY-MM-DD"）
// 既存セーブ互換のため、なければ空文字から始める
if (typeof window.petCaredAt !== "string") {
  window.petCaredAt = "";
}

let companionTypeId  = window.companionTypeId;
let companionTraitId = window.companionTraitId;

// =======================
// 複数ペット基盤: グローバルリスト
// =======================
//
// ・従来は「単一ペットのステ変数」を直接使っていたが、
//   それを「アクティブペットのキャッシュ」とみなし、
//   実体は petList 配列に保持する。
// ・既存セーブ互換のため、petList が空なら起動時に
//   単一ペット変数から1件だけ移行する。

window.petList = Array.isArray(window.petList) ? window.petList : [];
window.activePetId = window.activePetId || null;

/**
 * 旧セーブ（単一ペット）から petList への移行ヘルパ。
 * 
 * 条件:
 * - petList が空
 * - companionTypeId がセット済み（=ペットを選択済み）
 * 
 * 実行すると、現在の単一ペット変数から1匹ぶんのレコードを生成して
 * petList に追加し、activePetId を設定する。
 */
function ensurePetListFromLegacy() {
  // すでに petList があれば何もしない
  if (Array.isArray(window.petList) && window.petList.length > 0) return;
  // ペット未選択なら何もしない
  if (!companionTypeId) return;

  // 単一ペット変数を安全に読む（未定義時はフォールバック）
  const name      = (typeof window.petName === "string") ? window.petName : "ペット";
  const level     = (typeof window.petLevel === "number") ? window.petLevel : 1;
  const exp       = (typeof window.petExp === "number") ? window.petExp : 0;
  const expToNext = (typeof window.petExpToNext === "number") ? window.petExpToNext : 5;
  const rebirth   = (typeof window.petRebirthCount === "number") ? window.petRebirthCount : 0;
  const hpBase    = (typeof window.petHpBase === "number") ? window.petHpBase : 10;
  const atkBase   = (typeof window.petAtkBase === "number") ? window.petAtkBase : 4;
  const defBase   = (typeof window.petDefBase === "number") ? window.petDefBase : 2;
  const hpMax     = (typeof window.petHpMax === "number") ? window.petHpMax : hpBase;
  const hp        = (typeof window.petHp === "number") ? window.petHp : hpMax;
  const growth    = (typeof window.petGrowthType === "number") ? window.petGrowthType : (window.PET_GROWTH_BALANCE || 0);
  const buffRate  = (typeof window.petBuffRate === "number") ? window.petBuffRate : 1.0;
  const skills    = Array.isArray(window.petSkills) ? window.petSkills.slice() : [];
  const equip     = Array.isArray(window.petEquip) ? window.petEquip.slice() : [null, null];

  const petId = "p_1";

  const record = {
    id: petId,
    name,
    typeId: companionTypeId,
    traitId: companionTraitId,
    level,
    exp,
    expToNext,
    rebirthCount: rebirth,
    hpBase,
    atkBase,
    defBase,
    hpMax,
    hp,
    growthType: growth,
    buffRate,
    equip,
    skills
  };

  window.petList = [record];
  window.activePetId = petId;
}

/**
 * 既存petList全レコードに対して equip フィールドが無ければ [null, null] で補う。
 * 装備システム実装前のセーブを読み込んだ場合の後方互換用。
 * ensurePetListFromLegacy と同じタイミング（セーブロード直後）で呼ぶ想定。
 */
function ensurePetEquipSlots() {
  if (!Array.isArray(window.petList)) return;
  for (const rec of window.petList) {
    if (rec && !Array.isArray(rec.equip)) {
      rec.equip = [null, null];
    }
  }
}
window.ensurePetEquipSlots = ensurePetEquipSlots;

/**
 * アクティブペット（activePetId）のレコードを取得する。
 * 見つからなければ null。
 */
function getActivePetRecord() {
  if (!window.activePetId || !Array.isArray(window.petList)) return null;
  return window.petList.find(p => p && p.id === window.activePetId) || null;
}

/**
 * petList のレコード内容を単一ペット変数（petLevel, petHpBase 等）に反映する。
 * 
 * - アクティブペットがいない場合は何もしない。
 * - companionTypeId / companionTraitId もレコード側にあるものを優先する。
 * - HP/MP/SP の再計算は game-core 側の recalcStats に任せる前提。
 */
function loadActivePetToGlobals() {
  const rec = getActivePetRecord();
  if (!rec) return;

  // 種・特性
  companionTypeId  = rec.typeId || companionTypeId;
  companionTraitId = rec.traitId || companionTraitId;
  window.companionTypeId  = companionTypeId;
  window.companionTraitId = companionTraitId;

  // 名前
  window.petName = rec.name || "ペット";

  // ステータス系
  window.petLevel        = typeof rec.level === "number" ? rec.level : 1;
  window.petExp          = typeof rec.exp === "number" ? rec.exp : 0;
  window.petExpToNext    = typeof rec.expToNext === "number" ? rec.expToNext : 5;
  window.petRebirthCount = typeof rec.rebirthCount === "number" ? rec.rebirthCount : 0;

  window.petHpBase  = typeof rec.hpBase === "number" ? rec.hpBase : 10;
  window.petAtkBase = typeof rec.atkBase === "number" ? rec.atkBase : 4;
  window.petDefBase = typeof rec.defBase === "number" ? rec.defBase : 2;

  // 最大HP / 現在HP は game-core-1.js の recalcStats でも再計算されるが、
  // ここではレコード上の値を優先してセットしておく。
  if (typeof rec.hpMax === "number") {
    window.petHpMax = rec.hpMax;
  }
  if (typeof rec.hp === "number") {
    window.petHp = rec.hp;
  }

  window.petGrowthType = typeof rec.growthType === "number"
    ? rec.growthType
    : (window.PET_GROWTH_BALANCE || 0);

  window.petBuffRate = typeof rec.buffRate === "number" ? rec.buffRate : 1.0;

  if (Array.isArray(rec.equip)) {
    window.petEquip = rec.equip.slice();
  } else {
    window.petEquip = [null, null];
  }

  if (Array.isArray(rec.skills)) {
    window.petSkills = rec.skills.slice();
  }

  // ステ再計算・UI 更新
  try {
    if (typeof recalcStats === "function") {
      recalcStats();
    } else if (typeof updateDisplay === "function") {
      updateDisplay();
    }
  } catch (e) {
    // noop
  }
}

/**
 * 単一ペット変数の内容を petList のアクティブレコードへ書き戻す。
 * 
 * - アクティブペットがいなければ何もしない。
 * - petList には基本的に「アクティブの最新値」が常に反映される想定。
 */
function saveActivePetFromGlobals() {
  const rec = getActivePetRecord();
  if (!rec) return;

  // 名前
  if (typeof window.petName === "string") {
    rec.name = window.petName;
  }

  // 種・特性
  rec.typeId  = companionTypeId;
  rec.traitId = companionTraitId;

  // ステータス
  rec.level        = (typeof window.petLevel === "number") ? window.petLevel : rec.level;
  rec.exp          = (typeof window.petExp === "number") ? window.petExp : rec.exp;
  rec.expToNext    = (typeof window.petExpToNext === "number") ? window.petExpToNext : rec.expToNext;
  rec.rebirthCount = (typeof window.petRebirthCount === "number") ? window.petRebirthCount : rec.rebirthCount;

  rec.hpBase  = (typeof window.petHpBase === "number") ? window.petHpBase : rec.hpBase;
  rec.atkBase = (typeof window.petAtkBase === "number") ? window.petAtkBase : rec.atkBase;
  rec.defBase = (typeof window.petDefBase === "number") ? window.petDefBase : rec.defBase;

  rec.hpMax = (typeof window.petHpMax === "number") ? window.petHpMax : rec.hpMax;
  rec.hp    = (typeof window.petHp === "number") ? window.petHp : rec.hp;

  rec.growthType = (typeof window.petGrowthType === "number") ? window.petGrowthType : rec.growthType;
  rec.buffRate   = (typeof window.petBuffRate === "number") ? window.petBuffRate : rec.buffRate;

  if (Array.isArray(window.petEquip)) {
    rec.equip = window.petEquip.slice();
  }

  if (Array.isArray(window.petSkills)) {
    rec.skills = window.petSkills.slice();
  }
}

/**
 * アクティブペットを切り替える。
 * 
 * - 現アクティブがいれば saveActivePetFromGlobals() で書き戻し。
 * - activePetId を更新。
 * - loadActivePetToGlobals() で単一変数に反映。
 */
function switchActivePet(petId) {
  if (!petId || !Array.isArray(window.petList)) return;
  const exists = window.petList.some(p => p && p.id === petId);
  if (!exists) return;

  // 現アクティブを保存
  saveActivePetFromGlobals();

  // 切り替え
  window.activePetId = petId;

  // 新アクティブをロード
  loadActivePetToGlobals();
}

// =======================
// 獣群使い用：複数アクティブペット編成（パーティ）
// =======================
//
// ・従来の activePetId（単体運用・動物使い等）とは別に、
//   activePartyIds（配列）で「同時に戦闘へ連れて行くペットID」を管理する。
// ・パーティの最大数はジョブ側（jobs.js の getMaxActivePetSlots）が決める。
// ・戦闘計算は petList のレコードを直接参照・直接書き換えする
//   （petHp 等のフラットなグローバル変数には依存しない）。

window.activePartyIds = Array.isArray(window.activePartyIds) ? window.activePartyIds : [];

/**
 * 現在のジョブで編成できるペットの最大数。
 * 実体は jobs.js の getMaxActivePetSlots()（jobId → bonuses.maxActivePets）。
 * jobs.js 未読込などで参照できない場合は 1（従来どおり単体運用）にフォールバックする。
 */
function getActivePetSlotLimit() {
  if (typeof window.getMaxActivePetSlots === "function") {
    return window.getMaxActivePetSlots();
  }
  return 1;
}

/**
 * activePartyIds を整合性チェックしつつ返す。
 * - petList に存在しないIDは除外。
 * - 空なら activePetId（あれば）を1件だけ入れて返す（後方互換）。
 * - 最大数を超えている分は切り詰める。
 */
function getActivePartyIds() {
  const maxSlots = getActivePetSlotLimit();
  let ids = Array.isArray(window.activePartyIds) ? window.activePartyIds.slice() : [];

  if (Array.isArray(window.petList)) {
    ids = ids.filter(id => window.petList.some(p => p && p.id === id));
  } else {
    ids = [];
  }

  if (ids.length === 0 && window.activePetId) {
    ids = [window.activePetId];
  }

  if (ids.length > maxSlots) {
    ids = ids.slice(0, maxSlots);
  }

  return ids;
}

/**
 * 編成するペットIDの配列を受け取り、activePartyIds を更新する。
 * - petList に存在しないIDは無視。
 * - 最大編成数を超える分は無視（先着順）。
 * - 1体も残らない場合は何もしない（空編成は許可しない）。
 * - 先頭のペットは従来互換のため activePetId / 単一ペット変数にも反映する。
 *
 * @param {string[]} petIds
 * @returns {boolean} 反映できたら true
 */
function setActiveParty(petIds) {
  if (!Array.isArray(petIds) || !Array.isArray(window.petList)) return false;

  const maxSlots = getActivePetSlotLimit();
  const valid = [];
  for (const id of petIds) {
    if (window.petList.some(p => p && p.id === id) && !valid.includes(id)) {
      valid.push(id);
    }
    if (valid.length >= maxSlots) break;
  }

  if (valid.length === 0) return false;

  window.activePartyIds = valid;

  // 先頭のペットを従来の「単体アクティブペット」としても同期しておく
  // （UI のヘッダー表示や旧仕様のコードが単体前提でも壊れないように）
  switchActivePet(valid[0]);

  return true;
}

/**
 * 現在のパーティ（activePartyIds）に対応する petList レコードの実体（参照）を返す。
 * 戦闘ロジックはこの配列の要素を直接書き換えることで petList に反映される。
 *
 * @param {boolean} aliveOnly true なら HP>0 のペットのみ返す
 */
function getActivePartyRecords(aliveOnly) {
  if (!Array.isArray(window.petList)) return [];
  const ids = getActivePartyIds();
  const recs = ids
    .map(id => window.petList.find(p => p && p.id === id))
    .filter(Boolean);
  if (aliveOnly) {
    return recs.filter(r => (typeof r.hp === "number" ? r.hp : 0) > 0);
  }
  return recs;
}

/**
 * 獣群使いなど「複数ペット同時運用」の職かどうか。
 */
function isMultiPetJob() {
  return getActivePetSlotLimit() > 1;
}

// ★獣群使い用：実ステータス（成長込みの現在値）を割る基準値。
//   編成できる頭数（getActivePetSlotLimit、獣群使いなら3）とは別の値として持つ
//   （「3体編成できるが、割るのは6」という設計に対応するため）。
const BEAST_PARTY_STAT_DIVISOR = 2;

/**
 * ペット1体を新規に迎える際の基礎ステータス（hpBase/atkBase/defBase）を返す。
 *
 * ★設計方針：獣群使いは動物使いの上位互換ではなく、
 *   「1体で大暴れする動物使い」に対して「全員合わせて動物使い1体分」になる分散型。
 *   ここでは基礎値は標準のまま返す（＝動物使いと同じ育ち方をする）。
 *   割り算は「初期値」ではなく「戦闘で実際に発揮される実ステータス」側
 *   （getPetRecordAtk / getPetRecordDef / hpMax計算）で毎回かける。
 *   こうすることで、レベルが上がって成長値が積み上がっても、
 *   常に一定の倍率で動物使いとバランスが取れる（初期値だけ割ると、
 *   成長でどんどん差が開いてしまうため）。
 */
function getPetRecruitBaseStats() {
  const stdHp = 10, stdAtk = 4, stdDef = 2;
  return { hpBase: stdHp, atkBase: stdAtk, defBase: stdDef };
}
window.getPetRecruitBaseStats = getPetRecruitBaseStats;

/**
 * petList レコード1件分の実効攻撃力を返す（特性・親密度・レベル込み）。
 * ★獣群使いなど複数ペット運用職の場合は、最後に BEAST_PARTY_STAT_DIVISOR で割る
 *   （成長込みの「今の実力」を毎回割ることで、レベルが上がっても一定倍率を保つ）。
 */
function getPetRecordAtk(rec) {
  if (!rec) return 1;
  const levelBonus = Math.floor((rec.level || 1) * 0.5);
  const adjusted = applyCompanionRatesForTrait(rec.traitId, rec.hpBase, rec.atkBase, rec.defBase);
  const atkBase = adjusted.atk != null ? adjusted.atk : rec.atkBase;
  const equipBonus = (typeof getPetEquipStatTotal === "function") ? getPetEquipStatTotal(rec).atk : 0;
  let atk = atkBase + levelBonus + equipBonus;
  if (typeof isMultiPetJob === "function" && isMultiPetJob()) {
    atk = atk / BEAST_PARTY_STAT_DIVISOR;
  }
  return Math.max(1, Math.floor(atk));
}

/**
 * petList レコード1件分の実効防御力を返す（特性・親密度・レベル込み）。
 * ★獣群使いなど複数ペット運用職の場合は、最後に BEAST_PARTY_STAT_DIVISOR で割る。
 */
function getPetRecordDef(rec) {
  if (!rec) return 0;
  const levelBonus = Math.floor((rec.level || 1) * 0.3);
  const adjusted = applyCompanionRatesForTrait(rec.traitId, rec.hpBase, rec.atkBase, rec.defBase);
  const defBase = adjusted.def != null ? adjusted.def : rec.defBase;
  const equipBonus = (typeof getPetEquipStatTotal === "function") ? getPetEquipStatTotal(rec).def : 0;
  let def = defBase + levelBonus + equipBonus;
  if (typeof isMultiPetJob === "function" && isMultiPetJob()) {
    def = def / BEAST_PARTY_STAT_DIVISOR;
  }
  return Math.max(0, Math.floor(def));
}

/**
 * applyCompanionPetRates のレコード対応版。
 * グローバルの companionTraitId ではなく、引数で受け取った traitId を使う点だけが違う。
 */
function applyCompanionRatesForTrait(traitId, baseHp, baseAtk, baseDef) {
  const trait = COMPANION_TRAITS[traitId];
  if (!trait) {
    return { hp: baseHp, atk: baseAtk, def: baseDef };
  }

  const hpBonus  = trait.petHpBonusRate  || 0;
  const atkBonus = trait.petAtkBonusRate || 0;
  const defBonus = trait.petDefBonusRate || 0;

  const hpBonusWithAffinity  = applyAffinityToBonus(hpBonus);
  const atkBonusWithAffinity = applyAffinityToBonus(atkBonus);
  const defBonusWithAffinity = applyAffinityToBonus(defBonus);

  const hpRate  = 1 + hpBonusWithAffinity;
  const atkRate = 1 + atkBonusWithAffinity;
  const defRate = 1 + defBonusWithAffinity;

  return {
    hp:  Math.floor(baseHp  * hpRate),
    atk: Math.floor(baseAtk * atkRate),
    def: Math.floor(baseDef * defRate)
  };
}

// グローバル公開（他ファイルから参照するため）
window.getActivePetSlotLimit = getActivePetSlotLimit;
window.getActivePartyIds     = getActivePartyIds;
window.setActiveParty        = setActiveParty;
window.getActivePartyRecords = getActivePartyRecords;
window.isMultiPetJob         = isMultiPetJob;
window.getPetRecordAtk       = getPetRecordAtk;
window.getPetRecordDef       = getPetRecordDef;

/**
 * petList レコード1件に経験値を加算し、必要ならレベルアップさせる
 * （addPetExp の petList レコード直接操作版。獣群使いのパーティ全員育成に使う）。
 */
function addPetExpToRecord(rec, amount) {
  if (!rec || !(amount > 0)) return;

  const maxLevel = (typeof MAX_PET_LEVEL === "number") ? MAX_PET_LEVEL : 100;

  if ((rec.level || 1) >= maxLevel) {
    rec.exp = (rec.exp || 0) + amount;
    return;
  }

  rec.exp = (rec.exp || 0) + amount;
  if (!rec.expToNext) rec.expToNext = BASE_EXP_PER_LEVEL;

  let leveled = false;
  // ★成長値（レベルアップ時のhpBase/atkBaseの増加分）は編成数で割らない。標準の伸び幅のまま。
  //   割るのは「戦闘で実際に発揮される実ステータス（hpMax・攻撃力・防御力の最終値）」側。
  //   → hpMax はここで割り、攻撃力・防御力は getPetRecordAtk/getPetRecordDef 側で毎回割る。
  //   こうすることで、レベルが上がって成長値が積み上がっても、
  //   常に一定の倍率で動物使いとバランスが取れる。
  const isMulti = (typeof isMultiPetJob === "function") && isMultiPetJob();

  while (rec.exp >= rec.expToNext && (rec.level || 1) < maxLevel) {
    rec.exp -= rec.expToNext;
    rec.level = (rec.level || 1) + 1;
    leveled = true;

    if (rec.growthType === PET_GROWTH_TANK) {
      rec.hpBase += 7;
      rec.atkBase += 1;
    } else if (rec.growthType === PET_GROWTH_DPS) {
      rec.hpBase += 2;
      rec.atkBase += 3;
    } else {
      rec.hpBase += 4;
      rec.atkBase += 2;
    }

    let baseHpForMax = rec.hpBase;
    const adjusted = applyCompanionRatesForTrait(rec.traitId, rec.hpBase, rec.atkBase, rec.defBase);
    if (adjusted && typeof adjusted.hp === "number") {
      baseHpForMax = adjusted.hp;
    }
    rec.hpMax = baseHpForMax + (rec.rebirthCount || 0) * 3;
    if (typeof getPetHpMaxRateMultiplier === "function") {
      rec.hpMax = Math.floor(rec.hpMax * (1 + getPetHpMaxRateMultiplier()));
    }
    if (isMulti) {
      rec.hpMax = Math.max(1, Math.floor(rec.hpMax / BEAST_PARTY_STAT_DIVISOR));
    }
    rec.hp = rec.hpMax;

    rec.expToNext = BASE_EXP_PER_LEVEL;
  }

  if (leveled && typeof appendLog === "function") {
    appendLog(`${rec.name}のレベルが上がった！ Lv${rec.level}`);
  }
}

/**
 * 編成中パーティ（activePartyIds）の生存メンバー全員に経験値を加算する。
 * 獣群使いの戦闘後処理から呼ぶ想定。
 */
/**
 * 編成中パーティ（activePartyIds）の生存メンバーに経験値を加算する。
 * 獣群使いの戦闘後処理から呼ぶ想定。
 *
 * ★重要：amount はパーティ全員に「満額」ではなく「均等割り」で配る。
 *   動物使い1体分と獣群使い全体の育成ペースをだいたい揃えるため
 *   （満額を全員に配ると、頭数分だけ育成が速くなってしまう）。
 */
function addPetExpToParty(amount) {
  if (!(amount > 0)) return;
  const party = getActivePartyRecords(true);
  if (party.length === 0) return;

  const perPet = Math.max(1, Math.floor(amount / party.length));
  for (const rec of party) {
    addPetExpToRecord(rec, perPet);
  }
  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

window.addPetExpToRecord = addPetExpToRecord;
window.addPetExpToParty  = addPetExpToParty;

/**
 * 獣群使い用：新しいペットを1匹 petList に追加する（既存ペットは消えない）。
 * - petList が編成上限（getActivePetSlotLimit）に達している場合は追加しない。
 * - 追加した個体は自動的に activePartyIds にも編成される（空きがあれば）。
 *
 * @param {string} typeId  COMPANION_TYPES の id（"inu" | "karasu" | "usagi" など）
 * @param {string} [name]  表示名。省略時は種族名を使う。
 * @returns {string|null} 追加できたペットの id。追加できなければ null。
 */
function recruitAdditionalPet(typeId, name) {
  const comp = COMPANION_TYPES.find(c => c.id === typeId);
  if (!comp) return null;
  if (!Array.isArray(window.petList)) window.petList = [];

  const maxSlots = getActivePetSlotLimit();
  if (window.petList.length >= maxSlots) return null;

  // 既存IDと衝突しない新しい id を発行
  let n = window.petList.length + 1;
  let petId = `p_${n}`;
  while (window.petList.some(p => p && p.id === petId)) {
    n++;
    petId = `p_${n}`;
  }

  const stats = getPetRecruitBaseStats();
  const hpBase  = stats.hpBase;
  const atkBase = stats.atkBase;
  const defBase = stats.defBase;
  const adjusted = applyCompanionRatesForTrait(comp.traitId, hpBase, atkBase, defBase);
  let hpMax = (adjusted && typeof adjusted.hp === "number") ? adjusted.hp : hpBase;

  // ★複数ペット運用職（獣群使い等）：HP上限は「今の実力」として毎回割る対象なので、
  //   初期生成時点でも同じ倍率をかけておく（成長込みの計算は addPetExpToRecord 側で継続）。
  if (typeof isMultiPetJob === "function" && isMultiPetJob()) {
    hpMax = Math.max(1, Math.floor(hpMax / BEAST_PARTY_STAT_DIVISOR));
  }

  const record = {
    id: petId,
    name: (typeof name === "string" && name.trim()) ? name.trim() : comp.name,
    typeId: comp.id,
    traitId: comp.traitId,
    level: 1,
    exp: 0,
    expToNext: (typeof BASE_EXP_PER_LEVEL === "number") ? BASE_EXP_PER_LEVEL : 100,
    rebirthCount: 0,
    hpBase,
    atkBase,
    defBase,
    hpMax,
    hp: hpMax,
    growthType: (typeof PET_GROWTH_BALANCE === "number") ? PET_GROWTH_BALANCE : 0,
    buffRate: 1.0,
    equip: [null, null],
    skills: rollRandomPetSkills()
  };

  window.petList.push(record);

  // 空きがあれば自動でパーティに編成する
  const currentParty = getActivePartyIds();
  if (currentParty.length < maxSlots) {
    setActiveParty(currentParty.concat([petId]));
  }

  if (typeof appendLog === "function") {
    appendLog(`新しい仲間「${record.name}」が加わった！`);
  }
  if (typeof updateDisplay === "function") {
    updateDisplay();
  }

  return petId;
}

window.recruitAdditionalPet = recruitAdditionalPet;

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

  // ペット名は初期値「ペット」を維持したいのでここでは上書きしない

  // まだ petList が空なら、新規ペットとして1匹分レコードを作る
  if (!Array.isArray(window.petList) || window.petList.length === 0) {
    const petId = "p_1";
    const name  = (typeof window.petName === "string") ? window.petName : "ペット";

    const level     = (typeof window.petLevel === "number") ? window.petLevel : 1;
    const exp       = (typeof window.petExp === "number") ? window.petExp : 0;
    const expToNext = (typeof window.petExpToNext === "number") ? window.petExpToNext : 5;
    const rebirth   = (typeof window.petRebirthCount === "number") ? window.petRebirthCount : 0;

    // ★複数ペット運用職（獣群使い等）でも、基礎ステータス自体は動物使いと同じ標準値。
    //   （割るのは HP 上限側だけ。攻/防は毎回の戦闘計算 getPetRecordAtk/Def 側で割る）
    const isMulti = (typeof isMultiPetJob === "function") && isMultiPetJob();

    const hpBase  = (typeof window.petHpBase  === "number") ? window.petHpBase  : 10;
    const atkBase = (typeof window.petAtkBase === "number") ? window.petAtkBase : 4;
    const defBase = (typeof window.petDefBase === "number") ? window.petDefBase : 2;

    let hpMax, hp;
    if (isMulti) {
      const adjusted = applyCompanionRatesForTrait(companionTraitId, hpBase, atkBase, defBase);
      let baseHpForMax = (adjusted && typeof adjusted.hp === "number") ? adjusted.hp : hpBase;
      hpMax = Math.max(1, Math.floor(baseHpForMax / BEAST_PARTY_STAT_DIVISOR));
      hp    = hpMax;
    } else {
      hpMax = (typeof window.petHpMax === "number") ? window.petHpMax : hpBase;
      hp    = (typeof window.petHp === "number") ? window.petHp : hpMax;
    }

    const growth    = (typeof window.petGrowthType === "number") ? window.petGrowthType : (window.PET_GROWTH_BALANCE || 0);
    const buffRate  = (typeof window.petBuffRate === "number") ? window.petBuffRate : 1.0;
    // ★既存セーブ（window.petSkillsがある）ならそれを維持、無ければ新規個体としてランダム付与
    const skills    = Array.isArray(window.petSkills) && window.petSkills.length > 0
      ? window.petSkills.slice()
      : rollRandomPetSkills();
    const equip     = Array.isArray(window.petEquip) ? window.petEquip.slice() : [null, null];

    window.petList = [{
      id: petId,
      name,
      typeId: companionTypeId,
      traitId: companionTraitId,
      level,
      exp,
      expToNext,
      rebirthCount: rebirth,
      hpBase,
      atkBase,
      defBase,
      hpMax,
      hp,
      growthType: growth,
      buffRate,
      equip,
      skills
    }];
    window.activePetId = petId;
  }
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
// 「今日のお世話」判定用ヘルパー
// =======================

/**
 * 日付を "YYYY-MM-DD" の文字列で返す。
 */
function getTodayKeyForPetCare() {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 今日のお世話が済んでいるかどうか。
 * （撫でる・ご飯など、いずれかの「お世話行動」が成功した日に true）
 */
function isPetCareDoneToday() {
  const today = getTodayKeyForPetCare();
  return window.petCaredAt === today;
}

/**
 * 今日のお世話が完了したことを記録する。
 * （carePetPetting や今後のご飯処理から呼ぶ）
 */
function markPetCareDoneToday() {
  window.petCaredAt = getTodayKeyForPetCare();
}

// =======================
// ペット表示用ヘルパー
// =======================
//
// 倉庫ペットタブなど UI から、表示に必要なペット情報を
// 配列でまとめて受け取れるようにする（複数ペット前提）。

/**
 * 現在のペットたちの表示用情報を配列で返す。
 * 
 * @returns {Array<{id:string,name:string,speciesName:string,level:number,hp:number,hpMax:number,affinity:number,isCareDoneToday:boolean,isActive:boolean}>}
 */
function getPetDisplayInfoList() {
  const list = [];

  if (!hasCompanion()) {
    // companionTypeId が未設定なら「まだ一匹も選んでいない」扱い
    return list;
  }

  // petList が空で、かつ companionTypeId がある場合は旧セーブ互換として1件だけ作る
  ensurePetListFromLegacy();

  if (!Array.isArray(window.petList)) {
    return list;
  }

  const todayCare = isPetCareDoneToday();
  const affinity  = typeof window.petAffinity === "number" ? window.petAffinity : 0;

  for (const rec of window.petList) {
    if (!rec) continue;

    // 種類名は rec.typeId から取得（なければ現在の companionTypeId）
    const typeId = rec.typeId || companionTypeId;
    let speciesName = "不明";
    const compType = COMPANION_TYPES.find(c => c.id === typeId);
    if (compType) {
      speciesName = compType.name || "不明";
    }

    list.push({
      id: rec.id,
      name: rec.name || "ペット",
      speciesName,
      level: typeof rec.level === "number" ? rec.level : 1,
      hp: typeof rec.hp === "number" ? rec.hp : 0,
      hpMax: typeof rec.hpMax === "number" ? rec.hpMax : 0,
      affinity,
      isCareDoneToday: todayCare,
      isActive: (rec.id === window.activePetId),
      // ★獣群使い用：現在パーティ（同時出撃編成）に入っているかどうか
      isInParty: (typeof getActivePartyIds === "function")
        ? getActivePartyIds().includes(rec.id)
        : (rec.id === window.activePetId)
    });
  }

  return list;
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
 * ※仕様は「犬HP+5%」など現状通りで、内部的な表現のみ
 *   petHpRate → petHpBonusRate 形式に変えている。
 *   親密度ブーストはボーナス部分のみに掛かり、負のボーナスには掛からない。
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

  const hpBonus  = trait.petHpBonusRate  || 0;
  const atkBonus = trait.petAtkBonusRate || 0;
  const defBonus = trait.petDefBonusRate || 0;

  const hpBonusWithAffinity  = applyAffinityToBonus(hpBonus);
  const atkBonusWithAffinity = applyAffinityToBonus(atkBonus);
  const defBonusWithAffinity = applyAffinityToBonus(defBonus);

  const hpRate  = 1 + hpBonusWithAffinity;
  const atkRate = 1 + atkBonusWithAffinity;
  const defRate = 1 + defBonusWithAffinity;

  return {
    hp:  Math.floor(baseHp  * hpRate),
    atk: Math.floor(baseAtk * atkRate),
    def: Math.floor(baseDef * defRate)
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
 * ※ extraGatherBonusRate は「+10%なら0.10」として持ち、
 *    親密度ブーストは正のボーナスにだけ掛かる。
 * 
 * @returns {boolean}
 */
function rollExtraGatherByTrait() {
  const trait = COMPANION_TRAITS[companionTraitId];
  if (!trait || !trait.extraGatherBonusRate) return false;

  const baseBonus = trait.extraGatherBonusRate || 0;
  const bonusWithAffinity = applyAffinityToBonus(baseBonus);

  const rate = bonusWithAffinity;
  if (rate <= 0) return false;

  return Math.random() < rate;
}

/**
 * クラフト成功率ボーナスを返す（0.05なら+5%）。
 * 
 * 使い方:
 *   let successRate = baseRate + getCraftSuccessBonusByTrait();
 * 
 * ※ 正のボーナスにだけ親密度ブーストが掛かる。
 * 
 * @returns {number}
 */
function getCraftSuccessBonusByTrait() {
  const trait = COMPANION_TRAITS[companionTraitId];
  if (!trait) return 0;

  const baseBonus = trait.craftSuccessBonus || 0;
  const bonusWithAffinity = applyAffinityToBonus(baseBonus);

  return bonusWithAffinity;
}

/**
 * 強化成功率ボーナスを返す（0.05なら+5%）。
 * 
 * 使い方:
 *   let successRate = baseRate + getEnhanceSuccessBonusByTrait();
 * 
 * ※ 正のボーナスにだけ親密度ブーストが掛かる。
 * 
 * @returns {number}
 */
function getEnhanceSuccessBonusByTrait() {
  const trait = COMPANION_TRAITS[companionTraitId];
  if (!trait) return 0;

  const baseBonus = trait.enhanceSuccessBonus || 0;
  const bonusWithAffinity = applyAffinityToBonus(baseBonus);

  return bonusWithAffinity;
}

// =======================
// ペットお世話用ヘルパー（撫でる等）
// =======================
//
// 仕様は「既存のゲームロジックを変えない」前提で、
// ・親密度の数値をここで増やす
// ・UI側は carePetPetting() を呼ぶだけ
// にとどめる。

// 撫でる1回あたりの親密度上昇量（1日1回だけ有効）
const PET_PETTING_AFFINITY_GAIN = 3;

// ペットへのご飯共有クールタイム（ミリ秒）
const PET_FEED_COOLDOWN_MS = 8 * 60 * 60 * 1000;

// 直近でご飯をあげた時刻（ms、Date.now()）
if (typeof window.lastPetFeedTime !== "number") {
  window.lastPetFeedTime = 0;
}
let lastPetFeedTime = window.lastPetFeedTime;

/**
 * 今「動物使い」かどうか判定するヘルパ。
 * jobs.js 側の isBeastTamer() を使う。
 */
function isCurrentJobBeastTamer() {
  if (typeof window.isBeastTamer !== "function") {
    return false;
  }
  return window.isBeastTamer();
}

/**
 * ペットを撫でて親密度を少し上げる。
 * 
 * - 動物使いかつペットがいる場合だけ有効。
 * - 1日1回だけ有効（isPetCareDoneToday() が true の日は失敗扱い）。
 * - 親密度は 0〜100 の範囲にクランプ。
 * - 親密度が増えたら「今日のお世話済み」にする。
 * 
 * UI 側からは、倉庫タブの「撫でる」ボタンなどから直接呼ぶ想定。
 */
function carePetPetting() {
  // 職業チェック
  if (!isCurrentJobBeastTamer()) {
    if (typeof appendLog === "function") {
      appendLog("動物使いのときだけペットを撫でられる。");
    }
    return;
  }

  // ペット存在チェック
  if (!hasCompanion()) {
    if (typeof appendLog === "function") {
      appendLog("一緒に旅するペットがいない…。");
    }
    return;
  }

  // 1日1回制限: すでに今日のお世話が済んでいるなら何もしない
  if (isPetCareDoneToday()) {
    if (typeof appendLog === "function") {
      appendLog("今日はもう十分に撫でてあげたようだ。");
    }
    return;
  }

  // 親密度を増やす
  const before = window.petAffinity || 0;
  let after = before + PET_PETTING_AFFINITY_GAIN;
  if (after > 100) after = 100;
  window.petAffinity = after;

  if (typeof appendLog === "function") {
    if (after > before) {
      appendLog("ペットを撫でた。少し懐いてきたようだ…。");
    } else {
      appendLog("ペットはすでにとても懐いているようだ。");
    }
  }

  // 親密度が増えた場合、「今日のお世話済み」とみなす
  if (after > before) {
    markPetCareDoneToday();
  }

  // 親密度ブーストが各種ボーナスに効く可能性があるので、
  // ステータス再計算や画面更新があれば呼んでおく（存在チェック付き）
  try {
    if (typeof recalcStats === "function") {
      recalcStats();
    }
    if (typeof updateDisplay === "function") {
      updateDisplay();
    }
  } catch (e) {
    // noop
  }
}

/**
 * ペットにご飯（料理／飲み物）をあげられる状態かどうか。
 * 8時間クールタイムが明けていれば true。
 */
function canFeedPetNow() {
  if (!lastPetFeedTime) return true;
  const now = Date.now();
  const elapsed = now - lastPetFeedTime;
  return elapsed >= PET_FEED_COOLDOWN_MS;
}

/**
 * ペットのご飯クールタイム残り時間（ミリ秒）を返す。
 * すでに明けていれば 0。
 */
function getPetFeedCooldownRemainingMs() {
  if (!lastPetFeedTime) return 0;
  const now = Date.now();
  const elapsed = now - lastPetFeedTime;
  const remain = PET_FEED_COOLDOWN_MS - elapsed;
  return remain > 0 ? remain : 0;
}

/**
 * 内部ヘルパー: 料理を倉庫／手持ちから1個消費する。
 * 
 * @param {string} itemId 
 * @returns {boolean} 成功したら true（どこかから1個減った）、失敗したら false
 */
function consumeFoodOrDrinkForPet(itemId) {
  if (!itemId) return false;

  // 手持ち・倉庫の両方を見る。優先度は「手持ち → 倉庫」。
  const carryFoods   = window.carryFoods   || {};
  const carryDrinks  = window.carryDrinks  || {};
  const cookedFoods  = window.cookedFoods  || {};
  const cookedDrinks = window.cookedDrinks || {};

  // まず手持ち料理（食べ物）
  if (Object.prototype.hasOwnProperty.call(carryFoods, itemId) && carryFoods[itemId] > 0) {
    carryFoods[itemId] -= 1;
    if (carryFoods[itemId] <= 0) {
      delete carryFoods[itemId];
    }
    return true;
  }

  // 次に手持ち飲み物
  if (Object.prototype.hasOwnProperty.call(carryDrinks, itemId) && carryDrinks[itemId] > 0) {
    carryDrinks[itemId] -= 1;
    if (carryDrinks[itemId] <= 0) {
      delete carryDrinks[itemId];
    }
    return true;
  }

  // 倉庫側食べ物
  if (Object.prototype.hasOwnProperty.call(cookedFoods, itemId) && cookedFoods[itemId] > 0) {
    cookedFoods[itemId] -= 1;
    if (cookedFoods[itemId] <= 0) {
      delete cookedFoods[itemId];
    }
    return true;
  }

  // 倉庫側飲み物
  if (Object.prototype.hasOwnProperty.call(cookedDrinks, itemId) && cookedDrinks[itemId] > 0) {
    cookedDrinks[itemId] -= 1;
    if (cookedDrinks[itemId] <= 0) {
      delete cookedDrinks[itemId];
    }
    return true;
  }

  return false;
}

/**
 * ペットに食べ物／飲み物をあげて親密度を少し上げる。
 * 
 * - 動物使いかつペットがいる場合だけ有効。
 * - 食べ物／飲み物カテゴリ（または cookedFood/cookedDrink）のアイテムのみ有効。
 * - 8時間の共有クールタイム付き。
 * - アイテム固有の効果（HP回復やバフ）は一切適用しない。
 * - インベントリ（手持ち／倉庫）のどこかにある料理を1個消費する。
 * - 親密度は 0〜100 の範囲にクランプ。
 * 
 * @param {string} itemId 与えるアイテムID（UI側から選択して渡す）
 */
function feedPetWithItem(itemId) {
  // 職業チェック
  if (!isCurrentJobBeastTamer()) {
    if (typeof appendLog === "function") {
      appendLog("動物使いのときだけペットにご飯をあげられる。");
    }
    return;
  }

  // ペット存在チェック
  if (!hasCompanion()) {
    if (typeof appendLog === "function") {
      appendLog("一緒に旅するペットがいない…。");
    }
    return;
  }

  if (!itemId) {
    if (typeof appendLog === "function") {
      appendLog("どの料理をあげるか選んでから渡してあげよう。");
    }
    return;
  }

  // クールタイムチェック
  if (!canFeedPetNow()) {
    const remainMs = getPetFeedCooldownRemainingMs();
    const remainMin = Math.ceil(remainMs / 60000);
    const hours = Math.floor(remainMin / 60);
    const mins  = remainMin % 60;
    const remainText = hours > 0
      ? `${hours}時間${mins > 0 ? mins + "分" : ""}`
      : `${remainMin}分`;
    if (typeof appendLog === "function") {
      appendLog(`ペットは今はお腹いっぱいのようだ…。あと${remainText}ほど待ってからご飯をあげよう。`);
    }
    return;
  }

  // アイテムメタからカテゴリ確認（food/drink または cookedFood/cookedDrink のみ許可）
  let isFeedable = false;
  let itemName   = String(itemId);

  try {
    if (typeof getItemMeta === "function") {
      const meta = getItemMeta(itemId);
      if (meta) {
        const cat  = meta.category || null;
        const sk   = meta.storageKind || null;
        if (cat === "food" || cat === "drink" ||
            sk === "cookedFood" || sk === "cookedDrink") {
          isFeedable = true;
        }
        if (meta.name) {
          itemName = meta.name;
        }
      }
    }
  } catch (e) {
    // noop
  }

  if (!isFeedable) {
    if (typeof appendLog === "function") {
      appendLog("そのアイテムはペットにあげるものではないようだ。");
    }
    return;
  }

  // 倉庫／手持ちから1個消費
  const consumed = consumeFoodOrDrinkForPet(itemId);
  if (!consumed) {
    if (typeof appendLog === "function") {
      appendLog("その料理や飲み物を持っていない…。");
    }
    return;
  }

  // 親密度を少し増やす（+1、最大100）
  const before = window.petAffinity || 0;
  let after = before + 1;
  if (after > 100) after = 100;
  window.petAffinity = after;

  // クールタイム更新（共有）
  lastPetFeedTime = Date.now();
  window.lastPetFeedTime = lastPetFeedTime;

  if (typeof appendLog === "function") {
    if (after > before) {
      appendLog(`ペットに${itemName}をあげた。嬉しそうにしている…。`);
    } else {
      appendLog(`ペットに${itemName}をあげたが、これ以上は懐きようがないようだ。`);
    }
  }

  // 親密度ブーストが各種ボーナスに効く可能性があるので、
  // ステータス再計算や画面更新があれば呼んでおく（存在チェック付き）
  try {
    if (typeof recalcStats === "function") {
      recalcStats();
    }
    if (typeof updateDisplay === "function") {
      updateDisplay();
    }
  } catch (e) {
    // noop
  }
}

// =======================
// グローバル公開
// =======================
if (typeof window !== "undefined") {
  window.hasCompanion = hasCompanion;
  window.getCurrentCompanionType = getCurrentCompanionType;
  window.getCurrentCompanionTrait = getCurrentCompanionTrait;
  window.setCompanionByTypeId = setCompanionByTypeId;

  window.isPetCareDoneToday = isPetCareDoneToday;
  window.markPetCareDoneToday = markPetCareDoneToday;
  window.getPetDisplayInfoList = getPetDisplayInfoList;

  window.carePetPetting = carePetPetting;

  window.canFeedPetNow = canFeedPetNow;
  window.getPetFeedCooldownRemainingMs = getPetFeedCooldownRemainingMs;
  window.feedPetWithItem = feedPetWithItem;

  // 複数ペット基盤関連も公開
  window.ensurePetListFromLegacy = ensurePetListFromLegacy;
  window.loadActivePetToGlobals = loadActivePetToGlobals;
  window.saveActivePetFromGlobals = saveActivePetFromGlobals;
  window.switchActivePet = switchActivePet;
}