// debug-stats-core.js
// ★デバッグ用★ ゲーム全体バランス監視用の統計コア
// 採取 / クラフト / 戦闘 / 経済 / シナリオのログ保存・集計・CSV出力のみ担当
//
// 前提:
//  - game-core 側から debugRecordXXX が呼ばれる
//  - ゲーム本体の仕様は変えず、「debugRecordXXX を呼ぶ 1 行追加」で連携
//  - 未定義関数・変数があっても安全にスキップするガード付き

(function () {
  "use strict";

  // =======================
  // ログ保存＆セッション管理
  // =======================

  let DEBUG_STATS;
  try {
    DEBUG_STATS = JSON.parse(localStorage.getItem("debugStats") || "{}");
  } catch (e) {
    DEBUG_STATS = {};
  }

  // 「テストセッション」の概念は残しておくが、
  // ループやAIロジックは teto-ai.js 側に任せる。
  let CURRENT_TEST_SESSION = null;

  function newSessionId() {
    return "sess_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1e6).toString(36);
  }

  function beginTestSession(mode, minutes, style) {
    const id = newSessionId();
    CURRENT_TEST_SESSION = {
      id,
      mode: mode || "mixed",
      minutes: minutes || 10,
      style: style || null,
      startTime: Date.now()
    };
    DEBUG_STATS.sessions = DEBUG_STATS.sessions || [];
    DEBUG_STATS.sessions.push({
      id,
      mode: CURRENT_TEST_SESSION.mode,
      minutes: CURRENT_TEST_SESSION.minutes,
      style: CURRENT_TEST_SESSION.style,
      startTime: CURRENT_TEST_SESSION.startTime,
      endTime: null,
      summary: null
    });
    saveDebugStats();
    return id;
  }

  function endTestSession(summary) {
    if (!CURRENT_TEST_SESSION) return;
    const id = CURRENT_TEST_SESSION.id;
    const sessions = DEBUG_STATS.sessions || [];
    const s = sessions.find(x => x.id === id);
    if (s) {
      s.endTime = Date.now();
      s.summary = summary || null;
    }
    CURRENT_TEST_SESSION = null;
    saveDebugStats();
  }

  function getCurrentSessionId() {
    return (CURRENT_TEST_SESSION && CURRENT_TEST_SESSION.id) || null;
  }

  function getCurrentSessionMeta() {
    return CURRENT_TEST_SESSION;
  }

  function saveDebugStats() {
    try {
      localStorage.setItem("debugStats", JSON.stringify(DEBUG_STATS));
    } catch (e) {
      console.warn("saveDebugStats error", e);
    }
  }

  // ログ形式:
  // DEBUG_STATS = {
  //   gatherLogs: [ { t, sessionId, isAI, target, itemId, count, timeSec, hunger, thirst, bonusKeys, skillLv } ],
  //   craftLogs:  [ { t, sessionId, isAI, itemId, success, materialCostValue, category, skillLv, bonusKeys } ],
  //   battleLogs: [ { t, sessionId, isAI, enemyId, area, win, damageDealt, damageTaken, turns,
  //                  jobId, level, atkTotal, defTotal, hpMax, hunger, thirst,
  //                  foodBuffIds, drinkBuffIds } ],
  //   economyLogs:[ { t, sessionId, isAI, moneyBefore, moneyAfter, reason, delta } ],
  //   scenarioLogs:[ { t, sessionId, isAI, type, detail } ],
  //   enhanceLogs:[ { ... } ],
  //   deathLogs:  [ { t, sessionId, isAI, cause, enemyId, area, level, hp, hunger, thirst, moneyLost, equipBroken, context } ],
  //   levelUpLogs:[ { t, sessionId, isAI, level, statsGained, hpMaxBase } ],
  //   itemUseLogs:[ { t, sessionId, isAI, itemType, itemId, context, hpBefore, hpAfter, mpBefore, mpAfter } ],
  //   sessions:    [ { id, mode, minutes, style, startTime, endTime, summary } ]
  // }

  // =======================
  // ログ記録ヘルパ
  // =======================

  function safeGetHunger() {
    try {
      return (typeof getHungerValue === "function") ? getHungerValue() : null;
    } catch (e) {
      return null;
    }
  }

  function safeGetThirst() {
    try {
      return (typeof getThirstValue === "function") ? getThirstValue() : null;
    } catch (e) {
      return null;
    }
  }

  function safeGetDailyBonusKeys() {
    try {
      return (typeof getTodayDailyBonusKeys === "function")
        ? getTodayDailyBonusKeys()
        : null;
    } catch (e) {
      return null;
    }
  }

  function safeGetLevel() {
    try {
      return (typeof level === "number") ? level : null;
    } catch (e) {
      return null;
    }
  }

  function safeGetMoney() {
    try {
      return (typeof money === "number") ? money : null;
    } catch (e) {
      return null;
    }
  }

  // 現在のセッションが「AIによるテストかどうか」のフラグ
  function isTestAIActive() {
    return !!CURRENT_TEST_SESSION;
  }

  function recordScenarioEvent(type, detail) {
    DEBUG_STATS.scenarioLogs = DEBUG_STATS.scenarioLogs || [];
    DEBUG_STATS.scenarioLogs.push({
      t: Date.now(),
      sessionId: getCurrentSessionId(),
      isAI: isTestAIActive(),
      type: type || "info",
      detail: detail || ""
    });
    saveDebugStats();
  }

  // game-core 側から呼ぶ想定:
  // debugRecordGather(target, itemId, count, timeSec, { skillLv })
  function debugRecordGather(target, itemId, count, timeSec, extra) {
    DEBUG_STATS.gatherLogs = DEBUG_STATS.gatherLogs || [];
    DEBUG_STATS.gatherLogs.push({
      t: Date.now(),
      sessionId: getCurrentSessionId(),
      isAI: isTestAIActive(),
      target: target || null,
      itemId: itemId || null,
      count: count || 0,
      timeSec: timeSec || 0,
      hunger: safeGetHunger(),
      thirst: safeGetThirst(),
      bonusKeys: safeGetDailyBonusKeys(),
      skillLv: extra && typeof extra.skillLv === "number" ? extra.skillLv : null
    });
    saveDebugStats();
  }

  // game-core 側から呼ぶ想定:
  // debugRecordCraft({
  //   category, recipeId, success, skillLv, successRate, cost, resultItems, guildBonus, traitBonus, dailyBonus
  // })
  function debugRecordCraft(payload) {
    DEBUG_STATS.craftLogs = DEBUG_STATS.craftLogs || [];
    const p = payload || {};
    const costObj = p.cost || {};
    let materialCostValue = 0;
    Object.keys(costObj).forEach(id => {
      const v = costObj[id] || 0;
      materialCostValue += v;
    });

    DEBUG_STATS.craftLogs.push({
      t: Date.now(),
      sessionId: getCurrentSessionId(),
      isAI: isTestAIActive(),
      itemId: p.recipeId || null,
      success: !!p.success,
      materialCostValue: materialCostValue || 0,
      category: p.category || null,
      skillLv: typeof p.skillLv === "number" ? p.skillLv : null,
      bonusKeys: safeGetDailyBonusKeys()
    });
    saveDebugStats();
  }

  // game-core 側から呼ぶ想定:
  // debugRecordBattle({
  //   enemyId, area, win, damageDealt, damageTaken, turns,
  //   jobId, level, atkTotal, defTotal, hpMax, hunger, thirst,
  //   foodBuffIds, drinkBuffIds
  // })
  function debugRecordBattle(params) {
    DEBUG_STATS.battleLogs = DEBUG_STATS.battleLogs || [];

    const h = safeGetHunger();
    const th = safeGetThirst();

    let currentEnemyId = null;
    let currentArea = null;
    try {
      if (typeof currentEnemy === "object" && currentEnemy && currentEnemy.id) {
        currentEnemyId = currentEnemy.id;
      }
    } catch (e) {}
    try {
      if (typeof getCurrentArea === "function") {
        currentArea = getCurrentArea();
      } else if (typeof window !== "undefined" && window.exploringArea) {
        currentArea = window.exploringArea;
      }
    } catch (e) {}

    const p = params || {};

    DEBUG_STATS.battleLogs.push({
      t: Date.now(),
      sessionId: getCurrentSessionId(),
      isAI: isTestAIActive(),
      enemyId: p.enemyId || currentEnemyId,
      area: p.area || currentArea,
      win: !!p.win,
      damageDealt: p.damageDealt || 0,
      damageTaken: p.damageTaken || 0,
      turns: p.turns || 0,
      jobId: (typeof jobId === "number") ? jobId : (p.jobId || null),
      level: safeGetLevel(),
      atkTotal: (typeof atkTotal === "number") ? atkTotal : (p.atkTotal || null),
      defTotal: (typeof defTotal === "number") ? defTotal : (p.defTotal || null),
      hpMax: (typeof hpMax === "number") ? hpMax : (p.hpMax || null),
      hunger: (typeof p.hunger === "number") ? p.hunger : h,
      thirst: (typeof p.thirst === "number") ? p.thirst : th,
      foodBuffIds: p.foodBuffIds || null,
      drinkBuffIds: p.drinkBuffIds || null
    });
    saveDebugStats();
  }

  // game-core 側から呼ぶ想定:
  // debugRecordEconomy(moneyBefore, moneyAfter, reason)
  function debugRecordEconomy(moneyBefore, moneyAfter, reason) {
    DEBUG_STATS.economyLogs = DEBUG_STATS.economyLogs || [];
    let delta = null;
    if (typeof moneyBefore === "number" && typeof moneyAfter === "number") {
      delta = moneyAfter - moneyBefore;
    }
    DEBUG_STATS.economyLogs.push({
      t: Date.now(),
      sessionId: getCurrentSessionId(),
      isAI: isTestAIActive(),
      moneyBefore: moneyBefore,
      moneyAfter: moneyAfter,
      delta: delta,
      reason: reason || null
    });
    saveDebugStats();
  }

  // 強化ログも残したければ、game-core 側で debugRecordEnhance を呼ぶことを想定
  function debugRecordEnhance(payload) {
    DEBUG_STATS.enhanceLogs = DEBUG_STATS.enhanceLogs || [];
    const p = payload || {};
    DEBUG_STATS.enhanceLogs.push({
      t: Date.now(),
      sessionId: getCurrentSessionId(),
      isAI: isTestAIActive(),
      type: p.type || null,          // weapon / armor
      itemId: p.itemId || null,
      baseName: p.baseName || null,
      beforeEnhance: p.beforeEnhance,
      afterEnhance: p.afterEnhance,
      success: !!p.success,
      useStarShard: !!p.useStarShard,
      moneyCost: p.moneyCost || 0,
      successRate: p.successRate || 0,
      starBonusRate: p.starBonusRate || 0,
      roll: p.roll || 0
    });
    saveDebugStats();
  }

  // =======================
  // ★新規追加: 死亡ログ記録（テトAI時のみ）
  // =======================
  function debugRecordDeath(payload) {
    // ★プレイヤー操作時は記録しない（テトAI実験データのみ記録）
    if (typeof window !== "undefined" && !window.isTetoControlling) return;

    DEBUG_STATS.deathLogs = DEBUG_STATS.deathLogs || [];
    DEBUG_STATS.deathLogs.push({
      t: Date.now(),
      sessionId: getCurrentSessionId(),
      isAI: true, // テトAI時のみなので常にtrue
      cause: payload.cause || "unknown",  // "battle", "trap", "hunger", "thirst", "poison"
      enemyId: payload.enemyId || null,
      area: payload.area || null,
      level: safeGetLevel(),
      hp: typeof payload.hp === "number" ? payload.hp : 0,
      hunger: payload.hunger != null ? payload.hunger : safeGetHunger(),
      thirst: payload.thirst != null ? payload.thirst : safeGetThirst(),
      moneyLost: payload.moneyLost || 0,
      equipBroken: payload.equipBroken || false,
      context: payload.context || null
    });
    saveDebugStats();
  }

  // 死亡統計の集計
  function debugGetDeathStats() {
    const logs = DEBUG_STATS.deathLogs || [];
    const byCause = {};

    logs.forEach(l => {
      const cause = l.cause || "unknown";
      const t = byCause[cause] || { count: 0, totalMoneyLost: 0, equipBrokenCount: 0 };
      t.count += 1;
      t.totalMoneyLost += l.moneyLost || 0;
      if (l.equipBroken) t.equipBrokenCount += 1;
      byCause[cause] = t;
    });

    return {
      totalDeaths: logs.length,
      byCause: byCause
    };
  }

  // =======================
  // ★新規追加: レベルアップログ記録（テトAI時のみ）
  // =======================
  function debugRecordLevelUp(payload) {
    // ★プレイヤー操作時は記録しない（テトAI実験データのみ記録）
    if (typeof window !== "undefined" && !window.isTetoControlling) return;

    DEBUG_STATS.levelUpLogs = DEBUG_STATS.levelUpLogs || [];
    DEBUG_STATS.levelUpLogs.push({
      t: Date.now(),
      sessionId: getCurrentSessionId(),
      isAI: true,
      level: payload.level || 0,
      statsGained: payload.statsGained || {},
      hpMaxBase: payload.hpMaxBase || 0
    });
    saveDebugStats();
  }

  // =======================
  // ★新規追加: アイテム使用ログ記録（テトAI時のみ）
  // =======================
  function debugRecordItemUse(payload) {
    // ★プレイヤー操作時は記録しない（テトAI実験データのみ記録）
    if (typeof window !== "undefined" && !window.isTetoControlling) return;

    DEBUG_STATS.itemUseLogs = DEBUG_STATS.itemUseLogs || [];
    DEBUG_STATS.itemUseLogs.push({
      t: Date.now(),
      sessionId: getCurrentSessionId(),
      isAI: true,
      itemType: payload.itemType || "unknown",  // "potion", "food", "drink", "tool"
      itemId: payload.itemId || null,
      context: payload.context || "field",      // "field", "battle", "warehouse"
      hpBefore: payload.hpBefore || 0,
      hpAfter: payload.hpAfter || 0,
      mpBefore: payload.mpBefore || 0,
      mpAfter: payload.mpAfter || 0
    });
    saveDebugStats();
  }

  // アイテム使用統計の集計
  function debugGetItemUseStats() {
    const logs = DEBUG_STATS.itemUseLogs || [];
    const byType = {};

    logs.forEach(l => {
      const type = l.itemType || "unknown";
      const t = byType[type] || { count: 0, fieldUse: 0, battleUse: 0, warehouseUse: 0 };
      t.count += 1;
      if (l.context === "field") t.fieldUse += 1;
      if (l.context === "battle") t.battleUse += 1;
      if (l.context === "warehouse") t.warehouseUse += 1;
      byType[type] = t;
    });

    return {
      totalUses: logs.length,
      byType: byType
    };
  }

  // =======================
  // 集計関数
  // =======================

  // debug-ui.js の renderGatherStatsTable から呼ばれる想定:
  // 期待フォーマット:
  // { [materialId]: { totalCount, totalActions, totalTimeSec, avgPerAction, avgPerSec } }
  function debugGetGatherStats() {
    const logs = DEBUG_STATS.gatherLogs || [];
    const byId = {};

    logs.forEach(l => {
      const key = l.target || l.itemId || "unknown";
      const t = byId[key] || {
        totalCount: 0,
        totalActions: 0,
        totalTimeSec: 0
      };
      t.totalCount += l.count || 0;
      t.totalActions += 1;
      t.totalTimeSec += l.timeSec || 0;
      byId[key] = t;
    });

    Object.keys(byId).forEach(id => {
      const s = byId[id];
      const actions = s.totalActions || 1;
      const timeSec = s.totalTimeSec || 1;
      s.avgPerAction = s.totalCount / actions;
      s.avgPerSec = s.totalCount / timeSec;
    });

    return byId;
  }

  // debug-ui.js の renderCraftStatsTable から呼ばれる想定:
  // 期待フォーマット:
  // { [itemId]: { tryCount, successCount, failCount, successRate } }
  function debugGetCraftStats() {
    const logs = DEBUG_STATS.craftLogs || [];
    const byItem = {};

    logs.forEach(l => {
      const key = l.itemId || "unknown";
      const t = byItem[key] || {
        tryCount: 0,
        successCount: 0,
        failCount: 0
      };
      t.tryCount += 1;
      if (l.success) t.successCount += 1;
      else t.failCount += 1;
      byItem[key] = t;
    });

    Object.keys(byItem).forEach(id => {
      const s = byItem[id];
      const total = s.tryCount || 1;
      s.successRate = s.successCount / total;
    });

    return byItem;
  }

  // debug-ui.js の renderBattleStatsTable から呼ばれる想定:
  // 期待フォーマット:
  // { [jobKey]: { total, win, lose, escape, totalDamageDealt, totalDamageTaken, totalTurns } }
  function debugGetBattleStats() {
    const logs = DEBUG_STATS.battleLogs || [];
    const byJob = {};

    logs.forEach(l => {
      const key = (l.jobId != null ? String(l.jobId) : "?");
      const t = byJob[key] || {
        total: 0,
        win: 0,
        lose: 0,
        escape: 0,
        totalDamageDealt: 0,
        totalDamageTaken: 0,
        totalTurns: 0
      };
      t.total += 1;
      if (l.win) t.win += 1;
      else t.lose += 1;
      t.totalDamageDealt += l.damageDealt || 0;
      t.totalDamageTaken += l.damageTaken || 0;
      t.totalTurns += l.turns || 0;
      byJob[key] = t;
    });

    return byJob;
  }

  // 敵IDごとの戦闘統計:
  // { [enemyId]: { total, win, lose, totalDamageDealt, totalDamageTaken, totalTurns, winRate, avgTurns } }
  function debugGetBattleStatsByEnemy() {
    const logs = DEBUG_STATS.battleLogs || [];
    const byEnemy = {};

    logs.forEach(l => {
      const key = (l.enemyId != null ? String(l.enemyId) : "unknown");
      const t = byEnemy[key] || {
        total: 0,
        win: 0,
        lose: 0,
        totalDamageDealt: 0,
        totalDamageTaken: 0,
        totalTurns: 0
      };
      t.total += 1;
      if (l.win) t.win += 1;
      else t.lose += 1;
      t.totalDamageDealt += l.damageDealt || 0;
      t.totalDamageTaken += l.damageTaken || 0;
      t.totalTurns += l.turns || 0;
      byEnemy[key] = t;
    });

    Object.keys(byEnemy).forEach(id => {
      const s = byEnemy[id];
      const total = s.total || 1;
      s.winRate = s.win / total;
      s.avgTurns = s.totalTurns / total;
    });

    return byEnemy;
  }

  // エリアごとの戦闘統計:
  // { [areaKey]: { total, win, lose, totalDamageDealt, totalDamageTaken, totalTurns, winRate, avgTurns } }
  function debugGetBattleStatsByArea() {
    const logs = DEBUG_STATS.battleLogs || [];
    const byArea = {};

    logs.forEach(l => {
      const key = (l.area != null ? String(l.area) : "unknown");
      const t = byArea[key] || {
        total: 0,
        win: 0,
        lose: 0,
        totalDamageDealt: 0,
        totalDamageTaken: 0,
        totalTurns: 0
      };
      t.total += 1;
      if (l.win) t.win += 1;
      else t.lose += 1;
      t.totalDamageDealt += l.damageDealt || 0;
      t.totalDamageTaken += l.damageTaken || 0;
      t.totalTurns += l.turns || 0;
      byArea[key] = t;
    });

    Object.keys(byArea).forEach(id => {
      const s = byArea[id];
      const total = s.total || 1;
      s.winRate = s.win / total;
      s.avgTurns = s.totalTurns / total;
    });

    return byArea;
  }

  // debug-ui.js の renderEconomyStatsTable から呼ばれる想定:
  // 期待フォーマット:
  // {
  //   goldEarned,
  //   goldSpent,
  //   bySource: { [reason]: sum },
  //   bySink:   { [reason]: sum }
  // }
  function debugGetEconomyStats() {
    const logs = DEBUG_STATS.economyLogs || [];
    let goldEarned = 0;
    let goldSpent = 0;
    const bySource = {};
    const bySink = {};

    logs.forEach(l => {
      const delta = l.delta || 0;
      const reason = l.reason || "unknown";

      if (delta > 0) {
        goldEarned += delta;
        bySource[reason] = (bySource[reason] || 0) + delta;
      } else if (delta < 0) {
        goldSpent += -delta;
        bySink[reason] = (bySink[reason] || 0) + (-delta);
      }
    });

    return {
      goldEarned,
      goldSpent,
      bySource,
      bySink
    };
  }

  function debugResetAllStats() {
    DEBUG_STATS = {};
    CURRENT_TEST_SESSION = null;
    try {
      localStorage.removeItem("debugStats");
    } catch (e) {}
  }

  // =======================
  // セッションレポート生成 & CSV
  // =======================

  function summarizeSession(sessionId) {
    const sess = (DEBUG_STATS.sessions || []).find(s => s.id === sessionId);
    if (!sess) return null;

    const startTime = sess.startTime || null;
    const endTime = sess.endTime || Date.now();
    const durationMs = endTime - (startTime || endTime);
    const durationMin = durationMs / 60000;

    const battleLogs = (DEBUG_STATS.battleLogs || []).filter(l => l.sessionId === sessionId);
    const econLogs = (DEBUG_STATS.economyLogs || []).filter(l => l.sessionId === sessionId);
    const gatherLogs = (DEBUG_STATS.gatherLogs || []).filter(l => l.sessionId === sessionId);
    const craftLogs = (DEBUG_STATS.craftLogs || []).filter(l => l.sessionId === sessionId);

    const battleStats = (function () {
      const total = battleLogs.length;
      const win = battleLogs.filter(l => l.win).length;
      const lose = total - win;
      const winRate = total > 0 ? win / total : 0;
      const totalTurns = battleLogs.reduce((a, l) => a + (l.turns || 0), 0);
      const avgTurns = total > 0 ? totalTurns / total : 0;
      return { total, win, lose, winRate, avgTurns };
    })();

    const econStats = (function () {
      let deltaSum = 0;
      econLogs.forEach(l => { deltaSum += l.delta || 0; });
      return { operations: econLogs.length, totalDelta: deltaSum };
    })();

    const gatherStats = (function () {
      const totalCount = gatherLogs.reduce((a, l) => a + (l.count || 0), 0);
      const totalTimeSec = gatherLogs.reduce((a, l) => a + (l.timeSec || 0), 0);
      const perHour = totalTimeSec > 0 ? (totalCount * 3600 / totalTimeSec) : 0;
      return { totalCount, totalTimeSec, perHour };
    })();

    const craftStats = (function () {
      const tries = craftLogs.length;
      const success = craftLogs.filter(l => l.success).length;
      const totalCost = craftLogs.reduce((a, l) => a + (l.materialCostValue || 0), 0);
      return {
        tries,
        success,
        successRate: tries > 0 ? success / tries : 0,
        totalMaterialCost: totalCost
      };
    })();

    const firstBattle = battleLogs[0];
    const lastBattle = battleLogs[battleLogs.length - 1];
    const levelStart = firstBattle && typeof firstBattle.level === "number" ? firstBattle.level : null;
    const levelEnd = lastBattle && typeof lastBattle.level === "number" ? lastBattle.level : levelStart;

    let moneyStart = null;
    let moneyEnd = null;
    if (econLogs.length) {
      moneyStart = econLogs[0].moneyBefore;
      moneyEnd = econLogs[econLogs.length - 1].moneyAfter;
    }

    return {
      sessionId,
      mode: sess.mode,
      style: sess.style || null,
      minutesPlanned: sess.minutes,
      durationMin,
      battle: battleStats,
      economy: econStats,
      gather: gatherStats,
      craft: craftStats,
      levelStart,
      levelEnd,
      moneyStart,
      moneyEnd
    };
  }

  function debugExportCSV() {
    const sessions = DEBUG_STATS.sessions || [];
    const reports = sessions.map(s => summarizeSession(s.id)).filter(Boolean);

    let rows = [];
    rows.push([
      "sessionId",
      "mode",
      "style",
      "minutesPlanned",
      "durationMin",
      "battleTotal",
      "battleWin",
      "battleLose",
      "battleWinRate",
      "battleAvgTurns",
      "econOps",
      "econTotalDelta",
      "gatherTotalCount",
      "gatherTotalTimeSec",
      "gatherPerHour",
      "craftTries",
      "craftSuccess",
      "craftSuccessRate",
      "craftTotalMaterialCost",
      "levelStart",
      "levelEnd",
      "moneyStart",
      "moneyEnd"
    ].join(","));

    reports.forEach(r => {
      rows.push([
        r.sessionId,
        r.mode,
        r.style || "",
        r.minutesPlanned,
        r.durationMin.toFixed(2),
        r.battle.total,
        r.battle.win,
        r.battle.lose,
        r.battle.winRate.toFixed(3),
        r.battle.avgTurns.toFixed(2),
        r.economy.operations,
        r.economy.totalDelta,
        r.gather.totalCount,
        r.gather.totalTimeSec.toFixed(1),
        r.gather.perHour.toFixed(2),
        r.craft.tries,
        r.craft.success,
        r.craft.successRate.toFixed(3),
        r.craft.totalMaterialCost,
        r.levelStart != null ? r.levelStart : "",
        r.levelEnd != null ? r.levelEnd : "",
        r.moneyStart != null ? r.moneyStart : "",
        r.moneyEnd != null ? r.moneyEnd : ""
      ].join(","));
    });

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "debug-stats-sessions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // =======================
  // グローバル公開
  // =======================

  if (typeof window !== "undefined") {
    window.DEBUG_STATS = DEBUG_STATS;

    window.debugRecordGather = debugRecordGather;
    window.debugRecordCraft = debugRecordCraft;
    window.debugRecordBattle = debugRecordBattle;
    window.debugRecordEconomy = debugRecordEconomy;
    window.debugRecordEnhance = debugRecordEnhance;
    window.recordScenarioEvent = recordScenarioEvent;

    // ★新規追加: 死亡・レベルアップ・アイテム使用ログ記録
    window.debugRecordDeath = debugRecordDeath;
    window.debugGetDeathStats = debugGetDeathStats;
    window.debugRecordLevelUp = debugRecordLevelUp;
    window.debugRecordItemUse = debugRecordItemUse;
    window.debugGetItemUseStats = debugGetItemUseStats;

    window.debugGetGatherStats = debugGetGatherStats;
    window.debugGetCraftStats = debugGetCraftStats;
    window.debugGetBattleStats = debugGetBattleStats;
    window.debugGetBattleStatsByEnemy = debugGetBattleStatsByEnemy;
    window.debugGetBattleStatsByArea = debugGetBattleStatsByArea;
    window.debugGetEconomyStats = debugGetEconomyStats;

    window.debugResetAllStats = debugResetAllStats;
    window.debugExportCSV = debugExportCSV;

    window.beginTestSession = beginTestSession;
    window.endTestSession = endTestSession;
    window.getCurrentSessionMeta = getCurrentSessionMeta;
    window.summarizeSession = summarizeSession;
  }

})();