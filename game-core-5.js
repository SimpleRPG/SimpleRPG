// game-core-5.js
// 探索・ランダムイベント・敵関連ロジック（エリア出現・ボス生成・撃破処理）工場区画
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
//   updateSkillButtonsByJob(), updateBattleSkillUIByJob(),
//   gatherSkills, intermediateMats
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
    opt.textContent = "草原（0転生レベル100でボス目安）";
    sel.appendChild(opt);
  }

  if (typeof areaBossCleared === "undefined" || areaBossCleared.field) {
    const opt = document.createElement("option");
    opt.value = "forest";
    opt.textContent = "森（10転生目安）";
    sel.appendChild(opt);
  }

  if (typeof areaBossCleared === "undefined" || areaBossCleared.forest) {
    const opt = document.createElement("option");
    opt.value = "cave";
    opt.textContent = "洞窟（20転生目安）";
    sel.appendChild(opt);
  }

  if (typeof areaBossCleared === "undefined" || areaBossCleared.cave) {
    const opt = document.createElement("option");
    opt.value = "mine";
    opt.textContent = "廃鉱山（40転生目安）";
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

// =======================
// 採取拠点・自動採取
// =======================

// 対応素材キー
const GATHER_BASE_MATERIAL_KEYS = ["wood","ore","herb","cloth","leather","water"];

// 素材ごとの拠点レベル（0=拠点なし, 1〜3）
const gatherBases = {};
GATHER_BASE_MATERIAL_KEYS.forEach(k => {
  gatherBases[k] = { level: 0 };
});

// 共通テンプレ：レベルごとの失敗率・T1/T2出力
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

/**
 * 拠点レベルを取得
 * @param {string} matKey - "wood" など
 * @returns {number}
 */
function getGatherBaseLevel(matKey) {
  const base = gatherBases[matKey];
  return base ? (base.level || 0) : 0;
}

/**
 * 拠点レベルを設定
 * @param {string} matKey
 * @param {number} level - 0〜3
 */
function setGatherBaseLevel(matKey, level) {
  if (!GATHER_BASE_MATERIAL_KEYS.includes(matKey)) return;
  const lv = Math.max(0, Math.min(3, level | 0));
  gatherBases[matKey] = gatherBases[matKey] || {};
  gatherBases[matKey].level = lv;
}

/**
 * 拠点強化用コスト・条件テーブル
 * - nextLevel: 上げ先レベル
 * - reqGatherLv: 必要採取スキルレベル
 * - costs.intermediate: 中間素材コスト { id: 個数 }
 * - costs.starShard: 星屑の結晶必要数（T3 Lv3 のみ 1）
 */
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

/**
 * 拠点強化を試みる（UI から Lv+1 ボタンで呼ぶ想定）
 * @param {string} matKey - "wood" など
 */
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

  // 採取スキルレベルチェック
  if (!gatherSkills || !gatherSkills[matKey]) {
    appendLog("採取スキルデータが見つからない。");
    return;
  }
  const skLv = gatherSkills[matKey].lv || 0;
  if (skLv < def.reqGatherLv) {
    appendLog(`この拠点をLv${nextLv}にするには、採取スキル(${matKey}) Lv${def.reqGatherLv}が必要だ。`);
    return;
  }

  // 中間素材・星屑の結晶所持チェック
  const needInter = def.costs.intermediate || {};
  const needStar  = def.costs.starShard || 0;

  if (!intermediateMats) {
    appendLog("中間素材の所持データが見つからない。");
    return;
  }

  // 必要素材一覧を先に表示
  (function showRequiredMats() {
    let lines = [];
    lines.push(`採取拠点(${matKey}) Lv${currentLv} → Lv${nextLv} に必要な中間素材:`);
    for (const iid in needInter) {
      const need = needInter[iid] || 0;
      const have = intermediateMats[iid] || 0;
      lines.push(`- ${iid}: 必要 ${need} 個 / 所持 ${have} 個`);
    }
    if (needStar > 0) {
      const haveStar = intermediateMats["starShard"] || 0;
      lines.push(`- starShard: 必要 ${needStar} 個 / 所持 ${haveStar} 個`);
    }
    appendLog(lines.join("\n"));
  })();

  // 所持チェック
  for (const iid in needInter) {
    const need = needInter[iid] || 0;
    const have = intermediateMats[iid] || 0;
    if (have < need) {
      appendLog(`中間素材が足りない：${iid} があと ${need - have} 個必要だ。`);
      return;
    }
  }

  if (needStar > 0) {
    const haveStar = intermediateMats["starShard"] || 0;
    if (haveStar < needStar) {
      appendLog(`星屑の結晶が足りない（必要: ${needStar} 個）。`);
      return;
    }
  }

  // 消費
  for (const iid in needInter) {
    const need = needInter[iid] || 0;
    intermediateMats[iid] = (intermediateMats[iid] || 0) - need;
    if (intermediateMats[iid] < 0) intermediateMats[iid] = 0;
  }
  if (needStar > 0) {
    intermediateMats["starShard"] =
      (intermediateMats["starShard"] || 0) - needStar;
    if (intermediateMats["starShard"] < 0) {
      intermediateMats["starShard"] = 0;
    }
  }

  setGatherBaseLevel(matKey, nextLv);
  appendLog(`採取拠点(${matKey})がLv${nextLv}になった！`);

  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

// =======================
// 自動採取ストック（6時間=72tick 上限）
// =======================

// 現在ストックされている tick 数（5分で1増える想定）
let gatherBaseStockTicks = 0;
// 6時間分: 5分 × 72 = 360分
const GATHER_BASE_STOCK_MAX_TICKS = 72;

/**
 * ストックを1消費して1tickぶん自動採取を行う
 */
function consumeGatherBaseStockTick() {
  if (gatherBaseStockTicks <= 0) return;
  gatherBaseStockTicks--;
  tickGatherBasesOnce();
}

/**
 * 5分ごとに呼ばれる、全拠点の自動採取処理（ストック加算のみ）
 * - オンライン中は「ストック +1 ➜ すぐ1つ消費」して実行
 * - 将来オフライン対応する場合は、Stock だけ増やして復帰時にまとめ消費でも良い
 */
function tickGatherBasesOnceStocked() {
  if (gatherBaseStockTicks < GATHER_BASE_STOCK_MAX_TICKS) {
    gatherBaseStockTicks++;
  }
  // 今はオンライン専用なので、その場で1tick消費して動かす
  consumeGatherBaseStockTick();
}

/**
 * 実際の1tickぶんの処理（元の tickGatherBasesOnce の中身）
 * - 失敗時は何も起きない
 * - 成功時は materials[matKey] の t1/t2 に直接加算
 */
function tickGatherBasesOnce() {
  if (!materials) return;

  GATHER_BASE_MATERIAL_KEYS.forEach(matKey => {
    const lv = getGatherBaseLevel(matKey);
    if (lv <= 0) return;

    const conf = GATHER_BASE_LEVEL_TABLE[lv];
    if (!conf) return;

    // 失敗判定
    if (Math.random() < conf.failRate) {
      // 失敗ログは基本出さない（ログがうるさいので）
      return;
    }

    const mat = materials[matKey];
    if (!mat) return;

    // T1量
    const t1Amount = conf.t1Min + Math.floor(Math.random() * (conf.t1Max - conf.t1Min + 1));
    if (t1Amount > 0) {
      mat.t1 = (mat.t1 || 0) + t1Amount;
    }

    // T2抽選
    if (conf.t2Chance > 0 && Math.random() < conf.t2Chance && conf.t2Amount > 0) {
      mat.t2 = (mat.t2 || 0) + conf.t2Amount;
    }
  });

  // 供給が変わったので、必要なら表示更新
  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

/**
 * 自動採取のタイマーを開始
 * - 5分ごとに tickGatherBasesOnceStocked を呼ぶ
 * - すでに開始済みなら何もしない
 */
let _gatherBaseTimerStarted = false;
function startGatherBaseTimerIfNeeded() {
  if (_gatherBaseTimerStarted) return;
  _gatherBaseTimerStarted = true;

  const FIVE_MIN_MS = 5 * 60 * 1000;

  setInterval(() => {
    tickGatherBasesOnceStocked();
  }, FIVE_MIN_MS);
}

// 起動時にタイマーを起動しておく
startGatherBaseTimerIfNeeded();