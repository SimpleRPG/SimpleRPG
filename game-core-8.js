// game-core-8.js
// 撃破処理・ポーション/戦闘アイテム・料理/飲み物・採取拠点（自動採取）まわり
//

// =======================
// 撃破処理（経験値・お金・ボスフラグ）
// =======================

// ★戦闘勝利カウンタ（装備耐久用）
window.battleCountSinceDurability = window.battleCountSinceDurability || 0;

function onEnemyDefeatedCore(enemyInst, killFlag, killSource) {
  if (!enemyInst) return;

  // ===== 経験値加算 =====
  const expGain = (typeof getBattleExpPerWin === "function")
    ? getBattleExpPerWin(enemyInst)
    : (enemyInst.exp || BASE_EXP_PER_BATTLE || 5);

  // ===== ベースゴールド（敵インスタンスの money、なければ10G） =====
  let moneyGain = enemyInst.money != null ? enemyInst.money : 10;

  // ===== スキルツリー：戦闘ゴールドボーナス =====
  if (typeof battleSkillTreeBonus === "object" &&
      typeof battleSkillTreeBonus.moneyGainRateBattle === "number" &&
      battleSkillTreeBonus.moneyGainRateBattle > 0) {
    const r = battleSkillTreeBonus.moneyGainRateBattle;
    moneyGain = Math.floor(moneyGain * (1 + r));
  }

  // ===== 日替わり職業ボーナス：戦闘ゴールド＋ドロップ率 =====
  let dropRateBonus = 1.0;
  if (typeof getDailyBattleBonus === "function" &&
      typeof jobId === "number") {
    const b = getDailyBattleBonus(jobId);
    if (b) {
      if (typeof b.goldRate === "number" && b.goldRate > 0) {
        moneyGain = Math.floor(moneyGain * b.goldRate);
      }
      if (typeof b.dropRate === "number" && b.dropRate > 0) {
        dropRateBonus = b.dropRate;
      }
    }
  }

  appendLog(
    `${enemyInst.name}を倒した！ 経験値${expGain}と${moneyGain}Gを手に入れた`
  );

  addExp(expGain);
  money += moneyGain;

  if (typeof rollEnemyDrops === "function") {
    rollEnemyDrops(enemyInst.id, dropRateBonus);
  }

  if (typeof addPetExp === "function") {
    addPetExp(Math.floor(expGain / 2));
  }

  if (typeof handleHungerThirstOnAction === "function") {
    handleHungerThirstOnAction("battleWin");
  }

  window.battleCountSinceDurability = (window.battleCountSinceDurability || 0) + 1;

  if (window.battleCountSinceDurability >= 30) {
    window.battleCountSinceDurability = 0;

    let reduced = false;

    if (typeof equippedWeaponIndex === "number" &&
        Array.isArray(window.weaponInstances)) {
      const inst = window.weaponInstances[equippedWeaponIndex];
      if (inst) {
        inst.durability = Math.max(0, (inst.durability ?? MAX_DURABILITY) - 1);
        reduced = true;
      }
    }

    if (typeof equippedArmorIndex === "number" &&
        Array.isArray(window.armorInstances)) {
      const inst = window.armorInstances[equippedArmorIndex];
      if (inst) {
        inst.durability = Math.max(0, (inst.durability ?? MAX_DURABILITY) - 1);
        reduced = true;
      }
    }

    if (reduced) {
      appendLog("戦いを重ね、装備の耐久が少し消耗した。");
    }
  }

  if (enemyInst.isBoss && typeof onBossDefeated === "function") {
    onBossDefeated();
  } else {
    endBattleCommon();
  }

  updateDisplay();
}

// =======================
// ポーション効果適用（フィールド / 戦闘共通）
// =======================

function applyPotionEffect(p, inBattle) {
  if (!p) return;

  function applyItemBoost(baseVal) {
    let val = baseVal;

    if (typeof isAlchemist === "function" && isAlchemist()) {
      val = Math.floor(val * 1.3);
    }

    if (typeof itemBoostTurnRemain === "number" &&
        itemBoostTurnRemain > 0 &&
        typeof itemBoostRate === "number" &&
        itemBoostRate > 0) {
      val = Math.floor(val * (1 + itemBoostRate));
    }

    return val;
  }

  if ((p.type === POTION_TYPE_HP || p.type === POTION_TYPE_BOTH) && typeof hp !== "undefined") {
    const max = typeof hpMax === "number" ? hpMax : hp;
    let val = Math.floor((max * (p.power || 0)) + (p.flat || 0));

    val = applyItemBoost(val);

    if (val > 0) {
      hp = Math.max(0, Math.min(max, hp + val));
    }
  }

  if ((p.type === POTION_TYPE_MP || p.type === POTION_TYPE_BOTH) && typeof mp !== "undefined") {
    const max = typeof mpMax === "number" ? mpMax : mp;
    let val = Math.floor((max * (p.power || 0)) + (p.flat || 0));

    val = applyItemBoost(val);

    if (val > 0) {
      mp = Math.max(0, Math.min(max, mp + val));
    }
  }

  if (inBattle && typeof addPotionStatusToPlayer === "function") {
    if (p.id === "buffAtk_T1") {
      addPotionStatusToPlayer("potion_atk_up_T1", 3);
    } else if (p.id === "buffAtk_T2") {
      addPotionStatusToPlayer("potion_atk_up_T2", 3);
    } else if (p.id === "buffAtk_T3") {
      addPotionStatusToPlayer("potion_atk_up_T3", 3);
    }

    if (p.id === "buffDef_T1") {
      addPotionStatusToPlayer("potion_def_up_T1", 3);
    } else if (p.id === "buffDef_T2") {
      addPotionStatusToPlayer("potion_def_up_T2", 3);
    } else if (p.id === "buffDef_T3") {
      addPotionStatusToPlayer("potion_def_up_T3", 3);
    }

    if (p.id === "cleanse_T1") {
      addPotionStatusToPlayer("potion_regen_T1", 3);
    } else if (p.id === "cleanse_T2") {
      addPotionStatusToPlayer("potion_regen_T2", 3);
    } else if (p.id === "cleanse_T3") {
      addPotionStatusToPlayer("potion_regen_T3", 3);
    }
  }

  if (p.type === POTION_TYPE_DAMAGE && inBattle && currentEnemy) {
    const dmg = typeof p.damage === "number" ? p.damage : (p.value || 0);
    if (dmg > 0) {
      const beforeHp = enemyHp;
      enemyHp = Math.max(0, enemyHp - dmg);
      appendLog(`${p.name} を投げつけた！ ${currentEnemy.name}に${dmg}ダメージ！（HP ${beforeHp} → ${enemyHp}）`);
      if (enemyHp <= 0) {
        enemyHp = 0;
        winBattle(true, "item");
      }
    }
  }
}

