// game-core-1.js
// 共通定数・グローバル状態・UIヘルパ・ステータス計算・表示

// =======================
// 共通定数・データ
// =======================

const RATE_EASY = 0.7;
const RATE_MID  = 0.6;
const RATE_HARD = 0.5;

// ペット関係
const PET_SKILL_TRY_RATE = 0.3;
const PET_GROWTH_BALANCE = 0;
const PET_GROWTH_TANK    = 1;
const PET_GROWTH_DPS     = 2;

const PET_SKILL_DEFS = {
  powerBite: { id:"powerBite", name:"パワーバイト", type:"attack", powerRate:1.6 },
  taunt:     { id:"taunt",     name:"威嚇吠え",     type:"taunt",  extraPetHitRate:0.3 },
  selfHeal:  { id:"selfHeal",  name:"自己回復",     type:"heal",   healRate:0.3 }
};

// 転生・レベル関連
const REBIRTH_WEAPON_SCALE_PER = 0.03;
const BASE_EXP_PER_LEVEL = 100;
const BASE_EXP_PER_BATTLE = 25;

// =======================
// グローバル状態
// =======================

// 素材（tier別カウント）
const materials = {
  wood:    { t1: 0, t2: 0, t3: 0, t4: 0 },
  ore:     { t1: 0, t2: 0, t3: 0, t4: 0 },
  herb:    { t1: 0, t2: 0, t3: 0, t4: 0 },
  cloth:   { t1: 0, t2: 0, t3: 0, t4: 0 },
  leather: { t1: 0, t2: 0, t3: 0, t4: 0 },
  water:   { t1: 0, t2: 0, t3: 0, t4: 0 }
};

// 互換用の合計getter
function getMatTotal(key) {
  const m = materials[key];
  if (!m) return 0;
  return (m.t1 || 0) + (m.t2 || 0) + (m.t3 || 0);
}

// 既存コードとの互換用「見かけ上の値」
let wood = 0, ore = 0, herb = 0, cloth = 0, leather = 0, water = 0;

// プレイヤー成長
let level = 1, exp = 0, expToNext = BASE_EXP_PER_LEVEL;
let rebirthCount = 0, growthType = 0;

let hpMaxBase = 30, hpMax = 30, hp = 30;
let mpMaxBase = 10, mpMax = 10, mp = 10;
let spMaxBase = 10, spMax = 10, sp = 10;

let STR = 1, VIT = 1, INT_ = 1, DEX_ = 1, LUK_ = 1;
let atkTotal = 0, defTotal = 0, money = 50;

// 職業
let jobId = null, jobChangedOnce = false;
let everBeastTamer = false;

// ペット
let petLevel = 1, petExp = 0, petExpToNext = 5;
let petRebirthCount = 0;
let petAtkBase = 8, petHpBase = 24;
let petHpMax = petHpBase;
let petHp = petHpMax;
let petBuffRate = 1.0, petGrowthType = PET_GROWTH_BALANCE;
let petSkills = [PET_SKILL_DEFS.powerBite, PET_SKILL_DEFS.taunt, PET_SKILL_DEFS.selfHeal];
let petExtraHitRateThisBattle = 0.0;

// 戦闘
let enemyHp = 0, enemyHpMax = 0;
let currentEnemy = null;

// 逃走失敗補正
let escapeFailBonus = 0;

// ボス管理（旧仕様用のフラグは削除し、シンプルに「ボスかどうか」だけ持つ）
let isBossBattle = false;

// ====== 採取エリア解放（スキルLv依存） ======

// 一度でも条件を満たしたら true にして、表示は維持
const gatherAreaUnlocked = {
  field1: true,   // T1エリア: 最初から
  field2: false,  // T2エリア: スキルLv10以上で一度でも達成したら解放
  field3: false   // T3エリア: スキルLv20以上で一度でも達成したら解放
};

// 各エリアの必要スキルLv（現在Lvが足りないと採取できない）
const GATHER_FIELD_REQUIRE_LV = {
  field1: 0,
  field2: 10,
  field3: 20
};

