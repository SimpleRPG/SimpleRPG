// game-core-3.js
// 探索・戦闘・ボス関連＋状態異常システム

// =======================
// グローバル状態
// =======================

// エリアごとの「今ボスに挑める状態か」
const areaBossAvailable = {
  field:  false,
  forest: false,
  cave:   false,
  mine:   false
};

// 探索滞在状態（UI側と共有）
window.isExploring   = false;      // 街にいる: false / どこか探索中: true
window.exploringArea = "field";    // 現在探索しているエリアID

// ポーション選択の記憶
let lastSelectedFieldPotionId  = null;
let lastSelectedBattlePotionId = null;

// =======================
// 状態異常・バフデバフ定義
// =======================
//
// プレイヤー: playerStatuses
// 敵: enemyStatuses
//
// ターン管理は「プレイヤー行動＋敵行動」で1ターン進む前提。
// 毎ターン終了時に tickStatusesTurnEnd を呼ぶ。

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

// 状態の付与
function addStatusToPlayer(id) {
  const def = STATUS_EFFECTS[id];
  if (!def) return;
  const ex = playerStatuses.find(s => s.id === id);
  if (ex) {
    ex.remain = Math.max(ex.remain, def.baseDuration);
  } else {
    playerStatuses.push({ id, remain: def.baseDuration });
  }
}

function addStatusToEnemy(id) {
  const def = STATUS_EFFECTS[id];
  if (!def || !currentEnemy) return;
  const ex = enemyStatuses.find(s => s.id === id);
  if (ex) {
    ex.remain = Math.max(ex.remain, def.baseDuration);
  } else {
    enemyStatuses.push({ id, remain: def.baseDuration });
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

// ダメージ計算前の攻防補正
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

// 命中率補正（プレイヤー→敵）
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
// 命中率補正（敵→プレイヤー）
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

// ダメージを受けたときのフック（睡眠解除など）
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
  // プレイヤー
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

  // 敵
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
// 敵・エリア関連ヘルパ
// =======================

function getRandomEnemyForArea(area) {
  const table = AREA_ENEMY_TABLE[area] || AREA_ENEMY_TABLE.field;

  if (Array.isArray(table)) {
    if (table.length === 0) return null;
    const id = table[Math.floor(Math.random() * table.length)];
    return ENEMIES[id] || null;
  }

  if (!table || !Array.isArray(table.enemyIds) || !Array.isArray(table.weights)) {
    return null;
  }

  const ids = table.enemyIds;
  const weights = table.weights;
  if (ids.length === 0 || ids.length !== weights.length) {
    return null;
  }

  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < ids.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      const id = ids[i];
      return ENEMIES[id] || null;
    }
  }
  const lastId = ids[ids.length - 1];
  return ENEMIES[lastId] || null;
}

function getCurrentArea() {
  const sel = document.getElementById("exploreTarget");
  return sel ? sel.value : "field";
}

// 探索UI（行き先＋探索ボタン）の表示切替
function setExploreUIVisible(visible) {
  const row = document.querySelector(".explore-header-row");
  if (row) row.style.display = visible ? "flex" : "none";
}

// =======================
// 探索エリアセレクト更新
// =======================

function refreshExploreAreaSelect() {
  const sel = document.getElementById("exploreTarget");
  if (!sel) return;

  const prev = sel.value;
  sel.innerHTML = "";

  {
    const opt = document.createElement("option");
    opt.value = "field";
    opt.textContent = "草原（敵弱い・素材ほぼ出ない）";
    sel.appendChild(opt);
  }

  if (typeof areaBossCleared === "undefined" || areaBossCleared.field) {
    const opt = document.createElement("option");
    opt.value = "forest";
    opt.textContent = "森（敵やや強い・草/木が少し出る）";
    sel.appendChild(opt);
  }

  if (typeof areaBossCleared === "undefined" || areaBossCleared.forest) {
    const opt = document.createElement("option");
    opt.value = "cave";
    opt.textContent = "洞窟（敵強い・素材少し）";
    sel.appendChild(opt);
  }

  if (typeof areaBossCleared === "undefined" || areaBossCleared.cave) {
    const opt = document.createElement("option");
    opt.value = "mine";
    opt.textContent = "廃鉱山（敵かなり強い・鉱石/皮レア）";
    sel.appendChild(opt);
  }

  const exists = Array.from(sel.options).some(o => o.value === prev);
  sel.value = exists ? prev : (sel.options[0]?.value || "field");

  if (typeof updateBossButtonUI === "function") {
    updateBossButtonUI();
  }
}

