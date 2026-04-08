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
// ※ゲーム全体の consumeMaterials(cost) と衝突しないように、市場専用の別名にする
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
        if (loc !== "warehouse") continue;   // 倉庫分だけ売る

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
    // 道具（爆弾など）は toolCounts を倉庫として扱う
    const have = toolCounts[itemId] || 0;
    if (have < amount) return false;
    toolCounts[itemId] = have - amount;
  } else if(category === "materialBase"){
    // 基本素材＋星屑: materials.xxx / itemCounts を利用
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
    // 中間素材（intermediateMats）
    if (typeof intermediateMats !== "object" || intermediateMats[itemId] == null) return false;
    const have = intermediateMats[itemId] || 0;
    if (have < amount) return false;
    intermediateMats[itemId] = have - amount;
  } else if(category === "cooking"){
    // 料理（倉庫の cookedFoods / cookedDrinks）
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
    // 旧仕様との互換用（内部カテゴリとして来る可能性がある）
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
    // 道具（爆弾など）は簡易ラベル
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
      if (fr) return fr.name;
      const dr = COOKING_RECIPES.drink.find(r => r.id === itemId);
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

  const uiCategory = catSel.value; // weapon / armor / potion / materialBase / materialInter / cooking / tool
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

  // 市場内部カテゴリ（一覧表示・購入側のフィルタ用）
  let categoryForMarket = uiCategory;
  if (uiCategory === "materialBase" || uiCategory === "materialInter" || uiCategory === "cooking") {
    categoryForMarket = "material";
  }

  if(!removeItemForSell(uiCategory, itemId, amount)){
    setLog("手持ちの個数が足りません");
    return;
  }

  const listing = {
    id: marketListingIdSeq++,
    category: categoryForMarket,
    itemId,
    price,       // 1個単価
    amount,      // 残り個数
    owner: "player" // 一人用なので固定
  };
  marketListings.push(listing);

  const label = getItemLabel(uiCategory, itemId);
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
  // 武器・防具・ポーション・道具・料理・素材はまとめて addItemToInventory に任せる
  if (typeof addItemToInventory === "function" &&
      (category === "weapon" || category === "armor" ||
       category === "potion" || category === "tool"  ||
       category === "material")) {

    for (let i = 0; i < amount; i++) {
      addItemToInventory(itemId, 1);
    }
    return;
  }

  // フォールバック（念のため残すなら）
  if(category === "weapon"){
    weaponCounts[itemId] = (weaponCounts[itemId] || 0) + amount;
  } else if(category === "armor"){
    armorCounts[itemId] = (armorCounts[itemId] || 0) + amount;
  } else if(category === "potion"){
    potionCounts[itemId] = (potionCounts[itemId] || 0) + amount;
  } else if(category === "tool"){
    toolCounts[itemId] = (toolCounts[itemId] || 0) + amount;
  } else if(category === "material"){
    // 基本素材は materials.xxx に追加
    if (itemId === "wood" || itemId === "ore" || itemId === "herb" ||
        itemId === "cloth" || itemId === "leather" || itemId === "water") {
      addBaseMaterials(itemId, amount);
    }
    // 星屑の結晶
    else if (itemId === RARE_GATHER_ITEM_ID) {
      if (typeof itemCounts === "object") {
        itemCounts[itemId] = (itemCounts[itemId] || 0) + amount;
      }
    }
    // 中間素材
    else if (typeof intermediateMats === "object" && intermediateMats[itemId] != null) {
      intermediateMats[itemId] = (intermediateMats[itemId] || 0) + amount;
    }
    // 料理（倉庫に入れる）
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

// ★ NPC 購入ロジック用：内部基準価格を返す（暫定実装）
// ここでは仕様をまだ変えず、「最安出品価格のみ」を使う状態を維持している。
// 素材・クラフト原価を使った理論値を組み込みたくなったら、
// ここに getItemTheoreticalBaseValue(category, itemId) を足して
// min/ max を取る実装を追加する。
function getMarketBaseValue(category, itemId) {
  const stacks = buildMarketStacks();
  const st = stacks.find(s => s.category === category && s.itemId === itemId);
  if (!st) return 0;
  return st.minPrice || 0;
}

// =======================
// 市場イベント（ホットカテゴリ）
// =======================

// イベント候補カテゴリ
const MARKET_HOT_CATEGORY_CANDIDATES = ["potion", "material", "weapon", "armor", "cooking", "tool"];

// カテゴリ表示名（ニュース用）
const MARKET_CATEGORY_LABELS_JA = {
  weapon: "武器",
  armor: "防具",
  potion: "ポーション",
  material: "素材",
  cooking: "料理",
  tool: "道具"
};

// 現在ホットなカテゴリ
let currentMarketHotCats = []; // 例: ["potion","cooking"]

// 需要フェーズ補正（人気カテゴリがあれば確率を上げる）
function applyMarketEventBoost(prob, itemCategory) {
  if (Array.isArray(currentMarketHotCats) &&
      currentMarketHotCats.includes(itemCategory)) {
    prob *= 4;              // 4倍くらい
    if (prob > 0.25) prob = 0.25; // 上限 25%
  }
  return prob;
}

// ホットカテゴリをランダム更新
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

// 現実時間30分ごとにホットカテゴリを切り替える
(function startMarketEventTimerIfNeeded() {
  if (typeof window === "undefined") return;
  if (window._marketEventTimerStarted) return;
  window._marketEventTimerStarted = true;

  // 起動直後に一度決める
  rotateMarketHotCategories();

  const THIRTY_MIN_MS = 30 * 60 * 1000;
  setInterval(() => {
    rotateMarketHotCategories();
  }, THIRTY_MIN_MS);
})();

// ★ NPC 購入確率（プレイヤー優先・安いときたまに・イベント時そこそこ）
function getNpcBuyProb(baseValue, price, category) {
  if (price <= 0 || baseValue <= 0) return 0;

  const ratio = price / baseValue; // 高いほど ratio↑

  // かなり安い（半額以下）: たまに売れる
  if (ratio <= 0.5) {
    return applyMarketEventBoost(0.03, category); // 3%
  }
  // 少し安い〜適正
  if (ratio <= 1.0) {
    return applyMarketEventBoost(0.01, category); // 1%
  }

  // 高め〜ボッタクリは急減衰（プレイヤー向け価格帯）
  const k = 1.5;
  let prob = 0.01 * Math.exp(-k * (ratio - 1));

  const MIN_PROB = 0.0000001; // 超低い下限（理論上はいつか売れる）
  if (prob < MIN_PROB) prob = MIN_PROB;

  return applyMarketEventBoost(prob, category);
}

// ★ NPC が市場からたまに購入する処理
function rollNpcMarketBuy() {
  if (!marketListings.length) return;

  // 出品をシャッフルして数件だけ見る
  const indices = [...marketListings.keys()];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const MAX_CHECK = Math.min(5, indices.length); // 一度に見る出品数上限
  for (let idx = 0; idx < MAX_CHECK; idx++) {
    const li = marketListings[indices[idx]];
    if (!li || li.amount <= 0) continue;

    const baseValue = getMarketBaseValue(li.category, li.itemId);
    if (baseValue <= 0) continue;

    const prob = getNpcBuyProb(baseValue, li.price, li.category);
    if (Math.random() >= prob) continue;

    // NPC が 1〜少数だけ購入（全部は買い取らない）
    const buyAmount = Math.max(1, Math.floor(li.amount * 0.2)) || 1;
    const actualBuy = Math.min(li.amount, buyAmount);
    if (actualBuy <= 0) continue;

    const totalPrice = actualBuy * li.price;

    // プレイヤーにお金を渡す（手数料などがあればここで調整）
    money += totalPrice;

    const label = getItemLabel(li.category, li.itemId);
    const npcName = getRandomNpcMerchantName();
    addMarketLog(`${npcName}が ${label} を市場から購入した（x${actualBuy} / ${totalPrice}G）`);

    li.amount -= actualBuy;
    if (li.amount <= 0) {
      // 出品枠削除
      // filter でまとめて整理するのでここではそのまま
    }
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
  } else if (category === "tool") {
    // 倉庫の道具（toolCounts）を出品候補に
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

    // 星屑の結晶
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

      // 食べ物（レシピ基準で走査）
      COOKING_RECIPES.food.forEach(r => {
        const id  = r.id;
        const cnt = foods[id] || 0;
        if (cnt <= 0) return;
        appendOption(id, `${r.name}（所持${cnt}）`);
      });

      // 飲み物
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
// 市場タブ表示時の更新フック
// =======================
window.addEventListener("DOMContentLoaded", () => {
  const tabSell = document.getElementById("marketTabSell");
  const tabBuy  = document.getElementById("marketTabBuy");

  if (tabSell) {
    tabSell.addEventListener("click", () => {
      // 出品タブを開いたときに候補を更新
      if (typeof refreshMarketSellCandidates === "function") {
        refreshMarketSellCandidates();
      }
    });
  }

  if (tabBuy) {
    tabBuy.addEventListener("click", () => {
      // 購入タブを開いたときに一覧を更新
      if (typeof refreshMarketBuyList === "function") {
        refreshMarketBuyList();
      }
    });
  }
});