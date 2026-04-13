// market-core1.js
// game-core-* と同じグローバル（money / weaponCounts / armors / potions / materials...）を前提にした市場ロジック

// =======================
// 市場（売り注文＋買い注文）
// =======================
// ※ MATERIAL_TIER_VALUES は craft-data.js 側で window.MATERIAL_TIER_VALUES として定義される前提

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

// 売り注文（window 配下に統一）
window.marketListings = window.marketListings || [];
const marketListings = window.marketListings;

// 買い注文（window 配下に統一・自分の注文）
window.marketBuyOrders = window.marketBuyOrders || [];
const marketBuyOrders = window.marketBuyOrders;

// 全体の買い注文リスト（全プレイヤー分）
window.marketAllBuyOrders = window.marketAllBuyOrders || [];

// 前回サーバーから受け取った出品一覧（売れた判定用ローカルスナップショット）
window.prevServerMarketListings = window.prevServerMarketListings || [];
const prevServerMarketListings = window.prevServerMarketListings;

let marketOrderIdSeq = 1;
// クライアント側のローカルIDはあまり意味がなくなるが互換のため残す
let marketListingIdSeq = 1;

// 売り手視点の売却ログ（誰に・何を・いくつ・いくらで売ったか）
function addSellLog(buyerLabel, category, itemId, amount, totalPrice) {
  const label = getItemLabel(category, itemId);
  const msg = `${buyerLabel} に ${label} を ${amount}個売った（${totalPrice}G）`;
  if (typeof appendLog === "function") {
    appendLog(msg);
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
        if (typeof appendLog === "function") {
          appendLog(`警告: 市場出品時に倉庫内の武器インスタンスが不足しています（id=${itemId}）`);
        }
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
        if (typeof appendLog === "function") {
          appendLog(`警告: 市場出品時に倉庫内の防具インスタンスが不足しています（id=${itemId}）`);
        }
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

// =======================
// 自分の出品一覧を描画（表形式）
// =======================
function renderMyListings() {
  const el = document.getElementById("marketInfo");
  if (!el) return;

  let myId = "player";
  if (window.globalSocket && window.globalSocket.id) {
    myId = window.globalSocket.id;
  }

  const src = Array.isArray(window.marketListings) ? window.marketListings : [];

  const myListings = src.filter(l => l.sellerId === myId || l.owner === myId);

  if (myListings.length === 0) {
    el.textContent = "あなたの現在の出品はありません。";
    el.style.whiteSpace = "normal";
    el.style.fontFamily = "";
    return;
  }

  const grouped = new Map();
  for (const l of myListings) {
    const category = l.category;
    const itemKey  = l.itemKey || l.itemId;
    const price    = l.price || 0;
    const key = `${category}:${itemKey}:${price}`;

    const cur = grouped.get(key) || { category, itemId: itemKey, price, amount: 0 };
    cur.amount += l.amount || 0;
    grouped.set(key, cur);
  }

  const arr = Array.from(grouped.values()).sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    const la = getItemLabel(a.category, a.itemId);
    const lb = getItemLabel(b.category, b.itemId);
    if (la !== lb) return la.localeCompare(lb);
    return a.price - b.price;
  });

  const header = "名前           数量   単価";
  const rows = arr.map(g => {
    const label = getItemLabel(g.category, g.itemId);
    const nameCol = (label + "              ").slice(0, 12);
    const amountCol = String(g.amount).padStart(3, " ");
    const priceCol  = (String(g.price) + "G").padStart(6, " ");
    return `${nameCol}  x${amountCol}  @${priceCol}`;
  });

  el.textContent = ["出品中", header].concat(rows).join("\n");
  el.style.whiteSpace = "pre";
  el.style.fontFamily = "monospace";
}

