// craft-item-data.js
// 中間素材・レア素材・ポーション・道具のマスタ＋クラフト情報（ITEM_META に一元化）
// ＋ クラフトスキル定義・成功率ボーナス・品質ロジック

// =======================
// 素材ティア共通定義（クラフト・マーケット共通）
// =======================
const MATERIAL_TIER_VALUES = {
  t1: 3,
  t2: 5,
  t3: 10,
  t4: 15,
  t5: 25,
  t6: 40,
  t7: 60,
  t8: 90,
  t9: 130,
  t10: 180
};
window.MATERIAL_TIER_VALUES = MATERIAL_TIER_VALUES;

// =======================
// クラフトスキル定義
// =======================

const CRAFT_SKILL_MAX_LV = 100;

const CRAFT_SKILLS_INIT = {
  weapon:    { lv: 0, exp: 0, expToNext: 10 },
  armor:     { lv: 0, exp: 0, expToNext: 10 },
  potion:    { lv: 0, exp: 0, expToNext: 10 },
  tool:      { lv: 0, exp: 0, expToNext: 10 },
  cooking:   { lv: 0, exp: 0, expToNext: 10 },
  material:  { lv: 0, exp: 0, expToNext: 10 },
  furniture: { lv: 0, exp: 0, expToNext: 10 }
};

// =======================
// 中間素材定義（Tier先頭ID形式）
// =======================

