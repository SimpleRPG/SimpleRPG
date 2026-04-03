// market-core.js
// game-core-* と同じグローバル（money / weaponCounts / armors / potions / materials...）を前提にした市場ロジック

// =======================
// 市場（売り注文＋買い注文）
// =======================

// 売り注文
let marketListings = [];
// 買い注文
let marketBuyOrders = [];
// 取引ログ
let marketTradeLogs = [];

let marketOrderIdSeq = 1;
let marketListingIdSeq = 1;

function addMarketLog(msg){
  marketTradeLogs.unshift(msg);
  if(marketTradeLogs.length > 50){
    marketTradeLogs.pop();
  }
  const el = document.getElementById("marketInfo");
  if(el){
    el.textContent = marketTradeLogs.slice(0,3).join(" / ");
  }
}

// -----------------------
// 素材ヘルパー
// -----------------------

// materials[key].t1,t2,t3 の合算
function getMatTotal(key) {
  if (typeof materials !== "object") return 0;
  const m = materials[key];
  if (!m) return 0;
  return (m.t1 || 0) + (m.t2 || 0) + (m.t3 || 0);
}

// 合計から指定量を減らす（T1→T2→T3 の順で消費）
function consumeMaterials(key, amount) {
  if (typeof materials !== "object") return false;
  const m = materials[key];
  if (!m) return false;
  const total = getMatTotal(key);
  if (total < amount) return false;

  let remain = amount;

  const tiers = ["t1", "t2", "t3"];
  for (const t of tiers) {
    const have = m[t] || 0;
    if (have <= 0) continue;
    const use = Math.min(have, remain);
    m[t] = have - use;
    remain -= use;
    if (remain <= 0) break;
  }
  return true;
}

// 指定量を追加（基本は T1 に入れる）
function addMaterials(key, amount) {
  if (typeof materials !== "object") return;
  const m = materials[key];
  if (!m) return;
  m.t1 = (m.t1 || 0) + amount;
}

// -----------------------
// 在庫減少（出品時）
// -----------------------
function removeItemForSell(category, itemId, amount){
  if(category === "weapon"){
    const have = weaponCounts[itemId] || 0;
    if(have < amount) return false;
    weaponCounts[itemId] = have - amount;
    if(equippedWeaponId === itemId && weaponCounts[itemId] <= 0){
      equippedWeaponId = null;
    }
  } else if(category === "armor"){
    const have = armorCounts[itemId] || 0;
    if(have < amount) return false;
    armorCounts[itemId] = have - amount;
    if(equippedArmorId === itemId && armorCounts[itemId] <= 0){
      equippedArmorId = null;
    }
  } else if(category === "potion"){
    const have = potionCounts[itemId] || 0;
    if(have < amount) return false;
    potionCounts[itemId] = have - amount;
  } else if(category === "material"){
    // 基本素材: materials.xxx を利用
    if (itemId === "wood" || itemId === "ore" || itemId === "herb" ||
        itemId === "cloth" || itemId === "leather" || itemId === "water") {
      if (!consumeMaterials(itemId, amount)) return false;
    }
    // 中間素材（intermediateMats を game-core 側で持っている前提）
    else if (typeof intermediateMats === "object" && intermediateMats[itemId] != null) {
      const have = intermediateMats[itemId] || 0;
      if (have < amount) return false;
      intermediateMats[itemId] = have - amount;
    } else {
      return false;
    }
  } else {
    return false;
  }
  return true;
}

function getItemLabel(category, itemId){
  if(category === "weapon"){
    const w = weapons.find(x => x.id === itemId);
    return w ? w.name : itemId;
  } else if(category === "armor"){
    const a = armors.find(x => x.id === itemId);
    return a ? a.name : itemId;
  } else if(category === "potion"){
    const p = potions.find(x => x.id === itemId);
    return p ? p.name : itemId;
  } else if(category === "material"){
    const baseNames = { wood:"木", ore:"鉱石", herb:"草", cloth:"布", leather:"皮", water:"水" };
    if (baseNames[itemId]) return baseNames[itemId];

    // 中間素材なら INTERMEDIATE_MATERIALS から表示名を拾う
    if (Array.isArray(INTERMEDIATE_MATERIALS)) {
      const m = INTERMEDIATE_MATERIALS.find(m => m.id === itemId);
      if (m) return m.name;
    }
    return itemId;
  }
  return itemId;
}

function buildStackKey(category, itemId){
  return `${category}:${itemId}`;
}

