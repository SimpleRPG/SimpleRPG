// game-core.js

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

// 素材
let wood = 0, ore = 0, herb = 0, cloth = 0, leather = 0, water = 0;

// プレイヤー成長
let level = 1, exp = 0, expToNext = BASE_EXP_PER_LEVEL;
let rebirthCount = 0, growthType = 0;

let hpMaxBase = 30, hpMax = 30, hp = 30;
let mpMaxBase = 10, mpMax = 10, mp = 10;
let spMaxBase = 10, spMax = 10, sp = 10;

let STR = 1, VIT = 1, INT_ = 1, DEX_ = 1, LUK_ = 1;
let atkTotal = 0, defTotal = 0, money = 50;

// 職業（最初は未設定）
let jobId = null, jobChangedOnce = false;
let everBeastTamer = false;

// ペット
let petLevel = 1, petExp = 0, petExpToNext = 5;
let petRebirthCount = 0;
let petAtkBase = 3, petHpBase = 10;
let petHpMax = 10, petHp = 10;
let petBuffRate = 1.0, petGrowthType = PET_GROWTH_BALANCE;
let petSkills = [PET_SKILL_DEFS.powerBite, PET_SKILL_DEFS.taunt, PET_SKILL_DEFS.selfHeal];
let petExtraHitRateThisBattle = 0.0;

// 戦闘
let enemyHp = 0, enemyHpMax = 0;
let currentEnemy = null;

// 逃走失敗補正
let escapeFailBonus = 0;

// ボス管理
const areaBossUnlocked = {
  field:  true,
  forest: false,
  cave:   false,
  mine:   false
};
const areaBossCleared = {
  field:  false,
  forest: false,
  cave:   false,
  mine:   false
};
let isBossBattle = false;

// ====== データ系（外部ファイルから） ======
// WEAPONS_INIT / ARMORS_INIT / POTIONS_INIT / MAX_ENHANCE_LEVEL / ENHANCE_SUCCESS_RATES / ENHANCE_COST_MONEY / BASE_DURABILITY
// POTION_TYPE_HP / POTION_TYPE_MP / POTION_TYPE_BOTH / POTION_TYPE_DAMAGE
// GATHER_SKILLS_INIT / GATHER_SKILL_MAX_LV / GATHER_AMOUNT_PARAMS
// CRAFT_SKILLS_INIT / CRAFT_SKILL_MAX_LV / CRAFT_RECIPES
// ENEMIES / AREA_ENEMY_TABLE / AREA_BOSS_ID

// 実際に使うインスタンス
const weapons = WEAPONS_INIT.map(w => ({ ...w }));
const armors  = ARMORS_INIT.map(a => ({ ...a }));
const potions = POTIONS_INIT.map(p => ({ ...p }));

// 所持数
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

// 表示更新用前回値
let prevStats = { hp:null, mp:null, sp:null, money:null };

