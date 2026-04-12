// market-core2.js
// market-core.js で定義されたグローバル（marketListings など）を前提にした後半ロジック

// ここを追加（グローバルを必ず生やしておく）
window.marketListings = window.marketListings || [];
window.prevServerMarketListings = window.prevServerMarketListings || [];

// -----------------------
// 出品リストをまとめる
// -----------------------
function buildMarketStacks(){
  const map = new Map();
  const src = Array.isArray(window.marketListings) ? window.marketListings : [];
  src.forEach(l => {
    const category = l.category;
    const itemId = l.itemId || l.itemKey;
    if (!category || !itemId) return;

    const key = buildStackKey(category, itemId);
    let st = map.get(key);
    if(!st){
      st = {
        key,
        category,
        itemId,
        totalAmount: 0,
        minPrice: Infinity,
        maxPrice: 0,
        listings: []
      };
      map.set(key, st);
    }
    const amt = l.amount || 0;
    const price = l.price || 0;
    st.totalAmount += amt;
    st.minPrice = Math.min(st.minPrice, price);
    st.maxPrice = Math.max(st.maxPrice, price);
    st.listings.push({
      id: l.id,
      category,
      itemId,
      price,
      amount: amt,
      owner: l.owner || l.sellerId || "server"
    });
  });

  const arr = Array.from(map.values());
  arr.sort((a,b)=>{
    if(a.category !== b.category){
      return a.category.localeCompare(b.category);
    }
    const la = getItemLabel(a.category, a.itemId);
    const lb = getItemLabel(b.category, b.itemId);
    return la.localeCompare(lb);
  });
  return arr;
}

function getStackLabel(st){
  const label = getItemLabel(st.category, st.itemId);
  if(st.minPrice === st.maxPrice){
    return `${label} @${st.minPrice}G`;
  } else {
    return `${label} @${st.minPrice}〜${st.maxPrice}G`;
  }
}

// -----------------------
// 購入シミュレーション
// -----------------------
function simulateMarketBuy(stackKey, mode, amount){
  const [category, itemId] = stackKey.split(":");
  const src = Array.isArray(window.marketListings) ? window.marketListings : [];
  const listings = src
    .filter(l => {
      const cat = l.category;
      const id  = l.itemId || l.itemKey;
      return cat === category && id === itemId && l.amount > 0;
    })
    .sort((a,b)=>a.price - b.price);

  if(listings.length === 0) return null;

  let remain = 0;
  if(mode === "one") remain = 1;
  else if(mode === "all") listings.forEach(l => remain += l.amount);
  else if(mode === "amount") remain = amount;

  if(remain <= 0) return null;

  let buyCount = 0;
  let totalPrice = 0;
  let tmpMoney = money;

  for(const l of listings){
    if(remain <= 0) break;
    const canBuyFromThis = Math.min(l.amount, remain);
    const cost = canBuyFromThis * l.price;
    if(tmpMoney < cost){
      const affordable = Math.floor(tmpMoney / l.price);
      if(affordable <= 0) break;
      buyCount += affordable;
      totalPrice += affordable * l.price;
      tmpMoney -= affordable * l.price;
      remain -= affordable;
      break;
    } else {
      buyCount += canBuyFromThis;
      totalPrice += cost;
      tmpMoney -= cost;
      remain -= canBuyFromThis;
    }
  }
  if(buyCount <= 0) return null;

  const avgPrice = totalPrice / buyCount;
  return {
    label: getItemLabel(category, itemId),
    category,
    itemId,
    buyableCount: buyCount,
    totalPrice,
    avgPrice
  };
}

