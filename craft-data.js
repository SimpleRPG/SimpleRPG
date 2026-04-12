// craft-data.js
// クラフトレシピ＆クラフトスキル定義＋成功率ボーナス＆品質ロジック
// ＋ 料理用素材カテゴリとの整合性を取りやすい形の下準備

// =======================
// スキル定義
// =======================

const CRAFT_SKILL_MAX_LV = 100;

const CRAFT_SKILLS_INIT = {
  weapon:   { lv: 0, exp: 0, expToNext: 10 },
  armor:    { lv: 0, exp: 0, expToNext: 10 },
  potion:   { lv: 0, exp: 0, expToNext: 10 },
  tool:     { lv: 0, exp: 0, expToNext: 10 },
  cooking:  { lv: 0, exp: 0, expToNext: 10 }, // 料理用クラフトスキル
  material: { lv: 0, exp: 0, expToNext: 10 }  // 中間素材用クラフトスキル
};

// =======================
// 中間素材定義
// =======================
//
// T2以降は「前のTierの中間素材を＋1個」要求するように変更。
// それ以外の仕様・レシピ構造はそのまま。

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
// 採取装備用テンプレ定義
// =======================

const GATHER_TIERS = [
  { key: "T1", suffix: "_T1", weaponBase: 0.8, armorBase: 0.8 },
  { key: "T2", suffix: "_T2", weaponBase: 0.75, armorBase: 0.75 },
  { key: "T3", suffix: "_T3", weaponBase: 0.7, armorBase: 0.7 }
];

const GATHER_WEAPON_TEMPLATES = [
  {
    baseId: "gatherAxe",
    baseName: "伐採用ツール",
    makeCost(t) {
      return {
        ["woodPlank" + t.suffix]: 2,
        ["ironIngot" + t.suffix]: 1
      };
    }
  },
  {
    baseId: "gatherPick",
    baseName: "採掘用ツール",
    makeCost(t) {
      return {
        ["ironIngot" + t.suffix]: 2,
        ["woodPlank" + t.suffix]: 1
      };
    }
  },
  {
    baseId: "gatherKnife",
    baseName: "採草用ツール",
    makeCost(t) {
      return {
        ["clothBolt" + t.suffix]: 1,
        ["toughLeather" + t.suffix]: 1
      };
    }
  },
  {
    baseId: "gatherShears",
    baseName: "布採取用ツール",
    makeCost(t) {
      return {
        ["clothBolt" + t.suffix]: 2,
        ["toughLeather" + t.suffix]: 1
      };
    }
  },
  {
    baseId: "gatherDagger",
    baseName: "皮採取用ツール",
    makeCost(t) {
      return {
        ["toughLeather" + t.suffix]: 2,
        ["clothBolt" + t.suffix]: 1
      };
    }
  },
  {
    baseId: "gatherFlask",
    baseName: "水採取用ツール",
    makeCost(t) {
      return {
        ["distilledWater" + t.suffix]: 1,
        ["ironIngot" + t.suffix]: 1
      };
    }
  },
  {
    baseId: "huntTool",
    baseName: "狩猟用ツール",
    makeCost(t) {
      return {
        ["ironIngot" + t.suffix]: 1,
        ["toughLeather" + t.suffix]: 1
      };
    }
  },
  {
    baseId: "fishTool",
    baseName: "釣り用ツール",
    makeCost(t) {
      return {
        ["woodPlank" + t.suffix]: 1,
        ["clothBolt" + t.suffix]: 1
      };
    }
  },
  {
    baseId: "farmTool",
    baseName: "畑作業用ツール",
    makeCost(t) {
      return {
        ["woodPlank" + t.suffix]: 1,
        ["mixHerb" + t.suffix]: 1
      };
    }
  },
  {
    baseId: "gardenTool",
    baseName: "菜園用ツール",
    makeCost(t) {
      return {
        ["clothBolt" + t.suffix]: 1,
        ["mixHerb" + t.suffix]: 1
      };
    }
  }
];

