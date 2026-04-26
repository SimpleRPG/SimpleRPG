// game-ui-5.js
// 倉庫UI（倉庫タブ + 拠点タブ内倉庫サブタブ 共通）
// inventory-core.js の状態を元に、2つの場所に同じUIを描画する。

// ルート要素と接頭辞から ID を組み立てる簡易ヘルパ
function wh_select(root, id) {
  return root ? root.querySelector("#" + id) : null;
}

// 手持ちと倉庫の UI を 1 つのルート要素に描画
function renderWarehouseInto(root, prefix) {
  if (!root) return;

  const equippedWeaponSlot = wh_select(root, prefix + "EquippedWeaponSlot");
  const equippedArmorSlot  = wh_select(root, prefix + "EquippedArmorSlot");
  const carryPotionsList   = wh_select(root, prefix + "CarryPotionsList");
  const carryFoodsList     = wh_select(root, prefix + "CarryFoodsList");
  const carryDrinksList    = wh_select(root, prefix + "CarryDrinksList");
  const carryWeaponsList   = wh_select(root, prefix + "CarryWeaponsList");
  const carryArmorsList    = wh_select(root, prefix + "CarryArmorsList");
  const carryToolsList     = wh_select(root, prefix + "CarryToolsList");

  const whPotionsList      = wh_select(root, prefix + "WarehousePotionsList");
  const whFoodsList        = wh_select(root, prefix + "WarehouseFoodsList");
  const whDrinksList       = wh_select(root, prefix + "WarehouseDrinksList");
  const whWeaponsList      = wh_select(root, prefix + "WarehouseWeaponsList");
  const whArmorsList       = wh_select(root, prefix + "WarehouseArmorsList");
  const whToolsList        = wh_select(root, prefix + "WarehouseToolsList");

  const limitPotionsText   = wh_select(root, prefix + "CarryLimitPotionsText");
  const limitFoodsText     = wh_select(root, prefix + "CarryLimitFoodsText");
  const limitDrinksText    = wh_select(root, prefix + "CarryLimitDrinksText");
  const limitWeaponsText   = wh_select(root, prefix + "CarryLimitWeaponsText");
  const limitArmorsText    = wh_select(root, prefix + "CarryLimitArmorsText");
  const limitToolsText     = wh_select(root, prefix + "CarryLimitToolsText");

  // 手持ち上限表示
  if (typeof getCarryTotal === "function" && typeof CARRY_LIMIT === "object") {
    if (limitPotionsText) {
      const cur = getCarryTotal(window.carryPotions || {});
      limitPotionsText.textContent = cur + " / " + (CARRY_LIMIT.potions || 0);
    }
    if (limitFoodsText) {
      const cur = getCarryTotal(window.carryFoods || {});
      limitFoodsText.textContent = cur + " / " + (CARRY_LIMIT.foods || 0);
    }
    if (limitDrinksText) {
      const cur = getCarryTotal(window.carryDrinks || {});
      limitDrinksText.textContent = cur + " / " + (CARRY_LIMIT.drinks || 0);
    }
    if (limitWeaponsText) {
      const cur = (typeof getWeaponOnHandTotal === "function")
        ? getWeaponOnHandTotal()
        : getCarryTotal(window.carryWeapons || {});
      limitWeaponsText.textContent = cur + " / " + (CARRY_LIMIT.weapons || 0);
    }
    if (limitArmorsText) {
      const cur = (typeof getArmorOnHandTotal === "function")
        ? getArmorOnHandTotal()
        : getCarryTotal(window.carryArmors || {});
      limitArmorsText.textContent = cur + " / " + (CARRY_LIMIT.armors || 0);
    }
    if (limitToolsText) {
      const cur = getCarryTotal(window.carryTools || {});
      limitToolsText.textContent = cur + " / " + (CARRY_LIMIT.tools || 0);
    }
  }

  // 装備中表示
  if (equippedWeaponSlot) {
    equippedWeaponSlot.textContent = "";
    if (typeof getEquippedWeaponLabel === "function") {
      equippedWeaponSlot.textContent = getEquippedWeaponLabel();
    } else if (window.equippedWeaponId) {
      equippedWeaponSlot.textContent = "ID: " + window.equippedWeaponId;
    } else {
      equippedWeaponSlot.textContent = "なし";
    }
  }
  if (equippedArmorSlot) {
    equippedArmorSlot.textContent = "";
    if (typeof getEquippedArmorLabel === "function") {
      equippedArmorSlot.textContent = getEquippedArmorLabel();
    } else if (window.equippedArmorId) {
      equippedArmorSlot.textContent = "ID: " + window.equippedArmorId;
    } else {
      equippedArmorSlot.textContent = "なし";
    }
  }

  // 汎用: シンプルな「名前 x個数」リストを描画
  function fillSimpleList(box, srcObj) {
    if (!box) return;
    box.innerHTML = "";
    if (!srcObj) {
      box.textContent = "なし";
      return;
    }

    const ids = Object.keys(srcObj).filter(id => (srcObj[id] || 0) > 0);
    if (!ids.length) {
      box.textContent = "なし";
      return;
    }

    ids.forEach(id => {
      const cnt = srcObj[id] || 0;
      const div = document.createElement("div");
      let label = id;
      if (typeof getItemName === "function") {
        label = getItemName(id);
      }
      div.textContent = `${label} x${cnt}`;
      box.appendChild(div);
    });
  }

  // 手持ち（非装備系）
  fillSimpleList(carryPotionsList, window.carryPotions);
  fillSimpleList(carryFoodsList,   window.carryFoods);
  fillSimpleList(carryDrinksList,  window.carryDrinks);
  fillSimpleList(carryToolsList,   window.carryTools);

  // 手持ち：武器・防具はインスタンス基準の簡易一覧
  function fillEquipmentList(box, instances, locKind) {
    if (!box) return;
    box.innerHTML = "";
    if (!Array.isArray(instances)) {
      box.textContent = "なし";
      return;
    }
    const list = instances.filter(inst => inst && (inst.location || "warehouse") === locKind);
    if (!list.length) {
      box.textContent = "なし";
      return;
    }
    list.forEach(inst => {
      const div = document.createElement("div");
      let name = inst.id;
      if (typeof getItemName === "function") {
        name = getItemName(inst.id);
      }
      const enh = inst.enhance || 0;
      const q   = inst.quality || 0;
      const dur = (typeof inst.durability !== "undefined") ? inst.durability : "-";
      div.textContent = `${name} (+${enh}, 品質${q}, Dur:${dur})`;
      box.appendChild(div);
    });
  }

  fillEquipmentList(carryWeaponsList, window.weaponInstances || [], "carry");
  fillEquipmentList(carryArmorsList,  window.armorInstances  || [], "carry");

  // 倉庫側：ポーション・料理・道具
  fillSimpleList(whPotionsList, (typeof window.potionCounts === "object") ? window.potionCounts : null);
  fillSimpleList(whFoodsList,   window.cookedFoods  || null);
  fillSimpleList(whDrinksList,  window.cookedDrinks || null);
  fillSimpleList(whToolsList,   window.toolCounts   || null);

  // 倉庫側：武器・防具（location === "warehouse" のインスタンス）
  fillEquipmentList(whWeaponsList, window.weaponInstances || [], "warehouse");
  fillEquipmentList(whArmorsList,  window.armorInstances  || [], "warehouse");
}

