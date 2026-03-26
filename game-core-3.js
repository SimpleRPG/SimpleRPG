// game-core-3.js
// 戦闘・探索・アイテム使用・ショップ・initGame

// =======================
// 戦闘関連
// =======================

function createEnemy(){
  const areaSel = document.getElementById("exploreTarget");
  const area = areaSel ? areaSel.value : "field";
  const table = AREA_ENEMY_TABLE[area] || [];
  if(table.length===0){
    appendLog("このエリアには敵がいないようだ…");
    return;
  }
  const id = table[Math.floor(Math.random()*table.length)];
  const enemy = ENEMIES[id];
  if(!enemy){
    appendLog("敵データが見つからない");
    return;
  }
  currentEnemy = { ...enemy };
  enemyHpMax = currentEnemy.hp;
  enemyHp = enemyHpMax;
  isBossBattle = false;
  appendLog(`${currentEnemy.name} が現れた！`);
  const info = document.getElementById("exploreInfo");
  if (info) info.textContent = `${currentEnemy.name} が現れた！`;
  setBattleCommandVisible(true);
  updateDisplay();
  updateSkillButtonsByJob();
  if (typeof updateBattleSkillUIByJob === "function") {
    updateBattleSkillUIByJob();
  }
}

function calcPlayerDamage(){
  const base = atkTotal;
  const variance = Math.floor(base * 0.2);
  const dmg = base + (Math.floor(Math.random()* (variance*2+1)) - variance);
  return Math.max(1, dmg);
}

function calcEnemyDamage(){
  if(!currentEnemy) return 0;
  const base = currentEnemy.atk;
  const variance = Math.floor(base * 0.2);
  const raw = base + (Math.floor(Math.random()*(variance*2+1))-variance);
  let reduced = raw - defTotal;

  // シールドブロウ軽減（次の1回）
  if (typeof shieldBlowGuardTurnRemain !== "undefined" && shieldBlowGuardTurnRemain > 0) {
    reduced = Math.floor(reduced * 0.5);
    shieldBlowGuardTurnRemain = 0;
  }

  return Math.max(1, reduced);
}

// 敵ターン1回分
function enemyTurnOnce(){
  if(!currentEnemy) return "";
  const dmg = calcEnemyDamage();
  hp = Math.max(0, hp - dmg);
  let log = `${currentEnemy.name} の攻撃！ あなたは${dmg}ダメージを受けた`;
  if(hp <= 0){
    playerDie();
  } else {
    updateDisplay();
  }
  return log;
}

// 敵ターン（skill-core 側からもこれを呼ぶ）
function enemyTurn() {
  if (!currentEnemy) return;
  const log = enemyTurnOnce();
  if (log) appendLog(log);
  if (typeof tickSkillBuffTurns === "function") {
    tickSkillBuffTurns();
  }
}

// プレイヤーの通常攻撃
function playerAttack(){
  if(!currentEnemy){
    appendLog("攻撃する相手がいない");
    return;
  }
  const dmg = calcPlayerDamage();
  enemyHp = Math.max(0, enemyHp - dmg);
  appendLog(`あなたの攻撃！ ${currentEnemy.name} に${dmg}ダメージ`);

  if (enemyHp <= 0) {
    winBattle();
    return;
  }

  // 先にペット行動（倒し切れば敵ターンは来ない）
  if (typeof doPetTurn === "function") {
    doPetTurn();
  }
  if (!currentEnemy || enemyHp <= 0) {
    // ペットがトドメを刺した場合など
    return;
  }

  // 敵ターン
  enemyTurn();
}

function startBossBattle() {
  const area = getCurrentArea();
  const bossId = AREA_BOSS_ID[area];
  const enemy = ENEMIES[bossId];
  if (!enemy) {
    appendLog("ボスデータが見つからない");
    return;
  }
  currentEnemy = { ...enemy };
  enemyHpMax = currentEnemy.hp;
  enemyHp = enemyHpMax;
  isBossBattle = true;
  appendLog(`${currentEnemy.name} が立ちふさがった！`);
  const info = document.getElementById("exploreInfo");
  if (info) info.textContent = `${currentEnemy.name} に挑んでいる！`;
  setBattleCommandVisible(true);
  updateDisplay();
  updateSkillButtonsByJob();
  if (typeof updateBattleSkillUIByJob === "function") {
    updateBattleSkillUIByJob();
  }
}

