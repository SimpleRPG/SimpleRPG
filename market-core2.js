// market-core2.js
// market-core.js で定義されたグローバル（marketListings など）を前提にした後半ロジック

// ここを追加（グローバルを必ず生やしておく）
window.marketListings = window.marketListings || [];
window.prevServerMarketListings = window.prevServerMarketListings || [];
window.marketBuyOrders = window.marketBuyOrders || [];
// 全体の買い注文（全プレイヤー分）
window.marketAllBuyOrders = window.marketAllBuyOrders || [];

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
    if (typeof appendLog === "function") appendLog("[市] お金が足りません");
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

  // オンライン（サーバ経由）の場合）
  if (window.globalSocket) {
    try {
      let index = 0;
      const successCount = { amount: 0, cost: 0 };

      const finalizeSuccess = (partialFailed) => {
        if (successCount.amount > 0) {
          money -= successCount.cost;
          addItemForBuy(category, itemId, successCount.amount);
          const label = getItemLabel(category, itemId);
          const msg = partialFailed
            ? `[市] ${label} を ${successCount.amount}個購入した（合計${successCount.cost}G、一部失敗）`
            : `[市] ${label} を ${successCount.amount}個購入した（合計${successCount.cost}G）`;
          if (typeof appendLog === "function") appendLog(msg);
          if (typeof updateDisplay === "function") updateDisplay();
          if (typeof refreshMarketBuyList === "function") refreshMarketBuyList();
          if (typeof refreshMarketSellCandidates === "function") refreshMarketSellCandidates();
          if (typeof refreshMarketSellItems === "function") refreshMarketSellItems();
          if (typeof renderMyListings === "function") renderMyListings();
        }
        try {
          window.globalSocket.emit("market:list");
          window.globalSocket.emit("market:buyOrder:list");
          window.globalSocket.emit("market:buyOrder:listAll");
        } catch (e2) {
        }
      };

      const doNext = () => {
        if (index >= consumeList.length) {
          finalizeSuccess(false);
          return;
        }
        const c = consumeList[index++];
        window.globalSocket.emit(
          "market:consume",
          { id: c.id, consumeAmount: c.amount },
          (res) => {
            if (!res || !res.ok) {
              if (typeof appendLog === "function") appendLog("[市] 購入処理が途中で失敗しました");
              finalizeSuccess(true);
              return;
            }
            successCount.amount += c.amount;
            successCount.cost += c.amount * c.price;
            doNext();
          }
        );
      };
      doNext();
      return;
    } catch (e) {
    }
  }

  // -----------------------
  // オフライン購入（ローカル市場）
  // -----------------------
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

  if (Array.isArray(window.marketListings)) {
    window.marketListings = window.marketListings.filter(l => l.amount > 0);
  }

  money -= sim.totalPrice;
  addItemForBuy(category, itemId, sim.buyableCount);

  const label = getItemLabel(category, itemId);
  const msg = `[市] ${label} を ${sim.buyableCount}個購入した（合計${sim.totalPrice}G）`;
  if (typeof appendLog === "function") appendLog(msg);

  updateDisplay();
  refreshMarketBuyList();
  refreshMarketSellCandidates();
  refreshMarketSellItems();
  renderMyListings();
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
  const amountInput = document.getElementById("marketSellAmount");
  if (!catSel || !itemSel || !amountInput) return;

  if (typeof weapons === "undefined" ||
      typeof armors  === "undefined" ||
      typeof potions === "undefined") {
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

  let maxCountForSelected = 0;

  if (category === "weapon") {
    let warehouseCounts = {};
    if (Array.isArray(window.weaponInstances)) {
      weaponInstances.forEach(inst => {
        if (!inst || inst.location !== "warehouse") return;
        warehouseCounts[inst.id] = (warehouseCounts[inst.id] || 0) + 1;
      });
    }
    weapons.forEach(w=>{
      const cnt = warehouseCounts[w.id] != null ? warehouseCounts[w.id] : (weaponCounts[w.id] || 0);
      if (cnt > 0) {
        appendOption(w.id, `${w.name}（倉庫${cnt}）`);
      }
    });

    if (itemSel.value) {
      const id = itemSel.value;
      const cnt = warehouseCounts[id] != null ? warehouseCounts[id] : (weaponCounts[id] || 0);
      maxCountForSelected = cnt || 0;
    }
  } else if (category === "armor") {
    let warehouseCounts = {};
    if (Array.isArray(window.armorInstances)) {
      armorInstances.forEach(inst => {
        if (!inst || inst.location !== "warehouse") return;
        warehouseCounts[inst.id] = (warehouseCounts[inst.id] || 0) + 1;
      });
    }
    armors.forEach(a=>{
      const cnt = warehouseCounts[a.id] != null ? warehouseCounts[a.id] : (armorCounts[a.id] || 0);
      if (cnt > 0) {
        appendOption(a.id, `${a.name}（倉庫${cnt}）`);
      }
    });

    if (itemSel.value) {
      const id = itemSel.value;
      const cnt = warehouseCounts[id] != null ? warehouseCounts[id] : (armorCounts[id] || 0);
      maxCountForSelected = cnt || 0;
    }
  } else if (category === "potion") {
    potions.forEach(p=>{
      const cnt = potionCounts[p.id] || 0;
      if (cnt > 0) {
        appendOption(p.id, `${p.name}（所持${cnt}）`);
      }
    });

    if (itemSel.value) {
      const id = itemSel.value;
      maxCountForSelected = potionCounts[id] || 0;
    }
  } else if (category === "tool") {
    if (typeof toolCounts === "object") {
      Object.keys(toolCounts).forEach(id => {
        const cnt = toolCounts[id] || 0;
        if (cnt <= 0) return;
        const label = getItemLabel("tool", id);
        appendOption(id, `${label}（所持${cnt}）`);
      });
    }

    if (itemSel.value && typeof toolCounts === "object") {
      maxCountForSelected = toolCounts[itemSel.value] || 0;
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

    if (itemSel.value) {
      const id = itemSel.value;
      const base = mats.find(m => m.id === id);
      maxCountForSelected = base ? base.count : 0;
    }
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
            appendOption(id, `${getItemLabel("material", id)}（所持${cnt}）`);
          }
        });
      }
    }

    if (itemSel.value && typeof intermediateMats === "object") {
      maxCountForSelected = intermediateMats[itemSel.value] || 0;
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

    if (itemSel.value) {
      const id = itemSel.value;
      const foods  = window.cookedFoods  || {};
      const drinks = window.cookedDrinks || {};
      maxCountForSelected = (foods[id] || drinks[id] || 0);
    }
  }

  if (!itemSel.options.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "出品できるアイテムがありません";
    itemSel.appendChild(opt);
    maxCountForSelected = 0;
  }

  amountInput.max = maxCountForSelected > 0 ? String(maxCountForSelected) : "";
  const maxBtn = document.getElementById("marketSellAmountMax");
  if (maxBtn) {
    maxBtn.onclick = () => {
      if (maxCountForSelected > 0) {
        amountInput.value = String(maxCountForSelected);
      }
    };
  }

  itemSel.onchange = () => {
    let newMax = 0;
    const id = itemSel.value;
    if (!id) {
      amountInput.max = "";
      return;
    }
    if (category === "weapon") {
      let warehouseCounts = {};
      if (Array.isArray(window.weaponInstances)) {
        weaponInstances.forEach(inst => {
          if (!inst || inst.location !== "warehouse") return;
          warehouseCounts[inst.id] = (warehouseCounts[inst.id] || 0) + 1;
        });
      }
      newMax = warehouseCounts[id] != null ? warehouseCounts[id] : (weaponCounts[id] || 0);
    } else if (category === "armor") {
      let warehouseCounts = {};
      if (Array.isArray(window.armorInstances)) {
        armorInstances.forEach(inst => {
          if (!inst || inst.location !== "warehouse") return;
          warehouseCounts[inst.id] = (warehouseCounts[inst.id] || 0) + 1;
        });
      }
      newMax = warehouseCounts[id] != null ? warehouseCounts[id] : (armorCounts[id] || 0);
    } else if (category === "potion") {
      newMax = potionCounts[id] || 0;
    } else if (category === "tool") {
      newMax = (typeof toolCounts === "object" ? (toolCounts[id] || 0) : 0);
    } else if (category === "materialBase") {
      if (id === "wood" || id === "ore" || id === "herb" ||
          id === "cloth" || id === "leather" || id === "water") {
        newMax = getMatTotal(id);
      } else if (id === RARE_GATHER_ITEM_ID && typeof itemCounts === "object") {
        newMax = itemCounts[id] || 0;
      }
    } else if (category === "materialInter") {
      if (typeof intermediateMats === "object") {
        newMax = intermediateMats[id] || 0;
      }
    } else if (category === "cooking") {
      const foods  = window.cookedFoods  || {};
      const drinks = window.cookedDrinks || {};
      newMax = (foods[id] || drinks[id] || 0);
    }
    amountInput.max = newMax > 0 ? String(newMax) : "";
  };
}

