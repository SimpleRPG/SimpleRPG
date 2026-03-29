// game-core-5.js
// 敵関連ロジック（エリア出現・ボス生成・撃破処理）
//
// 前提：enemy-data.js で
//   ENEMIES, AREA_ENEMY_TABLE, AREA_BOSS_ID
// が定義済み。
// game-core-1.js / 3.js で
//   currentEnemy, enemyHp, enemyHpMax, isBossBattle,
//   areaBossCleared, areaBossAvailable,
//   money, addExp, addPetExp,
//   getCurrentArea(), setBattleCommandVisible(), setExploreUIVisible(),
//   updateDisplay(), appendLog(), endBattleCommon()
// が定義済み。

// =======================
// 敵生成系
// =======================

/**
 * エリアの出現テーブルからランダムに敵IDを1つ選ぶ
 * @param {string} areaId - "field" / "forest" / "cave" / "mine"
 * @returns {string|null}
 */
function pickRandomEnemyId(areaId) {
  const table = AREA_ENEMY_TABLE[areaId];
  if (!table || table.length === 0) return null;
  const idx = Math.floor(Math.random() * table.length);
  return table[idx];
}

/**
 * マスターデータから戦闘用の敵インスタンスを生成
 * @param {string} enemyId
 * @param {boolean} forceBossFlag - 強制的にボス扱いにしたいとき true
 * @returns {object|null}
 */
function createEnemyInstance(enemyId, forceBossFlag = false) {
  const master = ENEMIES[enemyId];
  if (!master) return null;

  return {
    id: master.id,
    name: master.name,
    maxHp: master.hp,
    hp: master.hp,
    atk: master.atk,
    def: master.def,
    exp: master.exp,
    money: master.money,
    isBoss: forceBossFlag ? true : !!master.isBoss
  };
}

/**
 * 現在選択中エリアから通常敵を1体生成して戦闘開始
 * （探索イベントから呼ぶ想定）
 */
function startRandomEncounter() {
  const areaId = getCurrentArea();
  const enemyId = pickRandomEnemyId(areaId);
  if (!enemyId) {
    appendLog("このエリアには敵がいないようだ…");
    return;
  }

  const enemy = createEnemyInstance(enemyId, false);
  if (!enemy) {
    appendLog("敵データの取得に失敗しました");
    return;
  }

  // game-core-3.js の共通開始処理を利用
  startBattleCommon(
    {
      id: enemy.id,
      name: enemy.name,
      hp: enemy.maxHp,
      atk: enemy.atk,
      def: enemy.def,
      exp: enemy.exp,
      money: enemy.money,
      isBoss: false
    },
    false
  );
  appendLog(`敵「${enemy.name}」が現れた！`);
}

/**
 * 指定エリアのボス戦を開始
 * @param {string} areaId
 */
function startBossBattleForArea(areaId) {
  const bossId = AREA_BOSS_ID[areaId];
  if (!bossId) {
    appendLog("このエリアにはボスがいないようだ");
    return;
  }

  const boss = createEnemyInstance(bossId, true);
  if (!boss) {
    appendLog("ボスデータが見つからない");
    return;
  }

  areaBossAvailable[areaId] = false;
  if (typeof updateBossButtonUI === "function") {
    updateBossButtonUI();
  }

  appendLog(`${boss.name} が立ちはだかった！`);

  startBattleCommon(
    {
      id: boss.id,
      name: boss.name,
      hp: boss.maxHp,
      atk: boss.atk,
      def: boss.def,
      exp: boss.exp,
      money: boss.money,
      isBoss: true
    },
    true
  );
}

/**
 * UIのボスボタンから呼ぶ入口
 */
function startBossBattleFromUI() {
  const area = window.isExploring
    ? (window.exploringArea || getCurrentArea())
    : getCurrentArea();
  startBossBattleForArea(area);
}

// =======================
// 撃破処理（経験値・お金・ボスフラグ）
// =======================

/**
 * 敵撃破時に共通で呼ぶ処理
 * @param {object} enemyInst - currentEnemy を想定
 */
function onEnemyDefeatedCore(enemyInst) {
  if (!enemyInst) return;

  const expGain   = enemyInst.exp   || BASE_EXP_PER_BATTLE;
  const moneyGain = enemyInst.money || 10;

  appendLog(
    `${enemyInst.name}を倒した！ 経験値${expGain}と${moneyGain}Gを手に入れた`
  );

  addExp(expGain);
  money += moneyGain;

  if (jobId === 2) {
    addPetExp(Math.floor(expGain / 2));
  }

  if (enemyInst.isBoss) {
    // ボス用の既存処理に任せる
    onBossDefeated();
  } else {
    endBattleCommon();
  }

  // お金が変動したので表示更新（ショップ側の所持金表示もここで反映）
  updateDisplay();
}