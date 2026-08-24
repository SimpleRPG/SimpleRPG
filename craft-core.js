// craft-core.js
// クラフト共通・ヘルパー・統計・素材処理

// =======================
// クラフト共通
// =======================

// クラフト品質関連（0:普通, 1:良品, 2:傑作）
const QUALITY_NAMES = ["", "【良品】", "【傑作】"];

// 必要なら性能補正用レート（今は未使用、後でダメージ計算側で使う想定）
const QUALITY_RATE = [1.0, 1.05, 1.12];

// ★ tier 判定ヘルパー（文字列）
// T1〜T10 まで対応
function getTierFromId(id) {
  if (id.endsWith("_T1")  || id.endsWith("T1"))  return "T1";
  if (id.endsWith("_T2")  || id.endsWith("T2"))  return "T2";
  if (id.endsWith("_T3")  || id.endsWith("T3"))  return "T3";
  if (id.endsWith("_T4")  || id.endsWith("T4"))  return "T4";
  if (id.endsWith("_T5")  || id.endsWith("T5"))  return "T5";
  if (id.endsWith("_T6")  || id.endsWith("T6"))  return "T6";
  if (id.endsWith("_T7")  || id.endsWith("T7"))  return "T7";
  if (id.endsWith("_T8")  || id.endsWith("T8"))  return "T8";
  if (id.endsWith("_T9")  || id.endsWith("T9"))  return "T9";
  if (id.endsWith("_T10") || id.endsWith("T10")) return "T10";
  return "T1";
}

// ★ guild.js に渡す用の tier 数値ヘルパー
// T1〜T10 まで対応
function getTierNumberFromId(id) {
  const t = getTierFromId(id); // "T1"〜"T10"
  if (t === "T2")  return 2;
  if (t === "T3")  return 3;
  if (t === "T4")  return 4;
  if (t === "T5")  return 5;
  if (t === "T6")  return 6;
  if (t === "T7")  return 7;
  if (t === "T8")  return 8;
  if (t === "T9")  return 9;
  if (t === "T10") return 10;
  return 1;
}

// ★ tier × スキルLvで表示可否を決める共通ヘルパー
// 既存仕様:
//   T1: 常に表示
//   T2: Lv10〜
//   T3: Lv20〜
// 仕様を保ったまま、同じ刻みで T10 まで拡張:
//   T4: Lv30〜
//   T5: Lv40〜
//   T6: Lv50〜
//   T7: Lv60〜
//   T8: Lv70〜
//   T9: Lv80〜
//   T10: Lv90〜
function canShowByTierAndSkill(idOrTier, skillLv) {
  const tier =
    idOrTier === "T1" || idOrTier === "T2" || idOrTier === "T3" ||
    idOrTier === "T4" || idOrTier === "T5" || idOrTier === "T6" ||
    idOrTier === "T7" || idOrTier === "T8" || idOrTier === "T9" ||
    idOrTier === "T10"
      ? idOrTier
      : getTierFromId(idOrTier);

  if (tier === "T1")  return true;
  if (tier === "T2")  return skillLv >= 10;
  if (tier === "T3")  return skillLv >= 20;
  if (tier === "T4")  return skillLv >= 30;
  if (tier === "T5")  return skillLv >= 40;
  if (tier === "T6")  return skillLv >= 50;
  if (tier === "T7")  return skillLv >= 60;
  if (tier === "T8")  return skillLv >= 70;
  if (tier === "T9")  return skillLv >= 80;
  if (tier === "T10") return skillLv >= 90;
  return true;
}

// 料理専用（recipe.tier を使う）
function canShowCookingRecipeBySkill(recipe, cookingLv) {
  const tier = recipe.tier || "T1";
  return canShowByTierAndSkill(tier, cookingLv);
}

// クラフトスキルLvヘルパー
function getCraftSkill(category){
  return craftSkills[category];
}

function getCraftSkillLevel(category){
  const s = getCraftSkill(category);
  return s ? s.lv : 0;
}