function addItemForBuy(category, itemId, amount){
  if (typeof addItemToInventory === "function" &&
      (category === "weapon" || category === "armor" ||
       category === "potion" || category === "tool")) {

    for (let i = 0; i < amount; i++) {
      addItemToInventory(itemId, 1);
    }
    return;
  }

  if(category === "weapon"){
    weaponCounts[itemId] = (weaponCounts[itemId] || 0) + amount;
  } else if(category === "armor"){
    armorCounts[itemId] = (armorCounts[itemId] || 0) + amount;
  } else if(category === "potion"){
    potionCounts[itemId] = (potionCounts[itemId] || 0) + amount;
  } else if(category === "tool"){
    toolCounts[itemId] = (toolCounts[itemId] || 0) + amount;
  } else if(category === "material"){
    if (itemId === "wood" || itemId === "ore" || itemId === "herb" ||
        itemId === "cloth" || itemId === "leather" || itemId === "water") {
      addBaseMaterials(itemId, amount);
    }
    else if (itemId === RARE_GATHER_ITEM_ID) {
      if (typeof itemCounts === "object") {
        itemCounts[itemId] = (itemCounts[itemId] || 0) + amount;
      }
    }
    else if (Array.isArray(INTERMEDIATE_MATERIALS)
          && INTERMEDIATE_MATERIALS.some(m => m.id === itemId)) {
      if (typeof intermediateMats === "object") {
        intermediateMats[itemId] = (intermediateMats[itemId] || 0) + amount;
      }
    }
    else if (typeof COOKING_RECIPES !== "undefined") {
      const fr = COOKING_RECIPES.food.find(r => r.id === itemId);
      const dr = COOKING_RECIPES.drink.find(r => r.id === itemId);
      if (fr) {
        window.cookedFoods[itemId] = (window.cookedFoods[itemId] || 0) + amount;
      } else if (dr) {
        window.cookedDrinks[itemId] = (window.cookedDrinks[itemId] || 0) + amount;
      }
    }
  }
}

// -----------------------
// 購入実行
// -----------------------
function doMarketBuy(stackKey, mode, amount){
  const sim = simulateMarketBuy(stackKey, mode, amount);
  if(!sim || sim.buyableCount <= 0) return;

  if (money < sim.totalPrice) {
    if (typeof appendLog === "function") appendLog("お金が足りません");
    return;
  }

  const [category, itemId] = stackKey.split(":");
  let remain = sim.buyableCount;
  let costLeft = sim.totalPrice;

  const src = Array.isArray(window.marketListings) ? window.marketListings : [];
  const listings = src
    .filter(l => {
      const cat = l.category;
      const id  = l.itemId || l.itemKey;
      return cat === category && id === itemId && l.amount > 0;
    })
    .sort((a,b)=>a.price - b.price);

  const consumeList = [];
  for(const l of listings){
    if(remain <= 0) break;
    const canBuyFromThis = Math.min(l.amount, remain);
    const cost = canBuyFromThis * l.price;
    if(cost > costLeft) break;

    consumeList.push({ id: l.id, amount: canBuyFromThis, price: l.price });
    remain -= canBuyFromThis;
    costLeft -= cost;
  }

  if (!consumeList.length) return;

  // オンライン（サーバ経由）の場合
  if (window.globalSocket) {
    try {
      let index = 0;
      const doNext = () => {
        if (index >= consumeList.length) {
          money -= sim.totalPrice;
          addItemForBuy(category, itemId, sim.buyableCount);
          const label = getItemLabel(category, itemId);
          const msg = `${label} を ${sim.buyableCount}個購入した（合計${sim.totalPrice}G）`;
          if (typeof appendLog === "function") appendLog(msg);

          try {
            window.globalSocket.emit("market:list");
          } catch (e2) {
            console.log("market:list emit error after buy", e2);
          }
          return;
        }
        const c = consumeList[index++];
        window.globalSocket.emit(
          "market:consume",
          { id: c.id, consumeAmount: c.amount },
          (res) => {
            if (!res || !res.ok) {
              if (typeof appendLog === "function") appendLog("購入処理に失敗しました");
              return;
            }
            doNext();
          }
        );
      };
      doNext();
      return;
    } catch (e) {
      console.log("market:consume emit error", e);
    }
  }

  // -----------------------
  // オフライン購入（ローカル市場）
  // -----------------------

  // ローカル配列を書き換え
  remain = sim.buyableCount;
  costLeft = sim.totalPrice;

  for(const l of listings){
    if(remain <= 0) break;
    const canBuyFromThis = Math.min(l.amount, remain);
    const cost = canBuyFromThis * l.price;
    if(cost > costLeft) break;

    l.amount -= canBuyFromThis;
    remain -= canBuyFromThis;
    costLeft -= cost;
  }

  // 0 個になった出品を削除
  if (Array.isArray(window.marketListings)) {
    window.marketListings = window.marketListings.filter(l => l.amount > 0);
  }

  // プレイヤー側の支払い＆在庫追加
  money -= sim.totalPrice;
  addItemForBuy(category, itemId, sim.buyableCount);

  const label = getItemLabel(category, itemId);
  const msg = `${label} を ${sim.buyableCount}個購入した（合計${sim.totalPrice}G）`;
  if (typeof appendLog === "function") appendLog(msg);

  updateDisplay();
  refreshMarketBuyList();
  refreshMarketSellCandidates();
  refreshMarketSellItems();
  renderMyListings();
}

