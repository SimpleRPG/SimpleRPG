// =============== 料理データ定義 ===============
// cook-data.js

// 個別素材IDごとの属性（カテゴリ）は、必要なら別テーブルで管理してOK
// ここでは「レシピ側は id 固定」、消費・表示も id ベースで行う前提。

// 先頭あたりに
window.cookingMats = window.cookingMats || {};

// ========================================
// COOKING_RECIPES 定義（テンプレ＋T10拡張）
// ========================================

(function initCookingRecipes() {
  // すでにどこかで定義済みなら何もしない（元仕様維持）
  if (window.COOKING_RECIPES) return;

  // --- ティア共通のステータススケール ---
  function buildTierNumber(tierLabel) {
    return Number(String(tierLabel).replace(/^T/, "")) || 1;
  }

  // 共通: 種類数をティアから求める（最大10種類）
  function calcKindsFromTier(tierNumber) {
    const kinds = 2 + 2 * (tierNumber - 1); // T1:2, T2:4, T3:6 ...
    return Math.min(kinds, 10);
  }

  // 重複しないIDを先頭から n 個取るユーティリティ
  function pickFirstNUnique(ids, n) {
    const result = [];
    const seen = new Set();
    for (const id of ids) {
      if (!seen.has(id)) {
        seen.add(id);
        result.push(id);
        if (result.length >= n) break;
      }
    }
    return result;
  }

  // T1〜T3 は元の構成を優先して再現し、それ以降は候補から増やす方針。[web:196]

  // ---- 食べ物テンプレ ----
  const FOOD_TEMPLATES = [
    // 基本肉料理: T1〜T10
    {
      baseId: "food_meat_basic",
      name: "胡椒焼き獣肉",
      kind: "food",
      tierStart: 1,
      tierEnd: 10,
      buildEffect(tierLabel) {
        const t = buildTierNumber(tierLabel);
        if (t === 1) {
          return {
            kind: "food",
            hpRegen: 5,
            atkUp: 2,
            duration: 60,
            statusId: "food_meat_atk_T1",
            durationTurns: 30,
            hungerRecover: 10,
            thirstRecover: 0
          };
        }
        if (t === 2) {
          return {
            kind: "food",
            hpRegen: 10,
            atkUp: 4,
            duration: 90,
            statusId: "food_meat_atk_T2",
            durationTurns: 45,
            hungerRecover: 15,
            thirstRecover: 0
          };
        }
        if (t === 3) {
          return {
            kind: "food",
            hpRegen: 20,
            atkUp: 6,
            duration: 120,
            statusId: "food_meat_atk_T3",
            durationTurns: 60,
            hungerRecover: 20,
            thirstRecover: 0
          };
        }
        // T4以降はT3基準で少しずつ伸ばす
        const extra = t - 3;
        return {
          kind: "food",
          hpRegen: 20 + 3 * extra,
          atkUp: 6 + 1 * extra,
          duration: 120 + 10 * extra,
          statusId: `food_meat_atk_T${t}`,
          durationTurns: 60 + 5 * extra,
          hungerRecover: 20 + 2 * extra,
          thirstRecover: 0
        };
      },
      buildRequires(tierLabel) {
        const t = buildTierNumber(tierLabel);
        const kinds = calcKindsFromTier(t);

        if (t === 1) {
          // 元のT1: meat_soft + spice_pepper
          const base = ["meat_soft", "spice_pepper"];
          const picked = pickFirstNUnique(
            [
              ...base,
              "meat_premium",
              "veg_leaf_crisp",
              "grain_mochi",
              "grain_refined",
              "grain_ancient",
              "meat_magic",
              "meat_fatty",
              "spice_premium",
              "spice_secret",
              "veg_herb_aroma"
            ],
            kinds
          );
          return picked.map(id => ({ id, amount: 1 }));
        }

        if (t === 2) {
          // 元のT2: meat_soft, meat_premium, veg_leaf_crisp, spice_pepper
          const base = [
            "meat_soft",
            "meat_premium",
            "veg_leaf_crisp",
            "spice_pepper"
          ];
          const picked = pickFirstNUnique(
            [
              ...base,
              "grain_mochi",
              "grain_refined",
              "grain_ancient",
              "meat_magic",
              "meat_fatty",
              "spice_premium",
              "spice_secret",
              "veg_herb_aroma",
              "veg_root_rough"
            ],
            kinds
          );
          return picked.map(id => ({ id, amount: 1 }));
        }

        if (t === 3) {
          // 元のT3: meat_magic, meat_premium, veg_leaf_crisp, spice_pepper, grain_ancient, spice_secret
          const base = [
            "meat_magic",
            "meat_premium",
            "veg_leaf_crisp",
            "spice_pepper",
            "grain_ancient",
            "spice_secret"
          ];
          const picked = pickFirstNUnique(
            [
              ...base,
              "meat_soft",
              "meat_fatty",
              "grain_mochi",
              "grain_refined",
              "veg_root_rough",
              "veg_herb_aroma",
              "spice_premium"
            ],
            kinds
          );
          return picked.map(id => ({ id, amount: 1 }));
        }

        // T4以降: 肉系素材＋穀物＋野菜＋スパイスから増やす（最大10種類）
        const pool = [
          "meat_magic",
          "meat_premium",
          "meat_fatty",
          "meat_soft",
          "grain_ancient",
          "grain_refined",
          "grain_mochi",
          "veg_leaf_crisp",
          "veg_root_rough",
          "veg_herb_aroma",
          "spice_pepper",
          "spice_premium",
          "spice_secret"
        ];
        const picked = pickFirstNUnique(pool, kinds);
        return picked.map(id => ({ id, amount: 1 }));
      }
    },

    // 基本野菜スープ: T1〜T10
    {
      baseId: "food_veg_stew",
      name: "具だくさん野菜スープ",
      kind: "food",
      tierStart: 1,
      tierEnd: 10,
      buildEffect(tierLabel) {
        const t = buildTierNumber(tierLabel);
        if (t === 1) {
          return {
            kind: "food",
            defUp: 2,
            resistUp: 2,
            duration: 60,
            statusId: "food_veg_def_T1",
            durationTurns: 30,
            hungerRecover: 7,
            thirstRecover: 7
          };
        }
        if (t === 2) {
          return {
            kind: "food",
            defUp: 4,
            resistUp: 4,
            duration: 90,
            statusId: "food_veg_def_T2",
            durationTurns: 45,
            hungerRecover: 10,
            thirstRecover: 10
          };
        }
        if (t === 3) {
          return {
            kind: "food",
            defUp: 6,
            resistUp: 6,
            duration: 120,
            statusId: "food_veg_def_T3",
            durationTurns: 60,
            hungerRecover: 13,
            thirstRecover: 13
          };
        }
        const extra = t - 3;
        return {
          kind: "food",
          defUp: 6 + 1 * extra,
          resistUp: 6 + 1 * extra,
          duration: 120 + 10 * extra,
          statusId: `food_veg_def_T${t}`,
          durationTurns: 60 + 5 * extra,
          hungerRecover: 13 + 1 * extra,
          thirstRecover: 13 + 1 * extra
        };
      },
      buildRequires(tierLabel) {
        const t = buildTierNumber(tierLabel);
        const kinds = calcKindsFromTier(t);

        if (t === 1) {
          // 元のT1: veg_root_rough, grain_mochi
          const base = ["veg_root_rough", "grain_mochi"];
          const picked = pickFirstNUnique(
            [
              ...base,
              "veg_leaf_crisp",
              "veg_mushroom_aroma",
              "veg_premium",
              "grain_refined",
              "grain_ancient",
              "spice_premium",
              "veg_mountain",
              "veg_dried"
            ],
            kinds
          );
          return picked.map(id => ({ id, amount: 1 }));
        }

        if (t === 2) {
          // 元のT2: veg_root_rough, veg_mushroom_aroma, veg_premium, grain_refined
          const base = [
            "veg_root_rough",
            "veg_mushroom_aroma",
            "veg_premium",
            "grain_refined"
          ];
          const picked = pickFirstNUnique(
            [
              ...base,
              "veg_leaf_crisp",
              "grain_mochi",
              "grain_ancient",
              "spice_premium",
              "veg_mountain",
              "veg_dried"
            ],
            kinds
          );
          return picked.map(id => ({ id, amount: 1 }));
        }

        if (t === 3) {
          // 元のT3: veg_root_rough, veg_leaf_crisp, veg_mushroom_aroma, veg_premium, grain_ancient, spice_premium
          const base = [
            "veg_root_rough",
            "veg_leaf_crisp",
            "veg_mushroom_aroma",
            "veg_premium",
            "grain_ancient",
            "spice_premium"
          ];
          const picked = pickFirstNUnique(
            [
              ...base,
              "grain_mochi",
              "grain_refined",
              "veg_mountain",
              "veg_dried",
              "spice_secret",
              "spice_salt_rock"
            ],
            kinds
          );
          return picked.map(id => ({ id, amount: 1 }));
        }

        // T4以降: 野菜＋穀物＋スパイスの中から最大10種類
        const pool = [
          "veg_root_rough",
          "veg_leaf_crisp",
          "veg_mushroom_aroma",
          "veg_premium",
          "veg_mountain",
          "veg_dried",
          "grain_mochi",
          "grain_refined",
          "grain_ancient",
          "spice_premium",
          "spice_secret",
          "spice_salt_rock"
        ];
        const picked = pickFirstNUnique(pool, kinds);
        return picked.map(id => ({ id, amount: 1 }));
      }
    },

    // 基本魚スープ: T1〜T10
    {
      baseId: "food_fish_soup",
      name: "岩塩魚のスープ",
      kind: "food",
      tierStart: 1,
      tierEnd: 10,
      buildEffect(tierLabel) {
        const t = buildTierNumber(tierLabel);
        if (t === 1) {
          return {
            kind: "food",
            intUp: 2,
            mpRegen: 3,
            duration: 60,
            statusId: "food_fish_int_T1",
            durationTurns: 30,
            hungerRecover: 8,
            thirstRecover: 4
          };
        }
        if (t === 2) {
          return {
            kind: "food",
            intUp: 4,
            mpRegen: 5,
            duration: 90,
            statusId: "food_fish_int_T2",
            durationTurns: 45,
            hungerRecover: 11,
            thirstRecover: 7
          };
        }
        if (t === 3) {
          return {
            kind: "food",
            intUp: 6,
            mpRegen: 8,
            duration: 120,
            statusId: "food_fish_int_T3",
            durationTurns: 60,
            hungerRecover: 14,
            thirstRecover: 10
          };
        }
        const extra = t - 3;
        return {
          kind: "food",
          intUp: 6 + 1 * extra,
          mpRegen: 8 + 1 * extra,
          duration: 120 + 10 * extra,
          statusId: `food_fish_int_T${t}`,
          durationTurns: 60 + 5 * extra,
          hungerRecover: 14 + 1 * extra,
          thirstRecover: 10 + 1 * extra
        };
      },
      buildRequires(tierLabel) {
        const t = buildTierNumber(tierLabel);
        const kinds = calcKindsFromTier(t);

        if (t === 1) {
          // 元のT1: fish_river, spice_salt_rock
          const base = ["fish_river", "spice_salt_rock"];
          const picked = pickFirstNUnique(
            [
              ...base,
              "fish_sea",
              "veg_leaf_crisp",
              "veg_mountain",
              "grain_ancient",
              "grain_refined",
              "spice_premium",
              "fish_big",
              "fish_deep"
            ],
            kinds
          );
          return picked.map(id => ({ id, amount: 1 }));
        }

        if (t === 2) {
          // 元のT2: fish_river, fish_sea, spice_salt_rock, veg_leaf_crisp
          const base = [
            "fish_river",
            "fish_sea",
            "spice_salt_rock",
            "veg_leaf_crisp"
          ];
          const picked = pickFirstNUnique(
            [
              ...base,
              "veg_mountain",
              "grain_refined",
              "grain_ancient",
              "spice_premium",
              "fish_big",
              "fish_deep"
            ],
            kinds
          );
          return picked.map(id => ({ id, amount: 1 }));
        }

        if (t === 3) {
          // 元のT3: fish_sea, fish_deep, spice_salt_rock, veg_mountain, grain_ancient, spice_secret
          const base = [
            "fish_sea",
            "fish_deep",
            "spice_salt_rock",
            "veg_mountain",
            "grain_ancient",
            "spice_secret"
          ];
          const picked = pickFirstNUnique(
            [
              ...base,
              "fish_river",
              "fish_big",
              "spice_premium",
              "veg_leaf_crisp",
              "grain_refined"
            ],
            kinds
          );
          return picked.map(id => ({ id, amount: 1 }));
        }

        // T4以降: 魚＋野菜＋穀物＋スパイス
        const pool = [
          "fish_river",
          "fish_sea",
          "fish_big",
          "fish_deep",
          "spice_salt_rock",
          "spice_premium",
          "spice_secret",
          "veg_mountain",
          "veg_leaf_crisp",
          "veg_root_rough",
          "grain_ancient",
          "grain_refined"
        ];
        const picked = pickFirstNUnique(pool, kinds);
        return picked.map(id => ({ id, amount: 1 }));
      }
    },

    // ★伝説魚料理: T3〜T10
    {
      baseId: "food_fish_legend",
      name: "伝説魚の豪華フルコース",
      kind: "food",
      tierStart: 3,
      tierEnd: 10,
      buildEffect(tierLabel) {
        const t = buildTierNumber(tierLabel);
        if (t === 3) {
          return {
            kind: "food",
            atkUp: 8,
            defUp: 8,
            intUp: 8,
            mpRegen: 10,
            duration: 120,
            statusId: "food_fish_legend_T3",
            durationTurns: 60,
            hungerRecover: 25,
            thirstRecover: 10
          };
        }
        const extra = t - 3;
        return {
          kind: "food",
          atkUp: 8 + 1 * extra,
          defUp: 8 + 1 * extra,
          intUp: 8 + 1 * extra,
          mpRegen: 10 + 2 * extra,
          duration: 120 + 10 * extra,
          statusId: `food_fish_legend_T${t}`,
          durationTurns: 60 + 5 * extra,
          hungerRecover: 25 + 2 * extra,
          thirstRecover: 10 + 1 * extra
        };
      },
      buildRequires(tierLabel) {
        const t = buildTierNumber(tierLabel);
        const kinds = calcKindsFromTier(t);

        // 元のT3構成をベース
        const base = [
          "fish_legend",
          "fish_sea",
          "spice_secret",
          "veg_mountain",
          "grain_ancient"
        ];

        const pool = [
          ...base,
          "fish_deep",
          "fish_big",
          "spice_premium",
          "veg_leaf_crisp",
          "grain_refined"
        ];
        const picked = pickFirstNUnique(pool, kinds);
        return picked.map(id => ({ id, amount: 1 }));
      }
    }
  ];

  // ---- ドリンクテンプレ ----
  const DRINK_TEMPLATES = [
    // ハーブティー: T1〜T10
    {
      baseId: "drink_herb_tea",
      name: "ハーブティー",
      kind: "drink",
      tierStart: 1,
      tierEnd: 10,
      buildEffect(tierLabel) {
        const t = buildTierNumber(tierLabel);
        if (t === 1) {
          return {
            kind: "drink",
            mpRegen: 5,
            spRegen: 5,
            duration: 60,
            statusId: "drink_mp_regen_T1",
            durationTurns: 30,
            hungerRecover: 0,
            thirstRecover: 10
          };
        }
        if (t === 2) {
          return {
            kind: "drink",
            mpRegen: 10,
            spRegen: 10,
            duration: 90,
            statusId: "drink_mp_regen_T2",
            durationTurns: 45,
            hungerRecover: 0,
            thirstRecover: 15
          };
        }
        if (t === 3) {
          return {
            kind: "drink",
            mpRegen: 20,
            spRegen: 20,
            duration: 120,
            statusId: "drink_mp_regen_T3",
            durationTurns: 60,
            hungerRecover: 0,
            thirstRecover: 20
          };
        }
        const extra = t - 3;
        return {
          kind: "drink",
          mpRegen: 20 + 2 * extra,
          spRegen: 20 + 2 * extra,
          duration: 120 + 10 * extra,
          statusId: `drink_mp_regen_T${t}`,
          durationTurns: 60 + 5 * extra,
          hungerRecover: 0,
          thirstRecover: 20 + 2 * extra
        };
      },
      buildRequires(tierLabel) {
        const t = buildTierNumber(tierLabel);
        const kinds = calcKindsFromTier(t);

        if (t === 1) {
          // 元のT1: veg_herb_aroma ×2（種類としては1種類）
          const base = ["veg_herb_aroma"];
          const picked = pickFirstNUnique(
            [
              ...base,
              "veg_mountain",
              "veg_leaf_crisp",
              "veg_root_rough",
              "grain_coarse",
              "grain_refined",
              "grain_ancient",
              "spice_premium",
              "spice_secret"
            ],
            kinds
          );
          return picked.map(id => ({ id, amount: 1 }));
        }

        if (t === 2) {
          // 元のT2: veg_herb_aroma, spice_premium, grain_refined
          const base = [
            "veg_herb_aroma",
            "spice_premium",
            "grain_refined"
          ];
          const picked = pickFirstNUnique(
            [
              ...base,
              "veg_mountain",
              "veg_leaf_crisp",
              "veg_root_rough",
              "grain_coarse",
              "grain_ancient",
              "spice_secret"
            ],
            kinds
          );
          return picked.map(id => ({ id, amount: 1 }));
        }

        if (t === 3) {
          // 元のT3: veg_herb_aroma x2, veg_mountain, grain_ancient, spice_secret, veg_leaf_crisp, veg_root_rough
          const base = [
            "veg_herb_aroma",
            "veg_mountain",
            "grain_ancient",
            "spice_secret",
            "veg_leaf_crisp",
            "veg_root_rough"
          ];
          const picked = pickFirstNUnique(
            [
              ...base,
              "grain_refined",
              "grain_coarse",
              "veg_mushroom_aroma",
              "spice_premium"
            ],
            kinds
          );
          return picked.map(id => ({ id, amount: 1 }));
        }

        // T4以降: ハーブ・野菜・穀物・スパイス
        const pool = [
          "veg_herb_aroma",
          "veg_mountain",
          "veg_leaf_crisp",
          "veg_root_rough",
          "veg_mushroom_aroma",
          "grain_coarse",
          "grain_refined",
          "grain_ancient",
          "spice_premium",
          "spice_secret"
        ];
        const picked = pickFirstNUnique(pool, kinds);
        return picked.map(id => ({ id, amount: 1 }));
      }
    },

    // エナジードリンク: T1〜T10
    {
      baseId: "drink_energy",
      name: "活力ジュース",
      kind: "drink",
      tierStart: 1,
      tierEnd: 10,
      buildEffect(tierLabel) {
        const t = buildTierNumber(tierLabel);
        if (t === 1) {
          return {
            kind: "drink",
            spMaxUp: 5,
            moveSpeedUp: 5,
            duration: 60,
            statusId: "drink_sp_buff_T1",
            durationTurns: 30,
            hungerRecover: 0,
            thirstRecover: 10
          };
        }
        if (t === 2) {
          return {
            kind: "drink",
            spMaxUp: 10,
            moveSpeedUp: 10,
            duration: 90,
            statusId: "drink_sp_buff_T2",
            durationTurns: 45,
            hungerRecover: 0,
            thirstRecover: 15
          };
        }
        if (t === 3) {
          return {
            kind: "drink",
            spMaxUp: 15,
            moveSpeedUp: 15,
            duration: 120,
            statusId: "drink_sp_buff_T3",
            durationTurns: 60,
            hungerRecover: 0,
            thirstRecover: 20
          };
        }
        const extra = t - 3;
        return {
          kind: "drink",
          spMaxUp: 15 + 1 * extra,
          moveSpeedUp: 15 + 1 * extra,
          duration: 120 + 10 * extra,
          statusId: `drink_sp_buff_T${t}`,
          durationTurns: 60 + 5 * extra,
          hungerRecover: 0,
          thirstRecover: 20 + 2 * extra
        };
      },
      buildRequires(tierLabel) {
        const t = buildTierNumber(tierLabel);
        const kinds = calcKindsFromTier(t);

        if (t === 1) {
          // 元のT1: veg_leaf_crisp, grain_coarse
          const base = ["veg_leaf_crisp", "grain_coarse"];
          const picked = pickFirstNUnique(
            [
              ...base,
              "veg_root_rough",
              "grain_refined",
              "spice_pepper",
              "veg_herb_aroma",
              "veg_mountain",
              "grain_ancient",
              "spice_premium"
            ],
            kinds
          );
          return picked.map(id => ({ id, amount: 1 }));
        }

        if (t === 2) {
          // 元のT2: veg_leaf_crisp, veg_root_rough, grain_refined, spice_pepper
          const base = [
            "veg_leaf_crisp",
            "veg_root_rough",
            "grain_refined",
            "spice_pepper"
          ];
          const picked = pickFirstNUnique(
            [
              ...base,
              "grain_coarse",
              "grain_ancient",
              "veg_herb_aroma",
              "veg_mountain",
              "spice_premium"
            ],
            kinds
          );
          return picked.map(id => ({ id, amount: 1 }));
        }

        if (t === 3) {
          // 元のT3: veg_premium, veg_leaf_crisp, veg_root_rough, grain_ancient, spice_premium, veg_mushroom_aroma
          const base = [
            "veg_premium",
            "veg_leaf_crisp",
            "veg_root_rough",
            "grain_ancient",
            "spice_premium",
            "veg_mushroom_aroma"
          ];
          const picked = pickFirstNUnique(
            [
              ...base,
              "grain_refined",
              "grain_coarse",
              "veg_herb_aroma",
              "veg_mountain",
              "spice_secret"
            ],
            kinds
          );
          return picked.map(id => ({ id, amount: 1 }));
        }

        // T4以降: 野菜・穀物・スパイス
        const pool = [
          "veg_premium",
          "veg_leaf_crisp",
          "veg_root_rough",
          "veg_mushroom_aroma",
          "veg_herb_aroma",
          "veg_mountain",
          "grain_ancient",
          "grain_refined",
          "grain_coarse",
          "spice_premium",
          "spice_secret",
          "spice_pepper"
        ];
        const picked = pickFirstNUnique(pool, kinds);
        return picked.map(id => ({ id, amount: 1 }));
      }
    }
  ];

  const food = [];
  const drink = [];

  // テンプレから自動生成
  FOOD_TEMPLATES.forEach(tpl => {
    for (let t = tpl.tierStart; t <= tpl.tierEnd; t++) {
      const tierLabel = `T${t}`;
      const id = `T${t}_${tpl.baseId}`;
      food.push({
        id,
        name: tpl.name,
        tier: tierLabel,
        requires: tpl.buildRequires(tierLabel),
        effect: tpl.buildEffect(tierLabel)
      });
    }
  });

  DRINK_TEMPLATES.forEach(tpl => {
    for (let t = tpl.tierStart; t <= tpl.tierEnd; t++) {
      const tierLabel = `T${t}`;
      const id = `T${t}_${tpl.baseId}`;
      drink.push({
        id,
        name: tpl.name,
        tier: tierLabel,
        requires: tpl.buildRequires(tierLabel),
        effect: tpl.buildEffect(tierLabel)
      });
    }
  });

  // 既存の「別メニュー扱い」T2/T3料理は仕様そのまま＋IDそのまま維持
  food.push(
    // 既存のT2肉料理（別メニュー扱い）
    {
      id: "food_meat_t2",
      name: "ジューシー獣肉ステーキ",
      tier: "T2",
      requires: [
        { id: "meat_premium", amount: 1 },
        { id: "meat_fatty", amount: 1 },
        { id: "veg_root_rough", amount: 1 },
        { id: "spice_premium", amount: 1 }
      ],
      effect: {
        kind: "food",
        hpRegen: 10,
        atkUp: 5,
        duration: 90,
        statusId: "food_meat_atk_steak_T2",
        durationTurns: 45,
        hungerRecover: 16,
        thirstRecover: 0
      }
    },
    // 既存のT2野菜料理（別メニュー扱い）
    {
      id: "food_veg_t2",
      name: "濃厚ベジシチュー",
      tier: "T2",
      requires: [
        { id: "veg_leaf_crisp", amount: 1 },
        { id: "veg_mushroom_aroma", amount: 1 },
        { id: "veg_premium", amount: 1 },
        { id: "grain_refined", amount: 1 }
      ],
      effect: {
        kind: "food",
        defUp: 5,
        resistUp: 5,
        duration: 90,
        statusId: "food_veg_def_stew_T2",
        durationTurns: 45,
        hungerRecover: 9,
        thirstRecover: 9
      }
    },
    // T3ステーキ
    {
      id: "food_meat_t3_steak",
      name: "特選獣肉ステーキ",
      tier: "T3",
      requires: [
        { id: "meat_magic", amount: 1 },
        { id: "meat_premium", amount: 1 },
        { id: "meat_fatty", amount: 1 },
        { id: "veg_root_rough", amount: 1 },
        { id: "veg_herb_aroma", amount: 1 },
        { id: "spice_secret", amount: 1 }
      ],
      effect: {
        kind: "food",
        hpRegen: 25,
        atkUp: 8,
        duration: 120,
        statusId: "food_meat_atk_steak_T3",
        durationTurns: 60,
        hungerRecover: 22,
        thirstRecover: 0
      }
    },
    // T3ベジシチュー
    {
      id: "food_veg_t3_stew",
      name: "至高のベジシチュー",
      tier: "T3",
      requires: [
        { id: "veg_mountain", amount: 1 },
        { id: "veg_premium", amount: 1 },
        { id: "veg_mushroom_aroma", amount: 1 },
        { id: "grain_ancient", amount: 1 },
        { id: "spice_premium", amount: 1 },
        { id: "veg_leaf_crisp", amount: 1 }
      ],
      effect: {
        kind: "food",
        defUp: 8,
        resistUp: 8,
        duration: 120,
        statusId: "food_veg_def_stew_T3",
        durationTurns: 60,
        hungerRecover: 12,
        thirstRecover: 12
      }
    },
    // T3ロースト肉
    {
      id: "food_meat_t3",
      name: "王侯のロースト肉",
      tier: "T3",
      requires: [
        { id: "meat_magic", amount: 1 },
        { id: "meat_premium", amount: 1 },
        { id: "veg_herb_aroma", amount: 1 },
        { id: "veg_mountain", amount: 1 },
        { id: "grain_ancient", amount: 1 },
        { id: "spice_secret", amount: 1 }
      ],
      effect: {
        kind: "food",
        hpRegen: 20,
        atkUp: 8,
        duration: 120,
        statusId: "food_meat_atk_roast_T3",
        durationTurns: 60,
        hungerRecover: 21,
        thirstRecover: 0
      }
    },
    // T3ポタージュ
    {
      id: "food_veg_t3",
      name: "精霊の野菜ポタージュ",
      tier: "T3",
      requires: [
        { id: "veg_mountain", amount: 1 },
        { id: "veg_premium", amount: 1 },
        { id: "veg_leaf_crisp", amount: 1 },
        { id: "grain_ancient", amount: 1 },
        { id: "spice_premium", amount: 1 },
        { id: "veg_mushroom_aroma", amount: 1 }
      ],
      effect: {
        kind: "food",
        defUp: 8,
        resistUp: 8,
        duration: 120,
        statusId: "food_veg_def_potage_T3",
        durationTurns: 60,
        hungerRecover: 11,
        thirstRecover: 11
      }
    }
  );

  window.COOKING_RECIPES = {
    food,
    drink
  };
})();

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
      storageKind: "cookedFood", // "inventory" → "cookedFood"
      storageTab: "cooking",
      tier: r.tier || null,
      tags: ["cooking", "food"],

      // COOKING_RECIPES の effect をそのまま保存
      effect: eff,

      // 互換用の固定値コピー
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
      storageKind: "cookedDrink", // "inventory" → "cookedDrink"
      storageTab: "cooking",
      tier: r.tier || null,
      tags: ["cooking", "drink"],

      // effect をそのまま保存
      effect: eff,

      // 互換用の固定値コピー
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
    // 農園素材
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