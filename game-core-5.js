// game-core-5.js
// 探索・ランダムイベント・敵関連ロジック（エリア出現・ボス生成・撃破処理）
//
// 前提：enemy-data.js で
//   ENEMIES, AREA_ENEMY_TABLE, AREA_BOSS_ID
// が定義済み。
// game-core-1.js / 2.js / 3.js で
//   currentEnemy, enemyHp, enemyHpMax, isBossBattle,
//   areaBossCleared, areaBossAvailable,
//   money, addExp, addPetExp,
//   getCurrentArea(), setBattleCommandVisible(), setExploreUIVisible(),
//   updateDisplay(), appendLog(), endBattleCommon(),
//   getBattleExpPerWin(), handleHungerThirstOnAction(),
//   materials, wood, ore, herb, cloth, leather, water,
//   hp, hpMax, mp, mpMax, sp, spMax, petHp, petHpMax,
//   equippedWeaponId, equippedArmorId, weapons, armors,
//   weaponCounts, armorCounts,
//   refreshEquipSelects,
//   carryFoods, carryDrinks, COOKING_RECIPES,
//   refreshCarryFoodDrinkSelects,
//   potions, potionCounts,
//   POTION_TYPE_HP, POTION_TYPE_MP, POTION_TYPE_BOTH, POTION_TYPE_DAMAGE,
//   escapeFailBonus, LUK_,
//   onBossDefeated(), startBattleCommon(),
//   updateSkillButtonsByJob(), updateBattleSkillUIByJob()
// などが定義済みである前提。

// =======================
// グローバル状態（探索・ボス）
// =======================

// エリアごとの「今ボスに挑める状態か」
const areaBossAvailable = {
  field:  false,
  forest: false,
  cave:   false,
  mine:   false
};

// 探索滞在状態（UI側と共有）
window.isExploring   = false;      // 街にいる: false / どこか探索中: true
window.exploringArea = "field";    // 現在探索しているエリアID

// ポーション選択の記憶
let lastSelectedFieldPotionId  = null;
let lastSelectedBattlePotionId = null;

// =======================
// 現在エリア取得ヘルパ
// =======================

function getCurrentArea() {
  const sel = document.getElementById("exploreTarget");
  return sel ? sel.value : "field";
}

// =======================
// 探索UI（行き先＋探索ボタン）の表示切替
// =======================

function setExploreUIVisible(visible) {
  const row = document.querySelector(".explore-header-row");
  if (row) row.style.display = visible ? "flex" : "none";
}

// =======================
// 探索エリアセレクト更新
// =======================

function refreshExploreAreaSelect() {
  const sel = document.getElementById("exploreTarget");
  if (!sel) return;

  const prev = sel.value;
  sel.innerHTML = "";

  {
    const opt = document.createElement("option");
    opt.value = "field";
    opt.textContent = "草原（敵弱い・素材ほぼ出ない）";
    sel.appendChild(opt);
  }

  if (typeof areaBossCleared === "undefined" || areaBossCleared.field) {
    const opt = document.createElement("option");
    opt.value = "forest";
    opt.textContent = "森（敵やや強い・草/木が少し出る）";
    sel.appendChild(opt);
  }

  if (typeof areaBossCleared === "undefined" || areaBossCleared.forest) {
    const opt = document.createElement("option");
    opt.value = "cave";
    opt.textContent = "洞窟（敵強い・素材少し）";
    sel.appendChild(opt);
  }

  if (typeof areaBossCleared === "undefined" || areaBossCleared.cave) {
    const opt = document.createElement("option");
    opt.value = "mine";
    opt.textContent = "廃鉱山（敵かなり強い・鉱石/皮レア）";
    sel.appendChild(opt);
  }

  const exists = Array.from(sel.options).some(o => o.value === prev);
  sel.value = exists ? prev : (sel.options[0]?.value || "field");

  if (typeof updateBossButtonUI === "function") {
    updateBossButtonUI();
  }
}

// =======================
// ボスボタン表示
// =======================

