// game-core-6.js
// クラフト・中間素材・装備・強化

// =======================
// クラフト共通
// =======================

// クラフト品質関連（0:普通, 1:良品, 2:傑作）
const QUALITY_NAMES = ["", "【良品】", "【傑作】"];

// 必要なら性能補正用レート（今は未使用、後でダメージ計算側で使う想定）
const QUALITY_RATE = [1.0, 1.05, 1.12];

// クラフトスキルLvヘルパー
function getCraftSkill(category){
  return craftSkills[category];
}

function getCraftSkillLevel(category){
  const s = getCraftSkill(category);
  return s ? s.lv : 0;
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

// ★ 武器・防具インスタンス追加ヘルパー
// game-core-1.js 側で宣言されている weaponInstances / armorInstances / MAX_DURABILITY / weaponCounts / armorCounts を利用する前提
function addWeaponInstance(id, quality, enhance) {
  const inst = {
    id,
    quality: quality || 0,
    enhance: enhance || 0,
    durability: MAX_DURABILITY
  };
  weaponInstances.push(inst);
  weaponCounts[id] = (weaponCounts[id] || 0) + 1;
}

function addArmorInstance(id, quality, enhance) {
  const inst = {
    id,
    quality: quality || 0,
    enhance: enhance || 0,
    durability: MAX_DURABILITY
  };
  armorInstances.push(inst);
  armorCounts[id] = (armorCounts[id] || 0) + 1;
}

// 必要素材表示（「必要/所持」を出す）
// 武器・防具・ポーション・道具 + 中間素材（material）+ 料理（cookingFood / cookingDrink）に対応
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
    // 中間素材クラフト用：def.from からベース素材＋ティアを表示
    if (!Array.isArray(INTERMEDIATE_MATERIALS)) {
      infoEl.textContent = "必要素材：-";
      return;
    }
    const def = INTERMEDIATE_MATERIALS.find(m => m.id === recipeId);
    if (!def || !def.from) {
      infoEl.textContent = "必要素材：-";
      return;
    }

    const baseNames = {
      wood:   "木",
      ore:    "鉱石",
      herb:   "草",
      cloth:  "布",
      leather:"皮",
      water:  "水"
    };

    const parts = [];
    Object.keys(def.from).forEach(baseKey => {
      const tierInfo = def.from[baseKey]; // 例: { t1: 3 }
      const m = materials[baseKey];       // wood / ore / ...
      Object.keys(tierInfo).forEach(tierKey => {
        const need = tierInfo[tierKey] || 0;
        if (!need) return;
        const have = m ? (m[tierKey] || 0) : 0;
        const tierLabel = tierKey.toUpperCase(); // "T1"
        const name = baseNames[baseKey] || baseKey;
        parts.push(`${tierLabel}${name} ${have}/${need}`);
      });
    });

    infoEl.textContent = "必要素材：" + (parts.length ? parts.join("、") : "-");
    return;
  } else if (category === "cookingFood" || category === "cookingDrink") {
    // 料理の必要素材表示（COOKING_RECIPES の requires を利用）
    if (!COOKING_RECIPES) {
      infoEl.textContent = "必要素材：-";
      return;
    }
    const listSrc = (category === "cookingFood")
      ? (COOKING_RECIPES.food || [])
      : (COOKING_RECIPES.drink || []);
    recipe = listSrc.find(r => r.id === recipeId);
    if (!recipe || !Array.isArray(recipe.requires) || !recipe.requires.length) {
      infoEl.textContent = "必要素材：-";
      return;
    }

    const mats  = window.cookingMats || {};
    const names = COOKING_MAT_NAMES || {};
    list = recipe.requires.map(req => {
      const id   = req.id;
      const need = req.amount;
      const have = mats[id] || 0;
      const label = names[id] || id;
      return `${label} ${have}/${need}`;
    });

    infoEl.textContent = "必要素材：" + (list.length ? list.join("、") : "-");
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
    woodPlank_T1:      "T1板材",
    woodPlank_T2:      "T2板材",
    woodPlank_T3:      "T3板材",
    ironIngot_T1:      "T1鉄インゴット",
    ironIngot_T2:      "T2鉄インゴット",
    ironIngot_T3:      "T3鉄インゴット",
    clothBolt_T1:      "T1布束",
    clothBolt_T2:      "T2布束",
    clothBolt_T3:      "T3布束",
    toughLeather_T1:   "T1強化皮",
    toughLeather_T2:   "T2強化皮",
    toughLeather_T3:   "T3強化皮",
    mixHerb_T1:        "T1調合用薬草",
    mixHerb_T2:        "T2調合用薬草",
    mixHerb_T3:        "T3調合用薬草",
    distilledWater_T1: "T1蒸留水",
    distilledWater_T2: "T2蒸留水",
    distilledWater_T3: "T3蒸留水"
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

    // 1. ティア付き基本素材（herb_T1 など）
    if (k in tierMatNames) {
      const [base, tier] = k.split("_"); // 例: "ore", "T1"
      const m = materials[base];
      if (m) {
        const tierKey = tier.toLowerCase(); // "t1"
        have = m[tierKey] || 0;
      }
      label = tierMatNames[k];

    // 2. 中間素材
    } else if (k in interNames) {
      if (typeof intermediateMats === "object") {
        have = intermediateMats[k] || 0;
      } else {
        have = 0;
      }
      label = interNames[k];

    // 3. 基本素材（wood / ore など、ティア混在で合計）
    } else if (k in materials) {
      have = getMatTotal(k);
      label = baseNames[k] || k;

    // 4. それ以外（将来の拡張用）
    } else {
      label = k;
      have = 0;
    }

    list.push(`${label} ${have}/${need}`);
  });

  infoEl.textContent = "必要素材：" + (list.length ? list.join("、") : "-");
}

