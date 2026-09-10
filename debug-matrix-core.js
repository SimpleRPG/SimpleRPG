// debug-matrix-core.js
// ★デバッグ専用★ レベル・職業・装備・転生・スキルビルド × 敵 の
// 大量の組み合わせを即時(setInterval を使わず同期ループ)でN戦ずつ実行し、
// 実際のゲームロジック(recalcStats / tetoDoOneBattleStep / commitCurrentBattleStats)
// をそのまま使って勝率を集計するコアループ。
//
// 前提:
//  - game-core-1.js 〜 game-core-8.js, teto-ai.js 〜 teto-ai5.js,
//    debug-stats-core.js, debug-stats-core2.js, save-system.js,
//    enemy-data.js, jobs.js, skilltree.js が先に読み込まれていること
//  - index.html の </body> 直前などに
//      <script src="debug-matrix-core.js"></script>
//    を追加するだけでよい（他ファイルは無編集）
//  - GMデバッグタブ側のUI実装は次のステップで別途行う。
//    このファイルは window.runMatrixBattleTest(...) を呼べば動く状態にする。
//
// 安全設計:
//  - テスト開始時に makeSaveData() で全状態を退避し、終了時に必ず applySaveData() で復元する
//    (途中で例外が起きても finally で復元されるので、実プレイのセーブは壊れない)
//  - UI描画系関数はテスト中だけ no-op に差し替え、終了後に必ず元へ戻す
//  - 装備/スキルツリーはテスト用インスタンス/プリセットを一時的に積むだけで、
//    最終的に makeSaveData/applySaveData の丸ごと復元で消える

