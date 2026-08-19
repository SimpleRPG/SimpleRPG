// game-core-5.js
// 探索・ランダムイベント・敵関連ロジック（エリア出現・ボス生成・撃破処理）工場区画
//

// =======================
// 探索エリアマスタ（T1〜T10想定）
// ※既存4エリアの仕様は維持しつつ、後からエリアを追加しやすくするためのマスタ定義
// =======================

const EXPLORE_AREA_MASTER = {
  // 既存エリア（文言はそのまま）
  field: {
    id: "field",
    name: "草原（0転生レベル100でボス目安）",
    // 初期から解放
    unlock: null
  },
  forest: {
    id: "forest",
    name: "森（10転生目安）",
    // 草原ボス撃破で解放（従来仕様と同じ）
    unlock: { type: "bossCleared", area: "field" }
  },
  cave: {
    id: "cave",
    name: "洞窟（20転生目安）",
    // 森ボス撃破で解放
    unlock: { type: "bossCleared", area: "forest" }
  },
  mine: {
    id: "mine",
    name: "廃鉱山（40転生目安）",
    // 洞窟ボス撃破で解放
    unlock: { type: "bossCleared", area: "cave" }
  },

  // ここから先はT5〜T10用の追加エリア想定（実際に使うときは enemy-data.js 側も合わせて定義する）
  // 仕様を変えないため、デフォルトでは選択肢に出ても動作は既存ロジックに従うだけ。
  desert: {
    id: "desert",
    name: "灼熱の砂漠（T5想定）",
    unlock: { type: "bossCleared", area: "mine" }
  },
  swamp: {
    id: "swamp",
    name: "毒沼（T6想定）",
    unlock: { type: "bossCleared", area: "desert" }
  },
  ruin: {
    id: "ruin",
    name: "古代遺跡（T7想定）",
    unlock: { type: "bossCleared", area: "swamp" }
  },
  sky: {
    id: "sky",
    name: "浮遊島（T8想定）",
    unlock: { type: "bossCleared", area: "ruin" }
  },
  ice: {
    id: "ice",
    name: "氷の塔（T9想定）",
    unlock: { type: "bossCleared", area: "sky" }
  },
  hell: {
  id: "hell",
  name: "地獄の門（T10想定）",
  unlock: { type: "bossCleared", area: "ice" }
}
};

// エリアごとの状態マップをマスタから生成
function createAreaStateMap(initialValue) {
  const map = {};
  Object.keys(EXPLORE_AREA_MASTER).forEach(areaId => {
    map[areaId] = initialValue;
  });
  return map;
}

// エリア解放判定（既存の areaBossCleared との互換を保ちつつ拡張可能に）
function isAreaUnlocked(areaId) {
  const def = EXPLORE_AREA_MASTER[areaId];
  if (!def) return false;

  const cond = def.unlock;
  if (!cond) return true;

  if (cond.type === "bossCleared") {
    // 既存の areaBossCleared をそのまま利用
    if (typeof areaBossCleared === "undefined") return true;
    return !!areaBossCleared[cond.area];
  }

  // 将来: レベル条件やギルド名声などを追加する余地
  // if (cond.type === "level") { ... }
  // if (cond.type === "guildFame") { ... }

  return true;
}

// =======================
// グローバル状態（探索・ボス）
// =======================

let areaBossAvailable   = createAreaStateMap(false);
let consecutiveExplores = createAreaStateMap(0);
let lastExploreSuccess  = createAreaStateMap(true);

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

  // 既存仕様を維持しつつ、マスタ定義に基づいてエリアを列挙
  Object.keys(EXPLORE_AREA_MASTER).forEach(areaId => {
    const def = EXPLORE_AREA_MASTER[areaId];
    if (!def) return;

    // 解放済みエリアのみ表示（従来の areaBossCleared チェックを一般化）
    if (!isAreaUnlocked(areaId)) {
      return;
    }

    const opt = document.createElement("option");
    opt.value = areaId;
    opt.textContent = def.name;
    sel.appendChild(opt);
  });

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
  if (!consecutiveExplores.hasOwnProperty(areaId)) return;
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
  if (!lastExploreSuccess.hasOwnProperty(areaId)) return;
  lastExploreSuccess[areaId] = true;
}

// =======================
// 探索時のボス発見判定
// =======================