// 素材チェック（武器・防具・ポーション・道具・中間素材用）
function hasMaterials(cost){
  if(cost.wood && getMatTotal("wood") < cost.wood) return false;
  if(cost.ore && getMatTotal("ore") < cost.ore) return false;
  if(cost.herb && getMatTotal("herb") < cost.herb) return false;
  if(cost.cloth && getMatTotal("cloth") < cost.cloth) return false;
  if(cost.leather && getMatTotal("leather") < cost.leather) return false;
  if(cost.water && getMatTotal("water") < cost.water) return false;

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
    if (cost.woodPlank_T1      && (intermediateMats.woodPlank_T1      || 0) < cost.woodPlank_T1)      return false;
    if (cost.woodPlank_T2      && (intermediateMats.woodPlank_T2      || 0) < cost.woodPlank_T2)      return false;
    if (cost.woodPlank_T3      && (intermediateMats.woodPlank_T3      || 0) < cost.woodPlank_T3)      return false;
    if (cost.ironIngot_T1      && (intermediateMats.ironIngot_T1      || 0) < cost.ironIngot_T1)      return false;
    if (cost.ironIngot_T2      && (intermediateMats.ironIngot_T2      || 0) < cost.ironIngot_T2)      return false;
    if (cost.ironIngot_T3      && (intermediateMats.ironIngot_T3      || 0) < cost.ironIngot_T3)      return false;
    if (cost.clothBolt_T1      && (intermediateMats.clothBolt_T1      || 0) < cost.clothBolt_T1)      return false;
    if (cost.clothBolt_T2      && (intermediateMats.clothBolt_T2      || 0) < cost.clothBolt_T2)      return false;
    if (cost.clothBolt_T3      && (intermediateMats.clothBolt_T3      || 0) < cost.clothBolt_T3)      return false;
    if (cost.toughLeather_T1   && (intermediateMats.toughLeather_T1   || 0) < cost.toughLeather_T1)   return false;
    if (cost.toughLeather_T2   && (intermediateMats.toughLeather_T2   || 0) < cost.toughLeather_T2)   return false;
    if (cost.toughLeather_T3   && (intermediateMats.toughLeather_T3   || 0) < cost.toughLeather_T3)   return false;
    if (cost.mixHerb_T1        && (intermediateMats.mixHerb_T1        || 0) < cost.mixHerb_T1)        return false;
    if (cost.mixHerb_T2        && (intermediateMats.mixHerb_T2        || 0) < cost.mixHerb_T2)        return false;
    if (cost.mixHerb_T3        && (intermediateMats.mixHerb_T3        || 0) < cost.mixHerb_T3)        return false;
    if (cost.distilledWater_T1 && (intermediateMats.distilledWater_T1 || 0) < cost.distilledWater_T1) return false;
    if (cost.distilledWater_T2 && (intermediateMats.distilledWater_T2 || 0) < cost.distilledWater_T2) return false;
    if (cost.distilledWater_T3 && (intermediateMats.distilledWater_T3 || 0) < cost.distilledWater_T3) return false;
  }
  return true;
}

