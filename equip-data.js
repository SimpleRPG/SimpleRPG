// equip-data.js
// 武器・防具・ポーション性能＋強化テーブル

// 強化関連定数
const MAX_ENHANCE_LEVEL = 5;

const ENHANCE_SUCCESS_RATES = [0.70, 0.50, 0.35, 0.25, 0.15];
const ENHANCE_COST_MONEY   = [20,   40,   80,   120,  200];

// レア強化素材（星屑の結晶）
// ・どの採取からもごく低確率で落ちる汎用レア素材（gather-data.js 側で定義）
// ・ここでは「強化で使用する特別素材」としてIDだけ共有しておく。
//   実際に何段階目から要求するかなどのロジックは game-core 側で扱う前提。
const ENHANCE_RARE_ITEM_ID   = "starShard";
const ENHANCE_RARE_ITEM_NAME = "星屑の結晶";

const BASE_DURABILITY = 3;

// ポーション種別
const POTION_TYPE_HP     = "hp";
const POTION_TYPE_MP     = "mp";
const POTION_TYPE_BOTH   = "both";
const POTION_TYPE_DAMAGE = "damage";

// =======================
// 武器マスタ（T1〜T3）
// =======================
//
// atk やスケールはざっくり「Tが上がるほど +2〜3 ずつ伸びる」イメージ。

