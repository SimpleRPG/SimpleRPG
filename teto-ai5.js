// teto-ai5.js
// テトちゃん（クラフト専用ロジック）
// - クラフト用コンテキスト取得
// - 不足素材の洗い出し
// - 一次素材の採取＋料理素材（狩猟/釣り/農園）
// - クラフト実行ラッパ
// - グローバル公開: window.tetoDoOneCraftStepV5

(function () {
  "use strict";

  if (typeof window === "undefined") return;

  // =========================
  // 共通ステータスヘルパー
  // =========================

  function tetoGetResourceStatus() {
    return {
      hunger: typeof currentHunger === "number" ? currentHunger : null,
      thirst: typeof currentThirst === "number" ? currentThirst : null,
      money: typeof money === "number" ? money : null
    };
  }

  // =========================
  // 通常クラフト用: 足りない素材リスト
  // =========================
  // itemId から「足りない素材リスト」を返す（スキルツリーのコスト減を反映）
  function tetoGetCraftNeedsForItem(itemId) {
    if (!itemId || typeof getItemMeta !== "function") return [];

    const meta  = getItemMeta(itemId);
    const craft = meta && meta.craft;
    const rawCost = craft && craft.cost;
    if (!rawCost || typeof rawCost !== "object") return [];

    if (typeof refreshCraftSkillTreeBonus === "function") {
      refreshCraftSkillTreeBonus();
    }
    const shownCost = (typeof applyCraftCostReduction === "function")
      ? applyCraftCostReduction(rawCost) || {}
      : rawCost;

    const needs = [];
    Object.keys(shownCost).forEach(id => {
      const need = shownCost[id] | 0;
      if (need <= 0) return;

      const have = (typeof getItemCountByMeta === "function")
        ? (getItemCountByMeta(id) || 0)
        : 0;

      const missing = need - have;
      if (missing > 0) {
        needs.push({ id, need, have, missing });
      }
    });

    return needs;
  }

  // 一次素材IDかどうか判定（wood_T1 など）
  function tetoIsPrimaryMaterialId(id) {
    if (typeof parseMaterialId !== "function") return false;
    const parsed = parseMaterialId(id);
    if (!parsed) return false;
    return Array.isArray(window.MATERIAL_KEYS) && window.MATERIAL_KEYS.includes(parsed.key);
  }

  // 不足素材ID → { field, target } を決める
  function tetoChooseGatherTargetForMaterialId(id) {
    if (typeof parseMaterialId !== "function") return null;
    const parsed = parseMaterialId(id);
    if (!parsed) return null;

    const key  = parsed.key;  // wood / ore / herb / cloth / leather / water
    const tier = parsed.tier; // 1 / 2 / 3

    let field = "field1";
    if (tier >= 3) field = "field3";
    else if (tier === 2) field = "field2";

    if (typeof canEnterGatherFieldForTarget === "function") {
      if (!canEnterGatherFieldForTarget(field, key)) {
        if (field === "field3" && canEnterGatherFieldForTarget("field2", key)) {
          field = "field2";
        } else if (canEnterGatherFieldForTarget("field1", key)) {
          field = "field1";
        } else {
          return null;
        }
      }
    }

    return { field, target: key };
  }

  // 足りない一次素材のうち一番不足しているものを採取する（通常クラフト用）
  function tetoActGatherForNeeds(needs) {
    const primaryNeeds = needs
      .filter(n => tetoIsPrimaryMaterialId(n.id))
      .sort((a, b) => b.missing - a.missing);

    if (!primaryNeeds.length) return false;

    const targetNeed = primaryNeeds[0];
    const plan = tetoChooseGatherTargetForMaterialId(targetNeed.id);
    if (!plan) return false;

    const fieldSel  = document.getElementById("gatherField");
    const targetSel = document.getElementById("gatherTarget");
    if (!fieldSel || !targetSel) return false;

    fieldSel.value = plan.field;
    if (typeof refreshGatherTargetSelect === "function") {
      refreshGatherTargetSelect();
    }
    targetSel.value = plan.target;

    if (typeof gather === "function") {
      if (window.isExploring || window.currentEnemy) {
        if (typeof appendLog === "function") {
          appendLog("探索中はクラフト素材の採取ができない！");
        }
        return false;
      }
      gather();
      if (typeof updateGatherMatDetailText === "function") {
        updateGatherMatDetailText();
      }
      if (typeof updateCraftMatDetailText === "function") {
        updateCraftMatDetailText();
      }
      if (typeof refreshGatherStatsUI === "function") {
        refreshGatherStatsUI();
      }
    }

    return true;
  }

  // =========================
  // 料理用: レシピ/needs 判定
  // =========================

  function tetoGetCookingRecipeById(kind, id) {
    if (typeof COOKING_RECIPES === "undefined") return null;
    const list = COOKING_RECIPES && COOKING_RECIPES[kind];
    if (!list) return null;
    return list.find(r => r && r.id === id) || null;
  }

  function tetoGetCookingNeedsFromRecipe(recipe) {
    const needs = [];
    if (!recipe || !recipe.requires) return needs;

    Object.keys(recipe.requires).forEach(matId => {
      const need = recipe.requires[matId];
      if (need <= 0) return;

      let have = 0;
      if (typeof getItemCountByMeta === "function") {
        have = getItemCountByMeta(matId); // storageKind: cooking を透過的に見る[item-meta-core.js][web:123]
      } else if (typeof window.cookingMats === "object") {
        have = window.cookingMats[matId] || 0;
      }

      const missing = need - have;
      if (missing > 0) {
        needs.push({ id: matId, need, have, missing });
      }
    });

    return needs;
  }

  // =========================
  // 料理用: gatherCooking + 農園連動
  // =========================

  // 不足している料理素材に応じて、狩猟/釣り/農園を1回だけ行う
  function tetoActCookingGatherForNeeds(needs) {
    if (!needs || !needs.length) return false;

    // 一番不足が大きい素材から見ていく
    needs.sort((a, b) => b.missing - a.missing);

    const target = needs[0];
    const id = target.id;

    // 肉 → 狩猟 gatherCooking("hunt")
    if (id.startsWith("meat_") && typeof gatherCooking === "function") {
      gatherCooking("hunt");
      if (typeof window.tetoIncCounter === "function") {
        window.tetoIncCounter("gathers");
      }
      return true;
    }

    // 魚 → 釣り gatherCooking("fish")
    if (id.startsWith("fish_") && typeof gatherCooking === "function") {
      gatherCooking("fish");
      if (typeof window.tetoIncCounter === "function") {
        window.tetoIncCounter("gathers");
      }
      return true;
    }

    // 野菜/穀物/スパイスなど → 農園を優先的に回す
    if (id.startsWith("veg_") || id.startsWith("grain_") || id.startsWith("spice_")) {
      let did = false;

      // v4 側の農園 AI プリミティブをそのまま利用[teto-ai4.js][web:124]
      if (typeof tetoMaybeCareFarm === "function") {
        try { tetoMaybeCareFarm(); did = true; } catch (e) {}
      }
      if (typeof tetoMaybeHarvestFarm === "function") {
        try { tetoMaybeHarvestFarm(); did = true; } catch (e) {}
      }
      if (typeof tetoMaybePlantFarmSeeds === "function") {
        try { tetoMaybePlantFarmSeeds(); did = true; } catch (e) {}
      }

      if (!did && typeof appendLog === "function") {
        appendLog("[テト] 農園の操作関数が見つからないため、野菜系素材を自動で増やせません。");
      }
      return did;
    }

    // その他の料理素材は今は何もしない（既存仕様を壊さない）
    return false;
  }

  // =========================
  // クラフトUIコンテキスト取得
  // =========================

  // 今のクラフトUI状態から「何を作ろうとしているか」を取る
  function tetoGetCurrentCraftContext() {
    const cat = window.activeCraftCategory || window.lastCraftCategory || null;

    // 武器
    if (cat === "weapon") {
      const sel = document.getElementById("weaponSelect");
      const id  = sel && sel.value;
      return { category: "weapon", uiCategory: "weapon", itemId: id, kind: "weapon" };
    }

    // 防具
    if (cat === "armor") {
      const sel = document.getElementById("armorSelect");
      const id  = sel && sel.value;
      return { category: "armor", uiCategory: "armor", itemId: id, kind: "armor" };
    }

    // ポーション
    if (cat === "potion") {
      const sel = document.getElementById("potionSelect");
      const id  = sel && sel.value;
      return { category: "potion", uiCategory: "potion", itemId: id, kind: "potion" };
    }

    // 道具
    if (cat === "tool") {
      const sel = document.getElementById("toolSelect");
      const id  = sel && sel.value;
      return { category: "tool", uiCategory: "tool", itemId: id, kind: "tool" };
    }

    // 中間素材
    if (cat === "material") {
      const sel = document.getElementById("intermediateSelect");
      const id  = sel && sel.value;
      return { category: "material", uiCategory: "material", itemId: id, kind: "material" };
    }

    // 料理（食べ物）
    if (cat === "cookingFood" || cat === "cooking") {
      const sel = document.getElementById("foodSelect");
      const id  = (sel && sel.value) || window.lastCookingId || null;
      return { category: "food", uiCategory: "cookingFood", itemId: id, kind: "food" };
    }

    // 料理（飲み物）
    if (cat === "cookingDrink") {
      const sel = document.getElementById("drinkSelect");
      const id  = (sel && sel.value) || window.lastCookingId || null;
      return { category: "drink", uiCategory: "cookingDrink", itemId: id, kind: "drink" };
    }

    // 家具
    if (cat === "furniture") {
      const sel = document.getElementById("furnitureSelect");
      const id  = sel && sel.value;
      return { category: "furniture", uiCategory: "furniture", itemId: id, kind: "furniture" };
    }

    return { category: null, uiCategory: null, itemId: null, kind: null };
  }

  // =========================
  // クラフト実行ラッパ（既存仕様維持）
  // =========================

  // 「実際にクラフトする」ラッパ
  function tetoDoCraftOnce(ctx) {
    if (!ctx || !ctx.itemId || !ctx.uiCategory) return false;
    if (window.isExploring || window.currentEnemy) return false;

    window.activeCraftCategory = ctx.uiCategory;
    window.lastCraftCategory   = ctx.uiCategory;

    const setSelect = (id) => {
      const sel = document.getElementById(id);
      if (sel) sel.value = ctx.itemId;
    };

    if (ctx.uiCategory === "weapon") {
      setSelect("weaponSelect");
      if (typeof craftWeapon === "function") {
        craftWeapon();
        if (typeof updateCraftCostInfo === "function") {
          updateCraftCostInfo("weapon", ctx.itemId);
        }
        return true;
      }
    }

    if (ctx.uiCategory === "armor") {
      setSelect("armorSelect");
      if (typeof craftArmor === "function") {
        craftArmor();
        if (typeof updateCraftCostInfo === "function") {
          updateCraftCostInfo("armor", ctx.itemId);
        }
        return true;
      }
    }

    if (ctx.uiCategory === "potion") {
      setSelect("potionSelect");
      if (typeof craftPotion === "function") {
        craftPotion();
        if (typeof updateCraftCostInfo === "function") {
          updateCraftCostInfo("potion", ctx.itemId);
        }
        return true;
      }
    }

    if (ctx.uiCategory === "tool") {
      setSelect("toolSelect");
      if (typeof craftTool === "function") {
        craftTool();
        if (typeof updateCraftCostInfo === "function") {
          updateCraftCostInfo("tool", ctx.itemId);
        }
        return true;
      }
    }

    if (ctx.uiCategory === "material") {
      setSelect("intermediateSelect");
      if (typeof craftIntermediate === "function") {
        craftIntermediate(ctx.itemId);
        if (typeof updateCraftCostInfo === "function") {
          updateCraftCostInfo("material", ctx.itemId);
        }
        return true;
      }
    }

    if (ctx.uiCategory === "cookingFood") {
      setSelect("foodSelect");
      window.lastCookingKind = "food";
      window.lastCookingId   = ctx.itemId;
      if (typeof craftFood === "function") {
        craftFood();
        if (typeof updateCraftCostInfo === "function") {
          updateCraftCostInfo("cookingFood", ctx.itemId);
        }
        return true;
      }
    }

    if (ctx.uiCategory === "cookingDrink") {
      setSelect("drinkSelect");
      window.lastCookingKind = "drink";
      window.lastCookingId   = ctx.itemId;
      if (typeof craftDrink === "function") {
        craftDrink();
        if (typeof updateCraftCostInfo === "function") {
          updateCraftCostInfo("cookingDrink", ctx.itemId);
        }
        return true;
      }
    }

    if (ctx.uiCategory === "furniture") {
      setSelect("furnitureSelect");
      if (typeof craftFurniture === "function") {
        craftFurniture();
        if (typeof updateCraftCostInfo === "function") {
          updateCraftCostInfo("furniture", ctx.itemId);
        }
        return true;
      }
    }

    return false;
  }

  // =========================
  // 立て直し用の簡易チェック（既存）
  // =========================

  function tetoCanCraftCurrentSelectionV5() {
    if (typeof window.tetoGetInventoryStatus !== "function" ||
        typeof window.tetoGetResourceStatus !== "function") {
      return true;
    }

    const inv = window.tetoGetInventoryStatus();
    const res = window.tetoGetResourceStatus();

    const hasAnyItem =
      Object.keys(inv.carryTools).length > 0 ||
      Object.keys(inv.carryFoods).length > 0 ||
      Object.keys(inv.carryDrinks).length > 0 ||
      Object.keys(inv.carryPotions).length > 0;

    if (!hasAnyItem && (!res.money || res.money <= 0)) {
      return false;
    }

    return true;
  }

  // =========================
  // メイン: 1 tick クラフト AI
  // =========================

  function tetoDoOneCraftStepV5() {
    if (window.isExploring || window.currentEnemy) {
      return;
    }

    if (!tetoCanCraftCurrentSelectionV5()) {
      window._tetoRecentCraftSkipCount = (window._tetoRecentCraftSkipCount || 0) + 1;
      return;
    }

    const ctx = tetoGetCurrentCraftContext();
    if (!ctx || !ctx.itemId) {
      window._tetoRecentCraftSkipCount = (window._tetoRecentCraftSkipCount || 0) + 1;
      return;
    }

    // 料理カテゴリは COOKING_RECIPES の requires を見て素材チェックする
    if (ctx.category === "food" || ctx.category === "drink") {
      const kind = ctx.category; // "food" / "drink"
      const recipe =
        tetoGetCookingRecipeById(kind, ctx.itemId) ||
        null; // ※ここでは「選ばれているもの」をそのまま使う（仕様変更しない）

      if (!recipe) {
        window._tetoRecentCraftSkipCount = (window._tetoRecentCraftSkipCount || 0) + 1;
        return;
      }

      const needs = tetoGetCookingNeedsFromRecipe(recipe);
      if (needs && needs.length > 0) {
        const didGather = tetoActCookingGatherForNeeds(needs);
        if (!didGather) {
          window._tetoRecentCraftSkipCount = (window._tetoRecentCraftSkipCount || 0) + 1;
        } else {
          window._tetoRecentCraftSkipCount = 0;
        }
        return;
      }

      // 料理素材が揃っている場合は、従来通り craftFood/craftDrink を呼ぶ
      const didCraft = tetoDoCraftOnce(ctx);

      if (didCraft) {
        if (typeof window.tetoIncCounter === "function") {
          window.tetoIncCounter("crafts");
        }
        window._tetoRecentCraftSkipCount = 0;
      } else {
        window._tetoRecentCraftSkipCount = (window._tetoRecentCraftSkipCount || 0) + 1;
      }
      return;
    }

    // それ以外は従来の ITEM_META.craft.cost ベース
    const needs = tetoGetCraftNeedsForItem(ctx.itemId);

    if (needs && needs.length > 0) {
      const didGather = tetoActGatherForNeeds(needs);
      if (!didGather) {
        window._tetoRecentCraftSkipCount = (window._tetoRecentCraftSkipCount || 0) + 1;
      } else {
        window._tetoRecentCraftSkipCount = 0;
      }
      return;
    }

    const didCraft = tetoDoCraftOnce(ctx);

    if (didCraft) {
      if (typeof window.tetoIncCounter === "function") {
        window.tetoIncCounter("crafts");
      }
      window._tetoRecentCraftSkipCount = 0;
    } else {
      window._tetoRecentCraftSkipCount = (window._tetoRecentCraftSkipCount || 0) + 1;
    }
  }

  // 公開
  window.tetoDoOneCraftStepV5 = tetoDoOneCraftStepV5;

})();