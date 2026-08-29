// game-core-3.js
// 戦闘・ボス関連（探索や敵生成は game-core-5.js 側で担当）
//
// 状態異常・バフデバフの定義＆ロジックは status-effects-core.js 側に分離。

// =======================
// ダメージ計算共通式
// =======================
//
// ★変更: atk - def の線形式から atk*atk/(atk+def) 式に変更。
//   def=0 のときは従来どおり dmg=atk。
//   def が atk に近づいても 0 に落ちず、緩やかに収束するのが特徴。
//   （呼び出し側の書き方が変わらないよう、ここに共通関数として集約）
function calcAtkDefDamage(atk, def) {
  const a = Math.max(0, atk || 0);
  const d = Math.max(0, def || 0);
  if (a <= 0) return 1;
  return Math.max(1, Math.floor((a * a) / (a + d)));
}

// =======================
// シールドブロウ・受け流し用ガードフラグ
// =======================
//
// 戦士スキル「シールドブロウ」、武具使いスキル「受け流し反撃」で立つガード状態。
// skill-core.js からも enemyTurn からも共通で読む/書く。
let shieldBlowGuardTurnRemain = 0;
let parryGuardTurnRemain = 0;

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

// ★DEXから「命中率」「回避率」を算出する共通ヘルパ（飽和カーブ方式）
// base: DEXが0でも保証される下限値、cap: DEXを積んでも超えない上限値
function calcDexRate(dex, base, cap) {
  const d = typeof dex === "number" ? dex : 0;

  // 素の傾向（DEXが増えるほど伸びるが、そのままだと青天井なので後で飽和させる）
  const raw = d * 0.003;

  // 飽和関数で cap に収束させる
  const K = 0.6; // 調整パラメータ
  const rate = base + (raw * (cap - base)) / (raw + K); // baseからcapへ漸近

  // 念のためハード上限
  return Math.min(rate, cap);
}

// ★プレイヤーの実効DEXを取得（防具のbonusDexや接頭語のdexPct込みの値）
// recalcStats()が一度も走っていない場合のみ、素のDEX_にフォールバック
function getPlayerEffectiveDex() {
  if (typeof window !== "undefined" && typeof window.effDEX === "number") {
    return window.effDEX;
  }
  return typeof DEX_ === "number" ? DEX_ : 0;
}

// ★DEXから「プレイヤーの回避率」を計算（敵の攻撃をかわす確率）
// 下限5%・上限70%（装備中スキル補正を含む）
function getPlayerEvasionRateFromDex() {
  let rate = calcDexRate(getPlayerEffectiveDex(), 0.05, 0.70);
  if (typeof window !== "undefined" && window.equippedWeaponSkillBonus && typeof window.equippedWeaponSkillBonus.evaRate === "number") {
    rate += window.equippedWeaponSkillBonus.evaRate;
  }
  if (typeof window !== "undefined" && window.equippedArmorSkillBonus && typeof window.equippedArmorSkillBonus.evaRate === "number") {
    rate += window.equippedArmorSkillBonus.evaRate;
  }
  return Math.min(0.85, rate);
}

// ★DEXから「プレイヤーの命中率」を計算（敵への攻撃が当たる確率）
// 下限30%・上限95%（装備中スキル補正を含む）
function getPlayerHitRateFromDex() {
  let rate = calcDexRate(getPlayerEffectiveDex(), 0.30, 0.95);
  if (typeof window !== "undefined" && window.equippedWeaponSkillBonus && typeof window.equippedWeaponSkillBonus.hitRate === "number") {
    rate += window.equippedWeaponSkillBonus.hitRate;
  }
  return Math.min(0.99, rate);
}

// ★敵側の回避率（enemy-data.js の dex フィールドから算出）
// プレイヤーと同じく下限5%・上限70%
function getEnemyEvasionRate(enemy) {
  const dex = (enemy && typeof enemy.dex === "number") ? enemy.dex : 0;
  return calcDexRate(dex, 0.05, 0.70);
}

// ★敵側の命中率（enemy-data.js の dex フィールドから算出）
// プレイヤーと同じく下限30%・上限95%
function getEnemyHitRateFromDex(enemy) {
  const dex = (enemy && typeof enemy.dex === "number") ? enemy.dex : 0;
  return calcDexRate(dex, 0.30, 0.95);
}

