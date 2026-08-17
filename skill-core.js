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

// jobId: 0=戦士, 1=魔法使い, 2=動物使い, 100=大盾兵, 202=錬金術師（ギルド職）[web:165]
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
      // ★ 戦士ギルド専用: ガードインパクト（所属中のみ UI 表示＆使用可）
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
      // ★ 魔法ギルド専用: マナバースト（所属中のみ UI 表示＆使用可）
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
      // ★ 動物使いギルド専用: ビーストロア（所属中のみ UI 表示＆使用可）
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
  100: { // 大盾兵（戦士ギルドの戦闘ギルド職）[web:165]
    phys: [
      // 既存：カウンタースタンス
      {
        id: "greatshieldCounter",
        name: "カウンタースタンス",
        type: SKILL_TYPE_BUFF,
        spCost: 4
      },
      // ★ 追加 1：防御力依存の攻撃「大盾砕き」
      {
        id: "greatshieldSmash",
        name: "大盾砕き",
        type: SKILL_TYPE_PHYS,
        spCost: 5
      },
      // ★ 追加 2：防御力アップバフ「堅固の大盾」（5ターン）
      {
        id: "greatshieldFortify",
        name: "堅固の大盾",
        type: SKILL_TYPE_BUFF,
        spCost: 6
      },
      // ★ 追加 3：護りスタンス「護の構え」
      {
        id: "greatshieldGuardStance",
        name: "護の構え",
        type: SKILL_TYPE_BUFF,
        spCost: 6
      }
    ],
    magic: [] // 大盾兵は魔法なし（jobs.js の canUseMagic:false に対応）[web:165]
  },
  101: { // 呪術師（魔法ギルドの戦闘ギルド職）
    phys: [], // 呪術師は物理スキルなし（jobs.js の canUsePhysSkill:false に対応）
    magic: [
      {
        id: "curseStrike",
        name: "呪いの一撃",
        type: SKILL_TYPE_MAGIC,
        mpCost: 4
      },
      {
        id: "witherHex",
        name: "衰弱の呪詛",
        type: SKILL_TYPE_MAGIC,
        mpCost: 5
      },
      {
        id: "darkVeil",
        name: "闇のヴェール",
        type: SKILL_TYPE_MAGIC,
        mpCost: 6
      },
      {
        id: "ruinCurse",
        name: "破滅の呪詛",
        type: SKILL_TYPE_MAGIC,
        mpCost: 9
      }
    ]
  },
  202: { // 錬金術師（ギルド職）
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
// 共通: スキル UI 更新
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
        // 大盾兵のカウンタースタンスは戦士ギルド所属中のみ表示（任意だが戦士系なので揃える）
        if (s.id === "greatshieldCounter" && guildId !== "warrior") return false;
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
let braveChargeRate       = 0.3;  // 攻撃 +30%

let petBuffTurnRemain = 0;
// petBuffRate は game-core 側で宣言済み

// 錬金術師用: アイテムブースト
let itemBoostTurnRemain = 0;
let itemBoostRate       = 0.5;   // アイテム効果さらに +50%

// ★ 大盾兵用: 防御バフ（堅固の大盾）
let greatshieldFortifyTurnRemain = 0;
let greatshieldFortifyRate       = 0.2;  // 防御 +20%（バランス調整用）[web:167]

// ★ 大盾兵用: 護りスタンス（護の構え）
//   - ガード率 +30%（ベース）
//   - ガード時ダメージさらに 15% 軽減
let greatshieldGuardStanceTurnRemain = 0;
let greatshieldGuardStanceGuardRate  = 0.3;
let greatshieldGuardStanceReduceRate = 0.15;

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

  // ★修正: スキルツリー物理スキル倍率＋ジョブ物理スキル倍率
  //   （physSkillRate はスキルツリー側に既に存在したが、これまでどの
  //    ダメージ式にも掛かっておらず、UI表示だけの死んだボーナスだった）
  base = Math.floor(base * (1 + getPhysSkillRateMultiplier()));

  return base;
}

