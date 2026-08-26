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

      // ★新設: 職業カバレッジ（意志を持った転職判断用）
      // [jobId]: { battleSamples, sessionsPlayed }
      jobStats: {},

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

  // ★新設: 職業の物理/魔法スキル適性をjobs.jsのクエリ層から判定する共通ヘルパー。
  // 従来 isPhys/isMagic が jobId===0/1/2/3 の決め打ちで、大盾兵(100)・呪術師(101)・
  // 獣群使い(102)などのギルド職を一切考慮できていなかったのを修正するために追加。
  function getJobAptitude(jobId) {
    if (typeof jobCanUsePhysSkill === "function" && typeof jobCanUseMagic === "function") {
      // jobCanUsePhysSkill/jobCanUseMagic は window.player.jobId / window.jobId を直接見るため、
      // 渡された jobId が現在の実ジョブと一致する前提で使う（テトの判断は常に現在の実ステートに対して行うため問題ない）
      return { isPhys: jobCanUsePhysSkill(), isMagic: jobCanUseMagic() };
    }
    // フォールバック（jobs.js未読込時のみ）: 旧仕様
    return { isPhys: (jobId === 0 || jobId === 2), isMagic: (jobId === 1 || jobId === 3) };
  }

  function getPlayerSnapshot() {
    // ★修正: money は let 宣言でwindowに同期されておらず、window.money は常に
    // undefined だった（＝ここのmoneyは常に0固定になっていた）。素のmoneyを直接参照するよう修正
    return {
      money: typeof money === "number" ? money : 0,
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
      // ★修正: 同上のmoney同期バグ。素のmoneyを直接参照
      money: typeof money === "number" ? money : null
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
  //
  // ★修正: 従来は itemMeta.status / itemMeta.stats というネスト構造を参照していたが、
  // 実際の武器・防具メタ（combat-equip-data.js → registerItemDefs）はフラット構造
  // （atk / scaleStr / scaleInt / atkPctFixed、def / scaleVit / bonusDex / defPctFixed / hpPctFixed）
  // のため、st.atk 等は常に undefined で rarity 以外ほぼスコアに寄与していなかった。
  // 実データのフィールド名に合わせて全面的に書き直し、DEX（bonusDex）の重みも新設。
  function estimateEquipScore(itemMeta) {
    if (!itemMeta || typeof itemMeta !== "object") return 0;
    const player = getPlayerSnapshot();
    const learn  = window.tetoLearn || {};
    const jobId = player.jobId || 0;

    // プレイヤーの実効ステータス（装備・接頭語補正込み。未計算時は素のステにフォールバック）
    const effSTR = (typeof window.effSTR === "number") ? window.effSTR
                 : (typeof window.STR === "number" ? window.STR : 0);
    const effVIT = (typeof window.effVIT === "number") ? window.effVIT
                 : (typeof window.VIT === "number" ? window.VIT : 0);
    const effINT = (typeof window.effINT === "number") ? window.effINT
                 : (typeof window.INT_ === "number" ? window.INT_ : 0);

    // ベースの重み
    let wAtk      = 1.0;  // 武器の固定ATK
    let wScaleStr = 1.0;  // 武器のSTR倍率（実際のSTRに掛けて評価）
    let wScaleInt = 1.0;  // 武器のINT倍率
    let wDef      = 0.7;  // 防具の固定DEF
    let wScaleVit = 0.7;  // 防具のVIT倍率
    let wDex      = 1.5;  // ★新設: 防具のbonusDex（命中/回避に直結。要調整）
    let wPctBase  = 1000; // ％固定ボーナス系（atk/defPctFixed, hpPctFixed）の仮想母数。要調整

    // ジョブによる補正（物理職/魔法職で少し寄せる）
    const { isPhys, isMagic } = getJobAptitude(jobId);
    if (isPhys) {
      wAtk *= 1.3;
      wScaleStr *= 1.3;
      wScaleInt *= 0.7;
      wDef *= 1.1;
      wScaleVit *= 1.1;
    } else if (isMagic) {
      wAtk *= 0.7;
      wScaleStr *= 0.7;
      wScaleInt *= 1.3;
    }

    // 戦闘状況による安全寄せ（被ダメが痛いときは防御・回避寄り）
    const avgTaken = learn.avgMaxTaken || 0;
    const avgDamage = learn.avgMaxDamage || 0;
    if (avgTaken > 0 && avgTaken >= avgDamage * 0.7) {
      wDef *= 1.2;
      wScaleVit *= 1.2;
      wDex *= 1.3; // 回避も稼いで被弾を減らす
    }

    let s = 0;

    // 武器系フィールド
    if (typeof itemMeta.atk === "number") s += itemMeta.atk * wAtk;
    if (typeof itemMeta.scaleStr === "number") s += itemMeta.scaleStr * effSTR * wScaleStr;
    if (typeof itemMeta.scaleInt === "number") s += itemMeta.scaleInt * effINT * wScaleInt;
    if (typeof itemMeta.atkPctFixed === "number") s += itemMeta.atkPctFixed * wPctBase * wAtk;

    // 防具系フィールド
    if (typeof itemMeta.def === "number") s += itemMeta.def * wDef;
    if (typeof itemMeta.scaleVit === "number") s += itemMeta.scaleVit * effVIT * wScaleVit;
    if (typeof itemMeta.bonusDex === "number") s += itemMeta.bonusDex * wDex;
    if (typeof itemMeta.defPctFixed === "number") s += itemMeta.defPctFixed * wPctBase * wDef;
    if (typeof itemMeta.hpPctFixed === "number") s += itemMeta.hpPctFixed * wPctBase * 0.05;

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

    // ★新設: 職業カバレッジ更新（現在のジョブで何戦こなしたか）
    const curJobId = typeof window.jobId === "number" ? window.jobId : 0;
    if (!learn.jobStats) learn.jobStats = {};
    const js = learn.jobStats[curJobId] || { battleSamples: 0, sessionsPlayed: 0 };
    js.battleSamples = (js.battleSamples || 0) + 1;
    learn.jobStats[curJobId] = js;

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
    const { isPhys, isMagic } = getJobAptitude(jobId);

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
    const { isPhys: isBattleBuild, isMagic: isMagicBuild } = getJobAptitude(jobId);

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
  // ★新設: 職業カバレッジに基づく「意志を持った転職」
  // =========================
  //
  // - ランダムな頻繁転職（いわゆる「ガチャガチャ転職」）はしない
  // - runTestChanAuto は5分単位の短いセッションを連続で回す仕組みなので、
  //   単に「セッション開始のたび判断」だとその5分単位で転職してしまいかねない。
  //   → 現職で最低 MIN_BATTLES_PER_JOB_STINT 戦こなすまでは転職候補にすら挙げない
  //     「stint（今の職を始めてから何戦したか）」を別途カウントして判断する
  // - 判断は battleMain / mixed モードのセッション開始時のみ行う
  //   （gatherMain 等、戦闘が絡まないセッションでは職業カバレッジに関係ないので判断しない）
  // - 判断基準: 選択可能な職業の中で battleSamples が一番少ない
  //   （＝まだ検証が足りていない）職を優先する。同点（現職が最少のまま）なら転職しない
  //
  // ★対象は基本職(0/1/2)＋戦闘ギルド職(100/101/102)のみ。
  //   クラフト/採取/食材ギルド職(200番台以降)は職業選択が配列報酬＝職業選択モーダル
  //   （guild2.js の openJobSelectModal、ボタンクリック前提）でしか解放できず、
  //   テトはまだそこに対応していないため対象外（別途対応が必要）。

  const MIN_BATTLES_PER_JOB_STINT = 15; // 1つの職を最低これだけ戦わせてから次を検討。要調整

  function getCombatCandidateJobIds() {
    const ids = [0, 1, 2];
    if (typeof getUnlockedGuildJobs === "function") {
      ["warrior", "mage", "tamer"].forEach(gid => {
        const list = getUnlockedGuildJobs(gid) || [];
        list.forEach(jid => {
          if (ids.indexOf(jid) === -1) ids.push(jid);
        });
      });
    }
    return ids;
  }

  // jobStats[jobId] が無ければ作り、stintStartSamples（今の在任が始まった時点の
  // battleSamples）が未設定なら現在値で初期化する
  function ensureJobStint(learn, jobId) {
    if (!learn.jobStats) learn.jobStats = {};
    const js = learn.jobStats[jobId] || { battleSamples: 0, sessionsPlayed: 0 };
    if (typeof js.stintStartSamples !== "number") {
      js.stintStartSamples = js.battleSamples || 0;
    }
    learn.jobStats[jobId] = js;
    return js;
  }

  // 一番検証が足りていない職業IDを選ぶ（同点・stint未達なら現職維持でnull）
  // mode: 呼び出し元のセッションモード。battleMain/mixed以外では判断自体をスキップする
  function tetoDecideJobForSession(mode) {
    if (mode !== "battleMain" && mode !== "mixed") return null;

    const learn = window.tetoLearn || {};
    const stats = learn.jobStats || {};
    const currentJobId = typeof window.jobId === "number" ? window.jobId : 0;

    const curJs = ensureJobStint(learn, currentJobId);
    const stintBattles = (curJs.battleSamples || 0) - curJs.stintStartSamples;

    // 現職でまだ十分に戦えていない（1〜数戦しかしていない）なら転職候補にしない
    if (stintBattles < MIN_BATTLES_PER_JOB_STINT) return null;

    const candidates = getCombatCandidateJobIds();
    let best = currentJobId;
    let bestCount = curJs.battleSamples || 0;

    candidates.forEach(jid => {
      const count = (stats[jid] && stats[jid].battleSamples) || 0;
      if (count < bestCount) {
        best = jid;
        bestCount = count;
      }
    });

    return (best === currentJobId) ? null : best;
  }

  // 初回のペット付随職（動物使い/獣群使い）転職時に開くペット選択モーダルを、
  // DOM操作ではなくデータ層の setCompanionByTypeId で直接解決する
  function tetoAutoResolveCompanionIfNeeded() {
    if (window.companionTypeId) return;
    if (window.companionSkipForever) return;
    if (typeof COMPANION_TYPES === "undefined" || !Array.isArray(COMPANION_TYPES) || !COMPANION_TYPES.length) return;
    if (typeof setCompanionByTypeId !== "function") return;

    // ★暫定: 先頭のコンパニオンタイプを選択。種類ごとの優劣検証は別課題として要調整
    setCompanionByTypeId(COMPANION_TYPES[0].id);

    const modal = (typeof document !== "undefined") ? document.getElementById("companionModal") : null;
    if (modal) modal.classList.add("hidden");

    if (typeof recalcStats === "function") recalcStats();
    if (typeof updateDisplay === "function") updateDisplay();
  }

  // セッション開始時に一度だけ呼ばれる、意志を持った転職の実行本体
  // mode: tetoBeginSession に渡されたのと同じセッションモード
  function tetoDecideAndApplyJobForSession(mode) {
    try {
      const currentJobId = typeof window.jobId === "number" ? window.jobId : 0;
      const target = tetoDecideJobForSession(mode);

      if (!target || target === currentJobId) return; // 現職継続（stint未達 or カバレッジ十分）

      if (typeof applyJobChange !== "function") return;

      // 2回目以降の転職には100G必要（既存仕様）。払えないなら今回は見送り、次回また判断
      // ★注: jobChangedOnce も money と同じくwindowに同期されていないため素のまま参照
      const alreadyChangedOnce = typeof jobChangedOnce !== "undefined" ? !!jobChangedOnce : false;
      if (alreadyChangedOnce && (typeof money !== "number" || money < 100)) {
        if (typeof appendLog === "function") {
          appendLog("[テト] 職業カバレッジのため転職したいが、資金不足のため今回は見送り");
        }
        return;
      }

      applyJobChange(target);
      tetoAutoResolveCompanionIfNeeded();

      if (typeof appendLog === "function") {
        const jobName = (typeof getJobNameFromId === "function") ? getJobNameFromId(target) : `職業ID:${target}`;
        appendLog(`[テト] 職業カバレッジのため「${jobName}」に転職`);
      }

      const learn = window.tetoLearn;
      if (learn) {
        const js = ensureJobStint(learn, target);
        // ★新しい在任(stint)の開始点を記録。ここから最低ライン分また戦わせる
        js.stintStartSamples = js.battleSamples || 0;
        js.sessionsPlayed = (js.sessionsPlayed || 0) + 1;
        learn.jobStats[target] = js;
      }
    } catch (e) {
      console.warn("[teto-ai3] job decision error:", e);
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
    window.tetoDecideAndApplyJobForSession = tetoDecideAndApplyJobForSession;
    window.tetoOnPlayerDeath = tetoOnPlayerDeath;
  }

})();