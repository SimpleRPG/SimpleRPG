// repair-core.js
// 装備修理システム（装備タブの「装備強化」の横で使う想定）
//
// ・武器/防具インスタンス（weaponInstances / armorInstances）の耐久を最大まで修理
// ・死亡や罠で −30 された耐久をゴールドで戻す用途
// ・戦闘中・探索中は使用不可
// ・UI 側は game-ui.js から refreshRepairUI / execRepairSelected を叩く

console.log("repair-core.js loaded");

// =======================
// 修理対象の列挙
// =======================
//
// ここでは「インスタンス配列がある場合のみ」修理対象にする。
// 旧データ形式（weaponInstances なしで equippedWeaponId だけがある等）は、
// 罠/死亡時のペナルティ側だけで扱う前提。

function getRepairableEquipList() {
  const list = [];

  const MAX_DURABILITY_LOCAL =
    (typeof MAX_DURABILITY === "number") ? MAX_DURABILITY : 10;

  // 武器インスタンス
  if (Array.isArray(window.weaponInstances) && Array.isArray(window.weapons)) {
    window.weaponInstances.forEach((inst, idx) => {
      if (!inst) return;
      const master = weapons.find(w => w.id === inst.id);
      const maxDur = MAX_DURABILITY_LOCAL;
      const curDur = (typeof inst.durability === "number")
        ? inst.durability
        : maxDur;

      // 最大未満なら修理対象
      if (curDur < maxDur) {
        list.push({
          kind: "weapon",
          idx,
          id: inst.id,
          name: master ? master.name : inst.id,
          curDur,
          maxDur
        });
      }
    });
  }

  // 防具インスタンス
  if (Array.isArray(window.armorInstances) && Array.isArray(window.armors)) {
    window.armorInstances.forEach((inst, idx) => {
      if (!inst) return;
      const master = armors.find(a => a.id === inst.id);
      const maxDur = MAX_DURABILITY_LOCAL;
      const curDur = (typeof inst.durability === "number")
        ? inst.durability
        : maxDur;

      if (curDur < maxDur) {
        list.push({
          kind: "armor",
          idx,
          id: inst.id,
          name: master ? master.name : inst.id,
          curDur,
          maxDur
        });
      }
    });
  }

  return list;
}

// =======================
// 修理費の計算
// =======================
//
// 基本: (MAX - 現在) × 単価。
// 単価はとりあえず 3G / 1耐久にしておき、
// 後からバランスを見て調整できるようにまとめておく。

function calcRepairCost(curDur, maxDur) {
  const need = Math.max(0, maxDur - curDur);
  const unit = 3; // 1耐久あたり3G（調整用）
  return need * unit;
}

// =======================
// UI 更新ヘルパ（装備タブ・修理パネル用）
// =======================

function refreshRepairUI() {
  const sel  = document.getElementById("repairTargetSelect");
  const info = document.getElementById("repairInfoText");
  if (!sel || !info) return;

  const list = getRepairableEquipList();
  sel.innerHTML = "";

  if (!list.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "修理が必要な装備はない";
    sel.appendChild(opt);
    info.textContent = "現在、耐久が減っている装備はありません。";
    // 空配列として保持
    sel.dataset._repairList = JSON.stringify([]);
    return;
  }

  list.forEach((e, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `${e.name} (${e.curDur}/${e.maxDur})`;
    sel.appendChild(opt);
  });

  sel.dataset._repairList = JSON.stringify(list);
  sel.selectedIndex = 0;
  updateRepairInfoFromSelect();
}

function updateRepairInfoFromSelect() {
  const sel  = document.getElementById("repairTargetSelect");
  const info = document.getElementById("repairInfoText");
  if (!sel || !info) return;

  const listStr = sel.dataset._repairList;
  if (!listStr) {
    info.textContent = "修理対象を選択してください。";
    return;
  }

  let list;
  try {
    list = JSON.parse(listStr);
  } catch (e) {
    info.textContent = "修理対象を選択してください。";
    return;
  }

  const idx = sel.selectedIndex;
  const data = list[idx];
  if (!data) {
    info.textContent = "修理対象を選択してください。";
    return;
  }

  const cost = calcRepairCost(data.curDur, data.maxDur);
  if (data.curDur >= data.maxDur) {
    info.textContent = `${data.name} はすでに最大耐久です。`;
  } else {
    info.textContent =
      `${data.name} を修理します。耐久 ${data.curDur} → ${data.maxDur}、費用 ${cost}G`;
  }
}

// =======================
// 修理実行
// =======================

function execRepairSelected() {
  if (window.isExploring || window.currentEnemy) {
    appendLog("探索・戦闘中は修理できない！");
    return;
  }

  const sel  = document.getElementById("repairTargetSelect");
  const info = document.getElementById("repairInfoText");
  if (!sel || !info) return;

  const listStr = sel.dataset._repairList;
  if (!listStr) {
    appendLog("修理対象が選択されていない。");
    return;
  }

  let list;
  try {
    list = JSON.parse(listStr);
  } catch (e) {
    appendLog("修理情報の読み込みに失敗した。");
    return;
  }

  const idx = sel.selectedIndex;
  const data = list[idx];
  if (!data) {
    appendLog("修理対象が選択されていない。");
    return;
  }

  if (data.curDur >= data.maxDur) {
    appendLog(`${data.name} はすでに最大耐久だ。`);
    return;
  }

  const cost = calcRepairCost(data.curDur, data.maxDur);
  if ((window.money || 0) < cost) {
    appendLog("お金が足りない…");
    return;
  }

  const MAX_DURABILITY_LOCAL =
    (typeof MAX_DURABILITY === "number") ? MAX_DURABILITY : data.maxDur;

  // 実際に耐久を回復
  if (data.kind === "weapon" && Array.isArray(window.weaponInstances)) {
    const inst = window.weaponInstances[data.idx];
    if (inst) {
      inst.durability = MAX_DURABILITY_LOCAL;
    } else {
      appendLog("修理対象のデータが見つからない。");
      return;
    }
  } else if (data.kind === "armor" && Array.isArray(window.armorInstances)) {
    const inst = window.armorInstances[data.idx];
    if (inst) {
      inst.durability = MAX_DURABILITY_LOCAL;
    } else {
      appendLog("修理対象のデータが見つからない。");
      return;
    }
  } else {
    appendLog("修理対象の種別が不正です。");
    return;
  }

  window.money = (window.money || 0) - cost;
  appendLog(`${data.name} を修理した。（${cost}G支払った）`);

  // ステータス・装備セレクトなどを再計算
  if (typeof refreshEquipSelects === "function") {
    refreshEquipSelects();
  }
  if (typeof recalcStats === "function") {
    recalcStats();
  }
  if (typeof updateDisplay === "function") {
    updateDisplay();
  }

  // 修理リストを再作成
  refreshRepairUI();
}