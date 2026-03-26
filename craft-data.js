// craft-data.js
// クラフトレシピ＆クラフトスキル定義＋成功率ボーナス＆品質ロジック

// =======================
// スキル定義
// =======================

// クラフトカテゴリごとのスキル最大値
const CRAFT_SKILL_MAX_LV = 100;

// クラフトスキル初期値
// game-core.js 側でこのオブジェクトをコピーして使う
const CRAFT_SKILLS_INIT = {
  weapon: { lv: 0, exp: 0, expToNext: 10 },
  armor:  { lv: 0, exp: 0, expToNext: 10 },
  potion: { lv: 0, exp: 0, expToNext: 10 },
  tool:   { lv: 0, exp: 0, expToNext: 10 }
};

// =======================
// レシピ一覧
// =======================

const CRAFT_RECIPES = {
  weapon: [
    { id: "dagger",      name: "短剣",             cost: { wood: 1, ore: 1 },             baseRate: 0.7 },
    { id: "short",       name: "ショートソード",   cost: { wood: 1, ore: 2 },             baseRate: 0.7 },
    { id: "long",        name: "ロングソード",     cost: { wood: 2, ore: 2 },             baseRate: 0.6 },
    { id: "great",       name: "グレートソード",   cost: { wood: 2, ore: 3 },             baseRate: 0.5 },
    { id: "magicStaff",  name: "魔法の杖",         cost: { wood: 1, herb: 2 },            baseRate: 0.6 },
    { id: "runeSword",   name: "ルーンソード",     cost: { wood: 1, ore: 2, herb: 1 },    baseRate: 0.5 },
    { id: "greatShield", name: "グレートシールド", cost: { wood: 2, ore: 1, leather: 1 }, baseRate: 0.6 }
  ],
  armor: [
    { id: "leatherVest", name: "レザーベスト",  cost: { cloth: 2, leather: 1 },         baseRate: 0.7 },
    { id: "chainmail",   name: "チェインメイル", cost: { ore: 2,   leather: 1 },         baseRate: 0.6 },
    { id: "ironArmor",   name: "鉄の鎧",        cost: { ore: 3, cloth: 1, leather: 1 }, baseRate: 0.5 }
  ],
  potion: [
    { id: "potion",       name: "ポーション",         cost: { herb: 2, water: 1 }, baseRate: 0.7 },
    { id: "hiPotion",     name: "ハイポーション",     cost: { herb: 3, water: 2 }, baseRate: 0.6 },
    { id: "manaPotion",   name: "マナポーション",     cost: { herb: 2, water: 2 }, baseRate: 0.6 },
    { id: "hiManaPotion", name: "ハイマナポーション", cost: { herb: 3, water: 3 }, baseRate: 0.5 },
    { id: "elixir",       name: "エリクサー",         cost: { herb: 5, water: 5 }, baseRate: 0.5 },
    { id: "bomb",         name: "爆弾",               cost: { ore: 3, herb: 1 },   baseRate: 0.6 }
  ],
  tool: [
    // 将来用
  ]
};

// =======================
// 成功率ボーナス
// =======================

// スキルLvに応じた成功率ボーナスを計算
// baseRate: レシピ側の基本成功率（0〜1）
// skillLv:  クラフトスキルLv（0〜CRAFT_SKILL_MAX_LV）
// 戻り値: 実際に使う成功率（0.9上限）
function calcCraftSuccessRate(baseRate, skillLv) {
  const bonus = 0.15 * (skillLv / 100);  // Lv100で+0.15 → +15%
  let rate = baseRate + bonus;
  if (rate > 0.90) rate = 0.90;
  return rate;
}

// =======================
// 品質ロジック
// =======================

// クラフトスキルLvに応じた品質ロール
// 要求仕様：
//   Lv0   → 良品0% / 傑作0%
//   Lv100 → 良品50% / 傑作20% （線形に増加）
//
// 戻り値: 0=普通, 1=良品, 2=傑作
function rollQualityBySkillLv(skillLv) {
  const goodRate = 0.005 * skillLv; // 0〜0.50
  const exRate   = 0.002 * skillLv; // 0〜0.20

  const r = Math.random();
  if (r < exRate) {
    return 2;              // 傑作
  } else if (r < exRate + goodRate) {
    return 1;              // 良品
  }
  return 0;                // 普通
}