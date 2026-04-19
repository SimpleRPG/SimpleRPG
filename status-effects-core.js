// status-effects-core.js
// 状態異常・バフデバフの定義とロジック（UI や戦闘フローは別ファイル）

// =======================
// バフソース種別定数
// =======================
//
// いずれ料理バフ・スキルバフ・ポーションバフなどを
// 別カテゴリで管理できるようにするための種別。

const BUFF_SOURCE_FOOD   = "food";
const BUFF_SOURCE_DRINK  = "drink";
const BUFF_SOURCE_SKILL  = "skill";
const BUFF_SOURCE_POTION = "potion";
const BUFF_SOURCE_OTHER  = "other";

// =======================
// 状態配列
// =======================
//
// プレイヤー: playerStatuses
// 敵: enemyStatuses
//
// ターン管理は「プレイヤー行動＋敵行動」で1ターン進む前提。
// 毎ターン終了時に tickStatusesTurnEndForBoth を呼ぶ。

let playerStatuses = [];
let enemyStatuses  = [];

// ★錬金術師用: 状態異常ダメージボーナス
function applyAlchemistDotBonus(dmg) {
  if (typeof isAlchemist === "function" && isAlchemist()) {
    return Math.max(1, Math.floor(dmg * 1.5)); // +50%
  }
  return dmg;
}

// =======================
// 状態定義テーブル
// =======================

