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
let areaBossAvailable = {
  field:  false,
  forest: false,
  cave:   false,
  mine:   false
};

// 探索滞在状態（UI側と共有）
window.isExploring   = false;      // 街にいる: false / どこか探索中: true
window.exploringArea = "field";    // 現在探索しているエリアID

// 撤退状態管理（UI と共有するため window 配下に載せる）
window.isRetreating     = false;   // 撤退中かどうか
window.retreatTurnsLeft = 0;       // 帰還までに必要な残りターン数
window.RETREAT_TURNS    = 3;       // 撤退開始時に必要なターン数（調整用）

// ポーション選択の記憶
let lastSelectedFieldPotionId  = null;
let lastSelectedBattleItemId   = null;

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

  if (area) {
    area.style.display = visible ? "block" : "none";
  }

  const show = visible ? "inline-block" : "none";
  if (attackBtn) attackBtn.style.display = show;
  if (escapeBtn) escapeBtn.style.display = show;
  if (itemBtn)   itemBtn.style.display   = show;
}

// =======================
// 敵生成系
// =======================

function pickRandomEnemyId(areaId) {
  const table = AREA_ENEMY_TABLE[areaId];
  if (!table || table.length === 0) return null;
  const idx = Math.floor(Math.random() * table.length);
  return table[idx];
}

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
// 撤退進行処理
// =======================