function updateBossButtonUI() {
  const bossBtn = document.getElementById("bossStartBtn");
  if (!bossBtn) return;

  const area = window.isExploring
    ? (window.exploringArea || getCurrentArea())
    : getCurrentArea();

  if (areaBossAvailable[area]) {
    bossBtn.style.display = "inline-block";
  } else {
    bossBtn.style.display = "none";
  }
}

// =======================
// 帰還ボタン表示制御
// =======================

function updateReturnTownButton() {
  const btn = document.getElementById("returnTownBtn");
  if (!btn) return;

  if (currentEnemy) {
    btn.style.display = "none";
    return;
  }

  if (window.isExploring) {
    btn.style.display = "inline-block";
  } else {
    btn.style.display = "none";
  }
}

// =======================
// 戦闘コマンド表示制御
// =======================

function setBattleCommandVisible(visible) {
  const area      = document.getElementById("battleCommandArea");
  const attackBtn = document.getElementById("exploreBtn");
  const escapeBtn = document.getElementById("escapeBtn");
  const itemBtn   = document.getElementById("useBattleItemBtn");

  // 親コンテナの表示/非表示
  if (area) {
    area.style.display = visible ? "block" : "none";
  }

  // 個別ボタン
  const show = visible ? "inline-block" : "none";
  if (attackBtn) attackBtn.style.display = show;
  if (escapeBtn) escapeBtn.style.display = show;
  if (itemBtn)   itemBtn.style.display   = show;
}

// =======================
// 敵生成系
// =======================

/**
 * エリアの出現テーブルからランダムに敵IDを1つ選ぶ
 * @param {string} areaId - "field" / "forest" / "cave" / "mine"
 * @returns {string|null}
 */
function pickRandomEnemyId(areaId) {
  const table = AREA_ENEMY_TABLE[areaId];
  if (!table || table.length === 0) return null;
  const idx = Math.floor(Math.random() * table.length);
  return table[idx];
}

/**
 * マスターデータから戦闘用の敵インスタンスを生成
 * @param {string} enemyId
 * @param {boolean} forceBossFlag - 強制的にボス扱いにしたいとき true
 * @returns {object|null}
 */
function createEnemyInstance(enemyId, forceBossFlag = false) {
  const master = ENEMIES[enemyId];
  if (!master) return null;

  return {
    id: master.id,
    name: master.name,
    maxHp: master.hp,
    hp: master.hp,
    atk: master.atk,
    def: master.def,
    exp: master.exp,
    money: master.money,
    isBoss: forceBossFlag ? true : !!master.isBoss
  };
}

/**
 * 現在選択中エリアから通常敵を1体生成して戦闘開始
 * （探索イベントから呼ぶ想定）
 */
function startRandomEncounter() {
  const areaId = getCurrentArea();
  const enemyId = pickRandomEnemyId(areaId);
  if (!enemyId) {
    appendLog("このエリアには敵がいないようだ…");
    return;
  }

  const enemy = createEnemyInstance(enemyId, false);
  if (!enemy) {
    appendLog("敵データの取得に失敗しました");
    return;
  }

  startBattleCommon(
    {
      id: enemy.id,
      name: enemy.name,
      hp: enemy.maxHp,
      atk: enemy.atk,
      def: enemy.def,
      exp: enemy.exp,
      money: enemy.money,
      isBoss: enemy.isBoss
    },
    false
  );
  appendLog(`${enemy.name} が現れた！`);
}

// =======================
// 探索時のボス発見判定
// =======================

function tryFindBossOnExplore() {
  const area = window.isExploring
    ? (window.exploringArea || getCurrentArea())
    : getCurrentArea();
  if (areaBossAvailable[area]) return;

  const roll = Math.random();
  if (roll < 0.0005) {
    areaBossAvailable[area] = true;
    appendLog("強い気配を感じる… このエリアのボスに挑めるようになった！");
    updateBossButtonUI();
  }
}

// =======================
// 探索（ランダムイベント対応版）
// =======================