// 料理素材チェック（cost 形式）
function hasCookingMaterials(cost){
  if (!cost || !cookingMats) return false;
  return Object.keys(cost).every(k => {
    const need = cost[k];
    if (!need) return true;
    return (cookingMats[k] || 0) >= need;
  });
}

// 料理素材消費（cost 形式）
function consumeCookingMaterials(cost){
  if (!cost || !cookingMats) return;
  Object.keys(cost).forEach(k => {
    const need = cost[k];
    if (!need) return;
    const have = cookingMats[k] || 0;
    cookingMats[k] = Math.max(0, have - need);
  });
}

// requires 形式用のチェック＆消費（COOKING_RECIPES が requires を持っている場合用）
function hasCookingMaterialsByRequires(recipe){
  if (!recipe || !Array.isArray(recipe.requires)) return false;
  const mats = window.cookingMats || {};
  return recipe.requires.every(req => {
    const need = req.amount;
    if (!need) return true;
    return (mats[req.id] || 0) >= need;
  });
}

function consumeCookingMaterialsByRequires(recipe){
  if (!recipe || !Array.isArray(recipe.requires)) return;
  const mats = window.cookingMats || {};
  recipe.requires.forEach(req => {
    const need = req.amount;
    if (!need) return;
    mats[req.id] = Math.max(0, (mats[req.id] || 0) - need);
  });
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

// ★ 素材消費本体：ここだけを通す
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

  // 中間素材
  if (typeof intermediateMats === "object") {
    const dec = (k, n) => {
      if (!n) return;
      intermediateMats[k] = (intermediateMats[k] || 0) - n;
      if (intermediateMats[k] < 0) intermediateMats[k] = 0;
    };
    dec("woodPlank_T1",      cost.woodPlank_T1);
    dec("woodPlank_T2",      cost.woodPlank_T2);
    dec("woodPlank_T3",      cost.woodPlank_T3);
    dec("ironIngot_T1",      cost.ironIngot_T1);
    dec("ironIngot_T2",      cost.ironIngot_T2);
    dec("ironIngot_T3",      cost.ironIngot_T3);
    dec("clothBolt_T1",      cost.clothBolt_T1);
    dec("clothBolt_T2",      cost.clothBolt_T2);
    dec("clothBolt_T3",      cost.clothBolt_T3);
    dec("toughLeather_T1",   cost.toughLeather_T1);
    dec("toughLeather_T2",   cost.toughLeather_T2);
    dec("toughLeather_T3",   cost.toughLeather_T3);
    dec("mixHerb_T1",        cost.mixHerb_T1);
    dec("mixHerb_T2",        cost.mixHerb_T2);
    dec("mixHerb_T3",        cost.mixHerb_T3);
    dec("distilledWater_T1", cost.distilledWater_T1);
    dec("distilledWater_T2", cost.distilledWater_T2);
    dec("distilledWater_T3", cost.distilledWater_T3);
  }
}

// =======================
// 各種クラフト
// =======================

