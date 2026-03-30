// game-core-1.js
// 基本ステータス・装備・所持品管理など

// =======================
// 基本ステータス
// =======================

let level = 1;
let exp = 0;
let expToNext = 100;

let rebirthCount = 0;
let growthType = 4; // 0:STR,1:VIT,2:INT,3:LUK,4:バランス

// 能力値
let STR = 1;
let VIT = 1;
let INT_ = 1;
let DEX_ = 1;
let LUK_ = 1;

// HP/MP/SP 基礎値
let hpMaxBase = 30;
let mpMaxBase = 10;
let spMaxBase = 10;

// ★ 初期は Lv1 の最大HP＝30 に合わせる
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
let jobId = null;  // 0:戦士,1:魔法使い,2:動物使い
let jobChangedOnce = false;
let everBeastTamer = false;

// ペット関連（動物使い用）
let petLevel = 1;
let petExp = 0;
let petExpToNext = 5;
let petRebirthCount = 0;

let petHpBase = 10;
let petAtkBase = 4;

let petHpMax = 10;
let petHp = 10;

// ペット攻撃倍率（スキルバフで変動）
let petBuffRate = 1.0;

// ペット成長タイプ
const PET_GROWTH_BALANCE = 0;
const PET_GROWTH_TANK    = 1;
const PET_GROWTH_DPS     = 2;
let petGrowthType = PET_GROWTH_BALANCE;

// ペットスキル（game-core-5 などで中身を定義）
let petSkills = [];
const PET_SKILL_TRY_RATE = 0.3;

// お金
let money = 0;

// =======================
// 装備・所持品
// =======================

let weapons = [];
let armors  = [];
let potions = [];

let weaponCounts = {};
let armorCounts  = {};
let potionCounts = {};

let equippedWeaponId = null;
let equippedArmorId  = null;

// =======================
// 素材・中間素材
// =======================

// ★ ティア付き基本素材（T1/T2/T3）
let materials = {
  wood:    { t1: 0, t2: 0, t3: 0 },
  ore:     { t1: 0, t2: 0, t3: 0 },
  herb:    { t1: 0, t2: 0, t3: 0 },
  cloth:   { t1: 0, t2: 0, t3: 0 },
  leather: { t1: 0, t2: 0, t3: 0 },
  water:   { t1: 0, t2: 0, t3: 0 }
};

// 合計値を返すヘルパー（game-core-4 の hasMaterials / updateCraftCostInfo から利用）
function getMatTotal(key) {
  const m = materials[key];
  if (!m) return 0;
  return (m.t1 || 0) + (m.t2 || 0) + (m.t3 || 0);
}

// 中間素材（craft-data.js の INTERMEDIATE_MATERIALS と対応）
let intermediateMats = {};

// =======================
// 採取・クラフトスキル
// =======================

let gatherSkills = JSON.parse(JSON.stringify(GATHER_SKILLS_INIT));
let craftSkills  = JSON.parse(JSON.stringify(CRAFT_SKILLS_INIT));

// =======================
// 探索・戦闘
// =======================

let exploringArea = null;  // "field","forest","cave","mine"
let isExploring   = false;

let currentEnemy   = null;
let enemyHp        = 0;
let enemyHpMax     = 0;
let isBossBattle   = false;

// エリア別ボス撃破フラグ
// 実際のエリア解放は game-core-3 側のロジックで制御する前提
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
    case 0: return "STR型";
    case 1: return "VIT型";
    case 2: return "INT型";
    case 3: return "LUK型";
    case 4: default: return "バランス型";
  }
}

function getJobName() {
  if (jobId === 0) return "戦士";
  if (jobId === 1) return "魔法使い";
  if (jobId === 2) return "動物使い";
  return "未設定";
}

// =======================
// ステータス再計算
// =======================
//
// ★ HPの成長式そのものは game-core-2.js（addExp/doRebirth）で決める前提。
//   ここでは「現在の *_Base と hpMax の整合を取りつつ、
//   現在値を最大値でクリップする」だけに留める。