const INTERMEDIATE_MATERIALS = [
  { id: "T1_woodPlank",    name: "T1板材",          from: { wood:  { t1: 3 } } },
  { id: "T2_woodPlank",    name: "T2板材",          from: { wood:  { t2: 3 }, "T1_woodPlank": 1 } },
  { id: "T3_woodPlank",    name: "T3板材",          from: { wood:  { t3: 3 }, "T2_woodPlank": 1 } },
  { id: "T4_woodPlank",    name: "T4板材",          from: { wood:  { t4: 3 }, "T3_woodPlank": 1 } },
  { id: "T5_woodPlank",    name: "T5板材",          from: { wood:  { t5: 3 }, "T4_woodPlank": 1 } },
  { id: "T6_woodPlank",    name: "T6板材",          from: { wood:  { t6: 3 }, "T5_woodPlank": 1 } },
  { id: "T7_woodPlank",    name: "T7板材",          from: { wood:  { t7: 3 }, "T6_woodPlank": 1 } },
  { id: "T8_woodPlank",    name: "T8板材",          from: { wood:  { t8: 3 }, "T7_woodPlank": 1 } },
  { id: "T9_woodPlank",    name: "T9板材",          from: { wood:  { t9: 3 }, "T8_woodPlank": 1 } },
  { id: "T10_woodPlank",   name: "T10板材",         from: { wood:  { t10: 3 }, "T9_woodPlank": 1 } },

  { id: "T1_ironIngot",    name: "T1鉄インゴット",  from: { ore:   { t1: 4 } } },
  { id: "T2_ironIngot",    name: "T2鉄インゴット",  from: { ore:   { t2: 4 }, "T1_ironIngot": 1 } },
  { id: "T3_ironIngot",    name: "T3鉄インゴット",  from: { ore:   { t3: 4 }, "T2_ironIngot": 1 } },
  { id: "T4_ironIngot",    name: "T4鉄インゴット",  from: { ore:   { t4: 4 }, "T3_ironIngot": 1 } },
  { id: "T5_ironIngot",    name: "T5鉄インゴット",  from: { ore:   { t5: 4 }, "T4_ironIngot": 1 } },
  { id: "T6_ironIngot",    name: "T6鉄インゴット",  from: { ore:   { t6: 4 }, "T5_ironIngot": 1 } },
  { id: "T7_ironIngot",    name: "T7鉄インゴット",  from: { ore:   { t7: 4 }, "T6_ironIngot": 1 } },
  { id: "T8_ironIngot",    name: "T8鉄インゴット",  from: { ore:   { t8: 4 }, "T7_ironIngot": 1 } },
  { id: "T9_ironIngot",    name: "T9鉄インゴット",  from: { ore:   { t9: 4 }, "T8_ironIngot": 1 } },
  { id: "T10_ironIngot",   name: "T10鉄インゴット", from: { ore:   { t10: 4 }, "T9_ironIngot": 1 } },

  { id: "T1_clothBolt",    name: "T1布束",          from: { cloth: { t1: 3 } } },
  { id: "T2_clothBolt",    name: "T2布束",          from: { cloth: { t2: 3 }, "T1_clothBolt": 1 } },
  { id: "T3_clothBolt",    name: "T3布束",          from: { cloth: { t3: 3 }, "T2_clothBolt": 1 } },
  { id: "T4_clothBolt",    name: "T4布束",          from: { cloth: { t4: 3 }, "T3_clothBolt": 1 } },
  { id: "T5_clothBolt",    name: "T5布束",          from: { cloth: { t5: 3 }, "T4_clothBolt": 1 } },
  { id: "T6_clothBolt",    name: "T6布束",          from: { cloth: { t6: 3 }, "T5_clothBolt": 1 } },
  { id: "T7_clothBolt",    name: "T7布束",          from: { cloth: { t7: 3 }, "T6_clothBolt": 1 } },
  { id: "T8_clothBolt",    name: "T8布束",          from: { cloth: { t8: 3 }, "T7_clothBolt": 1 } },
  { id: "T9_clothBolt",    name: "T9布束",          from: { cloth: { t9: 3 }, "T8_clothBolt": 1 } },
  { id: "T10_clothBolt",   name: "T10布束",         from: { cloth: { t10: 3 }, "T9_clothBolt": 1 } },

  { id: "T1_toughLeather", name: "T1強化皮",        from: { leather: { t1: 3 } } },
  { id: "T2_toughLeather", name: "T2強化皮",        from: { leather: { t2: 3 }, "T1_toughLeather": 1 } },
  { id: "T3_toughLeather", name: "T3強化皮",        from: { leather: { t3: 3 }, "T2_toughLeather": 1 } },
  { id: "T4_toughLeather", name: "T4強化皮",        from: { leather: { t4: 3 }, "T3_toughLeather": 1 } },
  { id: "T5_toughLeather", name: "T5強化皮",        from: { leather: { t5: 3 }, "T4_toughLeather": 1 } },
  { id: "T6_toughLeather", name: "T6強化皮",        from: { leather: { t6: 3 }, "T5_toughLeather": 1 } },
  { id: "T7_toughLeather", name: "T7強化皮",        from: { leather: { t7: 3 }, "T6_toughLeather": 1 } },
  { id: "T8_toughLeather", name: "T8強化皮",        from: { leather: { t8: 3 }, "T7_toughLeather": 1 } },
  { id: "T9_toughLeather", name: "T9強化皮",        from: { leather: { t9: 3 }, "T8_toughLeather": 1 } },
  { id: "T10_toughLeather",name: "T10強化皮",       from: { leather: { t10: 3 }, "T9_toughLeather": 1 } },

  { id: "T1_mixHerb",      name: "T1調合用薬草",    from: { herb:  { t1: 3 } } },
  { id: "T2_mixHerb",      name: "T2調合用薬草",    from: { herb:  { t2: 3 }, "T1_mixHerb": 1 } },
  { id: "T3_mixHerb",      name: "T3調合用薬草",    from: { herb:  { t3: 3 }, "T2_mixHerb": 1 } },
  { id: "T4_mixHerb",      name: "T4調合用薬草",    from: { herb:  { t4: 3 }, "T3_mixHerb": 1 } },
  { id: "T5_mixHerb",      name: "T5調合用薬草",    from: { herb:  { t5: 3 }, "T4_mixHerb": 1 } },
  { id: "T6_mixHerb",      name: "T6調合用薬草",    from: { herb:  { t6: 3 }, "T5_mixHerb": 1 } },
  { id: "T7_mixHerb",      name: "T7調合用薬草",    from: { herb:  { t7: 3 }, "T6_mixHerb": 1 } },
  { id: "T8_mixHerb",      name: "T8調合用薬草",    from: { herb:  { t8: 3 }, "T7_mixHerb": 1 } },
  { id: "T9_mixHerb",      name: "T9調合用薬草",    from: { herb:  { t9: 3 }, "T8_mixHerb": 1 } },
  { id: "T10_mixHerb",     name: "T10調合用薬草",   from: { herb:  { t10: 3 }, "T9_mixHerb": 1 } },

  { id: "T1_distilledWater", name: "T1蒸留水",      from: { water: { t1: 3 } } },
  { id: "T2_distilledWater", name: "T2蒸留水",      from: { water: { t2: 3 }, "T1_distilledWater": 1 } },
  { id: "T3_distilledWater", name: "T3蒸留水",      from: { water: { t3: 3 }, "T2_distilledWater": 1 } },
  { id: "T4_distilledWater", name: "T4蒸留水",      from: { water: { t4: 3 }, "T3_distilledWater": 1 } },
  { id: "T5_distilledWater", name: "T5蒸留水",      from: { water: { t5: 3 }, "T4_distilledWater": 1 } },
  { id: "T6_distilledWater", name: "T6蒸留水",      from: { water: { t6: 3 }, "T5_distilledWater": 1 } },
  { id: "T7_distilledWater", name: "T7蒸留水",      from: { water: { t7: 3 }, "T6_distilledWater": 1 } },
  { id: "T8_distilledWater", name: "T8蒸留水",      from: { water: { t8: 3 }, "T7_distilledWater": 1 } },
  { id: "T9_distilledWater", name: "T9蒸留水",      from: { water: { t9: 3 }, "T8_distilledWater": 1 } },
  { id: "T10_distilledWater",name: "T10蒸留水",     from: { water: { t10: 3 }, "T9_distilledWater": 1 } }
];

