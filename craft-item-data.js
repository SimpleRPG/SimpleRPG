// craft-item-data.js
// 中間素材・レア素材・ポーション・道具のマスタ＋クラフト情報（ITEM_META に一元化）
// ＋ クラフトスキル定義・成功率ボーナス・品質ロジック

// =======================
// 素材ティア共通定義（クラフト・マーケット共通）
// =======================
const MATERIAL_TIER_VALUES = {
  t1: 3,
  t2: 5,
  t3: 10
};
window.MATERIAL_TIER_VALUES = MATERIAL_TIER_VALUES;

// =======================
// クラフトスキル定義
// =======================

const CRAFT_SKILL_MAX_LV = 100;

const CRAFT_SKILLS_INIT = {
  weapon:   { lv: 0, exp: 0, expToNext: 10 },
  armor:    { lv: 0, exp: 0, expToNext: 10 },
  potion:   { lv: 0, exp: 0, expToNext: 10 },
  tool:     { lv: 0, exp: 0, expToNext: 10 },
  cooking:  { lv: 0, exp: 0, expToNext: 10 },
  material: { lv: 0, exp: 0, expToNext: 10 }
};

// =======================
// 中間素材定義
// =======================
//
// T2以降は「前のTierの中間素材を＋1個」要求する。
//
// from は「カテゴリ＋ティア」指定だが、クラフト一元化のため
// ITEM_META.craft.cost には itemId ベースで展開して持たせる。

const INTERMEDIATE_MATERIALS = [
  { id: "woodPlank_T1",    name: "T1板材",          from: { wood:  { t1: 3 } } },
  { id: "woodPlank_T2",    name: "T2板材",          from: { wood:  { t2: 3 }, woodPlank_T1: 1 } },
  { id: "woodPlank_T3",    name: "T3板材",          from: { wood:  { t3: 3 }, woodPlank_T2: 1 } },

  { id: "ironIngot_T1",    name: "T1鉄インゴット",  from: { ore:   { t1: 4 } } },
  { id: "ironIngot_T2",    name: "T2鉄インゴット",  from: { ore:   { t2: 4 }, ironIngot_T1: 1 } },
  { id: "ironIngot_T3",    name: "T3鉄インゴット",  from: { ore:   { t3: 4 }, ironIngot_T2: 1 } },

  { id: "clothBolt_T1",    name: "T1布束",          from: { cloth: { t1: 3 } } },
  { id: "clothBolt_T2",    name: "T2布束",          from: { cloth: { t2: 3 }, clothBolt_T1: 1 } },
  { id: "clothBolt_T3",    name: "T3布束",          from: { cloth: { t3: 3 }, clothBolt_T2: 1 } },

  { id: "toughLeather_T1", name: "T1強化皮",        from: { leather: { t1: 3 } } },
  { id: "toughLeather_T2", name: "T2強化皮",        from: { leather: { t2: 3 }, toughLeather_T1: 1 } },
  { id: "toughLeather_T3", name: "T3強化皮",        from: { leather: { t3: 3 }, toughLeather_T2: 1 } },

  { id: "mixHerb_T1",      name: "T1調合用薬草",    from: { herb:  { t1: 3 } } },
  { id: "mixHerb_T2",      name: "T2調合用薬草",    from: { herb:  { t2: 3 }, mixHerb_T1: 1 } },
  { id: "mixHerb_T3",      name: "T3調合用薬草",    from: { herb:  { t3: 3 }, mixHerb_T2: 1 } },

  { id: "distilledWater_T1", name: "T1蒸留水",      from: { water: { t1: 3 } } },
  { id: "distilledWater_T2", name: "T2蒸留水",      from: { water: { t2: 3 }, distilledWater_T1: 1 } },
  { id: "distilledWater_T3", name: "T3蒸留水",      from: { water: { t3: 3 }, distilledWater_T2: 1 } }
];

// カテゴリ＋ティア表現を itemId にマップするヘルパー。
// 例: { wood: { t1: 3 } } → { "wood_T1": 3 } など、実際のID仕様に合わせて調整する。
function expandIntermediateFromToCost(from) {
  const cost = {};
  Object.keys(from || {}).forEach(cat => {
    const tierMap = from[cat] || {};
    Object.keys(tierMap).forEach(tierKey => {
      const amount = tierMap[tierKey] || 0;
      if (!amount) return;

      // tierKey: "t1" / "t2" / ...
      const tierNum = parseInt(tierKey.replace("t", ""), 10);
      if (!tierNum) return;

      // ここは実際の素材ID規約に合わせて変更する箇所。
      // 仮仕様: wood.t1 → "wood_T1", ore.t2 → "ore_T2" など。
      const itemId = `${cat}_T${tierNum}`;

      cost[itemId] = (cost[itemId] || 0) + amount;
    });
  });
  return cost;
}

// =======================
// レア強化素材
// =======================

const RARE_ENHANCE_MATERIAL_ID = "starShard";
const RARE_ENHANCE_MATERIAL_NAME = "星屑の結晶";

function getIntermediateName(id) {
  const mat = INTERMEDIATE_MATERIALS.find(m => m.id === id);
  if (mat && mat.name) return mat.name;
  if (id === RARE_ENHANCE_MATERIAL_ID) {
    return RARE_ENHANCE_MATERIAL_NAME;
  }
  return id;
}

// =======================
// ポーション種別定数
// =======================

const POTION_TYPE_HP     = "hp";
const POTION_TYPE_MP     = "mp";
const POTION_TYPE_BOTH   = "both";
const POTION_TYPE_DAMAGE = "damage";

