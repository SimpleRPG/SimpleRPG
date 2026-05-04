// game-shop.js
// ショップUIと購入・売却処理
//
// 前提：game-core-1.js / inventory-core.js / game-core-4.js で
//   money, hp, hpMax, mp, mpMax,
//   potions, potionCounts,
//   cookedFoods, cookedDrinks,
//   toolCounts, materials, cookingMats,
//   intermediateMats, INTERMEDIATE_MATERIALS,
//   weaponInstances, armorInstances, weaponCounts, armorCounts,
//   WEAPONS_INIT, ARMORS_INIT, MAX_DURABILITY,
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
    // 爆弾は道具扱い（T1固定）とし、potionId は使わず、id だけで判別する
    { id: "bomb_T1_shop",  potionId: null,       name: "爆弾T1",           price: 100, desc: "敵にダメージを与える攻撃アイテム（道具,T1）。" }
  ],
  service: [
    { id: "inn_hp",   name: "宿屋で休む(HP)",      price: 500,  desc: "HPを全回復します。",             type: "service", kind: "innHP" },
    { id: "inn_full", name: "宿屋で休む(HP/MP)",   price: 800,  desc: "HPとMPを全回復します。",         type: "service", kind: "innFull" },
    // ★追加: 定食
    { id: "setmeal",  name: "定食を食べる",        price: 130,  desc: "空腹と水分が少し回復する定食。", type: "service", kind: "meal" }
  ]
};

let shopCurrentCategory = "item";   // "item" / "service" / "sell"
let shopSelectedItem    = null;     // 購入時: shopDataの要素 / 売却時: buildSellableList の要素

// 数量UIと合計金額計算用
let shopCurrentUnitPrice = 0;

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

// 売値計算：価値の半分（切り上げ）＋スキルツリーボーナス（sellPriceRate）
function getSellPriceFromValue(value) {
  const v = typeof value === "number" ? value : 0;
  let price = Math.max(0, Math.ceil(v / 2));

  // スキルツリーの売値ボーナスを適用
  try {
    if (typeof getGlobalSkillTreeBonus === "function") {
      const b = getGlobalSkillTreeBonus() || {};
      const bonus = b.sellPriceRate || 0; // 例: 0.05 で +5%
      if (bonus > 0) {
        price = Math.ceil(price * (1 + bonus));
      }
    }
  } catch (e) {
    console.warn("getSellPriceFromValue: skilltree bonus error", e);
  }

  return price;
}

// ★修正: market-core1.js の getTheoreticalCost を利用
// ポーションの売値（原価の半額）
function getPotionSellPrice(potionId) {
  if (typeof getTheoreticalCost === "function") {
    const cost = getTheoreticalCost("potion", potionId);
    if (cost > 0) return getSellPriceFromValue(cost);
  }
  // フォールバック: potions 配列から価格取得
  const p = Array.isArray(potions) ? potions.find(x => x.id === potionId) : null;
  if (!p) return 0;
  const base = (typeof p.value === "number") ? p.value
              : (typeof p.price === "number") ? p.price
              : 0;
  return getSellPriceFromValue(base);
}

// 料理（食べ物）の売値
function getCookedFoodSellPrice(foodId) {
  // COOKING_RECIPES から探す
  if (typeof COOKING_RECIPES !== "undefined" && COOKING_RECIPES && Array.isArray(COOKING_RECIPES.food)) {
    const r = COOKING_RECIPES.food.find(f => f.id === foodId);
    if (r) {
      const base = (typeof r.value === "number") ? r.value
                  : (typeof r.price === "number") ? r.price
                  : 0;
      if (base > 0) return getSellPriceFromValue(base);
    }
  }
  // フォールバック: 料理素材基準価格の2倍程度
  return getSellPriceFromValue(COOKING_INGREDIENT_BASE_VALUE * 2);
}

