// battle-items.js
// 敵撃破処理・ポーション効果・アイテム選択UI・戦闘外ポーション使用

// 撃破処理・ポーション/戦闘アイテム・料理/飲み物・採取拠点（自動採取）まわり
//

// =======================
// 撃破処理（経験値・お金・ボスフラグ）
// =======================

// ★戦闘勝利カウンタ（装備耐久用）
window.battleCountSinceDurability = window.battleCountSinceDurability || 0;

function onEnemyDefeatedCore(enemyInst, killFlag, killSource) {
  if (!enemyInst) {
    // ★仕様を変えず、「ありえない状態」を検知するためのゲーム内ログのみ出す
    appendLog("【デバッグ警告】onEnemyDefeatedCore に enemyInst が渡されていません。");
    return;
  }

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

  // ★戦闘由来のEXP
  addExp(expGain, "battle");
  money += moneyGain;

  if (typeof rollEnemyDrops === "function") {
    rollEnemyDrops(enemyInst.id, dropRateBonus);
  }

  // ★修正: 動物使いかつ、ペットが場に出ていて生存している場合のみ、従来どおり exp/2 を付与
  //   獣群使い（複数ペット運用職）の場合は、編成中の生存ペット全員に exp/2 を付与する
  if (typeof hasCompanion === "function" && hasCompanion()) {
    if (typeof isMultiPetJob === "function" && isMultiPetJob()) {
      if (typeof addPetExpToParty === "function") {
        addPetExpToParty(Math.floor(expGain / 2));
      }
    } else if (typeof addPetExp === "function" &&
        typeof jobId === "number" &&
        jobId === 2 &&
        typeof petHp === "number" &&
        petHp > 0) {
      addPetExp(Math.floor(expGain / 2));
    }
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


// ポーション検索: potions配列 → ITEM_META の順で解決
// 副産物ポーションはpotions配列に存在しないためITEM_META経由で構築する
function findPotionOrByproduct(id) {
  // 1. 通常ポーション配列から検索
  if (typeof potions !== "undefined" && Array.isArray(potions)) {
    const found = potions.find(x => x.id === id);
    if (found) return found;
  }
  // 2. ITEM_METAでカテゴリがpotionならオブジェクトを構築して返す
  if (typeof getItemMeta === "function") {
    const meta = getItemMeta(id);
    if (meta && meta.category === "potion") {
      return {
        id:    meta.id,
        name:  meta.name || id,
        type:  meta.potionType || "BOTH",
        power: meta.potionPower || 0,
        flat:  meta.potionFlat  || 0
      };
    }
  }
  return null;
}

function applyPotionEffect(p, inBattle) {
  if (!p) return;

  // 錬金術師・アイテムブーストを加味した回復量補正
  function applyItemBoost(val) {
    if (typeof isAlchemist === "function" && isAlchemist()) {
      const rate = typeof getAlcPotionRate === "function" ? getAlcPotionRate()
                 : typeof ALC_POTION_RATE  === "number"  ? ALC_POTION_RATE
                 : 1.3;
      val = Math.floor(val * rate);
    }
    // ★2024: ポーション側は potionBoostTurnRemain（錬金術師「ポーションブースト」専用）を参照。
    //   道具側の itemBoostTurnRemain（道具使い専用）とは完全に分離。
    if (typeof potionBoostTurnRemain === "number" && potionBoostTurnRemain > 0 &&
        typeof potionBoostRate       === "number" && potionBoostRate > 0) {
      val = Math.floor(val * (1 + potionBoostRate));
    }
    return val;
  }

  // HP回復
  if ((p.type === POTION_TYPE_HP || p.type === POTION_TYPE_BOTH) && typeof hp !== "undefined") {
    const max = typeof hpMax === "number" ? hpMax : hp;
    const val = applyItemBoost(Math.floor((max * (p.power || 0)) + (p.flat || 0)));
    if (val > 0) hp = Math.max(0, Math.min(max, hp + val));
  }

  // MP回復
  if ((p.type === POTION_TYPE_MP || p.type === POTION_TYPE_BOTH) && typeof mp !== "undefined") {
    const max = typeof mpMax === "number" ? mpMax : mp;
    const val = applyItemBoost(Math.floor((max * (p.power || 0)) + (p.flat || 0)));
    if (val > 0) mp = Math.max(0, Math.min(max, mp + val));
  }

  {
    const meta = typeof getItemMeta === "function" ? getItemMeta(p.id) : null;

    // バフ付与（戦闘中のみ有効）
    if (inBattle && meta && meta.statusId && typeof addPotionStatusToPlayer === "function") {
      addPotionStatusToPlayer(meta.statusId, 3);
    }

    // cleanse → 状態異常即時解除（戦闘内外どちらでも有効）
    if (meta && meta.specialEffect === "cleanse") {
      const CLEANSE_TARGETS = ["poison", "paralyze", "blind", "silence"];
      const before = playerStatuses.length;
      playerStatuses = playerStatuses.filter(s => !CLEANSE_TARGETS.includes(s.id));
      appendLog(before > playerStatuses.length ? "状態異常が解除された！" : "解除すべき状態異常はなかった。");
    }

    // 敵へのダメージポーション（戦闘中のみ）
    if (inBattle && p.type === POTION_TYPE_DAMAGE && currentEnemy) {
      const dmg = typeof p.damage === "number" ? p.damage : (p.value || 0);
      if (dmg > 0) {
        const beforeHp = enemyHp;
        enemyHp = Math.max(0, enemyHp - dmg);
        appendLog(`${p.name} を投げつけた！ ${currentEnemy.name}に${dmg}ダメージ！（HP ${beforeHp} → ${enemyHp}）`);
        if (enemyHp <= 0) { enemyHp = 0; winBattle(true, "item"); }
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
      const p = findPotionOrByproduct(id);
      let name = p ? p.name : id;
      // ITEM_META優先（副産物ポーションはp.nameが未設定のため）
      if (typeof getItemName === "function") {
        const metaName = getItemName(id);
        if (metaName) name = metaName;
      }
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
    if (typeof carryPotions !== "undefined") {
      Object.keys(carryPotions).forEach(id => {
        const cnt = carryPotions[id] || 0;
        if (cnt <= 0) return;
        const p = findPotionOrByproduct(id);
        let name = p ? p.name : id;
        if (typeof getItemName === "function") {
          const metaName = getItemName(id);
          if (metaName) name = metaName;
        }
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

  const p = findPotionOrByproduct(id);
  if (!p) {
    appendLog("そのアイテムは存在しない");
    refreshUseItemSelect();
    return;
  }

  lastSelectedFieldPotionId = id;

  const hpFull = (typeof hpMax === "number") ? (hp >= hpMax) : true;
  const mpFull = (typeof mpMax === "number") ? (mp >= mpMax) : true;
  let willHaveEffect = false;

  const metaForEffect = typeof getItemMeta === "function" ? getItemMeta(id) : null;
  if (p.type === POTION_TYPE_HP && !hpFull) {
    willHaveEffect = true;
  } else if (p.type === POTION_TYPE_MP && !mpFull) {
    willHaveEffect = true;
  } else if (p.type === POTION_TYPE_BOTH && (!hpFull || !mpFull)) {
    willHaveEffect = true;
  } else if (p.type === POTION_TYPE_DAMAGE) {
    willHaveEffect = false;
  } else if (metaForEffect && metaForEffect.statusId) {
    willHaveEffect = true;
  } else if (metaForEffect && metaForEffect.specialEffect === "cleanse") {
    willHaveEffect = true;
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