function craftWeapon(){
  const sel = document.getElementById("weaponSelect");
  if(!sel || !sel.value) return;

  const prevRecipeId = sel.value;

  const recipe = CRAFT_RECIPES.weapon.find(r => r.id === sel.value);
  if(!recipe){ appendLog("その武器レシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ appendLog("素材が足りない"); return; }

  const skillLv = getCraftSkillLevel("weapon");
  const successRate = calcCraftSuccessRate(recipe.baseRate, skillLv);

  // 成功・失敗に関わらず素材は必ず消費
  consumeMaterials(recipe.cost);
  addCraftSkillExp("weapon");

  if (Math.random() >= successRate) {
    appendLog(`${recipe.name} のクラフトに失敗した…（素材は消費された）`);
    updateDisplay();
    return;
  }

  const q = rollQualityBySkillLv(skillLv);
  const qName = QUALITY_NAMES[q];

  // ★ インスタンスを追加（強化0・耐久MAXで1本）
  const master = weapons.find(w => w.id === recipe.id);
  const baseEnh = master ? (master.enhance || 0) : 0;
  addWeaponInstance(recipe.id, q, baseEnh);

  appendLog(`${qName}${recipe.name} をクラフトした`);

  refreshEquipSelects();
  updateDisplay();

  const selAfter = document.getElementById("weaponSelect");
  if (selAfter) {
    selAfter.value = prevRecipeId;
    updateCraftCostInfo("weapon", prevRecipeId);
  }
}

function craftArmor(){
  const sel = document.getElementById("armorSelect");
  if(!sel || !sel.value) return;

  const prevRecipeId = sel.value;

  const recipe = CRAFT_RECIPES.armor.find(r => r.id === sel.value);
  if(!recipe){ appendLog("その防具レシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ appendLog("素材が足りない"); return; }

  const skillLv = getCraftSkillLevel("armor");
  const successRate = calcCraftSuccessRate(recipe.baseRate, skillLv);

  consumeMaterials(recipe.cost);
  addCraftSkillExp("armor");

  if (Math.random() >= successRate) {
    appendLog(`${recipe.name} のクラフトに失敗した…（素材は消費された）`);
    updateDisplay();
    return;
  }

  const q = rollQualityBySkillLv(skillLv);
  const qName = QUALITY_NAMES[q];

  const master = armors.find(a => a.id === recipe.id);
  const baseEnh = master ? (master.enhance || 0) : 0;
  addArmorInstance(recipe.id, q, baseEnh);

  appendLog(`${qName}${recipe.name} をクラフトした`);

  refreshEquipSelects();
  updateDisplay();

  const selAfter = document.getElementById("armorSelect");
  if (selAfter) {
    selAfter.value = prevRecipeId;
    updateCraftCostInfo("armor", prevRecipeId);
  }
}

function craftPotion(){
  const sel = document.getElementById("potionSelect");
  if(!sel || !sel.value) return;

  const prevRecipeId = sel.value;

  const recipe = CRAFT_RECIPES.potion.find(r => r.id === sel.value);
  if(!recipe){ appendLog("そのポーションレシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ appendLog("素材が足りない"); return; }

  const skillLv = getCraftSkillLevel("potion");
  const successRate = calcCraftSuccessRate(recipe.baseRate, skillLv);

  consumeMaterials(recipe.cost);
  addCraftSkillExp("potion");

  if (Math.random() >= successRate) {
    appendLog(`${recipe.name} のクラフトに失敗した…（素材は消費された）`);
    updateDisplay();
    refreshEquipSelects();
    const selAfterFail = document.getElementById("potionSelect");
    if (selAfterFail) {
      selAfterFail.value = prevRecipeId;
      updateCraftCostInfo("potion", prevRecipeId);
    }
    return;
  }

  if (typeof addItemToInventory === "function") {
    addItemToInventory(recipe.id, 1);
  }

  appendLog(`${recipe.name} をクラフトした`);

  updateDisplay();
  refreshEquipSelects();

  const selAfter = document.getElementById("potionSelect");
  if (selAfter) {
    selAfter.value = prevRecipeId;
    updateCraftCostInfo("potion", prevRecipeId);
  }
}

function craftTool(){
  const sel = document.getElementById("toolSelect");
  if(!sel || !sel.value) return;

  const prevRecipeId = sel.value;

  const recipe = CRAFT_RECIPES.tool.find(r => r.id === sel.value);
  if(!recipe){ appendLog("その道具レシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ appendLog("素材が足りない"); return; }

  const skillLv = getCraftSkillLevel("tool");
  const successRate = calcCraftSuccessRate(recipe.baseRate, skillLv);

  consumeMaterials(recipe.cost);
  addCraftSkillExp("tool");

  if (Math.random() >= successRate) {
    appendLog(`${recipe.name} のクラフトに失敗した…（素材は消費された）`);
    updateDisplay();
    refreshEquipSelects();
    const selAfterFail = document.getElementById("toolSelect");
    if (selAfterFail) {
      selAfterFail.value = prevRecipeId;
      updateCraftCostInfo("tool", prevRecipeId);
    }
    return;
  }

  if (typeof addItemToInventory === "function") {
    addItemToInventory(recipe.id, 1);
  }

  appendLog(`${recipe.name} をクラフトした`);

  updateDisplay();
  refreshEquipSelects();

  const selAfter = document.getElementById("toolSelect");
  if (selAfter) {
    selAfter.value = prevRecipeId;
    updateCraftCostInfo("tool", prevRecipeId);
  }
}

// 中間素材クラフト
function craftIntermediate(interId){
  if (!Array.isArray(INTERMEDIATE_MATERIALS)) return;
  const def = INTERMEDIATE_MATERIALS.find(m => m.id === interId);
  if (!def || !def.from) {
    appendLog("その中間素材は作れない");
    return;
  }

  // def.from 形式のコストを、consumeMaterials/hasMaterials 互換の cost に変換
  const cost = {};
  Object.keys(def.from).forEach(baseKey => {
    const tierInfo = def.from[baseKey]; // 例: { t1: 3 }
    Object.keys(tierInfo).forEach(tierKey => {
      const need = tierInfo[tierKey] || 0;
      if (!need) return;
      const keyName = `${baseKey}_${tierKey.toUpperCase()}`; // wood_t1 → wood_T1
      cost[keyName] = (cost[keyName] || 0) + need;
    });
  });

  if (!hasMaterials(cost)) {
    appendLog("素材が足りない（中間素材）");
    return;
  }

  consumeMaterials(cost);

  if (typeof intermediateMats === "object") {
    intermediateMats[interId] = (intermediateMats[interId] || 0) + 1;
  }

  appendLog(`${def.name} を作成した`);
  updateDisplay();
}

// 料理クラフト（食べ物）
function craftFood(){
  const sel = document.getElementById("foodSelect");
  if (!sel || !sel.value) return;

  const prevRecipeId = sel.value;

  if (!COOKING_RECIPES || !COOKING_RECIPES.food) {
    appendLog("料理レシピが存在しない");
    return;
  }
  const recipe = COOKING_RECIPES.food.find(r => r.id === sel.value);
  if (!recipe){ appendLog("その料理レシピが存在しない"); return; }

  const canByCost = recipe.cost && hasCookingMaterials(recipe.cost);
  const canByReq  = !recipe.cost && hasCookingMaterialsByRequires(recipe);
  if (!canByCost && !canByReq){
    appendLog("料理素材が足りない");
    return;
  }

  const skillLv = getCraftSkillLevel("cooking") || 0;
  const successRate = calcCraftSuccessRate(recipe.baseRate || 1.0, skillLv);

  if (Math.random() >= successRate) {
    if (recipe.cost) consumeCookingMaterials(recipe.cost);
    else consumeCookingMaterialsByRequires(recipe);

    if (craftSkills.cooking) {
      addCraftSkillExp("cooking");
    }
    appendLog(`${recipe.name} の料理に失敗した…（素材は消費された）`);
    updateDisplay();
    refreshEquipSelects();
    const selAfterFail = document.getElementById("foodSelect");
    if (selAfterFail) {
      selAfterFail.value = prevRecipeId;
      updateCraftCostInfo("cookingFood", prevRecipeId);
    }
    return;
  }

  if (recipe.cost) consumeCookingMaterials(recipe.cost);
  else consumeCookingMaterialsByRequires(recipe);

  if (craftSkills.cooking) {
    addCraftSkillExp("cooking");
  }

  if (typeof addItemToInventory === "function") {
    addItemToInventory(recipe.id, 1);
  }

  appendLog(`${recipe.name} を作った`);

  updateDisplay();
  refreshEquipSelects();

  const selAfter = document.getElementById("foodSelect");
  if (selAfter) {
    selAfter.value = prevRecipeId;
    updateCraftCostInfo("cookingFood", prevRecipeId);
  }
}

// 料理クラフト（飲み物）
function craftDrink(){
  const sel = document.getElementById("drinkSelect");
  if (!sel || !sel.value) return;

  const prevRecipeId = sel.value;

  if (!COOKING_RECIPES || !COOKING_RECIPES.drink) {
    appendLog("飲み物レシピが存在しない");
    return;
  }
  const recipe = COOKING_RECIPES.drink.find(r => r.id === sel.value);
  if (!recipe){ appendLog("その飲み物レシピが存在しない"); return; }

  const canByCost = recipe.cost && hasCookingMaterials(recipe.cost);
  const canByReq  = !recipe.cost && hasCookingMaterialsByRequires(recipe);
  if (!canByCost && !canByReq){
    appendLog("料理素材が足りない");
    return;
  }

  const skillLv = getCraftSkillLevel("cooking") || 0;
  const successRate = calcCraftSuccessRate(recipe.baseRate || 1.0, skillLv);

  if (Math.random() >= successRate) {
    if (recipe.cost) consumeCookingMaterials(recipe.cost);
    else consumeCookingMaterialsByRequires(recipe);

    if (craftSkills.cooking) {
      addCraftSkillExp("cooking");
    }
    appendLog(`${recipe.name} の調理に失敗した…（素材は消費された）`);
    updateDisplay();
    refreshEquipSelects();
    const selAfterFail = document.getElementById("drinkSelect");
    if (selAfterFail) {
      selAfterFail.value = prevRecipeId;
      updateCraftCostInfo("cookingDrink", prevRecipeId);
    }
    return;
  }

  if (recipe.cost) consumeCookingMaterials(recipe.cost);
  else consumeCookingMaterialsByRequires(recipe);

  if (craftSkills.cooking) {
    addCraftSkillExp("cooking");
  }

  if (typeof addItemToInventory === "function") {
    addItemToInventory(recipe.id, 1);
  }

  appendLog(`${recipe.name} を作った`);

  updateDisplay();
  refreshEquipSelects();

  const selAfter = document.getElementById("drinkSelect");
  if (selAfter) {
    selAfter.value = prevRecipeId;
    updateCraftCostInfo("cookingDrink", prevRecipeId);
  }
}

// =======================
// 装備・強化
// =======================

// 直前にどのクラフトカテゴリを見ていたか覚えておく
// "weapon" / "armor" / "potion" / "tool" / "material" / "cookingFood" / "cookingDrink"
let lastCraftCategory = "weapon";

function refreshEquipSelects(){
  if (typeof weapons === "undefined" || typeof armors === "undefined") {
    console.warn("game-core-6: weapons/armors が未初期化のため、refreshEquipSelects をスキップ");
    return;
  }

  const wSel      = document.getElementById("weaponEquipSelect");
  const aSel      = document.getElementById("armorEquipSelect");
  const wCraftSel = document.getElementById("weaponSelect");
  const aCraftSel = document.getElementById("armorSelect");
  const pCraftSel = document.getElementById("potionSelect");
  const tCraftSel = document.getElementById("toolSelect");
  const interSel  = document.getElementById("intermediateSelect");
  const foodSel   = document.getElementById("foodSelect");
  const drinkSel  = document.getElementById("drinkSelect");
  const tierSel   = document.getElementById("craftTierSelect");
  const tierFilter= tierSel ? tierSel.value : "all";

  // 直前の選択値を退避（カテゴリ別）
  const prevWeaponId  = wCraftSel ? wCraftSel.value : null;
  const prevArmorId   = aCraftSel ? aCraftSel.value : null;
  const prevPotionId  = pCraftSel ? pCraftSel.value : null;
  const prevToolId    = tCraftSel ? tCraftSel.value : null;
  const prevInterId   = interSel  ? interSel.value  : null;
  const prevFoodId    = foodSel   ? foodSel.value   : null;
  const prevDrinkId   = drinkSel  ? drinkSel.value  : null;

  // 所持装備セレクト（ID単位カウント表示は従来仕様のまま）
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

  // クラフト用セレクト（武器）
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
      const owned = weaponCounts[r.id] || 0;
      const ownedText = owned > 0 ? `（所持${owned}）` : "";
      opt.textContent = tierLabel ? `${tierLabel}${baseName}${ownedText}` : `${r.name}${ownedText}`;
      wCraftSel.appendChild(opt);
    });
    if (prevWeaponId &&
        Array.from(wCraftSel.options).some(o => o.value === prevWeaponId)) {
      wCraftSel.value = prevWeaponId;
    }
  }

  // クラフト用セレクト（防具）
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
      const owned = armorCounts[r.id] || 0;
      const ownedText = owned > 0 ? `（所持${owned}）` : "";
      opt.textContent = tierLabel ? `${tierLabel}${baseName}${ownedText}` : `${r.name}${ownedText}`;
      aCraftSel.appendChild(opt);
    });
    if (prevArmorId &&
        Array.from(aCraftSel.options).some(o => o.value === prevArmorId)) {
      aCraftSel.value = prevArmorId;
    }
  }

  // クラフト用セレクト（ポーション）
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
      const owned = potionCounts[r.id] || 0;
      const ownedText = owned > 0 ? `（所持${owned}）` : "";
      opt.textContent = tierLabel ? `${tierLabel}${baseName}${ownedText}` : `${r.name}${ownedText}`;
      pCraftSel.appendChild(opt);
    });
    if (prevPotionId &&
        Array.from(pCraftSel.options).some(o => o.value === prevPotionId)) {
      pCraftSel.value = prevPotionId;
    }
  }

  // クラフト用セレクト（道具）
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
    if (prevToolId &&
        Array.from(tCraftSel.options).some(o => o.value === prevToolId)) {
      tCraftSel.value = prevToolId;
    }
  }

  // クラフト用セレクト（中間素材）
  if (interSel) {
    interSel.innerHTML = "";
    if (Array.isArray(INTERMEDIATE_MATERIALS)) {
      INTERMEDIATE_MATERIALS.forEach(def => {
        if (tierFilter !== "all") {
          if (!def.id.includes("_" + tierFilter)) return;
        }
        const opt = document.createElement("option");
        opt.value = def.id;
        opt.textContent = def.name || def.id;
        interSel.appendChild(opt);
      });
    }
    if (prevInterId &&
        Array.from(interSel.options).some(o => o.value === prevInterId)) {
      interSel.value = prevInterId;
    }
  }

  // クラフト用セレクト（料理：食べ物）
  if (foodSel) {
    foodSel.innerHTML = "";
    if (COOKING_RECIPES && Array.isArray(COOKING_RECIPES.food)) {
      COOKING_RECIPES.food.forEach(r => {
        if (tierFilter !== "all" && typeof r.tier !== "undefined") {
          const t = String(r.tier);
          if (t !== tierFilter) return;
        }
        const opt = document.createElement("option");
        opt.value = r.id;
        const owned = typeof foodCounts === "object" ? (foodCounts[r.id] || 0) : 0;
        const ownedText = owned > 0 ? `（所持${owned}）` : "";
        const tierLabel = r.tier ? `${r.tier} ` : "";
        opt.textContent = `${tierLabel}${r.name}${ownedText}`;
        foodSel.appendChild(opt);
      });
    }
    if (prevFoodId &&
        Array.from(foodSel.options).some(o => o.value === prevFoodId)) {
      foodSel.value = prevFoodId;
    } else if (foodSel.options.length > 0) {
      foodSel.selectedIndex = 0;
    }
  }

  // クラフト用セレクト（料理：飲み物）
  if (drinkSel) {
    drinkSel.innerHTML = "";
    if (COOKING_RECIPES && Array.isArray(COOKING_RECIPES.drink)) {
      COOKING_RECIPES.drink.forEach(r => {
        if (tierFilter !== "all" && typeof r.tier !== "undefined") {
          const t = String(r.tier);
          if (t !== tierFilter) return;
        }
        const opt = document.createElement("option");
        opt.value = r.id;
        const owned = typeof drinkCounts === "object" ? (drinkCounts[r.id] || 0) : 0;
        const ownedText = owned > 0 ? `（所持${owned}）` : "";
        const tierLabel = r.tier ? `${r.tier} ` : "";
        opt.textContent = `${tierLabel}${r.name}${ownedText}`;
        drinkSel.appendChild(opt);
      });
    }
    if (prevDrinkId &&
        Array.from(drinkSel.options).some(o => o.value === prevDrinkId)) {
      drinkSel.value = prevDrinkId;
    } else if (drinkSel.options.length > 0) {
      drinkSel.selectedIndex = 0;
    }
  }

  const infoEl = document.getElementById("craftCostInfo");

  const updateCraftByCategory = (cat) => {
    if (cat === "weapon" && wCraftSel && wCraftSel.value) {
      updateCraftCostInfo("weapon", wCraftSel.value);
      lastCraftCategory = "weapon";
      return true;
    }
    if (cat === "armor" && aCraftSel && aCraftSel.value) {
      updateCraftCostInfo("armor", aCraftSel.value);
      lastCraftCategory = "armor";
      return true;
    }
    if (cat === "potion" && pCraftSel && pCraftSel.value) {
      updateCraftCostInfo("potion", pCraftSel.value);
      lastCraftCategory = "potion";
      return true;
    }
    if (cat === "tool" && tCraftSel && tCraftSel.value) {
      updateCraftCostInfo("tool", tCraftSel.value);
      lastCraftCategory = "tool";
      return true;
    }
    if (cat === "material" && interSel && interSel.value) {
      updateCraftCostInfo("material", interSel.value);
      lastCraftCategory = "material";
      return true;
    }
    if (cat === "cookingFood" && foodSel && foodSel.value) {
      updateCraftCostInfo("cookingFood", foodSel.value);
      lastCraftCategory = "cookingFood";
      return true;
    }
    if (cat === "cookingDrink" && drinkSel && drinkSel.value) {
      updateCraftCostInfo("cookingDrink", drinkSel.value);
      lastCraftCategory = "cookingDrink";
      return true;
    }
    return false;
  };

  if (updateCraftByCategory(lastCraftCategory)) {
    return;
  }

  if (updateCraftByCategory("weapon"))        return;
  if (updateCraftByCategory("armor"))         return;
  if (updateCraftByCategory("potion"))        return;
  if (updateCraftByCategory("tool"))          return;
  if (updateCraftByCategory("material"))      return;
  if (updateCraftByCategory("cookingFood"))   return;
  if (updateCraftByCategory("cookingDrink"))  return;

  if (infoEl) {
    infoEl.textContent = "必要素材：-";
  }
}

