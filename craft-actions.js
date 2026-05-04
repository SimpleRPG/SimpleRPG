// craft-actions.js
// 各カテゴリごとのクラフト実行ロジック

// ★ 武器・防具インスタンス追加ヘルパー
// weaponInstances / armorInstances / MAX_DURABILITY / weaponCounts / armorCounts を利用する前提
function addWeaponInstance(id, quality, enhance) {
  const inst = {
    id,
    quality: quality || 0,
    enhance: enhance || 0,
    durability: MAX_DURABILITY,
    location: "warehouse"
  };
  weaponInstances.push(inst);
  weaponCounts[id] = (weaponCounts[id] || 0) + 1;
}

function addArmorInstance(id, quality, enhance) {
  const inst = {
    id,
    quality: quality || 0,
    enhance: enhance || 0,
    durability: MAX_DURABILITY,
    location: "warehouse"
  };
  armorInstances.push(inst);
  armorCounts[id] = (armorCounts[id] || 0) + 1;
}

// =======================
// 各クラフト実行（ITEM_META 駆動）
// =======================

function craftWeapon(){
  console.log("craftWeapon from craft-actions.js");
  const sel = document.getElementById("weaponSelect");
  if(!sel || !sel.value) return;

  const prevRecipeId = sel.value;

  const recipes = getAllCraftRecipesByCategory("weapon");
  const recipe  = recipes.find(r => r.id === sel.value);
  if(!recipe){ appendLog("その武器レシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ appendLog("素材が足りない"); return; }

  const skillLv = getCraftSkillLevel("weapon");
  let successRate = calcCraftSuccessRate(recipe.baseRate, skillLv);

  // ギルド成功率ボーナス（鍛冶ギルド）
  const guildBonus = getGuildCraftSuccessBonus("weapon");

  // ★ペット特性ボーナス（兎など）
  const traitBonus = (typeof getCraftSuccessBonusByTrait === "function")
    ? getCraftSuccessBonusByTrait()
    : 0;

  // ★日替わりボーナス: 武器クラフト成功率
  let dailyAdd = 0;
  if (typeof getDailyCraftBonus === "function") {
    const daily = getDailyCraftBonus("weapon");
    if (daily && typeof daily.successAdd === "number") {
      successRate += daily.successAdd;
      dailyAdd = daily.successAdd;
    }
  }

  successRate = Math.min(1, successRate + guildBonus + traitBonus);

  // ログ用: 実際に消費されるコスト（軽減後）
  refreshCraftSkillTreeBonus();
  const finalCost = applyCraftCostReduction(recipe.cost) || {};

  consumeMaterials(recipe.cost);
  addCraftSkillExp("weapon");

  const roll = Math.random();
  const success = roll < successRate;

  if (!success) {
    // 統計: 失敗
    addCraftStat("weapon", recipe.id, false);
    appendLog(`${recipe.name} のクラフトに失敗した…（素材は消費された）`);

    if (typeof debugRecordCraft === "function") {
      try {
        debugRecordCraft({
          category: "weapon",
          recipeId: recipe.id,
          success: false,
          skillLv,
          successRate,
          cost: finalCost,
          guildBonus,
          traitBonus,
          dailyBonus: dailyAdd
        });
      } catch (e) {}
    }

    updateDisplay();
    return;
  }

  const q = rollQualityBySkillLv(skillLv);
  const qName = QUALITY_NAMES[q];

  // ★ ITEM_META 由来の baseEnh
  let baseEnh = 0;
  if (typeof getItemMeta === "function") {
    const meta = getItemMeta(recipe.id);
    if (meta && typeof meta.baseEnhance === "number") {
      baseEnh = meta.baseEnhance;
    }
  }

  // インスタンスを生成し、倉庫に追加
  addWeaponInstance(recipe.id, q, baseEnh);

  // 統計: 成功
  addCraftStat("weapon", recipe.id, true);

  appendLog(`${qName}${recipe.name} をクラフトした`);

  // ★ smithデイリー: 武器/防具制作15個
  if (typeof onSmithCraftCompletedForGuild === "function") {
    onSmithCraftCompletedForGuild(recipe.id);
  }

  // 成功ログ
  if (typeof debugRecordCraft === "function") {
    try {
      debugRecordCraft({
        category: "weapon",
        recipeId: recipe.id,
        success: true,
        skillLv,
        successRate,
        cost: finalCost,
        resultItems: [{ id: recipe.id, count: 1, quality: q }],
        guildBonus,
        traitBonus,
        dailyBonus: dailyAdd
      });
    } catch (e) {}
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

  const recipes = getAllCraftRecipesByCategory("armor");
  const recipe  = recipes.find(r => r.id === sel.value);
  if(!recipe){ appendLog("その防具レシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ appendLog("素材が足りない"); return; }

  const skillLv = getCraftSkillLevel("armor");
  let successRate = calcCraftSuccessRate(recipe.baseRate, skillLv);

  // ギルド成功率ボーナス（鍛冶ギルド）
  const guildBonus = getGuildCraftSuccessBonus("armor");

  const traitBonus = (typeof getCraftSuccessBonusByTrait === "function")
    ? getCraftSuccessBonusByTrait()
    : 0;

  // ★日替わりボーナス: 防具クラフト成功率
  let dailyAdd = 0;
  if (typeof getDailyCraftBonus === "function") {
    const daily = getDailyCraftBonus("armor");
    if (daily && typeof daily.successAdd === "number") {
      successRate += daily.successAdd;
      dailyAdd = daily.successAdd;
    }
  }

  successRate = Math.min(1, successRate + guildBonus + traitBonus);

  refreshCraftSkillTreeBonus();
  const finalCost = applyCraftCostReduction(recipe.cost) || {};

  consumeMaterials(recipe.cost);
  addCraftSkillExp("armor");

  const roll = Math.random();
  const success = roll < successRate;

  if (!success) {
    addCraftStat("armor", recipe.id, false);
    appendLog(`${recipe.name} のクラフトに失敗した…（素材は消費された）`);

    if (typeof debugRecordCraft === "function") {
      try {
        debugRecordCraft({
          category: "armor",
          recipeId: recipe.id,
          success: false,
          skillLv,
          successRate,
          cost: finalCost,
          guildBonus,
          traitBonus,
          dailyBonus: dailyAdd
        });
      } catch (e) {}
    }

    updateDisplay();
    return;
  }

  const q = rollQualityBySkillLv(skillLv);
  const qName = QUALITY_NAMES[q];

  // ★ ITEM_META 由来の baseEnh
  let baseEnh = 0;
  if (typeof getItemMeta === "function") {
    const meta = getItemMeta(recipe.id);
    if (meta && typeof meta.baseEnhance === "number") {
      baseEnh = meta.baseEnhance;
    }
  }

  addArmorInstance(recipe.id, q, baseEnh);

  addCraftStat("armor", recipe.id, true);

  appendLog(`${qName}${recipe.name} をクラフトした`);

  // ★ smithデイリー: 武器/防具制作15個
  if (typeof onSmithCraftCompletedForGuild === "function") {
    onSmithCraftCompletedForGuild(recipe.id);
  }

  if (typeof debugRecordCraft === "function") {
    try {
      debugRecordCraft({
        category: "armor",
        recipeId: recipe.id,
        success: true,
        skillLv,
        successRate,
        cost: finalCost,
        resultItems: [{ id: recipe.id, count: 1, quality: q }],
        guildBonus,
        traitBonus,
        dailyBonus: dailyAdd
      });
    } catch (e) {}
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

  const recipes = getAllCraftRecipesByCategory("potion");
  const recipe  = recipes.find(r => r.id === sel.value);
  if(!recipe){ appendLog("そのポーションレシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ appendLog("素材が足りない"); return; }

  const skillLv = getCraftSkillLevel("potion");
  let successRate = calcCraftSuccessRate(recipe.baseRate, skillLv);

  // ギルド成功率ボーナス（錬金ギルド）
  const guildBonus = getGuildCraftSuccessBonus("potion");

  const traitBonus = (typeof getCraftSuccessBonusByTrait === "function")
    ? getCraftSuccessBonusByTrait()
    : 0;

  // ★日替わりボーナス: ポーションクラフト成功率
  let dailyAdd = 0;
  if (typeof getDailyCraftBonus === "function") {
    const daily = getDailyCraftBonus("potion");
    if (daily && typeof daily.successAdd === "number") {
      successRate += daily.successAdd;
      dailyAdd = daily.successAdd;
    }
  }

  successRate = Math.min(1, successRate + guildBonus + traitBonus);

  refreshCraftSkillTreeBonus();
  const finalCost = applyCraftCostReduction(recipe.cost) || {};

  consumeMaterials(recipe.cost);
  addCraftSkillExp("potion");

  const roll = Math.random();
  const success = roll < successRate;

  if (!success) {
    addCraftStat("potion", recipe.id, false);
    appendLog(`${recipe.name} のクラフトに失敗した…（素材は消費された）`);
    updateDisplay();
    refreshEquipSelects();

    if (typeof debugRecordCraft === "function") {
      try {
        debugRecordCraft({
          category: "potion",
          recipeId: recipe.id,
          success: false,
          skillLv,
          successRate,
          cost: finalCost,
          guildBonus,
          traitBonus,
          dailyBonus: dailyAdd
        });
      } catch (e) {}
    }

    const selAfterFail = document.getElementById("potionSelect");
    if (selAfterFail) {
      selAfterFail.value = prevRecipeId;
      updateCraftCostInfo("potion", prevRecipeId);
    }
    return;
  }

  // 完成品追加（メタ一元化）
  if (typeof addItemByMeta === "function") {
    addItemByMeta(recipe.id, 1);
  }

  addCraftStat("potion", recipe.id, true);

  appendLog(`${recipe.name} をクラフトした`);

  // ★ alchemistデイリー: ポーション/道具制作15個
  if (typeof onAlchCraftCompletedForGuild === "function") {
    onAlchCraftCompletedForGuild(recipe.id);
  }

  if (typeof debugRecordCraft === "function") {
    try {
      debugRecordCraft({
        category: "potion",
        recipeId: recipe.id,
        success: true,
        skillLv,
        successRate,
        cost: finalCost,
        resultItems: [{ id: recipe.id, count: 1 }],
        guildBonus,
        traitBonus,
        dailyBonus: dailyAdd
      });
    } catch (e) {}
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

  const recipes = getAllCraftRecipesByCategory("tool");
  const recipe  = recipes.find(r => r.id === sel.value);
  if(!recipe){ appendLog("その道具レシピは存在しない"); return; }
  if(!hasMaterials(recipe.cost)){ appendLog("素材が足りない"); return; }

  const skillLv = getCraftSkillLevel("tool");
  let successRate = calcCraftSuccessRate(recipe.baseRate, skillLv);

  // ギルド成功率ボーナス（錬金ギルド）
  const guildBonus = getGuildCraftSuccessBonus("tool");

  const traitBonus = (typeof getCraftSuccessBonusByTrait === "function")
    ? getCraftSuccessBonusByTrait()
    : 0;

  // ★日替わりボーナス: 道具クラフト成功率
  let dailyAdd = 0;
  if (typeof getDailyCraftBonus === "function") {
    const daily = getDailyCraftBonus("tool");
    if (daily && typeof daily.successAdd === "number") {
      successRate += daily.successAdd;
      dailyAdd = daily.successAdd;
    }
  }

  successRate = Math.min(1, successRate + guildBonus + traitBonus);

  refreshCraftSkillTreeBonus();
  const finalCost = applyCraftCostReduction(recipe.cost) || {};

  consumeMaterials(recipe.cost);
  addCraftSkillExp("tool");

  const roll = Math.random();
  const success = roll < successRate;

  if (!success) {
    addCraftStat("tool", recipe.id, false);
    appendLog(`${recipe.name} のクラフトに失敗した…（素材は消費された）`);
    updateDisplay();
    refreshEquipSelects();

    if (typeof debugRecordCraft === "function") {
      try {
        debugRecordCraft({
          category: "tool",
          recipeId: recipe.id,
          success: false,
          skillLv,
          successRate,
          cost: finalCost,
          guildBonus,
          traitBonus,
          dailyBonus: dailyAdd
        });
      } catch (e) {}
    }

    const selAfterFail = document.getElementById("toolSelect");
    if (selAfterFail) {
      selAfterFail.value = prevRecipeId;
      updateCraftCostInfo("tool", prevRecipeId);
    }
    return;
  }

  if (typeof addItemByMeta === "function") {
    addItemByMeta(recipe.id, 1);
  }

  addCraftStat("tool", recipe.id, true);

  appendLog(`${recipe.name} をクラフトした`);

  // ★ alchemistデイリー: ポーション/道具制作15個
  if (typeof onAlchCraftCompletedForGuild === "function") {
    onAlchCraftCompletedForGuild(recipe.id);
  }

  if (typeof debugRecordCraft === "function") {
    try {
      debugRecordCraft({
        category: "tool",
        recipeId: recipe.id,
        success: true,
        skillLv,
        successRate,
        cost: finalCost,
        resultItems: [{ id: recipe.id, count: 1 }],
        guildBonus,
        traitBonus,
        dailyBonus: dailyAdd
      });
    } catch (e) {}
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
  if (typeof getItemMeta !== "function") return;
  const meta = getItemMeta(interId);
  const craft = meta && meta.craft;
  if (!craft || craft.category !== "material" || !craft.cost) {
    appendLog("その中間素材は作れない");
    return;
  }

  const rawCost = craft.cost;

  if (!hasMaterials(rawCost)) {
    appendLog("素材が足りない（中間素材）");
    return;
  }

  refreshCraftSkillTreeBonus();
  const finalCost = applyCraftCostReduction(rawCost) || {};

  consumeMaterials(rawCost);

  // 在庫追加（中間素材用 storageKind: intermediate）
  if (typeof addItemByMeta === "function") {
    addItemByMeta(interId, 1);
  }

  // ★ 中間素材クラフトスキルにEXP
  if (craftSkills.material) {
    addCraftSkillExp("material");
  }

  // 統計: 中間素材は成功扱いのみ
  addCraftStat("material", interId, true);

  let extraMade = 0;

  // ★スキルツリー: 中間素材EXTRAチャンス（+1個）
  if (typeof getGlobalSkillTreeBonus === "function") {
    const b = getGlobalSkillTreeBonus() || {};
    const extraChance = b.craftIntermediateExtraChance || 0;
    if (extraChance > 0 && Math.random() < extraChance) {
      if (typeof addItemByMeta === "function") {
        addItemByMeta(interId, 1);
      }
      extraMade = 1;
      appendLog("手際が良く、追加で中間素材をもう1つ作成できた！");
    }
  }

  const totalCount = 1 + extraMade;

  if (typeof debugRecordCraft === "function") {
    try {
      debugRecordCraft({
        category: "material",
        recipeId: interId,
        success: true,
        skillLv: getCraftSkillLevel("material") || 0,
        successRate: 1,
        cost: finalCost,
        resultItems: [{ id: interId, count: totalCount }]
      });
    } catch (e) {}
  }

  appendLog(`${meta.name || interId} を作成した`);
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
  const guildBonus = getGuildCraftSuccessBonus("food");

  const traitBonus = (typeof getCraftSuccessBonusByTrait === "function")
    ? getCraftSuccessBonusByTrait()
    : 0;

  // ★日替わりボーナス: 料理クラフト成功率（食べ物）
  let dailyAdd = 0;
  if (typeof getDailyCraftBonus === "function") {
    const daily = getDailyCraftBonus("food");
    if (daily && typeof daily.successAdd === "number") {
      successRate += daily.successAdd;
      dailyAdd = daily.successAdd;
    }
  }

  successRate = Math.min(1, successRate + guildBonus + traitBonus);

  // 実際に消費されるコストをログ用に組み立て
  let finalCost = {};
  if (recipe.cost) {
    refreshCraftSkillTreeBonus();
    const rate = craftSkillTreeBonus.craftCostReduceRate || 0;
    Object.keys(recipe.cost).forEach(id => {
      const raw = recipe.cost[id] | 0;
      if (!raw) return;
      let need = raw;
      if (rate > 0) {
        need = Math.max(0, Math.floor(raw * (1 - rate)));
      }
      if (need > 0) finalCost[id] = need;
    });
  } else if (Array.isArray(recipe.requires)) {
    refreshCraftSkillTreeBonus();
    const rate = craftSkillTreeBonus.craftCostReduceRate || 0;
    recipe.requires.forEach(req => {
      const raw = req.amount | 0;
      const id = req.id;
      if (!raw || !id) return;
      let need = raw;
      if (rate > 0) {
        need = Math.max(0, Math.floor(raw * (1 - rate)));
      }
      if (need > 0) {
        finalCost[id] = (finalCost[id] || 0) + need;
      }
    });
  }

  const roll = Math.random();
  const success = roll < successRate;

  // 失敗時
  if (!success) {
    if (recipe.cost) consumeCookingMaterials(recipe.cost);
    else consumeCookingMaterialsByRequires(recipe);

    if (craftSkills.cooking) {
      addCraftSkillExp("cooking");
    }

    addCraftStat("food", recipe.id, false);

    appendLog(`${recipe.name} の料理に失敗した…（素材は消費された）`);

    if (typeof debugRecordCraft === "function") {
      try {
        debugRecordCraft({
          category: "food",
          recipeId: recipe.id,
          success: false,
          skillLv,
          successRate,
          cost: finalCost,
          guildBonus,
          traitBonus,
          dailyBonus: dailyAdd
        });
      } catch (e) {}
    }

    updateDisplay();
    refreshEquipSelects();
    const selAfterFail = document.getElementById("foodSelect");
    if (selAfterFail) {
      selAfterFail.value = prevRecipeId;
      updateCraftCostInfo("cookingFood", prevRecipeId);
    }
    return;
  }

  // 成功時
  if (recipe.cost) consumeCookingMaterials(recipe.cost);
  else consumeCookingMaterialsByRequires(recipe);

  if (craftSkills.cooking) {
    addCraftSkillExp("cooking");
  }

  if (typeof addItemByMeta === "function") {
    addItemByMeta(recipe.id, 1);
  }

  addCraftStat("food", recipe.id, true);

  appendLog(`${recipe.name} を作った`);

  // ★ 料理ギルド用：料理クラフト依頼を進行
  if (typeof onCraftCompletedForGuild === "function") {
    onCraftCompletedForGuild({
      category: "food",
      recipeId: recipe.id,
      tier: recipe.tier || getTierNumberFromId(recipe.id)
    });
  }

  if (typeof debugRecordCraft === "function") {
    try {
      debugRecordCraft({
        category: "food",
        recipeId: recipe.id,
        success: true,
        skillLv,
        successRate,
        cost: finalCost,
        resultItems: [{ id: recipe.id, count: 1 }],
        guildBonus,
        traitBonus,
        dailyBonus: dailyAdd
      });
    } catch (e) {}
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
  const guildBonus = getGuildCraftSuccessBonus("drink");

  const traitBonus = (typeof getCraftSuccessBonusByTrait === "function")
    ? getCraftSuccessBonusByTrait()
    : 0;

  // ★日替わりボーナス: 料理クラフト成功率（飲み物）
  let dailyAdd = 0;
  if (typeof getDailyCraftBonus === "function") {
    const daily = getDailyCraftBonus("drink");
    if (daily && typeof daily.successAdd === "number") {
      successRate += daily.successAdd;
      dailyAdd = daily.successAdd;
    }
  }

  successRate = Math.min(1, successRate + guildBonus + traitBonus);

  // 実際に消費されるコスト
  let finalCost = {};
  if (recipe.cost) {
    refreshCraftSkillTreeBonus();
    const rate = craftSkillTreeBonus.craftCostReduceRate || 0;
    Object.keys(recipe.cost).forEach(id => {
      const raw = recipe.cost[id] | 0;
      if (!raw) return;
      let need = raw;
      if (rate > 0) {
        need = Math.max(0, Math.floor(raw * (1 - rate)));
      }
      if (need > 0) finalCost[id] = need;
    });
  } else if (Array.isArray(recipe.requires)) {
    refreshCraftSkillTreeBonus();
    const rate = craftSkillTreeBonus.craftCostReduceRate || 0;
    recipe.requires.forEach(req => {
      const raw = req.amount | 0;
      const id = req.id;
      if (!raw || !id) return;
      let need = raw;
      if (rate > 0) {
        need = Math.max(0, Math.floor(raw * (1 - rate)));
      }
      if (need > 0) {
        finalCost[id] = (finalCost[id] || 0) + need;
      }
    });
  }

  const roll = Math.random();
  const success = roll < successRate;

  // 失敗時
  if (!success) {
    if (recipe.cost) consumeCookingMaterials(recipe.cost);
    else consumeCookingMaterialsByRequires(recipe);

    if (craftSkills.cooking) {
      addCraftSkillExp("cooking");
    }

    addCraftStat("drink", recipe.id, false);

    appendLog(`${recipe.name} の調理に失敗した…（素材は消費された）`);

    if (typeof debugRecordCraft === "function") {
      try {
        debugRecordCraft({
          category: "drink",
          recipeId: recipe.id,
          success: false,
          skillLv,
          successRate,
          cost: finalCost,
          guildBonus,
          traitBonus,
          dailyBonus: dailyAdd
        });
      } catch (e) {}
    }

    updateDisplay();
    refreshEquipSelects();
    const selAfterFail = document.getElementById("drinkSelect");
    if (selAfterFail) {
      selAfterFail.value = prevRecipeId;
      updateCraftCostInfo("cookingDrink", prevRecipeId);
    }
    return;
  }

  // 成功時
  if (recipe.cost) consumeCookingMaterials(recipe.cost);
  else consumeCookingMaterialsByRequires(recipe);

  if (craftSkills.cooking) {
    addCraftSkillExp("cooking");
  }

  if (typeof addItemByMeta === "function") {
    addItemByMeta(recipe.id, 1);
  }

  addCraftStat("drink", recipe.id, true);

  appendLog(`${recipe.name} を作った`);

  // ★ 料理ギルド用：飲み物クラフト依頼を進行
  if (typeof onCraftCompletedForGuild === "function") {
    onCraftCompletedForGuild({
      category: "drink",
      recipeId: recipe.id,
      tier: recipe.tier || getTierNumberFromId(recipe.id)
    });
  }

  if (typeof debugRecordCraft === "function") {
    try {
      debugRecordCraft({
        category: "drink",
        recipeId: recipe.id,
        success: true,
        skillLv,
        successRate,
        cost: finalCost,
        resultItems: [{ id: recipe.id, count: 1 }],
        guildBonus,
        traitBonus,
        dailyBonus: dailyAdd
      });
    } catch (e) {}
  }

  updateDisplay();
  refreshEquipSelects();

  const selAfter = document.getElementById("drinkSelect");
  if (selAfter) {
    selAfter.value = prevRecipeId;
    updateCraftCostInfo("cookingDrink", prevRecipeId);
  }
}

// =======================
// 家具クラフト（新規）
// =======================

function craftFurniture(){
  const sel = document.getElementById("furnitureSelect");
  if (!sel || !sel.value) return;

  const prevRecipeId = sel.value;

  const recipes = getAllCraftRecipesByCategory("furniture");
  const recipe  = recipes.find(r => r.id === sel.value);
  if (!recipe) { appendLog("その家具レシピは存在しない"); return; }
  if (!hasMaterials(recipe.cost)) { appendLog("素材が足りない"); return; }

  const skillLv = getCraftSkillLevel("furniture") || 0;
  let successRate = calcCraftSuccessRate(recipe.baseRate || 1.0, skillLv);

  // 家具は専用ギルドなし想定なのでギルドボーナスは 0（必要ならここで対応可能）
  const guildBonus = getGuildCraftSuccessBonus("furniture") || 0;

  const traitBonus = (typeof getCraftSuccessBonusByTrait === "function")
    ? getCraftSuccessBonusByTrait()
    : 0;

  // ★日替わりボーナス: 家具クラフト成功率（家具カテゴリ用）
  let dailyAdd = 0;
  if (typeof getDailyCraftBonus === "function") {
    const daily = getDailyCraftBonus("furniture");
    if (daily && typeof daily.successAdd === "number") {
      successRate += daily.successAdd;
      dailyAdd = daily.successAdd;
    }
  }

  successRate = Math.min(1, successRate + guildBonus + traitBonus);

  refreshCraftSkillTreeBonus();
  const finalCost = applyCraftCostReduction(recipe.cost) || {};

  consumeMaterials(recipe.cost);
  addCraftSkillExp("furniture");

  const roll = Math.random();
  const success = roll < successRate;

  if (!success) {
    addCraftStat("furniture", recipe.id, false);
    appendLog(`${recipe.name} のクラフトに失敗した…（素材は消費された）`);

    if (typeof debugRecordCraft === "function") {
      try {
        debugRecordCraft({
          category: "furniture",
          recipeId: recipe.id,
          success: false,
          skillLv,
          successRate,
          cost: finalCost,
          guildBonus,
          traitBonus,
          dailyBonus: dailyAdd
        });
      } catch (e) {}
    }

    updateDisplay();

    const selAfterFail = document.getElementById("furnitureSelect");
    if (selAfterFail) {
      selAfterFail.value = prevRecipeId;
      updateCraftCostInfo("furniture", prevRecipeId);
    }
    return;
  }

  // 家具は通常アイテムとして倉庫に追加
  if (typeof addItemByMeta === "function") {
    addItemByMeta(recipe.id, 1);
  }

  addCraftStat("furniture", recipe.id, true);

  appendLog(`${recipe.name} をクラフトした`);

  // 拠点系ギルド連動などが必要になればここで onCraftCompletedForGuild を呼ぶ

  if (typeof debugRecordCraft === "function") {
    try {
      debugRecordCraft({
        category: "furniture",
        recipeId: recipe.id,
        success: true,
        skillLv,
        successRate,
        cost: finalCost,
        resultItems: [{ id: recipe.id, count: 1 }],
        guildBonus,
        traitBonus,
        dailyBonus: dailyAdd
      });
    } catch (e) {}
  }

  updateDisplay();

  const selAfter = document.getElementById("furnitureSelect");
  if (selAfter) {
    selAfter.value = prevRecipeId;
    updateCraftCostInfo("furniture", prevRecipeId);
  }
}