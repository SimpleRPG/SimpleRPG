// game-ui-2.js
// 倉庫タブ（手持ち / 倉庫）表示と出し入れボタン ＋ 料理クラフトUI ＋ 戦闘スキル＋ショップ

// ★追加：直近に表示した料理レシピを保存するグローバル
window.lastCookingKind = window.lastCookingKind || null; // "food" | "drink"
window.lastCookingId   = window.lastCookingId   || null;

function refreshWarehouseUI() {
  // =======================
  // ヘルパ（1行描画）
  // =======================
  function createRow(name, count, moveBtnConfigs) {
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

  // 単品表示用（装備枠）
  function createSingleRow(label, btnConfigs) {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.gap = "4px";

    const span = document.createElement("span");
    span.textContent = label;
    div.appendChild(span);

    btnConfigs.forEach(cfg => {
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
  function getWeaponMaster(id) {
    if (!Array.isArray(weapons)) return null;
    return weapons.find(x => x.id === id) || null;
  }
  function getWeaponName(id) {
    const w = getWeaponMaster(id);
    return w ? w.name : id;
  }
  function getArmorMaster(id) {
    if (!Array.isArray(armors)) return null;
    return armors.find(x => x.id === id) || null;
  }
  function getArmorName(id) {
    const a = getArmorMaster(id);
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
  function getToolName(id) {
    if (id === "bomb")   return "爆弾";
    if (id === "bomb_T1") return "爆弾T1";
    if (id === "bomb_T2") return "爆弾T2";
    if (id === "bomb_T3") return "爆弾T3";
    return id;
  }

  // インスタンスからラベルを生成（単体）
  function buildWeaponLabelFromInstance(inst) {
    const base = getWeaponMaster(inst.id);
    const name = base ? base.name : inst.id;

    let qLabel = "";
    if (inst.quality === 2) qLabel = "【傑作】";
    else if (inst.quality === 1) qLabel = "【良品】";

    const enh = inst.enhance || 0;
    const enhLabel = enh > 0 ? `+${enh}` : "";

    const dur = inst.durability ?? MAX_DURABILITY;
    const durLabel = `耐久${dur}`;

    return `${qLabel}${name}${enhLabel ? " " + enhLabel : ""} ${durLabel}`;
  }

  function buildArmorLabelFromInstance(inst) {
    const base = getArmorMaster(inst.id);
    const name = base ? base.name : inst.id;

    let qLabel = "";
    if (inst.quality === 2) qLabel = "【傑作】";
    else if (inst.quality === 1) qLabel = "【良品】";

    const enh = inst.enhance || 0;
    const enhLabel = enh > 0 ? `+${enh}` : "";

    const dur = inst.durability ?? MAX_DURABILITY;
    const durLabel = `耐久${dur}`;

    return `${qLabel}${name}${enhLabel ? " " + enhLabel : ""} ${durLabel}`;
  }

  // location と性能でグループ化（同性能スタック用）
  function buildWeaponGroups(location) {
    const groups = [];
    if (!Array.isArray(window.weaponInstances)) {
      // 旧仕様フォールバック：idごとに counts をそのまま使う
      const src = location === "carry" ? carryWeapons : weaponCounts;
      Object.keys(src).forEach(id => {
        const cnt = src[id] || 0;
        if (cnt <= 0) return;
        groups.push({
          id,
          quality: 0,
          enhance: 0,
          durability: MAX_DURABILITY,
          location,
          count: cnt
        });
      });
      return groups;
    }

    const map = {};
    window.weaponInstances.forEach((inst, index) => {
      if (!inst || !inst.id) return;
      const loc = inst.location || "warehouse";
      if (loc !== location) return;

      const q = inst.quality || 0;
      const e = inst.enhance || 0;
      const d = inst.durability ?? MAX_DURABILITY;
      const key = `${inst.id}::${q}::${e}::${d}::${loc}`;

      if (!map[key]) {
        map[key] = {
          id: inst.id,
          quality: q,
          enhance: e,
          durability: d,
          location: loc,
          count: 0,
          instanceIndexes: []
        };
      }
      map[key].count++;
      map[key].instanceIndexes.push(index);
    });

    Object.keys(map).forEach(k => groups.push(map[k]));
    return groups;
  }

  function buildArmorGroups(location) {
    const groups = [];
    if (!Array.isArray(window.armorInstances)) {
      const src = location === "carry" ? carryArmors : armorCounts;
      Object.keys(src).forEach(id => {
        const cnt = src[id] || 0;
        if (cnt <= 0) return;
        groups.push({
          id,
          quality: 0,
          enhance: 0,
          durability: MAX_DURABILITY,
          location,
          count: cnt
        });
      });
      return groups;
    }

    const map = {};
    window.armorInstances.forEach((inst, index) => {
      if (!inst || !inst.id) return;
      const loc = inst.location || "warehouse";
      if (loc !== location) return;

      const q = inst.quality || 0;
      const e = inst.enhance || 0;
      const d = inst.durability ?? MAX_DURABILITY;
      const key = `${inst.id}::${q}::${e}::${d}::${loc}`;

      if (!map[key]) {
        map[key] = {
          id: inst.id,
          quality: q,
          enhance: e,
          durability: d,
          location: loc,
          count: 0,
          instanceIndexes: []
        };
      }
      map[key].count++;
      map[key].instanceIndexes.push(index);
    });

    Object.keys(map).forEach(k => groups.push(map[k]));
    return groups;
  }

  // =======================
  // 要素取得
  // =======================

  const carryPotionsBox = document.getElementById("carryPotionsList");
  const carryFoodsBox   = document.getElementById("carryFoodsList");
  const carryDrinksBox  = document.getElementById("carryDrinksList");
  const carryWeaponsBox = document.getElementById("carryWeaponsList");
  const carryArmorsBox  = document.getElementById("carryArmorsList");
  const carryToolsBox   = document.getElementById("carryToolsList");

  const equippedWeaponBox = document.getElementById("equippedWeaponSlot");
  const equippedArmorBox  = document.getElementById("equippedArmorSlot");

  // =======================
  // 装備欄の描画
  // =======================

  if (equippedWeaponBox) {
    equippedWeaponBox.innerHTML = "";
    let label = "武器：なし";
    let hasEquipped = false;

    if (typeof window.equippedWeaponIndex === "number" &&
        Array.isArray(window.weaponInstances)) {
      const inst = window.weaponInstances[window.equippedWeaponIndex];
      if (inst) {
        label = "武器：" + buildWeaponLabelFromInstance(inst);
        hasEquipped = true;
      }
    } else if (window.equippedWeaponId) {
      label = "武器：" + getWeaponName(window.equippedWeaponId);
      hasEquipped = true;
    }

    const row = createSingleRow(label, hasEquipped ? [
      {
        label: "外す",
        onClick: () => {
          if (typeof equipWeaponFromCarry === "function" &&
              typeof window.equippedWeaponIndex === "number" &&
              Array.isArray(window.weaponInstances)) {
            const idx = window.equippedWeaponIndex;
            const inst = window.weaponInstances[idx];
            if (inst) {
              // 装備解除は倉庫に戻す（元仕様維持）
              inst.location = "warehouse";
            }
            window.equippedWeaponIndex = null;
            window.equippedWeaponId = null;
            if (typeof recalcStats === "function") recalcStats();
            if (typeof syncEquipmentCountsFromInstances === "function") {
              syncEquipmentCountsFromInstances();
            }
            refreshWarehouseUI();
          } else if (window.equippedWeaponId) {
            window.equippedWeaponId = null;
            if (typeof recalcStats === "function") recalcStats();
            refreshWarehouseUI();
          }
        }
      }
    ] : []);
    equippedWeaponBox.appendChild(row);
  }

  if (equippedArmorBox) {
    equippedArmorBox.innerHTML = "";
    let label = "防具：なし";
    let hasEquipped = false;

    if (typeof window.equippedArmorIndex === "number" &&
        Array.isArray(window.armorInstances)) {
      const inst = window.armorInstances[window.equippedArmorIndex];
      if (inst) {
        label = "防具：" + buildArmorLabelFromInstance(inst);
        hasEquipped = true;
      }
    } else if (window.equippedArmorId) {
      label = "防具：" + getArmorName(window.equippedArmorId);
      hasEquipped = true;
    }

    const row = createSingleRow(label, hasEquipped ? [
      {
        label: "外す",
        onClick: () => {
          if (typeof equipArmorFromCarry === "function" &&
              typeof window.equippedArmorIndex === "number" &&
              Array.isArray(window.armorInstances)) {
            const idx = window.equippedArmorIndex;
            const inst = window.armorInstances[idx];
            if (inst) {
              inst.location = "carry";
            }
            window.equippedArmorIndex = null;
            window.equippedArmorId = null;
            if (typeof recalcStats === "function") recalcStats();
            if (typeof syncEquipmentCountsFromInstances === "function") {
              syncEquipmentCountsFromInstances();
            }
            refreshWarehouseUI();
          } else if (window.equippedArmorId) {
            window.equippedArmorId = null;
            if (typeof recalcStats === "function") recalcStats();
            refreshWarehouseUI();
          }
        }
      }
    ] : []);
    equippedArmorBox.appendChild(row);
  }

  // =======================
  // 手持ち側の描画
  // =======================

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

  // 手持ち武器（location==="carry" グループ）
  if (carryWeaponsBox) {
    carryWeaponsBox.innerHTML = "";
    const groups = buildWeaponGroups("carry");
    groups.forEach(group => {
      const dummyInst = {
        id: group.id,
        quality: group.quality,
        enhance: group.enhance,
        durability: group.durability
      };
      const label = buildWeaponLabelFromInstance(dummyInst);
      const row = createRow(label, group.count, [
        {
          label: "装備",
          onClick: () => {
            if (Array.isArray(window.weaponInstances) &&
                typeof window.equippedWeaponIndex === "number") {
              // 既に何か装備中なら、それを carry に戻す
              const curIdx = window.equippedWeaponIndex;
              const curInst = window.weaponInstances[curIdx];
              if (curInst) {
                curInst.location = "carry";
              }
            }

            // このグループから1本を装備
            if (Array.isArray(window.weaponInstances) &&
                group.instanceIndexes &&
                group.instanceIndexes.length > 0) {
              const instIndex = group.instanceIndexes[0];
              const inst = window.weaponInstances[instIndex];
              if (inst) {
                inst.location = "equipped";
                window.equippedWeaponIndex = instIndex;
                window.equippedWeaponId = inst.id;
              }
            } else if (typeof equipWeaponFromCarry === "function") {
              // 旧仕様フォールバック
              equipWeaponFromCarry(group.id);
            } else if (typeof equipWeapon === "function") {
              window.equippedWeaponId = group.id;
              if (typeof appendLog === "function") appendLog("武器を装備した");
              if (typeof updateDisplay === "function") updateDisplay();
            }

            if (typeof recalcStats === "function") recalcStats();
            if (typeof syncEquipmentCountsFromInstances === "function") {
              syncEquipmentCountsFromInstances();
            }
            refreshWarehouseUI();
          }
        },
        {
          label: "↓倉庫へ",
          onClick: () => {
            if (moveWeaponToWarehouse(group.id, 1)) {
              refreshWarehouseUI();
            }
          }
        }
      ]);
      carryWeaponsBox.appendChild(row);
    });
  }

  // 手持ち防具（location==="carry" グループ）
  if (carryArmorsBox) {
    carryArmorsBox.innerHTML = "";
    const groups = buildArmorGroups("carry");
    groups.forEach(group => {
      const dummyInst = {
        id: group.id,
        quality: group.quality,
        enhance: group.enhance,
        durability: group.durability
      };
      const label = buildArmorLabelFromInstance(dummyInst);
      const row = createRow(label, group.count, [
        {
          label: "装備",
          onClick: () => {
            if (Array.isArray(window.armorInstances) &&
                typeof window.equippedArmorIndex === "number") {
              const curIdx = window.equippedArmorIndex;
              const curInst = window.armorInstances[curIdx];
              if (curInst) {
                curInst.location = "carry";
              }
            }

            if (Array.isArray(window.armorInstances) &&
                group.instanceIndexes &&
                group.instanceIndexes.length > 0) {
              const instIndex = group.instanceIndexes[0];
              const inst = window.armorInstances[instIndex];
              if (inst) {
                inst.location = "equipped";
                window.equippedArmorIndex = instIndex;
                window.equippedArmorId = inst.id;
              }
            } else if (typeof equipArmorFromCarry === "function") {
              equipArmorFromCarry(group.id);
            } else if (typeof equipArmor === "function") {
              window.equippedArmorId = group.id;
              if (typeof appendLog === "function") appendLog("防具を装備した");
              if (typeof updateDisplay === "function") updateDisplay();
            }

            if (typeof recalcStats === "function") recalcStats();
            if (typeof syncEquipmentCountsFromInstances === "function") {
              syncEquipmentCountsFromInstances();
            }
            refreshWarehouseUI();
          }
        },
        {
          label: "↓倉庫へ",
          onClick: () => {
            if (moveArmorToWarehouse(group.id, 1)) {
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
      const name = getToolName(id);
      const row = createRow(name, cnt, [
        {
          label: "↓倉庫へ",
          onClick: () => {
            if (moveToolToWarehouse(id, 1)) {
              refreshWarehouseUI();
            }
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
          label: "食べる",
          onClick: () => {
            if (typeof consumeFoodFromWarehouse === "function") {
              consumeFoodFromWarehouse(id);
              refreshWarehouseUI();
            }
          }
        },
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
          label: "飲む",
          onClick: () => {
            if (typeof consumeDrinkFromWarehouse === "function") {
              consumeDrinkFromWarehouse(id);
              refreshWarehouseUI();
            }
          }
        },
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

  // 倉庫武器（location==="warehouse" グループ）
  if (whWeaponsBox) {
    whWeaponsBox.innerHTML = "";
    const groups = buildWeaponGroups("warehouse");
    groups.forEach(group => {
      const dummyInst = {
        id: group.id,
        quality: group.quality,
        enhance: group.enhance,
        durability: group.durability
      };
      const label = buildWeaponLabelFromInstance(dummyInst);
      const row = createRow(label, group.count, [
        {
          label: "装備",
          onClick: () => {
            // 倉庫から直接装備：一対一交換
            if (Array.isArray(window.weaponInstances)) {
              // 既に装備中の武器は倉庫に戻す
              if (typeof window.equippedWeaponIndex === "number") {
                const curIdx = window.equippedWeaponIndex;
                const curInst = window.weaponInstances[curIdx];
                if (curInst) {
                  curInst.location = "warehouse";
                }
              }
              // このグループから1本を装備
              if (group.instanceIndexes && group.instanceIndexes.length > 0) {
                const instIndex = group.instanceIndexes[0];
                const inst = window.weaponInstances[instIndex];
                if (inst) {
                  inst.location = "equipped";
                  window.equippedWeaponIndex = instIndex;
                  window.equippedWeaponId = inst.id;
                }
              }
              if (typeof recalcStats === "function") recalcStats();
              if (typeof syncEquipmentCountsFromInstances === "function") {
                syncEquipmentCountsFromInstances();
              }
            } else if (typeof equipWeaponFromWarehouse === "function") {
              equipWeaponFromWarehouse(group.id);
            }
            refreshWarehouseUI();
          }
        },
        {
          label: "↑手持ちへ",
          onClick: () => {
            if (moveWeaponToCarry(group.id, 1)) {
              refreshWarehouseUI();
            }
          }
        }
      ]);
      whWeaponsBox.appendChild(row);
    });
  }

  // 倉庫防具（location==="warehouse" グループ）
  if (whArmorsBox) {
    whArmorsBox.innerHTML = "";
    const groups = buildArmorGroups("warehouse");
    groups.forEach(group => {
      const dummyInst = {
        id: group.id,
        quality: group.quality,
        enhance: group.enhance,
        durability: group.durability
      };
      const label = buildArmorLabelFromInstance(dummyInst);
      const row = createRow(label, group.count, [
        {
          label: "装備",
          onClick: () => {
            if (Array.isArray(window.armorInstances)) {
              if (typeof window.equippedArmorIndex === "number") {
                const curIdx = window.equippedArmorIndex;
                const curInst = window.armorInstances[curIdx];
                if (curInst) {
                  curInst.location = "warehouse";
                }
              }
              if (group.instanceIndexes && group.instanceIndexes.length > 0) {
                const instIndex = group.instanceIndexes[0];
                const inst = window.armorInstances[instIndex];
                if (inst) {
                  inst.location = "equipped";
                  window.equippedArmorIndex = instIndex;
                  window.equippedArmorId = inst.id;
                }
              }
              if (typeof recalcStats === "function") recalcStats();
              if (typeof syncEquipmentCountsFromInstances === "function") {
                syncEquipmentCountsFromInstances();
              }
            } else if (typeof equipArmorFromWarehouse === "function") {
              equipArmorFromWarehouse(group.id);
            }
            refreshWarehouseUI();
          }
        },
        {
          label: "↑手持ちへ",
          onClick: () => {
            if (moveArmorToCarry(group.id, 1)) {
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
    if (typeof toolCounts === "object") {
      Object.keys(toolCounts).forEach(id => {
        const cnt = toolCounts[id] || 0;
        if (cnt <= 0) return;
        const name = getToolName(id);
        const row = createRow(name, cnt, [
          {
            label: "↑手持ちへ",
            onClick: () => {
              if (moveToolToCarry(id, 1)) {
                refreshWarehouseUI();
              }
            }
          }
        ]);
        whToolsBox.appendChild(row);
      });
    }
  }
}

// =======================
// 倉庫から直接食べる／飲む
// =======================

function consumeFoodFromWarehouse(id) {
  if (window.isExploring || window.currentEnemy) {
    if (typeof appendLog === "function") {
      appendLog("探索中は倉庫から食事できない！");
    }
    return;
  }
  if (!window.cookedFoods || !window.cookedFoods[id]) {
    return;
  }

  const recipe = (typeof COOKING_RECIPES !== "undefined" && COOKING_RECIPES.food)
    ? COOKING_RECIPES.food.find(r => r.id === id)
    : null;
  if (!recipe || !recipe.effect) return;

  if (typeof applyFoodEffect === "function") {
    applyFoodEffect(recipe.effect, id);
  }

  window.cookedFoods[id] = Math.max(0, (window.cookedFoods[id] || 0) - 1);

  if (typeof appendLog === "function") {
    appendLog(`${recipe.name} を食べた！`);
  }
}

function consumeDrinkFromWarehouse(id) {
  if (window.isExploring || window.currentEnemy) {
    if (typeof appendLog === "function") {
      appendLog("探索中は倉庫から飲み物を飲めない！");
    }
    return;
  }
  if (!window.cookedDrinks || !window.cookedDrinks[id]) {
    return;
  }

  const recipe = (typeof COOKING_RECIPES !== "undefined" && COOKING_RECIPES.drink)
    ? COOKING_RECIPES.drink.find(r => r.id === id)
    : null;
  if (!recipe || !recipe.effect) return;

  if (typeof applyDrinkEffect === "function") {
    applyDrinkEffect(recipe.effect, id);
  }

  window.cookedDrinks[id] = Math.max(0, (window.cookedDrinks[id] || 0) - 1);

  if (typeof appendLog === "function") {
    appendLog(`${recipe.name} を飲んだ！`);
  }
}

// =======================
// 戦闘スキル＋ショップ＋倉庫サブタブなど init
// =======================

function initBattleAndShopUI() {
  if (typeof refreshEquipSelects === "function") {
    refreshEquipSelects();
  }

  const foodSelect   = document.getElementById("foodSelect");
  const drinkSelect  = document.getElementById("drinkSelect");
  const foodBtn      = document.getElementById("craftFoodBtn");
  const drinkBtn     = document.getElementById("craftDrinkBtn");

  if (foodSelect) {
    foodSelect.addEventListener("change", e => {
      const id = e.target.value;
      window.lastCraftCategory = "cookingFood";
      window.lastCookingKind = "food";
      window.lastCookingId = id;
      if (typeof updateCraftCostInfo === "function" && id) {
        updateCraftCostInfo("cookingFood", id);
      }
    });
  }

  if (drinkSelect) {
    drinkSelect.addEventListener("change", e => {
      const id = e.target.value;
      window.lastCraftCategory = "cookingDrink";
      window.lastCookingKind = "drink";
      window.lastCookingId = id;
      if (typeof updateCraftCostInfo === "function" && id) {
        updateCraftCostInfo("cookingDrink", id);
      }
    });
  }

  if (foodBtn && typeof craftFood === "function") {
    foodBtn.addEventListener("click", () => {
      window.lastCraftCategory = "cookingFood";
      const id = foodSelect?.value;
      window.lastCookingKind = "food";
      window.lastCookingId = id;
      craftFood();
      if (typeof updateCraftCostInfo === "function" && id) {
        updateCraftCostInfo("cookingFood", id);
      }
    });
  }

  if (drinkBtn && typeof craftDrink === "function") {
    drinkBtn.addEventListener("click", () => {
      window.lastCraftCategory = "cookingDrink";
      const id = drinkSelect?.value;
      window.lastCookingKind = "drink";
      window.lastCookingId = id;
      craftDrink();
      if (typeof updateCraftCostInfo === "function" && id) {
        updateCraftCostInfo("cookingDrink", id);
      }
    });
  }

  const costInfo = document.getElementById("craftCostInfo");
  if (costInfo && typeof updateCraftCostInfo === "function") {
    if (window.lastCraftCategory === "cookingFood" && foodSelect && foodSelect.value) {
      window.lastCookingKind = "food";
      window.lastCookingId = foodSelect.value;
      updateCraftCostInfo("cookingFood", foodSelect.value);
    } else if (window.lastCraftCategory === "cookingDrink" && drinkSelect && drinkSelect.value) {
      window.lastCookingKind = "drink";
      window.lastCookingId = drinkSelect.value;
      updateCraftCostInfo("cookingDrink", drinkSelect.value);
    }
  }

  const castMagicBtn = document.getElementById("castMagicBtn");
  if (castMagicBtn && typeof castSelectedMagic === "function") {
    castMagicBtn.addEventListener("click", () => {
      castSelectedMagic();
    });
  }

  const useSkillBtn = document.getElementById("useSkillBtn");
  if (useSkillBtn && typeof useSelectedSkill === "function") {
    useSkillBtn.addEventListener("click", () => {
      useSelectedSkill();
    });
  }

  if (typeof initShop === "function") {
    initShop();
  }

  const shopHealHP = document.getElementById("shopHealHP");
  if (shopHealHP) {
    shopHealHP.addEventListener("click", () => {
      if (window.isExploring || window.currentEnemy) {
        appendLog("探索中は宿屋を利用できない！");
        return;
      }
      const price = 80;
      if (money < price) {
        appendLog("お金が足りない（宿屋 80G）");
        return;
      }
      money -= price;
      hp = hpMax;
      appendLog("宿屋で休んだ。HPが全回復した。");
      if (typeof updateDisplay === "function") updateDisplay();
    });
  }

  // 倉庫タブ内のサブタブ（アイテム / 素材）
  (function () {
    const tabItems      = document.getElementById("warehouseTabItems");
    const tabMaterials  = document.getElementById("warehouseTabMaterials");
    const pageItems     = document.getElementById("warehousePageItems");
    const pageMaterials = document.getElementById("warehousePageMaterials");

    if (!tabItems || !tabMaterials || !pageItems || !pageMaterials) {
      return;
    }

    function setWarehouseSubPage(key) {
      if (key === "items") {
        pageItems.style.display     = "";
        pageMaterials.style.display = "none";
        tabItems.classList.add("active");
        tabMaterials.classList.remove("active");
      } else {
        pageItems.style.display     = "none";
        pageMaterials.style.display = "";
        tabItems.classList.remove("active");
        tabMaterials.classList.add("active");
      }
    }

    tabItems.addEventListener("click", () => setWarehouseSubPage("items"));
    tabMaterials.addEventListener("click", () => setWarehouseSubPage("materials"));

    setWarehouseSubPage("items");
  })();
}