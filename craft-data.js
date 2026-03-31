// craft-data.js
// クラフトレシピ＆クラフトスキル定義＋成功率ボーナス＆品質ロジック
// ＋ 料理用素材カテゴリとの整合性を取りやすい形の下準備

// =======================
// スキル定義
// =======================

// クラフトカテゴリごとのスキル最大値
const CRAFT_SKILL_MAX_LV = 100;

// クラフトスキル初期値
// game-core 側でこのオブジェクトをコピーして使う
const CRAFT_SKILLS_INIT = {
  weapon: { lv: 0, exp: 0, expToNext: 10 },
  armor:  { lv: 0, exp: 0, expToNext: 10 },
  potion: { lv: 0, exp: 0, expToNext: 10 },
  tool:   { lv: 0, exp: 0, expToNext: 10 }
  // 料理スキルを増やすならここに:
  // cooking: { lv: 0, exp: 0, expToNext: 10 }
};

// =======================
// 中間素材定義（新規）
// =======================
//
// materials[...] には T1/T2/T3 の草・木・鉱石…が入る前提。
// ここではそれを消費して "板材" や "インゴット" などの中間素材を作る。
// 所持数そのもの（intermediateMats）は game-core 側で定義する想定。

const INTERMEDIATE_MATERIALS = [
  // 板材（木から）
  { id: "woodPlank_T1",    name: "T1板材",          from: { wood:    { t1: 3 } } },
  { id: "woodPlank_T2",    name: "T2板材",          from: { wood:    { t2: 3 } } },
  { id: "woodPlank_T3",    name: "T3板材",          from: { wood:    { t3: 3 } } },

  // インゴット（鉱石から）
  { id: "ironIngot_T1",    name: "T1鉄インゴット",  from: { ore:     { t1: 4 } } },
  { id: "ironIngot_T2",    name: "T2鉄インゴット",  from: { ore:     { t2: 4 } } },
  { id: "ironIngot_T3",    name: "T3鉄インゴット",  from: { ore:     { t3: 4 } } },

  // 布束（布から）
  { id: "clothBolt_T1",    name: "T1布束",          from: { cloth:   { t1: 3 } } },
  { id: "clothBolt_T2",    name: "T2布束",          from: { cloth:   { t2: 3 } } },
  { id: "clothBolt_T3",    name: "T3布束",          from: { cloth:   { t3: 3 } } },

  // 強化皮（皮から）
  { id: "toughLeather_T1", name: "T1強化皮",        from: { leather: { t1: 3 } } },
  { id: "toughLeather_T2", name: "T2強化皮",        from: { leather: { t2: 3 } } },
  { id: "toughLeather_T3", name: "T3強化皮",        from: { leather: { t3: 3 } } }
];

// =======================
// レシピ一覧（T1〜T3装備＆ポーション）
// =======================
//
// cost は「基本素材」と「中間素材」を混在させてOK。
// basic: wood/ore/herb/cloth/leather/water + その tier 指定版（wood_T1 など）
// intermediate: woodPlank_Tx / ironIngot_Tx / clothBolt_Tx / toughLeather_Tx
//
// ※料理用素材（肉/魚/野菜/穀物/調味料）は COOKING_RECIPES 側で別管理。
//   ここでは装備・ポーション・道具のみ。

