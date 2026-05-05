// market-core1.js
// game-core-* と同じグローバル（money / weaponCounts / armors / potions / materials...）を前提にした市場ロジック

// =======================
// 市場（売り注文＋買い注文）
// =======================
// ※ MATERIAL_TIER_VALUES は craft-item-data.js 側で window.MATERIAL_TIER_VALUES として定義される前提

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
let marketListings = window.marketListings;

// 買い注文（window 配下に統一・自分の注文）
window.marketBuyOrders = window.marketBuyOrders || [];
let marketBuyOrders = window.marketBuyOrders;

// 全体の買い注文リスト（全プレイヤー分）
window.marketAllBuyOrders = window.marketAllBuyOrders || [];

// 前回サーバーから受け取った出品一覧（売れた判定用ローカルスナップショット）
window.prevServerMarketListings = window.prevServerMarketListings || [];
let prevServerMarketListings = window.prevServerMarketListings;

let marketOrderIdSeq = 1;
// クライアント側のローカルIDはあまり意味がなくなるが互換のため残す
let marketListingIdSeq = 1;

// 売り手視点の売却ログ（誰に・何を・いくつ・いくらで売ったか）
// 重要ログを [市] で強調
window.marketTradeLogs = window.marketTradeLogs || [];
let marketTradeLogs = window.marketTradeLogs;

function addSellLog(buyerLabel, category, itemId, amount, totalPrice) {
  const label = getItemLabel(category, itemId);
  const msg = `[市] ${buyerLabel} に ${label} を ${amount}個売った（${totalPrice}G）`;

  // セーブ対象の市場ログにも積む
  marketTradeLogs.push({
    time: Date.now(),
    buyer: buyerLabel,
    category,
    itemId,
    amount,
    totalPrice,
    message: msg
  });

  if (typeof appendLog === "function") {
    appendLog(msg);
  }
}

// -----------------------
// 素材ヘルパー
// -----------------------
//
// materials-core.js 側で materials[key] は [T1,T2,T3,...] 配列、
// getMatTotal / getMatTierCount / addMatTierCount が定義されている前提。
// ここでは旧仕様の t1/t2/t3 直接アクセスをやめ、
// それらのヘルパーを利用するだけにする。

// 合計から指定量を減らす（T1→T2→T3... の順で消費）
function consumeBaseMaterials(key, amount) {
  if (typeof window.getMatTotal !== "function" ||
      typeof window.getMatTierCount !== "function" ||
      typeof window.addMatTierCount !== "function") {
    return false;
  }

  const total = getMatTotal(key);
  if (total < amount) return false;

  let remain = amount;

  const maxTier = typeof window.MATERIAL_MAX_T === "number" ? window.MATERIAL_MAX_T : 3;
  for (let tier = 1; tier <= maxTier && remain > 0; tier++) {
    const have = getMatTierCount(key, tier);
    if (have <= 0) continue;
    const use = Math.min(have, remain);
    addMatTierCount(key, tier, -use);
    remain -= use;
  }

  return true;
}