function addCraftSkillExp(category){
  const s = getCraftSkill(category);
  if(!s) return;
  s.exp += 1;
  while(s.exp >= s.expToNext && s.lv < CRAFT_SKILL_MAX_LV){
    s.exp -= s.expToNext;
    s.lv++;
    s.expToNext = Math.floor(s.expToNext * 1.3) + 1;

    // カテゴリに応じて日本語ラベルを出す
    let label = category;
    if (category === "weapon")   label = "武器";
    else if (category === "armor")    label = "防具";
    else if (category === "potion")   label = "ポーション";
    else if (category === "tool")     label = "道具";
    else if (category === "cooking")  label = "料理";
    else if (category === "material") label = "中間素材";
    else if (category === "furniture") label = "家具";
    else if (category === "petEquip")  label = "ペット装備";

    appendLog(`${label}クラフトスキルがLv${s.lv}になった！`);
  }
}

// =======================
// ITEM_META ベースのクラフトヘルパー
// =======================

function getItemCraftMeta(id) {
  if (typeof getItemMeta !== "function") return null;
  const meta = getItemMeta(id);
  if (!meta || !meta.craft || !meta.craft.enabled) return null;
  return meta.craft;
}

function getAllCraftRecipesByCategory(category) {
  if (typeof getAllItemMeta !== "function") return [];
  const metas = getAllItemMeta();
  return metas
    .filter(m => m && m.craft && m.craft.enabled && m.craft.category === category)
    .map(m => {
      const c = m.craft;
      const tierNum = c.tier != null ? c.tier : (typeof getItemTier === "function" ? getItemTier(m.id) : null);
      const tierStr = tierNum ? `T${tierNum}` : getTierFromId(m.id);
      return {
        id: m.id,
        name: m.name || m.id,
        tier: tierStr,
        kind: c.kind || "normal",
        baseRate: c.baseRate != null ? c.baseRate : 0,
        cost: c.cost || {}
      };
    });
}

// =======================
// クラフト統計
// =======================

// category: weapon/armor/potion/tool/material/food/drink/fertilizer/furniture
// stats format: { success: number, fail: number }
const craftStats = {
  weapon:     { success: 0, fail: 0 },
  armor:      { success: 0, fail: 0 },
  potion:     { success: 0, fail: 0 },
  tool:       { success: 0, fail: 0 },
  material:   { success: 0, fail: 0 },
  food:       { success: 0, fail: 0 },
  drink:      { success: 0, fail: 0 },
  fertilizer: { success: 0, fail: 0 },
  furniture:  { success: 0, fail: 0 }
};

// レシピ別に細かく見る場合用（今は UI ではカテゴリ集計だけ使用）
const craftRecipeStats = {};

// 内部用ヘルパー
function addCraftStat(category, recipeId, isSuccess) {
  if (!craftStats[category]) {
    craftStats[category] = { success: 0, fail: 0 };
  }
  if (isSuccess) {
    craftStats[category].success++;
  } else {
    craftStats[category].fail++;
  }

  if (recipeId) {
    const key = category + ":" + recipeId;
    if (!craftRecipeStats[key]) {
      craftRecipeStats[key] = { success: 0, fail: 0 };
    }
    if (isSuccess) {
      craftRecipeStats[key].success++;
    } else {
      craftRecipeStats[key].fail++;
    }
  }
}

// UI 用: カテゴリ別サマリを返す
// 既存 UI の期待フォーマットに合わせている（id, recipeName, categoryName, success, fail）
function getCraftStatsList() {
  const rows = [];
  const labelMap = {
    weapon:     "武器",
    armor:      "防具",
    potion:     "ポーション",
    tool:       "道具",
    material:   "中間素材",
    food:       "料理（食べ物）",
    drink:      "料理（飲み物）",
    fertilizer: "肥料",
    furniture:  "家具"
  };
  Object.keys(craftStats).forEach(cat => {
    const s = craftStats[cat] || { success: 0, fail: 0 };
    rows.push({
      id: cat,
      recipeName: "-",
      categoryName: labelMap[cat] || cat,
      success: s.success || 0,
      fail: s.fail || 0
    });
  });
  return rows;
}

// =======================
// スキルツリー由来クラフトボーナス
// =======================

let craftSkillTreeBonus = {
  craftCostReduceRate: 0
  // craftIntermediateExtraChance, craftQualityBonusRate, craftStarBonusRate は
  // 別の箇所（中間素材EXTRA/品質ロール/星屑強化）で使う前提
};

function refreshCraftSkillTreeBonus() {
  if (typeof getGlobalSkillTreeBonus === "function") {
    const b = getGlobalSkillTreeBonus() || {};
    craftSkillTreeBonus.craftCostReduceRate = b.craftCraftCostReduceRate || b.craftCostReduceRate || 0;
  } else {
    craftSkillTreeBonus.craftCostReduceRate = 0;
  }
}

