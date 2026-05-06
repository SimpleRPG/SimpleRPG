// equipment-prefix-data.js
// 接頭語データ + ロール用ヘルパ

// 接頭語マスタ
// 攻撃・魔攻・最大HP 系だけを使う
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
    id: "fierce",
    prefix: "激しい",
    desc: "攻撃+8%",
    atkPct: 0.08,
    intPct: 0,
    hpPct: 0
  },
  {
    id: "brutal",
    prefix: "残忍な",
    desc: "攻撃+12%",
    atkPct: 0.12,
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
    id: "mystic",
    prefix: "神秘の",
    desc: "魔攻+8%",
    atkPct: 0,
    intPct: 0.08,
    hpPct: 0
  },
  {
    id: "arcane",
    prefix: "秘術の",
    desc: "魔攻+12%",
    atkPct: 0,
    intPct: 0.12,
    hpPct: 0
  },

  {
    id: "vital",
    prefix: "頑健な",
    desc: "最大HP+5%",
    atkPct: 0,
    intPct: 0,
    hpPct: 0.05
  },
  {
    id: "stout",
    prefix: "分厚い",
    desc: "最大HP+8%",
    atkPct: 0,
    intPct: 0,
    hpPct: 0.08
  },
  {
    id: "bulwark",
    prefix: "堅固な",
    desc: "最大HP+12%",
    atkPct: 0,
    intPct: 0,
    hpPct: 0.12
  },

  // 少しだけ複合系
  {
    id: "balanced",
    prefix: "調和の",
    desc: "攻撃+3% / 魔攻+3%",
    atkPct: 0.03,
    intPct: 0.03,
    hpPct: 0
  },
  {
    id: "guardian",
    prefix: "守護の",
    desc: "攻撃+3% / 最大HP+5%",
    atkPct: 0.03,
    intPct: 0,
    hpPct: 0.05
  }
];

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