function buildGatherWeaponRecipes() {
  const out = [];
  GATHER_WEAPON_TEMPLATES.forEach(tmp => {
    GATHER_TIERS.forEach(t => {
      out.push({
        id: `${tmp.baseId}${t.suffix}`,
        name: `${tmp.baseName}${t.key}`,
        cost: tmp.makeCost(t),
        baseRate: t.weaponBase,
        kind: "gather" // 採取用武器
      });
    });
  });
  return out;
}

const GATHER_ARMOR_TEMPLATES = [
  {
    baseId: "gatherArmorWood",
    baseName: "伐採用防具",
    makeCost(t) {
      return {
        ["toughLeather" + t.suffix]: 1,
        ["clothBolt" + t.suffix]: 1
      };
    }
  },
  {
    baseId: "gatherArmorOre",
    baseName: "採掘用防具",
    makeCost(t) {
      return {
        ["ironIngot" + t.suffix]: 1,
        ["toughLeather" + t.suffix]: 1
      };
    }
  },
  {
    baseId: "gatherArmorHerb",
    baseName: "採草用防具",
    makeCost(t) {
      return {
        ["clothBolt" + t.suffix]: 1,
        ["mixHerb" + t.suffix]: 1
      };
    }
  },
  {
    baseId: "gatherArmorCloth",
    baseName: "布採取用防具",
    makeCost(t) {
      return {
        ["clothBolt" + t.suffix]: 2
      };
    }
  },
  {
    baseId: "gatherArmorLeather",
    baseName: "皮採取用防具",
    makeCost(t) {
      return {
        ["toughLeather" + t.suffix]: 2
      };
    }
  },
  {
    baseId: "gatherArmorWater",
    baseName: "水採取用防具",
    makeCost(t) {
      return {
        ["distilledWater" + t.suffix]: 1,
        ["clothBolt" + t.suffix]: 1
      };
    }
  },
  {
    baseId: "gatherArmorHunt",
    baseName: "狩猟用防具",
    makeCost(t) {
      return {
        ["toughLeather" + t.suffix]: 1,
        ["ironIngot" + t.suffix]: 1
      };
    }
  },
  {
    baseId: "gatherArmorFish",
    baseName: "釣り用防具",
    makeCost(t) {
      return {
        ["clothBolt" + t.suffix]: 1,
        ["toughLeather" + t.suffix]: 1
      };
    }
  },
  {
    baseId: "gatherArmorFarm",
    baseName: "畑用防具",
    makeCost(t) {
      return {
        ["clothBolt" + t.suffix]: 1,
        ["mixHerb" + t.suffix]: 1
      };
    }
  },
  {
    baseId: "gatherArmorGarden",
    baseName: "菜園用防具",
    makeCost(t) {
      return {
        ["clothBolt" + t.suffix]: 1,
        ["mixHerb" + t.suffix]: 1
      };
    }
  }
];

function buildGatherArmorRecipes() {
  const out = [];
  GATHER_ARMOR_TEMPLATES.forEach(tmp => {
    GATHER_TIERS.forEach(t => {
      out.push({
        id: `${tmp.baseId}${t.suffix}`,
        name: `${tmp.baseName}${t.key}`,
        cost: tmp.makeCost(t),
        baseRate: t.armorBase,
        kind: "gather" // 採取用防具
      });
    });
  });
  return out;
}

// =======================
// レシピ一覧
// =======================

