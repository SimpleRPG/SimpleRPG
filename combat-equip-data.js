// combat-equip-data.js
// 戦闘用武器・防具性能＋強化テーブル＋装備系クラフト情報（ITEM_META に一元化）

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
const MAX_TIER = 10;

// =======================
// テンプレート定義（戦闘用武器）
// =======================

const WEAPON_TEMPLATES = [
  // 短剣
  {
    baseId: "dagger",
    baseName: "ダガー",
    baseAtk: 2,
    atkPerTier: 2,
    baseScaleStr: 0.05,
    scaleStrPerTier: 0.03,
    baseScaleInt: 0.00,
    scaleIntPerTier: 0,
    baseRate: 0.80,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_woodPlank`]: 1,
      [`T${tier}_ironIngot`]: 1
    })
  },

  // ショートソード
  {
    baseId: "short",
    baseName: "ショートソード",
    baseAtk: 3,
    atkPerTier: 3,
    baseScaleStr: 0.10,
    scaleStrPerTier: 0.03,
    baseScaleInt: 0.00,
    scaleIntPerTier: 0,
    baseRate: 0.75,
    ratePerTier: -0.05,
    enhanceStep: 2,
    costPattern: tier => ({
      [`T${tier}_woodPlank`]: 1,
      [`T${tier}_ironIngot`]: 2
    })
  },

  // ロングソード
  {
    baseId: "long",
    baseName: "ロングソード",
    baseAtk: 5,
    atkPerTier: 4,
    baseScaleStr: 0.18,
    scaleStrPerTier: 0.04,
    baseScaleInt: 0.00,
    scaleIntPerTier: 0,
    baseRate: 0.70,
    ratePerTier: -0.05,
    enhanceStep: 2,
    costPattern: tier => ({
      [`T${tier}_woodPlank`]: 2,
      [`T${tier}_ironIngot`]: 2
    })
  },

  // グレートソード
  {
    baseId: "great",
    baseName: "グレートソード",
    baseAtk: 8,
    atkPerTier: 5,
    baseScaleStr: 0.20,
    scaleStrPerTier: 0.04,
    baseScaleInt: 0.00,
    scaleIntPerTier: 0,
    baseRate: 0.65,
    ratePerTier: -0.05,
    enhanceStep: 3,
    costPattern: tier => ({
      [`T${tier}_woodPlank`]: 2,
      [`T${tier}_ironIngot`]: 3
    })
  },

  // 魔法の杖
  {
    baseId: "magicStaff",
    baseName: "魔法の杖",
    baseAtk: 2,
    atkPerTier: 2,
    baseScaleStr: 0.00,
    scaleStrPerTier: 0.00,
    baseScaleInt: 0.20,
    scaleIntPerTier: 0.08,
    baseRate: 0.70,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_woodPlank`]: 1,
      [`T${tier}_herb`]: tier + 1 // T1:2, T2:3, ... T10:11
    })
  },

  // ルーンソード
  {
    baseId: "runeSword",
    baseName: "ルーンソード",
    baseAtk: 4,
    atkPerTier: 3, // 4,7,11,15,19,23,27,31,35,39
    baseScaleStr: 0.10,
    scaleStrPerTier: 0.03,
    baseScaleInt: 0.15,
    scaleIntPerTier: 0.05,
    baseRate: 0.65,
    ratePerTier: -0.05,
    enhanceStep: 2,
    costPattern: tier => ({
      [`T${tier}_woodPlank`]: 1,
      [`T${tier}_ironIngot`]: 2,
      [`T${tier}_herb`]: tier // T1:1, T2:2, ... T10:10
    })
  },

  // グレートシールド（盾）
  {
    baseId: "greatShield",
    baseName: "大盾",
    baseAtk: 0,
    atkPerTier: 0,
    baseScaleStr: 0.00,
    scaleStrPerTier: 0.00,
    baseScaleInt: 0.00,
    scaleIntPerTier: 0.00,
    baseRate: 0.70,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_woodPlank`]: 2,
      [`T${tier}_ironIngot`]: 1,
      [`T${tier}_toughLeather`]: 1
    })
  }
];

// =======================
// テンプレート定義（戦闘用防具）
// =======================

const ARMOR_TEMPLATES = [
  // レザーベスト（軽装）
  {
    baseId: "leatherVest",
    baseName: "レザーベスト",
    baseDef: 2,
    defPerTier: 2,
    baseScaleVit: 0.01,
    scaleVitPerTier: 0.01,
    baseBonusDex: 1,
    bonusDexPerTier: 1,
    baseRate: 0.80,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_clothBolt`]: 1,
      [`T${tier}_toughLeather`]: 1
    })
  },

  // チェインメイル（バランス）
  {
    baseId: "chainmail",
    baseName: "チェインメイル",
    baseDef: 4,
    defPerTier: 3,
    baseScaleVit: 0.06,
    scaleVitPerTier: 0.03,
    baseBonusDex: 0,
    bonusDexPerTier: 0,
    baseRate: 0.75,
    ratePerTier: -0.05,
    enhanceStep: 1,
    costPattern: tier => ({
      [`T${tier}_ironIngot`]: 2,
      [`T${tier}_toughLeather`]: 1
    })
  },

  // アイアンアーマー（重装）
  {
    baseId: "ironArmor",
    baseName: "アイアンアーマー",
    baseDef: 7,
    defPerTier: 4,
    baseScaleVit: 0.12,
    scaleVitPerTier: 0.04,
    baseBonusDex: 0,
    bonusDexPerTier: 0,
    baseRate: 0.70,
    ratePerTier: -0.05,
    enhanceStep: 2,
    costPattern: tier => ({
      [`T${tier}_ironIngot`]: 3,
      [`T${tier}_clothBolt`]: 1,
      [`T${tier}_toughLeather`]: 1
    })
  }
];