function doExploreEvent(area) {
  if (currentEnemy) {
    appendLog("戦闘中は探索できない！");
    return;
  }

  if (!area) {
    area = window.isExploring
      ? (window.exploringArea || getCurrentArea())
      : getCurrentArea();
  }

  window.exploringArea = area;
  window.isExploring = true;

  tryFindBossOnExplore();

  const roll = Math.random();

  if (roll < 0.2) {
    appendLog("何も見つからなかった…");
    updateReturnTownButton();
    return;
  }

  if (roll < 0.4) {
    doExploreRandomEvent(area);
    updateReturnTownButton();
    return;
  }

  const enemyId = pickRandomEnemyId(area);
  if (!enemyId) {
    appendLog("敵データが見つからない");
    updateReturnTownButton();
    return;
  }
  const enemy = createEnemyInstance(enemyId, false);
  if (!enemy) {
    appendLog("敵データの取得に失敗しました");
    updateReturnTownButton();
    return;
  }

  appendLog(`${enemy.name} が現れた！`);
  startBattleCommon(
    {
      id: enemy.id,
      name: enemy.name,
      hp: enemy.maxHp,
      atk: enemy.atk,
      def: enemy.def,
      exp: enemy.exp,
      money: enemy.money,
      isBoss: false
    },
    false
  );
}

function doExploreRandomEvent(area) {
  const roll = Math.random();

  if (roll < 0.34) {
    // 罠ダメージ
    const maxHp = hpMax || 1;
    const damage = Math.max(1, Math.floor(maxHp * 0.05));
    hp = Math.max(0, hp - damage);
    appendLog("足元の罠が作動した！" + damage + "ダメージを受けた。");

    if (hp <= 0) {
      hp = 0;
      appendLog("あなたは罠で倒れてしまった…");

      window.isExploring   = false;
      window.exploringArea = "field";

      hp = hpMax;
      mp = mpMax;
      sp = spMax;
      petHp = petHpMax;

      money = Math.floor(money / 2);

      let brokeSomething = false;

      function reduceDurabilityOnEquipTrap() {
        if (equippedWeaponId && Array.isArray(weapons)) {
          const w = weapons.find(x => x.id === equippedWeaponId);
          if (w && typeof w.durability === "number") {
            w.durability = Math.max(0, w.durability - 1);
            if (w.durability <= 0) {
              const cnt = weaponCounts[w.id] || 0;
              weaponCounts[w.id] = Math.max(0, cnt - 1);
              appendLog(`${w.name} は壊れてしまった…`);
              brokeSomething = true;
              if (weaponCounts[w.id] <= 0 && equippedWeaponId === w.id) {
                equippedWeaponId = null;
              }
            } else {
              brokeSomething = true;
            }
          }
        }

        if (equippedArmorId && Array.isArray(armors)) {
          const a = armors.find(x => x.id === equippedArmorId);
          if (a && typeof a.durability === "number") {
            a.durability = Math.max(0, a.durability - 1);
            if (a.durability <= 0) {
              const cnt = armorCounts[a.id] || 0;
              armorCounts[a.id] = Math.max(0, cnt - 1);
              appendLog(`${a.name} は壊れてしまった…`);
              brokeSomething = true;
              if (armorCounts[a.id] <= 0 && equippedArmorId === a.id) {
                equippedArmorId = null;
              }
            } else {
              brokeSomething = true;
            }
          }
        }

        if (typeof refreshEquipSelects === "function") {
          refreshEquipSelects();
        }
      }
      reduceDurabilityOnEquipTrap();

      if (brokeSomething) {
        appendLog("街に戻った… 休んで回復し、所持ゴールドを半分失い、装備の耐久度が1減少した。");
      } else {
        appendLog("街に戻った… 休んで回復し、所持ゴールドを半分失った。");
      }

      updateReturnTownButton();
      updateDisplay();
      return;
    }

    updateDisplay();
    return;
  } else if (roll < 0.67) {
    // 宝箱
    let goldMin = 5;
    let goldMax = 15;

    if (area === "field") {
      goldMin = 5;   goldMax = 15;
    } else if (area === "forest") {
      goldMin = 10;  goldMax = 20;
    } else if (area === "cave") {
      goldMin = 20;  goldMax = 30;
    } else if (area === "mine") {
      goldMin = 30;  goldMax = 40;
    }

    const goldGain = goldMin + Math.floor(Math.random() * (goldMax - goldMin + 1));
    money = (money || 0) + goldGain;
    appendLog("小さな宝箱を見つけた！" + goldGain + "Gを手に入れた。");

    const dropCount = 1 + Math.floor(Math.random() * 2);
    const baseKeys = ["wood","ore","herb","cloth","leather","water"];
    const baseNames = { wood:"木", ore:"鉱石", herb:"草", cloth:"布", leather:"皮", water:"水" };

    for (let i = 0; i < dropCount; i++) {
      const matKey = baseKeys[Math.floor(Math.random() * baseKeys.length)];
      const m = materials[matKey];
      if (!m) continue;

      let tier = "t1";
      if (area === "field") {
        tier = (Math.random() < 0.9) ? "t1" : "t2";
      } else if (area === "forest") {
        const r = Math.random();
        if      (r < 0.1) tier = "t1";
        else if (r < 0.9) tier = "t2";
        else              tier = "t3";
      } else if (area === "cave") {
        const r = Math.random();
        if      (r < 0.1) tier = "t2";
        else if (r < 0.9) tier = "t3";
        else              tier = "t4";
      } else if (area === "mine") {
        tier = (Math.random() < 0.8) ? "t4" : "t3";
      }

      m[tier] = (m[tier] || 0) + 1;

      const tierLabel = tier.toUpperCase();
      const name = baseNames[matKey] || matKey;
      appendLog(`宝箱の中から ${tierLabel}${name} を1つ手に入れた。`);
    }

    updateDisplay();
    return;
  } else {
    // 回復泉
    const maxHp = hpMax || 1;
    const heal = Math.max(1, Math.floor(maxHp * 0.1));
    const beforeHp = hp;
    hp = Math.min(maxHp, hp + heal);

    const actualHeal = hp - beforeHp;
    if (actualHeal > 0) {
      appendLog("静かな泉でひと休みした。HPが " + actualHeal + " 回復した。");
    } else {
      appendLog("静かな泉でひと休みしたが、特に回復する必要はなかった。");
    }

    updateDisplay();
    return;
  }
}

