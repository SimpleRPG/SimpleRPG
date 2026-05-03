// gather-equip-data.js
// 採取用武器・採取用防具マスタ＋クラフト情報（ITEM_META に一元化）

const GATHER_BASE_DURABILITY = 3;
const GATHER_MAX_TIER = 3;

// =======================
// テンプレート定義（採取用武器）
// =======================

const GATHER_WEAPON_TEMPLATES = [
  // 伐採用ツール
  {
    baseId: "gatherAxe",
    baseName: "伐採用ツール",
    baseAtk: Math.round(5 / 3),  // T1
    atkPerTier: Math.round(4 / 3), // 5→9→13
    baseScaleStr: 0.06,
    scaleStrPerTier: 0.02,       // 0.06→0.08→0.10
    baseScaleInt: 0.00,
    scaleIntPerTier: 0.00,
    baseRate: 0.8,
    ratePerTier: -0.05,          // 0.8→0.75→0.7
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_woodPlank`]: 2,
      [`T${tier}_ironIngot`]: 1
    })
  },

  // 採掘用ツール
  {
    baseId: "gatherPick",
    baseName: "採掘用ツール",
    baseAtk: Math.round(5 / 3),
    atkPerTier: Math.round(4 / 3),
    baseScaleStr: 0.06,
    scaleStrPerTier: 0.02,
    baseScaleInt: 0.00,
    scaleIntPerTier: 0.00,
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_ironIngot`]: 2,
      [`T${tier}_woodPlank`]: 1
    })
  },

  // 採草用ツール
  {
    baseId: "gatherKnife",
    baseName: "採草用ツール",
    baseAtk: Math.round(3 / 3),
    atkPerTier: Math.round(3 / 3), // 3→6→9
    baseScaleStr: 0.05,
    scaleStrPerTier: 0.02,         // 0.05→0.07→0.09
    baseScaleInt: 0.00,
    scaleIntPerTier: 0.00,
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_clothBolt`]: 1,
      [`T${tier}_toughLeather`]: 1
    })
  },

  // 布採取用ツール
  {
    baseId: "gatherShears",
    baseName: "布採取用ツール",
    baseAtk: Math.round(3 / 3),
    atkPerTier: Math.round(3 / 3),
    baseScaleStr: 0.05,
    scaleStrPerTier: 0.02,
    baseScaleInt: 0.00,
    scaleIntPerTier: 0.00,
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_clothBolt`]: 2,
      [`T${tier}_toughLeather`]: 1
    })
  },

  // 皮採取用ツール
  {
    baseId: "gatherDagger",
    baseName: "皮採取用ツール",
    baseAtk: Math.round(2 / 3),
    atkPerTier: Math.round(2 / 3), // 2→4→6
    baseScaleStr: 0.05,
    scaleStrPerTier: 0.02,
    baseScaleInt: 0.00,
    scaleIntPerTier: 0.00,
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_toughLeather`]: 2,
      [`T${tier}_clothBolt`]: 1
    })
  },

  // 水採取用ツール
  {
    baseId: "gatherFlask",
    baseName: "水採取用ツール",
    baseAtk: 0,
    atkPerTier: 0,
    baseScaleStr: 0.00,
    scaleStrPerTier: 0.00,
    baseScaleInt: 0.00,
    scaleIntPerTier: 0.00,
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_distilledWater`]: 1,
      [`T${tier}_ironIngot`]: 1
    })
  },

  // 狩猟用ツール
  {
    baseId: "huntTool",
    baseName: "狩猟用ツール",
    baseAtk: Math.round(3 / 3),
    atkPerTier: Math.round(3 / 3), // 3→6→9
    baseScaleStr: 0.08,
    scaleStrPerTier: 0.02,         // 0.08→0.10→0.12
    baseScaleInt: 0.00,
    scaleIntPerTier: 0.00,
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_ironIngot`]: 1,
      [`T${tier}_toughLeather`]: 1
    })
  },

  // 釣り用ツール
  {
    baseId: "fishTool",
    baseName: "釣り用ツール",
    baseAtk: 0,
    atkPerTier: 0,
    baseScaleStr: 0.00,
    scaleStrPerTier: 0.00,
    baseScaleInt: 0.00,
    scaleIntPerTier: 0.00,
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_woodPlank`]: 1,
      [`T${tier}_clothBolt`]: 1
    })
  },

  // 畑作業用ツール
  {
    baseId: "farmTool",
    baseName: "畑作業用ツール",
    baseAtk: 0,
    atkPerTier: 0,
    baseScaleStr: 0.00,
    scaleStrPerTier: 0.00,
    baseScaleInt: 0.00,
    scaleIntPerTier: 0.00,
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_woodPlank`]: 1,
      [`T${tier}_mixHerb`]: 1
    })
  },

  // 菜園用ツール
  {
    baseId: "gardenTool",
    baseName: "菜園用ツール",
    baseAtk: 0,
    atkPerTier: 0,
    baseScaleStr: 0.00,
    scaleStrPerTier: 0.00,
    baseScaleInt: 0.00,
    scaleIntPerTier: 0.00,
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_clothBolt`]: 1,
      [`T${tier}_mixHerb`]: 1
    })
  }
];