// ====== データ系（外部ファイルから） ======
console.log("game-core-1.js start");

const weapons = WEAPONS_INIT.map(w => ({ ...w }));
const armors  = ARMORS_INIT.map(a => ({ ...a }));
const potions = POTIONS_INIT.map(p => ({ ...p }));

const weaponCounts = {}; weapons.forEach(w => weaponCounts[w.id] = 0);
const armorCounts  = {}; armors.forEach(a => armorCounts[a.id] = 0);
const potionCounts = {}; potions.forEach(p => potionCounts[p.id] = 0);

let equippedWeaponId = null;
let equippedArmorId  = null;

// 採取スキル
const gatherSkills = {};
Object.keys(GATHER_SKILLS_INIT).forEach(k=>{
  const v = GATHER_SKILLS_INIT[k];
  gatherSkills[k] = { lv:v.lv, exp:v.exp, expToNext:v.expToNext };
});

// クラフトスキル
const craftSkills = {};
Object.keys(CRAFT_SKILLS_INIT).forEach(cat=>{
  const v = CRAFT_SKILLS_INIT[cat];
  craftSkills[cat] = { lv:v.lv, exp:v.exp, expToNext:v.expToNext };
});

let prevStats = { hp:null, mp:null, sp:null, money:null };

// =======================
// 共通UI
// =======================

function setLog(msg) {
  const el = document.getElementById("log");
  if (el) el.textContent = msg;
}
function appendLog(msg) {
  const el = document.getElementById("log");
  if (!el) return;
  const old = el.textContent || "";
  let lines = old ? old.split("\n") : [];
  lines.push(msg);
  if (lines.length > 10) lines = lines.slice(lines.length - 10);
  el.textContent = lines.join("\n");
}
function flashStat(id, className) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}
function animateIfChanged(id, newValue, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = newValue;
  if (prevStats[key] !== null && prevStats[key] !== newValue) {
    flashStat(id, "stat-anim");
  }
  prevStats[key] = newValue;
}
function setText(id, value){
  const el = document.getElementById(id);
  if(el) el.textContent = value;
}

function getGrowthTypeName() {
  if (growthType === 0) return "STR型";
  if (growthType === 1) return "VIT型";
  if (growthType === 2) return "INT型";
  if (growthType === 3) return "LUK型";
  return "バランス型";
}
function getJobName() {
  if (jobId === 0) return "戦士";
  if (jobId === 1) return "魔法使い";
  if (jobId === 2) return "動物使い";
  return "未設定";
}
function getPetGrowthTypeName() {
  if (petGrowthType === PET_GROWTH_TANK) return "タンク型";
  if (petGrowthType === PET_GROWTH_DPS)  return "アタッカー型";
  return "バランス型";
}

function togglePetUI() {
  if(!everBeastTamer){
    const petInfo = document.getElementById("petInfo");
    if (petInfo) petInfo.style.display = "none";
    document.querySelectorAll(".pet-only").forEach(el => {
      el.style.display = "none";
    });
    return;
  }
  const isBeastTamer = jobId === 2;
  const petInfo = document.getElementById("petInfo");
  if (petInfo) petInfo.style.display = isBeastTamer ? "block" : "none";
  document.querySelectorAll(".pet-only").forEach(el => {
    el.style.display = isBeastTamer ? "inline-block" : "none";
  });
}

function setBattleCommandVisible(visible) {
  const area = document.getElementById("battleCommandArea");
  if (!area) return;
  area.style.display = visible ? "block" : "none";
}