function tryFindBossOnExplore() {
  const area = window.isExploring
    ? (window.exploringArea || getCurrentArea())
    : getCurrentArea();
  if (!areaBossAvailable.hasOwnProperty(area)) return;
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
  // ★動物使い/獣群使いは、最初の草原限定で野生動物と遭遇できる。
  //   罠・宝箱・回復泉と同列の抽選対象にする（4分岐時のみ枠が増える）。
  const canPetEncounter = (area === "field" &&
      typeof jobHasPetTurn === "function" && jobHasPetTurn() &&
      typeof getActivePetSlotLimit === "function" &&
      Array.isArray(window.petList) &&
      window.petList.length < getActivePetSlotLimit());

  const roll = Math.random();

  // 野生動物と出会えない場合は従来どおり罠34%/宝箱33%/泉33%。
  // 出会える場合は罠25%/宝箱25%/泉25%/野生動物25%に均等化する。
  const trapMax   = canPetEncounter ? 0.25 : 0.34;
  const chestMax  = canPetEncounter ? 0.50 : 0.67;
  const springMax = canPetEncounter ? 0.75 : 1.0;

  if (roll < trapMax) {
    // 罠ダメージ
    const maxHp = hpMax || 1;
    const damage = Math.max(1, Math.floor(maxHp * 0.05));
    hp = Math.max(0, hp - damage);
    appendLog("足元の罠が作動した！" + damage + "ダメージを受けた。");

    if (hp <= 0) {
      hp = 0;
      appendLog("あなたは罠で倒れてしまった…");

      // ★テト用フック: 罠死
      if (window.isTetoControlling && typeof window.tetoOnPlayerDeath === "function") {
        try {
          window.tetoOnPlayerDeath("trap");
        } catch (e) {
          if (window.console && console.error) console.error(e);
        }
      }

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
  } else if (roll < chestMax) {
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
    } else if (area === "desert") {
      goldMin = 40;  goldMax = 60;
    } else if (area === "swamp") {
      goldMin = 50;  goldMax = 80;
    } else if (area === "ruin") {
      goldMin = 70;  goldMax = 100;
    } else if (area === "sky") {
      goldMin = 90;  goldMax = 130;
    } else if (area === "ice") {
      goldMin = 110; goldMax = 160;
    } else if (area === "hell") {
      goldMin = 130; goldMax = 200;
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

      // ティア決定（T10 エリアまで拡張）
      let tierNum = 1;

      if (area === "field") {
        // T1〜T2（T1中心）
        tierNum = (Math.random() < 0.9) ? 1 : 2;
      } else if (area === "forest") {
        // T1〜T3（T2メイン）
        const r = Math.random();
        if      (r < 0.1) tierNum = 1;
        else if (r < 0.9) tierNum = 2;
        else              tierNum = 3;
      } else if (area === "cave") {
        // T2〜T3
        const r = Math.random();
        if      (r < 0.3) tierNum = 2;
        else              tierNum = 3;
      } else if (area === "mine") {
        // T2〜T4（T3メイン）
        const r = Math.random();
        if      (r < 0.2) tierNum = 2;
        else if (r < 0.8) tierNum = 3;
        else              tierNum = 4;
      } else if (area === "desert") {
        // T3〜T5（T4メイン）
        const r = Math.random();
        if      (r < 0.2) tierNum = 3;
        else if (r < 0.8) tierNum = 4;
        else              tierNum = 5;
      } else if (area === "swamp") {
        // T4〜T6（T5メイン）
        const r = Math.random();
        if      (r < 0.2) tierNum = 4;
        else if (r < 0.8) tierNum = 5;
        else              tierNum = 6;
      } else if (area === "ruin") {
        // T5〜T7（T6メイン）
        const r = Math.random();
        if      (r < 0.2) tierNum = 5;
        else if (r < 0.8) tierNum = 6;
        else              tierNum = 7;
      } else if (area === "sky") {
        // T6〜T8（T7メイン）
        const r = Math.random();
        if      (r < 0.2) tierNum = 6;
        else if (r < 0.8) tierNum = 7;
        else              tierNum = 8;
      } else if (area === "ice") {
        // T7〜T9（T8メイン）
        const r = Math.random();
        if      (r < 0.2) tierNum = 7;
        else if (r < 0.8) tierNum = 8;
        else              tierNum = 9;
      } else if (area === "hell") {
        // T8〜T10（最大 T10）
        const r = Math.random();
        if      (r < 0.2) tierNum = 8;
        else if (r < 0.7) tierNum = 9;
        else              tierNum = 10;
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
  } else if (roll < springMax) {
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
  } else {
    // ここに到達するのは canPetEncounter === true の場合のみ
    doExplorePetEncounter();
    return;
  }
}

// =======================
// 草原の野生動物イベント（動物使い／獣群使い専用）
// =======================

function doExplorePetEncounter() {
  // 草原で捕まえられるのは羊・鹿の2種
  const candidates = ["hitsuji", "shika"];
  const typeId = candidates[Math.floor(Math.random() * candidates.length)];
  const comp = (typeof COMPANION_TYPES !== "undefined")
    ? COMPANION_TYPES.find(c => c.id === typeId)
    : null;
  const compName = comp ? comp.name : typeId;

  // 捕獲率（仮値。バランス調整はここを変えるだけでOK）
  const CAPTURE_RATE = 0.6;

  appendLog(`草むらの奥に${compName}がいるのに気づいた…`);

  const wantsToCatch = window.confirm(`${compName}を見つけた！捕まえますか？`);
  if (!wantsToCatch) {
    appendLog(`そっとしておくことにした。${compName}は草原の奥へ去っていった。`);
    updateDisplay();
    return;
  }

  const captureRoll = Math.random();
  if (captureRoll >= CAPTURE_RATE) {
    appendLog(`${compName}に逃げられてしまった…`);
    updateDisplay();
    return;
  }

  if (typeof recruitAdditionalPet === "function") {
    const newId = recruitAdditionalPet(typeId);
    if (!newId) {
      appendLog(`${compName}と目が合ったが、これ以上は連れて歩けないようだ…`);
    }
    // 成功時のログ（「新しい仲間「◯◯」が加わった！」）は recruitAdditionalPet 内で出力される
  }

  updateDisplay();
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

  if (areaBossAvailable.hasOwnProperty(areaId)) {
    areaBossAvailable[areaId] = false;
  }
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