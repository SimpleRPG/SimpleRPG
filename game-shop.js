// game-shop.js
// ショップUIと購入・売却処理
//
// 前提：game-core-1.js / inventory-core.js / game-core-4.js で
//   money, hp, hpMax, mp, mpMax,
//   potions, potionCounts,
//   cookedFoods, cookedDrinks,
//   toolCounts, materials, cookingMats,
//   restoreHungerThirst(addHunger, addThirst),
//   updateDisplay(), appendLog()
// が定義済み。

// =======================
// ショップラインナップ（購入用）
// =======================

// POTIONS_INIT の id に合わせて対応
const shopData = {
  item: [
    { id: "potionT1_shop", potionId: "potionT1", name: "ポーションT1",     price: 60,  desc: "HPを少し回復する基本の回復薬。" },
    { id: "manaT1_shop",   potionId: "manaT1",   name: "マナポーションT1", price: 80,  desc: "MPを少し回復する基本のマナ薬。" },
    // 爆弾は道具扱いにするため potionId は使わず、id だけで判別する
    { id: "bomb_shop",     potionId: null,       name: "爆弾",             price: 100, desc: "敵にダメージを与える攻撃アイテム（道具）。" }
  ],
  service: [
    { id: "inn_hp",   name: "宿屋で休む(HP)",      price: 500,  desc: "HPを全回復します。",             type: "service", kind: "innHP" },
    { id: "inn_full", name: "宿屋で休む(HP/MP)",   price: 800, desc: "HPとMPを全回復します。",         type: "service", kind: "innFull" },
    // ★追加: 定食
    { id: "setmeal",  name: "定食を食べる",        price: 10,  desc: "空腹と水分が少し回復する定食。", type: "service", kind: "meal" }
  ]
};

let shopCurrentCategory = "item";   // "item" / "service" / "sell"
let shopSelectedItem    = null;

// =======================
// 所持金表示
// =======================

function updateShopGoldDisplay() {
  const el = document.getElementById("shopGoldDisplay");
  if (el) el.textContent = money;
}

// =======================
// 売却用ヘルパー
// =======================

// 売値計算：価値の半分（切り上げ）
function getSellPriceFromValue(value) {
  const v = typeof value === "number" ? value : 0;
  return Math.max(0, Math.ceil(v / 2));
}

// ポーションマスタから価値を取る前提（なければ price を流用）
function getPotionSellPrice(potionId) {
  const p = Array.isArray(potions) ? potions.find(x => x.id === potionId) : null;
  if (!p) return 0;
  const base = (typeof p.value === "number") ? p.value
              : (typeof p.price === "number") ? p.price
              : 0;
  return getSellPriceFromValue(base);
}

// 料理（食べ物）の売値
function getCookedFoodSellPrice(foodId) {
  if (typeof COOKING_RECIPES === "undefined" || !COOKING_RECIPES || !Array.isArray(COOKING_RECIPES.food)) {
    return 0;
  }
  const r = COOKING_RECIPES.food.find(f => f.id === foodId);
  if (!r) return 0;
  const base = (typeof r.value === "number") ? r.value
              : (typeof r.price === "number") ? r.price
              : 0;
  return getSellPriceFromValue(base);
}

// 料理（飲み物）の売値
function getCookedDrinkSellPrice(drinkId) {
  if (typeof COOKING_RECIPES === "undefined" || !COOKING_RECIPES || !Array.isArray(COOKING_RECIPES.drink)) {
    return 0;
  }
  const r = COOKING_RECIPES.drink.find(d => d.id === drinkId);
  if (!r) return 0;
  const base = (typeof r.value === "number") ? r.value
              : (typeof r.price === "number") ? r.price
              : 0;
  return getSellPriceFromValue(base);
}

// 道具（爆弾など）の売値（簡易：idごとに固定）
function getToolSellPrice(toolId) {
  // 必要なら道具マスタを参照する形に拡張
  let base = 0;
  if (toolId === "bomb" || toolId === "bomb_T1") base = 100;
  else if (toolId === "bomb_T2") base = 300;
  else if (toolId === "bomb_T3") base = 900;
  return getSellPriceFromValue(base);
}