const STATUS_EFFECTS = {
  poison: {
    id: "poison",
    name: "毒",
    baseDuration: 3,
    onTurnEnd(targetCtx) {
      const hpMax = targetCtx.hpMax();
      const applyHp = targetCtx.applyHp;
      const name = targetCtx.name;
      let dmg = Math.max(1, Math.floor(hpMax * 0.04));

      // ★錬金術師なら状態異常ダメージ+50%
      dmg = applyAlchemistDotBonus(dmg);

      applyHp(-dmg);
      appendLog(`${name}は毒で${dmg}ダメージを受けた！`);
    }
  },
  burn: {
    id: "burn",
    name: "やけど",
    baseDuration: 3,
    onTurnEnd(targetCtx) {
      const hpMax = targetCtx.hpMax();
      const applyHp = targetCtx.applyHp;
      const name = targetCtx.name;
      let dmg = Math.max(1, Math.floor(hpMax * 0.03));

      // ★錬金術師なら状態異常ダメージ+50%
      dmg = applyAlchemistDotBonus(dmg);

      applyHp(-dmg);
      appendLog(`${name}はやけどで${dmg}ダメージを受けた！`);
    },
    modifyAttack(mult) {
      return mult * 0.9;
    }
  },
  bleed: {
    id: "bleed",
    name: "出血",
    baseDuration: 2,
    onTurnEnd(targetCtx) {
      const hpNow = targetCtx.hp();
      const applyHp = targetCtx.applyHp;
      const name = targetCtx.name;
      let dmg = Math.max(1, Math.floor(hpNow * 0.06));

      // ★錬金術師なら状態異常ダメージ+50%
      dmg = applyAlchemistDotBonus(dmg);

      applyHp(-dmg);
      appendLog(`${name}は出血で${dmg}ダメージを受けた！`);
    }
  },
  regen: {
    id: "regen",
    name: "リジェネ",
    baseDuration: 3,
    onTurnEnd(targetCtx) {
      const hpMax = targetCtx.hpMax();
      const applyHp = targetCtx.applyHp;
      const name = targetCtx.name;
      const heal = Math.max(1, Math.floor(hpMax * 0.04));
      applyHp(heal);
      appendLog(`${name}はリジェネで${heal}回復した！`);
    }
  },
  atk_up: {
    id: "atk_up",
    name: "攻撃アップ",
    baseDuration: 3,
    modifyAttack(mult) {
      return mult * 1.25;
    }
  },
  atk_down: {
    id: "atk_down",
    name: "攻撃ダウン",
    baseDuration: 3,
    modifyAttack(mult) {
      return mult * 0.8;
    }
  },
  def_up: {
    id: "def_up",
    name: "防御アップ",
    baseDuration: 3,
    modifyDefense(mult) {
      return mult * 0.75;
    }
  },
  def_down: {
    id: "def_down",
    name: "防御ダウン",
    baseDuration: 3,
    modifyDefense(mult) {
      return mult * 1.25;
    }
  },
  blind: {
    id: "blind",
    name: "暗闇",
    baseDuration: 3,
    modifyAccuracy(acc) {
      return acc - 0.3;
    }
  },
  paralyze: {
    id: "paralyze",
    name: "麻痺",
    baseDuration: 2,
    beforeAction(targetCtx) {
      if (Math.random() < 0.5) {
        appendLog(`${targetCtx.name}は麻痺して動けない！`);
        return false;
      }
      return true;
    }
  },
  sleep: {
    id: "sleep",
    name: "睡眠",
    baseDuration: 3,
    beforeAction(targetCtx, inst) {
      appendLog(`${targetCtx.name}は眠っていて動けない！`);
      return false;
    },
    onDamaged(targetCtx, inst) {
      inst.remain = 0;
      appendLog(`${targetCtx.name}は目を覚ました！`);
    }
  },
  confuse: {
    id: "confuse",
    name: "混乱",
    baseDuration: 2,
    beforeAction(targetCtx, inst, actionCtx) {
      if (Math.random() < 0.5) {
        actionCtx.forceTarget = "selfOrAlly";
        appendLog(`${targetCtx.name}は混乱している！`);
      }
      return true;
    }
  },
  silence: {
    id: "silence",
    name: "沈黙",
    baseDuration: 3,
    canUseMagic() {
      return false;
    }
  },
  crit_up: {
    id: "crit_up",
    name: "クリティカルアップ",
    baseDuration: 3,
    modifyCritRate(rate) {
      return rate + 0.2;
    }
  },

  // =======================
  // ポーションバフ（料理とは別ID）
  // =======================

  potion_atk_up_T1: {
    id: "potion_atk_up_T1",
    name: "ポーション:攻撃アップT1",
    baseDuration: 3,
    modifyAttack(mult) {
      return mult * 1.12; // 料理T1(1.10)より+0.02
    }
  },
  potion_atk_up_T2: {
    id: "potion_atk_up_T2",
    name: "ポーション:攻撃アップT2",
    baseDuration: 3,
    modifyAttack(mult) {
      return mult * 1.20; // 料理T2(1.18)より+0.02
    }
  },
  potion_atk_up_T3: {
    id: "potion_atk_up_T3",
    name: "ポーション:攻撃アップT3",
    baseDuration: 3,
    modifyAttack(mult) {
      return mult * 1.32; // 料理T3系(1.25〜1.30)より+0.02程度
    }
  },

  // 守護ポーション（防御アップポーション）
  potion_def_up_T1: {
    id: "potion_def_up_T1",
    name: "ポーション:防御アップT1",
    baseDuration: 3,
    modifyDefense(mult) {
      // 被ダメージ×0.70（30%カット）
      return mult * 0.70;
    }
  },
  potion_def_up_T2: {
    id: "potion_def_up_T2",
    name: "ポーション:防御アップT2",
    baseDuration: 3,
    modifyDefense(mult) {
      return mult * 0.60; // 料理T2(0.82)より-0.02
    }
  },
  potion_def_up_T3: {
    id: "potion_def_up_T3",
    name: "ポーション:防御アップT3",
    baseDuration: 3,
    modifyDefense(mult) {
      return mult * 0.50; // 料理T3系(0.70〜0.75)より-0.02程度
    }
  },

  // コンディションポーション用リジェネ
  potion_regen_T1: {
    id: "potion_regen_T1",
    name: "ポーション:リジェネT1",
    baseDuration: 3,
    onTurnEnd(targetCtx) {
      const hpMax = targetCtx.hpMax();
      const applyHp = targetCtx.applyHp;
      const name = targetCtx.name;
      const heal = Math.max(1, Math.floor(hpMax * 0.05)); // 通常リジェネ(0.04)より+1%
      applyHp(heal);
      appendLog(`${name}はポーションの効果で${heal}回復した！`);
    }
  },
  potion_regen_T2: {
    id: "potion_regen_T2",
    name: "ポーション:リジェネT2",
    baseDuration: 3,
    onTurnEnd(targetCtx) {
      const hpMax = targetCtx.hpMax();
      const applyHp = targetCtx.applyHp;
      const name = targetCtx.name;
      const heal = Math.max(1, Math.floor(hpMax * 0.06));
      applyHp(heal);
      appendLog(`${name}はポーションの効果で${heal}回復した！`);
    }
  },
  potion_regen_T3: {
    id: "potion_regen_T3",
    name: "ポーション:リジェネT3",
    baseDuration: 3,
    onTurnEnd(targetCtx) {
      const hpMax = targetCtx.hpMax();
      const applyHp = targetCtx.applyHp;
      const name = targetCtx.name;
      const heal = Math.max(1, Math.floor(hpMax * 0.07));
      applyHp(heal);
      appendLog(`${name}はポーションの効果で${heal}回復した！`);
    }
  },

  // =======================
  // 料理バフ（肉＝物理・魚＝魔法）
  // =======================

  // 肉系: 物理攻撃アップ（STR/物理与ダメ）
  food_meat_atk_T1: {
    id: "food_meat_atk_T1",
    name: "料理:物理攻撃アップT1",
    baseDuration: 30,
    modifyAttack(mult) {
      return mult * 1.10;
    }
  },
  food_meat_atk_T2: {
    id: "food_meat_atk_T2",
    name: "料理:物理攻撃アップT2",
    baseDuration: 45,
    modifyAttack(mult) {
      return mult * 1.18;
    }
  },
  food_meat_atk_T3: {
    id: "food_meat_atk_T3",
    name: "料理:物理攻撃アップT3",
    baseDuration: 60,
    modifyAttack(mult) {
      return mult * 1.25;
    }
  },
  food_meat_atk_steak_T2: {
    id: "food_meat_atk_steak_T2",
    name: "料理:物理攻撃アップ(ステーキT2)",
    baseDuration: 45,
    modifyAttack(mult) {
      return mult * 1.22;
    }
  },
  food_meat_atk_steak_T3: {
    id: "food_meat_atk_steak_T3",
    name: "料理:物理攻撃アップ(ステーキT3)",
    baseDuration: 60,
    modifyAttack(mult) {
      return mult * 1.30;
    }
  },
  food_meat_atk_roast_T3: {
    id: "food_meat_atk_roast_T3",
    name: "料理:物理攻撃アップ(ローストT3)",
    baseDuration: 60,
    modifyAttack(mult) {
      return mult * 1.28;
    }
  },

  // 野菜スープ系: 防御アップ
  food_veg_def_T1: {
    id: "food_veg_def_T1",
    name: "料理:防御アップT1",
    baseDuration: 30,
    modifyDefense(mult) {
      return mult * 0.90;
    }
  },
  food_veg_def_T2: {
    id: "food_veg_def_T2",
    name: "料理:防御アップT2",
    baseDuration: 45,
    modifyDefense(mult) {
      return mult * 0.82;
    }
  },
  food_veg_def_T3: {
    id: "food_veg_def_T3",
    name: "料理:防御アップT3",
    baseDuration: 60,
    modifyDefense(mult) {
      return mult * 0.75;
    }
  },
  food_veg_def_stew_T2: {
    id: "food_veg_def_stew_T2",
    name: "料理:防御アップ(シチューT2)",
    baseDuration: 45,
    modifyDefense(mult) {
      return mult * 0.78;
    }
  },
  food_veg_def_stew_T3: {
    id: "food_veg_def_stew_T3",
    name: "料理:防御アップ(シチューT3)",
    baseDuration: 60,
    modifyDefense(mult) {
      return mult * 0.70;
    }
  },
  food_veg_def_potage_T3: {
    id: "food_veg_def_potage_T3",
    name: "料理:防御アップ(ポタージュT3)",
    baseDuration: 60,
    modifyDefense(mult) {
      return mult * 0.72;
    }
  },
  food_veg_t2: {
    id: "food_veg_t2",
    name: "料理:防御アップ(汎用T2)",
    baseDuration: 45,
    modifyDefense(mult) {
      return mult * 0.80;
    }
  },
  food_veg_t3: {
    id: "food_veg_t3",
    name: "料理:防御アップ(汎用T3)",
    baseDuration: 60,
    modifyDefense(mult) {
      return mult * 0.72;
    }
  },

  // 魚スープ系: 魔法攻撃アップ（INT/魔法与ダメ）
  food_fish_int_T1: {
    id: "food_fish_int_T1",
    name: "料理:魔法攻撃アップT1",
    baseDuration: 30,
    modifyMagicAttack(mult) {
      return mult * 1.10;
    }
  },
  food_fish_int_T2: {
    id: "food_fish_int_T2",
    name: "料理:魔法攻撃アップT2",
    baseDuration: 45,
    modifyMagicAttack(mult) {
      return mult * 1.18;
    }
  },
  food_fish_int_T3: {
    id: "food_fish_int_T3",
    name: "料理:魔法攻撃アップT3",
    baseDuration: 60,
    modifyMagicAttack(mult) {
      return mult * 1.25;
    }
  },

  // 飲み物バフ
  drink_mp_regen_T1: {
    id: "drink_mp_regen_T1",
    name: "飲み物:回復T1",
    baseDuration: 30,
    onTurnEnd(targetCtx) {
      const mpMax = targetCtx.mpMax();
      const applyMp = targetCtx.applyMp;
      const name = targetCtx.name;
      const heal = Math.max(1, Math.floor(mpMax * 0.04)); // 4%
      applyMp(heal);
      appendLog(`${name}はハーブティーの効果でMPが${heal}回復した…`);
    }
  },
  drink_mp_regen_T2: {
    id: "drink_mp_regen_T2",
    name: "飲み物:回復T2",
    baseDuration: 45,
    onTurnEnd(targetCtx) {
      const mpMax = targetCtx.mpMax();
      const applyMp = targetCtx.applyMp;
      const name = targetCtx.name;
      const heal = Math.max(1, Math.floor(mpMax * 0.06)); // 6%
      applyMp(heal);
      appendLog(`${name}は濃縮ハーブティーの効果でMPが${heal}回復している…`);
    }
  },
  drink_mp_regen_T3: {
    id: "drink_mp_regen_T3",
    name: "飲み物:回復T3",
    baseDuration: 60,
    onTurnEnd(targetCtx) {
      const mpMax = targetCtx.mpMax();
      const applyMp = targetCtx.applyMp;
      const name = targetCtx.name;
      const heal = Math.max(1, Math.floor(mpMax * 0.08)); // 8%
      applyMp(heal);
      appendLog(`${name}は祝福のハーブティーの効果でMPが${heal}回復している…`);
    }
  },
  drink_sp_buff_T1: {
    id: "drink_sp_buff_T1",
    name: "飲み物:活力T1",
    baseDuration: 30,
    modifyAccuracy(acc) {
      return acc + 0.05;
    },
    modifyCritRate(rate) {
      return rate + 0.03;
    }
  },
  drink_sp_buff_T2: {
    id: "drink_sp_buff_T2",
    name: "飲み物:活力T2",
    baseDuration: 45,
    modifyAccuracy(acc) {
      return acc + 0.08;
    },
    modifyCritRate(rate) {
      return rate + 0.05;
    }
  },
  drink_sp_buff_T3: {
    id: "drink_sp_buff_T3",
    name: "飲み物:活力T3",
    baseDuration: 60,
    modifyAccuracy(acc) {
      return acc + 0.10;
    },
    modifyCritRate(rate) {
      return rate + 0.07;
    }
  }
};