// =======================
// テンプレート定義（採取用防具）
// =======================

const GATHER_ARMOR_TEMPLATES = [
  // 伐採用防具
  {
    baseId: "gatherArmorWood",
    baseName: "伐採用防具",
    baseDef: Math.round(7 / 3),
    defPerTier: Math.round(4 / 3),   // 7→11→15
    baseScaleVit: 0.04,
    scaleVitPerTier: 0.01,           // 0.04→0.05→0.06
    baseBonusDex: 0,
    bonusDexPerTier: 0,
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_toughLeather`]: 1,
      [`T${tier}_clothBolt`]: 1
    })
  },

  // 採掘用防具
  {
    baseId: "gatherArmorOre",
    baseName: "採掘用防具",
    baseDef: Math.round(7 / 3),
    defPerTier: Math.round(4 / 3),
    baseScaleVit: 0.04,
    scaleVitPerTier: 0.01,
    baseBonusDex: 0,
    bonusDexPerTier: 0,
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_toughLeather`]: 1,
      [`T${tier}_ironIngot`]: 1
    })
  },

  // 採草用防具
  {
    baseId: "gatherArmorHerb",
    baseName: "採草用防具",
    baseDef: Math.round(4 / 3),
    defPerTier: Math.round(3 / 3),   // 4→7→10
    baseScaleVit: 0.03,
    scaleVitPerTier: 0.01,           // 0.03→0.04→0.05
    baseBonusDex: 1,
    bonusDexPerTier: 1,              // 1→2→3
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_clothBolt`]: 1,
      [`T${tier}_mixHerb`]: 1
    })
  },

  // 布採取用防具
  {
    baseId: "gatherArmorCloth",
    baseName: "布採取用防具",
    baseDef: Math.round(4 / 3),
    defPerTier: Math.round(3 / 3),
    baseScaleVit: 0.03,
    scaleVitPerTier: 0.01,
    baseBonusDex: 1,
    bonusDexPerTier: 1,
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_clothBolt`]: 2,
      [`T${tier}_toughLeather`]: 1
    })
  },

  // 皮採取用防具
  {
    baseId: "gatherArmorLeather",
    baseName: "皮採取用防具",
    baseDef: Math.round(4 / 3),
    defPerTier: Math.round(3 / 3),
    baseScaleVit: 0.03,
    scaleVitPerTier: 0.01,
    baseBonusDex: 1,
    bonusDexPerTier: 1,
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_toughLeather`]: 2,
      [`T${tier}_clothBolt`]: 1
    })
  },

  // 水採取用防具
  {
    baseId: "gatherArmorWater",
    baseName: "水採取用防具",
    baseDef: Math.round(4 / 3),
    defPerTier: Math.round(3 / 3),
    baseScaleVit: 0.03,
    scaleVitPerTier: 0.01,
    baseBonusDex: 1,
    bonusDexPerTier: 1,
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_distilledWater`]: 1,
      [`T${tier}_clothBolt`]: 1
    })
  },

  // 狩猟用防具
  {
    baseId: "gatherArmorHunt",
    baseName: "狩猟用防具",
    baseDef: Math.round(4 / 3),
    defPerTier: Math.round(3 / 3),
    baseScaleVit: 0.03,
    scaleVitPerTier: 0.01,
    baseBonusDex: 1,
    bonusDexPerTier: 1,
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_toughLeather`]: 1,
      [`T${tier}_ironIngot`]: 1
    })
  },

  // 畑作業用防具
  {
    baseId: "gatherArmorFarm",
    baseName: "畑作業用防具",
    baseDef: Math.round(4 / 3),
    defPerTier: Math.round(3 / 3),
    baseScaleVit: 0.03,
    scaleVitPerTier: 0.01,
    baseBonusDex: 1,
    bonusDexPerTier: 1,
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_clothBolt`]: 1,
      [`T${tier}_mixHerb`]: 1
    })
  },

  // 菜園用防具
  {
    baseId: "gatherArmorGarden",
    baseName: "菜園用防具",
    baseDef: Math.round(4 / 3),
    defPerTier: Math.round(3 / 3),
    baseScaleVit: 0.03,
    scaleVitPerTier: 0.01,
    baseBonusDex: 1,
    bonusDexPerTier: 1,
    baseRate: 0.8,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_clothBolt`]: 1,
      [`T${tier}_mixHerb`]: 1
    })
  }
];

// =======================
// テンプレートから T1〜T3 を生成
// =======================

function generateGatherWeaponTiers(tpl) {
  const list = [];
  for (let tier = 1; tier <= GATHER_MAX_TIER; tier++) {
    list.push({
      id: `T${tier}_${tpl.baseId}`,
      name: `T${tier}${tpl.baseName}`,
      atk: Math.round(tpl.baseAtk + tpl.atkPerTier * (tier - 1)),
      scaleStr: +(tpl.baseScaleStr + tpl.scaleStrPerTier * (tier - 1)).toFixed(2),
      scaleInt: +(tpl.baseScaleInt + tpl.scaleIntPerTier * (tier - 1)).toFixed(2),
      cost: tpl.costPattern(tier),
      rate: tpl.baseRate + tpl.ratePerTier * (tier - 1),
      enhance: 0,
      enhanceStep: tpl.enhanceStep,
      durability: GATHER_BASE_DURABILITY
    });
  }
  return list;
}

function generateGatherArmorTiers(tpl) {
  const list = [];
  for (let tier = 1; tier <= GATHER_MAX_TIER; tier++) {
    list.push({
      id: `T${tier}_${tpl.baseId}`,
      name: `T${tier}${tpl.baseName}`,
      def: Math.round(tpl.baseDef + tpl.defPerTier * (tier - 1)),
      scaleVit: +(tpl.baseScaleVit + tpl.scaleVitPerTier * (tier - 1)).toFixed(2),
      bonusDex: tpl.baseBonusDex + tpl.bonusDexPerTier * (tier - 1),
      cost: tpl.costPattern(tier),
      rate: tpl.baseRate + tpl.ratePerTier * (tier - 1),
      enhance: 0,
      enhanceStep: tpl.enhanceStep,
      durability: GATHER_BASE_DURABILITY
    });
  }
  return list;
}

// =======================
// 採取用武器マスタ（性能）
// =======================

const GATHER_WEAPONS_INIT = GATHER_WEAPON_TEMPLATES.flatMap(generateGatherWeaponTiers);

// =======================
// 採取用防具マスタ（性能）
// =======================

const GATHER_ARMORS_INIT = GATHER_ARMOR_TEMPLATES.flatMap(generateGatherArmorTiers);

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
      const m = w.id.match(/^T(\d+)_/);
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
        baseEnhance: w.enhance || 0, // ★ クラフト時 baseEnh として利用

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
      const m = a.id.match(/^T(\d+)_/);
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
        baseEnhance: a.enhance || 0, // ★ クラフト時 baseEnh として利用

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