// =======================
// アイテム用セレクト再描画（ポーション＋道具）
// =======================

function refreshUseItemSelect() {
  const sel = document.getElementById("useItemSelect");
  if (!sel) return;

  const prev = lastSelectedFieldPotionId || sel.value || null;

  sel.innerHTML = "";

  if (typeof carryPotions === "object" && Array.isArray(potions)) {
    Object.keys(carryPotions).forEach(id => {
      const cnt = carryPotions[id] || 0;
      if (cnt <= 0) return;
      const p = potions.find(x => x.id === id);
      const name = p ? p.name : id;
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${name}（${cnt}）`;
      sel.appendChild(opt);
    });
  }

  if (!sel.options.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "手持ちポーションなし";
    sel.appendChild(opt);
  }

  if (prev && Array.from(sel.options).some(o => o.value === prev)) {
    sel.value = prev;
  }

  lastSelectedFieldPotionId = sel.value || null;
}

function refreshBattleItemSelect() {
  const sel = document.getElementById("battleItemSelect");
  if (!sel) return;

  const categorySel = document.getElementById("battleItemCategory");
  const category = categorySel ? (categorySel.value || window.lastBattleItemCategory || "potion")
                               : (window.lastBattleItemCategory || "potion");

  const prev = lastSelectedBattleItemId || sel.value || null;

  sel.innerHTML = "";

  if (category === "potion") {
    if (typeof carryPotions !== "undefined" && Array.isArray(potions)) {
      Object.keys(carryPotions).forEach(id => {
        const cnt = carryPotions[id] || 0;
        if (cnt <= 0) return;
        const p = potions.find(x => x.id === id);
        const name = p ? p.name : id;
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = `${name}（${cnt}）`;
        sel.appendChild(opt);
      });
    }

    if (!sel.options.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "手持ちポーションなし";
      sel.appendChild(opt);
    }
  } else if (category === "tool") {
    if (typeof carryTools !== "undefined") {
      Object.keys(carryTools).forEach(id => {
        const cnt = carryTools[id] || 0;
        if (cnt <= 0) return;
        
        // ★修正: ITEM_META を優先して名前を取得
        let label = id;
        if (typeof getItemName === "function") {
          const name = getItemName(id);
          if (name) label = name;
        } else if (typeof getItemMeta === "function") {
          const meta = getItemMeta(id);
          if (meta && meta.name) label = meta.name;
        }
        
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = `${label}（${cnt}）`;
        sel.appendChild(opt);
      });
    }

    if (!sel.options.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "手持ち道具なし";
      sel.appendChild(opt);
    }
  } else {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "アイテムなし";
    sel.appendChild(opt);
  }

  if (prev && Array.from(sel.options).some(o => o.value === prev)) {
    sel.value = prev;
  } else if (sel.options.length > 0) {
    sel.selectedIndex = 0;
  }

  lastSelectedBattleItemId = sel.value || null;
  window.lastBattleItemCategory = category;

  if (categorySel) {
    categorySel.value = category;
  }
}

function onBattleItemCategoryChanged() {
  refreshBattleItemSelect();
}

// =======================
// ギルド通知用ヘルパー
// =======================

function getTierFromItemId(id) {
  if (!id) return null;
  if (id.endsWith("_T1") || id.endsWith("T1")) return "T1";
  if (id.endsWith("_T2") || id.endsWith("T2")) return "T2";
  if (id.endsWith("_T3") || id.endsWith("T3")) return "T3";
  return null;
}

// ★修正: 使用個数を渡せるようにする（デフォルト1）
// count は「今回消費した個数」想定
function notifyAlchUse(kind, itemId, count) {
  if (typeof onAlchConsumableUsedForGuild === "function") {
    const tier = getTierFromItemId(itemId);
    const amount = (typeof count === "number" && count > 0) ? count : 1;
    onAlchConsumableUsedForGuild({ kind, itemId, tier, amount });
  }
}

// ★追加: 料理ギルド用（食べる or 売る）通知
// kind: "eat" | "drink" | "sell", amount: 消費/売却した個数
function notifyCookingUseOrSell(kind, itemId, amount) {
  if (typeof addDailyProgressFromProduction === "function") {
    const n = (typeof amount === "number" && amount > 0) ? amount : 1;
    addDailyProgressFromProduction({
      kind: "cooking_use_or_sell",
      amount: n,
      itemId: itemId,
      meta: { useKind: kind }
    });
  }
}

function notifyBuffFoodOrDrink(recipeEffect) {
  if (!recipeEffect || !recipeEffect.statusId) return;
  if (typeof onBuffFoodEatenForGuild === "function") {
    onBuffFoodEatenForGuild();
  }
}

// =======================
// アイテム使用（フィールド / 戦闘）
// =======================

function usePotionOutsideBattle() {
  if (window.currentEnemy) {
    appendLog("戦闘中はここからポーションを使えない！");
    return;
  }

  const sel = document.getElementById("useItemSelect");
  if (!sel || !sel.value) {
    appendLog("使うアイテムを選んでください");
    return;
  }
  const id = sel.value;

  if (typeof carryPotions !== "object") {
    appendLog("ポーション所持データが見つからない");
    refreshUseItemSelect();
    return;
  }
  const have = carryPotions[id] || 0;
  if (have <= 0) {
    appendLog("そのアイテムを持っていない");
    refreshUseItemSelect();
    return;
  }

  const p = potions.find(x => x.id === id);
  if (!p) {
    appendLog("そのアイテムは存在しない");
    refreshUseItemSelect();
    return;
  }

  lastSelectedFieldPotionId = id;

  const hpFull = (typeof hpMax === "number") ? (hp >= hpMax) : true;
  const mpFull = (typeof mpMax === "number") ? (mp >= mpMax) : true;
  let willHaveEffect = false;

  if (p.type === POTION_TYPE_HP && !hpFull) {
    willHaveEffect = true;
  } else if (p.type === POTION_TYPE_MP && !mpFull) {
    willHaveEffect = true;
  } else if (p.type === POTION_TYPE_BOTH && (!hpFull || !mpFull)) {
    willHaveEffect = true;
  } else if (p.type === POTION_TYPE_DAMAGE) {
    willHaveEffect = false;
  }

  if (!willHaveEffect) {
    appendLog("今それを使っても効果がなさそうだ。");
    return;
  }

  const prevHp = hp;
  const prevMp = mp;

  applyPotionEffect(p, false);

  carryPotions[id] = have - 1;
  if (carryPotions[id] <= 0) {
    delete carryPotions[id];
  }

  if (p.type === POTION_TYPE_HP) {
    const healed = hp - prevHp;
    appendLog(`${p.name} を使用した（HP ${prevHp} → ${hp}、+${healed}）`);
  } else if (p.type === POTION_TYPE_MP) {
    const healed = mp - prevMp;
    appendLog(`${p.name} を使用した（MP ${prevMp} → ${mp}、+${healed}）`);
  } else if (p.type === POTION_TYPE_BOTH) {
    const healedHp = hp - prevHp;
    const healedMp = mp - prevMp;
    appendLog(`${p.name} を使用した（HP ${prevHp} → ${hp}、+${healedHp} / MP ${prevMp} → ${mp}、+${healedMp}）`);
  }

  // ★追加: テト用アイテム使用ログ（フィールドポーション）
  if (typeof window.tetoRecordItemUse === "function") {
    try {
      window.tetoRecordItemUse("potion", id, {
        context: "field",
        hpBefore: prevHp,
        hpAfter: hp,
        mpBefore: prevMp,
        mpAfter: mp
      });
    } catch (e) {}
  }

  // 1個消費したので count=1
  notifyAlchUse("potion", p.id, 1);

  refreshUseItemSelect();
  updateDisplay();
}

function useBattleItem() {
  const sel = document.getElementById("battleItemSelect");
  if (!sel || !sel.value) {
    appendLog("戦闘で使うアイテムを選んでください");
    return;
  }

  const categorySel = document.getElementById("battleItemCategory");
  const category = categorySel ? (categorySel.value || window.lastBattleItemCategory || "potion")
                               : (window.lastBattleItemCategory || "potion");

  const id = sel.value;
  lastSelectedBattleItemId = id;
  window.lastBattleItemCategory = category;

  if (category === "potion") {
    if (typeof carryPotions === "undefined") {
      appendLog("ポーション所持データが見つからない");
      refreshBattleItemSelect();
      return;
    }
    const have = carryPotions[id] || 0;
    if (have <= 0) {
      appendLog("そのポーションを持っていない");
      refreshBattleItemSelect();
      return;
    }

    const p = potions.find(x => x.id === id);
    if (!p) {
      appendLog("そのアイテムは存在しない");
      refreshBattleItemSelect();
      return;
    }

    const prevHp = hp;
    const prevMp = mp;

    applyPotionEffect(p, true);

    carryPotions[id] = have - 1;
    if (carryPotions[id] <= 0) {
      delete carryPotions[id];
    }

    if (p.type === POTION_TYPE_HP) {
      const healed = hp - prevHp;
      appendLog(`戦闘中に ${p.name} を使用した（HP ${prevHp} → ${hp}、+${healed}）`);
    } else if (p.type === POTION_TYPE_MP) {
      const healed = mp - prevMp;
      appendLog(`戦闘中に ${p.name} を使用した（MP ${prevMp} → ${mp}、+${healed}）`);
    } else if (p.type === POTION_TYPE_BOTH) {
      const healedHp = hp - prevHp;
      const healedMp = mp - prevMp;
      appendLog(`戦闘中に ${p.name} を使用した（HP ${prevHp} → ${hp}、+${healedHp} / MP ${prevMp} → ${mp}、+${healedMp}）`);
    }

    if (p.id === "buffAtk_T1" || p.id === "buffAtk_T2" || p.id === "buffAtk_T3") {
      appendLog("身体に力が満ち、攻撃がずしりと重くなった！");
    } else if (p.id === "buffDef_T1" || p.id === "buffDef_T2" || p.id === "buffDef_T3") {
      appendLog("体が軽くなり、敵の攻撃をいなしやすくなった！");
    } else if (p.id === "cleanse_T1" || p.id === "cleanse_T2" || p.id === "cleanse_T3") {
      appendLog("澄んだ薬が体内を巡り、傷の治りが早くなった気がする…");
    }

    // ★追加: テト用アイテム使用ログ（戦闘ポーション）
    if (typeof window.tetoRecordItemUse === "function") {
      try {
        window.tetoRecordItemUse("potion", id, {
          context: "battle",
          hpBefore: prevHp,
          hpAfter: hp,
          mpBefore: prevMp,
          mpAfter: mp
        });
      } catch (e) {}
    }

    // 1個消費したので count=1
    notifyAlchUse("potion", p.id, 1);

  } else if (category === "tool") {
    if (typeof carryTools === "undefined") {
      appendLog("道具所持データが見つからない");
      refreshBattleItemSelect();
      return;
    }
    const have = carryTools[id] || 0;
    if (have <= 0) {
      appendLog("その道具を持っていない");
      refreshBattleItemSelect();
      return;
    }

    const BOMB_DAMAGE_TABLE = {
      bomb:           7,
      bomb_T1:       15,
      bomb_T2:       30,
      bomb_T3:       60,
      molotov_T1:    12,
      poisonNeedle_T1: 4
    };

    carryTools[id] = have - 1;
    if (carryTools[id] <= 0) {
      delete carryTools[id];
    }

    let beforeHp = enemyHp;
    let afterHp = enemyHp;

    if (!currentEnemy) {
      appendLog("攻撃する敵がいない");
    } else {
      let dmg = BOMB_DAMAGE_TABLE[id] || 5;

      if (typeof isAlchemist === "function" && isAlchemist()) {
        dmg = Math.floor(dmg * 2);

        if (typeof itemBoostTurnRemain === "number" &&
            itemBoostTurnRemain > 0) {
          dmg = Math.floor(dmg * 1.5);
        }
      }

      beforeHp = enemyHp;
      enemyHp = Math.max(0, enemyHp - dmg);
      afterHp = enemyHp;

      function rollStatusApply(baseRate) {
        let rate = baseRate;
        if (typeof isAlchemist === "function" && isAlchemist()) {
          rate = Math.min(1, rate + 0.3);
        }
        return Math.random() < rate;
      }

      // ★修正: ITEM_META を使ってアイテム名を取得
      let itemName = id;
      if (typeof getItemName === "function") {
        const name = getItemName(id);
        if (name) itemName = name;
      } else if (typeof getItemMeta === "function") {
        const meta = getItemMeta(id);
        if (meta && meta.name) itemName = meta.name;
      }

      if (id === "molotov_T1") {
        appendLog(`${itemName}を投げつけた！ ${currentEnemy.name}に${dmg}ダメージ！（HP ${beforeHp} → ${enemyHp}）`);
        if (typeof addStatusToEnemy === "function") {
          if (rollStatusApply(0.7)) {
            addStatusToEnemy("burn");
          } else {
            appendLog("しかし炎はうまく相手を傷つけなかった…");
          }
        }
      } else if (id === "poisonNeedle_T1") {
        appendLog(`${itemName}を投げつけた！ ${currentEnemy.name}に${dmg}ダメージ！（HP ${beforeHp} → ${enemyHp}）`);
        if (typeof addStatusToEnemy === "function") {
          if (rollStatusApply(0.7)) {
            addStatusToEnemy("poison");
          } else {
            appendLog("しかし毒はうまく効かなかった…");
          }
        }
      } else if (id === "paralyzeGas_T1") {
        if (beforeHp === enemyHp && dmg === 0) {
          appendLog(`${itemName}を投げつけた！ ${currentEnemy.name}をガスで包んだ！`);
        } else {
          appendLog(`${itemName}を投げつけた！ ${currentEnemy.name}に${dmg}ダメージ！（HP ${beforeHp} → ${enemyHp}）`);
        }
        if (typeof addStatusToEnemy === "function") {
          if (rollStatusApply(0.7)) {
            addStatusToEnemy("paralyze");
          } else {
            appendLog("しかし麻痺はうまく効かなかった…");
          }
        }
      } else {
        appendLog(`${itemName}を投げつけた！ ${currentEnemy.name}に${dmg}ダメージ！（HP ${beforeHp} → ${enemyHp}）`);
      }

      // 1個消費したので count=1
      notifyAlchUse("tool", id, 1);

      // ★追加: テト用アイテム使用ログ（戦闘道具）
      if (typeof window.tetoRecordItemUse === "function") {
        try {
          window.tetoRecordItemUse("tool", id, {
            context: "battle",
            hpBefore: hp,
            hpAfter: hp,   // プレイヤーHPは変化しないのでそのまま
            mpBefore: mp,
            mpAfter: mp
          });
        } catch (e) {}
      }

      if (enemyHp <= 0) {
        enemyHp = 0;
        winBattle(true, "item");
        return;
      }
    }
  } else {
    appendLog("不明なアイテムカテゴリです");
    return;
  }

  refreshBattleItemSelect();

  if (currentEnemy) {
    enemyTurn();
    tickStatusesTurnEndForBoth();
  }
  updateDisplay();
}

// =======================
// 料理効果共通ヘルパ
// =======================

function applyFoodEffect(effect, foodId) {
  if (!effect) return;

  if (effect.statusId && typeof addFoodStatusToPlayer === "function") {
    addFoodStatusToPlayer(effect.statusId, effect.durationTurns);
  }

  if (typeof restoreHungerThirst === "function") {
    const h = effect.hungerRecover || 0;
    const t = effect.thirstRecover || 0;
    restoreHungerThirst(h, t);
  }

  if (typeof hp !== "undefined" && typeof hpMax !== "undefined" &&
      typeof effect.hpRegen === "number") {
    hp = Math.min(hpMax, hp + effect.hpRegen);
  }
  if (typeof mp !== "undefined" && typeof mpMax !== "undefined" &&
      typeof effect.mpRegen === "number") {
    mp = Math.min(mpMax, mp + effect.mpRegen);
  }
  if (typeof sp !== "undefined" && typeof spMax !== "undefined" &&
      typeof effect.spRegen === "number") {
    sp = Math.min(spMax, sp + effect.spRegen);
  }

  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

function applyDrinkEffect(effect, drinkId) {
  if (!effect) return;

  if (effect.statusId && typeof addDrinkStatusToPlayer === "function") {
    addDrinkStatusToPlayer(effect.statusId, effect.durationTurns);
  }

  if (typeof restoreHungerThirst === "function") {
    const h = effect.hungerRecover || 0;
    const t = effect.thirstRecover || 0;
    restoreHungerThirst(h, t);
  }

  if (typeof hp !== "undefined" && typeof hpMax !== "undefined" &&
      typeof effect.hpRegen === "number") {
    hp = Math.min(hpMax, hp + effect.hpRegen);
  }
  if (typeof mp !== "undefined" && typeof mpMax !== "undefined" &&
      typeof effect.mpRegen === "number") {
    mp = Math.min(mpMax, mp + effect.mpRegen);
  }
  if (typeof sp !== "undefined" && typeof spMax !== "undefined" &&
      typeof effect.spRegen === "number") {
    sp = Math.min(spMax, sp + effect.spRegen);
  }

  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

// =======================
// 料理・飲み物使用（フィールド）
// =======================

function eatFoodInField() {
  const sel = document.getElementById("fieldFoodSelect");
  if (!sel || !sel.value) {
    appendLog("食べる料理を選んでください");
    return;
  }
  const id = sel.value;
  const have = (carryFoods && carryFoods[id]) || 0;
  if (have <= 0) {
    appendLog("その料理を持っていない");
    if (typeof refreshCarryFoodDrinkSelects === "function") {
      refreshCarryFoodDrinkSelects();
    }
    return;
  }

  const recipe = (typeof COOKING_RECIPES !== "undefined" && COOKING_RECIPES.food)
    ? COOKING_RECIPES.food.find(r => r.id === id)
    : null;
  if (!recipe || !recipe.effect) {
    appendLog("その料理の効果データが見つからない");
    return;
  }

  const prevHp = hp;
  const prevMp = mp;

  applyFoodEffect(recipe.effect, id);

  carryFoods[id] = have - 1;
  if (carryFoods[id] <= 0) delete carryFoods[id];

  appendLog(`${recipe.name} を食べた！`);

  // ★追加: テト用アイテム使用ログ（フィールド料理）
  if (typeof window.tetoRecordItemUse === "function") {
    try {
      window.tetoRecordItemUse("food", id, {
        context: "field",
        hpBefore: prevHp,
        hpAfter: hp,
        mpBefore: prevMp,
        mpAfter: mp
      });
    } catch (e) {}
  }

  // ★追加: 料理ギルドデイリー（食べる or 売る）
  if (typeof notifyCookingUseOrSell === "function") {
    notifyCookingUseOrSell("eat", id, 1);
  }

  notifyBuffFoodOrDrink(recipe.effect);

  if (typeof refreshCarryFoodDrinkSelects === "function") {
    refreshCarryFoodDrinkSelects();
  }
}

function drinkInField() {
  const sel = document.getElementById("fieldDrinkSelect");
  if (!sel || !sel.value) {
    appendLog("飲むアイテムを選んでください");
    return;
  }
  const id = sel.value;
  const have = (carryDrinks && carryDrinks[id]) || 0;
  if (have <= 0) {
    appendLog("その飲み物を持っていない");
    if (typeof refreshCarryFoodDrinkSelects === "function") {
      refreshCarryFoodDrinkSelects();
    }
    return;
  }

  const recipe = (typeof COOKING_RECIPES !== "undefined" && COOKING_RECIPES.drink)
    ? COOKING_RECIPES.drink.find(r => r.id === id)
    : null;
  if (!recipe || !recipe.effect) {
    appendLog("その飲み物の効果データが見つからない");
    return;
  }

  const prevHp = hp;
  const prevMp = mp;

  applyDrinkEffect(recipe.effect, id);

  carryDrinks[id] = have - 1;
  if (carryDrinks[id] <= 0) delete carryDrinks[id];

  appendLog(`${recipe.name} を飲んだ！`);

  // ★追加: テト用アイテム使用ログ（フィールド飲み物）
  if (typeof window.tetoRecordItemUse === "function") {
    try {
      window.tetoRecordItemUse("drink", id, {
        context: "field",
        hpBefore: prevHp,
        hpAfter: hp,
        mpBefore: prevMp,
        mpAfter: mp
      });
    } catch (e) {}
  }

  // ★追加: 料理ギルドデイリー（食べる or 売る）
  if (typeof notifyCookingUseOrSell === "function") {
    notifyCookingUseOrSell("drink", id, 1);
  }

  notifyBuffFoodOrDrink(recipe.effect);

  if (typeof refreshCarryFoodDrinkSelects === "function") {
    refreshCarryFoodDrinkSelects();
  }
}

// =======================
// 採取拠点・自動採取
// =======================

const GATHER_BASE_MATERIAL_KEYS = ["wood","ore","herb","cloth","leather","water"];

const GATHER_SKILL_LABEL_JA = {
  wood:   "木",
  ore:    "鉱石",
  herb:   "草",
  cloth:  "布",
  leather:"皮",
  water:  "水"
};
function getGatherSkillLabel(matKey) {
  return GATHER_SKILL_LABEL_JA[matKey] || matKey;
}

const gatherBases = {};
GATHER_BASE_MATERIAL_KEYS.forEach(k => {
  gatherBases[k] = { level: 0, mode: "normal" };
});

const GATHER_BASE_LEVEL_TABLE = {
  1: {
    failRate: 0.5,
    t1Min: 0,
    t1Max: 1,
    t2Chance: 0.0,
    t2Amount: 0
  },
  2: {
    failRate: 0.2,
    t1Min: 1,
    t1Max: 2,
    t2Chance: 0.0,
    t2Amount: 0
  },
  3: {
    failRate: 0.1,
    t1Min: 1,
    t1Max: 3,
    t2Chance: 0.1,
    t2Amount: 1
  }
};

function getGatherBaseLevel(matKey) {
  const base = gatherBases[matKey];
  return base ? (base.level || 0) : 0;
}

function setGatherBaseLevel(matKey, level) {
  if (!GATHER_BASE_MATERIAL_KEYS.includes(matKey)) return;
  const lv = Math.max(0, Math.min(3, level | 0));
  gatherBases[matKey] = gatherBases[matKey] || {};
  gatherBases[matKey].level = lv;
  if (!gatherBases[matKey].mode) {
    gatherBases[matKey].mode = "normal";
  }
}

function getGatherBaseMode(matKey) {
  const base = gatherBases[matKey];
  return base && base.mode ? base.mode : "normal";
}

function setGatherBaseMode(matKey, mode) {
  if (!GATHER_BASE_MATERIAL_KEYS.includes(matKey)) return;
  if (mode !== "normal" && mode !== "quantity" && mode !== "quality") return;
  gatherBases[matKey] = gatherBases[matKey] || { level: 0 };
  gatherBases[matKey].mode = mode;
  const label = getGatherSkillLabel(matKey);
  if (mode === "normal") {
    appendLog(`採取拠点(${label})の方針をノーマルに戻した。`);
  } else if (mode === "quantity") {
    appendLog(`採取拠点(${label})の方針を量特化に変更した。`);
  } else if (mode === "quality") {
    appendLog(`採取拠点(${label})の方針を質特化に変更した。`);
  }
}

function logGatherBaseRequiredMats(matKey, currentLv, nextLv, needInter, needStar) {
  let lines = [];
  const label = getGatherSkillLabel(matKey);
  lines.push(`採取拠点(${label}) Lv${currentLv} → Lv${nextLv} に必要な中間素材:`);
  for (const iid in needInter) {
    const need = needInter[iid] || 0;
    const have = intermediateMats[iid] || 0;
    lines.push(`- ${iid}: 必要 ${need} 個 / 所持 ${have} 個`);
  }
  if (needStar > 0) {
    const haveStar = getStarShardCountForGather();
    lines.push(`- ${RARE_GATHER_ITEM_ID}: 必要 ${needStar} 個 / 所持 ${haveStar} 個`);
  }
  appendLog(lines.join("\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n"));
}

// =======================
// 星屑（採取拠点強化用）ヘルパー（ITEM_META 版）
// =======================

function getStarShardCountForGather() {
  if (typeof getItemCountByMeta !== "function") return 0;
  return getItemCountByMeta(RARE_GATHER_ITEM_ID) || 0;
}

function consumeStarShardForGather(num) {
  num = num || 0;
  if (num <= 0) return true;
  if (typeof consumeItemByMeta !== "function") return false;
  return consumeItemByMeta(RARE_GATHER_ITEM_ID, num);
}

const GATHER_BASE_UPGRADE_DATA = {
  wood: {
    1: {
      nextLevel: 1,
      reqGatherLv: 5,
      costs: {
        intermediate: { woodPlank_T1: 10, clothBolt_T1: 5, toughLeather_T1: 5 },
        starShard: 0
      }
    },
    2: {
      nextLevel: 2,
      reqGatherLv: 20,
      costs: {
        intermediate: { woodPlank_T2: 15, clothBolt_T2: 8, toughLeather_T2: 8 },
        starShard: 0
      }
    },
    3: {
      nextLevel: 3,
      reqGatherLv: 30,
      costs: {
        intermediate: { woodPlank_T3: 20, clothBolt_T3: 10, toughLeather_T3: 10 },
        starShard: 1
      }
    }
  },
  ore: {
    1: {
      nextLevel: 1,
      reqGatherLv: 5,
      costs: {
        intermediate: { ironIngot_T1: 10, woodPlank_T1: 5, clothBolt_T1: 5 },
        starShard: 0
      }
    },
    2: {
      nextLevel: 2,
      reqGatherLv: 20,
      costs: {
        intermediate: { ironIngot_T2: 15, woodPlank_T2: 8, clothBolt_T2: 8 },
        starShard: 0
      }
    },
    3: {
      nextLevel: 3,
      reqGatherLv: 30,
      costs: {
        intermediate: { ironIngot_T3: 20, woodPlank_T3: 10, clothBolt_T3: 10 },
        starShard: 1
      }
    }
  },
  herb: {
    1: {
      nextLevel: 1,
      reqGatherLv: 5,
      costs: {
        intermediate: { clothBolt_T1: 8, woodPlank_T1: 4, toughLeather_T1: 4 },
        starShard: 0
      }
    },
    2: {
      nextLevel: 2,
      reqGatherLv: 20,
      costs: {
        intermediate: { clothBolt_T2: 12, woodPlank_T2: 6, toughLeather_T2: 6 },
        starShard: 0
      }
    },
    3: {
      nextLevel: 3,
      reqGatherLv: 30,
      costs: {
        intermediate: { clothBolt_T3: 16, woodPlank_T3: 8, toughLeather_T3: 8 },
        starShard: 1
      }
    }
  },
  cloth: {
    1: {
      nextLevel: 1,
      reqGatherLv: 5,
      costs: {
        intermediate: { clothBolt_T1: 10, toughLeather_T1: 5, woodPlank_T1: 5 },
        starShard: 0
      }
    },
    2: {
      nextLevel: 2,
      reqGatherLv: 20,
      costs: {
        intermediate: { clothBolt_T2: 15, toughLeather_T2: 8, woodPlank_T2: 8 },
        starShard: 0
      }
    },
    3: {
      nextLevel: 3,
      reqGatherLv: 30,
      costs: {
        intermediate: { clothBolt_T3: 20, toughLeather_T3: 10, woodPlank_T3: 10 },
        starShard: 1
      }
    }
  },
  leather: {
    1: {
      nextLevel: 1,
      reqGatherLv: 5,
      costs: {
        intermediate: { toughLeather_T1: 10, clothBolt_T1: 5, ironIngot_T1: 5 },
        starShard: 0
      }
    },
    2: {
      nextLevel: 2,
      reqGatherLv: 20,
      costs: {
        intermediate: { toughLeather_T2: 15, clothBolt_T2: 8, ironIngot_T2: 8 },
        starShard: 0
      }
    },
    3: {
      nextLevel: 3,
      reqGatherLv: 30,
      costs: {
        intermediate: { toughLeather_T3: 20, clothBolt_T3: 10, ironIngot_T3: 10 },
        starShard: 1
      }
    }
  },
  water: {
    1: {
      nextLevel: 1,
      reqGatherLv: 5,
      costs: {
        intermediate: { ironIngot_T1: 6, clothBolt_T1: 4, toughLeather_T1: 4 },
        starShard: 0
      }
    },
    2: {
      nextLevel: 2,
      reqGatherLv: 20,
      costs: {
        intermediate: { ironIngot_T2: 10, clothBolt_T2: 6, toughLeather_T2: 6 },
        starShard: 0
      }
    },
    3: {
      nextLevel: 3,
      reqGatherLv: 30,
      costs: {
        intermediate: { ironIngot_T3: 14, clothBolt_T3: 8, toughLeather_T3: 8 },
        starShard: 1
      }
    }
  }
};

function tryUpgradeGatherBase(matKey) {
  if (!GATHER_BASE_MATERIAL_KEYS.includes(matKey)) {
    appendLog("この素材には採取拠点はない。");
    return;
  }
  const currentLv = getGatherBaseLevel(matKey);
  if (currentLv >= 3) {
    appendLog("これ以上この拠点は強化できない。");
    return;
  }

  const nextLv = currentLv + 1;
  const defAll = GATHER_BASE_UPGRADE_DATA[matKey];
  if (!defAll) {
    appendLog("この拠点の強化データが存在しない。");
    return;
  }
  const def = defAll[nextLv];
  if (!def) {
    appendLog("このレベルの強化データが存在しない。");
    return;
  }

  if (!gatherSkills || !gatherSkills[matKey]) {
    appendLog("採取スキルデータが見つからない。");
    return;
  }
  const skLv = gatherSkills[matKey].lv || 0;
  if (skLv < def.reqGatherLv) {
    const labelNeed = getGatherSkillLabel(matKey);
    appendLog(`この拠点をLv${nextLv}にするには、採取スキル(${labelNeed}) Lv${def.reqGatherLv}が必要だ。`);
    return;
  }

  const baseNeedInter = def.costs.intermediate || {};
  const needStar      = def.costs.starShard || 0;

  if (!intermediateMats) {
    appendLog("中間素材の所持データが見つからない。");
    return;
  }

  let costReduceRate = 0;
  if (typeof getGlobalSkillTreeBonus === "function") {
    const b = getGlobalSkillTreeBonus() || {};
    costReduceRate = b.gatherBaseUpgradeCostReduceRate || 0;
  }

  const needInter = {};
  for (const iid in baseNeedInter) {
    const baseNeed = baseNeedInter[iid] || 0;
    if (baseNeed <= 0) continue;
    if (costReduceRate > 0) {
      const reduced = Math.ceil(baseNeed * (1 - costReduceRate));
      needInter[iid] = Math.max(1, reduced);
    } else {
      needInter[iid] = baseNeed;
    }
  }

  logGatherBaseRequiredMats(matKey, currentLv, nextLv, needInter, needStar);

  for (const iid in needInter) {
    const need = needInter[iid] || 0;
    const have = intermediateMats[iid] || 0;
    if (have < need) {
      appendLog(`中間素材が足りない：${iid} があと ${need - have} 個必要だ。`);
      return;
    }
  }

  if (needStar > 0) {
    const haveStar = getStarShardCountForGather();
    if (haveStar < needStar) {
      appendLog(`星屑の結晶が足りない（必要: ${needStar} 個）。`);
      return;
    }
  }

  for (const iid in needInter) {
    const need = needInter[iid] || 0;
    intermediateMats[iid] = (intermediateMats[iid] || 0) - need;
    if (intermediateMats[iid] < 0) intermediateMats[iid] = 0;
  }

  if (needStar > 0) {
    if (!consumeStarShardForGather(needStar)) {
      appendLog("星屑の結晶の消費に失敗した（在庫不足？）");
      return;
    }
  }

  setGatherBaseLevel(matKey, nextLv);
  const label = getGatherSkillLabel(matKey);
  appendLog(`採取拠点(${label})がLv${nextLv}になった！`);

  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

// =======================
// 自動採取ストック（6時間=72tick 上限）
// =======================

let gatherBaseStockMaxBonusTicks = 0;

function refreshGatherBaseStockBonus() {
  if (typeof getGlobalSkillTreeBonus === "function") {
    const b = getGlobalSkillTreeBonus() || {};
    gatherBaseStockMaxBonusTicks = b.gatherBaseStockMaxTicksAdd || 0;
  } else {
    gatherBaseStockMaxBonusTicks = 0;
  }
}

const GATHER_BASE_STOCK_BASE_TICKS = 72;
function getGatherBaseStockMaxTicks() {
  const extra = gatherBaseStockMaxBonusTicks || 0;
  return Math.max(GATHER_BASE_STOCK_BASE_TICKS, GATHER_BASE_STOCK_BASE_TICKS + extra);
}

let gatherBaseStockTicks = 0;

function consumeGatherBaseStockTick() {
  if (gatherBaseStockTicks <= 0) return;
  gatherBaseStockTicks--;
  tickGatherBasesOnce();
}

function tickGatherBasesOnceStocked() {
  refreshGatherBaseStockBonus();

  const maxTicks = getGatherBaseStockMaxTicks();
  if (gatherBaseStockTicks < maxTicks) {
    gatherBaseStockTicks++;
  }
  consumeGatherBaseStockTick();
}

function tickGatherBasesOnce() {
  if (!materials) return;

  GATHER_BASE_MATERIAL_KEYS.forEach(matKey => {
    const lv = getGatherBaseLevel(matKey);
    if (lv <= 0) return;

    const conf = GATHER_BASE_LEVEL_TABLE[lv];
    if (!conf) return;

    const baseFail    = conf.failRate;
    let t1Min         = conf.t1Min;
    let t1Max         = conf.t1Max;
    let t2Chance      = conf.t2Chance;
    const t2Amount    = conf.t2Amount;

    const base = gatherBases[matKey] || {};
    const mode = base.mode || "normal";

    if (mode === "quantity") {
      t1Min = Math.max(0, t1Min + 1);
      t1Max = t1Max + 1;
      t2Chance = Math.max(0, t2Chance - 0.03);
    } else if (mode === "quality") {
      t1Min = Math.max(0, t1Min - 1);
      t1Max = Math.max(t1Min, t1Max - 1);
      t2Chance = Math.min(1, t2Chance + 0.05);
    }

    if (Math.random() < baseFail) {
      return;
    }

    const t1Amount = t1Min + Math.floor(Math.random() * (t1Max - t1Min + 1));
    if (t1Amount > 0) {
      if (typeof addMatTierCount === "function") {
        addMatTierCount(matKey, 1, t1Amount);
      } else if (typeof materials[matKey] !== "undefined") {
        const arr = materials[matKey];
        if (Array.isArray(arr)) {
          arr[0] = (arr[0] || 0) + t1Amount;
        } else {
          materials[matKey].t1 = (materials[matKey].t1 || 0) + t1Amount;
        }
      }
    }

    if (t2Chance > 0 && Math.random() < t2Chance && t2Amount > 0) {
      if (typeof addMatTierCount === "function") {
        addMatTierCount(matKey, 2, t2Amount);
      } else if (typeof materials[matKey] !== "undefined") {
        const arr = materials[matKey];
        if (Array.isArray(arr)) {
          arr[1] = (arr[1] || 0) + t2Amount;
        } else {
          materials[matKey].t2 = (materials[matKey].t2 || 0) + t2Amount;
        }
      }
    }
  });

  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

let _gatherBaseTimerStarted = false;
function startGatherBaseTimerIfNeeded() {
  if (_gatherBaseTimerStarted) return;
  _gatherBaseTimerStarted = true;

  const FIVE_MIN_MS = 5 * 60 * 1000;

  setInterval(() => {
    tickGatherBasesOnceStocked();
  }, FIVE_MIN_MS);
}

startGatherBaseTimerIfNeeded();