// -----------------------
// 売却（出品）
// -----------------------
function doMarketSell(){
  const catSel = document.getElementById("marketSellCategory");
  const itemSel= document.getElementById("marketSellItem");
  const amtEl  = document.getElementById("marketSellAmount");
  const priceEl= document.getElementById("marketSellPrice");
  if(!catSel || !itemSel || !amtEl || !priceEl) return;

  const category = catSel.value;
  const itemId   = itemSel.value;
  const amount   = parseInt(amtEl.value,10) || 0;
  const price    = parseInt(priceEl.value,10) || 0;

  if(!itemId){
    setLog("出品するアイテムを選んでください");
    return;
  }
  if(amount <= 0){
    setLog("出品個数は1以上にしてください");
    return;
  }
  if(price <= 0){
    setLog("価格は1G以上にしてください");
    return;
  }

  if(!removeItemForSell(category, itemId, amount)){
    setLog("手持ちの個数が足りません");
    return;
  }

  const listing = {
    id: marketListingIdSeq++,
    category,
    itemId,
    price,       // 1個単価
    amount,      // 残り個数
    owner: "player" // 一人用なので固定
  };
  marketListings.push(listing);

  const label = getItemLabel(category, itemId);
  setLog(`${label} を ${amount}個、1個${price}Gで出品した`);
  addMarketLog(`出品: ${label} x${amount} @${price}G`);

  updateDisplay();
  refreshMarketSellCandidates();
  refreshMarketSellItems();
  refreshMarketBuyList();
}

