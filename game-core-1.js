// game-core-1.js
// 基本ステータス・装備・所持品管理など

// =======================
// 定数
// =======================

// レベルアップ用経験値ベース（Lvごとの必要値は addExp/doRebirth 側で利用）
let BASE_EXP_PER_LEVEL = 100;

// ★ 装備耐久（武器・防具共通）
let MAX_DURABILITY = 3;

// =======================
// 基本ステータス
// =======================

let level = 1;
let exp = 0;
let expToNext = BASE_EXP_PER_LEVEL;

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
let PET_GROWTH_BALANCE = 0;
let PET_GROWTH_TANK    = 1;
let PET_GROWTH_DPS     = 2;
let petGrowthType = PET_GROWTH_BALANCE;

// ペットスキル（game-core-5 などで中身を定義）
let petSkills = [];
let PET_SKILL_TRY_RATE = 0.3;

// お金
let money = 0;

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

// 従来の「どのIDを装備しているか」は互換用に残す
let equippedWeaponId = null;
let equippedArmorId  = null;

// ★ どのインスタンスを装備しているか（indexで保持）
let equippedWeaponIndex = null; // weaponInstances の index
let equippedArmorIndex  = null; // armorInstances の index

// =======================
// 素材・中間素材
// =======================

// ★ ティア付き基本素材（T1/T3）
let materials = {
  wood:    { t1: 0, t2: 0, t3: 0 },
  ore:     { t1: 0, t2: 0, t3: 0 },
  herb:    { t1: 0, t2: 0, t3: 0 },
  cloth:   { t1: 0, t2: 0, t3: 0 },
  leather: { t1: 0, t2: 0, t3: 0 },
  water:   { t1: 0, t2: 0, t3: 0 }
};
window.materials = materials;

// 合計値を返すヘルパー
function getMatTotal(key) {
  let m = materials[key];
  if (!m) return 0;
  return (m.t1 || 0) + (m.t2 || 0) + (m.t3 || 0);
}

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
  return "未設定";
}

// =======================
// ステータス再計算
// =======================

