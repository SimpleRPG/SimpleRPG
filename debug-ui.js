// debug-ui.js
// ★デバッグ用★ 統計UI（採取/クラフト/戦闘/全体） + リセット/エクスポート
//
// 前提:
//  - debug-stats-core.js で以下がグローバル定義済み:
//    debugGetGatherStats, debugGetCraftStats, debugGetBattleStats,
//    debugGetEconomyStats, debugResetAllStats, debugExportCSV,
//    debugGetBattleStatsByEnemy, debugGetBattleStatsByArea,
//    beginTestSession, endTestSession, summarizeSession
//  - debug-stats-core2.js で以下があれば評価系UIが有効になる:
//    debugEvaluateLatestSession, debugEvaluateCraftImpactWithTime,
//    debugEvaluateEnhanceImpactWithTime, debugEvaluateFoodBuffImpact
//  - （テトちゃんAIが実装されていれば runTestChan / stopTestChan もグローバルにある想定）
//  - ステータス画面の GMデバッグタブ内に
//      <div id="gmDebugContainer"></div>
//    が html2.js 側で用意されている
//  - 旧仕様の <div id="debugOverallContainer"></div> / <div id="overallStatsContainer"></div>
//    があれば、そちらにもフォールバックする

// 既存の採取統計テーブル描画（サンプル）
function renderGatherStatsTableDebug() {
  const el = document.getElementById("gatherStatsTable");
  if (!el) return;
  const stats = (typeof debugGetGatherStats === "function") ? debugGetGatherStats() : {};
  const rows = [];

  rows.push("<table class=\"debug-table\">");
  rows.push("<tr><th>素材ID</th><th>総取得数</th><th>行動回数</th><th>総時間(s)</th><th>平均/行動</th><th>平均/秒</th></tr>");

  Object.keys(stats).forEach(id => {
    const s = stats[id] || {};
    const totalCount = s.totalCount || 0;
    const totalActions = s.totalActions || 0;
    const totalTimeSec = s.totalTimeSec || 0;
    const avgPerAction = typeof s.avgPerAction === "number" ? s.avgPerAction : (totalActions > 0 ? totalCount / totalActions : 0);
    const avgPerSec = typeof s.avgPerSec === "number" ? s.avgPerSec : (totalTimeSec > 0 ? totalCount / totalTimeSec : 0);

    rows.push(
      `<tr>` +
      `<td>${id}</td>` +
      `<td>${totalCount}</td>` +
      `<td>${totalActions}</td>` +
      `<td>${totalTimeSec}</td>` +
      `<td>${avgPerAction.toFixed(2)}</td>` +
      `<td>${avgPerSec.toFixed(2)}</td>` +
      `</tr>`
    );
  });

  rows.push("</table>");
  el.innerHTML = rows.join("");
}

// 既存のクラフト統計テーブル描画（サンプル）
function renderCraftStatsTableDebug() {
  const el = document.getElementById("craftStatsTable");
  if (!el) return;
  const stats = (typeof debugGetCraftStats === "function") ? debugGetCraftStats() : {};
  const rows = [];

  rows.push("<table class=\"debug-table\">");
  rows.push("<tr><th>アイテムID</th><th>試行回数</th><th>成功</th><th>失敗</th><th>成功率</th></tr>");

  Object.keys(stats).forEach(id => {
    const s = stats[id] || {};
    const tryCount = s.tryCount || 0;
    const successCount = s.successCount || 0;
    const failCount = s.failCount || 0;
    const rate = tryCount > 0 ? (successCount / tryCount * 100) : 0;
    rows.push(
      `<tr>` +
      `<td>${id}</td>` +
      `<td>${tryCount}</td>` +
      `<td>${successCount}</td>` +
      `<td>${failCount}</td>` +
      `<td>${rate.toFixed(1)}%</td>` +
      `</tr>`
    );
  });

  rows.push("</table>");
  el.innerHTML = rows.join("");
}

// 既存の戦闘統計テーブル描画（サンプル）
function renderBattleStatsTableDebug() {
  const el = document.getElementById("battleStatsTable");
  if (!el) return;
  const stats = (typeof debugGetBattleStats === "function") ? debugGetBattleStats() : {};
  const rows = [];

  rows.push("<table class=\"debug-table\">");
  rows.push("<tr><th>職業キー</th><th>総戦闘</th><th>勝利</th><th>敗北</th><th>逃走</th><th>総与ダメ</th><th>総被ダメ</th><th>総ターン</th></tr>");

  Object.keys(stats).forEach(jobKey => {
    const s = stats[jobKey] || {};
    const total = s.total || 0;
    const win = s.win || 0;
    const lose = s.lose || 0;
    const escape = s.escape || 0;
    const totalDamageDealt = s.totalDamageDealt || 0;
    const totalDamageTaken = s.totalDamageTaken || 0;
    const totalTurns = s.totalTurns || 0;

    rows.push(
      `<tr>` +
      `<td>${jobKey}</td>` +
      `<td>${total}</td>` +
      `<td>${win}</td>` +
      `<td>${lose}</td>` +
      `<td>${escape}</td>` +
      `<td>${totalDamageDealt}</td>` +
      `<td>${totalDamageTaken}</td>` +
      `<td>${totalTurns}</td>` +
      `</tr>`
    );
  });

  rows.push("</table>");
  el.innerHTML = rows.join("");
}

// 既存の経済統計テーブル描画（サンプル）
function renderEconomyStatsTableDebug() {
  const el = document.getElementById("economyStatsTable");
  if (!el) return;
  const s = (typeof debugGetEconomyStats === "function") ? debugGetEconomyStats() : {
    goldEarned: 0,
    goldSpent: 0,
    bySource: {},
    bySink: {}
  };
  const rows = [];

  const goldEarned = s.goldEarned || 0;
  const goldSpent = s.goldSpent || 0;
  const bySource = s.bySource || {};
  const bySink = s.bySink || {};

  rows.push("<table class=\"debug-table\">");
  rows.push("<tr><th>種別</th><th>金額</th></tr>");
  rows.push(`<tr><td>総獲得</td><td>${goldEarned}</td></tr>`);
  rows.push(`<tr><td>総消費</td><td>${goldSpent}</td></tr>`);
  rows.push("</table>");

  rows.push("<h5>獲得内訳</h5>");
  rows.push("<table class=\"debug-table\">");
  rows.push("<tr><th>ソース</th><th>金額</th></tr>");
  Object.keys(bySource).forEach(k => {
    rows.push(`<tr><td>${k}</td><td>${bySource[k]}</td></tr>`);
  });
  rows.push("</table>");

  rows.push("<h5>消費内訳</h5>");
  rows.push("<table class=\"debug-table\">");
  rows.push("<tr><th>用途</th><th>金額</th></tr>");
  Object.keys(bySink).forEach(k => {
    rows.push(`<tr><td>${k}</td><td>${bySink[k]}</td></tr>`);
  });
  rows.push("</table>");

  el.innerHTML = rows.join("");
}