// =======================
// 共通UI
// =======================
function setLog(msg) {
  const el = document.getElementById("log");
  if (el) el.textContent = msg;
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

// 戦闘コマンドの表示/非表示を制御
function setBattleCommandVisible(visible) {
  const area = document.getElementById("battleCommandArea");
  if (!area) return;
  area.style.display = visible ? "block" : "none";
}

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
  const text = `所持素材：木${wood} / 鉱石${ore} / 草${herb} / 布${cloth} / 皮${leather} / 水${water}`;
  const g = document.getElementById("gatherMaterials");
  const c = document.getElementById("craftMaterials");
  if (g) g.textContent = text;
  if (c) c.textContent = text;
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
        wText = `${w.name}+${wLvl}（耐久:${dur}） →+${wNext} 成功${Math.round(wRate*100)}% / +ATK${wStep} / ${wCost}G（同名武器1個消費）`;
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
        aText = `${a.name}+${aLvl}（耐久:${dur}） →+${aNext} 成功${Math.round(aRate*100)}% / +DEF${aStep} / ${aCost}G（同名防具1個消費）`;
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
    if (petInfoBox) {
      petInfoBox.dataset.status = (petHp <= 0) ? "down" : "alive";
    }
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

  // ステータスタブ
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

  setText("skGatherWoodLv",    gatherSkills.wood.lv);
  setText("skGatherOreLv",     gatherSkills.ore.lv);
  setText("skGatherHerbLv",    gatherSkills.herb.lv);
  setText("skGatherClothLv",   gatherSkills.cloth.lv);
  setText("skGatherLeatherLv", gatherSkills.leather.lv);
  setText("skGatherWaterLv",   gatherSkills.water.lv);

  setText("skCraftWeaponLv", craftSkills.weapon.lv);
  setText("skCraftArmorLv",  craftSkills.armor.lv);
  setText("skCraftPotionLv", craftSkills.potion.lv);
  setText("skCraftToolLv",   craftSkills.tool.lv);

  if(jobId === 2){
    setText("stPetLevel",         petLevel);
    setText("stPetExp",           petExp);
    setText("stPetExpToNext",     petExpToNext);
    setText("stPetRebirthCount",  petRebirthCount);
    setText("stPetGrowthType",    getPetGrowthTypeName());
    setText("stPetHp",            petHp);
    setText("stPetHpMax",         petHpMax);
  }

  togglePetUI();
  updateMaterialTexts();
  refreshUseItemSelect();
  refreshBattleItemSelect();
  updateEnhanceInfo();
  updateSkillButtonsByJob();
}
// =======================
// レベル・転生
// =======================

function applyLevelUpGrowth() {
  const pool=[];
  if(growthType===0) pool.push("STR","STR","STR","VIT","VIT","INT_","DEX_","LUK_");
  else if(growthType===1) pool.push("VIT","VIT","VIT","STR","STR","INT_","DEX_","LUK_");
  else if(growthType===2) pool.push("INT_","INT_","INT_","DEX_","STR","VIT","LUK_");
  else if(growthType===3) pool.push("LUK","LUK","LUK","DEX_","STR","VIT","INT_");
  else pool.push("STR","VIT","INT_","DEX_","LUK_");
  const pick=pool[Math.floor(Math.random()*pool.length)];
  if(pick==="STR")STR++;
  else if(pick==="VIT")VIT++;
  else if(pick==="INT_")INT_++;
  else if(pick==="DEX_")DEX_++;
  else if(pick==="LUK")LUK_++;
}
function getLevelUpRolls() {
  const extra = Math.floor(Math.sqrt(rebirthCount)) + Math.floor(rebirthCount / 20);
  return 1 + extra;
}
function addExp(amount) {
  exp += amount;
  let leveled=false;
  while(exp>=expToNext){
    exp-=expToNext;
    level++; leveled=true;
    hpMax=hpMaxBase+level*2; hp=hpMax;
    mp=mpMax; sp=spMax;
    const rolls = getLevelUpRolls();
    for (let i=0;i<rolls;i++) {
      applyLevelUpGrowth();
    }
    expToNext = BASE_EXP_PER_LEVEL;
  }
  if(leveled) setLog(`レベルアップ！ Lv${level}になった（成長タイプ: ${getGrowthTypeName()}）`);
  updateDisplay();
}
function addPetExp(amount){
  if(jobId!==2)return;
  petExp+=amount;
  let leveled=false;
  while(petExp>=petExpToNext){
    petExp-=petExpToNext; petLevel++; leveled=true;
    if(petGrowthType===PET_GROWTH_TANK){ petHpBase+=7; petAtkBase+=1; }
    else if(petGrowthType===PET_GROWTH_DPS){ petHpBase+=2; petAtkBase+=3; }
    else { petHpBase+=4; petAtkBase+=2; }
    petExpToNext=Math.floor(petExpToNext*1.3);
  }
  if(leveled) setLog(`ペットのレベルが上がった！ Lv${petLevel}`);
  updateDisplay();
}
function applyRebirthBonus(){
  const choices = ["STR","VIT","INT","DEX","LUK","HP","MP","SP"];
  let msgList = [];
  const rolls = 1;
  for (let i = 0; i < rolls; i++) {
    const pick = choices[Math.floor(Math.random()*choices.length)];
    if (pick === "HP")      { hpMaxBase += 3; msgList.push("最大HP +3"); }
    else if (pick === "MP") { mpMaxBase += 2; msgList.push("最大MP +2"); }
    else if (pick === "SP") { spMaxBase += 2; msgList.push("最大SP +2"); }
    else if (pick === "STR"){ STR += 1;      msgList.push("STR +1"); }
    else if (pick === "VIT"){ VIT += 1;      msgList.push("VIT +1"); }
    else if (pick === "INT"){ INT_ += 1;     msgList.push("INT +1"); }
    else if (pick === "DEX"){ DEX_ += 1;     msgList.push("DEX +1"); }
    else if (pick === "LUK"){ LUK_ += 1;     msgList.push("LUK +1"); }
  }
  return "転生ボーナス:\n" + msgList.join("\n");
}
function applyPetRebirthBonus(){ petRebirthCount++; petAtkBase+=2; petHpBase+=8; }

