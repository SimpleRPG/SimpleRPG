// market-core.js
// game-core-* と同じグローバル（money / weaponCounts / armors / potions / materials...）を前提にした市場ロジック

// =======================
// 市場（売り注文＋買い注文）
// =======================
// 素材ティアごとのベース価値
// T1: 3G, T2: 5G, T3: 10G
const MATERIAL_TIER_VALUES = {
  t1: 3,
  t2: 5,
  t3: 10
};

// 料理素材（レシピに使う素材）は一律 5G 相当
const COOKING_INGREDIENT_BASE_VALUE = 5;

// NPC商人名リスト
const NPC_MERCHANT_NAMES = [
  "行商人ギルバート",
  "露店商ミレーヌ",
  "雑貨屋ボルド",
  "旅商人エレナ",
  "貴族商会の使いリュシアン",
  "鍛冶ギルドの弟子ロルフ",
  "薬草商サラサ",
  "魚問屋タリオ",
  "古物商ニムロド",
  "行李担ぎのヨアヒム",
  "宿屋兼雑貨屋のマルタ",
  "旅回りの魔導書商メルティナ",
  "地下市場の仲買人グレン",
  "商人ギルド書記フィーネ",
  "駆け出し商人カイ",
  "豪商バルドゥイン",
  "行商夫婦レオ＆カナリア",
  "小間物屋リゼット",
  "香辛料商ハディール",
  "羊毛商ブラム"
];

function getRandomNpcMerchantName() {
  if (!Array.isArray(NPC_MERCHANT_NAMES) || NPC_MERCHANT_NAMES.length === 0) {
    return "名無しの行商人";
  }
  const i = Math.floor(Math.random() * NPC_MERCHANT_NAMES.length);
  return NPC_MERCHANT_NAMES[i];
}

// 売り注文
let marketListings = [];
// 買い注文
let marketBuyOrders = [];
// 取引ログ
let marketTradeLogs = [];