// コストオブジェクトをスキルツリー用に減算したコピーを返すヘルパー
function applyCraftCostReduction(rawCost) {
  const rate = craftSkillTreeBonus.craftCostReduceRate || 0;
  if (!rawCost || rate <= 0) return rawCost;

  const cost = {};
  Object.keys(rawCost).forEach(k => {
    const need = rawCost[k] || 0;
    if (!need) return;
    const reduced = Math.max(0, Math.floor(need * (1 - rate)));
    cost[k] = reduced;
  });
  return cost;
}

// =======================
// 転生クラフトボーナスヘルパー
// =======================

// rebirthCraftPt は game-core-2.js 側で管理されている想定
function getRebirthCraftPoint() {
  if (typeof window.rebirthCraftPt !== "number" || window.rebirthCraftPt <= 0) {
    return 0;
  }
  return window.rebirthCraftPt;
}

// 成功率ボーナス（0.05%/pt、上限なし。呼び出し側で最終的に Math.min(...,1)）
function getCraftSuccessBonusFromRebirth() {
  const pt = getRebirthCraftPoint();
  if (!pt) return 0;
  return pt * 0.0005;
}

// 良品/傑作ボーナス（上限なし。呼び出し側でクランプ）
function getCraftQualityBonusFromRebirth() {
  const pt = getRebirthCraftPoint();
  if (!pt) {
    return {
      goodBonus: 0,
      greatBonus: 0
    };
  }
  return {
    goodBonus: pt * 0.0005, // 0.05%/pt
    greatBonus: pt * 0.0002 // 0.02%/pt
  };
}

// 失敗時の素材返却確率（0.05%/pt、上限なし）
function getCraftRefundChanceFromRebirth() {
  const pt = getRebirthCraftPoint();
  if (!pt) return 0;
  return pt * 0.0005;
}

// cost オブジェクトから、一定割合だけ返却する簡易ヘルパー
function refundMaterialsPartially(cost, rate) {
  if (!cost || !rate || rate <= 0) return;
  if (typeof addItemByMeta !== "function") return;

  Object.keys(cost).forEach(id => {
    const used = cost[id] | 0;
    if (!used) return;
    const refund = Math.floor(used * rate);
    if (refund > 0) {
      addItemByMeta(id, refund);
    }
  });
}

// =======================
// 詳細テーブル生成ヘルパー
// =======================

