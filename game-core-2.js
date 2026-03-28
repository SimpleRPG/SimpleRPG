// game-core-2.js
// レベル・転生・職業・ペット

// =======================
// レベル・転生
// =======================

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

    // ベース成長
    hpMax = hpMaxBase + level * 2;
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

  // 基礎ステ再計算
  hpMax = hpMaxBase + level * 2;
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