function recalcStats() {
  // HP/MP/SP 最大値
  // hpMax はレベルアップ・転生時に game-core-2 側で更新される想定なので、
  // ここでは「最低でも hpMaxBase 以上にしておく」程度にとどめる。
  if (hpMax < hpMaxBase) {
    hpMax = hpMaxBase;
  }
  mpMax = mpMaxBase;
  spMax = spMaxBase;

  // 現在値のクリップ
  hp = Math.min(hp, hpMax);
  mp = Math.min(mp, mpMax);
  sp = Math.min(sp, spMax);

  // 基礎攻撃・防御
  const baseAtk = STR + Math.floor(level * 0.5);
  const baseDef = VIT + Math.floor(level * 0.5);

  // 装備補正
  let weaponAtk = 0;
  let weaponScaleStr = 0;
  let weaponScaleInt = 0;
  let armorDef = 0;
  let armorScaleVit = 0;
  let armorBonusDex = 0;

  if (equippedWeaponId) {
    const w = weapons.find(x => x.id === equippedWeaponId);
    if (w) {
      weaponAtk       = w.atk || 0;
      weaponScaleStr  = w.scaleStr || 0;
      weaponScaleInt  = w.scaleInt || 0;
    }
  }

  if (equippedArmorId) {
    const a = armors.find(x => x.id === equippedArmorId);
    if (a) {
      armorDef       = a.def || 0;
      armorScaleVit  = a.scaleVit || 0;
      armorBonusDex  = a.bonusDex || 0;
    }
  }

  // 最終攻撃力・防御力
  const atkFromStr = Math.floor(STR * 0.5);
  const atkFromDex = Math.floor(DEX_ * 0.3);
  const atkFromWeaponStr = Math.floor(STR * weaponScaleStr);
  const atkFromWeaponInt = Math.floor(INT_ * weaponScaleInt);

  atkTotal =
    baseAtk +
    weaponAtk +
    atkFromStr +
    atkFromDex +
    atkFromWeaponStr +
    atkFromWeaponInt;

  const defFromVit = Math.floor(VIT * 0.7);
  const defFromDex = Math.floor(DEX_ * 0.2);
  const defFromArmorVit = Math.floor(VIT * armorScaleVit);

  defTotal =
    baseDef +
    armorDef +
    defFromVit +
    defFromDex +
    defFromArmorVit;

  // 表示更新
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

  equippedWeaponId = null;
  equippedArmorId  = null;
}

function initIntermediateMats() {
  intermediateMats = {};
  if (Array.isArray(INTERMEDIATE_MATERIALS)) {
    INTERMEDIATE_MATERIALS.forEach(m => {
      intermediateMats[m.id] = 0;
    });
  }
}

function initGame() {
  // 基本ステ初期化（上部のデフォルトを利用）

  // 装備・所持品初期化
  initWeaponsAndArmors();
  initIntermediateMats();

  // 採取・クラフトスキル初期化
  gatherSkills = JSON.parse(JSON.stringify(GATHER_SKILLS_INIT));
  craftSkills  = JSON.parse(JSON.stringify(CRAFT_SKILLS_INIT));

  // 探索・ボスフラグ初期化
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

  // 職業・ペットはデフォルトのまま（jobId=null, pet…）

  // ステータス計算＆表示
  recalcStats();
}

// =======================
// ログ表示ヘルパー
// =======================

function setLog(msg) {
  const el = document.getElementById("log");
  if (!el) return;
  el.textContent = msg;
}

function appendLog(msg) {
  const el = document.getElementById("log");
  if (!el) return;
  el.textContent = msg + "\n" + el.textContent;
}

// =======================
// 表示更新
// =======================