// 戦闘統計（レベル帯別）テーブル描画
function renderBattleStatsByLevelBandTableDebug(data) {
  const el = document.getElementById("battleByLevelBandTable");
  if (!el) return;
  const stats = data || (typeof debugGetBattleStatsByLevelBand === "function" ? debugGetBattleStatsByLevelBand() : {});
  const keys = Object.keys(stats);

  if (keys.length === 0) {
    el.innerHTML = "<div style=\"font-size:11px; color:#aaa;\">データがありません。</div>";
    return;
  }

  const rows = [];
  rows.push("<table class=\"debug-table\">");
  rows.push("<tr><th>レベル帯</th><th>総戦闘</th><th>勝利</th><th>敗北</th><th>勝率</th><th>平均ターン</th></tr>");
  keys.forEach(band => {
    const s = stats[band] || {};
    const total = s.total || 0;
    const win = s.win || 0;
    const lose = s.lose || 0;
    const rate = total > 0 ? (win / total * 100) : 0;
    const avgTurns = total > 0 ? (s.totalTurns || 0) / total : 0;
    rows.push(
      `<tr>` +
      `<td>${band}</td>` +
      `<td>${total}</td>` +
      `<td>${win}</td>` +
      `<td>${lose}</td>` +
      `<td>${rate.toFixed(1)}%</td>` +
      `<td>${avgTurns.toFixed(1)}</td>` +
      `</tr>`
    );
  });
  rows.push("</table>");
  el.innerHTML = rows.join("");
}

// 死亡統計テーブル描画
function renderDeathStatsTableDebug(data) {
  const el = document.getElementById("deathStatsTable");
  if (!el) return;
  const stats = data || (typeof debugGetDeathStats === "function" ? debugGetDeathStats() : { totalDeaths: 0, byCause: {} });
  const byCause = stats.byCause || {};
  const causes = Object.keys(byCause);

  if (stats.totalDeaths === 0 || causes.length === 0) {
    el.innerHTML = "<div style=\"font-size:11px; color:#aaa;\">死亡記録がありません。</div>";
    return;
  }

  const rows = [];
  rows.push(`<div style="font-size:11px; margin-bottom:4px;">総死亡数: ${stats.totalDeaths}</div>`);
  rows.push("<table class=\"debug-table\">");
  rows.push("<tr><th>原因</th><th>件数</th><th>装備破損</th><th>損失金額</th></tr>");
  causes.forEach(cause => {
    const c = byCause[cause] || {};
    rows.push(
      `<tr>` +
      `<td>${cause}</td>` +
      `<td>${c.count || 0}</td>` +
      `<td>${c.equipBrokenCount || 0}</td>` +
      `<td>${c.totalMoneyLost || 0}</td>` +
      `</tr>`
    );
  });
  rows.push("</table>");
  el.innerHTML = rows.join("");
}

// アイテム使用統計テーブル描画
function renderItemUseStatsTableDebug(data) {
  const el = document.getElementById("itemUseStatsTable");
  if (!el) return;
  const stats = data || (typeof debugGetItemUseStats === "function" ? debugGetItemUseStats() : { totalUses: 0, byType: {} });
  const byType = stats.byType || {};
  const types = Object.keys(byType);

  if (stats.totalUses === 0 || types.length === 0) {
    el.innerHTML = "<div style=\"font-size:11px; color:#aaa;\">使用記録がありません。</div>";
    return;
  }

  const rows = [];
  rows.push(`<div style="font-size:11px; margin-bottom:4px;">総使用数: ${stats.totalUses}</div>`);
  rows.push("<table class=\"debug-table\">");
  rows.push("<tr><th>種別</th><th>件数</th><th>フィールド</th><th>戦闘</th><th>倉庫</th></tr>");
  types.forEach(type => {
    const t = byType[type] || {};
    rows.push(
      `<tr>` +
      `<td>${type}</td>` +
      `<td>${t.count || 0}</td>` +
      `<td>${t.fieldUse || 0}</td>` +
      `<td>${t.battleUse || 0}</td>` +
      `<td>${t.warehouseUse || 0}</td>` +
      `</tr>`
    );
  });
  rows.push("</table>");
  el.innerHTML = rows.join("");
}

// =======================
// デバッグマトリクス（条件×敵の勝率一括シミュレーション）
// =======================
// debug-matrix-core.js の window.runMatrixBattleTest(conditions, enemyIds, trials, options) を
// GMデバッグタブから操作するためのUI。

let debugMatrixConditions = [];
let debugMatrixResults = null;

function debugMatrixBuildJobOptions() {
  if (typeof JOB_DEFS === "undefined" || !Array.isArray(JOB_DEFS)) return "";
  return JOB_DEFS.map(j => `<option value="${j.id}">${j.name}(${j.id})</option>`).join("");
}

function debugMatrixBuildWeaponOptions() {
  if (typeof window.weapons === "undefined" || !Array.isArray(window.weapons) || window.weapons.length === 0) {
    return "<option value=\"\">(なし)</option>";
  }
  return "<option value=\"\">(なし)</option>" +
    window.weapons.map(w => `<option value="${w.id}">${w.name}</option>`).join("");
}

function debugMatrixBuildArmorOptions() {
  if (typeof window.armors === "undefined" || !Array.isArray(window.armors) || window.armors.length === 0) {
    return "<option value=\"\">(なし)</option>";
  }
  return "<option value=\"\">(なし)</option>" +
    window.armors.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
}

function debugMatrixBuildEnemyCheckboxes() {
  if (typeof ENEMIES === "undefined") return "";
  return Object.keys(ENEMIES).map(id => {
    const e = ENEMIES[id] || {};
    return `<label style="display:inline-block; width:140px; font-size:11px;">` +
      `<input type="checkbox" class="debugMatrixEnemyCk" value="${id}"> ${e.name || id}${e.isBoss ? "★" : ""}` +
      `</label>`;
  }).join("");
}

function renderDebugMatrixConditionList() {
  const el = document.getElementById("debugMatrixConditionList");
  if (!el) return;

  if (debugMatrixConditions.length === 0) {
    el.innerHTML = "<div style=\"font-size:11px; color:#aaa;\">条件が追加されていません。</div>";
    return;
  }

  const rows = [];
  rows.push("<table class=\"debug-table\">");
  rows.push("<tr><th>ラベル</th><th>Lv</th><th>職業</th><th>武器</th><th>防具</th><th>転生pt</th><th></th></tr>");

  debugMatrixConditions.forEach((c, i) => {
    const jobName = (typeof JOB_DEFS !== "undefined" && Array.isArray(JOB_DEFS))
      ? ((JOB_DEFS.find(j => j.id === c.jobId) || {}).name || c.jobId)
      : c.jobId;
    rows.push(
      `<tr>` +
      `<td>${c.label}</td>` +
      `<td>${c.level}</td>` +
      `<td>${jobName}</td>` +
      `<td>${c.weaponId || "-"}</td>` +
      `<td>${c.armorId || "-"}</td>` +
      `<td>${c.rebirthCombatPt || 0}</td>` +
      `<td><button type="button" class="debugMatrixRemoveCondBtn" data-index="${i}" style="font-size:10px;">削除</button></td>` +
      `</tr>`
    );
  });

  rows.push("</table>");
  el.innerHTML = rows.join("");

  el.querySelectorAll(".debugMatrixRemoveCondBtn").forEach(btn => {
    btn.onclick = function () {
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      debugMatrixConditions.splice(idx, 1);
      renderDebugMatrixConditionList();
    };
  });
}

