// game-core-1.js
// 基本ステータス・装備・所持品管理など

// =======================
// 定数
// =======================

// レベルアップ用経験値ベース（Lv ごとの必要値は addExp/doRebirth 側で利用）
let BASE_EXP_PER_LEVEL = 100;

// ★ 装備耐久（武器・防具共通）
let MAX_DURABILITY = 100;

// ★ ステータス→HP/MP/SP 変換係数（VIT3 で HP+1, INT3 で MP+1, DEX3 で SP+1）
const HP_PER_VIT_POINT = 1 / 3;
const MP_PER_INT_POINT = 1 / 3;
const SP_PER_DEX_POINT = 1 / 3;

// =======================
// 基本ステータス
// =======================

// ★フラグ: 「職業ごとの初期ステ」を既に適用済みかどうか
//   既存セーブ互換のため、window から拾っておく
window.initialJobStatsApplied = window.initialJobStatsApplied || false;
// ※ applyInitialStatsForJob 本体は game-core-2.js 側に統合済み

let level = 1;
let exp = 0;
let expToNext = BASE_EXP_PER_LEVEL;

let rebirthCount = 0;
let growthType = 4; // 0:STR,1:VIT,2:INT,3:LUK,4:バランス,5:DEX

// 能力値（ロード直後は従来どおり全部 1。
// 最初の職業決定時に applyInitialStatsForJob で上書きする想定）
let STR = 1;
let VIT = 1;
let INT_ = 1;
let DEX_ = 1;
let LUK_ = 1;

// HP/MP/SP 基礎値
let hpMaxBase = 30;
let mpMaxBase = 10;
let spMaxBase = 10;

// ★ 初期は Lv1 の最大 HP＝30 に合わせる
let hpMax = 30;
let mpMax = mpMaxBase;
let spMax = spMaxBase;

let hp = 30;
let mp = mpMax;
let sp = spMax;

// 攻撃・防御（最終値は recalcStats で計算）
let atkTotal = 0;
let defTotal = 0;

// 職業
// jobId の正史は jobs.js の JOB_DEFS を参照。
// 0:戦士，1:魔法使い，2:動物使い，100:大盾兵，101:呪術師，102:獣群使い，
// 200:鍛冶職人，201:武具使い，202:錬金術師，203:道具使い，204:料理人，205:貪食家
let jobId = null;
let jobChangedOnce = false;
let everBeastTamer = false;

// ★修正：jobId をグローバルに同步（jobs.js のヘルパーが参照できるよう に）
window.jobId = jobId;

// ペット関連
let petLevel = 1;
let petExp = 0;
let petExpToNext = 5;
let petRebirthCount = 0;

let petHpBase = 10;
let petAtkBase = 4;
let petDefBase = 2; // ★追加：ペット基礎防御

let petHpMax = 10;
let petHp = 10;

// ★ ペット名
let petName = "ペット";

// ペット攻撃倍率（スキルバフで変動）
let petBuffRate = 1.0;

// ペット成長タイプ
let PET_GROWTH_BALANCE = 0;
let PET_GROWTH_TANK    = 1;
let PET_GROWTH_DPS     = 2;
let petGrowthType = PET_GROWTH_BALANCE;

// ペットスキル（game-core-5 などで中身を定義）
let petSkills = [];
let PET_SKILL_TRY_RATE = 0.3;

// お金
let money = 50;

// 星屑など汎用アイテムカウント
window.itemCounts = window.itemCounts || {};
let itemCounts = window.itemCounts;

// =======================
// 装備・所持品
// =======================

let weapons = [];
let armors  = [];
let potions = [];

let weaponCounts = {};
let armorCounts  = {};
let potionCounts = {};

// ★ 1 本ごとのインスタンス（品質/強化/耐久を持たせる）
// location: "warehouse" | "carry" | "equipped"
let weaponInstances = []; // { id, quality, enhance, durability, location, options }
let armorInstances  = [];
// ★ペット装備の実体（petEquipInstances/petEquipCounts）は pet-equip-data.js 側で管理
//   （weaponInstances/armorInstances と同型で、ITEM_META登録も含めてそちらに寄せてある）

// 既存セーブとの整合を取りつつ、必ず配列にしておく
window.weaponInstances = Array.isArray(window.weaponInstances) ? window.weaponInstances : weaponInstances;
window.armorInstances  = Array.isArray(window.armorInstances)  ? window.armorInstances  : armorInstances;

// ローカル変数と window 参照を同期
weaponInstances = window.weaponInstances;
armorInstances  = window.armorInstances;

// ★ どのインスタンスを装備しているか（index で保持）
window.equippedWeaponIndex = (typeof window.equippedWeaponIndex === "number") ? window.equippedWeaponIndex : null;
window.equippedArmorIndex  = (typeof window.equippedArmorIndex  === "number") ? window.equippedArmorIndex  : null;

let equippedWeaponIndex = window.equippedWeaponIndex;
let equippedArmorIndex  = window.equippedArmorIndex;

// =======================
// 素材・中間素材
// =======================
//
// materials の本体定義は materials-core.js 側に移動。
// ここでは window.materials を参照するだけにして、
// 既存コードとの仕様を変えずに依存関係だけ整理する。
let materials = window.materials || {};
window.materials = materials;

// ★ getMatTotal は materials-core.js 側の実装をそのまま使う。
//   ここでは再定義しない。

// 中間素材
// グローバル共有のため window 経由に統一
window.intermediateMats = window.intermediateMats || {};
let intermediateMats = window.intermediateMats;

// =======================
// 採取・クラフト・武器種・防具種スキル
// =======================

window.WEAPON_SKILL_MAX_LV = 100;
window.ARMOR_SKILL_MAX_LV = 100;

window.getWeaponSkillExpToNext = function(lv) {
  if (lv >= (window.WEAPON_SKILL_MAX_LV || 100)) return 0;
  // 草原(0転生Lv100)でLv20〜25、森(10転生)でLv45〜50、洞窟(20転生)でLv60〜65、鉱山(40転生)でLv75〜80、エンドでLv100を目指す美しい多項式曲線
  return Math.floor(10 + lv * 12 + Math.pow(lv, 1.8) * 6);
};

window.getArmorSkillExpToNext = function(lv) {
  if (lv >= (window.ARMOR_SKILL_MAX_LV || 100)) return 0;
  return Math.floor(10 + lv * 12 + Math.pow(lv, 1.8) * 6);
};

window.WEAPON_SKILLS_INIT = {
  dagger:     { lv: 0, exp: 0, expToNext: window.getWeaponSkillExpToNext(0) },
  sword:      { lv: 0, exp: 0, expToNext: window.getWeaponSkillExpToNext(0) },
  greatSword: { lv: 0, exp: 0, expToNext: window.getWeaponSkillExpToNext(0) },
  staff:      { lv: 0, exp: 0, expToNext: window.getWeaponSkillExpToNext(0) },
  runeSword:  { lv: 0, exp: 0, expToNext: window.getWeaponSkillExpToNext(0) },
  shield:     { lv: 0, exp: 0, expToNext: window.getWeaponSkillExpToNext(0) }
};

window.ARMOR_SKILLS_INIT = {
  light:  { lv: 0, exp: 0, expToNext: window.getArmorSkillExpToNext(0) },
  medium: { lv: 0, exp: 0, expToNext: window.getArmorSkillExpToNext(0) },
  heavy:  { lv: 0, exp: 0, expToNext: window.getArmorSkillExpToNext(0) }
};

let gatherSkills = JSON.parse(JSON.stringify(GATHER_SKILLS_INIT));
let craftSkills  = JSON.parse(JSON.stringify(CRAFT_SKILLS_INIT));
let weaponSkills = JSON.parse(JSON.stringify(window.WEAPON_SKILLS_INIT));
let armorSkills  = JSON.parse(JSON.stringify(window.ARMOR_SKILLS_INIT));

window.gatherSkills = gatherSkills;
window.craftSkills  = craftSkills;
window.weaponSkills = weaponSkills;
window.armorSkills  = armorSkills;

