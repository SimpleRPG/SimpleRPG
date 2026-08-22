// pet-ui.js
// ペットUI一式（倉庫タブ・拠点タブ共用）

// ★修正: デフォルトは null にして、最初の描画時に先頭ペットを選ぶ
let selectedPetIdForCare = null;

// =======================
// 表示用データ取得
// =======================

function getPetDisplayInfoListForUI() {
  if (typeof getPetDisplayInfoList === "function") {
    return getPetDisplayInfoList() || [];
  }

  const list = [];

  if (!hasCompanion || !hasCompanion()) {
    return list;
  }

  const compType = (typeof getCurrentCompanionType === "function")
    ? getCurrentCompanionType()
    : null;

  const speciesName = compType ? (compType.name || "不明") : "不明";

  const petName   = typeof window.petName === "string" ? window.petName : "ペット";
  const petLevel  = typeof window.petLevel === "number" ? window.petLevel : 1;
  const petHp     = typeof window.petHp === "number" ? window.petHp : 0;
  const petHpMax  = typeof window.petHpMax === "number" ? window.petHpMax : 0;
  const affinity  = typeof window.petAffinity === "number" ? window.petAffinity : 0;

  let careDone = false;
  if (typeof isPetCareDoneToday === "function") {
    careDone = isPetCareDoneToday();
  }

  list.push({
    id: "main",
    name: petName,
    speciesName,
    level: petLevel,
    hp: petHp,
    hpMax: petHpMax,
    affinity,
    isCareDoneToday: careDone,
    isActive: true
  });

  return list;
}

// =======================
// ペット一覧の描画（共用）
// =======================