// =======================
// 対象コンテキストヘルパ
// =======================
//
// hp / hpMax / enemyHp / enemyHpMax / currentEnemy は
// 他ファイルで定義されている前提。

function makePlayerCtx() {
  return {
    name: "あなた",
    hp: () => hp,
    hpMax: () => hpMax,
    applyHp: delta => {
      hp = Math.max(0, Math.min(hpMax, hp + delta));
    },
    // ★ MP 系（飲み物MPリジェネ用）
    mp: () => (typeof mp === "number" ? mp : 0),
    mpMax: () => (typeof mpMax === "number" ? mpMax : 0),
    applyMp: delta => {
      if (typeof mp === "number" && typeof mpMax === "number") {
        mp = Math.max(0, Math.min(mpMax, mp + delta));
      }
    }
  };
}

function makeEnemyCtx() {
  return {
    name: currentEnemy ? currentEnemy.name : "敵",
    hp: () => enemyHp,
    hpMax: () => enemyHpMax,
    applyHp: delta => {
      enemyHp = Math.max(0, Math.min(enemyHpMax, enemyHp + delta));
    }
  };
}

// =======================
// 状態の付与
// =======================

function addStatusToPlayer(id) {
  const def = STATUS_EFFECTS[id];
  if (!def) return;
  const ex = playerStatuses.find(s => s.id === id);
  if (ex) {
    ex.remain = Math.max(ex.remain, def.baseDuration);
  } else {
    playerStatuses.push({ id, remain: def.baseDuration, source: BUFF_SOURCE_OTHER });
  }
}

