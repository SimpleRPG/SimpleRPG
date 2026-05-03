// teto-ai4.js
// テトちゃん（自動テストプレイヤー）本体ロジック
// - 状態スナップショット
// - 行動プリミティブ（戦闘/採取/ギルド/拠点/市場/ペット/転生）
// - balanced 用 状態評価
// - モード別 1 tick 行動
// - グローバル公開: tetoGet***, tetoTick*** など

(function () {
  "use strict";

  // =========================
  // テト制御フラグ（他ファイルのフック用）
  // =========================
  if (typeof window !== "undefined") {
    window.isTetoControlling = window.isTetoControlling || false;
    // 立て直し用の簡易状態
    window._tetoRecoveryState = window._tetoRecoveryState || {
      lastFailCount: 0,
      mode: null,              // "gather" / "craft" / null
      ticksSinceStart: 0
    };
  }

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
      carryDrinks: typeof window.carryDrinks === "object" ? { ...window.carryDrinks } : {},
      cookedFoods: typeof window.cookedFoods === "object" ? { ...window.cookedFoods } : {},
      cookedDrinks: typeof window.cookedDrinks === "object" ? { ...window.cookedDrinks } : {}
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

  function tetoGetAiLevel() {
    return window.tetoAiLevel || "normal";
  }

  // =========================
  // 行動プリミティブ層
  // =========================

  // --- 戦闘関連プリミティブ ---

  function tetoUseBattleItemIfNeeded() {
    const bs = tetoGetBattleStatus();
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

    if (bs.jobId === 1 || bs.jobId === 2 || bs.jobId === 3) {
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

  function tetoMaybeEscapeBattle() {
    if (typeof window.tryEscape !== "function") return false;

    const bs  = tetoGetBattleStatus();
    const inv = tetoGetInventoryStatus();
    const level = tetoGetAiLevel();

    if (!bs.currentEnemy) return false;
    if (bs.hp == null || bs.hpMax == null || bs.hpMax <= 0) return false;

    if (level === "simple") return false;

    const hpRate = bs.hp / bs.hpMax;
    const hasPotion =
      inv.carryPotions && Object.keys(inv.carryPotions).length > 0;
    const recentFail = window._tetoRecentBattleFailCount || 0;

    if (hpRate > 0.2) return false;
    if (hasPotion) return false;

    let escapeChance = 0.25;

    if (hpRate < 0.1) escapeChance += 0.2;
    if (recentFail >= 2) escapeChance += 0.1;
    if (recentFail >= 4) escapeChance += 0.1;
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
      if (typeof doExploreEvent === "function") {
        doExploreEvent();
      } else if (typeof startRandomEncounter === "function") {
        startRandomEncounter();
      }
      return;
    }

    if (typeof window.tetoIncCounter === "function") {
      window.tetoIncCounter("battles");
    }

    if (tetoMaybeEscapeBattle()) return;
    if (tetoUseBattleItemIfNeeded()) return;
    if (tetoUseSkillIfReasonable()) return;

    if (typeof playerAttack === "function") {
      playerAttack();
    }
  }

  // --- 採取関連プリミティブ ---

  function tetoDoOneGatherStep() {
    if (window.isExploring || window.currentEnemy) {
      return;
    }

    const gatherTab = document.getElementById("pageGather");
    if (gatherTab && gatherTab.style.display === "none") {
      // タブ非表示でも gather() 自体は動く想定
    }

    let didAny = false;

    if (typeof gather === "function" && Math.random() < 0.6) {
      gather();
      if (typeof window.tetoIncCounter === "function") {
        window.tetoIncCounter("gathers");
      }
      didAny = true;
    } else if (typeof gatherCooking === "function") {
      const roll = Math.random();
      const mode = roll < 0.34 ? "hunt" : (roll < 0.67 ? "fish" : "hunt"); // farm を hunt に寄せる
      gatherCooking(mode);
      if (typeof window.tetoIncCounter === "function") {
        window.tetoIncCounter("gathers");
      }
      didAny = true;
    }

    // 採取に成功したら、農園に少し成長ポイントを入れる
    if (didAny && typeof addFarmGrowthPoint === "function") {
      addFarmGrowthPoint("gather");
    }
  }

  function tetoMaybeAdjustGatherBases() {
    const gb = tetoGetGatherBaseStatus();
    if (!gb.bases) return;

    const keys = Object.keys(gb.bases);
    const target = keys.find(k => gb.bases[k] && (gb.bases[k].level || 0) <= 0);
    if (target && typeof tryUpgradeGatherBase === "function") {
      tryUpgradeGatherBase(target);
      return;
    }

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

  // --- クラフト関連（本体は teto-ai5.js 側に委譲） ---

  function tetoDoOneCraftStep() {
    if (typeof window.tetoDoOneCraftStepV5 === "function") {
      window.tetoDoOneCraftStepV5();
      return;
    }

    if (window.isExploring || window.currentEnemy) {
      return;
    }

    const inv = tetoGetInventoryStatus();
    const res = tetoGetResourceStatus();

    const hasAnyItem =
      Object.keys(inv.carryTools).length > 0 ||
      Object.keys(inv.carryFoods).length > 0 ||
      Object.keys(inv.carryDrinks).length > 0 ||
      Object.keys(inv.carryPotions).length > 0;

    if (!hasAnyItem && (!res.money || res.money <= 0)) {
      window._tetoRecentCraftSkipCount = (window._tetoRecentCraftSkipCount || 0) + 1;
      return;
    }

    let didCraft = false;

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

  // --- 農園関連プリミティブ ---

  function tetoMaybePlantFarmSeeds() {
    if (typeof getAllFarmCropIds !== "function" ||
        typeof plantFarmSlot !== "function" ||
        !window.farmState || !Array.isArray(window.farmState.slots)) {
      return;
    }

    const ids = getAllFarmCropIds();
    if (!ids.length) return;

    // 手持ちの cookingMats から、実際に持っている種候補だけに絞る
    const ownedFarmIds = ids.filter(id => {
      if (typeof window.cookingMats !== "object") return false;
      return (window.cookingMats[id] || 0) > 0;
    });

    // 謎の種も候補に含める（持っていなくても無料で植えられる仕様）
    const canUseMystery = true;

    const slots = window.farmState.slots;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot || slot.cropId) continue; // 何か植わっている

      // 空き区画を見つけたら、ある程度の確率で植える（暴走防止）
      if (Math.random() >= 0.4) continue;

      let seedId = null;

      if (ownedFarmIds.length > 0) {
        seedId = ownedFarmIds[Math.floor(Math.random() * ownedFarmIds.length)];
      } else if (canUseMystery && typeof FARM_MYSTERY_SEED_ID !== "undefined") {
        seedId = FARM_MYSTERY_SEED_ID;
      }

      if (!seedId) continue;

      try {
        plantFarmSlot(i, seedId);
      } catch (e) {
        // 植えられなかった場合は無視
      }
    }
  }

  function tetoMaybeCareFarm() {
    if (typeof careFarmAll !== "function") return;
    if (Math.random() < 0.15) {
      try {
        careFarmAll();
      } catch (e) {}
    }
  }

  function tetoMaybeHarvestFarm() {
    if (typeof harvestFarmAll !== "function") return;
    if (Math.random() < 0.2) {
      try {
        harvestFarmAll();
      } catch (e) {}
    }
  }

  // --- 空腹/喉/回復関連 ---

  // carry から「どの食べ物を食べるか」を雑に選ぶ
  function tetoPickFoodIdFromCarry(inv) {
    const ids = Object.keys(inv.carryFoods || {});
    if (!ids.length) return null;
    // 仕様を変えないため、ここでは単純ランダム
    return ids[Math.floor(Math.random() * ids.length)];
  }

  function tetoPickDrinkIdFromCarry(inv) {
    const ids = Object.keys(inv.carryDrinks || {});
    if (!ids.length) return null;
    return ids[Math.floor(Math.random() * ids.length)];
  }

  // 倉庫の料理・飲み物をその場で直食いする（拠点用）
  function tetoMaybeEatFromWarehouse(res, inv) {
    if (window.isExploring || window.currentEnemy) return false;

    const hungerLow = res.hunger != null && res.hunger < 40;
    const thirstLow = res.thirst != null && res.thirst < 40;

    // 食べ物
    if (hungerLow &&
        inv.carryFoods &&
        Object.keys(inv.carryFoods).length === 0 &&
        inv.cookedFoods &&
        Object.keys(inv.cookedFoods).length > 0 &&
        typeof consumeFoodFromWarehouse === "function") {

      const foodIds = Object.keys(inv.cookedFoods).filter(id => inv.cookedFoods[id] > 0);
      if (foodIds.length > 0) {
        const id = foodIds[Math.floor(Math.random() * foodIds.length)];
        consumeFoodFromWarehouse(id);
        if (typeof window.tetoIncCounter === "function") {
          window.tetoIncCounter("foodUsed");
        }
        return true;
      }
    }

    // 飲み物
    if (thirstLow &&
        inv.carryDrinks &&
        Object.keys(inv.carryDrinks).length === 0 &&
        inv.cookedDrinks &&
        Object.keys(inv.cookedDrinks).length > 0 &&
        typeof consumeDrinkFromWarehouse === "function") {

      const drinkIds = Object.keys(inv.cookedDrinks).filter(id => inv.cookedDrinks[id] > 0);
      if (drinkIds.length > 0) {
        const id = drinkIds[Math.floor(Math.random() * drinkIds.length)];
        consumeDrinkFromWarehouse(id);
        if (typeof window.tetoIncCounter === "function") {
          window.tetoIncCounter("drinkUsed");
        }
        return true;
      }
    }

    return false;
  }

  function tetoMaybeUseFoodDrink() {
    const res = tetoGetResourceStatus();
    const inv = tetoGetInventoryStatus();
    if (res.hunger == null || res.thirst == null) return;

    const lowHunger = res.hunger < 40;
    const lowThirst = res.thirst < 40;

    // まず carry にあるものをフィールドで食べる／飲む
    if (lowHunger && Object.keys(inv.carryFoods).length > 0 && typeof eatFoodInField === "function") {
      const foodId = tetoPickFoodIdFromCarry(inv);
      const sel = document.getElementById("fieldFoodSelect");
      if (sel && foodId) {
        // セレクトを食べたい料理に合わせてからボタン相当を呼ぶ
        sel.value = foodId;
      }
      eatFoodInField();
      if (typeof window.tetoIncCounter === "function") {
        window.tetoIncCounter("foodUsed");
      }
      return;
    }

    if (lowThirst && Object.keys(inv.carryDrinks).length > 0 && typeof drinkInField === "function") {
      const drinkId = tetoPickDrinkIdFromCarry(inv);
      const sel = document.getElementById("fieldDrinkSelect");
      if (sel && drinkId) {
        sel.value = drinkId;
      }
      drinkInField();
      if (typeof window.tetoIncCounter === "function") {
        window.tetoIncCounter("drinkUsed");
      }
      return;
    }

    // carry に無いが、街側（非探索中）で倉庫に在庫があるなら、倉庫から直食い
    if (!window.isExploring && !window.currentEnemy) {
      if (tetoMaybeEatFromWarehouse(res, inv)) {
        return;
      }
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
    const repairExecBtn      = document.getElementById("repairExecBtn");

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

    if (typeof joinGuild !== "function") return;
    if (!window.GUILDS || !window.GUILD_ORDER || !Array.isArray(window.GUILD_ORDER)) return;

    // GUILD_ORDER からランダムに選び、その ID を joinGuild に渡す
    const ids = window.GUILD_ORDER.slice();
    if (!ids.length) return;
    const target = ids[Math.floor(Math.random() * ids.length)];
    if (!target || !window.GUILDS[target]) return;

    joinGuild(target);
    if (typeof window.tetoIncCounter === "function") {
      window.tetoIncCounter("guildJoins");
    }
  }

  function tetoMaybeAcceptGuildQuest() {
    if (typeof acceptGuildQuest !== "function") return;

    const gs = tetoGetGuildStatus();
    const gid = gs.playerGuildId;
    if (!gid) return;

    if (!window.GUILD_QUESTS) return;
    const list = window.GUILD_QUESTS[gid];
    if (!Array.isArray(list) || !list.length) return;

    // すでに受注している・完了しているかどうかは getGuildQuestStatusSummary 側に任せてもよいが、
    // 仕様変更はしない前提で、とりあえずギルドのクエスト配列からランダムに選んで受注
    const q = list[Math.floor(Math.random() * list.length)];
    if (!q || !q.id) return;

    try {
      acceptGuildQuest(q.id);
      if (typeof window.tetoIncCounter === "function") {
        window.tetoIncCounter("guildQuestsAccepted");
      }
    } catch (e) {}
  }

  function tetoMaybeClaimGuildRewards() {
    if (typeof claimGuildQuestReward !== "function") return;

    const gs = tetoGetGuildStatus();
    const gid = gs.playerGuildId;
    if (!gid) return;

    if (!window.GUILD_QUESTS) return;
    const list = window.GUILD_QUESTS[gid];
    if (!Array.isArray(list) || !list.length) return;

    // 仕様変更はせず、「そのギルドに属する全クエストについて報酬受取を試みる」
    list.forEach(q => {
      if (!q || !q.id) return;
      try {
        // 正しいシグネチャ: (guildId, questDef, isSpecial=false)
        claimGuildQuestReward(gid, q, false);
        if (typeof window.tetoIncCounter === "function") {
          window.tetoIncCounter("guildQuestsCleared");
        }
      } catch (e) {}
    });

    // 戦闘ギルドスキルツリーの自動習得
    if (gs.combatGuildSkillPoints > 0 && Array.isArray(window.COMBAT_GUILD_TREE)) {
      const candidates = window.COMBAT_GUILD_TREE.filter(node => {
        if (!node || !node.id) return false;
        if (window.combatGuildTreeUnlocked && window.combatGuildTreeUnlocked[node.id]) return false;
        if (typeof isCombatTreeNodeUnlockable === "function") {
          return isCombatTreeNodeUnlockable(node);
        }
        return true;
      });
      if (candidates.length && typeof learnCombatGuildNode === "function") {
        const n = candidates[Math.floor(Math.random() * candidates.length)];
        if (n && n.id) {
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

    const hasPotion =
      inv.carryPotions && Object.keys(inv.carryPotions).length > 0;

    const needs = {
      needTraining: false,
      needEquip: false,
      needFoodPrep: false,
      needGather: false,
      needMoney: false,
      needHousingPay: false,
      needGuild: false,
      needRetreatBattle: false,
      needRetreatExplore: false
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

    const hpRate = (bs.hp != null && bs.hpMax) ? (bs.hp / bs.hpMax) : 1;

    if (hpRate < 0.25 && !hasPotion) {
      needs.needRetreatBattle = true;
      needs.needRetreatExplore = true;
    } else if (hpRate < 0.15) {
      needs.needRetreatExplore = true;
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

    tetoMaybeUseFoodDrink();
    tetoMaybePickCompanion();
    tetoMaybeRebirth();

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
      if (Math.random() < 0.7) {
        tetoDoOneGatherStep();
      } else {
        tetoMaybeUseMarket();
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

    // ライフ行動時に、たまに農園を世話・収穫・種植えする
    tetoMaybeCareFarm();
    tetoMaybeHarvestFarm();
    tetoMaybePlantFarmSeeds();

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

    const bs = tetoGetBattleStatus();
    const needs = tetoBalancedDetectNeeds();

    // 探索中
    if (window.isExploring) {
      if (bs.currentEnemy) {
        if (needs.needRetreatBattle && typeof window.tryEscape === "function") {
          window.tryEscape();
          if (typeof window.tetoIncCounter === "function") {
            window.tetoIncCounter("battleEscapes");
          }
          return;
        }
        tetoDoOneBattleStep();
        return;
      }

      if (needs.needRetreatExplore) {
        if (!window.isRetreating) {
          window.isRetreating = true;
          window.retreatTurnsLeft =
            (typeof window.RETREAT_TURNS === "number") ? window.RETREAT_TURNS : 3;

          if (typeof appendLog === "function") {
            appendLog("[テト] 危険と判断し、街への撤退を開始した…");
          }
          if (typeof updateReturnTownButton === "function") {
            updateReturnTownButton();
          }
        }
      }

      if (typeof doExploreEvent === "function") {
        doExploreEvent();
      } else if (typeof startRandomEncounter === "function") {
        startRandomEncounter();
      }
      return;
    }

    // 街側

    if (bs.currentEnemy) {
      if (needs.needRetreatBattle && typeof window.tryEscape === "function") {
        window.tryEscape();
        if (typeof window.tetoIncCounter === "function") {
          window.tetoIncCounter("battleEscapes");
        }
        return;
      }
      tetoDoOneBattleStep();
      return;
    }

    // 敗北した直後は、持ち物を見て立て直し優先
    const recentFail = window._tetoRecentBattleFailCount || 0;
    const recState   = window._tetoRecoveryState || { lastFailCount: 0, mode: null, ticksSinceStart: 0 };

    // 新しく敗北カウントが増えたタイミングでだけ、立て直しモードを開始（ログも1回だけ）
    if (recentFail > recState.lastFailCount) {
      const inv = tetoGetInventoryStatus();
      const eq  = tetoGetEquipStatus();
      const rs  = tetoGetResourceStatus();

      const hasWeapon = !!eq.equippedWeaponId;
      const hasArmor  = !!eq.equippedArmorId;
      const hasPotion = inv.carryPotions && Object.keys(inv.carryPotions).length > 0;

      const materialLikeCount =
        (inv.carryTools ? Object.keys(inv.carryTools).length : 0) +
        (inv.carryFoods ? Object.keys(inv.carryFoods).length : 0) +
        (inv.carryDrinks ? Object.keys(inv.carryDrinks).length : 0);

      const isBroke = !(rs.money > 50);

      const almostNothing =
        !hasWeapon && !hasArmor && !hasPotion &&
        materialLikeCount === 0 && isBroke;

      const hasSomethingToWorkWith =
        hasWeapon || hasArmor || hasPotion || materialLikeCount > 0;

      if (almostNothing) {
        if (typeof appendLog === "function") {
          appendLog("[テト] 死んだので、素材集めから立て直します。");
        }
        recState.mode = "gather";
      } else if (hasSomethingToWorkWith) {
        if (typeof appendLog === "function") {
          appendLog("[テト] 死んだので、装備やクラフトで立て直します。");
        }
        recState.mode = "craft";
      } else {
        recState.mode = null;
      }
      recState.lastFailCount  = recentFail;
      recState.ticksSinceStart = 0;
      window._tetoRecoveryState = recState;
    }

    // 立て直しモード中は、一定ターンだけ優先的に gather/craft を行う
    if (recState.mode === "gather" || recState.mode === "craft") {
      recState.ticksSinceStart++;
      window._tetoRecoveryState = recState;

      if (recState.mode === "gather") {
        tetoDoOneGatherStep();
        if (Math.random() < 0.2) {
          tetoMaybeAdjustGatherBases();
        }
      } else {
        tetoDoOneCraftStep();
        if (Math.random() < 0.2) {
          tetoDoOneGatherStep();
        }
        if (Math.random() < 0.1) {
          tetoMaybeRepairEquip();
        }
      }

      const MAX_RECOVERY_TICKS = 30;
      if (recState.ticksSinceStart >= MAX_RECOVERY_TICKS) {
        recState.mode = null;
        window._tetoRecoveryState = recState;
      }
      return;
    }

    // ここまで立て直しブロック

    // 街での通常ループ前に、たまに農園を処理
    tetoMaybeCareFarm();
    tetoMaybeHarvestFarm();
    tetoMaybePlantFarmSeeds();

    if (needs.needHousingPay) {
      tetoMaybePayHousingRent();
    }

    if (needs.needGuild && Math.random() < 0.4) {
      tetoMaybeJoinGuild();
      tetoMaybeAcceptGuildQuest();
      tetoMaybeClaimGuildRewards();
    }

    if (needs.needTraining || needs.needEquip) {
      if (bs.hp != null && bs.hpMax != null && bs.hp < bs.hpMax * 0.3) {
        tetoDoOneCraftStep();
        // クラフトが続けてスキップされている場合は採取にフォールバックして立て直しを進める
        if ((window._tetoRecentCraftSkipCount || 0) >= 3) {
          tetoDoOneGatherStep();
          window._tetoRecentCraftSkipCount = 0;
        }
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
      const roll2 = Math.random();
      if (roll2 < 0.35) {
        tetoDoOneBattleStep();
      } else if (roll2 < 0.65) {
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
    window.tetoGetBattleStatus = tetoGetBattleStatus;
    window.tetoGetGatherStatus = tetoGetGatherStatus;
    window.tetoGetCraftStatus = tetoGetCraftStatus;
    window.tetoGetEquipStatus = tetoGetEquipStatus;
    window.tetoGetGatherBaseStatus = tetoGetGatherBaseStatus;
    window.tetoGetInventoryStatus = tetoGetInventoryStatus;
    window.tetoGetGuildStatus = tetoGetGuildStatus;
    window.tetoGetHousingStatus = tetoGetHousingStatus;
    window.tetoGetResourceStatus = tetoGetResourceStatus;

    window.tetoTickBattleMain = tetoTickBattleMain;
    window.tetoTickGatherMain = tetoTickGatherMain;
    window.tetoTickCraftMain = tetoTickCraftMain;
    window.tetoTickLifeMain = tetoTickLifeMain;
    window.tetoTickMixed = tetoTickMixed;
    window.tetoTickBalancedMain = tetoTickBalancedMain;
  }

})();