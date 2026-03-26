// equip-data.js
// 武器・防具・ポーション性能＋強化テーブル

// 強化関連定数
const MAX_ENHANCE_LEVEL = 5;

const ENHANCE_SUCCESS_RATES = [0.70, 0.50, 0.35, 0.25, 0.15];
const ENHANCE_COST_MONEY   = [20,   40,   80,   120,  200];

const BASE_DURABILITY = 3;

// ポーション種別
const POTION_TYPE_HP     = "hp";
const POTION_TYPE_MP     = "mp";
const POTION_TYPE_BOTH   = "both";
const POTION_TYPE_DAMAGE = "damage";

// 武器マスタ
const WEAPONS_INIT = [
  {
    id: "dagger",
    name: "ダガー",
    atk: 1,
    scaleStr: 0.05,
    scaleInt: 0.00,
    cost: { wood: 1, ore: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "short",
    name: "ショートソード",
    atk: 2,
    scaleStr: 0.10,
    scaleInt: 0.00,
    cost: { wood: 1, ore: 2 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 2,
    durability: BASE_DURABILITY
  },
  {
    id: "long",
    name: "ロングソード",
    atk: 3,
    scaleStr: 0.18,
    scaleInt: 0.00,
    cost: { wood: 2, ore: 2 },
    rate: 0.6,
    enhance: 0,
    enhanceStep: 2,
    durability: BASE_DURABILITY
  },
  {
    id: "great",
    name: "グレートソード",
    atk: 5,
    scaleStr: 0.12,
    scaleInt: 0.00,
    cost: { wood: 2, ore: 3 },
    rate: 0.5,
    enhance: 0,
    enhanceStep: 3,
    durability: BASE_DURABILITY
  },
  {
    id: "magicStaff",
    name: "魔法の杖",
    atk: 1,
    scaleStr: 0.00,
    scaleInt: 0.20,
    cost: { wood: 1, herb: 2 },
    rate: 0.6,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "runeSword",
    name: "ルーンソード",
    atk: 2,
    scaleStr: 0.10,
    scaleInt: 0.15,
    cost: { wood: 1, ore: 2, herb: 1 },
    rate: 0.5,
    enhance: 0,
    enhanceStep: 2,
    durability: BASE_DURABILITY
  },
  {
    id: "greatShield",
    name: "大盾",
    atk: 0,
    scaleStr: 0.00,
    scaleInt: 0.00,
    cost: { wood: 2, ore: 1, leather: 1 },
    rate: 0.6,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  }
];

// 防具マスタ
const ARMORS_INIT = [
  {
    id: "leatherVest",
    name: "レザーベスト",
    def: 1,
    scaleVit: 0.00,
    cost: { cloth: 2, leather: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "chainmail",
    name: "チェインメイル",
    def: 2,
    scaleVit: 0.05,
    cost: { ore: 2, leather: 1 },
    rate: 0.6,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "ironArmor",
    name: "アイアンアーマー",
    def: 3,
    scaleVit: 0.10,
    cost: { ore: 3, cloth: 1, leather: 1 },
    rate: 0.5,
    enhance: 0,
    enhanceStep: 2,
    durability: BASE_DURABILITY
  }
];

// ポーションマスタ
const POTIONS_INIT = [
  {
    id: "potion",
    name: "ポーション",
    type: POTION_TYPE_HP,
    power: 0.3,
    flat: 5,
    cost: { herb: 2, water: 1 },
    rate: 0.7
  },
  {
    id: "hiPotion",
    name: "ハイポーション",
    type: POTION_TYPE_HP,
    power: 0.6,
    flat: 10,
    cost: { herb: 3, water: 2 },
    rate: 0.6
  },
  {
    id: "manaPotion",
    name: "マナポーション",
    type: POTION_TYPE_MP,
    power: 0.3,
    flat: 5,
    cost: { herb: 2, water: 2 },
    rate: 0.6
  },
  {
    id: "hiManaPotion",
    name: "ハイマナポーション",
    type: POTION_TYPE_MP,
    power: 0.6,
    flat: 10,
    cost: { herb: 3, water: 3 },
    rate: 0.5
  },
  {
    id: "elixir",
    name: "エリクサー",
    type: POTION_TYPE_BOTH,
    power: 1.0,
    flat: 0,
    cost: { herb: 5, water: 5 },
    rate: 0.5
  },
  {
    id: "bomb",
    name: "爆弾",
    type: POTION_TYPE_DAMAGE,
    power: 10,
    flat: 0,
    cost: { ore: 3, herb: 1 },
    rate: 0.6
  }
];