// guild2.js
// ギルドシステム：UI描画専用（guild.js の後に読み込む）

console.log("guild2.js start (ui)");

// =======================
// UI: ヘッダ
// =======================

function renderGuildHeader() {
  const nameEl  = document.getElementById("guildCurrentName");
  const fameEl  = document.getElementById("guildCurrentFame");
  const rankEl  = document.getElementById("guildCurrentRank");

  if (!nameEl || !fameEl || !rankEl) return;

  if (!window.playerGuildId || !GUILDS[window.playerGuildId]) {
    nameEl.textContent = "未所属";
    fameEl.textContent = "0";
    rankEl.textContent = "-";
    return;
  }

  const g    = GUILDS[window.playerGuildId];
  const fame = getGuildFame(g.id);
  const r    = getGuildRankInfo(fame);

  nameEl.textContent = g.name;
  fameEl.textContent = String(fame);
  rankEl.textContent = r.name;
}

// =======================
// UI: ギルド一覧
// =======================

function renderGuildList() {
  const container = document.getElementById("guildListContainer");
  if (!container) return;
  container.innerHTML = "";

  GUILD_ORDER.forEach(id => {
    const g = GUILDS[id];
    if (!g) return;

    const fame = getGuildFame(id);
    const rank = getGuildRankInfo(fame);

    const box = document.createElement("div");
    box.className = "guild-list-item";
    box.style.border = "1px solid #444";
    box.style.padding = "4px";
    box.style.marginBottom = "4px";
    box.style.background = "#181818";

    const title = document.createElement("div");
    title.style.display = "flex";
    title.style.justifyContent = "space-between";
    title.style.alignItems = "center";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = `${g.name}`;
    nameSpan.style.fontWeight = "bold";

    const typeSpan = document.createElement("span");
    typeSpan.style.fontSize = "11px";
    typeSpan.style.color = "#ccc";
    if (g.type === "battle") typeSpan.textContent = "[戦闘系]";
    else if (g.type === "craft") typeSpan.textContent = "[クラフト系]";
    else if (g.type === "gather") typeSpan.textContent = "[採取系]";
    else typeSpan.textContent = "[その他]";

    title.appendChild(nameSpan);
    title.appendChild(typeSpan);
    box.appendChild(title);

    const desc = document.createElement("div");
    desc.textContent = g.desc;
    desc.style.fontSize = "12px";
    desc.style.marginTop = "2px";
    box.appendChild(desc);

    if (g.detail) {
      const detail = document.createElement("div");
      detail.textContent = g.detail;
      detail.style.fontSize = "11px";
      detail.style.color = "#ccc";
      box.appendChild(detail);
    }

    const statusRow = document.createElement("div");
    statusRow.style.display = "flex";
    statusRow.style.alignItems = "center";
    statusRow.style.justifyContent = "space-between";
    statusRow.style.marginTop = "4px";

    const fameSpan = document.createElement("span");
    fameSpan.style.fontSize = "11px";
    fameSpan.textContent = `名声: ${fame}（ランク: ${rank.name}）`;
    statusRow.appendChild(fameSpan);

    const btnArea = document.createElement("div");

    if (window.playerGuildId === id) {
      const joinedLabel = document.createElement("span");
      joinedLabel.textContent = "所属中";
      joinedLabel.style.fontSize = "11px";
      joinedLabel.style.color = "#8cf";
      btnArea.appendChild(joinedLabel);
    } else if (!window.playerGuildId) {
      const joinBtn = document.createElement("button");
      joinBtn.textContent = "このギルドに入る";
      joinBtn.style.fontSize = "11px";
      joinBtn.addEventListener("click", () => {
        joinGuild(id);
      });
      btnArea.appendChild(joinBtn);
    } else {
      const otherLabel = document.createElement("span");
      otherLabel.textContent = "別ギルド所属中";
      otherLabel.style.fontSize = "11px";
      otherLabel.style.color = "#aaa";
      btnArea.appendChild(otherLabel);
    }

    statusRow.appendChild(btnArea);
    box.appendChild(statusRow);

    const perksBox = document.createElement("div");
    perksBox.style.marginTop = "4px";
    perksBox.style.fontSize = "11px";
    perksBox.style.color = "#ccc";

    const perkTitle = document.createElement("div");
    perkTitle.textContent = "主な名声報酬（ランクボーナス）";
    perksBox.appendChild(perkTitle);

    g.perks.forEach(p => {
      const li = document.createElement("div");
      li.textContent = `・${p.summary}`;
      perksBox.appendChild(li);
    });

    box.appendChild(perksBox);

    container.appendChild(box);
  });
}

