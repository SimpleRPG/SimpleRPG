// game-core-2.js
// レベル・転生・職業・採取・クラフト・装備・強化

// =======================
// レベル・転生
// =======================

function applyLevelUpGrowth() {
  const pool=[];
  if(growthType===0) pool.push("STR","STR","STR","VIT","VIT","INT_","DEX_","LUK");
  else if(growthType===1) pool.push("VIT","VIT","VIT","STR","STR","INT_","DEX_","LUK");
  else if(growthType===2) pool.push("INT_","INT_","INT_","DEX_","STR","VIT","LUK");
  else if(growthType===3) pool.push("LUK","LUK","LUK","DEX_","STR","VIT","INT_");
  else pool.push("STR","VIT","INT_","DEX_","LUK");
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
  if(leveled) appendLog(`レベルアップ！ Lv${level}になった（成長タイプ: ${getGrowthTypeName()}）`);
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
  if(leveled) appendLog(`ペットのレベルが上がった！ Lv${petLevel}`);
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
    appendLog(`転生にはLv${REBIRTH_LEVEL_REQ}以上が必要です`);
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
  const modal   = document.getElementById("jobModal");
  const titleEl = document.getElementById("jobModalTitle");
  const msgEl   = document.getElementById("jobModalMessage");
  if (!modal || !titleEl || !msgEl) return;

  if (!jobChangedOnce && jobId === null) {
    titleEl.textContent = "最初に職業を選択";
    msgEl.innerHTML = "最初に職業を1つ選んでください（変更は後から100Gで可能）。<br>※選ぶまでゲームは開始されません。";
  } else {
    titleEl.textContent = "職業を選択";
    msgEl.innerHTML = "職業を1つ選んでください。<br>変更は100Gで可能です。";
  }

  modal.style.display = "flex";
}

function closeJobModal() {
  document.getElementById("jobModal").style.display = "none";
}

function applyJobChange(newJobId){
  if(jobId===newJobId){
    appendLog("すでにその職業です");
    closeJobModal();
    return;
  }
  if(jobChangedOnce){
    if(money<100){
      appendLog("職業変更には100G必要です");
      closeJobModal();
      return;
    }
    money-=100;
  } else {
    jobChangedOnce=true;
  }

  jobId=newJobId;
  if(newJobId === 2) everBeastTamer = true;

  appendLog(`職業を「${getJobName()}」に変更した`);
  closeJobModal();
  updateDisplay();
  updateSkillButtonsByJob();

  if (typeof refreshSkillUIs === "function") {
    refreshSkillUIs();
  }
  if (typeof updateBattleSkillUIByJob === "function") {
    updateBattleSkillUIByJob();
  }
  updateBossButtonUI();
}

function changePetGrowthType(){
  if(jobId!==2){ appendLog("動物使いのみ変更できます"); return; }
  const choice=prompt("ペット成長タイプ: 0=バランス, 1=タンク, 2=アタッカー");
  if(choice===null)return;
  const n=parseInt(choice,10);
  if(![0,1,2].includes(n)){
    appendLog("0〜2の番号で選んでください"); return;
  }
  petGrowthType=n;
  appendLog(`ペット成長タイプを「${getPetGrowthTypeName()}」に変更した`);
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
    appendLog(`${resourceKey} 採取スキルがLv${s.lv}になった！`);
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
  appendLog(`${names[target]} +${added}`);
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
    appendLog(`${category} クラフトスキルがLv${s.lv}になった！`);
  }
}