// =======================
// ポーションマスタ
// =======================

const POTIONS_INIT = [
  // HP 回復
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

  // MP 回復
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

  // 両方全回復（ハイグレード）
  {
    id: "elixirT3",
    name: "エリクサー",
    type: POTION_TYPE_BOTH,
    power: 1.00,
    flat: 0,
    cost: { mixHerb_T3: 2, distilledWater_T3: 2, ironIngot_T3: 1 },
    rate: 0.5
  },

  // 攻撃強化ポーション
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

  // 守護ポーション
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

  // コンディションポーション
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
];

// =======================
// 道具マスタ（投げ物・爆弾など）
// =======================

const TOOLS_INIT = [
  {
    id: "molotov_T1",
    name: "火炎瓶T1",
    type: "damage",
    power: 10,
    flat: 0,
    cost: { mixHerb_T1: 1, distilledWater_T1: 1, ironIngot_T1: 1 },
    rate: 0.7
  },

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

  // 単発版（下位互換だが既存データ互換用）
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

// ツールマスタをグローバル公開
window.tools = TOOLS_INIT;

// =======================
// 成功率ボーナス
// =======================

function calcCraftSuccessRate(baseRate, skillLv) {
  const bonus = 0.15 * (skillLv / 100);
  let rate = baseRate + bonus;
  if (rate > 0.90) rate = 0.90;
  return rate;
}

// =======================
// 品質ロジック
// =======================

function rollQualityBySkillLv(skillLv) {
  const goodRateBase = 0.005 * skillLv;
  const exRateBase   = 0.002 * skillLv;

  let goodRate = goodRateBase;
  let exRate   = exRateBase;

  try {
    if (typeof getGlobalSkillTreeBonus === "function") {
      const b = getGlobalSkillTreeBonus() || {};
      const qBonus = b.craftQualityBonusRate || 0;

      if (qBonus > 0) {
        const mul = 1 + qBonus;
        goodRate *= mul;
        exRate   *= mul;
      }
    }
  } catch (e) {
    console.warn("rollQualityBySkillLv: skilltree bonus error", e);
  }

  const r = Math.random();
  if (r < exRate) {
    return 2; // 傑作
  } else if (r < exRate + goodRate) {
    return 1; // 良品
  }
  return 0;   // 通常
}

// ========================================
// ITEM_META への登録（中間素材＋レア素材＋ポーション＋道具＋クラフト情報）
// ========================================

(function registerCraftItemsToItemMeta() {
  if (typeof registerItemDefs !== "function") return;

  const defs = {};

  // 中間素材（クラフトも ITEM_META.craft に一元化）
  INTERMEDIATE_MATERIALS.forEach(m => {
    const tierMatch = m.id.match(/_T(\d)/) || m.id.match(/T(\d)$/);
    const tierNum = tierMatch ? parseInt(tierMatch[1], 10) : null;

    defs[m.id] = {
      id: m.id,
      name: m.name,
      category: "material",
      storageKind: "intermediate",
      storageTab: "materials",
      tags: ["craft", "intermediate"],
      craft: {
        enabled: true,
        category: "material",
        tier: tierNum,
        kind: "intermediate",
        baseRate: 1.0,                           // 中間素材クラフトの基礎成功率（必要なら調整）
        cost: expandIntermediateFromToCost(m.from || {}), // itemId ベースに展開したコスト
        fromRaw: m.from || null                  // 旧仕様のままの構造もログ等で使えるように保持
      }
    };
  });

  // レア強化素材
  defs[RARE_ENHANCE_MATERIAL_ID] = {
    id: RARE_ENHANCE_MATERIAL_ID,
    name: RARE_ENHANCE_MATERIAL_NAME,
    category: "material",
    storageKind: "materials",
    storageTab: "materials",
    tags: ["craft", "enhanceMaterial"]
    // レア強化素材自体はクラフト不可なので craft は付けない
  };

  // ポーション（固定の効果値も ITEM_META に寄せる）
  POTIONS_INIT.forEach(p => {
    const m = p.id.match(/T(\d)$/);
    const tierNum = m ? parseInt(m[1], 10) : null;

    defs[p.id] = {
      id: p.id,
      name: p.name,
      category: "potion",
      tier: tierNum,
      tags: ["craft", "potion"],

      // 固定値: 効果情報
      potionType: p.type,
      potionPower: p.power,
      potionFlat: p.flat,

      // レシピ情報を ITEM_META.craft に一元化
      craft: {
        enabled: true,
        category: "potion",
        tier: tierNum,
        kind: "normal",
        baseRate: p.rate != null ? p.rate : 0,
        cost: p.cost || {}
      }
    };
  });

  // 道具（固定の効果値も ITEM_META に寄せる）
  TOOLS_INIT.forEach(t => {
    const m = t.id.match(/T(\d)$/);
    const tierNum = m ? parseInt(m[1], 10) : null;

    defs[t.id] = {
      id: t.id,
      name: t.name,
      category: "tool",
      tier: tierNum,
      tags: ["craft", "tool"],

      // 固定値: 効果情報
      toolType: t.type,
      toolPower: t.power,
      toolFlat: t.flat,

      craft: {
        enabled: true,
        category: "tool",
        tier: tierNum,
        kind: "normal",
        baseRate: t.rate != null ? t.rate : 0,
        cost: t.cost || {}
      }
    };
  });

  registerItemDefs(defs);
})();