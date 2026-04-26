// game-core-5.js
// 探索・ランダムイベント・敵関連ロジック（エリア出現・ボス生成・撃破処理）工場区画
//

// =======================
// グローバル状態（探索・ボス）
// =======================

let areaBossAvailable = {
  field:  false,
  forest: false,
  cave:   false,
  mine:   false
};

let consecutiveExplores = {
  field: 0,
  forest: 0,
  cave:   0,
  mine:   0
};
let lastExploreSuccess = {
  field: true,
  forest: true,
  cave:   true,
  mine:   true
};

window.isExploring   = false;
window.exploringArea = "field";

window.isRetreating     = false;
window.retreatTurnsLeft = 0;
window.RETREAT_TURNS    = 3;

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
// 探索UI表示切替
// =======================

function setExploreUIVisible(visible) {
  const row = document.querySelector(".explore-header-row");
  if (row) row.style.display = visible ? "flex" : "none";
}

// =======================
// フィールド用アイテム行表示切替
// =======================

function setFieldItemRowsVisible(visible) {
  const rows = document.querySelectorAll(".field-item-row");
  rows.forEach(row => {
    row.style.display = visible ? "" : "none";
  });
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

  bossBtn.style.display = areaBossAvailable[area] ? "inline-block" : "none";
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

  btn.style.display = window.isExploring ? "inline-block" : "none";
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
// 累積ボス用ヘルパ
// =======================

function resetConsecutiveForArea(areaId) {
  if (!consecutiveExplores[areaId] && consecutiveExplores[areaId] !== 0) return;
  consecutiveExplores[areaId] = 0;
  lastExploreSuccess[areaId] = false;
}

function resetConsecutiveAll() {
  for (const k of Object.keys(consecutiveExplores)) {
    consecutiveExplores[k] = 0;
    lastExploreSuccess[k] = false;
  }
}

function markExploreSuccess(areaId) {
  lastExploreSuccess[areaId] = true;
}

// =======================
// 探索時のボス発見判定
// =======================

function tryFindBossOnExplore() {
  const area = window.isExploring
    ? (window.exploringArea || getCurrentArea())
    : getCurrentArea();
  if (areaBossAvailable[area]) return;

  if (!lastExploreSuccess[area]) {
    consecutiveExplores[area] = 0;
    lastExploreSuccess[area] = false;
  }

  consecutiveExplores[area] += 1;
  const count = consecutiveExplores[area];

  let p;
  if (count <= 20) {
    p = 0.00002501;
  } else if (count <= 40) {
    p = 0.00002502;
  } else if (count <= 100) {
    p = 0.10873420;
  } else {
    p = 0.15;
  }

  const roll = Math.random();
  if (roll < p) {
    areaBossAvailable[area] = true;
    appendLog("強い気配を感じる… このエリアのボスに挑めるようになった！");
    if (typeof updateBossButtonUI === "function") {
      updateBossButtonUI();
    }
    resetConsecutiveForArea(area);
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

  window.isRetreating     = false;
  window.retreatTurnsLeft = 0;

  window.isExploring   = false;
  window.exploringArea = "field";

  appendLog("なんとか街までたどり着いた… ひとまず安全だ。");

  resetConsecutiveAll();

  if (typeof setBattleCommandVisible === "function") {
    setBattleCommandVisible(false);
  }
  if (typeof updateReturnTownButton === "function") {
    updateReturnTownButton();
  }
  if (typeof setFieldItemRowsVisible === "function") {
    setFieldItemRowsVisible(true);
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

  if (handleRetreatProgress()) {
    return;
  }

  tryFindBossOnExplore();

  const roll = Math.random();

  if (roll < 0.2) {
    appendLog("何も見つからなかった…");
    markExploreSuccess(area);
    updateReturnTownButton();
    return;
  }

  if (roll < 0.4) {
    doExploreRandomEvent(area);
    markExploreSuccess(area);
    updateReturnTownButton();
    return;
  }

  const enemyId = pickRandomEnemyId(area);
  if (!enemyId) {
    appendLog("敵データが見つからない");
    markExploreSuccess(area);
    updateReturnTownButton();
    return;
  }
  const enemy = createEnemyInstance(enemyId, false);
  if (!enemy) {
    appendLog("敵データの取得に失敗しました");
    markExploreSuccess(area);
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

  markExploreSuccess(area);

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

      window.isRetreating     = false;
      window.retreatTurnsLeft = 0;

      window.isExploring   = false;
      window.exploringArea = "field";

      hp = hpMax;
      mp = mpMax;
      sp = spMax;
      petHp = petHpMax;

      // ★経済ログ用: 罠死亡による所持金半減（戦闘死亡とは区別しておく）
      const moneyBefore = money;
      money = Math.floor(money / 2);

      if (typeof debugRecordEconomy === "function") {
        try {
          debugRecordEconomy(moneyBefore, money, "deathPenaltyTrap");
        } catch (e) {}
      }

      let brokeSomething = false;

      function reduceDurabilityOnEquipTrap() {
        if (typeof equippedWeaponIndex === "number" &&
            Array.isArray(window.weaponInstances)) {
          const idx = equippedWeaponIndex;
          const inst = window.weaponInstances[idx];
          if (inst) {
            const MAX_DURABILITY_LOCAL = typeof MAX_DURABILITY === "number" ? MAX_DURABILITY : 10;
            inst.durability = Math.max(0, (inst.durability ?? MAX_DURABILITY_LOCAL) - 30);
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
            inst.durability = Math.max(0, (inst.durability ?? MAX_DURABILITY_LOCAL) - 30);
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
            w.durability = Math.max(0, w.durability - 30);
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
            a.durability = Math.max(0, a.durability - 30);
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
        appendLog("街に戻った… 休んで回復し、所持ゴールドを半分失い、装備の耐久度が30減少した。");
      } else {
        appendLog("街に戻った… 休んで回復し、所持ゴールドを半分失った。");
      }

      resetConsecutiveAll();

      updateReturnTownButton();
      if (typeof setFieldItemRowsVisible === "function") {
        setFieldItemRowsVisible(true);
      }
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

    // ★経済ログ用: 宝箱前後の所持金
    const moneyBeforeChest = (typeof money === "number") ? money : 0;

    const goldGain = goldMin + Math.floor(Math.random() * (goldMax - goldMin + 1));
    money = (money || 0) + goldGain;
    appendLog("小さな宝箱を見つけた！" + goldGain + "Gを手に入れた。");

    if (typeof debugRecordEconomy === "function") {
      try {
        debugRecordEconomy(moneyBeforeChest, money, "chest");
      } catch (e) {}
    }

    const dropCount = 1 + Math.floor(Math.random() * 2);
    const baseKeys = ["wood","ore","herb","cloth","leather","water"];
    const baseNames = { wood:"木", ore:"鉱石", herb:"草", cloth:"布", leather:"皮", water:"水" };

    for (let i = 0; i < dropCount; i++) {
      const matKey = baseKeys[Math.floor(Math.random() * baseKeys.length)];

      // ティア決定
      let tierNum = 1;
      if (area === "field") {
        tierNum = (Math.random() < 0.9) ? 1 : 2;
      } else if (area === "forest") {
        const r = Math.random();
        if      (r < 0.1) tierNum = 1;
        else if (r < 0.9) tierNum = 2;
        else              tierNum = 3;
      } else if (area === "cave") {
        const r = Math.random();
        if      (r < 0.1) tierNum = 2;
        else              tierNum = 3;
      } else if (area === "mine") {
        const r = Math.random();
        if      (r < 0.2) tierNum = 2;
        else              tierNum = 3;
      }

      // 在庫追加: materials-core 経由 or メタ経由
      if (typeof window.addMatTierCount === "function") {
        window.addMatTierCount(matKey, tierNum, 1);
      } else if (typeof addItemByMeta === "function") {
        const id = `${matKey}_T${tierNum}`;
        addItemByMeta(id, 1);
      }

      const tierLabel = `T${tierNum}`;
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

  resetConsecutiveForArea(areaId);

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