// =======================
// 自分の買い注文一覧サマリ（専用要素 marketMyOrderSummary 用）
// =======================
function renderMyBuyOrdersSummary() {
  // ★修正: marketInfo ではなく専用要素を使う
  const el = document.getElementById("marketMyOrderSummary");
  if (!el) return;

  const src = Array.isArray(window.marketBuyOrders) ? window.marketBuyOrders : [];
  if (!src.length) {
    el.textContent = "あなたの現在の買い注文はありません。";
    el.style.whiteSpace = "normal";
    el.style.fontFamily = "";
    return;
  }

  const header = "名前           残数/最大  価格  予約G";
  const rows = src.map(order => {
    const label = getItemLabel(order.category, order.itemKey);
    const nameCol = (label + "              ").slice(0, 12);
    const remainCol = String(order.remainAmount).padStart(3, " ");
    const maxCol = String(order.maxAmount).padStart(3, " ");
    const priceCol = (String(order.price) + "G").padStart(6, " ");
    const reserved = order.reservedMoney || 0;
    const reservedCol = (String(reserved) + "G").padStart(6, " ");
    return `${nameCol}  ${remainCol}/${maxCol}  @${priceCol}  ${reservedCol}`;
  });

  el.textContent = ["買い注文", header].concat(rows).join("\n");
  el.style.whiteSpace = "pre";
  el.style.fontFamily = "monospace";
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
    if (typeof appendLog === "function") appendLog("出品するアイテムを選んでください");
    return;
  }
  if(amount <= 0){
    if (typeof appendLog === "function") appendLog("出品個数は1以上にしてください");
    return;
  }
  if(price <= 0){
    if (typeof appendLog === "function") appendLog("価格は1G以上にしてください");
    return;
  }

  let categoryForMarket = uiCategory;
  if (uiCategory === "materialBase" || uiCategory === "materialInter" || uiCategory === "cooking") {
    categoryForMarket = "material";
  }

  {
    let myId = "player";
    if (window.globalSocket && window.globalSocket.id) {
      myId = window.globalSocket.id;
    }

    const src = Array.isArray(window.marketListings) ? window.marketListings : [];
    const myListings = src.filter(l => l.sellerId === myId || l.owner === myId);

    const kindSet = new Set();
    for (const l of myListings) {
      const cat = l.category;
      const id  = l.itemKey || l.itemId;
      const p   = l.price || 0;
      kindSet.add(`${cat}:${id}:${p}`);
    }

    const newKey = `${categoryForMarket}:${itemId}:${price}`;
    if (!kindSet.has(newKey) && kindSet.size >= 5) {
      if (typeof appendLog === "function") {
        appendLog("出品枠は5種類までです（価格違いも別枠として数えられます）");
      }
      return;
    }
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
            const errMsg = res && res.error ? res.error : "出品に失敗しました";
            if (typeof appendLog === "function") appendLog(errMsg);
            return;
          }

          if(!removeItemForSell(uiCategory, itemId, amount)){
            if (typeof appendLog === "function") appendLog("手持ちの個数が足りません");
            return;
          }

          if (res.matchedAmount && res.matchedAmount > 0) {
            const immediateEarning = res.matchedAmount * price;
            money += immediateEarning;
            const matchMsg = `${label} が買い注文に ${res.matchedAmount}個 即売れした（${immediateEarning}G）`;
            if (typeof appendLog === "function") appendLog(matchMsg);
          }

          try {
            let myId = "player";
            if (window.globalSocket && window.globalSocket.id) {
              myId = window.globalSocket.id;
            }
            const serverListing = res.listing || {};
            if (serverListing && serverListing.id != null && serverListing.amount > 0) {
              const newListing = {
                id: serverListing.id,
                category: serverListing.category || categoryForMarket,
                itemId: serverListing.itemKey || itemKey,
                itemKey: serverListing.itemKey || itemKey,
                price: serverListing.price != null ? serverListing.price : price,
                amount: serverListing.amount,
                sellerId: serverListing.sellerId || myId,
                owner: serverListing.sellerId || myId
              };
              window.marketListings.push(newListing);
            }
          } catch (ePush) {
          }

          if (typeof updateDisplay === "function") {
            updateDisplay();
          }
          if (typeof refreshWarehouseUI === "function") {
            refreshWarehouseUI();
          }
          if (typeof refreshMarketSellCandidates === "function") {
            refreshMarketSellCandidates();
          }
          if (typeof refreshMarketSellItems === "function") {
            refreshMarketSellItems();
          }
          if (typeof refreshMarketBuyList === "function") {
            refreshMarketBuyList();
          }
          if (typeof renderMyListings === "function") {
            renderMyListings();
          }

          const msg = `${label} を ${amount}個、1個${price}Gで出品した`;
          if (typeof appendLog === "function") appendLog(msg);
        }
      );
      return;
    } catch (e) {
      if (typeof appendLog === "function") appendLog("オンライン市場への出品に失敗しました");
      return;
    }
  }

  if(!removeItemForSell(uiCategory, itemId, amount)){
    if (typeof appendLog === "function") appendLog("手持ちの個数が足りません");
    return;
  }

  const listing = {
    id: marketListingIdSeq++,
    sellerId: "player",
    itemKey: itemId,
    category: categoryForMarket,
    amount,
    price
  };
  marketListings.push(listing);

  const msg = `${label} を ${amount}個、1個${price}Gで出品した`;
  if (typeof appendLog === "function") appendLog(msg);

  updateDisplay();
  refreshMarketSellCandidates();
  refreshMarketSellItems();
  refreshMarketBuyList();
  renderMyListings();
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
    if (typeof appendLog === "function") appendLog("注文するアイテムを選んでください");
    return;
  }
  if(price <= 0 || amount <= 0){
    if (typeof appendLog === "function") appendLog("価格と最大個数は1以上にしてください");
    return;
  }

  const reservedMoney = price * amount;
  if(money < reservedMoney){
    if (typeof appendLog === "function") appendLog("注文用のお金が足りない");
    return;
  }
  money -= reservedMoney;

  if (window.globalSocket) {
    try {
      const reservedMoneyLocal = reservedMoney;

      window.globalSocket.emit(
        "market:buyOrder",
        { category, itemKey: itemId, price, amount },
        (res) => {
          if (!res || !res.ok) {
            money += reservedMoneyLocal;
            const errMsg = res && res.error ? res.error : "買い注文の登録に失敗しました";
            if (typeof appendLog === "function") appendLog(errMsg);
            updateDisplay();
            return;
          }

          try {
            let buyerId = "player";
            if (window.globalSocket && window.globalSocket.id) {
              buyerId = window.globalSocket.id;
            }
            const serverOrder = res.order || {};
            const order = {
              id: serverOrder.id != null ? serverOrder.id : (marketOrderIdSeq++),
              buyerId,
              category: serverOrder.category || category,
              itemKey: serverOrder.itemKey || itemId,
              price: serverOrder.price != null ? serverOrder.price : price,
              maxAmount: serverOrder.maxAmount != null ? serverOrder.maxAmount : amount,
              remainAmount: serverOrder.remainAmount != null ? serverOrder.remainAmount : amount,
              reservedMoney: reservedMoneyLocal
            };
            window.marketBuyOrders.push(order);
            if (typeof refreshMarketOrderList === "function") {
              refreshMarketOrderList();
            }
            if (typeof renderMyBuyOrdersSummary === "function") {
              renderMyBuyOrdersSummary();
            }
          } catch (ePushOrder) {
          }

          const label = getItemLabel(category, itemId);
          const msg = `${label} を「1個${price}Gで${amount}個まで」注文として出した（${reservedMoneyLocal}G拘束・オンライン）`;
          if (typeof appendLog === "function") appendLog(msg);

          updateDisplay();
        }
      );
      return;
    } catch (e) {
      money += reservedMoney;
      if (typeof appendLog === "function") appendLog("オンライン買い注文の登録に失敗しました");
      updateDisplay();
      return;
    }
  }

  const order = {
    id: marketOrderIdSeq++,
    buyerId: "player",
    category,
    itemKey: itemId,
    price,
    maxAmount: amount,
    remainAmount: amount,
    reservedMoney
  };
  marketBuyOrders.push(order);

  const label = getItemLabel(category, itemId);
  const msg = `${label} を「1個${price}Gで${amount}個まで」注文として出した（${reservedMoney}G拘束）`;
  if (typeof appendLog === "function") appendLog(msg);

  updateDisplay();
  refreshMarketOrderList();
  if (typeof renderMyBuyOrdersSummary === "function") {
    renderMyBuyOrdersSummary();
  }
}

