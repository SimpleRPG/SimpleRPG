// =============== 料理データ定義 ===============
// cook-data.js

// 個別素材IDごとの属性（カテゴリ）は、必要なら別テーブルで管理してOK
// ここでは「レシピ側は id 固定」、消費・表示も id ベースで行う前提。

// 先頭あたりに
window.cookingMats = window.cookingMats || {};

// COOKING_RECIPES をグローバル(window)に置く。
// 既にどこかで定義されていれば上書きしない。
window.COOKING_RECIPES = window.COOKING_RECIPES || {
  food: [
    // ---- T1 ----
    // T1: 2枠（メイン＋サブ1）に統一
    {
      id: 'food_meat_basic_T1',
      name: '胡椒焼き獣肉',
      tier: 'T1',
      requires: [
        { id: 'meat_soft',    amount: 1 }, // メイン：やわらかい肉
        { id: 'spice_pepper', amount: 1 }  // サブ：胡椒
      ],
      effect: {
        kind: 'food',
        hpRegen: 5,
        atkUp: 2,
        duration: 60,
        statusId: 'food_meat_atk_T1',
        durationTurns: 30,
        hungerRecover: 10,
        thirstRecover: 0
      }
    },
    {
      id: 'food_veg_stew_T1',
      name: '具だくさん野菜スープ',
      tier: 'T1',
      requires: [
        { id: 'veg_root_rough', amount: 1 }, // メイン：根菜
        { id: 'grain_mochi',    amount: 1 }  // サブ：もちもち穀物
      ],
      effect: {
        kind: 'food',
        defUp: 2,
        resistUp: 2,
        duration: 60,
        statusId: 'food_veg_def_T1',
        durationTurns: 30,
        hungerRecover: 7,
        thirstRecover: 7
      }
    },
    {
      id: 'food_fish_soup_T1',
      name: '岩塩魚のスープ',
      tier: 'T1',
      requires: [
        { id: 'fish_river',      amount: 1 }, // メイン：川魚
        { id: 'spice_salt_rock', amount: 1 }  // サブ：岩塩
      ],
      effect: {
        kind: 'food',
        intUp: 2,
        mpRegen: 3,
        duration: 60,
        statusId: 'food_fish_int_T1',
        durationTurns: 30,
        hungerRecover: 8,
        thirstRecover: 4
      }
    },

    // ---- T2 ----
    // T2: 4枠に統一（肉・魚・野菜それぞれ別の構成にできるだけバラし）
    {
      id: 'food_meat_basic_T2',
      name: '胡椒焼き獣肉',
      tier: 'T2',
      requires: [
        { id: 'meat_soft',      amount: 1 }, // T1からの継続
        { id: 'meat_premium',   amount: 1 }, // 高級肉
        { id: 'veg_leaf_crisp', amount: 1 }, // 付け合わせ野菜
        { id: 'spice_pepper',   amount: 1 }  // 胡椒
      ],
      effect: {
        kind: 'food',
        hpRegen: 10,
        atkUp: 4,
        duration: 90,
        statusId: 'food_meat_atk_T2',
        durationTurns: 45,
        hungerRecover: 15,
        thirstRecover: 0
      }
    },
    {
      id: 'food_veg_stew_T2',
      name: '具だくさん野菜スープ',
      tier: 'T2',
      requires: [
        { id: 'veg_root_rough',    amount: 1 }, // 根菜
        { id: 'veg_mushroom_aroma',amount: 1 }, // キノコ
        { id: 'veg_premium',       amount: 1 }, // 高級野菜
        { id: 'grain_refined',     amount: 1 }  // 精製穀物
      ],
      effect: {
        kind: 'food',
        defUp: 4,
        resistUp: 4,
        duration: 90,
        statusId: 'food_veg_def_T2',
        durationTurns: 45,
        hungerRecover: 10,
        thirstRecover: 10
      }
    },
    {
      id: 'food_fish_soup_T2',
      name: '岩塩魚のスープ',
      tier: 'T2',
      requires: [
        { id: 'fish_river',      amount: 1 }, // 川魚
        { id: 'fish_sea',        amount: 1 }, // 海魚
        { id: 'spice_salt_rock', amount: 1 }, // 岩塩
        { id: 'veg_leaf_crisp',  amount: 1 }  // 葉物
      ],
      effect: {
        kind: 'food',
        intUp: 4,
        mpRegen: 5,
        duration: 90,
        statusId: 'food_fish_int_T2',
        durationTurns: 45,
        hungerRecover: 11,
        thirstRecover: 7
      }
    },

    // 既存のT2肉料理（別メニュー扱い）
    {
      id: 'food_meat_t2',
      name: 'ジューシー獣肉ステーキ',
      tier: 'T2',
      requires: [
        { id: 'meat_premium',   amount: 1 }, // 高級肉
        { id: 'meat_fatty',     amount: 1 }, // 脂身肉
        { id: 'veg_root_rough', amount: 1 }, // 付け合わせ根菜
        { id: 'spice_premium',  amount: 1 }  // 高級スパイス
      ],
      effect: {
        kind: 'food',
        hpRegen: 10,
        atkUp: 5,
        duration: 90,
        statusId: 'food_meat_atk_steak_T2',
        durationTurns: 45,
        hungerRecover: 16,
        thirstRecover: 0
      }
    },
    // 既存のT2野菜料理（別メニュー扱い）
    {
      id: 'food_veg_t2',
      name: '濃厚ベジシチュー',
      tier: 'T2',
      requires: [
        { id: 'veg_leaf_crisp',    amount: 1 }, // 葉物
        { id: 'veg_mushroom_aroma',amount: 1 }, // キノコ
        { id: 'veg_premium',       amount: 1 }, // 高級野菜
        { id: 'grain_refined',     amount: 1 }  // 精製穀物
      ],
      effect: {
        kind: 'food',
        defUp: 5,
        resistUp: 5,
        duration: 90,
        statusId: 'food_veg_def_stew_T2',
        durationTurns: 45,
        hungerRecover: 9,
        thirstRecover: 9
      }
    },

    // ---- T3 ----
    // T3: 6枠に統一。各メニューでできるだけ違う高級素材・スパイスを使わせる
    {
      id: 'food_meat_basic_T3',
      name: '胡椒焼き獣肉',
      tier: 'T3',
      requires: [
        { id: 'meat_magic',      amount: 1 }, // 不思議な肉
        { id: 'meat_premium',    amount: 1 }, // 高級肉
        { id: 'veg_leaf_crisp',  amount: 1 }, // 葉物
        { id: 'spice_pepper',    amount: 1 }, // 胡椒
        { id: 'grain_ancient',   amount: 1 }, // 古代穀物
        { id: 'spice_secret',    amount: 1 }  // 秘伝スパイス
      ],
      effect: {
        kind: 'food',
        hpRegen: 20,
        atkUp: 6,
        duration: 120,
        statusId: 'food_meat_atk_T3',
        durationTurns: 60,
        hungerRecover: 20,
        thirstRecover: 0
      }
    },
    {
      id: 'food_veg_stew_T3',
      name: '具だくさん野菜スープ',
      tier: 'T3',
      requires: [
        { id: 'veg_root_rough',    amount: 1 }, // 根菜
        { id: 'veg_leaf_crisp',    amount: 1 }, // 葉物
        { id: 'veg_mushroom_aroma',amount: 1 }, // キノコ
        { id: 'veg_premium',       amount: 1 }, // 高級野菜
        { id: 'grain_ancient',     amount: 1 }, // 古代穀物
        { id: 'spice_premium',     amount: 1 }  // 高級スパイス
      ],
      effect: {
        kind: 'food',
        defUp: 6,
        resistUp: 6,
        duration: 120,
        statusId: 'food_veg_def_T3',
        durationTurns: 60,
        hungerRecover: 13,
        thirstRecover: 13
      }
    },
    {
      id: 'food_fish_soup_T3',
      name: '岩塩魚の香味スープ',
      tier: 'T3',
      requires: [
        { id: 'fish_sea',        amount: 1 }, // 海魚
        { id: 'fish_deep',       amount: 1 }, // 深海魚
        { id: 'spice_salt_rock', amount: 1 }, // 岩塩
        { id: 'veg_mountain',    amount: 1 }, // 山菜
        { id: 'grain_ancient',   amount: 1 }, // 古代穀物
        { id: 'spice_secret',    amount: 1 }  // 秘伝スパイス
      ],
      effect: {
        kind: 'food',
        intUp: 6,
        mpRegen: 8,
        duration: 120,
        statusId: 'food_fish_int_T3',
        durationTurns: 60,
        hungerRecover: 14,
        thirstRecover: 10
      }
    },
    // ★伝説魚T3料理（追加）
    {
      id: 'food_fish_legend_T3',
      name: '伝説魚の豪華フルコース',
      tier: 'T3',
      requires: [
        { id: 'fish_legend',   amount: 1 }, // 新レア魚
        { id: 'fish_sea',      amount: 1 }, // 既存海魚
        { id: 'spice_secret',  amount: 1 },
        { id: 'veg_mountain',  amount: 1 },
        { id: 'grain_ancient', amount: 1 }
      ],
      effect: {
        kind: 'food',
        atkUp: 8,
        defUp: 8,
        intUp: 8,
        mpRegen: 10,
        duration: 120,
        statusId: 'food_fish_legend_T3',
        durationTurns: 60,
        hungerRecover: 25,
        thirstRecover: 10
      }
    },

    {
      id: 'food_meat_t3_steak',
      name: '特選獣肉ステーキ',
      tier: 'T3',
      requires: [
        { id: 'meat_magic',      amount: 1 }, // 不思議な肉
        { id: 'meat_premium',    amount: 1 }, // 高級肉
        { id: 'meat_fatty',      amount: 1 }, // 脂身肉
        { id: 'veg_root_rough',  amount: 1 }, // 付け合わせ根菜
        { id: 'veg_herb_aroma',  amount: 1 }, // 香草バター的なイメージ
        { id: 'spice_secret',    amount: 1 }  // 秘伝ソース
      ],
      effect: {
        kind: 'food',
        hpRegen: 25,
        atkUp: 8,
        duration: 120,
        statusId: 'food_meat_atk_steak_T3',
        durationTurns: 60,
        hungerRecover: 22,
        thirstRecover: 0
      }
    },
    {
      id: 'food_veg_t3_stew',
      name: '至高のベジシチュー',
      tier: 'T3',
      requires: [
        { id: 'veg_mountain',     amount: 1 }, // 山菜
        { id: 'veg_premium',      amount: 1 }, // 高級野菜
        { id: 'veg_mushroom_aroma',amount: 1 }, // キノコ
        { id: 'grain_ancient',    amount: 1 }, // 古代穀物
        { id: 'spice_premium',    amount: 1 }, // 高級スパイス
        { id: 'veg_leaf_crisp',   amount: 1 }  // 追加の葉物
      ],
      effect: {
        kind: 'food',
        defUp: 8,
        resistUp: 8,
        duration: 120,
        statusId: 'food_veg_def_stew_T3',
        durationTurns: 60,
        hungerRecover: 12,
        thirstRecover: 12
      }
    },

    {
      id: 'food_meat_t3',
      name: '王侯のロースト肉',
      tier: 'T3',
      requires: [
        { id: 'meat_magic',      amount: 1 }, // 不思議な肉
        { id: 'meat_premium',    amount: 1 }, // 高級肉
        { id: 'veg_herb_aroma',  amount: 1 }, // 香草
        { id: 'veg_mountain',    amount: 1 }, // 山菜
        { id: 'grain_ancient',   amount: 1 }, // 古代穀物
        { id: 'spice_secret',    amount: 1 }  // 秘伝スパイス
      ],
      effect: {
        kind: 'food',
        hpRegen: 20,
        atkUp: 8,
        duration: 120,
        statusId: 'food_meat_atk_roast_T3',
        durationTurns: 60,
        hungerRecover: 21,
        thirstRecover: 0
      }
    },
    {
      id: 'food_veg_t3',
      name: '精霊の野菜ポタージュ',
      tier: 'T3',
      requires: [
        { id: 'veg_mountain',     amount: 1 }, // 山菜
        { id: 'veg_premium',      amount: 1 }, // 高級野菜
        { id: 'veg_leaf_crisp',   amount: 1 }, // 葉物
        { id: 'grain_ancient',    amount: 1 }, // 古代穀物
        { id: 'spice_premium',    amount: 1 }, // 高級スパイス
        { id: 'veg_mushroom_aroma',amount: 1 } // キノコ
      ],
      effect: {
        kind: 'food',
        defUp: 8,
        resistUp: 8,
        duration: 120,
        statusId: 'food_veg_def_potage_T3',
        durationTurns: 60,
        hungerRecover: 11,
        thirstRecover: 11
      }
    }
  ],

  drink: [
    // ---- T1 ----
    // T1ドリンクも2枠に揃える
    {
      id: 'drink_herb_tea',
      name: 'ハーブティー',
      tier: 'T1',
      requires: [
        { id: 'veg_herb_aroma', amount: 2 } // 香草×2（岩塩なし）
      ],
      effect: {
        kind: 'drink',
        mpRegen: 5,
        spRegen: 5,
        duration: 60,
        statusId: 'drink_mp_regen_T1',
        durationTurns: 30,
        hungerRecover: 0,
        thirstRecover: 10
      }
    },
    {
      id: 'drink_energy',
      name: '活力ジュース',
      tier: 'T1',
      requires: [
        { id: 'veg_leaf_crisp', amount: 1 }, // 葉物
        { id: 'grain_coarse',   amount: 1 }  // 粗挽き穀物
      ],
      effect: {
        kind: 'drink',
        spMaxUp: 5,
        moveSpeedUp: 5,
        duration: 60,
        statusId: 'drink_sp_buff_T1',
        durationTurns: 30,
        hungerRecover: 0,
        thirstRecover: 10
      }
    },

    // ---- T2 ----
    // T2ドリンクは4枠
    {
      id: 'drink_herb_tea_t2',
      name: '濃縮ハーブティー',
      tier: 'T2',
      requires: [
        { id: 'veg_herb_aroma', amount: 2 }, // 香草多め
        { id: 'spice_premium',  amount: 1 }, // 高級スパイス
        { id: 'grain_refined',  amount: 1 }  // 精製穀物（とろみ付け）
      ],
      effect: {
        kind: 'drink',
        mpRegen: 10,
        spRegen: 10,
        duration: 90,
        statusId: 'drink_mp_regen_T2',
        durationTurns: 45,
        hungerRecover: 0,
        thirstRecover: 15
      }
    },
    {
      id: 'drink_energy_t2',
      name: '活力ジュースDX',
      tier: 'T2',
      requires: [
        { id: 'veg_leaf_crisp', amount: 1 }, // 葉物
        { id: 'veg_root_rough', amount: 1 }, // 根菜
        { id: 'grain_refined',  amount: 1 }, // 精製穀物
        { id: 'spice_pepper',   amount: 1 }  // 胡椒
      ],
      effect: {
        kind: 'drink',
        spMaxUp: 10,
        moveSpeedUp: 10,
        duration: 90,
        statusId: 'drink_sp_buff_T2',
        durationTurns: 45,
        hungerRecover: 0,
        thirstRecover: 15
      }
    },

    // ---- T3 ----
    // T3ドリンクは6枠
    {
      id: 'drink_herb_tea_t3',
      name: '祝福のハーブティー',
      tier: 'T3',
      requires: [
        { id: 'veg_herb_aroma', amount: 2 }, // 香草
        { id: 'veg_mountain',   amount: 1 }, // 山の薬草
        { id: 'grain_ancient',  amount: 1 }, // 古代穀物
        { id: 'spice_secret',   amount: 1 }, // 秘伝スパイス
        { id: 'veg_leaf_crisp', amount: 1 }, // 葉物
        { id: 'veg_root_rough', amount: 1 }  // 根菜
      ],
      effect: {
        kind: 'drink',
        mpRegen: 20,
        spRegen: 20,
        duration: 120,
        statusId: 'drink_mp_regen_T3',
        durationTurns: 60,
        hungerRecover: 0,
        thirstRecover: 20
      }
    },
    {
      id: 'drink_energy_t3',
      name: '超活力ジュース',
      tier: 'T3',
      requires: [
        { id: 'veg_premium',       amount: 1 }, // 高級野菜
        { id: 'veg_leaf_crisp',    amount: 1 }, // 葉物
        { id: 'veg_root_rough',    amount: 1 }, // 根菜
        { id: 'grain_ancient',     amount: 1 }, // 古代穀物
        { id: 'spice_premium',     amount: 1 }, // 高級スパイス
        { id: 'veg_mushroom_aroma',amount: 1 }  // キノコ
      ],
      effect: {
        kind: 'drink',
        spMaxUp: 15,
        moveSpeedUp: 15,
        duration: 120,
        statusId: 'drink_sp_buff_T3',
        durationTurns: 60,
        hungerRecover: 0,
        thirstRecover: 20
      }
    }
  ]
};

