// inventory-core.js
// 倉庫・手持ちインベントリ管理

// =======================
// 手持ち上限
// =======================

const CARRY_LIMIT = {
  potions: 10,   // 全ポーション合計本数
  foods:   3,    // 食べ物合計数
  drinks:  3,    // 飲み物合計数
  weapons: 2,    // 手持ち武器本数（装備中は含めない）
  armors:  2,    // 手持ち防具枚数（装備中は含めない）
  tools:   3     // 手持ち道具数（爆弾など）
};

// =======================
// 手持ちインベントリ構造
// =======================

window.carryPotions = window.carryPotions || {}; // { potionId: count }
window.carryFoods   = window.carryFoods   || {}; // { foodId:   count }
window.carryDrinks  = window.carryDrinks  || {}; // { drinkId:  count }

// ★武器・防具はインスタンスベース管理に変更するため、
// carryWeapons / carryArmors は「インスタンス由来の本数カウント」だけを持つ。
// UI やロジックの主データは weaponInstances / armorInstances(location) を使う。
window.carryWeapons = window.carryWeapons || {}; // { weaponId: count } ※インスタンスから同期される表示用
window.carryArmors  = window.carryArmors  || {}; // { armorId:  count } ※インスタンスから同期される表示用

window.carryTools   = window.carryTools   || {}; // { toolId:   count }

const carryPotions = window.carryPotions;
const carryFoods   = window.carryFoods;
const carryDrinks  = window.carryDrinks;
const carryWeapons = window.carryWeapons;
const carryArmors  = window.carryArmors;
const carryTools   = window.carryTools;

// =======================
// 倉庫側道具インベントリ構造
// =======================

window.toolCounts = window.toolCounts || {}; // { toolId: count }
const toolCounts  = window.toolCounts;

// =======================
// 合計数ヘルパー
// =======================

function getCarryTotal(obj) {
  return Object.values(obj).reduce((a, b) => a + (b || 0), 0);
}

// 武器/防具の「手持ち総数」ヘルパ（装備中は含めない）
function getWeaponOnHandTotal() {
  // インスタンスの location==="carry" を数える
  if (!Array.isArray(window.weaponInstances)) {
    // 旧仕様セーブ対応：従来どおり carryWeapons を見る
    return getCarryTotal(carryWeapons);
  }
  let total = 0;
  window.weaponInstances.forEach(inst => {
    if (!inst || !inst.id) return;
    const loc = inst.location || "warehouse";
    if (loc === "carry") total++;
  });
  return total;
}

function getArmorOnHandTotal() {
  if (!Array.isArray(window.armorInstances)) {
    return getCarryTotal(carryArmors);
  }
  let total = 0;
  window.armorInstances.forEach(inst => {
    if (!inst || !inst.id) return;
    const loc = inst.location || "warehouse";
    if (loc === "carry") total++;
  });
  return total;
}

// =======================
// 倉庫＝既存データの扱い
// =======================

window.cookedFoods  = window.cookedFoods  || {}; // { foodId:  count }
window.cookedDrinks = window.cookedDrinks || {}; // { drinkId: count }

const cookedFoods  = window.cookedFoods;
const cookedDrinks = window.cookedDrinks;

// =======================
// 汎用アイテム追加（クラフト・ドロップ用）
// =======================

const COOKING_DRINK_IDS = (typeof COOKING_RECIPES !== "undefined" &&
                           COOKING_RECIPES &&
                           Array.isArray(COOKING_RECIPES.drink))
  ? COOKING_RECIPES.drink.map(r => r.id)
  : [];

const COOKING_FOOD_IDS = (typeof COOKING_RECIPES !== "undefined" &&
                          COOKING_RECIPES &&
                          Array.isArray(COOKING_RECIPES.food))
  ? COOKING_RECIPES.food.map(r => r.id)
  : [];

