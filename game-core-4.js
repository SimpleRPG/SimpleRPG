// game-core-4.js
// 採取・クラフト・中間素材・装備・強化

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
  const targetSel = document.getElementById("gatherTarget");
  if (!targetSel) return;
  const target = targetSel.value;

  const fieldSel = document.getElementById("gatherField");
  const field = fieldSel ? fieldSel.value : "field1"; 

  const s = gatherSkills[target];
  const lv = s ? s.lv : 0;

  checkGatherAreaUnlockBySkill(target);

  const needLv = GATHER_FIELD_REQUIRE_LV[field] || 0;
  if (lv < needLv) {
    appendLog(`このエリアで採取するには「${target}」採取スキルLv${needLv}が必要です（現在Lv${lv}）`);
    updateDisplay();
    return;
  }

  addGatherSkillExp(target);
  let added = calcGatherAmount(target);

  let jobBonus=0;
  if(jobId===0&&(target==="ore"||target==="leather")) jobBonus=Math.random()<0.2?1:0;
  else if(jobId===1&&(target==="herb"||target==="water")) jobBonus=Math.random()<0.2?1:0;
  else if(jobId===2&&(target==="cloth"||target==="leather")) jobBonus=Math.random()<0.2?1:0;

  const lukBonus=(Math.random() < LUK_*0.01)?1:0;
  added+=jobBonus+lukBonus;
  if(added<0)added=0;

  if (!materials || !materials[target]) {
    appendLog("採取素材の定義が見つかりません");
    return;
  }

  if (added === 0) {
    appendLog("何も採取できなかった…");
    updateDisplay();
    return;
  }

  let t1 = 0, t2 = 0, t3 = 0;

  if (field === "field1") {
    t1 = added;
  } else if (field === "field2") {
    t2 = Math.floor(added * 0.2);
    t1 = added - t2;
  } else if (field === "field3") {
    t3 = Math.floor(added * 0.1);
    let rest = added - t3;
    t2 = Math.floor(rest * 0.3);
    t1 = rest - t2;
  } else {
    t1 = added;
  }

  materials[target].t1 += t1;
  materials[target].t2 += t2;
  materials[target].t3 += t3;

  const names={wood:"木",ore:"鉱石",herb:"草",cloth:"布",leather:"皮",water:"水"};
  if (t1 > 0) appendLog(`T1${names[target]}を${t1}つ採取した！`);
  if (t2 > 0) appendLog(`T2${names[target]}を${t2}つ採取した！`);
  if (t3 > 0) appendLog(`T3${names[target]}を${t3}つ採取した！`);

  updateDisplay();
}

// =======================
// クラフト共通
// =======================

// 必要素材表示
function updateCraftCostInfo(category, recipeId){
  const infoEl = document.getElementById("craftCostInfo");
  if (!infoEl) return;

  let list = [];
  let recipe = null;

  if (category === "weapon") {
    recipe = CRAFT_RECIPES.weapon.find(r => r.id === recipeId);
  } else if (category === "armor") {
    recipe = CRAFT_RECIPES.armor.find(r => r.id === recipeId);
  } else if (category === "potion") {
    recipe = CRAFT_RECIPES.potion.find(r => r.id === recipeId);
  } else if (category === "tool") {
    recipe = CRAFT_RECIPES.tool.find(r => r.id === recipeId);
  } else if (category === "material") {
    infoEl.textContent = "必要素材：-";
    return;
  }

  if (!recipe || !recipe.cost) {
    infoEl.textContent = "必要素材：-";
    return;
  }

  // 基本素材の日本語名
  const baseNames = {
    wood:   "木",
    ore:    "鉱石",
    herb:   "草",
    cloth:  "布",
    leather:"皮",
    water:  "水"
  };

  // 中間素材の日本語名
  const interNames = {
    woodPlank_T1:    "T1板材",
    woodPlank_T2:    "T2板材",
    woodPlank_T3:    "T3板材",
    ironIngot_T1:    "T1鉄インゴット",
    ironIngot_T2:    "T2鉄インゴット",
    ironIngot_T3:    "T3鉄インゴット",
    clothBolt_T1:    "T1布束",
    clothBolt_T2:    "T2布束",
    clothBolt_T3:    "T3布束",
    toughLeather_T1: "T1強化皮",
    toughLeather_T2: "T2強化皮",
    toughLeather_T3: "T3強化皮"
  };

  // ティア付き基本素材の日本語名
  const tierMatNames = {
    herb_T1:   "T1草",
    herb_T2:   "T2草",
    herb_T3:   "T3草",
    water_T1:  "T1水",
    water_T2:  "T2水",
    water_T3:  "T3水",
    wood_T1:   "T1木",
    wood_T2:   "T2木",
    wood_T3:   "T3木",
    ore_T1:    "T1鉱石",
    ore_T2:    "T2鉱石",
    ore_T3:    "T3鉱石",
    cloth_T1:  "T1布",
    cloth_T2:  "T2布",
    cloth_T3:  "T3布",
    leather_T1:"T1皮",
    leather_T2:"T2皮",
    leather_T3:"T3皮"
  };

  Object.keys(recipe.cost).forEach(k => {
    const need = recipe.cost[k];
    let have = 0;
    let label;

    if (k in materials) {
      // wood / ore など基本素材（ティア混ざり合計）
      have = getMatTotal(k);
      label = baseNames[k] || k;
    } else if (k in tierMatNames) {
      // herb_T1 などティア固定基本素材
      const [base, tier] = k.split("_"); // 例: "ore", "T1"
      const m = materials[base];
      if (m) {
        const tierKey = tier.toLowerCase(); // "t1"
        have = m[tierKey] || 0;
      }
      label = tierMatNames[k];
    } else if (typeof intermediateMats === "object" && intermediateMats[k] != null) {
      // 中間素材
      have = intermediateMats[k] || 0;
      label = interNames[k] || k;
    } else {
      // それ以外（基本的には来ない想定だが、念のため）
      label = k;
    }

    list.push(`${label} ${have}/${need}`);
  });

  infoEl.textContent = "必要素材：" + (list.length ? list.join("、") : "-");
}

