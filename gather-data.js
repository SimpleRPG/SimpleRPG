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
// 採取スキル用 経験値テーブル
// =======================
//
// ・Lv1〜10: 合計およそ1日ぶん（採取フルで）
// ・Lv11〜30: 1〜2日ぶん/レベルに線形で増加
// ・Lv31〜60: 2〜4日ぶん/レベルに線形で増加
// ・Lv61〜80: 4〜6日ぶん/レベルに線形で増加
// ・Lv81〜100: 6〜8日ぶん/レベルに線形で増加
//
// expToNextTable[lv] = 「Lv lv → lv+1 に必要な経験値」

const GATHER_SKILL_EXP_TABLE = {
  // Lv1〜10（合計 ≒ 1日ぶん）
  1:  300,
  2:  330,
  3:  360,
  4:  390,
  5:  420,
  6:  450,
  7:  480,
  8:  510,
  9:  540,
  10: 570,

  // Lv11〜30（1〜2日ぶん/レベル相当）
  // 1日 ≒ 4,320回採取
  11: 4320,
  12: 4560,
  13: 4800,
  14: 5040,
  15: 5280,
  16: 5520,
  17: 5760,
  18: 6000,
  19: 6240,
  20: 6480,
  21: 6720,
  22: 6960,
  23: 7200,
  24: 7440,
  25: 7680,
  26: 7920,
  27: 8160,
  28: 8400,
  29: 8640,
  30: 8880,

  // Lv31〜60（2〜4日ぶん/レベル相当）
  // 2日:  8,640 / 4日:17,280
  31:  8640,
  32:  9120,
  33:  9600,
  34: 10080,
  35: 10560,
  36: 11040,
  37: 11520,
  38: 12000,
  39: 12480,
  40: 12960,
  41: 13440,
  42: 13920,
  43: 14400,
  44: 14880,
  45: 15360,
  46: 15840,
  47: 16320,
  48: 16800,
  49: 17280,
  50: 17760,
  51: 18240,
  52: 18720,
  53: 19200,
  54: 19680,
  55: 20160,
  56: 20640,
  57: 21120,
  58: 21600,
  59: 22080,
  60: 22560,

  // Lv61〜80（4〜6日ぶん/レベル相当）
  // 4日:17,280 / 6日:25,920
  61:  17280,
  62:  18144,
  63:  19008,
  64:  19872,
  65:  20736,
  66:  21600,
  67:  22464,
  68:  23328,
  69:  24192,
  70:  25056,
  71:  25920,
  72:  26784,
  73:  27648,
  74:  28512,
  75:  29376,
  76:  30240,
  77:  31104,
  78:  31968,
  79:  32832,
  80:  33696,

  // Lv81〜100（6〜8日ぶん/レベル相当）
  // 6日:25,920 / 8日:34,560
  81:  25920,
  82:  26880,
  83:  27840,
  84:  28800,
  85:  29760,
  86:  30720,
  87:  31680,
  88:  32640,
  89:  33600,
  90:  34560,
  91:  35520,
  92:  36480,
  93:  37440,
  94:  38400,
  95:  39360,
  96:  40320,
  97:  41280,
  98:  42240,
  99:  43200,
  100: 0 // Lv100 以降は上がらない想定
};

// Lvごとの必要経験値を取得するヘルパー
function getGatherExpToNextByLv(lv) {
  if (lv <= 0) return 5;
  if (lv >= GATHER_SKILL_MAX_LV) return 0;
  return GATHER_SKILL_EXP_TABLE[lv] || 5;
}

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

// =======================
// 長押しオート連打ヘルパー
// =======================
//
// 任意のボタン要素に対して、長押し中は action() を intervalMs 間隔で連打する。
// 通常クリック（短押し）もそのまま action() が1回走る仕様にしたいときは、
// 呼び出し側で別途 click リスナーを付けるか、ここで start() 内の最初の action()
// のみで済ませるなど調整して使う。

function setupAutoRepeatButton(btn, action, intervalMs = 100) {
  if (!btn || typeof action !== "function") return;

  let timer = null;

  function start() {
    if (timer) return;
    action(); // 開始時に1回
    timer = setInterval(action, intervalMs);
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  // PC（マウス）
  btn.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    start();
  });
  btn.addEventListener("mouseup", stop);
  btn.addEventListener("mouseleave", stop);

  // スマホ（タッチ）
  btn.addEventListener("touchstart", (e) => {
    e.preventDefault(); // 連打中のスクロール・ズームなどを抑止
    start();
  }, { passive: false });
  btn.addEventListener("touchend", stop);
  btn.addEventListener("touchcancel", stop);
}