// weaponCounts / armorCounts / carryWeapons / carryArmors を
// インスタンス配列から再計算して同期するヘルパ
function syncEquipmentCountsFromInstances() {
  // 武器
  if (Array.isArray(window.weaponInstances)) {
    const newWarehouseCounts = {};
    const newCarryCounts     = {};

    window.weaponInstances.forEach(inst => {
      if (!inst || !inst.id) return;
      const loc = inst.location || "warehouse";
      if (loc === "warehouse") {
        newWarehouseCounts[inst.id] = (newWarehouseCounts[inst.id] || 0) + 1;
      } else if (loc === "carry") {
        newCarryCounts[inst.id] = (newCarryCounts[inst.id] || 0) + 1;
      }
      // loc==="equipped" はどちらのカウントにも含めない
    });

    if (typeof window.weaponCounts === "object") {
      Object.keys(window.weaponCounts).forEach(k => delete window.weaponCounts[k]);
      Object.keys(newWarehouseCounts).forEach(k => {
        window.weaponCounts[k] = newWarehouseCounts[k];
      });
    }

    Object.keys(carryWeapons).forEach(k => delete carryWeapons[k]);
    Object.keys(newCarryCounts).forEach(k => {
      carryWeapons[k] = newCarryCounts[k];
    });
  }

  // 防具
  if (Array.isArray(window.armorInstances)) {
    const newWarehouseCounts = {};
    const newCarryCounts     = {};

    window.armorInstances.forEach(inst => {
      if (!inst || !inst.id) return;
      const loc = inst.location || "warehouse";
      if (loc === "warehouse") {
        newWarehouseCounts[inst.id] = (newWarehouseCounts[inst.id] || 0) + 1;
      } else if (loc === "carry") {
        newCarryCounts[inst.id] = (newCarryCounts[inst.id] || 0) + 1;
      }
    });

    if (typeof window.armorCounts === "object") {
      Object.keys(window.armorCounts).forEach(k => delete window.armorCounts[k]);
      Object.keys(newWarehouseCounts).forEach(k => {
        window.armorCounts[k] = newWarehouseCounts[k];
      });
    }

    Object.keys(carryArmors).forEach(k => delete carryArmors[k]);
    Object.keys(newCarryCounts).forEach(k => {
      carryArmors[k] = newCarryCounts[k];
    });
  }
}

// クラフト結果や将来のドロップを倉庫側に入れる
function addItemToInventory(itemId, amount) {
  amount = Math.max(1, amount | 0);

  // 1. 料理（飲み物）
  if (COOKING_DRINK_IDS.includes(itemId)) {
    window.cookedDrinks[itemId] = (window.cookedDrinks[itemId] || 0) + amount;
    return;
  }

  // 2. 料理（食べ物）
  if (COOKING_FOOD_IDS.includes(itemId)) {
    window.cookedFoods[itemId] = (window.cookedFoods[itemId] || 0) + amount;
    return;
  }

  // 3. ポーション
  if (typeof potionCounts !== "undefined" && Array.isArray(potions)) {
    const p = potions.find(x => x.id === itemId);
    if (p) {
      potionCounts[itemId] = (potionCounts[itemId] || 0) + amount;
      return;
    }
  }

  // 4. 武器（インスタンス生成＋倉庫 location で追加）
  if (typeof weaponCounts !== "undefined" && Array.isArray(weapons)) {
    const w = weapons.find(x => x.id === itemId);
    if (w) {
      weaponCounts[itemId] = (weaponCounts[itemId] || 0) + amount;
      if (typeof MAX_DURABILITY !== "undefined") {
        const baseEnh = w.enhance || 0;
        if (!Array.isArray(window.weaponInstances)) {
          window.weaponInstances = [];
        }
        for (let i = 0; i < amount; i++) {
          window.weaponInstances.push({
            id: itemId,
            quality: 0,
            enhance: baseEnh,
            durability: MAX_DURABILITY,
            location: "warehouse"
          });
        }
      }
      return;
    }
  }

  // 5. 防具
  if (typeof armorCounts !== "undefined" && Array.isArray(armors)) {
    const a = armors.find(x => x.id === itemId);
    if (a) {
      armorCounts[itemId] = (armorCounts[itemId] || 0) + amount;
      if (typeof MAX_DURABILITY !== "undefined") {
        const baseEnh = a.enhance || 0;
        if (!Array.isArray(window.armorInstances)) {
          window.armorInstances = [];
        }
        for (let i = 0; i < amount; i++) {
          window.armorInstances.push({
            id: itemId,
            quality: 0,
            enhance: baseEnh,
            durability: MAX_DURABILITY,
            location: "warehouse"
          });
        }
      }
      return;
    }
  }

  // 6. 道具
  if (typeof toolCounts !== "undefined" &&
      typeof TOOLS_INIT !== "undefined" &&
      Array.isArray(TOOLS_INIT)) {
    const t = TOOLS_INIT.find(x => x.id === itemId);
    if (t) {
      toolCounts[itemId] = (toolCounts[itemId] || 0) + amount;
      return;
    }
  }

  // 7. 未分類
  if (typeof appendLog === "function") {
    appendLog(`addItemToInventory: 未対応ID ${itemId} に${amount}追加しようとしました`);
  }
}

