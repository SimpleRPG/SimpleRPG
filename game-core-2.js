// game-core-2.js
// レベル・転生・職業・ペット ＋ 空腹・水分・EXPボーナス

// =======================
// レベル・転生
// =======================

// ★ レベル上限
//   - MAX_LEVEL / MAX_PET_LEVEL は game-core-1.js 側ですでに const 宣言されている想定。
//   - ここでは「すでに存在するならそれを使い、なければデフォルト値を入れる」だけにする。
//   - const での再宣言は SyntaxError になるので避ける。
if (typeof MAX_LEVEL === "undefined") {
  // 念のためのフォールバック（通常は game-core-1.js で定義済み）
  var MAX_LEVEL = 100;
}
if (typeof MAX_PET_LEVEL === "undefined") {
  var MAX_PET_LEVEL = 100;
}

// ★ 転生タイプ別カウンタ（戦闘/採取/クラフト）
//   - 既存セーブ互換のため window 経由で拾っておく
window.rebirthCombatPt = typeof window.rebirthCombatPt === "number" ? window.rebirthCombatPt : 0;
window.rebirthGatherPt = typeof window.rebirthGatherPt === "number" ? window.rebirthGatherPt : 0;
window.rebirthCraftPt  = typeof window.rebirthCraftPt  === "number" ? window.rebirthCraftPt  : 0;

let rebirthCombatPt = window.rebirthCombatPt; // 戦闘転生に振った回数
let rebirthGatherPt = window.rebirthGatherPt; // 採取転生に振った回数
let rebirthCraftPt  = window.rebirthCraftPt;  // クラフト転生に振った回数

// ★ 直近の転生タイプ（"combat" | "gather" | "craft"）
//   - 既存セーブでは未定義なので、その場合は "combat" 扱いにして従来仕様を維持
window.lastRebirthType = window.lastRebirthType || "combat";
let lastRebirthType = window.lastRebirthType;

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
  // ★ 基本1ロール + 「戦闘に振った転生回数」ぶん上乗せ
  //   既存仕様は rebirthCount ベースだったが、戦闘転生のみ成長させる意図で rebirthCombatPt に変更
  return 1 + rebirthCombatPt;
}

// =======================
// 行動別EXP設計ヘルパー
// =======================

// 満腹判定ラッパ（undefined でも安全に）
function isPlayerWellFed() {
  return (typeof isWellFed === "function") ? isWellFed() : false;
}

// 戦闘1勝あたりの経験値を返す
// 既存仕様: 非満腹 5 / 満腹 8
function getBattleExpPerWin(enemy) {
  return isPlayerWellFed() ? 8 : 5;
}

// 非戦闘行動（採取・クラフトなど）1回あたりのEXP（設計値）
// - 採取: 空腹3 / 満腹4
// - クラフト: 空腹3 / 満腹4
// - 自動採取: 空腹2 / 満腹3（放置分はやや控えめ）
// - その他: 空腹2 / 満腹3（とりあえず控えめ）
function getNonBattleExpPerAction(source) {
  const wellFed = isPlayerWellFed();

  if (source === "gather") {
    return wellFed ? 4 : 3;
  }

  if (source === "craft") {
    return wellFed ? 4 : 3;
  }

  return wellFed ? 3 : 2;
}

// =======================
// EXP加算本体
// =======================

