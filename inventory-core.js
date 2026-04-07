// inventory-core.js
// 倉庫・手持ちインベントリ管理

// =======================
// 手持ち上限
// =======================

const CARRY_LIMIT = {
  potions: 10,   // 全ポーション合計本数
  foods:   3,    // 食べ物合計数
  drinks:  3,    // 飲み物合計数
  weapons: 2,    // 手持ち武器本数
  armors:  2,    // 手持ち防具枚数
  tools:   3     // 手持ち道具数（爆弾など）
};

// =======================
// 手持ちインベントリ構造
// =======================
//
// 他ファイルやコンソールから参照できるように window 配下に出す。

window.carryPotions = window.carryPotions || {}; // { potionId: count }
window.carryFoods   = window.carryFoods   || {}; // { foodId:   count }
window.carryDrinks  = window.carryDrinks  || {}; // { drinkId:  count }
window.carryWeapons = window.carryWeapons || {}; // { weaponId: count } // ★ IDごとの本数カウンタ（インスタンスとは別）
window.carryArmors  = window.carryArmors  || {}; // { armorId:  count }
window.carryTools   = window.carryTools   || {}; // { toolId:   count } // 現状は bomb_T1 などを想定

const carryPotions = window.carryPotions;
const carryFoods   = window.carryFoods;
const carryDrinks  = window.carryDrinks;
const carryWeapons = window.carryWeapons;
const carryArmors  = window.carryArmors;
const carryTools   = window.carryTools;

// =======================
// 倉庫側道具インベントリ構造
// =======================
//
// 爆弾などの道具を倉庫で管理するための counts。

window.toolCounts = window.toolCounts || {}; // { toolId: count }
const toolCounts  = window.toolCounts;

// =======================
// 合計数ヘルパー
// =======================

function getCarryTotal(obj) {
  return Object.values(obj).reduce((a, b) => a + (b || 0), 0);
}

// =======================
// 倉庫＝既存データの扱い
// =======================
//
// ・ポーション: potionCounts がそのまま倉庫。
// ・武器/防具: weaponCounts / armorCounts が倉庫。
// ・道具: toolCounts が倉庫。
// ・料理: cook-data.js で新しく cookedFoods / cookedDrinks を導入する前提。

window.cookedFoods  = window.cookedFoods  || {}; // { foodId:  count }
window.cookedDrinks = window.cookedDrinks || {}; // { drinkId: count }

const cookedFoods  = window.cookedFoods;
const cookedDrinks = window.cookedDrinks;

// =======================
// 汎用アイテム追加（クラフト・ドロップ用）
// =======================

// COOKING_RECIPES がまだ読み込まれていないケースでも落ちないようにガード
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

