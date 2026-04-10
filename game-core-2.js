// game-core-2.js
// レベル・転生・職業・ペット ＋ 空腹・水分・EXPボーナス

// =======================
// レベル・転生
// =======================

// ★ レベルに応じた最大HP加算量を返す関数
// Lv1 は +0、Lv2 以降は +2ずつ伸ばす（Lv2: +2, Lv3: +4, ...）。
function getHpLevelBonus() {
  if (level <= 1) {
    return 0;
  } else {
    return (level - 1) * 2;
  }
}

// ★ 成長ロール1回ぶんを行い、どのステが上がったかを返す
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
  if      (pick === "STR")  { STR++;  return "STR"; }
  else if (pick === "VIT")  { VIT++;  return "VIT"; }
  else if (pick === "INT_") { INT_++; return "INT"; }
  else if (pick === "DEX_") { DEX_++; return "DEX"; }
  else if (pick === "LUK")  { LUK_++; return "LUK"; }
  return null;
}

function getLevelUpRolls() {
  // 基本1ロール + 転生回数ぶん上乗せ
  return 1 + rebirthCount;
}

function addExp(amount) {
  exp += amount;
  let leveled = false;
  // ★ レベルアップ中に増えたステータスを集計する
  let totalUp = { STR: 0, VIT: 0, INT: 0, DEX: 0, LUK: 0 };

  while (exp >= expToNext) {
    exp -= expToNext;
    level++;
    leveled = true;

    // ★ ベース成長: レベルアップごとに最大HP基礎値を +2 ずつ伸ばす（Lv2以降）。
    //   例: Lv1→2 で +2, Lv2→3 でさらに +2 ...
    if (level >= 2) {
      hpMaxBase += 2;
    }

    // 成長ロール
    const rolls = getLevelUpRolls();
    for (let i = 0; i < rolls; i++) {
      const up = applyLevelUpGrowth();
      if (up && totalUp[up] != null) {
        totalUp[up] += 1;
      }
    }

    // ★ 必要経験値をレベルアップごとに再設定
    expToNext = BASE_EXP_PER_LEVEL;
  }
  if (leveled) {
    appendLog(`レベルアップ！ Lv${level}になった（成長タイプ: ${getGrowthTypeName()}）`);

    // ★ どのステータスがどれだけ上がったかをまとめてログ
    const parts = [];
    if (totalUp.STR) parts.push(`STR +${totalUp.STR}`);
    if (totalUp.VIT) parts.push(`VIT +${totalUp.VIT}`);
    if (totalUp.INT) parts.push(`INT +${totalUp.INT}`);
    if (totalUp.DEX) parts.push(`DEX +${totalUp.DEX}`);
    if (totalUp.LUK) parts.push(`LUK +${totalUp.LUK}`);
    if (parts.length > 0) {
      appendLog("成長ステータス: " + parts.join(", "));
    }

    // ★ レベルアップ後に攻撃力・防御力・最大HPなどを再計算
    if (typeof recalcStats === "function") {
      recalcStats();
      // レベルアップ時は HP/MP/SP を最大まで回復（元の仕様を維持する意図）。
      hp = hpMax;
      mp = mpMax;
      sp = spMax;
    }
  }
  updateDisplay();
}

// =======================
// ペット関連
// =======================

// ペットの名前変更
function renamePet(newName) {
  const trimmed = (newName || "").trim();
  if (!trimmed) {
    appendLog("名前が空です。");
    return;
  }
  const oldName = petName;
  petName = trimmed;
  appendLog(`ペットの名前を「${oldName}」から「${petName}」に変更した。`);
  updateDisplay();
}

// プロンプト付きの簡易UI（必要な場合にボタン等から呼ぶ）
function promptRenamePet() {
  const newName = window.prompt("ペットの新しい名前を入力してください", petName);
  if (newName != null) {
    renamePet(newName);
  }
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
    appendLog(`${petName}のレベルが上がった！ Lv${petLevel}`);
  }
  updateDisplay();
}

