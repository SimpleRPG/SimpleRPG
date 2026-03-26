// skill-core.js
// 職業スキル定義 ＋ スキルUI ＋ 実行ロジック
// 前提: game-core.js のグローバル（jobId, atkTotal, INT_, hp, mp, sp, petHp など）が存在

// =======================
// スキル定義
// =======================

const SKILL_TYPE_MAGIC = "magic";
const SKILL_TYPE_PHYS  = "phys";
const SKILL_TYPE_BUFF  = "buff";
const SKILL_TYPE_PET   = "pet";

// jobId: 0=戦士, 1=魔法使い, 2=動物使い
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
        mpCost: 5
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

  // 魔法セレクト
  {
    const optNone = document.createElement("option");
    optNone.value = "";
    optNone.textContent = "魔法なし";
    magicSel.appendChild(optNone);

    jobSkills.magic.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      magicSel.appendChild(opt);
    });
  }

  // 物理スキルセレクト
  {
    const optNone = document.createElement("option");
    optNone.value = "";
    optNone.textContent = "スキルなし";
    skillSel.appendChild(optNone);

    jobSkills.phys.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      skillSel.appendChild(opt);
    });
  }
}

// =======================
// バフ・ガード用フラグ
// =======================

let braveChargeTurnRemain      = 0;
let braveChargeRate            = 0.3;  // 攻撃+30%
let shieldBlowGuardTurnRemain  = 0;    // 次の被ダメ軽減フラグ
let petBuffTurnRemain          = 0;

// game-core.js のダメージ計算に組み込む用ヘルパ
function getCurrentAtkForSkill() {
  let base = atkTotal;
  if (braveChargeTurnRemain > 0) {
    base = Math.floor(base * (1 + braveChargeRate));
  }
  return base;
}

// ターン終了時に呼ぶ想定（enemyTurnの最後など）
function tickSkillBuffTurns() {
  if (braveChargeTurnRemain > 0) {
    braveChargeTurnRemain--;
  }
  if (shieldBlowGuardTurnRemain > 0) {
    // シールドブロウは「次の被ダメ1回」なので、実際の軽減処理側で0にするのでもOK
  }
  if (petBuffTurnRemain > 0) {
    petBuffTurnRemain--;
    if (petBuffTurnRemain <= 0) {
      petBuffRate = 1.0;
    }
  }
}

// =======================
// 魔法発動（UIセレクト版）
// =======================

function castMagicFromUI() {
  if (jobId !== 1 && jobId !== 2) {
    setLog("魔法を扱える職業ではない");
    return;
  }
  const sel = document.getElementById("magicSelect");
  if (!sel) return;
  const skillId = sel.value;
  if (!skillId) {
    setLog("使用する魔法を選んでください");
    return;
  }
  const jobSkills = JOB_SKILLS[jobId] || { magic: [] };
  const skill = jobSkills.magic.find(s => s.id === skillId);
  if (!skill) {
    setLog("その魔法は使用できない");
    return;
  }

  if (!currentEnemy) {
    setLog("敵がいない");
    return;
  }

  const mpCost = skill.mpCost || 0;
  if (mp < mpCost) {
    setLog("MPが足りない");
    return;
  }
  mp -= mpCost;

  if (skillId === "fireBolt") {
    const dmg = 10 + INT_ * 2;
    enemyHp = Math.max(0, enemyHp - dmg);
    setLog(`ファイアボルト！ ${currentEnemy.name} に${dmg}ダメージ`);
  } else if (skillId === "iceLance") {
    const dmg = 8 + Math.floor(INT_ * 1.8);
    enemyHp = Math.max(0, enemyHp - dmg);
    // 本格的なDEFデバフにしたければ currentEnemy にデバフ値を持たせる
    setLog(`アイスランス！ ${currentEnemy.name} に${dmg}ダメージ（防御が下がった気がする）`);
  } else if (skillId === "chainLightning") {
    const hits = 2 + Math.floor(Math.random() * 2); // 2〜3Hit
    let total = 0;
    for (let i = 0; i < hits; i++) {
      const one = 6 + Math.floor(INT_ * 1.3);
      total += one;
    }
    enemyHp = Math.max(0, enemyHp - total);
    setLog(`チェインライトニング！ ${currentEnemy.name} に${hits}ヒット合計${total}ダメージ`);
  } else if (skillId === "beastHeal") {
    if (jobId !== 2) {
      setLog("この魔法は動物使い専用だ");
    } else {
      const heal = Math.floor(petHpMax * 0.4) + 5;
      petHp = Math.min(petHp + heal, petHpMax);
      setLog(`ビーストヒール！ ペットのHPが${heal}回復した`);
    }
  }

  if (enemyHp <= 0) {
    winBattle();
  } else {
    enemyTurn();
  }
  updateDisplay();
}

// =======================
// 物理スキル発動（UIセレクト版）
// =======================

function useSkillFromUI() {
  if (jobId !== 0 && jobId !== 2) {
    setLog("スキルを扱える職業ではない");
    return;
  }
  const sel = document.getElementById("skillSelect");
  if (!sel) return;
  const skillId = sel.value;
  if (!skillId) {
    setLog("使用するスキルを選んでください");
    return;
  }
  const jobSkills = JOB_SKILLS[jobId] || { phys: [] };
  const skill = jobSkills.phys.find(s => s.id === skillId);
  if (!skill) {
    setLog("そのスキルは使用できない");
    return;
  }

  if (!currentEnemy) {
    setLog("敵がいない");
    return;
  }

  const spCost = skill.spCost || 0;
  if (sp < spCost) {
    setLog("SPが足りない");
    return;
  }
  sp -= spCost;

  if (skillId === "powerSlash") {
    const dmg = Math.floor(getCurrentAtkForSkill() * 1.5);
    enemyHp = Math.max(0, enemyHp - dmg);
    setLog(`パワースラッシュ！ ${currentEnemy.name} に${dmg}ダメージ`);
  } else if (skillId === "shieldBlow") {
    const dmg = Math.floor(getCurrentAtkForSkill() * 1.2);
    enemyHp = Math.max(0, enemyHp - dmg);
    shieldBlowGuardTurnRemain = 1;
    setLog(`シールドブロウ！ ${currentEnemy.name} に${dmg}ダメージ（次の被ダメージ軽減）`);
  } else if (skillId === "braveCharge") {
    braveChargeTurnRemain = 2;
    setLog("ブレイブチャージ！ しばらく攻撃力が上がった");
  } else if (skillId === "beastSlash") {
    const dmg = Math.floor(getCurrentAtkForSkill() * 1.3);
    enemyHp = Math.max(0, enemyHp - dmg);
    setLog(`ビーストスラッシュ！ ${currentEnemy.name} に${dmg}ダメージ`);
  } else if (skillId === "animalLink") {
    if (jobId !== 2) {
      setLog("アニマルリンクは動物使い専用だ");
    } else {
      petBuffRate = 1.4;
      petBuffTurnRemain = 2;
      setLog("アニマルリンク！ ペットの攻撃力が上がった");
    }
  }

  if (enemyHp <= 0) {
    winBattle();
  } else {
    enemyTurn();
  }
  updateDisplay();
}