function craftWeapon(){
  const sel = document.getElementById("weaponSelect");
  if(!sel || !sel.value) return;
  const recipe = CRAFT_RECIPES.weapon.find(r => r.id === sel.value);
  if(!recipe){ appendLog("その武器レシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ appendLog("素材が足りない"); return; }

  consumeMaterials(recipe.cost);
  weaponCounts[recipe.id] = (weaponCounts[recipe.id] || 0) + 1;
  addCraftSkillExp("weapon");
  appendLog(`${recipe.name} をクラフトした`);

  refreshEquipSelects();
  updateDisplay();
}
function craftArmor(){
  const sel = document.getElementById("armorSelect");
  if(!sel || !sel.value) return;
  const recipe = CRAFT_RECIPES.armor.find(r => r.id === sel.value);
  if(!recipe){ appendLog("その防具レシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ appendLog("素材が足りない"); return; }

  consumeMaterials(recipe.cost);
  armorCounts[recipe.id] = (armorCounts[recipe.id] || 0) + 1;
  addCraftSkillExp("armor");
  appendLog(`${recipe.name} をクラフトした`);

  refreshEquipSelects();
  updateDisplay();
}
function craftPotion(){
  const sel = document.getElementById("potionSelect");
  if(!sel || !sel.value) return;
  const recipe = CRAFT_RECIPES.potion.find(r => r.id === sel.value);
  if(!recipe){ appendLog("そのポーションレシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ appendLog("素材が足りない"); return; }

  consumeMaterials(recipe.cost);
  potionCounts[recipe.id] = (potionCounts[recipe.id] || 0) + 1;
  addCraftSkillExp("potion");
  appendLog(`${recipe.name} をクラフトした`);
  updateDisplay();
}

// =======================
// 装備・強化
// =======================

function refreshEquipSelects(){
  // 起動直後で core がまだなら、安全に抜ける
  if (typeof weapons === "undefined" || typeof armors === "undefined") {
    console.warn("game-core-2: weapons/armors が未初期化のため、refreshEquipSelects をスキップ");
    return;
  }

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
  if(!sel||!sel.value){ appendLog("装備する武器がない"); return; }
  if(weaponCounts[sel.value]<=0){ appendLog("その武器を所持していない"); return; }
  equippedWeaponId=sel.value;
  appendLog("武器を装備した");
  updateDisplay();
}
function equipArmor(){
  const sel=document.getElementById("armorEquipSelect");
  if(!sel||!sel.value){ appendLog("装備する防具がない"); return; }
  if(armorCounts[sel.value]<=0){ appendLog("その防具を所持していない"); return; }
  equippedArmorId=sel.value;
  appendLog("防具を装備した");
  updateDisplay();
}

function consumeOneSameWeaponAsMaterial(weaponId){
  const owned = weaponCounts[weaponId] || 0;
  if(owned <= 1){
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
    appendLog("強化する武器が装備されていない");
    return;
  }
  const w = weapons.find(x=>x.id===equippedWeaponId);
  if(!w) return;
  w.enhance = w.enhance || 0;
  if(w.enhance >= MAX_ENHANCE_LEVEL){
    appendLog("これ以上強化できない");
    return;
  }

  if(!consumeOneSameWeaponAsMaterial(w.id)){
    appendLog("同じ武器がもう1本必要です");
    return;
  }

  const cost = ENHANCE_COST_MONEY[w.enhance];
  if(money < cost){
    appendLog("お金が足りない");
    return;
  }
  money -= cost;

  const rate = ENHANCE_SUCCESS_RATES[w.enhance];
  if(Math.random()<rate){
    w.enhance++;
    appendLog(`武器強化成功！ ${w.name}+${w.enhance}になった（同名武器1本消費）`);
  }else{
    appendLog("武器強化失敗…（同名武器は消費された）");
  }
  refreshEquipSelects();
  updateDisplay();
}

function enhanceArmor(){
  if(!equippedArmorId){
    appendLog("強化する防具が装備されていない");
    return;
  }
  const a = armors.find(x=>x.id===equippedArmorId);
  if(!a) return;
  a.enhance = a.enhance || 0;
  if(a.enhance >= MAX_ENHANCE_LEVEL){
    appendLog("これ以上強化できない");
    return;
  }

  if(!consumeOneSameArmorAsMaterial(a.id)){
    appendLog("同じ防具がもう1つ必要です");
    return;
  }

  const cost = ENHANCE_COST_MONEY[a.enhance];
  if(money < cost){
    appendLog("お金が足りない");
    return;
  }
  money -= cost;

  const rate = ENHANCE_SUCCESS_RATES[a.enhance];
  if(Math.random()<rate){
    a.enhance++;
    appendLog(`防具強化成功！ ${a.name}+${a.enhance}になった（同名防具1つ消費）`);
  }else{
    appendLog("防具強化失敗…（同名防具は消費された）");
  }
  refreshEquipSelects();
  updateDisplay();
}