// -----------------------
// 出品リストをまとめる（購入側表示用）
// -----------------------
function buildMarketStacks(){
  const map = new Map();
  marketListings.forEach(l => {
    const key = buildStackKey(l.category, l.itemId);
    let st = map.get(key);
    if(!st){
      st = {
        key,
        category: l.category,
        itemId: l.itemId,
        totalAmount: 0,
        minPrice: Infinity,
        maxPrice: 0,
        listings: []
      };
      map.set(key, st);
    }
    st.totalAmount += l.amount;
    st.minPrice = Math.min(st.minPrice, l.price);
    st.maxPrice = Math.max(st.maxPrice, l.price);
    st.listings.push(l);
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
// 購入シミュレーション＆実行
// -----------------------
function simulateMarketBuy(stackKey, mode, amount){
  const [category, itemId] = stackKey.split(":");
  const listings = marketListings
    .filter(l => l.category === category && l.itemId === itemId && l.amount > 0)
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
  if(category === "weapon"){
    weaponCounts[itemId] = (weaponCounts[itemId] || 0) + amount;
  } else if(category === "armor"){
    armorCounts[itemId] = (armorCounts[itemId] || 0) + amount;
  } else if(category === "potion"){
    // 修正: p.id ではなく itemId を利用（仕様そのままでバグだけ修正）
    potionCounts[itemId] = (potionCounts[itemId] || 0) + amount;
  } else if(category === "material"){
    // 基本素材は materials.xxx に追加
    if (itemId === "wood" || itemId === "ore" || itemId === "herb" ||
        itemId === "cloth" || itemId === "leather" || itemId === "water") {
      addMaterials(itemId, amount);
    }
    // 中間素材
    else if (typeof intermediateMats === "object" && intermediateMats[itemId] != null) {
      intermediateMats[itemId] = (intermediateMats[itemId] || 0) + amount;
    }
  }
}

function doMarketBuy(stackKey, mode, amount){
  const sim = simulateMarketBuy(stackKey, mode, amount);
  if(!sim || sim.buyableCount <= 0) return;

  const [category, itemId] = stackKey.split(":");
  let remain = sim.buyableCount;
  let costLeft = sim.totalPrice;

  const listings = marketListings
    .filter(l => l.category === category && l.itemId === itemId && l.amount > 0)
    .sort((a,b)=>a.price - b.price);

  for(const l of listings){
    if(remain <= 0) break;
    const canBuyFromThis = Math.min(l.amount, remain);
    const cost = canBuyFromThis * l.price;
    if(cost > costLeft) break;

    l.amount -= canBuyFromThis;
    remain -= canBuyFromThis;
    costLeft -= cost;
  }

  marketListings = marketListings.filter(l => l.amount > 0);

  money -= sim.totalPrice;
  addItemForBuy(category, itemId, sim.buyableCount);

  const label = getItemLabel(category, itemId);
  setLog(`${label} を ${sim.buyableCount}個購入した（合計${sim.totalPrice}G）`);
  addMarketLog(`購入: ${label} x${sim.buyableCount} @合計${sim.totalPrice}G`);

  updateDisplay();
  refreshMarketBuyList();
  refreshMarketSellCandidates();
  refreshMarketSellItems();
}

// -----------------------
// 買い注文（予約）
// -----------------------
function doMarketBuyOrder(){
  const sel = document.getElementById("marketOrderItem");
  const priceEl = document.getElementById("marketOrderPrice");
  const amtEl   = document.getElementById("marketOrderAmount");
  if(!sel || !priceEl || !amtEl) return;

  const val = sel.value; // "weapon:dagger" など
  const [category, itemId] = val.split(":");
  const price = parseInt(priceEl.value,10) || 0;
  const amount= parseInt(amtEl.value,10) || 0;

  if(!category || !itemId){
    setLog("注文するアイテムを選んでください");
    return;
  }
  if(price <= 0 || amount <= 0){
    setLog("価格と最大個数は1以上にしてください");
    return;
  }

  const reservedMoney = price * amount;
  if(money < reservedMoney){
    setLog("注文用のお金が足りない");
    return;
  }
  money -= reservedMoney;

  const order = {
    id: marketOrderIdSeq++,
    category,
    itemId,
    price,
    maxAmount: amount,
    remainAmount: amount,
    reservedMoney
  };
  marketBuyOrders.push(order);

  const label = getItemLabel(category, itemId);
  setLog(`${label} を「1個${price}Gで${amount}個まで」注文として出した（${reservedMoney}G拘束）`);
  addMarketLog(`買い注文: ${label} x${amount} @${price}G`);

  updateDisplay();
  refreshMarketOrderList();
}

// game-ui.js から呼ばれている名前に合わせるラッパー
function doMarketOrder() {
  doMarketBuyOrder();
}

function refreshMarketOrderList(){
  const el = document.getElementById("marketOrderList");
  if(!el) return;
  el.innerHTML = "";

  if(marketBuyOrders.length === 0){
    el.textContent = "現在、あなたの注文はありません。";
    return;
  }

  marketBuyOrders.forEach(order=>{
    const row = document.createElement("div");
    row.style.borderBottom = "1px dashed #4b3f72";
    row.style.padding = "2px 0";

    const label = getItemLabel(order.category, order.itemId);
    const usedAmount = order.maxAmount - order.remainAmount;
    const usedMoney  = usedAmount * order.price;
    const remainMoney= order.reservedMoney - usedMoney;

    row.textContent =
      `#${order.id} ${label} / 価格:${order.price}G / `+
      `最大${order.maxAmount}個（残り${order.remainAmount}個）/ `+
      `予約G:${order.reservedMoney}（未使用${remainMoney}G）`;

    el.appendChild(row);
  });
}

// =======================
// UI連動用 追加実装
// =======================

// 売り候補カテゴリとアイテムセレクト
function refreshMarketSellCandidates(){
  const catSel  = document.getElementById("marketSellCategory");
  if (!catSel) return;

  catSel.innerHTML = "";
  const cats = [
    { value: "weapon",   label: "武器" },
    { value: "armor",    label: "防具" },
    { value: "potion",   label: "ポーション" },
    { value: "material", label: "素材" }
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

  // 起動直後に core がまだなら、安全に抜ける（ログだけ出しておく）
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
  } else if (category === "material") {
    const mats = [
      { id:"wood",    name:"木",    count: getMatTotal("wood") },
      { id:"ore",     name:"鉱石",  count: getMatTotal("ore") },
      { id:"herb",    name:"草",    count: getMatTotal("herb") },
      { id:"cloth",   name:"布",    count: getMatTotal("cloth") },
      { id:"leather", name:"皮",    count: getMatTotal("leather") },
      { id:"water",   name:"水",    count: getMatTotal("water") }
    ];

    // 中間素材があれば追加
    if (typeof intermediateMats === "object") {
      if (Array.isArray(INTERMEDIATE_MATERIALS)) {
        INTERMEDIATE_MATERIALS.forEach(m => {
          const cnt = intermediateMats[m.id] || 0;
          if (cnt > 0) {
            mats.push({ id: m.id, name: m.name, count: cnt });
          }
        });
      } else {
        Object.keys(intermediateMats).forEach(id => {
          const cnt = intermediateMats[id] || 0;
          if (cnt > 0) {
            mats.push({ id, name: getItemLabel("material", id), count: cnt });
          }
        });
      }
    }

    mats.forEach(m=>{
      if (m.count > 0) {
        appendOption(m.id, `${m.name}（所持${m.count}）`);
      }
    });
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