// =======================
// テンプレートから T1〜T10 を生成
// =======================

function generateWeaponTiers(tpl) {
  const list = [];
  for (let tier = 1; tier <= MAX_TIER; tier++) {
    list.push({
      id: `T${tier}_${tpl.baseId}`,
      name: `T${tier}${tpl.baseName}`,
      atk: tpl.baseAtk + tpl.atkPerTier * (tier - 1),
      scaleStr: +(tpl.baseScaleStr + tpl.scaleStrPerTier * (tier - 1)).toFixed(2),
      scaleInt: +(tpl.baseScaleInt + tpl.scaleIntPerTier * (tier - 1)).toFixed(2),
      cost: tpl.costPattern(tier),
      rate: tpl.baseRate + tpl.ratePerTier * (tier - 1),
      enhance: 0,
      enhanceStep: tpl.enhanceStep,
      durability: BASE_DURABILITY
    });
  }
  return list;
}

function generateArmorTiers(tpl) {
  const list = [];
  for (let tier = 1; tier <= MAX_TIER; tier++) {
    list.push({
      id: `T${tier}_${tpl.baseId}`,
      name: `T${tier}${tpl.baseName}`,
      def: tpl.baseDef + tpl.defPerTier * (tier - 1),
      scaleVit: +(tpl.baseScaleVit + tpl.scaleVitPerTier * (tier - 1)).toFixed(2),
      bonusDex: tpl.baseBonusDex + tpl.bonusDexPerTier * (tier - 1),
      cost: tpl.costPattern(tier),
      rate: tpl.baseRate + tpl.ratePerTier * (tier - 1),
      enhance: 0,
      enhanceStep: tpl.enhanceStep,
      durability: BASE_DURABILITY
    });
  }
  return list;
}

// =======================
// 戦闘用武器マスタ（T1〜T10）
// =======================

const WEAPONS_INIT = WEAPON_TEMPLATES.flatMap(generateWeaponTiers);

// =======================
// 戦闘用防具マスタ（T1〜T10）
// =======================

const ARMORS_INIT = ARMOR_TEMPLATES.flatMap(generateArmorTiers);

// =======================
// インスタンス配列の初期化（戦闘装備分）
// =======================

window.weaponInstances = window.weaponInstances || [];
window.armorInstances  = window.armorInstances  || [];

// 初回起動時: マスタから「倉庫在庫0・location=warehouse」でインスタンス生成
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

// 既存セーブ互換: location 未定義なら倉庫扱い
weaponInstances.forEach(inst => {
  if (!inst.location) inst.location = "warehouse";
});
armorInstances.forEach(inst => {
  if (!inst.location) inst.location = "warehouse";
});

// =======================
// ITEM_META への登録（戦闘用武器・防具＋クラフト情報）
// =======================

if (typeof registerItemDefs === "function") {
  // 戦闘用武器
  (function () {
    const defs = {};

    WEAPONS_INIT.forEach(w => {
      const m = w.id.match(/^T(\d+)_/);
      const tierNum = m ? parseInt(m[1], 10) : null;

      defs[w.id] = {
        id: w.id,
        name: w.name,
        category: "weapon",
        tier: tierNum,

        // 戦闘用の固定値
        atk: w.atk,
        scaleStr: w.scaleStr,
        scaleInt: w.scaleInt,
        baseDurability: w.durability || BASE_DURABILITY,
        enhanceStep: w.enhanceStep || 1,

        craft: {
          enabled: true,
          category: "weapon",
          tier: tierNum,
          kind: "normal",
          baseRate: w.rate != null ? w.rate : 0,
          cost: w.cost || {}
        }
      };
    });

    registerItemDefs(defs);
  })();

  // 戦闘用防具
  (function () {
    const defs = {};

    ARMORS_INIT.forEach(a => {
      const m = a.id.match(/^T(\d+)_/);
      const tierNum = m ? parseInt(m[1], 10) : null;

      defs[a.id] = {
        id: a.id,
        name: a.name,
        category: "armor",
        tier: tierNum,

        def: a.def,
        scaleVit: a.scaleVit,
        bonusDex: a.bonusDex || 0,
        baseDurability: a.durability || BASE_DURABILITY,
        enhanceStep: a.enhanceStep || 1,

        craft: {
          enabled: true,
          category: "armor",
          tier: tierNum,
          kind: "normal",
          baseRate: a.rate != null ? a.rate : 0,
          cost: a.cost || {}
        }
      };
    });

    registerItemDefs(defs);
  })();
}