// -----------------------
// 原価（理論価値）計算ヘルパー
// -----------------------
function getTheoreticalCost(category, itemId) {
  function getBaseMaterialCost(baseKey, tier) {
    const tbl = window.MATERIAL_TIER_VALUES || {};
    if (tier === "t1") return tbl.t1 || 3;
    if (tier === "t2") return tbl.t2 || 5;
    if (tier === "t3") return tbl.t3 || 10;
    return 0;
  }

  function getIntermediateCost(id) {
    if (!Array.isArray(INTERMEDIATE_MATERIALS)) return 0;
    const mat = INTERMEDIATE_MATERIALS.find(m => m.id === id);
    if (!mat || !mat.from) return 0;

    let total = 0;
    Object.keys(mat.from).forEach(baseKey => {
      const tiers = mat.from[baseKey];
      Object.keys(tiers).forEach(tier => {
        const amount = tiers[tier] || 0;
        total += getBaseMaterialCost(baseKey, tier) * amount;
      });
    });
    return total;
  }

  function getRecipeCost(cat, id) {
    if (typeof CRAFT_RECIPES !== "object" || !CRAFT_RECIPES[cat]) return 0;
    const list = CRAFT_RECIPES[cat];
    const r = list.find(x => x.id === id);
    if (!r || !r.cost) return 0;

    let total = 0;
    Object.keys(r.cost).forEach(key => {
      const amount = r.cost[key] || 0;

      const isIntermediate =
        Array.isArray(INTERMEDIATE_MATERIALS) &&
        INTERMEDIATE_MATERIALS.some(m => m.id === key);

      if (isIntermediate) {
        total += getIntermediateCost(key) * amount;
      } else {
        let baseKey = key;
        let tier = "t1";

        const m = key.match(/(.+)_T([123])/);
        if (m) {
          baseKey = m[1];
          tier = "t" + m[2];
        }

        total += getBaseMaterialCost(baseKey, tier) * amount;
      }
    });

    let avgRate = 0.7;
    if (/_T1$/.test(id)) avgRate = 0.8;
    else if (/_T2$/.test(id)) avgRate = 0.7;
    else if (/_T3$/.test(id)) avgRate = 0.6;

    if (avgRate <= 0) avgRate = 0.7;

    const v = total / avgRate;
    return Math.ceil(v);
  }

  if (category === "material") {
    if (itemId === "wood" || itemId === "ore" || itemId === "herb" ||
        itemId === "cloth" || itemId === "leather" || itemId === "water") {
      return getBaseMaterialCost(itemId, "t1");
    }
    if (itemId === RARE_GATHER_ITEM_ID) {
      return 50;
    }
    if (Array.isArray(INTERMEDIATE_MATERIALS) &&
        INTERMEDIATE_MATERIALS.some(m => m.id === itemId)) {
      return getIntermediateCost(itemId);
    }
    return 0;
  } else if (category === "weapon" || category === "armor" ||
             category === "potion" || category === "tool") {
    return getRecipeCost(category, itemId);
  }

  return 0;
}

function getMarketBaseValue(category, itemId) {
  const theoretical = getTheoreticalCost(category, itemId);
  if (theoretical > 0) return theoretical;

  const stacks = buildMarketStacks();
  const st = stacks.find(s => s.category === category && s.itemId === itemId);
  if (!st) return 0;
  return st.minPrice || 0;
}

// =======================
// 市場イベント（ホットカテゴリ）
// =======================
const MARKET_HOT_CATEGORY_CANDIDATES = ["potion", "material", "weapon", "armor", "cooking", "tool"];