function handleRetreatProgress() {
  if (!window.isRetreating) return false;

  window.retreatTurnsLeft--;
  if (window.retreatTurnsLeft > 0) {
    appendLog(`出口へ向かって撤退中… 残り${window.retreatTurnsLeft}ターン。`);
    return false;
  }

  // 帰還確定
  window.isRetreating     = false;
  window.retreatTurnsLeft = 0;

  window.isExploring   = false;
  window.exploringArea = "field";

  appendLog("なんとか街までたどり着いた… ひとまず安全だ。");

  if (typeof setBattleCommandVisible === "function") {
    setBattleCommandVisible(false);
  }
  if (typeof updateReturnTownButton === "function") {
    updateReturnTownButton();
  }
  if (typeof updateDisplay === "function") {
    updateDisplay();
  }

  return true;
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

  // 撤退進行を先に処理し、このターンで街に着いたら以降の処理を行わない
  if (handleRetreatProgress()) {
    return;
  }

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

  updateReturnTownButton();
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

      // 撤退状態は死亡でリセット
      window.isRetreating     = false;
      window.retreatTurnsLeft = 0;

      window.isExploring   = false;
      window.exploringArea = "field";

      hp = hpMax;
      mp = mpMax;
      sp = spMax;
      petHp = petHpMax;

      money = Math.floor(money / 2);

      let brokeSomething = false;

      function reduceDurabilityOnEquipTrap() {
        if (typeof equippedWeaponIndex === "number" &&
            Array.isArray(window.weaponInstances)) {
          const idx = equippedWeaponIndex;
          const inst = window.weaponInstances[idx];
          if (inst) {
            const MAX_DURABILITY_LOCAL = typeof MAX_DURABILITY === "number" ? MAX_DURABILITY : 10;
            inst.durability = Math.max(0, (inst.durability ?? MAX_DURABILITY_LOCAL) - 1);
            if (inst.durability <= 0) {
              const wName = (weapons.find(w => w.id === inst.id)?.name) || inst.id;
              appendLog(`${wName} は壊れて消滅した…`);
              const cnt = weaponCounts[inst.id] || 0;
              weaponCounts[inst.id] = Math.max(0, cnt - 1);
              window.weaponInstances.splice(idx, 1);
              equippedWeaponIndex = null;
              equippedWeaponId    = null;
              brokeSomething = true;
            } else {
              brokeSomething = true;
            }
          }
        }

        if (typeof equippedArmorIndex === "number" &&
            Array.isArray(window.armorInstances)) {
          const idx = equippedArmorIndex;
          const inst = window.armorInstances[idx];
          if (inst) {
            const MAX_DURABILITY_LOCAL = typeof MAX_DURABILITY === "number" ? MAX_DURABILITY : 10;
            inst.durability = Math.max(0, (inst.durability ?? MAX_DURABILITY_LOCAL) - 1);
            if (inst.durability <= 0) {
              const aName = (armors.find(a => a.id === inst.id)?.name) || inst.id;
              appendLog(`${aName} は壊れて消滅した…`);
              const cnt = armorCounts[inst.id] || 0;
              armorCounts[inst.id] = Math.max(0, cnt - 1);
              window.armorInstances.splice(idx, 1);
              equippedArmorIndex = null;
              equippedArmorId    = null;
              brokeSomething = true;
            } else {
              brokeSomething = true;
            }
          }
        }

        if (!Array.isArray(window.weaponInstances) && equippedWeaponId && Array.isArray(weapons)) {
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

        if (!Array.isArray(window.armorInstances) && equippedArmorId && Array.isArray(armors)) {
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
        else              tier = "t3"; // t4 は出さない
      } else if (area === "mine") {
        const r = Math.random();
        if      (r < 0.2) tier = "t2";
        else              tier = "t3";
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

function startBossBattleFromUI() {
  const area = window.isExploring
    ? (window.exploringArea || getCurrentArea())
    : getCurrentArea();
  startBossBattleForArea(area);
}

// =======================
// 撃破処理（経験値・お金・ボスフラグ）
// =======================

function onEnemyDefeatedCore(enemyInst, killFlag, killSource) {
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

  // ここでは「誰がトドメを刺したか」は扱わず、ギルド依頼のカウントは
  // game-core-3.js 側の onEnemyKilledBy〜 系フックに委ねる。

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

  // HP 回復
  if ((p.type === POTION_TYPE_HP || p.type === POTION_TYPE_BOTH) && typeof hp !== "undefined") {
    const max = typeof hpMax === "number" ? hpMax : hp;
    const val = Math.floor((max * (p.power || 0)) + (p.flat || 0));
    if (val > 0) {
      hp = Math.max(0, Math.min(max, hp + val));
    }
  }

  // MP 回復
  if ((p.type === POTION_TYPE_MP || p.type === POTION_TYPE_BOTH) && typeof mp !== "undefined") {
    const max = typeof mpMax === "number" ? mpMax : mp;
    const val = Math.floor((max * (p.power || 0)) + (p.flat || 0));
    if (val > 0) {
      mp = Math.max(0, Math.min(max, mp + val));
    }
  }

  // ダメージポーション（敵に投げる系）が定義されている場合の簡易対応
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
        let label = id;
        if (id === "bomb") {
          label = "爆弾";
        } else if (id.startsWith("bomb_T1")) {
          label = "爆弾T1";
        } else if (id.startsWith("bomb_T2")) {
          label = "爆弾T2";
        } else if (id.startsWith("bomb_T3")) {
          label = "爆弾T3";
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
      bomb:    7,
      bomb_T1: 15,
      bomb_T2: 30,
      bomb_T3: 60
    };
    const dmg = BOMB_DAMAGE_TABLE[id] || 5;

    carryTools[id] = have - 1;
    if (carryTools[id] <= 0) {
      delete carryTools[id];
    }

    if (!currentEnemy) {
      appendLog("攻撃する敵がいない");
    } else {
      const beforeHp = enemyHp;
      enemyHp = Math.max(0, enemyHp - dmg);
      appendLog(`爆弾を投げつけた！ ${currentEnemy.name}に${dmg}ダメージ！（HP ${beforeHp} → ${enemyHp}）`);
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

  // 飲み物ステータスは「飲み物バフ」扱いにする
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

  applyFoodEffect(recipe.effect, id);

  carryFoods[id] = have - 1;
  if (carryFoods[id] <= 0) delete carryFoods[id];

  appendLog(`${recipe.name} を食べた！`);

  // ★ バフ付き料理ギルド依頼用：バフ付き料理を食べたらカウント
  if (recipe.effect.statusId && typeof onBuffFoodEatenForGuild === "function") {
    onBuffFoodEatenForGuild();
  }

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

  applyDrinkEffect(recipe.effect, id);

  carryDrinks[id] = have - 1;
  if (carryDrinks[id] <= 0) delete carryDrinks[id];

  appendLog(`${recipe.name} を飲んだ！`);

  // ★ バフ飲み物も依頼対象に含めるならここでカウント
  if (recipe.effect.statusId && typeof onBuffFoodEatenForGuild === "function") {
    onBuffFoodEatenForGuild();
  }

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
  // mode: "normal" | "quantity" | "quality"
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

// 拠点モード取得・設定（normal / quantity / quality）
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
    const label = getGatherSkillLabel(matKey);
    appendLog(`この拠点をLv${nextLv}にするには、採取スキル(${label}) Lv${def.reqGatherLv}が必要だ。`);
    return;
  }

  const needInter = def.costs.intermediate || {};
  const needStar  = def.costs.starShard || 0;

  if (!intermediateMats) {
    appendLog("中間素材の所持データが見つからない。");
    return;
  }

  (function showRequiredMats() {
    let lines = [];
    const label = getGatherSkillLabel(matKey);
    lines.push(`採取拠点(${label}) Lv${currentLv} → Lv${nextLv} に必要な中間素材:`);
    for (const iid in needInter) {
      const need = needInter[iid] || 0;
      const have = intermediateMats[iid] || 0;
      lines.push(`- ${iid}: 必要 ${need} 個 / 所持 ${have} 個`);
    }
    if (needStar > 0) {
      const haveStar = intermediateMats["starShard"] || 0;
      lines.push(`- starShard: 必要 ${needStar} 個 / 所持 ${haveStar} 個`);
    }
    appendLog(lines.join("\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n"));
  })();

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
  const label = getGatherSkillLabel(matKey);
  appendLog(`採取拠点(${label})がLv${nextLv}になった！`);

  if (typeof updateDisplay === "function") {
    updateDisplay();
  }
}

// =======================
// 自動採取ストック（6時間=72tick 上限）
// =======================

let gatherBaseStockTicks = 0;
const GATHER_BASE_STOCK_MAX_TICKS = 72;

function consumeGatherBaseStockTick() {
  if (gatherBaseStockTicks <= 0) return;
  gatherBaseStockTicks--;
  tickGatherBasesOnce();
}

function tickGatherBasesOnceStocked() {
  if (gatherBaseStockTicks < GATHER_BASE_STOCK_MAX_TICKS) {
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

    // モード別補正（normal は補正なし）
    if (mode === "quantity") {
      // 量特化: t1 +1（最低1確保）、t2Chance 少し下げる
      t1Min = Math.max(0, t1Min + 1);
      t1Max = t1Max + 1;
      t2Chance = Math.max(0, t2Chance - 0.03);
    } else if (mode === "quality") {
      // 質特化: t1 -1（0未満は0）、t2Chance 少し上げる
      t1Min = Math.max(0, t1Min - 1);
      t1Max = Math.max(t1Min, t1Max - 1);
      t2Chance = Math.min(1, t2Chance + 0.05);
    }

    if (Math.random() < baseFail) {
      return;
    }

    const mat = materials[matKey];
    if (!mat) return;

    const t1Amount = t1Min + Math.floor(Math.random() * (t1Max - t1Min + 1));
    if (t1Amount > 0) {
      mat.t1 = (mat.t1 || 0) + t1Amount;
    }

    if (t2Chance > 0 && Math.random() < t2Chance && t2Amount > 0) {
      mat.t2 = (mat.t2 || 0) + t2Amount;
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