function getBaseCritRateFromLuk() {
  // LUKから減衰付きの「素クリ率」を計算（バフを含まない部分）
  // 目的: LUK が無限に伸びても素クリ率は 50% 付近で頭打ち
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
// maxPhysDamage / maxMagicDamage / maxPetDamage: 系統別の最大与ダメージ

const battleStats = {
  total: 0,
  win: 0,
  lose: 0,
  escape: 0,
  maxDamage: 0,
  maxTaken: 0,
  maxPhysDamage: 0,   // 物理（通常攻撃＋物理スキル）
  maxMagicDamage: 0,  // 魔法（各種魔法スキル）
  maxPetDamage: 0     // ペット（ペット攻撃・ペットスキル）
};

let currentBattleMaxDamage = 0;
let currentBattleMaxTaken  = 0;
let currentBattleMaxPhys   = 0;
let currentBattleMaxMagic  = 0;
let currentBattleMaxPet    = 0;

function getBattleStats() {
  return battleStats;
}

function resetCurrentBattleStats() {
  currentBattleMaxDamage = 0;
  currentBattleMaxTaken  = 0;
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

  if (currentBattleMaxPhys > battleStats.maxPhysDamage) {
    battleStats.maxPhysDamage = currentBattleMaxPhys;
  }
  if (currentBattleMaxMagic > battleStats.maxMagicDamage) {
    battleStats.maxMagicDamage = currentBattleMaxMagic;
  }
  if (currentBattleMaxPet > battleStats.maxPetDamage) {
    battleStats.maxPetDamage = currentBattleMaxPet;
  }

  // ★追加: デバッグ戦闘ログ（簡易版）
  if (typeof debugRecordBattle === "function") {
    try {
      debugRecordBattle({
        win: resultType === "win",
        damageDealt: currentBattleMaxDamage,
        damageTaken: currentBattleMaxTaken
      });
    } catch (e) {
      // 失敗してもゲーム進行に影響しないよう握りつぶす
    }
  }

  // ★テト用フック: テトが操作しているときだけ戦闘結果を通知
  if (window.isTetoControlling && typeof window.tetoOnBattleCommitted === "function") {
    try {
      window.tetoOnBattleCommitted(resultType, {
        maxDamage: currentBattleMaxDamage,
        maxTaken:  currentBattleMaxTaken,
        resultType
      });
    } catch (e) {
      if (window.console && console.error) console.error(e);
    }
  }

  // ★テト用フック: balanced 用の戦闘結果フィードバック
  if (window.isTetoControlling && typeof window.tetoBalancedOnBattleResult === "function") {
    try {
      window.tetoBalancedOnBattleResult(resultType === "win");
    } catch (e) {
      if (window.console && console.error) console.error(e);
    }
  }
}

// =======================
// ★追加: テト用戦闘死亡ログヘルパー
// =======================
//
// 仕様を変えず、「死亡処理の直後に 1 行呼ぶだけ」のユーティリティ。
// - window.isTetoControlling が true の時だけ動作
// - tetoRecordDeath("battle", {...}) 経由で debugRecordDeath にも届く
function recordBattleDeathForDebug(moneyBefore, moneyAfter, equipBroken, source) {
  if (!window.isTetoControlling || typeof window.tetoRecordDeath !== "function") {
    return;
  }
  try {
    const ctx = {
      enemyId: (typeof currentEnemy === "object" && currentEnemy) ? currentEnemy.id : null,
      area: (typeof getCurrentArea === "function") ? getCurrentArea() : (window.exploringArea || null),
      hp: 0,
      hunger: (typeof getHungerValue === "function") ? getHungerValue() : null,
      thirst: (typeof getThirstValue === "function") ? getThirstValue() : null,
      moneyLost: (typeof moneyBefore === "number" && typeof moneyAfter === "number")
        ? Math.max(0, moneyBefore - moneyAfter)
        : 0,
      equipBroken: !!equipBroken,
      source: source || "battle"
    };
    window.tetoRecordDeath("battle", ctx);
  } catch (e) {
    if (window.console && console.error) console.error(e);
  }
}

// =======================
// ★共通: プレイヤー死亡処理
// =======================
//
// 呼び出し元ごとの差分（ログ文言や self-damage メッセージ）は、呼んだ側で出してからここに入る。
// ここでは「倒れた後」の挙動だけを担当する。
function handlePlayerDeathCommon(source) {
  appendLog("あなたは倒れてしまった…");

  // ★テト用フック: 戦闘死
  if (window.isTetoControlling && typeof window.tetoOnPlayerDeath === "function") {
    try {
      window.tetoOnPlayerDeath("battle");
    } catch (e) {
      if (window.console && console.error) console.error(e);
    }
  }

  // ★死亡時は撤退状態も必ずリセット（罠死亡と同じ挙動に揃える）
  window.isRetreating     = false;
  window.retreatTurnsLeft = 0;

  window.isExploring   = false;
  window.exploringArea = "field";

  // ★デバッグ用: 経済ログ（死亡による所持金半減）
  const moneyBefore = money;

  hp    = hpMax;
  mp    = mpMax;
  sp    = spMax;
  petHp = petHpMax;

  const moneyAfterBeforePenalty = money;
  money = Math.floor(money / 2);

  if (typeof debugRecordEconomy === "function") {
    try {
      debugRecordEconomy(moneyBefore, money, "deathPenalty");
    } catch (e) {}
  }

  let brokeSomething = false;

  // 装備インスタンス前提で耐久-30＆破損処理
  function reduceDurabilityOnEquip() {
    if (typeof equippedWeaponIndex === "number" &&
        Array.isArray(window.weaponInstances)) {
      const idx = equippedWeaponIndex;
      const inst = window.weaponInstances[idx];
      if (inst) {
        const maxDur = (typeof MAX_DURABILITY === "number") ? MAX_DURABILITY : 10;
        inst.durability = Math.max(0, (inst.durability ?? maxDur) - 30);
        if (inst.durability <= 0) {
          const wName = (weapons.find(w => w.id === inst.id)?.name) || inst.id;
          appendLog(`${wName} は壊れて消滅した…`);
          const cnt = weaponCounts[inst.id] || 0;
          weaponCounts[inst.id] = Math.max(0, cnt - 1);
          window.weaponInstances.splice(idx, 1);
          equippedWeaponIndex = null;
          equippedWeaponId    = null;
          if (typeof window !== "undefined") {
            window.equippedWeaponIndex = null;
            window.equippedWeaponId    = null;
          }
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
        const maxDur = (typeof MAX_DURABILITY === "number") ? MAX_DURABILITY : 10;
        inst.durability = Math.max(0, (inst.durability ?? maxDur) - 30);
        if (inst.durability <= 0) {
          const aName = (armors.find(a => a.id === inst.id)?.name) || inst.id;
          appendLog(`${aName} は壊れて消滅した…`);
          const cnt = armorCounts[inst.id] || 0;
          armorCounts[inst.id] = Math.max(0, cnt - 1);
          window.armorInstances.splice(idx, 1);
          equippedArmorIndex = null;
          equippedArmorId    = null;
          if (typeof window !== "undefined") {
            window.equippedArmorIndex = null;
            window.equippedArmorId    = null;
          }
          brokeSomething = true;
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

  // ★テト用: 戦闘死亡ログ記録（経済ペナルティ反映後の金額と装備破損フラグを渡す）
  recordBattleDeathForDebug(moneyBefore, money, brokeSomething, source);

  // ★戦闘統計に「敗北」を反映（ここから debugRecordBattle も呼ばれる）
  commitCurrentBattleStats("lose");

  endBattleCommon();
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
    // 武器種別スキルEXPを加算
    const wType = (typeof getEquippedWeaponType === "function") ? getEquippedWeaponType() : null;
    if (wType && typeof addWeaponSkillExp === "function") {
      addWeaponSkillExp(wType, 1);
    }

    let hitRate = getPlayerHitRateFromDex();
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

    // ★敵側のDEX的な回避判定（enemy-data.js の eva フィールド、未設定なら0）
    if (typeof getEnemyEvasionRate === "function") {
      const enemyEvaRate = getEnemyEvasionRate(currentEnemy);
      if (enemyEvaRate > 0 && Math.random() < enemyEvaRate) {
        appendLog(`あなたの攻撃！ しかし${currentEnemy.name}に回避された！`);
        enemyTurn();
        tickStatusesTurnEndForBoth();
        renderPlayerStatusIcons();
        updateEnemyStatusUI();
        updateDisplay();
        return;
      }
    }
  }

  // ダメージ計算共通部分（物理攻撃）
  let baseDamage = calcAtkDefDamage(atkTotal, currentEnemy.def || 0);
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

    // ★動物使い／獣群使い等、ペットターンを持つ職でペット選択済み＆生存時だけペットターン
    if (typeof jobHasPetTurn === "function" &&
        jobHasPetTurn() &&
        typeof hasCompanion === "function" &&
        hasCompanion()) {
      if (typeof isMultiPetJob === "function" && isMultiPetJob()) {
        // ★獣群使い：編成中の生存ペット全員が同時に行動
        if (typeof doBeastPartyTurn === "function") {
          doBeastPartyTurn();
        }
      } else if (petHp > 0) {
        // 通常の動物使い等：単体ペットのみ
        doPetTurn();
      }
    }

    // ★修正: ペット撃破は doPetTurn 内で処理するため、ここでは再チェックしない

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
      // 自傷死も通常の戦闘死亡と同じ処理
      handlePlayerDeathCommon("self");
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
  let targetPetRec = null; // ★獣群使い用：狙われた個体のレコード

  if (typeof isMultiPetJob === "function" && isMultiPetJob() &&
      typeof hasCompanion === "function" && hasCompanion()) {
    // ★獣群使い：編成中の生存ペットの中からランダムに1体を狙う
    const aliveParty = (typeof getActivePartyRecords === "function")
      ? getActivePartyRecords(true)
      : [];
    if (aliveParty.length > 0) {
      // 威嚇（taunt）使用直後は特に狙われやすくする
      const petTargetRate = beastPartyTauntTurnRemain > 0 ? 0.85 : 0.7;
      if (Math.random() < petTargetRate) {
        target = "petParty";
        targetPetRec = aliveParty[Math.floor(Math.random() * aliveParty.length)];
      }
    }
    if (beastPartyTauntTurnRemain > 0) {
      beastPartyTauntTurnRemain--;
    }
  } else if (jobId === 2 && typeof hasCompanion === "function" && hasCompanion() && petHp > 0) {
    // ★修正: 動物使いかつペット選択済みかつHP>0のときだけペットをターゲット候補に
    target = (Math.random() < 0.7) ? "pet" : "player";
  }

  if (target === "player") {
    let baseAtk = (currentEnemy.atk || 3);
    baseAtk = applyAttackBuffsForEnemy(baseAtk);

    // ★敵専用スキル（enemy-skills.js）：この敵が使えるスキルの中から抽選
    let enemySkill = null;
    if (typeof pickEnemySkill === "function") {
      const hpRatio = (enemyHpMax > 0) ? (enemyHp / enemyHpMax) : 1;
      enemySkill = pickEnemySkill(currentEnemy.id, hpRatio);
    }

    // デバフ系／自己バフ系は通常攻撃を行わず、スキルの発動だけでターンを終える
    if (enemySkill && (enemySkill.kind === "debuff" || enemySkill.kind === "selfBuff")) {
      if (typeof applyEnemySkillEffects === "function") {
        applyEnemySkillEffects(enemySkill, currentEnemy.name);
      }
      tickSkillBuffTurns();
      renderPlayerStatusIcons();
      updateEnemyStatusUI();
      updateDisplay();
      return;
    }

    // 重い一撃系は、通常攻撃のダメージ倍率として baseAtk に乗せて後続の計算に流す
    if (enemySkill && enemySkill.kind === "heavyAttack") {
      baseAtk = Math.floor(baseAtk * (enemySkill.dmgMultiplier || 1));
    }

    // ★DEXによる敵の命中判定（物理攻撃・重い一撃のみ対象。デバフ系スキルは上の分岐で既に終了している）
    if (typeof getEnemyHitRateFromDex === "function") {
      let enemyHitRate = getEnemyHitRateFromDex(currentEnemy);
      if (typeof modifyAccuracyForEnemy === "function") {
        enemyHitRate = modifyAccuracyForEnemy(enemyHitRate);
      }
      if (Math.random() > enemyHitRate) {
        appendLog(`${currentEnemy.name}の攻撃！ しかし外れた！`);
        const aType = (typeof getEquippedArmorType === "function") ? getEquippedArmorType() : null;
        if (aType && typeof addArmorSkillExp === "function") addArmorSkillExp(aType, 1);
        const eqWType = (typeof getEquippedWeaponType === "function") ? getEquippedWeaponType() : null;
        if (eqWType === "shield" && typeof addWeaponSkillExp === "function") addWeaponSkillExp("shield", 1);
        tickSkillBuffTurns();
        renderPlayerStatusIcons();
        updateEnemyStatusUI();
        updateDisplay();
        return;
      }
    }

    // ★DEXによる回避判定（物理攻撃・重い一撃のみ対象。デバフ系スキルは上の分岐で既に終了している）
    if (typeof getPlayerEvasionRateFromDex === "function") {
      const evaRate = getPlayerEvasionRateFromDex();
      if (Math.random() < evaRate) {
        appendLog(`${currentEnemy.name}の攻撃！ しかしあなたは攻撃を回避した！`);
        const aType = (typeof getEquippedArmorType === "function") ? getEquippedArmorType() : null;
        if (aType && typeof addArmorSkillExp === "function") addArmorSkillExp(aType, 1);
        const eqWType = (typeof getEquippedWeaponType === "function") ? getEquippedWeaponType() : null;
        if (eqWType === "shield" && typeof addWeaponSkillExp === "function") addWeaponSkillExp("shield", 1);
        tickSkillBuffTurns();
        renderPlayerStatusIcons();
        updateEnemyStatusUI();
        updateDisplay();
        return;
      }
    }

    // ★堅固の大盾・応急鍛冶・完全装備・特製まかない・鋼の胃袋などの防御バフを反映した「実効防御値」を作る
    let effectiveDefTotal = defTotal;
    if (typeof greatshieldFortifyTurnRemain === "number" && greatshieldFortifyTurnRemain > 0) {
      const rate = (typeof greatshieldFortifyRate === "number") ? greatshieldFortifyRate : 0;
      if (rate > 0) effectiveDefTotal = Math.floor(effectiveDefTotal * (1 + rate));
    }
    if (typeof fieldForgingTurnRemain === "number" && fieldForgingTurnRemain > 0) {
      const rate = (typeof fieldForgingRate === "number") ? fieldForgingRate : 0;
      if (rate > 0) effectiveDefTotal = Math.floor(effectiveDefTotal * (1 + rate));
    }
    if (typeof fullGearTurnRemain === "number" && fullGearTurnRemain > 0) {
      const rate = (typeof fullGearDefRate === "number") ? fullGearDefRate : 0;
      if (rate > 0) effectiveDefTotal = Math.floor(effectiveDefTotal * (1 + rate));
    }
    if (typeof chefSpecialtyTurnRemain === "number" && chefSpecialtyTurnRemain > 0) {
      const rate = (typeof chefSpecialtyDefRate === "number") ? chefSpecialtyDefRate : 0;
      if (rate > 0) effectiveDefTotal = Math.floor(effectiveDefTotal * (1 + rate));
    }
    if (typeof ironStomachTurnRemain === "number" && ironStomachTurnRemain > 0) {
      const rate = (typeof ironStomachDefRate === "number") ? ironStomachDefRate : 0;
      if (rate > 0) effectiveDefTotal = Math.floor(effectiveDefTotal * (1 + rate));
    }

    // ★追加: 防御前の「生ダメージ」を計算してカウンター用に保存
    let raw = calcAtkDefDamage(baseAtk, effectiveDefTotal);
    if (typeof setLastRawEnemyDamage === "function") {
      setLastRawEnemyDamage(raw);
    }

    // ここから先は従来どおり、防御バフや軽減を通した最終ダメージ
    let dmg = raw;
    dmg = applyDefenseBuffsForPlayer(dmg);

    // ★修正箇所: ガード処理を「ジョブ＋装備」の判定ごと jobs.js に委譲
    let didGuard = false;
    if (typeof getGuardBonusForCurrentJob === "function") {
      const gb = getGuardBonusForCurrentJob() || {
        guardRate: 0,
        greatshieldGuardRateAdd: 0,
        greatshieldGuardDamageReduceRate: 0
      };
      const totalGuardRate =
        (gb.guardRate || 0) + (gb.greatshieldGuardRateAdd || 0);
      const reduceRate = gb.greatshieldGuardDamageReduceRate || 0;

      if (totalGuardRate > 0 && Math.random() < totalGuardRate) {
        didGuard = true;
        const r = Math.max(0, Math.min(0.9, reduceRate));
        dmg = Math.max(1, Math.floor(dmg * (1 - r)));
      }
    }

    // ★ 武具使い等の常時被ダメ軽減ボーナス（guardReductionRate）
    if (typeof getJobBonuses === "function") {
      const jid = window.player?.jobId ?? window.jobId;
      if (jid != null) {
        const jb = getJobBonuses(jid);
        if (jb && jb.guardReductionRate > 0) {
          dmg = Math.max(1, Math.floor(dmg * (1 - jb.guardReductionRate)));
        }
      }
    }

    if (shieldBlowGuardTurnRemain > 0) {
      dmg = Math.floor(dmg * 0.5);
      shieldBlowGuardTurnRemain = 0;
      appendLog("シールドブロウの効果でダメージが軽減された！");
    }

    if (typeof parryGuardTurnRemain === "number" && parryGuardTurnRemain > 0) {
      dmg = Math.max(1, Math.floor(dmg * 0.5));
      parryGuardTurnRemain = 0;
      appendLog("受け流しの構えで敵の攻撃を捌き、被ダメージを軽減した！");
    }

    // ★スキルツリー: 戦闘ガード系ボーナス（最終被ダメージ-％）
    if (battleSkillTreeBonus.combatGuardReductionRate > 0) {
      const rate = battleSkillTreeBonus.combatGuardReductionRate;
      dmg = Math.max(1, Math.floor(dmg * (1 - rate)));
    }

    // ★防具種別スキルによる常時被ダメージ軽減ボーナス
    if (typeof window !== "undefined" && window.equippedArmorSkillBonus && typeof window.equippedArmorSkillBonus.damageReduce === "number") {
      const r = window.equippedArmorSkillBonus.damageReduce;
      if (r > 0) {
        dmg = Math.max(1, Math.floor(dmg * (1 - r)));
      }
    }

    // 防具種別・盾スキルEXP加算
    const aType = (typeof getEquippedArmorType === "function") ? getEquippedArmorType() : null;
    if (aType && typeof addArmorSkillExp === "function") {
      addArmorSkillExp(aType, 1);
    }
    const eqWType = (typeof getEquippedWeaponType === "function") ? getEquippedWeaponType() : null;
    if (eqWType === "shield" && typeof addWeaponSkillExp === "function") {
      addWeaponSkillExp("shield", 1);
    }

    hp -= dmg;

    // ★戦闘内の最大被ダメージを更新（プレイヤーに対して）
    if (dmg > currentBattleMaxTaken) {
      currentBattleMaxTaken = dmg;
    }

    // ★ここでカウンター状態があれば onDamaged が呼ばれる
    onPlayerDamagedByEnemy();

    if (enemySkill && enemySkill.kind === "heavyAttack") {
      // スキルのフレーバーログ＋効果付与（bleed/def_downなど）
      if (typeof applyEnemySkillEffects === "function") {
        applyEnemySkillEffects(enemySkill, currentEnemy.name);
      }
      if (didGuard) {
        appendLog(`大盾でガードし、あなたは${dmg}ダメージを受けた！`);
      } else {
        appendLog(`あなたは${dmg}ダメージを受けた！`);
      }
    } else if (didGuard) {
      appendLog(`${currentEnemy.name}の攻撃！ 大盾でガードし、あなたは${dmg}ダメージを受けた！`);
    } else {
      appendLog(`${currentEnemy.name}の攻撃！ あなたに${dmg}ダメージ`);
    }

    if (hp <= 0) {
      hp = 0;
      // 敵攻撃による戦闘死
      handlePlayerDeathCommon("enemy");
    } else {
      // ★修正: カウンターで敵の HP が 0 になっていたら、ここで撃破処理をする
      //   （onCounterDamageToEnemy は enemyHp を減らすだけで、currentEnemy を
      //    その場で null にすると直前の appendLog が壊れるため、ここまで遅延させている）
      if (currentEnemy && enemyHp <= 0) {
        enemyHp = 0;
        if (typeof onEnemyKilledForGuild === "function") {
          onEnemyKilledForGuild({ by: "phys", isBoss: !!isBossBattle });
        }
        winBattle(true, "phys");
        updateEnemyStatusUI();
        updateDisplay();
        return;
      }

      tickSkillBuffTurns();
      renderPlayerStatusIcons();
      updateEnemyStatusUI();
      updateDisplay();
    }
  } else if (target === "petParty") {
    // ★獣群使い：狙われた個体（targetPetRec）に直接ダメージを与える
    if (!targetPetRec) {
      // 念のためのフォールバック（対象が取れなければ何もせず終了）
      tickSkillBuffTurns();
      renderPlayerStatusIcons();
      updateEnemyStatusUI();
      updateDisplay();
      return;
    }

    const petDef = (typeof getPetRecordDef === "function")
      ? getPetRecordDef(targetPetRec)
      : Math.floor((targetPetRec.level || 1) * 0.5);

    let baseAtk = (currentEnemy.atk || 3);
    baseAtk     = applyAttackBuffsForEnemy(baseAtk);
    let dmg   = calcAtkDefDamage(baseAtk, petDef);

    // ★ガードスタンス（消費型）：このレコードが直前に使っていれば軽減して消費
    if (typeof targetPetRec.guardRate === "number" && targetPetRec.guardRate > 0) {
      dmg = Math.max(1, Math.floor(dmg * (1 - targetPetRec.guardRate)));
      targetPetRec.guardRate = 0;
    }

    targetPetRec.hp = Math.max(0, (targetPetRec.hp || 0) - dmg);

    appendLog(`${currentEnemy.name}の攻撃！ ${targetPetRec.name}に${dmg}ダメージ`);

    if (targetPetRec.hp <= 0) {
      appendLog(`${targetPetRec.name}は倒れてしまった…`);
    }

    tickSkillBuffTurns();
    renderPlayerStatusIcons();
    updateEnemyStatusUI();
    updateDisplay();
  } else {
    // ★ 修正: ペット防御ステータスを使用
    let petDef  = (typeof getPetDef === "function")
      ? getPetDef()
      : Math.floor(petLevel * 0.5);

    let baseAtk = (currentEnemy.atk || 3);
    baseAtk     = applyAttackBuffsForEnemy(baseAtk);
    let dmg     = calcAtkDefDamage(baseAtk, petDef);

    // ★ガードスタンス（消費型）：直前に使っていれば次の1発だけ軽減して消費
    if (typeof window.petGuardRate === "number" && window.petGuardRate > 0) {
      dmg = Math.max(1, Math.floor(dmg * (1 - window.petGuardRate)));
      window.petGuardRate = 0;
    }

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

    // ★戦闘統計に「逃走」を反映（ここから debugRecordBattle も呼ばれる）
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
  // 戦闘報酬計算用に、関数内部で money を増減する前後を debugRecordEconomy で挟みたい場合は、
  // onEnemyDefeatedCore 側で individual に debugRecordEconomy を呼ぶ運用にする。
  const moneyBefore = (typeof money === "number") ? money : null;

  if (typeof onEnemyDefeatedCore === "function") {
    if (!currentEnemy) {
      // ★仕様変更ではなく「ありえない状態」の検出用デバッグログ
      appendLog("【デバッグ警告】winBattle 呼び出し時に currentEnemy が存在しません。");
      // 敵情報なしで報酬処理を進めないため、ここでは onEnemyDefeatedCore を呼ばず終了
    } else {
      onEnemyDefeatedCore(currentEnemy, killFlag, killSource);
    }
  } else {
    // コア未定義時の保険として、敵撃破時に戦闘を終了
    endBattleCommon();
  }

  // onEnemyDefeatedCore 内で money が動いた可能性があるので、ここで経済ログを一発だけ残す
  if (typeof debugRecordEconomy === "function" && moneyBefore != null && typeof money === "number") {
    try {
      debugRecordEconomy(moneyBefore, money, "battleReward");
    } catch (e) {}
  }

  // ★戦闘統計に「勝利」を反映（ここから debugRecordBattle も呼ばれる）
  commitCurrentBattleStats("win");

  // ★勝利時: 装備中武器・防具のスキルEXPを獲得
  if (killFlag) {
    const wType = (typeof getEquippedWeaponType === "function") ? getEquippedWeaponType() : null;
    if (wType && typeof addWeaponSkillExp === "function") {
      addWeaponSkillExp(wType, isBossBattle ? 3 : 1);
    }
    const aType = (typeof getEquippedArmorType === "function") ? getEquippedArmorType() : null;
    if (aType && typeof addArmorSkillExp === "function") {
      addArmorSkillExp(aType, isBossBattle ? 3 : 1);
    }
  }

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