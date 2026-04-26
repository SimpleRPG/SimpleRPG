// game-core-1.js
// 基本ステータス・装備・所持品管理など

// =======================
// 定数
// =======================

// レベルアップ用経験値ベース（Lvごとの必要値は addExp/doRebirth 側で利用）
let BASE_EXP_PER_LEVEL = 100;

// ★ 装備耐久（武器・防具共通）
let MAX_DURABILITY = 100;

// ★ ステータス→HP/MP/SP 変換係数（VIT3でHP+1, INT3でMP+1, DEX3でSP+1）
const HP_PER_VIT_POINT = 1 / 3;
const MP_PER_INT_POINT = 1 / 3;
const SP_PER_DEX_POINT = 1 / 3;

// =======================
// 基本ステータス
// =======================

// ★フラグ: 「職業ごとの初期ステ」を既に適用済みかどうか
//   既存セーブ互換のため、window から拾っておく
window.initialJobStatsApplied = window.initialJobStatsApplied || false;
let initialJobStatsApplied = window.initialJobStatsApplied;

let level = 1;
let exp = 0;
let expToNext = BASE_EXP_PER_LEVEL;

let rebirthCount = 0;
let growthType = 4; // 0:STR,1:VIT,2:INT,3:LUK,4:バランス

// 能力値（ロード直後は従来どおり全部1。
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
let jobId = null;  // 0:戦士,1:魔法使い,2:動物使い,3:錬金術師
let jobChangedOnce = false;
let everBeastTamer = false;

// ペット関連（動物使い用）
let petLevel = 1;
let petExp = 0;
let petExpToNext = 5;
let petRebirthCount = 0;

let petHpBase = 10;
let petAtkBase = 4;
let petDefBase = 2; // ★追加: ペット基礎防御

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

// ★ 1本ごとのインスタンス（品質/強化/耐久を持たせる）
// location: "warehouse" | "carry" | "equipped"
let weaponInstances = []; // { id, quality, enhance, durability, location }
let armorInstances  = [];

// 既存セーブとの整合を取りつつ、必ず配列にしておく
window.weaponInstances = Array.isArray(window.weaponInstances) ? window.weaponInstances : weaponInstances;
window.armorInstances  = Array.isArray(window.armorInstances)  ? window.armorInstances  : armorInstances;

// ローカル変数と window 参照を同期
weaponInstances = window.weaponInstances;
armorInstances  = window.armorInstances;

// ★ どのインスタンスを装備しているか（indexで保持）
// 旧仕様の ID 装備も一応残す（セーブ互換用）
window.equippedWeaponIndex = (typeof window.equippedWeaponIndex === "number") ? window.equippedWeaponIndex : null;
window.equippedArmorIndex  = (typeof window.equippedArmorIndex  === "number") ? window.equippedArmorIndex  : null;
window.equippedWeaponId    = window.equippedWeaponId || null;
window.equippedArmorId     = window.equippedArmorId  || null;

let equippedWeaponIndex = window.equippedWeaponIndex;
let equippedArmorIndex  = window.equippedArmorIndex;
let equippedWeaponId    = window.equippedWeaponId;
let equippedArmorId     = window.equippedArmorId;

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
  if (jobId === 3) return "錬金術師"; // ★ 追加
  return "未設定";
}

// ★ 職業ごとの初期ステータスを設定（レベル1時点専用）
//   - 0:戦士,1:魔法使い,2:動物使い,3:錬金術師
//   - 「最初の職業を決めたときだけ」呼ぶ想定。転職時には呼ばない。
function applyInitialStatsForJob(selectedJobId) {
  // 既に適用済みなら何もしない（ロード互換・多重呼び出し防止）
  if (initialJobStatsApplied) {
    return;
  }

  jobId = selectedJobId;

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

  initialJobStatsApplied = true;
  window.initialJobStatsApplied = true;

  // HP/MP/SP などを再計算
  if (typeof recalcStats === "function") {
    recalcStats();
  }
}

// =======================
// ステータス再計算
// =======================