// カテゴリ＋ティア表現を itemId にマップするヘルパー（Tier先頭対応）
function expandIntermediateFromToCost(from) {
  const cost = {};
  Object.keys(from || {}).forEach(cat => {
    const tierMap = from[cat] || {};
    Object.keys(tierMap).forEach(tierKey => {
      const amount = tierMap[tierKey] || 0;
      if (!amount) return;

      const tierNum = parseInt(tierKey.replace("t", ""), 10);
      if (!tierNum) return;

      const itemId = `T${tierNum}_${cat}`;
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
// ポーションテンプレ＋生成
// =======================

const POTION_MAX_TIER = 10;

const POTION_TEMPLATES = [
  {
    baseId: "potion",
    baseName: "ポーション",
    type: POTION_TYPE_HP,
    basePower: 0.30,
    maxPower: 1.50,
    baseFlat: 5,
    maxFlat: 50,
    costKey: "hp",
    rateKey: "hp"
  },
  {
    baseId: "mana",
    baseName: "マナポーション",
    type: POTION_TYPE_MP,
    basePower: 0.30,
    maxPower: 1.50,
    baseFlat: 5,
    maxFlat: 50,
    costKey: "mp",
    rateKey: "mp"
  },
  {
    baseId: "elixir",
    baseName: "エリクサー",
    type: POTION_TYPE_BOTH,
    basePower: 1.0,
    maxPower: 1.0,
    baseFlat: 0,
    maxFlat: 0,
    fixedTier: 3,
    costKey: "elixir",
    rateKey: "elixir"
  },
  {
    baseId: "buffAtk",
    baseName: "攻撃強化ポーション",
    type: POTION_TYPE_BOTH,
    basePower: 0,
    maxPower: 0,
    baseFlat: 0,
    maxFlat: 0,
    costKey: "buffAtk",
    rateKey: "buff"
  },
  {
    baseId: "buffDef",
    baseName: "守護ポーション",
    type: POTION_TYPE_BOTH,
    basePower: 0,
    maxPower: 0,
    baseFlat: 0,
    maxFlat: 0,
    costKey: "buffDef",
    rateKey: "buff"
  },
  {
    baseId: "cleanse",
    baseName: "コンディションポーション",
    type: POTION_TYPE_BOTH,
    basePower: 0,
    maxPower: 0,
    baseFlat: 0,
    maxFlat: 0,
    costKey: "cleanse",
    rateKey: "buff"
  }
];

function lerpByTier(tier, base, max, maxTier) {
  if (max === base) return base;
  const t = (tier - 1) / (maxTier - 1);
  return base + (max - base) * t;
}

function getPotionBaseRate(kind, tier) {
  const tableHPMP = {
    1: 0.8, 2: 0.7, 3: 0.6, 4: 0.55, 5: 0.5,
    6: 0.45, 7: 0.4, 8: 0.35, 9: 0.3, 10: 0.25
  };
  const tableBuff = tableHPMP;

  if (kind === "hp" || kind === "mp") {
    return tableHPMP[tier] || 0.25;
  }
  if (kind === "elixir") {
    return 0.5;
  }
  if (kind === "buff") {
    return tableBuff[tier] || 0.25;
  }
  return 0.5;
}

function buildPotionCost(costKey, tier) {
  switch (costKey) {
    case "hp":
      return {
        [`T${tier}_mixHerb`]:
          tier <= 4 ? 1 : tier <= 6 ? 2 : tier <= 8 ? 3 : tier <= 9 ? 4 : 5,
        [`T${tier}_distilledWater`]:
          tier <= 3 ? 1 : tier === 4 ? 2 : tier <= 6 ? 3 : tier === 7 ? 3 : tier === 8 ? 4 : tier === 9 ? 4 : 5
      };
    case "mp":
      return {
        [`T${tier}_mixHerb`]:
          tier <= 4 ? 1 : tier <= 6 ? 2 : tier <= 8 ? 3 : tier <= 9 ? 4 : 5,
        [`T${tier}_distilledWater`]:
          tier <= 3 ? 2 : tier === 4 ? 3 : tier <= 6 ? 4 : tier <= 9 ? 5 : 6
      };
    case "elixir":
      return { T3_mixHerb: 2, T3_distilledWater: 2, T3_ironIngot: 1 };
    case "buffAtk":
      return {
        [`T${tier}_mixHerb`]: tier,
        [`T${tier}_ironIngot`]:
          tier <= 2 ? 1 : tier <= 5 ? 1 : tier <= 7 ? 2 : tier <= 8 ? 2 : tier <= 9 ? 4 : 5
      };
    case "buffDef":
      return {
        [`T${tier}_toughLeather`]: tier,
        [`T${tier}_distilledWater`]:
          tier <= 2 ? 1 : tier <= 4 ? 1 : tier <= 6 ? 2 : tier <= 8 ? 3 : tier <= 9 ? 4 : 5
      };
    case "cleanse":
      return {
        [`T${tier}_mixHerb`]:
          tier === 1 ? 2 : tier === 2 ? 3 : tier === 3 ? 4 : tier === 4 ? 5 : tier === 5 ? 6 :
          tier === 6 ? 7 : tier === 7 ? 8 : tier === 8 ? 9 : tier === 9 ? 10 : 12,
        [`T${tier}_distilledWater`]:
          tier === 1 ? 1 : tier === 2 ? 2 : tier === 3 ? 2 : tier === 4 ? 3 : tier === 5 ? 3 :
          tier === 6 ? 4 : tier === 7 ? 4 : tier === 8 ? 5 : tier === 9 ? 5 : 6
      };
    default:
      return {};
  }
}

function generatePotionTiers(tpl) {
  const list = [];
  if (tpl.fixedTier) {
    const tier = tpl.fixedTier;
    list.push({
      id: `T${tier}_${tpl.baseId}`,
      name: `T${tier}${tpl.baseName}`,
      type: tpl.type,
      power: tpl.basePower,
      flat: tpl.baseFlat,
      cost: buildPotionCost(tpl.costKey, tier),
      rate: getPotionBaseRate(tpl.rateKey, tier)
    });
    return list;
  }

  for (let tier = 1; tier <= POTION_MAX_TIER; tier++) {
    list.push({
      id: `T${tier}_${tpl.baseId}`,
      name: `T${tier}${tpl.baseName}`,
      type: tpl.type,
      power: lerpByTier(tier, tpl.basePower, tpl.maxPower, POTION_MAX_TIER),
      flat: lerpByTier(tier, tpl.baseFlat, tpl.maxFlat, POTION_MAX_TIER),
      cost: buildPotionCost(tpl.costKey, tier),
      rate: getPotionBaseRate(tpl.rateKey, tier)
    });
  }
  return list;
}

const POTIONS_INIT = POTION_TEMPLATES.flatMap(generatePotionTiers);

// =======================
// 道具テンプレ＋生成
// =======================

const TOOL_MAX_TIER = 10;

const TOOL_TEMPLATES = [
  {
    baseId: "molotov",
    baseName: "火炎瓶",
    type: "damage",
    basePower: 10,
    powerPerTier: 4,
    costKey: "molotov"
  },
  {
    baseId: "bomb",
    baseName: "爆弾",
    type: "damage",
    basePower: 7,
    powerPerTier: 3,
    costKey: "bomb"
  },
  {
    baseId: "bomb_fire",
    baseName: "火炎瓶",
    type: "damage",
    basePower: 10,
    powerPerTier: 4,
    costKey: "bomb_fire"
  },
  {
    baseId: "poisonNeedle",
    baseName: "毒針",
    type: "damageStatus",
    basePower: 4,
    powerPerTier: 3,
    costKey: "poisonNeedle"
  },
  {
    baseId: "paralyzeGas",
    baseName: "麻痺ガス瓶",
    type: "status",
    basePower: 0,
    powerPerTier: 0,
    costKey: "paralyzeGas"
  }
];

function getToolBaseRate(tier) {
  const table = {
    1: 0.7, 2: 0.65, 3: 0.6, 4: 0.55, 5: 0.5,
    6: 0.45, 7: 0.4, 8: 0.35, 9: 0.3, 10: 0.25
  };
  return table[tier] || 0.25;
}

function buildToolCost(costKey, tier) {
  switch (costKey) {
    case "molotov":
      return {
        [`T${tier}_mixHerb`]: tier,
        [`T${tier}_distilledWater`]:
          tier <= 3 ? 1 : tier <= 5 ? 2 : tier <= 7 ? 3 : tier <= 9 ? 4 : 5,
        [`T${tier}_ironIngot`]:
          tier <= 3 ? 1 : tier <= 5 ? 2 : tier <= 7 ? 2 : tier <= 8 ? 3 : 4
      };
    case "bomb":
      return {
        [`T${tier}_ironIngot`]:
          tier <= 2 ? 1 : tier <= 4 ? 2 : tier <= 6 ? 3 : tier <= 8 ? 3 : tier <= 9 ? 5 : 6,
        [`T${tier}_mixHerb`]:
          tier <= 1 ? 1 : tier <= 3 ? 2 : tier <= 5 ? 3 : tier <= 7 ? 4 : tier <= 8 ? 5 : 6
      };
    case "bomb_fire":
      return {
        [`T${tier}_ironIngot`]:
          tier <= 2 ? 1 : tier <= 4 ? 2 : tier <= 6 ? 3 : tier <= 8 ? 4 : tier <= 9 ? 5 : 6,
        [`T${tier}_mixHerb`]:
          tier === 1 ? 2 : tier === 2 ? 3 : tier === 3 ? 3 : tier === 4 ? 4 : tier === 5 ? 4 :
          tier === 6 ? 5 : tier === 7 ? 5 : tier === 8 ? 6 : tier === 9 ? 6 : 7
      };
    case "poisonNeedle":
      return {
        [`T${tier}_mixHerb`]:
          tier === 1 ? 2 : tier === 2 ? 3 : tier === 3 ? 4 : tier === 4 ? 5 : tier === 5 ? 6 :
          tier === 6 ? 7 : tier === 7 ? 8 : tier === 8 ? 9 : tier === 9 ? 10 : 12
      };
    case "paralyzeGas":
      return {
        [`T${tier}_mixHerb`]: tier,
        [`T${tier}_distilledWater`]:
          tier === 1 ? 1 : tier === 2 ? 1 : tier === 3 ? 2 : tier === 4 ? 2 : tier === 5 ? 2 :
          tier === 6 ? 3 : tier === 7 ? 3 : tier === 8 ? 4 : tier === 9 ? 4 : 5
      };
    default:
      return {};
  }
}

function generateToolTiers(tpl) {
  const list = [];
  for (let tier = 1; tier <= TOOL_MAX_TIER; tier++) {
    list.push({
      id: `T${tier}_${tpl.baseId}`,
      name: `T${tier}${tpl.baseName}`,
      type: tpl.type,
      power: tpl.basePower + tpl.powerPerTier * (tier - 1),
      flat: 0,
      cost: buildToolCost(tpl.costKey, tier),
      rate: getToolBaseRate(tier)
    });
  }
  return list;
}

const TOOLS_INIT = TOOL_TEMPLATES.flatMap(generateToolTiers);

TOOLS_INIT.push({
  id: "T1_bomb",
  name: "T1爆弾",
  type: "damage",
  power: 7,
  flat: 0,
  cost: { T1_ironIngot: 2, T1_mixHerb: 1 },
  rate: 0.7
});

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
    return 2;
  } else if (r < exRate + goodRate) {
    return 1;
  }
  return 0;
}

// ========================================
// ITEM_META への登録（中間素材＋レア素材＋ポーション＋道具＋クラフト情報）
// ========================================

(function registerCraftItemsToItemMeta() {
  if (typeof registerItemDefs !== "function") return;

  const defs = {};

  INTERMEDIATE_MATERIALS.forEach(m => {
    const tierMatch = m.id.match(/^T(\d+)_/);
    const tierNum = tierMatch ? parseInt(tierMatch[1], 10) : null;

    defs[m.id] = {
      id: m.id,
      name: m.name,
      category: "material",
      tier: tierNum,
      storageKind: "intermediate",
      storageTab: "materials",
      tags: ["craft", "intermediate"],
      craft: {
        enabled: true,
        category: "material",
        tier: tierNum,
        kind: "intermediate",
        baseRate: 1.0,
        cost: expandIntermediateFromToCost(m.from || {}),
        fromRaw: m.from || null
      }
    };
  });

  defs[RARE_ENHANCE_MATERIAL_ID] = {
    id: RARE_ENHANCE_MATERIAL_ID,
    name: RARE_ENHANCE_MATERIAL_NAME,
    category: "material",
    storageKind: "materials",
    storageTab: "materials",
    tags: ["craft", "enhanceMaterial"]
  };

  POTIONS_INIT.forEach(p => {
    const m = p.id.match(/^T(\d+)_/);
    const tierNum = m ? parseInt(m[1], 10) : null;

    defs[p.id] = {
      id: p.id,
      name: p.name,
      category: "potion",
      tier: tierNum,
      tags: ["craft", "potion"],

      potionType: p.type,
      potionPower: p.power,
      potionFlat: p.flat,

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

  TOOLS_INIT.forEach(t => {
    const m = t.id.match(/^T(\d+)_/);
    const tierNum = m ? parseInt(m[1], 10) : null;

    defs[t.id] = {
      id: t.id,
      name: t.name,
      category: "tool",
      tier: tierNum,
      tags: ["craft", "tool"],

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