const CRAFT_RECIPES = {
  // ---- 武器 ----
  weapon: [
    // 短剣（T1〜T3）
    {
      id: "dagger_T1",
      name: "短剣T1",
      cost: { woodPlank_T1: 1, ironIngot_T1: 1 },
      baseRate: 0.8
    },
    {
      id: "dagger_T2",
      name: "短剣T2",
      cost: { woodPlank_T2: 1, ironIngot_T2: 1 },
      baseRate: 0.7
    },
    {
      id: "dagger_T3",
      name: "短剣T3",
      cost: { woodPlank_T3: 1, ironIngot_T3: 1 },
      baseRate: 0.6
    },

    // ショートソード
    {
      id: "short_T1",
      name: "ショートソードT1",
      cost: { woodPlank_T1: 1, ironIngot_T1: 2 },
      baseRate: 0.75
    },
    {
      id: "short_T2",
      name: "ショートソードT2",
      cost: { woodPlank_T2: 1, ironIngot_T2: 2 },
      baseRate: 0.7
    },
    {
      id: "short_T3",
      name: "ショートソードT3",
      cost: { woodPlank_T3: 1, ironIngot_T3: 2 },
      baseRate: 0.65
    },

    // ロングソード
    {
      id: "long_T1",
      name: "ロングソードT1",
      cost: { woodPlank_T1: 2, ironIngot_T1: 2 },
      baseRate: 0.7
    },
    {
      id: "long_T2",
      name: "ロングソードT2",
      cost: { woodPlank_T2: 2, ironIngot_T2: 2 },
      baseRate: 0.65
    },
    {
      id: "long_T3",
      name: "ロングソードT3",
      cost: { woodPlank_T3: 2, ironIngot_T3: 2 },
      baseRate: 0.6
    },

    // グレートソード
    {
      id: "great_T1",
      name: "グレートソードT1",
      cost: { woodPlank_T1: 2, ironIngot_T1: 3 },
      baseRate: 0.65
    },
    {
      id: "great_T2",
      name: "グレートソードT2",
      cost: { woodPlank_T2: 2, ironIngot_T2: 3 },
      baseRate: 0.6
    },
    {
      id: "great_T3",
      name: "グレートソードT3",
      cost: { woodPlank_T3: 2, ironIngot_T3: 3 },
      baseRate: 0.55
    },

    // 魔法の杖
    {
      id: "magicStaff_T1",
      name: "魔法の杖T1",
      cost: { woodPlank_T1: 1, herb: 2 },
      baseRate: 0.7
    },
    {
      id: "magicStaff_T2",
      name: "魔法の杖T2",
      cost: { woodPlank_T2: 1, herb: 3 },
      baseRate: 0.65
    },
    {
      id: "magicStaff_T3",
      name: "魔法の杖T3",
      cost: { woodPlank_T3: 1, herb: 4 },
      baseRate: 0.6
    },

    // ルーンソード
    {
      id: "runeSword_T1",
      name: "ルーンソードT1",
      cost: { woodPlank_T1: 1, ironIngot_T1: 2, herb: 1 },
      baseRate: 0.65
    },
    {
      id: "runeSword_T2",
      name: "ルーンソードT2",
      cost: { woodPlank_T2: 1, ironIngot_T2: 2, herb: 2 },
      baseRate: 0.6
    },
    {
      id: "runeSword_T3",
      name: "ルーンソードT3",
      cost: { woodPlank_T3: 1, ironIngot_T3: 2, herb: 3 },
      baseRate: 0.55
    },

    // 大盾（武器枠）
    {
      id: "greatShield_T1",
      name: "大盾T1",
      cost: { woodPlank_T1: 2, ironIngot_T1: 1, toughLeather_T1: 1 },
      baseRate: 0.7
    },
    {
      id: "greatShield_T2",
      name: "大盾T2",
      cost: { woodPlank_T2: 2, ironIngot_T2: 1, toughLeather_T2: 1 },
      baseRate: 0.65
    },
    {
      id: "greatShield_T3",
      name: "大盾T3",
      cost: { woodPlank_T3: 2, ironIngot_T3: 1, toughLeather_T3: 1 },
      baseRate: 0.6
    }
  ],

  // ---- 防具 ----
  armor: [
    // レザーベスト
    {
      id: "leatherVest_T1",
      name: "レザーベストT1",
      cost: { clothBolt_T1: 1, toughLeather_T1: 1 },
      baseRate: 0.8
    },
    {
      id: "leatherVest_T2",
      name: "レザーベストT2",
      cost: { clothBolt_T2: 1, toughLeather_T2: 1 },
      baseRate: 0.75
    },
    {
      id: "leatherVest_T3",
      name: "レザーベストT3",
      cost: { clothBolt_T3: 1, toughLeather_T3: 1 },
      baseRate: 0.7
    },

    // チェインメイル
    {
      id: "chainmail_T1",
      name: "チェインメイルT1",
      cost: { ironIngot_T1: 2, toughLeather_T1: 1 },
      baseRate: 0.75
    },
    {
      id: "chainmail_T2",
      name: "チェインメイルT2",
      cost: { ironIngot_T2: 2, toughLeather_T2: 1 },
      baseRate: 0.7
    },
    {
      id: "chainmail_T3",
      name: "チェインメイルT3",
      cost: { ironIngot_T3: 2, toughLeather_T3: 1 },
      baseRate: 0.65
    },

    // 鉄の鎧
    {
      id: "ironArmor_T1",
      name: "鉄の鎧T1",
      cost: { ironIngot_T1: 3, clothBolt_T1: 1, toughLeather_T1: 1 },
      baseRate: 0.7
    },
    {
      id: "ironArmor_T2",
      name: "鉄の鎧T2",
      cost: { ironIngot_T2: 3, clothBolt_T2: 1, toughLeather_T2: 1 },
      baseRate: 0.65
    },
    {
      id: "ironArmor_T3",
      name: "鉄の鎧T3",
      cost: { ironIngot_T3: 3, clothBolt_T3: 1, toughLeather_T3: 1 },
      baseRate: 0.6
    }
  ],

  // ---- ポーション ----
  //
  // HPポーション：T1～T3
  // マナポーション：T1～T3
  // エリクサー：T3系を使った高級品
  potion: [
    // HPポーション（草と水はティア固定）
    {
      id: "potionT1",
      name: "ポーションT1",
      cost: { herb_T1: 2, water_T1: 1 },
      baseRate: 0.8
    },
    {
      id: "potionT2",
      name: "ポーションT2",
      cost: { herb_T2: 3, water_T2: 2 },
      baseRate: 0.7
    },
    {
      id: "potionT3",
      name: "ポーションT3",
      cost: { herb_T3: 4, water_T3: 3 },
      baseRate: 0.6
    },

    // マナポーション
    {
      id: "manaT1",
      name: "マナポーションT1",
      cost: { herb_T1: 2, water_T1: 2 },
      baseRate: 0.8
    },
    {
      id: "manaT2",
      name: "マナポーションT2",
      cost: { herb_T2: 3, water_T2: 3 },
      baseRate: 0.7
    },
    {
      id: "manaT3",
      name: "マナポーションT3",
      cost: { herb_T3: 4, water_T3: 4 },
      baseRate: 0.6
    },

    // エリクサー（T3用）
    {
      id: "elixirT3",
      name: "エリクサー",
      cost: { herb_T3: 5, water_T3: 5, ore_T3: 2 },
      baseRate: 0.5
    }
  ],

  // ---- 道具（爆弾T1～T3など）----
  tool: [
    {
      id: "bomb_T1",
      name: "爆弾T1",
      cost: { ore_T1: 3, herb_T1: 1 },
      baseRate: 0.7
    },
    {
      id: "bomb_T2",
      name: "爆弾T2",
      cost: { ore_T2: 4, herb_T2: 2 },
      baseRate: 0.65
    },
    {
      id: "bomb_T3",
      name: "爆弾T3",
      cost: { ore_T3: 5, herb_T3: 3 },
      baseRate: 0.6
    }
  ]
};

// =======================
// 成功率ボーナス
// =======================

function calcCraftSuccessRate(baseRate, skillLv) {
  const bonus = 0.15 * (skillLv / 100);  // Lv100で+0.15 → +15%
  let rate = baseRate + bonus;
  if (rate > 0.90) rate = 0.90;
  return rate;
}

// =======================
// 品質ロジック
// =======================

function rollQualityBySkillLv(skillLv) {
  const goodRate = 0.005 * skillLv; // 0〜0.50
  const exRate   = 0.002 * skillLv; // 0〜0.20

  const r = Math.random();
  if (r < exRate) {
    return 2;              // 傑作
  } else if (r < exRate + goodRate) {
    return 1;              // 良品
  }
  return 0;                // 普通
}