function getCurrentArea() {
  const sel = document.getElementById("exploreTarget");
  return sel ? sel.value : "field";
}
// エリアごとの「ボスを倒したことがあるか」
const areaBossCleared = {
  field:  false,
  forest: false,
  cave:   false,
  mine:   false
};
// ★ ボタン表示は「今ボスに挑めるか」を見る（実体は game-core-3.js の areaBossAvailable）
function updateBossButtonUI() {
  const bossBtn = document.getElementById("bossStartBtn");
  if (!bossBtn) return;
  if (typeof areaBossAvailable === "undefined") {
    bossBtn.style.display = "none";
    return;
  }
  const area = getCurrentArea();
  if (areaBossAvailable[area]) {
    bossBtn.style.display = "inline-block";
  } else {
    bossBtn.style.display = "none";
  }
}

// =======================
// 採取エリアセレクト更新＆解放チェック
// =======================

function checkGatherAreaUnlockBySkill(resourceKey) {
  const s = gatherSkills[resourceKey];
  if (!s) return;
  const lv = s.lv;

  if (!gatherAreaUnlocked.field2 && lv >= GATHER_FIELD_REQUIRE_LV.field2) {
    gatherAreaUnlocked.field2 = true;
    appendLog("採取エリア：星降りの丘(T1/T2)が解放された！");
  }
  if (!gatherAreaUnlocked.field3 && lv >= GATHER_FIELD_REQUIRE_LV.field3) {
    gatherAreaUnlocked.field3 = true;
    appendLog("採取エリア：翠風の谷(T1/T2/T3)が解放された！");
  }

  refreshGatherFieldSelect();
}

function refreshGatherFieldSelect() {
  const sel = document.getElementById("gatherField");
  if (!sel) return;
  const current = sel.value;

  sel.innerHTML = "";

  const f1 = document.createElement("option");
  f1.value = "field1";
  f1.textContent = "近郊の原っぱ(T1のみ)";
  sel.appendChild(f1);

  if (gatherAreaUnlocked.field2) {
    const f2 = document.createElement("option");
    f2.value = "field2";
    f2.textContent = "星降りの丘(T1多/T2少)";
    sel.appendChild(f2);
  }

  if (gatherAreaUnlocked.field3) {
    const f3 = document.createElement("option");
    f3.value = "field3";
    f3.textContent = "翠風の谷(T1/T2/T3)";
    sel.appendChild(f3);
  }

  const hasCurrent = Array.from(sel.options).some(o => o.value === current);
  sel.value = hasCurrent ? current : sel.options[0].value;
}

let intermediateMats = {
  woodPlank_T1: 0,
  woodPlank_T2: 0,
  woodPlank_T3: 0,
  ironIngot_T1: 0,
  ironIngot_T2: 0,
  ironIngot_T3: 0,
  clothBolt_T1: 0,
  clothBolt_T2: 0,
  clothBolt_T3: 0,
  toughLeather_T1: 0,
  toughLeather_T2: 0,
  toughLeather_T3: 0
};
// =======================
// ステータス計算・表示
// =======================

function calcWeaponEffectiveAtk(w) {
  if (!w) return 0;
  const enhanceBonus = (w.enhance || 0) * (w.enhanceStep || 1);
  const base = w.atk + enhanceBonus;
  const scale = 1 + REBIRTH_WEAPON_SCALE_PER * rebirthCount;
  return Math.floor(base * scale);
}
function calcArmorEffectiveDef(a, baseVIT) {
  if (!a) return 0;
  const enhanceBonus = (a.enhance || 0) * (a.enhanceStep || 1);
  return a.def + enhanceBonus + Math.floor(baseVIT * (a.scaleVit || 0));
}
function recalcStats() {
  let baseSTR = STR, baseVIT = VIT, baseINT = INT_;
  let jobMpBonusRate = 0;
  if (jobId === 0) {
    baseSTR = Math.floor(baseSTR * 1.2);
    baseVIT = Math.floor(baseVIT * 1.1);
  } else if (jobId === 1) {
    baseINT = Math.floor(baseINT * 1.2);
    jobMpBonusRate = 0.2;
  }
  const intMpBonus = Math.floor(baseINT * 1.0);
  mpMax = Math.floor(mpMaxBase * (1 + jobMpBonusRate)) + intMpBonus;
  if (mp > mpMax) mp = mpMax;
  spMax = spMaxBase;
  if (sp > spMax) sp = spMax;

  let atk = baseSTR;
  let equipDef = 0;
  if (equippedWeaponId) {
    const w = weapons.find(x => x.id === equippedWeaponId);
    if (w) {
      const effAtk = calcWeaponEffectiveAtk(w);
      atk += effAtk
           + Math.floor(baseSTR * (w.scaleStr||0))
           + Math.floor(baseINT * (w.scaleInt||0));
      if (w.id === "greatShield") {
        equipDef += 2 + Math.floor(baseVIT * 0.1);
      }
    }
  }
  if (equippedArmorId) {
    const a = armors.find(x => x.id === equippedArmorId);
    if (a) {
      equipDef += calcArmorEffectiveDef(a, baseVIT);
    }
  }
  const vitDef = Math.floor(baseVIT * 0.5);
  defTotal = vitDef + equipDef;
  atkTotal = atk;

  setText("str", baseSTR);
  setText("vit", baseVIT);
  setText("int", baseINT);
  setText("dex", DEX_);
  setText("luk", LUK_);
}