// ★新規: スキルツリー＋ジョブの物理スキル倍率を合算して返す
function getPhysSkillRateMultiplier() {
  let rate = 0;
  if (typeof getGlobalSkillTreeBonus === "function") {
    const t = getGlobalSkillTreeBonus();
    if (t && typeof t.physSkillRate === "number") rate += t.physSkillRate;
  }
  if (typeof getJobBonuses === "function" && typeof jobId !== "undefined") {
    const j = getJobBonuses(jobId);
    if (j && typeof j.physSkillRate === "number") rate += j.physSkillRate;
  }
  return rate;
}

// ★新規: スキルツリー＋ジョブの魔法スキル倍率を合算して返す
function getMagicSkillRateMultiplier() {
  let rate = 0;
  if (typeof getGlobalSkillTreeBonus === "function") {
    const t = getGlobalSkillTreeBonus();
    if (t && typeof t.magicSkillRate === "number") rate += t.magicSkillRate;
  }
  if (typeof getJobBonuses === "function" && typeof jobId !== "undefined") {
    const j = getJobBonuses(jobId);
    if (j && typeof j.magicSkillRate === "number") rate += j.magicSkillRate;
  }
  return rate;
}

// ★ 修正：接頭語などで補正済みの effINT があればそれを優先して使う
function getEffectiveIntForMagic() {
  let base;
  if (typeof window !== "undefined" && typeof window.effINT === "number") {
    base = window.effINT;
  } else {
    base = INT_;
  }

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

  // ★修正: スキルツリー魔法スキル倍率＋ジョブ魔法スキル倍率
  //   （魔法スキルは atkTotal を経由せず baseInt から直接ダメージを出すため、
  //    ここに掛けないと物理側だけ恩恵を受ける非対称な状態になっていた）
  base = Math.floor(base * (1 + getMagicSkillRateMultiplier()));

  return base;
}

