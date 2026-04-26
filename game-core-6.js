// game-core-6.js
// クラフト・中間素材

// =======================
// クラフト共通
// =======================

// クラフト品質関連（0:普通, 1:良品, 2:傑作）
const QUALITY_NAMES = ["", "【良品】", "【傑作】"];

// 必要なら性能補正用レート（今は未使用、後でダメージ計算側で使う想定）
const QUALITY_RATE = [1.0, 1.05, 1.12];

// ★ tier 判定ヘルパー（文字列）
function getTierFromId(id) {
  if (id.endsWith("_T1") || id.endsWith("T1")) return "T1";
  if (id.endsWith("_T2") || id.endsWith("T2")) return "T2";
  if (id.endsWith("_T3") || id.endsWith("T3")) return "T3";
  return "T1";
}

// ★ guild.js に渡す用の tier 数値ヘルパー
function getTierNumberFromId(id) {
  const t = getTierFromId(id); // "T1" / "T2" / "T3"
  if (t === "T2") return 2;
  if (t === "T3") return 3;
  return 1;
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
// ITEM_META ベースのクラフトヘルパー
// =======================

function getItemCraftMeta(id) {
  if (typeof getItemMeta !== "function") return null;
  const meta = getItemMeta(id);
  if (!meta || !meta.craft || !meta.craft.enabled) return null;
  return meta.craft;
}

function getAllCraftRecipesByCategory(category) {
  if (typeof getAllItemMeta !== "function") return [];
  const metas = getAllItemMeta();
  return metas
    .filter(m => m && m.craft && m.craft.enabled && m.craft.category === category)
    .map(m => {
      const c = m.craft;
      const tierNum = c.tier != null ? c.tier : (typeof getItemTier === "function" ? getItemTier(m.id) : null);
      const tierStr = tierNum ? `T${tierNum}` : getTierFromId(m.id);
      return {
        id: m.id,
        name: m.name || m.id,
        tier: tierStr,
        kind: c.kind || "normal",
        baseRate: c.baseRate != null ? c.baseRate : 0,
        cost: c.cost || {}
      };
    });
}

// =======================
// クラフト統計
// =======================

// category: weapon/armor/potion/tool/material/food/drink/fertilizer
// stats format: { success: number, fail: number }
const craftStats = {
  weapon:     { success: 0, fail: 0 },
  armor:      { success: 0, fail: 0 },
  potion:     { success: 0, fail: 0 },
  tool:       { success: 0, fail: 0 },
  material:   { success: 0, fail: 0 },
  food:       { success: 0, fail: 0 },
  drink:      { success: 0, fail: 0 },
  fertilizer: { success: 0, fail: 0 }
};

// レシピ別に細かく見る場合用（今は UI ではカテゴリ集計だけ使用）
const craftRecipeStats = {};

// 内部用ヘルパー
function addCraftStat(category, recipeId, isSuccess) {
  if (!craftStats[category]) {
    craftStats[category] = { success: 0, fail: 0 };
  }
  if (isSuccess) {
    craftStats[category].success++;
  } else {
    craftStats[category].fail++;
  }

  if (recipeId) {
    const key = category + ":" + recipeId;
    if (!craftRecipeStats[key]) {
      craftRecipeStats[key] = { success: 0, fail: 0 };
    }
    if (isSuccess) {
      craftRecipeStats[key].success++;
    } else {
      craftRecipeStats[key].fail++;
    }
  }
}

// UI 用: カテゴリ別サマリを返す
// 既存 UI の期待フォーマットに合わせている（id, recipeName, categoryName, success, fail）
function getCraftStatsList() {
  const rows = [];
  const labelMap = {
    weapon:     "武器",
    armor:      "防具",
    potion:     "ポーション",
    tool:       "道具",
    material:   "中間素材",
    food:       "料理（食べ物）",
    drink:      "料理（飲み物）",
    fertilizer: "肥料"
  };
  Object.keys(craftStats).forEach(cat => {
    const s = craftStats[cat] || { success: 0, fail: 0 };
    rows.push({
      id: cat,
      recipeName: "-",
      categoryName: labelMap[cat] || cat,
      success: s.success || 0,
      fail: s.fail || 0
    });
  });
  return rows;
}

// =======================
// スキルツリー由来クラフトボーナス
// =======================

let craftSkillTreeBonus = {
  craftCostReduceRate: 0
  // craftIntermediateExtraChance, craftQualityBonusRate, craftStarBonusRate は
  // 別の箇所（中間素材EXTRA/品質ロール/星屑強化）で使う前提
};

function refreshCraftSkillTreeBonus() {
  if (typeof getGlobalSkillTreeBonus === "function") {
    const b = getGlobalSkillTreeBonus() || {};
    craftSkillTreeBonus.craftCostReduceRate = b.craftCostReduceRate || 0;
  } else {
    craftSkillTreeBonus.craftCostReduceRate = 0;
  }
}

// コストオブジェクトをスキルツリー用に減算したコピーを返すヘルパー
function applyCraftCostReduction(rawCost) {
  const rate = craftSkillTreeBonus.craftCostReduceRate || 0;
  if (!rawCost || rate <= 0) return rawCost;

  const cost = {};
  Object.keys(rawCost).forEach(k => {
    const need = rawCost[k] || 0;
    if (!need) return;
    const reduced = Math.max(0, Math.floor(need * (1 - rate)));
    cost[k] = reduced;
  });
  return cost;
}

// =======================
// 必要素材表示（メタ前提）
// =======================

// 必要素材表示（「必要/所持」を出す）
// 武器・防具・ポーション・道具 + 中間素材（material）+ 料理（cookingFood / cookingDrink）+ 肥料（fertilizer）に対応
function updateCraftCostInfo(category, recipeId){
  const infoEl = document.getElementById("craftCostInfo");
  if (!infoEl) return;

  // 表示時点でもスキルツリーボーナスが分かるようにリフレッシュ
  refreshCraftSkillTreeBonus();

  let list = [];
  let recipe = null;

  if (category === "weapon" || category === "armor" || category === "potion" || category === "tool") {
    const recipes = getAllCraftRecipesByCategory(category);
    recipe = recipes.find(r => r.id === recipeId);
  } else if (category === "material") {
    // 中間素材は ITEM_META.craft.cost を優先
    if (typeof getItemMeta !== "function") {
      infoEl.textContent = "必要素材：-";
      return;
    }
    const meta = getItemMeta(recipeId);
    const craft = meta && meta.craft;
    if (!craft || !craft.cost) {
      infoEl.textContent = "必要素材：-";
      return;
    }
    const shownCost = applyCraftCostReduction(craft.cost) || {};
    if (typeof getItemCountByMeta !== "function") {
      infoEl.textContent = "必要素材：-";
      return;
    }

    Object.keys(shownCost).forEach(id => {
      const need = shownCost[id] || 0;
      if (!need) return;
      const have = getItemCountByMeta(id) || 0;
      let label = id;
      if (typeof getItemName === "function") {
        label = getItemName(id);
      }
      list.push(`${label} ${have}/${need}`);
    });

    infoEl.textContent = "必要素材：" + (list.length ? list.join(" ") : "-");
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

    if (typeof getItemCountByMeta !== "function") {
      infoEl.textContent = "必要素材：-";
      return;
    }

    const rate = craftSkillTreeBonus.craftCostReduceRate || 0;

    list = recipe.requires.map(req => {
      const rawNeed = req.amount;
      const itemId = req.id;
      if (!rawNeed || !itemId) return null;

      let need = rawNeed;
      if (rate > 0) {
        need = Math.max(0, Math.floor(rawNeed * (1 - rate)));
      }

      const have = getItemCountByMeta(itemId) || 0;

      let label = itemId;
      if (typeof getItemName === "function") {
        label = getItemName(itemId);
      }

      return `${label} ${have}/${need}`;
    }).filter(Boolean);

    infoEl.textContent = "必要素材：" + (list.length ? list.join(" ") : "-");
    return;
  } else if (category === "fertilizer") {
    if (typeof getItemMeta !== "function") {
      infoEl.textContent = "必要素材：-";
      return;
    }
    const meta = getItemMeta(recipeId);
    if (!meta || typeof meta.fertCostPoint !== "number") {
      infoEl.textContent = "必要素材：-";
      return;
    }
    const pt = meta.fertCostPoint;
    infoEl.textContent =
      `必要ポイント：${pt}（料理素材ポイント合計。通常=1pt / 銀=2pt / 金=3pt）`;
    return;
  }

  if (!recipe || !recipe.cost) {
    infoEl.textContent = "必要素材：-";
    return;
  }

  // 通常クラフト用 cost にもコスト軽減を事前反映
  const shownCost = applyCraftCostReduction(recipe.cost) || {};

  Object.keys(shownCost).forEach(k => {
    const need = shownCost[k];
    if (!need) return;

    const id = k;
    let have = 0;
    if (typeof getItemCountByMeta === "function") {
      have = getItemCountByMeta(id);
    }

    let label = id;
    if (typeof getItemName === "function") {
      label = getItemName(id);
    }

    list.push(`${label} ${have}/${need}`);
  });

  infoEl.textContent = "必要素材：" + (list.length ? list.join(" ") : "-");
}

// =======================
// 素材チェック・消費（ITEM_META 一元化）
// =======================

// cost: { itemId: amount } を前提。一次素材も中間素材も、そのIDで判断。
function hasMaterials(cost){
  if (!cost) return false;

  refreshCraftSkillTreeBonus();
  const c = applyCraftCostReduction(cost) || {};

  if (typeof getItemCountByMeta !== "function") {
    return false;
  }

  return Object.keys(c).every(id => {
    const need = c[id] | 0;
    if (!need) return true;
    const have = getItemCountByMeta(id) || 0;
    return have >= need;
  });
}

function consumeMaterials(cost){
  if (!cost) return;

  refreshCraftSkillTreeBonus();
  const c = applyCraftCostReduction(cost) || {};

  if (typeof removeItemByMeta !== "function") {
    return;
  }

  Object.keys(c).forEach(id => {
    const need = c[id] | 0;
    if (!need) return;
    removeItemByMeta(id, need);
  });
}

// =======================
// 料理素材（ITEM_META 一元化版）
// =======================

// cost: { itemId: amount } を前提。
// 旧 cookingMats ではなく、storageKind: "cooking" のストレージImpl経由で判定・消費する。
function hasCookingMaterials(cost){
  if (!cost) return false;

  if (typeof getItemCountByMeta !== "function") return false;

  refreshCraftSkillTreeBonus();
  const rate = craftSkillTreeBonus.craftCostReduceRate || 0;

  return Object.keys(cost).every(id => {
    const rawNeed = cost[id] | 0;
    if (!rawNeed) return true;
    let need = rawNeed;
    if (rate > 0) {
      need = Math.max(0, Math.floor(rawNeed * (1 - rate)));
    }
    const have = getItemCountByMeta(id) || 0;
    return have >= need;
  });
}

function consumeCookingMaterials(cost){
  if (!cost) return;

  if (typeof removeItemByMeta !== "function") return;

  refreshCraftSkillTreeBonus();
  const rate = craftSkillTreeBonus.craftCostReduceRate || 0;

  Object.keys(cost).forEach(id => {
    const rawNeed = cost[id] | 0;
    if (!rawNeed) return;
    let need = rawNeed;
    if (rate > 0) {
      need = Math.max(0, Math.floor(rawNeed * (1 - rate)));
    }
    if (need > 0) {
      removeItemByMeta(id, need);
    }
  });
}

function hasCookingMaterialsByRequires(recipe){
  if (!recipe || !Array.isArray(recipe.requires)) return false;
  if (typeof getItemCountByMeta !== "function") return false;

  refreshCraftSkillTreeBonus();
  const rate = craftSkillTreeBonus.craftCostReduceRate || 0;

  return recipe.requires.every(req => {
    const rawNeed = req.amount | 0;
    const id = req.id;
    if (!rawNeed || !id) return true;
    let need = rawNeed;
    if (rate > 0) {
      need = Math.max(0, Math.floor(rawNeed * (1 - rate)));
    }
    const have = getItemCountByMeta(id) || 0;
    return have >= need;
  });
}

function consumeCookingMaterialsByRequires(recipe){
  if (!recipe || !Array.isArray(recipe.requires)) return;
  if (typeof removeItemByMeta !== "function") return;

  refreshCraftSkillTreeBonus();
  const rate = craftSkillTreeBonus.craftCostReduceRate || 0;

  recipe.requires.forEach(req => {
    const rawNeed = req.amount | 0;
    const id = req.id;
    if (!rawNeed || !id) return;
    let need = rawNeed;
    if (rate > 0) {
      need = Math.max(0, Math.floor(rawNeed * (1 - rate)));
    }
    if (need > 0) {
      removeItemByMeta(id, need);
    }
  });
}

// =======================
// ギルドによるクラフト成功率ボーナス
// =======================

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

// =======================
// 各クラフト実行（ITEM_META 駆動）
// =======================

function craftWeapon(){
  console.log("craftWeapon from game-core-6.js");
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

  // ★ ここを ITEM_META 由来の baseEnh に変更（旧 weapons 配列依存を排除）
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

  // ★ 鍛冶ギルド用：武器クラフト依頼を進行
  if (typeof onCraftCompletedForGuild === "function") {
    onCraftCompletedForGuild({
      category: "weapon",
      recipeId: recipe.id,
      tier: getTierNumberFromId(recipe.id)
    });
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

  // ★ ここを ITEM_META 由来の baseEnh に変更（旧 armors 配列依存を排除）
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

  // ★ 鍛冶ギルド用：防具クラフト依頼を進行
  if (typeof onCraftCompletedForGuild === "function") {
    onCraftCompletedForGuild({
      category: "armor",
      recipeId: recipe.id,
      tier: getTierNumberFromId(recipe.id)
    });
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

  // ★ 錬金ギルド用：ポーションクラフト依頼を進行
  if (typeof onCraftCompletedForGuild === "function") {
    onCraftCompletedForGuild({
      category: "potion",
      recipeId: recipe.id,
      tier: getTierNumberFromId(recipe.id)
    });
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

  // ★ 錬金／道具系ギルド用：道具クラフト依頼を進行
  if (typeof onCraftCompletedForGuild === "function") {
    onCraftCompletedForGuild({
      category: "tool",
      recipeId: recipe.id,
      tier: getTierNumberFromId(recipe.id)
    });
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