const REBIRTH_LEVEL_REQ=10;
function doRebirth(){
  if(level<REBIRTH_LEVEL_REQ){
    setLog(`転生にはLv${REBIRTH_LEVEL_REQ}以上が必要です`);
    return;
  }
  rebirthCount++;
  growthType=Math.floor(Math.random()*5);
  const bonusMsg=applyRebirthBonus();
  applyPetRebirthBonus();

  level=1;
  exp=0;
  expToNext=BASE_EXP_PER_LEVEL;
  hpMax=hpMaxBase+level*2;
  hp=hpMax;
  mpMax=mpMaxBase;
  mp=mpMax;
  spMax=spMaxBase;
  sp=spMax;

  wood=ore=herb=cloth=leather=water=0;
  money=0;
  Object.keys(weaponCounts).forEach(k=>weaponCounts[k]=0);
  Object.keys(armorCounts).forEach(k=>armorCounts[k]=0);
  Object.keys(potionCounts).forEach(k=>potionCounts[k]=0);
  equippedWeaponId=null; equippedArmorId=null;

  petLevel=1; petExp=0; petExpToNext=5;
  petHpMax = petHpBase + petRebirthCount * 3;
  petHp=petHpMax;

  currentEnemy=null; enemyHp=0; enemyHpMax=0;
  isBossBattle = false;

  setBattleCommandVisible(false);

  setLog(
    `転生した！ 転生回数: ${rebirthCount}\n`+
    `成長タイプ: ${getGrowthTypeName()}\n`+
    `${bonusMsg}\n`+
    `ペット転生回数: ${petRebirthCount}（基礎ATKとHPが強化された）`
  );
  refreshEquipSelects(); updateDisplay();
  updateSkillButtonsByJob();
}

// =======================
// 職業・ペット成長タイプ
// =======================

function openJobModal(){
  const modal = document.getElementById("jobModal");
  const titleEl = document.getElementById("jobModalTitle");
  const msgEl   = document.getElementById("jobModalMessage");
  if (!modal || !titleEl || !msgEl) return;

  if (!jobChangedOnce && jobId === null) {
    // 初回
    titleEl.textContent = "最初に職業を選択";
    msgEl.innerHTML = "最初に職業を1つ選んでください（変更は後から100Gで可能）。<br>※選ぶまでゲームは開始されません。";
  } else {
    // 2回目以降
    titleEl.textContent = "職業を選択";
    msgEl.innerHTML = "職業を1つ選んでください。<br>変更は100Gで可能です。";
  }

  modal.style.display = "block";
}

function closeJobModal(){ document.getElementById("jobModal").style.display="none"; }

function applyJobChange(newJobId){
  if(jobId===newJobId){
    setLog("すでにその職業です");
    closeJobModal();
    return;
  }
  if(jobChangedOnce){
    if(money<100){
      setLog("職業変更には100G必要です");
      closeJobModal();
      return;
    }
    money-=100;
  } else {
    // 初回は無料
    jobChangedOnce=true;
  }

  jobId=newJobId;
  if(newJobId === 2) everBeastTamer = true;

  setLog(`職業を「${getJobName()}」に変更した`);
  closeJobModal();
  updateDisplay();
  updateSkillButtonsByJob();
  if (typeof refreshSkillUIs === "function") {
    refreshSkillUIs();
  }
}

