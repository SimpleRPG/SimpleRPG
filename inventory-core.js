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

// idごとのカウント
let carryPotions = {}; // { potionId: count }
let carryFoods   = {}; // { foodId:   count }
let carryDrinks  = {}; // { drinkId:  count }
let carryWeapons = {}; // { weaponId: count }
let carryArmors  = {}; // { armorId:  count }
let carryTools   = {}; // { toolId:   count } // 現状は bomb_T1 などを想定

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
// ・道具: 将来 potionCounts か別countsで管理するとして、ここでは倉庫側は「存在する＝倉庫」扱い。
// ・料理: cook-data.js で新しく cookedFoods / cookedDrinks を導入する前提。
//   ここでは仮のオブジェクトとして用意しておく。

if (typeof cookedFoods === "undefined") {
  window.cookedFoods = {}; // { foodId: count }
}
if (typeof cookedDrinks === "undefined") {
  window.cookedDrinks = {}; // { drinkId: count }
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
// 現状は bomb などが POTIONS_INIT に含まれているので、
// 将来「toolCounts」が分かれた時用に一応フックを用意しておくイメージ。
// ひとまず carryTools だけ使うラッパーにしておく。

function moveToolToCarry(id, amount) {
  amount = Math.max(1, amount | 0);
  // 倉庫側は potionCounts / intermediateMats など、後で決める前提のダミー
  appendLog("道具の倉庫管理は未実装です（後で実装）");
  return false;
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
  // 倉庫側のtoolCountsに戻す処理は今後追加
  appendLog("道具を倉庫に戻す処理は未実装です（後で実装）");
  return true;
}

// =======================
// 手持ちインベントリのUI更新フック
// =======================
//
// ・フィールド用ポーションセレクト（useItemSelect）
// ・戦闘アイテムセレクト（battleItemSelect）
// ・今後追加予定の「食事セレクト」などから呼ぶ想定。

function refreshCarryPotionSelects() {
  const fieldSel  = document.getElementById("useItemSelect");
  const battleSel = document.getElementById("battleItemSelect");

  function fill(sel) {
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

  fill(fieldSel);
  fill(battleSel);
}

// TODO: 料理用セレクト（食べ物・飲み物）も
// 「食べる」UIを決めたタイミングで同じノリで追加する。