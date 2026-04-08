// game-core-2.js
// レベル・転生・職業・ペット ＋ 空腹・水分・EXPボーナス

// =======================
// レベル・転生
// =======================

// ★ レベルに応じた最大HPを返す関数
// Lv1 は hpMaxBase (=30) のまま、Lv2 以降は +2ずつ伸ばす。
function recalcHpMaxByLevel() {
  if (level <= 1) {
    return hpMaxBase;                   // Lv1: 30
  } else {
    return hpMaxBase + (level - 1) * 2; // Lv2〜: +2ずつ
  }
}

function applyLevelUpGrowth() {
  const pool = [];
  if (growthType === 0) {
    // STR型
    pool.push("STR","STR","STR","VIT","VIT","INT_","DEX_","LUK");
  } else if (growthType === 1) {
    // VIT型
    pool.push("VIT","VIT","VIT","STR","STR","INT_","DEX_","LUK");
  } else if (growthType === 2) {
    // INT型
    pool.push("INT_","INT_","INT_","DEX_","STR","VIT","LUK");
  } else if (growthType === 3) {
    // LUK型
    pool.push("LUK","LUK","LUK","DEX_","STR","VIT","INT_");
  } else {
    // バランス型（4）
    pool.push("STR","VIT","INT_","DEX_","LUK");
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  if      (pick === "STR")  STR++;
  else if (pick === "VIT")  VIT++;
  else if (pick === "INT_") INT_++;
  else if (pick === "DEX_") DEX_++;
  else if (pick === "LUK")  LUK_++;
}

function getLevelUpRolls() {
  const extra = Math.floor(Math.sqrt(rebirthCount)) + Math.floor(rebirthCount / 20);
  return 1 + extra;
}

function addExp(amount) {
  exp += amount;
  let leveled = false;
  while (exp >= expToNext) {
    exp -= expToNext;
    level++;
    leveled = true;

    // ★ ベース成長: HP 最大値をレベルに応じて決定
    //   → hpMaxBase は転生ボーナス用の基礎値、実際のレベル反映は recalcHpMaxByLevel に一本化
    hpMax = recalcHpMaxByLevel();
    hp    = hpMax;
    mp    = mpMax;
    sp    = spMax;

    // 成長ロール
    const rolls = getLevelUpRolls();
    for (let i = 0; i < rolls; i++) {
      applyLevelUpGrowth();
    }

    // ★ 必要経験値をレベルアップごとに再設定
    expToNext = BASE_EXP_PER_LEVEL;
  }
  if (leveled) {
    appendLog(`レベルアップ！ Lv${level}になった（成長タイプ: ${getGrowthTypeName()}）`);

    // ★ レベルアップ後に攻撃力・防御力・最大HPなどを再計算
    if (typeof recalcStats === "function") {
      recalcStats();
    }
  }
  updateDisplay();
}

// ★ ペット経験値：プレイヤーと同じ 100 固定＆LvUpでHP再計算
function addPetExp(amount) {
  if (jobId !== 2) return;
  petExp += amount;
  let leveled = false;
  while (petExp >= petExpToNext) {
    petExp -= petExpToNext;
    petLevel++;
    leveled = true;

    if (petGrowthType === PET_GROWTH_TANK) {
      petHpBase += 7;
      petAtkBase += 1;
    } else if (petGrowthType === PET_GROWTH_DPS) {
      petHpBase += 2;
      petAtkBase += 3;
    } else {
      petHpBase += 4;
      petAtkBase += 2;
    }

    // ★ ペット最大HPをベース値から再計算して全回復
    petHpMax = petHpBase + petRebirthCount * 3;
    petHp    = petHpMax;

    // ★ 必要経験値はプレイヤーと同じく 100 固定
    petExpToNext = BASE_EXP_PER_LEVEL;
  }
  if (leveled) {
    appendLog(`ペットのレベルが上がった！ Lv${petLevel}`);
  }
  updateDisplay();
}

function applyRebirthBonus() {
  const choices = ["STR","VIT","INT","DEX","LUK","HP","MP","SP"];
  let msgList = [];
  const rolls = 3; // 今は3回固定（必要なら将来拡張）

  for (let i = 0; i < rolls; i++) {
    const pick = choices[Math.floor(Math.random() * choices.length)];
    if (pick === "HP") {
      hpMaxBase += 3;
      msgList.push("最大HP +3");
    } else if (pick === "MP") {
      mpMaxBase += 2;
      msgList.push("最大MP +2");
    } else if (pick === "SP") {
      spMaxBase += 2;
      msgList.push("最大SP +2");
    } else if (pick === "STR") {
      STR += 1;
      msgList.push("STR +1");
    } else if (pick === "VIT") {
      VIT += 1;
      msgList.push("VIT +1");
    } else if (pick === "INT") {
      INT_ += 1;
      msgList.push("INT +1");
    } else if (pick === "DEX") {
      DEX_ += 1;
      msgList.push("DEX +1");
    } else if (pick === "LUK") {
      LUK_ += 1;
      msgList.push("LUK +1");
    }
  }
  return "転生ボーナス:\n" + msgList.join("\n");
}

function applyPetRebirthBonus() {
  petRebirthCount++;
  petAtkBase += 2;
  petHpBase  += 8;
}

const REBIRTH_LEVEL_REQ = 100;

// ★ 初期ステータスに戻す（転生用）
// 既存の game-core-1.js の初期値に合わせる
function resetBaseStatsToInitial() {
  STR  = 1;
  VIT  = 1;
  INT_ = 1;
  DEX_ = 1;
  LUK_ = 1;

  hpMaxBase = 30;
  mpMaxBase = 10;
  spMaxBase = 10;
}

function doRebirth() {
  if (level < REBIRTH_LEVEL_REQ) {
    appendLog(`転生にはLv${REBIRTH_LEVEL_REQ}以上が必要です`);
    return;
  }

  // ★ 先に基礎ステを初期値に戻す
  resetBaseStatsToInitial();

  rebirthCount++;
  growthType = Math.floor(Math.random() * 5); // 0〜4の成長タイプに再ロール
  const bonusMsg = applyRebirthBonus();
  applyPetRebirthBonus();

  // レベル・経験値リセット
  level     = 1;
  exp       = 0;
  expToNext = BASE_EXP_PER_LEVEL;

  // ★ 基礎ステ再計算（HPはレベルに応じて）
  hpMax = recalcHpMaxByLevel();
  hp    = hpMax;
  mpMax = mpMaxBase;
  mp    = mpMax;
  spMax = spMaxBase;
  sp    = spMax;

  // ★ 素材と所持品はリセットしない（既存の保持仕様を維持する）

  // ペットリセット
  petLevel     = 1;
  petExp       = 0;
  // ★ ペットの必要経験値も 100 でリセット
  petExpToNext = BASE_EXP_PER_LEVEL;
  petHpMax     = petHpBase + petRebirthCount * 3;
  petHp        = petHpMax;

  // 戦闘状態リセット
  currentEnemy = null;
  enemyHp      = 0;
  enemyHpMax   = 0;
  isBossBattle = false;

  setBattleCommandVisible(false);

  setLog(
    `転生した！ 転生回数: ${rebirthCount}\n` +
    `成長タイプ: ${getGrowthTypeName()}\n` +
    `${bonusMsg}\n` +
    `ペット転生回数: ${petRebirthCount}（基礎ATKとHPが強化された）`
  );

  // 装備リスト・表示更新（実体は game-core-4 側）
  if (typeof refreshEquipSelects === "function") {
    refreshEquipSelects();
  }
  updateDisplay();
  updateSkillButtonsByJob();
}

// =======================
// 空腹・水分・EXPボーナス
// =======================

// 0〜100。初期は満タン
let hunger = 100;
let thirst = 100;

// 100になった瞬間から20分間は減らさないためのタイムスタンプ(ms)
let wellFedUntil = 0;

// 行動回数カウンタ（戦闘・採取など）
let hungerActionCount = 0;
let thirstActionCount = 0;

// ★ 空腹・水分による最大値＆ステ補正用係数
let hungerHpRate        = 1.0; // 0〜1（最大HP用）
let thirstMpSpRate      = 1.0; // 0〜1（最大MP/SP用）
let hungerAtkIntRate    = 1.0; // 0〜1（STR, INT 用）
let thirstDefDexLukRate = 1.0; // 0〜1（VIT, DEX, LUK 用）

// しきい値ログ用フラグ
let hungerBelow50Logged = false;
let hungerBelow25Logged = false;
let thirstBelow50Logged = false;
let thirstBelow25Logged = false;

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// 今「満腹＆十分な水分」かどうか
function isWellFed() {
  const now = Date.now();
  // 100にしてから20分経過していなければ常に満腹扱い
  if (now < wellFedUntil) return true;
  // タイマー切れ後は実際の値で判定
  return hunger >= 90 && thirst >= 90;
}

// 戦闘1勝あたりの経験値を返す
// （敵expを無視して「5 or 8固定」にしたい案に合わせている）
function getBattleExpPerWin(enemy) {
  // 将来、敵ごとのexpを活かすならここで enemy.exp を使って倍率をかける
  return isWellFed() ? 8 : 5;
}

// ★ 空腹・水分の値から各種係数を更新する
function updateHungerThirstEffects() {
  const hungerRatio = clamp01(hunger / 100);
  const thirstRatio = clamp01(thirst / 100);

  // 50%を切ったところから「0.5→1.0 / 0→0.0」で線形
  if (hungerRatio < 0.5) {
    hungerHpRate = hungerRatio / 0.5;   // 0.5で1.0, 0で0.0
    if (!hungerBelow50Logged) {
      appendLog("お腹が減ってきた… 最大HPが下がり始めている。");
      hungerBelow50Logged = true;
    }
  } else {
    hungerHpRate = 1.0;
    hungerBelow50Logged = false; // 回復で50%以上に戻ったらリセット
  }

  if (thirstRatio < 0.5) {
    thirstMpSpRate = thirstRatio / 0.5;
    if (!thirstBelow50Logged) {
      appendLog("喉の渇きを感じる… 最大MPとSPが下がり始めている。");
      thirstBelow50Logged = true;
    }
  } else {
    thirstMpSpRate = 1.0;
    thirstBelow50Logged = false;
  }

  // 25%を切ったら STR/INT, VIT/DEX/LUK にデバフ
  if (hungerRatio < 0.25) {
    const t = hungerRatio / 0.25;       // 0〜1
    hungerAtkIntRate = 0.7 + 0.3 * t;   // 0.25→1.0, 0→0.7
    if (!hungerBelow25Logged) {
      appendLog("空腹で力が入らない… 攻撃と魔力がかなり落ちている。");
      hungerBelow25Logged = true;
    }
  } else {
    hungerAtkIntRate = 1.0;
    hungerBelow25Logged = false;
  }

  if (thirstRatio < 0.25) {
    const t = thirstRatio / 0.25;
    thirstDefDexLukRate = 0.7 + 0.3 * t;
    if (!thirstBelow25Logged) {
      appendLog("強い渇きで体が重い… 防御や器用さがかなり落ちている。");
      thirstBelow25Logged = true;
    }
  } else {
    thirstDefDexLukRate = 1.0;
    thirstBelow25Logged = false;
  }

  // 係数が変わったのでステ再計算
  if (typeof recalcStats === "function") {
    recalcStats();
  }
}

// 空腹・水分を増やす（料理・飲み物から呼ぶ想定）
function restoreHungerThirst(addHunger, addThirst) {
  hunger = Math.min(100, hunger + (addHunger || 0));
  thirst = Math.min(100, thirst + (addThirst || 0));

  // どちらかでも100になったら20分間は減らさない
  if (hunger === 100 || thirst === 100) {
    wellFedUntil = Date.now() + 20 * 60 * 1000;
  }

  // ★ 満腹・水分回復時にもデバフを更新
  updateHungerThirstEffects();

  updateDisplay();
}

// 行動時（戦闘勝利・採取成功など）に呼ぶ。放置では減らさない。
function handleHungerThirstOnAction(actionType) {
  const now = Date.now();
  if (now < wellFedUntil) {
    // 満腹タイム中は一切減らさない
    return;
  }

  // 行動内容で分岐したければ actionType を見る（今は共通で+1）
  hungerActionCount++;
  thirstActionCount++;

  // 毎アクション -1
  hunger = Math.max(0, hunger - 1);
  thirst = Math.max(0, thirst - 1);

  // カウンタはもう不要なら消してよい
  hungerActionCount = 0;
  thirstActionCount = 0;

  // ★ 空腹・水分低下に伴う係数更新
  updateHungerThirstEffects();

  updateDisplay();
}

// UI側から現在値を引くためのヘルパー
function getHungerValue() {
  return hunger;
}

function getThirstValue() {
  return thirst;
}

// =======================
// 職業・ペット成長タイプ
// =======================

function openJobModal() {
  const modal   = document.getElementById("jobModal");
  const titleEl = document.getElementById("jobModalTitle");
  const msgEl   = document.getElementById("jobModalMessage");
  if (!modal || !titleEl || !msgEl) return;

  if (!jobChangedOnce && jobId === null) {
    titleEl.textContent = "最初に職業を選択";
    msgEl.innerHTML = "最初に職業を1つ選んでください（変更は後から100Gで可能）。<br>※選ぶまでゲームは開始されません。";
  } else {
    titleEl.textContent = "職業を選択";
    msgEl.innerHTML = "職業を1つ選んでください。<br>変更は100Gで可能です。";
  }

  modal.style.display = "flex";
}

function closeJobModal() {
  const modal = document.getElementById("jobModal");
  if (modal) modal.style.display = "none";
}

function applyJobChange(newJobId) {
  if (jobId === newJobId) {
    appendLog("すでにその職業です");
    closeJobModal();
    return;
  }

  if (jobChangedOnce) {
    if (money < 100) {
      appendLog("職業変更には100G必要です");
      closeJobModal();
      return;
    }
    money -= 100;
  } else {
    jobChangedOnce = true;
  }

  jobId = newJobId;
  if (newJobId === 2) everBeastTamer = true;

  // 初回転生前は職業に応じて成長タイプ固定
  if (!rebirthCount) {
    if      (newJobId === 0) growthType = 0; // 戦士=STR型
    else if (newJobId === 1) growthType = 2; // 魔法使い=INT型
    else if (newJobId === 2) growthType = 4; // 動物使い=バランス型
  }

  // ★ 動物使い用ペットスキルの初期化
  if (jobId === 2) {
    petSkills = [
      { id: "powerBite", name: "パワーバイト", powerRate: 1.6 },
      { id: "taunt",     name: "挑発" },
      { id: "selfHeal",  name: "セルフヒール", healRate: 0.3 }
    ];
  } else {
    petSkills = [];
  }

  // ★ 職業変更後にステータス再計算
  recalcStats();

  // ★ 職業選択・変更時に MP/SP を最大まで回復
  mp = mpMax;
  sp = spMax;

  appendLog(`職業を「${getJobName()}」に変更した`);
  closeJobModal();
  updateDisplay();
  updateSkillButtonsByJob();

  if (typeof refreshSkillUIs === "function") {
    refreshSkillUIs();
  }
  if (typeof updateBattleSkillUIByJob === "function") {
    updateBattleSkillUIByJob();
  }
  updateBossButtonUI();
}

function changePetGrowthType() {
  if (jobId !== 2) {
    appendLog("動物使いのみ変更できます");
    return;
  }
  const modal = document.getElementById("petGrowthModal");
  if (modal) modal.style.display = "flex";
}