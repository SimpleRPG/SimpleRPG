// =============== 料理データ定義 ===============
// cook-data.js
const COOKING_RECIPES = {
  food: [
    // ---- T1 ----
    {
      id: 'food_meat_basic',
      name: '香草焼き獣肉',
      tier: 'T1',
      requires: [
        { type: 'meat',  amount: 1 },
        { type: 'herb',  amount: 1 },
        { type: 'spice', amount: 1 }
      ],
      effect: {
        kind: 'food',
        hpRegen: 5,
        atkUp: 2,
        duration: 60
      }
    },
    {
      id: 'food_veg_stew',
      name: '具だくさん野菜スープ',
      tier: 'T1',
      requires: [
        { type: 'vegetable', amount: 2 },
        { type: 'grain',     amount: 1 },
        { type: 'spice',     amount: 1 }
      ],
      effect: {
        kind: 'food',
        defUp: 2,
        resistUp: 2,
        duration: 60
      }
    },

    // ---- T2 ダミー ----
    {
      id: 'food_meat_t2',
      name: 'ジューシー獣肉ステーキ',
      tier: 'T2',
      requires: [
        { type: 'meat',  amount: 2 },
        { type: 'herb',  amount: 2 },
        { type: 'spice', amount: 2 }
      ],
      effect: {
        kind: 'food',
        hpRegen: 10,
        atkUp: 4,
        duration: 90
      }
    },
    {
      id: 'food_veg_t2',
      name: '濃厚ベジシチュー',
      tier: 'T2',
      requires: [
        { type: 'vegetable', amount: 3 },
        { type: 'grain',     amount: 2 },
        { type: 'spice',     amount: 2 }
      ],
      effect: {
        kind: 'food',
        defUp: 4,
        resistUp: 4,
        duration: 90
      }
    },

    // ---- T3 ダミー ----
    {
      id: 'food_meat_t3',
      name: '王侯のロースト肉',
      tier: 'T3',
      requires: [
        { type: 'meat',  amount: 3 },
        { type: 'herb',  amount: 3 },
        { type: 'spice', amount: 3 }
      ],
      effect: {
        kind: 'food',
        hpRegen: 20,
        atkUp: 8,
        duration: 120
      }
    },
    {
      id: 'food_veg_t3',
      name: '精霊の野菜ポタージュ',
      tier: 'T3',
      requires: [
        { type: 'vegetable', amount: 4 },
        { type: 'grain',     amount: 3 },
        { type: 'spice',     amount: 3 }
      ],
      effect: {
        kind: 'food',
        defUp: 8,
        resistUp: 8,
        duration: 120
      }
    }
  ],

  drink: [
    // ---- T1 ----
    {
      id: 'drink_herb_tea',
      name: 'ハーブティー',
      tier: 'T1',
      requires: [
        { type: 'water', amount: 1 },
        { type: 'herb',  amount: 1 }
      ],
      effect: {
        kind: 'drink',
        mpRegen: 5,
        spRegen: 5,
        duration: 60
      }
    },
    {
      id: 'drink_energy',
      name: '活力ジュース',
      tier: 'T1',
      requires: [
        { type: 'water',     amount: 1 },
        { type: 'vegetable', amount: 1 },
        { type: 'grain',     amount: 1 }
      ],
      effect: {
        kind: 'drink',
        spMaxUp: 5,
        moveSpeedUp: 5,
        duration: 60
      }
    },

    // ---- T2 ダミー ----
    {
      id: 'drink_herb_tea_t2',
      name: '濃縮ハーブティー',
      tier: 'T2',
      requires: [
        { type: 'water', amount: 2 },
        { type: 'herb',  amount: 2 }
      ],
      effect: {
        kind: 'drink',
        mpRegen: 10,
        spRegen: 10,
        duration: 90
      }
    },
    {
      id: 'drink_energy_t2',
      name: '活力ジュースDX',
      tier: 'T2',
      requires: [
        { type: 'water',     amount: 2 },
        { type: 'vegetable', amount: 2 },
        { type: 'grain',     amount: 2 }
      ],
      effect: {
        kind: 'drink',
        spMaxUp: 10,
        moveSpeedUp: 10,
        duration: 90
      }
    },

    // ---- T3 ダミー ----
    {
      id: 'drink_herb_tea_t3',
      name: '祝福のハーブティー',
      tier: 'T3',
      requires: [
        { type: 'water', amount: 3 },
        { type: 'herb',  amount: 3 }
      ],
      effect: {
        kind: 'drink',
        mpRegen: 20,
        spRegen: 20,
        duration: 120
      }
    },
    {
      id: 'drink_energy_t3',
      name: '超活力ジュース',
      tier: 'T3',
      requires: [
        { type: 'water',     amount: 3 },
        { type: 'vegetable', amount: 3 },
        { type: 'grain',     amount: 3 }
      ],
      effect: {
        kind: 'drink',
        spMaxUp: 15,
        moveSpeedUp: 15,
        duration: 120
      }
    }
  ]
};