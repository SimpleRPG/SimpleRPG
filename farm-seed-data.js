// farm-seed-data.js
// 作物の種定義とショップ・シードメーカー・畑システム連携用マッピング

(function initFarmSeedData(global) {
  "use strict";

  // 作物IDと種アイテムIDの相互マッピング
  // 畑向け（field）: 7種
  // 菜園向け（garden）: 9種
  const SEED_DEFS = [
    // --- 畑向け（field） ---
    {
      seedId: "seed_veg_root_rough",
      cropId: "veg_root_rough",
      name: "ゴロゴロ根菜の種",
      icon: "🥔",
      price: 3,
      tier: 1,
      category: "field",
      desc: "ゴロゴロ根菜が育つ基本の種。安価で育てやすく、初心者農夫の定番作物。"
    },
    {
      seedId: "seed_veg_leaf_crisp",
      cropId: "veg_leaf_crisp",
      name: "シャキシャキ葉菜の種",
      icon: "🥬",
      price: 3,
      tier: 1,
      category: "field",
      desc: "シャキシャキ葉菜が育つ種。みずみずしく、手軽な料理の基本食材となる。"
    },
    {
      seedId: "seed_grain_coarse",
      cropId: "grain_coarse",
      name: "粗挽き穀物の種",
      icon: "🌾",
      price: 3,
      tier: 1,
      category: "field",
      desc: "粗挽き穀物が育つ穀物の種。主食やパンなどの生地作りの基礎。"
    },
    {
      seedId: "seed_grain_refined",
      cropId: "grain_refined",
      name: "精製穀物の種",
      icon: "🌾",
      price: 5,
      tier: 2,
      category: "field",
      desc: "精製穀物が育つ良質な種。中級料理に欠かせないきめ細やかな穀物。"
    },
    {
      seedId: "seed_grain_mochi",
      cropId: "grain_mochi",
      name: "もちもち穀物の種",
      icon: "🌾",
      price: 6,
      tier: 2,
      category: "field",
      desc: "もちもち穀物が育つ種。独特の粘りとコシを持つ料理用穀物。"
    },
    {
      seedId: "seed_veg_premium",
      cropId: "veg_premium",
      name: "高級野菜の種",
      icon: "🥕",
      price: 10,
      tier: 3,
      category: "field",
      desc: "高級野菜が育つ貴重な種。上位ティアの豪勢な料理に使われる高品質な野菜。"
    },
    {
      seedId: "seed_grain_ancient",
      cropId: "grain_ancient",
      name: "古代穀物の種",
      icon: "🌾",
      price: 12,
      tier: 3,
      category: "field",
      desc: "古代穀物が育つ希少な種。豊かな風味と高い滋養を持つ幻の穀物。"
    },

    // --- 菜園向け（garden） ---
    {
      seedId: "seed_spice_salt_rock",
      cropId: "spice_salt_rock",
      name: "岩塩の結晶核",
      icon: "🧂",
      price: 3,
      tier: 1,
      category: "garden",
      desc: "菜園のミネラル土壌で岩塩を結晶化させるための核。すべての味付けの基本。"
    },
    {
      seedId: "seed_spice_pepper",
      cropId: "spice_pepper",
      name: "胡椒の種",
      icon: "🫚",
      price: 4,
      tier: 1,
      category: "garden",
      desc: "胡椒が育つスパイスの種。肉料理の風味引き立てに欠かせない基本香辛料。"
    },
    {
      seedId: "seed_veg_herb_aroma",
      cropId: "veg_herb_aroma",
      name: "香草の種",
      icon: "🌿",
      price: 4,
      tier: 1,
      category: "garden",
      desc: "香草が育つハーブの種。爽やかな香りを添える料理素材。"
    },
    {
      seedId: "seed_veg_mountain",
      cropId: "veg_mountain",
      name: "山菜の種",
      icon: "🌱",
      price: 5,
      tier: 2,
      category: "garden",
      desc: "山菜が育つ種。ほろ苦い風味と素朴な味わいが特徴。"
    },
    {
      seedId: "seed_veg_mushroom_aroma",
      cropId: "veg_mushroom_aroma",
      name: "香るキノコの菌床",
      icon: "🍄",
      price: 6,
      tier: 2,
      category: "garden",
      desc: "香るキノコを栽培するための菌床。芳醇な香りのキノコが群生する。"
    },
    {
      seedId: "seed_veg_spice",
      cropId: "veg_spice",
      name: "香辛料の種",
      icon: "🌶️",
      price: 6,
      tier: 2,
      category: "garden",
      desc: "香辛料が育つ種。ピリッとした刺激と深いコクをもたらすスパイス。"
    },
    {
      seedId: "seed_veg_dried",
      cropId: "veg_dried",
      name: "乾燥野菜用の苗",
      icon: "🍂",
      price: 8,
      tier: 2,
      category: "garden",
      desc: "乾物加工に適した野菜苗。旨味が凝縮された料理素材となる。"
    },
    {
      seedId: "seed_spice_premium",
      cropId: "spice_premium",
      name: "高級スパイスの種",
      icon: "✨",
      price: 12,
      tier: 3,
      category: "garden",
      desc: "高級スパイスが育つ種。上位ティアの料理を極上の味に仕上げる。"
    },
    {
      seedId: "seed_spice_secret",
      cropId: "spice_secret",
      name: "秘伝スパイスの種",
      icon: "🌟",
      price: 20,
      tier: 3,
      category: "garden",
      desc: "秘伝スパイスが育つ幻の種。最高峰の料理にのみ用いられる極上の香辛料。"
    }
  ];

  const CROP_TO_SEED_MAP = {};
  const SEED_TO_CROP_MAP = {};
  const SEED_DATA_MAP = {};

  // ITEM_META に登録する定義
  const itemDefs = {};

  SEED_DEFS.forEach(d => {
    CROP_TO_SEED_MAP[d.cropId] = d.seedId;
    SEED_TO_CROP_MAP[d.seedId] = d.cropId;
    SEED_DATA_MAP[d.seedId] = d;

    itemDefs[d.seedId] = {
      id: d.seedId,
      name: d.name,
      category: "tool",
      craftCategory: "material",
      storageKind: "inventory",
      storageTab: "materials",
      tier: d.tier,
      tags: ["seed", "farm", d.category],
      cropId: d.cropId,
      price: d.price,
      desc: d.desc
    };
  });

  if (typeof global.registerItemDefs === "function") {
    global.registerItemDefs(itemDefs);
  }

  // 公開 API
  global.FARM_SEED_DEFS = SEED_DEFS;
  global.CROP_TO_SEED_MAP = CROP_TO_SEED_MAP;
  global.SEED_TO_CROP_MAP = SEED_TO_CROP_MAP;
  global.SEED_DATA_MAP = SEED_DATA_MAP;

  global.getSeedIdByCropId = function(cropId) {
    return CROP_TO_SEED_MAP[cropId] || null;
  };

  global.getCropIdBySeedId = function(seedId) {
    return SEED_TO_CROP_MAP[seedId] || null;
  };

  global.getSeedDef = function(seedId) {
    return SEED_DATA_MAP[seedId] || null;
  };

})(window);
