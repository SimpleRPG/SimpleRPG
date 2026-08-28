// battle-items-use.js
// アイテム使用処理（useBattleItem）・食事・飲み物効果

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

    const p = findPotionOrByproduct(id);
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

    if (p.id && p.id.startsWith("buffAtk_T")) {
      appendLog("身体に力が満ち、攻撃がずしりと重くなった！");
    } else if (p.id && p.id.startsWith("buffDef_T")) {
      appendLog("体が軽くなり、敵の攻撃をいなしやすくなった！");
    } else if (p.id && p.id.startsWith("cleanse_T")) {
      // ログはapplyPotionEffect側で出力するためここでは何もしない
    } else if (p.id && p.id.endsWith("_magicPotion")) {
      appendLog("魔力が漲り、魔法攻撃が鋭くなった！");
    } else if (p.id && p.id.endsWith("_critPotion")) {
      appendLog("集中力が高まり、急所を狙いやすくなった！");
    } else if (p.id && p.id.endsWith("_bandage")) {
      appendLog("包帯が傷を保護し、少しずつ回復していく…");
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

      // ★道具使いボーナス（爆弾・道具ダメージ + itemBoost 補正）
      // ★2024: 錬金術師(202)専用だった判定を道具使い(203)専用に移管。
      if (typeof isToolUser === "function" && isToolUser()) {
        let baseRate = 1.0;
        if (typeof getToolDamageRate === "function") {
          baseRate = getToolDamageRate();
        } else if (typeof ALC_TOOL_DMG_RATE === "number") {
          baseRate = ALC_TOOL_DMG_RATE;
        } else {
          baseRate = 2.0;
        }
        dmg = Math.floor(dmg * baseRate);

        if (typeof itemBoostTurnRemain === "number" &&
            itemBoostTurnRemain > 0) {
          let boostRate = 1.0;
          if (typeof getToolBoostRate === "function") {
            boostRate = getToolBoostRate();
          } else if (typeof ALC_TOOL_BOOST_RATE === "number") {
            boostRate = ALC_TOOL_BOOST_RATE;
          } else {
            boostRate = 1.5;
          }
          dmg = Math.floor(dmg * boostRate);
        }
      }

      beforeHp = enemyHp;
      enemyHp = Math.max(0, enemyHp - dmg);
      afterHp = enemyHp;

      function rollStatusApply(baseRate) {
        let rate = baseRate;
        if (typeof isToolUser === "function" && isToolUser()) {
          let add = 0.0;
          if (typeof getToolStatusAdd === "function") {
            add = getToolStatusAdd();
          } else if (typeof ALC_STATUS_ADD === "number") {
            add = ALC_STATUS_ADD;
          } else {
            add = 0.3;
          }
          rate = Math.min(1, rate + add);
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
      } else if (id === "T1_stickyTrap" || id === "T2_stickyTrap" || id === "T3_stickyTrap") {
        appendLog(`${itemName}を投げつけた！ ${currentEnemy.name}の動きが鈍った！`);
        if (typeof addStatusToEnemy === "function") {
          if (rollStatusApply(0.75)) {
            addStatusToEnemy("slow");
          } else {
            appendLog("しかし罠はうまく効かなかった…");
          }
        }
      } else if (id === "T1_boneBomb" || id === "T2_boneBomb" || id === "T3_boneBomb") {
        appendLog(`${itemName}を投げつけた！ ${currentEnemy.name}の防御が崩れた！`);
        if (typeof addStatusToEnemy === "function") {
          if (rollStatusApply(0.70)) {
            addStatusToEnemy("def_down");
          } else {
            appendLog("しかし防御崩しはうまく効かなかった…");
          }
        }
      } else if (id === "T1_smokeBomb" || id === "T2_smokeBomb" || id === "T3_smokeBomb") {
        appendLog(`${itemName}を投げつけた！ ${currentEnemy.name}の視界が煙で遮られた！`);
        if (typeof addStatusToEnemy === "function") {
          if (rollStatusApply(0.75)) {
            addStatusToEnemy("blind");
          } else {
            appendLog("しかし煙幕はうまく効かなかった…");
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