// 料理（飲み物）の売値
function getCookedDrinkSellPrice(drinkId) {
  if (typeof COOKING_RECIPES !== "undefined" && COOKING_RECIPES && Array.isArray(COOKING_RECIPES.drink)) {
    const r = COOKING_RECIPES.drink.find(d => d.id === drinkId);
    if (r) {
      const base = (typeof r.value === "number") ? r.value
                  : (typeof r.price === "number") ? r.price
                  : 0;
      if (base > 0) return getSellPriceFromValue(base);
    }
  }
  return getSellPriceFromValue(COOKING_INGREDIENT_BASE_VALUE * 2);
}

// ★修正: 道具の売値（molotov 追加 + getTheoreticalCost 利用）
function getToolSellPrice(toolId) {
  // まず getTheoreticalCost から取得を試みる
  if (typeof getTheoreticalCost === "function") {
    const cost = getTheoreticalCost("tool", toolId);
    if (cost > 0) return getSellPriceFromValue(cost);
  }

  // フォールバック: IDハードコード
  let base = 0;
  if (toolId === "bomb_T1") base = 100;
  else if (toolId === "bomb_T2") base = 300;
  else if (toolId === "bomb_T3") base = 900;
  else if (toolId === "bomb_fire_T1") base = 120;
  else if (toolId === "bomb_fire_T2") base = 360;
  else if (toolId === "bomb_fire_T3") base = 1080;
  else if (toolId === "molotov_T1") base = 110;
  else if (toolId === "molotov_T2") base = 330;
  else if (toolId === "molotov_T3") base = 990;
  else if (toolId === "poisonNeedle_T1") base = 80;
  else if (toolId === "poisonNeedle_T2") base = 240;
  else if (toolId === "poisonNeedle_T3") base = 720;
  else if (toolId === "paralyzeGas_T1") base = 90;
  else if (toolId === "paralyzeGas_T2") base = 270;
  else if (toolId === "paralyzeGas_T3") base = 810;
  return getSellPriceFromValue(base);
}

