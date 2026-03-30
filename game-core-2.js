// game-core-2.js
// レベル・転生・職業・ペット ＋ 空腹・水分・EXPボーナス

// =======================
// レベル・転生
// =======================

// ★ 追加: レベルに応じた最大HPを返す関数
// Lv1 は hpMaxBase (=30) のまま、Lv2 以降は +2ずつ伸ばす例。
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
    hpMax = recalcHpMaxByLevel();
    hp    = hpMax;
    mp    = mpMax;
    sp    = spMax;

    // 成長ロール
    const rolls = getLevelUpRolls();
    for (let i = 0; i < rolls; i++) {
      applyLevelUpGrowth();
    }

    expToNext = BASE_EXP_PER_LEVEL;
  }
  if (leveled) {
    appendLog(`レベルアップ！ Lv${level}になった（成長タイプ: ${getGrowthTypeName()}）`);
  }
  updateDisplay();
}

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
    petExpToNext = Math.floor(petExpToNext * 1.3);
  }
  if (leveled) {
    appendLog(`ペットのレベルが上がった！ Lv${petLevel}`);
  }
  updateDisplay();
}

function applyRebirthBonus() {
  const choices = ["STR","VIT","INT","DEX","LUK","HP","MP","SP"];
  let msgList = [];
  const rolls = 1; // 今は1回固定（必要なら将来拡張）

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

const REBIRTH_LEVEL_REQ = 10;

function doRebirth() {
  if (level < REBIRTH_LEVEL_REQ) {
    appendLog(`転生にはLv${REBIRTH_LEVEL_REQ}以上が必要です`);
    return;
  }

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

  // 素材と所持品リセット
  if (typeof materials !== "undefined") {
    Object.keys(materials).forEach(k => {
      materials[k].t1 = 0;
      materials[k].t2 = 0;
      materials[k].t3 = 0;
    });
  }
  wood = ore = herb = cloth = leather = water = 0;

  money = 0;
  Object.keys(weaponCounts).forEach(k => weaponCounts[k] = 0);
  Object.keys(armorCounts).forEach(k  => armorCounts[k]  = 0);
  Object.keys(potionCounts).forEach(k => potionCounts[k] = 0);
  equippedWeaponId = null;
  equippedArmorId  = null;

  // ペットリセット
  petLevel     = 1;
  petExp       = 0;
  petExpToNext = 5;
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

// 空腹・水分を増やす（料理・飲み物から呼ぶ想定）
function restoreHungerThirst(addHunger, addThirst) {
  hunger = Math.min(100, hunger + (addHunger || 0));
  thirst = Math.min(100, thirst + (addThirst || 0));

  // どちらかでも100になったら20分間は減らさない
  if (hunger === 100 || thirst === 100) {
    wellFedUntil = Date.now() + 20 * 60 * 1000;
  }

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