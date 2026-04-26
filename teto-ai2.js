// teto-ai2.js
// テトちゃん拡張レイヤー
// - 性格 (tetoPersonality) と賢さ (tetoAiLevel) に応じて行動傾向を変える
// - 既存の teto-ai.js の仕様は一切変更せず、「追加の行動」を行うだけ
//
// 前提:
//   - teto-ai.js が先に読み込まれていて、runTestChan / stopTestChan などが存在する
//   - teto-ai.js で window.tetoPersonality, window.tetoAiLevel が定義済み
//
// このファイルでは主に「ポスト処理フック」として動く:
//   - 各 tick の後に tetoAdvancedPostTick(mode) を呼ぶことで、
//     ポーション・道具・肥料・ギルド・スキルツリーなどの “賢さ” を上乗せする。

(function () {
  "use strict";

  // =========================
  // ユーティリティ
  // =========================

  function tetoGetPersonality() {
    return window.tetoPersonality || "balanced";
  }

  function tetoGetAiLevel() {
    return window.tetoAiLevel || "normal";
  }

  function safeCall(fn, label) {
    try {
      return fn();
    } catch (e) {
      console.log("teto-ai2 error in " + label, e);
      return null;
    }
  }

  // 「teto-ai.js のカウンタ増加」を叩ける場合だけ叩く
  function incCounterIfAvailable(key) {
    if (typeof window.tetoIncCounter === "function") {
      try {
        window.tetoIncCounter(key);
      } catch (e) {
        console.log("teto-ai2 error in tetoIncCounter(" + key + ")", e);
      }
    }
  }

  // =========================
  // 既存スナップショットのラッパ
  // =========================

  function sBattle() {
    return (typeof window.tetoGetBattleStatus === "function")
      ? window.tetoGetBattleStatus()
      : {};
  }

  function sRes() {
    // teto-ai.js に tetoGetResourceStatus が存在するかを確認して呼ぶ
    return (typeof window.tetoGetResourceStatus === "function")
      ? window.tetoGetResourceStatus()
      : {};
  }

  function sInv() {
    return (typeof window.tetoGetInventoryStatus === "function")
      ? window.tetoGetInventoryStatus()
      : {};
  }

  function sGuild() {
    return (typeof window.tetoGetGuildStatus === "function")
      ? window.tetoGetGuildStatus()
      : {};
  }

  function sHousing() {
    return (typeof window.tetoGetHousingStatus === "function")
      ? window.tetoGetHousingStatus()
      : {};
  }

  // =========================
  // 共通: 「そもそも意味があるか」チェック用ヘルパ
  // =========================

  // ★肥料を持っているかどうか
  function hasFertilizer() {
    const inv = sInv();
    // ここはあなたの実装に合わせてキー名をそろえてください
    // 明示的なフィールドが無ければ「持っていない」とみなして何もしない
    if (inv.fertilizer && inv.fertilizer > 0) return true;
    if (inv.carryFertilizer && inv.carryFertilizer > 0) return true;
    if (inv.items && inv.items.fertilizer && inv.items.fertilizer > 0) return true;
    return false;
  }

  // ★市場に出せる/買える候補があるかどうか簡易チェック
  function hasMarketSomethingToSell() {
    const inv = sInv();
    // 具体的な構造が分からないので、「存在していて要素が1つ以上」で判定
    if (inv.marketSellCandidates && Array.isArray(inv.marketSellCandidates)) {
      return inv.marketSellCandidates.length > 0;
    }
    // それ以外の情報がない場合は「安全側」で false にして、無駄な listItemOnMarket 呼び出しを避ける
    return false;
  }

  function hasMarketSomethingToBuy() {
    // 買い候補はウィンドウ側で持っているならそれを見る
    if (Array.isArray(window.marketBuyList)) {
      return window.marketBuyList.length > 0;
    }
    // 情報が無い場合は安全側で false
    return false;
  }

  // ★戦闘用アイテム/食事/ドリンクがあるかどうか
  function hasBattlePotion() {
    const inv = sInv();
    if (inv.carryPotions && Object.keys(inv.carryPotions).length > 0) return true;
    return false;
  }

  function hasFood() {
    const inv = sInv();
    if (inv.carryFoods && Object.keys(inv.carryFoods).length > 0) return true;
    return false;
  }

  function hasDrink() {
    const inv = sInv();
    if (inv.carryDrinks && Object.keys(inv.carryDrinks).length > 0) return true;
    return false;
  }

  // =========================
  // 戦闘まわりの高度な補助
  // =========================

  // ギルド依頼やツリーボーナスから「今どのタイプで戦うべきか」をざっくり決める
  // ★性格依存を弱め、「ギルド依頼／ツリー」を優先しつつデフォルトは物理にする
  function tetoDecidePreferredKillType() {
    const g = sGuild();

    let pref = "phys"; // "phys" / "magic" / "pet"

    // ギルド依頼の内容から補正（非常にざっくり）
    if (g.quests && Array.isArray(g.quests.active)) {
      for (let i = 0; i < g.quests.active.length; i++) {
        const q = g.quests.active[i];
        if (!q || !q.requireType) continue;
        if (q.requireType === "magic") {
          pref = "magic";
          break;
        } else if (q.requireType === "pet") {
          pref = "pet";
          break;
        } else if (q.requireType === "phys") {
          pref = "phys";
          break;
        }
      }
    }

    // 戦闘ツリーボーナスも参考にする（ざっくり）
    const unlocked = g.combatGuildUnlocked || {};
    if (unlocked.magicBoost && unlocked.magicBoost > 0) {
      pref = "magic";
    }
    if (unlocked.petBoost && unlocked.petBoost > 0) {
      pref = "pet";
    }

    return pref;
  }

  // 可能なら「望ましいタイプ」でとどめを狙う
  function tetoTryKillWithPreferredType() {
    const bs = sBattle();
    if (!bs.currentEnemy) return false;

    const pref = tetoDecidePreferredKillType();

    // 物理スキル
    if (pref === "phys") {
      const skillSel = document.getElementById("skillSelect");
      if (skillSel && skillSel.value && typeof window.useSkillFromUI === "function") {
        window.useSkillFromUI();
        incCounterIfAvailable("skillUsesPhys");
        return true;
      }
    }

    // 魔法
    if (pref === "magic") {
      const magicSel = document.getElementById("magicSelect");
      if (magicSel && magicSel.value && typeof window.castMagicFromUI === "function") {
        window.castMagicFromUI();
        incCounterIfAvailable("skillUsesMagic");
        return true;
      }
    }

    // ペット
    if (pref === "pet" && typeof window.commandPetAttack === "function") {
      window.commandPetAttack();
      incCounterIfAvailable("skillUsesPet");
      return true;
    }

    return false;
  }

  // =========================
  // ギルドツリーノード選択（性格＋賢さ）
  // =========================

  // ★性格重みを廃止し、「耐久＋火力」を中心にしたニュートラルな重み付けに変更
  function tetoPickCombatGuildNodeNeutral() {
    const g = sGuild();
    if (g.combatGuildSkillPoints <= 0) return null;
    const tree = window.COMBAT_GUILD_TREE;
    if (!Array.isArray(tree) || !tree.length) return null;

    const unlocked = window.combatGuildTreeUnlocked || {};
    const candidates = tree.filter(node => {
      if (!node) return false;
      if (unlocked[node.id]) return false;
      if (typeof window.isCombatTreeNodeUnlockable === "function" &&
          !window.isCombatTreeNodeUnlockable(node)) {
        return false;
      }
      return true;
    });
    if (!candidates.length) return null;

    function w(node) {
      const e = node.effect || {};
      let w = 1;
      if (e.hpMaxRate) w += 3;
      if (e.guardReductionRate) w += 3;
      if (e.physSkillRate || e.magicSkillRate || e.petAtkRate) w += 2;
      if (e.magicCostRate) w += 1;
      return w;
    }

    let total = 0;
    for (const n of candidates) total += w(n);
    if (total <= 0) return candidates[0];

    let r = Math.random() * total;
    for (const n of candidates) {
      r -= w(n);
      if (r <= 0) return n;
    }
    return candidates[0];
  }

  function tetoMaybeLearnGuildSkillAdvanced() {
    const level = tetoGetAiLevel();
    const g = sGuild();
    if (g.combatGuildSkillPoints <= 0) return;
    if (!Array.isArray(window.COMBAT_GUILD_TREE)) return;
    if (typeof window.learnCombatGuildNode !== "function") return;

    if (level === "simple") {
      // 適当に 1 個
      const tree = window.COMBAT_GUILD_TREE;
      const n = tree[Math.floor(Math.random() * tree.length)];
      if (n) {
        try {
          window.learnCombatGuildNode(n.id);
          incCounterIfAvailable("guildSkillLearned");
        } catch (e) {}
      }
      return;
    }

    // normal / smart はニュートラルな重み付けで選ぶ
    const node = tetoPickCombatGuildNodeNeutral();
    if (!node) return;
    try {
      window.learnCombatGuildNode(node.id);
      incCounterIfAvailable("guildSkillLearned");
    } catch (e) {}
  }

  // =========================
  // 共通スキルツリー（skilltree.js）用 高度な習得
  // =========================

  // ★性格ベースの重みを廃止し、「戦闘・採取・クラフト・経済」をバランス良く取る
  function tetoPickGlobalSkillNodeNeutral() {
    if (!Array.isArray(window.SKILL_TREE_NODES)) return null;
    if (typeof window.getSkillNodeById !== "function") return null;
    if (typeof window.getSkillNodeUnlockError !== "function") return null;

    const nodes = window.SKILL_TREE_NODES;
    const unlocked = window.globalSkillTreeUnlocked || {};

    const candidates = nodes.filter(node => {
      if (!node) return false;
      if (unlocked[node.id]) return false;
      const err = window.getSkillNodeUnlockError(node);
      if (err) return false;
      return true;
    });
    if (!candidates.length) return null;

    function weight(node) {
      let w = 1;
      const type = node.type || "combat";
      const e = node.effect || {};

      if (type === "combat") w += 3;
      if (type === "gather" || type === "craft") w += 2;
      if (type === "econ") w += 2;

      if (e.hpMaxRate) w += 2;
      if (e.physSkillRate || e.magicSkillRate || e.petAtkRate) w += 2;
      if (e.combatGuardReductionRate) w += 2;
      if (e.gatherAmountBonusRate || e.extraGatherBonusRateAdd) w += 2;
      if (e.craftCostReduceRate || e.craftQualityBonusRate) w += 2;
      if (e.sellPriceRate || e.buyPriceReduceRate || e.moneyGainRateBattle) w += 2;

      return w;
    }

    let total = 0;
    for (const n of candidates) total += weight(n);
    if (total <= 0) return candidates[0];

    let r = Math.random() * total;
    for (const n of candidates) {
      r -= weight(n);
      if (r <= 0) return n;
    }
    return candidates[0];
  }

  function tetoMaybeLearnGlobalSkillAdvanced() {
    const level = tetoGetAiLevel();
    if (level === "simple") return;

    if (!Array.isArray(window.SKILL_TREE_NODES)) return;
    if (typeof window.learnSkillNode !== "function") return;
    if (typeof window.getSkillNodeUnlockError !== "function") return;

    // 戦闘中はツリーをいじらない
    const bs = sBattle();
    if (bs.currentEnemy) return;

    const node = tetoPickGlobalSkillNodeNeutral();
    if (!node) return;

    // 金欠のときは無理して取らない（costMoney は skilltree.js 側で判定される）
    const res = sRes();
    if (typeof res.money === "number" && res.money < 3000) {
      return;
    }

    try {
      window.learnSkillNode(node.id);
      // 共通スキルツリー用のカウンタは今のところ無いので、ログカウンタは触らない
    } catch (e) {
      console.log("teto-ai2 error in learnSkillNode(" + node.id + ")", e);
    }
  }

  // =========================
  // 農園・肥料
  // =========================

  function tetoMaybeUseFertilizerAdvanced() {
    if (!window.farmPlots) return;
    if (typeof window.useFertilizerOnFarm !== "function") return;

    // ★肥料がないなら絶対に何もしない
    if (!hasFertilizer()) return;

    const level = tetoGetAiLevel();

    // simple のときは控えめ、smart はやや積極的
    let baseRate = 0.15;
    if (level === "smart") baseRate += 0.1;

    if (Math.random() > baseRate) return;

    const keys = Object.keys(window.farmPlots);
    if (!keys.length) return;

    const key = keys[Math.floor(Math.random() * keys.length)];
    try {
      window.useFertilizerOnFarm(key);
    } catch (e) {}
  }

  // =========================
  // 戦闘時アイテム・食事を賢く使う補助
  // =========================

  function tetoMaybeSmartUseItems() {
    const level = tetoGetAiLevel();
    if (level === "simple") return; // 既存ロジックに任せる

    const b = sBattle();
    const r = sRes();
    if (!b.currentEnemy) return;

    // MP が枯渇してきたら MP 回復アイテム（仮に carryPotions に含まれる想定）を使うなど
    if (r.mp != null && r.mpMax != null && r.mp < r.mpMax * 0.3) {
      if (typeof window.useBattleItem === "function" &&
          hasBattlePotion() &&
          Math.random() < 0.2) {
        window.useBattleItem();
        incCounterIfAvailable("itemUsedBattle");
        return;
      }
    }

    // 賢さ normal/smart のとき、食事・飲み物も戦闘前に少し余裕を持って使う
    if (r.hunger != null && r.hunger < 60 &&
        hasFood() &&
        Math.random() < 0.1 &&
        typeof window.eatFoodInField === "function") {
      window.eatFoodInField();
      incCounterIfAvailable("foodUsed");
    }
    if (r.thirst != null && r.thirst < 60 &&
        hasDrink() &&
        Math.random() < 0.1 &&
        typeof window.drinkInField === "function") {
      window.drinkInField();
      incCounterIfAvailable("drinkUsed");
    }
  }

  // =========================
  // 生活系・市場系の補助
  // =========================

  // ★性格寄せをやめ、「頻度は賢さのみ」で決める
  function tetoMaybeMarketAdvanced() {
    const level = tetoGetAiLevel();
    if (typeof window.refreshMarketSellCandidates !== "function" ||
        typeof window.refreshMarketBuyList !== "function") {
      return;
    }

    let rate = 0.03;
    if (level === "smart") rate = 0.06;

    if (Math.random() > rate) return;

    try {
      const roll = Math.random();
      if (roll < 0.5) {
        window.refreshMarketSellCandidates();
        // ★売り候補がなければ listItemOnMarket を呼ばない
        if (typeof window.listItemOnMarket === "function" &&
            hasMarketSomethingToSell()) {
          window.listItemOnMarket();
          incCounterIfAvailable("marketSells");
        }
      } else {
        window.refreshMarketBuyList();
        // ★買い候補がなければ buyFromMarket を呼ばない
        if (typeof window.buyFromMarket === "function" &&
            hasMarketSomethingToBuy()) {
          window.buyFromMarket();
          incCounterIfAvailable("marketBuys");
        }
      }
    } catch (e) {}
  }

  // =========================
  // 拡張ポスト Tick フック本体
  // =========================

  // teto-ai.js の tick 後に任意で呼ぶことで、「賢さレイヤー」を発火させる。
  function tetoAdvancedPostTick(mode) {
    const level = tetoGetAiLevel();

    // simple のときはほとんど何もしない（既存挙動重視）
    if (level === "simple") {
      // たまにだけギルドスキルを雑に取る
      if (Math.random() < 0.02) {
        safeCall(tetoMaybeLearnGuildSkillAdvanced, "maybeLearnGuildSkill(simple)");
      }
      return;
    }

    // normal / smart 用
    // 戦闘時の追加判断
    safeCall(tetoMaybeSmartUseItems, "smartUseItems");

    const bs = sBattle();
    if (bs.currentEnemy && level === "smart") {
      // smart なら「望ましいタイプで倒す」も試す（既存行動が走った後でもよい）
      if (Math.random() < 0.3) {
        safeCall(tetoTryKillWithPreferredType, "tryKillWithPreferredType");
      }
    }

    // ギルドツリー習得
    if (Math.random() < 0.05) {
      safeCall(tetoMaybeLearnGuildSkillAdvanced, "maybeLearnGuildSkillAdvanced");
    }

    // 共通スキルツリー習得（戦闘以外モード優先）
    if (mode === "gatherMain" || mode === "craftMain" || mode === "lifeMain" || mode === "mixed") {
      if (Math.random() < 0.05) {
        safeCall(tetoMaybeLearnGlobalSkillAdvanced, "maybeLearnGlobalSkillAdvanced");
      }
    }

    // 連敗しているときは、たまにツリー見直しを試す
    if ((window._tetoRecentBattleFailCount || 0) >= 3) {
      if (Math.random() < 0.2) {
        safeCall(tetoMaybeLearnGlobalSkillAdvanced, "maybeLearnGlobalSkillAdvancedOnFail");
      }
    }

    // 農園・肥料
    if (mode === "gatherMain" || mode === "lifeMain" || mode === "mixed") {
      safeCall(tetoMaybeUseFertilizerAdvanced, "maybeUseFertilizerAdvanced");
    }

    // 市場
    safeCall(tetoMaybeMarketAdvanced, "maybeMarketAdvanced");
  }

  // =========================
  // 公開 API
  // =========================

  // teto-ai.js から任意に呼べるよう export
  window.tetoAdvancedPostTick = tetoAdvancedPostTick;

})();