const WEAPONS_INIT = [
  // 短剣
  {
    id: "dagger_T1",
    name: "ダガーT1",
    atk: 2,
    scaleStr: 0.05,
    scaleInt: 0.00,
    cost: { woodPlank_T1: 1, ironIngot_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "dagger_T2",
    name: "ダガーT2",
    atk: 4,
    scaleStr: 0.08,
    scaleInt: 0.00,
    cost: { woodPlank_T2: 1, ironIngot_T2: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "dagger_T3",
    name: "ダガーT3",
    atk: 6,
    scaleStr: 0.10,
    scaleInt: 0.00,
    cost: { woodPlank_T3: 1, ironIngot_T3: 1 },
    rate: 0.6,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // ショートソード
  {
    id: "short_T1",
    name: "ショートソードT1",
    atk: 3,
    scaleStr: 0.10,
    scaleInt: 0.00,
    cost: { woodPlank_T1: 1, ironIngot_T1: 2 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 2,
    durability: BASE_DURABILITY
  },
  {
    id: "short_T2",
    name: "ショートソードT2",
    atk: 6,
    scaleStr: 0.13,
    scaleInt: 0.00,
    cost: { woodPlank_T2: 1, ironIngot_T2: 2 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 2,
    durability: BASE_DURABILITY
  },
  {
    id: "short_T3",
    name: "ショートソードT3",
    atk: 9,
    scaleStr: 0.16,
    scaleInt: 0.00,
    cost: { woodPlank_T3: 1, ironIngot_T3: 2 },
    rate: 0.65,
    enhance: 0,
    enhanceStep: 2,
    durability: BASE_DURABILITY
  },

  // ロングソード
  {
    id: "long_T1",
    name: "ロングソードT1",
    atk: 5,
    scaleStr: 0.18,
    scaleInt: 0.00,
    cost: { woodPlank_T1: 2, ironIngot_T1: 2 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 2,
    durability: BASE_DURABILITY
  },
  {
    id: "long_T2",
    name: "ロングソードT2",
    atk: 9,
    scaleStr: 0.22,
    scaleInt: 0.00,
    cost: { woodPlank_T2: 2, ironIngot_T2: 2 },
    rate: 0.65,
    enhance: 0,
    enhanceStep: 2,
    durability: BASE_DURABILITY
  },
  {
    id: "long_T3",
    name: "ロングソードT3",
    atk: 13,
    scaleStr: 0.26,
    scaleInt: 0.00,
    cost: { woodPlank_T3: 2, ironIngot_T3: 2 },
    rate: 0.6,
    enhance: 0,
    enhanceStep: 2,
    durability: BASE_DURABILITY
  },

  // グレートソード
  {
    id: "great_T1",
    name: "グレートソードT1",
    atk: 8,
    scaleStr: 0.20,
    scaleInt: 0.00,
    cost: { woodPlank_T1: 2, ironIngot_T1: 3 },
    rate: 0.65,
    enhance: 0,
    enhanceStep: 3,
    durability: BASE_DURABILITY
  },
  {
    id: "great_T2",
    name: "グレートソードT2",
    atk: 13,
    scaleStr: 0.24,
    scaleInt: 0.00,
    cost: { woodPlank_T2: 2, ironIngot_T2: 3 },
    rate: 0.6,
    enhance: 0,
    enhanceStep: 3,
    durability: BASE_DURABILITY
  },
  {
    id: "great_T3",
    name: "グレートソードT3",
    atk: 18,
    scaleStr: 0.28,
    scaleInt: 0.00,
    cost: { woodPlank_T3: 2, ironIngot_T3: 3 },
    rate: 0.55,
    enhance: 0,
    enhanceStep: 3,
    durability: BASE_DURABILITY
  },

  // 魔法の杖
  {
    id: "magicStaff_T1",
    name: "魔法の杖T1",
    atk: 2,
    scaleStr: 0.00,
    scaleInt: 0.20,
    cost: { woodPlank_T1: 1, herb: 2 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "magicStaff_T2",
    name: "魔法の杖T2",
    atk: 4,
    scaleStr: 0.00,
    scaleInt: 0.28,
    cost: { woodPlank_T2: 1, herb: 3 },
    rate: 0.65,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "magicStaff_T3",
    name: "魔法の杖T3",
    atk: 6,
    scaleStr: 0.00,
    scaleInt: 0.36,
    cost: { woodPlank_T3: 1, herb: 4 },
    rate: 0.6,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // ルーンソード
  {
    id: "runeSword_T1",
    name: "ルーンソードT1",
    atk: 4,
    scaleStr: 0.10,
    scaleInt: 0.15,
    cost: { woodPlank_T1: 1, ironIngot_T1: 2, herb: 1 },
    rate: 0.65,
    enhance: 0,
    enhanceStep: 2,
    durability: BASE_DURABILITY
  },
  {
    id: "runeSword_T2",
    name: "ルーンソードT2",
    atk: 7,
    scaleStr: 0.13,
    scaleInt: 0.20,
    cost: { woodPlank_T2: 1, ironIngot_T2: 2, herb: 2 },
    rate: 0.6,
    enhance: 0,
    enhanceStep: 2,
    durability: BASE_DURABILITY
  },
  {
    id: "runeSword_T3",
    name: "ルーンソードT3",
    atk: 11,
    scaleStr: 0.16,
    scaleInt: 0.25,
    cost: { woodPlank_T3: 1, ironIngot_T3: 2, herb: 3 },
    rate: 0.55,
    enhance: 0,
    enhanceStep: 2,
    durability: BASE_DURABILITY
  },

  // グレートシールド（盾）
  {
    id: "greatShield_T1",
    name: "大盾T1",
    atk: 0,
    scaleStr: 0.00,
    scaleInt: 0.00,
    cost: { woodPlank_T1: 2, ironIngot_T1: 1, toughLeather_T1: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "greatShield_T2",
    name: "大盾T2",
    atk: 0,
    scaleStr: 0.00,
    scaleInt: 0.00,
    cost: { woodPlank_T2: 2, ironIngot_T2: 1, toughLeather_T2: 1 },
    rate: 0.65,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "greatShield_T3",
    name: "大盾T3",
    atk: 0,
    scaleStr: 0.00,
    scaleInt: 0.00,
    cost: { woodPlank_T3: 2, ironIngot_T3: 1, toughLeather_T3: 1 },
    rate: 0.6,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  }
];

// =======================
// 防具マスタ（T1〜T3）
// =======================
//
// レザー：DEF低め＋DEXボーナス
// チェイン：DEFとVITスケールバランス
// アイアン：DEF高め＋VITスケール高め

const ARMORS_INIT = [
  // レザーベスト（軽装）
  {
    id: "leatherVest_T1",
    name: "レザーベストT1",
    def: 2,
    scaleVit: 0.01,
    bonusDex: 1, // 装備中 DEX+1
    cost: { clothBolt_T1: 1, toughLeather_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "leatherVest_T2",
    name: "レザーベストT2",
    def: 4,
    scaleVit: 0.02,
    bonusDex: 2,
    cost: { clothBolt_T2: 1, toughLeather_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "leatherVest_T3",
    name: "レザーベストT3",
    def: 6,
    scaleVit: 0.03,
    bonusDex: 3,
    cost: { clothBolt_T3: 1, toughLeather_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // チェインメイル（バランス）
  {
    id: "chainmail_T1",
    name: "チェインメイルT1",
    def: 4,
    scaleVit: 0.06,
    cost: { ironIngot_T1: 2, toughLeather_T1: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "chainmail_T2",
    name: "チェインメイルT2",
    def: 7,
    scaleVit: 0.09,
    cost: { ironIngot_T2: 2, toughLeather_T2: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "chainmail_T3",
    name: "チェインメイルT3",
    def: 10,
    scaleVit: 0.12,
    cost: { ironIngot_T3: 2, toughLeather_T3: 1 },
    rate: 0.65,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // アイアンアーマー（重装）
  {
    id: "ironArmor_T1",
    name: "アイアンアーマーT1",
    def: 7,
    scaleVit: 0.12,
    cost: { ironIngot_T1: 3, clothBolt_T1: 1, toughLeather_T1: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 2,
    durability: BASE_DURABILITY
  },
  {
    id: "ironArmor_T2",
    name: "アイアンアーマーT2",
    def: 11,
    scaleVit: 0.16,
    cost: { ironIngot_T2: 3, clothBolt_T2: 1, toughLeather_T2: 1 },
    rate: 0.65,
    enhance: 0,
    enhanceStep: 2,
    durability: BASE_DURABILITY
  },
  {
    id: "ironArmor_T3",
    name: "アイアンアーマーT3",
    def: 15,
    scaleVit: 0.20,
    cost: { ironIngot_T3: 3, clothBolt_T3: 1, toughLeather_T3: 1 },
    rate: 0.6,
    enhance: 0,
    enhanceStep: 2,
    durability: BASE_DURABILITY
  }
];

// =======================
// ポーションマスタ（爆弾含む）
// =======================
//
// クラフトは中間素材（mixHerb_Tx / distilledWater_Tx など）を想定。
// ここでも cost を中間素材ベースに合わせる。

const POTIONS_INIT = [
  {
    id: "potionT1",
    name: "ポーションT1",
    type: POTION_TYPE_HP,
    power: 0.30,
    flat: 5,
    cost: { mixHerb_T1: 1, distilledWater_T1: 1 },
    rate: 0.8
  },
  {
    id: "potionT2",
    name: "ポーションT2",
    type: POTION_TYPE_HP,
    power: 0.55,
    flat: 10,
    cost: { mixHerb_T2: 1, distilledWater_T2: 1 },
    rate: 0.7
  },
  {
    id: "potionT3",
    name: "ポーションT3",
    type: POTION_TYPE_HP,
    power: 0.80,
    flat: 15,
    cost: { mixHerb_T3: 1, distilledWater_T3: 1 },
    rate: 0.6
  },

  {
    id: "manaT1",
    name: "マナポーションT1",
    type: POTION_TYPE_MP,
    power: 0.30,
    flat: 5,
    cost: { mixHerb_T1: 1, distilledWater_T1: 2 },
    rate: 0.8
  },
  {
    id: "manaT2",
    name: "マナポーションT2",
    type: POTION_TYPE_MP,
    power: 0.55,
    flat: 10,
    cost: { mixHerb_T2: 1, distilledWater_T2: 2 },
    rate: 0.7
  },
  {
    id: "manaT3",
    name: "マナポーションT3",
    type: POTION_TYPE_MP,
    power: 0.80,
    flat: 15,
    cost: { mixHerb_T3: 1, distilledWater_T3: 2 },
    rate: 0.6
  },

  {
    id: "elixirT3",
    name: "エリクサー",
    type: POTION_TYPE_BOTH,
    power: 1.00,
    flat: 0,
    cost: { mixHerb_T3: 2, distilledWater_T3: 2, ironIngot_T3: 1 },
    rate: 0.5
  },

  // ショップ用・汎用爆弾（T1相当、少し弱め）
  // ※爆弾自体は道具として扱うが、POTIONS_INIT には既存仕様に合わせて残す
  {
    id: "bomb",
    name: "爆弾",
    type: POTION_TYPE_DAMAGE,
    power: 7,         // 固定ダメージ
    flat: 0,
    cost: { ironIngot_T1: 2, mixHerb_T1: 1 },
    rate: 0.7
  }
];