// 武器種・防具種判定ヘルパー
function getWeaponTypeFromItemId(itemId) {
  if (!itemId || typeof itemId !== "string") return null;
  if (itemId.includes("dagger")) return "dagger";
  if (itemId.includes("short") || itemId.includes("long")) return "sword";
  if (itemId.includes("great") && !itemId.includes("greatShield")) return "greatSword";
  if (itemId.includes("magicStaff") || itemId.includes("staff")) return "staff";
  if (itemId.includes("runeSword")) return "runeSword";
  if (itemId.includes("greatShield") || itemId.includes("shield")) return "shield";
  return null;
}

function getArmorTypeFromItemId(itemId) {
  if (!itemId || typeof itemId !== "string") return null;
  if (itemId.includes("leatherVest") || itemId.includes("leather")) return "light";
  if (itemId.includes("chainmail") || itemId.includes("chain")) return "medium";
  if (itemId.includes("ironArmor") || itemId.includes("plate") || itemId.includes("iron")) return "heavy";
  return null;
}

function getEquippedWeaponType() {
  const wIdx = (typeof window !== "undefined" && typeof window.equippedWeaponIndex === "number")
    ? window.equippedWeaponIndex
    : (typeof equippedWeaponIndex === "number" ? equippedWeaponIndex : null);
  const wInsts = (typeof window !== "undefined" && Array.isArray(window.weaponInstances))
    ? window.weaponInstances
    : (typeof weaponInstances !== "undefined" ? weaponInstances : []);
  if (wIdx != null && wInsts && wInsts[wIdx]) {
    return getWeaponTypeFromItemId(wInsts[wIdx].id);
  }
  return null;
}

function getEquippedArmorType() {
  const aIdx = (typeof window !== "undefined" && typeof window.equippedArmorIndex === "number")
    ? window.equippedArmorIndex
    : (typeof equippedArmorIndex === "number" ? equippedArmorIndex : null);
  const aInsts = (typeof window !== "undefined" && Array.isArray(window.armorInstances))
    ? window.armorInstances
    : (typeof armorInstances !== "undefined" ? armorInstances : []);
  if (aIdx != null && aInsts && aInsts[aIdx]) {
    return getArmorTypeFromItemId(aInsts[aIdx].id);
  }
  return null;
}

window.getWeaponTypeFromItemId = getWeaponTypeFromItemId;
window.getArmorTypeFromItemId = getArmorTypeFromItemId;
window.getEquippedWeaponType = getEquippedWeaponType;
window.getEquippedArmorType = getEquippedArmorType;

// 武器・防具スキル経験値加算ヘルパー
function addWeaponSkillExp(type, amount = 1) {
  const ws = (typeof window !== "undefined" && window.weaponSkills) ? window.weaponSkills : weaponSkills;
  if (!type || !ws || !ws[type]) return;
  const s = ws[type];
  s.exp = (s.exp || 0) + amount;
  const maxLv = (typeof window !== "undefined" && window.WEAPON_SKILL_MAX_LV) ? window.WEAPON_SKILL_MAX_LV : 100;
  let leveledUp = false;
  if (!s.expToNext || s.expToNext <= 0) {
    s.expToNext = (typeof window.getWeaponSkillExpToNext === "function") ? window.getWeaponSkillExpToNext(s.lv) : 10;
  }
  while (s.exp >= s.expToNext && s.lv < maxLv) {
    s.exp -= s.expToNext;
    s.lv++;
    s.expToNext = (typeof window.getWeaponSkillExpToNext === "function") ? window.getWeaponSkillExpToNext(s.lv) : (s.expToNext + 15);
    leveledUp = true;

    const names = {
      dagger: "短剣",
      sword: "片手剣",
      greatSword: "大剣",
      staff: "杖",
      runeSword: "魔剣",
      shield: "盾"
    };
    const label = names[type] || type;
    if (typeof appendLog === "function") {
      appendLog(`${label}スキルがLv${s.lv}になった！`);
    }
  }
  if (leveledUp) {
    if (typeof recalcStats === "function") recalcStats();
    if (typeof updateStatusUI === "function") updateStatusUI();
  }
}

function addArmorSkillExp(type, amount = 1) {
  const as = (typeof window !== "undefined" && window.armorSkills) ? window.armorSkills : armorSkills;
  if (!type || !as || !as[type]) return;
  const s = as[type];
  s.exp = (s.exp || 0) + amount;
  const maxLv = (typeof window !== "undefined" && window.ARMOR_SKILL_MAX_LV) ? window.ARMOR_SKILL_MAX_LV : 100;
  let leveledUp = false;
  if (!s.expToNext || s.expToNext <= 0) {
    s.expToNext = (typeof window.getArmorSkillExpToNext === "function") ? window.getArmorSkillExpToNext(s.lv) : 10;
  }
  while (s.exp >= s.expToNext && s.lv < maxLv) {
    s.exp -= s.expToNext;
    s.lv++;
    s.expToNext = (typeof window.getArmorSkillExpToNext === "function") ? window.getArmorSkillExpToNext(s.lv) : (s.expToNext + 15);
    leveledUp = true;

    const names = {
      light: "軽装",
      medium: "中装",
      heavy: "重装"
    };
    const label = names[type] || type;
    if (typeof appendLog === "function") {
      appendLog(`${label}防具スキルがLv${s.lv}になった！`);
    }
  }
  if (leveledUp) {
    if (typeof recalcStats === "function") recalcStats();
    if (typeof updateStatusUI === "function") updateStatusUI();
  }
}

window.addWeaponSkillExp = addWeaponSkillExp;
window.addArmorSkillExp  = addArmorSkillExp;

// 攻撃系 / 防御系（回復含む）スキルの判定と経験値付与
function isOffensiveSkill(skillId) {
  if (!skillId || typeof skillId !== "string") return false;
  const offensiveList = [
    // 物理攻撃スキル
    "powerSlash", "shieldBlow", "guardImpact", "beastSlash", "greatshieldSmash",
    "armorCrush", "consecutiveStrike", "packSlash", "sandToss", "overseerStrike",
    "hunterSnare", "vitalStrike", "harpoonThrust", "castNet", "earthTiller",
    "spiceBlind", "hungerBurst", "digestDrain",
    // 攻撃魔法
    "fireBolt", "iceLance", "chainLightning", "manaBurst",
    "curseStrike", "witherHex", "darkVeil", "ruinCurse"
  ];
  return offensiveList.includes(skillId);
}

function isDefensiveOrHealSkill(skillId) {
  if (!skillId || typeof skillId !== "string") return false;
  const defHealList = [
    // 防御・強化・構えバフ
    "braveCharge", "animalLink", "beastRoar", "greatshieldCounter", "greatshieldFortify",
    "greatshieldGuardStance", "whetstoneSharpen", "parryCounter", "potionBoost",
    "itemBoost", "packRally", "packFrenzy", "wildHerbPoultice", "interceptFormation",
    "harvestBlessing", "nourishingSoup",
    // 回復・保護魔法
    "beastHeal", "safeBrew", "packMend"
  ];
  return defHealList.includes(skillId);
}

function handleSkillExpOnUse(skillId) {
  if (!skillId) return;
  const wType = (typeof getEquippedWeaponType === "function") ? getEquippedWeaponType() : null;
  const aType = (typeof getEquippedArmorType === "function") ? getEquippedArmorType() : null;

  if (isOffensiveSkill(skillId)) {
    // 攻撃系スキル: 武器スキルEXP加算
    if (wType && typeof addWeaponSkillExp === "function") {
      addWeaponSkillExp(wType, 1);
    }
  } else if (isDefensiveOrHealSkill(skillId)) {
    // 防御・回復系スキル: 防具スキルEXP加算
    if (aType && typeof addArmorSkillExp === "function") {
      addArmorSkillExp(aType, 1);
    }
    // 盾を装備している場合は盾スキルEXPも加算
    if (wType === "shield" && typeof addWeaponSkillExp === "function") {
      addWeaponSkillExp("shield", 1);
    }
  } else {
    // フォールバック
    if (wType && typeof addWeaponSkillExp === "function") {
      addWeaponSkillExp(wType, 1);
    }
  }
}