function renderDebugMatrixResultsTable() {
  const el = document.getElementById("debugMatrixResultsContainer");
  if (!el) return;

  if (!debugMatrixResults) {
    el.innerHTML = "<div style=\"font-size:11px; color:#aaa;\">まだ実行していません。</div>";
    return;
  }
  if (debugMatrixResults.length === 0) {
    el.innerHTML = "<div style=\"font-size:11px; color:#aaa;\">結果がありません。</div>";
    return;
  }

  const rows = [];
  rows.push("<table class=\"debug-table\">");
  rows.push("<tr><th>条件</th><th>敵</th><th>試行</th><th>勝率</th><th>敗北率</th><th>逃走率</th><th>時間切れ率</th><th>平均ターン</th></tr>");

  debugMatrixResults.forEach(r => {
    const warnStyle = (r.winRate < 30) ? " style=\"color:#f88;\"" : "";
    rows.push(
      `<tr${warnStyle}>` +
      `<td>${r.label}</td>` +
      `<td>${r.enemyName}</td>` +
      `<td>${r.trials}</td>` +
      `<td>${r.winRate}%</td>` +
      `<td>${r.loseRate}%</td>` +
      `<td>${r.escapeRate}%</td>` +
      `<td>${r.timeoutRate}%</td>` +
      `<td>${r.avgTurns}</td>` +
      `</tr>`
    );
  });

  rows.push("</table>");
  el.innerHTML = rows.join("");
}

// =======================
// 評価系UI: 最新セッション評価
// =======================

function renderTetoEvaluationPanel() {
  const el = document.getElementById("tetoEvalContainer");
  if (!el) return;

  if (typeof debugEvaluateLatestSession !== "function") {
    el.innerHTML = "<div style=\"font-size:11px; color:#aaa;\">評価モジュール(debug-stats-core2.js)が無効なため、テトちゃん評価は表示できません。</div>";
    return;
  }

  const evalRes = debugEvaluateLatestSession();
  if (!evalRes) {
    el.innerHTML = "<div style=\"font-size:11px; color:#aaa;\">セッション評価データがありません。テトちゃんを一度実行してください。</div>";
    return;
  }

  const b = evalRes.battle || {};
  const g = evalRes.gather || {};
  const c = evalRes.craft || {};
  const e = evalRes.economy || {};
  const overall = evalRes.overall || { warnings: [], strengths: [] };

  const winRate = (typeof b.winRate === "number") ? (b.winRate * 100).toFixed(1) + "%" : "-";
  const avgTurns = (typeof b.avgTurns === "number") ? b.avgTurns.toFixed(2) : "-";
  const gatherPerHour = (typeof g.perHour === "number") ? g.perHour.toFixed(2) : "-";
  const craftSuccess = (typeof c.successRate === "number") ? (c.successRate * 100).toFixed(1) + "%" : "-";
  const goldPerMin = (typeof e.goldEarnedPerMin === "number") ? e.goldEarnedPerMin.toFixed(1) : "-";

  const warnings = Array.isArray(overall.warnings) ? overall.warnings : [];
  const strengths = Array.isArray(overall.strengths) ? overall.strengths : [];

  const rows = [];

  rows.push("<table class=\"debug-table\">");
  rows.push("<tr><th>項目</th><th>値</th><th>評価</th></tr>");
  rows.push(`<tr><td>戦闘勝率</td><td>${winRate}</td><td>${b.evaluation || "-"}</td></tr>`);
  rows.push(`<tr><td>平均ターン</td><td>${avgTurns}</td><td></td></tr>`);
  rows.push(`<tr><td>採取/時</td><td>${gatherPerHour}</td><td>${g.evaluation || "-"}</td></tr>`);
  rows.push(`<tr><td>クラフト成功率</td><td>${craftSuccess}</td><td>${c.evaluation || "-"}</td></tr>`);
  rows.push(`<tr><td>金策/分</td><td>${goldPerMin}</td><td>${e.evaluation || "-"}</td></tr>`);
  rows.push("</table>");

  if (strengths.length) {
    rows.push("<h5>良い点</h5><ul style=\"font-size:11px;\">");
    strengths.forEach(s => {
      rows.push(`<li>${s}</li>`);
    });
    rows.push("</ul>");
  }

  if (warnings.length) {
    rows.push("<h5>気になる点</h5><ul style=\"font-size:11px; color:#ffb0b0;\">");
    warnings.forEach(w => {
      rows.push(`<li>${w}</li>`);
    });
    rows.push("</ul>");
  }

  el.innerHTML = rows.join("");
}

// =======================
// 評価系UI: クラフト/強化/料理寄与
// =======================

function renderTetoImpactPanel() {
  const el = document.getElementById("tetoImpactContainer");
  if (!el) return;

  const hasCraftImpact = (typeof debugEvaluateCraftImpactWithTime === "function");
  const hasEnhImpact   = (typeof debugEvaluateEnhanceImpactWithTime === "function");
  const hasFoodImpact  = (typeof debugEvaluateFoodBuffImpact === "function");

  if (!hasCraftImpact && !hasEnhImpact && !hasFoodImpact) {
    el.innerHTML = "<div style=\"font-size:11px; color:#aaa;\">寄与評価APIが未定義のため、詳細なバランス寄与は表示できません。</div>";
    return;
  }

  const rows = [];

  // クラフト寄与
  if (hasCraftImpact) {
    const craftImpact = debugEvaluateCraftImpactWithTime(null) || {};
    const keys = Object.keys(craftImpact);
    rows.push("<h5>クラフト寄与（レシピ別）</h5>");
    if (!keys.length) {
      rows.push("<div style=\"font-size:11px; color:#aaa;\">データなし</div>");
    } else {
      rows.push("<table class=\"debug-table\">");
      rows.push("<tr><th>レシピID</th><th>回数</th><th>素材コスト合計</th><th>勝率 前→後</th><th>勝率上昇/100コスト</th></tr>");
      keys.slice(0, 20).forEach(id => {
        const r = craftImpact[id] || {};
        const before = (typeof r.winRateBefore === "number") ? (r.winRateBefore * 100).toFixed(1) + "%" : "-";
        const after  = (typeof r.winRateAfter === "number") ? (r.winRateAfter * 100).toFixed(1) + "%" : "-";
        const per100 = (typeof r.winRateGainPer100Cost === "number") ? r.winRateGainPer100Cost.toFixed(2) : "-";
        rows.push(
          `<tr>` +
          `<td>${id}</td>` +
          `<td>${r.craftCount || 0}</td>` +
          `<td>${r.totalMaterialCost || 0}</td>` +
          `<td>${before} → ${after}</td>` +
          `<td>${per100}</td>` +
          `</tr>`
        );
      });
      rows.push("</table>");
    }
  }

  // 強化寄与
  if (hasEnhImpact) {
    const enhImpact = debugEvaluateEnhanceImpactWithTime(null) || {};
    const keys = Object.keys(enhImpact);
    rows.push("<h5>強化寄与（装備別）</h5>");
    if (!keys.length) {
      rows.push("<div style=\"font-size:11px; color:#aaa;\">データなし</div>");
    } else {
      rows.push("<table class=\"debug-table\">");
      rows.push("<tr><th>装備ID</th><th>回数</th><th>消費G合計</th><th>勝率 前→後</th><th>勝率上昇/100G</th></tr>");
      keys.slice(0, 20).forEach(id => {
        const r = enhImpact[id] || {};
        const before = (typeof r.winRateBefore === "number") ? (r.winRateBefore * 100).toFixed(1) + "%" : "-";
        const after  = (typeof r.winRateAfter === "number") ? (r.winRateAfter * 100).toFixed(1) + "%" : "-";
        const per100 = (typeof r.winRateGainPer100Gold === "number") ? r.winRateGainPer100Gold.toFixed(2) : "-";
        rows.push(
          `<tr>` +
          `<td>${id}</td>` +
          `<td>${r.enhanceCount || 0}</td>` +
          `<td>${r.totalMoneyCost || 0}</td>` +
          `<td>${before} → ${after}</td>` +
          `<td>${per100}</td>` +
          `</tr>`
        );
      });
      rows.push("</table>");
    }
  }

  // 食事バフ寄与
  if (hasFoodImpact) {
    const foodImpact = debugEvaluateFoodBuffImpact(null);
    rows.push("<h5>料理・ドリンクバフ寄与</h5>");
    if (!foodImpact || !foodImpact.withFood || !foodImpact.withoutFood) {
      rows.push("<div style=\"font-size:11px; color:#aaa;\">データなし</div>");
    } else {
      const wf = foodImpact.withFood;
      const wo = foodImpact.withoutFood;
      const wrWith = (typeof wf.winRate === "number") ? (wf.winRate * 100).toFixed(1) + "%" : "-";
      const wrWithout = (typeof wo.winRate === "number") ? (wo.winRate * 100).toFixed(1) + "%" : "-";
      const avgWith = (typeof wf.avgTurns === "number") ? wf.avgTurns.toFixed(2) : "-";
      const avgWithout = (typeof wo.avgTurns === "number") ? wo.avgTurns.toFixed(2) : "-";

      rows.push("<table class=\"debug-table\">");
      rows.push("<tr><th>状態</th><th>戦闘数</th><th>勝率</th><th>平均ターン</th></tr>");
      rows.push(`<tr><td>バフあり</td><td>${wf.total || 0}</td><td>${wrWith}</td><td>${avgWith}</td></tr>`);
      rows.push(`<tr><td>バフなし</td><td>${wo.total || 0}</td><td>${wrWithout}</td><td>${avgWithout}</td></tr>`);
      rows.push("</table>");
    }
  }

  el.innerHTML = rows.join("");
}