// -----------------------
// 買い注文用アイテムセレクト初期化
// -----------------------
function initMarketOrderItemSelect() {
  const sel = document.getElementById("marketOrderItem");
  const priceEl = document.getElementById("marketOrderPrice");
  const amtEl = document.getElementById("marketOrderAmount");
  const reservePreview = document.getElementById("marketOrderReservedPreview");
  if (!sel) return;

  sel.innerHTML = "";

  const append = (cat, id, label) => {
    const opt = document.createElement("option");
    opt.value = `${cat}:${id}`;
    opt.textContent = label;
    sel.appendChild(opt);
  };

  const baseNames = { wood:"木", ore:"鉱石", herb:"草", cloth:"布", leather:"皮", water:"水" };
  Object.keys(baseNames).forEach(key => {
    append("material", key, `素材: ${baseNames[key]}`);
  });
  if (typeof RARE_GATHER_ITEM_ID === "string" && typeof RARE_GATHER_ITEM_NAME === "string") {
    append("material", RARE_GATHER_ITEM_ID, `素材: ${RARE_GATHER_ITEM_NAME}`);
  }

  if (Array.isArray(INTERMEDIATE_MATERIALS)) {
    INTERMEDIATE_MATERIALS.forEach(m => {
      append("material", m.id, `素材: ${m.name}`);
    });
  }

  if (typeof COOKING_RECIPES !== "undefined") {
    COOKING_RECIPES.food.forEach(r => {
      append("material", r.id, `料理: ${r.name}`);
    });
    COOKING_RECIPES.drink.forEach(r => {
      append("material", r.id, `飲み物: ${r.name}`);
    });
  }

  if (typeof weapons !== "undefined") {
    weapons.forEach(w => {
      append("weapon", w.id, `武器: ${w.name}`);
    });
  }
  if (typeof armors !== "undefined") {
    armors.forEach(a => {
      append("armor", a.id, `防具: ${a.name}`);
    });
  }
  if (typeof potions !== "undefined") {
    potions.forEach(p => {
      append("potion", p.id, `ポーション: ${p.name}`);
    });
  }
  if (typeof toolCounts === "object") {
    Object.keys(toolCounts).forEach(id => {
      const label = getItemLabel("tool", id);
      append("tool", id, `道具: ${label}`);
    });
  }

  if (!sel.options.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "買い注文できるアイテムがありません";
    sel.appendChild(opt);
  }

  // 拘束Gプレビュー（クライアント計算だけ）
  const updateReservePreview = () => {
    if (!reservePreview || !priceEl || !amtEl) return;
    const price = parseInt(priceEl.value, 10) || 0;
    const amount = parseInt(amtEl.value, 10) || 0;
    const reserved = price > 0 && amount > 0 ? price * amount : 0;
    if (reserved > 0) {
      reservePreview.textContent = `拘束予定: ${reserved}G`;
    } else {
      reservePreview.textContent = "";
    }
  };

  if (priceEl) {
    priceEl.addEventListener("input", updateReservePreview);
  }
  if (amtEl) {
    amtEl.addEventListener("input", updateReservePreview);
  }
  updateReservePreview();
}