const MARKET_CATEGORY_LABELS_JA = {
  weapon: "武器",
  armor: "防具",
  potion: "ポーション",
  material: "素材",
  cooking: "料理",
  tool: "道具"
};

let currentMarketHotCats = [];

function applyMarketEventBoost(prob, itemCategory) {
  if (Array.isArray(currentMarketHotCats) &&
      currentMarketHotCats.includes(itemCategory)) {
    prob *= 4;
    if (prob > 0.25) prob = 0.25;
  }
  return prob;
}

function rotateMarketHotCategories() {
  if (!Array.isArray(MARKET_HOT_CATEGORY_CANDIDATES) ||
      MARKET_HOT_CATEGORY_CANDIDATES.length === 0) {
    currentMarketHotCats = [];
    return;
  }

  const i = Math.floor(Math.random() * MARKET_HOT_CATEGORY_CANDIDATES.length);
  const hot = MARKET_HOT_CATEGORY_CANDIDATES[i];

  currentMarketHotCats = [hot];
}

(function startMarketEventTimerIfNeeded() {
  if (typeof window === "undefined") return;
  if (window._marketEventTimerStarted) return;
  window._marketEventTimerStarted = true;

  rotateMarketHotCategories();

  const THIRTY_MIN_MS = 30 * 60 * 1000;
  setInterval(() => {
    rotateMarketHotCategories();
  }, THIRTY_MIN_MS);
})();

function getNpcBuyProb(baseValue, price, category) {
  if (price <= 0 || baseValue <= 0) return 0;

  const ratio = price / baseValue;
  let prob = 0;

  if (ratio < 0.5) {
    prob = 0.05;
  } else if (ratio < 1.0) {
    prob = 0.02;
  } else if (ratio < 1.5) {
    prob = 0.005;
  } else if (ratio < 2.5) {
    prob = 0.001;
  } else {
    prob = 0.0001;
  }

  prob = applyMarketEventBoost(prob, category);
  if (prob > 0.25) prob = 0.25;

  return prob;
}

// -----------------------
// UI連動用 追加実装
// ----------------------

function refreshMarketSellCandidates(){
  const catSel  = document.getElementById("marketSellCategory");
  if (!catSel) return;

  catSel.innerHTML = "";
  const cats = [
    { value: "weapon",       label: "武器" },
    { value: "armor",        label: "防具" },
    { value: "potion",       label: "ポーション" },
    { value: "tool",         label: "道具" },
    { value: "materialBase", label: "素材" },
    { value: "materialInter",label: "中間素材" },
    { value: "cooking",      label: "料理" }
  ];
  cats.forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c.value;
    opt.textContent = c.label;
    catSel.appendChild(opt);
  });

  refreshMarketSellItems();
}