function winBattle(){
  if(!currentEnemy) return;

  const wasBoss = isBossBattle;
  const area = getCurrentArea();

  // 敵データ側の報酬を優先
  const gainExp = currentEnemy.exp || BASE_EXP_PER_BATTLE;
  const gainG   = currentEnemy.money || (5 + Math.floor(Math.random()*6));
  money += gainG;
  addExp(gainExp);
  if(jobId===2){
    addPetExp(2);
  }

  if (wasBoss) {
    areaBossCleared[area] = true;
    isBossBattle = false;

    if (area === "field") {
      areaBossUnlocked.forest = true;
    } else if (area === "forest") {
      areaBossUnlocked.cave = true;
    } else if (area === "cave") {
      areaBossUnlocked.mine = true;
    }

    appendLog(`${currentEnemy.name} を倒した！ 次のエリアが解放された！ EXP${gainExp} / ${gainG}G を獲得した。`);
  } else {
    appendLog(`${currentEnemy.name} を倒した！ EXP${gainExp} / ${gainG}G を獲得した。`);
  }

  currentEnemy=null;
  enemyHp=0; enemyHpMax=0;
  setBattleCommandVisible(false);
  const info = document.getElementById("exploreInfo");
  if (info) info.textContent = wasBoss ? "ボスを撃破した！" : "敵を倒した。探索を続けよう。";
  updateDisplay();
  updateSkillButtonsByJob();
  if (typeof updateBattleSkillUIByJob === "function") {
    updateBattleSkillUIByJob();
  }
  updateBossButtonUI();
}

function playerDie(){
  appendLog("あなたは倒れてしまった…。お金を半分失った。");
  money = Math.floor(money/2);
  hp = hpMax;
  currentEnemy = null;
  enemyHp = 0; enemyHpMax = 0;
  isBossBattle = false;
  setBattleCommandVisible(false);
  const info = document.getElementById("exploreInfo");
  if (info) info.textContent = "目が覚めた…。拠点に戻ってきたようだ。";
  updateDisplay();
  updateSkillButtonsByJob();
  if (typeof updateBattleSkillUIByJob === "function") {
    updateBattleSkillUIByJob();
  }
  updateBossButtonUI();
}

function tryEscape(){
  if(!currentEnemy){
    appendLog("戦闘中ではない。");
    return;
  }
  if (currentEnemy.isBoss) {
    appendLog("ボス戦からは逃げられない！");
    return;
  }
  const baseRate = 0.4 + escapeFailBonus;
  const luckBonus = LUK_ * 0.01;
  const rate = Math.min(0.9, baseRate + luckBonus);
  if(Math.random() < rate){
    appendLog("うまく逃げ切れた！");
    currentEnemy=null;
    enemyHp=0; enemyHpMax=0;
    escapeFailBonus = 0;
    isBossBattle = false;
    setBattleCommandVisible(false);
    const info = document.getElementById("exploreInfo");
    if (info) info.textContent = "その場から離れた…。";
    updateDisplay();
    updateSkillButtonsByJob();
    if (typeof updateBattleSkillUIByJob === "function") {
      updateBattleSkillUIByJob();
    }
    updateBossButtonUI();
  }else{
    appendLog("逃走に失敗した！");
    escapeFailBonus += 0.1;
    const enemyLog = enemyTurnOnce();
    if (enemyLog) appendLog(enemyLog);
  }
}

// =======================
// 探索イベント
// =======================

function doExploreEvent(){
  if (currentEnemy) {
    appendLog("すでに敵と戦闘中だ。");
    return;
  }

  const areaSel = document.getElementById("exploreTarget");
  const area = areaSel ? areaSel.value : "field";

  if (!areaBossUnlocked[area]) {
    areaBossChance[area] = Math.min(
      AREA_BOSS_CHANCE_MAX,
      areaBossChance[area] + AREA_BOSS_CHANCE_INC
    );
    if (Math.random() < areaBossChance[area]) {
      areaBossUnlocked[area] = true;
      areaBossChance[area]   = 0.0;
      appendLog("強敵の気配がする…ボスに挑めるようになった！");
      updateBossButtonUI();
      return;
    }
  }

  const r = Math.random();
  if (r < 0.5) {
    createEnemy();
    return;
  }

  setBattleCommandVisible(false);

  if (r < 0.7) {
    const gain = 1 + Math.floor(Math.random()*2);
    if (area === "field") {
      wood += gain;
      appendLog(`草原を歩き回った。木を${gain}個見つけた。`);
    } else if (area === "forest") {
      wood += gain;
      herb += gain;
      appendLog(`森を探索し、木と草を少し見つけた（木${gain}, 草${gain}）。`);
    } else if (area === "cave") {
      ore += gain;
      appendLog(`洞窟の岩場で鉱石を${gain}個見つけた。`);
    } else if (area === "mine") {
      ore += gain+1;
      appendLog(`廃鉱山を探索し、上質な鉱石を${gain+1}個掘り出した。`);
    }
    updateDisplay();
  } else if (r < 0.85) {
    const g = 5 + Math.floor(Math.random()*6);
    money += g;
    appendLog(`探索中に落ちていた財布を見つけた。${g}G手に入れた。`);
    updateDisplay();
  } else {
    appendLog("しばらく歩き回ったが、特に何も見つからなかった…");
  }
}