// ★ ここはまだ「ID単位装備」のまま（インスタンス選択UIは別セレクトで増やす想定）
// 「勝手に装備させないでね」という条件に合わせて、どのインスタンスを装備するかは
// 別の UI / 関数で index を明示的に指定してもらう形にする。

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

  if (w.enhance >= STAR_SHARD_NEED_LV) {
    if (typeof itemCounts !== "object") {
      appendLog("星屑の結晶の所持情報が取得できない");
      return;
    }
    const haveShard = itemCounts[STAR_SHARD_ITEM_ID] || 0;
    if (haveShard < STAR_SHARD_NEED_NUM) {
      appendLog(`星屑の結晶が足りない（${haveShard}/${STAR_SHARD_NEED_NUM}）`);
      return;
    }
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
  const success = Math.random()<rate;

  if (w.enhance >= STAR_SHARD_NEED_LV && typeof itemCounts === "object") {
    itemCounts[STAR_SHARD_ITEM_ID] =
      Math.max(0, (itemCounts[STAR_SHARD_ITEM_ID] || 0) - STAR_SHARD_NEED_NUM);
  }

  if(success){
    w.enhance++;
    appendLog(`武器強化成功！ ${w.name}+${w.enhance}になった（同名武器1本消費${w.enhance-1 >= STAR_SHARD_NEED_LV ? "＋星屑の結晶消費" : ""}）`);
  }else{
    appendLog(`武器強化失敗…（同名武器は消費された${w.enhance >= STAR_SHARD_NEED_LV ? "／星屑の結晶も消費された" : ""}）`);
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

  if (a.enhance >= STAR_SHARD_NEED_LV) {
    if (typeof itemCounts !== "object") {
      appendLog("星屑の結晶の所持情報が取得できない");
      return;
    }
    const haveShard = itemCounts[STAR_SHARD_ITEM_ID] || 0;
    if (haveShard < STAR_SHARD_NEED_NUM) {
      appendLog(`星屑の結晶が足りない（${haveShard}/${STAR_SHARD_NEED_NUM}）`);
      return;
    }
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
  const success = Math.random()<rate;

  if (a.enhance >= STAR_SHARD_NEED_LV && typeof itemCounts === "object") {
    itemCounts[STAR_SHARD_ITEM_ID] =
      Math.max(0, (itemCounts[STAR_SHARD_ITEM_ID] || 0) - STAR_SHARD_NEED_NUM);
  }

  if(success){
    a.enhance++;
    appendLog(`防具強化成功！ ${a.name}+${a.enhance}になった（同名防具1つ消費${a.enhance-1 >= STAR_SHARD_NEED_LV ? "＋星屑の結晶消費" : ""}）`);
  }else{
    appendLog(`防具強化失敗…（同名防具は消費された${a.enhance >= STAR_SHARD_NEED_LV ? "／星屑の結晶も消費された" : ""}）`);
  }
  refreshEquipSelects();
  updateDisplay();
}