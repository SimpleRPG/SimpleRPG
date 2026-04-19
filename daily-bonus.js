// daily-bonus.js
// =======================
// 日替わりボーナス管理
// =======================
//
// ・日付ごとに「2つのカテゴリ」がボーナス対象になる。
// ・対象カテゴリは採取（木/鉱石/草/布/皮/水/狩猟/釣り/農園/菜園）と
//   クラフト（武器/防具/ポーション/道具/中間素材/料理：食べ物/飲み物）
//   ＋ 戦闘（職業ごとのゴールド/ドロップボーナス）。
// ・セーブデータには書かない（毎日0:00で自動切り替わる）。
// ・倍率や加算値もこのファイル側で定義する。
//   - 採取: 対象カテゴリの日は採取量 +10%（amountRate = 1.10）。
//   - クラフト: 対象カテゴリの日は成功率 +5%（successAdd = 0.05）。
//   - 戦闘: 対象職業の日はゴールド +10%、ドロップ率 +10%。
//
// どこからでも：
//   - isDailyBonusActive("craft_weapon")
//   - getDailyGatherBonus("wood")
//   - getDailyCraftBonus("weapon")
//   - getDailyBattleBonus(jobId)
//   - getTodayDailyBonusLabel()
//   - getTodayDailyBonusDetailsText()  ← 追加（ラベル＋効果一覧）
// などを呼び出して使う。

