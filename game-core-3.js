// game-core-3.js
// 戦闘・ボス関連（探索や敵生成は game-core-5.js 側で担当）
//
// 状態異常・バフデバフの定義＆ロジックは status-effects-core.js 側に分離。

// =======================
// シールドブロウ用ガードフラグ
// =======================
//
// 戦士スキル「シールドブロウ」で立つガード状態。
// skill-core.js からも enemyTurn からも共通で読む/書く。
let shieldBlowGuardTurnRemain = 0;

// =======================
// 戦闘用スキルツリーボーナスキャッシュ
// =======================
//
// 毎回 getGlobalSkillTreeBonus() を呼ぶと重いので、
// 戦闘中はゲーム開始時・スキル習得時・ステ再計算時に
// まとめてキャッシュしておき、ここから読む。
let battleSkillTreeBonus = {
  combatGuardReductionRate: 0,
  combatPostBattleHpRate: 0,
  moneyGainRateBattle: 0
};

// スキルツリーボーナスの再読込（recalcStats / learnSkillNode 後などで呼ばれる想定）
function refreshBattleSkillTreeBonus() {
  if (typeof getGlobalSkillTreeBonus === "function") {
    const b = getGlobalSkillTreeBonus() || {};
    battleSkillTreeBonus.combatGuardReductionRate = b.combatGuardReductionRate || 0;
    battleSkillTreeBonus.combatPostBattleHpRate   = b.combatPostBattleHpRate   || 0;
    battleSkillTreeBonus.moneyGainRateBattle      = b.moneyGainRateBattle      || 0;
  } else {
    battleSkillTreeBonus.combatGuardReductionRate = 0;
    battleSkillTreeBonus.combatPostBattleHpRate   = 0;
    battleSkillTreeBonus.moneyGainRateBattle      = 0;
  }
}

// =======================
// クリティカル関連ヘルパ
// =======================

// LUKから減衰付きの「素クリ率」を計算（バフを含まない部分）
// 目的: LUK が無限に伸びても素クリ率は 50% 付近で頭打ち
function getBaseCritRateFromLuk() {
  const luk = typeof LUK_ === "number" ? LUK_ : 0;

  // まず直線で「潜在クリ率」を計算（基礎5%＋LUK×0.2% 相当）
  // LUK100 → 0.25, LUK200 → 0.45 くらいのイメージ
  const raw = 0.05 + luk * 0.002;

  // 飽和関数で 0.5 に収束させる
  const K = 0.5; // 調整パラメータ
  const baseCrit = (raw * 0.5) / (raw + K); // 最大 0.5 に近づく

  // 念のためハード上限
  return Math.min(baseCrit, 0.5);
}

// LUKから「素のクリティカルダメージ倍率」を計算
// 基本1.5倍〜LUKを積むと2.0倍付近まで（バフなし）を想定
function getBaseCritMultFromLuk() {
  const luk = typeof LUK_ === "number" ? LUK_ : 0;

  // LUKスケールを作る（大きいほど上がるが飽和）
  const s = 0.01; // スケール
  const x = luk * s; // LUK100 → 1.0, LUK300 → 3.0 など

  // 0〜1のボーナスに変換して最大+0.5（=2.0倍）まで
  const K = 1.5; // 調整パラメータ
  const bonus = (x > 0) ? (x / (x + K)) : 0; // 0〜1に収束
  const mult = 1.5 + 0.5 * bonus;           // 1.5〜2.0

  return mult;
}

// クリダメ倍率に段階的減衰＋最終3.0倍上限を適用する
function applyCritMultDiminishing(mult) {
  let m = mult;

  // 2.0〜2.5 の区間は伸びを半分に圧縮
  if (m > 2.0) {
    const over = m - 2.0;
    m = 2.0 + over * 0.5;
  }

  // 2.5〜3.0 の区間はさらに1/3に圧縮
  if (m > 2.5) {
    const over = m - 2.5;
    m = 2.5 + over * 0.33;
  }

  // 最終ハードキャップ 3.0倍
  if (m > 3.0) {
    m = 3.0;
  }

  return m;
}

