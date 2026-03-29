// game-shop.js
// ショップUIと購入処理
//
// 前提：game-core-1.js で
//   money, hp, hpMax, mp, mpMax,
//   potions, potionCounts,
//   updateDisplay(), appendLog()
// が定義済み。

// ショップラインナップ
// POTIONS_INIT の id に合わせて対応
const shopData = {
  item: [
    { id: "potionT1_shop", potionId: "potionT1", name: "ポーションT1",     price: 60,  desc: "HPを少し回復する基本の回復薬。" },
    { id: "manaT1_shop",   potionId: "manaT1",   name: "マナポーションT1", price: 80,  desc: "MPを少し回復する基本のマナ薬。" },
    { id: "bomb_shop",     potionId: "bomb",     name: "爆弾",             price: 100, desc: "敵にダメージを与える攻撃アイテム。" }
  ],
  service: [
    { id: "inn_hp",   name: "宿屋で休む(HP)",    price: 80,  desc: "HPを全回復します。",       type: "service", kind: "innHP" },
    { id: "inn_full", name: "宿屋で休む(HP/MP)", price: 120, desc: "HPとMPを全回復します。",   type: "service", kind: "innFull" }
  ]
};

let shopCurrentCategory = "item";
let shopSelectedItem = null;

// 所持金表示更新
function updateShopGoldDisplay() {
  const el = document.getElementById("shopGoldDisplay");
  if (el) el.textContent = money;
}

// 商品リスト描画
function renderShopList() {
  const list = document.getElementById("shopItemList");
  if (!list) return;
  list.innerHTML = "";

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

// 商品選択
function selectShopItem(item) {
  shopSelectedItem = item;
  const nameEl  = document.getElementById("shopItemName");
  const descEl  = document.getElementById("shopItemDesc");
  const priceEl = document.getElementById("shopItemPrice");
  const buyBtn  = document.getElementById("shopBuyButton");

  if (!item) {
    if (nameEl)  nameEl.textContent = "商品を選択してください。";
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
  if (priceEl) priceEl.textContent = `価格: ${item.price}G`;

  if (buyBtn) {
    buyBtn.disabled = false;
    buyBtn.onclick = () => buyShopItem(item);
  }
}

// 購入処理
function buyShopItem(item) {
  if (!item) return;
  if (money < item.price) {
    appendLog("ゴールドが足りない。");
    return;
  }
  money -= item.price;

  if (shopCurrentCategory === "item") {
    const p = potions.find(x => x.id === item.potionId);
    if (!p) {
      appendLog("この商品はまだ実装されていない。");
    } else {
      potionCounts[p.id] = (potionCounts[p.id] || 0) + 1;
      appendLog(`${item.name} を購入した。`);
    }
  } else if (shopCurrentCategory === "service") {
    if (item.kind === "innHP") {
      hp = hpMax;
      appendLog("宿屋で休み、HPが全回復した。");
    } else if (item.kind === "innFull") {
      hp = hpMax;
      mp = mpMax;
      appendLog("宿屋で休み、HPとMPが全回復した。");
    }
  }

  updateShopGoldDisplay();
  updateDisplay();
}

// カテゴリタブ初期化
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

// ショップ初期化（ゲーム開始時に1回呼ぶ）
function initShop() {
  updateShopGoldDisplay();
  initShopTabs();
  renderShopList();
}