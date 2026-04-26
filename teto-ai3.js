// teto-ai3.js
// テトちゃん戦略レイヤー（独立せず、teto-ai.js の tick 前に呼ばれる）
// - 探索エリア・採取フィールド/対象・クラフトカテゴリ・市場モードを事前にセット
// - window.tetoPersonality / window.tetoAiLevel を軽く参照（※性格差は弱め）
// - 既存の runTestChan / teto-ai.js / teto-ai2.js の仕様には一切手を入れない

(function () {
  "use strict";

  // =========================
  // ユーティリティ
  // =========================

  function getPersonality() {
    return window.tetoPersonality || "balanced"; // battle / life / merchant / hardcore / balanced
  }

  function getAiLevel() {
    return window.tetoAiLevel || "normal"; // simple / normal / smart
  }

  function getPlayerSnapshot() {
    return {
      money: typeof window.money === "number" ? window.money : 0,
      jobId: typeof window.jobId === "number" ? window.jobId : 0,
      isExploring: !!window.isExploring,
      currentEnemy: !!window.currentEnemy
    };
  }

  function getInventorySnapshot() {
    return (typeof window.tetoGetInventoryStatus === "function")
      ? window.tetoGetInventoryStatus()
      : {
          carryPotions: {},
          carryTools: {},
          carryFoods: {},
          carryDrinks: {}
        };
  }

  function getGatherSnapshot() {
    return (typeof window.tetoGetGatherStatus === "function")
      ? window.tetoGetGatherStatus()
      : { gatherSkills: null, lastGatherInfo: null };
  }

  function getResourceSnapshot() {
    // teto-ai.js 側のリソーススナップショットが公開されている想定
    if (typeof window.tetoGetResourceStatus === "function") {
      return window.tetoGetResourceStatus();
    }
    return {
      hunger: typeof window.currentHunger === "number" ? window.currentHunger : null,
      thirst: typeof window.currentThirst === "number" ? window.currentThirst : null,
      money: typeof window.money === "number" ? window.money : null
    };
  }

  function getBattleSnapshot() {
    return (typeof window.tetoGetBattleStatus === "function")
      ? window.tetoGetBattleStatus()
      : { hp: null, hpMax: null, currentEnemy: null };
  }

  // =========================
  // 撤退開始ロジック（探索側）
  // =========================

  // 探索中で、かつ HP やポーション状況が危険なときに「エリアからの撤退」を開始する。
  function maybeStartAreaRetreat() {
    // 戦闘中はここでは撤退を扱わない（戦闘側の逃走に任せる）
    if (window.currentEnemy) return;
    if (!window.isExploring) return;
    if (window.isRetreating) return;
    if (typeof window.startRetreatFromCurrentArea !== "function") return;

    const bs  = getBattleSnapshot();
    const inv = getInventorySnapshot();

    if (bs.hp == null || bs.hpMax == null || bs.hpMax <= 0) return;
    const hpRate = bs.hp / bs.hpMax;

    const hasPotion = inv.carryPotions && Object.keys(inv.carryPotions).length > 0;
    const recentFail = window._tetoRecentBattleFailCount || 0;

    // 基本ライン: HP 15% 未満で、ポーションも持っていないときは撤退候補
    if (hpRate >= 0.15) return;
    if (hasPotion) return;

    // 連敗が多いほど撤退しやすくする（性格非依存）
    let retreatChance = 0.3;
    if (hpRate < 0.1) retreatChance = 0.8;
    if (recentFail >= 2) retreatChance += 0.2;
    if (recentFail >= 4) retreatChance += 0.2;
    if (retreatChance > 0.95) retreatChance = 0.95;

    if (Math.random() < retreatChance) {
      window.startRetreatFromCurrentArea();
      if (typeof window.tetoIncCounter === "function") {
        try {
          window.tetoIncCounter("retreatsArea");
        } catch (e) {}
      }
    }
  }

  // =========================
  // 探索用 戦略
  // =========================

  // exploreTarget の option から「それっぽいエリア」を選ぶ
  function chooseExploreTarget() {
    const select = document.getElementById("exploreTarget");
    if (!select || !select.options.length) return null;

    const opts = Array.from(select.options).map(o => o.value);

    // 名前からざっくり推測: フィールド / 森 / 洞窟 / 鉱山 など
    const easyKeywords = ["原っぱ", "field", "草原"];
    const midKeywords  = ["森", "forest", "丘"];
    const hardKeywords = ["洞窟", "cave", "鉱山", "mine"];

    function score(v) {
      let s = 0;
      easyKeywords.forEach(k => { if (v.includes(k)) s += 1; });
      midKeywords.forEach(k => { if (v.includes(k)) s += 2; });
      hardKeywords.forEach(k => { if (v.includes(k)) s += 3; });
      return s;
    }

    const scored = opts.map(v => ({ v, s: score(v) }));

    // ★性格に依存せず、「中難度（s=2）を優先、なければ全体からランダム」
    let candidates = scored.filter(x => x.s === 2);
    if (!candidates.length) {
      candidates = scored;
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return pick ? pick.v : null;
  }

  function strategicPreTickBattleMain() {
    const sel = document.getElementById("exploreTarget");
    if (sel) {
      const val = chooseExploreTarget();
      if (val != null) {
        sel.value = val;
      }
    }

    // 探索戦闘メインのときに、HP が危険ならエリア撤退を検討
    maybeStartAreaRetreat();
  }

  // =========================
  // 採取用 戦略
  // =========================

  function chooseGatherFieldId(gatherSnap) {
    // field1: 安全, field2/3: 高Tier
    const level = getAiLevel();

    // smart は高Tier寄り、それ以外は field1/2 ランダム
    if (level === "smart") {
      const r = Math.random();
      if (r < 0.5) return "field2";
      return "field3";
    }

    // 通常: field1/2 ランダム
    return Math.random() < 0.7 ? "field1" : "field2";
  }

  function strategicPreTickGatherMain() {
    const fieldSel  = document.getElementById("gatherField");
    const targetSel = document.getElementById("gatherTarget");
    if (!fieldSel || !targetSel) return;

    const gSnap = getGatherSnapshot();

    // まず target が空なら候補生成
    if (!targetSel.value && typeof window.refreshGatherTargetSelect === "function") {
      window.refreshGatherTargetSelect();
    }

    // フィールド選択
    const nextField = chooseGatherFieldId(gSnap);
    fieldSel.value = nextField;

    // gatherField に応じて target のロック条件が変わるので再計算
    if (typeof window.refreshGatherFieldSelect === "function") {
      window.refreshGatherFieldSelect();
    }
  }

  // =========================
  // クラフト用 戦略
  // =========================

  function chooseCraftCategory() {
    const level = getAiLevel();
    const res = getResourceSnapshot();
    const inv = getInventorySnapshot();
    const player = getPlayerSnapshot();

    const cats = [];
    function pushMany(id, w) {
      for (let i = 0; i < w; i++) cats.push(id);
    }

    const lowFoodStock  = !inv.carryFoods || Object.keys(inv.carryFoods).length < 2;
    const lowDrinkStock = !inv.carryDrinks || Object.keys(inv.carryDrinks).length < 2;
    const lowHunger = res.hunger != null && res.hunger < 50;
    const lowThirst = res.thirst != null && res.thirst < 50;

    const jobId = player.jobId || 0;

    const wantCookingForSurvival = (lowHunger || lowThirst) && (lowFoodStock || lowDrinkStock);
    const isMagicBuild = (jobId === 1 || jobId === 3);
    const isBattleBuild = (jobId === 0 || jobId === 2);

    // ★性格ベースではなく、「バランス＋生存寄り」な重み付け
    pushMany("weapon", 2);
    pushMany("armor", 2);
    pushMany("potion", isMagicBuild ? 3 : 2);
    pushMany("material", 2);

    if (wantCookingForSurvival) {
      pushMany("cooking", 4);
    } else {
      pushMany("cooking", 2);
    }

    // 生活系レシピがあれば少しだけ
    pushMany("life", 1);

    if (!cats.length) return "weapon";
    const pick = cats[Math.floor(Math.random() * cats.length)];
    return pick;
  }

  function strategicPreTickCraftMain() {
    // craftCategoryTabs の data-cat をクリック相当で切り替え
    const tabs = document.querySelectorAll("#craftCategoryTabs .craft-cat-tab");
    if (!tabs || !tabs.length) return;

    const cat = chooseCraftCategory();
    let targetBtn = null;
    tabs.forEach(btn => {
      const c = btn.getAttribute("data-cat");
      const active = (c === cat);
      btn.classList.toggle("active", active);
      const panelId =
        c === "weapon"    ? "craftPanelWeapon" :
        c === "armor"     ? "craftPanelArmor" :
        c === "potion"    ? "craftPanelPotion" :
        c === "tool"      ? "craftPanelTool" :
        c === "material"  ? "craftPanelMaterial" :
        c === "cooking"   ? "craftPanelCooking" :
        c === "life"      ? "craftPanelLife" : null;

      if (panelId) {
        const panel = document.getElementById(panelId);
        if (panel) {
          panel.style.display = active ? "" : "none";
        }
      }

      if (active) {
        targetBtn = btn;
      }
    });

    // カテゴリごとにセレクトを適当に埋めておく（初期値優先）
    const catSelMap = {
      weapon:    "weaponSelect",
      armor:     "armorSelect",
      potion:    "potionSelect",
      tool:      "toolSelect",
      material:  "intermediateSelect",
      cooking:   "foodSelect",   // まず食べ物タブ
      life:      "fertilizerSelect"
    };

    const selId = catSelMap[cat];
    if (selId) {
      const sel = document.getElementById(selId);
      if (sel && sel.options.length && !sel.value) {
        sel.value = sel.options[0].value;
      }
    }
  }

  // =========================
  // 市場用 戦略
  // =========================

  function strategicPreTickLifeMain() {
    const ps = getPlayerSnapshot();
    const p  = getPersonality();

    const tabSell = document.getElementById("marketTabSell");
    const tabBuy  = document.getElementById("marketTabBuy");
    const sellPanel = document.getElementById("marketSellPanel");
    const buyPanel  = document.getElementById("marketBuyPanel");

    if (!tabSell || !tabBuy || !sellPanel || !buyPanel) return;

    // ★性格に依存しすぎず、お金が少なければ売却、お金に余裕があれば少し買い寄り、あとはランダム
    let useSell;
    if (ps.money < 500) {
      useSell = true;
    } else if (ps.money > 1500) {
      useSell = false;
    } else {
      useSell = Math.random() < 0.5;
    }

    // タブ切り替えだけ事前にやる（実際の出品/購入は teto-ai / teto-ai2 側が呼ぶ）
    tabSell.classList.toggle("active", useSell);
    tabBuy.classList.toggle("active", !useSell);
    sellPanel.style.display = useSell ? "" : "none";
    buyPanel.style.display  = useSell ? "none" : "";
  }

  // =========================
  // 混合モード
  // =========================

  function strategicPreTickMixed() {
    const r = Math.random();
    if (r < 0.3) {
      strategicPreTickBattleMain();
    } else if (r < 0.6) {
      strategicPreTickGatherMain();
    } else if (r < 0.8) {
      strategicPreTickCraftMain();
    } else {
      strategicPreTickLifeMain();
    }
  }

  // =========================
  // 公開 API
  // =========================

  function tetoStrategicPreTick(mode) {
    try {
      if (mode === "battleMain") {
        strategicPreTickBattleMain();
      } else if (mode === "gatherMain") {
        strategicPreTickGatherMain();
      } else if (mode === "craftMain") {
        strategicPreTickCraftMain();
      } else if (mode === "lifeMain") {
        strategicPreTickLifeMain();
      } else {
        strategicPreTickMixed();
      }
    } catch (e) {
      console.warn("[teto-ai3] strategic pre-tick error:", e);
    }
  }

  window.tetoStrategicPreTick = tetoStrategicPreTick;
})();