(function () {
  "use strict";

  // =======================
  // ボーナスカテゴリ一覧
  // =======================

  // 採取系カテゴリキー
  // gather(): 通常採取
  //   - gather_wood    → 木
  //   - gather_ore     → 鉱石
  //   - gather_herb    → 草
  //   - gather_cloth   → 布
  //   - gather_leather → 皮
  //   - gather_water   → 水
  //
  // gatherCooking(): 料理用採取
  //   - gather_hunt    → 狩猟
  //   - gather_fish    → 釣り
  //   - gather_farm    → 農園
  //   - gather_garden  → 菜園
  //
  // クラフト系カテゴリキー
  //   - craft_weapon   → 武器クラフト
  //   - craft_armor    → 防具クラフト
  //   - craft_potion   → ポーションクラフト
  //   - craft_tool     → 道具クラフト
  //   - craft_material → 中間素材クラフト
  //   - craft_food     → 料理（食べ物）
  //   - craft_drink    → 料理（飲み物）
  //
  // 戦闘系カテゴリキー（職業ごとの戦闘ボーナス）
  //   - battle_warrior   → 戦士の戦闘
  //   - battle_mage      → 魔法使いの戦闘
  //   - battle_beast     → 動物使いの戦闘
  //   - battle_alchemist → 錬金術師の戦闘
  //
  // 将来、他のカテゴリを追加したくなった場合は、ここに足すだけでOK。
  var DAILY_BONUS_KEYS = [
    // 採取（通常）
    "gather_wood",
    "gather_ore",
    "gather_herb",
    "gather_cloth",
    "gather_leather",
    "gather_water",

    // 採取（料理用・農園）
    "gather_hunt",
    "gather_fish",
    "gather_farm",
    "gather_garden",

    // クラフト
    "craft_weapon",
    "craft_armor",
    "craft_potion",
    "craft_tool",
    "craft_material",
    "craft_food",
    "craft_drink",

    // 戦闘（職業）
    "battle_warrior",
    "battle_mage",
    "battle_beast",
    "battle_alchemist"
  ];

  if (typeof window !== "undefined") {
    // デバッグ・UIからも一覧参照できるように公開
    window.DAILY_BONUS_KEYS = DAILY_BONUS_KEYS;
  }

  // =======================
  // 日付→シード変換
  // =======================

  // その日の「シード値」を決める。
  // 例: 2026-04-18 → 20260418
  function getTodaySeed() {
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth() + 1; // 1-12
    var d = now.getDate();      // 1-31
    return y * 10000 + m * 100 + d;
  }

  // =======================
  // 簡易LCG（再現性のある乱数）
  // =======================

  // seed から 0〜1未満の乱数を返す関数を作る。
  // 「毎日同じ2カテゴリが全員に共通して選ばれる」ことが目的なので、
  // 乱数の質はそこまで厳密でなくて良い。
  function makeDailyRng(seed) {
    var s = (seed >>> 0);
    return function next() {
      // LCG: X_{n+1} = (a X_n + c) mod 2^32
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  // =======================
  // 今日のボーナス2カテゴリを計算
  // =======================

  function calcTodayDailyBonusKeys() {
    var keys = DAILY_BONUS_KEYS;
    if (!keys || !keys.length) {
      return [];
    }

    var seed = getTodaySeed();
    var rnd = makeDailyRng(seed);
    var len = keys.length;

    // 1つ目
    var i1 = Math.floor(rnd() * len);

    // 2つ目（1つ目と被ったらずらす）
    var i2 = Math.floor(rnd() * len);
    if (i2 === i1) {
      i2 = (i2 + 1) % len;
    }

    var k1 = keys[i1];
    var k2 = keys[i2];

    return [k1, k2];
  }

  // =======================
  // 公開API: 今日のボーナスキー
  // =======================

  // 「今日のボーナス2つ」を返す。
  // - ブラウザ環境では初回だけ計算し、結果を window.todayDailyBonusKeys にキャッシュ。
  function getTodayDailyBonusKeys() {
    if (typeof window === "undefined") {
      // ブラウザ外（テスト）では毎回計算
      return calcTodayDailyBonusKeys();
    }

    if (Array.isArray(window.todayDailyBonusKeys) &&
        window.todayDailyBonusKeys.length === 2) {
      return window.todayDailyBonusKeys;
    }

    var keys = calcTodayDailyBonusKeys();
    window.todayDailyBonusKeys = keys;
    return keys;
  }

  // 指定キーが「今日のボーナス対象か」を返す。
  function isDailyBonusActive(key) {
    if (!key) return false;
    var keys = getTodayDailyBonusKeys();
    if (!keys || !keys.length) return false;
    return keys.indexOf(key) !== -1;
  }

  // UI用: 今日のボーナスを人間向けラベルに変換して返す。
  function getTodayDailyBonusLabel() {
    var keys = getTodayDailyBonusKeys();
    if (!keys || !keys.length) {
      return "なし";
    }

    var nameMap = {
      // 採取
      gather_wood:    "採取：木",
      gather_ore:     "採取：鉱石",
      gather_herb:    "採取：草",
      gather_cloth:   "採取：布",
      gather_leather: "採取：皮",
      gather_water:   "採取：水",
      gather_hunt:    "狩猟（料理素材）",
      gather_fish:    "釣り（料理素材）",
      gather_farm:    "農園",
      gather_garden:  "菜園",

      // クラフト
      craft_weapon:    "クラフト：武器",
      craft_armor:     "クラフト：防具",
      craft_potion:    "クラフト：ポーション",
      craft_tool:      "クラフト：道具",
      craft_material:  "クラフト：中間素材",
      craft_food:      "料理：食べ物",
      craft_drink:     "料理：飲み物",

      // 戦闘（職業）
      battle_warrior:   "戦闘：戦士",
      battle_mage:      "戦闘：魔法使い",
      battle_beast:     "戦闘：動物使い",
      battle_alchemist: "戦闘：錬金術師"
    };

    return keys.map(function (k) {
      return nameMap[k] || k;
    }).join(" ＆ ");
  }

  // =======================
  // ◆詳細テキスト生成（ラベル＋効果だけ）
  // =======================

  // 個々のキーに対応する「ラベル」と「効果テキスト」を返す。
  function getDailyBonusLabelAndEffect(key) {
    switch (key) {
      // 採取（量 +10%）
      case "gather_wood":
        return { label: "採取：木", effect: "木の採取量が +10%" };
      case "gather_ore":
        return { label: "採取：鉱石", effect: "鉱石の採取量が +10%" };
      case "gather_herb":
        return { label: "採取：草", effect: "草の採取量が +10%" };
      case "gather_cloth":
        return { label: "採取：布", effect: "布の採取量が +10%" };
      case "gather_leather":
        return { label: "採取：皮", effect: "皮の採取量が +10%" };
      case "gather_water":
        return { label: "採取：水", effect: "水の採取量が +10%" };

      case "gather_hunt":
        return { label: "狩猟（料理素材）", effect: "狩猟で手に入る料理素材の量が +10%" };
      case "gather_fish":
        return { label: "釣り（料理素材）", effect: "釣りで手に入る料理素材の量が +10%" };
      case "gather_farm":
        return { label: "農園", effect: "農園で収穫できる作物の量が +10%" };
      case "gather_garden":
        return { label: "菜園", effect: "菜園で収穫できる作物の量が +10%" };

      // クラフト（成功率 +5%）
      case "craft_weapon":
        return { label: "クラフト：武器", effect: "武器クラフトの成功率が +5%" };
      case "craft_armor":
        return { label: "クラフト：防具", effect: "防具クラフトの成功率が +5%" };
      case "craft_potion":
        return { label: "クラフト：ポーション", effect: "ポーションクラフトの成功率が +5%" };
      case "craft_tool":
        return { label: "クラフト：道具", effect: "道具クラフトの成功率が +5%" };
      case "craft_material":
        return { label: "クラフト：中間素材", effect: "中間素材クラフトの成功率が +5%" };
      case "craft_food":
        return { label: "料理：食べ物", effect: "料理（食べ物）の成功率が +5%" };
      case "craft_drink":
        return { label: "料理：飲み物", effect: "料理（飲み物）の成功率が +5%" };

      // 戦闘（ゴールド・ドロップ +10%）
      case "battle_warrior":
        return { label: "戦闘：戦士", effect: "戦士で戦闘したときのゴールド・ドロップ率が +10%" };
      case "battle_mage":
        return { label: "戦闘：魔法使い", effect: "魔法使いで戦闘したときのゴールド・ドロップ率が +10%" };
      case "battle_beast":
        return { label: "戦闘：動物使い", effect: "動物使いで戦闘したときのゴールド・ドロップ率が +10%" };
      case "battle_alchemist":
        return { label: "戦闘：錬金術師", effect: "錬金術師で戦闘したときのゴールド・ドロップ率が +10%" };

      default:
        // 未定義キー用
        return { label: key, effect: "効果未定義" };
    }
  }

  // 今日の2つのボーナスについて、「ラベル＋効果」の複数行テキストを返す。
  // 空行は入れず、常に1行間隔だけにする。
  function getTodayDailyBonusDetailsText() {
    var keys = getTodayDailyBonusKeys();
    if (!keys || !keys.length) {
      return "今日は日替わりボーナスはありません。";
    }

    var lines = [];
    lines.push("【今日の日替わりボーナス】");

    keys.forEach(function (key) {
      var info = getDailyBonusLabelAndEffect(key);
      lines.push("▼ " + info.label + " 効果: " + info.effect);
    });

    lines.push("※ボーナス内容は毎日0:00に切り替わります。");
    return lines.join("\n");
  }

  // =======================
  // ボーナス値定義
  // =======================

  // 採取向けボーナス定義
  //
  // 引数:
  //   target: "wood" / "ore" / "herb" / "cloth" / "leather" / "water"
  //           "hunt" / "fish" / "farm" / "garden"
  //
  // 戻り値:
  //   { amountRate: number }
  //     - amountRate: 掛け算用倍率（1.10 なら +10%）
  function getDailyGatherBonus(target) {
    var rate = 1.0;

    // 通常採取
    if (target === "wood"    && isDailyBonusActive("gather_wood"))    rate += 0.10;
    if (target === "ore"     && isDailyBonusActive("gather_ore"))     rate += 0.10;
    if (target === "herb"    && isDailyBonusActive("gather_herb"))    rate += 0.10;
    if (target === "cloth"   && isDailyBonusActive("gather_cloth"))   rate += 0.10;
    if (target === "leather" && isDailyBonusActive("gather_leather")) rate += 0.10;
    if (target === "water"   && isDailyBonusActive("gather_water"))   rate += 0.10;

    // 料理採取・農園
    if (target === "hunt"   && isDailyBonusActive("gather_hunt"))   rate += 0.10;
    if (target === "fish"   && isDailyBonusActive("gather_fish"))   rate += 0.10;
    if (target === "farm"   && isDailyBonusActive("gather_farm"))   rate += 0.10;
    if (target === "garden" && isDailyBonusActive("gather_garden")) rate += 0.10;

    return { amountRate: rate };
  }

  // クラフト向けボーナス定義
  //
  // 引数:
  //   category: "weapon" / "armor" / "potion" / "tool" / "material" / "food" / "drink"
  //
  // 戻り値:
  //   { successAdd: number }
  //     - successAdd: 成功率への加算値（0.05 なら +5%）
  function getDailyCraftBonus(category) {
    var add = 0;

    if (category === "weapon"   && isDailyBonusActive("craft_weapon"))   add += 0.05;
    if (category === "armor"    && isDailyBonusActive("craft_armor"))    add += 0.05;
    if (category === "potion"   && isDailyBonusActive("craft_potion"))   add += 0.05;
    if (category === "tool"     && isDailyBonusActive("craft_tool"))     add += 0.05;
    if (category === "material" && isDailyBonusActive("craft_material")) add += 0.05;
    if (category === "food"     && isDailyBonusActive("craft_food"))     add += 0.05;
    if (category === "drink"    && isDailyBonusActive("craft_drink"))    add += 0.05;

    return { successAdd: add };
  }

  // 戦闘向けボーナス定義
  //
  // 引数:
  //   jobId: 0=戦士,1=魔法使い,2=動物使い,3=錬金術師
  //
  // 戻り値:
  //   { goldRate: number, dropRate: number }
  //     - goldRate: 獲得ゴールド倍率（1.10 なら +10%）
  //     - dropRate: ドロップ率倍率（1.10 なら +10%）
  function getDailyBattleBonus(jobId) {
    var goldRate = 1.0;
    var dropRate = 1.0;

    if (jobId === 0 && isDailyBonusActive("battle_warrior")) {
      goldRate += 0.10;
      dropRate += 0.10;
    }
    if (jobId === 1 && isDailyBonusActive("battle_mage")) {
      goldRate += 0.10;
      dropRate += 0.10;
    }
    if (jobId === 2 && isDailyBonusActive("battle_beast")) {
      goldRate += 0.10;
      dropRate += 0.10;
    }
    if (jobId === 3 && isDailyBonusActive("battle_alchemist")) {
      goldRate += 0.10;
      dropRate += 0.10;
    }

    return { goldRate: goldRate, dropRate: dropRate };
  }

  // =======================
  // グローバル公開
  // =======================

  if (typeof window !== "undefined") {
    window.getTodayDailyBonusKeys        = getTodayDailyBonusKeys;
    window.isDailyBonusActive            = isDailyBonusActive;
    window.getTodayDailyBonusLabel       = getTodayDailyBonusLabel;
    window.getTodayDailyBonusDetailsText = getTodayDailyBonusDetailsText; // 追加
    window.getDailyGatherBonus           = getDailyGatherBonus;
    window.getDailyCraftBonus            = getDailyCraftBonus;
    window.getDailyBattleBonus           = getDailyBattleBonus;
  } else if (typeof module !== "undefined" && module.exports) {
    // 一応CommonJS対応（テスト用）
    module.exports = {
      DAILY_BONUS_KEYS: DAILY_BONUS_KEYS,
      getTodayDailyBonusKeys: getTodayDailyBonusKeys,
      isDailyBonusActive: isDailyBonusActive,
      getTodayDailyBonusLabel: getTodayDailyBonusLabel,
      getTodayDailyBonusDetailsText: getTodayDailyBonusDetailsText, // 追加
      getDailyGatherBonus: getDailyGatherBonus,
      getDailyCraftBonus: getDailyCraftBonus,
      getDailyBattleBonus: getDailyBattleBonus
    };
  }

})();