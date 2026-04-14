// skill-core.js
// 職業スキル定義 ＋ スキルUI ＋ 実行ロジック ＋ ペット攻撃
// 前提: game-core-*.js のグローバル（jobId, atkTotal, INT_, DEX_, LUK_, hp, mp, sp, currentEnemy, enemyHp, enemyHpMax,
//        petHp, petHpMax, petAtkBase, petDefBase, petLevel, petName, shieldBlowGuardTurnRemain など）が存在

// =======================
// スキル定義
// =======================

const SKILL_TYPE_MAGIC = "magic";
const SKILL_TYPE_PHYS  = "phys";
const SKILL_TYPE_BUFF  = "buff";
const SKILL_TYPE_PET   = "pet";

// jobId: 0=戦士, 1=魔法使い, 2=動物使い, 3=錬金術師
const JOB_SKILLS = {
  0: { // 戦士
    phys: [
      {
        id: "powerSlash",
        name: "パワースラッシュ",
        type: SKILL_TYPE_PHYS,
        spCost: 3
      },
      {
        id: "shieldBlow",
        name: "シールドブロウ",
        type: SKILL_TYPE_PHYS,
        spCost: 4
      },
      {
        id: "braveCharge",
        name: "ブレイブチャージ",
        type: SKILL_TYPE_BUFF,
        spCost: 5
      },
      // ★ 戦士ギルド専用: ガードインパクト（所属中のみUI表示＆使用可）
      {
        id: "guardImpact",
        name: "ガードインパクト",
        type: SKILL_TYPE_PHYS,
        spCost: 5
      }
    ],
    magic: [] // 戦士は魔法なし
  },
  1: { // 魔法使い
    phys: [],
    magic: [
      {
        id: "fireBolt",
        name: "ファイアボルト",
        type: SKILL_TYPE_MAGIC,
        mpCost: 3
      },
      {
        id: "iceLance",
        name: "アイスランス",
        type: SKILL_TYPE_MAGIC,
        mpCost: 6
      },
      {
        id: "chainLightning",
        name: "チェインライトニング",
        type: SKILL_TYPE_MAGIC,
        mpCost: 8
      },
      // ★ 魔法ギルド専用: マナバースト（所属中のみUI表示＆使用可）
      {
        id: "manaBurst",
        name: "マナバースト",
        type: SKILL_TYPE_MAGIC,
        mpCost: 10
      }
    ]
  },
  2: { // 動物使い
    phys: [
      {
        id: "beastSlash",
        name: "ビーストスラッシュ",
        type: SKILL_TYPE_PHYS,
        spCost: 3
      },
      {
        id: "animalLink",
        name: "アニマルリンク",
        type: SKILL_TYPE_PET,
        spCost: 4
      },
      // ★ 動物使いギルド専用: ビーストロア（所属中のみUI表示＆使用可）
      {
        id: "beastRoar",
        name: "ビーストロア",
        type: SKILL_TYPE_PET,
        spCost: 5
      }
    ],
    magic: [
      {
        id: "beastHeal",
        name: "ビーストヒール",
        type: SKILL_TYPE_PET,
        mpCost: 5
      }
    ]
  },
  3: { // 錬金術師
    phys: [
      {
        id: "itemBoost",
        name: "アイテムブースト",
        type: SKILL_TYPE_BUFF,
        spCost: 4
      }
    ],
    magic: [
      {
        id: "safeBrew",
        name: "セーフブリュー",
        type: SKILL_TYPE_MAGIC,
        mpCost: 5
      }
    ]
  }
};

// =======================
// 共通: スキルUI更新
// =======================