// 指定量を追加（基本は T1 に入れる）
function addBaseMaterials(key, amount) {
  if (typeof window.addMatTierCount !== "function") return;
  amount = amount | 0;
  if (amount <= 0) return;
  addMatTierCount(key, 1, amount);
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
          appendLog(`[市] 警告: 市場出品時に倉庫内の武器インスタンスが不足しています（id=${itemId}）`);
        }
        return false;
      }
    } else {
      removed = amount;
    }

    weaponCounts[itemId] = have - removed;
    if (typeof equippedWeaponId !== "undefined" &&
        equippedWeaponId === itemId &&
        weaponCounts[itemId] <= 0) {
      equippedWeaponId = null;
      if (typeof window !== "undefined") {
        window.equippedWeaponId = null;
      }
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
          appendLog(`[市] 警告: 市場出品時に倉庫内の防具インスタンスが不足しています（id=${itemId}）`);
        }
        return false;
      }
    } else {
      removed = amount;
    }

    armorCounts[itemId] = have - removed;
    if (typeof equippedArmorId !== "undefined" &&
        equippedArmorId === itemId &&
        armorCounts[itemId] <= 0) {
      equippedArmorId = null;
      if (typeof window !== "undefined") {
        window.equippedArmorId = null;
      }
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
    if (itemId === "bomb")   return "爆弾";
    if (itemId === "bomb_T1") return "爆弾T1";
    if (itemId === "bomb_T2") return "爆弾T2";
    if (itemId === "bomb_T3") return "爆弾T3";

    if (Array.isArray(window.tools)) {
      const t = window.tools.find(x => x.id === itemId);
      if (t && t.name) return t.name;
    }
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
      const foods = Array.isArray(COOKING_RECIPES.food) ? COOKING_RECIPES.food : [];
      const drinks = Array.isArray(COOKING_RECIPES.drink) ? COOKING_RECIPES.drink : [];
      const fr = foods.find(r => r.id === itemId);
      if (fr) return fr.name;
      const dr = drinks.find(r => r.id === itemId);
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
      const foods = Array.isArray(COOKING_RECIPES.food) ? COOKING_RECIPES.food : [];
      const drinks = Array.isArray(COOKING_RECIPES.drink) ? COOKING_RECIPES.drink : [];
      const fr = foods.find(r => r.id === itemId);
      const dr = drinks.find(r => r.id === itemId);
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
    if (typeof appendLog === "function") appendLog("[市] 出品するアイテムを選んでください");
    return;
  }
  if(amount <= 0){
    if (typeof appendLog === "function") appendLog("[市] 出品個数は1以上にしてください");
    return;
  }
  if(price <= 0){
    if (typeof appendLog === "function") appendLog("[市] 価格は1G以上にしてください");
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
        appendLog("[市] 出品枠は5種類までです（価格違いも別枠として数えられます）");
      }
      return;
    }
  }

  // ロールバック用スナップショット
  const snapshot = {
    uiCategory,
    itemId,
    amount,
    restore: () => {
      if (uiCategory === "weapon") {
        weaponCounts[itemId] = (weaponCounts[itemId] || 0) + amount;
      } else if (uiCategory === "armor") {
        armorCounts[itemId] = (armorCounts[itemId] || 0) + amount;
      } else if (uiCategory === "potion") {
        potionCounts[itemId] = (potionCounts[itemId] || 0) + amount;
      } else if (uiCategory === "tool") {
        toolCounts[itemId] = (toolCounts[itemId] || 0) + amount;
      } else if (uiCategory === "materialBase" || uiCategory === "material") {
        if (itemId === "wood" || itemId === "ore" || itemId === "herb" ||
            itemId === "cloth" || itemId === "leather" || itemId === "water") {
          addBaseMaterials(itemId, amount);
        } else if (itemId === RARE_GATHER_ITEM_ID && typeof itemCounts === "object") {
          itemCounts[itemId] = (itemCounts[itemId] || 0) + amount;
        } else if (typeof intermediateMats === "object" && intermediateMats[itemId] != null) {
          intermediateMats[itemId] = (intermediateMats[itemId] || 0) + amount;
        } else if (typeof cookedFoods === "object" && cookedFoods[itemId]) {
          cookedFoods[itemId] = (cookedFoods[itemId] || 0) + amount;
        } else if (typeof cookedDrinks === "object" && cookedDrinks[itemId]) {
          cookedDrinks[itemId] = (cookedDrinks[itemId] || 0) + amount;
        }
      } else if (uiCategory === "materialInter") {
        if (typeof intermediateMats === "object") {
          intermediateMats[itemId] = (intermediateMats[itemId] || 0) + amount;
        }
      } else if (uiCategory === "cooking") {
        if (typeof cookedFoods === "object" && cookedFoods[itemId]) {
          cookedFoods[itemId] = (cookedFoods[itemId] || 0) + amount;
        } else if (typeof cookedDrinks === "object" && cookedDrinks[itemId]) {
          cookedDrinks[itemId] = (cookedDrinks[itemId] || 0) + amount;
        }
      }
    }
  };

  // ★ 先に在庫を減らしてからサーバーに出品要求を送る（幽霊出品対策）
  if(!removeItemForSell(uiCategory, itemId, amount)){
    if (typeof appendLog === "function") appendLog("[市] 手持ちの個数が足りません");
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
            const errMsg = res && res.error ? res.error : "出品に失敗しました";
            if (typeof appendLog === "function") appendLog(`[市] ${errMsg}`);

            // サーバー側で失敗した場合は在庫をロールバック
            try {
              snapshot.restore();
              if (typeof updateDisplay === "function") updateDisplay();
              if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
              if (typeof refreshMarketSellCandidates === "function") {
                refreshMarketSellCandidates();
              }
              if (typeof refreshMarketSellItems === "function") {
                refreshMarketSellItems();
              }
            } catch (e2) {
            }

            return;
          }

          if (res.matchedAmount && res.matchedAmount > 0) {
            const immediateEarning = res.matchedAmount * price;
            money += immediateEarning;
            const matchMsg = `[市] ${label} が買い注文に ${res.matchedAmount}個 即売れした（${immediateEarning}G）`;
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
                price: serverListing.price !=null ? serverListing.price : price,
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

          const msg = `[市] ${label} を ${amount}個、1個${price}Gで出品した`;
          if (typeof appendLog === "function") appendLog(msg);
        }
      );
      return;
    } catch (e) {
      if (typeof appendLog === "function") appendLog("[市] オンライン市場への出品に失敗しました");
      // emit 例外時もロールバック
      try {
        snapshot.restore();
        if (typeof updateDisplay === "function") updateDisplay();
        if (typeof refreshWarehouseUI === "function") refreshWarehouseUI();
        if (typeof refreshMarketSellCandidates === "function") {
          refreshMarketSellCandidates();
        }
        if (typeof refreshMarketSellItems === "function") {
          refreshMarketSellItems();
        }
      } catch (e2) {
      }
      return;
    }
  }

  // オフライン市場: 従来どおり、そのまま出品確定
  const listing = {
    id: marketListingIdSeq++,
    sellerId: "player",
    itemKey: itemId,
    category: categoryForMarket,
    amount,
    price
  };
  marketListings.push(listing);

  const msg = `[市] ${label} を ${amount}個、1個${price}Gで出品した`;
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

