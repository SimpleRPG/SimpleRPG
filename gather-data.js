// gather-data.js
// 採取対象と採取スキルの初期値・パラメータ

// =======================
// 採取対象メタ情報
// =======================
//
// ・基本素材: 木 / 鉱石 / 草 / 布 / 皮 / 水
// ・料理用は「採取の場所＆モード」（狩猟/釣り/畑/菜園）で分ける前提なので、
//
//   ここではあくまで「素材そのもの」を列挙するだけにとどめる。
//   → 料理用の細かい素材（硬い獣肉…）は cookingMats 側で管理。

const GATHER_TARGETS = [
  { id: "wood",    name: "木",    hasBase: true },
  { id: "ore",     name: "鉱石",  hasBase: true },
  { id: "herb",    name: "草",    hasBase: true },
  { id: "cloth",   name: "布",    hasBase: true },
  { id: "leather", name: "皮",    hasBase: true },
  { id: "water",   name: "水",    hasBase: true }

  // 料理用は「狩猟/釣り/畑/菜園」という行動モードで扱うため、
  // ここには追加しない（GATHER_SKILLS 側だけに追加する）。
];

// =======================
// 採取スキル
// =======================

// 採取スキルの最大レベル
const GATHER_SKILL_MAX_LV = 100;

// 採取スキルの初期状態
// game-core 側でこのオブジェクトをコピーして使う前提。
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
  // ・fieldFarm: 畑（穀物系など）を採るときに使う
  // ・garden: 菜園（野菜・ハーブ系など）を採るときに使う
  hunt:      { lv: 0, exp: 0, expToNext: 5 },
  fish:      { lv: 0, exp: 0, expToNext: 5 },
  fieldFarm: { lv: 0, exp: 0, expToNext: 5 },
  garden:    { lv: 0, exp: 0, expToNext: 5 }
};

// =======================
// 採取量計算用パラメータ
// =======================

const GATHER_AMOUNT_PARAMS = {
  baseOneProb: 0.5,
  guaranteedCoeff: 2,
  extraChanceCoeff: 0.2
};

// =======================
// レアドロップ用パラメータ
// =======================

const RARE_GATHER_ITEM_ID   = "starShard";
const RARE_GATHER_ITEM_NAME = "星屑の結晶";
const RARE_GATHER_DROP_RATE = 0.0002;