// ========================================
// ITEM_META への登録（完成料理アイテム＋料理素材）
// ========================================

(function registerCookingToItemMeta() {
  if (typeof registerItemDefs !== "function") return;

  const defs = {};

  // ---- 完成料理（食べ物） ----
  (window.COOKING_RECIPES.food || []).forEach(r => {
    const eff = r.effect || {};
    defs[r.id] = {
      id: r.id,
      name: r.name,
      category: "food",
      craftCategory: "food",
      storageKind: "inventory",
      storageTab: "cooking",
      tier: r.tier || null,
      tags: ["cooking", "food"],

      // 固定値: 料理効果もメタにコピーしておく
      foodEffectKind: eff.kind || "food",
      foodHpRegen: eff.hpRegen || 0,
      foodMpRegen: eff.mpRegen || 0,
      foodSpRegen: eff.spRegen || 0,
      foodAtkUp: eff.atkUp || 0,
      foodDefUp: eff.defUp || 0,
      foodIntUp: eff.intUp || 0,
      foodResistUp: eff.resistUp || 0,
      foodDurationSec: eff.duration || 0,
      foodStatusId: eff.statusId || null,
      foodStatusTurns: eff.durationTurns || 0,
      foodHungerRecover: eff.hungerRecover || 0,
      foodThirstRecover: eff.thirstRecover || 0
    };
  });

  // ---- 完成料理（飲み物） ----
  (window.COOKING_RECIPES.drink || []).forEach(r => {
    const eff = r.effect || {};
    defs[r.id] = {
      id: r.id,
      name: r.name,
      category: "drink",
      craftCategory: "drink",
      storageKind: "inventory",
      storageTab: "cooking",
      tier: r.tier || null,
      tags: ["cooking", "drink"],

      // 固定値: ドリンク効果もメタにコピー
      drinkEffectKind: eff.kind || "drink",
      drinkHpRegen: eff.hpRegen || 0,
      drinkMpRegen: eff.mpRegen || 0,
      drinkSpRegen: eff.spRegen || 0,
      drinkSpMaxUp: eff.spMaxUp || 0,
      drinkMoveSpeedUp: eff.moveSpeedUp || 0,
      drinkDurationSec: eff.duration || 0,
      drinkStatusId: eff.statusId || null,
      drinkStatusTurns: eff.durationTurns || 0,
      drinkHungerRecover: eff.hungerRecover || 0,
      drinkThirstRecover: eff.thirstRecover || 0
    };
  });

  // ---- 料理素材（cookingMats 用アイテム） ----
  const cookingMatDefs = {
    // 肉
    meat_hard:    { id: "meat_hard",    name: "固い肉" },
    meat_soft:    { id: "meat_soft",    name: "やわらかい肉" },
    meat_fatty:   { id: "meat_fatty",   name: "脂身の多い肉" },
    meat_premium: { id: "meat_premium", name: "高級肉" },
    meat_magic:   { id: "meat_magic",   name: "不思議な肉" },

    // 魚（釣りメタ付き）
    fish_small: {
      id: "fish_small",
      name: "小魚",
      fishRarity: "common",
      fishSizeMin: 5,
      fishSizeMax: 15,
      fishValue: 1,
      tags: ["cooking", "material", "fish"]
    },
    fish_river: {
      id: "fish_river",
      name: "川魚",
      fishRarity: "common",
      fishSizeMin: 10,
      fishSizeMax: 30,
      fishValue: 2,
      tags: ["cooking", "material", "fish"]
    },
    fish_sea: {
      id: "fish_sea",
      name: "海魚",
      fishRarity: "uncommon",
      fishSizeMin: 15,
      fishSizeMax: 50,
      fishValue: 3,
      tags: ["cooking", "material", "fish"]
    },
    fish_big: {
      id: "fish_big",
      name: "大きな魚",
      fishRarity: "rare",
      fishSizeMin: 40,
      fishSizeMax: 80,
      fishValue: 5,
      tags: ["cooking", "material", "fish"]
    },
    fish_deep: {
      id: "fish_deep",
      name: "深海魚",
      fishRarity: "rare",
      fishSizeMin: 30,
      fishSizeMax: 70,
      fishValue: 5,
      tags: ["cooking", "material", "fish"]
    },
    fish_legend: {
      id: "fish_legend",
      name: "伝説の魚",
      fishRarity: "legend",
      fishSizeMin: 80,
      fishSizeMax: 150,
      fishValue: 10,
      tags: ["cooking", "material", "fish", "legendFish"]
    },

    // 畑向け: field
    veg_root_rough: { id: "veg_root_rough", name: "ゴロゴロ根菜",   farmGrowable: true, farmCategory: "field" },
    veg_leaf_crisp: { id: "veg_leaf_crisp", name: "シャキシャキ葉菜", farmGrowable: true, farmCategory: "field" },
    veg_premium:    { id: "veg_premium",    name: "高級野菜",       farmGrowable: true, farmCategory: "field" },
    grain_ancient:  { id: "grain_ancient",  name: "古代穀物",       farmGrowable: true, farmCategory: "field" },
    grain_coarse:   { id: "grain_coarse",   name: "粗挽き穀物",     farmGrowable: true, farmCategory: "field" },
    grain_refined:  { id: "grain_refined",  name: "精製穀物",       farmGrowable: true, farmCategory: "field" },
    grain_mochi:    { id: "grain_mochi",    name: "もちもち穀物",   farmGrowable: true, farmCategory: "field" },

    // 菜園向け: garden
    veg_mushroom_aroma: { id: "veg_mushroom_aroma", name: "香るキノコ",   farmGrowable: true, farmCategory: "garden" },
    veg_spice:          { id: "veg_spice",          name: "香辛料",       farmGrowable: true, farmCategory: "garden" },
    veg_herb_aroma:     { id: "veg_herb_aroma",     name: "香草",         farmGrowable: true, farmCategory: "garden" },
    veg_mountain:       { id: "veg_mountain",       name: "山菜",         farmGrowable: true, farmCategory: "garden" },
    veg_dried:          { id: "veg_dried",          name: "乾物",         farmGrowable: true, farmCategory: "garden" },
    spice_salt_rock:    { id: "spice_salt_rock",    name: "岩塩",         farmGrowable: true, farmCategory: "garden" },
    spice_pepper:       { id: "spice_pepper",       name: "胡椒",         farmGrowable: true, farmCategory: "garden" },
    spice_premium:      { id: "spice_premium",      name: "高級スパイス", farmGrowable: true, farmCategory: "garden" },
    spice_secret:       { id: "spice_secret",       name: "秘伝スパイス", farmGrowable: true, farmCategory: "garden" }
  };

  Object.keys(cookingMatDefs).forEach(id => {
    const base = cookingMatDefs[id];
    defs[id] = {
      id: base.id,
      name: base.name,
      category: "cookingMat",
      craftCategory: "material",
      storageKind: "cooking",     // 実ストレージ: cookingMats
      storageTab: "cookingMat",   // 倉庫UI: 料理素材タブ
      tags: base.tags || ["cooking", "material"],

      // 畑用メタ（あるものだけ）
      farmGrowable: !!base.farmGrowable,
      farmCategory: base.farmCategory || null,

      // 釣り用メタ（魚だけに有効）
      fishRarity: base.fishRarity || null,
      fishSizeMin: typeof base.fishSizeMin === "number" ? base.fishSizeMin : null,
      fishSizeMax: typeof base.fishSizeMax === "number" ? base.fishSizeMax : null,
      fishValue: typeof base.fishValue === "number" ? base.fishValue : null
    };
  });

  registerItemDefs(defs);
})();