// =======================
// 手持ち←→倉庫 移動ロジック
// =======================

function movePotionToCarry(id, amount) {
  amount = Math.max(1, amount | 0);
  const have = potionCounts[id] || 0;
  if (have < amount) {
    appendLog("倉庫にそのポーションが足りない");
    return false;
  }
  const totalCarry = getCarryTotal(carryPotions);
  if (totalCarry + amount > CARRY_LIMIT.potions) {
    appendLog("これ以上ポーションを持ち歩けない（上限10本）");
    return false;
  }
  potionCounts[id] -= amount;
  carryPotions[id] = (carryPotions[id] || 0) + amount;
  return true;
}

function movePotionToWarehouse(id, amount) {
  amount = Math.max(1, amount | 0);
  const have = carryPotions[id] || 0;
  if (have < amount) {
    appendLog("手持ちのそのポーションが足りない");
    return false;
  }
  carryPotions[id] -= amount;
  if (carryPotions[id] <= 0) delete carryPotions[id];
  potionCounts[id] = (potionCounts[id] || 0) + amount;
  return true;
}

// 料理（食べ物）
function moveFoodToCarry(id, amount) {
  amount = Math.max(1, amount | 0);
  const have = cookedFoods[id] || 0;
  if (have < amount) {
    appendLog("倉庫にその料理が足りない");
    return false;
  }
  const totalCarry = getCarryTotal(carryFoods);
  if (totalCarry + amount > CARRY_LIMIT.foods) {
    appendLog("これ以上食べ物を持ち歩けない（上限3品）");
    return false;
  }
  cookedFoods[id] -= amount;
  carryFoods[id] = (carryFoods[id] || 0) + amount;
  return true;
}

function moveFoodToWarehouse(id, amount) {
  amount = Math.max(1, amount | 0);
  const have = carryFoods[id] || 0;
  if (have < amount) {
    appendLog("手持ちのその料理が足りない");
    return false;
  }
  carryFoods[id] -= amount;
  if (carryFoods[id] <= 0) delete carryFoods[id];
  cookedFoods[id] = (cookedFoods[id] || 0) + amount;
  return true;
}

// 料理（飲み物）
function moveDrinkToCarry(id, amount) {
  amount = Math.max(1, amount | 0);
  const have = cookedDrinks[id] || 0;
  if (have < amount) {
    appendLog("倉庫にその飲み物が足りない");
    return false;
  }
  const totalCarry = getCarryTotal(carryDrinks);
  if (totalCarry + amount > CARRY_LIMIT.drinks) {
    appendLog("これ以上飲み物を持ち歩けない（上限3杯）");
    return false;
  }
  cookedDrinks[id] -= amount;
  carryDrinks[id] = (carryDrinks[id] || 0) + amount;
  return true;
}

function moveDrinkToWarehouse(id, amount) {
  amount = Math.max(1, amount | 0);
  const have = carryDrinks[id] || 0;
  if (have < amount) {
    appendLog("手持ちのその飲み物が足りない");
    return false;
  }
  carryDrinks[id] -= amount;
  if (carryDrinks[id] <= 0) delete carryDrinks[id];
  cookedDrinks[id] = (cookedDrinks[id] || 0) + amount;
  return true;
}