function updateMaterialTexts() {
  wood    = getMatTotal("wood");
  ore     = getMatTotal("ore");
  herb    = getMatTotal("herb");
  cloth   = getMatTotal("cloth");
  leather = getMatTotal("leather");
  water   = getMatTotal("water");

  const simpleText = `所持素材：木${wood} / 鉱石${ore} / 草${herb} / 布${cloth} / 皮${leather} / 水${water}`;
  const g = document.getElementById("gatherMaterials");
  const c = document.getElementById("craftMaterials");
  if (g) g.textContent = simpleText;
  if (c) c.textContent = simpleText;

  const names = { wood:"木", ore:"鉱石", herb:"草", cloth:"布", leather:"皮", water:"水" };
  const keys  = ["wood","ore","herb","cloth","leather","water"];

  const detailLines = keys.map(k => {
  const m = materials[k];
  const t1 = m.t1 || 0;
  const t2 = m.t2 || 0;
  const t3 = m.t3 || 0;
  const t4 = m.t4 || 0;
  const total = t1 + t2 + t3 + t4;
  return `${names[k]}: 合計${total} (T1:${t1}/T2:${t2}/T3:${t3}/T4:${t4})`;
});

  const detailText = detailLines.join("\n");
  const gDetail = document.getElementById("gatherMatDetail");
  const cDetail = document.getElementById("craftMatDetail");
  if (gDetail) gDetail.textContent = detailText;
  if (cDetail) cDetail.textContent = detailText;
}

function refreshUseItemSelect() {
  const sel = document.getElementById("useItemSelect");
  if (!sel) return;
  sel.innerHTML = "";
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "選択しない";
  sel.appendChild(none);
  potions.forEach(p => {
    if (p.type === POTION_TYPE_DAMAGE) return;
    if (potionCounts[p.id] > 0) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name}（${potionCounts[p.id]}）`;
      sel.appendChild(opt);
    }
  });
}

function refreshBattleItemSelect() {
  const sel = document.getElementById("battleItemSelect");
  if (!sel) return;
  sel.innerHTML = "";
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "選択しない";
  sel.appendChild(none);
  potions.forEach(p => {
    if (potionCounts[p.id] > 0) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name}（${potionCounts[p.id]}）`;
      sel.appendChild(opt);
    }
  });
}