// =======================
// ボスボタン表示
// =======================

function updateBossButtonUI() {
  const bossBtn = document.getElementById("bossStartBtn");
  if (!bossBtn) return;

  const area = window.isExploring
    ? (window.exploringArea || getCurrentArea())
    : getCurrentArea();

  if (areaBossAvailable[area]) {
    bossBtn.style.display = "inline-block";
  } else {
    bossBtn.style.display = "none";
  }
}

// =======================
// 帰還ボタン表示制御
// =======================

function updateReturnTownButton() {
  const btn = document.getElementById("returnTownBtn");
  if (!btn) return;

  if (currentEnemy) {
    btn.style.display = "none";
    return;
  }

  if (window.isExploring) {
    btn.style.display = "inline-block";
  } else {
    btn.style.display = "none";
  }
}

// =======================
// 探索時のボス発見判定
// =======================

function tryFindBossOnExplore() {
  const area = window.isExploring
    ? (window.exploringArea || getCurrentArea())
    : getCurrentArea();
  if (areaBossAvailable[area]) return;

  const roll = Math.random();
  if (roll < 0.0005) {
    areaBossAvailable[area] = true;
    appendLog("強い気配を感じる… このエリアのボスに挑めるようになった！");
    updateBossButtonUI();
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
  updateDisplay();
}

function endBattleCommon() {
  currentEnemy = null;
  enemyHp = 0;
  enemyHpMax = 0;
  isBossBattle = false;

  enemyStatuses = [];
  playerStatuses = playerStatuses.filter(inst => false);

  setBattleCommandVisible(false);
  setExploreUIVisible(true);
  updateDisplay();
}

// =======================
// 通常戦闘
// =======================

function startNormalBattle(enemy) {
  startBattleCommon(enemy, false);
}

function playerAttack(){
  if(!currentEnemy){
    appendLog("攻撃する敵がいない");
    return;
  }

  const pre = beforeActionPlayer();
  if (!pre.canAct) {
    enemyTurn();
    tickStatusesTurnEndForBoth();
    updateDisplay();
    return;
  }

  let hitRate = 0.95;
  hitRate = modifyAccuracyForPlayer(hitRate);
  if (Math.random() > hitRate) {
    appendLog("あなたの攻撃は外れた！");
    enemyTurn();
    tickStatusesTurnEndForBoth();
    updateDisplay();
    return;
  }

  let baseDamage = Math.max(1, atkTotal - (currentEnemy.def || 0));
  baseDamage = applyAttackBuffsForPlayer(baseDamage);
  baseDamage = applyDefenseBuffsForEnemy(baseDamage);

  enemyHp -= baseDamage;
  onEnemyDamagedByPlayer();
  appendLog(`あなたの攻撃！ ${currentEnemy.name}に${baseDamage}ダメージ！`);

  if(enemyHp <= 0){
    enemyHp = 0;

    // ★ 空腹・水分状態に応じたEXP（5 or 8）を使用
    const expGain = getBattleExpPerWin(currentEnemy);
    const moneyGain = currentEnemy.money || 10;
    appendLog(`${currentEnemy.name}を倒した！ 経験値${expGain}と${moneyGain}Gを手に入れた`);

    addExp(expGain);
    money += moneyGain;
    addPetExp(Math.floor(expGain/2));

    // 行動として空腹・水分を進行させる
    handleHungerThirstOnAction("battleWin");

    if (isBossBattle) {
      onBossDefeated();
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
  updateDisplay();
}

function enemyTurn(){
  if (!currentEnemy) return;

  const pre = beforeActionEnemy();
  if (!pre.canAct) {
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
      shieldBlowGuardGuardTurnRemain = 0;
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

      hp = hpMax;
      mp = mpMax;
      sp = spMax;
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
      updateDisplay();
    }
  } else {
    let petDef = Math.floor(petLevel * 0.5);
    let baseAtk = (currentEnemy.atk || 3);
    baseAtk = applyAttackBuffsForEnemy(baseAtk);
    let dmg = Math.max(1, baseAtk - petDef);

    petHp -= dmg;
    appendLog(`${currentEnemy.name}の攻撃！ ペットに${dmg}ダメージ`);

    if (petHp <= 0) {
      petHp = 0;
      appendLog("ペットは倒れてしまった…");
    }

    tickSkillBuffTurns();
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
// 探索（ランダムイベント対応版）
// =======================

function doExploreEvent(area){
  if (currentEnemy) {
    appendLog("戦闘中は探索できない！");
    return;
  }

  if (!area) {
    area = window.isExploring
      ? (window.exploringArea || getCurrentArea())
      : getCurrentArea();
  }

  window.exploringArea = area;
  window.isExploring = true;

  tryFindBossOnExplore();

  const roll = Math.random();

  if (roll < 0.2) {
    appendLog("何も見つからなかった…");
    updateReturnTownButton();
    return;
  }

  if (roll < 0.4) {
    doExploreRandomEvent(area);
    updateReturnTownButton();
    return;
  }

  const enemy = getRandomEnemyForArea(area);
  if (!enemy) {
    appendLog("敵データが見つからない");
    updateReturnTownButton();
    return;
  }
  appendLog(`${enemy.name} が現れた！`);
  startNormalBattle(enemy);
}

function doExploreRandomEvent(area) {
  const roll = Math.random();

  if (roll < 0.34) {
    const maxHp = hpMax || 1;
    const damage = Math.max(1, Math.floor(maxHp * 0.05));
    hp = Math.max(0, hp - damage);
    appendLog("足元の罠が作動した！" + damage + "ダメージを受けた。");

    if (hp <= 0) {
      hp = 0;
      appendLog("あなたは罠で倒れてしまった…");

      window.isExploring   = false;
      window.exploringArea = "field";

      hp = hpMax;
      mp = mpMax;
      sp = spMax;
      petHp = petHpMax;

      money = Math.floor(money / 2);

      let brokeSomething = false;

      function reduceDurabilityOnEquipTrap() {
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
      reduceDurabilityOnEquipTrap();

      if (brokeSomething) {
        appendLog("街に戻った… 休んで回復し、所持ゴールドを半分失い、装備の耐久度が1減少した。");
      } else {
        appendLog("街に戻った… 休んで回復し、所持ゴールドを半分失った。");
      }

      updateReturnTownButton();
      updateDisplay();
      return;
    }

    updateDisplay();
    return;
  } else if (roll < 0.67) {
    let goldMin = 5;
    let goldMax = 15;

    if (area === "field") {
      goldMin = 5;   goldMax = 15;
    } else if (area === "forest") {
      goldMin = 10;  goldMax = 20;
    } else if (area === "cave") {
      goldMin = 20;  goldMax = 30;
    } else if (area === "mine") {
      goldMin = 30;  goldMax = 40;
    }

    const goldGain = goldMin + Math.floor(Math.random() * (goldMax - goldMin + 1));
    money = (money || 0) + goldGain;
    appendLog("小さな宝箱を見つけた！" + goldGain + "Gを手に入れた。");

    const dropCount = 1 + Math.floor(Math.random() * 2);
    const baseKeys = ["wood","ore","herb","cloth","leather","water"];
    const baseNames = { wood:"木", ore:"鉱石", herb:"草", cloth:"布", leather:"皮", water:"水" };

    for (let i = 0; i < dropCount; i++) {
      const matKey = baseKeys[Math.floor(Math.random() * baseKeys.length)];
      const m = materials[matKey];
      if (!m) continue;

      let tier = "t1";
      if (area === "field") {
        tier = (Math.random() < 0.9) ? "t1" : "t2";
      } else if (area === "forest") {
        const r = Math.random();
        if      (r < 0.1) tier = "t1";
        else if (r < 0.9) tier = "t2";
        else              tier = "t3";
      } else if (area === "cave") {
        const r = Math.random();
        if      (r < 0.1) tier = "t2";
        else if (r < 0.9) tier = "t3";
        else              tier = "t4";
      } else if (area === "mine") {
        tier = (Math.random() < 0.8) ? "t4" : "t3";
      }

      m[tier] = (m[tier] || 0) + 1;

      const tierLabel = tier.toUpperCase();
      const name = baseNames[matKey] || matKey;
      appendLog(`宝箱の中から ${tierLabel}${name} を1つ手に入れた。`);
    }

    updateDisplay();
    return;
  } else {
    const maxHp = hpMax || 1;
    const heal = Math.max(1, Math.floor(maxHp * 0.1));
    const beforeHp = hp;
    hp = Math.min(maxHp, hp + heal);

    const actualHeal = hp - beforeHp;
    if (actualHeal > 0) {
      appendLog("静かな泉でひと休みした。HPが " + actualHeal + " 回復した。");
    } else {
      appendLog("静かな泉でひと休みしたが、特に回復する必要はなかった。");
    }

    updateDisplay();
    return;
  }
}

// =======================
// 逃走
// =======================

function tryEscape(){
  if(!currentEnemy){
    appendLog("逃げる相手がいない");
    return;
  }
  const baseRate = 0.4;
  const lukBonus = LUK_ * 0.01;
  const rate = Math.min(0.9, baseRate + lukBonus + escapeFailBonus);
  if(Math.random() < rate){
    appendLog("うまく逃げ切れた！");
    escapeFailBonus = 0;
    endBattleCommon();
  }else{
    appendLog("逃走失敗！");
    escapeFailBonus += 0.1;
    enemyTurn();
    tickStatusesTurnEndForBoth();
  }
}

// =======================
// アイテム用セレクト再描画（ポーション）
// =======================

function refreshUseItemSelect() {
  const sel = document.getElementById("useItemSelect");
  if (!sel) return;

  const prev = lastSelectedFieldPotionId || sel.value || null;

  sel.innerHTML = "";

  for (const p of potions) {
    const cnt = potionCounts[p.id] || 0;
    if (cnt <= 0) continue;
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name}（${cnt}）`;
    sel.appendChild(opt);
  }

  if (prev && Array.from(sel.options).some(o => o.value === prev)) {
    sel.value = prev;
  }

  lastSelectedFieldPotionId = sel.value || null;
}

function refreshBattleItemSelect() {
  const sel = document.getElementById("battleItemSelect");
  if (!sel) return;

  const prev = lastSelectedBattlePotionId || sel.value || null;

  sel.innerHTML = "";

  for (const p of potions) {
    const cnt = potionCounts[p.id] || 0;
    if (cnt <= 0) continue;
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name}（${cnt}）`;
    sel.appendChild(opt);
  }

  if (prev && Array.from(sel.options).some(o => o.value === prev)) {
    sel.value = prev;
  }

  lastSelectedBattlePotionId = sel.value || null;
}

// =======================
// アイテム使用（フィールド / 戦闘）
// =======================

function usePotionOutsideBattle(){
  const sel = document.getElementById("useItemSelect");
  if(!sel || !sel.value){
    appendLog("使うアイテムを選んでください");
    return;
  }
  const id = sel.value;
  const p = potions.find(x=>x.id===id);
  if(!p){ appendLog("そのアイテムは存在しない"); return; }
  if(potionCounts[id]<=0){
    appendLog("そのアイテムを持っていない");
    refreshUseItemSelect();
    return;
  }

  lastSelectedFieldPotionId = id;

  const prevHp = hp;
  const prevMp = mp;

  applyPotionEffect(p, false);
  potionCounts[id]--;

  if (p.type === POTION_TYPE_HP) {
    const healed = hp - prevHp;
    appendLog(`${p.name} を使用した（HP ${prevHp} → ${hp}、+${healed}）`);
  } else if (p.type === POTION_TYPE_MP) {
    const healed = mp - prevMp;
    appendLog(`${p.name} を使用した（MP ${prevMp} → ${mp}、+${healed}）`);
  } else if (p.type === POTION_TYPE_BOTH) {
    const healedHp = hp - prevHp;
    const healedMp = mp - prevMp;
    appendLog(`${p.name} を使用した（HP ${prevHp} → ${hp}、+${healedHp} / MP ${prevMp} → ${mp}、+${healedMp}）`);
  }

  refreshUseItemSelect();
  updateDisplay();
}

function useBattleItem(){
  const sel = document.getElementById("battleItemSelect");
  if(!sel || !sel.value){
    appendLog("戦闘で使うアイテムを選んでください");
    return;
  }
  const id = sel.value;
  const p = potions.find(x=>x.id===id);
  if(!p){ appendLog("そのアイテムは存在しない"); return; }
  if(potionCounts[id]<=0){
    appendLog("そのアイテムを持っていない");
    refreshBattleItemSelect();
    return;
  }

  lastSelectedBattlePotionId = id;

  const prevHp = hp;
  const prevMp = mp;

  applyPotionEffect(p, true);
  potionCounts[id]--;

  if (p.type === POTION_TYPE_HP) {
    const healed = hp - prevHp;
    appendLog(`戦闘中に ${p.name} を使用した（HP ${prevHp} → ${hp}、+${healed}）`);
  } else if (p.type === POTION_TYPE_MP) {
    const healed = mp - prevMp;
    appendLog(`戦闘中に ${p.name} を使用した（MP ${prevMp} → ${mp}、+${healed}）`);
  } else if (p.type === POTION_TYPE_BOTH) {
    const healedHp = hp - prevHp;
    const healedMp = mp - prevMp;
    appendLog(`戦闘中に ${p.name} を使用した（HP ${prevHp} → ${hp}、+${healedHp} / MP ${prevMp} → ${mp}、+${healedMp}）`);
  }

  refreshBattleItemSelect();

  if(currentEnemy){
    enemyTurn();
    tickStatusesTurnEndForBoth();
  }
  updateDisplay();
}

function applyPotionEffect(p, inBattle){
  if(p.type === POTION_TYPE_HP){
    const heal = (p.power <= 1)
      ? Math.max(1, Math.floor(hpMax * p.power))
      : Math.floor(p.power);
    const before = hp;
    hp = Math.min(hpMax, hp + heal);
    const actual = hp - before;
    appendLog(`HPが${actual}回復した`);
  } else if(p.type === POTION_TYPE_MP){
    const heal = (p.power <= 1)
      ? Math.max(1, Math.floor(mpMax * p.power))
      : Math.floor(p.power);
    const before = mp;
    mp = Math.min(mpMax, mp + heal);
    const actual = mp - before;
    appendLog(`MPが${actual}回復した`);
  } else if(p.type === POTION_TYPE_BOTH){
    const healHp = (p.power <= 1)
      ? Math.max(1, Math.floor(hpMax * p.power))
      : Math.floor(p.power);
    const healMp = (p.power <= 1)
      ? Math.max(1, Math.floor(mpMax * p.power))
      : Math.floor(p.power);

    const beforeHp = hp;
    const beforeMp = mp;

    hp = Math.min(hpMax, hp + healHp);
    mp = Math.min(mpMax, mp + healMp);

    const actualHp = hp - beforeHp;
    const actualMp = mp - beforeMp;
    appendLog(`HPが${actualHp}回復し、MPが${actualMp}回復した`);
  } else if(p.type === POTION_TYPE_DAMAGE){
    if(!inBattle || !currentEnemy){
      appendLog("爆弾は戦闘中にしか使えない");
      return;
    }

    let dmg = 0;
    if (p.id === "bomb_T1" || p.id === "bomb") {
      dmg = 10;
    } else if (p.id === "bomb_T2") {
      dmg = 50;
    } else if (p.id === "bomb_T3") {
      dmg = 100;
    } else {
      dmg = p.power || 5;
    }

    enemyHp -= dmg;
    onEnemyDamagedByPlayer();
    appendLog(`爆弾を投げつけた！ ${currentEnemy.name}に${dmg}ダメージ！`);
    if(enemyHp <= 0){
      enemyHp = 0;

      const expGain = getBattleExpPerWin(currentEnemy);
      const moneyGain = currentEnemy.money || 10;
      appendLog(`${currentEnemy.name}を倒した！ 経験値${expGain}と${moneyGain}Gを手に入れた`);

      addExp(expGain);
      money += moneyGain;
      addPetExp(Math.floor(expGain/2));

      handleHungerThirstOnAction("battleWin");

      if (isBossBattle) {
        onBossDefeated();
      } else {
        endBattleCommon();
      }
    }
  }
}

// =======================
// 初期化
// =======================

let firstJobMessageShown = false;

function initGame() {
  if (typeof refreshEquipSelects === "function") {
    refreshEquipSelects();
  }

  if (typeof refreshExploreAreaSelect === "function") {
    refreshExploreAreaSelect();
  }

  if (typeof refreshUseItemSelect === "function") {
    refreshUseItemSelect();
  }
  if (typeof refreshBattleItemSelect === "function") {
    refreshBattleItemSelect();
  }

  updateDisplay();

  if (typeof setBattleCommandVisible === "function") {
    setBattleCommandVisible(false);
  }

  if (typeof refreshSkillUIs === "function") {
    refreshSkillUIs();
  }

  if (typeof jobId === "undefined" || jobId === null) {
    if (typeof openJobModal === "function") {
      openJobModal();
    }
    if (!firstJobMessageShown && typeof setLog === "function") {
      setLog("最初の職業を選んでください。");
      firstJobMessageShown = true;
    }
  }

  if (typeof updateSkillButtonsByJob === "function") {
    updateSkillButtonsByJob();
  }
  if (typeof updateBattleSkillUIByJob === "function") {
    updateBattleSkillUIByJob();
  }

  if (typeof updateBossButtonUI === "function") {
    updateBossButtonUI();
  }

  if (typeof updateReturnTownButton === "function") {
    updateReturnTownButton();
  }
}