function refreshSkillUIs() {
  const magicSel = document.getElementById("magicSelect");
  const skillSel = document.getElementById("skillSelect");
  if (!magicSel || !skillSel) return;

  magicSel.innerHTML = "";
  skillSel.innerHTML = "";

  const jobSkills = JOB_SKILLS[jobId] || { phys: [], magic: [] };
  const guildId = typeof window !== "undefined" ? window.playerGuildId : null;

  {
    const optNone = document.createElement("option");
    optNone.value = "";
    optNone.textContent = "魔法なし";
    magicSel.appendChild(optNone);

    jobSkills.magic
      .filter(s => {
        // マナバーストは魔法ギルド所属中のみ表示
        if (s.id === "manaBurst" && guildId !== "mage") return false;
        return true;
      })
      .forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.name;
        magicSel.appendChild(opt);
      });
  }

  {
    const optNone = document.createElement("option");
    optNone.value = "";
    optNone.textContent = "スキルなし";
    skillSel.appendChild(optNone);

    jobSkills.phys
      .filter(s => {
        // ガードインパクトは戦士ギルド所属中のみ表示
        if (s.id === "guardImpact" && guildId !== "warrior") return false;
        // ビーストロアは動物使いギルド所属中のみ表示
        if (s.id === "beastRoar" && guildId !== "tamer") return false;
        return true;
      })
      .forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.name;
        skillSel.appendChild(opt);
      });
  }
}

// =======================
// バフ・ガード・ペット用フラグ
// =======================

let braveChargeTurnRemain = 0;
let braveChargeRate       = 0.3;  // 攻撃+30%

let petBuffTurnRemain = 0;
// petBuffRate は game-core 側で宣言済み

// 錬金術師用: アイテムブースト
let itemBoostTurnRemain = 0;
let itemBoostRate       = 0.5;   // アイテム効果さらに+50%

function getCurrentAtkForSkill() {
  let base = atkTotal;
  if (braveChargeTurnRemain > 0) {
    base = Math.floor(base * (1 + braveChargeRate));
  }

  // ★ ギルド物理ボーナス（戦士ギルド）
  if (typeof getGuildBattleBonus === "function") {
    const bonus = getGuildBattleBonus();
    if (bonus && bonus.phys) {
      base = Math.floor(base * (1 + bonus.phys));
    }
  }

  return base;
}

function getEffectiveIntForMagic() {
  let base = INT_;
  if (typeof applyMagicAttackBuffsForPlayer === "function") {
    base = applyMagicAttackBuffsForPlayer(base);
  }

  // ★ ギルド魔法ボーナス（魔法ギルド）
  if (typeof getGuildBattleBonus === "function") {
    const bonus = getGuildBattleBonus();
    if (bonus && bonus.magic) {
      base = Math.floor(base * (1 + bonus.magic));
    }
  }

  return base;
}

function tickSkillBuffTurns() {
  if (braveChargeTurnRemain > 0) {
    braveChargeTurnRemain--;
  }
  if (petBuffTurnRemain > 0) {
    petBuffTurnRemain--;
    if (petBuffTurnRemain <= 0) {
      petBuffRate = 1.0;
    }
  }
  if (itemBoostTurnRemain > 0) {
    itemBoostTurnRemain--;
  }
}

// =======================
// ペット攻撃ロジック
// =======================

// ★特性補正込みのペット基礎ステを取得するヘルパー
function getCompanionAdjustedPetBaseStats() {
  if (typeof applyCompanionPetRates === "function") {
    // petRebirthCount などによるボーナス適用済みの petHpBase/petAtkBase/petDefBase に対して特性補正を掛ける
    return applyCompanionPetRates(petHpBase, petAtkBase, petDefBase);
  }
  return {
    hp:  petHpBase,
    atk: petAtkBase,
    def: petDefBase
  };
}

function getPetBaseAtk() {
  const levelBonus = Math.floor(petLevel * 0.5);
  const baseStats = getCompanionAdjustedPetBaseStats();
  const atkBase = baseStats.atk != null ? baseStats.atk : petAtkBase;
  return Math.max(1, atkBase + levelBonus);
}

// ★ ペット防御力（game-core-1.js の petDefBase を利用）＋特性補正
function getPetDef() {
  const levelBonus = Math.floor(petLevel * 0.3);
  const baseStats = getCompanionAdjustedPetBaseStats();
  const defBase = baseStats.def != null ? baseStats.def : petDefBase;
  return Math.max(0, defBase + levelBonus);
}

