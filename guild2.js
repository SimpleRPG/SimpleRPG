// guild2.js
// ギルドシステム：UI描画専用（guild.js の後に読み込む）

// =======================
// UI: ヘッダ
// =======================

function renderGuildHeader() {
  const nameEl  = document.getElementById("guildCurrentName");
  const fameEl  = document.getElementById("guildCurrentFame");
  const rankEl  = document.getElementById("guildCurrentRank");
  const coinsEl = document.getElementById("guildCurrentCoins");

  const coins = typeof getGuildCoins === "function" ? getGuildCoins() : ((typeof window.guildCoins === "number") ? window.guildCoins : 0);
  if (coinsEl) {
    coinsEl.textContent = String(coins);
  }

  if (!nameEl || !fameEl || !rankEl) return;

  if (!window.playerGuildId || !GUILDS[window.playerGuildId]) {
    nameEl.textContent = "未所属";
    fameEl.textContent = "0";
    rankEl.textContent = "-";
    return;
  }

  const g    = GUILDS[window.playerGuildId];
  const fame = typeof getGuildFame === "function" ? getGuildFame(g.id) : ((window.guildFame && window.guildFame[g.id]) || 0);
  const r    = typeof getGuildRankInfo === "function" ? getGuildRankInfo(fame) : { name: "-" };

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

// =======================
// 職業選択モーダル（jobReward が配列のとき用）
// =======================

function openJobSelectModal(guildId, questDef, jobIdList, onSelected) {
  // 既存モーダルがあれば消す
  const old = document.getElementById("guildJobSelectModal");
  if (old && old.parentNode) {
    old.parentNode.removeChild(old);
  }

  const overlay = document.createElement("div");
  overlay.id = "guildJobSelectModal";
  overlay.style.position = "fixed";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.right = "0";
  overlay.style.bottom = "0";
  overlay.style.backgroundColor = "rgba(0,0,0,0.7)";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  const panel = document.createElement("div");
  panel.style.background = "#202020";
  panel.style.border = "1px solid #888";
  panel.style.borderRadius = "4px";
  panel.style.padding = "8px";
  panel.style.minWidth = "260px";
  panel.style.maxWidth = "360px";
  panel.style.color = "#fff";
  panel.style.fontSize = "12px";

  const title = document.createElement("div");
  title.textContent = `${GUILDS[guildId].name}：解放する職業を選んでください`;
  title.style.fontWeight = "bold";
  title.style.marginBottom = "4px";
  panel.appendChild(title);

  const desc = document.createElement("div");
  desc.textContent = questDef ? questDef.name : "職業解放";
  desc.style.marginBottom = "4px";
  panel.appendChild(desc);

  const list = document.createElement("div");
  list.style.margin = "4px 0";

  jobIdList.forEach(jobId => {
    const jobDef = typeof getJobDefById === "function" ? getJobDefById(jobId) : null;
    const jobName = jobDef && jobDef.name ? jobDef.name : `職業ID:${jobId}`;

    const btn = document.createElement("button");
    btn.textContent = jobName;
    btn.style.display = "block";
    btn.style.width = "100%";
    btn.style.marginBottom = "4px";
    btn.style.fontSize = "12px";
    btn.addEventListener("click", () => {
      if (typeof onSelected === "function") {
        onSelected(jobId);
      }
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });

    list.appendChild(btn);
  });

  panel.appendChild(list);

  const cancelRow = document.createElement("div");
  cancelRow.style.textAlign = "right";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "やめる";
  cancelBtn.style.fontSize = "11px";
  cancelBtn.addEventListener("click", () => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  });

  cancelRow.appendChild(cancelBtn);
  panel.appendChild(cancelRow);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
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
    // ※フラグ本体は housing-core.js の onCitizenshipUnlockedFromGuild 側で立てる

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

  // ★職業解放クエストかどうかを判定（type: "job_unlock"）
  const isJobUnlockQuest = questDef.type === "job_unlock";

  // 通常の名声報酬（職業解放クエストでも fameReward があれば加算される）
  if (questDef.fameReward && questDef.fameReward > 0) {
    addGuildFame(guildId, questDef.fameReward);
  }

  // 戦闘ギルド用のスキルポイント（既存仕様）
  if (!isJobUnlockQuest && (guildId === "warrior" || guildId === "mage" || guildId === "tamer")) {
    window.combatGuildSkillPoints = (window.combatGuildSkillPoints || 0) + 1;
    if (typeof appendLog === "function") {
      appendLog("戦闘ギルドスキルポイントを1獲得した！");
    }
  }

  // ★職業解放クエストの場合のみ、職業を解放する
  if (isJobUnlockQuest && typeof unlockGuildJob === "function") {
    const jr = questDef.jobReward;

    // 単一 ID（従来仕様）: そのまま解放
    if (typeof jr === "number") {
      unlockGuildJob(guildId, jr);
      if (typeof appendLog === "function") {
        appendLog(`${GUILDS[guildId].name} の特別訓練「${questDef.name}」を達成し、新しい職業が解放された！`);
      }
    }
    // 配列なら選択式
    else if (Array.isArray(jr) && jr.length > 0) {
      openJobSelectModal(guildId, questDef, jr, function(selectedJobId) {
        unlockGuildJob(guildId, selectedJobId);
        if (typeof appendLog === "function") {
          const jobName = (typeof getJobNameFromId === "function")
            ? getJobNameFromId(selectedJobId)
            : "新しい職業";
          appendLog(`${GUILDS[guildId].name} の特別訓練「${questDef.name}」を達成し、「${jobName}」が解放された！`);
        }

        // 進捗保存と再描画は選択完了時に行う
        const stored2 = window.guildQuestProgress[id] || {};
        stored2.rewardTaken = true;
        stored2.accepted = true;
        window.guildQuestProgress[id] = stored2;

        renderGuildQuests();
        if (typeof renderGuildRewards === "function") {
          renderGuildRewards();
        }
      });

      // モーダルを出した場合、この場では return して二重処理を避ける
      return;
    }
  } else {
    // 従来どおりのログ（職業解放でない通常依頼）
    if (typeof appendLog === "function") {
      appendLog(`${GUILDS[guildId].name} の依頼「${questDef.name}」を達成し、名声を${questDef.fameReward || 0}獲得した！`);
    }
  }

  const stored = window.guildQuestProgress[id] || {};
  stored.rewardTaken = true;
  stored.accepted = true;
  window.guildQuestProgress[id] = stored;

  renderGuildQuests();

  if (typeof renderGuildRewards === "function") {
    renderGuildRewards();
  }
}