const CRAFT_RECIPES = {
  // ---- 武器 ----
  weapon: [
    // 戦闘用武器 → kind: "normal"
    {
      id: "dagger_T1",
      name: "短剣T1",
      cost: { woodPlank_T1: 1, ironIngot_T1: 1 },
      baseRate: 0.8,
      kind: "normal"
    },
    {
      id: "dagger_T2",
      name: "短剣T2",
      cost: { woodPlank_T2: 1, ironIngot_T2: 1 },
      baseRate: 0.7,
      kind: "normal"
    },
    {
      id: "dagger_T3",
      name: "短剣T3",
      cost: { woodPlank_T3: 1, ironIngot_T3: 1 },
      baseRate: 0.6,
      kind: "normal"
    },

    {
      id: "short_T1",
      name: "ショートソードT1",
      cost: { woodPlank_T1: 1, ironIngot_T1: 2 },
      baseRate: 0.75,
      kind: "normal"
    },
    {
      id: "short_T2",
      name: "ショートソードT2",
      cost: { woodPlank_T2: 1, ironIngot_T2: 2 },
      baseRate: 0.7,
      kind: "normal"
    },
    {
      id: "short_T3",
      name: "ショートソードT3",
      cost: { woodPlank_T3: 1, ironIngot_T3: 2 },
      baseRate: 0.65,
      kind: "normal"
    },

    {
      id: "long_T1",
      name: "ロングソードT1",
      cost: { woodPlank_T1: 2, ironIngot_T1: 2 },
      baseRate: 0.7,
      kind: "normal"
    },
    {
      id: "long_T2",
      name: "ロングソードT2",
      cost: { woodPlank_T2: 2, ironIngot_T2: 2 },
      baseRate: 0.65,
      kind: "normal"
    },
    {
      id: "long_T3",
      name: "ロングソードT3",
      cost: { woodPlank_T3: 2, ironIngot_T3: 2 },
      baseRate: 0.6,
      kind: "normal"
    },

    {
      id: "great_T1",
      name: "グレートソードT1",
      cost: { woodPlank_T1: 2, ironIngot_T1: 3 },
      baseRate: 0.65,
      kind: "normal"
    },
    {
      id: "great_T2",
      name: "グレートソードT2",
      cost: { woodPlank_T2: 2, ironIngot_T2: 3 },
      baseRate: 0.6,
      kind: "normal"
    },
    {
      id: "great_T3",
      name: "グレートソードT3",
      cost: { woodPlank_T3: 2, ironIngot_T3: 3 },
      baseRate: 0.55,
      kind: "normal"
    },

    {
      id: "magicStaff_T1",
      name: "魔法の杖T1",
      cost: { woodPlank_T1: 1, herb: 2 },
      baseRate: 0.7,
      kind: "normal"
    },
    {
      id: "magicStaff_T2",
      name: "魔法の杖T2",
      cost: { woodPlank_T2: 1, herb: 3 },
      baseRate: 0.65,
      kind: "normal"
    },
    {
      id: "magicStaff_T3",
      name: "魔法の杖T3",
      cost: { woodPlank_T3: 1, herb: 4 },
      baseRate: 0.6,
      kind: "normal"
    },

    {
      id: "runeSword_T1",
      name: "ルーンソードT1",
      cost: { woodPlank_T1: 1, ironIngot_T1: 2, herb: 1 },
      baseRate: 0.65,
      kind: "normal"
    },
    {
      id: "runeSword_T2",
      name: "ルーンソードT2",
      cost: { woodPlank_T2: 1, ironIngot_T2: 2, herb: 2 },
      baseRate: 0.6,
      kind: "normal"
    },
    {
      id: "runeSword_T3",
      name: "ルーンソードT3",
      cost: { woodPlank_T3: 1, ironIngot_T3: 2, herb: 3 },
      baseRate: 0.55,
      kind: "normal"
    },

    {
      id: "greatShield_T1",
      name: "大盾T1",
      cost: { woodPlank_T1: 2, ironIngot_T1: 1, toughLeather_T1: 1 },
      baseRate: 0.7,
      kind: "normal"
    },
    {
      id: "greatShield_T2",
      name: "大盾T2",
      cost: { woodPlank_T2: 2, ironIngot_T2: 1, toughLeather_T2: 1 },
      baseRate: 0.65,
      kind: "normal"
    },
    {
      id: "greatShield_T3",
      name: "大盾T3",
      cost: { woodPlank_T3: 2, ironIngot_T3: 1, toughLeather_T3: 1 },
      baseRate: 0.6,
      kind: "normal"
    },

    // 採取用武器
    ...buildGatherWeaponRecipes()
  ],

  // ---- 防具 ----
  armor: [
    {
      id: "leatherVest_T1",
      name: "レザーベストT1",
      cost: { clothBolt_T1: 1, toughLeather_T1: 1 },
      baseRate: 0.8,
      kind: "normal"
    },
    {
      id: "leatherVest_T2",
      name: "レザーベストT2",
      cost: { clothBolt_T2: 1, toughLeather_T2: 1 },
      baseRate: 0.75,
      kind: "normal"
    },
    {
      id: "leatherVest_T3",
      name: "レザーベストT3",
      cost: { clothBolt_T3: 1, toughLeather_T3: 1 },
      baseRate: 0.7,
      kind: "normal"
    },

    {
      id: "chainmail_T1",
      name: "チェインメイルT1",
      cost: { ironIngot_T1: 2, toughLeather_T1: 1 },
      baseRate: 0.75,
      kind: "normal"
    },
    {
      id: "chainmail_T2",
      name: "チェインメイルT2",
      cost: { ironIngot_T2: 2, toughLeather_T2: 1 },
      baseRate: 0.7,
      kind: "normal"
    },
    {
      id: "chainmail_T3",
      name: "チェインメイルT3",
      cost: { ironIngot_T3: 2, toughLeather_T3: 1 },
      baseRate: 0.65,
      kind: "normal"
    },

    {
      id: "ironArmor_T1",
      name: "鉄の鎧T1",
      cost: { ironIngot_T1: 3, clothBolt_T1: 1, toughLeather_T1: 1 },
      baseRate: 0.7,
      kind: "normal"
    },
    {
      id: "ironArmor_T2",
      name: "鉄の鎧T2",
      cost: { ironIngot_T2: 3, clothBolt_T2: 1, toughLeather_T2: 1 },
      baseRate: 0.65,
      kind: "normal"
    },
    {
      id: "ironArmor_T3",
      name: "鉄の鎧T3",
      cost: { ironIngot_T3: 3, clothBolt_T3: 1, toughLeather_T3: 1 },
      baseRate: 0.6,
      kind: "normal"
    },

    // 採取用防具
    ...buildGatherArmorRecipes()
  ],

  // ---- ポーション ----
  potion: [
    {
      id: "potionT1",
      name: "ポーションT1",
      cost: { mixHerb_T1: 1, distilledWater_T1: 1 },
      baseRate: 0.8
    },
    {
      id: "potionT2",
      name: "ポーションT2",
      cost: { mixHerb_T2: 1, distilledWater_T2: 1 },
      baseRate: 0.7
    },
    {
      id: "potionT3",
      name: "ポーションT3",
      cost: { mixHerb_T3: 1, distilledWater_T3: 1 },
      baseRate: 0.6
    },

    {
      id: "manaT1",
      name: "マナポーションT1",
      cost: { mixHerb_T1: 1, distilledWater_T1: 2 },
      baseRate: 0.8
    },
    {
      id: "manaT2",
      name: "マナポーションT2",
      cost: { mixHerb_T2: 1, distilledWater_T2: 2 },
      baseRate: 0.7
    },
    {
      id: "manaT3",
      name: "マナポーションT3",
      cost: { mixHerb_T3: 1, distilledWater_T3: 2 },
      baseRate: 0.6
    },

    {
      id: "elixirT3",
      name: "エリクサー",
      cost: { mixHerb_T3: 2, distilledWater_T3: 2, ore_T3: 2 },
      baseRate: 0.5
    },

    // 攻撃強化ポーション（料理よりバフ値少し高め・ターン数短い想定）
    {
      id: "buffAtk_T1",
      name: "攻撃強化ポーションT1",
      cost: { mixHerb_T1: 1, ironIngot_T1: 1 },
      baseRate: 0.8
    },
    {
      id: "buffAtk_T2",
      name: "攻撃強化ポーションT2",
      cost: { mixHerb_T2: 2, ironIngot_T2: 1 },
      baseRate: 0.7
    },
    {
      id: "buffAtk_T3",
      name: "攻撃強化ポーションT3",
      cost: { mixHerb_T3: 3, ironIngot_T3: 2 },
      baseRate: 0.6
    },

    // 守護ポーション（防御寄り、小回復付き）
    {
      id: "buffDef_T1",
      name: "守護ポーションT1",
      cost: { toughLeather_T1: 1, distilledWater_T1: 1 },
      baseRate: 0.8
    },
    {
      id: "buffDef_T2",
      name: "守護ポーションT2",
      cost: { toughLeather_T2: 2, distilledWater_T2: 1 },
      baseRate: 0.7
    },
    {
      id: "buffDef_T3",
      name: "守護ポーションT3",
      cost: { toughLeather_T3: 3, distilledWater_T3: 2 },
      baseRate: 0.6
    },

    // コンディションポーション（状態異常解除＋リジェネ寄り）
    {
      id: "cleanse_T1",
      name: "コンディションポーションT1",
      cost: { mixHerb_T1: 2, distilledWater_T1: 1 },
      baseRate: 0.8
    },
    {
      id: "cleanse_T2",
      name: "コンディションポーションT2",
      cost: { mixHerb_T2: 3, distilledWater_T2: 2 },
      baseRate: 0.7
    },
    {
      id: "cleanse_T3",
      name: "コンディションポーションT3",
      cost: { mixHerb_T3: 4, distilledWater_T3: 2 },
      baseRate: 0.6
    }
  ],

  // ---- 道具 ----
  tool: [
    {
      id: "bomb_T1",
      name: "爆弾T1",
      cost: { ironIngot_T1: 1, mixHerb_T1: 1 },
      baseRate: 0.7
    },
    {
      id: "bomb_T2",
      name: "爆弾T2",
      cost: { ironIngot_T2: 1, mixHerb_T2: 2 },
      baseRate: 0.65
    },
    {
      id: "bomb_T3",
      name: "爆弾T3",
      cost: { ironIngot_T3: 2, mixHerb_T3: 2 },
      baseRate: 0.6
    },

    // 火炎瓶：単体ダメ＋やけど
    {
      id: "bomb_fire_T1",
      name: "火炎瓶T1",
      cost: { ironIngot_T1: 1, mixHerb_T1: 2 },
      baseRate: 0.7
    },
    {
      id: "bomb_fire_T2",
      name: "火炎瓶T2",
      cost: { ironIngot_T2: 1, mixHerb_T2: 3 },
      baseRate: 0.65
    },
    {
      id: "bomb_fire_T3",
      name: "火炎瓶T3",
      cost: { ironIngot_T3: 2, mixHerb_T3: 3 },
      baseRate: 0.6
    },

    // 毒針：低ダメ＋毒DOT
    {
      id: "poisonNeedle_T1",
      name: "毒針T1",
      cost: { mixHerb_T1: 2 },
      baseRate: 0.75
    },
    {
      id: "poisonNeedle_T2",
      name: "毒針T2",
      cost: { mixHerb_T2: 3 },
      baseRate: 0.7
    },
    {
      id: "poisonNeedle_T3",
      name: "毒針T3",
      cost: { mixHerb_T3: 4 },
      baseRate: 0.65
    },

    // 麻痺ガス瓶：微ダメ＋麻痺判定
    {
      id: "paralyzeGas_T1",
      name: "麻痺ガス瓶T1",
      cost: { mixHerb_T1: 1, distilledWater_T1: 1 },
      baseRate: 0.7
    },
    {
      id: "paralyzeGas_T2",
      name: "麻痺ガス瓶T2",
      cost: { mixHerb_T2: 2, distilledWater_T2: 1 },
      baseRate: 0.65
    },
    {
      id: "paralyzeGas_T3",
      name: "麻痺ガス瓶T3",
      cost: { mixHerb_T3: 3, distilledWater_T3: 2 },
      baseRate: 0.6
    }
  ]
};

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
  const goodRate = 0.005 * skillLv;
  const exRate   = 0.002 * skillLv;

  const r = Math.random();
  if (r < exRate) {
    return 2;
  } else if (r < exRate + goodRate) {
    return 1;
  }
  return 0;
}