// =======================
// 戦闘統計
// =======================
//
// total: 戦闘回数（勝ち/負け/逃走の合計）
// win / lose / escape: 結果別回数
// maxDamage: 1戦内の最大与ダメージの通算最大
// maxTaken: 1戦内の最大被ダメージの通算最大
// maxCombo: 現状コンボ未実装のため常に0（あとで拡張余地を残す）
// maxPhysDamage / maxMagicDamage / maxPetDamage: 系統別の最大与ダメージ

const battleStats = {
  total: 0,
  win: 0,
  lose: 0,
  escape: 0,
  maxDamage: 0,
  maxTaken: 0,
  maxCombo: 0,
  maxPhysDamage: 0,   // 物理（通常攻撃＋物理スキル）
  maxMagicDamage: 0,  // 魔法（各種魔法スキル）
  maxPetDamage: 0     // ペット（ペット攻撃・ペットスキル）
};

let currentBattleMaxDamage = 0;
let currentBattleMaxTaken  = 0;
let currentBattleMaxCombo  = 0;
let currentBattleMaxPhys   = 0;
let currentBattleMaxMagic  = 0;
let currentBattleMaxPet    = 0;

function getBattleStats() {
  return battleStats;
}

function resetCurrentBattleStats() {
  currentBattleMaxDamage = 0;
  currentBattleMaxTaken  = 0;
  currentBattleMaxCombo  = 0;
  currentBattleMaxPhys   = 0;
  currentBattleMaxMagic  = 0;
  currentBattleMaxPet    = 0;
}

function commitCurrentBattleStats(resultType) {
  battleStats.total++;
  if (resultType === "win") {
    battleStats.win++;
  } else if (resultType === "lose") {
    battleStats.lose++;
  } else if (resultType === "escape") {
    battleStats.escape++;
  }

  if (currentBattleMaxDamage > battleStats.maxDamage) {
    battleStats.maxDamage = currentBattleMaxDamage;
  }
  if (currentBattleMaxTaken > battleStats.maxTaken) {
    battleStats.maxTaken = currentBattleMaxTaken;
  }
  if (currentBattleMaxCombo > battleStats.maxCombo) {
    battleStats.maxCombo = currentBattleMaxCombo;
  }

  if (currentBattleMaxPhys > battleStats.maxPhysDamage) {
    battleStats.maxPhysDamage = currentBattleMaxPhys;
  }
  if (currentBattleMaxMagic > battleStats.maxMagicDamage) {
    battleStats.maxMagicDamage = currentBattleMaxMagic;
  }
  if (currentBattleMaxPet > battleStats.maxPetDamage) {
    battleStats.maxPetDamage = currentBattleMaxPet;
  }
}

// =======================
// 戦闘ギルド用依頼進捗フラグ（初期値だけ）
// =======================
//
// 実際のカウント処理や名声付与は guild.js 側の
// onEnemyKilledForGuild({ by, isBoss }) に統一して任せる。

window.guildQuestProgress = window.guildQuestProgress || {};
window.guildQuestProgress.warrior_kill_30_phys = window.guildQuestProgress.warrior_kill_30_phys || { count: 0, done: false };
window.guildQuestProgress.mage_kill_30_magic   = window.guildQuestProgress.mage_kill_30_magic   || { count: 0, done: false };
window.guildQuestProgress.tamer_kill_30_pet    = window.guildQuestProgress.tamer_kill_30_pet    || { count: 0, done: false };
window.guildQuestProgress.battle_boss_1        = window.guildQuestProgress.battle_boss_1        || { count: 0, done: false };

// =======================
// 状態 UI 関連（定義・ロジックは status-effects-core.js）
// =======================

