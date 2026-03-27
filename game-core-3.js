// game-core-3.js
// 探索・戦闘・ボス関連

// =======================
// グローバル状態（追記分）
// =======================

// エリアごとの「今ボスに挑める状態か」
// 一度見つかるとボス戦を1回するまで true
const areaBossAvailable = {
  field:  false,
  forest: false,
  cave:   false,
  mine:   false
};

// =======================
// 敵・エリア関連ヘルパ
// =======================

// AREA_ENEMY_TABLE の旧形式 / 新形式 両対応
// 旧:  AREA_ENEMY_TABLE.field = ["slime", "wolf", ...]
// 新:  AREA_ENEMY_TABLE.field = { enemyIds: [...], weights: [...] }
function getRandomEnemyForArea(area) {
  // テーブルが未定義なら草原を使う
  const table = AREA_ENEMY_TABLE[area] || AREA_ENEMY_TABLE.field;

  // 1) 旧形式: 単純な id 配列
  if (Array.isArray(table)) {
    if (table.length === 0) return null;
    const id = table[Math.floor(Math.random() * table.length)];
    return ENEMIES[id] || null;
  }

  // 2) 新形式: { enemyIds: [...], weights: [...] }
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
//
// areaBossCleared の状態に応じて、探索先セレクト(exploreTarget)に
// 草原 / 森 / 洞窟 / 廃鉱山 を出し分ける。
// - 草原: いつでも
// - 森:    草原ボスクリア後
// - 洞窟:  森ボスクリア後
// - 廃鉱山:洞窟ボスクリア後
//
function refreshExploreAreaSelect() {
  const sel = document.getElementById("exploreTarget");
  if (!sel) return;

  const prev = sel.value;
  sel.innerHTML = "";

  // 草原（常に解放）
  {
    const opt = document.createElement("option");
    opt.value = "field";
    opt.textContent = "草原（敵弱い・素材ほぼ出ない）";
    sel.appendChild(opt);
  }

  // 森：草原ボスクリア済みなら解放
  if (typeof areaBossCleared === "undefined" || areaBossCleared.field) {
    const opt = document.createElement("option");
    opt.value = "forest";
    opt.textContent = "森（敵やや強い・草/木が少し出る）";
    sel.appendChild(opt);
  }

  // 洞窟：森ボスクリア済みなら解放
  if (typeof areaBossCleared === "undefined" || areaBossCleared.forest) {
    const opt = document.createElement("option");
    opt.value = "cave";
    opt.textContent = "洞窟（敵強い・素材少し）";
    sel.appendChild(opt);
  }

  // 廃鉱山：洞窟ボスクリア済みなら解放
  if (typeof areaBossCleared === "undefined" || areaBossCleared.cave) {
    const opt = document.createElement("option");
    opt.value = "mine";
    opt.textContent = "廃鉱山（敵かなり強い・鉱石/皮レア）";
    sel.appendChild(opt);
  }

  // 以前選んでいたエリアがまだ存在するなら維持、なければ先頭
  const exists = Array.from(sel.options).some(o => o.value === prev);
  sel.value = exists ? prev : (sel.options[0]?.value || "field");

  // ボスボタンの表示も更新
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
  const area = getCurrentArea();

  // 「今このエリアでボスに挑める状態か」だけを見る
  if (areaBossAvailable[area]) {
    bossBtn.style.display = "inline-block";
  } else {
    bossBtn.style.display = "none";
  }
}

// =======================
// 探索時のボス発見判定
// =======================

// 探索のたびに 0.05% で「このエリアのボスに挑める」ようになる。
// 一度見つかるとボス戦を1回やるまで保持。
function tryFindBossOnExplore() {
  const area = getCurrentArea();
  if (areaBossAvailable[area]) return; // すでに探索済み

  const roll = Math.random();          // 0〜1
  if (roll < 0.0005) {                 // 0.05%
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

  setBattleCommandVisible(true);
  setExploreUIVisible(false);  // 敵が出ている間は探索UI非表示
  updateDisplay();
}

function endBattleCommon() {
  currentEnemy = null;
  enemyHp = 0;
  enemyHpMax = 0;
  isBossBattle = false;

  setBattleCommandVisible(false);
  setExploreUIVisible(true);   // 戦闘終了で探索UIを戻す
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
  const damage = Math.max(1, atkTotal - (currentEnemy.def || 0));
  enemyHp -= damage;
  appendLog(`あなたの攻撃！ ${currentEnemy.name}に${damage}ダメージ！`);

  if(enemyHp <= 0){
    enemyHp = 0;
    const expGain = currentEnemy.exp || BASE_EXP_PER_BATTLE;
    const moneyGain = currentEnemy.money || 10;
    appendLog(`${currentEnemy.name}を倒した！ 経験値${expGain}と${moneyGain}Gを手に入れた`);
    addExp(expGain);
    money += moneyGain;
    addPetExp(Math.floor(expGain/2));

    // ボスだった場合はボス撃破処理、それ以外は通常終了
    if (isBossBattle) {
      onBossDefeated();
    } else {
      endBattleCommon();
    }
    return;
  }

  enemyTurn();
}

function enemyTurn(){
  if(!currentEnemy) return;
  let dmg = Math.max(1, (currentEnemy.atk || 3) - defTotal);
  hp -= dmg;
  appendLog(`${currentEnemy.name}の攻撃！ ${dmg}ダメージを受けた`);
  if(hp <= 0){
    hp = 0;
    appendLog("あなたは倒れてしまった…");
    endBattleCommon();
  } else {
    updateDisplay();
  }
}

// =======================
// ボス戦
// =======================

function startBossBattle() {
  const area = getCurrentArea();
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

  // このエリアの「挑戦可能フラグ」を消費
  areaBossAvailable[area] = false;
  updateBossButtonUI();

  appendLog(`${boss.name} が立ちはだかった！`);
  startBattleCommon(boss, true);
}

function onBossDefeated() {
  const area = getCurrentArea();

  // このエリアのボスを「倒したことがある」フラグを立てる
  if (typeof areaBossCleared !== "undefined") {
    areaBossCleared[area] = true;
  }

  // 次のエリアを解放
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

  // エリアセレクトを更新（新エリアをリストに出す）
  if (typeof refreshExploreAreaSelect === "function") {
    refreshExploreAreaSelect();
  }

  // 戦闘終了
  endBattleCommon();
}

// =======================
// 探索
// =======================

function doExploreEvent(){
  // 戦闘中は探索できない
  if (currentEnemy) {
    appendLog("戦闘中は探索できない！");
    return;
  }

  const area = getCurrentArea();

  // まずボス発見判定（0.05%）
  tryFindBossOnExplore();

  // 通常の探索イベント・敵抽選
  const roll = Math.random();

  // 非戦闘イベント例（簡略）
  if (roll < 0.2) {
    appendLog("何も見つからなかった…");
    return;
  }

  // 敵出現
  const enemy = getRandomEnemyForArea(area);
  if (!enemy) {
    appendLog("敵データが見つからない");
    return;
  }
  appendLog(`${enemy.name} が現れた！`);
  startNormalBattle(enemy);
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
  }
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
    return;
  }
  applyPotionEffect(p, false);
  potionCounts[id]--;
  appendLog(`${p.name} を使用した`);
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
    return;
  }
  applyPotionEffect(p, true);
  potionCounts[id]--;
  appendLog(`戦闘中に ${p.name} を使用した`);
  if(currentEnemy){
    enemyTurn();
  }
  updateDisplay();
}