// 通常素材（materials: { wood:{t1,t2,t3}, ... }）の売値
// T1/T2/T3 の価値は market-core の MATERIAL_TIER_VALUES に合わせて 3/5/10G 相当（売値はその半額）とする。
function getMaterialSellPrice(baseKey, tier) {
  let base = 0;
  if (tier === "t1") base = 3;
  else if (tier === "t2") base = 5;
  else if (tier === "t3") base = 10;
  return getSellPriceFromValue(base);
}

// 料理素材（cookingMats）の売値
// market-core.js の COOKING_INGREDIENT_BASE_VALUE に合わせて
function getCookingMatSellPrice(matId) {
  const base = (typeof COOKING_INGREDIENT_BASE_VALUE === "number")
    ? COOKING_INGREDIENT_BASE_VALUE
    : 10;
  return getSellPriceFromValue(base);
}

// 料理素材の名前（COOKING_MAT_NAMES を想定）
function getCookingMatName(matId) {
  if (typeof COOKING_MAT_NAMES === "object" && COOKING_MAT_NAMES !== null) {
    if (COOKING_MAT_NAMES[matId]) return COOKING_MAT_NAMES[matId];
  }
  return matId;
}

// =======================
// 売却対象一覧生成
// =======================
//
// 「倉庫にあるもの全部」を sell リストとしてまとめる。

function buildSellableList() {
  const list = [];

  // ポーション（倉庫: potionCounts）
  if (typeof potionCounts === "object" && Array.isArray(potions)) {
    Object.keys(potionCounts).forEach(id => {
      const cnt = potionCounts[id] || 0;
      if (cnt <= 0) return;
      const p = potions.find(x => x.id === id);
      const name = p ? p.name : id;
      const price = getPotionSellPrice(id);
      if (price <= 0) return;
      list.push({
        kind: "potion",
        id,
        name,
        count: cnt,
        price
      });
    });
  }

  // 料理（食べ物）
  if (typeof cookedFoods === "object") {
    Object.keys(cookedFoods).forEach(id => {
      const cnt = cookedFoods[id] || 0;
      if (cnt <= 0) return;
      let name = id;
      if (typeof COOKING_RECIPES !== "undefined" && COOKING_RECIPES && Array.isArray(COOKING_RECIPES.food)) {
        const r = COOKING_RECIPES.food.find(f => f.id === id);
        if (r && r.name) name = r.name;
      }
      const price = getCookedFoodSellPrice(id);
      if (price <= 0) return;
      list.push({
        kind: "food",
        id,
        name,
        count: cnt,
        price
      });
    });
  }

  // 料理（飲み物）
  if (typeof cookedDrinks === "object") {
    Object.keys(cookedDrinks).forEach(id => {
      const cnt = cookedDrinks[id] || 0;
      if (cnt <= 0) return;
      let name = id;
      if (typeof COOKING_RECIPES !== "undefined" && COOKING_RECIPES && Array.isArray(COOKING_RECIPES.drink)) {
        const r = COOKING_RECIPES.drink.find(d => d.id === id);
        if (r && r.name) name = r.name;
      }
      const price = getCookedDrinkSellPrice(id);
      if (price <= 0) return;
      list.push({
        kind: "drink",
        id,
        name,
        count: cnt,
        price
      });
    });
  }

  // 道具
  if (typeof toolCounts === "object") {
    Object.keys(toolCounts).forEach(id => {
      const cnt = toolCounts[id] || 0;
      if (cnt <= 0) return;
      let label = id;
      if (id === "bomb") label = "爆弾";
      else if (id === "bomb_T1") label = "爆弾T1";
      else if (id === "bomb_T2") label = "爆弾T2";
      else if (id === "bomb_T3") label = "爆弾T3";
      const price = getToolSellPrice(id);
      if (price <= 0) return;
      list.push({
        kind: "tool",
        id,
        name: label,
        count: cnt,
        price
      });
    });
  }

  // 通常素材（materials）
  if (typeof materials === "object") {
    const matNames = {
      wood: "木材",
      ore: "鉱石",
      herb: "薬草",
      cloth: "布",
      leather: "皮",
      water: "水"
    };
    Object.keys(materials).forEach(baseKey => {
      const info = materials[baseKey];
      if (!info) return;
      const baseName = matNames[baseKey] || baseKey;
      ["t1","t2","t3"].forEach(tier => {
        const cnt = info[tier] || 0;
        if (cnt <= 0) return;
        const price = getMaterialSellPrice(baseKey, tier);
        if (price <= 0) return;
        const tierLabel = (tier === "t1") ? "T1" : (tier === "t2") ? "T2" : "T3";
        list.push({
          kind: "material",
          id: baseKey + "_" + tier,
          baseKey,
          tier,
          name: `${tierLabel}${baseName}`,
          count: cnt,
          price
        });
      });
    });
  }

  // ★追加: 料理素材（cookingMats）
  if (typeof cookingMats === "object") {
    Object.keys(cookingMats).forEach(id => {
      const cnt = cookingMats[id] || 0;
      if (cnt <= 0) return;
      const name = getCookingMatName(id);
      const price = getCookingMatSellPrice(id);
      if (price <= 0) return;
      list.push({
        kind: "cookingMat",
        id,
        name,
        count: cnt,
        price
      });
    });
  }

  return list;
}

