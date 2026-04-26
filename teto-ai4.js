// teto-ai4.js
// テトちゃん（自動テストプレイヤー）本体ロジック
// - 状態スナップショット
// - 行動プリミティブ（戦闘/採取/クラフト/ギルド/拠点/市場/ペット/転生）
// - balanced 用 状態評価
// - モード別 1 tick 行動
// - グローバル公開: tetoGet***, tetoTick*** など

(function () {
  "use strict";

  // =========================
  // 状態スナップショット層
  // =========================

  function tetoGetBattleStatus() {
    return {
      hp: typeof hp === "number" ? hp : null,
      hpMax: typeof hpMax === "number" ? hpMax : null,
      mp: typeof mp === "number" ? mp : null,
      mpMax: typeof mpMax === "number" ? mpMax : null,
      sp: typeof sp === "number" ? sp : null,
      spMax: typeof spMax === "number" ? spMax : null,
      currentEnemy: typeof currentEnemy !== "undefined" ? currentEnemy : null,
      enemyHp: typeof enemyHp === "number" ? enemyHp : null,
      enemyMaxHp: typeof enemyHpMax === "number" ? enemyHpMax : null,
      jobId: typeof jobId === "number" ? jobId : null,
      battleCountSinceDurability: window.battleCountSinceDurability || 0
    };
  }

  function tetoGetResourceStatus() {
    return {
      hunger: typeof currentHunger === "number" ? currentHunger : null,
      thirst: typeof currentThirst === "number" ? currentThirst : null,
      money: typeof money === "number" ? money : null
    };
  }

  function tetoGetGatherStatus() {
    return {
      gatherSkills: typeof gatherSkills === "object" ? JSON.parse(JSON.stringify(gatherSkills)) : null,
      lastGatherInfo: typeof window.lastGatherInfo !== "undefined" ? window.lastGatherInfo : null
    };
  }

  function tetoGetCraftStatus() {
    return {
      craftSkills: typeof craftSkills === "object" ? JSON.parse(JSON.stringify(craftSkills)) : null,
      craftStatsList: (typeof getCraftStatsList === "function") ? getCraftStatsList() : null
    };
  }

  function tetoGetEquipStatus() {
    return {
      equippedWeaponIndex: typeof window.equippedWeaponIndex === "number" ? window.equippedWeaponIndex : null,
      equippedArmorIndex: typeof window.equippedArmorIndex === "number" ? window.equippedArmorIndex : null,
      equippedWeaponId: typeof window.equippedWeaponId !== "undefined" ? window.equippedWeaponId : null,
      equippedArmorId: typeof window.equippedArmorId !== "undefined" ? window.equippedArmorId : null,
      weaponInstances: Array.isArray(window.weaponInstances)
        ? window.weaponInstances.map(inst => ({ ...inst }))
        : null,
      armorInstances: Array.isArray(window.armorInstances)
        ? window.armorInstances.map(inst => ({ ...inst }))
        : null,
      weaponCounts: typeof window.weaponCounts === "object" ? { ...window.weaponCounts } : {},
      armorCounts: typeof window.armorCounts === "object" ? { ...window.armorCounts } : {}
    };
  }

  function tetoGetGatherBaseStatus() {
    if (typeof getGatherBaseStatus === "function") {
      return getGatherBaseStatus();
    }
    return {
      bases: typeof window.gatherBases === "object"
        ? JSON.parse(JSON.stringify(window.gatherBases))
        : null,
      stockTicks: typeof window.gatherBaseStockTicks === "number" ? window.gatherBaseStockTicks : 0
    };
  }

  function tetoGetInventoryStatus() {
    return {
      carryPotions: typeof window.carryPotions === "object" ? { ...window.carryPotions } : {},
      carryTools: typeof window.carryTools === "object" ? { ...window.carryTools } : {},
      carryFoods: typeof window.carryFoods === "object" ? { ...window.carryFoods } : {},
      carryDrinks: typeof window.carryDrinks === "object" ? { ...window.carryDrinks } : {}
    };
  }

  function tetoGetGuildStatus() {
    const fame = (typeof getGuildFame === "function")
      ? {
          warrior: getGuildFame("warrior"),
          mage: getGuildFame("mage"),
          tamer: getGuildFame("tamer")
        }
      : null;

    const quests = (typeof getGuildQuestStatusSummary === "function")
      ? getGuildQuestStatusSummary()
      : null;

    return {
      playerGuildId: typeof window.playerGuildId !== "undefined" ? window.playerGuildId : null,
      fame,
      quests,
      combatGuildSkillPoints: window.combatGuildSkillPoints || 0,
      combatGuildUnlocked: window.combatGuildTreeUnlocked || {}
    };
  }

  function tetoGetHousingStatus() {
    return {
      citizenship: !!window.citizenshipUnlocked,
      housingState: window.housingState ? JSON.parse(JSON.stringify(window.housingState)) : null,
      housingActive: (typeof isHousingActive === "function") ? isHousingActive() : false,
      currentLand: (typeof getCurrentHousingLand === "function") ? getCurrentHousingLand() : null
    };
  }

  function tetoGetPersonality() {
    return window.tetoPersonality || "balanced";
  }

  function tetoGetAiLevel() {
    return window.tetoAiLevel || "normal";
  }

  // =========================
  // 行動プリミティブ層
  // =========================

  // --- 戦闘関連プリミティブ ---

  function tetoUseBattleItemIfNeeded() {
    const bs = tetoGetBattleStatus();
    const rs = tetoGetResourceStatus();
    if (!bs.currentEnemy) return false;

    if (bs.hp != null && bs.hpMax != null && bs.hp < bs.hpMax * 0.35) {
      const inv = tetoGetInventoryStatus();
      const hasPotion = Object.keys(inv.carryPotions).length > 0;
      if (hasPotion && typeof useBattleItem === "function") {
        useBattleItem();
        if (typeof window.tetoIncCounter === "function") {
          window.tetoIncCounter("itemUsedBattle");
        }
        return true;
      }
    }

    return false;
  }

  function tetoUseSkillIfReasonable() {
    const bs = tetoGetBattleStatus();
    if (!bs.currentEnemy) return false;

    // jobId に応じて「スキル or 魔法」を優先
    if (bs.jobId === 1 || bs.jobId === 2 || bs.jobId === 3) {
      // 魔法職/混成職: 魔法優先
      const magicSel = document.getElementById("magicSelect");
      if (magicSel && magicSel.value && typeof castMagicFromUI === "function") {
        castMagicFromUI();
        if (typeof window.tetoIncCounter === "function") {
          window.tetoIncCounter("skillUsesMagic");
        }
        return true;
      }
    }
    if (bs.jobId === 0 || bs.jobId === 2 || bs.jobId === 3) {
      // 物理スキルも試す
      const skillSel = document.getElementById("skillSelect");
      if (skillSel && skillSel.value && typeof useSkillFromUI === "function") {
        useSkillFromUI();
        if (typeof window.tetoIncCounter === "function") {
          window.tetoIncCounter("skillUsesPhys");
        }
        return true;
      }
    }

    return false;
  }

  // 戦闘中の逃走（探索撤退とは別物）
  function tetoMaybeEscapeBattle() {
    if (typeof window.tryEscape !== "function") return false;

    const bs  = tetoGetBattleStatus();
    const inv = tetoGetInventoryStatus();
    const level = tetoGetAiLevel();

    if (!bs.currentEnemy) return false;
    if (bs.hp == null || bs.hpMax == null || bs.hpMax <= 0) return false;

    // simple は「絶対に逃げない」キャラのままにする
    if (level === "simple") return false;

    const hpRate = bs.hp / bs.hpMax;
    const hasPotion =
      inv.carryPotions && Object.keys(inv.carryPotions).length > 0;
    const recentFail = window._tetoRecentBattleFailCount || 0;

    // 逃走検討条件:
    // - HP 20% 以下
    // - ポーション無し
    if (hpRate > 0.2) return false;
    if (hasPotion) return false;

    // ★性格に依存しない標準の逃走しやすさ
    let escapeChance = 0.25; // 基本 25%

    // HP が 10% 未満ならさらに上乗せ
    if (hpRate < 0.1) escapeChance += 0.2;

    // 連敗しているほど逃げたくなる
    if (recentFail >= 2) escapeChance += 0.1;
    if (recentFail >= 4) escapeChance += 0.1;

    // AI レベル smart は少しだけ逃走判断を強める
    if (level === "smart") escapeChance += 0.1;

    if (escapeChance <= 0) return false;
    if (escapeChance > 0.9) escapeChance = 0.9;

    if (Math.random() >= escapeChance) return false;

    window.tryEscape();
    if (typeof window.tetoIncCounter === "function") {
      window.tetoIncCounter("battleEscapes");
    }
    return true;
  }

  function tetoDoOneBattleStep() {
    const bs = tetoGetBattleStatus();
    if (!bs.currentEnemy) {
      // 敵がいなければ「探索ボタン」を押す扱い
      if (typeof doExploreEvent === "function") {
        // area は game-core 側で isExploring / exploringArea / getCurrentArea を使って決まる
        doExploreEvent();
      } else if (typeof startRandomEncounter === "function") {
        // 旧仕様フォールバック: 探索APIがない環境用
        startRandomEncounter();
      }
      return;
    }

    if (typeof window.tetoIncCounter === "function") {
      window.tetoIncCounter("battles");
    }

    // まず戦闘逃走を検討（探索撤退とは別）
    if (tetoMaybeEscapeBattle()) return;

    // HP やばければポーション
    if (tetoUseBattleItemIfNeeded()) return;

    // スキル/魔法もできるだけ使う
    if (tetoUseSkillIfReasonable()) return;

    // それ以外は普通に攻撃
    if (typeof playerAttack === "function") {
      playerAttack();
    }
  }

  // --- 採取関連プリミティブ ---

  function tetoDoOneGatherStep() {
    // 探索中・戦闘中は採取しない（UIと同じ制約）
    if (window.isExploring || window.currentEnemy) {
      return;
    }

    const gatherTab = document.getElementById("pageGather");
    if (gatherTab && gatherTab.style.display === "none") {
      // タブが隠れていても gather() 自体は動く想定なので、そのまま叩く
    }

    // 通常採取 or 食材調達をランダムに分散
    if (typeof gather === "function" && Math.random() < 0.6) {
      gather();
      if (typeof window.tetoIncCounter === "function") {
        window.tetoIncCounter("gathers");
      }
      return;
    }

    if (typeof gatherCooking === "function") {
      const roll = Math.random();
      const mode = roll < 0.34 ? "hunt" : (roll < 0.67 ? "fish" : "farm");
      gatherCooking(mode);
      if (typeof window.tetoIncCounter === "function") {
        window.tetoIncCounter("gathers");
      }
      return;
    }
  }

  function tetoMaybeAdjustGatherBases() {
    const gb = tetoGetGatherBaseStatus();
    if (!gb.bases) return;

    const keys = Object.keys(gb.bases);
    // 低レベルの拠点を優先して強化
    const target = keys.find(k => gb.bases[k] && (gb.bases[k].level || 0) <= 0);
    if (target && typeof tryUpgradeGatherBase === "function") {
      tryUpgradeGatherBase(target);
      return;
    }

    // モード切り替えも行う（normal→quantity→quality ローテ）
    keys.forEach(k => {
      const base = gb.bases[k];
      if (!base || !base.mode) return;
      if (typeof setGatherBaseMode !== "function") return;
      if (Math.random() < 0.2) {
        if (base.mode === "normal") {
          setGatherBaseMode(k, "quantity");
        } else if (base.mode === "quantity") {
          setGatherBaseMode(k, "quality");
        } else {
          setGatherBaseMode(k, "normal");
        }
      }
    });
  }

  // --- クラフト関連プリミティブ ---

  // ざっくり「今の選択状態でクラフトしても意味がありそうか」を見る軽いガード
  // 実際の素材チェックなどはゲーム本体側に任せる。
  function tetoCanCraftCurrentSelection() {
    const inv = tetoGetInventoryStatus();
    const res = tetoGetResourceStatus();

    const hasAnyItem =
      Object.keys(inv.carryTools).length > 0 ||
      Object.keys(inv.carryFoods).length > 0 ||
      Object.keys(inv.carryDrinks).length > 0 ||
      Object.keys(inv.carryPotions).length > 0;

    // 完全に手持ちゼロ & 所持金もほぼゼロなら、クラフトしても何も起きない可能性が高いとみなす
    if (!hasAnyItem && (!res.money || res.money <= 0)) {
      return false;
    }

    return true;
  }

  function tetoDoOneCraftStep() {
    // 探索中・戦闘中はクラフトできない仕様なのでチェック
    if (window.isExploring || window.currentEnemy) {
      return;
    }

    // 明らかに意味がなさそうな状態なら、クラフトをスキップ扱いにする
    if (!tetoCanCraftCurrentSelection()) {
      window._tetoRecentCraftSkipCount = (window._tetoRecentCraftSkipCount || 0) + 1;
      return;
    }

    let didCraft = false;

    // 装備 → ポーション → 道具 → 料理 → 飲み物 の順で試す
    const wSel = document.getElementById("weaponSelect");
    if (wSel && wSel.value && typeof craftWeapon === "function") {
      craftWeapon();
      if (typeof window.tetoIncCounter === "function") {
        window.tetoIncCounter("crafts");
      }
      didCraft = true;
    } else {
      const aSel = document.getElementById("armorSelect");
      if (aSel && aSel.value && typeof craftArmor === "function") {
        craftArmor();
        if (typeof window.tetoIncCounter === "function") {
          window.tetoIncCounter("crafts");
        }
        didCraft = true;
      } else {
        const pSel = document.getElementById("potionSelect");
        if (pSel && pSel.value && typeof craftPotion === "function") {
          craftPotion();
          if (typeof window.tetoIncCounter === "function") {
            window.tetoIncCounter("crafts");
          }
          didCraft = true;
        } else {
          const tSel = document.getElementById("toolSelect");
          if (tSel && tSel.value && typeof craftTool === "function") {
            craftTool();
            if (typeof window.tetoIncCounter === "function") {
              window.tetoIncCounter("crafts");
            }
            didCraft = true;
          } else {
            const fSel = document.getElementById("foodSelect");
            if (fSel && fSel.value && typeof craftFood === "function") {
              craftFood();
              if (typeof window.tetoIncCounter === "function") {
                window.tetoIncCounter("crafts");
              }
              didCraft = true;
            } else {
              const dSel = document.getElementById("drinkSelect");
              if (dSel && dSel.value && typeof craftDrink === "function") {
                craftDrink();
                if (typeof window.tetoIncCounter === "function") {
                  window.tetoIncCounter("crafts");
                }
                didCraft = true;
              }
            }
          }
        }
      }
    }

    if (didCraft) {
      window._tetoRecentCraftSkipCount = 0;
    } else {
      window._tetoRecentCraftSkipCount = (window._tetoRecentCraftSkipCount || 0) + 1;
    }
  }

  // --- 空腹/喉/回復関連 ---

  function tetoMaybeUseFoodDrink() {
    const res = tetoGetResourceStatus();
    const inv = tetoGetInventoryStatus();
    if (res.hunger == null || res.thirst == null) return;

    const lowHunger = res.hunger < 40;
    const lowThirst = res.thirst < 40;

    if (lowHunger && Object.keys(inv.carryFoods).length > 0 && typeof eatFoodInField === "function") {
      eatFoodInField();
      if (typeof window.tetoIncCounter === "function") {
        window.tetoIncCounter("foodUsed");
      }
      return;
    }
    if (lowThirst && Object.keys(inv.carryDrinks).length > 0 && typeof drinkInField === "function") {
      drinkInField();
      if (typeof window.tetoIncCounter === "function") {
        window.tetoIncCounter("drinkUsed");
      }
      return;
    }
  }

  // --- 装備修理関連 ---

  function tetoMaybeRepairEquip() {
    if (typeof getRepairableEquipList !== "function") return;

    const list = getRepairableEquipList();
    if (!list || !list.length) return;

    const target = list[Math.floor(Math.random() * list.length)];
    if (!target) return;

    const sel = document.getElementById("repairTargetSelect");
    if (sel && typeof refreshRepairUI === "function" && typeof execRepairSelected === "function") {
      refreshRepairUI();
      for (let i = 0; i < sel.options.length; i++) {
        const text = sel.options[i].textContent || "";
        if (text.indexOf(target.name) !== -1) {
          sel.selectedIndex = i;
          break;
        }
      }
      execRepairSelected();
      if (typeof window.tetoIncCounter === "function") {
        window.tetoIncCounter("repairs");
      }
      return;
    }

    const MAX_DURABILITY_LOCAL =
      (typeof MAX_DURABILITY === "number") ? MAX_DURABILITY : (target.maxDur || 10);
    if (target.kind === "weapon" && Array.isArray(window.weaponInstances)) {
      const inst = window.weaponInstances[target.idx];
      if (inst) {
        inst.durability = MAX_DURABILITY_LOCAL;
        if (typeof window.tetoIncCounter === "function") {
          window.tetoIncCounter("repairs");
        }
      }
    } else if (target.kind === "armor" && Array.isArray(window.armorInstances)) {
      const inst = window.armorInstances[target.idx];
      if (inst) {
        inst.durability = MAX_DURABILITY_LOCAL;
        if (typeof window.tetoIncCounter === "function") {
          window.tetoIncCounter("repairs");
        }
      }
    }
  }

  // --- ギルド関連プリミティブ ---

  function tetoMaybeJoinGuild() {
    const gs = tetoGetGuildStatus();
    if (gs.playerGuildId) return;

    if (typeof joinGuild !== "function" || !Array.isArray(window.GUILDS)) return;

    const ids = window.GUILDS.map(g => g.id);
    const target = ids[Math.floor(Math.random() * ids.length)];
    if (!target) return;

    joinGuild(target);
    if (typeof window.tetoIncCounter === "function") {
      window.tetoIncCounter("guildJoins");
    }
  }

  function tetoMaybeAcceptGuildQuest() {
    if (typeof acceptGuildQuest !== "function") return;
    if (!Array.isArray(window.GUILD_QUESTS)) return;

    const gs = tetoGetGuildStatus();
    const gid = gs.playerGuildId;
    if (!gid) return;

    const candidates = window.GUILD_QUESTS.filter(q => q.guildId === gid);
    if (!candidates.length) return;

    const q = candidates[Math.floor(Math.random() * candidates.length)];
    if (!q) return;

    try {
      acceptGuildQuest(q.id);
      if (typeof window.tetoIncCounter === "function") {
        window.tetoIncCounter("guildQuestsAccepted");
      }
    } catch (e) {
      // 受注条件満たしてないなどは無視
    }
  }

  function tetoMaybeClaimGuildRewards() {
    if (typeof claimGuildQuestReward !== "function") return;
    if (!Array.isArray(window.GUILD_QUESTS)) return;

    const gs = tetoGetGuildStatus();
    const gid = gs.playerGuildId;
    if (!gid) return;

    window.GUILD_QUESTS.forEach(q => {
      try {
        claimGuildQuestReward(q.id);
        if (typeof window.tetoIncCounter === "function") {
          window.tetoIncCounter("guildQuestsCleared");
        }
      } catch (e) {}
    });

    if (gs.combatGuildSkillPoints > 0 && Array.isArray(window.COMBAT_GUILD_TREE)) {
      const candidates = window.COMBAT_GUILD_TREE.filter(node => {
        if (window.combatGuildTreeUnlocked && window.combatGuildTreeUnlocked[node.id]) return false;
        if (typeof isCombatTreeNodeUnlockable === "function") {
          return isCombatTreeNodeUnlockable(node);
        }
        return true;
      });
      if (candidates.length && typeof learnCombatGuildNode === "function") {
        const n = candidates[Math.floor(Math.random() * candidates.length)];
        if (n) {
          learnCombatGuildNode(n.id);
          if (typeof window.tetoIncCounter === "function") {
            window.tetoIncCounter("guildSkillLearned");
          }
        }
      }
    }
  }

  // --- 拠点/ハウジング関連プリミティブ ---

  function tetoMaybeUnlockCitizenship() {
    if (window.citizenshipUnlocked) return;
    // 実ゲームの条件に依存するため、ここでは直接は触らない。
  }

  function tetoMaybeRentHousing() {
    const hs = tetoGetHousingStatus();
    if (!hs.citizenship) return;

    if (typeof window.canRentLand !== "function" || typeof window.rentLand !== "function") return;
    const lands = window.HOUSING_LANDS || {};
    const ids = Object.keys(lands);
    if (!ids.length) return;

    if (hs.housingState && hs.housingState.landId) {
      return;
    }

    ids.sort((a, b) => (lands[a].weeklyRent || 0) - (lands[b].weeklyRent || 0));
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const chk = window.canRentLand(id);
      if (chk && chk.ok) {
        window.rentLand(id);
        if (typeof window.tetoIncCounter === "function") {
          window.tetoIncCounter("housingRents");
        }
        break;
      }
    }
  }

  function tetoMaybePayHousingRent() {
    if (typeof window.payHousingRent !== "function") return;
    const hs = tetoGetHousingStatus();
    if (!hs.housingState || !hs.housingState.landId) return;

    if (hs.housingState.rentUnpaid) {
      window.payHousingRent();
      if (typeof window.tetoIncCounter === "function") {
        window.tetoIncCounter("housingRentPaid");
      }
    }
  }

  // --- 市場関連プリミティブ ---

  function tetoMaybeUseMarket() {
    if (typeof window.refreshMarketSellCandidates !== "function" ||
        typeof window.refreshMarketBuyList !== "function") return;

    const roll = Math.random();
    if (roll < 0.5) {
      try {
        refreshMarketSellCandidates();
        if (typeof window.listItemOnMarket === "function") {
          window.listItemOnMarket();
          if (typeof window.tetoIncCounter === "function") {
            window.tetoIncCounter("marketSells");
          }
        }
      } catch (e) {}
    } else {
      try {
        refreshMarketBuyList();
        if (typeof window.buyFromMarket === "function") {
          window.buyFromMarket();
          if (typeof window.tetoIncCounter === "function") {
            window.tetoIncCounter("marketBuys");
          }
        }
      } catch (e) {}
    }
  }

  // --- ペット関連簡易カバレッジ ---

  function tetoMaybePickCompanion() {
    if (typeof window.hasCompanion === "function" && window.hasCompanion()) {
      return;
    }
    if (typeof window.setCompanionByTypeId !== "function") return;

    const types = ["inu", "karasu", "usagi"];
    const pick = types[Math.floor(Math.random() * types.length)];
    window.setCompanionByTypeId(pick);
    if (typeof window.tetoIncCounter === "function") {
      window.tetoIncCounter("petActions");
    }
  }

  // --- リバース（転生）など ---

  function tetoMaybeRebirth() {
    if (typeof window.tryRebirth !== "function") return;
    if (Math.random() < 0.02) {
      window.tryRebirth();
      if (typeof window.tetoIncCounter === "function") {
        window.tetoIncCounter("rebirths");
      }
    }
  }

  // =========================
  // balanced 用 簡易状態評価
  // =========================

  function tetoBalancedDetectNeeds() {
    const bs = tetoGetBattleStatus();
    const rs = tetoGetResourceStatus();
    const inv = tetoGetInventoryStatus();
    const gs = tetoGetGuildStatus();
    const hs = tetoGetHousingStatus();

    const hpLow = (bs.hp != null && bs.hpMax != null && bs.hp < bs.hpMax * 0.4);
    const hungerLow = (rs.hunger != null && rs.hunger < 40);
    const thirstLow = (rs.thirst != null && rs.thirst < 40);
    const foodLow = !inv.carryFoods || Object.keys(inv.carryFoods).length < 2;
    const drinkLow = !inv.carryDrinks || Object.keys(inv.carryDrinks).length < 2;

    const moneyLow = (rs.money != null && rs.money < 300);
    const moneyMid = (rs.money != null && rs.money < 800);

    const recentFail = window._tetoRecentBattleFailCount || 0;

    const needs = {
      needTraining: false,
      needEquip: false,
      needFoodPrep: false,
      needGather: false,
      needMoney: false,
      needHousingPay: false,
      needGuild: false
    };

    if (recentFail >= 2 || hpLow) {
      needs.needTraining = true;
      needs.needEquip = true;
    }

    if ((hungerLow || thirstLow) && (foodLow || drinkLow)) {
      needs.needFoodPrep = true;
      needs.needGather = true;
    }

    if (moneyLow) {
      needs.needMoney = true;
    }

    if (hs.housingState && hs.housingState.landId && hs.housingState.rentUnpaid) {
      needs.needHousingPay = true;
      if (moneyMid || moneyLow) {
        needs.needMoney = true;
      }
    }

    if (!gs.playerGuildId || (gs.quests && gs.quests.active && gs.quests.active.length === 0)) {
      needs.needGuild = true;
    }

    return needs;
  }

  // =========================
  // モード別 1 tick 行動
  // =========================

  function tetoTickBattleMain() {
    if (typeof window.tetoStrategicPreTick === "function") {
      window.tetoStrategicPreTick("battleMain");
    }

    const bs = tetoGetBattleStatus();

    tetoMaybeUseFoodDrink();
    tetoMaybePickCompanion();
    tetoMaybeRebirth();

    // ★HP 25% 以下で探索を止めるガードは削除して、
    //   止まらずに戦闘/探索を続けるようにする

    tetoDoOneBattleStep();
    if (Math.random() < 0.05) {
      tetoMaybeRepairEquip();
    }
  }

  function tetoTickGatherMain() {
    if (typeof window.tetoStrategicPreTick === "function") {
      window.tetoStrategicPreTick("gatherMain");
    }

    tetoMaybeUseFoodDrink();
    tetoMaybePickCompanion();
    tetoDoOneGatherStep();

    if (Math.random() < 0.2) {
      tetoMaybeAdjustGatherBases();
    }
    if (Math.random() < 0.05) {
      tetoMaybeRebirth();
    }
  }

  function tetoTickCraftMain() {
    if (typeof window.tetoStrategicPreTick === "function") {
      window.tetoStrategicPreTick("craftMain");
    }

    tetoMaybeUseFoodDrink();
    tetoMaybePickCompanion();

    tetoDoOneCraftStep();

    const skip = (window._tetoRecentCraftSkipCount || 0);
    if (skip >= 3) {
      // ★性格に依存せず、クラフト目的に沿った標準挙動:
      // 素材集めをメインに、たまに市場で売買。
      if (Math.random() < 0.7) {
        tetoDoOneGatherStep();   // 素材集め優先
      } else {
        tetoMaybeUseMarket();    // 素材購入や売却
      }
    }

    if (Math.random() < 0.1) {
      tetoMaybeAdjustGatherBases();
    }
    if (Math.random() < 0.1) {
      tetoMaybeRepairEquip();
    }
  }

  function tetoTickLifeMain() {
    if (typeof window.tetoStrategicPreTick === "function") {
      window.tetoStrategicPreTick("lifeMain");
    }

    tetoMaybeUseFoodDrink();
    tetoMaybePickCompanion();

    const roll = Math.random();
    if (roll < 0.3) {
      tetoMaybeJoinGuild();
      tetoMaybeAcceptGuildQuest();
      tetoMaybeClaimGuildRewards();
    } else if (roll < 0.55) {
      if (Math.random() < 0.5) {
        tetoDoOneGatherStep();
      } else {
        tetoDoOneCraftStep();
      }
    } else if (roll < 0.75) {
      tetoMaybeRentHousing();
      tetoMaybePayHousingRent();
    } else {
      tetoMaybeUseMarket();
      tetoMaybeRepairEquip();
    }

    if (Math.random() < 0.05) {
      tetoMaybeRebirth();
    }
  }

  function tetoTickMixed() {
    if (typeof window.tetoStrategicPreTick === "function") {
      window.tetoStrategicPreTick("mixed");
    }

    tetoMaybeUseFoodDrink();
    tetoMaybePickCompanion();

    const roll = Math.random();
    if (roll < 0.4) {
      tetoDoOneBattleStep();
    } else if (roll < 0.7) {
      tetoDoOneGatherStep();
    } else {
      tetoDoOneCraftStep();
    }

    if (Math.random() < 0.1) {
      tetoMaybeAdjustGatherBases();
    }
    if (Math.random() < 0.05) {
      tetoMaybeJoinGuild();
      tetoMaybeAcceptGuildQuest();
    }
    if (Math.random() < 0.05) {
      tetoMaybeRentHousing();
      tetoMaybePayHousingRent();
    }
    if (Math.random() < 0.05) {
      tetoMaybeRepairEquip();
    }
    if (Math.random() < 0.03) {
      tetoMaybeUseMarket();
    }
    if (Math.random() < 0.03) {
      tetoMaybeRebirth();
    }
  }

  function tetoTickBalancedMain() {
    if (typeof window.tetoStrategicPreTick === "function") {
      window.tetoStrategicPreTick("mixed");
    }

    tetoMaybeUseFoodDrink();
    tetoMaybePickCompanion();

    const needs = tetoBalancedDetectNeeds();

    if (needs.needHousingPay) {
      tetoMaybePayHousingRent();
    }

    if (needs.needGuild && Math.random() < 0.4) {
      tetoMaybeJoinGuild();
      tetoMaybeAcceptGuildQuest();
      tetoMaybeClaimGuildRewards();
    }

    const bs = tetoGetBattleStatus();
    if (needs.needTraining || needs.needEquip) {
      if (bs.hp != null && bs.hpMax != null && bs.hp < bs.hpMax * 0.3) {
        tetoDoOneCraftStep();
      } else {
        tetoDoOneBattleStep();
        if (Math.random() < 0.2) {
          tetoDoOneCraftStep();
        }
      }
    } else if (needs.needFoodPrep) {
      tetoDoOneCraftStep();
      if ((window._tetoRecentCraftSkipCount || 0) >= 2) {
        tetoDoOneGatherStep();
      }
    } else if (needs.needMoney) {
      tetoDoOneBattleStep();
      if (Math.random() < 0.3) {
        tetoMaybeUseMarket();
      }
    } else {
      const roll = Math.random();
      if (roll < 0.35) {
        tetoDoOneBattleStep();
      } else if (roll < 0.65) {
        tetoDoOneGatherStep();
      } else {
        tetoDoOneCraftStep();
      }
    }

    if (Math.random() < 0.05) {
      tetoMaybeAdjustGatherBases();
    }
    if (Math.random() < 0.05) {
      tetoMaybeRepairEquip();
    }
    if (Math.random() < 0.03) {
      tetoMaybeUseMarket();
    }
    if (Math.random() < 0.03) {
      tetoMaybeRebirth();
    }
  }

  // =========================
  // 公開
  // =========================

  if (typeof window !== "undefined") {
    // スナップショット
    window.tetoGetBattleStatus = tetoGetBattleStatus;
    window.tetoGetGatherStatus = tetoGetGatherStatus;
    window.tetoGetCraftStatus = tetoGetCraftStatus;
    window.tetoGetEquipStatus = tetoGetEquipStatus;
    window.tetoGetGatherBaseStatus = tetoGetGatherBaseStatus;
    window.tetoGetInventoryStatus = tetoGetInventoryStatus;
    window.tetoGetGuildStatus = tetoGetGuildStatus;
    window.tetoGetHousingStatus = tetoGetHousingStatus;
    window.tetoGetResourceStatus = tetoGetResourceStatus;

    // モード別 tick
    window.tetoTickBattleMain = tetoTickBattleMain;
    window.tetoTickGatherMain = tetoTickGatherMain;
    window.tetoTickCraftMain = tetoTickCraftMain;
    window.tetoTickLifeMain = tetoTickLifeMain;
    window.tetoTickMixed = tetoTickMixed;
    window.tetoTickBalancedMain = tetoTickBalancedMain;
  }

})();