// ================
// 怪しいもの TOP N
// ================

// クラフト寄与 TOP N（勝率上昇/100コスト 降順）
function debugGetTopCraftImpacts(limit) {
  limit = limit || 10;
  if (typeof debugEvaluateCraftImpactWithTime !== "function") return [];
  const impact = debugEvaluateCraftImpactWithTime(null) || {};
  const arr = Object.keys(impact).map(id => impact[id]);
  arr.sort((a, b) => {
    const av = (typeof a.winRateGainPer100Cost === "number") ? a.winRateGainPer100Cost : -9999;
    const bv = (typeof b.winRateGainPer100Cost === "number") ? b.winRateGainPer100Cost : -9999;
    return bv - av;
  });
  return arr.slice(0, limit);
}

// 強化寄与 TOP N（勝率上昇/100G 降順）
function debugGetTopEnhanceImpacts(limit) {
  limit = limit || 10;
  if (typeof debugEvaluateEnhanceImpactWithTime !== "function") return [];
  const impact = debugEvaluateEnhanceImpactWithTime(null) || {};
  const arr = Object.keys(impact).map(id => impact[id]);
  arr.sort((a, b) => {
    const av = (typeof a.winRateGainPer100Gold === "number") ? a.winRateGainPer100Gold : -9999;
    const bv = (typeof b.winRateGainPer100Gold === "number") ? b.winRateGainPer100Gold : -9999;
    return bv - av;
  });
  return arr.slice(0, limit);
}

// 勝率が低すぎる敵 TOP N
function debugGetWorstEnemies(limit, minBattles, maxWinRate) {
  limit = limit || 10;
  minBattles = minBattles || 20;
  maxWinRate = (typeof maxWinRate === "number") ? maxWinRate : 0.3;
  if (typeof debugGetBattleStatsByEnemy !== "function") return [];
  const stats = debugGetBattleStatsByEnemy() || {};
  const arr = Object.keys(stats).map(id => {
    return { enemyId: id, ...stats[id] };
  }).filter(x => x.total >= minBattles);
  arr.forEach(x => {
    x.winRate = (x.total > 0) ? (x.win / x.total) : 0;
  });
  arr.sort((a, b) => a.winRate - b.winRate);
  return arr.filter(x => x.winRate <= maxWinRate).slice(0, limit);
}

// 勝率が低すぎるエリア TOP N
function debugGetWorstAreas(limit, minBattles, maxWinRate) {
  limit = limit || 10;
  minBattles = minBattles || 20;
  maxWinRate = (typeof maxWinRate === "number") ? maxWinRate : 0.3;
  if (typeof debugGetBattleStatsByArea !== "function") return [];
  const stats = debugGetBattleStatsByArea() || {};
  const arr = Object.keys(stats).map(id => {
    return { area: id, ...stats[id] };
  }).filter(x => x.total >= minBattles);
  arr.forEach(x => {
    x.winRate = (x.total > 0) ? (x.win / x.total) : 0;
  });
  arr.sort((a, b) => a.winRate - b.winRate);
  return arr.filter(x => x.winRate <= maxWinRate).slice(0, limit);
}

// 金策効率が高すぎる理由 TOP N
function debugGetTopGoldSources(limit) {
  limit = limit || 10;
  if (typeof debugGetEconomyStats !== "function") return [];
  const econ = debugGetEconomyStats() || { bySource: {} };
  const bySource = econ.bySource || {};
  const arr = Object.keys(bySource).map(k => {
    return { reason: k, amount: bySource[k] || 0 };
  });
  arr.sort((a, b) => (b.amount - a.amount));
  return arr.slice(0, limit);
}

// ================
// セッション一覧 + 詳細
// ================

function renderSessionDetail(sessionId) {
  const detailEl = document.getElementById("tetoSessionDetailArea");
  if (!detailEl) return;
  if (!sessionId) {
    detailEl.innerHTML = "";
    return;
  }

  const summary = (typeof summarizeSession === "function") ? summarizeSession(sessionId) : null;
  const evalRes = (typeof debugEvaluateSessionActions === "function") ? debugEvaluateSessionActions(sessionId) : null;

  const rows = [];
  rows.push(`<div style="font-size:11px;">sessionId=${sessionId}</div>`);
  if (summary) {
    rows.push("<pre style=\"font-size:11px; max-height:180px; overflow:auto;\">");
    rows.push(JSON.stringify(summary, null, 2));
    rows.push("</pre>");
  }
  if (evalRes) {
    rows.push("<h5>評価</h5>");
    rows.push("<pre style=\"font-size:11px; max-height:180px; overflow:auto;\">");
    rows.push(JSON.stringify(evalRes, null, 2));
    rows.push("</pre>");
  }

  detailEl.innerHTML = rows.join("");

  // タイムラインも描画
  renderSessionTimeline(sessionId);
}

