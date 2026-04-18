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