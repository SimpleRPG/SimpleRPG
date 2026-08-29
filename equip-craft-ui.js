// equip-craft-ui.js
// =======================
// 装備・クラフトUI（セレクト更新＋コスト表示側の下準備）
// =======================

let lastCraftCategory = "weapon";

// ★強化素材セレクトの更新（インスタンスベース）
//  - 武器: enhanceWeaponMaterialSelect
//  - 防具: enhanceArmorMaterialSelect
// 仕様: 仮にまだ equip-enhance 側で使っていなくても、単に候補を並べるだけ。
function refreshEnhanceMaterialSelects() {
  const matWeaponSel = document.getElementById("enhanceWeaponMaterialSelect");
  const matArmorSel  = document.getElementById("enhanceArmorMaterialSelect");

  // ★現在の強化対象（武器/防具）の key から index を取り出しておき、
  //   同じインスタンスは素材候補から除外する
  let currentWeaponTargetIndex = null;
  let currentArmorTargetIndex  = null;

  const enhWeaponTargetSel = document.getElementById("enhanceWeaponTargetSelect");
  const enhArmorTargetSel  = document.getElementById("enhanceArmorTargetSelect");

  if (enhWeaponTargetSel && enhWeaponTargetSel.value && typeof parseEnhanceTargetKey === "function") {
    const parsed = parseEnhanceTargetKey(enhWeaponTargetSel.value);
    if (parsed && parsed.type === "W") {
      currentWeaponTargetIndex = parsed.index;
    }
  }

  if (enhArmorTargetSel && enhArmorTargetSel.value && typeof parseEnhanceTargetKey === "function") {
    const parsed = parseEnhanceTargetKey(enhArmorTargetSel.value);
    if (parsed && parsed.type === "A") {
      currentArmorTargetIndex = parsed.index;
    }
  }

  // 武器素材セレクト
  if (matWeaponSel) {
    matWeaponSel.innerHTML = "";

    // 先頭に「自動で選ぶ（未指定）」オプションを追加
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "（自動で選ぶ）";
    matWeaponSel.appendChild(emptyOpt);

    if (!Array.isArray(window.weaponInstances) || window.weaponInstances.length === 0) {
      // 武器インスタンスがそもそもない場合は、「素材に使える武器がない」だけを追加
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "素材に使える武器がない";
      matWeaponSel.appendChild(opt);
    } else {
      // location: warehouse のものを候補として出す
      window.weaponInstances.forEach((inst, i) => {
        if (!inst || !inst.id) return;
        const loc = inst.location || "warehouse";
        if (loc !== "warehouse") return;

        // 強化対象と同じインスタンスは除外
        if (currentWeaponTargetIndex !== null && i === currentWeaponTargetIndex) {
          return;
        }

        const key = typeof makeWeaponInstanceKey === "function"
          ? makeWeaponInstanceKey(i, inst)
          : `W:${i}`;

        const label = typeof buildWeaponLabelFromInstance === "function"
          ? buildWeaponLabelFromInstance(inst)
          : inst.id;

        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = label;
        matWeaponSel.appendChild(opt);
      });

      // 候補ゼロ（emptyOpt だけ）の場合は、わかりやすくメッセージを追加
      if (matWeaponSel.options.length === 1) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "素材に使える武器がない";
        matWeaponSel.appendChild(opt);
      }

      // デフォルト選択は「自動で選ぶ」（先頭の emptyOpt）
      matWeaponSel.selectedIndex = 0;
    }
  }

  // 防具素材セレクト
  if (matArmorSel) {
    matArmorSel.innerHTML = "";

    // 先頭に「自動で選ぶ（未指定）」オプションを追加
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "（自動で選ぶ）";
    matArmorSel.appendChild(emptyOpt);

    if (!Array.isArray(window.armorInstances) || window.armorInstances.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "素材に使える防具がない";
      matArmorSel.appendChild(opt);
    } else {
      window.armorInstances.forEach((inst, i) => {
        if (!inst || !inst.id) return;
        const loc = inst.location || "warehouse";
        if (loc !== "warehouse") return;

        // 強化対象と同じインスタンスは除外
        if (currentArmorTargetIndex !== null && i === currentArmorTargetIndex) {
          return;
        }

        const key = typeof makeArmorInstanceKey === "function"
          ? makeArmorInstanceKey(i, inst)
          : `A:${i}`;

        const label = typeof buildArmorLabelFromInstance === "function"
          ? buildArmorLabelFromInstance(inst)
          : inst.id;

        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = label;
        matArmorSel.appendChild(opt);
      });

      if (matArmorSel.options.length === 1) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "素材に使える防具がない";
        matArmorSel.appendChild(opt);
      }

      matArmorSel.selectedIndex = 0;
    }
  }
}

