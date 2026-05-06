// equipment-prefix-data.js
// 接頭語データ + ロール用ヘルパ

// 接頭語マスタ
// ※とりあえずシンプルな3種類だけ例で置いておく
window.EQUIP_PREFIXES = [
  {
    id: "sharp",
    prefix: "鋭い",
    desc: "攻撃+5%",
    atkPct: 0.05,
    intPct: 0,
    hpPct: 0
  },
  {
    id: "wise",
    prefix: "賢い",
    desc: "魔攻+5%",
    atkPct: 0,
    intPct: 0.05,
    hpPct: 0
  },
  {
    id: "vital",
    prefix: "頑健な",
    desc: "最大HP+5%",
    atkPct: 0,
    intPct: 0,
    hpPct: 0.05
  }
];

// ========================================
// 接頭語付与判定
// ========================================

// 元実装（Lv100で30%）
// window.shouldAddEquipPrefix = function (craftSkillLv) {
//   craftSkillLv = craftSkillLv || 0;
//   const p = 0.30 * Math.min(1, Math.max(0, craftSkillLv / 100));
//   return Math.random() < p;
// };

// ★テスト用: 常に true を返して、クラフト成功時は必ず接頭語ロールする
window.shouldAddEquipPrefix = function (craftSkillLv) {
  // craftSkillLv は無視（デバッグ用）
  return true;
};

// ========================================
// 接頭語ロール
// ========================================

// 接頭語を1つロールして返す（単純に等確率）
window.rollEquipPrefix = function (itemId, kind) {
  // kind: "weapon" | "armor" など。将来、武器専用/防具専用prefixを分けたいときに使う想定
  if (!Array.isArray(window.EQUIP_PREFIXES) || !window.EQUIP_PREFIXES.length) {
    return null;
  }
  const list = window.EQUIP_PREFIXES;
  const idx = Math.floor(Math.random() * list.length);
  const base = list[idx];
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