// teto-ai3.js
// テトちゃん戦略レイヤー（独立せず、teto-ai.js の tick 前に呼ばれる）
// - 探索エリア・採取フィールド/対象・クラフトカテゴリ・市場モードを事前にセット
// - window.tetoAiLevel を軽く参照（※性格差は弱め）
// - 既存の runTestChan / teto-ai.js / teto-ai2.js の仕様には一切手を入れない
//
// 追加:
// - テト用学習ストレージ window.tetoLearn
// - tetoOnBattleCommitted(resultType, info)
// - tetoOnPlayerDeath(cause)
// 将来のユーティリティAIの土台（現状は既存挙動に影響しない）

(function () {
  "use strict";

  // =========================
  // テト用 学習ストレージ
  // =========================

  if (typeof window !== "undefined") {
    window.tetoLearn = window.tetoLearn || {
      // 目標値系（在庫の目安）
      desiredPotions: 3,
      desiredFoods: 2,
      desiredDrinks: 2,

      // 安全系
      totalDeaths: 0,
      recentDeaths: 0,
      deathCauseBattle: 0,
      deathCauseTrap: 0,
      deathCauseOther: 0,

      // 戦闘感覚
      battleSamples: 0,
      avgMaxTaken: 0,
      avgMaxDamage: 0,

      // ポーション不足が疑われる死亡回数
      deathSuspectNoPotion: 0,

      // エリア戦績
      areaStats: {
        // [areaId]: { visits, wins, losses }
      },

      // 重み（将来のユーティリティAI用）
      weights: {
        safety: 1.0,
        growth: 1.0,
        resourceCare: 1.0
      }
    };
  }

  // =========================
  // ユーティリティ
  // =========================

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
    // teto-ai.js / teto-ai4.js 側のリソーススナップショットが公開されている想定
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
      : { hp: null, hpMax: null, mp: null, mpMax: null, currentEnemy: null };
  }

  function getEquipSnapshot() {
    return (typeof window.tetoGetEquipStatus === "function")
      ? window.tetoGetEquipStatus()
      : {
          equippedWeaponId: null,
          equippedArmorId: null,
          weaponInstances: null,
          armorInstances: null
        };
  }

  // 安全な getItemMeta ラッパ
  function safeGetItemMeta(id) {
    if (!id || typeof window.getItemMeta !== "function") return null;
    try {
      return window.getItemMeta(id);
    } catch (e) {
      return null;
    }
  }

  // 現在装備のざっくり戦闘力スコア（ジョブと戦闘状況で軽く補正）
  function estimateEquipScore(itemMeta) {
    if (!itemMeta || typeof itemMeta !== "object") return 0;
    const st = itemMeta.status || itemMeta.stats || {};
    const player = getPlayerSnapshot();
    const learn  = window.tetoLearn || {};
    const jobId = player.jobId || 0;

    // ベースの重み
    let wAtk = 1.0;
    let wMatk = 1.0;
    let wDef = 0.7;
    let wMdef = 0.7;
    let wHpMax = 0.05;
    let wSpMax = 0.03;
    let wMpMax = 0.03;

    // ジョブによる補正（物理職/魔法職で少し寄せる）
    const isPhys = (jobId === 0 || jobId === 2);
    const isMagic = (jobId === 1 || jobId === 3);
    if (isPhys) {
      wAtk *= 1.3;
      wMatk *= 0.7;
      wDef *= 1.1;
    } else if (isMagic) {
      wAtk *= 0.7;
      wMatk *= 1.3;
      wMpMax *= 1.2;
    }

    // 戦闘状況による安全寄せ（被ダメが痛いときは防御寄り）
    const avgTaken = learn.avgMaxTaken || 0;
    const avgDamage = learn.avgMaxDamage || 0;
    if (avgTaken > 0 && avgTaken >= avgDamage * 0.7) {
      wDef *= 1.2;
      wMdef *= 1.2;
      wHpMax *= 1.2;
    }

    let s = 0;
    if (typeof st.atk === "number") s += st.atk * wAtk;
    if (typeof st.def === "number") s += st.def * wDef;
    if (typeof st.matk === "number") s += st.matk * wMatk;
    if (typeof st.mdef === "number") s += st.mdef * wMdef;
    if (typeof st.hpMax === "number") s += st.hpMax * wHpMax;
    if (typeof st.spMax === "number") s += st.spMax * wSpMax;
    if (typeof st.mpMax === "number") s += st.mpMax * wMpMax;
    if (typeof itemMeta.rarity === "number") s += itemMeta.rarity * 5;
    return s;
  }

  // セレクトの options から value 配列を取る
  function getSelectValues(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel || !sel.options || !sel.options.length) return [];
    return Array.from(sel.options).map(o => o.value).filter(v => v);
  }

  // 重み付きランダム
  function weightedPick(candidates, weightFn) {
    if (!candidates || !candidates.length) return null;
    let total = 0;
    const wList = candidates.map(c => {
      const w = Math.max(0, weightFn(c) || 0);
      total += w;
      return w;
    });
    if (total <= 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    let r = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
      r -= wList[i];
      if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  // =========================
  // テト用: 戦闘結果フィードバック
  // =========================
  //
  // game-core-3.js の commitCurrentBattleStats の末尾から、
  // isTetoControlling が true のときだけ呼ばれる想定。
  // info には { areaId, maxTaken, maxDamage, result } などが来る想定。

  function tetoOnBattleCommitted(resultType, info) {
    const learn = window.tetoLearn;
    if (!learn) return;

    const maxTaken  = info && typeof info.maxTaken  === "number" ? info.maxTaken  : 0;
    const maxDamage = info && typeof info.maxDamage === "number" ? info.maxDamage : 0;

    const n = (learn.battleSamples || 0) + 1;
    learn.battleSamples = n;

    learn.avgMaxTaken  = ((learn.avgMaxTaken  * (n - 1)) + maxTaken)  / n;
    learn.avgMaxDamage = ((learn.avgMaxDamage * (n - 1)) + maxDamage) / n;

    // エリア戦績更新
    if (info && info.areaId) {
      const areaId = String(info.areaId);
      const stats = learn.areaStats[areaId] || { visits: 0, wins: 0, losses: 0 };
      stats.visits++;
      if (resultType === "win") stats.wins++;
      else if (resultType === "lose") stats.losses++;
      learn.areaStats[areaId] = stats;
    }

    const recentFail = window._tetoRecentBattleFailCount || 0;
    if (resultType === "lose") {
      // 将来: weights.safety を少し上げる余地
    } else if (resultType === "win" && recentFail === 0 && learn.recentDeaths === 0) {
      // 将来: weights.growth を少し上げる余地
    }
  }

  // =========================
  // テト用: 死亡フィードバック
  // =========================

  function tetoOnPlayerDeath(cause) {
    const learn = window.tetoLearn;
    if (!learn) return;

    learn.totalDeaths = (learn.totalDeaths || 0) + 1;
    learn.recentDeaths = (learn.recentDeaths || 0) + 1;
    if (learn.recentDeaths > 10) learn.recentDeaths = 10;

    if (cause === "battle") {
      learn.deathCauseBattle = (learn.deathCauseBattle || 0) + 1;
    } else if (cause === "trap") {
      learn.deathCauseTrap = (learn.deathCauseTrap || 0) + 1;
    } else {
      learn.deathCauseOther = (learn.deathCauseOther || 0) + 1;
    }

    const inv = getInventorySnapshot();
    const hasPotion =
      inv.carryPotions && Object.keys(inv.carryPotions).length > 0;
    if (!hasPotion) {
      learn.deathSuspectNoPotion = (learn.deathSuspectNoPotion || 0) + 1;
    }
  }

  // =========================
  // 将来用: 高レイヤー意思決定の枠（未使用）
  // =========================

  function tetoDecideHighLevelAction(context) {
    return null;
  }

  // =========================
  // 撤退開始ロジック（探索側）
  // =========================

  function maybeStartAreaRetreat() {
    if (window.currentEnemy) return;
    if (!window.isExploring) return;
    if (window.isRetreating) return;

    const bs  = getBattleSnapshot();
    const inv = getInventorySnapshot();

    if (bs.hp == null || bs.hpMax == null || bs.hpMax <= 0) return;
    const hpRate = bs.hp / bs.hpMax;

    const hasPotion = inv.carryPotions && Object.keys(inv.carryPotions).length > 0;
    const recentFail = window._tetoRecentBattleFailCount || 0;

    if (hpRate >= 0.15) return;
    if (hasPotion) return;

    let retreatChance = 0.3;
    if (hpRate < 0.1) retreatChance = 0.8;
    if (recentFail >= 2) retreatChance += 0.2;
    if (recentFail >= 4) retreatChance += 0.2;
    if (retreatChance > 0.95) retreatChance = 0.95;

    if (Math.random() < retreatChance) {
      window.isRetreating = true;
      window.retreatTurnsLeft =
        (typeof window.RETREAT_TURNS === "number") ? window.RETREAT_TURNS : 3;

      if (typeof window.appendLog === "function") {
        window.appendLog("[テト] 危険と判断し、街への撤退を開始した…");
      }
      if (typeof window.updateReturnTownButton === "function") {
        window.updateReturnTownButton();
      }

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

  function getAreaIdFromOptionValue(v) {
    // exploreTarget の value がそのまま areaId ならそのまま使う
    return v ? String(v) : null;
  }

  function chooseExploreTarget() {
    const select = document.getElementById("exploreTarget");
    if (!select || !select.options.length) return null;

    const opts = Array.from(select.options).map(o => o.value);
    const learn = window.tetoLearn || {};
    const areaStats = learn.areaStats || {};

    const easyKeywords = ["原っぱ", "field", "草原"];
    const midKeywords  = ["森", "forest", "丘"];
    const hardKeywords = ["洞窟", "cave", "鉱山", "mine"];

    function baseScore(v) {
      let s = 0;
      easyKeywords.forEach(k => { if (v.includes(k)) s += 1; });
      midKeywords.forEach(k => { if (v.includes(k)) s += 2; });
      hardKeywords.forEach(k => { if (v.includes(k)) s += 3; });
      return s;
    }

    // 難度＋エリア戦績を重ねたスコア
    const scored = opts.map(v => {
      const b = baseScore(v); // 1〜3 くらい
      const areaId = getAreaIdFromOptionValue(v);
      const st = areaId && areaStats[areaId] ? areaStats[areaId] : null;
      let w = b || 1;

      if (st && st.visits >= 3) {
        const lossRate = st.losses / st.visits;
        const winRate  = st.wins   / st.visits;
        if (lossRate > 0.5) {
          // 負け過ぎているエリアは重みを下げる
          w *= 0.4;
        } else if (winRate > 0.8) {
          // 余裕すぎるエリアも少し下げて中難度へ寄せる
          w *= 0.7;
        }
      }

      return { v, w };
    });

    const total = scored.reduce((a, x) => a + x.w, 0);
    if (total <= 0) {
      const pick0 = scored[Math.floor(Math.random() * scored.length)];
      return pick0 ? pick0.v : null;
    }
    let r = Math.random() * total;
    for (let i = 0; i < scored.length; i++) {
      r -= scored[i].w;
      if (r <= 0) return scored[i].v;
    }
    return scored[scored.length - 1].v;
  }

  function strategicPreTickBattleMain() {
    const sel = document.getElementById("exploreTarget");
    if (sel) {
      const val = chooseExploreTarget();
      if (val != null) {
        sel.value = val;
      }
    }

    maybeStartAreaRetreat();
  }

  // =========================
  // 採取用 戦略
  // =========================

  function chooseGatherFieldId(gatherSnap) {
    const level = getAiLevel();

    if (level === "smart") {
      const r = Math.random();
      if (r < 0.5) return "field2";
      return "field3";
    }

    return Math.random() < 0.7 ? "field1" : "field2";
  }

  function strategicPreTickGatherMain() {
    const fieldSel  = document.getElementById("gatherField");
    const targetSel = document.getElementById("gatherTarget");
    if (!fieldSel || !targetSel) return;

    const gSnap = getGatherSnapshot();

    if (!targetSel.value && typeof window.refreshGatherTargetSelect === "function") {
      window.refreshGatherTargetSelect();
    }

    const nextField = chooseGatherFieldId(gSnap);
    fieldSel.value = nextField;

    if (typeof window.refreshGatherFieldSelect === "function") {
      window.refreshGatherFieldSelect();
    }
  }

  // =========================
  // クラフト用 戦略
  // =========================

  // desiredXXX と在庫数から「不足度」係数を返す（多すぎると <1, 足りないと >1）
  function shortageFactor(current, desired) {
    if (!desired || desired <= 0) return 1;
    if (current <= desired) {
      // 足りてないほど大きく
      return 1 + (desired - current) * 0.5;
    }
    // 多すぎるとだんだん小さく
    const over = current - desired;
    return 1 / (1 + over * 0.7);
  }

  // --- 武器レシピ選択 ---

  function pickWeaponRecipeId() {
    const values = getSelectValues("weaponSelect");
    if (!values.length) return null;

    const eq = getEquipSnapshot();
    const currentMeta = safeGetItemMeta(eq.equippedWeaponId);
    const currentScore = estimateEquipScore(currentMeta);

    return weightedPick(values, id => {
      const meta = safeGetItemMeta(id);
      if (!meta) return 1;

      const score = estimateEquipScore(meta);
      let w = 1;

      if (score > currentScore * 1.2) w += 5;
      else if (score > currentScore * 0.8) w += 3;
      else w += 1;

      if (meta.type === (currentMeta && currentMeta.type)) {
        w += 2;
      }

      // 同じ武器IDの所持数による抑制（3個までは許容、それ以上は強く抑える）
      const have =
        (typeof window.weaponCounts === "object" && window.weaponCounts[id])
          ? window.weaponCounts[id] | 0
          : 0;
      if (have >= 3) {
        w *= 0.2;
      } else if (have >= 2) {
        w *= 0.5;
      }

      return w;
    });
  }

  // --- 防具レシピ選択 ---

  function pickArmorRecipeId() {
    const values = getSelectValues("armorSelect");
    if (!values.length) return null;

    const eq = getEquipSnapshot();
    const currentMeta = safeGetItemMeta(eq.equippedArmorId);
    const currentScore = estimateEquipScore(currentMeta);

    return weightedPick(values, id => {
      const meta = safeGetItemMeta(id);
      if (!meta) return 1;

      const score = estimateEquipScore(meta);
      let w = 1;

      if (score > currentScore * 1.2) w += 5;
      else if (score > currentScore * 0.8) w += 3;
      else w += 1;

      if (meta.type === (currentMeta && currentMeta.type)) {
        w += 2;
      }

      const have =
        (typeof window.armorCounts === "object" && window.armorCounts[id])
          ? window.armorCounts[id] | 0
          : 0;
      if (have >= 3) {
        w *= 0.2;
      } else if (have >= 2) {
        w *= 0.5;
      }

      return w;
    });
  }

  // --- ポーションレシピ選択 ---

  function classifyPotion(meta) {
    if (!meta || typeof meta !== "object") return "other";
    const e = meta.effect || meta.effects || {};
    if (e.hpHeal || e.hpHealRate) return "hp";
    if (e.mpHeal || e.mpHealRate) return "mp";
    if (e.spHeal || e.spHealRate) return "sp";
    if (e.removeStatus || e.statusResistRate) return "status";
    return "other";
  }

  function pickPotionRecipeId() {
    const values = getSelectValues("potionSelect");
    if (!values.length) return null;

    const inv = getInventorySnapshot();
    const res = getResourceSnapshot();
    const bs  = getBattleSnapshot();
    const learn = window.tetoLearn || {};

    const potionCounts = {};
    if (inv.carryPotions) {
      Object.keys(inv.carryPotions).forEach(id => {
        potionCounts[id] = inv.carryPotions[id] | 0;
      });
    }

    const totalPotions = Object.values(potionCounts).reduce((a, x) => a + x, 0);
    const desiredTotal = learn.desiredPotions || 3;
    const globalShortage = shortageFactor(totalPotions, desiredTotal);

    return weightedPick(values, id => {
      const meta = safeGetItemMeta(id);
      if (!meta) return 1;

      const type = classifyPotion(meta);
      const have = potionCounts[id] || 0;
      let w = 1;

      const hpRate = (bs.hp != null && bs.hpMax) ? bs.hp / bs.hpMax : 1;
      const mpRate = (bs.mp != null && bs.mpMax) ? bs.mp / bs.mpMax : 1;

      if (type === "hp") {
        if (hpRate < 0.6) w += 4;
        else w += 2;
      } else if (type === "mp") {
        if (mpRate < 0.5) w += 4;
        else w += 2;
      } else if (type === "status") {
        w += 2;
      } else {
        w += 1;
      }

      // 個別在庫による抑制
      if (have >= 5) w *= 0.3;
      else if (have >= 3) w *= 0.6;

      // 全体在庫が目標より少ないときは全体的に底上げ
      w *= globalShortage;

      if (res.money != null && res.money < 200) {
        w *= 0.7;
      }

      return w;
    });
  }

  // --- 料理レシピ選択（食事／飲み物） ---

  function classifyFood(meta) {
    if (!meta || typeof meta !== "object") return "other";
    const e = meta.effect || meta.effects || {};
    const t = meta.type || meta.category || "";

    // バフ系
    if (e.atkRate || e.physSkillRate) return "physBuff";
    if (e.matkRate || e.magicSkillRate) return "magicBuff";
    if (e.petAtkRate) return "petBuff";
    if (e.hpMaxRate || e.defRate || e.guardReductionRate) return "tankBuff";

    // 回復系
    if (e.hungerHeal || e.thirstHeal || t.indexOf("food") !== -1) return "basicFood";
    return "other";
  }

  function classifyDrink(meta) {
    if (!meta || typeof meta !== "object") return "other";
    const e = meta.effect || meta.effects || {};
    if (e.mpHeal || e.mpHealRate) return "mpDrink";
    if (e.spHeal || e.spHealRate) return "spDrink";
    if (e.thirstHeal) return "basicDrink";
    if (e.magicSkillRate || e.matkRate) return "magicBuff";
    return "other";
  }

  function pickFoodRecipeId() {
    const values = getSelectValues("foodSelect");
    if (!values.length) return null;

    const player = getPlayerSnapshot();
    const res    = getResourceSnapshot();
    const inv    = getInventorySnapshot();
    const learn  = window.tetoLearn || {};

    const jobId = player.jobId || 0;
    const isPhys = (jobId === 0 || jobId === 2);
    const isMagic = (jobId === 1 || jobId === 3);

    const foodCounts = {};
    if (inv.carryFoods) {
      Object.keys(inv.carryFoods).forEach(id => {
        foodCounts[id] = inv.carryFoods[id] | 0;
      });
    }
    const totalFoods = Object.values(foodCounts).reduce((a, x) => a + x, 0);
    const desiredTotal = learn.desiredFoods || 2;
    const globalShortage = shortageFactor(totalFoods, desiredTotal);

    return weightedPick(values, id => {
      const meta = safeGetItemMeta(id);
      if (!meta) return 1;
      const kind = classifyFood(meta);
      const have = foodCounts[id] || 0;
      let w = 1;

      const hunger = res.hunger != null ? res.hunger : 100;

      if (kind === "basicFood") {
        if (hunger < 60) w += 4;
        else if (hunger < 80) w += 2;
      } else if (kind === "physBuff") {
        if (isPhys) w += 4;
        else w += 2;
      } else if (kind === "magicBuff") {
        if (isMagic) w += 4;
        else w += 2;
      } else if (kind === "petBuff") {
        w += 2;
      } else if (kind === "tankBuff") {
        w += 2;
      } else {
        w += 1;
      }

      if (have >= 5) w *= 0.3;
      else if (have >= 3) w *= 0.6;

      w *= globalShortage;

      return w;
    });
  }

  function pickDrinkRecipeId() {
    const values = getSelectValues("drinkSelect");
    if (!values.length) return null;

    const res = getResourceSnapshot();
    const inv = getInventorySnapshot();
    const bs  = getBattleSnapshot();
    const learn = window.tetoLearn || {};

    const drinkCounts = {};
    if (inv.carryDrinks) {
      Object.keys(inv.carryDrinks).forEach(id => {
        drinkCounts[id] = inv.carryDrinks[id] | 0;
      });
    }
    const totalDrinks = Object.values(drinkCounts).reduce((a, x) => a + x, 0);
    const desiredTotal = learn.desiredDrinks || 2;
    const globalShortage = shortageFactor(totalDrinks, desiredTotal);

    return weightedPick(values, id => {
      const meta = safeGetItemMeta(id);
      if (!meta) return 1;
      const kind = classifyDrink(meta);
      const have = drinkCounts[id] || 0;
      let w = 1;

      const thirst = res.thirst != null ? res.thirst : 100;
      const mpRate = (bs.mp != null && bs.mpMax) ? bs.mp / bs.mpMax : 1;

      if (kind === "basicDrink") {
        if (thirst < 60) w += 4;
        else if (thirst < 80) w += 2;
      } else if (kind === "mpDrink" || kind === "magicBuff") {
        if (mpRate < 0.6) w += 4;
        else w += 2;
      } else if (kind === "spDrink") {
        w += 2;
      } else {
        w += 1;
      }

      if (have >= 5) w *= 0.3;
      else if (have >= 3) w *= 0.6;

      w *= globalShortage;

      return w;
    });
  }

  // --- 中間素材: 「必要になったら」寄りに軽くする ---

  function pickMaterialRecipeId() {
    const values = getSelectValues("intermediateSelect");
    if (!values.length) return null;

    return values[Math.floor(Math.random() * values.length)];
  }

  // --- クラフトカテゴリ選択 ---

  function chooseCraftCategory() {
    const level = getAiLevel();
    const res = getResourceSnapshot();
    const inv = getInventorySnapshot();
    const player = getPlayerSnapshot();
    const learn  = window.tetoLearn || {};

    const cats = [];
    function pushMany(id, w) {
      for (let i = 0; i < w; i++) cats.push(id);
    }

    const lowFoodStock  = !inv.carryFoods || Object.keys(inv.carryFoods).length < (learn.desiredFoods || 2);
    const lowDrinkStock = !inv.carryDrinks || Object.keys(inv.carryDrinks).length < (learn.desiredDrinks || 2);
    const lowHunger = res.hunger != null && res.hunger < 50;
    const lowThirst = res.thirst != null && res.thirst < 50;

    const jobId = player.jobId || 0;

    const wantCookingForSurvival = (lowHunger || lowThirst) && (lowFoodStock || lowDrinkStock);
    const isMagicBuild = (jobId === 1 || jobId === 3);
    const isBattleBuild = (jobId === 0 || jobId === 2);

    pushMany("weapon", isBattleBuild ? 3 : 2);
    pushMany("armor", isBattleBuild ? 3 : 2);
    pushMany("potion", isMagicBuild ? 3 : 2);
    pushMany("material", 2);

    if (wantCookingForSurvival) {
      pushMany("cooking", 4);
    } else {
      pushMany("cooking", 2);
    }

    pushMany("life", 1);

    if (!cats.length) return "weapon";
    const pick = cats[Math.floor(Math.random() * cats.length)];
    return pick;
  }

  function strategicPreTickCraftMain() {
    const tabs = document.querySelectorAll("#craftCategoryTabs .craft-cat-tab");
    if (!tabs || !tabs.length) return;

    const cat = chooseCraftCategory();

    const uiCategory =
      cat === "cooking" ? "cookingFood" :
      cat === "life"    ? "life" :
      cat;

    window.activeCraftCategory = uiCategory;
    window.lastCraftCategory   = uiCategory;

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

    // カテゴリごとに具体レシピも「自分で」選ぶ
    if (uiCategory === "weapon") {
      const id = pickWeaponRecipeId();
      const sel = document.getElementById("weaponSelect");
      if (sel && id) sel.value = id;
    } else if (uiCategory === "armor") {
      const id = pickArmorRecipeId();
      const sel = document.getElementById("armorSelect");
      if (sel && id) sel.value = id;
    } else if (uiCategory === "potion") {
      const id = pickPotionRecipeId();
      const sel = document.getElementById("potionSelect");
      if (sel && id) sel.value = id;
    } else if (uiCategory === "material") {
      const id = pickMaterialRecipeId();
      const sel = document.getElementById("intermediateSelect");
      if (sel && id) sel.value = id;
    } else if (uiCategory === "cookingFood") {
      const id = pickFoodRecipeId();
      const sel = document.getElementById("foodSelect");
      if (sel && id) sel.value = id;
    } else if (uiCategory === "cookingDrink") {
      const id = pickDrinkRecipeId();
      const sel = document.getElementById("drinkSelect");
      if (sel && id) sel.value = id;
    } else {
      // life / tool など、従来どおり「とりあえず先頭」を選ぶ
      const catSelMap = {
        weapon:    "weaponSelect",
        armor:     "armorSelect",
        potion:    "potionSelect",
        tool:      "toolSelect",
        material:  "intermediateSelect",
        cooking:   "foodSelect",
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
  }

  // =========================
  // 市場用 戦略
  // =========================

  function strategicPreTickLifeMain() {
    const ps = getPlayerSnapshot();

    const tabSell = document.getElementById("marketTabSell");
    const tabBuy  = document.getElementById("marketTabBuy");
    const sellPanel = document.getElementById("marketSellPanel");
    const buyPanel  = document.getElementById("marketBuyPanel");

    if (!tabSell || !tabBuy || !sellPanel || !buyPanel) return;

    let useSell;
    if (ps.money < 500) {
      useSell = true;
    } else if (ps.money > 1500) {
      useSell = false;
    } else {
      useSell = Math.random() < 0.5;
    }

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

  if (typeof window !== "undefined") {
    window.tetoStrategicPreTick = tetoStrategicPreTick;
    window.tetoOnBattleCommitted = tetoOnBattleCommitted;
    window.tetoOnPlayerDeath = tetoOnPlayerDeath;
  }

})();