function renderSessionListTable() {
  const el = document.getElementById("tetoSessionListContainer");
  if (!el) return;
  const DEBUG_STATS = window.DEBUG_STATS || {};
  const sessions = DEBUG_STATS.sessions || [];

  if (!sessions.length) {
    el.innerHTML = "<div style=\"font-size:11px; color:#aaa;\">セッション履歴がありません。</div>";
    return;
  }

  const rows = [];
  rows.push("<table class=\"debug-table\">");
  rows.push("<tr><th>sessionId</th><th>mode</th><th>style</th><th>分</th><th>開始</th><th>終了</th><th>warnings</th><th>詳細</th></tr>");

  sessions.forEach(s => {
    let warnCount = "-";
    if (typeof debugEvaluateSessionActions === "function") {
      const evalRes = debugEvaluateSessionActions(s.id);
      if (evalRes && evalRes.overall && Array.isArray(evalRes.overall.warnings)) {
        warnCount = evalRes.overall.warnings.length;
      }
    }
    const start = s.startTime ? new Date(s.startTime).toLocaleTimeString() : "-";
    const end   = s.endTime   ? new Date(s.endTime).toLocaleTimeString()   : "-";

    rows.push(
      `<tr>` +
      `<td style="font-size:10px;">${s.id}</td>` +
      `<td>${s.mode}</td>` +
      `<td>${s.style || ""}</td>` +
      `<td>${s.minutes}</td>` +
      `<td>${start}</td>` +
      `<td>${end}</td>` +
      `<td>${warnCount}</td>` +
      `<td><button data-sid="${s.id}" class="tetoSessionDetailBtn" style="font-size:10px;">詳細</button></td>` +
      `</tr>`
    );
  });

  rows.push("</table>");
  rows.push(`<div id="tetoSessionDetailArea" style="margin-top:6px; font-size:11px;"></div>`);
  rows.push(`<div id="tetoSessionTimelineContainer" style="margin-top:6px; font-size:11px;"></div>`);

  el.innerHTML = rows.join("");

  // ボタンにイベント付与
  const buttons = el.querySelectorAll(".tetoSessionDetailBtn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const sid = btn.getAttribute("data-sid");
      renderSessionDetail(sid);
    });
  });
}

// ================
// カバー率メトリクス（配列チェック付き修正版）
// ================

function getAiCoverageSummary() {
  const DEBUG_STATS = window.DEBUG_STATS || {};

  const battles = Array.isArray(DEBUG_STATS.battleLogs) ? DEBUG_STATS.battleLogs : [];
  const crafts  = Array.isArray(DEBUG_STATS.craftLogs)  ? DEBUG_STATS.craftLogs  : [];
  const gathers = Array.isArray(DEBUG_STATS.gatherLogs) ? DEBUG_STATS.gatherLogs : [];

  const enemySet = new Set();
  const areaSet  = new Set();
  const recipeSet= new Set();
  const gatherTargetSet = new Set();

  battles.forEach(l => {
    if (l && l.enemyId != null) enemySet.add(String(l.enemyId));
    if (l && l.area != null) areaSet.add(String(l.area));
  });
  crafts.forEach(l => {
    if (l && l.itemId != null) recipeSet.add(String(l.itemId));
  });
  gathers.forEach(l => {
    if (l && l.target != null) gatherTargetSet.add(String(l.target));
  });

  const sessions = Array.isArray(DEBUG_STATS.sessions) ? DEBUG_STATS.sessions : [];
  const modeCount = {};
  sessions.forEach(s => {
    if (!s) return;
    const key = s.mode || "unknown";
    modeCount[key] = (modeCount[key] || 0) + 1;
  });

  return {
    enemyCount: enemySet.size,
    areaCount: areaSet.size,
    recipeCount: recipeSet.size,
    gatherTargetCount: gatherTargetSet.size,
    modeCount
  };
}

// ================
// セッションタイムライン
// ================

function getSessionTimeline(sessionId, bucketSec) {
  bucketSec = bucketSec || 60;
  const DEBUG_STATS = window.DEBUG_STATS || {};
  const sessions = Array.isArray(DEBUG_STATS.sessions) ? DEBUG_STATS.sessions : [];
  const sess = sessions.find(s => s && s.id === sessionId);
  if (!sess) return null;

  const start = sess.startTime || 0;
  const end   = sess.endTime   || Date.now();
  const durationSec = (end - start) / 1000;
  const bucketCount = Math.max(1, Math.ceil(durationSec / bucketSec));

  const buckets = [];
  for (let i = 0; i < bucketCount; i++) {
    buckets.push({
      index: i,
      startMs: start + i * bucketSec * 1000,
      endMs:   start + (i + 1) * bucketSec * 1000,
      battles: 0,
      gathers: 0,
      crafts: 0,
      econOps: 0
    });
  }

  function stampToBucket(t) {
    if (!t) return null;
    const idx = Math.floor((t - start) / (bucketSec * 1000));
    if (idx < 0 || idx >= bucketCount) return null;
    return buckets[idx];
  }

  const battleLogs = Array.isArray(DEBUG_STATS.battleLogs)
    ? DEBUG_STATS.battleLogs.filter(l => l && l.sessionId === sessionId)
    : [];
  const gatherLogs = Array.isArray(DEBUG_STATS.gatherLogs)
    ? DEBUG_STATS.gatherLogs.filter(l => l && l.sessionId === sessionId)
    : [];
  const craftLogs  = Array.isArray(DEBUG_STATS.craftLogs)
    ? DEBUG_STATS.craftLogs.filter(l => l && l.sessionId === sessionId)
    : [];
  const econLogs   = Array.isArray(DEBUG_STATS.economyLogs)
    ? DEBUG_STATS.economyLogs.filter(l => l && l.sessionId === sessionId)
    : [];

  battleLogs.forEach(l => { const b = stampToBucket(l.t); if (b) b.battles++; });
  gatherLogs.forEach(l => { const b = stampToBucket(l.t); if (b) b.gathers++; });
  craftLogs.forEach(l  => { const b = stampToBucket(l.t); if (b) b.crafts++; });
  econLogs.forEach(l   => { const b = stampToBucket(l.t); if (b) b.econOps++; });

  return buckets;
}

function renderSessionTimeline(sessionId) {
  const el = document.getElementById("tetoSessionTimelineContainer");
  if (!el) return;
  if (!sessionId) {
    el.innerHTML = "<div style=\"font-size:11px; color:#aaa;\">セッションを選択してください。</div>";
    return;
  }
  const buckets = getSessionTimeline(sessionId, 60); // 1分単位
  if (!buckets) {
    el.innerHTML = "<div style=\"font-size:11px; color:#aaa;\">タイムラインデータなし。</div>";
    return;
  }

  const rows = [];
  rows.push("<table class=\"debug-table\">");
  rows.push("<tr><th>分</th><th>戦闘</th><th>採取</th><th>クラフト</th><th>経済操作</th></tr>");
  buckets.forEach(b => {
    const minuteIndex = b.index;
    rows.push(
      `<tr>` +
      `<td>${minuteIndex}</td>` +
      `<td>${b.battles}</td>` +
      `<td>${b.gathers}</td>` +
      `<td>${b.crafts}</td>` +
      `<td>${b.econOps}</td>` +
      `</tr>`
    );
  });
  rows.push("</table>");

  el.innerHTML = rows.join("");
}

