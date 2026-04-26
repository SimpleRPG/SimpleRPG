// teto-ai.js
// テトちゃん（自動テストプレイヤー）入口・セッション管理
// - グローバル設定（性格・AIレベル・ビルドスタイル）
// - セッション管理（begin/summarize/end）
// - runTestChan(mode, minutes) / stopTestChan
// - 各モード tick は teto-ai4.js 側の window.tetoTick*** を呼ぶだけ
//
// 追加:
// - ビルド全体の診断ロジック（戦闘/料理/クラフト/強化/金策）
// - 高レベルタスク決定（push_battle / prepare_buffs / improve_gear / farm_gold / mixed）
// - タスク→セッションプラン変換
// - 自動セッションランナー runTestChanAuto(totalMinutes)

(function () {
  "use strict";

  // =========================
  // テトちゃんのスタイル・賢さ（拡張用フラグ）
  // =========================
  // ここではまだロジックには使わず「設定を持つだけ」。
  // 既存仕様の挙動は変えない。
  // ★性格は廃止したため、tetoPersonality は定義しない。
  window.tetoAiLevel = window.tetoAiLevel || "normal";   // simple / normal / smart など

  // ビルドスタイル（戦士片手剣・魔法杖・ペット特化など）
  // 仕様を変えずに「設定を持つだけ」。実際の装備変更は別レイヤーで行う前提。
  window.tetoTestBuildStyle = window.tetoTestBuildStyle || "";

  // =========================
  // セッション管理
  // =========================

  let _tetoRunning = false;
  let _tetoTimerId = null;
  let _tetoSession = null;

  // ★デバッグ用: tick が本当に回っているか確認するためのカウンタ（仕様には使わない）
  window._tetoDebugTickCount = window._tetoDebugTickCount || 0;

  // クラフトが「何もできなかった」回数を軽く覚えておく（素材不足っぽさ検知用）
  // 実際のロジックは teto-ai4.js 側で参照するので window にもコピーしておく
  let _tetoRecentCraftSkipCount = 0;
  window._tetoRecentCraftSkipCount = window._tetoRecentCraftSkipCount || 0;

  // balanced 用: 直近の敗北回数
  let _tetoRecentBattleFailCount = 0;
  window._tetoRecentBattleFailCount = window._tetoRecentBattleFailCount || 0;

  function tetoBeginSession(mode, minutes) {
    const m = minutes || 10;
    const style =
      (typeof window.tetoTestBuildStyle === "string" && window.tetoTestBuildStyle.length > 0)
        ? window.tetoTestBuildStyle
        : null;

    _tetoSession = {
      mode,
      minutes: m,
      startedAt: Date.now(),
      endedAt: null,
      style: style || null,
      counters: {
        battles: 0,
        gathers: 0,
        crafts: 0,
        repairs: 0,
        guildJoins: 0,
        guildQuestsAccepted: 0,
        guildQuestsCleared: 0,
        guildSkillLearned: 0,
        housingRents: 0,
        housingRentPaid: 0,
        marketSells: 0,
        marketBuys: 0,
        petActions: 0,
        skillUsesPhys: 0,
        skillUsesMagic: 0,
        skillUsesPet: 0,
        foodUsed: 0,
        drinkUsed: 0,
        itemUsedBattle: 0,
        rebirths: 0
      }
    };

    _tetoRecentCraftSkipCount = 0;
    window._tetoRecentCraftSkipCount = 0;

    if (typeof appendLog === "function") {
      appendLog(
        `[テト] セッション開始: mode=${mode}, 約${m}分` +
        (style ? `, build=${style}` : "")
      );
    }
    // 外部に beginTestSession があれば呼んでおく
    if (typeof window.beginTestSession === "function") {
      try {
        // 既存仕様: mode, minutes をそのまま第1,第2引数で渡し、第3引数に style を追加
        window.beginTestSession(mode, m, style);
      } catch (e) {
        console.log("beginTestSession error", e);
      }
    }
  }

  function tetoSummarizeSession() {
    if (!_tetoSession) return null;
    const s = _tetoSession;
    const now = Date.now();
    const durMs = (s.endedAt || now) - s.startedAt;
    const minutes = Math.round(durMs / 1000 / 6) / 10; // 小数1桁分

    const summary = {
      mode: s.mode,
      minutesPlanned: s.minutes,
      minutesActual: minutes,
      style: s.style || null,
      counters: s.counters
    };

    if (typeof appendLog === "function") {
      appendLog(
        `[テト] セッション終了: mode=${s.mode}, 実時間約${minutes}分` +
        (s.style ? `, build=${s.style}` : "")
      );
      appendLog(
        `[テト] 概要: 戦闘=${s.counters.battles}, 採取=${s.counters.gathers}, ` +
        `クラフト=${s.counters.crafts}, ギルド依頼受注=${s.counters.guildQuestsAccepted}, ` +
        `クリア=${s.counters.guildQuestsCleared}, 拠点レンタル=${s.counters.housingRents}`
      );
    }

    if (typeof window.summarizeTestSession === "function") {
      try {
        window.summarizeTestSession(summary);
      } catch (e) {
        console.log("summarizeTestSession error", e);
      }
    }

    return summary;
  }

  // =========================
  // 評価結果ログ出力 + 高レベル診断の土台
  // =========================

  // セッション終了時に debug-stats-core2.js の評価結果をログに流す
  function tetoLogEvaluationIfAvailable() {
    if (typeof appendLog !== "function") return;

    // セッション単位のざっくり評価
    if (typeof window.debugEvaluateLatestSession === "function") {
      try {
        const evalRes = window.debugEvaluateLatestSession();
        if (evalRes && evalRes.battle && evalRes.gather && evalRes.craft && evalRes.economy) {
          const br = evalRes.battle;
          const gr = evalRes.gather;
          const cr = evalRes.craft;
          const er = evalRes.economy;
          const winRate = (typeof br.winRate === "number")
            ? Math.round(br.winRate * 100)
            : null;
          const gatherPerHour = (typeof gr.perHour === "number")
            ? Math.round(gr.perHour)
            : null;
          const craftSuccess = (typeof cr.successRate === "number")
            ? Math.round(cr.successRate * 100)
            : null;
          const goldPerMin = (typeof er.goldEarnedPerMin === "number")
            ? Math.round(er.goldEarnedPerMin)
            : null;

          let parts = [];
          if (winRate != null) {
            parts.push(`戦闘勝率=${winRate}%`);
          }
          if (gatherPerHour != null) {
            parts.push(`採取/h=${gatherPerHour}`);
          }
          if (craftSuccess != null) {
            parts.push(`クラフト成功率=${craftSuccess}%`);
          }
          if (goldPerMin != null) {
            parts.push(`金策/分=${goldPerMin}`);
          }
          if (parts.length > 0) {
            appendLog("[テト評価] " + parts.join(", "));
          }

          if (evalRes.overall && Array.isArray(evalRes.overall.warnings) && evalRes.overall.warnings.length) {
            const msg = evalRes.overall.warnings.slice(0, 2).join(" / ");
            appendLog("[テト評価] 注意: " + msg);
          }
        }
      } catch (e) {
        console.log("debugEvaluateLatestSession error", e);
      }
    }

    // クラフト・強化・料理バフの寄与は、あれば代表値だけ軽く出す
    if (typeof window.debugEvaluateCraftImpactWithTime === "function") {
      try {
        const sid =
          (typeof window.getCurrentSessionMeta === "function" && window.getCurrentSessionMeta())
            ? window.getCurrentSessionMeta().id
            : null;
        const craftImpact = window.debugEvaluateCraftImpactWithTime(sid);
        if (craftImpact && typeof craftImpact === "object") {
          const keys = Object.keys(craftImpact);
          if (keys.length) {
            const first = craftImpact[keys[0]];
            if (first && typeof first.winRateBefore === "number" && typeof first.winRateAfter === "number") {
              const before = Math.round(first.winRateBefore * 100);
              const after = Math.round(first.winRateAfter * 100);
              appendLog(
                `[テト評価] クラフト寄与: レシピ${first.recipeId} 戦闘勝率 ${before}%→${after}%`
              );
            }
          }
        }
      } catch (e) {
        console.log("debugEvaluateCraftImpactWithTime error", e);
      }
    }

    if (typeof window.debugEvaluateEnhanceImpactWithTime === "function") {
      try {
        const sid =
          (typeof window.getCurrentSessionMeta === "function" && window.getCurrentSessionMeta())
            ? window.getCurrentSessionMeta().id
            : null;
        const enhImpact = window.debugEvaluateEnhanceImpactWithTime(sid);
        if (enhImpact && typeof enhImpact === "object") {
          const keys = Object.keys(enhImpact);
          if (keys.length) {
            const first = enhImpact[keys[0]];
            if (first && typeof first.winRateBefore === "number" && typeof first.winRateAfter === "number") {
              const before = Math.round(first.winRateBefore * 100);
              const after = Math.round(first.winRateAfter * 100);
              appendLog(
                `[テト評価] 強化寄与: 装備${first.itemId} 戦闘勝率 ${before}%→${after}%`
              );
            }
          }
        }
      } catch (e) {
        console.log("debugEvaluateEnhanceImpactWithTime error", e);
      }
    }

    if (typeof window.debugEvaluateFoodBuffImpact === "function") {
      try {
        const sid =
          (typeof window.getCurrentSessionMeta === "function" && window.getCurrentSessionMeta())
            ? window.getCurrentSessionMeta().id
            : null;
        const foodImpact = window.debugEvaluateFoodBuffImpact(sid);
        if (foodImpact && foodImpact.withFood && foodImpact.withoutFood) {
          const wf = foodImpact.withFood;
          const wo = foodImpact.withoutFood;
          if (typeof wf.winRate === "number" && typeof wo.winRate === "number") {
            const wrWith = Math.round(wf.winRate * 100);
            const wrWithout = Math.round(wo.winRate * 100);
            appendLog(
              `[テト評価] 食事バフ: 勝率 バフ有 ${wrWith}% / バフ無 ${wrWithout}%`
            );
          }
        }
      } catch (e) {
        console.log("debugEvaluateFoodBuffImpact error", e);
      }
    }
  }

  function tetoEndSession() {
    if (!_tetoSession) return;
    _tetoSession.endedAt = Date.now();
    const summary = tetoSummarizeSession();

    if (typeof window.endTestSession === "function") {
      try {
        window.endTestSession(summary);
      } catch (e) {
        console.log("endTestSession error", e);
      }
    }

    // ★テトちゃんの実行結果を簡易評価してログに出す（debug-stats-core2.js があれば）
    tetoLogEvaluationIfAvailable();

    _tetoSession = null;
    _tetoRecentCraftSkipCount = 0;
    window._tetoRecentCraftSkipCount = 0;
  }

  function tetoIncCounter(key) {
    if (!_tetoSession || !_tetoSession.counters) return;
    if (typeof _tetoSession.counters[key] !== "number") {
      _tetoSession.counters[key] = 0;
    }
    _tetoSession.counters[key]++;
  }

  // balanced 用: 勝敗を外部から通知するフック（仕様はそのまま）
  function tetoBalancedOnBattleResult(isWin) {
    if (isWin) {
      _tetoRecentBattleFailCount = 0;
      window._tetoRecentBattleFailCount = 0;
    } else {
      _tetoRecentBattleFailCount++;
      window._tetoRecentBattleFailCount = _tetoRecentBattleFailCount;
    }
  }

  // =========================
  // 既存 runTestChan / stopTestChan
  // =========================

  function stopTestChan() {
    _tetoRunning = false;
    if (_tetoTimerId != null) {
      clearInterval(_tetoTimerId);
      _tetoTimerId = null;
    }
    tetoEndSession();

    const statusEl = document.getElementById("testChanStatusText");
    if (statusEl) {
      statusEl.textContent = "テトちゃん: 停止しました。";
    }
  }

  function runTestChan(mode, minutes) {
    if (_tetoRunning) {
      stopTestChan();
    }
    _tetoRunning = true;

    tetoBeginSession(mode, minutes);

    const m = minutes || 10;
    const endTime = Date.now() + m * 60 * 1000;

    const statusEl = document.getElementById("testChanStatusText");
    if (statusEl) {
      statusEl.textContent = `テトちゃん実行中: モード=${mode}, 約 ${m} 分`;
    }

    const TICK_MS = 200; // 0.2秒ごとに 1 行動

    function tick() {
      // ★デバッグ用: 毎回インクリメントして、tick が止まっていないか観測できるようにする
      window._tetoDebugTickCount++;

      if (!_tetoRunning) return;
      if (Date.now() >= endTime) {
        stopTestChan();
        return;
      }

      try {
        // 実際の行動ロジックは teto-ai4.js 側のグローバル関数に委譲
        if (mode === "battleMain" && typeof window.tetoTickBattleMain === "function") {
          window.tetoTickBattleMain();
        } else if (mode === "gatherMain" && typeof window.tetoTickGatherMain === "function") {
          window.tetoTickGatherMain();
        } else if (mode === "craftMain" && typeof window.tetoTickCraftMain === "function") {
          window.tetoTickCraftMain();
        } else if (mode === "lifeMain" && typeof window.tetoTickLifeMain === "function") {
          window.tetoTickLifeMain();
        } else if (mode === "balancedMain" && typeof window.tetoTickBalancedMain === "function") {
          window.tetoTickBalancedMain();
        } else if (typeof window.tetoTickMixed === "function") {
          window.tetoTickMixed();
        }
      } catch (e) {
        // ★エラー内容を少しだけ詳しく出す（仕様はそのまま・メッセージ強化だけ）
        console.error("teto tick error", e);
        if (typeof appendLog === "function") {
          appendLog("[テト] 実行中にエラーが発生したため停止しました: " + e.message);
        }
        stopTestChan();
      }
    }

    tick(); // 即1回
    _tetoTimerId = setInterval(tick, TICK_MS);
  }

  // =========================
  // ★追加: ビルド総合診断 + タスク決定 + 自動セッションランナー
  // =========================

  // 戦闘・料理・クラフト・強化・金策を総合的に診断する
  function tetoDiagnoseProblems() {
    const evalLatest = (typeof window.debugEvaluateLatestSession === "function")
      ? window.debugEvaluateLatestSession()
      : null;
    const foodImpact = (typeof window.debugEvaluateFoodBuffImpact === "function")
      ? window.debugEvaluateFoodBuffImpact(null)
      : null;
    const craftImpact = (typeof window.debugEvaluateCraftImpactWithTime === "function")
      ? window.debugEvaluateCraftImpactWithTime(null) || {}
      : {};
    const enhImpact = (typeof window.debugEvaluateEnhanceImpactWithTime === "function")
      ? window.debugEvaluateEnhanceImpactWithTime(null) || {}
      : {};
    const econ = (typeof window.debugGetEconomyStats === "function")
      ? window.debugGetEconomyStats()
      : null;

    const diag = {
      // 戦闘
      winRate: null,
      avgTurns: null,
      needMoreDefense: false,
      needMoreDamage: false,

      // バフ／回復
      underUsedFood: false,
      underUsedPotions: false, // itemUsedBattle ログなどがあれば後で拡張

      // 装備周り
      underUsedCraft: false,
      underUsedEnhance: false,

      // 経済
      needMoreGold: false,

      // 総合判断
      okToPushBattle: false
    };

    // 戦闘評価
    if (evalLatest && evalLatest.battle) {
      const b = evalLatest.battle;
      diag.winRate = (typeof b.winRate === "number") ? b.winRate : null;
      diag.avgTurns = (typeof b.avgTurns === "number") ? b.avgTurns : null;

      if (diag.winRate != null) {
        if (diag.winRate < 0.6) {
          // 負けが多い → まずは耐久・回復・装備を疑う
          diag.needMoreDefense = true;
        } else if (diag.winRate < 0.8) {
          // ギリ勝ちレベル → 火力・テンポ不足の可能性
          diag.needMoreDamage = true;
        } else if (diag.winRate > 0.95 && diag.avgTurns != null && diag.avgTurns < 5) {
          // かなり余裕がある → 高難度やカバー率を広げて良い
          diag.okToPushBattle = true;
        }
      }
    }

    // 食事バフ寄与
    if (foodImpact && foodImpact.withFood && foodImpact.withoutFood) {
      const wf = foodImpact.withFood;
      const wo = foodImpact.withoutFood;
      if (typeof wf.winRate === "number" && typeof wo.winRate === "number") {
        const diff = wf.winRate - wo.winRate;
        const totalWith = wf.total || 0;
        const totalWithout = wo.total || 0;
        if (diff > 0.1 && totalWithout > 0 && totalWith < totalWithout * 0.5) {
          // 食事バフで勝率+10%以上上がるのに、バフあり戦闘が明らかに少ない
          diag.underUsedFood = true;
        }
      }
    }

    // クラフト寄与 top N をざっくり見る
    const craftKeys = Object.keys(craftImpact);
    if (craftKeys.length) {
      const topCraft = craftKeys
        .map(id => craftImpact[id])
        .filter(Boolean)
        .sort((a, b) => (b.winRateGainPer100Cost || 0) - (a.winRateGainPer100Cost || 0))
        .slice(0, 3);

      if (topCraft.some(r =>
        (r.craftCount || 0) < 3 &&
        (r.winRateGainPer100Cost || 0) > 0.1
      )) {
        diag.underUsedCraft = true;
      }
    }

    // 強化寄与 top N
    const enhKeys = Object.keys(enhImpact);
    if (enhKeys.length) {
      const topEnh = enhKeys
        .map(id => enhImpact[id])
        .filter(Boolean)
        .sort((a, b) => (b.winRateGainPer100Gold || 0) - (a.winRateGainPer100Gold || 0))
        .slice(0, 3);

      if (topEnh.some(r =>
        (r.enhanceCount || 0) < 3 &&
        (r.winRateGainPer100Gold || 0) > 0.05
      )) {
        diag.underUsedEnhance = true;
      }
    }

    // 経済
    if (econ && typeof econ.goldEarnedPerMin === "number") {
      if (econ.goldEarnedPerMin < 5) {
        diag.needMoreGold = true;
      }
    }

    if (typeof appendLog === "function") {
      appendLog("[テトAI] 診断結果: " + JSON.stringify(diag));
    }

    return diag;
  }

  // 高レベルタスクを決める
  // - push_battle   : 戦闘プッシュ（難しめの敵・エリアに挑戦）
  // - prepare_buffs : 料理・食事・ポーションなどバフ面の準備
  // - improve_gear  : 装備クラフト・強化
  // - farm_gold     : 金策
  // - balanced      : バランスよく
  // - mixed         : なんとなく全体を見る
  function tetoDecideHighLevelTask() {
    const diag = tetoDiagnoseProblems();
    if (!diag) return "mixed";

    // まず「死にすぎ・ギリギリ勝ち」問題を優先
    if (diag.needMoreDefense || diag.needMoreDamage) {
      // 即時改善できそうなバフ系
      if (diag.underUsedFood || diag.underUsedPotions) {
        return "prepare_buffs";
      }
      // 装備改善余地が大きい
      if (diag.underUsedCraft || diag.underUsedEnhance) {
        return "improve_gear";
      }
      // 経済がそもそも足りていない
      if (diag.needMoreGold) {
        return "farm_gold";
      }
      // よく分からないときはバランスで様子見
      return "balanced";
    }

    // 特に問題なく勝てているなら戦闘をプッシュ
    if (diag.okToPushBattle) {
      return "push_battle";
    }

    // どれでもない場合は混合でカバー率を上げる
    return "mixed";
  }

  // タスクから「mode + minutes」のセッションプランに落とす
  function tetoBuildSessionPlanFromTask(task, defaultMinutesPerSession) {
    const per = defaultMinutesPerSession || 5;

    if (task === "push_battle") {
      return [
        { mode: "battleMain", minutes: per },
        { mode: "battleMain", minutes: per },
        { mode: "balancedMain", minutes: per }
      ];
    }
    if (task === "prepare_buffs") {
      return [
        { mode: "lifeMain", minutes: per },
        { mode: "lifeMain", minutes: per }
      ];
    }
    if (task === "improve_gear") {
      return [
        { mode: "gatherMain", minutes: per },
        { mode: "craftMain", minutes: per },
        { mode: "balancedMain", minutes: per }
      ];
    }
    if (task === "farm_gold") {
      return [
        { mode: "battleMain", minutes: per },
        { mode: "balancedMain", minutes: per }
      ];
    }
    if (task === "balanced") {
      return [
        { mode: "balancedMain", minutes: per }
      ];
    }
    // mixed or fallback
    return [
      { mode: "mixed", minutes: per }
    ];
  }

  // 自動セッションランナー
  // totalMinutes: 総テスト時間（例: 30 なら 30分）
  // - 診断 → タスク決定 → セッションプラン生成 → runTestChan 連続実行を繰り返す
  function runTestChanAuto(totalMinutes) {
    const perSession = 5; // 1 サブセッションあたり 5 分（plan の minutes とも整合）
    const maxSessions = Math.max(1, Math.floor((totalMinutes || 30) / perSession));
    let sessionIndex = 0;

    if (typeof appendLog === "function") {
      appendLog(`[テトAI] 自動テストを開始します: 約${totalMinutes || 30}分, 目安セッション数=${maxSessions}`);
    }

    function runNextChunk() {
      if (sessionIndex >= maxSessions) {
        if (typeof appendLog === "function") {
          appendLog("[テトAI] 自動テスト完了しました");
        }
        return;
      }

      // 診断 → タスク → プラン
      const task =
        (typeof window.tetoDecideHighLevelTask === "function")
          ? window.tetoDecideHighLevelTask()
          : "mixed";
      const plan = tetoBuildSessionPlanFromTask(task, perSession);

      if (typeof appendLog === "function") {
        appendLog(`[テトAI] 高レベルタスク=${task}, セッションプラン=${JSON.stringify(plan)}`);
      }

      let i = 0;

      function runPlanSession() {
        if (i >= plan.length) {
          // このチャンク分が終わったので、再度診断フェーズへ
          runNextChunk();
          return;
        }
        if (sessionIndex >= maxSessions) {
          if (typeof appendLog === "function") {
            appendLog("[テトAI] 総テスト時間に達したため自動テストを終了します");
          }
          return;
        }

        const entry = plan[i++];
        const mode = entry.mode;
        const minutes = entry.minutes || perSession;
        sessionIndex++;

        if (typeof appendLog === "function") {
          appendLog(`[テトAI] 自動セッション ${sessionIndex}/${maxSessions}: mode=${mode}, 分=${minutes}`);
        }

        if (typeof window.runTestChan === "function") {
          try {
            window.runTestChan(mode, minutes);
          } catch (e) {
            console.error("runTestChanAuto: runTestChan error", e);
            if (typeof appendLog === "function") {
              appendLog("[テトAI] runTestChan 実行中にエラーが発生しました");
            }
            return;
          }
        }

        // セッション終了を待って次のプランへ
        setTimeout(() => {
          if (typeof window.stopTestChan === "function") {
            try {
              window.stopTestChan();
            } catch (e) {
              console.error("runTestChanAuto: stopTestChan error", e);
            }
          }
          runPlanSession();
        }, minutes * 60 * 1000 + 2000);
      }

      runPlanSession();
    }

    runNextChunk();
  }

  // =========================
  // 公開
  // =========================

  window.runTestChan = runTestChan;
  window.stopTestChan = stopTestChan;

  // セッション管理系
  window.tetoBeginSession = tetoBeginSession;
  window.tetoEndSession = tetoEndSession;
  window.tetoSummarizeSession = tetoSummarizeSession;

  // デバッグ用
  window.tetoIncCounter = tetoIncCounter;
  window.tetoBalancedOnBattleResult = tetoBalancedOnBattleResult;

  // 追加公開: 診断・タスク決定・自動ランナー
  window.tetoDiagnoseProblems = tetoDiagnoseProblems;
  window.tetoDecideHighLevelTask = tetoDecideHighLevelTask;
  window.tetoBuildSessionPlanFromTask = tetoBuildSessionPlanFromTask;
  window.runTestChanAuto = runTestChanAuto;

})();