function updateEnhanceInfo() {
  const info = document.getElementById("enhanceInfo");
  if (!info) return;
  let wText = "武器なし";
  if (equippedWeaponId) {
    const w = weapons.find(x => x.id === equippedWeaponId);
    if (w) {
      const wLvl = w.enhance || 0;
      const wEff = calcWeaponEffectiveAtk(w);
      const dur  = (w.durability != null) ? w.durability : "-";
      if (wLvl >= MAX_ENHANCE_LEVEL) {
        wText = `${w.name}+${MAX_ENHANCE_LEVEL}（ATK:${wEff}, 耐久:${dur}）`;
      } else {
        const wNext = wLvl + 1;
        const wStep = w.enhanceStep || 1;
        const wRate = ENHANCE_SUCCESS_RATES[wLvl];
        const wCost = ENHANCE_COST_MONEY[wLvl];
        wText = `${w.name}+${wLvl}（耐久:${dur}） →+${wNext} 成功${Math.round(wRate*100)}% / +ATK${wStep} / ${wCost}G（同名武器1本消費）`;
      }
    }
  }
  let aText = "防具なし";
  if (equippedArmorId) {
    const a = armors.find(x => x.id === equippedArmorId);
    if (a) {
      const aLvl = a.enhance || 0;
      const baseVIT = VIT;
      const aEff = calcArmorEffectiveDef(a, baseVIT);
      const dur  = (a.durability != null) ? a.durability : "-";
      if (aLvl >= MAX_ENHANCE_LEVEL) {
        aText = `${a.name}+${MAX_ENHANCE_LEVEL}（DEF:${aEff}, 耐久:${dur}）`;
      } else {
        const aNext = aLvl + 1;
        const aStep = a.enhanceStep || 1;
        const aRate = ENHANCE_SUCCESS_RATES[aLvl];
        const aCost = ENHANCE_COST_MONEY[aLvl];
        aText = `${a.name}+${aLvl}（耐久:${dur}） →+${aNext} 成功${Math.round(aRate*100)}% / +DEF${aStep} / ${aCost}G（同名防具1つ消費）`;
      }
    }
  }
  info.textContent = `武器: ${wText} / 防具: ${aText}`;
}

function updateSkillButtonsByJob() {
  const magicBtn = document.getElementById("castMagicBtn");
  const skillBtn = document.getElementById("useSkillBtn");
  if (!magicBtn || !skillBtn) return;

  if (jobId === 0) {
    magicBtn.style.display = "none";
    skillBtn.style.display = "inline-block";
  } else if (jobId === 1) {
    magicBtn.style.display = "inline-block";
    skillBtn.style.display = "none";
  } else if (jobId === 2) {
    magicBtn.style.display = "inline-block";
    skillBtn.style.display = "inline-block";
  } else {
    magicBtn.style.display = "inline-block";
    skillBtn.style.display = "inline-block";
  }
}

