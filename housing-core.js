// housing-core.js
// 拠点 / ハウジングまわりの最小コア
// ・市民権フラグの管理
// ・ギルド側からの解放コールバック
// ・UI更新フック（game-ui-3.js の refreshHousingStatusAndTab / html.js の updateHousingWarehouseTabs と連携）

// 既存セーブデータとの衝突を避けて初期化
if (typeof window.citizenshipUnlocked === "undefined") {
  window.citizenshipUnlocked = false;
}

// ハウジング用の簡易ステート（今後の拡張用）
if (typeof window.housingState === "undefined") {
  window.housingState = {
    hasBase: false,     // 住宅を取得済みかどうか（将来用）
    baseLevel: 0,       // 住宅レベル（将来用）
    lastGuildId: null   // 市民権をくれたギルドID（演出用）
  };
}

/**
 * ギルド側から「市民権を解放した」ときに呼んでもらうエントリポイント。
 * 例: guild.js 内で、特別依頼クリア時に:
 *   if (typeof onCitizenshipUnlockedFromGuild === "function") {
 *     onCitizenshipUnlockedFromGuild(guildId);
 *   }
 */
window.onCitizenshipUnlockedFromGuild = function(guildId) {
  // すでに取得済みなら何もしない（多重ログ防止）
  if (window.citizenshipUnlocked) {
    return;
  }

  window.citizenshipUnlocked = true;
  if (window.housingState) {
    window.housingState.lastGuildId = guildId || null;
  }

  // ギルド名を出せるなら出す（なければ「とあるギルド」）
  let guildName = "とあるギルド";
  try {
    if (typeof getGuildNameById === "function" && guildId != null) {
      const name = getGuildNameById(guildId);
      if (name) guildName = name;
    }
  } catch (e) {
    // 失敗しても落とさない
  }

  if (typeof appendLog === "function") {
    appendLog(`${guildName}の推薦により、市民権を得た。拠点メニューが解放された。`);
  }

  // ステータス画面やタブの表示を更新
  if (typeof refreshHousingStatusAndTab === "function") {
    refreshHousingStatusAndTab();
  }

  // 倉庫タブ / 拠点タブの表示を即反映（html.js 側のヘルパ）
  if (typeof updateHousingWarehouseTabs === "function") {
    updateHousingWarehouseTabs();
  }

  // セーブシステムがあればここで即セーブしてもよい（任意）
  if (typeof saveToLocal === "function") {
    try {
      saveToLocal();
    } catch (e) {
      // セーブ失敗してもゲーム続行
    }
  }
};

/**
 * 将来、ゲーム起動／ロード時に呼ばれて、
 * 市民権フラグに応じてUI側を更新するためのヘルパ。
 * （現状は initJobPetRebirthUI の最後で refreshHousingStatusAndTab を直接叩いているので、
 *  必須ではないが、保存データ読み込み直後に呼びたい場合などに使える）
 */
window.refreshHousingFromState = function() {
  if (typeof refreshHousingStatusAndTab === "function") {
    refreshHousingStatusAndTab();
  }
  // タブの表示状態もフラグから再反映しておく
  if (typeof updateHousingWarehouseTabs === "function") {
    updateHousingWarehouseTabs();
  }
};