function addStatusToEnemy(id) {
  const def = STATUS_EFFECTS[id];
  if (!def || !currentEnemy) return;

  let baseDur = def.baseDuration || 0;

  // ★錬金術師なら状態異常ターン+25%
  if (typeof isAlchemist === "function" && isAlchemist()) {
    baseDur = Math.max(1, Math.floor(baseDur * 1.25));
  }

  const ex = enemyStatuses.find(s => s.id === id);
  if (ex) {
    ex.remain = Math.max(ex.remain, baseDur);
  } else {
    enemyStatuses.push({ id, remain: baseDur, source: BUFF_SOURCE_OTHER });
  }
}

// 料理バフ専用
function addFoodStatusToPlayer(id, durationOverride) {
  const def = STATUS_EFFECTS[id];
  if (!def) return;
  const baseDur = (typeof durationOverride === "number" && durationOverride > 0)
    ? durationOverride
    : (def.baseDuration || 0);

  const ex = playerStatuses.find(s => s.id === id && s.source === BUFF_SOURCE_FOOD);
  if (ex) {
    ex.remain = Math.max(ex.remain, baseDur);
  } else {
    playerStatuses.push({ id, remain: baseDur, source: BUFF_SOURCE_FOOD });
  }
}

// 飲み物バフ専用
function addDrinkStatusToPlayer(id, durationOverride) {
  const def = STATUS_EFFECTS[id];
  if (!def) return;
  const baseDur = (typeof durationOverride === "number" && durationOverride > 0)
    ? durationOverride
    : (def.baseDuration || 0);

  const ex = playerStatuses.find(s => s.id === id && s.source === BUFF_SOURCE_DRINK);
  if (ex) {
    ex.remain = Math.max(ex.remain, baseDur);
  } else {
    playerStatuses.push({ id, remain: baseDur, source: BUFF_SOURCE_DRINK });
  }
}

