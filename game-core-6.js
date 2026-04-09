// game-core-6.js
// クラフト・中間素材

// =======================
// クラフト共通
// =======================

// クラフト品質関連（0:普通, 1:良品, 2:傑作）
const QUALITY_NAMES = ["", "【良品】", "【傑作】"];

// 必要なら性能補正用レート（今は未使用、後でダメージ計算側で使う想定）
const QUALITY_RATE = [1.0, 1.05, 1.12];

// ★ tier 判定ヘルパー
function getTierFromId(id) {
  if (id.endsWith("_T1") || id.endsWith("T1")) return "T1";
  if (id.endsWith("_T2") || id.endsWith("T2")) return "T2";
  if (id.endsWith("_T3") || id.endsWith("T3")) return "T3";
  return "T1";
}

// ★ tier × スキルLvで表示可否を決める共通ヘルパー
function canShowByTierAndSkill(idOrTier, skillLv) {
  const tier =
    idOrTier === "T1" || idOrTier === "T2" || idOrTier === "T3"
      ? idOrTier
      : getTierFromId(idOrTier);

  if (tier === "T1") return true;
  if (tier === "T2") return skillLv >= 10;
  if (tier === "T3") return skillLv >= 20;
  return true;
}

// 料理専用（recipe.tier を使う）
function canShowCookingRecipeBySkill(recipe, cookingLv) {
  const tier = recipe.tier || "T1";
  return canShowByTierAndSkill(tier, cookingLv);
}

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

    // カテゴリに応じて日本語ラベルを出す
    let label = category;
    if (category === "weapon")   label = "武器";
    else if (category === "armor")    label = "防具";
    else if (category === "potion")   label = "ポーション";
    else if (category === "tool")     label = "道具";
    else if (category === "cooking")  label = "料理";
    else if (category === "material") label = "中間素材";

    appendLog(`${label}クラフトスキルがLv${s.lv}になった！`);
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
      const tierInfo = def.from[baseKey];
      const m = materials[baseKey];
      Object.keys(tierInfo).forEach(tierKey => {
        const need = tierInfo[tierKey] || 0;
        if (!need) return;
        const have = m ? (m[tierKey] || 0) : 0;
        const tierLabel = tierKey.toUpperCase();
        const name = baseNames[baseKey] || baseKey;
        parts.push(`${tierLabel}${name} ${have}/${need}`);
      });
    });

    infoEl.textContent = "必要素材：" + (parts.length ? parts.join(" ") : "-");
    return;
  } else if (category === "cookingFood" || category === "cookingDrink") {
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

    infoEl.textContent = "必要素材：" + (list.length ? list.join(" ") : "-");
    return;
  }

  if (!recipe || !recipe.cost) {
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

    if (k in tierMatNames) {
      const [base, tier] = k.split("_");
      const m = materials[base];
      if (m) {
        const tierKey = tier.toLowerCase();
        have = m[tierKey] || 0;
      }
      label = tierMatNames[k];
    } else if (k in interNames) {
      if (typeof intermediateMats === "object") {
        have = intermediateMats[k] || 0;
      } else {
        have = 0;
      }
      label = interNames[k];
    } else if (k in materials) {
      have = getMatTotal(k);
      label = baseNames[k] || k;
    } else {
      label = k;
      have = 0;
    }

    list.push(`${label} ${have}/${need}`);
  });

  infoEl.textContent = "必要素材：" + (list.length ? list.join(" ") : "-");
}

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

  if (!checkTier("herb",  "t1", cost.herb_T1)) return false;
  if (!checkTier("herb",  "t2", cost.herb_T2)) return false;
  if (!checkTier("herb",  "t3", cost.herb_T3)) return false;
  if (!checkTier("water", "t1", cost.water_T1)) return false;
  if (!checkTier("water", "t2", cost.water_T2)) return false;
  if (!checkTier("water", "t3", cost.water_T3)) return false;

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

function hasCookingMaterials(cost){
  if (!cost || !cookingMats) return false;
  return Object.keys(cost).every(k => {
    const need = cost[k];
    if (!need) return true;
    return (cookingMats[k] || 0) >= need;
  });
}