// 「自分だけ表示」トグル状態を保存
let marketOrderShowMineOnly = false;

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
    if (typeof appendLog === "function") appendLog("[市] 注文するアイテムを選んでください");
    return;
  }
  if(price <= 0 || amount <= 0){
    if (typeof appendLog === "function") appendLog("[市] 価格と最大個数は1以上にしてください");
    return;
  }

  const reservedMoney = price * amount;
  if(money < reservedMoney){
    if (typeof appendLog === "function") appendLog("[市] 注文用のお金が足りない");
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
            if (typeof appendLog === "function") appendLog(`[市] ${errMsg}`);
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
              price: serverOrder.price !=null ? serverOrder.price : price,
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
          const msg = `[市] ${label} を「1個${price}Gで${amount}個まで」注文として出した（${reservedMoneyLocal}G拘束・オンライン）`;
          if (typeof appendLog === "function") appendLog(msg);

          updateDisplay();
        }
      );
      return;
    } catch (e) {
      money += reservedMoney;
      if (typeof appendLog === "function") appendLog("[市] オンライン買い注文の登録に失敗しました");
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
  const msg = `[市] ${label} を「1個${price}Gで${amount}個まで」注文として出した（${reservedMoney}G拘束）`;
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

  const srcAll = Array.isArray(window.marketAllBuyOrders) ? window.marketAllBuyOrders : [];

  // 自分のID
  let myId = "player";
  if (window.globalSocket && window.globalSocket.id) {
    myId = window.globalSocket.id;
  }

  // トグル要素を用意
  const toggleId = "marketOrderShowMineOnly";
  let toggle = document.getElementById(toggleId);
  if (!toggle) {
    const parent = el.parentNode || document.body;
    const wrapper = document.createElement("div");
    wrapper.style.marginBottom = "4px";

    toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.id = toggleId;

    const label = document.createElement("label");
    label.htmlFor = toggleId;
    label.textContent = "自分の買い注文だけ表示";

    wrapper.appendChild(toggle);
    wrapper.appendChild(label);

    parent.insertBefore(wrapper, el);
  }

  // トグル状態を反映
  toggle.checked = marketOrderShowMineOnly;
  toggle.onchange = () => {
    marketOrderShowMineOnly = !!toggle.checked;
    refreshMarketOrderList();
  };

  // 実際に表示するリスト
  let src = srcAll;
  if (marketOrderShowMineOnly) {
    src = srcAll.filter(order => !order.buyerId || order.buyerId === myId);
  }

  if (!src.length) {
    el.textContent = marketOrderShowMineOnly
      ? "現在、自分の買い注文はありません。"
      : "現在、買い注文はありません。";
    el.style.whiteSpace = "normal";
    el.style.fontFamily = "";
    const cancelContainer = document.getElementById("marketOrderCancelContainer");
    if (cancelContainer) cancelContainer.innerHTML = "";
    return;
  }

  const header = "名前           残数/最大  価格    予約G";

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

  const cancelContainerId = "marketOrderCancelContainer";
  let cancelContainer = document.getElementById(cancelContainerId);
  if (!cancelContainer) {
    cancelContainer = document.createElement("div");
    cancelContainer.id = cancelContainerId;
    el.parentNode.insertBefore(cancelContainer, el.nextSibling);
  }
  cancelContainer.innerHTML = "";

  src.forEach(order => {
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
        if (typeof appendLog === "function") appendLog("[市] オンライン接続されていないため取消できません");
        return;
      }
      try {
        window.globalSocket.emit(
          "market:buyOrder:cancel",
          { orderId: order.id },
          (res) => {
            if (!res || !res.ok) {
              const errMsg = res && res.error ? res.error : "買い注文の取消に失敗しました";
              if (typeof appendLog === "function") appendLog(`[市] ${errMsg}`);
              return;
            }

            if (typeof res.returnMoney === "number" && res.returnMoney > 0) {
              money += res.returnMoney;
              if (typeof appendLog === "function") {
                appendLog(`[市] 買い注文の取消により ${res.returnMoney}G が返金されました`);
              }
            }

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
        if (typeof appendLog === "function") appendLog("[市] 買い注文の取消要求に失敗しました");
      }
    });

    row.appendChild(info);
    row.appendChild(btn);
    cancelContainer.appendChild(row);
  });
}

