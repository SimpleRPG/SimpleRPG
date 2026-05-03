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
        <button id="statusTabStats"   class="status-sub-tab"         data-page="status-stats">統計</button>
        <button id="statusTabSkill"   class="status-sub-tab"         data-page="status-skill">スキルツリー</button>
        <button id="statusTabGM"      class="status-sub-tab"         data-page="status-gm">GMデバッグ</button>
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

      <!-- 統計タブ -->
      <div id="statusPageStats" class="status-sub-page" style="display:none;">
        <h3>統計</h3>

        <!-- 統計タブ内サブタブ -->
        <div id="statusStatsSubTabs" style="margin-bottom:6px;">
          <button id="statusStatsTabGather" class="status-stats-sub-tab active" data-page="stats-gather">採取</button>
          <button id="statusStatsTabCraft"  class="status-stats-sub-tab"         data-page="stats-craft">クラフト</button>
          <button id="statusStatsTabBattle" class="status-stats-sub-tab"         data-page="stats-battle">戦闘</button>
          <button id="statusStatsTabFish"   class="status-stats-sub-tab"         data-page="stats-fishdex">釣り図鑑</button>
        </div>

        <!-- 採取統計ページ -->
        <div id="statusStatsPageGather" class="status-stats-page" style="display:block;">
          <h4>採取統計</h4>

          <!-- ★採取の道のりサマリー -->
          <div id="gatherStatsSummary" style="font-size:12px; color:#c0bedf; margin-bottom:4px;">
            これまでの採取の記録がここに表示されます。
          </div>

          <!-- 統計テーブル（基本素材 / 料理素材）は下の statusGatherMaterials 内に描画 -->
          <div id="statusGatherMaterials">
            <h4>基本素材</h4>
            <!-- ▼ 倉庫タブと ID が被らないよう、ステータス統計用の ID に変更 -->
            <div id="gatherStatsMaterialsList"></div>

            <!-- 中間素材はクラフト統計側に移したため削除 -->

            <h4>料理素材</h4>
            <div id="cookingStatsMaterialsList"></div>

            <h4>採取拠点</h4>
            <div id="gatherBaseStatus"></div>
          </div>
        </div>

        <!-- クラフト統計ページ（中身は別JSで描画予定） -->
        <div id="statusStatsPageCraft" class="status-stats-page" style="display:none;">
          <h4>クラフト統計</h4>
          <div id="craftStatsContainer" class="status-block" style="max-height:300px; overflow:auto; font-size:12px;">
          </div>
        </div>

        <!-- 戦闘統計ページ（中身は別JSで描画予定） -->
        <div id="statusStatsPageBattle" class="status-stats-page" style="display:none;">
          <h4>戦闘統計</h4>
          <div id="battleStatsContainer" class="status-block" style="max-height:300px; overflow:auto; font-size:12px;">
          </div>
        </div>

        <!-- 釣り図鑑ページ（旧・魚図鑑） -->
        <div id="statusStatsPageFish" class="status-stats-page" style="display:none;">
          <h4>釣り図鑑</h4>
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

      <!-- GMデバッグ -->
      <div id="statusPageGM" class="status-sub-page" style="display:none;">
        <h3>GMデバッグ</h3>
        <div id="gmDebugContainer" class="status-block" style="font-size:12px;">
          <!-- GMデバッグ用のUIは別JSからここに差し込みます -->
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

      <!-- 拠点ページ内サブタブ -->
      <div id="housingSubTabs" style="margin-bottom:8px;">
        <button class="housing-sub-tab active" data-housing-page="housing-main">拠点</button>
        <button class="housing-sub-tab" data-housing-page="housing-warehouse">倉庫</button>
      </div>

      <div id="housingPages">
        <!-- 拠点サブタブ: 既存の拠点UI -->
        <div id="housingPageMain" class="housing-sub-page active">
          <div id="housingRoot">
            <!-- ★家具置き場グリッドを描画するエリア（拠点ボックスの中、家賃と借りられる土地の間に配置想定） -->
            <div id="housingFurnitureArea" class="status-block" style="margin-top:8px;">
            </div>
          </div>
        </div>

        <!-- 倉庫サブタブ: 上部の倉庫タブと同じ内容を表示するための枠 -->
        <div id="housingPageWarehouse" class="housing-sub-page" style="display:none;">
          <h3>倉庫</h3>

          <div id="housingWarehouseInner">
            <div>
              <div id="housingWarehouseSubTabs" style="margin-bottom:8px;">
                <button id="housingWarehouseTabItems" class="warehouse-sub-tab active">装備・アイテム</button>
                <button id="housingWarehouseTabMaterials" class="warehouse-sub-tab">素材</button>
              </div>

              <div id="housingWarehousePageItems" class="warehouse-sub-page active">
                <div id="housingWarehouseLists">
                  <div class="warehouse-box">
                    <h3>手持ち</h3>

                    <p>装備中</p>
                    <div id="housingEquippedWeaponSlot"></div>
                    <div id="housingEquippedArmorSlot"></div>

                    <p>ポーション（最大10本）</p>
                    <div id="housingCarryPotionsList"></div>

                    <p>料理（食べ物 最大3品）</p>
                    <div id="housingCarryFoodsList"></div>

                    <p>料理（飲み物 最大3杯）</p>
                    <div id="housingCarryDrinksList"></div>

                    <p>武器（最大2本）</p>
                    <div id="housingCarryWeaponsList"></div>

                    <p>防具（最大2着）</p>
                    <div id="housingCarryArmorsList"></div>

                    <p>道具（最大3個）</p>
                    <div id="housingCarryToolsList"></div>
                  </div>

                  <div class="warehouse-box">
                    <h3>倉庫</h3>
                    <p>ポーション</p>
                    <div id="housingWarehousePotionsList"></div>

                    <p>料理（食べ物）</p>
                    <div id="housingWarehouseFoodsList"></div>

                    <p>料理（飲み物）</p>
                    <div id="housingWarehouseDrinksList"></div>

                    <p>武器</p>
                    <div id="housingWarehouseWeaponsList"></div>

                    <p>防具</p>
                    <div id="housingWarehouseArmorsList"></div>

                    <p>道具</p>
                    <div id="housingWarehouseToolsList"></div>
                  </div>
                </div>
              </div>

              <div id="housingWarehousePageMaterials" class="warehouse-sub-page" style="display:none;">
                <h3>素材一覧</h3>

                <h4>採取素材</h4>
                <div id="housingGatherMaterialsList">
                </div>

                <h4>中間素材</h4>
                <div id="housingIntermediateMaterialsList">
                </div>

                <h4>料理素材</h4>
                <div id="housingCookingMaterialsList">
                </div>
              </div>
            </div>

            <aside id="housingWarehouseInfoPanel">
              <h3>インベントリ情報</h3>
              <p>倉庫と手持ちの出し入れができます。</p>
              <div class="carry-limit-row">
                <span>ポーション</span>
                <span class="value" id="housingCarryLimitPotionsText">0 / 10</span>
              </div>
              <div class="carry-limit-row">
                <span>食べ物</span>
                <span class="value" id="housingCarryLimitFoodsText">0 / 3</span>
              </div>
              <div class="carry-limit-row">
                <span>飲み物</span>
                <span class="value" id="housingCarryLimitDrinksText">0 / 3</span>
              </div>
              <div class="carry-limit-row">
                <span>武器</span>
                <span class="value" id="housingCarryLimitWeaponsText">0 / 2</span>
              </div>
              <div class="carry-limit-row">
                <span>防具</span>
                <span class="value" id="housingCarryLimitArmorsText">0 / 2</span>
              </div>
              <div class="carry-limit-row">
                <span>道具</span>
                <span class="value" id="housingCarryLimitToolsText">0 / 3</span>
              </div>
              <p style="margin-top:6px; font-size:11px;">
                ※上部の倉庫タブと同じ内容がここからも確認できます。
              </p>
            </aside>
          </div>
        </div>
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
      <div id="jobModalInner" class="modal-box">
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
      <div id="rebirthModalInner" class="modal-box">
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
      <div id="petGrowthModalInner" class="modal-box">
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
      <div id="companionModalInner" class="modal-box">
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