function consumeCookingMaterials(cost){
  if (!cost || !cookingMats) return;
  Object.keys(cost).forEach(k => {
    const need = cost[k];
    if (!need) return;
    const have = cookingMats[k] || 0;
    cookingMats[k] = Math.max(0, have - need);
  });
}

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

  decTier("herb",  "t1", cost.herb_T1);
  decTier("herb",  "t2", cost.herb_T2);
  decTier("herb",  "t3", cost.herb_T3);
  decTier("water", "t1", cost.water_T1);
  decTier("water", "t2", cost.water_T2);
  decTier("water", "t3", cost.water_T3);

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

// ギルドによるクラフト成功率ボーナス（カテゴリ別）
// smith: weapon / armor, alchemist: potion / tool, cooking: food / drink
function getGuildCraftSuccessBonus(category) {
  if (!window.playerGuildId || !window.guildFame) return 0;
  const guildId = window.playerGuildId;
  const fame    = window.guildFame[guildId] || 0;

  // guild.js と同じ閾値構成をここでも使う想定:
  const thresholds = [
    { fame: 0,   rank: 0 },
    { fame: 10,  rank: 1 },
    { fame: 30,  rank: 2 },
    { fame: 70,  rank: 3 },
    { fame: 150, rank: 4 },
    { fame: 300, rank: 5 }
  ];

  let currentRank = 0;
  for (const t of thresholds) {
    if (fame >= t.fame) currentRank = t.rank;
  }
  if (currentRank <= 0) return 0;

  // ランク毎 +2% => rank * 0.02
  const bonusPerRank = 0.02;
  const bonus = currentRank * bonusPerRank;

  // ギルド×カテゴリの対応
  if (guildId === "smith" && (category === "weapon" || category === "armor")) {
    return bonus;
  }
  if (guildId === "alchemist" && (category === "potion" || category === "tool")) {
    return bonus;
  }
  if (guildId === "cooking" && (category === "food" || category === "drink")) {
    return bonus;
  }

  return 0;
}