window.isOffensiveSkill = isOffensiveSkill;
window.isDefensiveOrHealSkill = isDefensiveOrHealSkill;
window.handleSkillExpOnUse = handleSkillExpOnUse;

// =======================
// 探索・戦闘
// =======================

let exploringArea = null;  // "field","forest","cave","mine"
let isExploring   = false;

let currentEnemy   = null;
let enemyHp        = 0;
let enemyHpMax     = 0;
let isBossBattle   = false;
let escapeFailBonus = 0;

// エリア別ボス撃破フラグ
let areaBossCleared = {
  field:  false,
  forest: false,
  cave:   false,
  mine:   false
};

// =======================
// 共通ユーティリティ
// =======================

function getGrowthTypeName() {
  switch (growthType) {
    case 0: return "STR 型";
    case 1: return "VIT 型";
    case 2: return "INT 型";
    case 3: return "LUK 型";
    case 4: return "バランス型";
    case 5: default: return "DEX 型";
  }
}

/**
 * 職業名を返す。
 * jobs.js 側の getJobNameFromId を使う（フォールバックなし）。
 * jobs.js は必ず先に読み込まれる想定。
 */
function getJobName() {
  // ★職業未選択（null/undefined）の場合は「未選択」と表示する
  //   これにより、初期起動時に「未知の職業」と出るのを防ぐ。
  if (jobId == null) return "未選択";
  return getJobNameFromId(jobId);
}

// =======================
// ステータス再計算
// =======================