// ★★★ 以下、テトちゃんUI用のグローバル関数を追加（既存仕様に影響なし） ★★★

// UI から通常モード or バランス(=自動最適化)を起動
function startTestChanFromUI() {
  const modeSelect = document.getElementById("testChanModeSelect");
  const minutesInput = document.getElementById("testChanMinutes");
  
  if (!modeSelect || !minutesInput) {
    console.error("テトちゃんUI要素が見つかりません");
    return;
  }
  
  const mode = modeSelect.value;
  const minutes = parseInt(minutesInput.value, 10) || 10;

  if (minutes <= 0) {
    if (typeof appendLog === "function") {
      appendLog("[テトAI] 時間(分)を正しく入力してください。");
    } else {
      console.error("テトちゃん: minutes が不正です:", minutes);
    }
    return;
  }
  
  // バランス(評価重視)だけは自動最適化ランナーをそのまま使う
  if (mode === "balancedMain") {
    if (typeof window.runTestChanAuto === "function") {
      if (typeof appendLog === "function") {
        appendLog(`[テトAI] バランス(自動最適化)モードで約${minutes}分テストを開始します。`);
      }
      window.runTestChanAuto(minutes);
    } else {
      console.error("runTestChanAuto が見つかりません");
      if (typeof appendLog === "function") {
        appendLog("[エラー] runTestChanAuto が定義されていません。teto-ai.js が読み込まれているか確認してください。");
      }
    }
    return;
  }
  
  // それ以外のモードは従来どおり runTestChan を使用
  if (typeof window.runTestChan === "function") {
    if (typeof appendLog === "function") {
      appendLog(`[テトAI] モード=${mode}, 約${minutes}分のテストを開始します。`);
    }
    window.runTestChan(mode, minutes);
  } else {
    console.error("runTestChan が見つかりません");
    if (typeof appendLog === "function") {
      appendLog("[エラー] runTestChan が定義されていません。teto-ai.js が読み込まれているか確認してください。");
    }
  }
}

// UI から自動最適化を起動（既存の専用UIがある場合用）
function startTestChanAutoFromUI() {
  const minutesInput = document.getElementById("testChanAutoMinutes");
  
  if (!minutesInput) {
    console.error("自動最適化UI要素が見つかりません");
    return;
  }
  
  const totalMinutes = parseInt(minutesInput.value, 10) || 30;
  
  if (typeof window.runTestChanAuto === "function") {
    if (typeof appendLog === "function") {
      appendLog(`[テトAI] 自動最適化テストを約${totalMinutes}分で開始します。`);
    }
    window.runTestChanAuto(totalMinutes);
  } else {
    console.error("runTestChanAuto が見つかりません");
    if (typeof appendLog === "function") {
      appendLog("[エラー] runTestChanAuto が定義されていません。teto-ai.js が読み込まれているか確認してください。");
    }
  }
}