// =======================
// GMデバッグペイン描画
// =======================

function renderGmDebugPanel() {
  const box =
    document.getElementById("gmDebugContainer") ||
    document.getElementById("debugOverallContainer") ||
    document.getElementById("overallStatsContainer");
  if (!box) return;

  // 採取トップ3
  let gatherTop3 = [];
  if (typeof debugGetGatherStats === "function") {
    const g = debugGetGatherStats() || {};
    const arr = Object.keys(g).map(id => {
      return { id, stats: g[id] };
    });
    arr.sort((a, b) => ((b.stats.totalCount || 0) - (a.stats.totalCount || 0)));
    gatherTop3 = arr.slice(0, 3);
  }

  const craftStats    = (typeof debugGetCraftStats === "function") ? debugGetCraftStats() : {};
  const battleStats   = (typeof debugGetBattleStats === "function") ? debugGetBattleStats() : {};
  const econStats     = (typeof debugGetEconomyStats === "function") ? debugGetEconomyStats() : {};
  const battleByEnemy = (typeof debugGetBattleStatsByEnemy === "function") ? debugGetBattleStatsByEnemy() : {};
  const battleByArea  = (typeof debugGetBattleStatsByArea === "function") ? debugGetBattleStatsByArea() : {};
  const battleByLevelBand = (typeof debugGetBattleStatsByLevelBand === "function") ? debugGetBattleStatsByLevelBand() : {};
  const deathStats     = (typeof debugGetDeathStats === "function") ? debugGetDeathStats() : { totalDeaths: 0, byCause: {} };
  const itemUseStats   = (typeof debugGetItemUseStats === "function") ? debugGetItemUseStats() : { totalUses: 0, byType: {} };

  const hasTestChan = (typeof window.runTestChan === "function");
  const hasMatrix = (typeof window.runMatrixBattleTest === "function");

  const currentAiLevel     = window.tetoAiLevel || "normal";
  const currentBuildStyle  = window.tetoTestBuildStyle || "";

  const coverage = getAiCoverageSummary();
  const topCraftImpact   = debugGetTopCraftImpacts(10);
  const topEnhImpact     = debugGetTopEnhanceImpacts(10);
  const worstEnemies     = debugGetWorstEnemies(10, 20, 0.3);
  const worstAreas       = debugGetWorstAreas(10, 20, 0.3);
  const topGoldSources   = debugGetTopGoldSources(10);

  // GMパネルHTML
  box.innerHTML = `
    <h4>テストプレイ用AI（テトちゃん）</h4>
    <div style="font-size:12px; margin-bottom:8px; padding:6px; border:1px solid #555;">
      <div style="margin-bottom:4px;">
        <span style="color:#c0bedf; font-size:11px;">テトちゃん設定</span>
      </div>
      <div style="font-size:11px; margin-bottom:4px;">
        賢さ:
        <select id="debugTetoAiLevelSelect">
          <option value="simple">かんたん</option>
          <option value="normal">ふつう</option>
          <option value="smart">かしこい</option>
        </select>
      </div>
      <div style="font-size:11px; margin-bottom:4px;">
        ビルド:
        <select id="debugTetoBuildSelect">
          <option value="">指定なし</option>
          <option value="warrior_sword">戦士・片手剣メイン</option>
          <option value="warrior_axe">戦士・斧メイン</option>
          <option value="mage_staff">魔法使い・杖メイン</option>
          <option value="tamer_pet">テイマー・ペット特化</option>
        </select>
      </div>
      <div style="font-size:11px; margin-bottom:4px;">
        実行モード:
        <select id="testChanModeSelect" style="font-size:11px;">
          <option value="battleMain">戦闘メイン</option>
          <option value="gatherMain">採取メイン</option>
          <option value="craftMain">クラフトメイン</option>
          <option value="lifeMain">生活メイン</option>
          <option value="balancedMain">バランス(評価重視)</option>
          <option value="mixed" selected>まんべんなく</option>
        </select>
        時間(分):
        <input id="testChanMinutesInput" type="number" value="10" min="1" max="120" style="width:40px; font-size:11px;">
      </div>
      <div style="margin-bottom:4px;">
        <button id="testChanStartBtn" ${hasTestChan ? "" : "disabled"} style="font-size:11px; padding:2px 6px;">テトちゃん開始</button>
        <button id="testChanStopBtn" ${hasTestChan ? "" : "disabled"} style="font-size:11px; padding:2px 6px;">停止</button>
      </div>
      <div id="testChanStatusText" style="font-size:11px; color:#ccc;">
        ${
          hasTestChan
            ? `現在: 賢さ=${currentAiLevel}, テトちゃんは待機中です。`
            : "runTestChan が未定義のため、テストプレイAIは無効です。"
        }
      </div>
      <div style="font-size:10px; color:#aaa; margin-top:4px;">
        ※ テトちゃん停止時に、自動でセッション評価がログに出ます（debug-stats-core2.js が有効な場合）。
      </div>
    </div>

    <h4>戦闘マトリクステスト（デバッグマトリクス）</h4>
    <div style="font-size:12px; margin-bottom:8px; padding:6px; border:1px solid #555;">
      ${hasMatrix ? "" : `<div style="font-size:11px; color:#f88; margin-bottom:4px;">
        runMatrixBattleTest が見つかりません。debug-matrix-core.js の読み込みを確認してください。
      </div>`}
      <div style="font-size:11px; color:#c0bedf; margin-bottom:4px;">条件を追加</div>
      <div style="font-size:11px; margin-bottom:4px; display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
        <span>ラベル: <input id="debugMatrixLabelInput" type="text" placeholder="任意" style="width:90px; font-size:11px;"></span>
        <span>Lv: <input id="debugMatrixLevelInput" type="number" value="1" min="1" style="width:50px; font-size:11px;"></span>
        <span>職業: <select id="debugMatrixJobSelect" style="font-size:11px;">${debugMatrixBuildJobOptions()}</select></span>
        <span>武器: <select id="debugMatrixWeaponSelect" style="font-size:11px;">${debugMatrixBuildWeaponOptions()}</select></span>
        <span>防具: <select id="debugMatrixArmorSelect" style="font-size:11px;">${debugMatrixBuildArmorOptions()}</select></span>
        <span>転生pt: <input id="debugMatrixRebirthInput" type="number" value="0" min="0" style="width:60px; font-size:11px;"></span>
      </div>
      <div style="margin-bottom:6px;">
        <button type="button" id="debugMatrixAddCondBtn" style="font-size:11px; padding:2px 6px;">条件を追加</button>
        <button type="button" id="debugMatrixClearCondBtn" style="font-size:11px; padding:2px 6px;">条件を全削除</button>
      </div>
      <div id="debugMatrixConditionList" style="margin-bottom:8px;"></div>

      <div style="font-size:11px; color:#c0bedf; margin-bottom:4px;">対象の敵</div>
      <div id="debugMatrixEnemyChecks" style="margin-bottom:6px; max-height:100px; overflow:auto; border:1px solid #444; padding:4px;">
        ${debugMatrixBuildEnemyCheckboxes()}
      </div>

      <div style="font-size:11px; margin-bottom:6px;">
        試行回数/条件: <input id="debugMatrixTrialsInput" type="number" value="30" min="1" max="500" style="width:55px; font-size:11px;">
        最大ターン: <input id="debugMatrixMaxTurnsInput" type="number" value="60" min="1" max="500" style="width:55px; font-size:11px;">
      </div>

      <div style="margin-bottom:6px;">
        <button type="button" id="debugMatrixRunBtn" ${hasMatrix ? "" : "disabled"} style="font-size:11px; padding:2px 6px;">マトリクステスト実行</button>
      </div>
      <div id="debugMatrixStatusText" style="font-size:11px; color:#ccc; margin-bottom:6px;"></div>

      <div style="font-size:11px; color:#c0bedf; margin-bottom:4px;">結果</div>
      <div id="debugMatrixResultsContainer"></div>
    </div>

    <h4>テトちゃん最新セッション評価</h4>
    <div id="tetoEvalContainer" style="margin-bottom:8px; font-size:11px;"></div>

    <h4>クラフト/強化/料理バフの戦闘寄与</h4>
    <div id="tetoImpactContainer" style="margin-bottom:8px; font-size:11px;"></div>

    <h4>テトちゃんセッション一覧</h4>
    <div id="tetoSessionListContainer" style="margin-bottom:8px; font-size:11px;"></div>

    <h4>AIテストカバー率</h4>
    <pre id="tetoCoverageSummary" style="font-size:11px; max-height:160px; overflow:auto;">${JSON.stringify(coverage, null, 2)}</pre>

    <h4>怪しいところ TOP</h4>
    <h5>クラフト寄与 TOP</h5>
    <pre style="font-size:11px; max-height:160px; overflow:auto;">${JSON.stringify(topCraftImpact, null, 2)}</pre>
    <h5>強化寄与 TOP</h5>
    <pre style="font-size:11px; max-height:160px; overflow:auto;">${JSON.stringify(topEnhImpact, null, 2)}</pre>
    <h5>勝率が低すぎる敵 TOP</h5>
    <pre style="font-size:11px; max-height:160px; overflow:auto;">${JSON.stringify(worstEnemies, null, 2)}</pre>
    <h5>勝率が低すぎるエリア TOP</h5>
    <pre style="font-size:11px; max-height:160px; overflow:auto;">${JSON.stringify(worstAreas, null, 2)}</pre>
    <h5>金策効率が高すぎる理由 TOP</h5>
    <pre style="font-size:11px; max-height:160px; overflow:auto;">${JSON.stringify(topGoldSources, null, 2)}</pre>

    <h4>採取効率トップ3</h4>
    <pre style="font-size:11px; max-height:160px; overflow:auto;">${JSON.stringify(gatherTop3, null, 2)}</pre>
    <h4>クラフト成功率</h4>
    <pre style="font-size:11px; max-height:160px; overflow:auto;">${JSON.stringify(craftStats, null, 2)}</pre>
    <h4>戦闘(全職)</h4>
    <pre style="font-size:11px; max-height:160px; overflow:auto;">${JSON.stringify(battleStats, null, 2)}</pre>
    <h4>戦闘: 敵別</h4>
    <pre style="font-size:11px; max-height:160px; overflow:auto;">${JSON.stringify(battleByEnemy, null, 2)}</pre>
    <h4>戦闘: エリア別</h4>
    <pre style="font-size:11px; max-height:160px; overflow:auto;">${JSON.stringify(battleByArea, null, 2)}</pre>
    <h4>戦闘: レベル帯別</h4>
    <div id="battleByLevelBandTable" style="margin-bottom:8px;"></div>
    <h4>死亡統計（テトAI実行時のみ記録）</h4>
    <div id="deathStatsTable" style="margin-bottom:8px;"></div>
    <h4>アイテム使用統計（テトAI実行時のみ記録）</h4>
    <div id="itemUseStatsTable" style="margin-bottom:8px;"></div>
    <h4>経済</h4>
    <pre style="font-size:11px; max-height:160px; overflow:auto;">${JSON.stringify(econStats, null, 2)}</pre>
    <div style="margin-top:8px;">
      <button type="button" id="debugResetAllBtn">全リセット</button>
      <button type="button" id="debugExportCsvBtn">CSV出力</button>
    </div>
  `;

  renderBattleStatsByLevelBandTableDebug(battleByLevelBand);
  renderDeathStatsTableDebug(deathStats);
  renderItemUseStatsTableDebug(itemUseStats);

  // テトちゃん設定 UI のイベント紐付け
  const aiLevelSel     = document.getElementById("debugTetoAiLevelSelect");
  const buildSel       = document.getElementById("debugTetoBuildSelect");
  const modeSel        = document.getElementById("testChanModeSelect");
  const minutesInput   = document.getElementById("testChanMinutesInput");
  const startBtn       = document.getElementById("testChanStartBtn");
  const stopBtn        = document.getElementById("testChanStopBtn");
  const statusEl       = document.getElementById("testChanStatusText");

  if (aiLevelSel) {
    aiLevelSel.value = currentAiLevel;
    aiLevelSel.addEventListener("change", () => {
      window.tetoAiLevel = aiLevelSel.value;
      if (statusEl) {
        statusEl.textContent = `現在: 賢さ=${window.tetoAiLevel}, テトちゃんは待機中です。`;
      }
      if (typeof appendLog === "function") {
        appendLog(`[GM] テトちゃんの賢さレベルを ${window.tetoAiLevel} に変更しました`);
      }
    });
  }

  if (buildSel) {
    buildSel.value = currentBuildStyle;
    buildSel.addEventListener("change", () => {
      window.tetoTestBuildStyle = buildSel.value;
      if (typeof appendLog === "function") {
        appendLog(`[GM] テトちゃんのビルドスタイルを ${window.tetoTestBuildStyle || "指定なし"} に変更しました`);
      }
    });
  }

  if (hasTestChan && startBtn && statusEl) {
    startBtn.onclick = function () {
      const mode = (modeSel && modeSel.value) ? modeSel.value : "mixed";
      let minutes = 10;
      if (minutesInput) {
        const v = parseInt(minutesInput.value, 10);
        if (v && v > 0) minutes = v;
      }

      try {
        window.runTestChan(mode, minutes);
      } catch (e) {
        console.error("runTestChan error", e);
        statusEl.textContent = "テトちゃん実行中にエラーが発生しました。コンソールを確認してください。";
        return;
      }

      const now = new Date();
      const end = new Date(now.getTime() + minutes * 60 * 1000);
      const hh = String(end.getHours()).padStart(2, "0");
      const mm = String(end.getMinutes()).padStart(2, "0");
      statusEl.textContent =
        `テトちゃん実行中: mode=${mode}, 約 ${hh}:${mm} 頃に終了予定`;

      if (typeof appendLog === "function") {
        appendLog(
          `[GM] テトちゃん開始: mode=${mode}, 分=${minutes}, 賢さ=${window.tetoAiLevel}` +
          (window.tetoTestBuildStyle ? `, build=${window.tetoTestBuildStyle}` : "")
        );
      }
    };
  }

  if (hasTestChan && stopBtn && statusEl) {
    stopBtn.onclick = function () {
      if (typeof window.stopTestChan === "function") {
        try {
          window.stopTestChan();
        } catch (e) {
          console.error("stopTestChan error", e);
        }
      }
      statusEl.textContent =
        `現在: 賢さ=${window.tetoAiLevel || "normal"}, テトちゃんは停止中です。`;
      if (typeof appendLog === "function") {
        appendLog("[GM] テトちゃんを停止しました");
      }

      // 再描画して評価パネルを更新
      renderTetoEvaluationPanel();
      renderTetoImpactPanel();
      renderSessionListTable();
    };
  }

  // 統計リセット
  const resetBtn = document.getElementById("debugResetAllBtn");
  if (resetBtn && typeof debugResetAllStats === "function") {
    resetBtn.onclick = function () {
      debugResetAllStats();
      renderGmDebugPanel();
    };
  }

  // CSV出力
  const exportBtn = document.getElementById("debugExportCsvBtn");
  if (exportBtn && typeof debugExportCSV === "function") {
    exportBtn.onclick = function () {
      debugExportCSV();
    };
  }

  // デバッグマトリクス操作
  const matrixAddBtn   = document.getElementById("debugMatrixAddCondBtn");
  const matrixClearBtn = document.getElementById("debugMatrixClearCondBtn");
  const matrixRunBtn   = document.getElementById("debugMatrixRunBtn");
  const matrixStatusEl = document.getElementById("debugMatrixStatusText");

  if (matrixAddBtn) {
    matrixAddBtn.onclick = function () {
      const labelInput   = document.getElementById("debugMatrixLabelInput");
      const levelInput   = document.getElementById("debugMatrixLevelInput");
      const jobSelect    = document.getElementById("debugMatrixJobSelect");
      const weaponSelect = document.getElementById("debugMatrixWeaponSelect");
      const armorSelect  = document.getElementById("debugMatrixArmorSelect");
      const rebirthInput = document.getElementById("debugMatrixRebirthInput");

      const level = parseInt(levelInput && levelInput.value, 10) || 1;
      const jobId = jobSelect ? parseInt(jobSelect.value, 10) : undefined;
      const weaponId = (weaponSelect && weaponSelect.value) ? weaponSelect.value : undefined;
      const armorId = (armorSelect && armorSelect.value) ? armorSelect.value : undefined;
      const rebirthCombatPt = parseInt(rebirthInput && rebirthInput.value, 10) || 0;

      const jobName = (typeof JOB_DEFS !== "undefined" && Array.isArray(JOB_DEFS))
        ? ((JOB_DEFS.find(j => j.id === jobId) || {}).name || jobId)
        : jobId;
      const autoLabel = `Lv${level} ${jobName}${rebirthCombatPt ? " 転生" + rebirthCombatPt : ""}`;
      const label = (labelInput && labelInput.value.trim()) ? labelInput.value.trim() : autoLabel;

      const cond = { label, level, jobId };
      if (weaponId) cond.weaponId = weaponId;
      if (armorId) cond.armorId = armorId;
      if (rebirthCombatPt > 0) cond.rebirthCombatPt = rebirthCombatPt;

      debugMatrixConditions.push(cond);
      renderDebugMatrixConditionList();

      if (labelInput) labelInput.value = "";
    };
  }

  if (matrixClearBtn) {
    matrixClearBtn.onclick = function () {
      debugMatrixConditions = [];
      renderDebugMatrixConditionList();
    };
  }

  if (matrixRunBtn && hasMatrix) {
    matrixRunBtn.onclick = function () {
      const enemyIds = Array.from(document.querySelectorAll(".debugMatrixEnemyCk:checked")).map(ck => ck.value);
      const trialsInput = document.getElementById("debugMatrixTrialsInput");
      const maxTurnsInput = document.getElementById("debugMatrixMaxTurnsInput");
      const trials = parseInt(trialsInput && trialsInput.value, 10) || 30;
      const maxTurns = parseInt(maxTurnsInput && maxTurnsInput.value, 10) || 60;

      if (debugMatrixConditions.length === 0) {
        if (matrixStatusEl) matrixStatusEl.textContent = "条件を1つ以上追加してください。";
        return;
      }
      if (enemyIds.length === 0) {
        if (matrixStatusEl) matrixStatusEl.textContent = "敵を1体以上選択してください。";
        return;
      }

      if (matrixStatusEl) matrixStatusEl.textContent = "実行中...（同期処理のため一瞬画面が固まります）";

      // ボタン押下の描画を先に反映させてから重い同期処理に入る
      setTimeout(function () {
        try {
          debugMatrixResults = window.runMatrixBattleTest(
            debugMatrixConditions,
            enemyIds,
            trials,
            { maxTurns: maxTurns }
          );
        } catch (e) {
          console.error("runMatrixBattleTest error", e);
          if (matrixStatusEl) matrixStatusEl.textContent = "エラーが発生しました。コンソールを確認してください。";
          return;
        }

        if (matrixStatusEl) {
          matrixStatusEl.textContent = debugMatrixResults
            ? `完了: ${debugMatrixResults.length}件の結果`
            : "実行に失敗しました（コンソールを確認してください）。";
        }
        renderDebugMatrixResultsTable();
      }, 10);
    };
  }

  renderDebugMatrixConditionList();
  renderDebugMatrixResultsTable();

  // 初回描画
  renderTetoEvaluationPanel();
  renderTetoImpactPanel();
  renderSessionListTable();
}

