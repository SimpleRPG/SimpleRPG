// gather-equip-data.js
// 採取用武器・採取用防具マスタ＋クラフト情報（ITEM_META に一元化）

const GATHER_BASE_DURABILITY = 3;

// =======================
// 採取用武器マスタ（性能）
// =======================

const GATHER_WEAPONS_INIT = [
  // 伐採用ツール
  {
    id: "gatherAxe_T1",
    name: "伐採用ツールT1",
    atk: Math.round(5 / 3),
    scaleStr: 0.06,
    scaleInt: 0.00,
    cost: { woodPlank_T1: 2, ironIngot_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
  },

  // 採草用ツール
  {
    id: "gatherKnife_T1",
    name: "採草用ツールT1",
    atk: Math.round(3 / 3),
    scaleStr: 0.05,
    scaleInt: 0.00,
    cost: { clothBolt_T1: 1, toughLeather_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
  },

  // 皮採取用ツール
  {
    id: "gatherDagger_T1",
    name: "皮採取用ツールT1",
    atk: Math.round(2 / 3),
    scaleStr: 0.05,
    scaleInt: 0.00,
    cost: { toughLeather_T1: 2, clothBolt_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
  }
];

// =======================
// 採取用防具マスタ（性能）
// =======================

const GATHER_ARMORS_INIT = [
  // 伐採用防具
  {
    id: "gatherArmorWood_T1",
    name: "伐採用防具T1",
    def: Math.round(7 / 3),
    scaleVit: 0.04,
    bonusDex: 0,
    cost: { toughLeather_T1: 1, clothBolt_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
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
    durability: GATHER_BASE_DURABILITY
  },

  // 採掘用防具
  {
    id: "gatherArmorOre_T1",
    name: "採掘用防具T1",
    def: Math.round(7 / 3),
    scaleVit: 0.04,
    bonusDex: 0,
    cost: { toughLeather_T1: 1, ironIngot_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },
  {
    id: "gatherArmorOre_T2",
    name: "採掘用防具T2",
    def: Math.round(11 / 3),
    scaleVit: 0.05,
    bonusDex: 0,
    cost: { toughLeather_T2: 1, ironIngot_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },
  {
    id: "gatherArmorOre_T3",
    name: "採掘用防具T3",
    def: Math.round(15 / 3),
    scaleVit: 0.06,
    bonusDex: 0,
    cost: { toughLeather_T3: 1, ironIngot_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },

  // 採草用防具
  {
    id: "gatherArmorHerb_T1",
    name: "採草用防具T1",
    def: Math.round(4 / 3),
    scaleVit: 0.03,
    bonusDex: 1,
    cost: { clothBolt_T1: 1, mixHerb_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },
  {
    id: "gatherArmorHerb_T2",
    name: "採草用防具T2",
    def: Math.round(7 / 3),
    scaleVit: 0.04,
    bonusDex: 2,
    cost: { clothBolt_T2: 1, mixHerb_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },
  {
    id: "gatherArmorHerb_T3",
    name: "採草用防具T3",
    def: Math.round(10 / 3),
    scaleVit: 0.05,
    bonusDex: 3,
    cost: { clothBolt_T3: 1, mixHerb_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },

  // 布採取用防具
  {
    id: "gatherArmorCloth_T1",
    name: "布採取用防具T1",
    def: Math.round(4 / 3),
    scaleVit: 0.03,
    bonusDex: 1,
    cost: { clothBolt_T1: 2, toughLeather_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },
  {
    id: "gatherArmorCloth_T2",
    name: "布採取用防具T2",
    def: Math.round(7 / 3),
    scaleVit: 0.04,
    bonusDex: 2,
    cost: { clothBolt_T2: 2, toughLeather_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },
  {
    id: "gatherArmorCloth_T3",
    name: "布採取用防具T3",
    def: Math.round(10 / 3),
    scaleVit: 0.05,
    bonusDex: 3,
    cost: { clothBolt_T3: 2, toughLeather_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },

  // 皮採取用防具
  {
    id: "gatherArmorLeather_T1",
    name: "皮採取用防具T1",
    def: Math.round(4 / 3),
    scaleVit: 0.03,
    bonusDex: 1,
    cost: { toughLeather_T1: 2, clothBolt_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },
  {
    id: "gatherArmorLeather_T2",
    name: "皮採取用防具T2",
    def: Math.round(7 / 3),
    scaleVit: 0.04,
    bonusDex: 2,
    cost: { toughLeather_T2: 2, clothBolt_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },
  {
    id: "gatherArmorLeather_T3",
    name: "皮採取用防具T3",
    def: Math.round(10 / 3),
    scaleVit: 0.05,
    bonusDex: 3,
    cost: { toughLeather_T3: 2, clothBolt_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },

  // 水採取用防具
  {
    id: "gatherArmorWater_T1",
    name: "水採取用防具T1",
    def: Math.round(4 / 3),
    scaleVit: 0.03,
    bonusDex: 1,
    cost: { distilledWater_T1: 1, clothBolt_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },
  {
    id: "gatherArmorWater_T2",
    name: "水採取用防具T2",
    def: Math.round(7 / 3),
    scaleVit: 0.04,
    bonusDex: 2,
    cost: { distilledWater_T2: 1, clothBolt_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },
  {
    id: "gatherArmorWater_T3",
    name: "水採取用防具T3",
    def: Math.round(10 / 3),
    scaleVit: 0.05,
    bonusDex: 3,
    cost: { distilledWater_T3: 1, clothBolt_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },

  // 狩猟用防具
  {
    id: "gatherArmorHunt_T1",
    name: "狩猟用防具T1",
    def: Math.round(4 / 3),
    scaleVit: 0.03,
    bonusDex: 1,
    cost: { toughLeather_T1: 1, ironIngot_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },
  {
    id: "gatherArmorHunt_T2",
    name: "狩猟用防具T2",
    def: Math.round(7 / 3),
    scaleVit: 0.04,
    bonusDex: 2,
    cost: { toughLeather_T2: 1, ironIngot_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },
  {
    id: "gatherArmorHunt_T3",
    name: "狩猟用防具T3",
    def: Math.round(10 / 3),
    scaleVit: 0.05,
    bonusDex: 3,
    cost: { toughLeather_T3: 1, ironIngot_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },

  // 畑作業用防具
  {
    id: "gatherArmorFarm_T1",
    name: "畑作業用防具T1",
    def: Math.round(4 / 3),
    scaleVit: 0.03,
    bonusDex: 1,
    cost: { clothBolt_T1: 1, mixHerb_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },
  {
    id: "gatherArmorFarm_T2",
    name: "畑作業用防具T2",
    def: Math.round(7 / 3),
    scaleVit: 0.04,
    bonusDex: 2,
    cost: { clothBolt_T2: 1, mixHerb_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },
  {
    id: "gatherArmorFarm_T3",
    name: "畑作業用防具T3",
    def: Math.round(10 / 3),
    scaleVit: 0.05,
    bonusDex: 3,
    cost: { clothBolt_T3: 1, mixHerb_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },

  // 菜園用防具
  {
    id: "gatherArmorGarden_T1",
    name: "菜園用防具T1",
    def: Math.round(4 / 3),
    scaleVit: 0.03,
    bonusDex: 1,
    cost: { clothBolt_T1: 1, mixHerb_T1: 1 },
    rate: 0.8,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },
  {
    id: "gatherArmorGarden_T2",
    name: "菜園用防具T2",
    def: Math.round(7 / 3),
    scaleVit: 0.04,
    bonusDex: 2,
    cost: { clothBolt_T2: 1, mixHerb_T2: 1 },
    rate: 0.75,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  },
  {
    id: "gatherArmorGarden_T3",
    name: "菜園用防具T3",
    def: Math.round(10 / 3),
    scaleVit: 0.05,
    bonusDex: 3,
    cost: { clothBolt_T3: 1, mixHerb_T3: 1 },
    rate: 0.7,
    enhance: 0,
    enhanceStep: 1,
    durability: GATHER_BASE_DURABILITY
  }
];

// 必要ならグローバル公開
window.GATHER_WEAPONS_INIT = GATHER_WEAPONS_INIT;
window.GATHER_ARMORS_INIT  = GATHER_ARMORS_INIT;

// =======================
// インスタンスを既存配列に追加（戦闘と同じ配列を共有）
// =======================

window.weaponInstances = window.weaponInstances || [];
window.armorInstances  = window.armorInstances  || [];

const existingWeaponIds = new Set(window.weaponInstances.map(w => w.id));
GATHER_WEAPONS_INIT.forEach(w => {
  if (!existingWeaponIds.has(w.id)) {
    window.weaponInstances.push({
      id: w.id,
      quality: 0,
      enhance: w.enhance || 0,
      durability: w.durability || GATHER_BASE_DURABILITY,
      location: "warehouse"
    });
  }
});

const existingArmorIds = new Set(window.armorInstances.map(a => a.id));
GATHER_ARMORS_INIT.forEach(a => {
  if (!existingArmorIds.has(a.id)) {
    window.armorInstances.push({
      id: a.id,
      quality: 0,
      enhance: a.enhance || 0,
      durability: a.durability || GATHER_BASE_DURABILITY,
      location: "warehouse"
    });
  }
});

// =======================
// ITEM_META への登録（採取用装備＋クラフト情報）
// =======================
//
// category は weapon/armor、tags に "gather" を付与。
// combat 側と同じく atk/def などもメタに寄せる。

if (typeof registerItemDefs === "function") {
  (function () {
    const defs = {};

    GATHER_WEAPONS_INIT.forEach(w => {
      const m = w.id.match(/_T(\d)/) || w.id.match(/T(\d)$/);
      const tierNum = m ? parseInt(m[1], 10) : null;

      defs[w.id] = {
        id: w.id,
        name: w.name,
        category: "weapon",
        tier: tierNum,
        tags: ["gather"],

        // 戦闘用と同様に固定値をメタへ
        atk: w.atk,
        scaleStr: w.scaleStr,
        scaleInt: w.scaleInt,
        baseDurability: w.durability || GATHER_BASE_DURABILITY,
        enhanceStep: w.enhanceStep || 1,
        baseEnhance: w.enhance || 0, // ★ 追加：クラフト時 baseEnh として利用

        craft: {
          enabled: true,
          category: "weapon",
          tier: tierNum,
          kind: "gather",
          baseRate: w.rate != null ? w.rate : 0,
          cost: w.cost || {}
        }
      };
    });

    GATHER_ARMORS_INIT.forEach(a => {
      const m = a.id.match(/_T(\d)/) || a.id.match(/T(\d)$/);
      const tierNum = m ? parseInt(m[1], 10) : null;

      defs[a.id] = {
        id: a.id,
        name: a.name,
        category: "armor",
        tier: tierNum,
        tags: ["gather"],

        def: a.def,
        scaleVit: a.scaleVit,
        bonusDex: a.bonusDex || 0,
        baseDurability: a.durability || GATHER_BASE_DURABILITY,
        enhanceStep: a.enhanceStep || 1,
        baseEnhance: a.enhance || 0, // ★ 追加：クラフト時 baseEnh として利用

        craft: {
          enabled: true,
          category: "armor",
          tier: tierNum,
          kind: "gather",
          baseRate: a.rate != null ? a.rate : 0,
          cost: a.cost || {}
        }
      };
    });

    registerItemDefs(defs);
  })();
}