// ポーションバフ専用
function addPotionStatusToPlayer(id, durationOverride) {
  const def = STATUS_EFFECTS[id];
  if (!def) return;
  const baseDur = (typeof durationOverride === "number" && durationOverride > 0)
    ? durationOverride
    : (def.baseDuration || 0);

  const ex = playerStatuses.find(s => s.id === id && s.source === BUFF_SOURCE_POTION);
  if (ex) {
    ex.remain = Math.max(ex.remain, baseDur);
  } else {
    playerStatuses.push({ id, remain: baseDur, source: BUFF_SOURCE_POTION });
  }
}

// スキルバフ専用
function addSkillStatusToPlayer(id, durationOverride) {
  const def = STATUS_EFFECTS[id];
  if (!def) return;
  const baseDur = (typeof durationOverride === "number" && durationOverride > 0)
    ? durationOverride
    : (def.baseDuration || 0);

  const ex = playerStatuses.find(s => s.id === id && s.source === BUFF_SOURCE_SKILL);
  if (ex) {
    ex.remain = Math.max(ex.remain, baseDur);
  } else {
    playerStatuses.push({ id, remain: baseDur, source: BUFF_SOURCE_SKILL });
  }
}

// =======================
// 行動前チェック（麻痺・睡眠・混乱など）
// =======================

function beforeActionPlayer() {
  const ctx = makePlayerCtx();
  const actionCtx = {};
  for (const inst of playerStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.beforeAction) {
      const ok = def.beforeAction(ctx, inst, actionCtx);
      if (!ok) return { canAct: false };
    }
  }
  return { canAct: true, actionCtx };
}

