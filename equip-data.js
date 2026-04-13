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
  },

  // =======================
  // 採取用武器（戦闘武器の約1/3の攻撃力）
  // =======================

  // 伐採用ツール
  {
    id: "gatherAxe_T1",
    name: "伐採用ツールT1",
    atk: Math.round(5 / 3), // ロングソードT1の約1/3
    scaleStr: 0.06,
    scaleInt: 0.00,
    cost: { woodPlank_T1: 2, ironIngot_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherAxe_T2",
    name: "伐採用ツールT2",
    atk: Math.round(9 / 3),
    scaleStr: 0.08,
    scaleInt: 0.00,
    cost: { woodPlank_T2: 2, ironIngot_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherAxe_T3",
    name: "伐採用ツールT3",
    atk: Math.round(13 / 3),
    scaleStr: 0.10,
    scaleInt: 0.00,
    cost: { woodPlank_T3: 2, ironIngot_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // 採掘用ツール
  {
    id: "gatherPick_T1",
    name: "採掘用ツールT1",
    atk: Math.round(5 / 3),
    scaleStr: 0.06,
    scaleInt: 0.00,
    cost: { ironIngot_T1: 2, woodPlank_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherPick_T2",
    name: "採掘用ツールT2",
    atk: Math.round(9 / 3),
    scaleStr: 0.08,
    scaleInt: 0.00,
    cost: { ironIngot_T2: 2, woodPlank_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherPick_T3",
    name: "採掘用ツールT3",
    atk: Math.round(13 / 3),
    scaleStr: 0.10,
    scaleInt: 0.00,
    cost: { ironIngot_T3: 2, woodPlank_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // 採草用ツール
  {
    id: "gatherKnife_T1",
    name: "採草用ツールT1",
    atk: Math.round(3 / 3), // ショートソードT1基準
    scaleStr: 0.05,
    scaleInt: 0.00,
    cost: { clothBolt_T1: 1, toughLeather_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherKnife_T2",
    name: "採草用ツールT2",
    atk: Math.round(6 / 3),
    scaleStr: 0.07,
    scaleInt: 0.00,
    cost: { clothBolt_T2: 1, toughLeather_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherKnife_T3",
    name: "採草用ツールT3",
    atk: Math.round(9 / 3),
    scaleStr: 0.09,
    scaleInt: 0.00,
    cost: { clothBolt_T3: 1, toughLeather_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // 布採取用ツール
  {
    id: "gatherShears_T1",
    name: "布採取用ツールT1",
    atk: Math.round(3 / 3),
    scaleStr: 0.05,
    scaleInt: 0.00,
    cost: { clothBolt_T1: 2, toughLeather_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherShears_T2",
    name: "布採取用ツールT2",
    atk: Math.round(6 / 3),
    scaleStr: 0.07,
    scaleInt: 0.00,
    cost: { clothBolt_T2: 2, toughLeather_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherShears_T3",
    name: "布採取用ツールT3",
    atk: Math.round(9 / 3),
    scaleStr: 0.09,
    scaleInt: 0.00,
    cost: { clothBolt_T3: 2, toughLeather_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // 皮採取用ツール
  {
    id: "gatherDagger_T1",
    name: "皮採取用ツールT1",
    atk: Math.round(2 / 3), // ダガー基準
    scaleStr: 0.05,
    scaleInt: 0.00,
    cost: { toughLeather_T1: 2, clothBolt_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherDagger_T2",
    name: "皮採取用ツールT2",
    atk: Math.round(4 / 3),
    scaleStr: 0.07,
    scaleInt: 0.00,
    cost: { toughLeather_T2: 2, clothBolt_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherDagger_T3",
    name: "皮採取用ツールT3",
    atk: Math.round(6 / 3),
    scaleStr: 0.09,
    scaleInt: 0.00,
    cost: { toughLeather_T3: 2, clothBolt_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // 水採取用ツール
  {
    id: "gatherFlask_T1",
    name: "水採取用ツールT1",
    atk: 0,
    scaleStr: 0.00,
    scaleInt: 0.00,
    cost: { distilledWater_T1: 1, ironIngot_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherFlask_T2",
    name: "水採取用ツールT2",
    atk: 0,
    scaleStr: 0.00,
    scaleInt: 0.00,
    cost: { distilledWater_T2: 1, ironIngot_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherFlask_T3",
    name: "水採取用ツールT3",
    atk: 0,
    scaleStr: 0.00,
    scaleInt: 0.00,
    cost: { distilledWater_T3: 1, ironIngot_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // 狩猟用ツール
  {
    id: "huntTool_T1",
    name: "狩猟用ツールT1",
    atk: Math.round(3 / 3),
    scaleStr: 0.08,
    scaleInt: 0.00,
    cost: { ironIngot_T1: 1, toughLeather_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "huntTool_T2",
    name: "狩猟用ツールT2",
    atk: Math.round(6 / 3),
    scaleStr: 0.10,
    scaleInt: 0.00,
    cost: { ironIngot_T2: 1, toughLeather_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "huntTool_T3",
    name: "狩猟用ツールT3",
    atk: Math.round(9 / 3),
    scaleStr: 0.12,
    scaleInt: 0.00,
    cost: { ironIngot_T3: 1, toughLeather_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // 釣り用ツール
  {
    id: "fishTool_T1",
    name: "釣り用ツールT1",
    atk: 0,
    scaleStr: 0.00,
    scaleInt: 0.00,
    cost: { woodPlank_T1: 1, clothBolt_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "fishTool_T2",
    name: "釣り用ツールT2",
    atk: 0,
    scaleStr: 0.00,
    scaleInt: 0.00,
    cost: { woodPlank_T2: 1, clothBolt_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "fishTool_T3",
    name: "釣り用ツールT3",
    atk: 0,
    scaleStr: 0.00,
    scaleInt: 0.00,
    cost: { woodPlank_T3: 1, clothBolt_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // 畑作業用ツール
  {
    id: "farmTool_T1",
    name: "畑作業用ツールT1",
    atk: 0,
    scaleStr: 0.00,
    scaleInt: 0.00,
    cost: { woodPlank_T1: 1, mixHerb_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "farmTool_T2",
    name: "畑作業用ツールT2",
    atk: 0,
    scaleStr: 0.00,
    scaleInt: 0.00,
    cost: { woodPlank_T2: 1, mixHerb_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "farmTool_T3",
    name: "畑作業用ツールT3",
    atk: 0,
    scaleStr: 0.00,
    scaleInt: 0.00,
    cost: { woodPlank_T3: 1, mixHerb_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // 菜園用ツール
  {
    id: "gardenTool_T1",
    name: "菜園用ツールT1",
    atk: 0,
    scaleStr: 0.00,
    scaleInt: 0.00,
    cost: { clothBolt_T1: 1, mixHerb_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gardenTool_T2",
    name: "菜園用ツールT2",
    atk: 0,
    scaleStr: 0.00,
    scaleInt: 0.00,
    cost: { clothBolt_T2: 1, mixHerb_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gardenTool_T3",
    name: "菜園用ツールT3",
    atk: 0,
    scaleStr: 0.00,
    scaleInt: 0.00,
    cost: { clothBolt_T3: 1, mixHerb_T3: 1 },
    rate: 0.7,
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
  },

  // =======================
  // 採取用防具（戦闘防具の約1/3の防御力）
  // =======================

  // 伐採用防具
  {
    id: "gatherArmorWood_T1",
    name: "伐採用防具T1",
    def: Math.round(7 / 3), // アイアンアーマーT1基準
    scaleVit: 0.04,
    bonusDex: 0,
    cost: { toughLeather_T1: 1, clothBolt_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorWood_T2",
    name: "伐採用防具T2",
    def: Math.round(11 / 3),
    scaleVit: 0.05,
    bonusDex: 0,
    cost: { toughLeather_T2: 1, clothBolt_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorWood_T3",
    name: "伐採用防具T3",
    def: Math.round(15 / 3),
    scaleVit: 0.06,
    bonusDex: 0,
    cost: { toughLeather_T3: 1, clothBolt_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // 採掘用防具
  {
    id: "gatherArmorOre_T1",
    name: "採掘用防具T1",
    def: Math.round(7 / 3),
    scaleVit: 0.04,
    bonusDex: 0,
    cost: { ironIngot_T1: 1, toughLeather_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorOre_T2",
    name: "採掘用防具T2",
    def: Math.round(11 / 3),
    scaleVit: 0.05,
    bonusDex: 0,
    cost: { ironIngot_T2: 1, toughLeather_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorOre_T3",
    name: "採掘用防具T3",
    def: Math.round(15 / 3),
    scaleVit: 0.06,
    bonusDex: 0,
    cost: { ironIngot_T3: 1, toughLeather_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // 採草用防具
  {
    id: "gatherArmorHerb_T1",
    name: "採草用防具T1",
    def: Math.round(6 / 3), // レザーベスト/チェインの中間くらい
    scaleVit: 0.03,
    bonusDex: 0,
    cost: { clothBolt_T1: 1, mixHerb_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorHerb_T2",
    name: "採草用防具T2",
    def: Math.round(10 / 3),
    scaleVit: 0.04,
    bonusDex: 0,
    cost: { clothBolt_T2: 1, mixHerb_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorHerb_T3",
    name: "採草用防具T3",
    def: Math.round(15 / 3),
    scaleVit: 0.05,
    bonusDex: 0,
    cost: { clothBolt_T3: 1, mixHerb_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // 布採取用防具
  {
    id: "gatherArmorCloth_T1",
    name: "布採取用防具T1",
    def: Math.round(4 / 3),
    scaleVit: 0.02,
    bonusDex: 0,
    cost: { clothBolt_T1: 2 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorCloth_T2",
    name: "布採取用防具T2",
    def: Math.round(7 / 3),
    scaleVit: 0.03,
    bonusDex: 0,
    cost: { clothBolt_T2: 2 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorCloth_T3",
    name: "布採取用防具T3",
    def: Math.round(10 / 3),
    scaleVit: 0.04,
    bonusDex: 0,
    cost: { clothBolt_T3: 2 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // 皮採取用防具
  {
    id: "gatherArmorLeather_T1",
    name: "皮採取用防具T1",
    def: Math.round(4 / 3),
    scaleVit: 0.02,
    bonusDex: 0,
    cost: { toughLeather_T1: 2 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorLeather_T2",
    name: "皮採取用防具T2",
    def: Math.round(7 / 3),
    scaleVit: 0.03,
    bonusDex: 0,
    cost: { toughLeather_T2: 2 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorLeather_T3",
    name: "皮採取用防具T3",
    def: Math.round(10 / 3),
    scaleVit: 0.04,
    bonusDex: 0,
    cost: { toughLeather_T3: 2 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // 水採取用防具
  {
    id: "gatherArmorWater_T1",
    name: "水採取用防具T1",
    def: Math.round(4 / 3),
    scaleVit: 0.02,
    bonusDex: 0,
    cost: { distilledWater_T1: 1, clothBolt_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorWater_T2",
    name: "水採取用防具T2",
    def: Math.round(7 / 3),
    scaleVit: 0.03,
    bonusDex: 0,
    cost: { distilledWater_T2: 1, clothBolt_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorWater_T3",
    name: "水採取用防具T3",
    def: Math.round(10 / 3),
    scaleVit: 0.04,
    bonusDex: 0,
    cost: { distilledWater_T3: 1, clothBolt_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // 狩猟用防具
  {
    id: "gatherArmorHunt_T1",
    name: "狩猟用防具T1",
    def: Math.round(6 / 3),
    scaleVit: 0.03,
    bonusDex: 0,
    cost: { toughLeather_T1: 1, ironIngot_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorHunt_T2",
    name: "狩猟用防具T2",
    def: Math.round(9 / 3),
    scaleVit: 0.04,
    bonusDex: 0,
    cost: { toughLeather_T2: 1, ironIngot_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorHunt_T3",
    name: "狩猟用防具T3",
    def: Math.round(12 / 3),
    scaleVit: 0.05,
    bonusDex: 0,
    cost: { toughLeather_T3: 1, ironIngot_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // 畑用防具
  {
    id: "gatherArmorFarm_T1",
    name: "畑用防具T1",
    def: Math.round(4 / 3),
    scaleVit: 0.02,
    bonusDex: 0,
    cost: { clothBolt_T1: 1, mixHerb_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorFarm_T2",
    name: "畑用防具T2",
    def: Math.round(7 / 3),
    scaleVit: 0.03,
    bonusDex: 0,
    cost: { clothBolt_T2: 1, mixHerb_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorFarm_T3",
    name: "畑用防具T3",
    def: Math.round(10 / 3),
    scaleVit: 0.04,
    bonusDex: 0,
    cost: { clothBolt_T3: 1, mixHerb_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },

  // 菜園用防具
  {
    id: "gatherArmorGarden_T1",
    name: "菜園用防具T1",
    def: Math.round(4 / 3),
    scaleVit: 0.02,
    bonusDex: 0,
    cost: { clothBolt_T1: 1, mixHerb_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorGarden_T2",
    name: "菜園用防具T2",
    def: Math.round(7 / 3),
    scaleVit: 0.03,
    bonusDex: 0,
    cost: { clothBolt_T2: 1, mixHerb_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  },
  {
    id: "gatherArmorGarden_T3",
    name: "菜園用防具T3",
    def: Math.round(10 / 3),
    scaleVit: 0.04,
    bonusDex: 0,
    cost: { clothBolt_T3: 1, mixHerb_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: BASE_DURABILITY
  }
];

// =======================
// ポーションマスタ（爆弾・ボトル系含む）
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

  // 攻撃強化ポーション（料理よりバフ値少し高め・ターン数短い想定）
  {
    id: "buffAtk_T1",
    name: "攻撃強化ポーションT1",
    type: POTION_TYPE_BOTH,
    power: 0,
    flat: 0,
    cost: { mixHerb_T1: 1, ironIngot_T1: 1 },
    rate: 0.8
  },
  {
    id: "buffAtk_T2",
    name: "攻撃強化ポーションT2",
    type: POTION_TYPE_BOTH,
    power: 0,
    flat: 0,
    cost: { mixHerb_T2: 2, ironIngot_T2: 1 },
    rate: 0.7
  },
  {
    id: "buffAtk_T3",
    name: "攻撃強化ポーションT3",
    type: POTION_TYPE_BOTH,
    power: 0,
    flat: 0,
    cost: { mixHerb_T3: 3, ironIngot_T3: 2 },
    rate: 0.6
  },

  // 守護ポーション（防御寄り、小回復付き想定だが、ここでは回復0でバフ専用）
  {
    id: "buffDef_T1",
    name: "守護ポーションT1",
    type: POTION_TYPE_BOTH,
    power: 0,
    flat: 0,
    cost: { toughLeather_T1: 1, distilledWater_T1: 1 },
    rate: 0.8
  },
  {
    id: "buffDef_T2",
    name: "守護ポーションT2",
    type: POTION_TYPE_BOTH,
    power: 0,
    flat: 0,
    cost: { toughLeather_T2: 2, distilledWater_T2: 1 },
    rate: 0.7
  },
  {
    id: "buffDef_T3",
    name: "守護ポーションT3",
    type: POTION_TYPE_BOTH,
    power: 0,
    flat: 0,
    cost: { toughLeather_T3: 3, distilledWater_T3: 2 },
    rate: 0.6
  },

  // コンディションポーション（状態異常解除＋リジェネ寄り）
  {
    id: "cleanse_T1",
    name: "コンディションポーションT1",
    type: POTION_TYPE_BOTH,
    power: 0,
    flat: 0,
    cost: { mixHerb_T1: 2, distilledWater_T1: 1 },
    rate: 0.8
  },
  {
    id: "cleanse_T2",
    name: "コンディションポーションT2",
    type: POTION_TYPE_BOTH,
    power: 0,
    flat: 0,
    cost: { mixHerb_T2: 3, distilledWater_T2: 2 },
    rate: 0.7
  },
  {
    id: "cleanse_T3",
    name: "コンディションポーションT3",
    type: POTION_TYPE_BOTH,
    power: 0,
    flat: 0,
    cost: { mixHerb_T3: 4, distilledWater_T3: 2 },
    rate: 0.6
  }

  // ここにあった
  //   molotov_T1 / paralyzeGas_T1 / poisonNeedle_T1 / bomb
  // は削除し、純粋に「道具側 TOOLS_INIT のみ」で扱うようにした。
];

// =======================
// 道具マスタ（投げ物・爆弾など）
// =======================
//
// 仕様は変えず、「道具としても参照できる」ように POTSIONS_INIT の
// 一部と同じ数値をミラーするだけ（インベントリ側で使う想定）。
//
// ★ここで craft-data.js の CRAFT_RECIPES.tool と ID を合わせておく。
//   - bomb_T1/T2/T3
//   - bomb_fire_T1/T2/T3
//   - poisonNeedle_T1/T2/T3
//   - paralyzeGas_T1/T2/T3
//   既存の molotov_T1 は「bomb_fire_T1」に相当する旧IDとして残すが、
//   新実装では bomb_fire_Tx 系を優先して使う前提。

const TOOLS_INIT = [
  // 旧仕様の火炎瓶（molotov_T1）も残す
  {
    id: "molotov_T1",
    name: "火炎瓶T1",
    type: "damage",
    power: 10,
    flat: 0,
    cost: { mixHerb_T1: 1, distilledWater_T1: 1, ironIngot_T1: 1 },
    rate: 0.7
  },

  // クラフトレシピに対応した新ID群（爆弾）
  {
    id: "bomb_T1",
    name: "爆弾T1",
    type: "damage",
    power: 7,
    flat: 0,
    cost: { ironIngot_T1: 1, mixHerb_T1: 1 },
    rate: 0.7
  },
  {
    id: "bomb_T2",
    name: "爆弾T2",
    type: "damage",
    power: 10,
    flat: 0,
    cost: { ironIngot_T2: 1, mixHerb_T2: 2 },
    rate: 0.65
  },
  {
    id: "bomb_T3",
    name: "爆弾T3",
    type: "damage",
    power: 13,
    flat: 0,
    cost: { ironIngot_T3: 2, mixHerb_T3: 2 },
    rate: 0.6
  },

  // 火炎瓶（bomb_fire_Tx）
  {
    id: "bomb_fire_T1",
    name: "火炎瓶T1",
    type: "damage",
    power: 10,
    flat: 0,
    cost: { ironIngot_T1: 1, mixHerb_T1: 2 },
    rate: 0.7
  },
  {
    id: "bomb_fire_T2",
    name: "火炎瓶T2",
    type: "damage",
    power: 14,
    flat: 0,
    cost: { ironIngot_T2: 1, mixHerb_T2: 3 },
    rate: 0.65
  },
  {
    id: "bomb_fire_T3",
    name: "火炎瓶T3",
    type: "damage",
    power: 18,
    flat: 0,
    cost: { ironIngot_T3: 2, mixHerb_T3: 3 },
    rate: 0.6
  },

  // 毒針（poisonNeedle_Tx）: 少ダメ＋毒付与想定
  {
    id: "poisonNeedle_T1",
    name: "毒針T1",
    type: "damageStatus",
    power: 4,
    flat: 0,
    cost: { mixHerb_T1: 2 },
    rate: 0.75
  },
  {
    id: "poisonNeedle_T2",
    name: "毒針T2",
    type: "damageStatus",
    power: 7,
    flat: 0,
    cost: { mixHerb_T2: 3 },
    rate: 0.7
  },
  {
    id: "poisonNeedle_T3",
    name: "毒針T3",
    type: "damageStatus",
    power: 10,
    flat: 0,
    cost: { mixHerb_T3: 4 },
    rate: 0.65
  },

  // 麻痺ガス瓶（paralyzeGas_Tx）: 状態異常付与
  {
    id: "paralyzeGas_T1",
    name: "麻痺ガス瓶T1",
    type: "status",
    power: 0,
    flat: 0,
    cost: { mixHerb_T1: 1, distilledWater_T1: 1 },
    rate: 0.7
  },
  {
    id: "paralyzeGas_T2",
    name: "麻痺ガス瓶T2",
    type: "status",
    power: 0,
    flat: 0,
    cost: { mixHerb_T2: 2, distilledWater_T2: 1 },
    rate: 0.65
  },
  {
    id: "paralyzeGas_T3",
    name: "麻痺ガス瓶T3",
    type: "status",
    power: 0,
    flat: 0,
    cost: { mixHerb_T3: 3, distilledWater_T3: 2 },
    rate: 0.6
  },

  // ショップ用・汎用爆弾（旧仕様）
  {
    id: "bomb",
    name: "爆弾",
    type: "damage",
    power: 7,
    flat: 0,
    cost: { ironIngot_T1: 2, mixHerb_T1: 1 },
    rate: 0.7
  }
];

// ★ここから追加（ファイル末尾あたりに置く）
// インスタンス配列の初期化と location デフォルト付け

window.weaponInstances = window.weaponInstances || [];
window.armorInstances  = window.armorInstances  || [];

// まだインスタンスが無い初回起動時は、マスタから「倉庫在庫0・location=warehouse」で作っておく。
// （クラフトで作られた分は addItemToInventory が location: "warehouse" 付きで push 済みなので触らない）
if (weaponInstances.length === 0 && Array.isArray(WEAPONS_INIT)) {
  WEAPONS_INIT.forEach(w => {
    weaponInstances.push({
      id: w.id,
      quality: 0,
      enhance: w.enhance || 0,
      durability: w.durability || BASE_DURABILITY,
      location: "warehouse"
    });
  });
}

if (armorInstances.length === 0 && Array.isArray(ARMORS_INIT)) {
  ARMORS_INIT.forEach(a => {
    armorInstances.push({
      id: a.id,
      quality: 0,
      enhance: a.enhance || 0,
      durability: a.durability || BASE_DURABILITY,
      location: "warehouse"
    });
  });
}

// 既存セーブ互換用: location が未定義の既存インスタンスには倉庫扱いを与える
weaponInstances.forEach(inst => {
  if (!inst.location) inst.location = "warehouse";
});
armorInstances.forEach(inst => {
  if (!inst.location) inst.location = "warehouse";
});

// ★ツールマスタをグローバル公開（市場表示などから参照するため）
window.tools = TOOLS_INIT;