function recalcStats() {
  // ローカルと window の equippedIndex を同期（どこかで window 側だけ書き換えられても拾えるように）
  if (typeof window.equippedWeaponIndex === "number" || window.equippedWeaponIndex === null) {
    equippedWeaponIndex = window.equippedWeaponIndex;
  }
  if (typeof window.equippedArmorIndex === "number" || window.equippedArmorIndex === null) {
    equippedArmorIndex = window.equippedArmorIndex;
  }
  equippedWeaponId = window.equippedWeaponId || null;
  equippedArmorId  = window.equippedArmorId  || null;

  // ★スキルツリーボーナスを取得（なければ0扱い）
  let skillBonus = null;
  if (typeof getGlobalSkillTreeBonus === "function") {
    skillBonus = getGlobalSkillTreeBonus() || {};
  } else {
    skillBonus = {};
  }
  const hpMaxRate   = skillBonus.hpMaxRate   || 0; // 最大HP+%
  const mpMaxRate   = skillBonus.mpMaxRate   || 0; // 最大MP+%（必要なら定義）
  const spMaxRate   = skillBonus.spMaxRate   || 0; // 最大SP+%（必要なら定義）
  const atkRate     = skillBonus.atkRate     || 0; // 物理攻撃+%
  const defRate     = skillBonus.defRate     || 0; // 防御+%

  // ★ まず「素の最大値」を基礎値から毎回作り直す（空腹・水分デバフはここではまだ掛けない）
  let baseHpMax = hpMaxBase;
  let baseMpMax = mpMaxBase;
  let baseSpMax = spMaxBase;

  // 基本攻撃・防御
  let baseAtk = STR + Math.floor(level * 0.5);
  let baseDef = VIT + Math.floor(level * 0.5);

  let weaponAtk = 0;
  let weaponScaleStr = 0;
  let weaponScaleInt = 0;
  let weaponEnhance = 0;
  let weaponQuality = 0;   // 品質（0:通常,1:良品,2:傑作）

  let armorDef = 0;
  let armorScaleVit = 0;
  let armorBonusDex = 0;
  let armorEnhance = 0;
  let armorQuality = 0;

  // ★ 武器は「装備中インスタンス」を最優先、なければID装備を見る
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
      }
    }
  } else if (equippedWeaponId) {
    let w = weapons.find(x => x.id === equippedWeaponId);
    if (w) {
      weaponAtk       = w.atk || 0;
      weaponScaleStr  = w.scaleStr || 0;
      weaponScaleInt  = w.scaleInt || 0;
      weaponEnhance   = w.enhance || 0;
      weaponQuality   = 0; // 旧仕様は品質なし（通常品）
    }
  }

  // ★ 防具も同様にインスタンス優先
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
      }
    }
  } else if (equippedArmorId) {
    let a = armors.find(x => x.id === equippedArmorId);
    if (a) {
      armorDef       = a.def || 0;
      armorScaleVit  = a.scaleVit || 0;
      armorBonusDex  = a.bonusDex || 0;
      armorEnhance   = a.enhance || 0;
      armorQuality   = 0;
    }
  }

  // 強化補正（1段階あたり+5%想定）
  let WEAPON_ENH_RATE   = 0.05;
  let ARMOR_ENH_RATE    = 0.05;

  // 品質補正（良品10% / 傑作20%）
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

  let enhancedWeaponAtk = Math.floor(weaponAtk * weaponEnhRate * weaponQualityRate);
  let enhancedArmorDef  = Math.floor(armorDef * armorEnhRate  * armorQualityRate);

  // ステータス由来の攻撃
  let atkFromStr = Math.floor(STR * 0.5);
  let atkFromDex = Math.floor(DEX_ * 0.3);
  let atkFromWeaponStr = Math.floor(STR * weaponScaleStr);
  let atkFromWeaponInt = Math.floor(INT_ * weaponScaleInt);

  // ステータス由来の防御
  let defFromVit = Math.floor(VIT * 0.7);
  let defFromDex = Math.floor(DEX_ * 0.2);
  let defFromArmorVit = Math.floor(VIT * armorScaleVit);

  // ===== 空腹・水分デバフ反映（攻撃・防御） =====
  if (typeof hungerAtkIntRate === "number") {
    atkFromStr       = Math.floor(atkFromStr       * hungerAtkIntRate);
    atkFromWeaponStr = Math.floor(atkFromWeaponStr * hungerAtkIntRate);
    atkFromWeaponInt = Math.floor(atkFromWeaponInt * hungerAtkIntRate);
  }

  if (typeof thirstDefDexLukRate === "number") {
    defFromVit      = Math.floor(defFromVit      * thirstDefDexLukRate);
    defFromDex      = Math.floor(defFromDex      * thirstDefDexLukRate);
    defFromArmorVit = Math.floor(defFromArmorVit * thirstDefDexLukRate);
  }

  // ===== ステータス→最大HP/MP/SP への追加分を反映 =====
  const hpFromVit = Math.floor(VIT * HP_PER_VIT_POINT);
  const mpFromInt = Math.floor(INT_ * MP_PER_INT_POINT);
  const spFromDex = Math.floor(DEX_ * SP_PER_DEX_POINT);

  baseHpMax += hpFromVit;
  baseMpMax += mpFromInt;
  baseSpMax += spFromDex;

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

  // ===== 空腹・水分デバフ反映（最大HP/MP/SP） =====
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
  let rawAtkTotal =
    baseAtk +
    enhancedWeaponAtk +
    atkFromStr +
    atkFromDex +
    atkFromWeaponStr +
    atkFromWeaponInt;

  let rawDefTotal =
    baseDef +
    enhancedArmorDef +
    defFromVit +
    defFromDex +
    defFromArmorVit;

  // スキルツリーの攻撃・防御ボーナス反映
  if (atkRate !== 0) {
    rawAtkTotal = Math.floor(rawAtkTotal * (1 + atkRate));
  }
  if (defRate !== 0) {
    rawDefTotal = Math.floor(rawDefTotal * (1 + defRate));
  }

  atkTotal = rawAtkTotal;
  defTotal = rawDefTotal;

  // ★ここからペットの最大HP再計算（特性補正込み）
  // petHpBase / petRebirthCount を元に毎回再計算する想定
  if (typeof applyCompanionPetRates === "function") {
    const r = applyCompanionPetRates(petHpBase, petAtkBase, petDefBase);
    petHpMax = r.hp + petRebirthCount * 3;
  } else {
    petHpMax = petHpBase + petRebirthCount * 3;
  }
  if (petHpMax < 1) petHpMax = 1;
  petHp = Math.min(petHp, petHpMax);
  // ★ここまでペットHP計算

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

  // 旧仕様のID装備もリセット
  equippedWeaponId = null;
  equippedArmorId  = null;
  window.equippedWeaponId = null;
  window.equippedArmorId  = null;

  // インスタンス配列もリセット（window 参照と同期）
  weaponInstances.length = 0;
  armorInstances.length  = 0;
  window.weaponInstances = weaponInstances;
  window.armorInstances  = armorInstances;

  equippedWeaponIndex = null;
  equippedArmorIndex  = null;
  window.equippedWeaponIndex = null;
  window.equippedArmorIndex  = null;
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

  recalcStats();
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
  // HP/MP/SPバー
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
  let defTotalEl= document.getElementById("defTotal");

  if (jobNameEl) jobNameEl.textContent = getJobName();

  if (eqWpnName) {
    let nameText = "なし";
    if (equippedWeaponIndex != null && Array.isArray(weaponInstances)) {
      let inst = weaponInstances[equippedWeaponIndex];
      if (inst) {
        let w = weapons.find(x => x.id === inst.id);
        if (w) nameText = w.name;
      }
    } else if (equippedWeaponId) {
      let w = weapons.find(x => x.id === equippedWeaponId);
      if (w) nameText = w.name;
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
    } else if (equippedArmorId) {
      let a = armors.find(x => x.id === equippedArmorId);
      if (a) nameText = a.name;
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

  if (petInfoBox) {
    let show = (jobId === 2);
    petInfoBox.style.display = show ? "" : "none";
  }
  if (petLevelEl) petLevelEl.textContent = petLevel;
  if (petHpEl)    petHpEl.textContent    = petHp;
  if (petHpMaxEl) petHpMaxEl.textContent = petHpMax;

  // 上部簡易ステータスバー用 ペットLv/HP 表示（旧仕様保持）
  let headerPetLevelEl = document.getElementById("headerPetLevel");
  let headerPetHpEl    = document.getElementById("headerPetHp");
  if (headerPetLevelEl) headerPetLevelEl.textContent = petLevel;
  if (headerPetHpEl)    headerPetHpEl.textContent    = `${petHp} / ${petHpMax}`;

  // 新UI: 上部の簡易ペットステータス（petInfoMini）も更新
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
  // ★追加: 種類表示用
  let stPetTypeEl    = document.getElementById("stPetType");

  if (stPetName)  stPetName.textContent  = petName;

  // ★種類: COMPANION_TYPES / companionTypeId から名前を表示
  if (stPetTypeEl && typeof getCurrentCompanionType === "function") {
    const t = getCurrentCompanionType();
    stPetTypeEl.textContent = t ? t.name : "未選択";
  }

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

  const hasPet = (jobId === 2) && !!window.companionTypeId;

  // h3見出しは「動物使い」なら表示、ステータスブロック類はペット選択済みの時だけ表示
  let petOnlyEls = document.querySelectorAll(".pet-only");
  petOnlyEls.forEach(el => {
    if (el.tagName === "H3") {
      el.style.display = (jobId === 2) ? "" : "none";
    } else {
      el.style.display = hasPet ? "" : "none";
    }
  });

  // 「ペットがいない…」メッセージ（動物使いでペット未選択の時だけ表示）
  const noPetMsgEl = document.getElementById("noPetMsg");
  if (noPetMsgEl) {
    noPetMsgEl.style.display = (jobId === 2 && !window.companionTypeId) ? "" : "none";
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
  let skCraftWeapon   = document.getElementById("skCraftWeaponLv");
  let skCraftArmor    = document.getElementById("skCraftArmorLv");
  let skCraftPotion   = document.getElementById("skCraftPotionLv");
  let skCraftTool     = document.getElementById("skCraftToolLv");
  let skCraftMaterial = document.getElementById("skCraftMaterialLv");
  let skCraftCooking  = document.getElementById("skCraftCookingLv");

  if (skCraftWeapon   && craftSkills.weapon)   skCraftWeapon.textContent   = craftSkills.weapon.lv;
  if (skCraftArmor    && craftSkills.armor)    skCraftArmor.textContent    = craftSkills.armor.lv;
  if (skCraftPotion   && craftSkills.potion)   skCraftPotion.textContent   = craftSkills.potion.lv;
  if (skCraftTool     && craftSkills.tool)     skCraftTool.textContent     = craftSkills.tool.lv;
  if (skCraftMaterial && craftSkills.material) skCraftMaterial.textContent = craftSkills.material.lv;
  if (skCraftCooking  && craftSkills.cooking)  skCraftCooking.textContent  = craftSkills.cooking.lv;
}