// 通常クラフト用: ITEM_META.craft.cost ベース
function buildNormalCraftDetailHtml(cost) {
  if (!cost || typeof cost !== "object") return "";

  const rows = [];
  Object.keys(cost).forEach(id => {
    const need = cost[id] || 0;
    if (need <= 0) return;

    const have = (typeof getItemCountByMeta === "function")
      ? (getItemCountByMeta(id) || 0)
      : 0;
    const name = (typeof getItemName === "function")
      ? (getItemName(id) || id)
      : id;
    const catLabel = (typeof getItemCategoryLabel === "function")
      ? getItemCategoryLabel(id)
      : "";

    rows.push({ id, name, have, need, catLabel });
  });

  if (!rows.length) return "";

  let html = `<table class="mat-table"><thead><tr>
    <th>素材</th>
    <th>所持/必要</th>
    <th>カテゴリ</th>
  </tr></thead><tbody>`;

  rows.forEach(r => {
    const ok = r.have >= r.need;
    const trClass = ok ? "" : "lack";
    html += `<tr class="${trClass}">
      <td>${r.name}</td>
      <td style="text-align:right;">${r.have} / ${r.need}</td>
      <td>${r.catLabel}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  return html;
}

// 料理クラフト用: recipe.requires ベース
function buildCookingCraftDetailHtml(recipe) {
  if (!recipe || !Array.isArray(recipe.requires) || !recipe.requires.length) {
    return "";
  }

  const rate = craftSkillTreeBonus.craftCostReduceRate || 0;
  const rows = [];

  recipe.requires.forEach(req => {
    const rawNeed = req.amount | 0;
    const id = req.id;
    if (!rawNeed || !id) return;

    let need = rawNeed;
    if (rate > 0) {
      need = Math.max(0, Math.floor(rawNeed * (1 - rate)));
    }

    const have = (typeof getItemCountByMeta === "function")
      ? (getItemCountByMeta(id) || 0)
      : 0;
    const name = (typeof getItemName === "function")
      ? (getItemName(id) || id)
      : id;
    const catLabel = (typeof getItemCategoryLabel === "function")
      ? getItemCategoryLabel(id)
      : "";

    rows.push({ id, name, have, need, catLabel });
  });

  if (!rows.length) return "";

  let html = `<table class="mat-table"><thead><tr>
    <th>料理素材</th>
    <th>所持/必要</th>
    <th>カテゴリ</th>
  </tr></thead><tbody>`;

  rows.forEach(r => {
    const ok = r.have >= r.need;
    const trClass = ok ? "" : "lack";
    html += `<tr class="${trClass}">
      <td>${r.name}</td>
      <td style="text-align:right;">${r.have} / ${r.need}</td>
      <td>${r.catLabel}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  return html;
}

// =======================
// 必要素材表示（メタ前提）
// =======================

// 必要素材表示（「必要素材：〜」は craftCostInfo だけに出す）
// 武器・防具・ポーション・道具 + 中間素材（material）+ 料理（cookingFood / cookingDrink）+ 肥料（fertilizer）に対応
function updateCraftCostInfo(category, recipeId){
  const infoEl   = document.getElementById("craftCostInfo");
  const matsEl   = document.getElementById("craftMaterials");
  const detailEl = document.getElementById("craftMatDetail");
  if (!infoEl) return;

  // 下段左ラベルは UI 側では使わないので毎回空にしておく
  if (matsEl) matsEl.textContent = "";
  // カテゴリ・レシピが変わるたび詳細テーブルもリセット
  if (detailEl) detailEl.innerHTML = "";

  // アクティブなクラフトカテゴリと違う呼び出しは UI 更新しない
  if (window.activeCraftCategory && window.activeCraftCategory !== category) {
    return;
  }

  // 表示時点でもスキルツリーボーナスが分かるようにリフレッシュ
  refreshCraftSkillTreeBonus();

  let list = [];
  let recipe = null;

  // --------------------
  // 通常クラフト: weapon / armor / potion / tool / furniture
  // --------------------
  if (category === "weapon" || category === "armor" ||
      category === "potion" || category === "tool" ||
      category === "furniture" || category === "petEquip") {

    const recipes = getAllCraftRecipesByCategory(category);
    recipe = recipes.find(r => r.id === recipeId);

    if (!recipe || !recipe.cost) {
      infoEl.textContent = "必要素材：-";
      return;
    }

    const shownCost = applyCraftCostReduction(recipe.cost) || {};

    Object.keys(shownCost).forEach(id => {
      const need = shownCost[id] || 0;
      if (!need) return;

      const have = (typeof getItemCountByMeta === "function")
        ? (getItemCountByMeta(id) || 0)
        : 0;

      let label = id;
      if (typeof getItemName === "function") {
        label = getItemName(id) || id;
      }

      list.push(`${label} ${have}/${need}`);
    });

    infoEl.textContent = "必要素材：" + (list.length ? list.join(" ") : "-");

    if (detailEl) {
      detailEl.innerHTML = buildNormalCraftDetailHtml(shownCost);
    }
    return;
  }

  // --------------------
  // 中間素材クラフト: material
  // --------------------
  if (category === "material") {
    if (typeof getItemMeta !== "function") {
      infoEl.textContent = "必要素材：-";
      return;
    }
    const meta = getItemMeta(recipeId);
    const craft = meta && meta.craft;
    if (!craft || !craft.cost) {
      infoEl.textContent = "必要素材：-";
      return;
    }

    const shownCost = applyCraftCostReduction(craft.cost) || {};

    if (typeof getItemCountByMeta !== "function") {
      infoEl.textContent = "必要素材：-";
      return;
    }

    Object.keys(shownCost).forEach(id => {
      const need = shownCost[id] || 0;
      if (need <= 0) return;
      const have = getItemCountByMeta(id) || 0;
      let label = id;
      if (typeof getItemName === "function") {
        label = getItemName(id) || id;
      }
      list.push(`${label} ${have}/${need}`);
    });

    infoEl.textContent = "必要素材：" + (list.length ? list.join(" ") : "-");

    if (detailEl) {
      detailEl.innerHTML = buildNormalCraftDetailHtml(shownCost);
    }
    return;
  }

  // --------------------
  // 料理クラフト: cookingFood / cookingDrink
  // --------------------
  if (category === "cookingFood" || category === "cookingDrink") {
    if (!COOKING_RECIPES) {
      infoEl.textContent = "必要素材：-";
      return;
    }
    const listSrc = (category === "cookingFood")
      ? (COOKING_RECIPES.food || [])
      : (COOKING_RECIPES.drink || []);
    recipe = listSrc.find(r => r.id === recipeId);
    if (!recipe || !Array.isArray(recipe.requires) || !recipe.requires.length) {
      infoEl.textContent = "必要素材：-";
      return;
    }

    if (typeof getItemCountByMeta !== "function") {
      infoEl.textContent = "必要素材：-";
      return;
    }

    const rate = craftSkillTreeBonus.craftCostReduceRate || 0;

    list = recipe.requires.map(req => {
      const rawNeed = req.amount | 0;
      const itemId = req.id;
      if (!rawNeed || !itemId) return null;

      let need = rawNeed;
      if (rate > 0) {
        need = Math.max(0, Math.floor(rawNeed * (1 - rate)));
      }

      const have = getItemCountByMeta(itemId) || 0;

      let label = itemId;
      if (typeof getItemName === "function") {
        label = getItemName(itemId) || itemId;
      }

      return `${label} ${have}/${need}`;
    }).filter(Boolean);

    infoEl.textContent = "必要素材：" + (list.length ? list.join(" ") : "-");

    if (detailEl) {
      detailEl.innerHTML = buildCookingCraftDetailHtml(recipe);
    }
    return;
  }

  // --------------------
  // 肥料クラフト: fertilizer
  // --------------------
  if (category === "fertilizer") {
    const fertTable = (typeof window !== "undefined" && window.FERTILIZERS)
      ? window.FERTILIZERS
      : (typeof FERTILIZERS !== "undefined" ? FERTILIZERS : null);

    if (!fertTable) {
      infoEl.textContent = "必要ポイント：-";
      return;
    }

    const fertInfo = fertTable[recipeId];
    if (!fertInfo || typeof fertInfo.costPoint !== "number") {
      infoEl.textContent = "必要ポイント：-";
      return;
    }

    const basePoint = fertInfo.costPoint;

    if (typeof getFertilizerCraftPreviewAuto === "function") {
      const preview = getFertilizerCraftPreviewAuto(recipeId);
      const need = preview.costPoint || basePoint;
      const have = preview.totalPoint || 0;

      if (!preview.ok) {
        infoEl.textContent =
          `必要ポイント：${need}pt / 所持ポイント：${have}pt（不足しています）`;

        if (detailEl) {
          detailEl.innerHTML = `
            <p style="margin:2px 0; color:#ccc;">
              肥料は料理素材ポイントの合計で作ります。<br>
              品質: 通常=1pt / 銀=2pt / 金=3pt。<br>
              料理素材（cookingMat）を集めるとクラフトできるようになります。
            </p>
          `;
        }
        return;
      }

      const over = have - need;
      const plan = preview.consumePlan || [];

      infoEl.textContent =
        `必要ポイント：${need}pt / 所持ポイント：${have}pt` +
        (over > 0 ? `（うち${over}ptは余り）` : "");

      if (detailEl) {
        let html = `<table class="mat-table">
          <thead>
            <tr>
              <th>素材</th>
              <th>消費数</th>
              <th>1個あたりpt</th>
              <th>合計pt</th>
            </tr>
          </thead>
          <tbody>`;
        plan.forEach(p => {
          html += `<tr>
            <td>${p.name}</td>
            <td style="text-align:right;">${p.useCount}</td>
            <td style="text-align:right;">${p.pointPerUnit}</td>
            <td style="text-align:right;">${p.totalPointForItem}</td>
          </tr>`;
        });
        html += `</tbody></table>`;
        html += `<p style="margin-top:2px; color:#ccc;">
          ※自動クラフトでは、手持ち数が多い料理素材から順に消費します。<br>
          余ったポイントは破棄されます。品質: 通常=1pt / 銀=2pt / 金=3pt。
        </p>`;
        detailEl.innerHTML = html;
      }
      return;
    }

    // プレビュー関数がない場合のフォールバック
    infoEl.textContent =
      `必要ポイント：${basePoint}pt（料理素材ポイント合計。通常=1pt / 銀=2pt / 金=3pt）`;
    return;
  }

  // その他（未知カテゴリ）は "-" 表示にフォールバック
  infoEl.textContent = "必要素材：-";
}

// =======================
// 素材チェック・消費（ITEM_META 一元化）
// =======================

// cost: { itemId: amount } を前提。一次素材も中間素材も、そのIDで判断。
function hasMaterials(cost){
  if (!cost) return false;

  refreshCraftSkillTreeBonus();
  const c = applyCraftCostReduction(cost) || {};

  if (typeof getItemCountByMeta !== "function") {
    return false;
  }

  return Object.keys(c).every(id => {
    const need = c[id] | 0;
    if (!need) return true;
    const have = getItemCountByMeta(id) || 0;
    return have >= need;
  });
}

function consumeMaterials(cost){
  if (!cost) return;

  refreshCraftSkillTreeBonus();
  const c = applyCraftCostReduction(cost) || {};

  if (typeof removeItemByMeta !== "function") {
    return;
  }

  Object.keys(c).forEach(id => {
    const need = c[id] | 0;
    if (!need) return;
    removeItemByMeta(id, need);
  });
}

// =======================
// 料理素材（ITEM_META 一元化版）
// =======================

// cost: { itemId: amount } を前提。
// 旧 cookingMats ではなく、storageKind: "cooking" のストレージImpl経由で判定・消費する。
function hasCookingMaterials(cost){
  if (!cost) return false;

  if (typeof getItemCountByMeta !== "function") return false;

  refreshCraftSkillTreeBonus();
  const rate = craftSkillTreeBonus.craftCostReduceRate || 0;

  return Object.keys(cost).every(id => {
    const rawNeed = cost[id] | 0;
    if (!rawNeed) return true;
    let need = rawNeed;
    if (rate > 0) {
      need = Math.max(0, Math.floor(rawNeed * (1 - rate)));
    }
    const have = getItemCountByMeta(id) || 0;
    return have >= need;
  });
}

function consumeCookingMaterials(cost){
  if (!cost) return;

  if (typeof removeItemByMeta !== "function") return;

  refreshCraftSkillTreeBonus();
  const rate = craftSkillTreeBonus.craftCostReduceRate || 0;

  Object.keys(cost).forEach(id => {
    const rawNeed = cost[id] | 0;
    if (!rawNeed) return;
    let need = rawNeed;
    if (rate > 0) {
      need = Math.max(0, Math.floor(rawNeed * (1 - rate)));
    }
    if (need > 0) {
      removeItemByMeta(id, need);
    }
  });
}

function hasCookingMaterialsByRequires(recipe){
  if (!recipe || !Array.isArray(recipe.requires)) return false;
  if (typeof getItemCountByMeta !== "function") return false;

  refreshCraftSkillTreeBonus();
  const rate = craftSkillTreeBonus.craftCostReduceRate || 0;

  return recipe.requires.every(req => {
    const rawNeed = req.amount | 0;
    const id = req.id;
    if (!rawNeed || !id) return true;
    let need = rawNeed;
    if (rate > 0) {
      need = Math.max(0, Math.floor(rawNeed * (1 - rate)));
    }
    const have = getItemCountByMeta(id) || 0;
    return have >= need;
  });
}

function consumeCookingMaterialsByRequires(recipe){
  if (!recipe || !Array.isArray(recipe.requires)) return;
  if (typeof removeItemByMeta !== "function") return;

  refreshCraftSkillTreeBonus();
  const rate = craftSkillTreeBonus.craftCostReduceRate || 0;

  recipe.requires.forEach(req => {
    const rawNeed = req.amount | 0;
    const id = req.id;
    if (!rawNeed || !id) return;
    let need = rawNeed;
    if (rate > 0) {
      need = Math.max(0, Math.floor(rawNeed * (1 - rate)));
    }
    if (need > 0) {
      removeItemByMeta(id, need);
    }
  });
}

// =======================
// ギルドによるクラフト成功率ボーナス
// =======================

// smith: weapon / armor, alchemist: potion / tool, cooking: food / drink
function getGuildCraftSuccessBonus(category) {
  if (!window.playerGuildId) return 0;
  const guildId = window.playerGuildId;

  // ★修正: 以前はここに guild.js のランク閾値（0/50/100/200/350/500）と
  //   食い違う独自の閾値（0/10/30/70/150/300）を複製していたため、
  //   ギルド画面に表示されるランクと、実際にクラフト成功率へ乗る
  //   ランクがズレる不具合になっていた。
  //   getGuildFame / getGuildRankInfo（guild.js側の正本）を直接使う方式に変更。
  const fame = (typeof getGuildFame === "function") ? getGuildFame(guildId) : 0;
  const rankInfo = (typeof getGuildRankInfo === "function") ? getGuildRankInfo(fame) : null;
  const currentRank = rankInfo ? rankInfo.id : 0;
  if (currentRank <= 0) return 0;

  // ランク毎 +2% => rank * 0.02
  const bonusPerRank = 0.02;
  const bonus = currentRank * bonusPerRank;

  // ギルド×カテゴリの対応
  if (guildId === "smith" && (category === "weapon" || category === "armor")) {
    return bonus;
  }
  if (guildId === "alchemist" && (category === "potion" || category === "tool")) {
    return bonus;
  }
  if (guildId === "cooking" && (category === "food" || category === "drink")) {
    return bonus;
  }

  return 0;
}

// =======================
// 装備ラベル共通ヘルパー（接頭語対応）
// =======================

// inst: { id, quality, enhance, durability, options }
// weapons/armors, MAX_DURABILITY, EQUIP_PREFIXES などは別ファイルで定義済み前提。
function buildWeaponLabelFromInstance(inst) {
  if (!inst || !inst.id) return "";

  let baseName = inst.id;
  if (typeof getItemNameFromMeta === "function") {
    // ITEM_META.name 優先（武器名）
    baseName = getItemNameFromMeta(inst.id) || inst.id;
  } else if (Array.isArray(weapons)) {
    const w = weapons.find(x => x.id === inst.id);
    if (w && w.name) baseName = w.name;
  }

  let qLabel = "";
  if (typeof inst.quality === "number" && inst.quality > 0) {
    const qIndex = inst.quality;
    qLabel = QUALITY_NAMES[qIndex] || "";
  }

  const enh = inst.enhance || 0;
  const enhLabel = enh > 0 ? `+${enh}` : "";

  const dur = (typeof inst.durability === "number")
    ? inst.durability
    : (typeof MAX_DURABILITY === "number" ? MAX_DURABILITY : 0);
  const durLabel = dur > 0 ? `耐久${dur}` : "";

  let prefix = "";
  let optDesc = "";
  if (Array.isArray(inst.options) && inst.options.length > 0) {
    const opt = inst.options[0];
    if (opt && opt.prefix) prefix = opt.prefix;
    if (opt && opt.desc)   optDesc = ` (${opt.desc})`;
  }

  const nameWithPrefix = prefix ? `${prefix}${baseName}` : baseName;

  let label = "";
  if (qLabel) label += qLabel;
  label += nameWithPrefix;
  if (enhLabel) label += ` ${enhLabel}`;
  if (durLabel) label += ` ${durLabel}`;
  if (optDesc)  label += optDesc;

  return label;
}

function buildArmorLabelFromInstance(inst) {
  if (!inst || !inst.id) return "";

  let baseName = inst.id;
  if (typeof getItemNameFromMeta === "function") {
    // ITEM_META.name 優先（防具名）
    baseName = getItemNameFromMeta(inst.id) || inst.id;
  } else if (Array.isArray(armors)) {
    const a = armors.find(x => x.id === inst.id);
    if (a && a.name) baseName = a.name;
  }

  let qLabel = "";
  if (typeof inst.quality === "number" && inst.quality > 0) {
    const qIndex = inst.quality;
    qLabel = QUALITY_NAMES[qIndex] || "";
  }

  const enh = inst.enhance || 0;
  const enhLabel = enh > 0 ? `+${enh}` : "";

  const dur = (typeof inst.durability === "number")
    ? inst.durability
    : (typeof MAX_DURABILITY === "number" ? MAX_DURABILITY : 0);
  const durLabel = dur > 0 ? `耐久${dur}` : "";

  let prefix = "";
  let optDesc = "";
  if (Array.isArray(inst.options) && inst.options.length > 0) {
    const opt = inst.options[0];
    if (opt && opt.prefix) prefix = opt.prefix;
    if (opt && opt.desc)   optDesc = ` (${opt.desc})`;
  }

  const nameWithPrefix = prefix ? `${prefix}${baseName}` : baseName;

  let label = "";
  if (qLabel) label += qLabel;
  label += nameWithPrefix;
  if (enhLabel) label += ` ${enhLabel}`;
  if (durLabel) label += ` ${durLabel}`;
  if (optDesc)  label += optDesc;

  return label;
}