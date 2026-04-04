// game-core-3.js
// 戦闘・ボス関連＋状態異常システム（探索や敵生成は game-core-5.js 側で担当）

// =======================
// シールドブロウ用ガードフラグ
// =======================
//
// 戦士スキル「シールドブロウ」で立つガード状態。
// skill-core.js からも enemyTurn からも共通で読む/書く。
let shieldBlowGuardTurnRemain = 0;

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
// 状態異常・バフデバフ定義
// =======================
//
// プレイヤー: playerStatuses
// 敵: enemyStatuses
//
// ターン管理は「プレイヤー行動＋敵行動」で1ターン進む前提。
// 毎ターン終了時に tickStatusesTurnEndForBoth を呼ぶ。

let playerStatuses = [];
let enemyStatuses  = [];

// 共通定義テーブル
const STATUS_EFFECTS = {
  poison: {
    id: "poison",
    name: "毒",
    baseDuration: 3,
    onTurnEnd(targetCtx) {
      const hpMax = targetCtx.hpMax();
      const applyHp = targetCtx.applyHp;
      const name = targetCtx.name;
      const dmg = Math.max(1, Math.floor(hpMax * 0.04));
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
      const dmg = Math.max(1, Math.floor(hpMax * 0.03));
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
      const dmg = Math.max(1, Math.floor(hpNow * 0.06));
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

  // 飲み物バフ（既存仕様を崩さず軽め）
  drink_mp_regen_T1: {
    id: "drink_mp_regen_T1",
    name: "飲み物:回復T1",
    baseDuration: 30,
    onTurnEnd(targetCtx) {
      appendLog("ハーブティーの効果で精神が落ち着いた…");
    }
  },
  drink_mp_regen_T2: {
    id: "drink_mp_regen_T2",
    name: "飲み物:回復T2",
    baseDuration: 45,
    onTurnEnd(targetCtx) {
      appendLog("濃縮ハーブティーの効果で集中力が高まっている…");
    }
  },
  drink_mp_regen_T3: {
    id: "drink_mp_regen_T3",
    name: "飲み物:回復T3",
    baseDuration: 60,
    onTurnEnd(targetCtx) {
      appendLog("祝福のハーブティーの効果で魔力があふれている…");
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

// 対象コンテキストヘルパ
function makePlayerCtx() {
  return {
    name: "あなた",
    hp: () => hp,
    hpMax: () => hpMax,
    applyHp: delta => {
      hp = Math.max(0, Math.min(hpMax, hp + delta));
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
  const ex = enemyStatuses.find(s => s.id === id);
  if (ex) {
    ex.remain = Math.max(ex.remain, def.baseDuration);
  } else {
    enemyStatuses.push({ id, remain: def.baseDuration, source: BUFF_SOURCE_OTHER });
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

// 行動前チェック（麻痺・睡眠・混乱など）
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

// ダメージ計算前の攻防補正（物理）
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

// 魔法攻撃用補正
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

// 命中率補正
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

// ダメージを受けたときのフック
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

// ターン終了時処理
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

// =======================
// 敵ステータス UI
// =======================

function updateEnemyStatusUI() {
  const area   = document.getElementById("enemyStatusArea");
  const nameEl = document.getElementById("enemyNameText");
  const hpEl   = document.getElementById("enemyHpText");
  const hpMaxEl= document.getElementById("enemyHpMaxText");

  if (!area || !nameEl || !hpEl || !hpMaxEl) return;

  if (currentEnemy) {
    area.style.display = "";
    nameEl.textContent  = currentEnemy.name || "-";
    hpEl.textContent    = enemyHp;
    hpMaxEl.textContent = enemyHpMax;
  } else {
    area.style.display = "none";
    nameEl.textContent  = "-";
    hpEl.textContent    = "0";
    hpMaxEl.textContent = "0";
  }
}

// =======================
// 戦闘開始・終了 共通処理
// =======================

function startBattleCommon(enemy, isBoss) {
  currentEnemy = enemy;
  enemyHpMax = enemy.hp;
  enemyHp = enemy.hp;
  isBossBattle = !!isBoss;

  enemyStatuses = [];

  setBattleCommandVisible(true);
  setExploreUIVisible(false);

if (typeof refreshBattleItemSelect === "function") {
    refreshBattleItemSelect();
  }

  updateEnemyStatusUI();
  if (typeof updateReturnTownButton === "function") {
    updateReturnTownButton();   // 戦闘中は帰還ボタン非表示
  }
  updateDisplay();
}

function endBattleCommon() {
  // 敵側は全リセット
  currentEnemy = null;
  enemyHp = 0;
  enemyHpMax = 0;
  isBossBattle = false;
  enemyStatuses = [];

  // 戦闘専用バフのみ消去し、料理/飲み物バフは残す
  playerStatuses = playerStatuses.filter(inst =>
    inst.source === BUFF_SOURCE_FOOD ||
    inst.source === BUFF_SOURCE_DRINK
  );

  setBattleCommandVisible(false);
  setExploreUIVisible(true);

  updateEnemyStatusUI();
  if (typeof updateReturnTownButton === "function") {
    updateReturnTownButton();   // 探索中なら帰還ボタン表示
  }
  updateDisplay();
}

// =======================
// 通常戦闘
// =======================

function startNormalBattle(enemy) {
  startBattleCommon(enemy, false);
}

function playerAttack() {
  if (!currentEnemy) {
    appendLog("攻撃する敵がいない");
    return;
  }

  const pre = beforeActionPlayer();
  if (!pre.canAct) {
    enemyTurn();
    tickStatusesTurnEndForBoth();
    updateEnemyStatusUI();
    updateDisplay();
    return;
  }

  let hitRate = 0.95;
  hitRate = modifyAccuracyForPlayer(hitRate);
  if (Math.random() > hitRate) {
    appendLog("あなたの攻撃は外れた！");
    enemyTurn();
    tickStatusesTurnEndForBoth();
    updateEnemyStatusUI();
    updateDisplay();
    return;
  }

  let baseDamage = Math.max(1, atkTotal - (currentEnemy.def || 0));
  baseDamage = applyAttackBuffsForPlayer(baseDamage);
  baseDamage = applyDefenseBuffsForEnemy(baseDamage);

  enemyHp -= baseDamage;
  onEnemyDamagedByPlayer();
  appendLog(`あなたの攻撃！ ${currentEnemy.name}に${baseDamage}ダメージ！`);

  if (enemyHp <= 0) {
    enemyHp = 0;

    if (typeof onEnemyDefeatedCore === "function") {
      onEnemyDefeatedCore(currentEnemy);
    } else {
      endBattleCommon();
    }
    return;
  }

  doPetTurn();
  if (enemyHp <= 0) {
    return;
  }

  enemyTurn();
  tickStatusesTurnEndForBoth();
  updateEnemyStatusUI();
  updateDisplay();
}

function enemyTurn() {
  if (!currentEnemy) return;

  const pre = beforeActionEnemy();
  if (!pre.canAct) {
    updateEnemyStatusUI();
    updateDisplay();
    return;
  }

  let target = "player";
  if (jobId === 2 && petHp > 0) {
    target = (Math.random() < 0.7) ? "pet" : "player";
  }

  if (target === "player") {
    let baseAtk = (currentEnemy.atk || 3);
    baseAtk = applyAttackBuffsForEnemy(baseAtk);

    let dmg = Math.max(1, baseAtk - defTotal);
    dmg = applyDefenseBuffsForPlayer(dmg);

    if (shieldBlowGuardTurnRemain > 0) {
      dmg = Math.floor(dmg * 0.5);
      shieldBlowGuardTurnRemain = 0;
      appendLog("シールドブロウの効果でダメージが軽減された！");
    }

    hp -= dmg;
    onPlayerDamagedByEnemy();
    appendLog(`${currentEnemy.name}の攻撃！ あなたに${dmg}ダメージ`);

    if (hp <= 0) {
      hp = 0;
      appendLog("あなたは倒れてしまった…");

      window.isExploring   = false;
      window.exploringArea = "field";

      hp    = hpMax;
      mp    = mpMax;
      sp    = spMax;
      petHp = petHpMax;

      money = Math.floor(money / 2);

      let brokeSomething = false;

      function reduceDurabilityOnEquip() {
        if (equippedWeaponId && Array.isArray(weapons)) {
          const w = weapons.find(x => x.id === equippedWeaponId);
          if (w && typeof w.durability === "number") {
            w.durability = Math.max(0, w.durability - 1);
            if (w.durability <= 0) {
              const cnt = weaponCounts[w.id] || 0;
              weaponCounts[w.id] = Math.max(0, cnt - 1);
              appendLog(`${w.name} は壊れてしまった…`);
              brokeSomething = true;
              if (weaponCounts[w.id] <= 0 && equippedWeaponId === w.id) {
                equippedWeaponId = null;
              }
            } else {
              brokeSomething = true;
            }
          }
        }

        if (equippedArmorId && Array.isArray(armors)) {
          const a = armors.find(x => x.id === equippedArmorId);
          if (a && typeof a.durability === "number") {
            a.durability = Math.max(0, a.durability - 1);
            if (a.durability <= 0) {
              const cnt = armorCounts[a.id] || 0;
              armorCounts[a.id] = Math.max(0, cnt - 1);
              appendLog(`${a.name} は壊れてしまった…`);
              brokeSomething = true;
              if (armorCounts[a.id] <= 0 && equippedArmorId === a.id) {
                equippedArmorId = null;
              }
            } else {
              brokeSomething = true;
            }
          }
        }

        if (typeof refreshEquipSelects === "function") {
          refreshEquipSelects();
        }
      }
      reduceDurabilityOnEquip();

      if (brokeSomething) {
        appendLog("街に戻った… 休んで回復し、所持ゴールドを半分失い、装備の耐久度が1減少した。");
      } else {
        appendLog("街に戻った… 休んで回復し、所持ゴールドを半分失った。");
      }

      endBattleCommon();
    } else {
      tickSkillBuffTurns();
      updateEnemyStatusUI();
      updateDisplay();
    }
  } else {
    let petDef  = Math.floor(petLevel * 0.5);
    let baseAtk = (currentEnemy.atk || 3);
    baseAtk     = applyAttackBuffsForEnemy(baseAtk);
    let dmg     = Math.max(1, baseAtk - petDef);

    petHp -= dmg;
    appendLog(`${currentEnemy.name}の攻撃！ ペットに${dmg}ダメージ`);

    if (petHp <= 0) {
      petHp = 0;
      appendLog("ペットは倒れてしまった…");
    }

    tickSkillBuffTurns();
    updateEnemyStatusUI();
    updateDisplay();
  }
}

// =======================
// ボス戦
// =======================

function startBossBattle() {
  const area = window.isExploring
    ? (window.exploringArea || getCurrentArea())
    : getCurrentArea();
  const bossId = AREA_BOSS_ID[area];
  if (!bossId) {
    appendLog("このエリアにはボスがいないようだ");
    return;
  }
  const boss = ENEMIES[bossId];
  if (!boss) {
    appendLog("ボスデータが見つからない");
    return;
  }

  areaBossAvailable[area] = false;
  updateBossButtonUI();

  appendLog(`${boss.name} が立ちはだかった！`);
  startBattleCommon(boss, true);
}

function onBossDefeated() {
  const area = window.isExploring
    ? (window.exploringArea || getCurrentArea())
    : getCurrentArea();

  if (typeof areaBossCleared !== "undefined") {
    areaBossCleared[area] = true;
  }

  if (typeof areaBossCleared !== "undefined") {
    if (area === "field") {
      areaBossCleared.forest = true;
      appendLog("草原のボスを倒した！ 森エリアが解放された！");
    } else if (area === "forest") {
      areaBossCleared.cave = true;
      appendLog("森のボスを倒した！ 洞窟エリアが解放された！");
    } else if (area === "cave") {
      areaBossCleared.mine = true;
      appendLog("洞窟のボスを倒した！ 廃鉱山エリアが解放された！");
    } else {
      appendLog("ボスを撃破した！");
    }
  } else {
    appendLog("ボスを撃破した！");
  }

  if (typeof refreshExploreAreaSelect === "function") {
    refreshExploreAreaSelect();
  }

  endBattleCommon();
}

// =======================
//逃走
// =======================

function tryEscape() {
  if (!currentEnemy) {
    appendLog("逃げる相手がいない");
    return;
  }
  const baseRate  = 0.4;
  const lukBonus  = LUK_ * 0.01;
  const rate      = Math.min(0.9, baseRate + lukBonus + escapeFailBonus);
  if (Math.random() < rate) {
    appendLog("うまく逃げ切れた！");
    escapeFailBonus = 0;
    endBattleCommon();
  } else {
    appendLog("逃走失敗！");
    escapeFailBonus += 0.1;
    enemyTurn();
    tickStatusesTurnEndForBoth();
    updateEnemyStatusUI();
    updateDisplay();
  }
}

// =======================
// 戦闘勝利共通処理
// =======================
function winBattle() {
  // 経験値・ドロップなどの処理
  if (typeof onEnemyDefeatedCore === "function") {
    if (currentEnemy) {
      onEnemyDefeatedCore(currentEnemy);
    } else {
      onEnemyDefeatedCore();
    }
  }

  // 敵情報クリアと探索UI復帰は共通処理に委譲
  endBattleCommon();
}