// クラフト結果や将来のドロップを倉庫側に入れる
function addItemToInventory(itemId, amount) {
  amount = Math.max(1, amount | 0);

  // 1. 料理（飲み物） → cookedDrinks
  if (COOKING_DRINK_IDS.includes(itemId)) {
    window.cookedDrinks[itemId] = (window.cookedDrinks[itemId] || 0) + amount;
    return;
  }

  // 2. 料理（食べ物） → cookedFoods
  if (COOKING_FOOD_IDS.includes(itemId)) {
    window.cookedFoods[itemId] = (window.cookedFoods[itemId] || 0) + amount;
    return;
  }

  // 3. ポーション → potionCounts
  if (typeof potionCounts !== "undefined" && Array.isArray(potions)) {
    const p = potions.find(x => x.id === itemId);
    if (p) {
      potionCounts[itemId] = (potionCounts[itemId] || 0) + amount;
      return;
    }
  }

  // 4. 武器 → weaponCounts + weaponInstances（品質・強化・耐久初期値で追加）
  if (typeof weaponCounts !== "undefined" && Array.isArray(weapons)) {
    const w = weapons.find(x => x.id === itemId);
    if (w) {
      // 既存仕様: 倉庫本数カウンタ
      weaponCounts[itemId] = (weaponCounts[itemId] || 0) + amount;
      // 新仕様: インスタンスも追加（品質0, 強化はマスタ基準, 耐久MAX）
      if (Array.isArray(window.weaponInstances) && typeof MAX_DURABILITY !== "undefined") {
        const baseEnh = w.enhance || 0;
        for (let i = 0; i < amount; i++) {
          window.weaponInstances.push({
            id: itemId,
            quality: 0,
            enhance: baseEnh,
            durability: MAX_DURABILITY
          });
        }
      }
      return;
    }
  }

  // 5. 防具 → armorCounts + armorInstances
  if (typeof armorCounts !== "undefined" && Array.isArray(armors)) {
    const a = armors.find(x => x.id === itemId);
    if (a) {
      armorCounts[itemId] = (armorCounts[itemId] || 0) + amount;
      if (Array.isArray(window.armorInstances) && typeof MAX_DURABILITY !== "undefined") {
        const baseEnh = a.enhance || 0;
        for (let i = 0; i < amount; i++) {
          window.armorInstances.push({
            id: itemId,
            quality: 0,
            enhance: baseEnh,
            durability: MAX_DURABILITY
          });
        }
      }
      return;
    }
  }

  // 6. 道具（爆弾など） → toolCounts
  //    bomb_T1 / bomb_T2 / bomb_T3 や "bomb" などを想定
  if (typeof toolCounts !== "undefined" &&
      (itemId === "bomb" || itemId.startsWith("bomb_"))) {
    toolCounts[itemId] = (toolCounts[itemId] || 0) + amount;
    return;
  }

  // 7. その他（未分類）はログだけ
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

// 武器
// ★ ここからは weaponInstances / armorInstances を壊さないように、
//    IDごとの本数カウンタだけを動かす（インスタンスの「持ち歩き状態」は別管理 or 今は区別しない）。
function moveWeaponToCarry(id, amount) {
  amount = Math.max(1, amount | 0);
  const have = weaponCounts[id] || 0;
  if (have < amount) {
    appendLog("倉庫にその武器が足りない");
    return false;
  }
  const totalCarry = getCarryTotal(carryWeapons);
  if (totalCarry + amount > CARRY_LIMIT.weapons) {
    appendLog("これ以上武器を持ち歩けない（上限2本）");
    return false;
  }
  weaponCounts[id] -= amount;
  carryWeapons[id] = (carryWeapons[id] || 0) + amount;
  return true;
}

function moveWeaponToWarehouse(id, amount) {
  amount = Math.max(1, amount | 0);
  const have = carryWeapons[id] || 0;
  if (have < amount) {
    appendLog("手持ちのその武器が足りない");
    return false;
  }
  carryWeapons[id] -= amount;
  if (carryWeapons[id] <= 0) delete carryWeapons[id];
  weaponCounts[id] = (weaponCounts[id] || 0) + amount;
  return true;
}

// 防具
function moveArmorToCarry(id, amount) {
  amount = Math.max(1, amount | 0);
  const have = armorCounts[id] || 0;
  if (have < amount) {
    appendLog("倉庫にその防具が足りない");
    return false;
  }
  const totalCarry = getCarryTotal(carryArmors);
  if (totalCarry + amount > CARRY_LIMIT.armors) {
    appendLog("これ以上防具を持ち歩けない（上限2着）");
    return false;
  }
  armorCounts[id] -= amount;
  carryArmors[id] = (carryArmors[id] || 0) + amount;
  return true;
}

function moveArmorToWarehouse(id, amount) {
  amount = Math.max(1, amount | 0);
  const have = carryArmors[id] || 0;
  if (have < amount) {
    appendLog("手持ちのその防具が足りない");
    return false;
  }
  carryArmors[id] -= amount;
  if (carryArmors[id] <= 0) delete carryArmors[id];
  armorCounts[id] = (armorCounts[id] || 0) + amount;
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
//
// ・フィールド用ポーションセレクト（useItemSelect）
// ・戦闘アイテムセレクト（battleItemSelect, battleItemCategory）
// ・フィールド料理セレクト（fieldFoodSelect）
// ・フィールド飲み物セレクト（fieldDrinkSelect）

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
      const p = potions.find(x => x.id === id);
      const name = p ? p.name : id;
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

  // 戦闘用はカテゴリ付き専用関数で更新する
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
    // 手持ちポーションのみ
    Object.keys(carryPotions).forEach(id => {
      const cnt = carryPotions[id] || 0;
      if (cnt <= 0) return;
      const p = potions.find(x => x.id === id);
      const name = p ? p.name : id;
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
    // 手持ち道具のみ（爆弾など）
    Object.keys(carryTools).forEach(id => {
      const cnt = carryTools[id] || 0;
      if (cnt <= 0) return;
      let label = id;
      if (id === "bomb") {
        label = "爆弾";
      } else if (id.startsWith("bomb_T1")) {
        label = "爆弾T1";
      } else if (id.startsWith("bomb_T2")) {
        label = "爆弾T2";
      } else if (id.startsWith("bomb_T3")) {
        label = "爆弾T3";
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
    // 未知カテゴリの場合はポーション扱い
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "アイテムなし";
    sel.appendChild(opt);
  }

  // 前回選択を復元（なければ先頭）
  if (prevId && Array.from(sel.options).some(o => o.value === prevId)) {
    sel.value = prevId;
  } else if (sel.options.length > 0) {
    sel.selectedIndex = 0;
  }

  window.lastBattleItemCategory = category;
  window.lastBattleItemId = sel.value || null;

  // カテゴリセレクト側にも反映
  if (categorySel) {
    categorySel.value = category;
  }
}

// カテゴリ変更時に呼ぶ想定
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
      const recipe = (typeof COOKING_RECIPES !== "undefined")
        ? COOKING_RECIPES.food.find(r => r.id === id)
        : null;
      const name = recipe ? recipe.name : id;
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
      const recipe = (typeof COOKING_RECIPES !== "undefined")
        ? COOKING_RECIPES.drink.find(r => r.id === id)
        : null;
      const name = recipe ? recipe.name : id;
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
//
// セーブデータ適用後にセレクト類をまとめて更新するための薄いラッパー。
// 既存仕様は変えず、未定義エラーを防ぎつつ UI を同期する。

function refreshBattleItemSelect() {
  if (typeof refreshBattleItemSelectWithCategory === "function") {
    refreshBattleItemSelectWithCategory();
  }
}

function refreshUseItemSelect() {
  // フィールド用ポーション + 食べ物/飲み物セレクトをまとめて更新
  if (typeof refreshCarryPotionSelects === "function") {
    refreshCarryPotionSelects();
  }
  if (typeof refreshCarryFoodDrinkSelects === "function") {
    refreshCarryFoodDrinkSelects();
  }
}