function applyRebirthBonus() {
  const choices = ["STR","VIT","INT","DEX","LUK","HP","MP","SP"];
  let msgList = [];
  // ★ 転生直後に貰えるポイント回数 = 転生回数 × 3
  const rolls = rebirthCount * 3;

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
  return "転生ボーナス:\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n" + msgList.join("\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n");
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

// 転生確認モーダルを開く
function openRebirthModal() {
  const modal = document.getElementById("rebirthModal");
  const msgEl = document.getElementById("rebirthModalMessage");
  if (!modal || !msgEl) return;

  msgEl.innerHTML =
    "転生を行うと、レベルは1に戻り、必要経験値もリセットされます。<br>" +
    "ステータスは初期値に戻りますが、これまでの転生回数に応じた<br>" +
    "恒久ボーナス（転生回数×3）とペットの強化は蓄積されます。<br>" +
    "レベルアップで得られるステータスポイントが転生回数分上乗せされます。<br><br>" +
    `※転生には現在レベル${REBIRTH_LEVEL_REQ}以上が必要です。<br>` +
    "条件を満たしていない場合は説明のみ表示されます。<br><br>" +
    "本当に転生しますか？";

  modal.classList.remove("hidden");
}

function closeRebirthModal() {
  const modal = document.getElementById("rebirthModal");
  if (modal) modal.classList.add("hidden");
}

function confirmRebirth() {
  // レベル条件チェック：条件未達なら説明だけ見せて終了
  if (level < REBIRTH_LEVEL_REQ) {
    appendLog(`転生にはLv${REBIRTH_LEVEL_REQ}以上が必要です`);
    closeRebirthModal();
    return;
  }
  closeRebirthModal();
  doRebirth();
}

function doRebirth() {
  // ★ 先に基礎ステを初期値に戻す（レベルチェックは confirmRebirth 側に一本化）
  resetBaseStatsToInitial();

  rebirthCount++;
  growthType = Math.floor(Math.random() * 5); // 0〜4の成長タイプに再ロール
  const bonusMsg = applyRebirthBonus();
  applyPetRebirthBonus();

  // レベル・経験値リセット
  level     = 1;
  exp       = 0;
  expToNext = BASE_EXP_PER_LEVEL;

  // ★ 基礎ステ再計算
  if (typeof recalcStats === "function") {
    recalcStats();
    hp = hpMax;
    mp = mpMax;
    sp = spMax;
  } else {
    hpMax = hpMaxBase;
    mpMax = mpMaxBase;
    spMax = spMaxBase;
    hp    = hpMax;
    mp    = mpMax;
    sp    = spMax;
  }

  // ペットリセット
  petLevel     = 1;
  petExp       = 0;
  petExpToNext = BASE_EXP_PER_LEVEL;
  petHpMax     = petHpBase + petRebirthCount * 3;
  petHp        = petHpMax;

  // 戦闘状態リセット
  currentEnemy = null;
  enemyHp      = 0;
  enemyHpMax   = 0;
  isBossBattle = false;

  setBattleCommandVisible(false);

  if (typeof onRebirthForGuild === "function") {
    onRebirthForGuild({ jobId });
  }

  setLog(
    `転生した！ 転生回数: ${rebirthCount}\\\\\\\\n` +
    `成長タイプ: ${getGrowthTypeName()}\\\\\\\\n` +
    `${bonusMsg}\\\\\\\\n` +
    `ペット転生回数: ${petRebirthCount}（基礎ATKとHPが強化された）`
  );

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
  if (now < wellFedUntil) return true;
  return hunger >= 90 && thirst >= 90;
}

// 戦闘1勝あたりの経験値を返す
function getBattleExpPerWin(enemy) {
  return isWellFed() ? 8 : 5;
}

// ★ 空腹・水分の値から各種係数を更新する
function updateHungerThirstEffects() {
  const hungerRatio = clamp01(hunger / 100);
  const thirstRatio = clamp01(thirst / 100);

  if (hungerRatio < 0.5) {
    hungerHpRate = hungerRatio / 0.5;
    if (!hungerBelow50Logged) {
      appendLog("お腹が減ってきた… 最大HPが下がり始めている。");
      hungerBelow50Logged = true;
    }
  } else {
    hungerHpRate = 1.0;
    hungerBelow50Logged = false;
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

  if (hungerRatio < 0.25) {
    const t = hungerRatio / 0.25;
    hungerAtkIntRate = 0.7 + 0.3 * t;
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

  if (typeof recalcStats === "function") {
    recalcStats();
  }
}

// 空腹・水分を増やす（料理・飲み物から呼ぶ想定）
function restoreHungerThirst(addHunger, addThirst) {
  hunger = Math.min(100, hunger + (addHunger || 0));
  thirst = Math.min(100, thirst + (addThirst || 0));

  if (hunger === 100 || thirst === 100) {
    wellFedUntil = Date.now() + 20 * 60 * 1000;
  }

  updateHungerThirstEffects();
  updateDisplay();
}

// 行動時（戦闘勝利・採取成功など）に呼ぶ。放置では減らさない。
function handleHungerThirstOnAction(actionType) {
  const now = Date.now();
  if (now < wellFedUntil) {
    return;
  }

  hungerActionCount++;
  thirstActionCount++;

  hunger = Math.max(0, hunger - 1);
  thirst = Math.max(0, thirst - 1);

  hungerActionCount = 0;
  thirstActionCount = 0;

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

// ★ジョブ別初期ステのヘルパー
//   - game-core-1.js 側で定義されている initialJobStatsApplied と共有する前提。
function applyInitialStatsForJob(selectedJobId) {
  // すでに初期ジョブステを適用済みなら何もしない
  if (window.initialJobStatsApplied) {
    return;
  }

  // 職業ごとのレベル1初期ステ（指定どおり）
  switch (selectedJobId) {
    case 0: // 戦士（物理寄りタンク）
      STR  = 2;
      VIT  = 3;
      INT_ = 1;
      DEX_ = 1;
      LUK_ = 1;
      break;
    case 1: // 魔法使い（紙装甲火力）
      STR  = 1;
      VIT  = 1;
      INT_ = 3;
      DEX_ = 2;
      LUK_ = 1;
      break;
    case 2: // 動物使い（ペット寄りバランス）
      STR  = 1;
      VIT  = 1;
      INT_ = 1;
      DEX_ = 3;
      LUK_ = 2;
      break;
    case 3: // 錬金術師（器用貧乏）
    default:
      STR  = 1;
      VIT  = 1;
      INT_ = 2;
      DEX_ = 2;
      LUK_ = 2;
      break;
  }

  window.initialJobStatsApplied = true;

  if (typeof recalcStats === "function") {
    recalcStats();
  }
}

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

  modal.classList.remove("hidden");
}

function closeJobModal() {
  const modal = document.getElementById("jobModal");
  if (modal) modal.classList.add("hidden");
}

function applyJobChange(newJobId) {
  if (jobId === newJobId) {
    appendLog("すでにその職業です");
    closeJobModal();
    return;
  }

  // ★「初回かどうか」で処理が変わるのは従来どおり
  const isFirstJobChange = !jobChangedOnce;

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

  // ★ 初回の職業決定時のみ、職業ごとの初期ステータスを適用する
  //   - window.initialJobStatsApplied で二重適用防止
  //   - 転職時（jobChangedOnce が true のとき）はここを通らないので
  //     ステータスはリセットされない
  if (isFirstJobChange && !window.initialJobStatsApplied) {
    applyInitialStatsForJob(newJobId);
  }

  // ★ 転生前の初回のみ、職業に応じて成長タイプを自動設定（既存仕様＋錬金術師追加）
  if (!rebirthCount) {
    if      (newJobId === 0) growthType = 0; // 戦士: STR型
    else if (newJobId === 1) growthType = 2; // 魔法使い: INT型
    else if (newJobId === 2) growthType = 4; // 動物使い: バランス型
    else if (newJobId === 3) growthType = 2; // 錬金術師: INT型（魔法寄り）
  }

  if (jobId === 2) {
    petSkills = [
      { id: "powerBite", name: "パワーバイト", powerRate: 1.6 },
      { id: "taunt",     name: "挑発" },
      { id: "selfHeal",  name: "セルフヒール", healRate: 0.3 }
    ];
  } else {
    petSkills = [];
  }

  recalcStats();
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
  if (modal) {
    modal.classList.remove("hidden");
  }
}

// ★職業ヘルパ
function isAlchemist() {
  return jobId === 3;
}

// ペット簡易ステータス（上部バー下のミニ表示）更新
function updatePetMiniStatus() {
  const lvEl    = document.getElementById("petLevelMini");
  const hpEl    = document.getElementById("petHpMini");
  const hpMaxEl = document.getElementById("petHpMaxMini");
  if (!lvEl || !hpEl || !hpMaxEl) return;

  lvEl.textContent    = (typeof petLevel === "number") ? petLevel : "-";
  hpEl.textContent    = (typeof petHp === "number")    ? petHp    : "-";
  hpMaxEl.textContent = (typeof petHpMax === "number") ? petHpMax : "-";
}

// =======================
// 初回ジョブモーダル用 UI ハンドラ
// =======================

// 「世界に降り立つ」ボタンとジョブ説明は HTML 側に追加済み。
// ここでは selectedJobTemp をローカルで持ち、applyJobChange に渡すだけで
// 既存の職業変更仕様（初回無料・以降100G消費など）をそのまま使う。
let selectedJobTemp = null;

// 職業説明テキスト
const JOB_DESCS = {
  0: "前衛で戦う近接職。HPと防御が高く、安定して戦いやすい。",
  1: "魔法で遠距離から攻撃する職。火力は高いが、打たれ弱い。",
  2: "ペットと共に戦う職。成長するとペットが火力・盾役として活躍する。",
  3: "アイテムやポーションに長けた職。準備したアイテムで戦いを有利にする。"
};

document.addEventListener("DOMContentLoaded", () => {
  const jobButtons    = document.querySelectorAll(".job-select-btn");
  const jobDescArea   = document.getElementById("jobDescArea");
  const jobConfirmBtn = document.getElementById("jobConfirmBtn");

  if (!jobButtons.length || !jobDescArea || !jobConfirmBtn) return;

  jobButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.job, 10);
      if (Number.isNaN(id)) return;
      selectedJobTemp = id;

      // 見た目の選択状態
      jobButtons.forEach(b => b.classList.toggle("selected", b === btn));

      // 説明表示
      jobDescArea.textContent = JOB_DESCS[id] || "";

      // 決定ボタン有効化
      jobConfirmBtn.disabled = false;
    });
  });

  jobConfirmBtn.addEventListener("click", () => {
    if (selectedJobTemp == null) return;

    // 既存仕様どおりの職業変更処理に委譲
    applyJobChange(selectedJobTemp);
  });
});