// ★ Tier 解放可否をアクティブカテゴリのスキルLvから判定
function getActiveCraftSkillLevelForTier() {
  const activeCat = window.activeCraftCategory || lastCraftCategory || "weapon";

  if (activeCat === "weapon")        return getCraftSkillLevel("weapon");
  if (activeCat === "armor")         return getCraftSkillLevel("armor");
  if (activeCat === "potion")        return getCraftSkillLevel("potion");
  if (activeCat === "tool")          return getCraftSkillLevel("tool");
  if (activeCat === "material")      return getCraftSkillLevel("material");
  if (activeCat === "cookingFood" ||
      activeCat === "cookingDrink")  return getCraftSkillLevel("cooking");
  if (activeCat === "furniture")     return getCraftSkillLevel("furniture");

  // デフォルトは全カテゴリの最大Lv（万一 activeCat が未知の場合）
  const weaponLv    = getCraftSkillLevel("weapon");
  const armorLv     = getCraftSkillLevel("armor");
  const potionLv    = getCraftSkillLevel("potion");
  const toolLv      = getCraftSkillLevel("tool");
  const materialLv  = getCraftSkillLevel("material");
  const cookingLv   = getCraftSkillLevel("cooking");
  const furnitureLv = typeof getCraftSkillLevel === "function"
    ? getCraftSkillLevel("furniture")
    : 0;

  return Math.max(weaponLv, armorLv, potionLv, toolLv, materialLv, cookingLv, furnitureLv);
}

// ★ スキルLvから最大解放ティアを返す（T1〜T10）
function getMaxTierBySkillLv(lv) {
  if (lv >= 90) return "T10";
  if (lv >= 80) return "T9";
  if (lv >= 70) return "T8";
  if (lv >= 60) return "T7";
  if (lv >= 50) return "T6";
  if (lv >= 40) return "T5";
  if (lv >= 30) return "T4";
  if (lv >= 20) return "T3";
  if (lv >= 10) return "T2";
  return "T1";
}

// ★ 「ティア:すべて」のときに、スキルLvで解放済みティアだけ残す共通フィルタ
// tierFilter: "all" | "T1"〜"T10"
// tierValue:  レシピ側のティア "T1"〜"T10"（なければ true 扱い）
// skillLvForTier: そのカテゴリのスキルLv
function isTierAllowedForFilter(tierFilter, tierValue, skillLvForTier) {
  if (!tierValue) return true;

  if (tierFilter === "all") {
    const maxTier = getMaxTierBySkillLv(skillLvForTier || 0);
    const order = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10"];
    const idx = order.indexOf(tierValue);
    const maxIdx = order.indexOf(maxTier);
    if (idx === -1 || maxIdx === -1) return false;
    return idx <= maxIdx;
  }

  return tierValue === tierFilter;
}