function doMarketOrder() {
  doMarketBuyOrder();
}

// 全体の買い注文一覧（上側の枠）
function refreshMarketOrderList(){
  const el = document.getElementById("marketOrderList");
  if (!el) return;

  const src = Array.isArray(window.marketAllBuyOrders) ? window.marketAllBuyOrders : [];

  if (!src.length) {
    el.textContent = "現在、買い注文はありません。";
    el.style.whiteSpace = "normal";
    el.style.fontFamily = "";
    return;
  }

  const header = "名前           残数/最大  価格    予約G";

  // 文字表示に加えて、「自分の注文にはキャンセルボタン」を付ける
  // （サーバの market:buyOrder:cancel ACK で returnMoney を受け取り、拘束Gを返金する）
  const lines = ["買い注文一覧", header];
  src.forEach(order => {
    const label = getItemLabel(order.category, order.itemKey || order.itemId);
    const nameCol = (label + "              ").slice(0, 12);

    const remainCol = String(order.remainAmount).padStart(3, " ");
    const maxCol    = String(order.maxAmount).padStart(3, " ");
    const priceCol  = (String(order.price) + "G").padStart(6, " ");

    const reserved   = order.reservedMoney || 0;
    const reservedCol = (String(reserved) + "G").padStart(6, " ");

    lines.push(`${nameCol}  ${remainCol}/${maxCol}  @${priceCol}  ${reservedCol}`);
  });

  el.textContent = lines.join("\n");
  el.style.whiteSpace = "pre";
  el.style.fontFamily = "monospace";

  // ここから下は、キャンセルボタン用の簡易 UI を別要素に作る（仕様を変えず「機能追加」のみ）
  const cancelContainerId = "marketOrderCancelContainer";
  let cancelContainer = document.getElementById(cancelContainerId);
  if (!cancelContainer) {
    cancelContainer = document.createElement("div");
    cancelContainer.id = cancelContainerId;
    el.parentNode.insertBefore(cancelContainer, el.nextSibling);
  }
  cancelContainer.innerHTML = "";

  // 自分のソケットID
  let myId = "player";
  if (window.globalSocket && window.globalSocket.id) {
    myId = window.globalSocket.id;
  }

  src.forEach(order => {
    // server 側では buyerId を持っているので、それが自分のものだけキャンセルボタンを出す前提
    if (order.buyerId && order.buyerId !== myId) return;

    const row = document.createElement("div");
    row.className = "market-order-row";

    const label = getItemLabel(order.category, order.itemKey || order.itemId);
    const info = document.createElement("span");
    info.textContent = `${label} 残${order.remainAmount}/${order.maxAmount} @${order.price}G`;

    const btn = document.createElement("button");
    btn.textContent = "取消";
    btn.addEventListener("click", () => {
      if (!window.globalSocket) {
        if (typeof appendLog === "function") appendLog("オンライン接続されていないため取消できません");
        return;
      }
      try {
        window.globalSocket.emit(
          "market:buyOrder:cancel",
          { orderId: order.id },
          (res) => {
            if (!res || !res.ok) {
              const errMsg = res && res.error ? res.error : "買い注文の取消に失敗しました";
              if (typeof appendLog === "function") appendLog(errMsg);
              return;
            }

            // サーバー ACK で返ってきた returnMoney を返金（server.js 側修正前提）
            if (typeof res.returnMoney === "number" && res.returnMoney > 0) {
              money += res.returnMoney;
              if (typeof appendLog === "function") {
                appendLog(`買い注文の取消により ${res.returnMoney}G が返金されました`);
              }
            }

            // ローカル一覧も更新要求
            try {
              window.globalSocket.emit("market:buyOrder:list");
              window.globalSocket.emit("market:buyOrder:listAll");
            } catch (e2) {
            }

            if (typeof updateDisplay === "function") {
              updateDisplay();
            }
          }
        );
      } catch (e) {
        if (typeof appendLog === "function") appendLog("買い注文の取消要求に失敗しました");
      }
    });

    row.appendChild(info);
    row.appendChild(btn);
    cancelContainer.appendChild(row);
  });
}