// =======================
// ボス戦開始
// =======================

function startBossBattleForArea(areaId) {
  const bossId = AREA_BOSS_ID[areaId];
  if (!bossId) {
    appendLog("このエリアにはボスがいないようだ");
    return;
  }

  const boss = createEnemyInstance(bossId, true);
  if (!boss) {
    appendLog("ボスデータが見つからない");
    return;
  }

  areaBossAvailable[areaId] = false;
  if (typeof updateBossButtonUI === "function") {
    updateBossButtonUI();
  }

  appendLog(`${boss.name} が立ちはだかった！`);

  startBattleCommon(
    {
      id: boss.id,
      name: boss.name,
      hp: boss.maxHp,
      atk: boss.atk,
      def: boss.def,
      exp: boss.exp,
      money: boss.money,
      isBoss: true
    },
    true
  );
}

/**
 * UIのボスボタンから呼ぶ入口
 */
function startBossBattleFromUI() {
  const area = window.isExploring
    ? (window.exploringArea || getCurrentArea())
    : getCurrentArea();
  startBossBattleForArea(area);
}

// =======================
// 撃破処理（経験値・お金・ボスフラグ）
// =======================

/**
 * 敵撃破時に共通で呼ぶ処理
 * @param {object} enemyInst - currentEnemy を想定
 */
function onEnemyDefeatedCore(enemyInst) {
  if (!enemyInst) return;

  const expGain = (typeof getBattleExpPerWin === "function")
    ? getBattleExpPerWin(enemyInst)
    : (enemyInst.exp || BASE_EXP_PER_BATTLE || 5);

  const moneyGain = enemyInst.money != null ? enemyInst.money : 10;

  appendLog(
    `${enemyInst.name}を倒した！ 経験値${expGain}と${moneyGain}Gを手に入れた`
  );

  addExp(expGain);
  money += moneyGain;

  if (typeof addPetExp === "function") {
    addPetExp(Math.floor(expGain / 2));
  }

  if (typeof handleHungerThirstOnAction === "function") {
    handleHungerThirstOnAction("battleWin");
  }

  if (enemyInst.isBoss && typeof onBossDefeated === "function") {
    onBossDefeated();
  } else {
    endBattleCommon();
  }

  updateDisplay();
}