// 素材チェック
function hasMaterials(cost){
  if(cost.wood && getMatTotal("wood")<cost.wood) return false;
  if(cost.ore && getMatTotal("ore")<cost.ore) return false;
  if(cost.herb && getMatTotal("herb")<cost.herb) return false;
  if(cost.cloth && getMatTotal("cloth")<cost.cloth) return false;
  if(cost.leather && getMatTotal("leather")<cost.leather) return false;
  if(cost.water && getMatTotal("water")<cost.water) return false;

  const checkTier = (base, tierKey, amount) => {
    if (!amount) return true;
    const m = materials[base];
    if (!m) return false;
    return (m[tierKey] || 0) >= amount;
  };

  // 草・水
  if (!checkTier("herb",  "t1", cost.herb_T1)) return false;
  if (!checkTier("herb",  "t2", cost.herb_T2)) return false;
  if (!checkTier("herb",  "t3", cost.herb_T3)) return false;
  if (!checkTier("water", "t1", cost.water_T1)) return false;
  if (!checkTier("water", "t2", cost.water_T2)) return false;
  if (!checkTier("water", "t3", cost.water_T3)) return false;

  // 木・鉱石・布・皮のティア素材
  if (!checkTier("wood",   "t1", cost.wood_T1))   return false;
  if (!checkTier("wood",   "t2", cost.wood_T2))   return false;
  if (!checkTier("wood",   "t3", cost.wood_T3))   return false;
  if (!checkTier("ore",    "t1", cost.ore_T1))    return false;
  if (!checkTier("ore",    "t2", cost.ore_T2))    return false;
  if (!checkTier("ore",    "t3", cost.ore_T3))    return false;
  if (!checkTier("cloth",  "t1", cost.cloth_T1))  return false;
  if (!checkTier("cloth",  "t2", cost.cloth_T2))  return false;
  if (!checkTier("cloth",  "t3", cost.cloth_T3))  return false;
  if (!checkTier("leather","t1", cost.leather_T1))return false;
  if (!checkTier("leather","t2", cost.leather_T2))return false;
  if (!checkTier("leather","t3", cost.leather_T3))return false;

  // 中間素材
  if (typeof intermediateMats === "object") {
    if (cost.woodPlank_T1 && (intermediateMats.woodPlank_T1 || 0) < cost.woodPlank_T1) return false;
    if (cost.woodPlank_T2 && (intermediateMats.woodPlank_T2 || 0) < cost.woodPlank_T2) return false;
    if (cost.woodPlank_T3 && (intermediateMats.woodPlank_T3 || 0) < cost.woodPlank_T3) return false;
    if (cost.ironIngot_T1 && (intermediateMats.ironIngot_T1 || 0) < cost.ironIngot_T1) return false;
    if (cost.ironIngot_T2 && (intermediateMats.ironIngot_T2 || 0) < cost.ironIngot_T2) return false;
    if (cost.ironIngot_T3 && (intermediateMats.ironIngot_T3 || 0) < cost.ironIngot_T3) return false;
    if (cost.clothBolt_T1 && (intermediateMats.clothBolt_T1 || 0) < cost.clothBolt_T1) return false;
    if (cost.clothBolt_T2 && (intermediateMats.clothBolt_T2 || 0) < cost.clothBolt_T2) return false;
    if (cost.clothBolt_T3 && (intermediateMats.clothBolt_T3 || 0) < cost.clothBolt_T3) return false;
    if (cost.toughLeather_T1 && (intermediateMats.toughLeather_T1 || 0) < cost.toughLeather_T1) return false;
    if (cost.toughLeather_T2 && (intermediateMats.toughLeather_T2 || 0) < cost.toughLeather_T2) return false;
    if (cost.toughLeather_T3 && (intermediateMats.toughLeather_T3 || 0) < cost.toughLeather_T3) return false;
  }
  return true;
}