// 本日のギルドデイリー一覧を返す（依頼タブ用）
function getTodayGuildDailies() {
  if (!window.playerGuildId || !GUILDS[window.playerGuildId]) {
    return [];
  }

  // 日付が変わっていたらここでリセット（0時リセット）
  if (typeof maybeResetGuildDailiesByDate === "function") {
    maybeResetGuildDailiesByDate();
  }

  const all = window.guildDailyProgress || {};
  return Object.entries(all); // [ [id, prog], ... ]
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

  // 先にデイリー依頼（あれば）を表示
  const dailyEntries = getTodayGuildDailies();
  if (dailyEntries.length > 0) {
    const header = document.createElement("div");
    header.style.margin = "0 0 4px 0";

    const title = document.createElement("div");
    title.textContent = "本日のデイリー依頼";
    title.style.fontWeight = "bold";
    title.style.color = "#ffda6a";
    header.appendChild(title);

    const note = document.createElement("div");
    note.textContent = "※1日1回だけ報酬を受け取れる日課クエストです（報酬: ゴールド100＋経験値80）。";
    note.style.fontSize = "11px";
    note.style.color = "#ccc";
    header.appendChild(note);

    listEl.appendChild(header);

    dailyEntries.forEach(([id, prog]) => {
      const box = document.createElement("div");
      box.style.border = "1px solid #444";
      box.style.padding = "4px";
      box.style.marginBottom = "4px";
      box.style.background = "#151515";

      // 上部行（[デイリー]バッジ + タイトル）
      const titleRow = document.createElement("div");
      titleRow.style.display = "flex";
      titleRow.style.alignItems = "center";
      titleRow.style.gap = "4px";

      const badge = document.createElement("span");
      badge.textContent = "デイリー";
      badge.style.fontSize = "10px";
      badge.style.padding = "1px 4px";
      badge.style.borderRadius = "3px";
      badge.style.backgroundColor = "#335";
      badge.style.color = "#ffda6a";

      const titleSpan = document.createElement("span");
      titleSpan.textContent = prog.name || "ギルドデイリー";
      titleSpan.style.fontWeight = "bold";

      titleRow.appendChild(badge);
      titleRow.appendChild(titleSpan);
      box.appendChild(titleRow);

      if (prog.desc) {
        const desc = document.createElement("div");
        desc.textContent = prog.desc;
        desc.style.fontSize = "11px";
        box.appendChild(desc);
      }

      const status = document.createElement("div");
      status.style.fontSize = "11px";
      status.style.marginTop = "2px";
      status.textContent = `進行: ${prog.count}/${prog.target}`;
      box.appendChild(status);

      const btnRow = document.createElement("div");
      btnRow.style.marginTop = "4px";

      const btn = document.createElement("button");
      btn.style.fontSize = "11px";

      if (prog.rewardTaken) {
        btn.textContent = "報酬受取済み";
        btn.disabled = true;
      } else if (!prog.done) {
        btn.textContent = "未達成";
        btn.disabled = true;
      } else {
        btn.textContent = "報酬を受け取る";
        btn.disabled = false;
        btn.addEventListener("click", () => {
          if (typeof claimGuildDailyReward === "function") {
            claimGuildDailyReward(id);
          }
        });
      }

      btnRow.appendChild(btn);
      box.appendChild(btnRow);

      listEl.appendChild(box);
    });

    // デイリーと通常依頼の区切り
    const sep = document.createElement("hr");
    sep.style.margin = "6px 0";
    listEl.appendChild(sep);
  }

  if (!quests.length) {
    const p = document.createElement("p");
    p.textContent = "このギルドにはまだ通常依頼が用意されていません。";
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

    // ★職業解放クエストかどうかで報酬表示を変える
    const fameLine = document.createElement("div");
    fameLine.style.fontSize = "11px";
    fameLine.style.color = "#ccc";
    if (q.type === "job_unlock") {
      fameLine.textContent = "報酬: 新しい職業（名声報酬は 0）";
    } else {
      fameLine.textContent = `報酬: 名声 +${q.fameReward}`;
    }
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
        // 通常依頼／職業解放依頼ともに同じボタン文言
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

  // 特別依頼
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
  specialHeader.textContent = "特別依頼";
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
  } else if (g.id === "smith") {
    const smithBonus = (typeof getGuildSmithEnhanceBonus === "function") ? getGuildSmithEnhanceBonus() : 0;
    if (smithBonus > 0) {
      bonusLine.textContent = `現在のランクボーナス: 装備強化成功率 +${Math.round(smithBonus * 100)}%`;
    } else {
      bonusLine.textContent = "現在のランクボーナス: まだ発生していません（名声を稼いでランクを上げよう）";
    }
  } else if (g.id === "alchemist") {
    const alcBonus = (typeof getGuildCraftSuccessBonus === "function") ? getGuildCraftSuccessBonus("potion") : 0;
    if (alcBonus > 0) {
      bonusLine.textContent = `現在のランクボーナス: ポーション・道具の製作成功率 +${Math.round(alcBonus * 100)}%`;
    } else {
      bonusLine.textContent = "現在のランクボーナス: まだ発生していません（名声を稼いでランクを上げよう）";
    }
  } else if (g.id === "cooking") {
    const cookBonus = (typeof getGuildCraftSuccessBonus === "function") ? getGuildCraftSuccessBonus("food") : 0;
    if (cookBonus > 0) {
      bonusLine.textContent = `現在のランクボーナス: 料理・飲み物の製作成功率 +${Math.round(cookBonus * 100)}%`;
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
  table.style.marginTop = "6px";
  table.style.width = "100%";
  table.style.fontSize = "11px";

  const thead = document.createElement("thead");
  const htr = document.createElement("tr");
  ["ランク", "認可Tier", "必要名声", "ランク効果 / 認可", "状態"].forEach(text => {
    const th = document.createElement("th");
    th.textContent = text;
    htr.appendChild(th);
  });
  thead.appendChild(htr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const ranks = (typeof GUILD_RANK_THRESHOLDS !== "undefined") ? GUILD_RANK_THRESHOLDS.filter(r => r.id > 0) : [];
  
  ranks.forEach(r => {
    const tr = document.createElement("tr");
    const isUnlocked = fame >= r.fame;
    const isCurrent = currentRank && currentRank.id === r.id;

    if (isCurrent) {
      tr.style.background = "#2a3344";
      tr.style.fontWeight = "bold";
    }

    const rankTd = document.createElement("td");
    rankTd.textContent = `Rank ${r.id} (${r.name})`;
    tr.appendChild(rankTd);

    const tierTd = document.createElement("td");
    tierTd.textContent = `Tier ${r.tier || r.id}`;
    tierTd.style.color = "#ffd700";
    tr.appendChild(tierTd);

    const fameTd = document.createElement("td");
    fameTd.textContent = `${r.fame} 以上`;
    tr.appendChild(fameTd);

    const sumTd = document.createElement("td");
    sumTd.textContent = `ギルド効果 +${r.id * 2}% / Tier ${r.tier || r.id} 武具・素材の取り扱い認可`;
    tr.appendChild(sumTd);

    const stateTd = document.createElement("td");
    if (isCurrent) {
      stateTd.textContent = "★ 現在のランク";
      stateTd.style.color = "#ffda6a";
    } else if (isUnlocked) {
      stateTd.textContent = "到達済み";
      stateTd.style.color = "#88ff88";
    } else {
      stateTd.textContent = "未到達";
      stateTd.style.color = "#888888";
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
// UI: 調達・納品依頼
// =======================

function getDeliveryItemDisplayName(del) {
  if (!del) return "アイテム";
  const { itemType, itemId, tier } = del;
  const t = tier || (typeof parseTieredId === "function" && parseTieredId(itemId) ? parseTieredId(itemId).tier : (itemId && itemId.includes("_t2") ? 2 : 1));

  if (itemType === "mat") {
    const key = (itemId || "").replace(/_t\d+$/i, "").replace(/^T\d+_/, "");
    if (typeof formatMaterialName === "function") {
      return formatMaterialName(key, t);
    }
    const matNames = { wood: "木材", ore: "鉱石", sand: "砂", herb: "薬草", cloth: "布", leather: "皮", water: "水" };
    return `T${t} ${matNames[key] || key}`;
  }

  if (itemType === "foodMat" || itemType === "cookingMat") {
    const foodMatNames = {
      wheat_t1: "小麦", wheat_t2: "黄金小麦",
      meat_t1: "獣肉", meat_t2: "極上肉",
      fish_t1: "川魚", fish_t2: "銀鱗魚"
    };
    return foodMatNames[itemId] || itemId;
  }

  if (itemType === "potion") {
    if (itemId.includes("mp") || itemId.includes("mana")) return `マナポーション(T${t})`;
    return `ポーション(T${t})`;
  }

  if (itemType === "tool") {
    if (itemId.includes("bomb")) return `小爆弾(T${t})`;
    return `道具(T${t})`;
  }

  if (itemType === "drink") {
    if (itemId.includes("soup")) return `野菜スープ(T${t})`;
    return `飲み物(T${t})`;
  }

  if (itemType === "food") {
    if (itemId.includes("jerky")) return `干し肉(T${t})`;
    return `料理(T${t})`;
  }

  if (itemType === "weapon") {
    if (itemId.includes("sword") || itemId.includes("short")) return `青銅の剣(T${t})`;
    return `武器(T${t})`;
  }

  if (itemType === "armor") {
    if (itemId.includes("armor")) return `青銅の胸当て(T${t})`;
    return `防具(T${t})`;
  }

  if (typeof getItemName === "function") {
    const metaName = getItemName(itemId);
    if (metaName) return metaName;
  }

  return itemId || "アイテム";
}

function renderGuildDeliveries() {
  const container = document.getElementById("guildDeliveryList");
  if (!container) return;
  container.innerHTML = "";

  const gid = window.playerGuildId;
  if (!gid || !GUILDS[gid]) {
    container.innerHTML = `<div style="padding:12px; color:#aaa; text-align:center;">ギルドに所属すると、そのギルド専用の調達・納品依頼が表示されます。</div>`;
    return;
  }

  const pool = (window.GUILD_DELIVERY_POOLS && window.GUILD_DELIVERY_POOLS[gid]) || [];
  if (pool.length === 0) {
    container.innerHTML = `<div style="padding:12px; color:#aaa; text-align:center;">現在受注可能な調達依頼はありません。</div>`;
    return;
  }

  pool.forEach(del => {
    const haveCount = typeof getDeliveryItemCount === "function" ? getDeliveryItemCount(del) : 0;
    const isReady = haveCount >= del.count;
    const itemName = getDeliveryItemDisplayName(del);

    const card = document.createElement("div");
    card.className = "guild-delivery-card";
    card.style.border = isReady ? "1px solid #488848" : "1px solid #444";
    card.style.borderRadius = "4px";
    card.style.padding = "8px 10px";
    card.style.marginBottom = "8px";
    card.style.background = isReady ? "#152015" : "#181818";

    const topRow = document.createElement("div");
    topRow.style.display = "flex";
    topRow.style.justifyContent = "space-between";
    topRow.style.alignItems = "center";

    const title = document.createElement("span");
    title.style.fontWeight = "bold";
    title.style.fontSize = "13px";
    title.style.color = isReady ? "#9fef9f" : "#eee";
    title.textContent = del.name;
    topRow.appendChild(title);

    const rewardBadge = document.createElement("span");
    rewardBadge.style.fontSize = "11px";
    rewardBadge.style.color = "#ffd700";
    rewardBadge.style.background = "#2a2810";
    rewardBadge.style.padding = "2px 6px";
    rewardBadge.style.borderRadius = "3px";
    rewardBadge.style.border = "1px solid #554411";
    rewardBadge.textContent = `🪙 コイン +${del.coinReward || 15}枚`;
    topRow.appendChild(rewardBadge);

    card.appendChild(topRow);

    const desc = document.createElement("div");
    desc.style.fontSize = "11px";
    desc.style.color = "#bbb";
    desc.style.marginTop = "4px";
    desc.textContent = del.desc;
    card.appendChild(desc);

    const bottomRow = document.createElement("div");
    bottomRow.style.display = "flex";
    bottomRow.style.justifyContent = "space-between";
    bottomRow.style.alignItems = "center";
    bottomRow.style.marginTop = "6px";
    bottomRow.style.paddingTop = "4px";
    bottomRow.style.borderTop = "1px dashed #333";

    const reqInfo = document.createElement("div");
    reqInfo.style.fontSize = "12px";
    const countColor = haveCount >= del.count ? "#7cfc00" : "#ff8888";
    reqInfo.innerHTML = `納品対象: <span style="font-weight:bold; color:#fff;">${itemName}</span> × ${del.count} （所持: <span style="color:${countColor}; font-weight:bold;">${haveCount}</span>）`;
    bottomRow.appendChild(reqInfo);

    const btn = document.createElement("button");
    btn.className = "smallBtn";
    btn.style.padding = "4px 12px";
    btn.style.fontWeight = "bold";

    if (isReady) {
      btn.textContent = "納品する";
      btn.style.background = "#255c25";
      btn.style.color = "#fff";
      btn.style.borderColor = "#488848";
      btn.addEventListener("click", () => {
        if (typeof submitGuildDelivery === "function") {
          submitGuildDelivery(del.id);
        }
      });
    } else {
      btn.textContent = "素材不足";
      btn.disabled = true;
      btn.style.opacity = "0.5";
    }

    bottomRow.appendChild(btn);
    card.appendChild(bottomRow);
    container.appendChild(card);
  });
}

// =======================
// UI: ギルド交換所（ショップ）
// =======================

function renderGuildShop() {
  const container = document.getElementById("guildShopList");
  if (!container) return;
  container.innerHTML = "";

  const gid = window.playerGuildId;
  if (!gid || !GUILDS[gid]) {
    container.innerHTML = `<div style="padding:12px; color:#aaa; text-align:center;">ギルドに所属すると、そのギルドの製法書交換所を利用できます。</div>`;
    return;
  }

  const recPool = (window.GUILD_SHOP_RECIPES && window.GUILD_SHOP_RECIPES[gid]) || [];
  const goodsPool = (window.GUILD_SHOP_GOODS && window.GUILD_SHOP_GOODS[gid]) || [];

  if (recPool.length === 0 && goodsPool.length === 0) {
    container.innerHTML = `<div style="padding:12px; color:#aaa; text-align:center;">現在取り扱い中の商品はありません。</div>`;
    return;
  }

  const currentCoins = typeof getGuildCoins === "function" ? getGuildCoins() : ((typeof window.guildCoins === "number") ? window.guildCoins : 0);
  const learnedList = Array.isArray(window.guildLearnedRecipes) ? window.guildLearnedRecipes : [];
  const now = Date.now();

  // ===== 1. アクティブバフ表示 =====
  const buffs = window.guildBuffs || {};
  const gatherSec = buffs.gatherBuffUntil > now ? Math.ceil((buffs.gatherBuffUntil - now) / 1000) : 0;
  const combatSec = buffs.combatBuffUntil > now ? Math.ceil((buffs.combatBuffUntil - now) / 1000) : 0;

  if (gatherSec > 0 || combatSec > 0) {
    const buffBanner = document.createElement("div");
    buffBanner.style.background = "#14281a";
    buffBanner.style.border = "1px solid #30603a";
    buffBanner.style.borderRadius = "4px";
    buffBanner.style.padding = "6px 10px";
    buffBanner.style.marginBottom = "10px";
    buffBanner.style.fontSize = "12px";
    buffBanner.style.display = "flex";
    buffBanner.style.flexWrap = "wrap";
    buffBanner.style.gap = "8px";
    buffBanner.style.alignItems = "center";

    let buffHtml = `<span style="font-weight:bold; color:#7cfc00;">✨ 発動中のギルド効果:</span>`;
    if (gatherSec > 0) {
      const min = Math.floor(gatherSec / 60);
      const sec = gatherSec % 60;
      buffHtml += `<span style="background:#1b3d22; padding:2px 6px; border-radius:3px; color:#9fef9f;">🌿 採取集中香（採取量+1/レアUP）: 残り${min}分${sec}秒</span>`;
    }
    if (combatSec > 0) {
      const min = Math.floor(combatSec / 60);
      const sec = combatSec % 60;
      buffHtml += `<span style="background:#3d2b1b; padding:2px 6px; border-radius:3px; color:#ffd79f;">⚔️ 討伐報奨（Exp&Gold+25%）: 残り${min}分${sec}秒</span>`;
    }
    buffBanner.innerHTML = buffHtml;
    container.appendChild(buffBanner);
  }

  // ===== 2. 特産品・家具・チケット・消耗品セクション =====
  if (goodsPool.length > 0) {
    const goodsHeader = document.createElement("div");
    goodsHeader.style.fontWeight = "bold";
    goodsHeader.style.fontSize = "13px";
    goodsHeader.style.color = "#ffd700";
    goodsHeader.style.marginBottom = "6px";
    goodsHeader.style.paddingBottom = "4px";
    goodsHeader.style.borderBottom = "1px solid #443311";
    goodsHeader.textContent = "📦 ギルド物資・家具・便利チケット・消耗品";
    container.appendChild(goodsHeader);

    goodsPool.forEach(good => {
      const haveCount = (typeof getItemCountByMeta === "function") ? getItemCountByMeta(good.itemId) : 0;
      const canAfford = currentCoins >= (good.coinCost || 20);

      const card = document.createElement("div");
      card.className = "guild-shop-card";
      card.style.border = "1px solid #443a22";
      card.style.borderRadius = "4px";
      card.style.padding = "8px 10px";
      card.style.marginBottom = "8px";
      card.style.background = "#1a1814";

      const topRow = document.createElement("div");
      topRow.style.display = "flex";
      topRow.style.justifyContent = "space-between";
      topRow.style.alignItems = "center";

      const title = document.createElement("span");
      title.style.fontWeight = "bold";
      title.style.fontSize = "13px";
      title.style.color = "#ffda6a";
      title.textContent = `${good.icon || "📦"} ${good.name}`;
      topRow.appendChild(title);

      const costBadge = document.createElement("span");
      costBadge.style.fontSize = "11px";
      costBadge.style.color = "#ffd700";
      costBadge.style.background = "#2a2810";
      costBadge.style.padding = "2px 6px";
      costBadge.style.borderRadius = "3px";
      costBadge.style.border = "1px solid #554411";
      costBadge.textContent = `🪙 ${good.coinCost || 20}枚`;
      topRow.appendChild(costBadge);

      card.appendChild(topRow);

      const desc = document.createElement("div");
      desc.style.fontSize = "11px";
      desc.style.color = "#bbb";
      desc.style.marginTop = "4px";
      desc.textContent = good.desc;
      card.appendChild(desc);

      const bottomRow = document.createElement("div");
      bottomRow.style.display = "flex";
      bottomRow.style.justifyContent = "space-between";
      bottomRow.style.alignItems = "center";
      bottomRow.style.marginTop = "6px";
      bottomRow.style.paddingTop = "4px";
      bottomRow.style.borderTop = "1px dashed #333";

      const stockInfo = document.createElement("div");
      stockInfo.style.fontSize = "12px";
      stockInfo.innerHTML = `所持数: <span style="color:#fff; font-weight:bold;">${haveCount}個</span>`;
      bottomRow.appendChild(stockInfo);

      const btnGroup = document.createElement("div");
      btnGroup.style.display = "flex";
      btnGroup.style.gap = "6px";

      if (haveCount > 0 && good.type !== "furniture") {
        const useBtn = document.createElement("button");
        useBtn.className = "smallBtn";
        useBtn.style.padding = "4px 10px";
        useBtn.style.fontWeight = "bold";
        useBtn.style.background = "#1b4d24";
        useBtn.style.color = "#a0ffa0";
        useBtn.style.borderColor = "#2b7d34";
        useBtn.textContent = "使う";
        useBtn.addEventListener("click", () => {
          if (typeof useGuildConsumableItem === "function") {
            useGuildConsumableItem(good.itemId);
          }
        });
        btnGroup.appendChild(useBtn);
      }

      const buyBtn = document.createElement("button");
      buyBtn.className = "smallBtn";
      buyBtn.style.padding = "4px 12px";
      buyBtn.style.fontWeight = "bold";

      if (canAfford) {
        buyBtn.textContent = "交換・購入";
        buyBtn.style.background = "#5c4815";
        buyBtn.style.color = "#ffd700";
        buyBtn.style.borderColor = "#886e25";
        buyBtn.addEventListener("click", () => {
          if (typeof buyGuildGoods === "function") {
            buyGuildGoods(good.id);
          }
        });
      } else {
        buyBtn.textContent = "コイン不足";
        buyBtn.disabled = true;
        buyBtn.style.opacity = "0.5";
      }

      btnGroup.appendChild(buyBtn);
      bottomRow.appendChild(btnGroup);
      card.appendChild(bottomRow);
      container.appendChild(card);
    });
  }

  // ===== 3. 製法書・図面セクション =====
  if (recPool.length > 0) {
    const recHeader = document.createElement("div");
    recHeader.style.fontWeight = "bold";
    recHeader.style.fontSize = "13px";
    recHeader.style.color = "#70a0ff";
    recHeader.style.marginTop = "14px";
    recHeader.style.marginBottom = "6px";
    recHeader.style.paddingBottom = "4px";
    recHeader.style.borderBottom = "1px solid #223355";
    recHeader.textContent = "📜 製法書・レシピ・図面（スキルレベル条件）";
    container.appendChild(recHeader);

    recPool.forEach(rec => {
      const isLearned = learnedList.includes(rec.recipeKey);
      const skillInfo = typeof getGuildRecipeSkillInfo === "function"
        ? getGuildRecipeSkillInfo(rec)
        : { isMet: true, name: "製作", reqLv: 0, curLv: 0 };
      const isSkillLocked = !skillInfo.isMet;
      const canAfford = currentCoins >= (rec.coinCost || 50);

      const card = document.createElement("div");
      card.className = "guild-shop-card";
      card.style.border = isLearned ? "1px solid #335577" : (isSkillLocked ? "1px solid #333" : "1px solid #554422");
      card.style.borderRadius = "4px";
      card.style.padding = "8px 10px";
      card.style.marginBottom = "8px";
      card.style.background = isLearned ? "#101824" : (isSkillLocked ? "#121212" : "#1e1a12");
      card.style.opacity = isSkillLocked ? "0.65" : "1";

      const topRow = document.createElement("div");
      topRow.style.display = "flex";
      topRow.style.justifyContent = "space-between";
      topRow.style.alignItems = "center";

      const title = document.createElement("span");
      title.style.fontWeight = "bold";
      title.style.fontSize = "13px";
      title.style.color = isLearned ? "#70a0ff" : (isSkillLocked ? "#888" : "#ffda6a");
      title.textContent = rec.name;
      topRow.appendChild(title);

      const costBadge = document.createElement("span");
      costBadge.style.fontSize = "11px";
      costBadge.style.color = "#ffd700";
      costBadge.style.background = "#2a2810";
      costBadge.style.padding = "2px 6px";
      costBadge.style.borderRadius = "3px";
      costBadge.style.border = "1px solid #554411";
      costBadge.textContent = `🪙 ${rec.coinCost || 50}枚`;
      topRow.appendChild(costBadge);

      card.appendChild(topRow);

      const desc = document.createElement("div");
      desc.style.fontSize = "11px";
      desc.style.color = isSkillLocked ? "#666" : "#bbb";
      desc.style.marginTop = "4px";
      desc.textContent = rec.desc;
      card.appendChild(desc);

      const bottomRow = document.createElement("div");
      bottomRow.style.display = "flex";
      bottomRow.style.justifyContent = "space-between";
      bottomRow.style.alignItems = "center";
      bottomRow.style.marginTop = "6px";
      bottomRow.style.paddingTop = "4px";
      bottomRow.style.borderTop = "1px dashed #333";

      const reqInfo = document.createElement("div");
      reqInfo.style.fontSize = "12px";
      if (isLearned) {
        reqInfo.innerHTML = `<span style="color:#70a0ff; font-weight:bold;">✓ 習得済み</span>`;
      } else if (isSkillLocked) {
        reqInfo.innerHTML = `<span style="color:#e66;">🔒 必要条件: ${skillInfo.name} Lv${skillInfo.reqLv}以上（現在: Lv${skillInfo.curLv}）</span>`;
      } else {
        reqInfo.innerHTML = `<span style="color:#80d080;">✓ 条件達成: ${skillInfo.name} Lv${skillInfo.reqLv}以上（現在: Lv${skillInfo.curLv}）</span>`;
      }
      bottomRow.appendChild(reqInfo);

      const btn = document.createElement("button");
      btn.className = "smallBtn";
      btn.style.padding = "4px 12px";
      btn.style.fontWeight = "bold";

      if (isLearned) {
        btn.textContent = "習得済み";
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.background = "#223344";
      } else if (isSkillLocked) {
        btn.textContent = `Lv${skillInfo.reqLv}で解放`;
        btn.disabled = true;
        btn.style.opacity = "0.4";
      } else if (canAfford) {
        btn.textContent = "交換・習得";
        btn.style.background = "#5c4815";
        btn.style.color = "#ffd700";
        btn.style.borderColor = "#886e25";
        btn.addEventListener("click", () => {
          if (typeof buyGuildRecipe === "function") {
            buyGuildRecipe(rec.id);
          }
        });
      } else {
        btn.textContent = "コイン不足";
        btn.disabled = true;
        btn.style.opacity = "0.5";
      }

      bottomRow.appendChild(btn);
      card.appendChild(bottomRow);
      container.appendChild(card);
    });
  }

  // ===== 4. 装備許可証（Tier 2〜10 ライセンス）セクション =====
  const licenseHeader = document.createElement("div");
  licenseHeader.style.fontWeight = "bold";
  licenseHeader.style.fontSize = "13px";
  licenseHeader.style.color = "#ffb84d";
  licenseHeader.style.marginTop = "16px";
  licenseHeader.style.marginBottom = "6px";
  licenseHeader.style.paddingBottom = "4px";
  licenseHeader.style.borderBottom = "1px solid #553311";
  licenseHeader.innerHTML = `🎖️ 装備許可証（ギルド公認 Tier装備ライセンス）`;
  container.appendChild(licenseHeader);

  const licenseDesc = document.createElement("div");
  licenseDesc.style.fontSize = "11px";
  licenseDesc.style.color = "#bbb";
  licenseDesc.style.marginBottom = "10px";
  licenseDesc.textContent = "Tier 2以上の武器・防具を装備するために必要な許可証です。スキルレベル10毎（Lv10, 20, 30...）に上位Tierの許可証が解放され、ギルドコインで交換できます。";
  container.appendChild(licenseDesc);

  // カテゴリフィルタータブ
  window._guildShopLicenseCategory = window._guildShopLicenseCategory || "all";
  const filterRow = document.createElement("div");
  filterRow.style.display = "flex";
  filterRow.style.flexWrap = "wrap";
  filterRow.style.gap = "6px";
  filterRow.style.marginBottom = "10px";

  const filterBtns = [
    { key: "all", label: "すべて" },
    { key: "weapon", label: "⚔️ 武器許可証" },
    { key: "armor", label: "🛡️ 防具許可証" }
  ];

  filterBtns.forEach(fb => {
    const b = document.createElement("button");
    b.className = "smallBtn";
    b.textContent = fb.label;
    b.style.fontSize = "11px";
    b.style.padding = "4px 10px";
    b.style.borderRadius = "4px";
    b.style.cursor = "pointer";
    b.style.background = (window._guildShopLicenseCategory === fb.key) ? "#5c4815" : "#222";
    b.style.color = (window._guildShopLicenseCategory === fb.key) ? "#ffd700" : "#aaa";
    b.style.borderColor = (window._guildShopLicenseCategory === fb.key) ? "#ffd700" : "#444";
    b.addEventListener("click", () => {
      window._guildShopLicenseCategory = fb.key;
      renderGuildShop();
    });
    filterRow.appendChild(b);
  });
  container.appendChild(filterRow);

  const weaponDefs = (window.EQUIP_LICENSE_WEAPON_TYPES || []);
  const armorDefs  = (window.EQUIP_LICENSE_ARMOR_TYPES || []);

  const listToRender = [];
  if (window._guildShopLicenseCategory === "all" || window._guildShopLicenseCategory === "weapon") {
    weaponDefs.forEach(def => {
      listToRender.push({ category: "weapon", ...def });
    });
  }
  if (window._guildShopLicenseCategory === "all" || window._guildShopLicenseCategory === "armor") {
    armorDefs.forEach(def => {
      listToRender.push({ category: "armor", ...def });
    });
  }

  listToRender.forEach(item => {
    const curLv = item.category === "weapon"
      ? (window.weaponSkills && window.weaponSkills[item.key] ? window.weaponSkills[item.key].lv : 0)
      : (window.armorSkills && window.armorSkills[item.key] ? window.armorSkills[item.key].lv : 0);

    const maxTier = (typeof getEquipLicenseMaxTier === "function")
      ? getEquipLicenseMaxTier(item.category, item.key)
      : 1;

    const nextTier = maxTier + 1;
    const isMax = nextTier > 10;

    const card = document.createElement("div");
    card.className = "guild-shop-card";
    card.style.border = "1px solid #443a22";
    card.style.borderRadius = "6px";
    card.style.padding = "9px 12px";
    card.style.marginBottom = "8px";
    card.style.background = "#1b1812";

    const topRow = document.createElement("div");
    topRow.style.display = "flex";
    topRow.style.justifyContent = "space-between";
    topRow.style.alignItems = "center";
    topRow.style.flexWrap = "wrap";
    topRow.style.gap = "6px";

    const title = document.createElement("span");
    title.style.fontWeight = "bold";
    title.style.fontSize = "13px";
    title.style.color = "#ffda6a";
    title.innerHTML = `${item.icon} ${item.name} <small style="color:#aaa; font-size:11px; margin-left:4px;">(現在スキル: Lv${curLv} / 認可: Tier ${maxTier})</small>`;
    topRow.appendChild(title);

    const statusBadge = document.createElement("span");
    statusBadge.style.fontSize = "11px";
    statusBadge.style.padding = "2px 8px";
    statusBadge.style.borderRadius = "4px";
    statusBadge.style.fontWeight = "bold";
    if (isMax) {
      statusBadge.style.background = "#1b3d22";
      statusBadge.style.color = "#9fef9f";
      statusBadge.style.border = "1px solid #30603a";
      statusBadge.textContent = "🏆 Tier 10 認可完了";
    } else {
      const nextCost = (typeof getEquipLicenseCost === "function") ? getEquipLicenseCost(nextTier) : (nextTier * 40);
      statusBadge.style.background = "#2a2810";
      statusBadge.style.color = "#ffd700";
      statusBadge.style.border = "1px solid #554411";
      statusBadge.textContent = `次: Tier ${nextTier} (🪙 ${nextCost}枚)`;
    }
    topRow.appendChild(statusBadge);
    card.appendChild(topRow);

    // 次のTierの購入情報行
    const bottomRow = document.createElement("div");
    bottomRow.style.display = "flex";
    bottomRow.style.justifyContent = "space-between";
    bottomRow.style.alignItems = "center";
    bottomRow.style.flexWrap = "wrap";
    bottomRow.style.gap = "8px";
    bottomRow.style.marginTop = "8px";
    bottomRow.style.paddingTop = "6px";
    bottomRow.style.borderTop = "1px dashed #333";

    if (isMax) {
      const maxInfo = document.createElement("div");
      maxInfo.style.fontSize = "12px";
      maxInfo.style.color = "#7cfc00";
      maxInfo.textContent = "✨ すべてのTierの装備許可証を取得済みです。";
      bottomRow.appendChild(maxInfo);
    } else {
      const reqLv = (typeof getEquipLicenseReqLv === "function") ? getEquipLicenseReqLv(nextTier) : (nextTier - 1) * 10;
      const nextCost = (typeof getEquipLicenseCost === "function") ? getEquipLicenseCost(nextTier) : (nextTier * 40);
      const isLvMet = curLv >= reqLv;
      const canAfford = currentCoins >= nextCost;

      const reqInfo = document.createElement("div");
      reqInfo.style.fontSize = "12px";
      if (isLvMet) {
        reqInfo.innerHTML = `<span style="color:#80d080;">✓ 認可条件達成: ${item.name} Lv${reqLv}以上（現在: Lv${curLv}）</span>`;
      } else {
        reqInfo.innerHTML = `<span style="color:#ff8888;">🔒 必要条件: ${item.name} Lv${reqLv}以上（現在: Lv${curLv} / あとLv${reqLv - curLv}）</span>`;
      }
      bottomRow.appendChild(reqInfo);

      const btn = document.createElement("button");
      btn.className = "smallBtn";
      btn.style.padding = "4px 12px";
      btn.style.fontWeight = "bold";
      btn.style.borderRadius = "4px";
      btn.style.cursor = isLvMet && canAfford ? "pointer" : "default";

      if (!isLvMet) {
        btn.textContent = `Lv${reqLv}で解放`;
        btn.disabled = true;
        btn.style.opacity = "0.4";
      } else if (canAfford) {
        btn.textContent = `Tier ${nextTier} 認可取得`;
        btn.style.background = "#5c4815";
        btn.style.color = "#ffd700";
        btn.style.borderColor = "#886e25";
        btn.addEventListener("click", () => {
          if (typeof buyEquipLicense === "function") {
            buyEquipLicense(item.category, item.key, nextTier);
          }
        });
      } else {
        btn.textContent = `コイン不足 (${nextCost}枚)`;
        btn.disabled = true;
        btn.style.opacity = "0.5";
      }
      bottomRow.appendChild(btn);
    }

    card.appendChild(bottomRow);
    container.appendChild(card);
  });
}

window.renderGuildDeliveries = renderGuildDeliveries;
window.renderGuildShop = renderGuildShop;

// =======================
// メイン：ギルドタブ全体再描画
// =======================

function renderGuildUI() {
  renderGuildHeader();
  renderGuildList();
  renderGuildQuests();   // 依頼タブ内でデイリー＋通常依頼をまとめて表示
  renderGuildDeliveries();
  renderGuildShop();
  renderGuildRewards();
}

// =======================
// 初期化
// =======================

document.addEventListener("DOMContentLoaded", () => {
  renderGuildHeader();
});