// 実際に1個売る
function sellOneItem(entry) {
  if (!entry) return;

  let success = false;

  switch (entry.kind) {
    case "potion":
      if (typeof potionCounts === "object") {
        const have = potionCounts[entry.id] || 0;
        if (have > 0) {
          potionCounts[entry.id] = have - 1;
          success = true;
        }
      }
      break;
    case "food":
      if (typeof cookedFoods === "object") {
        const have = cookedFoods[entry.id] || 0;
        if (have > 0) {
          cookedFoods[entry.id] = have - 1;
          success = true;
        }
      }
      break;
    case "drink":
      if (typeof cookedDrinks === "object") {
        const have = cookedDrinks[entry.id] || 0;
        if (have > 0) {
          cookedDrinks[entry.id] = have - 1;
          success = true;
        }
      }
      break;
    case "tool":
      if (typeof toolCounts === "object") {
        const have = toolCounts[entry.id] || 0;
        if (have > 0) {
          toolCounts[entry.id] = have - 1;
          success = true;
        }
      }
      break;
    case "material":
      if (typeof materials === "object") {
        const info = materials[entry.baseKey];
        if (info && info[entry.tier] > 0) {
          info[entry.tier] -= 1;
          success = true;
        }
      }
      break;
    case "cookingMat":
      if (typeof cookingMats === "object") {
        const have = cookingMats[entry.id] || 0;
        if (have > 0) {
          cookingMats[entry.id] = have - 1;
          success = true;
        }
      }
      break;
    default:
      break;
  }

  if (!success) {
    appendLog("そのアイテムはもう売れません。");
    return;
  }

  money += entry.price;
  appendLog(`「${entry.name}」を ${entry.price}G で売った。`);

  updateShopGoldDisplay();
  if (typeof updateDisplay === "function") {
    updateDisplay();
  }

  // 売却リストを再描画
  renderShopList();
}

// =======================
// 商品／売却リスト描画
// =======================

function renderShopList() {
  const list = document.getElementById("shopItemList");
  if (!list) return;
  list.innerHTML = "";

  // 売却モード
  if (shopCurrentCategory === "sell") {
    const sellList = buildSellableList();
    if (!sellList.length) {
      const msg = document.createElement("div");
      msg.textContent = "売却できるアイテムがありません。";
      list.appendChild(msg);
      return;
    }

    sellList.forEach(entry => {
      const btn = document.createElement("button");
      btn.textContent = `${entry.name} ×${entry.count}（${entry.price}Gで売却）`;
      btn.style.display = "block";
      btn.style.margin = "4px 0";
      btn.addEventListener("click", () => {
        sellOneItem(entry);
      });
      list.appendChild(btn);
    });

    // 売却モードでは詳細パネルは使わない
    selectShopItem(null);
    return;
  }

  // 通常の購入リスト
  const items = shopData[shopCurrentCategory] || [];
  items.forEach(item => {
    const btn = document.createElement("button");
    btn.textContent = `${item.name} (${item.price}G)`;
    btn.style.display = "block";
    btn.style.margin = "4px 0";
    btn.addEventListener("click", () => selectShopItem(item));
    list.appendChild(btn);
  });

  selectShopItem(null);
}