function changePetGrowthType(){
  if(jobId!==2){ setLog("動物使いのみ変更できます"); return; }
  const choice=prompt("ペット成長タイプ: 0=バランス, 1=タンク, 2=アタッカー");
  if(choice===null)return;
  const n=parseInt(choice,10);
  if(![0,1,2].includes(n)){
    setLog("0〜2の番号で選んでください"); return;
  }
  petGrowthType=n;
  setLog(`ペット成長タイプを「${getPetGrowthTypeName()}」に変更した`);
  updateDisplay();
}

// =======================
// 採取
// =======================

function addGatherSkillExp(resourceKey){
  const s = gatherSkills[resourceKey];
  if(!s) return;
  s.exp += 1;
  while(s.exp >= s.expToNext && s.lv < GATHER_SKILL_MAX_LV){
    s.exp -= s.expToNext;
    s.lv++;
    s.expToNext = Math.floor(s.expToNext * 1.3) + 1;
    setLog(`${resourceKey} 採取スキルがLv${s.lv}になった！`);
  }
}
function calcGatherAmount(resourceKey){
  const s = gatherSkills[resourceKey];
  const lv = s ? s.lv : 0;

  const p = GATHER_AMOUNT_PARAMS;
  const base = (Math.random() < p.baseOneProb) ? 1 : 0;
  const guaranteed = Math.floor(p.guaranteedCoeff * (lv / 100));
  let total = Math.max(base, guaranteed);
  const extraChance = p.extraChanceCoeff * (lv / 100);
  if(Math.random() < extraChance){
    total += 1;
  }
  return total;
}
function gather(){
  const target=document.getElementById("gatherTarget").value;
  addGatherSkillExp(target);
  let added = calcGatherAmount(target);

  let jobBonus=0;
  if(jobId===0&&(target==="ore"||target==="leather")) jobBonus=Math.random()<0.2?1:0;
  else if(jobId===1&&(target==="herb"||target==="water")) jobBonus=Math.random()<0.2?1:0;
  else if(jobId===2&&(target==="cloth"||target==="leather")) jobBonus=Math.random()<0.2?1:0;

  const lukBonus=(Math.random() < LUK_*0.01)?1:0;
  added+=jobBonus+lukBonus;
  if(added<0)added=0;

  if(target==="wood")wood+=added;
  else if(target==="ore")ore+=added;
  else if(target==="herb")herb+=added;
  else if(target==="cloth")cloth+=added;
  else if(target==="leather")leather+=added;
  else if(target==="water")water+=added;
  const names={wood:"木",ore:"鉱石",herb:"草",cloth:"布",leather:"皮",water:"水"};
  setLog(`${names[target]} +${added}`);
  updateDisplay();
}

// =======================
// クラフト
// =======================

function hasMaterials(cost){
  if(cost.wood && wood<cost.wood) return false;
  if(cost.ore && ore<cost.ore) return false;
  if(cost.herb && herb<cost.herb) return false;
  if(cost.cloth && cloth<cost.cloth) return false;
  if(cost.leather && leather<cost.leather) return false;
  if(cost.water && water<cost.water) return false;
  return true;
}
function consumeMaterials(cost){
  if(cost.wood)wood-=cost.wood;
  if(cost.ore)ore-=cost.ore;
  if(cost.herb)herb-=cost.herb;
  if(cost.cloth)cloth-=cost.cloth;
  if(cost.leather)leather-=cost.leather;
  if(cost.water)water-=cost.water;
}

function getCraftSkill(category){
  return craftSkills[category];
}
function addCraftSkillExp(category){
  const s = getCraftSkill(category);
  if(!s) return;
  s.exp += 1;
  while(s.exp >= s.expToNext && s.lv < CRAFT_SKILL_MAX_LV){
    s.exp -= s.expToNext;
    s.lv++;
    s.expToNext = Math.floor(s.expToNext * 1.3) + 1;
    setLog(`${category} クラフトスキルがLv${s.lv}になった！`);
  }
}

