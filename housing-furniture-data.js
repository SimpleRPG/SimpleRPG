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
    const id = `bed_T${n}`;
    const nameBase =
      (n <= 3)  ? "簡素なベッド" :
      (n <= 6)  ? "上質なベッド" :
      (n <= 9)  ? "高級ベッド"   :
                  "王侯のベッド";

    // クラフトコスト定義（tier が上がるほど素材が増える）
    const woodCost = 10 + (n - 1) * 5;   // T1=10, T2=15, ..., T10=55
    const clothCost = 5 + (n - 1) * 3;   // T1=5, T2=8, ..., T10=32
    const ironCost = n > 3 ? (n - 3) * 2 : 0; // T4以降は鉄も必要

    const craftCost = { wood: woodCost, cloth: clothCost };
    if (ironCost > 0) {
      craftCost.iron = ironCost;
    }

    // クラフト成功率（tier が高いほど難しい）
    const baseRate = Math.max(0.5, 0.95 - (n - 1) * 0.05); // T1=0.95 ... T10=0.5

    defs[id] = {
      id,
      name: `${nameBase} (T${n})`,
      // 家具用の category は既存に合わせて調整してOK
      // ここでは汎用 "other" にしておき、storage はインベントリ扱いにする。
      category: "other",
      storageKind: "inventory",
      storageTab: "other",
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