function refreshEquipSelects(){
  if (typeof weapons === "undefined" || typeof armors === "undefined") {
    console.warn("equip-enhance: weapons/armors が未初期化のため、refreshEquipSelects をスキップ");
    return;
  }

  const wSel         = document.getElementById("weaponEquipSelect");
  const aSel         = document.getElementById("armorEquipSelect");
  const wCraftSel    = document.getElementById("weaponSelect");
  const aCraftSel    = document.getElementById("armorSelect");
  const pCraftSel    = document.getElementById("potionSelect");
  const tCraftSel    = document.getElementById("toolSelect");
  const interSel     = document.getElementById("intermediateSelect");
  const foodSel      = document.getElementById("foodSelect");
  const drinkSel     = document.getElementById("drinkSelect");
  const tierSel      = document.getElementById("craftTierSelect");
  const furnCraftSel = document.getElementById("furnitureSelect");

  const enhanceWeaponSel = document.getElementById("enhanceWeaponTargetSelect");
  const enhanceArmorSel  = document.getElementById("enhanceArmorTargetSelect");

  // ★ まず「解放されているTierまで」だけを tier セレクトに残す
  let tierFilter = "all";
  if (tierSel) {
    const activeLv = getActiveCraftSkillLevelForTier();

    const canT2  = activeLv >= 10;
    const canT3  = activeLv >= 20;
    const canT4  = activeLv >= 30;
    const canT5  = activeLv >= 40;
    const canT6  = activeLv >= 50;
    const canT7  = activeLv >= 60;
    const canT8  = activeLv >= 70;
    const canT9  = activeLv >= 80;
    const canT10 = activeLv >= 90;

    const canTier = (v) => {
      if (v === "all" || v === "T1") return true;
      if (v === "T2")  return canT2;
      if (v === "T3")  return canT3;
      if (v === "T4")  return canT4;
      if (v === "T5")  return canT5;
      if (v === "T6")  return canT6;
      if (v === "T7")  return canT7;
      if (v === "T8")  return canT8;
      if (v === "T9")  return canT9;
      if (v === "T10") return canT10;
      return true;
    };

    Array.from(tierSel.options).forEach(opt => {
      const v = opt.value;
      const allowed = canTier(v);
      opt.disabled = !allowed;
      opt.hidden   = !allowed;
    });

    if (!canTier(tierSel.value)) {
      tierSel.value = "all";
    }

    tierFilter = tierSel.value;
  }

  // ★ 装備種別フィルタ（戦闘用 / 採取用）
  const kindSel    = document.getElementById("craftKindSelect");
  const kindFilter = kindSel ? kindSel.value : "all"; // all | normal | gather

  const prevWeaponId  = wCraftSel    ? wCraftSel.value    : null;
  const prevArmorId   = aCraftSel    ? aCraftSel.value    : null;
  const prevPotionId  = pCraftSel    ? pCraftSel.value    : null;
  const prevToolId    = tCraftSel    ? tCraftSel.value    : null;
  const prevInterId   = interSel     ? interSel.value     : null;
  const prevFoodId    = foodSel      ? foodSel.value      : null;
  const prevDrinkId   = drinkSel     ? drinkSel.value     : null;
  const prevFurnId    = furnCraftSel ? furnCraftSel.value : null;

  const prevEnhWeaponKey = enhanceWeaponSel ? enhanceWeaponSel.value : null;
  const prevEnhArmorKey  = enhanceArmorSel  ? enhanceArmorSel.value  : null;

  if (wSel){
    wSel.innerHTML = "";
    weapons.forEach(w => {
      if (weaponCounts[w.id] > 0) {
        const opt  = document.createElement("option");
        const enh  = w.enhance || 0;
        const name = enh > 0 ? `${w.name}+${enh}` : w.name;
        const m = w.id.match(/(?:^T(\d+)_|_t(\d+)$)/i);
        const tier = m ? parseInt(m[1] || m[2], 10) : 1;
        const wType = (typeof getWeaponTypeFromItemId === "function") ? getWeaponTypeFromItemId(w.id) : null;
        let lockTag = "";
        if (tier >= 2 && wType && typeof hasEquipLicense === "function" && !hasEquipLicense("weapon", wType, tier)) {
          lockTag = " [🔒要許可証]";
        }
        opt.value = w.id;
        opt.textContent = `${name}${lockTag}（所持${weaponCounts[w.id]}）`;
        wSel.appendChild(opt);
      }
    });
  }

  if (aSel){
    aSel.innerHTML = "";
    armors.forEach(a => {
      if (armorCounts[a.id] > 0) {
        const opt  = document.createElement("option");
        const enh  = a.enhance || 0;
        const name = enh > 0 ? `${a.name}+${enh}` : a.name;
        const m = a.id.match(/(?:^T(\d+)_|_t(\d+)$)/i);
        const tier = m ? parseInt(m[1] || m[2], 10) : 1;
        const aType = (typeof getArmorTypeFromItemId === "function") ? getArmorTypeFromItemId(a.id) : null;
        let lockTag = "";
        if (tier >= 2 && aType && typeof hasEquipLicense === "function" && !hasEquipLicense("armor", aType, tier)) {
          lockTag = " [🔒要許可証]";
        }
        opt.value = a.id;
        opt.textContent = `${name}${lockTag}（所持${armorCounts[a.id]}）`;
        aSel.appendChild(opt);
      }
    });
  }

  // =======================
  // 武器クラフトセレクト（ITEM_META.craft 由来）
  // =======================
  if (wCraftSel){
    wCraftSel.innerHTML = "";
    const weaponSkillLv = getCraftSkillLevel("weapon");

    const recipes = typeof getAllCraftRecipesByCategory === "function"
      ? getAllCraftRecipesByCategory("weapon")
      : [];

    recipes.forEach(r => {
      const t = r.tier || getTierFromId(r.id); // "T1"〜"T10" を想定
      if (!isTierAllowedForFilter(tierFilter, t, weaponSkillLv)) return;

      const k = r.kind || "normal";
      if (kindFilter !== "all" && k !== kindFilter) return;

      if (!canShowByTierAndSkill(r.id, weaponSkillLv)) return;

      const opt = document.createElement("option");
      opt.value = r.id;

      const m = r.id.match(/_T(\d)/);
      const tierLabel = m ? `T${m[1]}` : "";
      const baseName  = (r.name || "").replace(/T\d$/, "");
      const owned     = weaponCounts[r.id] || 0;
      const ownedText = owned > 0 ? `（所持${owned}）` : "";

      opt.textContent = tierLabel
        ? `${tierLabel}${baseName}${ownedText}`
        : `${r.name || r.id}${ownedText}`;

      wCraftSel.appendChild(opt);
    });

    if (prevWeaponId &&
        Array.from(wCraftSel.options).some(o => o.value === prevWeaponId)) {
      wCraftSel.value = prevWeaponId;
    } else if (!wCraftSel.value && wCraftSel.options.length > 0) {
      wCraftSel.selectedIndex = 0;
    }
  }

  // =======================
  // 防具クラフトセレクト
  // =======================
  if (aCraftSel){
    aCraftSel.innerHTML = "";
    const armorSkillLv = getCraftSkillLevel("armor");

    const recipes = typeof getAllCraftRecipesByCategory === "function"
      ? getAllCraftRecipesByCategory("armor")
      : [];

    recipes.forEach(r => {
      const t = r.tier || getTierFromId(r.id);
      if (!isTierAllowedForFilter(tierFilter, t, armorSkillLv)) return;

      const k = r.kind || "normal";
      if (kindFilter !== "all" && k !== kindFilter) return;

      if (!canShowByTierAndSkill(r.id, armorSkillLv)) return;

      const opt = document.createElement("option");
      opt.value = r.id;

      const m = r.id.match(/_T(\d)/);
      const tierLabel = m ? `T${m[1]}` : "";
      const baseName  = (r.name || "").replace(/T\d$/, "");
      const owned     = armorCounts[r.id] || 0;
      const ownedText = owned > 0 ? `（所持${owned}）` : "";

      opt.textContent = tierLabel
        ? `${tierLabel}${baseName}${ownedText}`
        : `${r.name || r.id}${ownedText}`;

      aCraftSel.appendChild(opt);
    });

    if (prevArmorId &&
        Array.from(aCraftSel.options).some(o => o.value === prevArmorId)) {
      aCraftSel.value = prevArmorId;
    } else if (!aCraftSel.value && aCraftSel.options.length > 0) {
      aCraftSel.selectedIndex = 0;
    }
  }

  // =======================
  // ポーションクラフトセレクト
  // =======================
  if (pCraftSel){
    pCraftSel.innerHTML = "";
    const potionSkillLv = getCraftSkillLevel("potion");

    const recipes = typeof getAllCraftRecipesByCategory === "function"
      ? getAllCraftRecipesByCategory("potion")
      : [];

    recipes.forEach(r => {
      const t = r.tier || getTierFromId(r.id);
      if (!isTierAllowedForFilter(tierFilter, t, potionSkillLv)) return;

      if (!canShowByTierAndSkill(r.id, potionSkillLv)) return;

      const opt = document.createElement("option");
      opt.value = r.id;

      const m = r.id.match(/T(\d)$/);
      const tierLabel = m ? `T${m[1]}` : "";
      const baseName  = (r.name || "").replace(/T\d$/, "");
      const owned     = typeof potionCounts === "object"
        ? (potionCounts[r.id] || 0)
        : 0;
      const ownedText = owned > 0 ? `（所持${owned}）` : "";

      opt.textContent = tierLabel
        ? `${tierLabel}${baseName}${ownedText}`
        : `${r.name || r.id}${ownedText}`;

      pCraftSel.appendChild(opt);
    });

    if (prevPotionId &&
        Array.from(pCraftSel.options).some(o => o.value === prevPotionId)) {
      pCraftSel.value = prevPotionId;
    }
  }

  // =======================
  // 道具クラフトセレクト
  // =======================
  if (tCraftSel){
    tCraftSel.innerHTML = "";
    const toolSkillLv = getCraftSkillLevel("tool");

    const recipes = typeof getAllCraftRecipesByCategory === "function"
      ? getAllCraftRecipesByCategory("tool")
      : [];

    recipes.forEach(r => {
      const t = r.tier || getTierFromId(r.id);
      if (!isTierAllowedForFilter(tierFilter, t, toolSkillLv)) return;

      if (!canShowByTierAndSkill(r.id, toolSkillLv)) return;

      const opt = document.createElement("option");
      opt.value = r.id;

      const m = r.id.match(/_T(\d)/);
      const tierLabel = m ? `T${m[1]}` : "";
      const baseName  = (r.name || "").replace(/T\d$/, "");
      opt.textContent = tierLabel
        ? `${tierLabel}${baseName}`
        : (r.name || r.id);

      tCraftSel.appendChild(opt);
    });

    if (prevToolId &&
        Array.from(tCraftSel.options).some(o => o.value === prevToolId)) {
      tCraftSel.value = prevToolId;
    }
  }

  // =======================
  // 中間素材クラフトセレクト（ITEM_META.craft.material）
  // =======================
  if (interSel) {
    interSel.innerHTML = "";
    const materialSkillLv = getCraftSkillLevel("material");

    const recipes = typeof getAllCraftRecipesByCategory === "function"
      ? getAllCraftRecipesByCategory("material")
      : [];

    recipes.forEach(r => {
      const t = r.tier || getTierFromId(r.id);
      if (!isTierAllowedForFilter(tierFilter, t, materialSkillLv)) return;
      if (!canShowByTierAndSkill(r.id, materialSkillLv)) return;

      const opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = r.name || r.id;
      interSel.appendChild(opt);
    });

    if (prevInterId &&
        Array.from(interSel.options).some(o => o.value === prevInterId)) {
      interSel.value = prevInterId;
    }
  }

  // =======================
  // 家具クラフトセレクト（ITEM_META.craft.furniture）
  // =======================
  if (furnCraftSel) {
    furnCraftSel.innerHTML = "";
    const furnitureSkillLv = typeof getCraftSkillLevel === "function"
      ? getCraftSkillLevel("furniture") || 0
      : 0;

    const recipes = typeof getAllCraftRecipesByCategory === "function"
      ? getAllCraftRecipesByCategory("furniture")
      : [];

    recipes.forEach(r => {
      const t = r.tier || getTierFromId(r.id);
      if (!isTierAllowedForFilter(tierFilter, t, furnitureSkillLv)) return;
      if (!canShowByTierAndSkill(r.id, furnitureSkillLv)) return;

      const opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = r.name || r.id;
      furnCraftSel.appendChild(opt);
    });

    if (prevFurnId &&
        Array.from(furnCraftSel.options).some(o => o.value === prevFurnId)) {
      furnCraftSel.value = prevFurnId;
    } else if (!furnCraftSel.value && furnCraftSel.options.length > 0) {
      furnCraftSel.selectedIndex = 0;
    }
  }

  // =======================
  // 料理（food/drink）は従来どおり COOKING_RECIPES 参照
  // =======================
  if (foodSel) {
    foodSel.innerHTML = "";
    const cookingLv = getCraftSkillLevel("cooking") || 0;

    if (COOKING_RECIPES && Array.isArray(COOKING_RECIPES.food)) {
      COOKING_RECIPES.food.forEach(r => {
        const t = (typeof r.tier !== "undefined") ? String(r.tier) : null;
        if (!isTierAllowedForFilter(tierFilter, t, cookingLv)) return;
        if (!canShowCookingRecipeBySkill(r, cookingLv)) return;

        const opt   = document.createElement("option");
        opt.value   = r.id;
        const owned = typeof foodCounts === "object" ? (foodCounts[r.id] || 0) : 0;
        const ownedText  = owned > 0 ? `（所持${owned}）` : "";
        const tierLabel  = r.tier ? `${r.tier} ` : "";
        opt.textContent  = `${tierLabel}${r.name}${ownedText}`;
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

  if (drinkSel) {
    drinkSel.innerHTML = "";
    const cookingLv = getCraftSkillLevel("cooking") || 0;

    if (COOKING_RECIPES && Array.isArray(COOKING_RECIPES.drink)) {
      COOKING_RECIPES.drink.forEach(r => {
        const t = (typeof r.tier !== "undefined") ? String(r.tier) : null;
        if (!isTierAllowedForFilter(tierFilter, t, cookingLv)) return;
        if (!canShowCookingRecipeBySkill(r, cookingLv)) return;

        const opt   = document.createElement("option");
        opt.value   = r.id;
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

  // ★ 強化対象セレクトの更新（インスタンスベース）
  refreshEnhanceTargetSelects(prevEnhWeaponKey, prevEnhArmorKey);

  // ★ 強化候補の自動選択（ユーザー選択がない場合のみ）
  autoSelectBestEnhanceTargets();

  // ★ 強化素材セレクトの更新（新規）
  refreshEnhanceMaterialSelects();

  // ★ ペット装備クラフトセレクトの更新（新規）
  refreshPetEquipSelect();

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
    if (cat === "furniture" && furnCraftSel && furnCraftSel.value) {
      updateCraftCostInfo("furniture", furnCraftSel.value);
      lastCraftCategory = "furniture";
      return true;
    }
    if (cat === "petEquip") {
      const petEquipSel = document.getElementById("petEquipSelect");
      if (petEquipSel && petEquipSel.value) {
        updateCraftCostInfo("petEquip", petEquipSel.value);
        lastCraftCategory = "petEquip";
        return true;
      }
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
  if (updateCraftByCategory("furniture"))     return;
  if (updateCraftByCategory("petEquip"))      return;

  if (infoEl) {
    infoEl.textContent = "必要素材：-";
  }
}

/**
 * #petEquipSelect を最新化する。武器クラフトの wCraftSel ループの簡易版
 * （Tierによる解放フィルタは今は無し。将来 petEquip 用スキルLvゲートを足す余地あり）。
 */
function refreshPetEquipSelect() {
  const petEquipSel = document.getElementById("petEquipSelect");
  if (!petEquipSel) return;

  const prevId = petEquipSel.value;
  petEquipSel.innerHTML = "";

  const recipes = typeof getAllCraftRecipesByCategory === "function"
    ? getAllCraftRecipesByCategory("petEquip")
    : [];

  const owned = (window.petEquipCounts && typeof window.petEquipCounts === "object")
    ? window.petEquipCounts
    : {};

  recipes.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.id;

    const m = r.id.match(/^T(\d+)_/);
    const tierLabel = m ? `T${m[1]}` : "";
    const baseName  = (r.name || "").replace(/^T\d+/, "");
    const ownCount  = owned[r.id] || 0;
    const ownedText = ownCount > 0 ? `（所持${ownCount}）` : "";

    opt.textContent = tierLabel
      ? `${tierLabel}${baseName}${ownedText}`
      : `${r.name || r.id}${ownedText}`;

    petEquipSel.appendChild(opt);
  });

  if (prevId && Array.from(petEquipSel.options).some(o => o.value === prevId)) {
    petEquipSel.value = prevId;
  }
}
window.refreshPetEquipSelect = refreshPetEquipSelect;