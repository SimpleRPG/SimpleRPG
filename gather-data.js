// gather-data.js
// 採取対象と採取スキルの初期値・パラメータ

// =======================
// 採取対象メタ情報
// =======================
//
// ・基本素材: 木 / 鉱石 / 草 / 布 / 皮 / 水
// ・料理用は「採取の場所＆モード」（狩猟/釣り/畑）で分ける前提なので、
//   ここではあくまで「素材そのもの」を列挙するだけにとどめる。
//   → 料理用の細かい素材（硬い獣肉…）は cookingMats 側で管理。

const GATHER_TARGETS = [
  { id: "wood",    name: "木",    hasBase: true },
  { id: "ore",     name: "鉱石",  hasBase: true },
  { id: "herb",    name: "草",    hasBase: true },
  { id: "cloth",   name: "布",    hasBase: true },
  { id: "leather", name: "皮",    hasBase: true },
  { id: "water",   name: "水",    hasBase: true }

  // 料理用は「狩猟/釣り/畑」という行動モードで扱うため、
  // ここには追加しない（GATHER_SKILLS 側だけに追加する）。
];

// =======================
// 採取スキル
// =======================

// 採取スキルの最大レベル
const GATHER_SKILL_MAX_LV = 100;

// 採取スキルの初期状態
// game-core 側でこのオブジェクトをコピーして使う前提。
// 既存の 6 種に加えて、料理用として「狩猟 / 釣り / 畑」を
// まったく同じフォーマット・レベルアップ仕様で追加する。
const GATHER_SKILLS_INIT = {
  // 基本素材用スキル
  wood:    { lv: 0, exp: 0, expToNext: 5 },
  ore:     { lv: 0, exp: 0, expToNext: 5 },
  herb:    { lv: 0, exp: 0, expToNext: 5 },
  cloth:   { lv: 0, exp: 0, expToNext: 5 },
  leather: { lv: 0, exp: 0, expToNext: 5 },
  water:   { lv: 0, exp: 0, expToNext: 5 },

  // 料理用採取スキル
  // ・hunt: 狩猟（肉系素材）を採るときに使う
  // ・fish: 釣り（魚系素材）を採るときに使う
  // ・farm: 畑・菜園（野菜 / 穀物 / 調味料系）を採るときに使う
  //
  // レベルアップ条件や必要経験値の伸び方は、
  // 他の採取スキルと完全に同じロジックで扱う。
  hunt:    { lv: 0, exp: 0, expToNext: 5 },
  fish:    { lv: 0, exp: 0, expToNext: 5 },
  farm:    { lv: 0, exp: 0, expToNext: 5 }
};

// =======================
// 採取量計算用パラメータ
// =======================
//
// lv に応じて、最低保証・追加判定などをいじりたいときはここを変える。
// 狩猟 / 釣り / 畑も、まずは基本素材と同じパラメータを共有する。
// 後で「狩猟はちょっと重めに」「釣りはレア率高め」など
// カテゴリ別に変えたくなったら、この構造を拡張する。

const GATHER_AMOUNT_PARAMS = {
  // base: 0 or 1 をランダムで決めるときの 1 側の確率
  baseOneProb: 0.5,

  // guaranteedCoeff: floor( guaranteedCoeff * (lv / 100) ) が最低保証量
  guaranteedCoeff: 2,

  // extraChanceCoeff: extraChanceCoeff * (lv / 100) が追加 +1 の確率
  extraChanceCoeff: 0.2
};

// =======================
// レアドロップ用パラメータ
// =======================
//
// ・どの採取アクションからでもごく低確率で落ちる汎用レア素材。
// ・実装側（game-core）で Math.random() との比較に使う。
// ・名前はどの素材から出ても違和感がないように「星屑の結晶」とする。

// レア素材のIDと表示名
const RARE_GATHER_ITEM_ID   = "starShard";
const RARE_GATHER_ITEM_NAME = "星屑の結晶";

// 採取1回あたりのレアドロップ確率（0.001% = 0.00001）
const RARE_GATHER_DROP_RATE = 0.00001;