// guild-dailies.js
// ギルドデイリー依頼データ定義専用ファイル
// （ロジックは guild.js 側が担当。guild-quests.js の後に読み込むこと）

window.GUILD_DAILY_POOLS = {
  warrior: [
    {
      id: "daily_warrior_kill20_any",
      name: "日課: 戦士の鍛錬",
      desc: "敵を20体倒す。",
      kind: "battle",   // 戦闘系デイリー
      // by 指定なし → 通常攻撃・物理スキル・魔法・ペット・ボス問わずカウント
      target: 20
    },
    {
      id: "daily_warrior_kill10_phys",
      name: "日課: 物理スキル訓練",
      desc: "物理スキルで敵を10体倒す。",
      kind: "battle",
      by: "phys",       // 物理スキル／物理通常攻撃扱い
      target: 10
    }
  ],

  mage: [
    {
      id: "daily_mage_kill20_any",
      name: "日課: 魔導の鍛錬",
      desc: "敵を20体倒す。",
      kind: "battle",
      target: 20
    },
    {
      id: "daily_mage_kill10_magic",
      name: "日課: 魔法スキル訓練",
      desc: "魔法スキルで敵を10体倒す。",
      kind: "battle",
      by: "magic",      // 魔法スキルでトドメ時のみカウント
      target: 10
    }
  ],

  tamer: [
    {
      id: "daily_tamer_kill20_any",
      name: "日課: 共闘の鍛錬",
      desc: "敵を20体倒す。",
      kind: "battle",
      target: 20
    },
    {
      id: "daily_tamer_kill10_pet",
      name: "日課: ペット訓練",
      desc: "ペットで敵を10体倒す。",
      kind: "battle",
      by: "pet",        // ペット撃破時のみカウント
      target: 10
    }
  ],

  // ▼鍛冶ギルド（smith）デイリー
  smith: [
    {
      id: "daily_smith_craft_gear15",
      name: "日課: 鍛冶の生産",
      desc: "武器か防具を15個制作する。",
      kind: "smith_craft_gear",   // 鍛冶クラフト完了イベント用
      target: 15
    },
    {
      id: "daily_smith_enhance_1",
      name: "日課: 装備強化",
      desc: "武器か防具を1回強化する。",
      kind: "smith_enhance",      // 強化実行イベント用
      target: 1
    }
  ],

  // ▼錬金ギルド（alchemist）デイリー
  alchemist: [
    {
      id: "daily_alch_make_15",
      name: "日課: 調合の手慣らし",
      desc: "ポーションか道具を15個制作する。",
      kind: "alch_craft_tool_or_potion",   // 錬金クラフト完了イベント用
      target: 15
    },
    {
      id: "daily_alch_consume_or_sell_5",
      name: "日課: 需要の確認",
      desc: "ポーションか道具を5個、使うか売買で消費する。",
      kind: "alch_use_or_sell",   // 使用/マーケット売買/ショップ売却イベント用
      target: 5
    }
  ],

  // ▼料理ギルド（cooking）デイリー
  cooking: [
    {
      id: "daily_cooking_make_15",
      name: "日課: 仕込みの時間",
      desc: "料理か飲み物を15品作る。",
      kind: "cooking_craft_food_or_drink",   // 料理クラフト完了イベント用
      target: 15
    },
    {
      id: "daily_cooking_consume_or_sell_5",
      name: "日課: 食卓と商売",
      desc: "料理か飲み物を5個、食べるか売買で消費する。",
      kind: "cooking_use_or_sell",           // 食べる/マーケット売買/ショップ売却イベント用
      target: 5
    }
  ]

  // 将来:
  // gather, food もここに同じ形で追加していく予定。
};