// game-core-5.js
// 探索・ランダムイベント・敵関連ロジック（エリア出現・ボス生成・撃破処理）工場区画
//

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

// ★エリアごとの「連続探索回数（ボス用累積カウンタ）」と直前探索成功フラグ
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
// フィールド用アイテム行の表示切替
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
// 探索時のボス発見判定（累積式・連続探索のみ）
// =======================

function tryFindBossOnExplore() {
  const area = window.isExploring
    ? (window.exploringArea || getCurrentArea())
    : getCurrentArea();
  if (areaBossAvailable[area]) return;

  // 直前探索で中断していた場合はリセットしてからカウント開始
  if (!lastExploreSuccess[area]) {
    consecutiveExplores[area] = 0;
    lastExploreSuccess[area] = false;
  }

  consecutiveExplores[area] += 1;
  const count = consecutiveExplores[area];

  // 20回くらいを繰り返すと旧0.05%相当、40回で旧の倍、100回まで行けばほぼ確定、というイメージ
  let p;
  if (count <= 20) {
    // 20回累積 ≒ 0.05%
    p = 0.00002501;
  } else if (count <= 40) {
    // 40回累積 ≒ 0.1%
    p = 0.00002502;
  } else if (count <= 100) {
    // 100回までにほぼ確定（累積 ≒ 99.9%）
    p = 0.10873420;
  } else {
    // 100回を超えてなお探索を続けているなら高確率を維持
    p = 0.15;
  }

  const roll = Math.random();
  if (roll < p) {
    areaBossAvailable[area] = true;
    appendLog("強い気配を感じる… このエリアのボスに挑めるようになった！");
    if (typeof updateBossButtonUI === "function") {
      updateBossButtonUI();
    }
    // ボス発見したので、このエリアの累積は一旦リセットしておく
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

  // 帰還確定
  window.isRetreating     = false;
  window.retreatTurnsLeft = 0;

  window.isExploring   = false;
  window.exploringArea = "field";

  appendLog("なんとか街までたどり着いた… ひとまず安全だ。");

  // 撤退完了は「探索中断」とみなし累積リセット
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

  // 撤退進行を先に処理し、このターンで街に着いたら以降の処理を行わない
  if (handleRetreatProgress()) {
    return;
  }

  // 毎探索でボス累積判定
  tryFindBossOnExplore();

  const roll = Math.random();

  if (roll < 0.2) {
    appendLog("何も見つからなかった…");
    // 何も起きなくても「探索は成立した」とみなして成功マーク
    markExploreSuccess(area);
    updateReturnTownButton();
    return;
  }

  if (roll < 0.4) {
    doExploreRandomEvent(area);
    // doExploreRandomEvent 内で死亡しなかった場合は探索成功扱いとする
    //（死亡時は内部で街送り＋リセット済み）
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

  // 敵が出たことも「探索成功」とみなす（戦闘中断は別ファイルで処理）
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

      // 死亡で探索中断なので累積も全リセット
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

  // ボス戦に入る＝探索ループは一旦切れるので、そのエリアの累積をリセット
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