function renderPetList(root) {
  if (!root) return;

  let listContainer = root.querySelector(".pet-list-container");
  if (!listContainer) {
    listContainer = document.createElement("div");
    listContainer.className = "pet-list-container";
    root.appendChild(listContainer);
  }

  const pets = getPetDisplayInfoListForUI();

  if (!pets.length) {
    listContainer.innerHTML = `
      <p style="font-size:12px; color:#ccc;">
        まだ一緒に旅するペットがいません。<br>
        動物使いのペット選択から相棒を選びましょう。
      </p>
    `;
    return;
  }

  // ★修正: 選択IDが空か無効なら、アクティブペットを選択状態にする
  const currentActivePetId = window.activePetId || null;
  if (!selectedPetIdForCare || !pets.some(p => p.id === selectedPetIdForCare)) {
    selectedPetIdForCare = currentActivePetId || pets[0].id;
  }

  // ★獣群使い（複数ペット運用職）かどうかで表示を切り替える
  const isMulti = (typeof isMultiPetJob === "function") && isMultiPetJob();
  const maxSlots = (typeof getActivePetSlotLimit === "function") ? getActivePetSlotLimit() : 1;

  let html = "";
  html += `<table class="pet-list-table" style="width:100%; font-size:12px; border-collapse:collapse;">`;
  html += `
    <thead>
      <tr>
        <th style="border-bottom:1px solid #555; text-align:left; padding:2px 4px;">名前</th>
        <th style="border-bottom:1px solid #555; text-align:left; padding:2px 4px;">種族</th>
        <th style="border-bottom:1px solid #555; text-align:left; padding:2px 4px;">Lv</th>
        <th style="border-bottom:1px solid #555; text-align:left; padding:2px 4px;">親密度</th>
        <th style="border-bottom:1px solid #555; text-align:left; padding:2px 4px;">今日のお世話</th>
        <th style="border-bottom:1px solid #555; text-align:center; padding:2px 4px;">${isMulti ? `編成(${maxSlots})` : "★"}</th>
      </tr>
    </thead>
    <tbody>
  `;

  pets.forEach(pet => {
    const isSelected = pet.id === selectedPetIdForCare;
    const isActive = pet.isActive || false;
    const careText = pet.isCareDoneToday ? "済み" : "まだ";
    const careColor = pet.isCareDoneToday ? "#8f8" : "#f88";
    const rowStyle = isSelected
      ? "background-color:rgba(255,255,255,0.06);"
      : "";
    const activeIcon = isMulti
      ? (pet.isInParty ? "🐾" : "")
      : (isActive ? "★" : "");

    html += `
      <tr class="pet-list-row"
          data-pet-id="${pet.id}"
          style="cursor:pointer; ${rowStyle}">
        <td style="padding:2px 4px;">${pet.name}</td>
        <td style="padding:2px 4px;">${pet.speciesName}</td>
        <td style="padding:2px 4px;">${pet.level}</td>
        <td style="padding:2px 4px;">${pet.affinity}%</td>
        <td style="padding:2px 4px; color:${careColor};">${careText}</td>
        <td style="padding:2px 4px; text-align:center; color:#ff0;">${activeIcon}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;

  // ★追加ペットは草原などの探索中の野生動物イベント（doExplorePetEncounter）で
  //   捕獲するのが正規ルート。ここにUIは置かない。
  listContainer.innerHTML = html;

  const rows = listContainer.querySelectorAll(".pet-list-row");
  rows.forEach(row => {
    row.addEventListener("click", () => {
      const petId = row.dataset.petId || null;
      selectedPetIdForCare = petId;
      renderPetList(root);
      renderPetCareBox(root);
      if (typeof renderPetEquipBox === "function") renderPetEquipBox(root);
    });
  });
}

// =======================
// ご飯用ヘルパー（UI側）
// =======================

function getAllAvailableFoodsForPet() {
  const list = [];

  const carryFoods   = window.carryFoods   || {};
  const carryDrinks  = window.carryDrinks  || {};
  const cookedFoods  = window.cookedFoods  || {};
  const cookedDrinks = window.cookedDrinks || {};

  function pushIfPositive(id, count) {
    if (!id || !count || count <= 0) return;
    let name = id;
    if (typeof getItemName === "function") {
      name = getItemName(id);
    }
    list.push({ id, name, count });
  }

  Object.keys(carryFoods).forEach(id => {
    pushIfPositive(id, carryFoods[id] || 0);
  });

  Object.keys(carryDrinks).forEach(id => {
    pushIfPositive(id, carryDrinks[id] || 0);
  });

  Object.keys(cookedFoods).forEach(id => {
    pushIfPositive(id, cookedFoods[id] || 0);
  });

  Object.keys(cookedDrinks).forEach(id => {
    pushIfPositive(id, cookedDrinks[id] || 0);
  });

  return list;
}

function openPetFoodSelectModal(candidates, callback) {
  if (!candidates || !candidates.length) {
    callback(null);
    return;
  }

  const existing = document.getElementById("petFoodSelectModal");
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }

  const overlay = document.createElement("div");
  overlay.id = "petFoodSelectModal";
  overlay.style.position = "fixed";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.right = "0";
  overlay.style.bottom = "0";
  overlay.style.backgroundColor = "rgba(0,0,0,0.6)";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  const box = document.createElement("div");
  box.style.backgroundColor = "#222";
  box.style.border = "1px solid #555";
  box.style.padding = "8px";
  box.style.minWidth = "260px";
  box.style.maxWidth = "360px";
  box.style.fontSize = "12px";
  box.style.color = "#eee";
  box.style.boxShadow = "0 0 10px rgba(0,0,0,0.8)";

  const title = document.createElement("div");
  title.textContent = "ペットにあげる料理を選んでください";
  title.style.marginBottom = "4px";

  const select = document.createElement("select");
  select.style.width = "100%";
  select.style.marginBottom = "6px";

  candidates.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.name}（${c.count}）`;
    select.appendChild(opt);
  });

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.justifyContent = "flex-end";
  btnRow.style.gap = "4px";

  const btnCancel = document.createElement("button");
  btnCancel.type = "button";
  btnCancel.textContent = "やめる";
  btnCancel.style.fontSize = "12px";

  const btnOk = document.createElement("button");
  btnOk.type = "button";
  btnOk.textContent = "あげる";
  btnOk.style.fontSize = "12px";

  btnCancel.addEventListener("click", () => {
    document.body.removeChild(overlay);
    callback(null);
  });

  btnOk.addEventListener("click", () => {
    const id = select.value || null;
    document.body.removeChild(overlay);
    callback(id);
  });

  btnRow.appendChild(btnCancel);
  btnRow.appendChild(btnOk);

  box.appendChild(title);
  box.appendChild(select);
  box.appendChild(btnRow);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// =======================
// お世話ボックスの描画（共用）
// =======================

function renderPetCareBox(root) {
  if (!root) return;

  let careBox = root.querySelector(".pet-care-box");
  if (!careBox) {
    careBox = document.createElement("div");
    careBox.className = "pet-care-box";
    careBox.style.marginTop = "8px";
    careBox.style.padding = "6px";
    careBox.style.border = "1px solid #555";
    careBox.style.fontSize = "12px";
    root.appendChild(careBox);
  }

  const pets = getPetDisplayInfoListForUI();
  if (!pets.length) {
    careBox.innerHTML = `
      <p style="font-size:12px; color:#ccc;">
        ペットがいません。
      </p>
    `;
    return;
  }

  // ★修正: 選択IDの補正（一覧と同じロジック）
  const currentActivePetId = window.activePetId || null;
  if (!selectedPetIdForCare || !pets.some(p => p.id === selectedPetIdForCare)) {
    selectedPetIdForCare = currentActivePetId || pets[0].id;
  }

  const pet = pets.find(p => p.id === selectedPetIdForCare) || pets[0];

  const careText = pet.isCareDoneToday ? "済み" : "まだ";
  const careColor = pet.isCareDoneToday ? "#8f8" : "#f88";

  const isCareDoneTodayFlag = !!pet.isCareDoneToday;
  const pettingDisabledAttr = isCareDoneTodayFlag ? "disabled" : "";
  const pettingNoteText = isCareDoneTodayFlag
    ? "（今日はもう十分撫でてあげた）"
    : "（1日1回まで）";

  let feedDisabledAttr = "";
  let feedNoteText = "（8時間ごと）";

  if (typeof canFeedPetNow === "function" &&
      typeof getPetFeedCooldownRemainingMs === "function") {
    if (!canFeedPetNow()) {
      const remainMs = getPetFeedCooldownRemainingMs() || 0;
      const remainMin = Math.ceil(remainMs / 60000);
      const hours = Math.floor(remainMin / 60);
      const mins  = remainMin % 60;
      const remainText = hours > 0
        ? `${hours}時間${mins > 0 ? mins + "分" : ""}`
        : `${remainMin}分`;
      feedDisabledAttr = "disabled";
      feedNoteText = `（あと${remainText}であげられる）`;
    } else {
      feedDisabledAttr = "";
      feedNoteText = "（8時間ごとにあげられる）";
    }
  }

  // ★修正: 選択中のペットがすでにアクティブかどうかをチェック
  const isAlreadyActive = (selectedPetIdForCare === currentActivePetId);
  const changeDisabledAttr = isAlreadyActive ? "disabled" : "";
  const changeNoteText = isAlreadyActive
    ? "（このペットは既にアクティブです）"
    : "（一覧から選択したペットをアクティブにします）";

  // ★獣群使い用：パーティ編成トグル
  const isMulti = (typeof isMultiPetJob === "function") && isMultiPetJob();
  const maxSlots = (typeof getActivePetSlotLimit === "function") ? getActivePetSlotLimit() : 1;
  const partyIds = (typeof getActivePartyIds === "function") ? getActivePartyIds() : [];
  const isInParty = partyIds.includes(pet.id);
  const partyFull = partyIds.length >= maxSlots;
  const partyBtnDisabled = (!isInParty && partyFull) ? "disabled" : "";
  const partyBtnLabel = isInParty ? "編成から外す" : "編成に入れる";
  const partyNoteText = isInParty
    ? "（このペットは現在パーティに編成されています）"
    : (partyFull ? `（編成が上限 ${maxSlots} 匹に達しています）` : `（現在 ${partyIds.length}/${maxSlots} 匹）`);

  const legacyChangeBlock = `
    <div style="margin-top:8px; padding-top:8px; border-top:1px solid #555;">
      <button type="button" class="petCareChangeBtn" ${changeDisabledAttr}>このペットをアクティブにする</button>
      <span style="font-size:11px; color:#ccc; margin-left:4px;">${changeNoteText}</span>
    </div>
  `;
  const partyChangeBlock = `
    <div style="margin-top:8px; padding-top:8px; border-top:1px solid #555;">
      <button type="button" class="petCarePartyToggleBtn" ${partyBtnDisabled}>${partyBtnLabel}</button>
      <span style="font-size:11px; color:#ccc; margin-left:4px;">${partyNoteText}</span>
    </div>
  `;

  careBox.innerHTML = `
    <div style="margin-bottom:4px;">
      <strong>${pet.name}</strong>
      （${pet.speciesName} / Lv:${pet.level}）<br>
      HP: ${pet.hp} / ${pet.hpMax} /
      親密度: ${pet.affinity}%
    </div>
    <div style="margin-bottom:4px;">
      今日のお世話: <span style="color:${careColor}; font-weight:bold;">${careText}</span>
    </div>
    <div style="display:flex; gap:4px; flex-wrap:wrap; align-items:center;">
      <button type="button" class="petCarePettingBtn" ${pettingDisabledAttr}>撫でる</button>
      <span style="font-size:11px; color:#ccc;">${pettingNoteText}</span>
      <button type="button" class="petCareFeedBtn" ${feedDisabledAttr}>ご飯をあげる</button>
      <span style="font-size:11px; color:#ccc;">${feedNoteText}</span>
    </div>
    ${isMulti ? partyChangeBlock : legacyChangeBlock}
  `;

  const btnPetting = careBox.querySelector(".petCarePettingBtn");
  const btnFeed    = careBox.querySelector(".petCareFeedBtn");
  const btnChange  = careBox.querySelector(".petCareChangeBtn");

  if (btnPetting) {
    btnPetting.addEventListener("click", () => {
      if (typeof carePetPetting === "function") {
        carePetPetting();
        renderPetList(root);
        renderPetCareBox(root);
      } else if (typeof appendLog === "function") {
        appendLog("撫でる機能がまだ準備できていない…。");
      }
    });
  }

  if (btnFeed) {
    btnFeed.addEventListener("click", () => {
      if (typeof feedPetWithItem !== "function") {
        if (typeof appendLog === "function") {
          appendLog("ペットにご飯をあげる機能がまだ準備できていない…。");
        }
        return;
      }

      const candidates = getAllAvailableFoodsForPet();
      if (!candidates.length) {
        if (typeof appendLog === "function") {
          appendLog("あげられる料理や飲み物を持っていない…。");
        }
        return;
      }

      openPetFoodSelectModal(candidates, (selectedId) => {
        if (!selectedId) return;
        feedPetWithItem(selectedId);
        renderPetList(root);
        renderPetCareBox(root);
      });
    });
  }

  if (btnChange) {
    btnChange.addEventListener("click", () => {
      // ★修正: 選択中のペットがすでにアクティブなら何もしない
      if (selectedPetIdForCare === currentActivePetId) {
        if (typeof appendLog === "function") {
          appendLog(`${pet.name}はすでにアクティブです。`);
        }
        return;
      }

      // ★修正: 実際にアクティブペットを切り替える
      if (typeof window.switchActivePet === "function") {
        window.switchActivePet(selectedPetIdForCare);
        if (typeof appendLog === "function") {
          appendLog(`アクティブペットを「${pet.name}」に切り替えました！`);
        }
        
        // ★修正: game-core側のUI更新も呼ぶ
        if (typeof recalcStats === "function") {
          recalcStats();
        }
        if (typeof updateDisplay === "function") {
          updateDisplay();
        }
        
        // ★修正: ペットUI再描画
        renderPetList(root);
        renderPetCareBox(root);
      } else if (typeof appendLog === "function") {
        appendLog("ペット切り替え機能がまだ準備できていない…。");
      }
    });
  }

  const btnPartyToggle = careBox.querySelector(".petCarePartyToggleBtn");
  if (btnPartyToggle) {
    btnPartyToggle.addEventListener("click", () => {
      if (typeof getActivePartyIds !== "function" || typeof setActiveParty !== "function") return;

      const currentParty = getActivePartyIds();
      const inParty = currentParty.includes(pet.id);
      let nextParty;

      if (inParty) {
        // 編成から外す（最低1匹は残す）
        if (currentParty.length <= 1) {
          if (typeof appendLog === "function") {
            appendLog("編成は最低1匹必要なので外せません。");
          }
          return;
        }
        nextParty = currentParty.filter(id => id !== pet.id);
      } else {
        const maxSlots = (typeof getActivePetSlotLimit === "function") ? getActivePetSlotLimit() : 1;
        if (currentParty.length >= maxSlots) {
          if (typeof appendLog === "function") {
            appendLog(`編成が上限（${maxSlots}匹）に達しています。`);
          }
          return;
        }
        nextParty = currentParty.concat([pet.id]);
      }

      if (setActiveParty(nextParty)) {
        if (typeof appendLog === "function") {
          appendLog(inParty
            ? `${pet.name}を編成から外しました。`
            : `${pet.name}を編成に加えました！`);
        }
        if (typeof recalcStats === "function") recalcStats();
        if (typeof updateDisplay === "function") updateDisplay();
        renderPetList(root);
        renderPetCareBox(root);
      }
    });
  }
}

// =======================
// ペット装備UI
// =======================

function renderPetEquipBox(root) {
  if (!root) return;

  let equipBox = root.querySelector(".pet-equip-box");
  if (!equipBox) {
    equipBox = document.createElement("div");
    equipBox.className = "pet-equip-box";
    equipBox.style.marginTop = "8px";
    equipBox.style.padding = "6px";
    equipBox.style.border = "1px solid #555";
    equipBox.style.fontSize = "12px";
    root.appendChild(equipBox);
  }

  const pets = getPetDisplayInfoListForUI();
  if (!pets.length) {
    equipBox.innerHTML = "";
    return;
  }

  const currentActivePetId = window.activePetId || null;
  if (!selectedPetIdForCare || !pets.some(p => p.id === selectedPetIdForCare)) {
    selectedPetIdForCare = currentActivePetId || pets[0].id;
  }

  const petInfo = pets.find(p => p.id === selectedPetIdForCare) || pets[0];
  const rec = Array.isArray(window.petList) ? window.petList.find(p => p.id === petInfo.id) : null;
  const equip = (rec && Array.isArray(rec.equip)) ? rec.equip : [null, null];

  function describeInst(inst) {
    if (!inst) return "（空き）";
    const meta = (typeof getItemMeta === "function") ? getItemMeta(inst.id) : null;
    const name = meta ? meta.name : inst.id;
    const qName = (typeof QUALITY_NAMES !== "undefined" && QUALITY_NAMES[inst.quality || 0])
      ? QUALITY_NAMES[inst.quality || 0]
      : "";
    const enh = inst.enhance ? `+${inst.enhance}` : "";
    const stat = (typeof getPetEquipInstanceStat === "function") ? getPetEquipInstanceStat(inst) : { atk: 0, def: 0 };
    return `${qName}${name}${enh}（ATK+${stat.atk} / DEF+${stat.def}）`;
  }

  let html = `<div style="margin-bottom:4px; font-weight:bold;">${petInfo.name}の装備</div>`;

  for (let i = 0; i < 2; i++) {
    const inst = equip[i] || null;
    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <span>装備${i + 1}: ${describeInst(inst)}</span>
        ${inst ? `<button type="button" class="petEquipUnsetBtn" data-slot="${i}">外す</button>` : ""}
      </div>
    `;
  }

  const inventory = Array.isArray(window.petEquipInstances) ? window.petEquipInstances : [];

  html += `<div style="margin-top:6px; border-top:1px solid #555; padding-top:4px;">倉庫の未装備アイテム</div>`;

  if (!inventory.length) {
    html += `<p style="font-size:11px; color:#ccc;">クラフトしたペット装備がここに並びます。</p>`;
  } else {
    inventory.forEach((inst, idx) => {
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
          <span>${describeInst(inst)}</span>
          <span>
            <button type="button" class="petEquipSetBtn" data-inv="${idx}" data-slot="0">①へ</button>
            <button type="button" class="petEquipSetBtn" data-inv="${idx}" data-slot="1">②へ</button>
          </span>
        </div>
      `;
    });
  }

  equipBox.innerHTML = html;

  equipBox.querySelectorAll(".petEquipUnsetBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const slot = parseInt(btn.dataset.slot, 10);
      if (typeof unequipPetItemToInventory === "function") {
        unequipPetItemToInventory(petInfo.id, slot);
        if (typeof recalcStats === "function") recalcStats();
        if (typeof updateDisplay === "function") updateDisplay();
        renderPetEquipBox(root);
      }
    });
  });

  equipBox.querySelectorAll(".petEquipSetBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const invIdx = parseInt(btn.dataset.inv, 10);
      const slot   = parseInt(btn.dataset.slot, 10);
      if (typeof equipPetItemFromInventory === "function") {
        equipPetItemFromInventory(petInfo.id, slot, invIdx);
        if (typeof recalcStats === "function") recalcStats();
        if (typeof updateDisplay === "function") updateDisplay();
        renderPetEquipBox(root);
      }
    });
  });
}

// =======================
// 共用エントリポイント
// =======================

function buildPetPage(root) {
  if (!root) return;

  root.innerHTML = `
    <div style="font-size:12px; margin-bottom:4px;">
      ペットの状態を確認し、お世話をしたり切り替えたりできます。
    </div>
  `;

  renderPetList(root);
  renderPetCareBox(root);
  renderPetEquipBox(root);
}

// 倉庫タブ用
function buildWarehousePetPage() {
  const root = document.getElementById("warehousePagePet");
  buildPetPage(root);
}

// 拠点タブ用（新規）
function buildHousingPetPage() {
  const root = document.getElementById("housingPagePetInner");
  buildPetPage(root);
}

// グローバルエクスポート
if (typeof window !== "undefined") {
  window.buildPetPage = buildPetPage;
  window.buildWarehousePetPage = buildWarehousePetPage;
  window.buildHousingPetPage = buildHousingPetPage;
  window.renderPetList = renderPetList;
  window.renderPetCareBox = renderPetCareBox;
  window.renderPetEquipBox = renderPetEquipBox;
}