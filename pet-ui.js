// pet-ui.js
// ペットUI一式（倉庫タブ・拠点タブ共用）

let selectedPetIdForCare = "main";

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
    isCareDoneToday: careDone
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
      </tr>
    </thead>
    <tbody>
  `;

  pets.forEach(pet => {
    const isSelected = pet.id === selectedPetIdForCare;
    const careText = pet.isCareDoneToday ? "済み" : "まだ";
    const careColor = pet.isCareDoneToday ? "#8f8" : "#f88";
    const rowStyle = isSelected
      ? "background-color:rgba(255,255,255,0.06);"
      : "";

    html += `
      <tr class="pet-list-row"
          data-pet-id="${pet.id}"
          style="cursor:pointer; ${rowStyle}">
        <td style="padding:2px 4px;">${pet.name}</td>
        <td style="padding:2px 4px;">${pet.speciesName}</td>
        <td style="padding:2px 4px;">${pet.level}</td>
        <td style="padding:2px 4px;">${pet.affinity}%</td>
        <td style="padding:2px 4px; color:${careColor};">${careText}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  listContainer.innerHTML = html;

  const rows = listContainer.querySelectorAll(".pet-list-row");
  rows.forEach(row => {
    row.addEventListener("click", () => {
      const petId = row.dataset.petId || "main";
      selectedPetIdForCare = petId;
      // 選択ハイライトとお世話ボックスを更新
      renderPetList(root);
      renderPetCareBox(root);
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
      <button type="button" class="petCareChangeBtn">ペットを切り替える</button>
    </div>
    <p style="margin-top:4px; font-size:11px; color:#ccc;">
      ※ ご飯や複数ペット切り替えは今後拡張予定です。
    </p>
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
      // 将来の複数ペット実装用。現状はダミーとしてメッセージのみ表示。
      if (typeof appendLog === "function") {
        appendLog("ペット切り替えは、将来ペットが複数体になったときに実装されます。");
      }
    });
  }
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
}

// 倉庫タブ用
function buildWarehousePetPage() {
  const root = document.getElementById("warehousePagePet");
  buildPetPage(root);
}

// 拠点タブ用（新規）
function buildHousingPetPage() {
  const root = document.getElementById("housingPagePetInner"); // ←HTML側で用意するdiv
  buildPetPage(root);
}

// グローバルエクスポート
if (typeof window !== "undefined") {
  window.buildPetPage = buildPetPage;
  window.buildWarehousePetPage = buildWarehousePetPage;
  window.buildHousingPetPage = buildHousingPetPage;
  window.renderPetList = renderPetList;
  window.renderPetCareBox = renderPetCareBox;
}