// ★呪術師スキル専用の状態異常成功率判定。
//   アイテム側の rollStatusApply()（battle-items-use.js, isAlchemist() 判定）とは完全に別経路。
function rollStatusApplyForCurrentJob(baseRate) {
  let rate = baseRate;
  if (typeof isCurseMage === "function" && isCurseMage()) {
    let add = 0.0;
    if (typeof getCurseStatusApplyRateAdd === "function") {
      add = getCurseStatusApplyRateAdd();
    }
    rate = Math.min(1, rate + add);
  }
  return Math.random() < rate;
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
  if (greatshieldFortifyTurnRemain > 0) {
    greatshieldFortifyTurnRemain--;
  }
  if (greatshieldGuardStanceTurnRemain > 0) {
    greatshieldGuardStanceTurnRemain--;
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

  // ★修正: スキルツリー petAtkRate ＋ ジョブ petAtkRate
  //   （どちらも UI・集計上は存在したが、実際のペットダメージ計算には
  //    一度も掛かっておらず死んでいたボーナス）
  let petAtkRate = 0;
  if (typeof getGlobalSkillTreeBonus === "function") {
    const t = getGlobalSkillTreeBonus();
    if (t && typeof t.petAtkRate === "number") petAtkRate += t.petAtkRate;
  }
  if (typeof getJobBonuses === "function" && typeof jobId !== "undefined") {
    const j = getJobBonuses(jobId);
    if (j && typeof j.petAtkRate === "number") petAtkRate += j.petAtkRate;
  }
  base = base * (1 + petAtkRate);

  const variance = Math.floor(base * 0.2);
  const roll = base + (Math.floor(Math.random() * (variance * 2 + 1)) - variance);
  return Math.max(1, Math.floor(roll));
}

function doPetTurn() {
  // ★ 動物使い以外・敵不在・ペット不在/戦闘不能なら何もしない
  if (typeof jobHasPetTurn === "function") {
    if (!jobHasPetTurn()) return;
  } else {
    if (jobId !== 2) return;
  }
  if (!currentEnemy) return;
  if (typeof hasCompanion === "function" && !hasCompanion()) return;
  if (petHp <= 0) return;

  let usedSkill = false;
  if (petSkills && Math.random() < PET_SKILL_TRY_RATE) {
    const s = petSkills[Math.floor(Math.random() * petSkills.length)];
    if (s && s.id === "powerBite") {
      let base = calcPetDamage();
      let dmg = Math.floor(base * (s.powerRate || 1.6));
      enemyHp = Math.max(0, enemyHp - dmg);

      // ★ ペットダメージとして最大値更新
      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPet === "number") {
        currentBattleMaxPet = Math.max(currentBattleMaxPet, dmg);
      }

      appendLog(`${petName}の${s.name}！ ${currentEnemy.name}に${dmg}ダメージ！`);
      usedSkill = true;
    } else if (s && s.id === "taunt") {
      appendLog(`${petName}の${s.name}！ 敵の注意を引きつけた！`);
      petBuffTurnRemain = Math.max(petBuffTurnRemain, 1);
      usedSkill = true;
    } else if (s && s.id === "selfHeal") {
      const heal = Math.floor(petHpMax * (s.healRate || 0.3)) + 3;
      petHp = Math.min(petHp + heal, petHpMax);
      appendLog(`${petName}の${s.name}！ HP が${heal}回復した！`);
      usedSkill = true;
    }
  }

  if (!usedSkill) {
    let dmg = calcPetDamage();

    // ★ ここだけ調整: クリティカル率にステータスバフを反映（ベース 20% は維持）
    let critRate = 0.2;
    if (typeof modifyCritRateForPlayer === "function") {
      critRate = modifyCritRateForPlayer(critRate);
    }

    if (Math.random() < critRate) {
      // ★ プレイヤーと同じクリダメ倍率ロジックを適用（LUK＋バフ＋減衰＋3.0 倍上限）
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

      dmg = Math.floor(dmg * critMult);
      enemyHp = Math.max(0, enemyHp - dmg);

      // ★ ペットクリティカルダメージとして最大値更新
      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPet === "number") {
        currentBattleMaxPet = Math.max(currentBattleMaxPet, dmg);
      }

      appendLog(`${petName}の渾身の一撃！ ${currentEnemy.name} に${dmg}ダメージ！`);
    } else {
      enemyHp = Math.max(0, enemyHp - dmg);

      // ★ ペット通常攻撃として最大値更新
      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPet === "number") {
        currentBattleMaxPet = Math.max(currentBattleMaxPet, dmg);
      }

      appendLog(`${petName}の攻撃！ ${currentEnemy.name} に${dmg}ダメージ`);
    }
  }

  if (enemyHp <= 0) {
    enemyHp = 0;

    // ★ ギルド用ヘルパーにペット撃破を通知（動物使い時のみ）
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
// 魔法発動（UI セレクト版）
// =======================

function castMagicFromUI() {
  // 魔法使用可能職：魔法使い(1)、動物使い(2)、錬金術師(202)
  if (typeof jobCanUseMagic === "function") {
    if (!jobCanUseMagic()) {
      appendLog("魔法を扱える職業ではない");
      return;
    }
  } else {
    if (jobId !== 1 && jobId !== 2 && jobId !== 202) {
      appendLog("魔法を扱える職業ではない");
      return;
    }
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
      // playerAttack と同様、行動不能でもターンは進める
      if (currentEnemy) {
        enemyTurn();
        if (typeof tickStatusesTurnEndForBoth === "function") {
          tickStatusesTurnEndForBoth();
        }
        if (typeof renderPlayerStatusIcons === "function") {
          renderPlayerStatusIcons();
        }
        if (typeof updateEnemyStatusUI === "function") {
          updateEnemyStatusUI();
        }
      }
      if (typeof updateDisplay === "function") {
        updateDisplay();
      }
      return;
    }
  }

  const mpCost = skill.mpCost || 0;
  if (mp < mpCost) {
    appendLog("MP が足りない");
    return;
  }
  mp -= mpCost;

  let didDamage = false;

  if (skillId === "fireBolt") {
    const baseInt = getEffectiveIntForMagic();
    const dmg = 10 + baseInt * 2;
    enemyHp = Math.max(0, enemyHp - dmg);

    // ★ 魔法ダメージとして最大値更新
    if (typeof currentBattleMaxDamage === "number") {
      currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
    }
    if (typeof currentBattleMaxMagic === "number") {
      currentBattleMaxMagic = Math.max(currentBattleMaxMagic, dmg);
    }

    appendLog(`ファイアボルト！ ${currentEnemy.name} に${dmg}ダメージ`);
    didDamage = true;
  } else if (skillId === "iceLance") {
    const baseInt = getEffectiveIntForMagic();
    const dmg = 8 + Math.floor(baseInt * 1.8);
    enemyHp = Math.max(0, enemyHp - dmg);

    // ★ 魔法ダメージとして最大値更新
    if (typeof currentBattleMaxDamage === "number") {
      currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
    }
    if (typeof currentBattleMaxMagic === "number") {
      currentBattleMaxMagic = Math.max(currentBattleMaxMagic, dmg);
    }

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

    // ★ 多段の合計ダメージを魔法ダメージとして最大値更新
    if (typeof currentBattleMaxDamage === "number") {
      currentBattleMaxDamage = Math.max(currentBattleMaxDamage, total);
    }
    if (typeof currentBattleMaxMagic === "number") {
      currentBattleMaxMagic = Math.max(currentBattleMaxMagic, total);
    }

    appendLog(`チェインライトニング！ ${currentEnemy.name} に${hits}ヒット合計${total}ダメージ`);
    didDamage = true;
  } else if (skillId === "manaBurst") {
    const baseInt = getEffectiveIntForMagic();
    const dmg = 15 + baseInt * 3;
    enemyHp = Math.max(0, enemyHp - dmg);
    const extra = Math.floor(mpMax * 0.1);
    mp = Math.max(0, mp - extra);

    // ★ 魔法ダメージとして最大値更新
    if (typeof currentBattleMaxDamage === "number") {
      currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
    }
    if (typeof currentBattleMaxMagic === "number") {
      currentBattleMaxMagic = Math.max(currentBattleMaxMagic, dmg);
    }

    appendLog(`マナバースト！ ${currentEnemy.name} に${dmg}ダメージ（反動で MP を${extra}消費）`);
    didDamage = true;
  } else if (skillId === "curseStrike") {
    // 呪術師専用：呪いの一撃（確定ダメージ＋60%で防御ダウン）
    if (jobId !== 101) {
      appendLog("呪いの一撃は呪術師専用だ");
    } else {
      const baseInt = getEffectiveIntForMagic();
      const dmg = 6 + Math.floor(baseInt * 1.4);
      enemyHp = Math.max(0, enemyHp - dmg);

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxMagic === "number") {
        currentBattleMaxMagic = Math.max(currentBattleMaxMagic, dmg);
      }

      appendLog(`呪いの一撃！ ${currentEnemy.name} に${dmg}ダメージ`);

      if (typeof addStatusToEnemy === "function") {
        if (rollStatusApplyForCurrentJob(0.6)) {
          addStatusToEnemy("def_down", { fromCurseSkill: true });
          appendLog(`${currentEnemy.name}の防御が下がった！`);
        } else {
          appendLog("しかし呪いはうまく浸透しなかった…");
        }
      }
      didDamage = true;
    }
  } else if (skillId === "witherHex") {
    // 呪術師専用：衰弱の呪詛（純デバフ、ダメージなし。80%で「呪い」＝継続ダメージを付与）
    if (jobId !== 101) {
      appendLog("衰弱の呪詛は呪術師専用だ");
    } else {
      if (typeof addStatusToEnemy === "function") {
        if (rollStatusApplyForCurrentJob(0.8)) {
          addStatusToEnemy("curseWither", { fromCurseSkill: true });
          appendLog(`衰弱の呪詛！ ${currentEnemy.name}に呪いをかけた（継続ダメージ）`);
        } else {
          appendLog("衰弱の呪詛！ しかし呪いはうまく浸透しなかった…");
        }
      }
      // ダメージを与えないスキルなので didDamage は false のまま
    }
  } else if (skillId === "darkVeil") {
    // 呪術師専用：闇のヴェール（小ダメージ＋75%で暗闇＝命中-30%）
    if (jobId !== 101) {
      appendLog("闇のヴェールは呪術師専用だ");
    } else {
      const baseInt = getEffectiveIntForMagic();
      const dmg = 4 + Math.floor(baseInt * 0.8);
      enemyHp = Math.max(0, enemyHp - dmg);

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxMagic === "number") {
        currentBattleMaxMagic = Math.max(currentBattleMaxMagic, dmg);
      }

      appendLog(`闇のヴェール！ ${currentEnemy.name} に${dmg}ダメージ`);

      if (typeof addStatusToEnemy === "function") {
        if (rollStatusApplyForCurrentJob(0.75)) {
          addStatusToEnemy("blind", { fromCurseSkill: true });
          appendLog(`${currentEnemy.name}は闇に包まれ視界を失った！`);
        } else {
          appendLog("しかし闇はうまく纏わりつかなかった…");
        }
      }
      didDamage = true;
    }
  } else if (skillId === "ruinCurse") {
    // 呪術師専用：破滅の呪詛（フィニッシャー。大ダメージ＋50%で麻痺）
    if (jobId !== 101) {
      appendLog("破滅の呪詛は呪術師専用だ");
    } else {
      const baseInt = getEffectiveIntForMagic();
      const dmg = 12 + Math.floor(baseInt * 2.2);
      enemyHp = Math.max(0, enemyHp - dmg);

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxMagic === "number") {
        currentBattleMaxMagic = Math.max(currentBattleMaxMagic, dmg);
      }

      appendLog(`破滅の呪詛！ ${currentEnemy.name} に${dmg}ダメージ`);

      if (typeof addStatusToEnemy === "function") {
        if (rollStatusApplyForCurrentJob(0.5)) {
          addStatusToEnemy("paralyze", { fromCurseSkill: true });
          appendLog(`${currentEnemy.name}は麻痺して動けなくなった！`);
        } else {
          appendLog("しかし麻痺はうまく効かなかった…");
        }
      }
      didDamage = true;
    }
  } else if (skillId === "beastHeal") {
    if (jobId !== 2) {
      appendLog("この魔法は動物使い専用だ");
    } else {
      const heal = Math.floor(petHpMax * 0.4) + 5;
      petHp = Math.min(petHp + heal, petHpMax);
      appendLog(`ビーストヒール！ ${petName}の HP が${heal}回復した`);
    }
  } else if (skillId === "safeBrew") {
    // 錬金術師用：INT/DEX/LUK 複合回復
    if (jobId !== 202) {
      appendLog("セーフブリューは錬金術師専用だ");
    } else {
      const baseInt = getEffectiveIntForMagic();
      const baseDex = typeof DEX_ === "number" ? DEX_ : 0;
      const baseLuk = typeof LUK_ === "number" ? LUK_ : 0;
      const heal = Math.floor(baseInt * 1.0 + baseDex * 0.4 + baseLuk * 0.3) + 10;
      const before = hp;
      hp = Math.min(hpMax, hp + heal);
      const actual = hp - before;
      appendLog(`セーフブリュー！ HP が${actual}回復した`);
    }
  }

  // ここからターン進行
  if (!currentEnemy) {
    // 非戦闘時：セーフブリューやビーストヒールだけして終了（敵・ペットターンは進めない）
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
// 物理スキル発動（UI セレクト版）
// =======================

function useSkillFromUI() {
  // 物理スキル使用可能職：戦士(0)、動物使い(2)、大盾兵(100)、錬金術師(202) など[web:165]
  if (typeof jobCanUsePhysSkill === "function") {
    if (!jobCanUsePhysSkill()) {
      appendLog("スキルを扱える職業ではない");
      return;
    }
  } else {
    if (jobId !== 0 && jobId !== 2 && jobId !== 100 && jobId !== 202) {
      appendLog("スキルを扱える職業ではない");
      return;
    }
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
  // ★ 大盾兵カウンタースタンスは戦士ギルド所属中のみ使用可能
  if (skillId === "greatshieldCounter" && guildId !== "warrior") {
    appendLog("このスキルは今は使えない（対応するギルドに所属していない）");
    return;
  }

  // アイテムブーストは敵がいなくても使える（自己バフ）
  if (!currentEnemy &&
      skillId !== "animalLink" &&
      skillId !== "beastRoar" &&
      skillId !== "itemBoost" &&
      skillId !== "greatshieldCounter" &&
      skillId !== "greatshieldFortify" &&
      skillId !== "greatshieldGuardStance") {
    appendLog("敵がいない");
    return;
  }

  // プレイヤー行動前の状態異常チェック
  if (typeof beforeActionPlayer === "function") {
    const pre = beforeActionPlayer();
    if (!pre || !pre.canAct) {
      // playerAttack と同様、行動不能でもターンは進める
      if (currentEnemy) {
        enemyTurn();
        if (typeof tickStatusesTurnEndForBoth === "function") {
          tickStatusesTurnEndForBoth();
        }
        if (typeof renderPlayerStatusIcons === "function") {
          renderPlayerStatusIcons();
        }
        if (typeof updateEnemyStatusUI === "function") {
          updateEnemyStatusUI();
        }
      }
      if (typeof updateDisplay === "function") {
        updateDisplay();
      }
      return;
    }
  }

  const spCost = skill.spCost || 0;
  if (sp < spCost) {
    appendLog("SP が足りない");
    return;
  }
  sp -= spCost;

  let didDamage = false;

  if (skillId === "powerSlash") {
    const dmg = Math.floor(getCurrentAtkForSkill() * 1.5);
    enemyHp = Math.max(0, enemyHp - dmg);

    // ★ 物理スキルダメージとして最大値更新
    if (typeof currentBattleMaxDamage === "number") {
      currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
    }
    if (typeof currentBattleMaxPhys === "number") {
      currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
    }

    appendLog(`パワースラッシュ！ ${currentEnemy.name} に${dmg}ダメージ`);
    didDamage = true;
  } else if (skillId === "shieldBlow") {
    const dmg = Math.floor(getCurrentAtkForSkill() * 1.2);
    enemyHp = Math.max(0, enemyHp - dmg);
    shieldBlowGuardTurnRemain = 1;

    // ★ 物理スキルダメージとして最大値更新
    if (typeof currentBattleMaxDamage === "number") {
      currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
    }
    if (typeof currentBattleMaxPhys === "number") {
      currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
    }

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

    // ★ 物理スキルダメージとして最大値更新
    if (typeof currentBattleMaxDamage === "number") {
      currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
    }
    if (typeof currentBattleMaxPhys === "number") {
      currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
    }

    appendLog(`ガードインパクト！ ${currentEnemy.name} に${dmg}ダメージ（しばらく被ダメージ軽減）`);
    didDamage = true;
  } else if (skillId === "beastSlash") {
    const dmg = Math.floor(getCurrentAtkForSkill() * 1.3);
    enemyHp = Math.max(0, enemyHp - dmg);

    // ★ 物理スキルダメージとして最大値更新
    if (typeof currentBattleMaxDamage === "number") {
      currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
    }
    if (typeof currentBattleMaxPhys === "number") {
      currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
    }

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
    // 錬金術師専用：アイテム強化バフ（SP 消費）
    if (jobId !== 202) {
      appendLog("アイテムブーストは錬金術師専用だ");
    } else {
      itemBoostTurnRemain = 3;
      appendLog("アイテムブースト！ しばらくポーションと道具の効果がさらに高まった");
    }
  } else if (skillId === "greatshieldCounter") {
    // ★ 大盾兵専用：カウンタースタンス（防御前生ダメージ×職倍率で1回だけ反撃）
    if (jobId !== 100) {
      appendLog("カウンタースタンスは大盾兵専用だ");
    } else {
      if (typeof addSkillStatusToPlayer === "function") {
        // 状態側の counter が getCounterDamageRateForJob(jobId) から倍率を読む前提で、
        // ここではターン数だけ指定（例: 2ターンの間、最初の被弾で1回だけ発動）
        addSkillStatusToPlayer("counter", 2);
      }
      appendLog("カウンタースタンス！ 次の被ダメージに対して反撃の構えを取った");
    }
  } else if (skillId === "greatshieldSmash") {
    // ★ 大盾砕き：防御力依存の攻撃
    if (jobId !== 100) {
      appendLog("大盾砕きは大盾兵専用だ");
    } else if (!currentEnemy) {
      appendLog("敵がいない");
    } else {
      const defBase = typeof defTotal === "number" ? defTotal : 0;
      // 防御 80% ＋ 固定値 10（バランスは後で調整）
      let dmg = Math.floor(defBase * 0.8) + 10;
      // ★修正: 物理スキル扱いなので physSkillRate（スキルツリー＋ジョブ）も適用
      dmg = Math.floor(dmg * (1 + getPhysSkillRateMultiplier()));
      if (dmg < 1) dmg = 1;

      enemyHp = Math.max(0, enemyHp - dmg);

      // 戦闘統計（物理扱い）
      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPhys === "number") {
        currentBattleMaxPhys = Math.max(currentBattleMaxPhys, dmg);
      }

      appendLog(`大盾砕き！ ${currentEnemy.name} に${dmg}ダメージ（防御力を活かした一撃）`);
      didDamage = true;
    }
  } else if (skillId === "greatshieldFortify") {
    // ★ 堅固の大盾：防御アップ 5 ターン
    if (jobId !== 100) {
      appendLog("堅固の大盾は大盾兵専用だ");
    } else {
      greatshieldFortifyTurnRemain = 5;
      appendLog("堅固の大盾！ しばらく防御力が上がった");
    }
  } else if (skillId === "greatshieldGuardStance") {
    // ★ 護の構え：ガード率・軽減アップ
    if (jobId !== 100) {
      appendLog("護の構えは大盾兵専用だ");
    } else {
      greatshieldGuardStanceTurnRemain = 3;
      appendLog("護の構え！ 大盾を構え直し、敵の攻撃をしのぐ体勢を取った");
    }
  }

  if (skillId === "animalLink" ||
      skillId === "braveCharge" ||
      skillId === "beastRoar" ||
      skillId === "itemBoost" ||
      skillId === "greatshieldCounter" ||
      skillId === "greatshieldFortify" ||
      skillId === "greatshieldGuardStance") {
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
// 職業ごとのスキル UI 表示切り替え
// =======================

function updateBattleSkillUIByJob() {
  const magicBlock = document.getElementById("magicBlock");
  const skillBlock = document.getElementById("skillBlock");
  const magicBtn   = document.getElementById("castMagicBtn");
  const skillBtn   = document.getElementById("useSkillBtn");
  if (!magicBlock || !skillBlock || !magicBtn || !skillBtn) return;

  const hasMagic = (typeof jobCanUseMagic === "function")
    ? jobCanUseMagic()
    : (jobId === 1 || jobId === 2 || jobId === 202);
  const hasPhys  = (typeof jobCanUsePhysSkill === "function")
    ? jobCanUsePhysSkill()
    : (jobId === 0 || jobId === 2 || jobId === 100 || jobId === 202);

  magicBlock.style.display = hasMagic ? "" : "none";
  magicBtn.style.display   = hasMagic ? "" : "none";
  skillBlock.style.display = hasPhys  ? "" : "none";
  skillBtn.style.display   = hasPhys  ? "" : "none";
}

function updateSkillButtonsByJob() {
  const magicBlock = document.getElementById("magicBlock");
  const skillBlock = document.getElementById("skillBlock");

  const hasMagic = (typeof jobCanUseMagic === "function")
    ? jobCanUseMagic()
    : (jobId === 1 || jobId === 2 || jobId === 202);
  const hasPhys  = (typeof jobCanUsePhysSkill === "function")
    ? jobCanUsePhysSkill()
    : (jobId === 0 || jobId === 2 || jobId === 100 || jobId === 202);

  if (magicBlock) magicBlock.style.display = hasMagic ? "" : "none";
  if (skillBlock) skillBlock.style.display = hasPhys  ? "" : "none";
}