function addExp(amount, source) {
  // source: "battle" | "gather" | "craft" | "autoGather" | "guild" | ... | undefined

  // ▼ 1. 行動種別に応じて「実際に入れるEXP量」を決める
  let finalAmount = amount | 0; // 念のため整数化

  if (!source) {
    source = "other";
  }

  if (source === "battle") {
    // 戦闘は getBattleExpPerWin などで計算済みの値をそのまま使う前提
    finalAmount = amount;
  } else {
    // 非戦闘行動は source に応じて設計値を上書き
    finalAmount = getNonBattleExpPerAction(source);
  }

  if (finalAmount <= 0) {
    return;
  }

  amount = finalAmount;

  // ★ すでに上限なら経験値だけ溜めてレベルアップ処理は行わない
  if (level >= MAX_LEVEL) {
    exp += amount;
    updateDisplay();
    return;
  }

  exp += amount;
  let leveled = false;
  // ★ レベルアップ中に増えたステータスを集計する
  let totalUp = { STR: 0, VIT: 0, INT: 0, DEX: 0, LUK: 0 };

  // ★ レベルアップ前のベース最大HPを保持（ログ用）
  const hpMaxBaseBefore = hpMaxBase;

  // ★ レベルが上限に達するまでレベルアップ
  while (exp >= expToNext && level < MAX_LEVEL) {
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

  // ★ Lv100 到達後にさらにEXPがある場合は、そのまま保持するが、
  //    これ以上は while の条件でレベルアップしない（仕様として打ち止め）。

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

    // ★追加: レベルアップの統計ログ（テトAI・デバッグ用）
    // 仕様は変えず、「ログを1行追加するだけ」
    if (typeof window.debugRecordLevelUp === "function") {
      try {
        window.debugRecordLevelUp({
          level: level,
          statsGained: {
            STR: totalUp.STR,
            VIT: totalUp.VIT,
            INT: totalUp.INT,
            DEX: totalUp.DEX,
            LUK: totalUp.LUK
          },
          hpMaxBaseBefore: hpMaxBaseBefore,
          hpMaxBaseAfter: hpMaxBase
        });
      } catch (e) {
        console.log("debugRecordLevelUp error", e);
      }
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

  // ★複数ペット対応: 処理前に現在のアクティブペット状態を petList に保存しておく
  if (typeof window.saveActivePetFromGlobals === "function") {
    window.saveActivePetFromGlobals();
  }

  // ★ ペットも上限に達していたら経験値だけ加算して終了
  if (petLevel >= MAX_PET_LEVEL) {
    petExp += amount;
    // ★保存（上限でも経験値は持つので petList 側も追従させる）
    if (typeof window.saveActivePetFromGlobals === "function") {
      window.saveActivePetFromGlobals();
    }
    updateDisplay();
    return;
  }

  petExp += amount;
  let leveled = false;
  while (petExp >= petExpToNext && petLevel < MAX_PET_LEVEL) {
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

    // ★ ペット転生ボーナス適用済みの petHpBase/petAtkBase/petDefBase に対して
    //    特性補正を掛けたうえで最大HPを再計算して全回復
    let baseHpForMax = petHpBase;
    if (typeof applyCompanionPetRates === "function") {
      const r = applyCompanionPetRates(petHpBase, petAtkBase, petDefBase);
      if (r && typeof r.hp === "number") {
        baseHpForMax = r.hp;
      }
    }
    petHpMax = baseHpForMax + petRebirthCount * 3;
    petHp    = petHpMax;

    // ★ 必要経験値はプレイヤーと同じく 100 固定
    petExpToNext = BASE_EXP_PER_LEVEL;
  }
  if (leveled) {
    appendLog(`${petName}のレベルが上がった！ Lv${petLevel}`);
  }

  // ★複数ペット対応: レベルアップ後の最新ステータスを petList のアクティブペットに反映
  if (typeof window.saveActivePetFromGlobals === "function") {
    window.saveActivePetFromGlobals();
  }

  updateDisplay();
}

function applyRebirthBonus() {
  const choices = ["STR","VIT","INT","DEX","LUK","HP","MP","SP"];
  let msgList = [];
  // ★ 転生直後に貰えるポイント回数 = 「戦闘転生回数 × 3」
  //   従来は rebirthCount * 3 だったが、「採取/クラフトに振ったぶんは戦闘成長なし」
  //  という仕様にするため、rebirthCombatPt ベースに変更
  const rolls = rebirthCombatPt * 3;

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
  // ★ 普通の改行に修正
  return "転生ボーナス:\\n" + msgList.join("\\n");
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

// ★ 転生タイプ選択（簡易版）
//   - 本番ではモーダルのボタン等から lastRebirthType をセットする想定
//   - 未設定セーブ互換のため、何も選ばれていなければ "combat" のまま
function setRebirthType(type) {
  if (type !== "combat" && type !== "gather" && type !== "craft") {
    return;
  }
  lastRebirthType = type;
  window.lastRebirthType = type;
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
    "レベルアップで得られるステータスポイントが転生回数分上乗せされます。<br>" +
    "転生時には『戦闘 / 採取 / クラフト』のどれに振るかを選択できます。<br><br>" +
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
  // ★ lastRebirthType が不正/未設定なら戦闘扱い
  if (lastRebirthType !== "combat" && lastRebirthType !== "gather" && lastRebirthType !== "craft") {
    lastRebirthType = "combat";
    window.lastRebirthType = "combat";
  }
  doRebirth();
}

// ★ Teto AI からの自動転生用エントリ
//   - UIモーダルは開かず、レベル条件と lastRebirthType だけ確認して doRebirth を呼ぶ
//   - 仕様は人間操作と同じ（レベル100以上必須）
window.tryRebirth = function() {
  if (level < REBIRTH_LEVEL_REQ) {
    return false;
  }
  if (lastRebirthType !== "combat" && lastRebirthType !== "gather" && lastRebirthType !== "craft") {
    lastRebirthType = "combat";
    window.lastRebirthType = "combat";
  }
  doRebirth();
  return true;
};

function doRebirth() {
  // ★ 先に基礎ステを初期値に戻す（レベルチェックは confirmRebirth 側に一本化）
  resetBaseStatsToInitial();

  // ★ 総転生回数は従来どおりカウント（表示や他処理用）
  rebirthCount++;

  // ★ 転生タイプ別に処理を分岐
  if (lastRebirthType === "gather") {
    // 採取転生: 戦闘用ボーナスは付けない
    rebirthGatherPt++;
    window.rebirthGatherPt = rebirthGatherPt;
    // 成長タイプはそのまま維持（もしくはランダムロールしてもよいが、ここでは既存仕様を崩さないために変更しない）
  } else if (lastRebirthType === "craft") {
    // クラフト転生: 戦闘用ボーナスは付けない
    rebirthCraftPt++;
    window.rebirthCraftPt = rebirthCraftPt;
  } else {
    // 戦闘転生（既存仕様の挙動）
    rebirthCombatPt++;
    window.rebirthCombatPt = rebirthCombatPt;

    // 転生ごとにランダムな成長タイプ、職業変更を促す一因に
    growthType = Math.floor(Math.random() * 5); // 0〜4の成長タイプに再ロール
  }

  // ★ 戦闘用転生ボーナスは「戦闘転生が一度以上行われているときだけ」適用
  let bonusMsg = "";
  if (rebirthCombatPt > 0) {
    bonusMsg = applyRebirthBonus();
  } else {
    bonusMsg = "転生ボーナス:\\n(戦闘転生なし)";
  }

  // ペット転生ボーナスは、仕様に合わせてここでは「全転生共通」で付与を維持
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

  // ペットリセット（レベル・EXPだけリセットし、転生ボーナスと特性込みでHP再計算）
  petLevel     = 1;
  petExp       = 0;
  petExpToNext = BASE_EXP_PER_LEVEL;

  let baseHpForMax = petHpBase;
  if (typeof applyCompanionPetRates === "function") {
    const r = applyCompanionPetRates(petHpBase, petAtkBase, petDefBase);
    if (r && typeof r.hp === "number") {
      baseHpForMax = r.hp;
    }
  }
  petHpMax = baseHpForMax + petRebirthCount * 3;
  petHp    = petHpMax;

  // ★複数ペット対応: 転生後のペット状態を petList のアクティブレコードに保存
  if (typeof window.saveActivePetFromGlobals === "function") {
    window.saveActivePetFromGlobals();
  }

  // 戦闘状態リセット
  currentEnemy = null;
  enemyHp      = 0;
  enemyHpMax   = 0;
  isBossBattle = false;

  setBattleCommandVisible(false);

  if (typeof onRebirthForGuild === "function") {
    onRebirthForGuild({ jobId });
  }

  // ★ ログも普通の改行に統一
  appendLog(
    `転生した！ 転生回数: ${rebirthCount}\\n` +
    `転生タイプ: ${
      lastRebirthType === "gather" ? "採取" :
      lastRebirthType === "craft"  ? "クラフト" :
      "戦闘"
    }\\n` +
    `成長タイプ: ${getGrowthTypeName()}\\n` +
    `${bonusMsg}\\n` +
    `ペット転生回数: ${petRebirthCount}（基礎ATKとHPが強化された）`
  );

  if (typeof refreshEquipSelects === "function") {
    refreshEquipSelects();
  }
  updateDisplay();
  updateSkillButtonsByJob();

  // ★追加: 転生直後に転生ポイント表示も更新（UI側のステータス行）
  if (typeof updateRebirthPointStatus === "function") {
    updateRebirthPointStatus();
  }
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
    // 既存どおりペットスキル付与
    petSkills = [
      { id: "powerBite", name: "パワーバイト", powerRate: 1.6 },
      { id: "taunt",     name: "挑発" },
      { id: "selfHeal",  name: "セルフヒール", healRate: 0.3 }
    ];

    // ★ここだけ追加:
    // 「最初に動物使いになったときだけペット選択モーダルを開く」
    // 条件: まだ companionTypeId が決まっていない（初回だけ）
    if (!window.companionTypeId && typeof openCompanionModalIfNeeded === "function") {
      // 職業モーダルを閉じてからペット選択モーダルを開く
      closeJobModal();
      openCompanionModalIfNeeded();
      return; // ペット決定後に UI 側で recalcStats / updateDisplay される想定
    }
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

  // ★追加: 動物使いかどうかに応じて倉庫ペットタブの表示状態を更新
  if (typeof window.updateWarehousePetTabVisibility === "function") {
    window.updateWarehousePetTabVisibility();
  }

// ★追加: 初回の職業決定時だけ、遊び方タブへ誘導
if (isFirstJobChange && typeof window.showHelpPage === "function") {
  setTimeout(() => {
    window.showHelpPage();
  }, 0); // 0〜30msくらいでOK
}
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

function isBeastTamer() {
  return jobId === 2;
}

// ペット簡易ステータス（上部バー下のミニ表示）更新
function updatePetMiniStatus() {
  const nameEl  = document.getElementById("petNameMini");
  const lvEl    = document.getElementById("petLevelMini");
  const hpEl    = document.getElementById("petHpMini");
  const hpMaxEl = document.getElementById("petHpMaxMini");
  if (!lvEl || !hpEl || !hpMaxEl) return;

  // 名前: アクティブペットがいるときだけ petName を表示、それ以外は "-"
  if (nameEl) {
    const hasPet = (jobId === 2) && !!window.companionTypeId;
    if (hasPet && typeof petName === "string" && petName.length > 0) {
      nameEl.textContent = petName;
    } else {
      nameEl.textContent = "-";
    }
  }

  // 数値部分は既存どおり
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

// ★ DOMが構築されたあと（buildStatusPage/buildAppLayout 後）に手動で呼ぶ
//   initJobPetRebirthUI 内から呼び出す想定。
function setupJobSelectUI() {
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
    applyJobChange(selectedJobTemp);
  });
}