function recalcStats() {
  // 最大値の下限を維持
  if (hpMax < hpMaxBase) {
    hpMax = hpMaxBase;
  }
  mpMax = mpMaxBase;
  spMax = spMaxBase;

  // 現在値を最大値に丸め込み
  hp = Math.min(hp, hpMax);
  mp = Math.min(mp, mpMax);
  sp = Math.min(sp, spMax);

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
  if (equippedWeaponIndex != null) {
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
  if (equippedArmorIndex != null) {
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

  // 品質補正（良品10% / 傑作20%）※クラフト側の QUALITY_RATE と整合
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

  // 強化→品質の順で乗算（掛け算なので順序は見た目上は同じ）
  let enhancedWeaponAtk = Math.floor(weaponAtk * weaponEnhRate * weaponQualityRate);
  let enhancedArmorDef  = Math.floor(armorDef * armorEnhRate  * armorQualityRate);

  // ステータス由来の攻撃
  let atkFromStr = Math.floor(STR * 0.5);
  let atkFromDex = Math.floor(DEX_ * 0.3);
  let atkFromWeaponStr = Math.floor(STR * weaponScaleStr);
  let atkFromWeaponInt = Math.floor(INT_ * weaponScaleInt);

  atkTotal =
    baseAtk +
    enhancedWeaponAtk +
    atkFromStr +
    atkFromDex +
    atkFromWeaponStr +
    atkFromWeaponInt;

  // ステータス由来の防御
  let defFromVit = Math.floor(VIT * 0.7);
  let defFromDex = Math.floor(DEX_ * 0.2);
  let defFromArmorVit = Math.floor(VIT * armorScaleVit);

  defTotal =
    baseDef +
    enhancedArmorDef +
    defFromVit +
    defFromDex +
    defFromArmorVit;

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

  // ★ インスタンスと装備インデックスも初期化
  weaponInstances = [];
  armorInstances  = [];
  equippedWeaponIndex = null;
  equippedArmorIndex  = null;
}

function initIntermediateMats() {
  // window とローカル両方をクリアして同期させる
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
// ログ表示ヘルパー
// =======================

function setLog(msg) {
  let el = document.getElementById("log");
  if (!el) return;
  el.textContent = msg;
}

function appendLog(msg) {
  let el = document.getElementById("log");
  if (!el) return;
  el.textContent = msg + "\n" + el.textContent;
}

// =======================
// 素材表示ヘルパー
// =======================

// ★ UI に統一したので、ここでは何もしないダミー関数にしておく
function updateMaterialDetailTexts() {
  // 何もしない（従来の UI 更新は game-ui.js の
  // updateGatherMatDetailText / updateCraftMatDetailText に委譲）
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

  // ★ 装備名表示もインスタンス優先（見た目仕様は従来どおり）
  if (eqWpnName) {
    let nameText = "なし";
    if (equippedWeaponIndex != null) {
      let inst = weaponInstances[equippedWeaponIndex];
      if (inst) {
        let w = weapons.find(x => x.id === inst.id);
        if (w) {
          nameText = w.name;
        }
      }
    } else if (equippedWeaponId) {
      let w = weapons.find(x => x.id === equippedWeaponId);
      if (w) nameText = w.name;
    }
    eqWpnName.textContent = nameText;
  }

  if (eqArmName) {
    let nameText = "なし";
    if (equippedArmorIndex != null) {
      let inst = armorInstances[equippedArmorIndex];
      if (inst) {
        let a = armors.find(x => x.id === inst.id);
        if (a) {
          nameText = a.name;
        }
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

  // ★ 上部簡易ステータスバー用 ペットLv/HP 表示（存在する場合のみ）
  let headerPetLevelEl = document.getElementById("headerPetLevel");
  let headerPetHpEl    = document.getElementById("headerPetHp");
  if (headerPetLevelEl) headerPetLevelEl.textContent = petLevel;
  if (headerPetHpEl)    headerPetHpEl.textContent    = `${petHp} / ${petHpMax}`;

  // ペット用ステータスページ
  let stPetLevel = document.getElementById("stPetLevel");
  let stPetExp   = document.getElementById("stPetExp");
  let stPetExpTo = document.getElementById("stPetExpToNext");
  let stPetReb   = document.getElementById("stPetRebirthCount");
  let stPetGrow  = document.getElementById("stPetGrowthType");
  let stPetHp    = document.getElementById("stPetHp");
  let stPetHpM   = document.getElementById("stPetHpMax");

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

  let petOnlyEls = document.querySelectorAll(".pet-only");
  petOnlyEls.forEach(el => {
    el.style.display = (jobId === 2) ? "" : "none";
  });

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
  let skFarm    = document.getElementById("skGatherFarmLv");   // 畑
  let skGarden  = document.getElementById("skGatherGardenLv"); // 菜園（★要: index.html 側に span 追加）

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

  // クラフトスキル表示（武器/防具/ポーション/道具/中間素材/料理）
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

  // ★ 素材ラベルは game-ui.js 側で更新するのでここでは触らない
}

// =======================
// 倉庫からの直接装備ヘルパー（インスタンス対応）
// =======================

function equipWeaponFromWarehouse(weaponId) {
  if (window.isExploring || window.currentEnemy) {
    if (typeof appendLog === "function") {
      appendLog("探索中は装備を変更できない！");
    }
    return;
  }
  if (!weaponId) return;

  // 倉庫にそのIDのインスタンスがあるか確認
  const idx = weaponInstances.findIndex(
    w => w.id === weaponId && (w.location === "warehouse" || !w.location)
  );
  if (idx < 0) {
    appendLog("その武器は倉庫にない！");
    return;
  }

  // 旧装備（インスタンス）を倉庫へ戻す
  if (equippedWeaponIndex != null) {
    const oldInst = weaponInstances[equippedWeaponIndex];
    if (oldInst) {
      oldInst.location = "warehouse";
      weaponCounts[oldInst.id] = (weaponCounts[oldInst.id] || 0) + 1;
    }
  } else if (equippedWeaponId) {
    // 旧仕様互換：IDだけ持っている場合は counts を倉庫に戻す
    weaponCounts[equippedWeaponId] = (weaponCounts[equippedWeaponId] || 0) + 1;
  }

  // 新しい武器インスタンスを倉庫→装備へ
  const inst = weaponInstances[idx];
  inst.location = "equipped";
  equippedWeaponIndex = idx;
  equippedWeaponId    = weaponId;

  // 倉庫カウントを減らす
  weaponCounts[weaponId] = Math.max(0, (weaponCounts[weaponId] || 0) - 1);

  appendLog("武器を装備した。");
  recalcStats();

  if (typeof refreshWarehouseUI === "function") {
    refreshWarehouseUI();
  }
}

function equipArmorFromWarehouse(armorId) {
  if (window.isExploring || window.currentEnemy) {
    if (typeof appendLog === "function") {
      appendLog("探索中は装備を変更できない！");
    }
    return;
  }
  if (!armorId) return;

  const idx = armorInstances.findIndex(
    a => a.id === armorId && (a.location === "warehouse" || !a.location)
  );
  if (idx < 0) {
    appendLog("その防具は倉庫にない！");
    return;
  }

  // 旧装備を倉庫へ戻す
  if (equippedArmorIndex != null) {
    const oldInst = armorInstances[equippedArmorIndex];
    if (oldInst) {
      oldInst.location = "warehouse";
      armorCounts[oldInst.id] = (armorCounts[oldInst.id] || 0) + 1;
    }
  } else if (equippedArmorId) {
    armorCounts[equippedArmorId] = (armorCounts[equippedArmorId] || 0) + 1;
  }

  const inst = armorInstances[idx];
  inst.location = "equipped";
  equippedArmorIndex = idx;
  equippedArmorId    = armorId;

  armorCounts[armorId] = Math.max(0, (armorCounts[armorId] || 0) - 1);

  appendLog("防具を装備した。");
  recalcStats();

  if (typeof refreshWarehouseUI === "function") {
    refreshWarehouseUI();
  }
}