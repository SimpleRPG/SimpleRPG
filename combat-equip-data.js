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

// =======================
// 戦闘用武器マスタ（T1〜T3）
// =======================

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
// 戦闘用防具マスタ（T1〜T3）
// =======================

const ARMORS_INIT = [
  // レザーベスト（軽装）
  {
    id: "leatherVest_T1",
    name: "レザーベストT1",
    def: 2,
    scaleVit: 0.01,
    bonusDex: 1,
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
      const m = w.id.match(/_T(\d)/) || w.id.match(/T(\d)$/);
      const tierNum = m ? parseInt(m[1], 10) : null;

      defs[w.id] = {
        id: w.id,
        name: w.name,
        category: "weapon",
        tier: tierNum,

        // ★ 追加: 戦闘用の固定値もメタへ寄せる
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
      const m = a.id.match(/_T(\d)/) || a.id.match(/T(\d)$/);
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