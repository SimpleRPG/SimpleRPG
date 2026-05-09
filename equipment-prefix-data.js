// equipment-prefix-data.js
// 接頭語データ + ロール用ヘルパ
//
// 仕様維持:
// - window.EQUIP_PREFIXES : 配列
// - window.shouldAddEquipPrefix(craftSkillLv) : true/false
// - window.rollEquipPrefix(itemId, kind) : { id, prefix, desc, atkPct, intPct, hpPct }
//
// 拡張:
// - 各接頭語に rarity / minTier / maxTier を追加（ゲーム全体 T1〜T10 を想定）
// - rollEquipPrefix の第3引数 options で { itemTier, itemRarity } を受け取り、
//   指定があればその範囲からロール
// - ティアごとのレアリティ出現率テーブルを追加
//   （getRarityForTier(tier) で T1〜T10→rarity を決められる）

// レアリティ想定:
// "common"   : コモン
// "uncommon" : アンコモン
// "magic"    : マジック
// "rare"     : レア
// "legend"   : レジェンド

// 接頭語マスタ
// 攻撃・INT・最大HP 系だけを使う（ゲーム全体で共通使用）
window.EQUIP_PREFIXES = [
  // =========================
  // 単体・攻撃系（ATK%）
  // =========================
  {
    id: "sharp",
    prefix: "鋭い",
    desc: "ATK+5%",
    atkPct: 0.05,
    intPct: 0,
    hpPct: 0,
    rarity: "common",
    minTier: 1,
    maxTier: 6
  },
  {
    id: "fierce",
    prefix: "激しい",
    desc: "ATK+8%",
    atkPct: 0.08,
    intPct: 0,
    hpPct: 0,
    rarity: "uncommon",
    minTier: 2,
    maxTier: 8
  },
  {
    id: "brutal",
    prefix: "残忍な",
    desc: "ATK+12%",
    atkPct: 0.12,
    intPct: 0,
    hpPct: 0,
    rarity: "magic",
    minTier: 4,
    maxTier: 10
  },

  // =========================
  // 単体・INT系（INT%）
  // =========================
  {
    id: "wise",
    prefix: "賢い",
    desc: "INT+5%",
    atkPct: 0,
    intPct: 0.05,
    hpPct: 0,
    rarity: "common",
    minTier: 1,
    maxTier: 6
  },
  {
    id: "mystic",
    prefix: "神秘の",
    desc: "INT+8%",
    atkPct: 0,
    intPct: 0.08,
    hpPct: 0,
    rarity: "uncommon",
    minTier: 2,
    maxTier: 8
  },
  {
    id: "arcane",
    prefix: "秘術の",
    desc: "INT+12%",
    atkPct: 0,
    intPct: 0.12,
    hpPct: 0,
    rarity: "magic",
    minTier: 4,
    maxTier: 10
  },

  // =========================
  // 単体・最大HP系
  // =========================
  {
    id: "vital",
    prefix: "頑健な",
    desc: "最大HP+5%",
    atkPct: 0,
    intPct: 0,
    hpPct: 0.05,
    rarity: "common",
    minTier: 1,
    maxTier: 6
  },
  {
    id: "stout",
    prefix: "分厚い",
    desc: "最大HP+8%",
    atkPct: 0,
    intPct: 0,
    hpPct: 0.08,
    rarity: "uncommon",
    minTier: 2,
    maxTier: 8
  },
  {
    id: "bulwark",
    prefix: "堅固な",
    desc: "最大HP+12%",
    atkPct: 0,
    intPct: 0,
    hpPct: 0.12,
    rarity: "magic",
    minTier: 4,
    maxTier: 10
  },

  // =========================
  // 複合系
  // =========================
  {
    id: "balanced",
    prefix: "調和の",
    desc: "ATK+3% / INT+3%",
    atkPct: 0.03,
    intPct: 0.03,
    hpPct: 0,
    rarity: "rare",
    minTier: 3,
    maxTier: 10
  },
  {
    id: "guardian",
    prefix: "守護の",
    desc: "ATK+3% / 最大HP+5%",
    atkPct: 0.03,
    intPct: 0,
    hpPct: 0.05,
    rarity: "rare",
    minTier: 3,
    maxTier: 10
  }

  // レジェンド用の尖った接頭語は、今後ここに追加していく想定。
];

// ========================================
// ティア別レアリティ出現テーブル
// ========================================
//
// T1〜T10 それぞれで「どのレアリティをどの確率で引くか」を定義。
// このテーブルはアイテム生成側からも再利用できるように window に出しておく。

