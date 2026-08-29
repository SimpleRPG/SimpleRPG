// housing-furniture-data.js
// ハウジング用家具アイテム定義（ベッドT1〜T10など）
// ・ITEM_META に家具アイテムを登録
// ・rest メタは housing-core.js 側で解釈して「休憩」処理に使う想定
// ・craft メタでクラフトレシピも定義

(function initHousingFurnitureData(global) {
  "use strict";

  if (typeof global.registerItemDefs !== "function") {
    console.warn("registerItemDefs is not available. housing-furniture-data.js skipped.");
    return;
  }

  const defs = {};

  // ベッドT1〜T10を一気に定義
  // tier N ごとに:
  //  - HP/MP 回復率: 0.1 * N (T1=10% ... T10=100%)
  //  - バフ継続時間: 60分 (3600秒)
  //  - 与ダメージ補正: +1〜10%（dmgRateAdd）
  //  - 採取+1個確率: +1〜10%（gatherPlusOneChanceAdd）
  //  - クラフト成功率: +1〜10%（craftSuccessRateAdd）

  for (let n = 1; n <= 10; n++) {
    const id = `T${n}_bed`;
    const nameBase =
      (n <= 3)  ? "簡素なベッド" :
      (n <= 6)  ? "上質なベッド" :
      (n <= 9)  ? "高級ベッド"   :
                  "王侯のベッド";

    // -----------------------------
    // クラフトコスト定義
    // -----------------------------
    // 既存の中間素材 ID に合わせる:
    //   木材板: T1_woodPlank〜T3_woodPlank
    //   布束:   T1_clothBolt〜T3_clothBolt
    //   鉄インゴット: T1_ironIngot〜T3_ironIngot
    //
    // ベッドの tier(n) が 1〜10 なので、
    //   T1〜T3 → 中間素材T1
    //   T4〜T6 → 中間素材T2
    //   T7〜T10 → 中間素材T3
    // という段階制にしておく（既存中間素材の上限T3と噛み合う）。
    const matTier =
      (n <= 3) ? 1 :
      (n <= 6) ? 2 :
                 3;

    const woodPlankId  = `T${matTier}_woodPlank`;
    const clothBoltId  = `T${matTier}_clothBolt`;
    const ironIngotId  = `T${matTier}_ironIngot`;

    // 必要個数は、元の wood/cloth/iron の伸びを少し圧縮した形で tier に応じてスケールさせる。
    // ここでは「ベッドの tier に応じて徐々に増える」性質だけ維持している。
    const woodPlankCost = 2 + (n - 1);           // T1=2, T2=3, ... T10=11
    const clothBoltCost = 1 + Math.floor((n-1)/2); // T1=1, T2=1, T3=2, ... T10あたりで4〜5
    const ironIngotCost = (n > 3) ? Math.floor((n-3)/2) : 0; // T4から少しずつ増える

    const craftCost = {};
    craftCost[woodPlankId] = woodPlankCost;
    craftCost[clothBoltId] = clothBoltCost;
    if (ironIngotCost > 0) {
      craftCost[ironIngotId] = ironIngotCost;
    }

    // クラフト成功率（tier が高いほど難しい）
    const baseRate = Math.max(0.5, 0.95 - (n - 1) * 0.05); // T1=0.95 ... T10=0.5

    defs[id] = {
      id,
      name: `T${n}${nameBase}`,

      // ★家具カテゴリとして登録（item-meta-core.js の CATEGORY_DEFAULTS.furniture に合わせる）
      category: "furniture",
      // storageKind は CATEGORY_DEFAULTS.furniture でも inventory なので、明示しておく
      storageKind: "inventory",
      // 倉庫タブも家具用タブに出したいので "furniture" にする
      storageTab: "furniture",

      tier: n,
      tags: ["furniture", "bed", "rest"],

      // ★クラフトメタ: craft-core.js / craft-actions.js で解釈
      craft: {
        enabled: true,
        category: "furniture",
        baseRate: baseRate,
        cost: craftCost,
        tier: n
      },

      // ★休憩メタ: housing-core.js で解釈する前提
      rest: {
        // 休憩時の回復率（HP/MP）
        hpRate: 0.10 * n,   // T1=0.1 ... T10=1.0
        mpRate: 0.10 * n,

        // 休憩後に付与される「生活バフ」の継続時間（秒）
        buffDurationSec: 3600, // 60分

        // バフ内容（戦闘・採取・クラフト用の係数/加算）
        // ここでは「+1〜10%」を表す 0.01 * n を、加算扱いで持たせる。
        dmgRateAdd: 0.01 * n,               // 与ダメージ+1〜10%
        gatherPlusOneChanceAdd: 0.01 * n,   // 採取+1個確率+1〜10%
        craftSuccessRateAdd: 0.01 * n       // クラフト成功率+1〜10%
      }
    };
  }

  // ===================================
  // スプリンクラー T1〜T10（野外専用・自動散水家具）
  // ===================================
  for (let n = 1; n <= 10; n++) {
    const id = `T${n}_sprinkler`;
    const nameBase =
      (n <= 3) ? "銅製スプリンクラー" :
      (n <= 6) ? "鉄製スプリンクラー" :
      (n <= 9) ? "金製スプリンクラー" :
                 "魔導スプリンクラー";

    const matTier = (n <= 3) ? 1 : (n <= 6) ? 2 : 3;
    const ironIngotId     = `T${matTier}_ironIngot`;
    const woodPlankId     = `T${matTier}_woodPlank`;
    const distilledWaterId = `T${matTier}_distilledWater`;

    const craftCost = {};
    craftCost[ironIngotId]      = 2 + Math.floor((n - 1) / 2);
    craftCost[woodPlankId]      = 2 + Math.floor((n - 1) / 2);
    craftCost[distilledWaterId] = 2 + Math.floor((n - 1) / 2);

    const baseRate = Math.max(0.5, 0.95 - (n - 1) * 0.05);

    defs[id] = {
      id,
      name: `T${n}${nameBase}`,
      category: "furniture",
      storageKind: "inventory",
      storageTab: "furniture",
      tier: n,
      tags: ["furniture", "sprinkler", "outdoor", "farm"],
      placement: "outdoor", // 野外専用
      craft: {
        enabled: true,
        category: "furniture",
        baseRate: baseRate,
        cost: craftCost,
        tier: n
      },
      sprinkler: {
        tier: n,
        maxFuel: 20 + n * 5, // T1=25, T2=30 ... T10=70
        growthBonus: 1 + Math.floor((n - 1) / 3), // T1~3=+1, T4~6=+2, T7~10=+3
      },
      desc: `野外（庭園）専用の自動散水装置。中間素材の水とお好みの食材を燃料として装填すると、行動時に畑の全スロットを自動で潤して成長させる（Tier${n}）。`
    };
  }

  // ===================================
  // シードメーカー T1〜T10（屋内・野外共通・種抽出家具）
  // ===================================
  for (let n = 1; n <= 10; n++) {
    const id = `T${n}_seed_maker`;
    const nameBase =
      (n <= 3) ? "木製シードメーカー" :
      (n <= 6) ? "鉄製シードメーカー" :
      (n <= 9) ? "精密シードメーカー" :
                 "魔導シードメーカー";

    const matTier = (n <= 3) ? 1 : (n <= 6) ? 2 : 3;
    const woodPlankId  = `T${matTier}_woodPlank`;
    const ironIngotId  = `T${matTier}_ironIngot`;
    const crystalId    = `T${matTier}_crystal`;

    const craftCost = {};
    craftCost[woodPlankId] = 3 + Math.floor((n - 1) / 2);
    craftCost[ironIngotId] = 2 + Math.floor((n - 1) / 2);
    craftCost[crystalId]   = 1 + Math.floor((n - 1) / 3);

    const baseRate = Math.max(0.5, 0.95 - (n - 1) * 0.05);

    defs[id] = {
      id,
      name: `T${n}${nameBase}`,
      category: "furniture",
      storageKind: "inventory",
      storageTab: "furniture",
      tier: n,
      tags: ["furniture", "seed_maker", "craft", "farm"],
      placement: "both", // 屋内・野外どちらでもOK
      craft: {
        enabled: true,
        category: "furniture",
        baseRate: baseRate,
        cost: craftCost,
        tier: n
      },
      seedMaker: {
        tier: n,
        extractMultiplier: 2 + (n >= 5 ? 1 : 0), // 2〜3倍
        bonusChance: 0.05 * n
      },
      desc: `作物を投入して種を抽出・増殖できる種抽出機。屋内・野外どちらにも設置可能（Tier${n}）。`
    };
  }

  // ベッドT1〜T10の配置メタを屋内専用に
  for (let n = 1; n <= 10; n++) {
    if (defs[`T${n}_bed`]) {
      defs[`T${n}_bed`].placement = "indoor";
    }
  }

  // ===================================
  // ギルド交換所用：家具・便利チケット・消耗品
  // ===================================
  defs["item_g_chest_guild"] = {
    id: "item_g_chest_guild",
    name: "ギルド特製収納チェスト",
    category: "furniture",
    storageKind: "inventory",
    storageTab: "furniture",
    placement: "indoor",
    tier: 2,
    tags: ["furniture", "storage", "guild"],
    desc: "ギルドから下付された頑丈な収納箱。屋内に設置して素材や装備を整理・保管できる。"
  };

  defs["item_g_worktable"] = {
    id: "item_g_worktable",
    name: "ギルド特製職人作業台",
    category: "furniture",
    storageKind: "inventory",
    storageTab: "furniture",
    placement: "indoor",
    skillReq: { skill: "furniture", lv: 5 },
    tier: 2,
    tags: ["furniture", "worktable", "guild"],
    desc: "ギルド御用達の高品質な木製作業台。屋内に設置するとクラフト時の成功率が+5%上昇する。"
  };

  // ★追加: 野外・庭園用ギルド家具
  defs["item_g_fruit_tree_apple"] = {
    id: "item_g_fruit_tree_apple",
    name: "リンゴの果樹苗木",
    category: "furniture",
    storageKind: "inventory",
    storageTab: "furniture",
    placement: "outdoor", // 野外専用
    guildReq: "food",     // 食材ギルド専用
    skillReq: { skill: "fieldFarm", lv: 5 },
    tier: 2,
    tags: ["furniture", "tree", "outdoor", "farm", "guild"],
    desc: "食材ギルド公認の果樹苗木。野外（庭園）に植えると瑞々しい果実を実らせ、農場全体の収穫効率を上昇させる。"
  };

  defs["item_g_scarecrow"] = {
    id: "item_g_scarecrow",
    name: "熟練農夫のかかし",
    category: "furniture",
    storageKind: "inventory",
    storageTab: "furniture",
    placement: "outdoor", // 野外専用
    skillReq: { skill: "fieldFarm", lv: 3 },
    tier: 2,
    tags: ["furniture", "scarecrow", "outdoor", "farm", "guild"],
    desc: "野外（庭園）に設置すると畑を害獣・害鳥から守り、収穫時の収穫量を+1個増加させる。"
  };

  defs["item_g_training_dummy"] = {
    id: "item_g_training_dummy",
    name: "戦士の鍛錬用木人",
    category: "furniture",
    storageKind: "inventory",
    storageTab: "furniture",
    placement: "outdoor", // 野外専用
    guildReq: "warrior",  // 戦士ギルド専用
    skillReq: { skill: "sword", lv: 5 },
    tier: 2,
    tags: ["furniture", "combat", "outdoor", "guild"],
    desc: "戦士ギルド特製の訓練用木人。野外（庭園）に設置すると戦闘での獲得経験値が+5%増加する。"
  };

  defs["item_g_ticket_shorten"] = {
    id: "item_g_ticket_shorten",
    name: "探索短縮の砂時計",
    category: "tool",
    storageKind: "inventory",
    storageTab: "tool",
    tier: 1,
    tags: ["tool", "consumable", "speedup"],
    desc: "ギルド発行の時短アイテム。使用すると探索イベントを即時3回分進行できる。"
  };

  defs["item_g_bulk_delivery"] = {
    id: "item_g_bulk_delivery",
    name: "ギルド一括納品状",
    category: "tool",
    storageKind: "inventory",
    storageTab: "tool",
    tier: 1,
    tags: ["tool", "consumable", "delivery"],
    desc: "ギルド発行の優先納品状。所持している納品可能アイテムを一度にすべて一括納品する。"
  };

  defs["item_g_gather_incense"] = {
    id: "item_g_gather_incense",
    name: "探鉱・採取の集中香",
    category: "tool",
    storageKind: "inventory",
    storageTab: "tool",
    tier: 2,
    tags: ["tool", "consumable", "buff", "gather"],
    desc: "調香師特製の採取香。使用すると30分間、素材採取時の獲得数が+1個増加し、レア素材の発見率が上昇する。"
  };

  defs["item_g_combat_scroll"] = {
    id: "item_g_combat_scroll",
    name: "討伐報奨の巻物",
    category: "tool",
    storageKind: "inventory",
    storageTab: "tool",
    tier: 2,
    tags: ["tool", "consumable", "buff", "combat"],
    desc: "ギルド特約の討伐証明書。使用すると30分間、戦闘での獲得経験値とゴールドが+25%増加する。"
  };

  defs["item_g_pet_treat"] = {
    id: "item_g_pet_treat",
    name: "特製ペットトリート",
    category: "tool",
    storageKind: "inventory",
    storageTab: "tool",
    tier: 2,
    tags: ["tool", "consumable", "pet"],
    desc: "厳選された獣肉と栄養素を凝縮したおやつ。パーティにいるペット全員の経験値+200と親愛度を上昇させる。"
  };

  defs["item_g_guild_ration"] = {
    id: "item_g_guild_ration",
    name: "ギルド特製スタミナレーション",
    category: "food",
    storageKind: "inventory",
    storageTab: "cooking",
    tier: 2,
    tags: ["food", "consumable", "heal"],
    desc: "栄養価満点のギルド保存食。HP・MPを完全回復し、活力バフを付与する。"
  };

  global.registerItemDefs(defs);

})(window);