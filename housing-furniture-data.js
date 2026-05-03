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

  // 必要なら、ここに他の家具（調理台・作業台など）も defs に追加していく。

  global.registerItemDefs(defs);

})(window);