window.EQUIP_PREFIX_RARITY_TABLE = {
  // T1: コモン中心、アンコモンはややレア
  1: {
    common: 0.75,
    uncommon: 0.20,
    magic: 0.05,
    rare: 0.0,
    legend: 0.0
  },
  // T2: コモン減り、アンコモン/マジックが見え始める
  2: {
    common: 0.60,
    uncommon: 0.25,
    magic: 0.15,
    rare: 0.0,
    legend: 0.0
  },
  // T3: マジックが主役に近づく
  3: {
    common: 0.40,
    uncommon: 0.30,
    magic: 0.30,
    rare: 0.0,
    legend: 0.0
  },
  // T4: マジック主体、レアがチラ見え
  4: {
    common: 0.25,
    uncommon: 0.30,
    magic: 0.35,
    rare: 0.10,
    legend: 0.0
  },
  // T5: マジック/レア半々くらい
  5: {
    common: 0.15,
    uncommon: 0.25,
    magic: 0.40,
    rare: 0.20,
    legend: 0.0
  },
  // T6: レアが主役に近づく
  6: {
    common: 0.10,
    uncommon: 0.20,
    magic: 0.35,
    rare: 0.30,
    legend: 0.05
  },
  // T7: レア主体、レジェンドが低確率で混ざる
  7: {
    common: 0.05,
    uncommon: 0.15,
    magic: 0.30,
    rare: 0.40,
    legend: 0.10
  },
  // T8: レアとレジェンドの比率アップ
  8: {
    common: 0.03,
    uncommon: 0.12,
    magic: 0.25,
    rare: 0.40,
    legend: 0.20
  },
  // T9: レジェンドがかなり現実的に狙える
  9: {
    common: 0.02,
    uncommon: 0.08,
    magic: 0.20,
    rare: 0.40,
    legend: 0.30
  },
  // T10: レア/レジェンドがほとんど
  10: {
    common: 0.01,
    uncommon: 0.04,
    magic: 0.15,
    rare: 0.40,
    legend: 0.40
  }
};

// ティアからレアリティを1つロールして返す。
// tier がテーブル外の場合は近いティアに丸める。
window.getEquipPrefixRarityForTier = function (tier) {
  tier = tier || 1;
  if (tier < 1) tier = 1;
  if (tier > 10) tier = 10;

  var table = window.EQUIP_PREFIX_RARITY_TABLE[tier];
  if (!table) {
    // 念のためフォールバック
    table = window.EQUIP_PREFIX_RARITY_TABLE[1];
  }

  var r = Math.random();
  var acc = 0;

  var order = ["common", "uncommon", "magic", "rare", "legend"];
  for (var i = 0; i < order.length; i++) {
    var key = order[i];
    var p = table[key] || 0;
    acc += p;
    if (r < acc) {
      return key;
    }
  }

  // 浮動小数の誤差等で取りこぼした場合は一番確率の高いものを返す
  var bestKey = "common";
  var bestVal = -1;
  for (var k in table) {
    if (Object.prototype.hasOwnProperty.call(table, k)) {
      if (table[k] > bestVal) {
        bestVal = table[k];
        bestKey = k;
      }
    }
  }
  return bestKey;
};

// ========================================
// 接頭語付与判定
// ========================================

// 本番用: Lv100で30%（テスト時はここを return true に差し替え）
window.shouldAddEquipPrefix = function (craftSkillLv) {
  craftSkillLv = craftSkillLv || 0;
  const p = 0.30 * Math.min(1, Math.max(0, craftSkillLv / 100));
  return Math.random() < p;
};

// ========================================
// 接頭語ロール
// ========================================
//
// 既存呼び出し:
//
\
  rollEquipPrefix(itemId, kind)
// 拡張呼び出し:
//   rollEquipPrefix(itemId, kind, { itemTier: 5 })
//   rollEquipPrefix(itemId, kind, { itemTier: 7, itemRarity: "rare" })
//
// itemTier : 1〜10 を想定（T1〜T10）
// itemRarity : "common" | "uncommon" | "magic" | "rare" | "legend"
window.rollEquipPrefix = function (itemId, kind, options) {
  // kind: "weapon" | "armor" など。将来、武器専用/防具専用prefixを分けたいときに使う想定
  if (!Array.isArray(window.EQUIP_PREFIXES) || !window.EQUIP_PREFIXES.length) {
    return null;
  }

  const hasOptions = options && (typeof options === "object");
  let itemTier = hasOptions && typeof options.itemTier === "number"
    ? options.itemTier
    : null;
  let itemRarity = hasOptions && typeof options.itemRarity === "string"
    ? options.itemRarity
    : null;

  // ティアだけ渡されてレアリティ未指定の場合は、
  // ティアに応じてレアリティをロールする。
  if (itemTier != null && !itemRarity) {
    itemRarity = window.getEquipPrefixRarityForTier(itemTier);
  }

  let pool = window.EQUIP_PREFIXES;

  // itemTier, itemRarity が指定されている場合のみフィルタ
  if (itemTier != null || itemRarity != null) {
    pool = window.EQUIP_PREFIXES.filter(function (p) {
      // ティア条件
      if (itemTier != null) {
        const minT = (typeof p.minTier === "number") ? p.minTier : 1;
        const maxT = (typeof p.maxTier === "number") ? p.maxTier : 10;
        if (itemTier < minT || itemTier > maxT) {
          return false;
        }
      }
      // レアリティ条件
      if (itemRarity != null) {
        if (p.rarity !== itemRarity) {
          return false;
        }
      }
      return true;
    });
  }

  // 条件で絞り込みすぎて空になった場合は、フォールバックとして全体からロール
  if (!Array.isArray(pool) || !pool.length) {
    pool = window.EQUIP_PREFIXES;
  }

  const idx = Math.floor(Math.random() * pool.length);
  const base = pool[idx];

  // そのまま返してしまうと、あとで個別調整しにくいのでコピーして返す
  return {
    id: base.id,
    prefix: base.prefix,
    desc: base.desc,
    atkPct: base.atkPct || 0,
    intPct: base.intPct || 0,
    hpPct: base.hpPct || 0
  };
};