// =======================
// UI: 依頼タブ
// =======================

function getGuildQuestList(guildId) {
  const all = window.GUILD_QUESTS || {};
  return all[guildId] || [];
}

// 進捗オブジェクトの形をそろえる
function getGuildQuestProg(id) {
  const raw = window.guildQuestProgress[id] || {};
  return {
    count: raw.count || 0,
    done: !!raw.done,
    rewardTaken: !!raw.rewardTaken,
    accepted: !!raw.accepted,
    note: raw.note || ""
  };
}

// 名声報酬受取処理（依頼タブから呼ぶ）
function claimGuildQuestReward(guildId, questDef, isSpecial) {
  if (!guildId || !questDef) return;
  const id = questDef.id;
  const prog = getGuildQuestProg(id);

  if (!prog.done) {
    if (typeof appendLog === "function") {
      appendLog("まだ依頼の条件を満たしていない。");
    }
    return;
  }
  if (prog.rewardTaken) {
    if (typeof appendLog === "function") {
      appendLog("この依頼の報酬はすでに受け取っている。");
    }
    return;
  }

  // 特別依頼（市民権クエスト）
  if (isSpecial) {
    // 公式フラグを立てる
    window.citizenshipUnlocked = true;

    // 進捗の保存
    const stored = window.guildQuestProgress[id] || {};
    stored.rewardTaken = true;
    stored.done = true;
    stored.accepted = true;
    window.guildQuestProgress[id] = stored;

    if (typeof appendLog === "function") {
      appendLog(`${GUILDS[guildId].name} の特別依頼「${questDef.name}」を達成し、市民権を獲得した！`);
    }

    // ハウジング側の公式エントリポイントを呼ぶ
    if (typeof onCitizenshipUnlockedFromGuild === "function") {
      onCitizenshipUnlockedFromGuild(guildId);
    } else {
      // 念のため、直接UI更新だけでも行う保険
      if (typeof refreshHousingStatusAndTab === "function") {
        refreshHousingStatusAndTab();
      }
      if (typeof updateHousingWarehouseTabs === "function") {
        updateHousingWarehouseTabs();
      }
    }

    renderGuildQuests();
    if (typeof renderGuildRewards === "function") {
      renderGuildRewards();
    }
    return;
  }

  // 通常依頼
  if (questDef.fameReward && questDef.fameReward > 0) {
    addGuildFame(guildId, questDef.fameReward);
  }

  if (guildId === "warrior" || guildId === "mage" || guildId === "tamer") {
    window.combatGuildSkillPoints = (window.combatGuildSkillPoints || 0) + 1;
    if (typeof appendLog === "function") {
      appendLog("戦闘ギルドスキルポイントを1獲得した！");
    }
  }

  const stored = window.guildQuestProgress[id] || {};
  stored.rewardTaken = true;
  stored.accepted = true;
  window.guildQuestProgress[id] = stored;

  if (typeof appendLog === "function") {
    appendLog(`${GUILDS[guildId].name} の依頼「${questDef.name}」を達成し、名声を${questDef.fameReward}獲得した！`);
  }

  renderGuildQuests();

  if (typeof renderGuildRewards === "function") {
    renderGuildRewards();
  }
}