(function () {
  "use strict";

  // ============================================================
  // 1. UI関数の一時無効化
  // ============================================================
  var UI_FN_NAMES = [
    "appendLog",
    "updateDisplay",
    "renderPlayerStatusIcons",
    "updateEnemyStatusUI",
    "setBattleCommandVisible",
    "setExploreUIVisible",
    "setFieldItemRowsVisible",
    "updateReturnTownButton",
    "refreshBattleItemSelect"
  ];

  function silenceUi() {
    var saved = {};
    UI_FN_NAMES.forEach(function (name) {
      if (typeof window[name] === "function") {
        saved[name] = window[name];
        window[name] = function () {};
      }
    });
    return saved;
  }

  function restoreUi(saved) {
    Object.keys(saved).forEach(function (name) {
      window[name] = saved[name];
    });
  }

  // ============================================================
  // 2. テスト条件をゲーム状態へ適用
  //    (退避/復元は呼び出し側で makeSaveData/applySaveData を使う前提。
  //     ここでは「今回のテスト条件」だけを反映する)
  // ============================================================
  function applyCondition(cond) {
    if (typeof cond.level === "number") {
      level = cond.level;
    }
    if (typeof cond.jobId === "number") {
      jobId = cond.jobId;
      window.jobId = jobId;
    }

    // --- 装備: カタログ(weapons/armors)からidを探し、テスト専用インスタンスを積んで装備する ---
    if (cond.weaponId && Array.isArray(weapons)) {
      var w = weapons.find(function (x) { return x.id === cond.weaponId; });
      if (w) {
        weaponInstances.push({
          id: w.id,
          quality: cond.weaponQuality || 0,
          enhance: cond.weaponEnhance || 0,
          durability: MAX_DURABILITY,
          options: []
        });
        equippedWeaponIndex = weaponInstances.length - 1;
        window.equippedWeaponIndex = equippedWeaponIndex;
      }
    }
    if (cond.armorId && Array.isArray(armors)) {
      var a = armors.find(function (x) { return x.id === cond.armorId; });
      if (a) {
        armorInstances.push({
          id: a.id,
          quality: cond.armorQuality || 0,
          enhance: cond.armorEnhance || 0,
          durability: MAX_DURABILITY,
          options: []
        });
        equippedArmorIndex = armorInstances.length - 1;
        window.equippedArmorIndex = equippedArmorIndex;
      }
    }

    // --- 転生: 本物の抽選ロジック(applyRebirthBonus)をそのまま使う(乱数込み) ---
    if (typeof cond.rebirthCombatPt === "number") {
      resetBaseStatsToInitial();
      rebirthCombatPt = cond.rebirthCombatPt;
      window.rebirthCombatPt = rebirthCombatPt;
      if (rebirthCombatPt > 0) {
        applyRebirthBonus();
      }
    }

    // --- スキルツリービルド: プリセット形状を直接反映(お金/素材/隣接チェックは無視) ---
    if (cond.skillTreeUnlocked) {
      window.globalSkillTreeUnlocked = JSON.parse(JSON.stringify(cond.skillTreeUnlocked));
    }

    if (typeof recalcStats === "function") {
      recalcStats();
    }
    hp = hpMax;
    mp = mpMax;
    sp = spMax;
  }

  // ============================================================
  // 3. 1戦分を即時解決 (setInterval を使わない同期ループ)
  // ============================================================
  function resolveOneBattleSync(enemyDef, maxTurns) {
    startNormalBattle(enemyDef);

    var turns = 0;
    var limit = maxTurns || 60;

    while (currentEnemy && turns < limit) {
      turns++;
      if (typeof window.tetoDoOneBattleStep === "function") {
        window.tetoDoOneBattleStep();
      } else if (typeof playerAttack === "function") {
        playerAttack();
      } else {
        break; // 戦闘APIが見つからない場合は無限ループ防止で打ち切り
      }
    }

    var timedOut = !!currentEnemy;
    if (timedOut) {
      // ターン上限内に決着がつかなかった場合は強制終了して次の試行へ
      endBattleCommon();
    }
    return { timedOut: timedOut, turns: turns };
  }

  // ============================================================
  // 4. マトリクス本体
  //    conditions: [{ level, jobId, weaponId, armorId, rebirthCombatPt, skillTreeUnlocked, label }, ...]
  //    enemyIds:   ["slime", "wolf", ...] (enemy-data.js の ENEMIES のキー)
  // ============================================================
  window.runMatrixBattleTest = function (conditions, enemyIds, trialsPerCondition, options) {
    if (typeof makeSaveData !== "function" || typeof applySaveData !== "function") {
      console.error("[matrix] save-system.js (makeSaveData/applySaveData) が見つかりません。中止します。");
      return null;
    }
    if (typeof ENEMIES === "undefined") {
      console.error("[matrix] ENEMIES (enemy-data.js) が見つかりません。中止します。");
      return null;
    }

    var opts = options || {};
    var trials = trialsPerCondition || 30;
    var maxTurns = opts.maxTurns || 60;

    var snapshot = makeSaveData();
    var uiSaved = silenceUi();
    var wasTetoControlling = window.isTetoControlling;
    window.isTetoControlling = true;

    // commitCurrentBattleStats を横取りして、この試行の勝敗種別(win/lose/escape)を取得する
    // (敗北時は handlePlayerDeathCommon が hp を hpMax に戻すため、hp では判定できない)
    var originalCommit = (typeof commitCurrentBattleStats === "function") ? commitCurrentBattleStats : null;
    var lastResultType = null;
    if (originalCommit) {
      window.commitCurrentBattleStats = commitCurrentBattleStats = function (resultType) {
        lastResultType = resultType;
        return originalCommit(resultType);
      };
    }

    var results = [];

    try {
      conditions.forEach(function (cond) {
        enemyIds.forEach(function (enemyId) {
          var enemyDef = ENEMIES[enemyId];
          if (!enemyDef) {
            console.warn("[matrix] 敵IDが見つかりません: " + enemyId);
            return;
          }

          applyCondition(cond);

          var win = 0, lose = 0, escape = 0, timeout = 0, totalTurns = 0;

          for (var i = 0; i < trials; i++) {
            lastResultType = null;
            var r = resolveOneBattleSync(enemyDef, maxTurns);
            totalTurns += r.turns;

            if (r.timedOut) {
              timeout++;
            } else if (lastResultType === "win") {
              win++;
            } else if (lastResultType === "lose") {
              lose++;
            } else if (lastResultType === "escape") {
              escape++;
            }
          }

          results.push({
            label: cond.label || JSON.stringify(cond),
            condition: cond,
            enemyId: enemyId,
            enemyName: enemyDef.name,
            trials: trials,
            winRate: Math.round((win / trials) * 100),
            loseRate: Math.round((lose / trials) * 100),
            escapeRate: Math.round((escape / trials) * 100),
            timeoutRate: Math.round((timeout / trials) * 100),
            avgTurns: +(totalTurns / trials).toFixed(1)
          });
        });
      });
    } finally {
      // --- 後始末: 何が起きても必ず元に戻す ---
      if (originalCommit) {
        window.commitCurrentBattleStats = commitCurrentBattleStats = originalCommit;
      }
      window.isTetoControlling = wasTetoControlling;
      restoreUi(uiSaved);
      applySaveData(snapshot);
      if (typeof recalcStats === "function") {
        recalcStats();
      }
    }

    return results;
  };
})();