function calcPetDamage() {
  let base = getPetBaseAtk() * petBuffRate;

  // ★ ギルドペットボーナス（動物使いギルド）
  if (typeof getGuildBattleBonus === "function") {
    const bonus = getGuildBattleBonus();
    if (bonus && bonus.pet) {
      base = base * (1 + bonus.pet);
    }
  }

  const variance = Math.floor(base * 0.2);
  const roll = base + (Math.floor(Math.random() * (variance * 2 + 1)) - variance);
  return Math.max(1, Math.floor(roll));
}

function doPetTurn() {
  if (jobId !== 2) return;
  if (!currentEnemy) return;
  if (petHp <= 0) return;

  let usedSkill = false;
  if (petSkills && Math.random() < PET_SKILL_TRY_RATE) {
    const s = petSkills[Math.floor(Math.random() * petSkills.length)];
    if (s && s.id === "powerBite") {
      let base = calcPetDamage();
      let dmg = Math.floor(base * (s.powerRate || 1.6));
      enemyHp = Math.max(0, enemyHp - dmg);
      appendLog(`${petName}の${s.name}！ ${currentEnemy.name}に${dmg}ダメージ！`);
      usedSkill = true;
    } else if (s && s.id === "taunt") {
      appendLog(`${petName}の${s.name}！ 敵の注意を引きつけた！`);
      petBuffTurnRemain = Math.max(petBuffTurnRemain, 1);
      usedSkill = true;
    } else if (s && s.id === "selfHeal") {
      const heal = Math.floor(petHpMax * (s.healRate || 0.3)) + 3;
      petHp = Math.min(petHp + heal, petHpMax);
      appendLog(`${petName}の${s.name}！ HPが${heal}回復した！`);
      usedSkill = true;
    }
  }

  if (!usedSkill) {
    let dmg = calcPetDamage();

    if (Math.random() < 0.2) {
      const critBonus = 1.5;
      dmg = Math.floor(dmg * critBonus);
      enemyHp = Math.max(0, enemyHp - dmg);
      appendLog(`${petName}の渾身の一撃！ ${currentEnemy.name} に${dmg}ダメージ！`);
    } else {
      enemyHp = Math.max(0, enemyHp - dmg);
      appendLog(`${petName}の攻撃！ ${currentEnemy.name} に${dmg}ダメージ`);
    }
  }

  if (enemyHp <= 0) {
    enemyHp = 0;

    // ★ ギルド用ヘルパーにペット撃破を通知
    if (typeof onEnemyKilledForGuild === "function") {
      onEnemyKilledForGuild({ by: "pet", isBoss: !!isBossBattle });
    }

    winBattle(true, "pet");
  } else {
    if (typeof updateDisplay === "function") {
      updateDisplay();
    }
  }
}

// =======================
// 魔法発動（UIセレクト版）
// =======================