// 通常素材の売値（materials-core.js の配列形式・オブジェクト形式両対応、T10まで対応）
// 価値はティアに応じて段階的に上昇（MATERIAL_TIER_VALUES を利用）
function getMaterialSellPrice(baseKey, tier) {
  let base = 0;
  
  // tierは数値または"t1"/"t2"形式の文字列
  let tierNum = 0;
  if (typeof tier === "string") {
    const match = tier.match(/^t(\d+)$/);
    if (match) tierNum = parseInt(match[1], 10);
    else tierNum = parseInt(tier, 10) || 0;
  } else if (typeof tier === "number") {
    tierNum = tier;
  }

  // MATERIAL_TIER_VALUES から取得
  if (typeof window.MATERIAL_TIER_VALUES === "object" && window.MATERIAL_TIER_VALUES !== null) {
    const tierKey = `t${tierNum}`;
    if (typeof window.MATERIAL_TIER_VALUES[tierKey] === "number") {
      base = window.MATERIAL_TIER_VALUES[tierKey];
    }
  }

  // フォールバック: 固定価格
  if (base === 0) {
    if (tierNum === 1) base = 3;
    else if (tierNum === 2) base = 5;
    else if (tierNum === 3) base = 10;
    else if (tierNum === 4) base = 20;
    else if (tierNum === 5) base = 40;
    else if (tierNum === 6) base = 80;
    else if (tierNum === 7) base = 160;
    else if (tierNum === 8) base = 320;
    else if (tierNum === 9) base = 640;
    else if (tierNum === 10) base = 1280;
  }

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

// ★修正: 中間素材の売値（getTheoreticalCost 利用）
function getIntermediateMatSellPrice(id) {
  // まず getTheoreticalCost から取得
  if (typeof getTheoreticalCost === "function") {
    const cost = getTheoreticalCost("material", id);
    if (cost > 0) return getSellPriceFromValue(cost);
  }

  // フォールバック: INTERMEDIATE_MATERIALS から value/price を探す
  if (!Array.isArray(INTERMEDIATE_MATERIALS)) return 0;
  const m = INTERMEDIATE_MATERIALS.find(x => x.id === id);
  if (!m) return 0;
  const base = (typeof m.value === "number") ? m.value
              : (typeof m.price === "number") ? m.price
              : 0;
  return getSellPriceFromValue(base);
}

// ★修正: 武器の売値（変数名を WEAPONS_INIT または weapons に修正 + getTheoreticalCost 利用）
function getWeaponSellPrice(id) {
  // まず getTheoreticalCost から取得
  if (typeof getTheoreticalCost === "function") {
    const cost = getTheoreticalCost("weapon", id);
    if (cost > 0) return getSellPriceFromValue(cost);
  }

  // フォールバック: weapons または WEAPONS_INIT から取得
  const weaponArray = Array.isArray(window.weapons) ? window.weapons 
                    : Array.isArray(window.WEAPONS_INIT) ? window.WEAPONS_INIT 
                    : null;
  
  if (!weaponArray) return 0;
  const w = weaponArray.find(x => x.id === id);
  if (!w) return 0;
  const base = (typeof w.value === "number") ? w.value
              : (typeof w.price === "number") ? w.price
              : 0;
  return getSellPriceFromValue(base);
}

// ★修正: 防具の売値（変数名を ARMORS_INIT または armors に修正 + getTheoreticalCost 利用）
function getArmorSellPrice(id) {
  // まず getTheoreticalCost から取得
  if (typeof getTheoreticalCost === "function") {
    const cost = getTheoreticalCost("armor", id);
    if (cost > 0) return getSellPriceFromValue(cost);
  }

  // フォールバック: armors または ARMORS_INIT から取得
  const armorArray = Array.isArray(window.armors) ? window.armors 
                   : Array.isArray(window.ARMORS_INIT) ? window.ARMORS_INIT 
                   : null;
  
  if (!armorArray) return 0;
  const a = armorArray.find(x => x.id === id);
  if (!a) return 0;
  const base = (typeof a.value === "number") ? a.value
              : (typeof a.price === "number") ? a.price
              : 0;
  return getSellPriceFromValue(base);
}

// 装備名＋品質・強化のラベル
function getWeaponInstanceLabel(inst) {
  if (!inst) return "";
  const baseId = inst.id;
  let baseName = baseId;
  
  const weaponArray = Array.isArray(window.weapons) ? window.weapons 
                    : Array.isArray(window.WEAPONS_INIT) ? window.WEAPONS_INIT 
                    : null;
  
  if (weaponArray) {
    const w = weaponArray.find(x => x.id === baseId);
    if (w && w.name) baseName = w.name;
  }
  
  const qName = (typeof QUALITY_NAMES !== "undefined" && QUALITY_NAMES[inst.quality]) ? QUALITY_NAMES[inst.quality] : "";
  const enh = inst.enhance || 0;
  const enhStr = enh > 0 ? `+${enh}` : "";
  const durStr = (typeof inst.durability === "number" && typeof MAX_DURABILITY === "number")
    ? ` (耐久 ${inst.durability}/${MAX_DURABILITY})`
    : "";
  return `${qName}${baseName}${enhStr}${durStr}`;
}

function getArmorInstanceLabel(inst) {
  if (!inst) return "";
  const baseId = inst.id;
  let baseName = baseId;
  
  const armorArray = Array.isArray(window.armors) ? window.armors 
                   : Array.isArray(window.ARMORS_INIT) ? window.ARMORS_INIT 
                   : null;
  
  if (armorArray) {
    const a = armorArray.find(x => x.id === baseId);
    if (a && a.name) baseName = a.name;
  }
  
  const qName = (typeof QUALITY_NAMES !== "undefined" && QUALITY_NAMES[inst.quality]) ? QUALITY_NAMES[inst.quality] : "";
  const enh = inst.enhance || 0;
  const enhStr = enh > 0 ? `+${enh}` : "";
  const durStr = (typeof inst.durability === "number" && typeof MAX_DURABILITY === "number")
    ? ` (耐久 ${inst.durability}/${MAX_DURABILITY})`
    : "";
  return `${qName}${baseName}${enhStr}${durStr}`;
}

// =======================
// NPC購入価格ヘルパー（buyPriceReduceRate）
// =======================

function getEffectiveShopPrice(basePrice) {
  let p = typeof basePrice === "number" ? basePrice : 0;

  try {
    if (typeof getGlobalSkillTreeBonus === "function") {
      const b = getGlobalSkillTreeBonus() || {};
      const reduce = b.buyPriceReduceRate || 0; // 例: 0.05 で -5%
      if (reduce > 0) {
        const mul = 1 - reduce;
        p = Math.ceil(p * mul);
      }
    }
  } catch (e) {
    console.warn("getEffectiveShopPrice: skilltree bonus error", e);
  }

  if (p < 0) p = 0;
  return p;
}

// =======================
// 売却対象一覧生成
// =======================
//
// 「倉庫にあるもの全部」を sell リストとしてまとめる。
// 装備はインスタンスごと（weaponInstances / armorInstances）に列挙する。

function buildSellableList() {
  const list = [];

  // ポーション（倉庫: potionCounts）
  if (typeof potionCounts === "object" && potionCounts !== null && Array.isArray(potions)) {
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
  if (typeof cookedFoods === "object" && cookedFoods !== null) {
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
  if (typeof cookedDrinks === "object" && cookedDrinks !== null) {
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

  // ★修正: 道具（ラベルは ITEM_META に完全委譲）
  if (typeof toolCounts === "object" && toolCounts !== null) {
    Object.keys(toolCounts).forEach(id => {
      const cnt = toolCounts[id] || 0;
      if (cnt <= 0) return;

      // 名前は必ず ITEM_META から取る（フォールバックなし）
      const label = (typeof getItemName === "function") ? getItemName(id) : id;

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

  // ★通常素材（materials）- 配列形式・オブジェクト形式両対応、T10まで対応
  if (typeof materials === "object" && materials !== null) {
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
      
      // ★配列形式チェック: [T1個数, T2個数, T3個数, ..., T10個数]
      if (Array.isArray(info)) {
        // 配列形式（materials-core.js の新仕様）- T10まで対応
        info.forEach((cnt, index) => {
          if (!cnt || cnt <= 0) return;
          const tier = index + 1; // index 0 = T1, 1 = T2, ..., 9 = T10
          if (tier > 10) return; // T10までのみ対応
          const price = getMaterialSellPrice(baseKey, tier);
          if (price <= 0) return;
          list.push({
            kind: "material",
            id: `${baseKey}_t${tier}`,
            baseKey,
            tier: `t${tier}`,
            tierIndex: index, // 配列インデックス
            name: `T${tier}${baseName}`,
            count: cnt,
            price
          });
        });
      } else if (typeof info === "object") {
        // ★オブジェクト形式（既存仕様）: { t1, t2, t3, ..., t10 }
        // T10まで対応
        for (let i = 1; i <= 10; i++) {
          const tier = `t${i}`;
          const cnt = info[tier] || 0;
          if (cnt <= 0) continue;
          const price = getMaterialSellPrice(baseKey, tier);
          if (price <= 0) continue;
          list.push({
            kind: "material",
            id: baseKey + "_" + tier,
            baseKey,
            tier,
            name: `T${i}${baseName}`,
            count: cnt,
            price
          });
        }
      }
    });
  }

  // 料理素材（cookingMats）
  if (typeof cookingMats === "object" && cookingMats !== null) {
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

  // 中間素材（intermediateMats）
  if (typeof intermediateMats === "object" && intermediateMats !== null) {
    Object.keys(intermediateMats).forEach(id => {
      const cnt = intermediateMats[id] || 0;
      if (cnt <= 0) return;
      let name = id;
      if (Array.isArray(INTERMEDIATE_MATERIALS)) {
        const m = INTERMEDIATE_MATERIALS.find(x => x.id === id);
        if (m && m.name) name = m.name;
      }
      const price = getIntermediateMatSellPrice(id);
      if (price <= 0) return;
      list.push({
        kind: "intermediateMat",
        id,
        name,
        count: cnt,
        price
      });
    });
  }

  // 武器インスタンス（weaponInstances）
  if (Array.isArray(weaponInstances)) {
    weaponInstances.forEach((inst, index) => {
      if (!inst || inst.location !== "warehouse") return;
      const id = inst.id;
      const name = getWeaponInstanceLabel(inst);
      const price = getWeaponSellPrice(id);
      if (price <= 0) return;
      list.push({
        kind: "weapon",
        id,
        name,
        count: 1,
        price,
        instanceIndex: index
      });
    });
  }

  // 防具インスタンス（armorInstances）
  if (Array.isArray(armorInstances)) {
    armorInstances.forEach((inst, index) => {
      if (!inst || inst.location !== "warehouse") return;
      const id = inst.id;
      const name = getArmorInstanceLabel(inst);
      const price = getArmorSellPrice(id);
      if (price <= 0) return;
      list.push({
        kind: "armor",
        id,
        name,
        count: 1,
        price,
        instanceIndex: index
      });
    });
  }

  return list;
}

// =======================
// 数量UIヘルパー（購入・売却共通）
// =======================

function updateShopTotal() {
  const qtyInput = document.getElementById("shopQty");
  const totalEl  = document.getElementById("shopTotal");
  if (!qtyInput || !totalEl) return;

  const qty = parseInt(qtyInput.value || "1", 10);
  const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
  totalEl.textContent = shopCurrentUnitPrice * safeQty;
}

function initShopQtyControls() {
  const qtyInput = document.getElementById("shopQty");
  if (!qtyInput) return;

  document.querySelectorAll(".qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const delta = parseInt(btn.dataset.delta, 10) || 0;
      let v = parseInt(qtyInput.value || "1", 10);
      if (!Number.isFinite(v)) v = 1;
      v += delta;
      if (v < 1) v = 1;
      qtyInput.value = v;
      updateShopTotal();
    });
  });

  qtyInput.addEventListener("input", () => {
    let v = parseInt(qtyInput.value || "1", 10);
    if (!Number.isFinite(v) || v < 1) v = 1;
    qtyInput.value = v;
    updateShopTotal();
  });

  // 初期表示
  updateShopTotal();
}

function getShopQty() {
  const qtyInput = document.getElementById("shopQty");
  if (!qtyInput) return 1;
  const v = parseInt(qtyInput.value || "1", 10);
  return (Number.isFinite(v) && v > 0) ? v : 1;
}

// =======================
// 複数売却処理
// =======================

function sellMultipleItems(entry, amount) {
  if (!entry || amount <= 0) return;

  // 売却可能最大数を決める
  let maxSell = entry.count || 0;
  if (entry.kind === "weapon" || entry.kind === "armor") {
    // 装備はインスタンス1個単位なので常に1
    maxSell = 1;
  }
  const sellAmount = Math.min(amount, maxSell);
  if (sellAmount <= 0) {
    appendLog("そのアイテムはもう売れません。");
    return;
  }

  const moneyBefore = (typeof money === "number") ? money : null;
  let successAmount = 0;

  const applyOnce = () => {
    switch (entry.kind) {
      case "potion":
        if (typeof potionCounts === "object") {
          const have = potionCounts[entry.id] || 0;
          if (have > 0) {
            potionCounts[entry.id] = have - 1;
            successAmount++;
            return true;
          }
        }
        return false;
      case "food":
        if (typeof cookedFoods === "object") {
          const have = cookedFoods[entry.id] || 0;
          if (have > 0) {
            cookedFoods[entry.id] = have - 1;
            successAmount++;
            return true;
          }
        }
        return false;
      case "drink":
        if (typeof cookedDrinks === "object") {
          const have = cookedDrinks[entry.id] || 0;
          if (have > 0) {
            cookedDrinks[entry.id] = have - 1;
            successAmount++;
            return true;
          }
        }
        return false;
      case "tool":
        if (typeof toolCounts === "object") {
          const have = toolCounts[entry.id] || 0;
          if (have > 0) {
            toolCounts[entry.id] = have - 1;
            successAmount++;
            return true;
          }
        }
        return false;
      case "material":
        if (typeof materials === "object") {
          const info = materials[entry.baseKey];
          if (Array.isArray(info) && typeof entry.tierIndex === "number") {
            if (info[entry.tierIndex] > 0) {
              info[entry.tierIndex] -= 1;
              successAmount++;
              return true;
            }
          } else if (info && typeof info === "object" && entry.tier) {
            if (info[entry.tier] > 0) {
              info[entry.tier] -= 1;
              successAmount++;
              return true;
            }
          }
        }
        return false;
      case "cookingMat":
        if (typeof cookingMats === "object") {
          const have = cookingMats[entry.id] || 0;
          if (have > 0) {
            cookingMats[entry.id] = have - 1;
            successAmount++;
            return true;
          }
        }
        return false;
      case "intermediateMat":
        if (typeof intermediateMats === "object") {
          const have = intermediateMats[entry.id] || 0;
          if (have > 0) {
            intermediateMats[entry.id] = have - 1;
            successAmount++;
            return true;
          }
        }
        return false;
      case "weapon":
        if (Array.isArray(weaponInstances)) {
          const idx = entry.instanceIndex;
          const inst = weaponInstances[idx];
          if (inst && inst.location === "warehouse") {
            const id = inst.id;
            weaponInstances.splice(idx, 1);
            if (typeof weaponCounts === "object" && id) {
              weaponCounts[id] = Math.max(0, (weaponCounts[id] || 0) - 1);
            }
            successAmount++;
            return true;
          }
        }
        return false;
      case "armor":
        if (Array.isArray(armorInstances)) {
          const idx = entry.instanceIndex;
          const inst = armorInstances[idx];
          if (inst && inst.location === "warehouse") {
            const id = inst.id;
            armorInstances.splice(idx, 1);
            if (typeof armorCounts === "object" && id) {
              armorCounts[id] = Math.max(0, (armorCounts[id] || 0) - 1);
            }
            successAmount++;
            return true;
          }
        }
        return false;
      default:
        return false;
    }
  };

  for (let i = 0; i < sellAmount; i++) {
    if (!applyOnce()) break;
  }

  if (successAmount <= 0) {
    appendLog("そのアイテムはもう売れません。");
    return;
  }

  const totalPrice = entry.price * successAmount;
  money += totalPrice;
  appendLog(`「${entry.name}」を ${successAmount}個、合計 ${totalPrice}G で売った。`);

  if (typeof debugRecordEconomy === "function" && moneyBefore != null && typeof money === "number") {
    try {
      debugRecordEconomy(moneyBefore, money, "shopSell");
    } catch (e) {}
  }

  updateShopGoldDisplay();
  if (typeof updateDisplay === "function") {
    updateDisplay();
  }

  renderShopList();

  // ★錬金ギルド：ポーション/道具を売却した分をカウント
  if (typeof onAlchConsumableUsedOrSoldForGuild === "function" && successAmount > 0) {
    if (entry.kind === "potion" || entry.kind === "tool") {
      onAlchConsumableUsedOrSoldForGuild({
        itemId: entry.id,
        meta: null,
        amount: successAmount
      });
    }
  }

  // ★料理ギルド：料理/飲み物を売却した分をカウント
  if (typeof notifyCookingUseOrSell === "function" && successAmount > 0) {
    if (entry.kind === "food") {
      notifyCookingUseOrSell("sell", entry.id, successAmount);
    } else if (entry.kind === "drink") {
      notifyCookingUseOrSell("sell", entry.id, successAmount);
    }
  }
}

// =======================
// 商品／売却リスト描画
// =======================

function renderShopList() {
  const list = document.getElementById("shopItemList");
  if (!list) return;
  list.innerHTML = "";

  const detailPanel = document.getElementById("shopItemDetail");
  const buyBtn      = document.getElementById("shopBuyButton");

  // 売却モード
  if (shopCurrentCategory === "sell") {
    if (detailPanel) {
      detailPanel.style.display = "";
    }
    if (buyBtn) {
      buyBtn.textContent = "売却する";
    }

    const sellList = buildSellableList();
    if (!sellList.length) {
      const msg = document.createElement("div");
      msg.className = "shop-empty-message";
      msg.textContent = "売却できるアイテムがありません。";
      list.appendChild(msg);
      shopSelectedItem = null;
      selectShopItem(null);
      return;
    }

    sellList.forEach(entry => {
      const row = document.createElement("div");
      row.className = "shop-item-row";

      const main = document.createElement("div");
      main.className = "shop-item-main";

      const nameEl = document.createElement("div");
      nameEl.className = "shop-item-name";
      nameEl.textContent = entry.name;

      const metaEl = document.createElement("div");
      metaEl.className = "shop-item-meta";
      metaEl.textContent = `所持: ${entry.count}`;

      main.appendChild(nameEl);
      main.appendChild(metaEl);

      const priceEl = document.createElement("div");
      priceEl.className = "shop-item-price";
      priceEl.textContent = `${entry.price}G`;

      row.appendChild(main);
      row.appendChild(priceEl);

      row.addEventListener("click", () => {
        document.querySelectorAll(".shop-item-row").forEach(el => el.classList.remove("selected"));
        row.classList.add("selected");
        selectShopItem(entry);
      });

      list.appendChild(row);
    });

    selectShopItem(null);
    return;
  }

  // 通常の購入モード
  if (detailPanel) {
    detailPanel.style.display = "";
  }
  if (buyBtn) {
    buyBtn.textContent = "購入する";
  }

  const items = shopData[shopCurrentCategory] || [];
  if (!items.length) {
    const msg = document.createElement("div");
    msg.className = "shop-empty-message";
    msg.textContent = "商品がありません。";
    list.appendChild(msg);
    selectShopItem(null);
    return;
  }

  items.forEach(item => {
    const row = document.createElement("div");
    row.className = "shop-item-row";

    const main = document.createElement("div");
    main.className = "shop-item-main";

    const nameEl = document.createElement("div");
    nameEl.className = "shop-item-name";
    nameEl.textContent = item.name;

    const metaEl = document.createElement("div");
    metaEl.className = "shop-item-meta";
    metaEl.textContent = (shopCurrentCategory === "service") ? "サービス" : "消耗品";

    main.appendChild(nameEl);
    main.appendChild(metaEl);

    const priceEl = document.createElement("div");
    priceEl.className = "shop-item-price";
    priceEl.textContent = `${getEffectiveShopPrice(item.price)}G`;

    row.appendChild(main);
    row.appendChild(priceEl);

    row.addEventListener("click", () => {
      document.querySelectorAll(".shop-item-row").forEach(el => el.classList.remove("selected"));
      row.classList.add("selected");
      selectShopItem(item);
    });

    list.appendChild(row);
  });

  selectShopItem(null);
}

// =======================
// 商品選択（購入・売却共通で右パネル更新）
// =======================

function selectShopItem(item) {
  shopSelectedItem = item;
  const nameEl   = document.getElementById("shopItemName");
  const descEl   = document.getElementById("shopItemDesc");
  const priceEl  = document.getElementById("shopItemPrice");
  const buyBtn   = document.getElementById("shopBuyButton");
  const qtyInput = document.getElementById("shopQty");

  if (!item) {
    shopCurrentUnitPrice = 0;
    if (nameEl)  nameEl.textContent = (shopCurrentCategory === "sell")
      ? "売却したいアイテムを左から選んでください。"
      : "商品を選択してください。";
    if (descEl)  descEl.textContent = "";
    if (priceEl) priceEl.textContent = "";
    if (qtyInput) qtyInput.value = 1;

    // ★数量UIリセット
    const qtyBtns = document.querySelectorAll(".qty-btn");
    qtyBtns.forEach(b => b.disabled = false);
    if (qtyInput) {
      qtyInput.readOnly = false;
    }

    updateShopTotal();
    if (buyBtn) {
      buyBtn.disabled = true;
      buyBtn.onclick = null;
    }
    return;
  }

  if (shopCurrentCategory === "sell") {
    // 売却モード: 右パネルは「売却用詳細」
    shopCurrentUnitPrice = item.price;
    if (nameEl)  nameEl.textContent = item.name;
    if (descEl)  descEl.textContent = `所持数: ${item.count}`;
    if (priceEl) priceEl.textContent = `売値: ${item.price}G / 個`;

    if (qtyInput) {
      qtyInput.value = 1;
      qtyInput.readOnly = false;
    }
    const qtyBtns = document.querySelectorAll(".qty-btn");
    qtyBtns.forEach(b => b.disabled = false);

    updateShopTotal();

    if (buyBtn) {
      buyBtn.disabled = false;
      buyBtn.onclick = () => {
        const amount = getShopQty();
        sellMultipleItems(item, amount);
      };
    }
    return;
  }

  // 購入モード
  const effectivePrice = getEffectiveShopPrice(item.price);
  shopCurrentUnitPrice = effectivePrice;

  if (nameEl)  nameEl.textContent = item.name;
  if (descEl)  descEl.textContent = item.desc || "";
  if (priceEl) priceEl.textContent = `価格: ${effectivePrice}G / 個`;

  const isService = (shopCurrentCategory === "service");

  if (qtyInput) {
    qtyInput.value = 1;
    qtyInput.readOnly = isService; // ★サービスは編集不可
  }

  const qtyBtns = document.querySelectorAll(".qty-btn");
  qtyBtns.forEach(b => {
    b.disabled = isService; // ★サービスでは +/- ボタンも無効
  });

  updateShopTotal();

  if (buyBtn) {
    buyBtn.disabled = false;
    buyBtn.onclick = () => buyShopItem(item);
  }
}

// =======================
// 購入処理（既存仕様＋定食＋数量反映）
// =======================

function buyShopItem(item) {
  if (!item) return;

  const qty = getShopQty(); // ★数量を取得
  if (qty <= 0) return;

  const unitPrice = getEffectiveShopPrice(item.price);
  const priceToPay = unitPrice * (shopCurrentCategory === "service" ? 1 : qty); // ★サービスは常に1回分

  if (money < priceToPay) {
    appendLog("ゴールドが足りない。");
    return;
  }

  // 経済ログ用: 購入前残高
  const moneyBefore = money;

  if (shopCurrentCategory === "item") {
    // 通常ポーション
    if (item.id !== "bomb_T1_shop") {
      const p = potions.find(x => x.id === item.potionId);
      if (!p) {
        appendLog("この商品はまだ実装されていない。");
        return;
      }

      // ここまで来たら成功扱いで減算＆付与
      money -= priceToPay;
      potionCounts[p.id] = (potionCounts[p.id] || 0) + qty; // ★数量分加算
      appendLog(`${item.name} を ${qty}個購入した。`);
    } else {
      // 爆弾T1（道具）購入: 道具倉庫に追加
      if (typeof toolCounts === "object") {
        money -= priceToPay;
        const toolId = "bomb_T1";
        toolCounts[toolId] = (toolCounts[toolId] || 0) + qty; // ★数量分
        appendLog(`${item.name} を ${qty}個購入した（道具として倉庫に追加された）。`);
      } else {
        appendLog("道具の保管領域が未定義です（toolCounts）。");
        return;
      }
    }
  } else if (shopCurrentCategory === "service") {
    // サービスは常に1回分だけ効果を適用
    money -= priceToPay;

    if (item.kind === "innHP") {
      hp = hpMax;
      appendLog("宿屋で休み、HPが全回復した。");
    } else if (item.kind === "innFull") {
      hp = hpMax;
      mp = mpMax;
      appendLog("宿屋で休み、HPとMPが全回復した。");
    } else if (item.kind === "meal") {
      // 定食: 空腹＆水分 +30 回復
      if (typeof restoreHungerThirst === "function") {
        restoreHungerThirst(30, 30);
      }
      appendLog("定食を食べ、お腹も喉も少し満たされた。");
    }
  }

  // 経済ログ: ショップ購入
  if (typeof debugRecordEconomy === "function" && typeof money === "number") {
    try {
      debugRecordEconomy(moneyBefore, money, "shopBuy");
    } catch (e) {}
  }

  updateShopGoldDisplay();
  updateDisplay();
}

// =======================
// カテゴリタブ初期化
// =======================

function initShopTabs() {
  const buttons = document.querySelectorAll(".shop-category-button");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.getAttribute("data-category");
      if (!cat) return;
      
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
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
  initShopQtyControls();
  
  shopCurrentCategory = "item";
  
  const firstBtn = document.querySelector('.shop-category-button[data-category="item"]');
  if (firstBtn) {
    firstBtn.classList.add("active");
  }
  
  renderShopList();
}