// 武器（インスタンス＋location対応）
function moveWeaponToCarry(id, amount) {
  amount = Math.max(1, amount | 0);

  // counts / carry をインスタンスから同期
  syncEquipmentCountsFromInstances();

  const have = weaponCounts[id] || 0;
  if (have < amount) {
    appendLog("倉庫にその武器が足りない");
    return false;
  }

  const totalOnHand = getWeaponOnHandTotal();
  if (totalOnHand + amount > CARRY_LIMIT.weapons) {
    appendLog("これ以上武器を持ち歩けない（上限2本）");
    return false;
  }

  let moved = 0;
  if (Array.isArray(window.weaponInstances)) {
    let remaining = amount;
    for (let i = 0; i < window.weaponInstances.length && remaining > 0; i++) {
      const inst = window.weaponInstances[i];
      if (!inst || inst.id !== id) continue;
      const loc = inst.location || "warehouse";
      if (loc !== "warehouse") continue;
      inst.location = "carry";
      remaining--;
      moved++;
    }
    if (remaining > 0) {
      appendLog(`警告: 武器インスタンス数と倉庫カウントが一致していません（id=${id}, amount=${amount}）`);
      // 安全のためロールバック
      for (let i = 0; i < window.weaponInstances.length; i++) {
        const inst = window.weaponInstances[i];
        if (!inst || inst.id !== id) continue;
        if (inst.location === "carry") {
          inst.location = "warehouse";
        }
      }
      return false;
    }
  } else {
    // インスタンスがない旧仕様セーブへのフォールバック
    moved = amount;
  }

  // インスタンスの location を更新したのでカウントを同期
  syncEquipmentCountsFromInstances();
  return true;
}

function moveWeaponToWarehouse(id, amount) {
  amount = Math.max(1, amount | 0);

  // 最新状態に同期
  syncEquipmentCountsFromInstances();

  const have = carryWeapons[id] || 0;
  if (have < amount) {
    appendLog("手持ちのその武器が足りない");
    return false;
  }

  let moved = 0;

  if (Array.isArray(window.weaponInstances)) {
    let remaining = amount;
    for (let i = 0; i < window.weaponInstances.length && remaining > 0; i++) {
      const inst = window.weaponInstances[i];
      if (!inst || inst.id !== id) continue;
      const loc = inst.location || "warehouse";
      if (loc !== "carry" && loc !== "equipped") continue;

      // 装備中のものを倉庫に戻す場合は装備解除する
      if (loc === "equipped") {
        if (typeof window.equippedWeaponIndex === "number" &&
            window.equippedWeaponIndex === i) {
          window.equippedWeaponIndex = null;
          window.equippedWeaponId = null;
        }
      }

      inst.location = "warehouse";
      remaining--;
      moved++;
    }
    if (remaining > 0) {
      appendLog(`警告: 武器インスタンス数と手持ちカウントが一致していません（id=${id}, amount=${amount}）`);
      if (moved === 0) return false;
    }
  } else {
    // 非インスタンス版：装備中かつ同じIDなら解除
    if (window.equippedWeaponId === id) {
      window.equippedWeaponId = null;
    }
    moved = amount;
  }

  // location 更新後にカウント同期
  syncEquipmentCountsFromInstances();

  if (typeof recalcStats === "function") {
    recalcStats();
  }

  return true;
}

// 防具（インスタンス＋location対応）
function moveArmorToCarry(id, amount) {
  amount = Math.max(1, amount | 0);

  syncEquipmentCountsFromInstances();

  const have = armorCounts[id] || 0;
  if (have < amount) {
    appendLog("倉庫にその防具が足りない");
    return false;
  }

  const totalOnHand = getArmorOnHandTotal();
  if (totalOnHand + amount > CARRY_LIMIT.armors) {
    appendLog("これ以上防具を持ち歩けない（上限2着）");
    return false;
  }

  let moved = 0;
  if (Array.isArray(window.armorInstances)) {
    let remaining = amount;
    for (let i = 0; i < window.armorInstances.length && remaining > 0; i++) {
      const inst = window.armorInstances[i];
      if (!inst || inst.id !== id) continue;
      const loc = inst.location || "warehouse";
      if (loc !== "warehouse") continue;
      inst.location = "carry";
      remaining--;
      moved++;
    }
    if (remaining > 0) {
      appendLog(`警告: 防具インスタンス数と倉庫カウントが一致していません（id=${id}, amount=${amount}）`);
      for (let i = 0; i < window.armorInstances.length; i++) {
        const inst = window.armorInstances[i];
        if (!inst || inst.id !== id) continue;
        if (inst.location === "carry") {
          inst.location = "warehouse";
        }
      }
      return false;
    }
  } else {
    moved = amount;
  }

  syncEquipmentCountsFromInstances();
  return true;
}