function updateDisplay() {
  // HP/MP/SPバー
  const hpBarFill = document.getElementById("hpBarFill");
  const hpBarText = document.getElementById("hpBarText");
  const mpBarFill = document.getElementById("mpBarFill");
  const mpBarText = document.getElementById("mpBarText");
  const spBarFill = document.getElementById("spBarFill");
  const spBarText = document.getElementById("spBarText");

  if (hpBarFill && hpBarText) {
    const ratio = hpMax > 0 ? (hp / hpMax) : 0;
    hpBarFill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    hpBarText.textContent = `${hp} / ${hpMax}`;
  }
  if (mpBarFill && mpBarText) {
    const ratio = mpMax > 0 ? (mp / mpMax) : 0;
    mpBarFill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    mpBarText.textContent = `${mp} / ${mpMax}`;
  }
  if (spBarFill && spBarText) {
    const ratio = spMax > 0 ? (sp / spMax) : 0;
    spBarFill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    spBarText.textContent = `${sp} / ${spMax}`;
  }

  // 所持金
  const moneyEl = document.getElementById("money");
  const shopGoldEl = document.getElementById("shopGoldDisplay");
  if (moneyEl) moneyEl.textContent = money;
  if (shopGoldEl) shopGoldEl.textContent = money;

  // ステータスページ
  const stLevelEl = document.getElementById("stLevel");
  const stExpEl   = document.getElementById("stExp");
  const stExpNext = document.getElementById("stExpToNext");
  const stRebirth = document.getElementById("stRebirthCount");
  const stGrowth  = document.getElementById("stGrowthType");
  const stJobName = document.getElementById("stJobName");

  if (stLevelEl) stLevelEl.textContent = level;
  if (stExpEl)   stExpEl.textContent   = exp;
  if (stExpNext) stExpNext.textContent = expToNext;
  if (stRebirth) stRebirth.textContent = rebirthCount;
  if (stGrowth)  stGrowth.textContent  = getGrowthTypeName();
  if (stJobName) stJobName.textContent = getJobName();

  const stSTR = document.getElementById("stSTR");
  const stVIT = document.getElementById("stVIT");
  const stINT = document.getElementById("stINT");
  const stDEX = document.getElementById("stDEX");
  const stLUK = document.getElementById("stLUK");

  if (stSTR) stSTR.textContent = STR;
  if (stVIT) stVIT.textContent = VIT;
  if (stINT) stINT.textContent = INT_;
  if (stDEX) stDEX.textContent = DEX_;
  if (stLUK) stLUK.textContent = LUK_;

  const stAtkTotal = document.getElementById("stAtkTotal");
  const stDefTotal = document.getElementById("stDefTotal");
  const stHpMax    = document.getElementById("stHpMax");
  const stMpMax    = document.getElementById("stMpMax");
  const stSpMax    = document.getElementById("stSpMax");

  if (stAtkTotal) stAtkTotal.textContent = atkTotal;
  if (stDefTotal) stDefTotal.textContent = defTotal;
  if (stHpMax)    stHpMax.textContent    = hpMax;
  if (stMpMax)    stMpMax.textContent    = mpMax;
  if (stSpMax)    stSpMax.textContent    = spMax;

  // 詳細パネル
  const jobNameEl = document.getElementById("jobName");
  const eqWpnName = document.getElementById("equippedWeaponName");
  const eqArmName = document.getElementById("equippedArmorName");
  const atkTotalEl= document.getElementById("atkTotal");
  const defTotalEl= document.getElementById("defTotal");

  if (jobNameEl) jobNameEl.textContent = getJobName();

  if (eqWpnName) {
    const w = weapons.find(x => x.id === equippedWeaponId);
    eqWpnName.textContent = w ? w.name : "なし";
  }
  if (eqArmName) {
    const a = armors.find(x => x.id === equippedArmorId);
    eqArmName.textContent = a ? a.name : "なし";
  }
  if (atkTotalEl) atkTotalEl.textContent = atkTotal;
  if (defTotalEl) defTotalEl.textContent = defTotal;

  // ペット表示
  const petInfoBox = document.getElementById("petInfo");
  const petLevelEl = document.getElementById("petLevel");
  const petHpEl    = document.getElementById("petHp");
  const petHpMaxEl = document.getElementById("petHpMax");

  if (petInfoBox) {
    const show = (jobId === 2);
    petInfoBox.style.display = show ? "" : "none";
  }
  if (petLevelEl) petLevelEl.textContent = petLevel;
  if (petHpEl)    petHpEl.textContent    = petHp;
  if (petHpMaxEl) petHpMaxEl.textContent = petHpMax;

  // ペット用ステータスページ
  const stPetLevel = document.getElementById("stPetLevel");
  const stPetExp   = document.getElementById("stPetExp");
  const stPetExpTo = document.getElementById("stPetExpToNext");
  const stPetReb   = document.getElementById("stPetRebirthCount");
  const stPetGrow  = document.getElementById("stPetGrowthType");
  const stPetHp    = document.getElementById("stPetHp");
  const stPetHpM   = document.getElementById("stPetHpMax");

  if (stPetLevel) stPetLevel.textContent = petLevel;
  if (stPetExp)   stPetExp.textContent   = petExp;
  if (stPetExpTo) stPetExpTo.textContent = petExpToNext;
  if (stPetReb)   stPetReb.textContent   = petRebirthCount;
  if (stPetGrow) {
    stPetGrow.textContent =
      petGrowthType === PET_GROWTH_TANK ? "タンク型" :
      petGrowthType === PET_GROWTH_DPS  ? "アタッカー型" :
      "バランス型";
  }
  if (stPetHp)  stPetHp.textContent  = petHp;
  if (stPetHpM) stPetHpM.textContent = petHpMax;

  const petOnlyEls = document.querySelectorAll(".pet-only");
  petOnlyEls.forEach(el => {
    el.style.display = (jobId === 2) ? "" : "none";
  });
}