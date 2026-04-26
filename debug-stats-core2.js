// debug-stats-core2.js
// ★デバッグ用★ テトちゃん行動評価・クラフト/強化/料理バフの戦闘寄与評価
// 既存の DEBUG_STATS / summarizeSession / beginTestSession などは
// debug-stats-core.js 側で定義済みである前提。

(function () {
  "use strict";

  if (typeof window === "undefined" || !window.DEBUG_STATS) {
    return;
  }

  const DEBUG_STATS = window.DEBUG_STATS;

  function getCurrentSessionId() {
    if (typeof window.getCurrentSessionMeta === "function") {
      try {
        const meta = window.getCurrentSessionMeta();
        return meta && meta.id ? meta.id : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  function summarizeSessionSafe(sessionId) {
    if (typeof window.summarizeSession === "function") {
      try {
        return window.summarizeSession(sessionId);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // =======================
  // テトちゃん行動の「意味度」評価
  // =======================

  function debugEvaluateSessionActions(sessionId) {
    const report = summarizeSessionSafe(sessionId);
    if (!report) return null;

    const res = {
      sessionId: report.sessionId,
      mode: report.mode,
      battle: {},
      gather: {},
      craft: {},
      economy: {},
      overall: {
        warnings: [],
        strengths: []
      }
    };

    const b = report.battle || {};
    res.battle.winRate = b.winRate;
    res.battle.avgTurns = b.avgTurns;

    if (!b || b.total === 0) {
      res.battle.evaluation = "no_data";
    } else if (b.winRate < 0.3) {
      res.battle.evaluation = "too_hard";
      res.overall.warnings.push("戦闘の勝率が低すぎる（30%未満）");
    } else if (b.winRate > 0.95) {
      res.battle.evaluation = "too_easy";
      res.overall.warnings.push("戦闘の勝率が高すぎる（95%以上）");
    } else {
      res.battle.evaluation = "balanced";
    }

    const g = report.gather || {};
    res.gather.perHour = g.perHour;
    if (!g || g.totalTimeSec <= 0 || g.totalCount <= 0) {
      res.gather.evaluation = "no_data";
    } else if (g.perHour < 10) {
      res.gather.evaluation = "low_efficiency";
      res.overall.warnings.push("採取効率が低い（1時間あたりの取得数が少ない）");
    } else if (g.perHour > 200) {
      res.gather.evaluation = "too_strong";
      res.overall.warnings.push("採取効率が高すぎる（資源が湧きすぎている可能性）");
    } else {
      res.gather.evaluation = "reasonable";
    }

    const c = report.craft || {};
    res.craft.successRate = c.successRate;
    let matPerSuccess = null;
    if (c.success > 0) {
      matPerSuccess = c.totalMaterialCost / c.success;
    }
    res.craft.materialPerSuccess = matPerSuccess;

    if (!c || c.tries === 0) {
      res.craft.evaluation = "no_data";
    } else if (c.successRate < 0.3) {
      res.craft.evaluation = "too_hard";
      res.overall.warnings.push("クラフト成功率が低すぎる（30%未満）");
    } else if (c.successRate > 0.95) {
      res.craft.evaluation = "too_easy";
      res.overall.warnings.push("クラフト成功率が高すぎる（95%以上）");
    } else {
      res.craft.evaluation = "balanced";
    }

    const e = report.economy || {};
    const durationMin = report.durationMin || 1;
    const goldEarnedPerMin = (typeof e.totalDelta === "number") ? (e.totalDelta / durationMin) : 0;
    res.economy.goldEarnedPerMin = goldEarnedPerMin;

    if (!e || e.operations === 0) {
      res.economy.evaluation = "no_data";
    } else if (goldEarnedPerMin < 0) {
      res.economy.evaluation = "losing_money";
      res.overall.warnings.push("プレイ中にお金が減り続けている");
    } else if (goldEarnedPerMin > 200) {
      res.economy.evaluation = "too_profitable";
      res.overall.warnings.push("時間あたりの金策効率が高すぎる");
    } else {
      res.economy.evaluation = "reasonable";
    }

    if (b && b.total > 0 && b.winRate >= 0.7 && b.winRate <= 0.95) {
      res.overall.strengths.push("戦闘バランスはおおむね良好（勝率70〜95%）");
    }
    if (g && g.perHour > 50 && g.perHour < 200) {
      res.overall.strengths.push("採取効率は実用的な範囲に収まっている");
    }
    if (c && c.tries > 5 && c.successRate >= 0.5 && c.successRate <= 0.9) {
      res.overall.strengths.push("クラフト成功率がほどよい");
    }
    if (goldEarnedPerMin >= 0 && goldEarnedPerMin <= 200) {
      res.overall.strengths.push("時間あたりの金策効率は許容範囲");
    }

    return res;
  }

  function debugEvaluateLatestSession() {
    const sessions = DEBUG_STATS.sessions || [];
    if (!sessions.length) return null;
    const latest = sessions[sessions.length - 1];
    return debugEvaluateSessionActions(latest.id);
  }

  function debugEvaluateActionsAllSessions() {
    const sessions = DEBUG_STATS.sessions || [];
    const results = [];
    sessions.forEach(s => {
      const r = debugEvaluateSessionActions(s.id);
      if (r) results.push(r);
    });
    return results;
  }

  // =======================
  // クラフト/料理/強化の「時間込み戦闘寄与」評価
  // =======================

  function debugEvaluateCraftImpactWithTime(sessionId) {
    const sid = sessionId || getCurrentSessionId();
    if (!sid) return null;

    const craftLogs = (DEBUG_STATS.craftLogs || []).filter(l => l.sessionId === sid);
    const battleLogs = (DEBUG_STATS.battleLogs || []).filter(l => l.sessionId === sid);

    if (!craftLogs.length || !battleLogs.length) return {};

    const byRecipe = {};

    craftLogs.forEach(l => {
      const key = l.itemId || "unknown";
      const r = byRecipe[key] || {
        recipeId: key,
        craftCount: 0,
        totalMaterialCost: 0,
        firstCraftTime: null,
        lastCraftTime: null
      };
      r.craftCount += 1;
      r.totalMaterialCost += l.materialCostValue || 0;
      if (r.firstCraftTime == null || l.t < r.firstCraftTime) {
        r.firstCraftTime = l.t;
      }
      if (r.lastCraftTime == null || l.t > r.lastCraftTime) {
        r.lastCraftTime = l.t;
      }
      byRecipe[key] = r;
    });

    const result = {};
    Object.keys(byRecipe).forEach(recipeId => {
      const info = byRecipe[recipeId];
      const spanMs =
        info.firstCraftTime != null && info.lastCraftTime != null
          ? (info.lastCraftTime - info.firstCraftTime)
          : 0;
      const spanSec = spanMs > 0 ? spanMs / 1000 : 0;

      const beforeBattles = battleLogs.filter(l => info.firstCraftTime != null && l.t < info.firstCraftTime);
      const afterBattles = battleLogs.filter(l => info.lastCraftTime != null && l.t >= info.lastCraftTime);

      function summarizeBattles(list) {
        const total = list.length;
        if (!total) {
          return { winRate: null, avgTurns: null };
        }
        const win = list.filter(l => l.win).length;
        const turns = list.reduce((a, x) => a + (x.turns || 0), 0);
        return {
          winRate: win / total,
          avgTurns: turns / total
        };
      }

      const before = summarizeBattles(beforeBattles);
      const after = summarizeBattles(afterBattles);

      let winRateGainPer100Cost = null;
      let winRateGainPerMinute = null;

      if (before.winRate != null && after.winRate != null) {
        const gain = after.winRate - before.winRate;
        if (info.totalMaterialCost > 0) {
          winRateGainPer100Cost = gain * 100 / (info.totalMaterialCost / 100);
        }
        if (spanSec > 0) {
          const spanMin = spanSec / 60;
          winRateGainPerMinute = spanMin > 0 ? (gain / spanMin) : null;
        }
      }

      result[recipeId] = {
        recipeId,
        craftCount: info.craftCount,
        totalMaterialCost: info.totalMaterialCost,
        totalCraftSpanSec: spanSec,
        winRateBefore: before.winRate,
        winRateAfter: after.winRate,
        avgTurnsBefore: before.avgTurns,
        avgTurnsAfter: after.avgTurns,
        winRateGainPer100Cost,
        winRateGainPerMinute
      };
    });

    return result;
  }

  function debugEvaluateEnhanceImpactWithTime(sessionId) {
    const sid = sessionId || getCurrentSessionId();
    if (!sid) return null;

    const enhanceLogs = (DEBUG_STATS.enhanceLogs || []).filter(l => l.sessionId === sid);
    const battleLogs = (DEBUG_STATS.battleLogs || []).filter(l => l.sessionId === sid);

    if (!enhanceLogs.length || !battleLogs.length) return {};

    const byItem = {};

    enhanceLogs.forEach(l => {
      const key = l.itemId || "unknown";
      const r = byItem[key] || {
        itemId: key,
        enhanceCount: 0,
        totalMoneyCost: 0,
        firstEnhanceTime: null,
        lastEnhanceTime: null
      };
      r.enhanceCount += 1;
      r.totalMoneyCost += l.moneyCost || 0;
      if (r.firstEnhanceTime == null || l.t < r.firstEnhanceTime) {
        r.firstEnhanceTime = l.t;
      }
      if (r.lastEnhanceTime == null || l.t > r.lastEnhanceTime) {
        r.lastEnhanceTime = l.t;
      }
      byItem[key] = r;
    });

    const result = {};
    Object.keys(byItem).forEach(itemId => {
      const info = byItem[itemId];
      const spanMs =
        info.firstEnhanceTime != null && info.lastEnhanceTime != null
          ? (info.lastEnhanceTime - info.firstEnhanceTime)
          : 0;
      const spanSec = spanMs > 0 ? spanMs / 1000 : 0;

      const beforeBattles = battleLogs.filter(l => info.firstEnhanceTime != null && l.t < info.firstEnhanceTime);
      const afterBattles = battleLogs.filter(l => info.lastEnhanceTime != null && l.t >= info.lastEnhanceTime);

      function summarizeBattles(list) {
        const total = list.length;
        if (!total) {
          return { winRate: null, avgTurns: null };
        }
        const win = list.filter(l => l.win).length;
        const turns = list.reduce((a, x) => a + (x.turns || 0), 0);
        return {
          winRate: win / total,
          avgTurns: turns / total
        };
      }

      const before = summarizeBattles(beforeBattles);
      const after = summarizeBattles(afterBattles);

      let winRateGainPer100Gold = null;
      let winRateGainPerMinute = null;

      if (before.winRate != null && after.winRate != null) {
        const gain = after.winRate - before.winRate;
        if (info.totalMoneyCost > 0) {
          winRateGainPer100Gold = gain * 100 / (info.totalMoneyCost / 100);
        }
        if (spanSec > 0) {
          const spanMin = spanSec / 60;
          winRateGainPerMinute = spanMin > 0 ? (gain / spanMin) : null;
        }
      }

      result[itemId] = {
        itemId,
        enhanceCount: info.enhanceCount,
        totalMoneyCost: info.totalMoneyCost,
        totalEnhanceSpanSec: spanSec,
        winRateBefore: before.winRate,
        winRateAfter: after.winRate,
        avgTurnsBefore: before.avgTurns,
        avgTurnsAfter: after.avgTurns,
        winRateGainPer100Gold,
        winRateGainPerMinute
      };
    });

    return result;
  }

  function debugEvaluateFoodBuffImpact(sessionId) {
    const sid = sessionId || getCurrentSessionId();
    if (!sid) return null;

    const battleLogs = (DEBUG_STATS.battleLogs || []).filter(l => l.sessionId === sid);
    if (!battleLogs.length) return {};

    const allWithFood = battleLogs.filter(l => l.foodBuffIds && l.foodBuffIds.length);
    const allWithoutFood = battleLogs.filter(l => !l.foodBuffIds || !l.foodBuffIds.length);

    function summarize(list) {
      const total = list.length;
      if (!total) return { winRate: null, avgTurns: null, total: 0 };
      const win = list.filter(l => l.win).length;
      const turns = list.reduce((a, x) => a + (x.turns || 0), 0);
      return {
        total,
        winRate: win / total,
        avgTurns: turns / total
      };
    }

    const summaryWith = summarize(allWithFood);
    const summaryWithout = summarize(allWithoutFood);

    let winRateDiff = null;
    let avgTurnsDiff = null;
    if (summaryWith.winRate != null && summaryWithout.winRate != null) {
      winRateDiff = summaryWith.winRate - summaryWithout.winRate;
    }
    if (summaryWith.avgTurns != null && summaryWithout.avgTurns != null) {
      avgTurnsDiff = summaryWithout.avgTurns - summaryWith.avgTurns;
    }

    return {
      withFood: summaryWith,
      withoutFood: summaryWithout,
      winRateDiff,
      avgTurnsDiff
    };
  }

  // =======================
  // 難易度カーブ用: レベル帯別戦闘統計（オプション）
  // =======================

  // 既存ログ形式を使って、単純に「レベル帯ごとの勝率と平均ターン」を返す。
  // 例: bands=[1,10,20] → "1-9","10-19","20+" の3帯
  function debugGetBattleStatsByLevelBand(bands) {
    const logs = DEBUG_STATS.battleLogs || [];
    if (!logs.length) return {};

    const cuts = Array.isArray(bands) && bands.length ? bands.slice() : [1, 10, 20, 30];
    cuts.sort((a, b) => a - b);

    function bandKeyFromLevel(lv) {
      if (typeof lv !== "number") return "unknown";
      for (let i = 0; i < cuts.length; i++) {
        if (lv < cuts[i]) {
          const start = i === 0 ? 0 : cuts[i - 1];
          const end = cuts[i] - 1;
          return `${start}-${end}`;
        }
      }
      const last = cuts[cuts.length - 1];
      return `${last}+`;
    }

    const byBand = {};
    logs.forEach(l => {
      const key = bandKeyFromLevel(l.level);
      const t = byBand[key] || {
        total: 0,
        win: 0,
        lose: 0,
        totalTurns: 0
      };
      t.total += 1;
      if (l.win) t.win += 1;
      else t.lose += 1;
      t.totalTurns += (l.turns || 0);
      byBand[key] = t;
    });

    Object.keys(byBand).forEach(k => {
      const v = byBand[k];
      const total = v.total || 1;
      v.winRate = v.win / total;
      v.avgTurns = v.totalTurns / total;
    });

    return byBand;
  }

  // =======================
  // グローバル公開
  // =======================

  window.debugEvaluateSessionActions = debugEvaluateSessionActions;
  window.debugEvaluateLatestSession = debugEvaluateLatestSession;
  window.debugEvaluateActionsAllSessions = debugEvaluateActionsAllSessions;

  window.debugEvaluateCraftImpactWithTime = debugEvaluateCraftImpactWithTime;
  window.debugEvaluateEnhanceImpactWithTime = debugEvaluateEnhanceImpactWithTime;
  window.debugEvaluateFoodBuffImpact = debugEvaluateFoodBuffImpact;

  window.debugGetBattleStatsByLevelBand = debugGetBattleStatsByLevelBand;

})();