function moveArmorToWarehouse(id, amount) {
  amount = Math.max(1, amount | 0);

  syncEquipmentCountsFromInstances();

  const have = carryArmors[id] || 0;
  if (have < amount) {
    appendLog("手持ちのその防具が足りない");
    return false;
  }

  let moved = 0;
  if (Array.isArray(window.armorInstances)) {
    let remaining = amount;
    for (let i = 0; i < window.armorInstances.length && remaining > 0; i++) {
      const inst = window.armorInstances[i];
      if (!inst || inst.id !== id) continue;
      const loc = inst.location || "warehouse";
      if (loc !== "carry" && loc !== "equipped") continue;

      // 装備中のものを倉庫に戻す場合は装備解除する
      if (loc === "equipped") {
        if (typeof window.equippedArmorIndex === "number" &&
            window.equippedArmorIndex === i) {
          window.equippedArmorIndex = null;
          window.equippedArmorId = null;
        }
      }

      inst.location = "warehouse";
      remaining--;
      moved++;
    }
    if (remaining > 0) {
      appendLog(`警告: 防具インスタンス数と手持ちカウントが一致していません（id=${id}, amount=${amount}）`);
      if (moved === 0) return false;
    }
  } else {
    if (window.equippedArmorId === id) {
      window.equippedArmorId = null;
    }
    moved = amount;
  }

  syncEquipmentCountsFromInstances();

  if (typeof recalcStats === "function") {
    recalcStats();
  }

  return true;
}

// 道具（爆弾など）
function moveToolToCarry(id, amount) {
  amount = Math.max(1, amount | 0);
  const have = toolCounts[id] || 0;
  if (have < amount) {
    appendLog("倉庫にその道具が足りない");
    return false;
  }
  const totalCarry = getCarryTotal(carryTools);
  if (totalCarry + amount > CARRY_LIMIT.tools) {
    appendLog("これ以上道具を持ち歩けない（上限3個）");
    return false;
  }
  toolCounts[id] -= amount;
  carryTools[id] = (carryTools[id] || 0) + amount;
  return true;
}

function moveToolToWarehouse(id, amount) {
  amount = Math.max(1, amount | 0);
  const have = carryTools[id] || 0;
  if (have < amount) {
    appendLog("手持ちのその道具が足りない");
    return false;
  }
  carryTools[id] -= amount;
  if (carryTools[id] <= 0) delete carryTools[id];
  toolCounts[id] = (toolCounts[id] || 0) + amount;
  return true;
}

// =======================
// 戦闘アイテムカテゴリ選択の記憶
// =======================

window.lastBattleItemCategory = window.lastBattleItemCategory || "potion"; // "potion" or "tool"
window.lastBattleItemId       = window.lastBattleItemId       || null;

// =======================
// 手持ちインベントリのUI更新フック
// =======================