function craftWeapon(){
  const sel = document.getElementById("weaponSelect");
  if(!sel || !sel.value) return;
  const recipe = CRAFT_RECIPES.weapon.find(r => r.id === sel.value);
  if(!recipe){ setLog("その武器レシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ setLog("素材が足りない"); return; }

  consumeMaterials(recipe.cost);
  weaponCounts[recipe.id] = (weaponCounts[recipe.id] || 0) + 1;
  addCraftSkillExp("weapon");
  setLog(`${recipe.name} をクラフトした`);

  refreshEquipSelects();
  updateDisplay();
}
function craftArmor(){
  const sel = document.getElementById("armorSelect");
  if(!sel || !sel.value) return;
  const recipe = CRAFT_RECIPES.armor.find(r => r.id === sel.value);
  if(!recipe){ setLog("その防具レシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ setLog("素材が足りない"); return; }

  consumeMaterials(recipe.cost);
  armorCounts[recipe.id] = (armorCounts[recipe.id] || 0) + 1;
  addCraftSkillExp("armor");
  setLog(`${recipe.name} をクラフトした`);

  refreshEquipSelects();
  updateDisplay();
}
function craftPotion(){
  const sel = document.getElementById("potionSelect");
  if(!sel || !sel.value) return;
  const recipe = CRAFT_RECIPES.potion.find(r => r.id === sel.value);
  if(!recipe){ setLog("そのポーションレシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ setLog("素材が足りない"); return; }

  consumeMaterials(recipe.cost);
  potionCounts[recipe.id] = (potionCounts[recipe.id] || 0) + 1;
  addCraftSkillExp("potion");
  setLog(`${recipe.name} をクラフトした`);
  updateDisplay();
}

// =======================
// 装備・強化
// =======================

function refreshEquipSelects(){
  const wSel = document.getElementById("weaponEquipSelect");
  const aSel = document.getElementById("armorEquipSelect");
  const wCraftSel = document.getElementById("weaponSelect");
  const aCraftSel = document.getElementById("armorSelect");
  const pCraftSel = document.getElementById("potionSelect");

  if(wSel){
    wSel.innerHTML="";
    weapons.forEach(w=>{
      if(weaponCounts[w.id]>0){
        const opt=document.createElement("option");
        const enh=w.enhance||0;
        const name=enh>0?`${w.name}+${enh}`:w.name;
        opt.value=w.id;
        opt.textContent=`${name}（所持${weaponCounts[w.id]}）`;
        wSel.appendChild(opt);
      }
    });
  }
  if(aSel){
    aSel.innerHTML="";
    armors.forEach(a=>{
      if(armorCounts[a.id]>0){
        const opt=document.createElement("option");
        const enh=a.enhance||0;
        const name=enh>0?`${a.name}+${enh}`:a.name;
        opt.value=a.id;
        opt.textContent=`${name}（所持${armorCounts[a.id]}）`;
        aSel.appendChild(opt);
      }
    });
  }

  if(wCraftSel){
    wCraftSel.innerHTML="";
    CRAFT_RECIPES.weapon.forEach(r=>{
      const opt=document.createElement("option");
      opt.value = r.id;
      opt.textContent = r.name;
      wCraftSel.appendChild(opt);
    });
  }
  if(aCraftSel){
    aCraftSel.innerHTML="";
    CRAFT_RECIPES.armor.forEach(r=>{
      const opt=document.createElement("option");
      opt.value = r.id;
      opt.textContent = r.name;
      aCraftSel.appendChild(opt);
    });
  }
  if(pCraftSel){
    pCraftSel.innerHTML="";
    CRAFT_RECIPES.potion.forEach(r=>{
      const opt=document.createElement("option");
      opt.value = r.id;
      opt.textContent = r.name;
      pCraftSel.appendChild(opt);
    });
  }
}

function equipWeapon(){
  const sel=document.getElementById("weaponEquipSelect");
  if(!sel||!sel.value){ setLog("装備する武器がない"); return; }
  if(weaponCounts[sel.value]<=0){ setLog("その武器を所持していない"); return; }
  equippedWeaponId=sel.value;
  setLog("武器を装備した");
  updateDisplay();
}
function equipArmor(){
  const sel=document.getElementById("armorEquipSelect");
  if(!sel||!sel.value){ setLog("装備する防具がない"); return; }
  if(armorCounts[sel.value]<=0){ setLog("その防具を所持していない"); return; }
  equippedArmorId=sel.value;
  setLog("防具を装備した");
  updateDisplay();
}

// ● 強化用のヘルパー：同名装備を1個素材として消費する（装備中の1本は残す想定）
function consumeOneSameWeaponAsMaterial(weaponId){
  const owned = weaponCounts[weaponId] || 0;
  if(owned <= 1){
    // 装備中の1本しかない or そもそも1本以下 → 素材がない扱い
    return false;
  }
  weaponCounts[weaponId] = owned - 1;
  return true;
}
function consumeOneSameArmorAsMaterial(armorId){
  const owned = armorCounts[armorId] || 0;
  if(owned <= 1){
    return false;
  }
  armorCounts[armorId] = owned - 1;
  return true;
}

function enhanceWeapon(){
  if(!equippedWeaponId){
    setLog("強化する武器が装備されていない");
    return;
  }
  const w = weapons.find(x=>x.id===equippedWeaponId);
  if(!w) return;
  w.enhance = w.enhance || 0;
  if(w.enhance >= MAX_ENHANCE_LEVEL){
    setLog("これ以上強化できない");
    return;
  }

  // 同名武器を1個素材として消費（装備中の1本とは別）
  if(!consumeOneSameWeaponAsMaterial(w.id)){
    setLog("同じ武器がもう1本必要です");
    return;
  }

  const cost = ENHANCE_COST_MONEY[w.enhance];
  if(money < cost){
    setLog("お金が足りない");
    // 素材だけ消えてしまうとキツいので、お金チェックを先にしたいならここを上に移動も可
    return;
  }
  money -= cost;

  const rate = ENHANCE_SUCCESS_RATES[w.enhance];
  if(Math.random()<rate){
    w.enhance++;
    setLog(`武器強化成功！ ${w.name}+${w.enhance}になった（同名武器1本消費）`);
  }else{
    setLog("武器強化失敗…（同名武器は消費された）");
  }
  refreshEquipSelects();
  updateDisplay();
}

function enhanceArmor(){
  if(!equippedArmorId){
    setLog("強化する防具が装備されていない");
    return;
  }
  const a = armors.find(x=>x.id===equippedArmorId);
  if(!a) return;
  a.enhance = a.enhance || 0;
  if(a.enhance >= MAX_ENHANCE_LEVEL){
    setLog("これ以上強化できない");
    return;
  }

  // 同名防具を1個素材として消費
  if(!consumeOneSameArmorAsMaterial(a.id)){
    setLog("同じ防具がもう1つ必要です");
    return;
  }

  const cost = ENHANCE_COST_MONEY[a.enhance];
  if(money < cost){
    setLog("お金が足りない");
    return;
  }
  money -= cost;

  const rate = ENHANCE_SUCCESS_RATES[a.enhance];
  if(Math.random()<rate){
    a.enhance++;
    setLog(`防具強化成功！ ${a.name}+${a.enhance}になった（同名防具1つ消費）`);
  }else{
    setLog("防具強化失敗…（同名防具は消費された）");
  }
  refreshEquipSelects();
  updateDisplay();
}

// =======================
// 戦闘関連
// =======================

function createEnemy(){
  const areaSel = document.getElementById("exploreTarget");
  const area = areaSel ? areaSel.value : "field";
  const table = AREA_ENEMY_TABLE[area] || [];
  if(table.length===0){
    setLog("このエリアには敵がいないようだ…");
    return;
  }
  const id = table[Math.floor(Math.random()*table.length)];
  const enemy = ENEMIES[id];
  if(!enemy){
    setLog("敵データが見つからない");
    return;
  }
  currentEnemy = { ...enemy };
  enemyHpMax = currentEnemy.hp;
  enemyHp = enemyHpMax;
  setLog(`${currentEnemy.name} が現れた！`);
  const info = document.getElementById("exploreInfo");
  if (info) info.textContent = `${currentEnemy.name} が現れた！`;
  setBattleCommandVisible(true);
  updateDisplay();
}

function calcPlayerDamage(){
  const base = atkTotal;
  const variance = Math.floor(base * 0.2);
  const dmg = base + (Math.floor(Math.random()* (variance*2+1)) - variance);
  return Math.max(1, dmg);
}

function calcEnemyDamage(){
  if(!currentEnemy) return 0;
  const base = currentEnemy.atk;
  const variance = Math.floor(base * 0.2);
  const raw = base + (Math.floor(Math.random()*(variance*2+1))-variance);
  const reduced = raw - defTotal;
  return Math.max(1, reduced);
}

function playerAttack(){
  if(!currentEnemy){
    setLog("攻撃する相手がいない");
    return;
  }
  const dmg = calcPlayerDamage();
  enemyHp = Math.max(0, enemyHp - dmg);
  setLog(`あなたの攻撃！ ${currentEnemy.name} に${dmg}ダメージ`);
  if (enemyHp <= 0) {
    winBattle();
    return;
  }
  enemyTurn();
  updateDisplay();
}

function enemyTurn(){
  if(!currentEnemy) return;
  const dmg = calcEnemyDamage();
  hp = Math.max(0, hp - dmg);
  setLog(`${currentEnemy.name} の攻撃！ あなたは${dmg}ダメージを受けた`);
  if(hp <= 0){
    playerDie();
  }
  updateDisplay();
}

function winBattle(){
  if(!currentEnemy) return;
  const gainExp = BASE_EXP_PER_BATTLE;
  const gainG   = 5 + Math.floor(Math.random()*6);
  money += gainG;
  addExp(gainExp);
  if(jobId===2){
    addPetExp(2);
  }
  setLog(`${currentEnemy.name} を倒した！ EXP${gainExp} / ${gainG}G を獲得した。`);
  currentEnemy=null;
  enemyHp=0; enemyHpMax=0;
  setBattleCommandVisible(false);
  const info = document.getElementById("exploreInfo");
  if (info) info.textContent = "敵を倒した。探索を続けよう。";
  updateDisplay();
}

function playerDie(){
  setLog("あなたは倒れてしまった…。お金を半分失った。");
  money = Math.floor(money/2);
  hp = hpMax;
  currentEnemy = null;
  enemyHp = 0; enemyHpMax = 0;
  setBattleCommandVisible(false);
  const info = document.getElementById("exploreInfo");
  if (info) info.textContent = "目が覚めた…。拠点に戻ってきたようだ。";
  updateDisplay();
}

function tryEscape(){
  if(!currentEnemy){
    setLog("戦闘中ではない。");
    return;
  }
  const baseRate = 0.4 + escapeFailBonus;
  const luckBonus = LUK_ * 0.01;
  const rate = Math.min(0.9, baseRate + luckBonus);
  if(Math.random() < rate){
    setLog("うまく逃げ切れた！");
    currentEnemy=null;
    enemyHp=0; enemyHpMax=0;
    escapeFailBonus = 0;
    setBattleCommandVisible(false);
    const info = document.getElementById("exploreInfo");
    if (info) info.textContent = "その場から離れた…。";
    updateDisplay();
  }else{
    setLog("逃走に失敗した！");
    escapeFailBonus += 0.1;
    enemyTurn();
  }
}

// =======================
// 探索イベント
// =======================

function doExploreEvent(){
  if (currentEnemy) {
    setLog("すでに敵と戦闘中だ。");
    return;
  }

  const areaSel = document.getElementById("exploreTarget");
  const area = areaSel ? areaSel.value : "field";

  const r = Math.random();
  if (r < 0.5) {
    // 戦闘イベント
    createEnemy();
    return;
  }

  // 戦闘でないときはコマンド非表示（保険）
  setBattleCommandVisible(false);

  if (r < 0.7) {
    const gain = 1 + Math.floor(Math.random()*2);
    if (area === "field") {
      wood += gain;
      setLog(`草原を歩き回った。木を${gain}個見つけた。`);
    } else if (area === "forest") {
      wood += gain;
      herb += gain;
      setLog(`森を探索し、木と草を少し見つけた（木${gain}, 草${gain}）。`);
    } else if (area === "cave") {
      ore += gain;
      setLog(`洞窟の岩場で鉱石を${gain}個見つけた。`);
    } else if (area === "mine") {
      ore += gain+1;
      setLog(`廃鉱山を探索し、上質な鉱石を${gain+1}個掘り出した。`);
    }
    updateDisplay();
  } else if (r < 0.85) {
    const g = 5 + Math.floor(Math.random()*6);
    money += g;
    setLog(`探索中に落ちていた財布を見つけた。${g}G手に入れた。`);
    updateDisplay();
  } else {
    setLog("しばらく歩き回ったが、特に何も見つからなかった…");
  }
}

// =======================
// アイテム使用
// =======================

function usePotionOutsideBattle(){
  const sel=document.getElementById("useItemSelect");
  if(!sel || !sel.value){
    setLog("使用するアイテムを選んでください");
    return;
  }
  const p = potions.find(x=>x.id===sel.value);
  if(!p || potionCounts[p.id]<=0){
    setLog("そのアイテムを所持していない");
    return;
  }
  if(p.type===POTION_TYPE_HP || p.type===POTION_TYPE_BOTH){
    const heal = p.power;
    hp = Math.min(hp+heal, hpMax);
    setLog(`${p.name} を使った。HPが${heal}回復した。`);
  }else if(p.type===POTION_TYPE_MP){
    const heal = p.power;
    mp = Math.min(mp+heal, mpMax);
    setLog(`${p.name} を使った。MPが${heal}回復した。`);
  }
  potionCounts[p.id]--;
  updateDisplay();
}

function useBattleItem(){
  const sel=document.getElementById("battleItemSelect");
  if(!sel || !sel.value){
    setLog("戦闘で使うアイテムを選んでください");
    return;
  }
  if(!currentEnemy){
    setLog("敵がいないので使用できない");
    return;
  }
  const p = potions.find(x=>x.id===sel.value);
  if(!p || potionCounts[p.id]<=0){
    setLog("そのアイテムを所持していない");
    return;
  }
  if(p.type===POTION_TYPE_DAMAGE){
    const dmg = p.power;
    enemyHp = Math.max(0, enemyHp - dmg);
    setLog(`${p.name} を投げつけた！ ${currentEnemy.name} に${dmg}ダメージ！`);
    potionCounts[p.id]--;
    if(enemyHp<=0){
      winBattle();
    }else{
      enemyTurn();
    }
  }else{
    setLog("そのアイテムは戦闘アイテムとして使えない");
  }
  updateDisplay();
}

// =======================
// ショップ
// =======================

function buyPotion(potionId, price){
  if(money < price){
    setLog("お金が足りない");
    return;
  }
  const p = potions.find(x=>x.id===potionId);
  if(!p){
    setLog("商品データが存在しない");
    return;
  }
  money -= price;
  potionCounts[p.id] = (potionCounts[p.id] || 0) + 1;
  setLog(`${p.name} を購入した`);
  updateDisplay();
}

// =======================
// 初期化
// =======================

// 「最初の職業を選んでください。」をもう出したかどうか
let firstJobMessageShown = false;

function initGame(){
  refreshEquipSelects();
  updateDisplay();
  setBattleCommandVisible(false);
  if (typeof refreshSkillUIs === "function") {
    refreshSkillUIs();
  }

  // ページ読み込み時は毎回 jobId は null からスタートする前提で、
  // モーダルは毎回開いて OK（毎回最初から遊ぶ想定だから）。
  if (jobId === null) {
    openJobModal();

    // ★ このメッセージは一度だけ
    if (!firstJobMessageShown) {
      setLog("最初の職業を選んでください。");
      firstJobMessageShown = true;
    }
  }
}