function renderGuildQuests() {
  const listEl = document.getElementById("guildQuestList");
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!window.playerGuildId || !GUILDS[window.playerGuildId]) {
    const p = document.createElement("p");
    p.textContent = "ギルドに所属すると、専用の依頼を受けられます。";
    listEl.appendChild(p);
    return;
  }

  const guildId = window.playerGuildId;
  const quests = getGuildQuestList(guildId);

  if (!quests.length) {
    const p = document.createElement("p");
    p.textContent = "このギルドにはまだ依頼が用意されていません。";
    listEl.appendChild(p);
    return;
  }

  const normalHeader = document.createElement("div");
  normalHeader.textContent = "通常依頼";
  normalHeader.style.fontWeight = "bold";
  normalHeader.style.marginBottom = "4px";
  listEl.appendChild(normalHeader);

  const fame = getGuildFame(guildId);
  const rankInfo = getGuildRankInfo(fame);
  const rank = rankInfo ? rankInfo.id : 0;

  quests.forEach(q => {
    // 汎用ランク条件
    if (typeof q.minRank === "number" && rank < q.minRank) {
      return;
    }

    const box = document.createElement("div");
    box.style.border = "1px solid #444";
    box.style.padding = "4px";
    box.style.marginBottom = "4px";
    box.style.background = "#151515";

    const title = document.createElement("div");
    title.textContent = q.name;
    title.style.fontWeight = "bold";
    box.appendChild(title);

    const desc = document.createElement("div");
    desc.textContent = q.desc;
    desc.style.fontSize = "11px";
    box.appendChild(desc);

    const fameLine = document.createElement("div");
    fameLine.textContent = `報酬: 名声 +${q.fameReward}`;
    fameLine.style.fontSize = "11px";
    fameLine.style.color = "#ccc";
    box.appendChild(fameLine);

    if (q.hint) {
      const hint = document.createElement("div");
      hint.textContent = `ヒント: ${q.hint}`;
      hint.style.fontSize = "11px";
      hint.style.color = "#888";
      box.appendChild(hint);
    }

    const prog = getGuildQuestProg(q.id);
    const status = document.createElement("div");
    status.style.fontSize = "11px";
    status.style.marginTop = "2px";

    if (!prog.accepted) {
      status.textContent = "状態: 未受注";
    } else if (q.id === "warrior_kill_30_phys") {
      status.textContent = prog.done
        ? `状態: 完了（物理撃破 ${prog.count}/30）`
        : `状態: 進行中（物理撃破 ${prog.count}/30）`;
    } else if (q.id === "mage_kill_30_magic") {
      status.textContent = prog.done
        ? `状態: 完了（魔法撃破 ${prog.count}/30）`
        : `状態: 進行中（魔法撃破 ${prog.count}/30）`;
    } else if (q.id === "tamer_kill_30_pet") {
      status.textContent = prog.done
        ? `状態: 完了（ペット撃破 ${prog.count}/30）`
        : `状態: 進行中（ペット撃破 ${prog.count}/30）`;
    } else if (q.id === "battle_boss_1") {
      status.textContent = prog.done
        ? `状態: 完了（スライムキング討伐 ${prog.count}/1）`
        : `状態: 進行中（スライムキング討伐 ${prog.count}/1）`;
    } else if (q.id === "field_kill_100_any") {
      status.textContent = prog.done
        ? `状態: 完了（草原討伐 ${prog.count}/100）`
        : `状態: 進行中（草原討伐 ${prog.count}/100）`;
    } else if (q.id === "forest_kill_100_any") {
      status.textContent = prog.done
        ? `状態: 完了（森討伐 ${prog.count}/100）`
        : `状態: 進行中（森討伐 ${prog.count}/100）`;
    } else if (q.id === "forest_kill_50_phys") {
      status.textContent = prog.done
        ? `状態: 完了（森物理撃破 ${prog.count}/50）`
        : `状態: 進行中（森物理撃破 ${prog.count}/50）`;
    } else if (q.id === "forest_kill_50_magic") {
      status.textContent = prog.done
        ? `状態: 完了（森魔法撃破 ${prog.count}/50）`
        : `状態: 進行中（森魔法撃破 ${prog.count}/50）`;
    } else if (q.id === "forest_kill_50_pet") {
      status.textContent = prog.done
        ? `状態: 完了（森ペット撃破 ${prog.count}/50）`
        : `状態: 進行中（森ペット撃破 ${prog.count}/50）`;
    } else if (q.id === "forest_boss_1") {
      status.textContent = prog.done
        ? `状態: 完了（森ボス討伐 ${prog.count}/1）`
        : `状態: 進行中（森ボス討伐 ${prog.count}/1）`;
    } else if (q.id === "smith_craft_weapon_t1") {
      status.textContent = prog.done
        ? `状態: 完了（T1武器クラフト ${prog.count}/5）`
        : `状態: 進行中（T1武器クラフト ${prog.count}/5）`;
    } else if (q.id === "smith_craft_armor_t1") {
      status.textContent = prog.done
        ? `状態: 完了（T1防具クラフト ${prog.count}/5）`
        : `状態: 進行中（T1防具クラフト ${prog.count}/5）`;
    } else if (q.id === "smith_enhance") {
      status.textContent = prog.done
        ? `状態: 完了（強化 ${prog.count}/2）`
        : `状態: 進行中（強化 ${prog.count}/2）`;
    } else if (q.id === "smith_craft_t1_gear_20") {
      status.textContent = prog.done
        ? `状態: 完了（T1装備クラフト ${prog.count}/20）`
        : `状態: 進行中（T1装備クラフト ${prog.count}/20）`;
    } else if (q.id === "smith_craft_weapon_t2") {
      status.textContent = prog.done
        ? `状態: 完了（T2武器クラフト ${prog.count}/2）`
        : `状態: 進行中（T2武器クラフト ${prog.count}/2）`;
    } else if (q.id === "smith_craft_armor_t2") {
      status.textContent = prog.done
        ? `状態: 完了（T2防具クラフト ${prog.count}/2）`
        : `状態: 進行中（T2防具クラフト ${prog.count}/2）`;
    } else if (q.id === "smith_craft_t2_gear_10") {
      status.textContent = prog.done
        ? `状態: 完了（T2装備クラフト ${prog.count}/10）`
        : `状態: 進行中（T2装備クラフト ${prog.count}/10）`;
    } else if (q.id === "smith_enhance_t2") {
      status.textContent = prog.done
        ? `状態: 完了（T2装備強化 ${prog.count}/3）`
        : `状態: 進行中（T2装備強化 ${prog.count}/3）`;
    } else if (q.id === "alch_craft_potion_t1") {
      status.textContent = prog.done
        ? `状態: 完了（T1ポーションクラフト ${prog.count}/5）`
        : `状態: 進行中（T1ポーションクラフト ${prog.count}/5）`;
    } else if (q.id === "alch_craft_bomb_t1") {
      status.textContent = prog.done
        ? `状態: 完了（T1爆弾クラフト ${prog.count}/3）`
        : `状態: 進行中（T1爆弾クラフト ${prog.count}/3）`;
    } else if (q.id === "alch_craft_t2_potion") {
      status.textContent = prog.done
        ? `状態: 完了（T2ポーションクラフト ${prog.count}/3）`
        : `状態: 進行中（T2ポーションクラフト ${prog.count}/3）`;
    } else if (q.id === "alch_craft_t2_tool") {
      status.textContent = prog.done
        ? `状態: 完了（T2道具/爆弾クラフト ${prog.count}/3）`
        : `状態: 進行中（T2道具/爆弾クラフト ${prog.count}/3）`;
    } else if (q.id === "alch_craft_mix") {
      status.textContent = prog.done
        ? `状態: 完了（ポーション/爆弾クラフト ${prog.count}/10）`
        : `状態: 進行中（ポーション/爆弾クラフト ${prog.count}/10）`;
    } else if (q.id === "alch_use_potion_or_tool") {
      status.textContent = prog.done
        ? `状態: 完了（ポーション/道具使用 ${prog.count}/5）`
        : `状態: 進行中（ポーション/道具使用 ${prog.count}/5）`;
    } else if (q.id === "alch_use_t2_potion_or_tool") {
      status.textContent = prog.done
        ? `状態: 完了（T2ポーション/道具使用 ${prog.count}/5）`
        : `状態: 進行中（T2ポーション/道具使用 ${prog.count}/5）`;
    } else if (q.id === "alch_mass_t2_supply") {
      status.textContent = prog.done
        ? `状態: 完了（T2ポーション/道具クラフト ${prog.count}/10）`
        : `状態: 進行中（T2ポーション/道具クラフト ${prog.count}/10）`;
    } else if (q.id === "cooking_basic_food_t1") {
      status.textContent = prog.done
        ? `状態: 完了（T1料理 ${prog.count}/3）`
        : `状態: 進行中（T1料理 ${prog.count}/3）`;
    } else if (q.id === "cooking_basic_drink_t1") {
      status.textContent = prog.done
        ? `状態: 完了（T1飲み物 ${prog.count}/3）`
        : `状態: 進行中（T1飲み物 ${prog.count}/3）`;
    } else if (q.id === "cooking_buff") {
      status.textContent = prog.done
        ? `状態: 完了（バフ料理 ${prog.count}/2）`
        : `状態: 進行中（バフ料理 ${prog.count}/2）`;
    } else if (q.id === "cooking_t2_food") {
      status.textContent = prog.done
        ? `状態: 完了（T2料理 ${prog.count}/3）`
        : `状態: 進行中（T2料理 ${prog.count}/3）`;
    } else if (q.id === "cooking_t2_drink") {
      status.textContent = prog.done
        ? `状態: 完了（T2飲み物 ${prog.count}/3）`
        : `状態: 進行中（T2飲み物 ${prog.count}/3）`;
    } else if (q.id === "cooking_t2_any") {
      status.textContent = prog.done
        ? `状態: 完了（T2料理/飲み物 ${prog.count}/10）`
        : `状態: 進行中（T2料理/飲み物 ${prog.count}/10）`;
    } else if (q.id === "cooking_variety") {
      status.textContent = prog.done
        ? `状態: 完了（異なる料理/飲み物 ${prog.count}/5）`
        : `状態: 進行中（異なる料理/飲み物 ${prog.count}/5）`;
    } else if (q.id === "cooking_use_food_or_drink") {
      status.textContent = prog.done
        ? `状態: 完了（料理/飲み物バフ ${prog.count}/5）`
        : `状態: 進行中（料理/飲み物バフ ${prog.count}/5）`;
    } else if (q.id === "cooking_eat_t2_food") {
      status.textContent = prog.done
        ? `状態: 完了（T2料理を食べる ${prog.count}/5）`
        : `状態: 進行中（T2料理を食べる ${prog.count}/5）`;
    } else if (q.id === "cooking_drink_t2") {
      status.textContent = prog.done
        ? `状態: 完了（T2飲み物を飲む ${prog.count}/5）`
        : `状態: 進行中（T2飲み物を飲む ${prog.count}/5）`;
    } else if (q.id === "gather_t1_any_30") {
      status.textContent = prog.done
        ? `状態: 完了（T1通常素材 ${prog.count}/30）`
        : `状態: 進行中（T1通常素材 ${prog.count}/30）`;
    } else if (q.id === "gather_t1_wood_30") {
      status.textContent = prog.done
        ? `状態: 完了（T1木材 ${prog.count}/30）`
        : `状態: 進行中（T1木材 ${prog.count}/30）`;
    } else if (q.id === "gather_t1_ore_30") {
      status.textContent = prog.done
        ? `状態: 完了（T1鉱石 ${prog.count}/30）`
        : `状態: 進行中（T1鉱石 ${prog.count}/30）`;
    } else if (q.id === "gather_t1_herb_30") {
      status.textContent = prog.done
        ? `状態: 完了（T1薬草 ${prog.count}/30）`
        : `状態: 進行中（T1薬草 ${prog.count}/30）`;
    } else if (q.id === "gather_t1_cloth_30") {
      status.textContent = prog.done
        ? `状態: 完了（T1布素材 ${prog.count}/30）`
        : `状態: 進行中（T1布素材 ${prog.count}/30）`;
    } else if (q.id === "gather_t1_leather_30") {
      status.textContent = prog.done
        ? `状態: 完了（T1皮素材 ${prog.count}/30）`
        : `状態: 進行中（T1皮素材 ${prog.count}/30）`;
    } else if (q.id === "gather_t1_water_30") {
      status.textContent = prog.done
        ? `状態: 完了（T1水資源 ${prog.count}/30）`
        : `状態: 進行中（T1水資源 ${prog.count}/30）`;
    } else if (q.id === "gather_basic") {
      status.textContent = prog.done
        ? `状態: 完了（T2素材 ${prog.count}/50）`
        : `状態: 進行中（T2素材 ${prog.count}/50）`;
    } else if (q.id === "gather_t2_any_100") {
      status.textContent = prog.done
        ? `状態: 完了（T2素材 ${prog.count}/100）`
        : `状態: 進行中（T2素材 ${prog.count}/100）`;
    } else if (q.id === "gather_t2_wood_30") {
      status.textContent = prog.done
        ? `状態: 完了（T2木材 ${prog.count}/30）`
        : `状態: 進行中（T2木材 ${prog.count}/30）`;
    } else if (q.id === "gather_t2_ore_30") {
      status.textContent = prog.done
        ? `状態: 完了（T2鉱石 ${prog.count}/30）`
        : `状態: 進行中（T2鉱石 ${prog.count}/30）`;
    } else if (q.id === "gather_t2_herb_30") {
      status.textContent = prog.done
        ? `状態: 完了（T2薬草 ${prog.count}/30）`
        : `状態: 進行中（T2薬草 ${prog.count}/30）`;
    } else if (q.id === "gather_t2_cloth_30") {
      status.textContent = prog.done
        ? `状態: 完了（T2布素材 ${prog.count}/30）`
        : `状態: 進行中（T2布素材 ${prog.count}/30）`;
    } else if (q.id === "gather_t2_leather_30") {
      status.textContent = prog.done
        ? `状態: 完了（T2皮素材 ${prog.count}/30）`
        : `状態: 進行中（T2皮素材 ${prog.count}/30）`;
    } else if (q.id === "gather_t2_water_30") {
      status.textContent = prog.done
        ? `状態: 完了（T2水資源 ${prog.count}/30）`
        : `状態: 進行中（T2水資源 ${prog.count}/30）`;
    } else if (q.id === "gather_t3") {
      status.textContent = prog.done
        ? `状態: 完了（T3素材 ${prog.count}/5）`
        : `状態: 進行中（T3素材 ${prog.count}/5）`;
    } else if (q.id === "food_hunt_t1_30") {
      status.textContent = prog.done
        ? `状態: 完了（狩猟食材 ${prog.count}/30）`
        : `状態: 進行中（狩猟食材 ${prog.count}/30）`;
    } else if (q.id === "food_fish_t1_30") {
      status.textContent = prog.done
        ? `状態: 完了（釣り食材 ${prog.count}/30）`
        : `状態: 進行中（釣り食材 ${prog.count}/30）`;
    } else if (q.id === "food_farm_t1_30") {
      status.textContent = prog.done
        ? `状態: 完了（農園食材 ${prog.count}/30）`
        : `状態: 進行中（農園食材 ${prog.count}/30）`;
    } else if (q.id === "food_hunt_t1_50") {
      status.textContent = prog.done
        ? `状態: 完了（狩猟食材 ${prog.count}/50）`
        : `状態: 進行中（狩猟食材 ${prog.count}/50）`;
    } else if (q.id === "food_fish_t1_50") {
      status.textContent = prog.done
        ? `状態: 完了（釣り食材 ${prog.count}/50）`
        : `状態: 進行中（釣り食材 ${prog.count}/50）`;
    } else if (q.id === "food_farm_t1_50") {
      status.textContent = prog.done
        ? `状態: 完了（農園食材 ${prog.count}/50）`
        : `状態: 進行中（農園食材 ${prog.count}/50）`;
    } else if (q.id === "food_mat") {
      status.textContent = prog.done
        ? `状態: 完了（料理素材 ${prog.count}/70）`
        : `状態: 進行中（料理素材 ${prog.count}/70）`;
    } else if (q.id === "food_mat_150") {
      status.textContent = prog.done
        ? `状態: 完了（料理素材 ${prog.count}/150）`
        : `状態: 進行中（料理素材 ${prog.count}/150）`;
    } else if (q.id === "food_rare") {
      status.textContent = prog.done
        ? `状態: 完了（レア食材 ${prog.count}/1）`
        : `状態: 進行中（レア食材 ${prog.count}/1）`;
    } else if (q.id === "warrior_rebirth_1") {
      status.textContent = prog.done
        ? `状態: 完了（戦士転生 ${prog.count}/1）`
        : `状態: 進行中（戦士転生 ${prog.count}/1）`;
    } else if (q.id === "mage_rebirth_1") {
      status.textContent = prog.done
        ? `状態: 完了（魔法使い転生 ${prog.count}/1）`
        : `状態: 進行中（魔法使い転生 ${prog.count}/1）`;
    } else if (q.id === "tamer_rebirth_1") {
      status.textContent = prog.done
        ? `状態: 完了（動物使い転生 ${prog.count}/1）`
        : `状態: 進行中（動物使い転生 ${prog.count}/1）`;
    } else {
      status.textContent = prog.done
        ? "状態: 完了"
        : "状態: 進行中（システム実装予定）";
    }
    box.appendChild(status);

    const btnRow = document.createElement("div");
    btnRow.style.marginTop = "4px";

    if (!prog.accepted) {
      const acceptBtn = document.createElement("button");
      acceptBtn.style.fontSize = "11px";
      acceptBtn.textContent = "依頼を受ける";
      acceptBtn.addEventListener("click", () => {
        acceptGuildQuest(q.id);
      });
      btnRow.appendChild(acceptBtn);
    } else {
      const rewardBtn = document.createElement("button");
      rewardBtn.style.fontSize = "11px";

      if (prog.rewardTaken) {
        rewardBtn.textContent = "報酬受取済み";
        rewardBtn.disabled = true;
      } else if (!prog.done) {
        rewardBtn.textContent = "未達成";
        rewardBtn.disabled = true;
      } else {
        rewardBtn.textContent = "報酬を受け取る";
        rewardBtn.disabled = false;
        rewardBtn.addEventListener("click", () => {
          claimGuildQuestReward(guildId, q, false);
        });
      }

      btnRow.appendChild(rewardBtn);
    }

    box.appendChild(btnRow);

    listEl.appendChild(box);
  });

  // 特別依頼（市民権クエスト）
  if (window.citizenshipUnlocked) return;

  const specialDefs = window.GUILD_SPECIAL_QUESTS || {};
  const specialDef = specialDefs[guildId];
  if (!specialDef) return;

  const fame2 = getGuildFame(guildId);
  const rankInfo2 = getGuildRankInfo(fame2);
  const rank2 = rankInfo2 ? rankInfo2.id : 0;
  if (rank2 < 2) {
    return;
  }

  const prog = getGuildQuestProg(specialDef.id);

  const specialHeader = document.createElement("div");
  specialHeader.textContent = "特別依頼（市民権クエスト）";
  specialHeader.style.fontWeight = "bold";
  specialHeader.style.margin = "8px 0 4px 0";
  specialHeader.style.color = "#ffda6a";
  listEl.appendChild(specialHeader);

  const box = document.createElement("div");
  box.style.border = "1px solid #886600";
  box.style.padding = "4px";
  box.style.marginBottom = "4px";
  box.style.background = "#252010";

  const title = document.createElement("div");
  title.textContent = specialDef.name;
  title.style.fontWeight = "bold";
  box.appendChild(title);

  const desc = document.createElement("div");
  desc.textContent = specialDef.desc;
  desc.style.fontSize = "11px";
  box.appendChild(desc);

  const rewardLine = document.createElement("div");
  rewardLine.textContent = "報酬: 市民権（名声は増えない）";
  rewardLine.style.fontSize = "11px";
  rewardLine.style.color = "#ccc";
  box.appendChild(rewardLine);

  if (specialDef.hint) {
    const hint = document.createElement("div");
    hint.textContent = `ヒント: ${specialDef.hint}`;
    hint.style.fontSize = "11px";
    hint.style.color = "#888";
    box.appendChild(hint);
  }

  const status = document.createElement("div");
  status.style.fontSize = "11px";
  status.style.marginTop = "2px";

  if (!prog.accepted) {
    status.textContent = "状態: 未受注";
  } else if (specialDef.id === "warrior_special_citizen") {
    status.textContent = prog.done
      ? `状態: 完了（洞窟T3物理撃破 ${prog.count}/40）`
      : `状態: 進行中（洞窟T3物理撃破 ${prog.count}/40）`;
  } else if (specialDef.id === "mage_special_citizen") {
    status.textContent = prog.done
      ? `状態: 完了（洞窟T3魔法撃破 ${prog.count}/40）`
      : `状態: 進行中（洞窟T3魔法撃破 ${prog.count}/40）`;
  } else if (specialDef.id === "tamer_special_citizen") {
    status.textContent = prog.done
      ? `状態: 完了（洞窟T3ペット撃破 ${prog.count}/40）`
      : `状態: 進行中（洞窟T3ペット撃破 ${prog.count}/40）`;
  } else if (specialDef.id === "smith_special_citizen") {
    status.textContent = prog.done
      ? `状態: 完了（T3装備クラフト ${prog.count}/12）`
      : `状態: 進行中（T3装備クラフト ${prog.count}/12）`;
  } else if (specialDef.id === "alch_special_citizen") {
    status.textContent = prog.done
      ? `状態: 完了（T3ポーション／爆弾クラフト ${prog.count}/15）`
      : `状態: 進行中（T3ポーション／爆弾クラフト ${prog.count}/15）`;
  } else if (specialDef.id === "cooking_special_citizen") {
    status.textContent = prog.done
      ? `状態: 完了（T3料理／飲み物クラフト ${prog.count}/15）`
      : `状態: 進行中（T3料理／飲み物クラフト ${prog.count}/15）`;
  } else if (specialDef.id === "gather_special_citizen") {
    status.textContent = prog.done
      ? `状態: 完了（T3通常素材 ${prog.count}/60）`
      : `状態: 進行中（T3通常素材 ${prog.count}/60）`;
  } else if (specialDef.id === "food_special_citizen") {
    status.textContent = prog.done
      ? `状態: 完了（料理素材 ${prog.count}/300）`
      : `状態: 進行中（料理素材 ${prog.count}/300）`;
  } else {
    status.textContent = prog.done ? "状態: 完了" : "状態: 進行中";
  }
  box.appendChild(status);

  const btnRow = document.createElement("div");
  btnRow.style.marginTop = "4px";

  if (!prog.accepted) {
    const acceptBtn = document.createElement("button");
    acceptBtn.style.fontSize = "11px";
    acceptBtn.textContent = "依頼を受ける";
    acceptBtn.addEventListener("click", () => {
      acceptGuildQuest(specialDef.id);
    });
    btnRow.appendChild(acceptBtn);
  } else {
    const rewardBtn = document.createElement("button");
    rewardBtn.style.fontSize = "11px";

    if (prog.rewardTaken) {
      rewardBtn.textContent = "報酬受取済み";
      rewardBtn.disabled = true;
    } else if (!prog.done) {
      rewardBtn.textContent = "未達成";
      rewardBtn.disabled = true;
    } else {
      rewardBtn.textContent = "市民権を獲得する";
      rewardBtn.disabled = false;
      rewardBtn.addEventListener("click", () => {
        claimGuildQuestReward(guildId, specialDef, true);
      });
    }

    btnRow.appendChild(rewardBtn);
  }

  box.appendChild(btnRow);

  listEl.appendChild(box);
}