function recalcStats() {
  // ローカルと window の equippedIndex を同期
  if (typeof window.equippedWeaponIndex === "number" || window.equippedWeaponIndex === null) {
    equippedWeaponIndex = window.equippedWeaponIndex;
  }
  if (typeof window.equippedArmorIndex === "number" || window.equippedArmorIndex === null) {
    equippedArmorIndex = window.equippedArmorIndex;
  }

  // ★スキルツリーボーナスを取得（なければ 0 扱い）
  let skillBonus = null;
  if (typeof getGlobalSkillTreeBonus === "function") {
    skillBonus = getGlobalSkillTreeBonus() || {};
  } else {
    skillBonus = {};
  }
  const hpMaxRate   = skillBonus.hpMaxRate   || 0; // 最大 HP+%
  const mpMaxRate   = skillBonus.mpMaxRate   || 0; // 最大 MP+%
  const spMaxRate   = skillBonus.spMaxRate   || 0; // 最大 SP+%
  const atkRate     = skillBonus.atkRate     || 0; // 物理攻撃+%
  const defRate     = skillBonus.defRate     || 0; // 防御+%

  // ★ 職業ボーナスを取得（なければ 0 扱い）
  // ★修正：jobId == null の時も安全に処理（throw しない）
  let jobBonus = {};
  if (typeof getJobBonuses === "function") {
    if (jobId != null) {
      jobBonus = getJobBonuses(jobId) || {};
    }
    // else: jobId == null の場合は職業未選択 → ボーナス 0
  }
  const jobHpMaxRate = jobBonus.hpMaxRate || 0;
  const jobMpMaxRate = jobBonus.mpMaxRate || 0;
  const jobAtkRate   = jobBonus.atkRate   || 0;
  const jobDefRate   = jobBonus.defRate   || 0;
  // （将来 magicAtkRate などを使うならここで拾う）

  // ★ 接頭語・その他オプション由来の補正をまとめるオブジェクト
  const prefixMods = {
    // 基礎ステ%補正（STR/VIT/INT/DEX/LUK の素値に掛ける）
    strPct: 0,
    vitPct: 0,
    intPct: 0,
    dexPct: 0,
    lukPct: 0,

    // 最終値系%補正（必要に応じて使用）
    atkPct: 0,
    defPct: 0,
    hpPct:  0,
    mpPct:  0,
    spPct:  0
  };

  // オプション 1 つ分を prefixMods に合算するヘルパー
  function addOptionToMods(opt, mods) {
    if (!opt || !mods) return;
    Object.keys(opt).forEach(k => {
      const v = opt[k];
      if (typeof v !== "number") return;
      if (Object.prototype.hasOwnProperty.call(mods, k)) {
        mods[k] += v;
      }
    });
  }

  // 装備インスタンスから options を mods に流し込むヘルパー
  function applyInstanceOptions(inst, mods) {
    if (!inst || !Array.isArray(inst.options)) return;
    inst.options.forEach(opt => {
      addOptionToMods(opt, mods);
    });
  }

  // ★ まず「素の最大値」を基礎値から毎回作り直す（空腹・水分デバフはここではまだ掛けない）
  let baseHpMax = hpMaxBase;
  let baseMpMax = mpMaxBase;
  let baseSpMax = spMaxBase;

  // ==========
  // 素のステータスを接頭語で補正
  // ==========

  // 元の素ステ
  let baseSTR = STR;
  let baseVIT = VIT;
  let baseINT = INT_;
  let baseDEX = DEX_;
  let baseLUK = LUK_;

  // ここで一旦、装備 options から prefixMods を集計するために、
  // 武器・防具インスタンスを先に見る（装備性能計算と並行して行う）。

  // 基本攻撃・防御（補正後ステで再計算するため、ここでは 0 で初期化して後で上書き）
  let baseAtk = 0;
  let baseDef = 0;

  let weaponAtk = 0;
  let weaponScaleStr = 0;
  let weaponScaleInt = 0;
  let weaponEnhance = 0;
  let weaponQuality = 0;   // 品質（0:通常，1:良品，2:傑作）

  let armorDef = 0;
  let armorScaleVit = 0;
  let armorBonusDex = 0;
  let armorEnhance = 0;
  let armorQuality = 0;

  // ★ 固定値%（武器・防具）用の変数
  let weaponAtkFixedPct = 0;
  let armorDefFixedPct  = 0;
  let armorHpFixedPct   = 0;

  // ★ 武器は「装備中インスタンス」を見る
  if (equippedWeaponIndex != null && Array.isArray(weaponInstances)) {
    let inst = weaponInstances[equippedWeaponIndex];
    if (inst) {
      let w = weapons.find(x => x.id === inst.id);
      if (w) {
        weaponAtk       = w.atk || 0;
        weaponScaleStr  = w.scaleStr || 0;
        weaponScaleInt  = w.scaleInt || 0;
        weaponEnhance   = (inst.enhance != null ? inst.enhance : (w.enhance || 0));
        weaponQuality   = inst.quality || 0;

        // ★追加: 武器メタから固定ATK%を取得（なくても0）
        weaponAtkFixedPct = (typeof w.atkPctFixed === "number") ? w.atkPctFixed : 0;

        // 接頭語オプションを集計
        applyInstanceOptions(inst, prefixMods);
      }
    }
  }

  // ★ 防具も同様にインスタンスのみ
  if (equippedArmorIndex != null && Array.isArray(armorInstances)) {
    let inst = armorInstances[equippedArmorIndex];
    if (inst) {
      let a = armors.find(x => x.id === inst.id);
      if (a) {
        armorDef       = a.def || 0;
        armorScaleVit  = a.scaleVit || 0;
        armorBonusDex  = a.bonusDex || 0;
        armorEnhance   = (inst.enhance != null ? inst.enhance : (a.enhance || 0));
        armorQuality   = inst.quality || 0;

        // ★追加: 防具メタから固定DEF%/固定HP%を取得（なくても0）
        armorDefFixedPct = (typeof a.defPctFixed === "number") ? a.defPctFixed : 0;
        armorHpFixedPct  = (typeof a.hpPctFixed  === "number") ? a.hpPctFixed  : 0;

        // 接頭語オプションを集計
        applyInstanceOptions(inst, prefixMods);
      }
    }
  }

  // ★ 武器・防具種別スキルボーナスの計算（装備中のみ恩恵を適用）
  const eqWType = getEquippedWeaponType();
  const eqAType = getEquippedArmorType();

  const ws = (typeof window !== "undefined" && window.weaponSkills) ? window.weaponSkills : weaponSkills;
  const as = (typeof window !== "undefined" && window.armorSkills) ? window.armorSkills : armorSkills;

  let weaponSkillBonus = {
    str: 0,
    int: 0,
    vit: 0,
    dex: 0,
    atk: 0,
    def: 0,
    mpMax: 0,
    critRate: 0,
    critMult: 0,
    hitRate: 0,
    evaRate: 0,
    guardRate: 0,
    guardReduce: 0,
    physSkillRate: 0,
    magicSkillRate: 0
  };

  if (eqWType && ws && ws[eqWType]) {
    const lv = ws[eqWType].lv || 0;
    if (lv > 0) {
      if (eqWType === "dagger") {
        weaponSkillBonus.atk += Math.floor(lv * 1.0);
        weaponSkillBonus.critRate += lv * 0.003;
        weaponSkillBonus.hitRate += lv * 0.002;
        weaponSkillBonus.dex += Math.floor(lv / 5);
        weaponSkillBonus.evaRate += lv * 0.002;
      } else if (eqWType === "sword") {
        weaponSkillBonus.atk += Math.floor(lv * 1.5);
        weaponSkillBonus.physSkillRate += lv * 0.004;
        weaponSkillBonus.hitRate += lv * 0.003;
        weaponSkillBonus.str += Math.floor(lv / 5);
      } else if (eqWType === "greatSword") {
        weaponSkillBonus.atk += Math.floor(lv * 2.5);
        weaponSkillBonus.critMult += lv * 0.008;
        weaponSkillBonus.str += Math.floor(lv / 4);
      } else if (eqWType === "staff") {
        weaponSkillBonus.atk += Math.floor(lv * 0.5);
        weaponSkillBonus.magicSkillRate += lv * 0.006;
        weaponSkillBonus.mpMax += lv * 2;
        weaponSkillBonus.int += Math.floor(lv / 4);
      } else if (eqWType === "runeSword") {
        weaponSkillBonus.atk += Math.floor(lv * 1.2);
        weaponSkillBonus.physSkillRate += lv * 0.003;
        weaponSkillBonus.magicSkillRate += lv * 0.003;
        weaponSkillBonus.str += Math.floor(lv / 5);
        weaponSkillBonus.int += Math.floor(lv / 5);
      } else if (eqWType === "shield") {
        weaponSkillBonus.def += Math.floor(lv * 2.0);
        weaponSkillBonus.guardRate += lv * 0.003;
        weaponSkillBonus.guardReduce += lv * 0.003;
        weaponSkillBonus.vit += Math.floor(lv / 4);
      }
    }
  }

  let armorSkillBonus = {
    str: 0,
    int: 0,
    vit: 0,
    dex: 0,
    def: 0,
    hpMax: 0,
    spMax: 0,
    evaRate: 0,
    damageReduce: 0
  };

  if (eqAType && as && as[eqAType]) {
    const lv = as[eqAType].lv || 0;
    if (lv > 0) {
      if (eqAType === "light") {
        armorSkillBonus.evaRate += lv * 0.003;
        armorSkillBonus.spMax += lv * 2;
        armorSkillBonus.dex += Math.floor(lv / 4);
      } else if (eqAType === "medium") {
        armorSkillBonus.def += Math.floor(lv * 1.5);
        armorSkillBonus.hpMax += lv * 3;
        armorSkillBonus.spMax += lv * 1;
        armorSkillBonus.vit += Math.floor(lv / 5);
        armorSkillBonus.dex += Math.floor(lv / 5);
      } else if (eqAType === "heavy") {
        armorSkillBonus.def += Math.floor(lv * 3.0);
        armorSkillBonus.hpMax += lv * 5;
        armorSkillBonus.vit += Math.floor(lv / 3);
        armorSkillBonus.damageReduce += lv * 0.0015;
      }
    }
  }

  if (typeof window !== "undefined") {
    window.equippedWeaponSkillBonus = weaponSkillBonus;
    window.equippedArmorSkillBonus = armorSkillBonus;
  }

  // ★ 接頭語による基礎ステ%補正を適用（素のステに対して）
  let effSTR = baseSTR + weaponSkillBonus.str + armorSkillBonus.str;
  let effVIT = baseVIT + weaponSkillBonus.vit + armorSkillBonus.vit;
  let effINT = baseINT + weaponSkillBonus.int + armorSkillBonus.int;
  // ★修正: 防具のbonusDex（armorBonusDex）が集計だけされて一度も加算されていなかったバグを修正
  let effDEX = baseDEX + armorBonusDex + weaponSkillBonus.dex + armorSkillBonus.dex;
  let effLUK = baseLUK;

  if (prefixMods.strPct) {
    effSTR = Math.floor(effSTR * (1 + prefixMods.strPct));
  }
  if (prefixMods.vitPct) {
    effVIT = Math.floor(effVIT * (1 + prefixMods.vitPct));
  }
  if (prefixMods.intPct) {
    effINT = Math.floor(effINT * (1 + prefixMods.intPct));
  }
  if (prefixMods.dexPct) {
    effDEX = Math.floor(effDEX * (1 + prefixMods.dexPct));
  }
  if (prefixMods.lukPct) {
    effLUK = Math.floor(effLUK * (1 + prefixMods.lukPct));
  }

  // 以降の計算では effSTR/effVIT/effINT/effDEX/effLUK を使う
  // （表示用のステータスパネルは、現状どおり素の STR/VIT/INT_/DEX_/LUK_ をそのまま出している）

  // ★ 接頭語・ステ補正後の実効ステータスを外部から参照できるように公開
  if (typeof window !== "undefined") {
    window.effSTR = effSTR;
    window.effVIT = effVIT;
    window.effINT = effINT;
    window.effDEX = effDEX;
    window.effLUK = effLUK;
  }

  // ==========
  // 攻撃・防御の元になる値を計算
  // ==========

  // 基本攻撃・防御（補正後ステから）
  baseAtk = effSTR + Math.floor(level * 0.5);
  baseDef = effVIT + Math.floor(level * 0.5);

  // 強化補正（1 段階あたり +5% 想定）
  let WEAPON_ENH_RATE   = 0.05;
  let ARMOR_ENH_RATE    = 0.05;

  // 品質補正（良品 10% / 傑作 20%）
  let QUALITY_GOOD_RATE = 0.10; // quality=1
  let QUALITY_EX_RATE   = 0.20; // quality=2

  let weaponEnhRate = 1 + weaponEnhance * WEAPON_ENH_RATE;
  let armorEnhRate  = 1 + armorEnhance * ARMOR_ENH_RATE;

  let weaponQualityRate = 1.0;
  if (weaponQuality === 1) weaponQualityRate += QUALITY_GOOD_RATE;
  else if (weaponQuality === 2) weaponQualityRate += QUALITY_EX_RATE;

  let armorQualityRate = 1.0;
  if (armorQuality === 1) armorQualityRate += QUALITY_GOOD_RATE;
  else if (armorQuality === 2) armorQualityRate += QUALITY_EX_RATE;

  // ★品質・強化まで反映した武器・防具の基礎値（＋装備中スキルレベル恩恵）
  let enhancedWeaponAtk = Math.floor(weaponAtk * weaponEnhRate * weaponQualityRate) + weaponSkillBonus.atk;
  let enhancedArmorDef  = Math.floor(armorDef * armorEnhRate  * armorQualityRate) + weaponSkillBonus.def + armorSkillBonus.def;

  // ステータス由来の攻撃
  let atkFromStr = Math.floor(effSTR * 0.5);
  let atkFromWeaponStr = Math.floor(effSTR * weaponScaleStr);
  let atkFromWeaponInt = Math.floor(effINT * weaponScaleInt);

  // ステータス由来の防御
  let defFromVit = Math.floor(effVIT * 0.7);
  let defFromArmorVit = Math.floor(effVIT * armorScaleVit);

  // ===== 空腹・水分デバフ反映（攻撃・防御） =====
  if (typeof hungerAtkIntRate === "number") {
    atkFromStr       = Math.floor(atkFromStr       * hungerAtkIntRate);
    atkFromWeaponStr = Math.floor(atkFromWeaponStr * hungerAtkIntRate);
    atkFromWeaponInt = Math.floor(atkFromWeaponInt * hungerAtkIntRate);
  }

  if (typeof thirstDefDexLukRate === "number") {
    defFromVit      = Math.floor(defFromVit      * thirstDefDexLukRate);
    defFromArmorVit = Math.floor(defFromArmorVit * thirstDefDexLukRate);
  }

  // ===== ステータス→最大 HP/MP/SP への追加分を反映（補正後ステを使用） =====
  const hpFromVit = Math.floor(effVIT * HP_PER_VIT_POINT);
  const mpFromInt = Math.floor(effINT * MP_PER_INT_POINT);
  const spFromDex = Math.floor(effDEX * SP_PER_DEX_POINT);

  baseHpMax += hpFromVit + armorSkillBonus.hpMax;
  baseMpMax += mpFromInt + weaponSkillBonus.mpMax;
  baseSpMax += spFromDex + armorSkillBonus.spMax;

  // ===== スキルツリーの最大値ボーナスを反映 =====
  if (hpMaxRate !== 0) {
    baseHpMax = Math.floor(baseHpMax * (1 + hpMaxRate));
  }
  if (mpMaxRate !== 0) {
    baseMpMax = Math.floor(baseMpMax * (1 + mpMaxRate));
  }
  if (spMaxRate !== 0) {
    baseSpMax = Math.floor(baseSpMax * (1 + spMaxRate));
  }

  // ★ 職業ボーナスの最大値ボーナスを反映
  if (jobHpMaxRate !== 0) {
    baseHpMax = Math.floor(baseHpMax * (1 + jobHpMaxRate));
  }
  if (jobMpMaxRate !== 0) {
    baseMpMax = Math.floor(baseMpMax * (1 + jobMpMaxRate));
  }
  // （SP に対するジョブボーナスが必要になったらここに追加）

  // ===== 接頭語による最大値ボーナス（hpPct/mpPct/spPct） =====
  if (prefixMods.hpPct) {
    baseHpMax = Math.floor(baseHpMax * (1 + prefixMods.hpPct));
  }
  if (prefixMods.mpPct) {
    baseMpMax = Math.floor(baseMpMax * (1 + prefixMods.mpPct));
  }
  if (prefixMods.spPct) {
    baseSpMax = Math.floor(baseSpMax * (1 + prefixMods.spPct));
  }

  // ★ 防具固有の固定HP%（必要ならここでまとめて反映）
  if (armorHpFixedPct) {
    baseHpMax = Math.floor(baseHpMax * (1 + armorHpFixedPct));
  }

  // ===== 空腹・水分デバフ反映（最大 HP/MP/SP） =====
  if (typeof hungerHpRate === "number") {
    hpMax = Math.floor(baseHpMax * hungerHpRate);
  } else {
    hpMax = baseHpMax;
  }
  if (typeof thirstMpSpRate === "number") {
    mpMax = Math.floor(baseMpMax * thirstMpSpRate);
    spMax = Math.floor(baseSpMax * thirstMpSpRate);
  } else {
    mpMax = baseMpMax;
    spMax = baseSpMax;
  }

  if (hpMax < 1) hpMax = 1;
  if (mpMax < 1) mpMax = 1;
  if (spMax < 1) spMax = 1;

  // 現在値を丸め込み（最大値が増減した場合でもはみ出さないように）
  hp = Math.min(hp, hpMax);
  mp = Math.min(mp, mpMax);
  sp = Math.min(sp, spMax);

  // ==== 最終攻撃・防御値を計算 ====

  // 品質・強化・ステ・スケールまで反映した「乗算前の基礎ATK/DEF」
  let rawAtkBase =
    baseAtk +
    enhancedWeaponAtk +
    atkFromStr +
    atkFromWeaponStr +
    atkFromWeaponInt;

  let rawDefBase =
    baseDef +
    enhancedArmorDef +
    defFromVit +
    defFromArmorVit;

  // ★ ATK%枠の合算（武器固定%＋接頭語%＋スキルツリー%＋職業%）
  let atkPctTotal = 0;

  if (weaponAtkFixedPct) {
    atkPctTotal += weaponAtkFixedPct;
  }
  if (prefixMods.atkPct) {
    atkPctTotal += prefixMods.atkPct;
  }
  if (atkRate) {
    atkPctTotal += atkRate;
  }
  if (jobAtkRate) {
    atkPctTotal += jobAtkRate;
  }

  let rawAtkTotal = rawAtkBase;
  if (atkPctTotal !== 0) {
    rawAtkTotal = Math.floor(rawAtkBase * (1 + atkPctTotal));
  }

  // ★ DEF%枠の合算（防具固定%＋接頭語%＋スキルツリー%＋職業%）
  let defPctTotal = 0;

  if (armorDefFixedPct) {
    defPctTotal += armorDefFixedPct;
  }
  if (prefixMods.defPct) {
    defPctTotal += prefixMods.defPct;
  }
  if (defRate) {
    defPctTotal += defRate;
  }
  if (jobDefRate) {
    defPctTotal += jobDefRate;
  }

  let rawDefTotal = rawDefBase;
  if (defPctTotal !== 0) {
    rawDefTotal = Math.floor(rawDefBase * (1 + defPctTotal));
  }

  atkTotal = rawAtkTotal;
  defTotal = rawDefTotal;

  // ★ここからペットの最大 HP 再計算（特性補正込み）
  // petHpBase / petRebirthCount を元に毎回再計算する想定
  if (typeof applyCompanionPetRates === "function") {
    const r = applyCompanionPetRates(petHpBase, petAtkBase, petDefBase);
    petHpMax = r.hp + petRebirthCount * 3;
  } else {
    petHpMax = petHpBase + petRebirthCount * 3;
  }
  // ★修正: 死んでいた job.petHpMaxRate を接続
  if (typeof getPetHpMaxRateMultiplier === "function") {
    petHpMax = Math.floor(petHpMax * (1 + getPetHpMaxRateMultiplier()));
  }
  if (petHpMax < 1) petHpMax = 1;

  // 現在のペット HP が未初期化（0 以下）の場合のみ、最大値に合わせておく
  if (petHp <= 0) {
    petHp = petHpMax;
  } else {
    petHp = Math.min(petHp, petHpMax);
  }
  // ★ここまでペット HP 計算

  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

// =======================
// 初期化
// =======================

function initWeaponsAndArmors() {
  weapons = JSON.parse(JSON.stringify(WEAPONS_INIT));
  armors  = JSON.parse(JSON.stringify(ARMORS_INIT));
  potions = JSON.parse(JSON.stringify(POTIONS_INIT));

  weaponCounts = {};
  armorCounts  = {};
  potionCounts = {};

  weapons.forEach(w => weaponCounts[w.id] = 0);
  armors.forEach(a  => armorCounts[a.id]  = 0);
  potions.forEach(p => potionCounts[p.id] = 0);

  // インスタンス配列もリセット（window 参照と同期）
  weaponInstances.length = 0;
  armorInstances.length  = 0;
  window.weaponInstances = weaponInstances;
  window.armorInstances  = armorInstances;
  // ★ペット装備インスタンスもリセット（実体は pet-equip-data.js 側）
  if (Array.isArray(window.petEquipInstances)) window.petEquipInstances.length = 0;
  window.petEquipCounts = {};

  equippedWeaponIndex = null;
  equippedArmorIndex  = null;
  window.equippedWeaponIndex = null;
  window.equippedArmorIndex = null;
}

function initIntermediateMats() {
  window.intermediateMats = {};
  intermediateMats = window.intermediateMats;

  if (Array.isArray(INTERMEDIATE_MATERIALS)) {
    INTERMEDIATE_MATERIALS.forEach(m => {
      intermediateMats[m.id] = 0;
    });
  }
}

function initGame() {
  initWeaponsAndArmors();
  initIntermediateMats();

  gatherSkills = JSON.parse(JSON.stringify(GATHER_SKILLS_INIT));
  craftSkills  = JSON.parse(JSON.stringify(CRAFT_SKILLS_INIT));
  weaponSkills = JSON.parse(JSON.stringify(window.WEAPON_SKILLS_INIT || {}));
  armorSkills  = JSON.parse(JSON.stringify(window.ARMOR_SKILLS_INIT || {}));
  window.gatherSkills = gatherSkills;
  window.craftSkills  = craftSkills;
  window.weaponSkills = weaponSkills;
  window.armorSkills  = armorSkills;

  exploringArea = null;
  isExploring   = false;

  areaBossCleared = {
    field:  false,
    forest: false,
    cave:   false,
    mine:   false
  };

  currentEnemy = null;
  enemyHp      = 0;
  enemyHpMax   = 0;
  isBossBattle = false;

  expToNext = BASE_EXP_PER_LEVEL;

  // ★ jobId が JOB_DEFS に存在しない場合は、安全な職に補正（例：戦士）
  if (typeof getJobDefById === "function" && jobId != null && !getJobDefById(jobId)) {
    jobId = 0;
    // ★修正：同步も更新
    window.jobId = jobId;
  }

  // ★ペット最大 HP を再計算したあと、初期ゲーム開始時だけ HP を最大にしておく
  recalcStats();
  petHp = petHpMax;
}

// =======================
// 素材表示ヘルパー
// =======================

function updateMaterialDetailTexts() {
  // 何もしない（従来の UI 更新は game-ui.js 側に委譲）
}

// =======================
// 表示更新
// =======================

function updateDisplay() {
  // HP/MP/SP バー
  let hpBarFill = document.getElementById("hpBarFill");
  let hpBarText = document.getElementById("hpBarText");
  let mpBarFill = document.getElementById("mpBarFill");
  let mpBarText = document.getElementById("mpBarText");
  let spBarFill = document.getElementById("spBarFill");
  let spBarText = document.getElementById("spBarText");

  if (hpBarFill && hpBarText) {
    let ratio = hpMax > 0 ? (hp / hpMax) : 0;
    hpBarFill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    hpBarText.textContent = `${hp} / ${hpMax}`;
  }
  if (mpBarFill && mpBarText) {
    let ratio = mpMax > 0 ? (mp / mpMax) : 0;
    mpBarFill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    mpBarText.textContent = `${mp} / ${mpMax}`;
  }
  if (spBarFill && spBarText) {
    let ratio = spMax > 0 ? (sp / spMax) : 0;
    spBarFill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    spBarText.textContent = `${sp} / ${spMax}`;
  }

  // 所持金
  let moneyEl = document.getElementById("money");
  let shopGoldEl = document.getElementById("shopGoldDisplay");
  if (moneyEl) moneyEl.textContent = money;
  if (shopGoldEl) shopGoldEl.textContent = money;

  // ステータスページ
  let stLevelEl = document.getElementById("stLevel");
  let stExpEl   = document.getElementById("stExp");
  let stExpNext = document.getElementById("stExpToNext");
  let stRebirth = document.getElementById("stRebirthCount");
  let stGrowth  = document.getElementById("stGrowthType");
  let stJobName = document.getElementById("stJobName");

  if (stLevelEl) stLevelEl.textContent = level;
  if (stExpEl)   stExpEl.textContent   = exp;
  if (stExpNext) stExpNext.textContent = expToNext;
  if (stRebirth) stRebirth.textContent = rebirthCount;
  if (stGrowth)  stGrowth.textContent  = getGrowthTypeName();
  if (stJobName) stJobName.textContent = getJobName();

  let stSTR = document.getElementById("stSTR");
  let stVIT = document.getElementById("stVIT");
  let stINT = document.getElementById("stINT");
  let stDEX = document.getElementById("stDEX");
  let stLUK = document.getElementById("stLUK");

  if (stSTR) stSTR.textContent = STR;
  if (stVIT) stVIT.textContent = VIT;
  if (stINT) stINT.textContent = INT_;
  if (stDEX) stDEX.textContent = DEX_;
  if (stLUK) stLUK.textContent = LUK_;

  let stAtkTotal = document.getElementById("stAtkTotal");
  let stDefTotal = document.getElementById("stDefTotal");
  let stHpMax    = document.getElementById("stHpMax");
  let stMpMax    = document.getElementById("stMpMax");
  let stSpMax    = document.getElementById("stSpMax");

  if (stAtkTotal) stAtkTotal.textContent = atkTotal;
  if (stDefTotal) stDefTotal.textContent = defTotal;
  if (stHpMax)    stHpMax.textContent    = hpMax;
  if (stMpMax)    stMpMax.textContent    = mpMax;
  if (stSpMax)    stSpMax.textContent    = spMax;

  // 詳細パネル
  let jobNameEl = document.getElementById("jobName");
  let eqWpnName = document.getElementById("equippedWeaponName");
  let eqArmName = document.getElementById("equippedArmorName");
  let atkTotalEl= document.getElementById("atkTotal");
  let defTotalEl= document.getElementById("defTotal");  // ★ここを修正

  if (jobNameEl) jobNameEl.textContent = getJobName();

  if (eqWpnName) {
    let nameText = "なし";
    if (equippedWeaponIndex != null && Array.isArray(weaponInstances)) {
      let inst = weaponInstances[equippedWeaponIndex];
      if (inst) {
        let w = weapons.find(x => x.id === inst.id);
        if (w) nameText = w.name;
      }
    }
    eqWpnName.textContent = nameText;
  }

  if (eqArmName) {
    let nameText = "なし";
    if (equippedArmorIndex != null && Array.isArray(armorInstances)) {
      let inst = armorInstances[equippedArmorIndex];
      if (inst) {
        let a = armors.find(x => x.id === inst.id);
        if (a) nameText = a.name;
      }
    }
    eqArmName.textContent = nameText;
  }

  if (atkTotalEl) atkTotalEl.textContent = atkTotal;
  if (defTotalEl) defTotalEl.textContent = defTotal;

  // ペット表示（メインパネル）
  let petInfoBox = document.getElementById("petInfo");
  let petLevelEl = document.getElementById("petLevel");
  let petHpEl    = document.getElementById("petHp");
  let petHpMaxEl = document.getElementById("petHpMax");

  // ★修正：ペット UI 判定を 1 箇所に統一（shouldShowPetUI）
  function shouldShowPetUI() {
    if (typeof jobShowsPetUI === "function") {
      return jobShowsPetUI() && !!window.companionTypeId;
    }
    if (typeof jobHasPetTurn === "function") {
      return jobHasPetTurn() && !!window.companionTypeId;
    }
    if (typeof isBeastTamer === "function") {
      return isBeastTamer() && !!window.companionTypeId;
    }
    return (jobId === 2) && !!window.companionTypeId;
  }

  const hasPet = shouldShowPetUI();
  const isPetJob = shouldShowPetUI();

  if (petInfoBox) {
    petInfoBox.style.display = hasPet ? "" : "none";
  }
  if (petLevelEl) petLevelEl.textContent = petLevel;
  if (petHpEl)    petHpEl.textContent    = petHp;
  if (petHpMaxEl) petHpMaxEl.textContent = petHpMax;

  // 上部簡易ステータスバー用 ペット Lv/HP 表示（旧仕様保持）
  let headerPetLevelEl = document.getElementById("headerPetLevel");
  let headerPetHpEl    = document.getElementById("headerPetHp");
  if (headerPetLevelEl) headerPetLevelEl.textContent = petLevel;
  if (headerPetHpEl)    headerPetHpEl.textContent    = `${petHp} / ${petHpMax}`;

  // 新 UI: 上部の簡易ペットステータス（petInfoMini）も更新
  if (typeof updatePetMiniStatus === "function") {
    updatePetMiniStatus();
  }

  // ペット用ステータスページ
  let stPetName      = document.getElementById("stPetName");
  let stPetLevel     = document.getElementById("stPetLevel");
  let stPetExp       = document.getElementById("stPetExp");
  let stPetExpTo     = document.getElementById("stPetExpToNext");
  let stPetReb       = document.getElementById("stPetRebirthCount");
  let stPetGrow      = document.getElementById("stPetGrowthType");
  let stPetHpEl2     = document.getElementById("stPetHp");
  let stPetHpM       = document.getElementById("stPetHpMax");
  let stPetAtkBaseEl = document.getElementById("stPetAtkBase");
  let stPetAtkNowEl  = document.getElementById("stPetAtkNow");
  let stPetDefEl     = document.getElementById("stPetDef");
  // ★追加：種類表示用
  let stPetTypeEl    = document.getElementById("stPetType");

  if (stPetName)  stPetName.textContent  = petName;

  // ★種類：COMPANION_TYPES / companionTypeId から名前を表示
  if (stPetTypeEl && typeof getCurrentCompanionType === "function") {
    const t = getCurrentCompanionType();
    stPetTypeEl.textContent = t ? t.name : "未選択";
  }

  if (stPetLevel) stPetLevel.textContent = petLevel;
  if (stPetExp)   stPetExp.textContent   = exp;
  if (stPetExpTo) stPetExpTo.textContent = expToNext;
  if (stPetReb)   stPetReb.textContent   = petRebirthCount;
  if (stPetGrow) {
    stPetGrow.textContent =
      petGrowthType === PET_GROWTH_TANK ? "タンク型" :
      petGrowthType === PET_GROWTH_DPS  ? "アタッカー型" :
      "バランス型";
  }
  if (stPetHpEl2) stPetHpEl2.textContent = petHp;
  if (stPetHpM)   stPetHpM.textContent   = petHpMax;

  // ペット攻撃力・防御力表示（skill-core.js のヘルパーを利用）
  if (typeof getPetBaseAtk === "function") {
    const baseAtk = getPetBaseAtk();
    const nowAtk  = Math.floor(baseAtk * petBuffRate);
    if (stPetAtkBaseEl) stPetAtkBaseEl.textContent = baseAtk;
    if (stPetAtkNowEl)  stPetAtkNowEl.textContent  = nowAtk;
  }
  if (typeof getPetDef === "function") {
    const defVal = getPetDef();
    if (stPetDefEl) stPetDefEl.textContent = defVal;
  }

  // h3 見出しは「ペット職」なら表示、ステータスブロック類はペット選択済みの時だけ表示
  let petOnlyEls = document.querySelectorAll(".pet-only");
  petOnlyEls.forEach(el => {
    if (el.tagName === "H3") {
      el.style.display = isPetJob ? "" : "none";
    } else {
      el.style.display = hasPet ? "" : "none";
    }
  });

  // 「ペットがいない…」メッセージ（ペット職でペット未選択の時だけ表示）
  const noPetMsgEl = document.getElementById("noPetMsg");
  if (noPetMsgEl) {
    noPetMsgEl.style.display = (isPetJob && !window.companionTypeId) ? "" : "none";
  }

  // 空腹・水分バー
  let hungerGauge = document.getElementById("hungerGauge");
  let hungerText  = document.getElementById("hungerText");
  let thirstGauge = document.getElementById("thirstGauge");
  let thirstText  = document.getElementById("thirstText");

  if (typeof getHungerValue === "function" && hungerGauge && hungerText) {
    let h = getHungerValue();
    let ratio = Math.max(0, Math.min(100, h)) / 100;
    hungerGauge.style.width = (ratio * 100) + "%";
    hungerText.textContent  = h;
  }

  if (typeof getThirstValue === "function" && thirstGauge && thirstText) {
    let t = getThirstValue();
    let ratio = Math.max(0, Math.min(100, t)) / 100;
    thirstGauge.style.width = (ratio * 100) + "%";
    thirstText.textContent  = t;
  }

  // 採取スキル表示
  let skWood    = document.getElementById("skGatherWoodLv");
  let skOre     = document.getElementById("skGatherOreLv");
  let skHerb    = document.getElementById("skGatherHerbLv");
  let skCloth   = document.getElementById("skGatherClothLv");
  let skLeather = document.getElementById("skGatherLeatherLv");
  let skWater   = document.getElementById("skGatherWaterLv");
  let skHunt    = document.getElementById("skGatherHuntLv");
  let skFish    = document.getElementById("skGatherFishLv");
  let skFarm    = document.getElementById("skGatherFarmLv");
  let skGarden  = document.getElementById("skGatherGardenLv");

  if (skWood  && gatherSkills.wood)      skWood.textContent    = gatherSkills.wood.lv;
  if (skOre   && gatherSkills.ore)       skOre.textContent     = gatherSkills.ore.lv;
  if (skHerb  && gatherSkills.herb)      skHerb.textContent    = gatherSkills.herb.lv;
  if (skCloth && gatherSkills.cloth)     skCloth.textContent   = gatherSkills.cloth.lv;
  if (skLeather && gatherSkills.leather) skLeather.textContent = gatherSkills.leather.lv;
  if (skWater && gatherSkills.water)     skWater.textContent   = gatherSkills.water.lv;
  if (skHunt  && gatherSkills.hunt)      skHunt.textContent    = gatherSkills.hunt.lv;
  if (skFish  && gatherSkills.fish)      skFish.textContent    = gatherSkills.fish.lv;
  if (skFarm  && gatherSkills.fieldFarm) skFarm.textContent    = gatherSkills.fieldFarm.lv;
  if (skGarden && gatherSkills.garden)   skGarden.textContent  = gatherSkills.garden.lv;

  // クラフトスキル表示
  let skCraftWeapon    = document.getElementById("skCraftWeaponLv");
  let skCraftArmor     = document.getElementById("skCraftArmorLv");
  let skCraftPotion    = document.getElementById("skCraftPotionLv");
  let skCraftTool      = document.getElementById("skCraftToolLv");
  let skCraftMaterial  = document.getElementById("skCraftMaterialLv");
  let skCraftCooking   = document.getElementById("skCraftCookingLv");
  // ★ 家具クラフトスキル表示（追加）
  let skCraftFurniture = document.getElementById("skCraftFurnitureLv");

  if (skCraftWeapon   && craftSkills.weapon)    skCraftWeapon.textContent    = craftSkills.weapon.lv;
  if (skCraftArmor    && craftSkills.armor)     skCraftArmor.textContent     = craftSkills.armor.lv;
  if (skCraftPotion   && craftSkills.potion)    skCraftPotion.textContent    = craftSkills.potion.lv;
  if (skCraftTool     && craftSkills.tool)      skCraftTool.textContent      = craftSkills.tool.lv;
  if (skCraftMaterial && craftSkills.material)  skCraftMaterial.textContent  = craftSkills.material.lv;
  if (skCraftCooking  && craftSkills.cooking)   skCraftCooking.textContent   = craftSkills.cooking.lv;
  if (skCraftFurniture && craftSkills.furniture) skCraftFurniture.textContent = craftSkills.furniture.lv;

  // 武器種別スキル表示
  const ws = (typeof window !== "undefined" && window.weaponSkills) ? window.weaponSkills : weaponSkills;
  const skWDagger = document.getElementById("skWeaponDaggerLv");
  const skWSword  = document.getElementById("skWeaponSwordLv");
  const skWGreat  = document.getElementById("skWeaponGreatLv");
  const skWStaff  = document.getElementById("skWeaponStaffLv");
  const skWRune   = document.getElementById("skWeaponRuneLv");
  const skWShield = document.getElementById("skWeaponShieldLv");

  if (skWDagger && ws.dagger)     skWDagger.textContent = ws.dagger.lv;
  if (skWSword  && ws.sword)      skWSword.textContent  = ws.sword.lv;
  if (skWGreat  && ws.greatSword) skWGreat.textContent  = ws.greatSword.lv;
  if (skWStaff  && ws.staff)      skWStaff.textContent  = ws.staff.lv;
  if (skWRune   && ws.runeSword)  skWRune.textContent   = ws.runeSword.lv;
  if (skWShield && ws.shield)     skWShield.textContent = ws.shield.lv;

  // 装備中チップの強調表示（武器）
  const eqWType = getEquippedWeaponType();
  const wChipMap = {
    dagger: { chip: "chipWeaponDagger", ind: "indWeaponDagger", lic: "licWeaponDagger" },
    sword: { chip: "chipWeaponSword", ind: "indWeaponSword", lic: "licWeaponSword" },
    greatSword: { chip: "chipWeaponGreat", ind: "indWeaponGreat", lic: "licWeaponGreat" },
    staff: { chip: "chipWeaponStaff", ind: "indWeaponStaff", lic: "licWeaponStaff" },
    runeSword: { chip: "chipWeaponRune", ind: "indWeaponRune", lic: "licWeaponRune" },
    shield: { chip: "chipWeaponShield", ind: "indWeaponShield", lic: "licWeaponShield" }
  };

  Object.keys(wChipMap).forEach(k => {
    const elChip = document.getElementById(wChipMap[k].chip);
    const elInd  = document.getElementById(wChipMap[k].ind);
    const elLic  = document.getElementById(wChipMap[k].lic);
    const isEq = (eqWType === k);
    if (elChip) elChip.classList.toggle("equipped", isEq);
    if (elInd) elInd.textContent = isEq ? "装備中" : "";
    if (elLic) {
      const maxTier = (typeof getEquipLicenseMaxTier === "function") ? getEquipLicenseMaxTier("weapon", k) : 1;
      elLic.textContent = `T${maxTier}`;
      elLic.title = `Tier ${maxTier} 装備許可取得済み`;
    }
  });

  const elWBonusNote = document.getElementById("weaponSkillEquipBonusNote");
  if (elWBonusNote) {
    if (eqWType && ws[eqWType] && ws[eqWType].lv > 0) {
      const b = window.equippedWeaponSkillBonus || {};
      const parts = [];
      if (b.atk) parts.push(`ATK +${b.atk}`);
      if (b.def) parts.push(`DEF +${b.def}`);
      if (b.str) parts.push(`STR +${b.str}`);
      if (b.int) parts.push(`INT +${b.int}`);
      if (b.dex) parts.push(`DEX +${b.dex}`);
      if (b.vit) parts.push(`VIT +${b.vit}`);
      if (b.mpMax) parts.push(`最大MP +${b.mpMax}`);
      if (b.critRate) parts.push(`会心率 +${(b.critRate * 100).toFixed(1)}%`);
      if (b.critMult) parts.push(`会心倍率 +${(b.critMult * 100).toFixed(1)}%`);
      if (b.hitRate) parts.push(`命中率 +${(b.hitRate * 100).toFixed(1)}%`);
      if (b.evaRate) parts.push(`回避率 +${(b.evaRate * 100).toFixed(1)}%`);
      if (b.guardRate) parts.push(`ガード率 +${(b.guardRate * 100).toFixed(1)}%`);
      if (b.physSkillRate) parts.push(`物理スキル +${(b.physSkillRate * 100).toFixed(1)}%`);
      if (b.magicSkillRate) parts.push(`魔法スキル +${(b.magicSkillRate * 100).toFixed(1)}%`);
      elWBonusNote.textContent = parts.length > 0 ? `★ 装備中恩恵: ${parts.join(" / ")}` : "";
      elWBonusNote.style.display = parts.length > 0 ? "block" : "none";
    } else if (eqWType) {
      elWBonusNote.textContent = `※ 装備中の武器種に対応するスキルレベルが上がると恩恵が発揮されます。`;
      elWBonusNote.style.display = "block";
    } else {
      elWBonusNote.textContent = `※ 武器を装備すると、対応する武器種スキルレベルの恩恵を受けられます。`;
      elWBonusNote.style.display = "block";
    }
  }

  // 防具種別スキル表示
  const as = (typeof window !== "undefined" && window.armorSkills) ? window.armorSkills : armorSkills;
  const skALight  = document.getElementById("skArmorLightLv");
  const skAMedium = document.getElementById("skArmorMediumLv");
  const skAHeavy  = document.getElementById("skArmorHeavyLv");

  if (skALight  && as.light)  skALight.textContent  = as.light.lv;
  if (skAMedium && as.medium) skAMedium.textContent = as.medium.lv;
  if (skAHeavy  && as.heavy)  skAHeavy.textContent  = as.heavy.lv;

  // 装備中チップの強調表示（防具）
  const eqAType = getEquippedArmorType();
  const aChipMap = {
    light: { chip: "chipArmorLight", ind: "indArmorLight", lic: "licArmorLight" },
    medium: { chip: "chipArmorMedium", ind: "indArmorMedium", lic: "licArmorMedium" },
    heavy: { chip: "chipArmorHeavy", ind: "indArmorHeavy", lic: "licArmorHeavy" }
  };

  Object.keys(aChipMap).forEach(k => {
    const elChip = document.getElementById(aChipMap[k].chip);
    const elInd  = document.getElementById(aChipMap[k].ind);
    const elLic  = document.getElementById(aChipMap[k].lic);
    const isEq = (eqAType === k);
    if (elChip) elChip.classList.toggle("equipped", isEq);
    if (elInd) elInd.textContent = isEq ? "装備中" : "";
    if (elLic) {
      const maxTier = (typeof getEquipLicenseMaxTier === "function") ? getEquipLicenseMaxTier("armor", k) : 1;
      elLic.textContent = `T${maxTier}`;
      elLic.title = `Tier ${maxTier} 装備許可取得済み`;
    }
  });

  const elABonusNote = document.getElementById("armorSkillEquipBonusNote");
  if (elABonusNote) {
    if (eqAType && as[eqAType] && as[eqAType].lv > 0) {
      const b = window.equippedArmorSkillBonus || {};
      const parts = [];
      if (b.def) parts.push(`DEF +${b.def}`);
      if (b.vit) parts.push(`VIT +${b.vit}`);
      if (b.dex) parts.push(`DEX +${b.dex}`);
      if (b.hpMax) parts.push(`最大HP +${b.hpMax}`);
      if (b.spMax) parts.push(`最大SP +${b.spMax}`);
      if (b.evaRate) parts.push(`回避率 +${(b.evaRate * 100).toFixed(1)}%`);
      if (b.damageReduce) parts.push(`被ダメ軽減 +${(b.damageReduce * 100).toFixed(1)}%`);
      elABonusNote.textContent = parts.length > 0 ? `★ 装備中恩恵: ${parts.join(" / ")}` : "";
      elABonusNote.style.display = parts.length > 0 ? "block" : "none";
    } else if (eqAType) {
      elABonusNote.textContent = `※ 装備中の防具種に対応するスキルレベルが上がると恩恵が発揮されます。`;
      elABonusNote.style.display = "block";
    } else {
      elABonusNote.textContent = `※ 防具を装備すると、対応する防具種スキルレベルの恩恵を受けられます。`;
      elABonusNote.style.display = "block";
    }
  }

  // ★追加：ペットタブの表示を最新化（倉庫タブ / 拠点タブ共用）
  if (typeof renderPetList === "function" && typeof renderPetCareBox === "function") {
    const whRoot = document.getElementById("warehousePagePet");
    if (whRoot) {
      renderPetList(whRoot);
      renderPetCareBox(whRoot);
    }
    const housingRoot = document.getElementById("housingPagePetInner");
    if (housingRoot) {
      renderPetList(housingRoot);
      renderPetCareBox(housingRoot);
    }
  }

  // ★追加：倉庫 UI の更新（料理・装備などを最新にする）
  if (typeof refreshWarehouseUI === "function") {
    refreshWarehouseUI();
  }
}