function refreshMarketSellItems(){
  const catSel  = document.getElementById("marketSellCategory");
  const itemSel = document.getElementById("marketSellItem");
  if (!catSel || !itemSel) return;

  if (typeof weapons === "undefined" ||
      typeof armors  === "undefined" ||
      typeof potions === "undefined") {
    console.warn("market-core: weapons/armors/potions が未初期化のため、refreshMarketSellItems をスキップ");
    return;
  }

  const category = catSel.value;
  itemSel.innerHTML = "";

  const appendOption = (id, label) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = label;
    itemSel.appendChild(opt);
  };

  if (category === "weapon") {
    weapons.forEach(w=>{
      const cnt = weaponCounts[w.id] || 0;
      if (cnt > 0) {
        appendOption(w.id, `${w.name}（所持${cnt}）`);
      }
    });
  } else if (category === "armor") {
    armors.forEach(a=>{
      const cnt = armorCounts[a.id] || 0;
      if (cnt > 0) {
        appendOption(a.id, `${a.name}（所持${cnt}）`);
      }
    });
  } else if (category === "potion") {
    potions.forEach(p=>{
      const cnt = potionCounts[p.id] || 0;
      if (cnt > 0) {
        appendOption(p.id, `${p.name}（所持${cnt}）`);
      }
    });
  } else if (category === "tool") {
    if (typeof toolCounts === "object") {
      Object.keys(toolCounts).forEach(id => {
        const cnt = toolCounts[id] || 0;
        if (cnt <= 0) return;
        const label = getItemLabel("tool", id);
        appendOption(id, `${label}（所持${cnt}）`);
      });
    }
  } else if (category === "materialBase") {
    const mats = [
      { id:"wood",    name:"木",    count: getMatTotal("wood") },
      { id:"ore",     name:"鉱石",  count: getMatTotal("ore") },
      { id:"herb",    name:"草",    count: getMatTotal("herb") },
      { id:"cloth",   name:"布",    count: getMatTotal("cloth") },
      { id:"leather", name:"皮",    count: getMatTotal("leather") },
      { id:"water",   name:"水",    count: getMatTotal("water") }
    ];

    if (typeof itemCounts === "object") {
      const starCount = itemCounts[RARE_GATHER_ITEM_ID] || 0;
      if (starCount > 0) {
        mats.push({ id: RARE_GATHER_ITEM_ID, name: RARE_GATHER_ITEM_NAME, count: starCount });
      }
    }

    mats.forEach(m=>{
      if (m.count > 0) {
        appendOption(m.id, `${m.name}（所持${m.count}）`);
      }
    });
  } else if (category === "materialInter") {
    if (typeof intermediateMats === "object") {
      if (Array.isArray(INTERMEDIATE_MATERIALS)) {
        INTERMEDIATE_MATERIALS.forEach(m => {
          const cnt = intermediateMats[m.id] || 0;
          if (cnt > 0) {
            appendOption(m.id, `${m.name}（所持${cnt}）`);
          }
        });
      } else {
        Object.keys(intermediateMats).forEach(id => {
          const cnt = intermediateMats[id] || 0;
          if (cnt > 0) {
            appendOption(id, `${getItemLabel("materialInter", id)}（所持${cnt}）`);
          }
        });
      }
    }
  } else if (category === "cooking") {
    if (typeof COOKING_RECIPES !== "undefined") {
      const foods  = window.cookedFoods  || {};
      const drinks = window.cookedDrinks || {};

      COOKING_RECIPES.food.forEach(r => {
        const id  = r.id;
        const cnt = foods[id] || 0;
        if (cnt <= 0) return;
        appendOption(id, `${r.name}（所持${cnt}）`);
      });

      COOKING_RECIPES.drink.forEach(r => {
        const id  = r.id;
        const cnt = drinks[id] || 0;
        if (cnt <= 0) return;
        appendOption(id, `${r.name}（所持${cnt}）`);
      });
    }
  }

  if (!itemSel.options.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "出品できるアイテムがありません";
    itemSel.appendChild(opt);
  }
}

// 買いリスト表示＋カテゴリフィルタ
let marketBuyStacksCache = [];

function renderMarketBuyList(stacks){
  const container = document.getElementById("marketBuyListContainer");
  if (!container) return;
  container.innerHTML = "";

  if (!stacks || stacks.length === 0) {
    container.textContent = "現在、出品はありません。";
    return;
  }

  stacks.forEach(st=>{
    const row = document.createElement("div");
    row.className = "market-buy-row";

    const main = document.createElement("div");
    main.className = "row-main";
    main.textContent = `${getStackLabel(st)} / 在庫:${st.totalAmount}個`;
    row.appendChild(main);

    const preview = document.createElement("div");
    preview.className = "row-preview";
    preview.textContent = `最安${st.minPrice}G / 最高${st.maxPrice}G`;
    row.appendChild(preview);

    const controls = document.createElement("div");
    controls.className = "row-controls";

    const btnOne = document.createElement("button");
    btnOne.textContent = "1個買う";
    btnOne.addEventListener("click", () => doMarketBuy(st.key, "one"));

    const btnAll = document.createElement("button");
    btnAll.textContent = "全部買う";
    btnAll.addEventListener("click", () => doMarketBuy(st.key, "all"));

    controls.appendChild(btnOne);
    controls.appendChild(btnAll);

    row.appendChild(controls);

    container.appendChild(row);
  });
}

function refreshMarketBuyList(){
  const stacks = buildMarketStacks();
  marketBuyStacksCache = stacks;
  renderMarketBuyList(stacks);
}