// プレイヤー状態アイコン描画
function renderPlayerStatusIcons() {
  const row = document.getElementById("statusEffectPlayer");
  if (!row) return;
  row.innerHTML = "";
  if (!playerStatuses.length) return;
  for (const inst of playerStatuses) {
    if (inst.remain <= 0) continue;
    const def = STATUS_EFFECTS[inst.id];
    const span = document.createElement("span");
    span.className = "status-effect-badge";
    span.textContent = `${def ? def.name : inst.id}(${inst.remain})`;
    row.appendChild(span);
  }
}

// 敵状態アイコン描画
function renderEnemyStatusIcons() {
  const row = document.getElementById("statusEffectEnemy");
  if (!row) return;
  row.innerHTML = "";
  if (!enemyStatuses.length) return;
  for (const inst of enemyStatuses) {
    if (inst.remain <= 0) continue;
    const def = STATUS_EFFECTS[inst.id];
    const span = document.createElement("span");
    span.className = "status-effect-badge";
    span.textContent = `${def ? def.name : inst.id}(${inst.remain})`;
    row.appendChild(span);
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

  // 敵の状態アイコンもここで更新
  renderEnemyStatusIcons();
}

// =======================
// 戦闘開始・終了 共通処理
// =======================

function startBattleCommon(enemy, isBoss) {
  // ★戦闘ごとに一時カウンタをリセット
  resetCurrentBattleStats();

  currentEnemy = enemy;
  enemyHpMax = enemy.hp;
  enemyHp = enemy.hp;
  isBossBattle = !!isBoss;

  enemyStatuses = [];

  // ★戦闘開始時にスキルツリーボーナスをキャッシュしておく
  refreshBattleSkillTreeBonus();

  setBattleCommandVisible(true);
  setExploreUIVisible(false);
  if (typeof setFieldItemRowsVisible === "function") {
    setFieldItemRowsVisible(false); // ★戦闘開始時にフィールド用3行を隠す
  }

  if (typeof refreshBattleItemSelect === "function") {
    refreshBattleItemSelect();
  }

  // 開始時に状態表示もリフレッシュ
  renderPlayerStatusIcons();
  updateEnemyStatusUI();
  if (typeof updateReturnTownButton === "function") {
    updateReturnTownButton();
  }
  updateDisplay();
}

function endBattleCommon() {
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
  if (typeof setFieldItemRowsVisible === "function") {
    setFieldItemRowsVisible(true); // ★戦闘終了時にフィールド用3行を再表示
  }

  renderPlayerStatusIcons();
  updateEnemyStatusUI();
  if (typeof updateReturnTownButton === "function") {
    updateReturnTownButton();
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

  // ★修正: beforeActionPlayer から actionCtx を受け取り、混乱時ターゲット変更に使う
  const pre = beforeActionPlayer();
  if (!pre || !pre.canAct) {
    enemyTurn();
    tickStatusesTurnEndForBoth();
    renderPlayerStatusIcons();
    updateEnemyStatusUI();
    updateDisplay();
    return;
  }
  const actionCtx = pre.actionCtx || {};

  // ターゲット決定（混乱で自分を殴る場合にのみ変化）
  let targetType = "enemy"; // "enemy" | "self"
  if (actionCtx.forceTarget === "selfOrAlly") {
    targetType = "self";
  }

  // 命中判定は「敵に向けた攻撃」の時だけ行う（自傷は必中扱い）
  let isHit = true;
  if (targetType === "enemy") {
    let hitRate = 0.95;
    hitRate = modifyAccuracyForPlayer(hitRate);
    if (Math.random() > hitRate) {
      appendLog("あなたの攻撃は外れた！");
      enemyTurn();
      tickStatusesTurnEndForBoth();
      renderPlayerStatusIcons();
      updateEnemyStatusUI();
      updateDisplay();
      return;
    }
  }

  // ダメージ計算共通部分（物理攻撃）
  let baseDamage = Math.max(1, atkTotal - (currentEnemy.def || 0));
  baseDamage = applyAttackBuffsForPlayer(baseDamage);
  baseDamage = applyDefenseBuffsForEnemy(baseDamage);

  // ★修正: クリティカル判定
  // 素クリ率は LUK から計算し、バフは modifyCritRateForPlayer で加算（最終70%上限は status-effects 側）
  let critRate = 0.05;
  if (typeof getBaseCritRateFromLuk === "function") {
    critRate = getBaseCritRateFromLuk();
  }
  if (typeof modifyCritRateForPlayer === "function") {
    critRate = modifyCritRateForPlayer(critRate);
  }
  let isCrit = Math.random() < critRate;

  let finalDamage = baseDamage;
  if (isCrit) {
    // クリダメ倍率: LUK由来の素倍率 → バフ → 減衰 → 最終3.0倍上限
    let critMult = 1.5;
    if (typeof getBaseCritMultFromLuk === "function") {
      critMult = getBaseCritMultFromLuk();
    }
    if (typeof modifyCritMultForPlayer === "function") {
      critMult = modifyCritMultForPlayer(critMult);
    }
    if (typeof applyCritMultDiminishing === "function") {
      critMult = applyCritMultDiminishing(critMult);
    }
    finalDamage = Math.floor(finalDamage * critMult);
  }

  if (targetType === "enemy") {
    enemyHp -= finalDamage;

    // ★戦闘内の最大与ダメージを更新（物理系としてもカウント）
    if (finalDamage > currentBattleMaxDamage) {
      currentBattleMaxDamage = finalDamage;
    }
    if (finalDamage > currentBattleMaxPhys) {
      currentBattleMaxPhys = finalDamage;
    }

    onEnemyDamagedByPlayer();
    if (isCrit) {
      appendLog(`クリティカル！ あなたの攻撃！ ${currentEnemy.name}に${finalDamage}ダメージ！`);
    } else {
      appendLog(`あなたの攻撃！ ${currentEnemy.name}に${finalDamage}ダメージ！`);
    }

    if (enemyHp <= 0) {
      enemyHp = 0;

      // 物理通常攻撃でトドメを刺したので、ギルド用ヘルパーに通知
      if (typeof onEnemyKilledForGuild === "function") {
        onEnemyKilledForGuild({ by: "phys", isBoss: !!isBossBattle });
      }

      winBattle(true, "phys");
      return;
    }

    // ★修正: ペット選択済みかつHP>0のときのみペットターンを実行
    if (typeof hasCompanion === "function" && hasCompanion() && petHp > 0) {
      doPetTurn();
    }

    if (enemyHp <= 0) {
      enemyHp = 0;

      // ペットがトドメを刺した場合
      if (typeof onEnemyKilledForGuild === "function") {
        onEnemyKilledForGuild({ by: "pet", isBoss: !!isBossBattle });
      }

      winBattle(true, "pet");
      return;
    }

    enemyTurn();
    tickStatusesTurnEndForBoth();
    renderPlayerStatusIcons();
    updateEnemyStatusUI();
    updateDisplay();
  } else {
    // ====== 混乱時: 自分を殴る処理 ======
    let selfDmg = finalDamage;

    // プレイヤー側防御とバフ・デバフを通す
    selfDmg = Math.max(1, selfDmg - defTotal);
    selfDmg = applyDefenseBuffsForPlayer(selfDmg);

    hp -= selfDmg;

    // 被ダメージ統計更新
    if (selfDmg > currentBattleMaxTaken) {
      currentBattleMaxTaken = selfDmg;
    }

    if (isCrit) {
      appendLog(`クリティカル！ 混乱したあなたは自分を攻撃し、${selfDmg}ダメージを受けた！`);
    } else {
      appendLog(`混乱したあなたは自分を攻撃し、${selfDmg}ダメージを受けた！`);
    }

    if (hp <= 0) {
      hp = 0;
      appendLog("あなたは倒れてしまった…");

      // ★死亡時は撤退状態も必ずリセット（罠死亡と同じ挙動に揃える）
      window.isRetreating     = false;
      window.retreatTurnsLeft = 0;

      window.isExploring   = false;
      window.exploringArea = "field";

      hp    = hpMax;
      mp    = mpMax;
      sp    = spMax;
      petHp = petHpMax;

      money = Math.floor(money / 2);

      let brokeSomething = false;

      function reduceDurabilityOnEquip() {
        if (typeof equippedWeaponIndex === "number" &&
            Array.isArray(window.weaponInstances)) {
          const idx = equippedWeaponIndex;
          const inst = window.weaponInstances[idx];
          if (inst) {
            inst.durability = Math.max(0, (inst.durability ?? MAX_DURABILITY) - 30);
            if (inst.durability <= 0) {
              const wName = (weapons.find(w => w.id === inst.id)?.name) || inst.id;
              appendLog(`${wName} は壊れて消滅した…`);
              const cnt = weaponCounts[inst.id] || 0;
              weaponCounts[inst.id] = Math.max(0, cnt - 1);
              window.weaponInstances.splice(idx, 1);
              equippedWeaponIndex = null;
              equippedWeaponId    = null;
              brokeSomething = true;
            } else {
              brokeSomething = true;
            }
          }
        }

        if (typeof equippedArmorIndex === "number" &&
            Array.isArray(window.armorInstances)) {
          const idx = equippedArmorIndex;
          const inst = window.armorInstances[idx];
          if (inst) {
            inst.durability = Math.max(0, (inst.durability ?? MAX_DURABILITY) - 30);
            if (inst.durability <= 0) {
              const aName = (armors.find(a => a.id === inst.id)?.name) || inst.id;
              appendLog(`${aName} は壊れて消滅した…`);
              const cnt = armorCounts[inst.id] || 0;
              armorCounts[inst.id] = Math.max(0, cnt - 1);
              window.armorInstances.splice(idx, 1);
              equippedArmorIndex = null;
              equippedArmorId    = null;
              brokeSomething = true;
            } else {
              brokeSomething = true;
            }
          }
        }

        if (!Array.isArray(window.weaponInstances) && equippedWeaponId && Array.isArray(weapons)) {
          const w = weapons.find(x => x.id === equippedWeaponId);
          if (w && typeof w.durability === "number") {
            w.durability = Math.max(0, w.durability - 30);
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

        if (!Array.isArray(window.armorInstances) && equippedArmorId && Array.isArray(armors)) {
          const a = armors.find(x => x.id === equippedArmorId);
          if (a && typeof a.durability === "number") {
            a.durability = Math.max(0, a.durability - 30);
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
        if (typeof recalcStats === "function") {
          recalcStats();
        } else {
          updateDisplay();
        }
      }

      reduceDurabilityOnEquip();

      if (brokeSomething) {
        appendLog("街に戻った… 休んで回復し、所持ゴールドを半分失い、装備の耐久度が30減少した。");
      } else {
        appendLog("街に戻った… 休んで回復し、所持ゴールドを半分失った。");
      }

      // ★戦闘統計に「敗北」を反映
      commitCurrentBattleStats("lose");

      endBattleCommon();
    } else {
      tickSkillBuffTurns();
      renderPlayerStatusIcons();
      updateEnemyStatusUI();
      updateDisplay();
    }
  }
}

function enemyTurn() {
  if (!currentEnemy) return;

  const pre = beforeActionEnemy();
  if (!pre.canAct) {
    renderPlayerStatusIcons();
    updateEnemyStatusUI();
    updateDisplay();
    return;
  }

  let target = "player";
  // ★修正: 動物使いかつペット選択済みかつHP>0のときだけペットをターゲット候補に
  if (jobId === 2 && typeof hasCompanion === "function" && hasCompanion() && petHp > 0) {
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

    // ★スキルツリー: 戦闘ガード系ボーナス（最終被ダメージ-％）
    if (battleSkillTreeBonus.combatGuardReductionRate > 0) {
      const rate = battleSkillTreeBonus.combatGuardReductionRate;
      dmg = Math.max(1, Math.floor(dmg * (1 - rate)));
    }

    hp -= dmg;

    // ★戦闘内の最大被ダメージを更新（プレイヤーに対して）
    if (dmg > currentBattleMaxTaken) {
      currentBattleMaxTaken = dmg;
    }

    onPlayerDamagedByEnemy();
    appendLog(`${currentEnemy.name}の攻撃！ あなたに${dmg}ダメージ`);

    if (hp <= 0) {
      hp = 0;
      appendLog("あなたは倒れてしまった…");

      // ★死亡時は撤退状態も必ずリセット（罠死亡と同じ挙動に揃える）
      window.isRetreating     = false;
      window.retreatTurnsLeft = 0;

      window.isExploring   = false;
      window.exploringArea = "field";

      hp    = hpMax;
      mp    = mpMax;
      sp    = spMax;
      petHp = petHpMax;

      money = Math.floor(money / 2);

      let brokeSomething = false;

      function reduceDurabilityOnEquip() {
        if (typeof equippedWeaponIndex === "number" &&
            Array.isArray(window.weaponInstances)) {
          const idx = equippedWeaponIndex;
          const inst = window.weaponInstances[idx];
          if (inst) {
            inst.durability = Math.max(0, (inst.durability ?? MAX_DURABILITY) - 30);
            if (inst.durability <= 0) {
              const wName = (weapons.find(w => w.id === inst.id)?.name) || inst.id;
              appendLog(`${wName} は壊れて消滅した…`);
              const cnt = weaponCounts[inst.id] || 0;
              weaponCounts[inst.id] = Math.max(0, cnt - 1);
              window.weaponInstances.splice(idx, 1);
              equippedWeaponIndex = null;
              equippedWeaponId    = null;
              brokeSomething = true;
            } else {
              brokeSomething = true;
            }
          }
        }

        if (typeof equippedArmorIndex === "number" &&
            Array.isArray(window.armorInstances)) {
          const idx = equippedArmorIndex;
          const inst = window.armorInstances[idx];
          if (inst) {
            inst.durability = Math.max(0, (inst.durability ?? MAX_DURABILITY) - 30);
            if (inst.durability <= 0) {
              const aName = (armors.find(a => a.id === inst.id)?.name) || inst.id;
              appendLog(`${aName} は壊れて消滅した…`);
              const cnt = armorCounts[inst.id] || 0;
              armorCounts[inst.id] = Math.max(0, cnt - 1);
              window.armorInstances.splice(idx, 1);
              equippedArmorIndex = null;
              equippedArmorId    = null;
              brokeSomething = true;
            } else {
              brokeSomething = true;
            }
          }
        }

        if (!Array.isArray(window.weaponInstances) && equippedWeaponId && Array.isArray(weapons)) {
          const w = weapons.find(x => x.id === equippedWeaponId);
          if (w && typeof w.durability === "number") {
            w.durability = Math.max(0, w.durability - 30);
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

        if (!Array.isArray(window.armorInstances) && equippedArmorId && Array.isArray(armors)) {
          const a = armors.find(x => x.id === equippedArmorId);
          if (a && typeof a.durability === "number") {
            a.durability = Math.max(0, a.durability - 30);
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
        if (typeof recalcStats === "function") {
          recalcStats();
        } else {
          updateDisplay();
        }
      }

      reduceDurabilityOnEquip();

      if (brokeSomething) {
        appendLog("街に戻った… 休んで回復し、所持ゴールドを半分失い、装備の耐久度が30減少した。");
      } else {
        appendLog("街に戻った… 休んで回復し、所持ゴールドを半分失った。");
      }

      // ★戦闘統計に「敗北」を反映
      commitCurrentBattleStats("lose");

      endBattleCommon();
    } else {
      tickSkillBuffTurns();
      renderPlayerStatusIcons();
      updateEnemyStatusUI();
      updateDisplay();
    }
  } else {
    // ★ 修正: ペット防御ステータスを使用
    let petDef  = (typeof getPetDef === "function")
      ? getPetDef()
      : Math.floor(petLevel * 0.5);

    let baseAtk = (currentEnemy.atk || 3);
    baseAtk     = applyAttackBuffsForEnemy(baseAtk);
    let dmg     = Math.max(1, baseAtk - petDef);

    petHp -= dmg;

    // （ペットへの被ダメは maxTaken に含めない方針。含めたくなったらここで更新）

    appendLog(`${currentEnemy.name}の攻撃！ ${petName}に${dmg}ダメージ`);

    if (petHp <= 0) {
      petHp = 0;
      appendLog(`${petName}は倒れてしまった…`);
    }

    tickSkillBuffTurns();
    renderPlayerStatusIcons();
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

  // 今倒したエリアだけクリアフラグを立てる
  if (typeof areaBossCleared !== "undefined") {
    areaBossCleared[area] = true;
  }

  // ログはこれまで通り「次のエリアが解放された」文言だけ出す
  if (typeof areaBossCleared !== "undefined") {
    if (area === "field") {
      appendLog("草原のボスを倒した！ 森エリアが解放された！");
    } else if (area === "forest") {
      appendLog("森のボスを倒した！ 洞窟エリアが解放された！");
    } else if (area === "cave") {
      appendLog("洞窟のボスを倒した！ 廃鉱山エリアが解放された！");
    } else {
      appendLog("ボスを撃破した！");
    }
  } else {
    appendLog("ボスを撃破した！");
  }

  // ★ ギルド依頼用：ボス撃破で共通依頼を進行（撃破手段は問わない）
  if (typeof onEnemyKilledForGuild === "function") {
    onEnemyKilledForGuild({ by: "any", isBoss: true });
  }

  if (typeof refreshExploreAreaSelect === "function") {
    refreshExploreAreaSelect();
  }

  endBattleCommon();
}

// =======================
// 逃走
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

    // ★戦闘統計に「逃走」を反映
    commitCurrentBattleStats("escape");

    endBattleCommon();
  } else {
    appendLog("逃走失敗！");
    escapeFailBonus += 0.1;
    enemyTurn();
    tickStatusesTurnEndForBoth();
    renderPlayerStatusIcons();
    updateEnemyStatusUI();
    updateDisplay();
  }
}

// =======================
// 戦闘勝利共通処理
// =======================

// killFlag: true のときは「この関数を呼んだ時点で敵HP0＝撃破済み」を意味する
// killSource: "phys" / "magic" / "pet" など、将来用に拡張しておく
function winBattle(killFlag, killSource) {
  if (typeof onEnemyDefeatedCore === "function") {
    if (currentEnemy) {
      onEnemyDefeatedCore(currentEnemy, killFlag, killSource);
    } else {
      onEnemyDefeatedCore(undefined, killFlag, killSource);
    }
  } else {
    // 保険として、敵撃破時に戦闘を終了
    endBattleCommon();
  }

  // ★戦闘統計に「勝利」を反映
  commitCurrentBattleStats("win");

  // ★スキルツリー: 戦闘後HP追加回復（勝利時）
  if (killFlag && typeof hp === "number" && typeof hpMax === "number") {
    const rate = battleSkillTreeBonus.combatPostBattleHpRate || 0;
    if (rate > 0) {
      const heal = Math.max(1, Math.floor(hpMax * rate));
      hp = Math.min(hpMax, hp + heal);
      appendLog(`戦闘後、落ち着いて体勢を整えた… HPが${heal}回復した。`);
    }
  }

  // ★スキルツリー: 戦闘ゴールドボーナスは onEnemyDefeatedCore 側で
  // baseReward を決めてから掛けるのが自然なので、そちらで
  // battleSkillTreeBonus.moneyGainRateBattle を見る想定。
}