// =======================
// 商品選択（購入用詳細パネル）
// =======================

function selectShopItem(item) {
  shopSelectedItem = item;
  const nameEl  = document.getElementById("shopItemName");
  const descEl  = document.getElementById("shopItemDesc");
  const priceEl = document.getElementById("shopItemPrice");
  const buyBtn  = document.getElementById("shopBuyButton");

  if (!item || shopCurrentCategory === "sell") {
    if (nameEl)  nameEl.textContent = (shopCurrentCategory === "sell")
      ? "売却したいアイテムを左から選んでください。"
      : "商品を選択してください。";
    if (descEl)  descEl.textContent = "";
    if (priceEl) priceEl.textContent = "";
    if (buyBtn) {
      buyBtn.disabled = true;
      buyBtn.onclick = null;
    }
    return;
  }

  if (nameEl)  nameEl.textContent = item.name;
  if (descEl)  descEl.textContent = item.desc;
  if (priceEl)  priceEl.textContent = `価格: ${item.price}G`;

  if (buyBtn) {
    buyBtn.disabled = false;
    buyBtn.onclick = () => buyShopItem(item);
  }
}

// =======================
// 購入処理（既存仕様＋定食）
// =======================

function buyShopItem(item) {
  if (!item) return;
  if (money < item.price) {
    appendLog("ゴールドが足りない。");
    return;
  }
  money -= item.price;

  if (shopCurrentCategory === "item") {
    // 通常ポーション
    if (item.id !== "bomb_shop") {
      const p = potions.find(x => x.id === item.potionId);
      if (!p) {
        appendLog("この商品はまだ実装されていない。");
      } else {
        potionCounts[p.id] = (potionCounts[p.id] || 0) + 1;
        appendLog(`${item.name} を購入した。`);
      }
    } else {
      // 爆弾（道具）購入: 道具倉庫に追加
      if (typeof toolCounts === "object") {
        // ショップ品は T1 爆弾として扱う想定
        const toolId = "bomb_T1";
        toolCounts[toolId] = (toolCounts[toolId] || 0) + 1;
        appendLog(`${item.name} を購入した（道具として倉庫に追加された）。`);
      } else {
        appendLog("道具の保管領域が未定義です（toolCounts）。");
      }
    }
  } else if (shopCurrentCategory === "service") {
    if (item.kind === "innHP") {
      hp = hpMax;
      appendLog("宿屋で休み、HPが全回復した。");
    } else if (item.kind === "innFull") {
      hp = hpMax;
      mp = mpMax;
      appendLog("宿屋で休み、HPとMPが全回復した。");
    } else if (item.kind === "meal") {
      // ★定食: 空腹＆水分 +30 回復
      if (typeof restoreHungerThirst === "function") {
        restoreHungerThirst(30, 30);
      }
      appendLog("定食を食べ、お腹も喉も少し満たされた。");
    }
  }

  updateShopGoldDisplay();
  updateDisplay();
}

// =======================
// カテゴリタブ初期化
// =======================
//
// 既存の .shop-category-button に加えて、
// data-category="sell" のタブをHTML側に足しておく前提。

function initShopTabs() {
  const buttons = document.querySelectorAll(".shop-category-button");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.getAttribute("data-category");
      if (!cat) return;
      shopCurrentCategory = cat;
      renderShopList();
    });
  });
}

// =======================
// ショップ初期化
// =======================

function initShop() {
  updateShopGoldDisplay();
  initShopTabs();
  renderShopList();
}