function filterMarketBuyListByCategory(cat){
  if (!marketBuyStacksCache || !marketBuyStacksCache.length) {
    refreshMarketBuyList();
    return;
  }
  if (cat === "all") {
    renderMarketBuyList(marketBuyStacksCache);
    return;
  }
  const filtered = marketBuyStacksCache.filter(st => st.category === cat);
  renderMarketBuyList(filtered);
}

// -----------------------
// 自分の出品が売れたかをローカルだけで判定
// -----------------------
function detectSellFromDiff(prevList, newList) {
  if (!window.globalSocket || !window.globalSocket.id) return;

  const myId = window.globalSocket.id;
  const newMap = new Map();
  newList.forEach(l => newMap.set(l.id, l));

  prevList.forEach(prev => {
    if (prev.owner !== myId) return;

    const now = newMap.get(prev.id);

    if (!now) {
      const soldAmount = prev.amount;
      if (soldAmount > 0) {
        const totalPrice = soldAmount * prev.price;
        if (typeof money === "number") {
          money += totalPrice;
        }
        addSellLog("プレイヤー", prev.category, prev.itemId, soldAmount, totalPrice);
      }
      return;
    }

    if (now.amount < prev.amount) {
      const diff = prev.amount - now.amount;
      if (diff > 0) {
        const totalPrice = diff * prev.price;
        if (typeof money === "number") {
          money += totalPrice;
        }
        addSellLog("プレイヤー", prev.category, prev.itemId, diff, totalPrice);
      }
    }
  });
}

// =======================
// サーバー市場との同期（Socket.io）
// =======================
function setupMarketSocketSync() {
  if (typeof window === "undefined") return;

  if (!window.globalSocket) {
    console.log("market-core: globalSocket not ready yet");
    return;
  }

  console.log("market-core: setupMarketSocketSync start");

  try {
    window.globalSocket.on("market:listResult", (serverListings) => {
      const newList = (Array.isArray(serverListings) ? serverListings : []).map(l => ({
        id: l.id,
        category: l.category,
        itemId: l.itemKey || l.itemId,
        price: l.price,
        amount: l.amount,
        sellerId: l.sellerId,
        owner: l.sellerId || "server"
      }));

      window.marketListings = newList;
      window.prevServerMarketListings = newList.map(l => ({ ...l }));

      refreshMarketBuyList();
      renderMyListings();
    });

    window.globalSocket.on("market:update", (serverListings) => {
      const newList = (Array.isArray(serverListings) ? serverListings : []).map(l => ({
        id: l.id,
        category: l.category,
        itemId: l.itemKey || l.itemId,
        price: l.price,
        amount: l.amount,
        sellerId: l.sellerId,
        owner: l.sellerId || "server"
      }));

      try {
        detectSellFromDiff(window.prevServerMarketListings, newList);
      } catch (e) {
        console.log("detectSellFromDiff error", e);
      }

      window.marketListings = newList;
      window.prevServerMarketListings = newList.map(l => ({ ...l }));

      refreshMarketBuyList();
      renderMyListings();
    });

    try {
      window.globalSocket.emit("market:list");
    } catch (e2) {
      console.log("initial market:list emit error (inside socket sync)", e2);
    }
  } catch (e) {
    console.log("market socket handlers error", e);
  }
}

setupMarketSocketSync();

// =======================
// 市場タブ表示時の更新フック
// =======================
window.addEventListener("DOMContentLoaded", () => {
  const tabSell = document.getElementById("marketTabSell");
  const tabBuy  = document.getElementById("marketTabBuy");

  if (tabSell) {
    tabSell.addEventListener("click", () => {
      if (typeof refreshMarketSellCandidates === "function") {
        refreshMarketSellCandidates();
      }
      renderMyListings();
    });
  }

  if (tabBuy) {
    tabBuy.addEventListener("click", () => {
      if (typeof refreshMarketBuyList === "function") {
        refreshMarketBuyList();
      }

      if (window.globalSocket) {
        try {
          window.globalSocket.emit("market:list");
        } catch (e) {
          console.log("market:list emit error on tab click", e);
        }
      } else {
        renderMyListings();
      }
    });
  }
});