// 買いリスト表示＋カテゴリフィルタ
let marketBuyStacksCache = [];
let lastMarketBuyCategory = "all";

function renderMarketBuyList(stacks){
  const container = document.getElementById("marketBuyListContainer");
  if (!container) return;
  container.innerHTML = "";

  if (!stacks || stacks.length === 0) {
    container.textContent = "現在、出品はありません。";
    return;
  }

  // 現在表示中カテゴリでフィルタ
  let targetStacks = stacks;
  if (lastMarketBuyCategory && lastMarketBuyCategory !== "all") {
    targetStacks = stacks.filter(st => st.category === lastMarketBuyCategory);
  }

  targetStacks.forEach(st=>{
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

    // 任意個数入力＋ボタン
    const amountInput = document.createElement("input");
    amountInput.type = "number";
    amountInput.min = "1";
    amountInput.placeholder = "個数";

    const btnAmount = document.createElement("button");
    btnAmount.textContent = "指定数買う";
    btnAmount.addEventListener("click", () => {
      const n = parseInt(amountInput.value, 10) || 0;
      if (n <= 0) {
        if (typeof appendLog === "function") appendLog("[市] 購入個数は1以上にしてください");
        return;
      }
      doMarketBuy(st.key, "amount", n);
    });

    controls.appendChild(btnOne);
    controls.appendChild(btnAll);
    controls.appendChild(amountInput);
    controls.appendChild(btnAmount);

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
  lastMarketBuyCategory = cat || "all";
  if (!marketBuyStacksCache || !marketBuyStacksCache.length) {
    refreshMarketBuyList();
    return;
  }
  renderMarketBuyList(marketBuyStacksCache);
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
        const totalPrice = prev.price * soldAmount;
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
        const totalPrice = prev.price * diff;
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
    return;
  }

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

      try {
        detectSellFromDiff(window.prevServerMarketListings, newList);
      } catch (e) {
      }

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
      }

      window.marketListings = newList;
      window.prevServerMarketListings = newList.map(l => ({ ...l }));

      refreshMarketBuyList();
      renderMyListings();
    });

    // 自分の買い注文一覧の同期
    window.globalSocket.on("market:buyOrder:listResult", (orders) => {
      window.marketBuyOrders = Array.isArray(orders) ? orders : [];
      if (typeof refreshMarketOrderList === "function") {
        refreshMarketOrderList();
      }
      if (typeof renderMyBuyOrdersSummary === "function") {
        renderMyBuyOrdersSummary();
      }
    });

    // 全体の買い注文一覧の同期（全プレイヤー分）
    window.globalSocket.on("market:buyOrder:listAllResult", (orders) => {
      window.marketAllBuyOrders = Array.isArray(orders) ? orders : [];
      if (typeof refreshMarketOrderList === "function") {
        refreshMarketOrderList();
      }
    });

    // ★ 買い注文マッチング成立：アイテムを受け取る
    window.globalSocket.on("market:buyOrder:matched", (data) => {
      try {
        const { category, itemKey, amount, pricePerItem } = data || {};
        if (!category || !itemKey || !amount) return;

        // インベントリにアイテムを追加
        addItemForBuy(category, itemKey, amount);

        const label = getItemLabel(category, itemKey);
        const totalPaid = (amount || 0) * (pricePerItem || 0);
        if (typeof appendLog === "function") {
          appendLog(
            `[市] 買い注文が成立！ ${label} を ${amount}個 受け取った（支払済 ${totalPaid}G）`
          );
        }

        // 買い注文一覧を再取得
        try {
          window.globalSocket.emit("market:buyOrder:list");
          window.globalSocket.emit("market:buyOrder:listAll");
        } catch (e2) {}

        if (typeof updateDisplay === "function") updateDisplay();
        if (typeof refreshMarketBuyList === "function") refreshMarketBuyList();
        if (typeof refreshMarketSellCandidates === "function") refreshMarketSellCandidates();
        if (typeof renderMyBuyOrdersSummary === "function") renderMyBuyOrdersSummary();
      } catch (e) {
        if (typeof appendLog === "function") {
          appendLog("[市] 買い注文マッチ処理中にエラーが発生しました");
        }
      }
    });

    try {
      window.globalSocket.emit("market:list");
      window.globalSocket.emit("market:buyOrder:list");
      window.globalSocket.emit("market:buyOrder:listAll");
    } catch (e2) {
    }
  } catch (e) {
  }
}

// グローバル公開
window.setupMarketSocketSync = setupMarketSocketSync;

// 既存の自動呼び出しは残す
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
      if (typeof renderMyListings === "function") {
        renderMyListings();
      }
    });
  }

  if (tabBuy) {
    tabBuy.addEventListener("click", () => {
      if (typeof refreshMarketBuyList === "function") {
        refreshMarketBuyList();
      }

      if (typeof initMarketOrderItemSelect === "function") {
        initMarketOrderItemSelect();
      }

      if (window.globalSocket) {
        try {
          window.globalSocket.emit("market:list");
          window.globalSocket.emit("market:buyOrder:list");
          window.globalSocket.emit("market:buyOrder:listAll");
        } catch (e) {
        }
      } else {
        if (typeof renderMyListings === "function") {
          renderMyListings();
        }
      }
    });
  }
});