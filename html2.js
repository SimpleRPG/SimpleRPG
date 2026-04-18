// html2.js
// buildAppLayout 後に、ステータスページ・ギルド・拠点・あそびかた・各種モーダルの中身を埋める

(function extendAppLayout() {
  const appRoot = document.getElementById("appRoot");
  if (!appRoot) return;

  // ----- ステータスページ -----
  const pageStatus = document.getElementById("pageStatus");
  if (pageStatus) {
    pageStatus.innerHTML = `
      <h2>ステータス</h2>

      <div id="statusSubTabs" style="margin-bottom:8px;">
        <button id="statusTabMain"    class="status-sub-tab active" data-page="status-main">基本情報</button>
        <button id="statusTabGather"  class="status-sub-tab"         data-page="status-gather-stats">採取統計</button>
        <button id="statusTabSkill"   class="status-sub-tab"         data-page="status-skill">スキルツリー</button>
      </div>

      <!-- 基本情報 -->
      <div id="statusPageMain" class="status-sub-page active">
        <div class="status-block">
          レベル: <span id="stLevel">1</span><br>
          経験値: <span id="stExp">0</span> / <span id="stExpToNext">100</span><br>
          転生回数: <span id="stRebirthCount">0</span><br>
          成長タイプ: <span id="stGrowthType">バランス型</span><br>
          職業:
          <span id="stJobName">未設定</span>
          <button id="changeJobBtn" style="margin-left:4px; font-size:11px; padding:1px 6px;">職業を変更</button>
        </div>

        <div class="status-block" id="statusCitizenRow">
          市民権: 未取得（いずれかのギルドの特別依頼で解放）
        </div>

        <div class="status-block">
          STR: <span id="stSTR">1</span>,
          VIT: <span id="stVIT">1</span>,
          INT: <span id="stINT">1</span>,
          DEX: <span id="stDEX">1</span>,
          LUK: <span id="stLUK">1</span><br>
          攻撃力: <span id="stAtkTotal">0</span>,
          防御力: <span id="stDefTotal">0</span><br>
          最大HP: <span id="stHpMax">30</span>,
          最大MP: <span id="stMpMax">10</span>,
          最大SP: <span id="stSpMax">10</span>
        </div>

        <h3>転生</h3>
        <div class="status-block">
          Lv100以上で転生できます。転生するとLv1に戻りますが、ステータスにボーナスが付きます。<br>
          <button id="rebirthBtn">転生する</button>
        </div>

        <h3>採取スキル</h3>
        <div id="gatherSkillBox" class="status-block">
          木: Lv<span id="skGatherWoodLv">0</span>,
          鉱石: Lv<span id="skGatherOreLv">0</span>,
          草: Lv<span id="skGatherHerbLv">0</span><br>
          布: Lv<span id="skGatherClothLv">0</span>,
          皮: Lv<span id="skGatherLeatherLv">0</span>,
          水: Lv<span id="skGatherWaterLv">0</span><br>
          狩猟: Lv<span id="skGatherHuntLv">0</span>,
          釣り: Lv<span id="skGatherFishLv">0</span>,
          畑: Lv<span id="skGatherFarmLv">0</span>
        </div>

        <h3>クラフトスキル</h3>
        <div id="craftSkillBox" class="status-block">
          武器: Lv<span id="skCraftWeaponLv">0</span>,
          防具: Lv<span id="skCraftArmorLv">0</span>,
          ポーション: Lv<span id="skCraftPotionLv">0</span>,
          道具: Lv<span id="skCraftToolLv">0</span>,
          素材: Lv<span id="skCraftMaterialLv">0</span>,
          料理: Lv<span id="skCraftCookingLv">0</span>
        </div>

        <h3 class="pet-only">ペットステータス（動物使いのみ）</h3>
        <p id="noPetMsg" style="display:none;">ペットがいない…</p>
        <div class="status-block pet-only">
          <div id="petNameRow" style="display:inline-flex; align-items:center; gap:4px;">
            ペット名: <span id="stPetName">ペット</span>
            <button id="renamePetBtn" style="font-size:11px; padding:1px 6px;">ペット名を変更</button>
          </div><br>
          種類: <span id="stPetType">未選択</span><br>
          ペットLv: <span id="stPetLevel">1</span><br>
          ペット経験値: <span id="stPetExp">0</span> / <span id="stPetExpToNext">5</span><br>
          ペット転生回数: <span id="stPetRebirthCount">0</span><br>
          成長タイプ: <span id="stPetGrowthType">バランス型</span><br>
          ペットHP: <span id="stPetHp">10</span> / <span id="stPetHpMax">10</span><br>
          ペット攻撃力(素): <span id="stPetAtkBase">4</span><br>
          ペット攻撃力(現在): <span id="stPetAtkNow">4</span><br>
          ペット防御力: <span id="stPetDef">2</span><br>
        </div>

        <div class="status-block">
          <button id="changePetGrowthBtn" class="pet-only">ペット成長タイプを変更</button>
        </div>

        <h3>セーブ / ロード</h3>
        <div class="status-block">
          <button onclick="saveToLocal()">ローカルにセーブ</button>
          <button onclick="loadFromLocal()">ローカルからロード</button>
          <p style="font-size:11px; color:#ccc;">※バージョンあげる時はインポートのがいいかも</p>

          <h4 style="margin-top:8px;">エクスポート（バックアップ用）</h4>
          <button onclick="exportSaveData()">セーブデータをテキストに出力</button><br>
          <textarea id="exportSaveText" rows="4" cols="60" placeholder="ここにセーブデータが出力されます（コピーしてメモ帳などに保存してください）"></textarea>

          <h4 style="margin-top:8px;">インポート（復元）</h4>
          <textarea id="importSaveText" rows="4" cols="60" placeholder="保存しておいたセーブデータをここに貼り付けてください"></textarea><br>
          <button onclick="importSaveData()">貼り付けたデータを読み込む</button>
        </div>
      </div>

      <!-- 採取統計 -->
      <div id="statusPageGatherStats" class="status-sub-page" style="display:none;">
        <h3>採取統計</h3>

        <!-- 採取統計タブ内サブタブ -->
        <div id="statusGatherSubTabs" style="margin-bottom:6px;">
          <button id="statusGatherTabStats" class="status-gather-sub-tab active" data-page="gather-stats">統計一覧</button>
          <button id="statusGatherTabFish"  class="status-gather-sub-tab"         data-page="gather-fishdex">魚図鑑</button>
        </div>

        <!-- 統計一覧ページ -->
        <div id="statusGatherPageStats" class="status-gather-page" style="display:block;">
          <div id="gatherStatsContainer" class="status-block" style="max-height:300px; overflow:auto; font-size:12px;"></div>

          <div id="statusGatherMaterials">
            <h4>基本素材</h4>
            <div id="gatherMaterialsList"></div>

            <h4>中間素材</h4>
            <div id="intermediateMaterialsList"></div>

            <h4>料理素材</h4>
            <div id="cookingMaterialsList"></div>

            <h4>採取拠点</h4>
            <div id="gatherBaseStatus"></div>
          </div>
        </div>

        <!-- 魚図鑑ページ -->
        <div id="statusGatherPageFish" class="status-gather-page" style="display:none;">
          <h4>魚図鑑</h4>
          <div id="gatherFishDexSummary" style="font-size:12px; color:#c0bedf; margin-bottom:4px;">図鑑: -</div>
          <div id="gatherFishDexList" class="status-block" style="max-height:260px; overflow:auto; font-size:12px;"></div>
        </div>
      </div>

      <!-- スキルツリー -->
      <div id="statusPageSkill" class="status-sub-page" style="display:none;">
        <h3>スキルツリー</h3>

        <div id="statusSkillSubTabs" style="margin-bottom:6px;">
          <button id="statusSkillTabTree"  class="status-skill-sub-tab active" data-page="skill-tree">スキルツリー</button>
          <button id="statusSkillTabBonus" class="status-skill-sub-tab"         data-page="skill-bonus">効果一覧</button>
        </div>

        <div id="statusSkillTreePage" class="status-skill-page" style="display:block;">
          <div id="skillTreeLayout" style="display:flex; flex-direction:column; gap:8px; align-items:stretch;">
            <!-- 上: ツリーパネル（SVG版） -->
            <div style="position:relative; width:100%;">

              <div id="skillTreeFilterRow" style="margin-bottom:4px; font-size:11px; display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
                <span style="color:#c0bedf; min-width:64px;">表示フィルタ:</span>
                <div style="display:flex; flex-wrap:wrap; gap:4px;">
                  <button class="skill-filter-btn" data-filter="all">全部</button>
                  <button class="skill-filter-btn" data-filter="combat">戦闘</button>
                  <button class="skill-filter-btn" data-filter="gather">採取</button>
                  <button class="skill-filter-btn" data-filter="craft">クラフト</button>
                  <button class="skill-filter-btn" data-filter="econ">経済・拠点</button>
                </div>
              </div>

              <!-- SVG版 -->
              <div id="skillTreePanel" style="position:relative; width:100%; height:340px; border-radius:10px; overflow:hidden;">
                <svg id="skillTreeSvg"
                     xmlns="http://www.w3.org/2000/svg"
                     viewBox="-240 -240 480 480"
                     preserveAspectRatio="xMidYMid meet"
                     style="width:100%; height:100%; display:block;">
                  <g id="skillTreeRoot">
                    <g id="skillTreeLinesLayer"></g>
                    <g id="skillTreeNodesLayer"></g>
                  </g>
                </svg>
              </div>
            </div>

            <!-- 下: サマリ + 詳細（習得ボタン含む） -->
            <div style="font-size:12px;">
              <div id="skillTreeSummary" style="margin-bottom:6px; min-height:2em; color:#c0bedf;">
                スキルツリー効果: なし
              </div>

              <div class="status-block" style="margin-bottom:6px;">
                <div id="skillDetailName" style="font-weight:bold; margin-bottom:4px;">スキル名</div>
                <div id="skillDetailDesc" style="margin-bottom:4px;">説明</div>
                <div id="skillDetailEffect" style="margin-bottom:4px; color:#ccc;">効果: -</div>
                <div id="skillDetailCost" style="margin-bottom:4px; color:#ccc;">必要コスト: -</div>
                <div id="skillDetailError" style="margin-bottom:4px; color:#f66; min-height:1.2em;"></div>
                <button id="skillLearnButton" style="width:100%;">習得する</button>
              </div>
            </div>
          </div>
        </div>

        <div id="statusSkillBonusPage" class="status-skill-page" style="display:none;">
          <div class="status-block" id="skillTreeBonusList" style="font-size:12px;"></div>
        </div>
      </div>
    `;
  }

  // ----- ギルドページ -----
  const pageGuild = document.getElementById("pageGuild");
  if (pageGuild) {
    pageGuild.innerHTML = `
      <h2>ギルド</h2>

      <div id="guildScreen" style="padding:8px; border:1px solid #444; margin-top:8px; background:#111;">
        <div id="guildHeader" style="margin-bottom:8px; border-bottom:1px solid #555; padding-bottom:4px;">
          <div>
            所属ギルド: <span id="guildCurrentName">未所属</span>
          </div>
          <div>
            名声: <span id="guildCurrentFame">0</span>
            ／ ランク: <span id="guildCurrentRank">-</span>
          </div>
        </div>

        <div id="guildTabs" style="margin-bottom:8px;">
          <button class="guildTabBtn active" data-guild-tab="list">ギルド一覧</button>
          <button class="guildTabBtn" data-guild-tab="quests">依頼</button>
          <button class="guildTabBtn" data-guild-tab="rewards">報酬・称号</button>
        </div>

        <div id="guildTabContents">
          <div id="guildTab_list" class="guildTabPane" style="">
            <h3>ギルド一覧</h3>
            <div id="guildListContainer">
            </div>
          </div>

          <div id="guildTab_quests" class="guildTabPane" style="display:none;">
            <h3>ギルド依頼</h3>
            <div id="guildQuestList">
            </div>
          </div>

          <div id="guildTab_rewards" class="guildTabPane" style="display:none;">
            <h3>報酬・称号</h3>
            <div id="guildRewardList">
            </div>
          </div>
        </div>

        <div id="guildMessage" style="margin-top:8px; padding:4px; border-top:1px solid #555; min-height:40px; font-size:0.9em;">
          ギルドに所属して依頼をこなすことで、名声や特別な報酬を得られます。
        </div>
      </div>
    `;
  }

  // ----- 拠点ページ -----
  const pageHousing = document.getElementById("pageHousing");
  if (pageHousing) {
    pageHousing.innerHTML = `
      <h2>拠点</h2>
      <div id="housingRoot">
      </div>
    `;
  }

  // ----- あそびかた -----
  const pageHelp = document.getElementById("pageHelp");
  if (pageHelp) {
    pageHelp.innerHTML = `
      <div id="helpContentRoot"></div>
    `;
  }

  // ----- モーダル群 -----
  // 既に html1.js の appRoot.innerHTML 内でモーダルを出しているなら、ここは不要。
  // もし index.html から削除している場合は、以下のように追加する。

  // 職業選択モーダル
  if (!document.getElementById("jobModal")) {
    const jobModal = document.createElement("div");
    jobModal.id = "jobModal";
    jobModal.className = "modal-center hidden";
    jobModal.innerHTML = `
      <div id="jobModalInner">
        <h3 id="jobModalTitle">最初の職業を選択</h3>
        <p id="jobModalMessage" style="font-size:0.9em;">
          最初に職業を1つ選んでください（変更は後から100Gで可能）。<br>
          ※選ぶまでゲームは開始されません。
        </p>
        <div id="jobButtons">
          <button id="jobWarriorBtn"  class="job-select-btn" data-job="0">戦士</button>
          <button id="jobMageBtn"     class="job-select-btn" data-job="1">魔法使い</button>
          <button id="jobTamerBtn"    class="job-select-btn" data-job="2">動物使い</button>
          <button id="jobAlchemistBtn" class="job-select-btn" data-job="3">錬金術師</button>
        </div>

        <div id="jobDescArea"
             style="margin-top:8px; min-height:3em; font-size:0.85em; text-align:center;">
        </div>

        <div style="margin-top:12px; text-align:center;">
          <button id="jobConfirmBtn" disabled>世界に降り立つ</button>
        </div>
      </div>
    `;
    document.body.appendChild(jobModal);
  }

  // 転生確認モーダル
  if (!document.getElementById("rebirthModal")) {
    const rebirthModal = document.createElement("div");
    rebirthModal.id = "rebirthModal";
    rebirthModal.className = "modal-center hidden";
    rebirthModal.innerHTML = `
      <div id="rebirthModalInner">
        <h3>転生の確認</h3>
        <p id="rebirthModalMessage" style="font-size:0.9em;">
        </p>
        <div style="margin-top:10px; text-align:right;">
          <button id="rebirthCancelBtn" onclick="closeRebirthModal()">やめる</button>
          <button id="rebirthConfirmBtn" onclick="confirmRebirth()">転生する</button>
        </div>
      </div>
    `;
    document.body.appendChild(rebirthModal);
  }

  // ペット成長タイプ変更モーダル
  if (!document.getElementById("petGrowthModal")) {
    const petGrowthModal = document.createElement("div");
    petGrowthModal.id = "petGrowthModal";
    petGrowthModal.className = "modal-center hidden";
    petGrowthModal.innerHTML = `
      <div id="petGrowthModalInner">
        <h3>ペット成長タイプを変更</h3>
        <p style="font-size:0.9em;">
          ペットの成長タイプを選んでください。<br>
          転生やレベルアップ時の伸び方が変わります。
        </p>
        <div id="petGrowthButtons">
          <button data-growth="0">バランス型</button>
          <button data-growth="1">タンク型</button>
          <button data-growth="2">アタッカー型</button>
        </div>
        <div style="margin-top:10px; text-align:right;">
          <button id="petGrowthCloseBtn">閉じる</button>
        </div>
      </div>
    `;
    document.body.appendChild(petGrowthModal);
  }

  // 農園: 作物選択モーダル
  if (!document.getElementById("farmPlantModal")) {
    const farmPlantModal = document.createElement("div");
    farmPlantModal.id = "farmPlantModal";
    farmPlantModal.className = "modal modal-center hidden";
    farmPlantModal.innerHTML = `
      <div class="modal-content">
        <h3>どの作物を植えますか？</h3>
        <select id="farmPlantSelect"></select>
        <div id="farmPlantDesc" class="farm-plant-desc" style="margin-top:4px; font-size:12px; color:#ccc;">
        </div>
        <div class="modal-buttons" style="margin-top:8px; text-align:right;">
          <button id="farmPlantOk">OK</button>
          <button id="farmPlantCancel">キャンセル</button>
        </div>
      </div>
    `;
    document.body.appendChild(farmPlantModal);
  }

  // ペット選択モーダル
  if (!document.getElementById("companionModal")) {
    const companionModal = document.createElement("div");
    companionModal.id = "companionModal";
    companionModal.className = "modal-center hidden";
    companionModal.innerHTML = `
      <div id="companionModalInner">
        <h3>最初のペットを選ぶ</h3>
        <p style="font-size:0.9em;">
          一緒に旅をするペットを1種類選んでください。<br>
          あとから成長タイプやステータスで個性が出てきます。
        </p>
        <div id="companionButtons">
          <button class="companion-select-btn" data-companion-type="inu">犬</button>
          <button class="companion-select-btn" data-companion-type="karasu">烏</button>
          <button class="companion-select-btn" data-companion-type="usagi">兎</button>
        </div>
        <div id="companionDescArea" style="margin-top:8px; min-height:3em; font-size:0.85em; text-align:center;">
        </div>
        <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <button id="companionConfirmBtn" disabled>この子にする</button>
          </div>
          <div>
            <button id="companionCancelBtn">今は選ばない</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(companionModal);
  }
})();