function castMagicFromUI() {
  if (jobId !== 1 && jobId !== 2 && jobId !== 3) {
    appendLog("魔法を扱える職業ではない");
    return;
  }
  const sel = document.getElementById("magicSelect");
  if (!sel) return;
  const skillId = sel.value;
  if (!skillId) {
    appendLog("使用する魔法を選んでください");
    return;
  }
  const jobSkills = JOB_SKILLS[jobId] || { magic: [] };
  const skill = jobSkills.magic.find(s => s.id === skillId);
  if (!skill) {
    appendLog("その魔法は使用できない");
    return;
  }

  const guildId = typeof window !== "undefined" ? window.playerGuildId : null;
  // ★ マナバーストは魔法ギルド所属中のみ使用可能
  if (skillId === "manaBurst" && guildId !== "mage") {
    appendLog("この魔法は今は使えない（対応するギルドに所属していない）");
    return;
  }

  // ビーストヒール以外は敵必須（セーフブリューは自己回復なので敵不要）
  if (!currentEnemy && skillId !== "beastHeal" && skillId !== "safeBrew") {
    appendLog("敵がいない");
    return;
  }

  // プレイヤー行動前の状態異常チェック
  if (typeof beforeActionPlayer === "function") {
    const pre = beforeActionPlayer();
    if (!pre || !pre.canAct) {
      if (typeof updateEnemyStatusUI === "function") {
        updateEnemyStatusUI();
      }
      if (typeof updateDisplay === "function") {
        updateDisplay();
      }
      return;
    }
  }

  const mpCost = skill.mpCost || 0;
  if (mp < mpCost) {
    appendLog("MPが足りない");
    return;
  }
  mp -= mpCost;

  let didDamage = false;

  if (skillId === "fireBolt") {
    const baseInt = getEffectiveIntForMagic();
    const dmg = 10 + baseInt * 2;
    enemyHp = Math.max(0, enemyHp - dmg);
    appendLog(`ファイアボルト！ ${currentEnemy.name} に${dmg}ダメージ`);
    didDamage = true;
  } else if (skillId === "iceLance") {
    const baseInt = getEffectiveIntForMagic();
    const dmg = 8 + Math.floor(baseInt * 1.8);
    enemyHp = Math.max(0, enemyHp - dmg);
    appendLog(`アイスランス！ ${currentEnemy.name} に${dmg}ダメージ（防御が下がった気がする）`);
    didDamage = true;
  } else if (skillId === "chainLightning") {
    const baseInt = getEffectiveIntForMagic();
    const hits = 2 + Math.floor(Math.random() * 2);
    let total = 0;
    for (let i = 0; i < hits; i++) {
      const one = 6 + Math.floor(baseInt * 1.3);
      total += one;
    }
    enemyHp = Math.max(0, enemyHp - total);
    appendLog(`チェインライトニング！ ${currentEnemy.name} に${hits}ヒット合計${total}ダメージ`);
    didDamage = true;
  } else if (skillId === "manaBurst") {
    const baseInt = getEffectiveIntForMagic();
    const dmg = 15 + baseInt * 3;
    enemyHp = Math.max(0, enemyHp - dmg);
    const extra = Math.floor(mpMax * 0.1);
    mp = Math.max(0, mp - extra);
    appendLog(`マナバースト！ ${currentEnemy.name} に${dmg}ダメージ（反動でMPを${extra}消費）`);
    didDamage = true;
  } else if (skillId === "beastHeal") {
    if (jobId !== 2) {
      appendLog("この魔法は動物使い専用だ");
    } else {
      const heal = Math.floor(petHpMax * 0.4) + 5;
      petHp = Math.min(petHp + heal, petHpMax);
      appendLog(`ビーストヒール！ ${petName}のHPが${heal}回復した`);
    }
  } else if (skillId === "safeBrew") {
    // 錬金術師用：INT/DEX/LUK 複合回復
    if (jobId !== 3) {
      appendLog("セーフブリューは錬金術師専用だ");
    } else {
      const baseInt = getEffectiveIntForMagic();
      const baseDex = typeof DEX_ === "number" ? DEX_ : 0;
      const baseLuk = typeof LUK_ === "number" ? LUK_ : 0;
      const heal = Math.floor(baseInt * 1.0 + baseDex * 0.4 + baseLuk * 0.3) + 10;
      const before = hp;
      hp = Math.min(hpMax, hp + heal);
      const actual = hp - before;
      appendLog(`セーフブリュー！ HPが${actual}回復した`);
    }
  }

  // ここからターン進行
  if (!currentEnemy) {
    // 非戦闘時: セーフブリューやビーストヒールだけして終了（敵・ペットターンは進めない）
    if (typeof updateDisplay === "function") {
      updateDisplay();
    }
    return;
  }

  if (didDamage) {
    if (enemyHp <= 0) {
      enemyHp = 0;

      // ★ ギルド用ヘルパーに魔法撃破を通知
      if (typeof onEnemyKilledForGuild === "function") {
        onEnemyKilledForGuild({ by: "magic", isBoss: !!isBossBattle });
      }

      winBattle(true, "magic");
      if (typeof updateEnemyStatusUI === "function") {
        updateEnemyStatusUI();
      }
      if (typeof updateDisplay === "function") {
        updateDisplay();
      }
      return;
    }

    doPetTurn();
    if (enemyHp > 0) {
      enemyTurn();
      if (typeof tickStatusesTurnEndForBoth === "function") {
        tickStatusesTurnEndForBoth();
      }
      if (typeof updateEnemyStatusUI === "function") {
        updateEnemyStatusUI();
      }
    }
  } else {
    // ダメージを与えない魔法（beastHeal, safeBrew など）: 戦闘中のみターン進行
    doPetTurn();
    if (enemyHp > 0) {
      enemyTurn();
      if (typeof tickStatusesTurnEndForBoth === "function") {
        tickStatusesTurnEndForBoth();
      }
      if (typeof updateEnemyStatusUI === "function") {
        updateEnemyStatusUI();
      }
    }
  }

  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

// =======================
// 物理スキル発動（UIセレクト版）
// =======================

function useSkillFromUI() {
  if (jobId !== 0 && jobId !== 2 && jobId !== 3) {
    appendLog("スキルを扱える職業ではない");
    return;
  }
  const sel = document.getElementById("skillSelect");
  if (!sel) return;
  const skillId = sel.value;
  if (!skillId) {
    appendLog("使用するスキルを選んでください");
    return;
  }
  const jobSkills = JOB_SKILLS[jobId] || { phys: [] };
  const skill = jobSkills.phys.find(s => s.id === skillId);
  if (!skill) {
    appendLog("そのスキルは使用できない");
    return;
  }

  const guildId = typeof window !== "undefined" ? window.playerGuildId : null;
  // ★ ガードインパクトは戦士ギルド所属中のみ使用可能
  if (skillId === "guardImpact" && guildId !== "warrior") {
    appendLog("このスキルは今は使えない（対応するギルドに所属していない）");
    return;
  }
  // ★ ビーストロアは動物使いギルド所属中のみ使用可能
  if (skillId === "beastRoar" && guildId !== "tamer") {
    appendLog("このスキルは今は使えない（対応するギルドに所属していない）");
    return;
  }

  // アイテムブーストは敵がいなくても使える（自己バフ）
  if (!currentEnemy &&
      skillId !== "animalLink" &&
      skillId !== "beastRoar" &&
      skillId !== "itemBoost") {
    appendLog("敵がいない");
    return;
  }

  // プレイヤー行動前の状態異常チェック
  if (typeof beforeActionPlayer === "function") {
    const pre = beforeActionPlayer();
    if (!pre || !pre.canAct) {
      if (typeof updateEnemyStatusUI === "function") {
        updateEnemyStatusUI();
      }
      if (typeof updateDisplay === "function") {
        updateDisplay();
      }
      return;
    }
  }

  const spCost = skill.spCost || 0;
  if (sp < spCost) {
    appendLog("SPが足りない");
    return;
  }
  sp -= spCost;

  let didDamage = false;

  if (skillId === "powerSlash") {
    const dmg = Math.floor(getCurrentAtkForSkill() * 1.5);
    enemyHp = Math.max(0, enemyHp - dmg);
    appendLog(`パワースラッシュ！ ${currentEnemy.name} に${dmg}ダメージ`);
    didDamage = true;
  } else if (skillId === "shieldBlow") {
    const dmg = Math.floor(getCurrentAtkForSkill() * 1.2);
    enemyHp = Math.max(0, enemyHp - dmg);
    shieldBlowGuardTurnRemain = 1;
    appendLog(`シールドブロウ！ ${currentEnemy.name} に${dmg}ダメージ（次の被ダメージ軽減）`);
    didDamage = true;
  } else if (skillId === "braveCharge") {
    braveChargeTurnRemain = 2;
    appendLog("ブレイブチャージ！ しばらく攻撃力が上がった");
  } else if (skillId === "guardImpact") {
    const dmg = Math.floor(getCurrentAtkForSkill() * 1.1);
    enemyHp = Math.max(0, enemyHp - dmg);
    // シールドブロウより長くガード
    shieldBlowGuardTurnRemain = 2;
    appendLog(`ガードインパクト！ ${currentEnemy.name} に${dmg}ダメージ（しばらく被ダメージ軽減）`);
    didDamage = true;
  } else if (skillId === "beastSlash") {
    const dmg = Math.floor(getCurrentAtkForSkill() * 1.3);
    enemyHp = Math.max(0, enemyHp - dmg);
    appendLog(`ビーストスラッシュ！ ${currentEnemy.name} に${dmg}ダメージ`);
    didDamage = true;
  } else if (skillId === "animalLink") {
    if (jobId !== 2) {
      appendLog("アニマルリンクは動物使い専用だ");
    } else {
      petBuffRate = 1.4;
      petBuffTurnRemain = 2;
      appendLog(`アニマルリンク！ ${petName}の攻撃力が上がった`);
    }
  } else if (skillId === "beastRoar") {
    if (jobId !== 2) {
      appendLog("ビーストロアは動物使い専用だ");
    } else {
      petBuffRate = 1.6;
      petBuffTurnRemain = 3;
      appendLog(`ビーストロア！ ${petName}の力がみなぎった`);
    }
  } else if (skillId === "itemBoost") {
    // 錬金術師専用：アイテム強化バフ（SP消費）
    if (jobId !== 3) {
      appendLog("アイテムブーストは錬金術師専用だ");
    } else {
      itemBoostTurnRemain = 3;
      appendLog("アイテムブースト！ しばらくポーションと道具の効果がさらに高まった");
    }
  }

  if (skillId === "animalLink" || skillId === "braveCharge" || skillId === "beastRoar" || skillId === "itemBoost") {
    // 純バフ系スキルもターンを消費して敵ターンへ
    if (currentEnemy) {
      enemyTurn();
      if (typeof tickStatusesTurnEndForBoth === "function") {
        tickStatusesTurnEndForBoth();
      }
      if (typeof updateEnemyStatusUI === "function") {
        updateEnemyStatusUI();
      }
    }
  } else if (didDamage) {
    if (enemyHp <= 0) {
      enemyHp = 0;

      // ★ ギルド用ヘルパーに物理スキル撃破を通知
      if (typeof onEnemyKilledForGuild === "function") {
        onEnemyKilledForGuild({ by: "phys", isBoss: !!isBossBattle });
      }

      winBattle(true, "phys");
      if (typeof updateEnemyStatusUI === "function") {
        updateEnemyStatusUI();
      }
      if (typeof updateDisplay === "function") {
        updateDisplay();
      }
      return;
    }

    doPetTurn();
    if (enemyHp > 0) {
      enemyTurn();
      if (typeof tickStatusesTurnEndForBoth === "function") {
        tickStatusesTurnEndForBoth();
      }
      if (typeof updateEnemyStatusUI === "function") {
        updateEnemyStatusUI();
      }
    }
  }

  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

// =======================
// game-ui.js から呼ばれるラッパー
// =======================

function refreshMagicSelect() {
  refreshSkillUIs();
}
function refreshSkillSelect() {
  refreshSkillUIs();
}

function castSelectedMagic() {
  castMagicFromUI();
}
function useSelectedSkill() {
  useSkillFromUI();
}

// =======================
// 職業ごとのスキルUI表示切り替え
// =======================

function updateBattleSkillUIByJob() {
  const magicBlock = document.getElementById("magicBlock");
  const skillBlock = document.getElementById("skillBlock");
  const magicBtn   = document.getElementById("castMagicBtn");
  const skillBtn   = document.getElementById("useSkillBtn");
  if (!magicBlock || !skillBlock || !magicBtn || !skillBtn) return;

  if (jobId === 0) {
    magicBlock.style.display = "none";
    magicBtn.style.display   = "none";
    skillBlock.style.display = "";
    skillBtn.style.display   = "";
  } else if (jobId === 1) {
    magicBlock.style.display = "";
    magicBtn.style.display   = "";
    skillBlock.style.display = "none";
    skillBtn.style.display   = "none";
  } else if (jobId === 2 || jobId === 3) {
    magicBlock.style.display = "";
    magicBtn.style.display   = "";
    skillBlock.style.display = "";
    skillBtn.style.display   = "";
  } else {
    magicBlock.style.display = "";
    magicBtn.style.display   = "";
    skillBlock.style.display = "";
    skillBtn.style.display   = "";
  }
}

function updateSkillButtonsByJob() {
  const magicBlock = document.getElementById("magicBlock");
  const skillBlock = document.getElementById("skillBlock");

  if (magicBlock) {
    magicBlock.style.display = (jobId === 1 || jobId === 2 || jobId === 3) ? "" : "none";
  }

  if (skillBlock) {
    skillBlock.style.display = (jobId === 0 || jobId === 2 || jobId === 3) ? "" : "none";
  }
}