function beforeActionEnemy() {
  if (!currentEnemy) return { canAct: false };
  const ctx = makeEnemyCtx();
  const actionCtx = {};
  for (const inst of enemyStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.beforeAction) {
      const ok = def.beforeAction(ctx, inst, actionCtx);
      if (!ok) return { canAct: false };
    }
  }
  return { canAct: true, actionCtx };
}

// =======================
// 攻防・命中補正
// =======================

// 物理攻撃補正
function applyAttackBuffsForPlayer(base) {
  let mult = 1.0;
  for (const inst of playerStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.modifyAttack) {
      mult = def.modifyAttack(mult);
    }
  }
  return Math.max(1, Math.floor(base * mult));
}

function applyAttackBuffsForEnemy(base) {
  let mult = 1.0;
  for (const inst of enemyStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.modifyAttack) {
      mult = def.modifyAttack(mult);
    }
  }
  return Math.max(1, Math.floor(base * mult));
}

// 防御補正
function applyDefenseBuffsForPlayer(damage) {
  let mult = 1.0;
  for (const inst of playerStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.modifyDefense) {
      mult = def.modifyDefense(mult);
    }
  }
  return Math.max(1, Math.floor(damage * mult));
}

function applyDefenseBuffsForEnemy(damage) {
  let mult = 1.0;
  for (const inst of enemyStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.modifyDefense) {
      mult = def.modifyDefense(mult);
    }
  }
  return Math.max(1, Math.floor(damage * mult));
}

// 魔法攻撃補正（プレイヤー）
function applyMagicAttackBuffsForPlayer(base) {
  let mult = 1.0;
  for (const inst of playerStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.modifyMagicAttack) {
      mult = def.modifyMagicAttack(mult);
    }
  }
  return Math.max(1, Math.floor(base * mult));
}

// 命中補正
function modifyAccuracyForPlayer(acc) {
  let a = acc;
  for (const inst of playerStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.modifyAccuracy) {
      a = def.modifyAccuracy(a);
    }
  }
  return a;
}

function modifyAccuracyForEnemy(acc) {
  let a = acc;
  for (const inst of enemyStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.modifyAccuracy) {
      a = def.modifyAccuracy(a);
    }
  }
  return a;
}

// ★クリティカル率補正（プレイヤー）
function modifyCritRateForPlayer(baseRate) {
  let r = baseRate;
  for (const inst of playerStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.modifyCritRate) {
      r = def.modifyCritRate(r);
    }
  }
  return r;
}

// =======================
// 被ダメージ時フック
// =======================

function onPlayerDamagedByEnemy() {
  const ctx = makePlayerCtx();
  for (const inst of playerStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.onDamaged) {
      def.onDamaged(ctx, inst);
    }
  }
  playerStatuses = playerStatuses.filter(s => s.remain > 0);
}

function onEnemyDamagedByPlayer() {
  const ctx = makeEnemyCtx();
  for (const inst of enemyStatuses) {
    const def = STATUS_EFFECTS[inst.id];
    if (def && def.onDamaged) {
      def.onDamaged(ctx, inst);
    }
  }
  enemyStatuses = enemyStatuses.filter(s => s.remain > 0);
}

// =======================
// ターン終了時処理
// =======================

function tickStatusesTurnEndForBoth() {
  {
    const ctx = makePlayerCtx();
    for (const inst of playerStatuses) {
      const def = STATUS_EFFECTS[inst.id];
      if (def && def.onTurnEnd) {
        def.onTurnEnd(ctx, inst);
      }
      inst.remain -= 1;
    }
    playerStatuses = playerStatuses.filter(s => s.remain > 0);
  }

  if (currentEnemy) {
    const ctx = makeEnemyCtx();
    for (const inst of enemyStatuses) {
      const def = STATUS_EFFECTS[inst.id];
      if (def && def.onTurnEnd) {
        def.onTurnEnd(ctx, inst);
      }
      inst.remain -= 1;
    }
    enemyStatuses = enemyStatuses.filter(s => s.remain > 0);
  }
}