// -----------------------
// 原価（理論価値）計算ヘルパー（ITEM_META ベース）
// -----------------------
function getTheoreticalCost(category, itemId) {
  // 料理素材かどうか
  function isCookingIngredientId(id) {
    return /^meat_/.test(id) ||
           /^veg_/.test(id) ||
           /^grain_/.test(id) ||
           /^spice_/.test(id) ||
           /^fish_/.test(id);
  }

  // 一次素材1個あたりの価値
  function getBaseMaterialCost(baseKey, tier) {
    const tbl = window.MATERIAL_TIER_VALUES || {};
    if (tbl && typeof tbl === "object") {
      const key = typeof tier === "string" ? tier : ("t" + tier);
      if (typeof tbl[key] === "number") {
        return tbl[key];
      }
    }

    if (tier === "t1" || tier === 1) return 3;
    if (tier === "t2" || tier === 2) return 5;
    if (tier === "t3" || tier === 3) return 10;
    if (tier === "t4" || tier === 4) return 15;
    if (tier === "t5" || tier === 5) return 25;
    if (tier === "t6" || tier === 6) return 40;
    if (tier === "t7" || tier === 7) return 60;
    if (tier === "t8" || tier === 8) return 90;
    if (tier === "t9" || tier === 9) return 130;
    if (tier === "t10" || tier === 10) return 180;
    return 0;
  }

  // cost: { itemId: amount } を一次素材ベースで評価
  function getCostFromCostObject(cost) {
    if (!cost || typeof cost !== "object") return 0;

    let total = 0;
    Object.keys(cost).forEach(id => {
      const amount = cost[id] || 0;
      if (!amount) return;

      // 料理素材は一律 5G
      if (isCookingIngredientId(id)) {
        total += COOKING_INGREDIENT_BASE_VALUE * amount;
        return;
      }

      // 一次素材 or 中間素材かを判定するために parseTieredId を利用
      let tierNum = null;
      let baseId = null;
      if (typeof window.parseTieredId === "function") {
        const parsed = window.parseTieredId(id);
        if (parsed && parsed.baseId && parsed.tier) {
          baseId = parsed.baseId;
          tierNum = parsed.tier;
        }
      }

      if (tierNum != null && baseId) {
        const unit = getBaseMaterialCost(baseId, tierNum);
        total += unit * amount;
      }
      // ティア不明な ID は評価しない（旧フォールバック削除）
    });

    return total;
  }

  // ITEM_META(craft) ベースの原価
  function getRecipeCostByMeta(id) {
    if (typeof window.getItemMeta !== "function") return 0;
    const meta = window.getItemMeta(id);
    if (!meta || !meta.craft || !meta.craft.enabled) return 0;

    const craft = meta.craft;
    const costObj = craft.cost || {};
    const total = getCostFromCostObject(costObj);

    // 平均成功率（tier に応じた既存ロジックを維持）
    let avgRate = 0.7;
    let tierNum = null;

    if (typeof window.getItemTier === "function") {
      tierNum = window.getItemTier(id);
    }
    if (!tierNum && typeof window.parseTieredId === "function") {
      const parsed = window.parseTieredId(id);
      if (parsed && parsed.tier) tierNum = parsed.tier;
    }

    if (tierNum === 1) avgRate = 0.8;
    else if (tierNum === 2) avgRate = 0.7;
    else if (tierNum === 3) avgRate = 0.6;
    else if (tierNum >= 4) avgRate = 0.5;

    if (!avgRate || avgRate <= 0) avgRate = 0.7;

    const v = total / avgRate;
    return Math.ceil(v);
  }

  if (category === "material") {
    // 一次素材
    if (itemId === "wood" || itemId === "ore" || itemId === "herb" ||
        itemId === "cloth" || itemId === "leather" || itemId === "water") {
      // T1 の価値を代表値として使う（既存仕様を維持）
      return getBaseMaterialCost(itemId, "t1");
    }
    // レア採取素材
    if (itemId === RARE_GATHER_ITEM_ID) {
      return 50;
    }
    // 料理素材（cookingMat）は一律 5G
    if (isCookingIngredientId(itemId)) {
      return COOKING_INGREDIENT_BASE_VALUE;
    }
    // 中間素材 or 料理完成品など ITEM_META ベースで評価できる素材
    if (typeof window.getItemMeta === "function") {
      const meta = window.getItemMeta(itemId);
      if (meta && meta.craft && meta.craft.enabled) {
        return getRecipeCostByMeta(itemId);
      }
    }
    return 0;
  } else if (category === "weapon" || category === "armor" ||
             category === "potion" || category === "tool") {
    return getRecipeCostByMeta(itemId);
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