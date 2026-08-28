// skill-core-1.js
// 職業スキル定義・UI更新・バフ・ステータス計算・ペットターン・魔法発動ロジック
// 前提: game-core-*.js のグローバル（jobId, atkTotal, INT_, DEX_, LUK_, hp, mp, sp, currentEnemy, enemyHp, enemyHpMax,
//        petHp, petHpMax, petAtkBase, petDefBase, petLevel, petName, shieldBlowGuardTurnRemain など）が存在

// =======================
// スキル定義
// =======================

const SKILL_TYPE_MAGIC = "magic";
const SKILL_TYPE_PHYS  = "phys";
const SKILL_TYPE_BUFF  = "buff";
const SKILL_TYPE_PET   = "pet";

// jobId: 0=戦士, 1=魔法使い, 2=動物使い, 100=大盾兵, 101=呪術師, 102=獣群使い,
//        200=鍛冶職人, 201=武具使い, 202=錬金術師, 203=道具使い, 204=料理人, 205=貪食家,
//        300=採集士, 301=採取監督官, 400=狩猟師, 401=漁師, 402=農夫
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
  100: { // 大盾兵（戦士ギルドの戦闘ギルド職）
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
    magic: [] // 大盾兵は魔法なし（jobs.js の canUseMagic:false に対応）
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
  200: { // 鍛冶職人（鍛冶ギルド職）
    phys: [
      {
        id: "armorCrush",
        name: "装甲粉砕",
        type: SKILL_TYPE_PHYS,
        spCost: 3
      },
      {
        id: "whetstoneSharpen",
        name: "刃研ぎ",
        type: SKILL_TYPE_BUFF,
        spCost: 4
      }
    ],
    magic: []
  },
  201: { // 武具使い（鍛冶ギルド職）
    phys: [
      {
        id: "parryCounter",
        name: "受け流し反撃",
        type: SKILL_TYPE_BUFF,
        spCost: 4
      },
      {
        id: "consecutiveStrike",
        name: "連撃破",
        type: SKILL_TYPE_PHYS,
        spCost: 5
      }
    ],
    magic: []
  },
  202: { // 錬金術師（ギルド職）
    phys: [
      {
        id: "potionBoost",
        name: "ポーションブースト",
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
  },
  203: { // 道具使い（錬金ギルド職）
    phys: [
      {
        id: "itemBoost",
        name: "アイテムブースト",
        type: SKILL_TYPE_BUFF,
        spCost: 4
      }
    ],
    magic: []
  },
  102: { // 獣群使い（動物使いギルドの戦闘ギルド職。ペット複数運用が持ち味）
    phys: [
      {
        id: "packSlash",
        name: "パックスラッシュ",
        type: SKILL_TYPE_PHYS,
        spCost: 3
      },
      {
        id: "packRally",
        name: "群れの咆哮",
        type: SKILL_TYPE_PET,
        spCost: 5
      },
      // ★ 動物使いギルド専用: パックフレンジー（所属中のみ UI 表示＆使用可）
      {
        id: "packFrenzy",
        name: "パックフレンジー",
        type: SKILL_TYPE_PET,
        spCost: 7
      }
    ],
    magic: [
      {
        id: "packMend",
        name: "群れの手当て",
        type: SKILL_TYPE_PET,
        mpCost: 6
      }
    ]
  },
  300: { // 採集士（採取ギルド職。通常採取6種の最高レベルをスキル倍率に反映）
    phys: [
      {
        id: "sandToss",
        name: "目潰し砂煙",
        type: SKILL_TYPE_PHYS,
        spCost: 3
      },
      {
        id: "wildHerbPoultice",
        name: "野草の調合",
        type: SKILL_TYPE_BUFF,
        spCost: 4
      }
    ],
    magic: []
  },
  301: { // 採取監督官（採取ギルド職。拠点レベル(0〜3)をスキル倍率に反映）
    phys: [
      {
        id: "overseerStrike",
        name: "監督官の号令",
        type: SKILL_TYPE_PHYS,
        spCost: 3
      },
      {
        id: "interceptFormation",
        name: "迎撃防衛陣",
        type: SKILL_TYPE_BUFF,
        spCost: 4
      }
    ],
    magic: []
  },
  400: { // 狩猟師（食材ギルド職。狩猟(hunt)レベルをスキル倍率に反映）
    phys: [
      {
        id: "hunterSnare",
        name: "狩人の罠",
        type: SKILL_TYPE_PHYS,
        spCost: 3
      },
      {
        id: "vitalStrike",
        name: "急所突き",
        type: SKILL_TYPE_PHYS,
        spCost: 4
      }
    ],
    magic: []
  },
  401: { // 漁師（食材ギルド職。釣り(fish)レベルをスキル倍率に反映）
    phys: [
      {
        id: "harpoonThrust",
        name: "銛突き",
        type: SKILL_TYPE_PHYS,
        spCost: 3
      },
      {
        id: "castNet",
        name: "投網拘束",
        type: SKILL_TYPE_PHYS,
        spCost: 4
      }
    ],
    magic: []
  },
  402: { // 農夫（食材ギルド職。畑/菜園の高い方のレベルをスキル倍率に反映）
    phys: [
      {
        id: "earthTiller",
        name: "耕作の一撃",
        type: SKILL_TYPE_PHYS,
        spCost: 3
      },
      {
        id: "harvestBlessing",
        name: "豊穣の恵み",
        type: SKILL_TYPE_BUFF,
        spCost: 4
      }
    ],
    magic: []
  },
  204: { // 料理人（料理ギルド職。料理クラフトレベルをスキル倍率に反映）
    phys: [
      {
        id: "spiceBlind",
        name: "スパイス目潰し",
        type: SKILL_TYPE_PHYS,
        spCost: 3
      },
      {
        id: "nourishingSoup",
        name: "滋養スープ",
        type: SKILL_TYPE_BUFF,
        spCost: 4
      }
    ],
    magic: []
  },
  205: { // 貪食家（料理ギルド職。満腹度消費・生命力吸収特化）
    phys: [
      {
        id: "hungerBurst",
        name: "満腹バースト",
        type: SKILL_TYPE_PHYS,
        spCost: 4
      },
      {
        id: "digestDrain",
        name: "丸呑み消化",
        type: SKILL_TYPE_PHYS,
        spCost: 4
      }
    ],
    magic: []
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
        // パックフレンジーは動物使いギルド所属中のみ表示（獣群使いの上位バフ技）
        if (s.id === "packFrenzy" && guildId !== "tamer") return false;
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

// ★獣群使い専用：パーティ全体（編成中の生存ペット全員）にかかる攻撃バフ
//   petBuffRate/petBuffTurnRemain の「単体ペット版」に対応する多頭版。
let beastPartyBuffRate = 1.0;
let beastPartyBuffTurnRemain = 0;
// petBuffRate は game-core 側で宣言済み

// 錬金術師用: アイテムブースト
let itemBoostTurnRemain = 0;     // ★2024: 道具使い(203)「アイテムブースト」専用。道具ダメージのブースト判定に使用
let itemBoostRate       = 0.5;   // アイテム効果さらに +50%（現状は道具側でのみ参照）

let potionBoostTurnRemain = 0;   // ★新規: 錬金術師(202)「ポーションブースト」専用
let potionBoostRate       = 0.5; // ポーション効果さらに +50%

// ★ 大盾兵用: 防御バフ（堅固の大盾）
let greatshieldFortifyTurnRemain = 0;
let greatshieldFortifyRate       = 0.2;  // 防御 +20%

// ★ 大盾兵用: 護りスタンス（護の構え）
//   - ガード率 +30%（ベース）
//   - ガード時ダメージさらに 15% 軽減
let greatshieldGuardStanceTurnRemain = 0;
let greatshieldGuardStanceGuardRate  = 0.3;
let greatshieldGuardStanceReduceRate = 0.15;

// ★ 鍛冶職人用: 応急鍛冶（一時的な防御バフ）
let fieldForgingTurnRemain = 0;
let fieldForgingRate       = 0.15;  // 防御 +15%
let fieldForgingAtkRate    = 0.15;  // スキル攻撃 +15%

// ★ 武具使い用: 完全装備（一時的な攻撃・防御バフ）
let fullGearTurnRemain = 0;
let fullGearAtkRate    = 0.20;  // スキル攻撃 +20%
let fullGearDefRate    = 0.20;  // 防御 +20%

// ★ 料理人用: 特製まかない（一時的な自己回復＋攻撃・防御バフ）
let chefSpecialtyTurnRemain = 0;
let chefSpecialtyAtkRate    = 0.15;  // 攻撃 +15%〜+25%（料理Lv依存）
let chefSpecialtyDefRate    = 0.15;  // 防御 +15%〜+25%（料理Lv依存）

// ★ 貪食家用: 鋼の胃袋（一時的な攻撃・防御バフ）
let ironStomachTurnRemain = 0;
let ironStomachAtkRate    = 0.20;  // 攻撃 +20%
let ironStomachDefRate    = 0.20;  // 防御 +20%

function getCurrentAtkForSkill() {
  let base = atkTotal;
  if (braveChargeTurnRemain > 0) {
    base = Math.floor(base * (1 + braveChargeRate));
  }

  // ★ 武具使い用: 完全装備（スキル攻撃バフ）
  if (fullGearTurnRemain > 0) {
    base = Math.floor(base * (1 + fullGearAtkRate));
  }

  // ★ 鍛冶職人用: 応急鍛冶（スキル攻撃バフ）
  if (fieldForgingTurnRemain > 0) {
    base = Math.floor(base * (1 + fieldForgingAtkRate));
  }

  // ★ 料理人用: 特製まかない（スキル攻撃バフ）
  if (chefSpecialtyTurnRemain > 0) {
    base = Math.floor(base * (1 + chefSpecialtyAtkRate));
  }

  // ★ 貪食家用: 鋼の胃袋（スキル攻撃バフ）
  if (ironStomachTurnRemain > 0) {
    base = Math.floor(base * (1 + ironStomachAtkRate));
  }

  // ★ ギルド物理ボーナス（戦士ギルド）
  if (typeof getGuildBattleBonus === "function") {
    const bonus = getGuildBattleBonus();
    if (bonus && bonus.phys) {
      base = Math.floor(base * (1 + bonus.phys));
    }
  }

  // ★修正: スキルツリー物理スキル倍率＋ジョブ物理スキル倍率
  base = Math.floor(base * (1 + getPhysSkillRateMultiplier()));

  return base;
}

// ★鍛冶職人専用: クラフトスキルレベル（武器/防具の高い方）を参照するヘルパー
function getSmithCraftSkillLevel() {
  if (typeof getCraftSkillLevel !== "function") return 0;
  const w = getCraftSkillLevel("weapon") || 0;
  const a = getCraftSkillLevel("armor") || 0;
  return Math.max(w, a);
}

// ★料理人専用: 料理クラフトスキルレベルを参照するヘルパー
function getCookingCraftSkillLevel() {
  if (typeof getCraftSkillLevel !== "function") return 0;
  return getCraftSkillLevel("cooking") || 0;
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
  // ★採取ギルド職（採集士/採取監督官/狩猟師/漁師/農夫）: 対応する採取レベルに応じてスキル倍率が伸びる
  rate += getGatherJobSkillLevelBonus();
  return rate;
}

// ★新規: 採取ギルド職の戦闘スキルに、それぞれ対応する採取レベル（または拠点レベル）を反映する
//   - 採集士(300)   : 通常採取6種（木/鉱石/草/布/皮/水）の中で最も高いレベル
//   - 採取監督官(301): 6拠点の中で最も高い拠点レベル（0〜3）
//   - 狩猟師(400)    : 狩猟(hunt)レベル
//   - 漁師(401)      : 釣り(fish)レベル
//   - 農夫(402)      : 畑(fieldFarm)/菜園(garden)のうち高い方のレベル
function getGatherJobSkillLevelBonus() {
  const jid = (typeof jobId !== "undefined" && jobId !== null)
    ? jobId
    : (typeof window !== "undefined" ? window.jobId : null);
  if (jid == null) return 0;

  const GS = (typeof gatherSkills !== "undefined")
    ? gatherSkills
    : (typeof window !== "undefined" ? (window.gatherSkills || {}) : {});
  const MAXLV = (typeof GATHER_SKILL_MAX_LV === "number") ? GATHER_SKILL_MAX_LV : 100;

  let ratio = 0;
  let maxBonus = 0.25; // 基本上限: 最大+25%

  if (jid === 300) {
    const keys = ["wood", "ore", "herb", "cloth", "leather", "water"];
    let maxLv = 0;
    keys.forEach(k => {
      const lv = (GS[k] && GS[k].lv) || 0;
      if (lv > maxLv) maxLv = lv;
    });
    ratio = maxLv / MAXLV;
  } else if (jid === 301) {
    let maxBaseLv = 0;
    if (typeof getGatherBaseLevel === "function") {
      const keys = (typeof GATHER_BASE_MATERIAL_KEYS !== "undefined")
        ? GATHER_BASE_MATERIAL_KEYS
        : ["wood", "ore", "herb", "cloth", "leather", "water"];
      keys.forEach(k => {
        const lv = getGatherBaseLevel(k) || 0;
        if (lv > maxBaseLv) maxBaseLv = lv;
      });
    }
    ratio = maxBaseLv / 3; // 拠点レベルは 0〜3
    maxBonus = 0.15; // 到達が速い分、上限は低め
  } else if (jid === 400) {
    ratio = ((GS.hunt && GS.hunt.lv) || 0) / MAXLV;
  } else if (jid === 401) {
    ratio = ((GS.fish && GS.fish.lv) || 0) / MAXLV;
  } else if (jid === 402) {
    const fLv = (GS.fieldFarm && GS.fieldFarm.lv) || 0;
    const gLv = (GS.garden && GS.garden.lv) || 0;
    ratio = Math.max(fLv, gLv) / MAXLV;
  } else if (jid === 200) {
    // 鍛冶職人: 武器/防具クラフトレベル依存
    ratio = getSmithCraftSkillLevel() / 100;
  } else if (jid === 204 || jid === 205) {
    // 料理人・貪食家: 料理クラフトレベル依存
    ratio = getCookingCraftSkillLevel() / 100;
  } else {
    return 0;
  }

  ratio = Math.max(0, Math.min(1, ratio));
  return ratio * maxBonus;
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
  base = Math.floor(base * (1 + getMagicSkillRateMultiplier()));

  return base;
}

// ★呪術師スキル専用の状態異常成功率判定。
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
  if (beastPartyBuffTurnRemain > 0) {
    beastPartyBuffTurnRemain--;
    if (beastPartyBuffTurnRemain <= 0) {
      beastPartyBuffRate = 1.0;
    }
  }
  if (itemBoostTurnRemain > 0) {
    itemBoostTurnRemain--;
  }
  if (potionBoostTurnRemain > 0) {
    potionBoostTurnRemain--;
  }
  if (greatshieldFortifyTurnRemain > 0) {
    greatshieldFortifyTurnRemain--;
  }
  if (greatshieldGuardStanceTurnRemain > 0) {
    greatshieldGuardStanceTurnRemain--;
  }
  if (fieldForgingTurnRemain > 0) {
    fieldForgingTurnRemain--;
  }
  if (fullGearTurnRemain > 0) {
    fullGearTurnRemain--;
  }
  if (chefSpecialtyTurnRemain > 0) {
    chefSpecialtyTurnRemain--;
  }
  if (ironStomachTurnRemain > 0) {
    ironStomachTurnRemain--;
  }
}

// =======================
// ペット攻撃ロジック
// =======================

// ★特性補正込みのペット基礎ステを取得するヘルパー
function getCompanionAdjustedPetBaseStats() {
  if (typeof applyCompanionPetRates === "function") {
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
  const equipStat = (typeof getPetEquipStatTotal === "function" && Array.isArray(window.petEquip))
    ? getPetEquipStatTotal({ equip: window.petEquip })
    : { atk: 0, scaleAtk: 0 };
  const equipAtk = equipStat.atk || 0;
  const atkFromEquipScale = Math.floor(atkBase * (equipStat.scaleAtk || 0));
  return Math.max(1, atkBase + levelBonus + equipAtk + atkFromEquipScale);
}

// ★ ペット防御力（game-core-1.js の petDefBase を利用）＋特性補正
function getPetDef() {
  const levelBonus = Math.floor(petLevel * 0.3);
  const baseStats = getCompanionAdjustedPetBaseStats();
  const defBase = baseStats.def != null ? baseStats.def : petDefBase;
  const equipStat = (typeof getPetEquipStatTotal === "function" && Array.isArray(window.petEquip))
    ? getPetEquipStatTotal({ equip: window.petEquip })
    : { def: 0, scaleDef: 0 };
  const equipDef = equipStat.def || 0;
  const defFromEquipScale = Math.floor(defBase * (equipStat.scaleDef || 0));
  let total = defBase + levelBonus + equipDef + defFromEquipScale;

  if (typeof getJobBonuses === "function" && typeof jobId !== "undefined") {
    const j = getJobBonuses(jobId);
    if (j && typeof j.petDefRate === "number") {
      total = total * (1 + j.petDefRate);
    }
  }

  return Math.max(0, Math.floor(total));
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
    } else if (s && s.id === "furyStrike") {
      if (Math.random() < (s.missRate || 0.15)) {
        appendLog(`${petName}の${s.name}！ しかし外れてしまった…`);
        usedSkill = true;
      } else {
        let base = calcPetDamage();
        let dmg = Math.floor(base * (s.powerRate || 2.2));
        enemyHp = Math.max(0, enemyHp - dmg);
        if (typeof currentBattleMaxDamage === "number") {
          currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
        }
        if (typeof currentBattleMaxPet === "number") {
          currentBattleMaxPet = Math.max(currentBattleMaxPet, dmg);
        }
        appendLog(`${petName}の${s.name}！ ${currentEnemy.name}に${dmg}ダメージ！`);
        usedSkill = true;
      }
    } else if (s && s.id === "guardStance") {
      window.petGuardRate = (s.defRate || 0.5);
      appendLog(`${petName}の${s.name}！ 身構えて防御を固めた！`);
      usedSkill = true;
    }
  }

  if (!usedSkill) {
    let dmg = calcPetDamage();

    let critRate = 0.2;
    if (typeof modifyCritRateForPlayer === "function") {
      critRate = modifyCritRateForPlayer(critRate);
    }

    if (Math.random() < critRate) {
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

      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPet === "number") {
        currentBattleMaxPet = Math.max(currentBattleMaxPet, dmg);
      }

      appendLog(`${petName}の渾身の一撃！ ${currentEnemy.name} に${dmg}ダメージ！`);
    } else {
      enemyHp = Math.max(0, enemyHp - dmg);

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
// 獣群使い用：パーティ全員が同時に行動するペットターン
// =======================

let beastPartyTauntTurnRemain = 0;

function calcPetRecordDamage(rec) {
  const buffRate = (typeof rec.buffRate === "number") ? rec.buffRate : 1.0;
  let base = getPetRecordAtk(rec) * buffRate;

  if (typeof beastPartyBuffRate === "number" && beastPartyBuffRate > 1.0) {
    base = base * beastPartyBuffRate;
  }

  if (typeof getGuildBattleBonus === "function") {
    const bonus = getGuildBattleBonus();
    if (bonus && bonus.pet) {
      base = base * (1 + bonus.pet);
    }
  }

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

function runBeastPartyPetAction(rec) {
  let usedSkill = false;

  if (Array.isArray(rec.skills) && rec.skills.length > 0 && Math.random() < PET_SKILL_TRY_RATE) {
    const s = rec.skills[Math.floor(Math.random() * rec.skills.length)];
    if (s && s.id === "powerBite") {
      const base = calcPetRecordDamage(rec);
      const dmg = Math.floor(base * (s.powerRate || 1.6));
      enemyHp = Math.max(0, enemyHp - dmg);
      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPet === "number") {
        currentBattleMaxPet = Math.max(currentBattleMaxPet, dmg);
      }
      appendLog(`${rec.name}の${s.name}！ ${currentEnemy.name}に${dmg}ダメージ！`);
      usedSkill = true;
    } else if (s && s.id === "taunt") {
      appendLog(`${rec.name}の${s.name}！ 敵の注意を引きつけた！`);
      beastPartyTauntTurnRemain = Math.max(beastPartyTauntTurnRemain, 1);
      usedSkill = true;
    } else if (s && s.id === "selfHeal") {
      const heal = Math.floor((rec.hpMax || 1) * (s.healRate || 0.3)) + 3;
      rec.hp = Math.min((rec.hp || 0) + heal, rec.hpMax || heal);
      appendLog(`${rec.name}の${s.name}！ HP が${heal}回復した！`);
      usedSkill = true;
    } else if (s && s.id === "furyStrike") {
      if (Math.random() < (s.missRate || 0.15)) {
        appendLog(`${rec.name}の${s.name}！ しかし外れてしまった…`);
        usedSkill = true;
      } else {
        const base = calcPetRecordDamage(rec);
        const dmg = Math.floor(base * (s.powerRate || 2.2));
        enemyHp = Math.max(0, enemyHp - dmg);
        if (typeof currentBattleMaxDamage === "number") {
          currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
        }
        if (typeof currentBattleMaxPet === "number") {
          currentBattleMaxPet = Math.max(currentBattleMaxPet, dmg);
        }
        appendLog(`${rec.name}の${s.name}！ ${currentEnemy.name}に${dmg}ダメージ！`);
        usedSkill = true;
      }
    } else if (s && s.id === "guardStance") {
      rec.guardRate = (s.defRate || 0.5);
      appendLog(`${rec.name}の${s.name}！ 身構えて防御を固めた！`);
      usedSkill = true;
    }
  }

  if (!usedSkill) {
    let dmg = calcPetRecordDamage(rec);

    let critRate = 0.2;
    if (typeof modifyCritRateForPlayer === "function") {
      critRate = modifyCritRateForPlayer(critRate);
    }

    if (Math.random() < critRate) {
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
      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPet === "number") {
        currentBattleMaxPet = Math.max(currentBattleMaxPet, dmg);
      }
      appendLog(`${rec.name}の渾身の一撃！ ${currentEnemy.name}に${dmg}ダメージ！`);
    } else {
      enemyHp = Math.max(0, enemyHp - dmg);
      if (typeof currentBattleMaxDamage === "number") {
        currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
      }
      if (typeof currentBattleMaxPet === "number") {
        currentBattleMaxPet = Math.max(currentBattleMaxPet, dmg);
      }
      appendLog(`${rec.name}の攻撃！ ${currentEnemy.name}に${dmg}ダメージ`);
    }
  }

  return enemyHp <= 0;
}

function doBeastPartyTurn() {
  if (!currentEnemy) return;
  if (typeof hasCompanion === "function" && !hasCompanion()) return;
  if (typeof getActivePartyRecords !== "function") return;

  const party = getActivePartyRecords(true); // 生存中のみ
  if (party.length === 0) return;

  for (const rec of party) {
    if (enemyHp <= 0) break;
    if (!rec || (rec.hp || 0) <= 0) continue;

    const killed = runBeastPartyPetAction(rec);
    if (killed) {
      enemyHp = 0;
      if (typeof onEnemyKilledForGuild === "function") {
        onEnemyKilledForGuild({ by: "pet", isBoss: !!isBossBattle });
      }
      winBattle(true, "pet");
      return;
    }
  }

  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

function runPetOrPartyTurnForCurrentJob() {
  if (typeof jobHasPetTurn !== "function" || !jobHasPetTurn()) return;
  if (typeof hasCompanion !== "function" || !hasCompanion()) return;

  if (typeof isMultiPetJob === "function" && isMultiPetJob()) {
    doBeastPartyTurn();
  } else if (petHp > 0) {
    doPetTurn();
  }
}

// =======================
// 魔法発動（UI セレクト版）
// =======================

function castMagicFromUI() {
  // 魔法使用可能職：魔法使い(1)、動物使い(2)、呪術師(101)、獣群使い(102)、錬金術師(202)
  if (typeof jobCanUseMagic === "function") {
    if (!jobCanUseMagic()) {
      appendLog("魔法を扱える職業ではない");
      return;
    }
  } else {
    if (jobId !== 1 && jobId !== 2 && jobId !== 101 && jobId !== 102 && jobId !== 202) {
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

  // ビーストヒール／群れの手当て以外は敵必須（セーフブリューは自己回復なので敵不要）
  if (!currentEnemy && skillId !== "beastHeal" && skillId !== "packMend" && skillId !== "safeBrew") {
    appendLog("敵がいない");
    return;
  }

  // プレイヤー行動前の状態異常チェック
  if (typeof beforeActionPlayer === "function") {
    const pre = beforeActionPlayer();
    if (!pre || !pre.canAct) {
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

    if (typeof currentBattleMaxDamage === "number") {
      currentBattleMaxDamage = Math.max(currentBattleMaxDamage, dmg);
    }
    if (typeof currentBattleMaxMagic === "number") {
      currentBattleMaxMagic = Math.max(currentBattleMaxMagic, dmg);
    }

    appendLog(`マナバースト！ ${currentEnemy.name} に${dmg}ダメージ（反動で MP を${extra}消費）`);
    didDamage = true;
  } else if (skillId === "curseStrike") {
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
    }
  } else if (skillId === "darkVeil") {
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
    if (typeof updateDisplay === "function") {
      updateDisplay();
    }
    return;
  }

  if (didDamage) {
    if (enemyHp <= 0) {
      enemyHp = 0;

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

    runPetOrPartyTurnForCurrentJob();
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
    runPetOrPartyTurnForCurrentJob();
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