function applyPotionEffect(p, inBattle){
  if(p.type === POTION_TYPE_HP){
    const heal = p.power;
    hp = Math.min(hpMax, hp + heal);
    appendLog(`HPが${heal}回復した`);
  } else if(p.type === POTION_TYPE_MP){
    const heal = p.power;
    mp = Math.min(mpMax, mp + heal);
    appendLog(`MPが${heal}回復した`);
  } else if(p.type === POTION_TYPE_BOTH){
    const heal = p.power;
    hp = Math.min(hpMax, hp + heal);
    mp = Math.min(mpMax, mp + heal);
    appendLog(`HPとMPが${heal}回復した`);
  } else if(p.type === POTION_TYPE_DAMAGE){
    if(!inBattle || !currentEnemy){
      appendLog("爆弾は戦闘中にしか使えない");
      return;
    }
    const dmg = p.power;
    enemyHp -= dmg;
    appendLog(`爆弾を投げつけた！ ${currentEnemy.name}に${dmg}ダメージ！`);
    if(enemyHp <= 0){
      enemyHp = 0;
      const expGain = currentEnemy.exp || BASE_EXP_PER_BATTLE;
      const moneyGain = currentEnemy.money || 10;
      appendLog(`${currentEnemy.name}を倒した！ 経験値${expGain}と${moneyGain}Gを手に入れた`);
      addExp(expGain);
      money += moneyGain;
      addPetExp(Math.floor(expGain/2));

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
  // 装備プルダウンなどの初期化
  if (typeof refreshEquipSelects === "function") {
    refreshEquipSelects();
  }

  // 探索エリアセレクト整形（ボス解放状況に応じて）
  if (typeof refreshExploreAreaSelect === "function") {
    refreshExploreAreaSelect();
  }

  // 表示更新
  updateDisplay();

  // 戦闘コマンドは最初は非表示
  if (typeof setBattleCommandVisible === "function") {
    setBattleCommandVisible(false);
  }

  // スキル系UI初期化（あれば）
  if (typeof refreshSkillUIs === "function") {
    refreshSkillUIs();
  }

  // 職業未設定ならモーダルを開く
  if (typeof jobId === "undefined" || jobId === null) {
    if (typeof openJobModal === "function") {
      openJobModal();
    }
    if (!firstJobMessageShown && typeof setLog === "function") {
      setLog("最初の職業を選んでください。");
      firstJobMessageShown = true;
    }
  }

  // 職業に応じたスキルボタン表示
  if (typeof updateSkillButtonsByJob === "function") {
    updateSkillButtonsByJob();
  }
  if (typeof updateBattleSkillUIByJob === "function") {
    updateBattleSkillUIByJob();
  }

  // ボスボタン初期表示
  if (typeof updateBossButtonUI === "function") {
    updateBossButtonUI();
  }
}