function craftWeapon(){
  console.log("craftWeapon from game-core-6.js");
  const sel = document.getElementById("weaponSelect");
  if(!sel || !sel.value) return;

  const prevRecipeId = sel.value;

  const recipe = CRAFT_RECIPES.weapon.find(r => r.id === sel.value);
  if(!recipe){ appendLog("その武器レシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ appendLog("素材が足りない"); return; }

  const skillLv = getCraftSkillLevel("weapon");
  let successRate = calcCraftSuccessRate(recipe.baseRate, skillLv);

  // ギルド成功率ボーナス（鍛冶ギルド）
  const guildBonus = (typeof getGuildCraftSuccessBonus === "function")
    ? getGuildCraftSuccessBonus("weapon")
    : 0;
  successRate = Math.min(1, successRate + guildBonus);

  consumeMaterials(recipe.cost);
  addCraftSkillExp("weapon");

  if (Math.random() >= successRate) {
    appendLog(`${recipe.name} のクラフトに失敗した…（素材は消費された）`);
    updateDisplay();
    return;
  }

  const q = rollQualityBySkillLv(skillLv);
  const qName = QUALITY_NAMES[q];

  const master = weapons.find(w => w.id === recipe.id);
  const baseEnh = master ? (master.enhance || 0) : 0;
  addWeaponInstance(recipe.id, q, baseEnh);

  appendLog(`${qName}${recipe.name} をクラフトした`);

  // ★ 鍛冶ギルド用：武器クラフト依頼を進行
  if (typeof onCraftCompletedForGuild === "function") {
    onCraftCompletedForGuild({ category: "weapon", recipeId: recipe.id });
  }

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
  let successRate = calcCraftSuccessRate(recipe.baseRate, skillLv);

  // ギルド成功率ボーナス（鍛冶ギルド）
  const guildBonus = (typeof getGuildCraftSuccessBonus === "function")
    ? getGuildCraftSuccessBonus("armor")
    : 0;
  successRate = Math.min(1, successRate + guildBonus);

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

  // ★ 鍛冶ギルド用：防具クラフト依頼を進行
  if (typeof onCraftCompletedForGuild === "function") {
    onCraftCompletedForGuild({ category: "armor", recipeId: recipe.id });
  }

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
  let successRate = calcCraftSuccessRate(recipe.baseRate, skillLv);

  // ギルド成功率ボーナス（錬金ギルド）
  const guildBonus = (typeof getGuildCraftSuccessBonus === "function")
    ? getGuildCraftSuccessBonus("potion")
    : 0;
  successRate = Math.min(1, successRate + guildBonus);

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

  // ★ 錬金ギルド用：ポーションクラフト依頼を進行
  if (typeof onCraftCompletedForGuild === "function") {
    onCraftCompletedForGuild({ category: "potion", recipeId: recipe.id });
  }

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
  let successRate = calcCraftSuccessRate(recipe.baseRate, skillLv);

  // ギルド成功率ボーナス（錬金ギルド）
  const guildBonus = (typeof getGuildCraftSuccessBonus === "function")
    ? getGuildCraftSuccessBonus("tool")
    : 0;
  successRate = Math.min(1, successRate + guildBonus);

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

  // ★ 錬金／道具系ギルド用：道具クラフト依頼を進行
  if (typeof onCraftCompletedForGuild === "function") {
    onCraftCompletedForGuild({ category: "tool", recipeId: recipe.id });
  }

  updateDisplay();
  refreshEquipSelects();

  const selAfter = document.getElementById("toolSelect");
  if (selAfter) {
    selAfter.value = prevRecipeId;
    updateCraftCostInfo("tool", prevRecipeId);
  }
}

function craftIntermediate(interId){
  if (!Array.isArray(INTERMEDIATE_MATERIALS)) return;
  const def = INTERMEDIATE_MATERIALS.find(m => m.id === interId);
  if (!def || !def.from) {
    appendLog("その中間素材は作れない");
    return;
  }

  const cost = {};
  Object.keys(def.from).forEach(baseKey => {
    const tierInfo = def.from[baseKey];
    Object.keys(tierInfo).forEach(tierKey => {
      const need = tierInfo[tierKey] || 0;
      if (!need) return;
      const keyName = `${baseKey}_${tierKey.toUpperCase()}`;
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

  // ★ 中間素材クラフトスキルにEXP
  if (craftSkills.material) {
    addCraftSkillExp("material");
  }

  appendLog(`${def.name} を作成した`);
  updateDisplay();
}

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
  let successRate = calcCraftSuccessRate(recipe.baseRate || 1.0, skillLv);

  // ギルド成功率ボーナス（料理ギルド）
  const guildBonus = (typeof getGuildCraftSuccessBonus === "function")
    ? getGuildCraftSuccessBonus("food")
    : 0;
  successRate = Math.min(1, successRate + guildBonus);

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

  // ★ 料理ギルド用：料理クラフト依頼を進行
  if (typeof onCraftCompletedForGuild === "function") {
    onCraftCompletedForGuild({ category: "food", recipeId: recipe.id });
  }

  updateDisplay();
  refreshEquipSelects();

  const selAfter = document.getElementById("foodSelect");
  if (selAfter) {
    selAfter.value = prevRecipeId;
    updateCraftCostInfo("cookingFood", prevRecipeId);
  }
}

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
  let successRate = calcCraftSuccessRate(recipe.baseRate || 1.0, skillLv);

  // ギルド成功率ボーナス（料理ギルド）
  const guildBonus = (typeof getGuildCraftSuccessBonus === "function")
    ? getGuildCraftSuccessBonus("drink")
    : 0;
  successRate = Math.min(1, successRate + guildBonus);

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

  // ★ 料理ギルド用：飲み物クラフト依頼を進行
  if (typeof onCraftCompletedForGuild === "function") {
    onCraftCompletedForGuild({ category: "drink", recipeId: recipe.id });
  }

  updateDisplay();
  refreshEquipSelects();

  const selAfter = document.getElementById("drinkSelect");
  if (selAfter) {
    selAfter.value = prevRecipeId;
    updateCraftCostInfo("cookingDrink", prevRecipeId);
  }
}