// =======================
// UI: 報酬・称号タブ
// =======================

function renderGuildRewards() {
  const listEl = document.getElementById("guildRewardList");
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!window.playerGuildId || !GUILDS[window.playerGuildId]) {
    const p = document.createElement("p");
    p.textContent = "ギルドに所属すると、名声に応じてランクボーナスが強化されます。";
    listEl.appendChild(p);
    return;
  }

  const guildId = window.playerGuildId;
  const g = GUILDS[guildId];
  const fame = getGuildFame(guildId);
  const currentRank = getGuildRankInfo(fame);

  const header = document.createElement("div");
  header.style.marginBottom = "4px";
  header.style.fontSize = "12px";
  header.textContent = `${g.name} の現在の名声: ${fame}（ランク: ${currentRank.name}）`;
  listEl.appendChild(header);

  const bonusLine = document.createElement("div");
  bonusLine.style.fontSize = "11px";
  bonusLine.style.color = "#8cf";

  const battleBonus = getGuildBattleBonus();
  const gatherBonus = getGuildGatherExtraBonusChance();

  if (g.type === "battle") {
    if (battleBonus.phys > 0) {
      bonusLine.textContent = `現在のランクボーナス: 物理スキルダメージ +${Math.round(battleBonus.phys * 100)}%`;
    } else if (battleBonus.magic > 0) {
      bonusLine.textContent = `現在のランクボーナス: 魔法スキルダメージ +${Math.round(battleBonus.magic * 100)}%`;
    } else if (battleBonus.pet > 0) {
      bonusLine.textContent = `現在のランクボーナス: ペットの与ダメージ +${Math.round(battleBonus.pet * 100)}%`;
    } else {
      bonusLine.textContent = "現在のランクボーナス: まだ発生していません（名声を稼いでランクを上げよう）";
    }
  } else if (g.type === "gather") {
    if (gatherBonus > 0) {
      bonusLine.textContent = `現在のランクボーナス: +1個ボーナス抽選 +${Math.round(gatherBonus * 100)}%`;
    } else {
      bonusLine.textContent = "現在のランクボーナス: まだ発生していません（名声を稼いでランクを上げよう）";
    }
  } else {
    bonusLine.textContent = "現在のランクボーナス: 今後のアップデートで追加予定。";
  }

  listEl.appendChild(bonusLine);

  const nextRank = getNextRankInfo(fame);
  if (nextRank) {
    const next = document.createElement("div");
    next.style.fontSize = "11px";
    next.style.color = "#ccc";
    next.textContent = `次のランク「${nextRank.name}」まで、あと ${nextRank.fame - fame} 名声。`;
    listEl.appendChild(next);
  } else {
    const max = document.createElement("div");
    max.style.fontSize = "11px";
    max.style.color = "#ccc";
    max.textContent = "すでに最高ランクに到達しています。";
    listEl.appendChild(max);
  }

  const table = document.createElement("table");
  table.className = "mat-table";
  table.style.marginTop = "4px";

  const thead = document.createElement("thead");
  const htr = document.createElement("tr");
  ["ランク", "必要名声", "効果要約", "状態"].forEach(text => {
    const th = document.createElement("th");
    th.textContent = text;
    htr.appendChild(th);
  });
  thead.appendChild(htr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  g.perks.forEach(p => {
    const tr = document.createElement("tr");

    const rankTd = document.createElement("td");
    rankTd.textContent = `第${p.rank}段階`;
    tr.appendChild(rankTd);

    const fameTd = document.createElement("td");
    fameTd.textContent = `${p.fame}以上`;
    tr.appendChild(fameTd);

    const sumTd = document.createElement("td");
    sumTd.textContent = p.summary;
    tr.appendChild(sumTd);

    const stateTd = document.createElement("td");
    if (fame >= p.fame) {
      stateTd.textContent = "解放済み（ランクに応じて自動で強化）";
      stateTd.style.color = "#8f8";
    } else {
      stateTd.textContent = "未解放";
      stateTd.style.color = "#ccc";
    }
    tr.appendChild(stateTd);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  listEl.appendChild(table);

  if (typeof renderCombatGuildTreeSection === "function") {
    renderCombatGuildTreeSection(listEl);
  }
}

// =======================
// メイン：ギルドタブ全体再描画
// =======================

function renderGuildUI() {
  renderGuildHeader();
  renderGuildList();
  renderGuildQuests();
  renderGuildRewards();
}

// =======================
// 初期化
// =======================

document.addEventListener("DOMContentLoaded", () => {
  renderGuildHeader();
});