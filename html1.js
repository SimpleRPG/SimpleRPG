// html1.js
// index.html の #appRoot の中身（メインレイアウト前半）を JS で生成する

function buildAppLayout() {
  const appRoot = document.getElementById("appRoot");
  if (!appRoot) return;

  appRoot.innerHTML = `
    <h1>しんぷるRPG</h1>

    <div id="tabs">
      <button id="tabGather"    class="tab-button active">採取</button>
      <!-- <button id="tabEquip"     class="tab-button">装備</button> -->
      <button id="tabExplore"   class="tab-button">探索</button>
      <button id="tabMagicDist" class="tab-button">魔巧区</button>
      <button id="tabWarehouse" class="tab-button">倉庫</button>
      <!-- ★拠点タブ: 初期は非表示、市民権取得後に JS 側で表示する -->
      <button id="tabHousing"   class="tab-button" style="display:none;">拠点</button>
      <button id="tabStatus"    class="tab-button">ステータス</button>
      <!-- ★追加: ギルドタブ -->
      <button id="tabGuild"     class="tab-button">ギルド</button>
      <button id="tabHelp"      class="tab-button">あそびかた</button>
    </div>

    <!-- PC/スマホ共通レイアウトの本体 -->
    <div id="layoutBody">
      <!-- ★今日の日替わりボーナス（ステータスバーの“外側・上”に独立行として表示） -->
      <div id="dailyBonusRow">
        <span id="dailyBonusLabel" class="clickable"></span>
        <!-- 日替わりボーナス用 詳細ボタン（小さめ） -->
        <button id="toggleDailyBonusDetailBtn" style="font-size:11px; padding:2px 6px;">
          ▼ボーナス詳細
        </button>
      </div>

      <!-- ステータスバー -->
      <div id="statusBar">
        <div class="stat-row">
          <span class="stat-label">HP</span>
          <div class="stat-bar hp-bar">
            <div class="stat-fill" id="hpBarFill">
              <span class="stat-text" id="hpBarText">30 / 30</span>
            </div>
          </div>
        </div>

        <div class="stat-row">
          <span class="stat-label">MP</span>
          <div class="stat-bar mp-bar">
            <div class="stat-fill" id="mpBarFill">
              <span class="stat-text" id="mpBarText">10 / 10</span>
            </div>
          </div>
        </div>

        <div class="stat-row">
          <span class="stat-label">SP</span>
          <div class="stat-bar sp-bar">
            <div class="stat-fill" id="spBarFill">
              <span class="stat-text" id="spBarText">10 / 10</span>
            </div>
          </div>
        </div>

        <div class="stat-money">
          所持金:
          <span id="money">0</span>G
          <!-- プレイヤーステータス用 詳細ボタン -->
          <button id="toggleDetailBtn" style="font-size:11px; padding:2px 6px; margin-left:4px;">
            ▼詳細
          </button>
        </div>
      </div>

      <!-- プレイヤー状態異常（バフ・デバフ）表示行 -->
      <div id="statusEffectPlayer" class="status-effect-row"></div>

      <!-- 空腹・水分ステータスバー -->
      <div id="hungerThirstBar">
        <div class="ht-row">
          <span class="ht-label">空腹</span>
          <div class="ht-bar">
            <div id="hungerGauge" class="ht-fill">
              <span id="hungerText" class="ht-text">100</span>
            </div>
          </div>

          <span class="ht-label">水分</span>
          <div class="ht-bar">
            <div id="thirstGauge" class="ht-fill">
              <span id="thirstText" class="ht-text">100</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ★ステータス詳細パネル：空腹・水分バーの直下に常に配置（初期は非表示） -->
      <div id="detailPanel" style="display:none;">
        職業: <span id="jobName">未設定</span><br>
        装備中武器: <span id="equippedWeaponName">なし</span>,
        装備中防具: <span id="equippedArmorName">なし</span><br>
        攻撃力: <span id="atkTotal">0</span>,
        防御力: <span id="defTotal">0</span><br>
      </div>

      <!-- ★日替わりボーナス詳細パネル（新規・初期は非表示） -->
      <div id="dailyBonusDetailPanel" style="display:none; font-size:12px; margin-top:4px;">
        <div id="dailyBonusDetailText">
          今日のボーナス内容の詳細がここに表示されます。
        </div>
      </div>

      <!-- ペットの簡易ステータス（常時表示用） -->
      <div id="petInfoMini" class="pet-only">
        ペットLv: <span id="petLevelMini">1</span>
        / HP: <span id="petHpMini">10</span> / <span id="petHpMaxMini">10</span>
      </div>
      
      <!-- 左カラム: メインタブ（ゲーム画面） -->
      <div id="mainColumn">
        <div id="mainArea">
          <!-- 採取 -->
          <div id="pageGather" class="tab-page active">
            <h2>採取</h2>
            <p>採取タブと食材調達タブを切り替えて行動します。</p>

            <!-- ★採取ページ内サブタブ -->
            <div id="gatherSubTabs" style="margin-bottom:8px;">
              <button id="gatherTabNormal" class="gather-sub-tab active" data-gather-page="gather-normal">採取</button>
              <button id="gatherTabCooking" class="gather-sub-tab" data-gather-page="gather-cooking">食材調達</button>
            </div>

            <!-- サブページ: 通常採取 -->
            <div id="gatherPageNormal" class="gather-sub-page active">
              <p>採取対象を選んで採取（待ち時間なし）。</p>

              <label class="text-caption">フィールド:</label>
              <!-- option は JS 側で全部生成する -->
              <select id="gatherField"></select>

              <select id="gatherTarget"></select>

              <button id="gather">採取</button>

              <div style="display:flex; align-items:center; gap:4px; margin-top:4px;">
                <p id="gatherMaterials" style="flex:1;">
                  所持素材：-
                </p>
                <button id="toggleMatDetailBtn" style="font-size:11px; padding:2px 6px;">
                  詳細▼
                </button>
              </div>
              <!-- ★詳細はテーブルを入れるので div に変更 -->
              <div id="gatherMatDetail" style="display:none; font-size:11px; margin:2px 0 0;"></div>
            </div>

            <!-- サブページ: 食材調達 -->
            <div id="gatherPageCooking" class="gather-sub-page" style="display:none;">
              <h3>食材調達</h3>
              <p style="font-size:12px; margin-bottom:4px;">
                狩猟・釣り・農園から料理用の素材を集めます。
              </p>

              <!-- 食材調達内サブタブ（狩猟 / 釣り / 農園） -->
              <div class="gather-cook-sub-tabs" style="margin-bottom:4px;">
                <button id="gatherCookTabHunt" class="gather-cook-tab-btn active">狩猟</button>
                <button id="gatherCookTabFish" class="gather-cook-tab-btn">釣り</button>
                <button id="gatherCookTabFarm" class="gather-cook-tab-btn">農園</button>
              </div>

              <!-- 狩猟タブ -->
              <div id="gatherCookPageHunt">
                <div class="gather-cooking-buttons" style="display:flex; gap:4px; flex-wrap:wrap; margin-bottom:4px;">
                  <button id="gatherHuntBtn">狩猟で食材を集める</button>
                </div>
                <p style="font-size:11px; color:#ccc;">
                  狩猟では肉などの料理素材を入手できます。
                </p>
              </div>

              <!-- 釣りタブ -->
              <div id="gatherCookPageFish" style="display:none;">
                <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:4px;">
                  <div style="display:flex; gap:4px; align-items:center;">
                    <label style="font-size:12px;">釣り場:</label>
                    <select id="fishingAreaSelect">
                      <option value="river">川辺</option>
                      <option value="lake">湖</option>
                      <option value="sea">海辺</option>
                    </select>
                  </div>
                  <div style="display:flex; gap:4px; align-items:center;">
                    <label style="font-size:12px;">餌:</label>
                    <select id="fishingBaitSelect">
                      <!-- value は変換後キーに統一 -->
                      <option value="default">ふつうの餌</option>
                      <option value="worm">虫の餌</option>
                      <option value="deep">重り付きの餌</option>
                      <option value="strong">肉の餌</option>
                    </select>
                  </div>
                  <div class="gather-cooking-buttons" style="display:flex; gap:4px; flex-wrap:wrap;">
                    <button id="gatherFishBtn">釣りで食材を集める</button>
                  </div>
                </div>
                <p style="font-size:11px; color:#ccc;">
                  釣り場と餌によって釣れる魚が変わります。
                </p>
              </div>

              <!-- 農園タブ -->
              <div id="gatherCookPageFarm" style="display:none;">
                <div id="farmAreaCooking" style="margin-top:6px; padding:6px; border:1px solid #555;">
                  <h3>農園</h3>
                  <p style="font-size:11px; color:#ccc; margin:0 0 4px;">
                    農園の管理・収穫はここから行います。
                  </p>

                  <div id="farmSlots">
                  </div>

                  <div id="farmDetail">
                    <div id="farmDetailTitle"></div>
                    <div id="farmDetailInfo"></div>
                    <!-- ★肥料状態表示行 -->
                    <div id="farmDetailFertilizerInfo" style="font-size:11px; color:#ccc;">
                      肥料：なし
                    </div>
                    <div id="farmDetailButtons">
                      <button id="farmDetailPlantBtn">植える / 植え替え</button>
                      <button id="farmDetailHarvestBtn">収穫</button>
                      <!-- ★肥料を使うボタン（どの区画に肥料をまくかの入口） -->
                      <button id="farmDetailFertilizerBtn">肥料を使う</button>
                    </div>
                  </div>

                  <div style="margin-top:4px; display:flex; gap:4px; flex-wrap:wrap;">
                    <button id="careFarmAllBtn" onclick="careFarmAll()">農園の世話をする</button>
                    <button id="harvestFarmAllBtn" onclick="harvestFarmAll()">全て収穫する</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 魔巧区（クラフト＋装備強化＋ショップ＋市場＋採取拠点） -->
          <div id="pageMagicDist" class="tab-page">
            <h2>魔巧区</h2>

            <!-- 魔巧区内サブタブ -->
            <div id="magicDistTabs" style="margin:4px 0%;">
              <button class="magic-tab-button active" data-page="magic-craft">クラフト</button>
              <button class="magic-tab-button" data-page="magic-enhance">装備手入れ場</button>
              <button class="magic-tab-button" data-page="magic-shop">ショップ</button>
              <button class="magic-tab-button" data-page="magic-market">市場</button>
              <button class="magic-tab-button" data-page="magic-gather">採取拠点</button>
            </div>

            <!-- サブページ: クラフト -->
            <div id="magicPageCraft" class="magic-sub-page active">
              <h3>クラフト</h3>

              <!-- クラフトカテゴリタブ -->
              <div id="craftCategoryTabs" style="margin:4px 0%;">
                <button class="craft-cat-tab active" data-cat="weapon">武器</button>
                <button class="craft-cat-tab" data-cat="armor">防具</button>
                <button class="craft-cat-tab" data-cat="potion">ポーション</button>
                <button class="craft-cat-tab" data-cat="tool">道具</button>
                <button class="craft-cat-tab" data-cat="material">素材</button>
                <button class="craft-cat-tab" data-cat="cooking">料理</button>
                <!-- ★生活クラフトタブを追加 -->
                <button class="craft-cat-tab" data-cat="life">生活</button>
              </div>

              <!-- ティア選択 -->
              <div id="craftTierRow" style="margin:4px 0%;">
                <label style="font-size:12px;">ティア:</label>
                <select id="craftTierSelect">
                  <option value="all">すべて</option>
                  <option value="T1">T1</option>
                  <option value="T2">T2</option>
                  <option value="T3">T3</option>
                </select>
              </div>

              <!-- 装備種別フィルタ -->
              <div id="craftKindRow" style="margin:4px 0%;">
                <label style="font-size:12px;">装備種別:</label>
                <select id="craftKindSelect">
                  <option value="all">すべて</option>
                  <option value="normal">戦闘用</option>
                  <option value="gather">採取用</option>
                </select>
              </div>

              <!-- カテゴリ別パネル -->
              <div id="craftPanelWeapon" class="craft-panel">
                <h3>武器クラフト</h3>
                <select id="weaponSelect"></select>
                <button id="craftWeaponBtn">武器を作る</button>
              </div>

              <div id="craftPanelArmor" class="craft-panel" style="display:none;">
                <h3>防具クラフト</h3>
                <select id="armorSelect"></select>
                <button id="craftArmorBtn">防具を作る</button>
              </div>

              <div id="craftPanelPotion" class="craft-panel" style="display:none;">
                <h3>ポーションクラフト</h3>
                <select id="potionSelect"></select>
                <button id="craftPotionBtn">ポーションを作る</button>
              </div>

              <div id="craftPanelTool" class="craft-panel" style="display:none;">
                <h3>道具クラフト</h3>
                <select id="toolSelect"></select>
                <button id="craftToolBtn">道具を作る</button>
              </div>

              <div id="craftPanelMaterial" class="craft-panel" style="display:none;">
                <h3>素材（中間素材）クラフト</h3>
                <div style="display:flex; gap:4px; align-items:center; margin-bottom:4px;">
                  <label style="font-size:12px;">中間素材:</label>
                  <select id="intermediateSelect" style="flex:1;"></select>
                  <button id="craftIntermediateBtn">作る</button>
                </div>
                <div id="intermediateInfo" style="font-size:11px; color:#ccc;">
                  素材から板材・インゴットなどを作成します。
                </div>
              </div>

              <!-- 料理クラフトパネル -->
              <div id="craftPanelCooking" class="craft-panel" style="display:none;">
                <h3>料理クラフト</h3>

                <div id="cookSubTabs" style="margin:4px 0%;">
                  <button class="cook-sub-tab active" data-sub="food">食べ物</button>
                  <button class="cook-sub-tab" data-sub="drink">飲み物</button>
                </div>

                <div id="cookPanelFood">
                  <div style="display:flex; gap:4px; align-items:center; margin-bottom:4px;">
                    <label style="font-size:12px;">食べ物:</label>
                    <select id="foodSelect" style="flex:1;"></select>
                    <button id="craftFoodBtn">料理を作る</button>
                  </div>
                  <div style="font-size:11px; color:#ccc;">
                    食べ物バフは1種類だけ有効になります。
                  </div>
                </div>

                <div id="cookPanelDrink" style="display:none;">
                  <div style="display:flex; gap:4px; align-items:center; margin-bottom:4px;">
                    <label style="font-size:12px;">飲み物:</label>
                    <select id="drinkSelect" style="flex:1;"></select>
                    <button id="craftDrinkBtn">飲み物を作る</button>
                  </div>
                  <div style="font-size:11px; color:#ccc;">
                    飲み物バフも1種類だけ有効になります。
                  </div>
                </div>
              </div>

              <!-- 生活クラフトパネル（農園・拠点） -->
              <div id="craftPanelLife" class="craft-panel" style="display:none;">
                <h3>生活クラフト</h3>

                <div id="lifeSubTabs" style="margin:4px 0%;">
                  <button class="life-sub-tab active" data-sub="farm">農園</button>
                  <button class="life-sub-tab" data-sub="housing">拠点</button>
                </div>

                <!-- 農園タブ: 肥料クラフト -->
                <div id="lifePanelFarm">
                  <div style="display:flex; gap:4px; align-items:center; margin-bottom:4px;">
                    <label style="font-size:12px;">肥料:</label>
                    <select id="fertilizerSelect" style="flex:1;"></select>
                    <button id="craftFertilizerAutoBtn">自動で作る</button>
                  </div>
                  <div style="font-size:11px; color:#ccc;">
                    料理素材ポイント（通常=1pt / 銀=2pt / 金=3pt）の合計で肥料をクラフトします。
                  </div>
                </div>

                <!-- 拠点クラフト（将来用のダミー） -->
                <div id="lifePanelHousing" style="display:none;">
                  <div style="font-size:11px; color:#ccc;">
                    将来、家具や内装クラフトをここから行う予定です。
                  </div>
                </div>
              </div>

              <!-- ★必要素材＋所持素材＋詳細を一つのブロックにまとめる -->
              <div id="craftCostBlock" style="font-size:11px; margin-top:4px; color:#ccc;">
                <div id="craftCostInfo">
                  必要素材：-
                </div>

                <div style="display:flex; align-items:center; gap:4px; margin-top:4px;">
                  <p id="craftMaterials" style="flex:1;">
                    所持素材：-
                  </p>
                  <button id="toggleMatDetailBtn2" style="font-size:11px; padding:2px 6px;">
                    詳細▼
                  </button>
                </div>
                <!-- ★クラフト詳細テーブルをここに表示 -->
                <div id="craftMatDetail" style="display:none; font-size:11px; margin:2px 0 0;"></div>
              </div>
            </div>

            <!-- サブページ: 装備強化 -->
            <div id="magicPageEnhance" class="magic-sub-page" style="display:none;">
              <h3>装備強化</h3>
              <p>強化したい装備と、素材にする同名装備を所持している必要があります。</p>

              <div style="margin-bottom:6px;">
                <h4 style="margin:4px 0;">武器強化</h4>
                <div style="display:flex; gap:4px; align-items:center; margin-bottom:4px;">
                  <label style="font-size:12px;">強化対象武器:</label>
                  <select id="enhanceWeaponTargetSelect" style="flex:1;"></select>
                </div>
                <button id="enhanceWeaponBtn">武器を強化</button>
              </div>

              <div style="margin-top:8px;">
                <h4 style="margin:4px 0;">防具強化</h4>
                <div style="display:flex; gap:4px; align-items:center; margin-bottom:4px;">
                  <label style="font-size:12px;">強化対象防具:</label>
                  <select id="enhanceArmorTargetSelect" style="flex:1;"></select>
                </div>
                <button id="enhanceArmorBtn">防具を強化</button>
              </div>

              <p style="font-size:11px; color:#ccc; margin-top:6px;">
                ※強化済みや高品質の装備を素材にする時はログに警告が表示されます。
              </p>

              <hr style="margin:8px 0;">

              <h3>装備修理</h3>
              <div style="margin-bottom:4px;">
                <label style="font-size:12px;">修理対象:</label>
                <select id="repairTargetSelect" style="min-width:200px;"></select>
              </div>
              <div id="repairInfoText" style="font-size:11px; color:#ccc; margin-bottom:4px;">
                修理対象を選択してください。
              </div>
              <button id="repairExecBtn">修理する</button>
            </div>

            <!-- サブページ: ショップ -->
            <div id="magicPageShop" class="magic-sub-page" style="display:none;">
              <h3>ショップ</h3>
              <p>消耗品やサービスを購入できます。</p>

              <p>所持ゴールド: <span id="shopGoldDisplay">0</span>G</p>

              <div id="shopCategoryTabs">
                <button class="shop-category-button" data-category="item">消耗品</button>
                <button class="shop-category-button" data-category="service">サービス</button>
                <button class="shop-category-button" data-category="sell">売却</button>
              </div>

              <div id="shopItemList"></div>

              <div id="shopItemDetail" style="margin-top: 8px; border-top: 1px solid #888; padding-top: 8px;">
                <p id="shopItemName">商品を選択してください。</p>
                <p id="shopItemDesc"></p>
                <p id="shopItemPrice"></p>
                <button id="shopBuyButton" disabled>購入する</button>
              </div>
            </div>

            <!-- サブページ: 市場 -->
            <div id="magicPageMarket" class="magic-sub-page" style="display:none;">
              <h3>市場</h3>

              <div style="margin-bottom:8px;">
                <button id="marketTabSell" class="market-main-tab active">出品</button>
                <button id="marketTabBuy"  class="market-main-tab">購入</button>
              </div>

              <div id="marketSellPanel">
                <h4>出品する</h4>

                <div style="margin-bottom:4px;">
                  <button id="marketSellRefreshBtn">出品候補を更新</button>
                </div>

                <div style="margin-bottom:4px;">
                  <label>カテゴリ:</label>
                  <select id="marketSellCategory">
                    <option value="weapon">武器</option>
                    <option value="armor">防具</option>
                    <option value="potion">ポーション</option>
                    <option value="tool">道具</option>
                    <option value="materialBase">素材</option>
                    <option value="materialInter">中間素材</option>
                    <option value="cooking">料理</option>
                  </select>
                </div>

                <div style="margin-bottom:4px;">
                  <label>アイテム:</label>
                  <select id="marketSellItem"></select>
                </div>

                <div style="margin-bottom:4px;">
                  <label>個数:</label>
                  <input id="marketSellAmount" type="number" value="1" min="1" style="width:60px;">
                  <button id="marketSellAmountMax">最大</button>
                </div>

                <div style="margin-bottom:4px;">
                  <label>価格(1個あたり):</label>
                  <input id="marketSellPrice" type="number" value="10" min="1" style="width:80px;">
                </div>

                <button id="marketSellBtn">出品する</button>
              </div>

              <div id="marketBuyPanel" style="display:none; margin-top:12px;">
                <h4>購入 / 買い注文</h4>

                <div style="margin-bottom:8px;">
                  <button id="marketSubTabPurchase" class="market-sub-tab active">出品一覧</button>
                  <button id="marketSubTabOrders"   class="market-sub-tab">買い注文</button>
                </div>

                <div id="marketSubPagePurchase" class="market-sub-page active">
                  <div style="margin-bottom:4px;">
                    <button id="marketBuyRefreshBtn">出品更新</button>
                  </div>

                  <div style="margin-bottom:4px;">
                    <button class="market-cat-tab active" data-cat="all">すべて</button>
                    <button class="market-cat-tab" data-cat="weapon">武器</button>
                    <button class="market-cat-tab" data-cat="armor">防具</button>
                    <button class="market-cat-tab" data-cat="potion">ポーション</button>
                    <button class="market-cat-tab" data-cat="material">素材</button>
                  </div>

                  <div id="marketBuyListContainer">
                  </div>
                </div>

                <div id="marketSubPageOrders" class="market-sub-page" style="display:none;">
                  <h4>買い注文を出す</h4>
                  <div style="margin-bottom:4px;">
                    <label>アイテム:</label>
                    <select id="marketOrderItem"></select>
                  </div>
                  <div style="margin-bottom:4px;">
                    <label>価格(1個あたり):</label>
                    <input id="marketOrderPrice" type="number" value="10" min="1" style="width:80px;">
                  </div>
                  <div style="margin-bottom:4px;">
                    <label>個数:</label>
                    <input id="marketOrderAmount" type="number" value="1" min="1" style="width:60px;">
                  </div>
                  <div style="margin-bottom:4px;">
                    <span id="marketOrderReservedPreview" style="font-size:11px; color:#ccc;"></span>
                  </div>
                  <button id="marketOrderBtn">買い注文を出す</button>

                  <h4 style="margin-top:8px;">現在の買い注文</h4>
                  <div id="marketOrderList">
                  </div>
                  <div id="marketMyOrderSummary" style="margin-top:6px; font-size:12px; color:#ccc; white-space:pre; font-family:monospace;"></div>
                </div>
              </div>

              <p id="marketInfo" style="margin-top:8px; font-size:12px; color:#ccc;"></p>
            </div>

            <!-- サブページ: 採取拠点 -->
            <div id="magicPageGather" class="magic-sub-page" style="display:none;">
              <h3>採取拠点</h3>
              <div id="gatherBaseStatus">
              </div>
            </div>
          </div>

          <!-- 探索 / 戦闘 -->
          <div id="pageExplore" class="tab-page">
            <h2>探索 / 戦闘</h2>

            <button id="bossStartBtn" class="btn-attack" style="display:none;">
              ボスに挑む
            </button>

            <div id="enemyStatusArea" style="display:none;">
              敵：<span id="enemyNameText">-</span>
              HP：<span id="enemyHpText">0</span> / <span id="enemyHpMaxText">0</span>
              <div id="statusEffectEnemy" class="status-effect-row"></div>
            </div>

            <div class="explore-header-row">
              <span class="label">行き先:</span>
              <select id="exploreTarget"></select>

              <button id="exploreStartBtn" class="btn-attack">
                探索する
              </button>
              <button id="returnTownBtn" class="btn-return" style="display:none;">
                街へ戻る
              </button>
              <span id="exploreInfo" class="explore-help-text">
                行き先を選んで「探索する」を押すとイベントが発生します
              </span>
            </div>

            <div id="battleCommandArea" style="display:none;">
              <div id="battleButtons">
                <div id="battleMainCol">
                  <button id="exploreBtn" class="btn-attack btn-main">攻撃</button>

                  <div id="magicBlock">
                    <label style="font-size:11px;">魔法:</label><br>
                    <select id="magicSelect"></select>
                    <button id="castMagicBtn" class="btn-magic">魔法を使う</button>
                  </div>

                  <div id="skillBlock">
                    <label style="font-size:11px;">武技:</label><br>
                    <select id="skillSelect"></select>
                    <button id="useSkillBtn" class="btn-skill">武技を使う</button>
                  </div>

                  <div>
                    <label style="font-size:11px;">戦闘アイテム:</label><br>
                    <select id="battleItemCategory" onchange="onBattleItemCategoryChanged()">
                      <option value="potion">ポーション</option>
                      <option value="tool">道具</option>
                    </select>
                    <br>
                    <select id="battleItemSelect"></select>
                    <button id="useBattleItemBtn" class="btn-item">戦闘で使う</button>
                  </div>

                  <button id="escapeBtn" style="margin-top:4px;">逃走する</button>
                </div>

                <div id="battlePetCol">
                </div>
              </div>
            </div>

            <div class="field-item-row">
              <span class="label">使用する食べ物:</span>
              <select id="fieldFoodSelect"></select>
              <button id="eatFoodBtn">食べる</button>
            </div>

            <div class="field-item-row">
              <span class="label">使用する飲み物:</span>
              <select id="fieldDrinkSelect"></select>
              <button id="drinkBtn">飲む</button>
            </div>

            <div class="field-item-row">
              <span class="label">使用するアイテム:</span>
              <select id="useItemSelect"></select>
              <button id="useItemBtn">使う</button>
            </div>
          </div>

          <!-- 倉庫 -->
          <div id="pageWarehouse" class="tab-page">
            <h2>倉庫</h2>

            <div id="pageWarehouseInner">
              <div>
                <div id="warehouseSubTabs" style="margin-bottom:8px;">
                  <button id="warehouseTabItems" class="warehouse-sub-tab active">装備・アイテム</button>
                  <button id="warehouseTabMaterials" class="warehouse-sub-tab">素材</button>
                </div>

                <div id="warehousePageItems" class="warehouse-sub-page active">
                  <div id="warehouseLists">
                    <div class="warehouse-box">
                      <h3>手持ち</h3>

                      <p>装備中</p>
                      <div id="equippedWeaponSlot"></div>
                      <div id="equippedArmorSlot"></div>

                      <p>ポーション（最大10本）</p>
                      <div id="carryPotionsList"></div>

                      <p>料理（食べ物 最大3品）</p>
                      <div id="carryFoodsList"></div>

                      <p>料理（飲み物 最大3杯）</p>
                      <div id="carryDrinksList"></div>

                      <p>武器（最大2本）</p>
                      <div id="carryWeaponsList"></div>

                      <p>防具（最大2着）</p>
                      <div id="carryArmorsList"></div>

                      <p>道具（最大3個）</p>
                      <div id="carryToolsList"></div>
                    </div>

                    <div class="warehouse-box">
                      <h3>倉庫</h3>
                      <p>ポーション</p>
                      <div id="warehousePotionsList"></div>

                      <p>料理（食べ物）</p>
                      <div id="warehouseFoodsList"></div>

                      <p>料理（飲み物）</p>
                      <div id="warehouseDrinksList"></div>

                      <p>武器</p>
                      <div id="warehouseWeaponsList"></div>

                      <p>防具</p>
                      <div id="warehouseArmorsList"></div>

                      <p>道具</p>
                      <div id="warehouseToolsList"></div>
                    </div>
                  </div>
                </div>

                <div id="warehousePageMaterials" class="warehouse-sub-page" style="display:none;">
                  <h3>素材一覧</h3>

                  <h4>採取素材</h4>
                  <div id="gatherMaterialsList">
                  </div>

                  <h4>中間素材</h4>
                  <div id="intermediateMaterialsList">
                  </div>

                  <h4>料理素材</h4>
                  <div id="cookingMaterialsList">
                  </div>
                </div>
              </div>

              <aside id="warehouseInfoPanel">
                <h3>インベントリ情報</h3>
                <p>倉庫と手持ちの出し入れができます。</p>
                <div class="carry-limit-row">
                  <span>ポーション</span>
                  <span class="value" id="carryLimitPotionsText">0 / 10</span>
                </div>
                <div class="carry-limit-row">
                  <span>食べ物</span>
                  <span class="value" id="carryLimitFoodsText">0 / 3</span>
                </div>
                <div class="carry-limit-row">
                  <span>飲み物</span>
                  <span class="value" id="carryLimitDrinksText">0 / 3</span>
                </div>
                <div class="carry-limit-row">
                  <span>武器</span>
                  <span class="value" id="carryLimitWeaponsText">0 / 2</span>
                </div>
                <div class="carry-limit-row">
                  <span>防具</span>
                  <span class="value" id="carryLimitArmorsText">0 / 2</span>
                </div>
                <div class="carry-limit-row">
                  <span>道具</span>
                  <span class="value" id="carryLimitToolsText">0 / 3</span>
                </div>
                <p style="margin-top:6px; font-size:11px;">
                  ※詳細な出し入れUI（選択→移動ボタン）は後で追加します。
                </p>
              </aside>
            </div>
          </div>

          <!-- ステータス（中身は html2.js 側で埋める） -->
          <div id="pageStatus" class="tab-page"></div>

          <!-- ギルド（中身は html2.js 側で埋める or ここで最低限の枠だけ） -->
          <div id="pageGuild" class="tab-page"></div>

          <!-- 拠点（中身は html2.js 側で埋める） -->
          <div id="pageHousing" class="tab-page"></div>

          <!-- あそびかた（中身は html2.js 側で埋める） -->
          <div id="pageHelp" class="tab-page"></div>
        </div><!-- /#mainArea -->
      </div><!-- /#mainColumn -->

      <!-- 右カラム: ログのみ -->
      <div id="sideColumn">
        <div id="log"></div>
      </div><!-- /#sideColumn -->
    </div><!-- /#layoutBody -->
  `;
}

buildAppLayout();