function updateDisplay() {
  recalcStats();
  animateIfChanged("hp", hp, "hp");
  animateIfChanged("hpMax", hpMax, "hpMax");
  animateIfChanged("mp", mp, "mp");
  animateIfChanged("sp", sp, "sp");
  animateIfChanged("money", money, "money");

  setText("atkTotal", atkTotal);
  setText("defTotal", defTotal);

  setText("level", level);
  setText("exp", `${exp} / ${expToNext}`);
  setText("rebirthCount", rebirthCount);
  setText("growthType", getGrowthTypeName());
  setText("jobName", getJobName());

  if (jobId === 2) {
    petHpMax = petHpBase + petRebirthCount * 3;
    if (petHp > petHpMax) petHp = petHpMax;
    setText("petLevel", petLevel);
    setText("petExp", petExp);
    setText("petExpToNext", petExpToNext);
    setText("petRebirthCount", petRebirthCount);
    setText("petHp", petHp);
    setText("petHpMax", petHpMax);
    setText("petGrowthTypeLabel", getPetGrowthTypeName());

    const petInfoBox = document.getElementById("petInfo");
    if (petInfoBox) petInfoBox.dataset.status = (petHp <= 0) ? "down" : "alive";
  }

  const weaponNameSpan = document.getElementById("equippedWeaponName");
  const armorNameSpan  = document.getElementById("equippedArmorName");
  if (weaponNameSpan) {
    if (equippedWeaponId) {
      const w = weapons.find(x => x.id === equippedWeaponId);
      if (w) {
        const lvlW = w.enhance || 0;
        const name = lvlW > 0 ? `${w.name}+${lvlW}` : w.name;
        weaponNameSpan.textContent = name;
      } else {
        weaponNameSpan.textContent = "不明な武器";
      }
    } else weaponNameSpan.textContent = "なし";
  }
  if (armorNameSpan) {
    if (equippedArmorId) {
      const a = armors.find(x => x.id === equippedArmorId);
      armorNameSpan.textContent = a ? (a.enhance ? `${a.name}+${a.enhance}` : a.name) : "不明な防具";
    } else armorNameSpan.textContent = "なし";
  }

  setText("stLevel", level);
  setText("stExp", exp);
  setText("stExpToNext", expToNext);
  setText("stRebirthCount", rebirthCount);
  setText("stGrowthType", getGrowthTypeName());
  setText("stJobName", getJobName());

  setText("stSTR", STR);
  setText("stVIT", VIT);
  setText("stINT", INT_);
  setText("stDEX", DEX_);
  setText("stLUK", LUK_);

  setText("stAtkTotal", atkTotal);
  setText("stDefTotal", defTotal);
  setText("stHpMax", hpMax);
  setText("stMpMax", mpMax);
  setText("stSpMax", spMax);

  if(jobId === 2){
    setText("stPetLevel",         petLevel);
    setText("stPetExp",           petExp);
    setText("stPetExpToNext",     petExpToNext);
    setText("stPetRebirthCount",  petRebirthCount);
    setText("stPetGrowthType",    getPetGrowthTypeName());
    setText("stPetHp",            petHp);
    setText("stPetHpMax",         petHpMax);
  }

  // 敵表示（戦闘中だけ枠を出す）
  const enemyNameSpan  = document.getElementById("enemyNameText");
  const enemyHpSpan    = document.getElementById("enemyHpText");
  const enemyHpMaxSpan = document.getElementById("enemyHpMaxText");
  const enemyArea      = document.getElementById("enemyStatusArea");

  if (currentEnemy && enemyHpMax > 0) {
    if (enemyNameSpan)  enemyNameSpan.textContent  = currentEnemy.name;
    if (enemyHpSpan)    enemyHpSpan.textContent    = enemyHp;
    if (enemyHpMaxSpan) enemyHpMaxSpan.textContent = enemyHpMax;
    if (enemyArea)      enemyArea.style.display    = "block";
  } else {
    if (enemyNameSpan)  enemyNameSpan.textContent  = "-";
    if (enemyHpSpan)    enemyHpSpan.textContent    = "0";
    if (enemyHpMaxSpan) enemyHpMaxSpan.textContent = "0";
    if (enemyArea)      enemyArea.style.display    = "none";
  }

  togglePetUI();
  updateMaterialTexts();
  refreshUseItemSelect();
  refreshBattleItemSelect();
  updateEnhanceInfo();
  updateSkillButtonsByJob();

  // スキルレベル表示
  if (gatherSkills) {
    setText("skGatherWoodLv",    gatherSkills.wood.lv);
    setText("skGatherOreLv",     gatherSkills.ore.lv);
    setText("skGatherHerbLv",    gatherSkills.herb.lv);
    setText("skGatherClothLv",   gatherSkills.cloth.lv);
    setText("skGatherLeatherLv", gatherSkills.leather.lv);
    setText("skGatherWaterLv",   gatherSkills.water.lv);
  }
  if (craftSkills) {
    setText("skCraftWeaponLv",  craftSkills.weapon.lv);
    setText("skCraftArmorLv",   craftSkills.armor.lv);
    setText("skCraftPotionLv",  craftSkills.potion.lv);
  }

  if (typeof updateBattleSkillUIByJob === "function") {
    updateBattleSkillUIByJob();
  }
  updateBossButtonUI();
  refreshGatherFieldSelect();

  // ★ 帰還ボタンの表示更新
  if (typeof updateReturnTownButton === "function") {
    updateReturnTownButton();
  }
}