// 倉庫タブ & 拠点倉庫サブタブをまとめて更新
function refreshWarehouseUI() {
  const mainRoot    = document.getElementById("pageWarehouseInner");     // 上部倉庫タブ
  const housingRoot = document.getElementById("housingWarehouseInner");  // 拠点サブタブ倉庫

  if (!mainRoot && !housingRoot) return;

  // 上部倉庫タブ側（prefix なし）
  if (mainRoot) {
    renderWarehouseInto(mainRoot, "");
  }

  // 拠点サブタブ側（ID が housing〜 なので prefix を付ける）
  if (housingRoot) {
    renderWarehouseInto(housingRoot, "housing");
  }

  // サブタブ（装備・アイテム / 素材）の切り替え初期化
  initWarehouseSubTabsForRoot(mainRoot,     "",         "warehouse");
  initWarehouseSubTabsForRoot(housingRoot,  "housing",  "housingWarehouse");
}

// ルートごとの倉庫内サブタブ初期化
function initWarehouseSubTabsForRoot(root, prefix, tabPrefix) {
  if (!root) return;
  const tabItems = root.querySelector("#" + tabPrefix + "TabItems");
  const tabMats  = root.querySelector("#" + tabPrefix + "TabMaterials");
  const pageItems = root.querySelector("#" + prefix + "WarehousePageItems");
  const pageMats  = root.querySelector("#" + prefix + "WarehousePageMaterials");
  if (!tabItems || !tabMats || !pageItems || !pageMats) return;

  function setSub(kind) {
    const isItems = kind === "items";
    tabItems.classList.toggle("active", isItems);
    tabMats.classList.toggle("active", !isItems);
    pageItems.style.display = isItems ? "" : "none";
    pageMats.style.display  = isItems ? "none" : "";

    if (!isItems) {
      // 素材タブに切り替えたとき、倉庫タブの素材一覧を更新
      if (typeof renderWarehouseGatherMaterials === "function") {
        renderWarehouseGatherMaterials();
      }
      if (typeof renderWarehouseIntermediateMaterials === "function") {
        renderWarehouseIntermediateMaterials();
      }
      if (typeof renderWarehouseCookingMaterials === "function") {
        renderWarehouseCookingMaterials();
      }
    }
  }

  tabItems.addEventListener("click", () => setSub("items"));
  tabMats.addEventListener("click", () => setSub("materials"));
  setSub("items");
}