function refreshCarryPotionSelects() {
  const fieldSel  = document.getElementById("useItemSelect");
  const battleSel = document.getElementById("battleItemSelect");

  function fillField(sel) {
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = "";

    Object.keys(carryPotions).forEach(id => {
      const cnt = carryPotions[id] || 0;
      if (cnt <= 0) return;

      // ★ ITEM_META を優先して名前を取得（fallback は従来どおり）
      let name = id;
      if (typeof getItemName === "function") {
        name = getItemName(id);
      } else if (Array.isArray(potions)) {
        const p = potions.find(x => x.id === id);
        if (p && p.name) name = p.name;
      }

      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${name}（${cnt}）`;
      sel.appendChild(opt);
    });

    if (!sel.options.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "手持ちポーションなし";
      sel.appendChild(opt);
    } else if (prev && Array.from(sel.options).some(o => o.value === prev)) {
      sel.value = prev;
    }
  }

  fillField(fieldSel);

  if (battleSel) {
    refreshBattleItemSelectWithCategory();
  }
}

// 戦闘アイテム用セレクト更新（カテゴリ付き）
function refreshBattleItemSelectWithCategory() {
  const sel = document.getElementById("battleItemSelect");
  if (!sel) return;

  const categorySel = document.getElementById("battleItemCategory");
  const category = categorySel ? (categorySel.value || window.lastBattleItemCategory || "potion")
                               : (window.lastBattleItemCategory || "potion");

  const prevId = window.lastBattleItemId || sel.value || null;

  sel.innerHTML = "";

  if (category === "potion") {
    Object.keys(carryPotions).forEach(id => {
      const cnt = carryPotions[id] || 0;
      if (cnt <= 0) return;

      let name = id;
      if (typeof getItemName === "function") {
        name = getItemName(id);
      } else if (Array.isArray(potions)) {
        const p = potions.find(x => x.id === id);
        if (p && p.name) name = p.name;
      }

      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${name}（${cnt}）`;
      sel.appendChild(opt);
    });

    if (!sel.options.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "手持ちポーションなし";
      sel.appendChild(opt);
    }
  } else if (category === "tool") {
    Object.keys(carryTools).forEach(id => {
      const cnt = carryTools[id] || 0;
      if (cnt <= 0) return;

      // ★ ITEM_META 優先で道具名を取得
      let label = id;
      if (typeof getItemName === "function") {
        label = getItemName(id);
      } else {
        // 旧フォールバック（必要なら TOOLS_INIT 参照に変えることも可能）
        if (id === "bomb") {
          label = "爆弾";
        } else if (id === "bomb_T1") {
          label = "爆弾T1";
        } else if (id === "bomb_T2") {
          label = "爆弾T2";
        } else if (id === "bomb_T3") {
          label = "爆弾T3";
        } else if (id === "bomb_fire_T1") {
          label = "火炎瓶T1";
        } else if (id === "bomb_fire_T2") {
          label = "火炎瓶T2";
        } else if (id === "bomb_fire_T3") {
          label = "火炎瓶T3";
        } else if (id === "molotov_T1") {
          label = "火炎瓶T1";
        } else if (id === "paralyzeGas_T1") {
          label = "麻痺ガス瓶T1";
        } else if (id === "paralyzeGas_T2") {
          label = "麻痺ガス瓶T2";
        } else if (id === "paralyzeGas_T3") {
          label = "麻痺ガス瓶T3";
        } else if (id === "poisonNeedle_T1") {
          label = "毒針T1";
        } else if (id === "poisonNeedle_T2") {
          label = "毒針T2";
        } else if (id === "poisonNeedle_T3") {
          label = "毒針T3";
        }
      }

      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${label}（${cnt}）`;
      sel.appendChild(opt);
    });

    if (!sel.options.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "手持ち道具なし";
      sel.appendChild(opt);
    }
  } else {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "アイテムなし";
    sel.appendChild(opt);
  }

  if (prevId && Array.from(sel.options).some(o => o.value === prevId)) {
    sel.value = prevId;
  } else if (sel.options.length > 0) {
    sel.selectedIndex = 0;
  }

  window.lastBattleItemCategory = category;
  window.lastBattleItemId = sel.value || null;

  if (categorySel) {
    categorySel.value = category;
  }
}

function onBattleItemCategoryChanged() {
  refreshBattleItemSelectWithCategory();
}

// 手持ち料理・飲み物セレクト更新
function refreshCarryFoodDrinkSelects() {
  const foodSel  = document.getElementById("fieldFoodSelect");
  const drinkSel = document.getElementById("fieldDrinkSelect");

  function fillFood(sel) {
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = "";

    Object.keys(carryFoods).forEach(id => {
      const cnt = carryFoods[id] || 0;
      if (cnt <= 0) return;

      let name = id;
      if (typeof getItemName === "function") {
        name = getItemName(id);
      } else if (typeof COOKING_RECIPES !== "undefined" &&
                 COOKING_RECIPES &&
                 Array.isArray(COOKING_RECIPES.food)) {
        const recipe = COOKING_RECIPES.food.find(r => r.id === id);
        if (recipe && recipe.name) name = recipe.name;
      }

      const opt  = document.createElement("option");
      opt.value = id;
      opt.textContent = `${name}（${cnt}）`;
      sel.appendChild(opt);
    });

    if (!sel.options.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "手持ち料理なし";
      sel.appendChild(opt);
    } else if (prev && Array.from(sel.options).some(o => o.value === prev)) {
      sel.value = prev;
    }
  }

  function fillDrink(sel) {
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = "";

    Object.keys(carryDrinks).forEach(id => {
      const cnt = carryDrinks[id] || 0;
      if (cnt <= 0) return;

      let name = id;
      if (typeof getItemName === "function") {
        name = getItemName(id);
      } else if (typeof COOKING_RECIPES !== "undefined" &&
                 COOKING_RECIPES &&
                 Array.isArray(COOKING_RECIPES.drink)) {
        const recipe = COOKING_RECIPES.drink.find(r => r.id === id);
        if (recipe && recipe.name) name = recipe.name;
      }

      const opt  = document.createElement("option");
      opt.value = id;
      opt.textContent = `${name}（${cnt}）`;
      sel.appendChild(opt);
    });

    if (!sel.options.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "手持ち飲み物なし";
      sel.appendChild(opt);
    } else if (prev && Array.from(sel.options).some(o => o.value === prev)) {
      sel.value = prev;
    }
  }

  fillFood(foodSel);
  fillDrink(drinkSel);
}

// =======================
// save-system.js 向けラッパー
// =======================

function refreshBattleItemSelect() {
  if (typeof refreshBattleItemSelectWithCategory === "function") {
    refreshBattleItemSelectWithCategory();
  }
}

function refreshUseItemSelect() {
  if (typeof refreshCarryPotionSelects === "function") {
    refreshCarryPotionSelects();
  }
  if (typeof refreshCarryFoodDrinkSelects === "function") {
    refreshCarryFoodDrinkSelects();
  }
}

// =======================
// ITEM_META 向けストレージ登録
// =======================
//
// item-meta-core.js が読み込まれていて registerStorageImpl が
// 利用可能な場合、storageKind: "inventory" の実装として
// 既存の itemCounts 系を束ねて提供する。
// （将来的に carry/倉庫の切り替えや materials なども分離可能）

if (typeof registerStorageImpl === "function") {
  // 通常インベントリ
  registerStorageImpl("inventory", {
    getCount: function (id) {
      // ポーション（倉庫側）
      if (typeof potionCounts === "object" && potionCounts[id]) {
        return potionCounts[id] || 0;
      }
      // 料理（食べ物・飲み物）
      if (typeof cookedFoods === "object" && cookedFoods[id]) {
        return cookedFoods[id] || 0;
      }
      if (typeof cookedDrinks === "object" && cookedDrinks[id]) {
        return cookedDrinks[id] || 0;
      }
      // 道具
      if (typeof toolCounts === "object" && toolCounts[id]) {
        return toolCounts[id] || 0;
      }
      // 武器・防具は倉庫カウント（インスタンス同期済み前提）
      if (typeof weaponCounts === "object" && weaponCounts[id]) {
        return weaponCounts[id] || 0;
      }
      if (typeof armorCounts === "object" && armorCounts[id]) {
        return armorCounts[id] || 0;
      }
      // 肥料など、itemCounts に居るインベントリアイテム
      if (typeof itemCounts === "object" && itemCounts[id]) {
        return itemCounts[id] || 0;
      }
      return 0;
    },
    add: function (id, amount) {
      amount = amount || 1;
      if (amount <= 0) return;
      // ここでは「どのカテゴリか」を判定せず、汎用 itemCounts に足す。
      // 既存ロジックで個別に管理しているものについては、
      // 必要に応じて addItemToInventory 側から呼ぶ想定。
      window.itemCounts = window.itemCounts || {};
      window.itemCounts[id] = (window.itemCounts[id] || 0) + amount;
    },
    remove: function (id, amount) {
      amount = amount || 1;
      if (amount <= 0) return;
      if (!window.itemCounts || !window.itemCounts[id]) return;
      window.itemCounts[id] -= amount;
      if (window.itemCounts[id] <= 0) {
        delete window.itemCounts[id];
      }
    }
  });

  // 料理素材用ストレージ（storageKind: "cooking"）
  registerStorageImpl("cooking", {
    getCount(id) {
      const mats = window.cookingMats || {};
      return mats[id] || 0;
    },
    add(id, amount) {
      amount = amount | 0;
      if (!amount) return;
      if (!window.cookingMats) window.cookingMats = {};
      const mats = window.cookingMats;
      mats[id] = (mats[id] || 0) + amount;
    },
    remove(id, amount) {
      amount = amount | 0;
      if (!amount) return;
      if (!window.cookingMats) return;
      const mats = window.cookingMats;
      const cur  = mats[id] || 0;
      const next = cur - amount;
      mats[id] = next > 0 ? next : 0;
    }
  });
}