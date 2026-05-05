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

// 「今日のお世話」が終わった日付（"YYYY-MM-DD"）
// 既存セーブ互換のため、なければ空文字から始める
if (typeof window.petCaredAt !== "string") {
  window.petCaredAt = "";
}

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

  // ペット名は初期値「ペット」を維持したいのでここでは上書きしない
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
// 配列でまとめて受け取れるようにする（将来複数ペット前提）。

/**
 * 現在のペットたちの表示用情報を配列で返す。
 * 今は1体だけを "main" として返すが、将来はここを拡張すればよい。
 * 
 * @returns {Array<{id:string,name:string,speciesName:string,level:number,hp:number,hpMax:number,affinity:number,isCareDoneToday:boolean}>}
 */
function getPetDisplayInfoList() {
  const list = [];

  if (!hasCompanion()) {
    return list;
  }

  const compType = (typeof getCurrentCompanionType === "function")
    ? getCurrentCompanionType()
    : null;

  const speciesName = compType ? (compType.name || "不明") : "不明";

  const petName   = typeof window.petName === "string" ? window.petName : "ペット";
  const petLevel  = typeof window.petLevel === "number" ? window.petLevel : 1;
  const petHp     = typeof window.petHp === "number" ? window.petHp : 0;
  const petHpMax  = typeof window.petHpMax === "number" ? window.petHpMax : 0;
  const affinity  = typeof window.petAffinity === "number" ? window.petAffinity : 0;

  list.push({
    id: "main",
    name: petName,
    speciesName,
    level: petLevel,
    hp: petHp,
    hpMax: petHpMax,
    affinity,
    isCareDoneToday: isPetCareDoneToday()
  });

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

// 直近でご飯をあげた時刻（ms、Date.now()）[web:82][web:85][web:181]
if (typeof window.lastPetFeedTime !== "number") {
  window.lastPetFeedTime = 0;
}
let lastPetFeedTime = window.lastPetFeedTime;

/**
 * 今「動物使い」かどうか判定するヘルパ。
 * game-core 側の isBeastTamer があればそれを優先して使う。
 */
function isCurrentJobBeastTamer() {
  try {
    if (typeof window.isBeastTamer === "function") {
      return window.isBeastTamer();
    }
    if (typeof window.jobId === "number") {
      return window.jobId === 2;
    }
  } catch (e) {
    // noop
  }
  return false;
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
  const now = Date.now(); // [web:82][web:85][web:181]
  const elapsed = now - lastPetFeedTime;
  return elapsed >= PET_FEED_COOLDOWN_MS;
}

/**
 * ペットのご飯クールタイム残り時間（ミリ秒）を返す。
 * すでに明けていれば 0。
 */
function getPetFeedCooldownRemainingMs() {
  if (!lastPetFeedTime) return 0;
  const now = Date.now(); // [web:82][web:85][web:181]
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
  lastPetFeedTime = Date.now(); // [web:82][web:85][web:181]
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
}