// =======================
// アイテム用セレクト再描画（ポーション）
// =======================

function refreshUseItemSelect() {
  const sel = document.getElementById("useItemSelect");
  if (!sel) return;

  const prev = lastSelectedFieldPotionId || sel.value || null;

  sel.innerHTML = "";

  for (const p of potions) {
    const cnt = potionCounts[p.id] || 0;
    if (cnt <= 0) continue;
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name}（${cnt}）`;
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

  const prev = lastSelectedBattlePotionId || sel.value || null;

  sel.innerHTML = "";

  for (const p of potions) {
    const cnt = potionCounts[p.id] || 0;
    if (cnt <= 0) continue;
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name}（${cnt}）`;
    sel.appendChild(opt);
  }

  if (prev && Array.from(sel.options).some(o => o.value === prev)) {
    sel.value = prev;
  }

  lastSelectedBattlePotionId = sel.value || null;
}

// =======================
// アイテム使用（フィールド / 戦闘）
// =======================

function usePotionOutsideBattle() {
  const sel = document.getElementById("useItemSelect");
  if (!sel || !sel.value) {
    appendLog("使うアイテムを選んでください");
    return;
  }
  const id = sel.value;
  const p = potions.find(x => x.id === id);
  if (!p) { appendLog("そのアイテムは存在しない"); return; }
  if (potionCounts[id] <= 0) {
    appendLog("そのアイテムを持っていない");
    refreshUseItemSelect();
    return;
  }

  lastSelectedFieldPotionId = id;

  const prevHp = hp;
  const prevMp = mp;

  applyPotionEffect(p, false);
  potionCounts[id]--;

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

  refreshUseItemSelect();
  updateDisplay();
}

function useBattleItem() {
  const sel = document.getElementById("battleItemSelect");
  if (!sel || !sel.value) {
    appendLog("戦闘で使うアイテムを選んでください");
    return;
  }
  const id = sel.value;
  const p = potions.find(x => x.id === id);
  if (!p) { appendLog("そのアイテムは存在しない"); return; }
  if (potionCounts[id] <= 0) {
    appendLog("そのアイテムを持っていない");
    refreshBattleItemSelect();
    return;
  }

  lastSelectedBattlePotionId = id;

  const prevHp = hp;
  const prevMp = mp;

  applyPotionEffect(p, true);
  potionCounts[id]--;

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

  refreshBattleItemSelect();

  if (currentEnemy) {
    enemyTurn();
    tickStatusesTurnEndForBoth();
  }
  updateDisplay();
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

  const eff = recipe.effect;

  if (eff.statusId && typeof addFoodStatusToPlayer === "function") {
    addFoodStatusToPlayer(eff.statusId, eff.durationTurns);
  }

  if (typeof restoreHungerThirst === "function") {
    restoreHungerThirst(eff.hungerRecover || 0, eff.thirstRecover || 0);
  }

  carryFoods[id] = have - 1;
  if (carryFoods[id] <= 0) delete carryFoods[id];

  appendLog(`${recipe.name} を食べた！`);

  if (typeof refreshCarryFoodDrinkSelects === "function") {
    refreshCarryFoodDrinkSelects();
  }
  if (typeof updateDisplay === "function") {
    updateDisplay();
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

  const eff = recipe.effect;

  if (eff.statusId && typeof addFoodStatusToPlayer === "function") {
    addFoodStatusToPlayer(eff.statusId, eff.durationTurns);
  }

  if (typeof restoreHungerThirst === "function") {
    restoreHungerThirst(eff.hungerRecover || 0, eff.thirstRecover || 0);
  }

  carryDrinks[id] = have - 1;
  if (carryDrinks[id] <= 0) delete carryDrinks[id];

  appendLog(`${recipe.name} を飲んだ！`);

  if (typeof refreshCarryFoodDrinkSelects === "function") {
    refreshCarryFoodDrinkSelects();
  }
  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}