let marketOrderIdSeq = 1;
// クライアント側のローカルIDはあまり意味がなくなるが互換のため残す
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
function consumeBaseMaterials(key, amount) {
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
function addBaseMaterials(key, amount) {
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

    let removed = 0;
    if (Array.isArray(window.weaponInstances)) {
      for (let i = 0; i < weaponInstances.length && removed < amount; i++) {
        const inst = weaponInstances[i];
        if (!inst || inst.id !== itemId) continue;
        const loc = inst.location || "warehouse";
        if (loc !== "warehouse") continue;

        weaponInstances.splice(i, 1);
        i--;
        removed++;
      }
      if (removed < amount) {
        appendLog(`警告: 市場出品時に倉庫内の武器インスタンスが不足しています（id=${itemId}）`);
        return false;
      }
    } else {
      removed = amount;
    }

    weaponCounts[itemId] = have - removed;
    if(equippedWeaponId === itemId && weaponCounts[itemId] <= 0){
      equippedWeaponId = null;
    }
    return true;
  } else if(category === "armor"){
    const have = armorCounts[itemId] || 0;
    if(have < amount) return false;

    let removed = 0;
    if (Array.isArray(window.armorInstances)) {
      for (let i = 0; i < armorInstances.length && removed < amount; i++) {
        const inst = armorInstances[i];
        if (!inst || inst.id !== itemId) continue;
        const loc = inst.location || "warehouse";
        if (loc !== "warehouse") continue;

        armorInstances.splice(i, 1);
        i--;
        removed++;
      }
      if (removed < amount) {
        appendLog(`警告: 市場出品時に倉庫内の防具インスタンスが不足しています（id=${itemId}）`);
        return false;
      }
    } else {
      removed = amount;
    }

    armorCounts[itemId] = have - removed;
    if(equippedArmorId === itemId && armorCounts[itemId] <= 0){
      equippedArmorId = null;
    }
    return true;
  } else if(category === "potion"){
    const have = potionCounts[itemId] || 0;
    if(have < amount) return false;
    potionCounts[itemId] = have - amount;
  } else if(category === "tool"){
    const have = toolCounts[itemId] || 0;
    if (have < amount) return false;
    toolCounts[itemId] = have - amount;
  } else if(category === "materialBase"){
    if (itemId === "wood" || itemId === "ore" || itemId === "herb" ||
        itemId === "cloth" || itemId === "leather" || itemId === "water") {
      if (!consumeBaseMaterials(itemId, amount)) return false;
    } else if (itemId === RARE_GATHER_ITEM_ID) {
      if (typeof itemCounts !== "object") return false;
      const have = itemCounts[itemId] || 0;
      if (have < amount) return false;
      itemCounts[itemId] = have - amount;
    } else {
      return false;
    }
  } else if(category === "materialInter"){
    if (typeof intermediateMats !== "object" || intermediateMats[itemId] == null) return false;
    const have = intermediateMats[itemId] || 0;
    if (have < amount) return false;
    intermediateMats[itemId] = have - amount;
  } else if(category === "cooking"){
    if (typeof cookedFoods === "object" && cookedFoods[itemId]) {
      const have = cookedFoods[itemId] || 0;
      if (have < amount) return false;
      cookedFoods[itemId] = have - amount;
    } else if (typeof cookedDrinks === "object" && cookedDrinks[itemId]) {
      const have = cookedDrinks[itemId] || 0;
      if (have < amount) return false;
      cookedDrinks[itemId] = have - amount;
    } else {
      return false;
    }
  } else if(category === "material"){
    if (itemId === "wood" || itemId === "ore" || itemId === "herb" ||
        itemId === "cloth" || itemId === "leather" || itemId === "water") {
      if (!consumeBaseMaterials(itemId, amount)) return false;
    }
    else if (itemId === RARE_GATHER_ITEM_ID) {
      if (typeof itemCounts !== "object") return false;
      const have = itemCounts[itemId] || 0;
      if (have < amount) return false;
      itemCounts[itemId] = have - amount;
    }
    else if (typeof intermediateMats === "object" && intermediateMats[itemId] != null) {
      const have = intermediateMats[itemId] || 0;
      if (have < amount) return false;
      intermediateMats[itemId] = have - amount;
    } else if (typeof cookedFoods === "object" && cookedFoods[itemId]) {
      const have = cookedFoods[itemId] || 0;
      if (have < amount) return false;
      cookedFoods[itemId] = have - amount;
    } else if (typeof cookedDrinks === "object" && cookedDrinks[itemId]) {
      const have = cookedDrinks[itemId] || 0;
      if (have < amount) return false;
      cookedDrinks[itemId] = have - amount;
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
  } else if(category === "tool"){
    if (itemId === "bomb") return "爆弾";
    if (itemId === "bomb_T1") return "爆弾T1";
    if (itemId === "bomb_T2") return "爆弾T2";
    if (itemId === "bomb_T3") return "爆弾T3";
    return itemId;
  } else if(category === "materialBase"){
    const baseNames = { wood:"木", ore:"鉱石", herb:"草", cloth:"布", leather:"皮", water:"水" };
    if (baseNames[itemId]) return baseNames[itemId];
    if (itemId === RARE_GATHER_ITEM_ID) return RARE_GATHER_ITEM_NAME;
    return itemId;
  } else if(category === "materialInter"){
    if (Array.isArray(INTERMEDIATE_MATERIALS)) {
      const m = INTERMEDIATE_MATERIALS.find(m => m.id === itemId);
      if (m) return m.name;
    }
    return itemId;
  } else if(category === "cooking"){
    if (typeof COOKING_RECIPES !== "undefined") {
      const fr = COOKING_RECIPES.food.find(r => r.id === itemId);
      if (fr) return fr.name;
      const dr = COOKING_RECIPES.drink.find(r => r.id === itemId);
      if (dr) return dr.name;
    }
    return itemId;
  } else if(category === "material"){
    const baseNames = { wood:"木", ore:"鉱石", herb:"草", cloth:"布", leather:"皮", water:"水" };
    if (baseNames[itemId]) return baseNames[itemId];
    if (itemId === RARE_GATHER_ITEM_ID) return RARE_GATHER_ITEM_NAME;

    if (Array.isArray(INTERMEDIATE_MATERIALS)) {
      const m = INTERMEDIATE_MATERIALS.find(m => m.id === itemId);
      if (m) return m.name;
    }

    if (typeof COOKING_RECIPES !== "undefined") {
      const fr = COOKING_RECIPES.food.find(r => r.id === itemId);
      const dr = COOKING_RECIPES.drink.find(r => r.id === itemId);
      if (fr) return fr.name;
      if (dr) return dr.name;
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

  const uiCategory = catSel.value;
  const itemId     = itemSel.value;
  const amount     = parseInt(amtEl.value,10) || 0;
  const price      = parseInt(priceEl.value,10) || 0;

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

  let categoryForMarket = uiCategory;
  if (uiCategory === "materialBase" || uiCategory === "materialInter" || uiCategory === "cooking") {
    categoryForMarket = "material";
  }

  if(!removeItemForSell(uiCategory, itemId, amount)){
    setLog("手持ちの個数が足りません");
    return;
  }

  const label = getItemLabel(uiCategory, itemId);

  if (window.globalSocket) {
    try {
      const itemKey = itemId;

      window.globalSocket.emit(
        "market:sell",
        { itemKey, category: categoryForMarket, amount, price },
        (res) => {
          if (!res || !res.ok) {
            addItemForBuy(categoryForMarket, itemId, amount);
            const errMsg = res && res.error ? res.error : "出品に失敗しました";
            setLog(errMsg);
            return;
          }

          setLog(`${label} を ${amount}個、1個${price}Gで出品した（オンライン市場）`);
          addMarketLog(`出品: ${label} x${amount} @${price}G`);

          // サーバー側の market:update を待つが、保険でリスト要求
          try {
            window.globalSocket.emit("market:list");
          } catch (e2) {
            console.log("market:list emit error after sell", e2);
          }
        }
      );
      return;
    } catch (e) {
      console.log("market:sell emit error", e);
      addItemForBuy(categoryForMarket, itemId, amount);
      setLog("オンライン市場への出品に失敗しました");
      return;
    }
  }

  const listing = {
    id: marketListingIdSeq++,
    category: categoryForMarket,
    itemId,
    price,
    amount,
    owner: "player"
  };
  marketListings.push(listing);

  setLog(`${label} を ${amount}個、1個${price}Gで出品した`);
  addMarketLog(`出品: ${label} x${amount} @${price}G`);

  updateDisplay();
  refreshMarketSellCandidates();
  refreshMarketSellItems();
  refreshMarketBuyList();
}

// -----------------------
// 出品リストをまとめる
// -----------------------
function buildMarketStacks(){
  const map = new Map();
  marketListings.forEach(l => {
    // サーバーから来る listing に itemKey が入っている場合への保険
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
// 購入シミュレーション＆実行
// -----------------------
function simulateMarketBuy(stackKey, mode, amount){
  const [category, itemId] = stackKey.split(":");
  const listings = marketListings
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
       category === "potion" || category === "tool"  ||
       category === "material")) {

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
    else if (typeof intermediateMats === "object" && intermediateMats[itemId] != null) {
      intermediateMats[itemId] = (intermediateMats[itemId] || 0) + amount;
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

function doMarketBuy(stackKey, mode, amount){
  const sim = simulateMarketBuy(stackKey, mode, amount);
  if(!sim || sim.buyableCount <= 0) return;

  if (money < sim.totalPrice) {
    setLog("お金が足りません");
    return;
  }

  const [category, itemId] = stackKey.split(":");
  let remain = sim.buyableCount;
  let costLeft = sim.totalPrice;

  const listings = marketListings
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

  if (window.globalSocket) {
    try {
      let index = 0;
      const doNext = () => {
        if (index >= consumeList.length) {
          money -= sim.totalPrice;
          addItemForBuy(category, itemId, sim.buyableCount);
          const label = getItemLabel(category, itemId);
          setLog(`${label} を ${sim.buyableCount}個購入した（合計${sim.totalPrice}G）`);
          addMarketLog(`購入: ${label} x${sim.buyableCount} @合計${sim.totalPrice}G`);

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
              setLog("購入処理に失敗しました");
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
// 原価（理論価値）計算ヘルパー
// -----------------------
function getTheoreticalCost(category, itemId) {
  function getBaseMaterialCost(baseKey, tier) {
    const tbl = MATERIAL_TIER_VALUES || {};
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

  const labelJa = MARKET_CATEGORY_LABELS_JA[hot] || hot;
  addMarketLog(`市場ニュース: 現在「${labelJa}」カテゴリの取引が活況だ！`);
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

function rollNpcMarketBuy() {
  if (!marketListings.length) return;

  const indices = [...marketListings.keys()];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const MAX_CHECK = Math.min(5, indices.length);
  for (let idx = 0; idx < MAX_CHECK; idx++) {
    const li = marketListings[indices[idx]];
    if (!li || li.amount <= 0) continue;

    const baseValue = getMarketBaseValue(li.category, li.itemId || li.itemKey);
    if (baseValue <= 0) continue;

    const prob = getNpcBuyProb(baseValue, li.price, li.category);
    if (Math.random() >= prob) continue;

    const buyAmount = Math.max(1, Math.floor(li.amount * 0.2)) || 1;
    const actualBuy = Math.min(li.amount, buyAmount);
    if (actualBuy <= 0) continue;

    const totalPrice = actualBuy * li.price;

    money += totalPrice;

    const label = getItemLabel(li.category, li.itemId || li.itemKey);
    const npcName = getRandomNpcMerchantName();
    addMarketLog(`${npcName}が ${label} を市場から購入した（x${actualBuy} / ${totalPrice}G）`);

    li.amount -= actualBuy;
  }

  marketListings = marketListings.filter(l => l.amount > 0);

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

  const val = sel.value;
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
      console.log("market:listResult", serverListings);

      marketListings = (Array.isArray(serverListings) ? serverListings : []).map(l => ({
        id: l.id,
        category: l.category,
        itemId: l.itemKey || l.itemId,
        price: l.price,
        amount: l.amount,
        owner: l.sellerId || "server"
      }));

      refreshMarketBuyList();
    });

    window.globalSocket.on("market:update", (serverListings) => {
      console.log("market:update", serverListings);

      marketListings = (Array.isArray(serverListings) ? serverListings : []).map(l => ({
        id: l.id,
        category: l.category,
        itemId: l.itemKey || l.itemId,
        price: l.price,
        amount: l.amount,
        owner: l.sellerId || "server"
      }));

      refreshMarketBuyList();
    });

    // 接続済みなら初期リストを要求
    try {
      window.globalSocket.emit("market:list");
    } catch (e2) {
      console.log("initial market:list emit error (inside socket sync)", e2);
    }
  } catch (e) {
    console.log("market socket handlers error", e);
  }
}

// 読み込み時に「一度だけ」試す（globalSocket が既にあれば登録される）
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
      }
    });
  }
});