function consumeOneMatTier(key, need){
  let remain = need;
  const m = materials[key];
  if (!m) return;
  const tiers = ["t1","t2","t3"];
  for (const ti of tiers) {
    if (remain <= 0) break;
    const have = m[ti] || 0;
    const use = Math.min(have, remain);
    m[ti] = have - use;
    remain -= use;
  }
}

function consumeMaterials(cost){
  if(cost.wood)   consumeOneMatTier("wood",   cost.wood);
  if(cost.ore)    consumeOneMatTier("ore",    cost.ore);
  if(cost.herb)   consumeOneMatTier("herb",   cost.herb);
  if(cost.cloth)  consumeOneMatTier("cloth",  cost.cloth);
  if(cost.leather)consumeOneMatTier("leather",cost.leather);
  if(cost.water)  consumeOneMatTier("water",  cost.water);

  const decTier = (base, tierKey, amount) => {
    if (!amount) return;
    const m = materials[base];
    if (!m) return;
    m[tierKey] = Math.max(0, (m[tierKey] || 0) - amount);
  };

  // 草・水
  decTier("herb",  "t1", cost.herb_T1);
  decTier("herb",  "t2", cost.herb_T2);
  decTier("herb",  "t3", cost.herb_T3);
  decTier("water", "t1", cost.water_T1);
  decTier("water", "t2", cost.water_T2);
  decTier("water", "t3", cost.water_T3);

  // 木・鉱石・布・皮
  decTier("wood",   "t1", cost.wood_T1);
  decTier("wood",   "t2", cost.wood_T2);
  decTier("wood",   "t3", cost.wood_T3);
  decTier("ore",    "t1", cost.ore_T1);
  decTier("ore",    "t2", cost.ore_T2);
  decTier("ore",    "t3", cost.ore_T3);
  decTier("cloth",  "t1", cost.cloth_T1);
  decTier("cloth",  "t2", cost.cloth_T2);
  decTier("cloth",  "t3", cost.cloth_T3);
  decTier("leather","t1", cost.leather_T1);
  decTier("leather","t2", cost.leather_T2);
  decTier("leather","t3", cost.leather_T3);

  if (typeof intermediateMats === "object") {
    const dec = (k, n) => {
      if (!n) return;
      intermediateMats[k] = (intermediateMats[k] || 0) - n;
      if (intermediateMats[k] < 0) intermediateMats[k] = 0;
    };
    dec("woodPlank_T1", cost.woodPlank_T1);
    dec("woodPlank_T2", cost.woodPlank_T2);
    dec("woodPlank_T3", cost.woodPlank_T3);
    dec("ironIngot_T1", cost.ironIngot_T1);
    dec("ironIngot_T2", cost.ironIngot_T2);
    dec("ironIngot_T3", cost.ironIngot_T3);
    dec("clothBolt_T1", cost.clothBolt_T1);
    dec("clothBolt_T2", cost.clothBolt_T2);
    dec("clothBolt_T3", cost.clothBolt_T3);
    dec("toughLeather_T1", cost.toughLeather_T1);
    dec("toughLeather_T2", cost.toughLeather_T2);
    dec("toughLeather_T3", cost.toughLeather_T3);
  }
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

// =======================
// 各種クラフト
// =======================

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

// 道具クラフト（爆弾T1〜T3など）
function craftTool(){
  const sel = document.getElementById("toolSelect");
  if(!sel || !sel.value) return;
  const recipe = CRAFT_RECIPES.tool.find(r => r.id === sel.value);
  if(!recipe){ appendLog("その道具レシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ appendLog("素材が足りない"); return; }

  consumeMaterials(recipe.cost);
  addCraftSkillExp("tool");
  appendLog(`${recipe.name} をクラフトした`);
  updateDisplay();
}

// 中間素材クラフト
function craftIntermediate(interId){
  if (!Array.isArray(INTERMEDIATE_MATERIALS)) return;
  const def = INTERMEDIATE_MATERIALS.find(m => m.id === interId);
  if (!def || !def.from) {
    appendLog("その中間素材は作れない");
    return;
  }

  const can = Object.keys(def.from).every(key => {
    const tierInfo = def.from[key];
    const m = materials[key];
    if (!m) return false;
    let haveSum = 0;
    Object.keys(tierInfo).forEach(ti => {
      haveSum += (m[ti] || 0);
    });
    const needSum = Object.values(tierInfo).reduce((a,b)=>a+b,0);
    return haveSum >= needSum;
  });
  if (!can) {
    appendLog("素材が足りない（中間素材）");
    return;
  }

  Object.keys(def.from).forEach(key => {
    const tierInfo = def.from[key];
    const m = materials[key];
    Object.keys(tierInfo).forEach(ti => {
      let need = tierInfo[ti];
      const have = m[ti] || 0;
      const use = Math.min(have, need);
      m[ti] = have - use;
      need -= use;
    });
  });

  if (typeof intermediateMats !== "object") return;
  intermediateMats[interId] = (intermediateMats[interId] || 0) + 1;

  appendLog(`${def.name} を作成した`);
  updateDisplay();
}

// =======================
// 装備・強化
// =======================

function refreshEquipSelects(){
  if (typeof weapons === "undefined" || typeof armors === "undefined") {
    console.warn("game-core-4: weapons/armors が未初期化のため、refreshEquipSelects をスキップ");
    return;
  }

  const wSel      = document.getElementById("weaponEquipSelect");
  const aSel      = document.getElementById("armorEquipSelect");
  const wCraftSel = document.getElementById("weaponSelect");
  const aCraftSel = document.getElementById("armorSelect");
  const pCraftSel = document.getElementById("potionSelect");
  const tCraftSel = document.getElementById("toolSelect");
  const tierSel   = document.getElementById("craftTierSelect");
  const tierFilter= tierSel ? tierSel.value : "all";

  // 所持装備セレクト
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

  // クラフト用セレクト（表示名 T1短剣/T1ポーション/T1爆弾）

  if(wCraftSel){
    wCraftSel.innerHTML="";
    CRAFT_RECIPES.weapon.forEach(r=>{
      if (tierFilter !== "all") {
        if (!r.id.includes("_" + tierFilter)) return;   // 例: dagger_T1
      }
      const opt=document.createElement("option");
      opt.value = r.id;
      const m = r.id.match(/_T(\d)/);
      const tierLabel = m ? `T${m[1]}` : "";
      const baseName = r.name.replace(/T\d$/, "");
      opt.textContent = tierLabel ? `${tierLabel}${baseName}` : r.name;
      wCraftSel.appendChild(opt);
    });
  }

  if(aCraftSel){
    aCraftSel.innerHTML="";
    CRAFT_RECIPES.armor.forEach(r=>{
      if (tierFilter !== "all") {
        if (!r.id.includes("_" + tierFilter)) return;
      }
      const opt=document.createElement("option");
      opt.value = r.id;
      const m = r.id.match(/_T(\d)/);
      const tierLabel = m ? `T${m[1]}` : "";
      const baseName = r.name.replace(/T\d$/, "");
      opt.textContent = tierLabel ? `${tierLabel}${baseName}` : r.name;
      aCraftSel.appendChild(opt);
    });
  }

  if(pCraftSel){
    pCraftSel.innerHTML="";
    CRAFT_RECIPES.potion.forEach(r=>{
      if (tierFilter !== "all") {
        if (!r.id.includes(tierFilter)) return;  // potionT1 など
      }
      const opt=document.createElement("option");
      opt.value = r.id;
      const m = r.id.match(/T(\d)$/);
      const tierLabel = m ? `T${m[1]}` : "";
      const baseName = r.name.replace(/T\d$/, "");
      opt.textContent = tierLabel ? `${tierLabel}${baseName}` : r.name;
      pCraftSel.appendChild(opt);
    });
  }

  if(tCraftSel){
    tCraftSel.innerHTML="";
    CRAFT_RECIPES.tool.forEach(r=>{
      if (tierFilter !== "all") {
        if (!r.id.includes("_" + tierFilter)) return;  // bomb_T1 など
      }
      const opt=document.createElement("option");
      opt.value = r.id;
      const m = r.id.match(/_T(\d)/);
      const tierLabel = m ? `T${m[1]}` : "";
      const baseName = r.name.replace(/T\d$/, "");
      opt.textContent = tierLabel ? `${tierLabel}${baseName}` : r.name;
      tCraftSel.appendChild(opt);
    });
  }

  if (wCraftSel && wCraftSel.value) {
    updateCraftCostInfo("weapon", wCraftSel.value);
  } else if (aCraftSel && aCraftSel.value) {
    updateCraftCostInfo("armor", aCraftSel.value);
  } else if (pCraftSel && pCraftSel.value) {
    updateCraftCostInfo("potion", pCraftSel.value);
  } else if (tCraftSel && tCraftSel.value) {
    updateCraftCostInfo("tool", tCraftSel.value);
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
  if(owned <= 1) return false;
  weaponCounts[weaponId] = owned - 1;
  return true;
}

function consumeOneSameArmorAsMaterial(armorId){
  const owned = armorCounts[armorId] || 0;
  if(owned <= 1) return false;
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