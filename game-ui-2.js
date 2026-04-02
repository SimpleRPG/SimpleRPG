// game-ui-2.js
// 倉庫タブ（手持ち / 倉庫）表示と出し入れボタン

// 既存の inventory-core.js / craft-data.js / cook-data.js 前提
// - carryPotions, carryFoods, carryDrinks, carryWeapons, carryArmors, carryTools
// - potionCounts, weaponCounts, armorCounts, cookedFoods, cookedDrinks
// - potions, weapons, armors, COOKING_RECIPES
// - movePotionToCarry / movePotionToWarehouse
// - moveFoodToCarry / moveFoodToWarehouse
// - moveDrinkToCarry / moveDrinkToWarehouse
// - moveWeaponToCarry / moveWeaponToWarehouse
// - moveArmorToCarry / moveArmorToWarehouse
// - moveToolToCarry / moveToolToWarehouse（未実装ログのみ）
// - refreshCarryPotionSelects, refreshCarryFoodDrinkSelects

function refreshWarehouseUI() {
  // =======================
  // ヘルパ（1行描画）
  // =======================
  function createRow(name, count, moveBtnConfigs) {
    // moveBtnConfigs: [{ label: "↑手持ちへ", onClick: () => {...} }, ...]
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.gap = "4px";

    const span = document.createElement("span");
    span.textContent = `${name} x${count}`;
    div.appendChild(span);

    moveBtnConfigs.forEach(cfg => {
      const btn = document.createElement("button");
      btn.textContent = cfg.label;
      btn.style.fontSize = "10px";
      btn.addEventListener("click", cfg.onClick);
      div.appendChild(btn);
    });

    return div;
  }

  // 名前解決ヘルパ
  function getPotionName(id) {
    if (!Array.isArray(potions)) return id;
    const p = potions.find(x => x.id === id);
    return p ? p.name : id;
  }
  function getWeaponName(id) {
    if (!Array.isArray(weapons)) return id;
    const w = weapons.find(x => x.id === id);
    return w ? w.name : id;
  }
  function getArmorName(id) {
    if (!Array.isArray(armors)) return id;
    const a = armors.find(x => x.id === id);
    return a ? a.name : id;
  }
  function getFoodName(id) {
    if (typeof COOKING_RECIPES === "undefined") return id;
    const r = COOKING_RECIPES.food.find(x => x.id === id);
    return r ? r.name : id;
  }
  function getDrinkName(id) {
    if (typeof COOKING_RECIPES === "undefined") return id;
    const r = COOKING_RECIPES.drink.find(x => x.id === id);
    return r ? r.name : id;
  }

  // =======================
  // 手持ち側の描画
  // =======================

  const carryPotionsBox = document.getElementById("carryPotionsList");
  const carryFoodsBox   = document.getElementById("carryFoodsList");
  const carryDrinksBox  = document.getElementById("carryDrinksList");
  const carryWeaponsBox = document.getElementById("carryWeaponsList");
  const carryArmorsBox  = document.getElementById("carryArmorsList");
  const carryToolsBox   = document.getElementById("carryToolsList");

  if (carryPotionsBox) {
    carryPotionsBox.innerHTML = "";
    Object.keys(carryPotions).forEach(id => {
      const cnt = carryPotions[id] || 0;
      if (cnt <= 0) return;
      const name = getPotionName(id);
      const row = createRow(name, cnt, [
        {
          label: "↓倉庫へ",
          onClick: () => {
            if (movePotionToWarehouse(id, 1)) {
              if (typeof refreshCarryPotionSelects === "function") {
                refreshCarryPotionSelects();
              }
              refreshWarehouseUI();
            }
          }
        }
      ]);
      carryPotionsBox.appendChild(row);
    });
  }

  if (carryFoodsBox) {
    carryFoodsBox.innerHTML = "";
    Object.keys(carryFoods).forEach(id => {
      const cnt = carryFoods[id] || 0;
      if (cnt <= 0) return;
      const name = getFoodName(id);
      const row = createRow(name, cnt, [
        {
          label: "↓倉庫へ",
          onClick: () => {
            if (moveFoodToWarehouse(id, 1)) {
              if (typeof refreshCarryFoodDrinkSelects === "function") {
                refreshCarryFoodDrinkSelects();
              }
              refreshWarehouseUI();
            }
          }
        }
      ]);
      carryFoodsBox.appendChild(row);
    });
  }

  if (carryDrinksBox) {
    carryDrinksBox.innerHTML = "";
    Object.keys(carryDrinks).forEach(id => {
      const cnt = carryDrinks[id] || 0;
      if (cnt <= 0) return;
      const name = getDrinkName(id);
      const row = createRow(name, cnt, [
        {
          label: "↓倉庫へ",
          onClick: () => {
            if (moveDrinkToWarehouse(id, 1)) {
              if (typeof refreshCarryFoodDrinkSelects === "function") {
                refreshCarryFoodDrinkSelects();
              }
              refreshWarehouseUI();
            }
          }
        }
      ]);
      carryDrinksBox.appendChild(row);
    });
  }

  if (carryWeaponsBox) {
    carryWeaponsBox.innerHTML = "";
    Object.keys(carryWeapons).forEach(id => {
      const cnt = carryWeapons[id] || 0;
      if (cnt <= 0) return;
      const name = getWeaponName(id);
      const row = createRow(name, cnt, [
        {
          label: "↓倉庫へ",
          onClick: () => {
            if (moveWeaponToWarehouse(id, 1)) {
              refreshWarehouseUI();
            }
          }
        }
      ]);
      carryWeaponsBox.appendChild(row);
    });
  }

  if (carryArmorsBox) {
    carryArmorsBox.innerHTML = "";
    Object.keys(carryArmors).forEach(id => {
      const cnt = carryArmors[id] || 0;
      if (cnt <= 0) return;
      const name = getArmorName(id);
      const row = createRow(name, cnt, [
        {
          label: "↓倉庫へ",
          onClick: () => {
            if (moveArmorToWarehouse(id, 1)) {
              refreshWarehouseUI();
            }
          }
        }
      ]);
      carryArmorsBox.appendChild(row);
    });
  }

  if (carryToolsBox) {
    carryToolsBox.innerHTML = "";
    Object.keys(carryTools).forEach(id => {
      const cnt = carryTools[id] || 0;
      if (cnt <= 0) return;
      const name = id;
      const row = createRow(name, cnt, [
        {
          label: "↓倉庫へ",
          onClick: () => {
            // 現状はログだけ
            moveToolToWarehouse(id, 1);
            refreshWarehouseUI();
          }
        }
      ]);
      carryToolsBox.appendChild(row);
    });
  }

  // =======================
  // 倉庫側の描画
  // =======================

  const whPotionsBox  = document.getElementById("warehousePotionsList");
  const whFoodsBox    = document.getElementById("warehouseFoodsList");
  const whDrinksBox   = document.getElementById("warehouseDrinksList");
  const whWeaponsBox  = document.getElementById("warehouseWeaponsList");
  const whArmorsBox   = document.getElementById("warehouseArmorsList");
  const whToolsBox    = document.getElementById("warehouseToolsList");

  if (whPotionsBox) {
    whPotionsBox.innerHTML = "";
    Object.keys(potionCounts).forEach(id => {
      const cnt = potionCounts[id] || 0;
      if (cnt <= 0) return;
      const name = getPotionName(id);
      const row = createRow(name, cnt, [
        {
          label: "↑手持ちへ",
          onClick: () => {
            if (movePotionToCarry(id, 1)) {
              if (typeof refreshCarryPotionSelects === "function") {
                refreshCarryPotionSelects();
              }
              refreshWarehouseUI();
            }
          }
        }
      ]);
      whPotionsBox.appendChild(row);
    });
  }

  if (whFoodsBox) {
    whFoodsBox.innerHTML = "";
    Object.keys(cookedFoods).forEach(id => {
      const cnt = cookedFoods[id] || 0;
      if (cnt <= 0) return;
      const name = getFoodName(id);
      const row = createRow(name, cnt, [
        {
          label: "↑手持ちへ",
          onClick: () => {
            if (moveFoodToCarry(id, 1)) {
              if (typeof refreshCarryFoodDrinkSelects === "function") {
                refreshCarryFoodDrinkSelects();
              }
              refreshWarehouseUI();
            }
          }
        }
      ]);
      whFoodsBox.appendChild(row);
    });
  }

  if (whDrinksBox) {
    whDrinksBox.innerHTML = "";
    Object.keys(cookedDrinks).forEach(id => {
      const cnt = cookedDrinks[id] || 0;
      if (cnt <= 0) return;
      const name = getDrinkName(id);
      const row = createRow(name, cnt, [
        {
          label: "↑手持ちへ",
          onClick: () => {
            if (moveDrinkToCarry(id, 1)) {
              if (typeof refreshCarryFoodDrinkSelects === "function") {
                refreshCarryFoodDrinkSelects();
              }
              refreshWarehouseUI();
            }
          }
        }
      ]);
      whDrinksBox.appendChild(row);
    });
  }

  if (whWeaponsBox) {
    whWeaponsBox.innerHTML = "";
    Object.keys(weaponCounts).forEach(id => {
      const cnt = weaponCounts[id] || 0;
      if (cnt <= 0) return;
      const name = getWeaponName(id);
      const row = createRow(name, cnt, [
        {
          label: "↑手持ちへ",
          onClick: () => {
            if (moveWeaponToCarry(id, 1)) {
              refreshWarehouseUI();
            }
          }
        }
      ]);
      whWeaponsBox.appendChild(row);
    });
  }

  if (whArmorsBox) {
    whArmorsBox.innerHTML = "";
    Object.keys(armorCounts).forEach(id => {
      const cnt = armorCounts[id] || 0;
      if (cnt <= 0) return;
      const name = getArmorName(id);
      const row = createRow(name, cnt, [
        {
          label: "↑手持ちへ",
          onClick: () => {
            if (moveArmorToCarry(id, 1)) {
              refreshWarehouseUI();
            }
          }
        }
      ]);
      whArmorsBox.appendChild(row);
    });
  }

  if (whToolsBox) {
    whToolsBox.innerHTML = "";
    // 道具は「存在する＝倉庫」扱い、今は個別counts未実装なので空のまま維持
    // 将来、toolCounts 等を作ったらここで描画する
  }
}