// =======================
// アイテム使用
// =======================

function usePotionOutsideBattle(){
  const sel=document.getElementById("useItemSelect");
  if(!sel || !sel.value){
    appendLog("使用するアイテムを選んでください");
    return;
  }
  const p = potions.find(x=>x.id===sel.value);
  if(!p || potionCounts[p.id]<=0){
    appendLog("そのアイテムを所持していない");
    return;
  }
  if(p.type===POTION_TYPE_HP || p.type===POTION_TYPE_BOTH){
    const heal = p.power;
    hp = Math.min(hp+heal, hpMax);
    appendLog(`${p.name} を使った。HPが${heal}回復した。`);
  }else if(p.type===POTION_TYPE_MP){
    const heal = p.power;
    mp = Math.min(mp+heal, mpMax);
    appendLog(`${p.name} を使った。MPが${heal}回復した。`);
  }
  potionCounts[p.id]--;
  updateDisplay();
}

function useBattleItem(){
  const sel = document.getElementById("battleItemSelect");
  if(!sel || !sel.value){
    appendLog("戦闘で使うアイテムを選んでください");
    return;
  }
  if(!currentEnemy){
    appendLog("敵がいないので使用できない");
    return;
  }
  const p = potions.find(x=>x.id===sel.value);
  if(!p || potionCounts[p.id]<=0){
    appendLog("そのアイテムを所持していない");
    return;
  }

  // 共通で1個消費
  potionCounts[p.id]--;

  if (p.type === POTION_TYPE_DAMAGE) {
    // ダメージ系（爆弾など）
    const dmg = p.power;
    enemyHp = Math.max(0, enemyHp - dmg);
    appendLog(`${p.name} を投げつけた！ ${currentEnemy.name} に${dmg}ダメージ！`);
  } else if (p.type === POTION_TYPE_HP || p.type === POTION_TYPE_BOTH) {
    // HP回復
    const heal = p.power;
    const before = hp;
    hp = Math.min(hp + heal, hpMax);
    const real = hp - before;
    appendLog(`${p.name} を使用！ HPが${real}回復した。`);
  } else if (p.type === POTION_TYPE_MP) {
    // MP回復
    const heal = p.power;
    const before = mp;
    mp = Math.min(mp + heal, mpMax);
    const real = mp - before;
    appendLog(`${p.name} を使用！ MPが${real}回復した。`);
  } else {
    appendLog("そのアイテムは戦闘では効果がなかった…");
  }

  // 戦闘中にアイテムを使ったらターン消費扱い
  updateDisplay();

  if (enemyHp <= 0) {
    winBattle();
    return;
  }

  // 動物使いならペットも行動（倒せば敵ターンなし）
  if (typeof doPetTurn === "function") {
    doPetTurn();
  }
  if (!currentEnemy || enemyHp <= 0) {
    return;
  }

  // 敵ターン
  enemyTurn();
}
// =======================
// ショップ
// =======================

function buyPotion(potionId, price){
  if(money < price){
    appendLog("お金が足りない");
    return;
  }
  const p = potions.find(x=>x.id===potionId);
  if(!p){
    appendLog("商品データが存在しない");
    return;
  }
  money -= price;
  potionCounts[p.id] = (potionCounts[p.id] || 0) + 1;
  appendLog(`${p.name} を購入した`);
  updateDisplay();
}

// =======================
// 初期化
// =======================

let firstJobMessageShown = false;

function initGame(){
  refreshEquipSelects();
  updateDisplay();
  setBattleCommandVisible(false);
  if (typeof refreshSkillUIs === "function") {
    refreshSkillUIs();
  }

  if (jobId === null) {
    openJobModal();
    if (!firstJobMessageShown) {
      setLog("最初の職業を選んでください。");
      firstJobMessageShown = true;
    }
  }

  updateSkillButtonsByJob();
  if (typeof updateBattleSkillUIByJob === "function") {
    updateBattleSkillUIByJob();
  }
  updateBossButtonUI();
}