// 互換用: 旧 renderDebugOverall 名も残しておく
function renderDebugOverall() {
  renderGmDebugPanel();
}

// =======================
// 初期化（GMタブ用）
// =======================

function initDebugStats() {
  renderGmDebugPanel();
}

// グローバルに公開（他の初期化コードから呼べるように）
if (typeof window !== "undefined") {
  window.initDebugStats = initDebugStats;
  window.renderDebugOverall = renderDebugOverall;
  window.renderGatherStatsTableDebug = renderGatherStatsTableDebug;
  window.renderCraftStatsTableDebug = renderCraftStatsTableDebug;
  window.renderBattleStatsTableDebug = renderBattleStatsTableDebug;
  window.renderEconomyStatsTableDebug = renderEconomyStatsTableDebug;
  window.renderBattleStatsByLevelBandTableDebug = renderBattleStatsByLevelBandTableDebug;
  window.renderDeathStatsTableDebug = renderDeathStatsTableDebug;
  window.renderItemUseStatsTableDebug = renderItemUseStatsTableDebug;
  window.renderGmDebugPanel = renderGmDebugPanel;
  window.renderTetoEvaluationPanel = renderTetoEvaluationPanel;
  window.renderTetoImpactPanel = renderTetoImpactPanel;

  window.debugGetTopCraftImpacts = debugGetTopCraftImpacts;
  window.debugGetTopEnhanceImpacts = debugGetTopEnhanceImpacts;
  window.debugGetWorstEnemies = debugGetWorstEnemies;
  window.debugGetWorstAreas = debugGetWorstAreas;
  window.debugGetTopGoldSources = debugGetTopGoldSources;
  window.renderSessionListTable = renderSessionListTable;
  window.renderSessionDetail = renderSessionDetail;
  window.getAiCoverageSummary = getAiCoverageSummary;
  window.getSessionTimeline = getSessionTimeline;
  window.renderSessionTimeline = renderSessionTimeline;

  window.renderDebugMatrixConditionList = renderDebugMatrixConditionList;
  window.renderDebugMatrixResultsTable = renderDebugMatrixResultsTable;
}