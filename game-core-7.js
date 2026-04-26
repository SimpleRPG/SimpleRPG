// game-core-7.js
// =======================
// 装備・強化
// =======================

let lastCraftCategory = "weapon";

function refreshEquipSelects(){
  if (typeof weapons === "undefined" || typeof armors === "undefined") {
    console.warn("game-core-7: weapons/armors が未初期化のため、refreshEquipSelects をスキップ");
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

  const enhanceWeaponSel = document.getElementById("enhanceWeaponTargetSelect");
  const enhanceArmorSel  = document.getElementById("enhanceArmorTargetSelect");

  // ★ まず「解放されているTierまで」だけを tier セレクトに残す
  let tierFilter = "all";
  if (tierSel) {
    const weaponLv   = getCraftSkillLevel("weapon");
    const armorLv    = getCraftSkillLevel("armor");
    const potionLv   = getCraftSkillLevel("potion");
    const toolLv     = getCraftSkillLevel("tool");
    const materialLv = getCraftSkillLevel("material");
    const cookingLv  = getCraftSkillLevel("cooking");

    const maxLv = Math.max(weaponLv, armorLv, potionLv, toolLv, materialLv, cookingLv);
    const canT2 = maxLv >= 10;
    const canT3 = maxLv >= 20;

    Array.from(tierSel.options).forEach(opt => {
      if (opt.value === "all" || opt.value === "T1") {
        opt.disabled = false;
        opt.hidden   = false;
      } else if (opt.value === "T2") {
        opt.disabled = !canT2;
        opt.hidden   = !canT2;
      } else if (opt.value === "T3") {
        opt.disabled = !canT3;
        opt.hidden   = !canT3;
      }
    });

    if (tierSel.value === "T2" && !canT2) tierSel.value = "all";
    if (tierSel.value === "T3" && !canT3) tierSel.value = "all";

    tierFilter = tierSel.value;
  }

  // ★ 装備種別フィルタ（戦闘用 / 採取用）
  const kindSel    = document.getElementById("craftKindSelect");
  const kindFilter = kindSel ? kindSel.value : "all"; // all | normal | gather

  const prevWeaponId  = wCraftSel ? wCraftSel.value : null;
  const prevArmorId   = aCraftSel ? aCraftSel.value : null;
  const prevPotionId  = pCraftSel ? pCraftSel.value : null;
  const prevToolId    = tCraftSel ? tCraftSel.value : null;
  const prevInterId   = interSel  ? interSel.value  : null;
  const prevFoodId    = foodSel   ? foodSel.value   : null;
  const prevDrinkId   = drinkSel  ? drinkSel.value  : null;

  const prevEnhWeaponKey = enhanceWeaponSel ? enhanceWeaponSel.value : null;
  const prevEnhArmorKey  = enhanceArmorSel  ? enhanceArmorSel.value  : null;

  if (wSel){
    wSel.innerHTML = "";
    weapons.forEach(w => {
      if (weaponCounts[w.id] > 0) {
        const opt  = document.createElement("option");
        const enh  = w.enhance || 0;
        const name = enh > 0 ? `${w.name}+${enh}` : w.name;
        opt.value = w.id;
        opt.textContent = `${name}（所持${weaponCounts[w.id]}）`;
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
        opt.value = a.id;
        opt.textContent = `${name}（所持${armorCounts[a.id]}）`;
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
      // tierFilter: all / T1 / T2 / T3
      if (tierFilter !== "all") {
        const t = r.tier || getTierFromId(r.id);
        if (t !== tierFilter) return;
      }
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
      if (tierFilter !== "all") {
        const t = r.tier || getTierFromId(r.id);
        if (t !== tierFilter) return;
      }
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
      if (tierFilter !== "all") {
        const t = r.tier || getTierFromId(r.id);
        if (t !== tierFilter) return;
      }

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
      if (tierFilter !== "all") {
        const t = r.tier || getTierFromId(r.id);
        if (t !== tierFilter) return;
      }

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
      if (tierFilter !== "all") {
        const t = r.tier || getTierFromId(r.id);
        if (t !== tierFilter) return;
      }
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
  // 料理（food/drink）は従来どおり COOKING_RECIPES 参照
  // =======================
  if (foodSel) {
    foodSel.innerHTML = "";
    const cookingLv = getCraftSkillLevel("cooking") || 0;

    if (COOKING_RECIPES && Array.isArray(COOKING_RECIPES.food)) {
      COOKING_RECIPES.food.forEach(r => {
        if (tierFilter !== "all" && typeof r.tier !== "undefined") {
          const t = String(r.tier);
          if (t !== tierFilter) return;
        }
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
        if (tierFilter !== "all" && typeof r.tier !== "undefined") {
          const t = String(r.tier);
          if (t !== tierFilter) return;
        }
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

// =======================
// 装備 API（コアはここに集約）
// =======================

// 倉庫からの直接装備ヘルパー
function equipWeaponFromWarehouse(weaponId) {
  if (window.isExploring || window.currentEnemy) {
    if (typeof appendLog === "function") {
      appendLog("探索中は装備を変更できない！");
    }
    return;
  }
  if (!weaponId) return;

  const hasInstances = Array.isArray(window.weaponInstances);

  // 旧装備品を倉庫に戻す
  if (hasInstances && window.equippedWeaponIndex != null) {
    const oldInst = window.weaponInstances[window.equippedWeaponIndex];
    if (oldInst) {
      oldInst.location = "warehouse";
      if (typeof weaponCounts === "object") {
        weaponCounts[oldInst.id] = (weaponCounts[oldInst.id] || 0) + 1;
      }
    }
    window.equippedWeaponIndex = null;
    window.equippedWeaponId    = null;
  } else if (!hasInstances && window.equippedWeaponId) {
    weaponCounts[window.equippedWeaponId] = (weaponCounts[window.equippedWeaponId] || 0) + 1;
    window.equippedWeaponId = null;
  }

  if (!hasInstances) {
    // インスタンス未使用フォールバック
    if (!weaponCounts[weaponId] || weaponCounts[weaponId] <= 0) {
      appendLog("倉庫に装備可能な武器がない");
      return;
    }
    weaponCounts[weaponId] = Math.max(0, (weaponCounts[weaponId] || 0) - 1);
    window.equippedWeaponId = weaponId;
    appendLog("武器を装備した。");
    if (typeof recalcStats === "function") recalcStats();
    if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
    return;
  }

  // 倉庫(location: warehouse)にあるインスタンスから1本だけ装備にする
  let idx = -1;
  for (let i = 0; i < window.weaponInstances.length; i++) {
    const inst = window.weaponInstances[i];
    if (!inst || inst.id !== weaponId) continue;
    const loc = inst.location || "warehouse";
    if (loc === "warehouse") {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    appendLog("倉庫に装備可能な武器インスタンスが見つからない");
    return;
  }

  const inst = window.weaponInstances[idx];
  inst.location = "equipped";
  window.equippedWeaponIndex = idx;
  window.equippedWeaponId    = weaponId;

  if (typeof weaponCounts === "object") {
    weaponCounts[weaponId] = Math.max(0, (weaponCounts[weaponId] || 0) - 1);
  }

  appendLog("武器を装備した。");
  if (typeof recalcStats === "function") recalcStats();
  if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
}

function equipArmorFromWarehouse(armorId) {
  if (window.isExploring || window.currentEnemy) {
    if (typeof appendLog === "function") {
      appendLog("探索中は装備を変更できない！");
    }
    return;
  }
  if (!armorId) return;

  const hasInstances = Array.isArray(window.armorInstances);

  // 旧装備品を倉庫に戻す
  if (hasInstances && window.equippedArmorIndex != null &&
      Array.isArray(window.armorInstances)) {
    const oldInst = window.armorInstances[window.equippedArmorIndex];
    if (oldInst) {
      oldInst.location = "warehouse";
      if (typeof armorCounts === "object") {
        armorCounts[oldInst.id] = (armorCounts[oldInst.id] || 0) + 1;
      }
    }
    window.equippedArmorIndex = null;
    window.equippedArmorId    = null;
  } else if (!hasInstances && window.equippedArmorId) {
    armorCounts[window.equippedArmorId] =
      (armorCounts[window.equippedArmorId] || 0) + 1;
    window.equippedArmorId = null;
  }

  if (!hasInstances) {
    // インスタンス未使用フォールバック
    if (!armorCounts[armorId] || armorCounts[armorId] <= 0) {
      appendLog("倉庫に装備可能な防具がない");
      return;
    }
    armorCounts[armorId] = Math.max(0, (armorCounts[armorId] || 0) - 1);
    window.equippedArmorId = armorId;
    appendLog("防具を装備した。");
    if (typeof recalcStats === "function") recalcStats();
    if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
    return;
  }

  let idx = -1;
  for (let i = 0; i < window.armorInstances.length; i++) {
    const inst = window.armorInstances[i];
    if (!inst || inst.id !== armorId) continue;
    const loc = inst.location || "warehouse";
    if (loc === "warehouse") {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    appendLog("倉庫に装備可能な防具インスタンスが見つからない");
    return;
  }

  const inst = window.armorInstances[idx];
  inst.location = "equipped";
  window.equippedArmorIndex = idx;
  window.equippedArmorId    = armorId;

  if (typeof armorCounts === "object") {
    armorCounts[armorId] = Math.max(0, (armorCounts[armorId] || 0) - 1);
  }

  appendLog("防具を装備した。");
  if (typeof recalcStats === "function") recalcStats();
  if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
}

// 手持ちからの装備ヘルパー
function equipWeaponFromCarry(weaponId) {
  if (window.isExploring || window.currentEnemy) {
    if (typeof appendLog === "function") {
      appendLog("探索中は装備を変更できない！");
    }
    return;
  }
  if (!weaponId) return;

  const hasInstances = Array.isArray(window.weaponInstances);

  // 旧装備を手持ちに戻す
  if (hasInstances && window.equippedWeaponIndex != null) {
    const oldInst = window.weaponInstances[window.equippedWeaponIndex];
    if (oldInst) {
      oldInst.location = "carry";
    }
    window.equippedWeaponIndex = null;
    window.equippedWeaponId    = null;
  } else if (!hasInstances && window.equippedWeaponId) {
    const oldId = window.equippedWeaponId;
    if (typeof window.carryWeapons === "object") {
      window.carryWeapons[oldId] = (window.carryWeapons[oldId] || 0) + 1;
    }
    window.equippedWeaponId = null;
  }

  if (!hasInstances) {
    // インスタンス未使用フォールバック:
    // carryWeapons にあれば 1 本消費して装備IDにする
    if (!window.carryWeapons || !(window.carryWeapons[weaponId] > 0)) {
      appendLog("手持ちに装備可能な武器がない");
      return;
    }
    window.carryWeapons[weaponId] = Math.max(0, (window.carryWeapons[weaponId] || 0) - 1);
    if (window.carryWeapons[weaponId] <= 0) delete window.carryWeapons[weaponId];
    window.equippedWeaponId = weaponId;
    appendLog("武器を装備した。");
    if (typeof recalcStats === "function") recalcStats();
    if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
    return;
  }

  // インスタンスあり: carry から指定IDのインスタンスを1本探して装備
  let idx = -1;
  for (let i = 0; i < window.weaponInstances.length; i++) {
    const inst = window.weaponInstances[i];
    if (!inst || inst.id !== weaponId) continue;
    const loc = inst.location || "warehouse";
    if (loc === "carry") {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    appendLog("手持ちに装備可能な武器がない");
    return;
  }

  const inst = window.weaponInstances[idx];
  inst.location = "equipped";
  window.equippedWeaponIndex = idx;
  window.equippedWeaponId    = weaponId;

  appendLog("武器を装備した。");
  if (typeof recalcStats === "function") recalcStats();
  if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
}

function equipArmorFromCarry(armorId) {
  if (window.isExploring || window.currentEnemy) {
    if (typeof appendLog === "function") {
      appendLog("探索中は装備を変更できない！");
    }
    return;
  }
  if (!armorId) return;

  const hasInstances = Array.isArray(window.armorInstances);

  if (hasInstances && window.equippedArmorIndex != null) {
    const oldInst = window.armorInstances[window.equippedArmorIndex];
    if (oldInst) {
      oldInst.location = "carry";
    }
    window.equippedArmorIndex = null;
    window.equippedArmorId    = null;
  } else if (!hasInstances && window.equippedArmorId) {
    const oldId = window.equippedArmorId;
    if (typeof window.carryArmors === "object") {
      window.carryArmors[oldId] = (window.carryArmors[oldId] || 0) + 1;
    }
    window.equippedArmorId = null;
  }

  if (!hasInstances) {
    if (!window.carryArmors || !(window.carryArmors[armorId] > 0)) {
      appendLog("手持ちに装備可能な防具がない");
      return;
    }
    window.carryArmors[armorId] = Math.max(0, (window.carryArmors[armorId] || 0) - 1);
    if (window.carryArmors[armorId] <= 0) delete window.carryArmors[armorId];
    window.equippedArmorId = armorId;
    appendLog("防具を装備した。");
    if (typeof recalcStats === "function") recalcStats();
    if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
    return;
  }

  let idx = -1;
  for (let i = 0; i < window.armorInstances.length; i++) {
    const inst = window.armorInstances[i];
    if (!inst || inst.id !== armorId) continue;
    const loc = inst.location || "warehouse";
    if (loc === "carry") {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    appendLog("手持ちに装備可能な防具がない");
    return;
  }

  const inst = window.armorInstances[idx];
  inst.location = "equipped";
  window.equippedArmorIndex = idx;
  window.equippedArmorId    = armorId;

  appendLog("防具を装備した。");
  if (typeof recalcStats === "function") recalcStats();
  if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
}

// =======================
// ここから下は元の強化ロジック
// =======================

function makeWeaponInstanceKey(index, inst) {
  return `W:${index}`;
}

function makeArmorInstanceKey(index, inst) {
  return `A:${index}`;
}

function parseEnhanceTargetKey(key) {
  if (!key || typeof key !== "string") return null;
  const parts = key.split(":");
  if (parts.length !== 2) return null;
  const type = parts[0];
  const idx  = parseInt(parts[1], 10);
  if (!Number.isInteger(idx) || idx < 0) return null;
  return { type, index: idx };
}

function refreshEnhanceTargetSelects(prevWeaponKey, prevArmorKey) {
  const wSel = document.getElementById("enhanceWeaponTargetSelect");
  const aSel = document.getElementById("enhanceArmorTargetSelect");

  if (wSel) {
    wSel.innerHTML = "";
    if (!Array.isArray(weaponInstances) || weaponInstances.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "強化できる武器がない";
      wSel.appendChild(opt);
    } else {
      weaponInstances.forEach((inst, i) => {
        if (!inst || !inst.id) return;
        const base = weapons.find(w => w.id === inst.id);
        const name = base ? base.name : inst.id;
        const q    = inst.quality || 0;
        const enh  = inst.enhance || 0;
        let label  = name;
        if (q > 0) {
          label += q === 1 ? "[良品]" : (q === 2 ? "[傑作]" : `[品質${q}]`);
        }
        if (enh > 0) {
          label += ` +${enh}`;
        }
        const key = makeWeaponInstanceKey(i, inst);
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = label;
        wSel.appendChild(opt);
      });

      if (prevWeaponKey &&
          Array.from(wSel.options).some(o => o.value === prevWeaponKey)) {
        wSel.value = prevWeaponKey;
      } else if (!wSel.value && wSel.options.length > 0) {
        wSel.selectedIndex = 0;
      }
    }
  }

  if (aSel) {
    aSel.innerHTML = "";
    if (!Array.isArray(armorInstances) || armorInstances.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "強化できる防具がない";
      aSel.appendChild(opt);
    } else {
      armorInstances.forEach((inst, i) => {
        if (!inst || !inst.id) return;
        const base = armors.find(a => a.id === inst.id);
        const name = base ? base.name : inst.id;
        const q    = inst.quality || 0;
        const enh  = inst.enhance || 0;
        let label  = name;
        if (q > 0) {
          label += q === 1 ? "[良品]" : (q === 2 ? "[傑作]" : `[品質${q}]`);
        }
        if (enh > 0) {
          label += ` +${enh}`;
        }
        const key = makeArmorInstanceKey(i, inst);
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = label;
        aSel.appendChild(opt);
      });

      if (prevArmorKey &&
          Array.from(aSel.options).some(o => o.value === prevArmorKey)) {
        aSel.value = prevArmorKey;
      } else if (!aSel.value && aSel.options.length > 0) {
        aSel.selectedIndex = 0;
      }
    }
  }
}

function consumeOneWeaponInstanceAsMaterial(weaponId){
  let usedQuality = 0;
  let usedEnh = 0;
  for (let i = 0; i < weaponInstances.length; i++) {
    const inst = weaponInstances[i];
    if (!inst || inst.id !== weaponId) continue;

    const loc = inst.location || "warehouse";
    if (loc !== "warehouse") continue;
    if (typeof equippedWeaponIndex === "number" &&
        equippedWeaponIndex === i) continue;

    usedQuality = inst.quality || 0;
    usedEnh     = inst.enhance || 0;

    weaponInstances.splice(i, 1);
    weaponCounts[weaponId] =
      Math.max(0, (weaponCounts[weaponId] || 0) - 1);

    if (usedQuality > 0 || usedEnh > 0) {
      appendLog("※良品/傑作/強化済みの武器を素材として消費した");
    }
    return true;
  }
  return false;
}

function consumeOneArmorInstanceAsMaterial(armorId){
  let usedQuality = 0;
  let usedEnh = 0;
  for (let i = 0; i < armorInstances.length; i++) {
    const inst = armorInstances[i];
    if (!inst || inst.id !== armorId) continue;

    const loc = inst.location || "warehouse";
    if (loc !== "warehouse") continue;
    if (typeof equippedArmorIndex === "number" &&
        equippedArmorIndex === i) continue;

    usedQuality = inst.quality || 0;
    usedEnh     = inst.enhance || 0;

    armorInstances.splice(i, 1);
    armorCounts[armorId] =
      Math.max(0, (armorCounts[armorId] || 0) - 1);

    if (usedQuality > 0 || usedEnh > 0) {
      appendLog("※良品/傑作/強化済みの防具を素材として消費した");
    }
    return true;
  }
  return false;
}

function getWeaponInstanceByKey(key) {
  const parsed = parseEnhanceTargetKey(key);
  if (!parsed || parsed.type !== "W") return null;
  if (!Array.isArray(weaponInstances)) return null;
  const inst = weaponInstances[parsed.index];
  if (!inst) return null;
  return { inst, index: parsed.index };
}

function getArmorInstanceByKey(key) {
  const parsed = parseEnhanceTargetKey(key);
  if (!parsed || parsed.type !== "A") return null;
  if (!Array.isArray(armorInstances)) return null;
  const inst = armorInstances[parsed.index];
  if (!inst) return null;
  return { inst, index: parsed.index };
}

// =======================
// 星屑（強化用）ヘルパー（ITEM_META 版）
// =======================

function getStarShardCount() {
  // 星屑の結晶は ITEM_META で RARE_GATHER_ITEM_ID として登録されている前提
  if (typeof getItemCountByMeta !== "function") return 0;
  return getItemCountByMeta(RARE_GATHER_ITEM_ID) || 0;
}

function consumeStarShard(num) {
  num = num || STAR_SHARD_NEED_NUM;
  if (num <= 0) return true;
  if (typeof consumeItemByMeta !== "function") return false;
  return consumeItemByMeta(RARE_GATHER_ITEM_ID, num);
}

// =======================
// 強化ロジック
// =======================

function enhanceWeapon(){
  const targetSel = document.getElementById("enhanceWeaponTargetSelect");
  if (!targetSel || !targetSel.value) {
    appendLog("強化する武器を選択してください");
    return;
  }

  const target = getWeaponInstanceByKey(targetSel.value);
  if (!target) {
    appendLog("強化対象の武器インスタンスが見つからない");
    return;
  }

  const inst = target.inst;
  const base = weapons.find(x => x.id === inst.id);
  if (!base) {
    appendLog("武器マスタが見つからないため強化できない");
    return;
  }

  inst.enhance = inst.enhance || 0;
  if (inst.enhance >= MAX_ENHANCE_LEVEL) {
    appendLog("これ以上強化できない");
    return;
  }

  const useStarShard = inst.enhance >= STAR_SHARD_NEED_LV;
  if (useStarShard) {
    const haveShard = getStarShardCount();
    if (haveShard < STAR_SHARD_NEED_NUM) {
      appendLog(`星屑の結晶が足りない（${haveShard}/${STAR_SHARD_NEED_NUM}）`);
      return;
    }
  }

  if (!consumeOneWeaponInstanceAsMaterial(inst.id)) {
    appendLog("同じ武器がもう1本必要です");
    return;
  }

  const cost = ENHANCE_COST_MONEY[inst.enhance];
  if (money < cost) {
    appendLog("お金が足りない");
    return;
  }
  money -= cost;

  // ★ 強化成功率 + 星屑スキルツリーボーナス
  let rate = ENHANCE_SUCCESS_RATES[inst.enhance];
  let starBonus = 0;
  if (useStarShard && typeof getGlobalSkillTreeBonus === "function") {
    try {
      const b = getGlobalSkillTreeBonus() || {};
      starBonus = b.craftStarBonusRate || 0; // 例: 0.10 で +10%
      if (starBonus > 0) {
        rate *= (1 + starBonus);
      }
    } catch (e) {
      console.warn("enhanceWeapon: skilltree bonus error", e);
    }
  }
  if (rate > 0.98) rate = 0.98;

  const roll = Math.random();
  const success = roll < rate;

  if (useStarShard) {
    if (!consumeStarShard(STAR_SHARD_NEED_NUM)) {
      appendLog("星屑の結晶の消費に失敗しました（在庫不足？）");
    }
  }

  const beforeEnh = inst.enhance;

  if (success) {
    inst.enhance++;
    appendLog(`武器強化成功！ ${base.name}+${inst.enhance}になった（同名武器1本消費${inst.enhance - 1 >= STAR_SHARD_NEED_LV ? "＋星屑の結晶消費" : ""}）`);
  } else {
    appendLog(`武器強化失敗…（同名武器は消費された${inst.enhance >= STAR_SHARD_NEED_LV ? "／星屑の結晶も消費された" : ""}）`);
  }

  // ★ 強化ログ（仕様は変えず記録のみ）
  if (typeof debugRecordEnhance === "function") {
    try {
      debugRecordEnhance({
        type: "weapon",
        itemId: inst.id,
        baseName: base.name,
        beforeEnhance: beforeEnh,
        afterEnhance: inst.enhance,
        success,
        useStarShard,
        moneyCost: cost,
        successRate: rate,
        starBonusRate: starBonus,
        roll
      });
    } catch (e) {}
  }

  if (typeof onEquipEnhancedForGuild === "function") {
    onEquipEnhancedForGuild({ type: "weapon" });
  }

  refreshEquipSelects();
  updateDisplay();
}

function enhanceArmor(){
  const targetSel = document.getElementById("enhanceArmorTargetSelect");
  if (!targetSel || !targetSel.value) {
    appendLog("強化する防具を選択してください");
    return;
  }

  const target = getArmorInstanceByKey(targetSel.value);
  if (!target) {
    appendLog("強化対象の防具インスタンスが見つからない");
    return;
  }

  const inst = target.inst;
  const base = armors.find(x => x.id === inst.id);
  if (!base) {
    appendLog("防具マスタが見つからないため強化できない");
    return;
  }

  inst.enhance = inst.enhance || 0;
  if (inst.enhance >= MAX_ENHANCE_LEVEL) {
    appendLog("これ以上強化できない");
    return;
  }

  const useStarShard = inst.enhance >= STAR_SHARD_NEED_LV;
  if (useStarShard) {
    const haveShard = getStarShardCount();
    if (haveShard < STAR_SHARD_NEED_NUM) {
      appendLog(`星屑の結晶が足りない（${haveShard}/${STAR_SHARD_NEED_NUM}）`);
      return;
    }
  }

  if (!consumeOneArmorInstanceAsMaterial(inst.id)) {
    appendLog("同じ防具がもう1つ必要です");
    return;
  }

  const cost = ENHANCE_COST_MONEY[inst.enhance];
  if (money < cost) {
    appendLog("お金が足りない");
    return;
  }
  money -= cost;

  // ★ 強化成功率 + 星屑スキルツリーボーナス
  let rate = ENHANCE_SUCCESS_RATES[inst.enhance];
  let starBonus = 0;
  if (useStarShard && typeof getGlobalSkillTreeBonus === "function") {
    try {
      const b = getGlobalSkillTreeBonus() || {};
      starBonus = b.craftStarBonusRate || 0;
      if (starBonus > 0) {
        rate *= (1 + starBonus);
      }
    } catch (e) {
      console.warn("enhanceArmor: skilltree bonus error", e);
    }
  }
  if (rate > 0.98) rate = 0.98;

  const roll = Math.random();
  const success = roll < rate;

  if (useStarShard) {
    if (!consumeStarShard(STAR_SHARD_NEED_NUM)) {
      appendLog("星屑の結晶の消費に失敗しました（在庫不足？）");
    }
  }

  const beforeEnh = inst.enhance;

  if (success) {
    inst.enhance++;
    appendLog(`防具強化成功！ ${base.name}+${inst.enhance}になった（同名防具1つ消費${inst.enhance - 1 >= STAR_SHARD_NEED_LV ? "＋星屑の結晶消費" : ""}）`);
  } else {
    appendLog(`防具強化失敗…（同名防具は消費された${inst.enhance >= STAR_SHARD_NEED_LV ? "／星屑の結晶も消費された" : ""}）`);
  }

  if (typeof debugRecordEnhance === "function") {
    try {
      debugRecordEnhance({
        type: "armor",
        itemId: inst.id,
        baseName: base.name,
        beforeEnhance: beforeEnh,
        afterEnhance: inst.enhance,
        success,
        useStarShard,
        moneyCost: cost,
        successRate: rate,
        starBonusRate: starBonus,
        roll
      });
    } catch (e) {}
  }

  if (typeof onEquipEnhancedForGuild === "function") {
    onEquipEnhancedForGuild({ type: "armor" });
  }

  refreshEquipSelects();
  updateDisplay();
}