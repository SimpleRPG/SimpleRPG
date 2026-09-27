# しんぷるRPG 統合設計書 正本

## 1. 本書の位置付け

本書を SimpleRPG/SimpleRPG の現行設計正本とする。

本書は設計の理想像を記述する文書ではなく、作業時点で確認した現行 main の実コード構造・責務・状態・接続関係を基準として記録する。

実装と本書が一致しない場合、推測で実装を継続してはならない。
必ず最新 main の実コードを読み、差異を確認してから本書または実装を更新する。

本書に記載されていない事項を「存在するはず」と推測して追加しない。

---

## 2. 基準リポジトリ

- Repository: `SimpleRPG/SimpleRPG`
- Branch: `main`
- 基準コミット: `ef55b9187bf0576263298dd57a5a2e5170cdde81`
- 基準コミット: `refactor: remove legacy craft and equipment modules`
- 正本ファイル: `SIMPLERPG_統合設計書_正本.md`

本書作成時点では、GitHub 上に本書は存在せず、本コミット時点の現行コードを基準に新規作成する。

---

## 3. アーキテクチャの基本原則

本ゲームは ES Module を中心とした import/export 構成ではなく、`index.html` から通常の `<script>` として JavaScript を順番に読み込む構成である。

そのため、モジュール間連携の主な手段は次のとおり。

- グローバル変数
- `window` 上の状態
- グローバル関数
- 共有レジストリ
- DOM
- Socket.IO

したがって、ファイルの責務だけでなく、`index.html` の読込順が実行時依存関係そのものになる。

新機能を追加するときは、既存の責務を別ファイルで二重化せず、現行ファイルが提供する関数・状態・レジストリを再利用する。

---

## 4. 実際の起動・読込順

`index.html` の現行 script 読込順を実行時の基準とする。

### 4.1 データ・レジストリ層

1. `item-meta-core.js`
2. `materials-core.js`
3. `enemy-data.js`
4. `gather-data.js`
5. `combat-equip-data.js`
6. `gather-equip-data.js`
7. `craft-item-data.js`
8. `equipment-prefix-data.js`
9. `housing-furniture-data.js`
10. `game-shop.js`
11. `cook-data.js`
12. `inventory-core.js`
13. `season-core.js`
14. `farm-seed-data.js`
15. `farm-core.js`
16. `fertilizer-core.js`
17. `fish-data.js`
18. `status-effects-core.js`
19. `enemy-skills.js`
20. `pet-equip-data.js`
21. `pet.js`
22. `jobs.js`

### 4.2 ゲームコア層

23. `game-core-1.js`
24. `game-core-2.js`
25. `game-core-3.js`
26. `game-core-4.js`
27. `game-core-5.js`

### 4.3 装備・アイテム・クラフト層

28. `equip-api.js`
29. `equip-enhance.js`
30. `equip-craft-ui.js`
31. `battle-items.js`
32. `battle-items-use.js`
33. `gather-base.js`
34. `craft-core.js`
35. `craft-actions.js`

### 4.4 スキル・市場・保存層

36. `skill-core-1.js`
37. `skill-core-2.js`
38. `skilltree.js`
39. `market-core1.js`
40. `market-core2.js`
41. `save-system.js`

### 4.5 ギルド・拠点・日次層

42. `guild-deliveries-data.js`
43. `guild-dailies.js`
44. `guild-quests.js`
45. `guild.js`
46. `guild2.js`
47. `guildskill.js`
48. `repair-core.js`
49. `housing-core.js`
50. `daily-bonus.js`

### 4.6 レイアウト・UI層

51. `html1.js`
52. `html2.js`
53. `ui-core.js`
54. `ui-craft-and-farm.js`
55. `game-ui-2.js`
56. `game-ui-3.js`
57. `game-ui-4.js`
58. `housing-ui-grid.js`
59. `gather-stats-ui.js`
60. `asobikata.js`
61. `pet-ui.js`

### 4.7 通信・テト・デバッグ層

62. `/socket.io/socket.io.js`
63. `teto-ai.js`
64. `teto-ai2.js`
65. `teto-ai3.js`
66. `teto-ai4.js`
67. `teto-ai5.js`
68. `debug-stats-core.js`
69. `debug-stats-core2.js`
70. `debug-matrix-core.js`
71. `debug-ui.js`
72. `htmllast.js`

---

## 5. 読込順に関する重要事項

`index.html` 内には「game-core 系（1〜8 全部）」というコメントが存在するが、現行 main で実際に読まれているのは `game-core-1.js`〜`game-core-5.js` である。

設計上はコメントではなく、実際の script タグと現行コードを基準とする。

存在しない `game-core-6.js`〜`game-core-8.js` を前提に新実装を作らない。

同様に、旧ファイル名がコメント中に残っている場合でも、現在 `index.html` から実際に読み込まれているファイルを現行実装として扱う。

---

## 6. エントリポイントと初期化

`index.html` の DOM 本体は `#appRoot` の空要素から開始し、`html1.js` / `html2.js` がレイアウトを組み立てる。

UI 初期化後、`ui-core.js` の DOMContentLoaded 系処理から `initGame()`、採取 UI、農園、その他初期化処理を呼び出す。

Socket.IO クライアントの初期化は `htmllast.js` が担当し、接続後に市場同期処理へ接続する。

---

## 7. データ基盤: ITEM_META

`item-meta-core.js` が共通アイテムメタレジストリ `ITEM_META` を管理する。

ITEM_META は少なくとも次の情報を共通形式で扱う。

- `name`
- `category`
- `craftCategory`
- `storageKind`
- `storageTab`
- `tier`
- `tags`
- `flags`
- `craft`

代表カテゴリ:

- weapon
- armor
- potion
- tool
- food
- drink
- material
- cookingMat
- furniture
- petEquip

登録入口は `registerItemDefs()` であり、既存 ID の同一定義再登録は warning、異なる定義の衝突は error として検知する。

新しいアイテムを作る場合は、可能な限り ITEM_META へ登録し、個別ファイルだけに重複メタ情報を作らない。

---

## 8. ITEM_META のストレージ連携

`storageKind` により、アイテム ID から実在庫へ接続する。

現行では、

- `inventory`
- `materials`
- `intermediate`
- `cooking`
- `byproduct`
- `petEquip`
- その他既存の登録ストレージ

を介して在庫へ接続する。

共通 API:

- `getItemCountByMeta`
- `addItemByMeta`
- `removeItemByMeta`
- `consumeItemByMeta`

アイテム処理を追加するとき、直接複数の在庫構造を分岐するより ITEM_META のメタ情報を経由する設計を優先する。

---

## 9. 素材在庫

`materials-core.js` が一次素材を管理する。

基本素材:

- wood
- ore
- sand
- cloth
- leather
- water

一次素材の実体は、

`materials[key][tier - 1]`

という配列形式で管理し、T1〜T10 を想定する。

旧 save 互換として、旧オブジェクト形式から配列形式へ移行する処理が存在する。

### 9.1 特殊在庫

通常の一次素材とは別に、

- `rareGatherItems`
- `byproductMats`
- `intermediateMats`
- `cookingMats`

を使用する。

星屑の結晶 `starShard` のようなレア素材は通常の Tier 配列と別管理である。

---

## 10. 中間素材

中間素材のマスタは `craft-item-data.js` の `INTERMEDIATE_MATERIALS` が基準であり、在庫は `intermediateMats` によって管理する。

Tier付き ID を使う。

例:

- `T1_woodPlank`
- `T2_woodPlank`
- `T3_woodPlank`

新規中間素材を追加するとき、旧形式だけを新設せず現行の Tier ID / ITEM_META / intermediateMats 経路と整合させる。

---

## 11. プレイヤー基本状態

主なプレイヤー状態は `game-core-1.js` / `game-core-2.js` を中心として保持する。

### 基本値

- level
- exp
- expToNext
- rebirthCount
- growthType
- STR
- VIT
- INT_
- DEX_
- LUK
- hp / hpMax
- mp / mpMax
- sp / spMax
- money

### 初期値

現行コードでは、初期レベル1、初期金50G、基本能力値は1から開始し、HP基礎値30、MP基礎値10、SP基礎値10を持つ。

最初の職業選択では `jobs.js` の `getJobInitialStats()` を基準に職業初期ステータスを適用する。

---

## 12. ステータス再計算

`recalcStats()` がプレイヤーの最終ステータスを統合する中心処理である。

主な反映要素:

- 基礎ステータス
- 装備
- 装備品質
- 強化
- 装備スキルレベル
- スキルツリーボーナス
- 職業ボーナス
- 装備接頭語
- 空腹・渇き
- 最大 HP / MP / SP 補正
- ペット関連の再計算

新しい ATK / DEF / HP / MP / SP 補正を独立に各所へ実装せず、可能な限り既存の再計算経路へ接続する。

---

## 13. レベル・経験値

`game-core-2.js` がレベルアップと経験値を担当する。

プレイヤーの基本経験値ベースは `BASE_EXP_PER_LEVEL = 100`。

`addExp(amount, source)` を中心に経験値を加算し、レベルアップ時には成長ロール、必要経験値更新、`recalcStats()`、HP/MP/SP の回復を行う。

現行の行動別経験値設計には、

- battle
- gather
- craft
- autoGather
- その他の非戦闘行動

が存在する。

レベル上限到達後はレベルアップを継続せず、コード上では余剰経験値を保持する経路が存在する。

---

## 14. 空腹・水分

空腹・水分は受動減少ではなく、行動時の消費を基本とする。

初期値:

- hunger = 100
- thirst = 100

両方が100になったとき、20分間 `wellFedUntil` が設定され、行動による減少を止める。

### 空腹

- 50%未満で最大HPへの影響
- 25%未満で攻撃・魔力側への追加低下

### 渇き

- 50%未満で最大MP/SPへの影響
- 25%未満でDEF/DEX/LUK側への追加低下

これらの補正は `recalcStats()` と連携する。

---

## 15. 転生

転生要求レベルは100。

転生タイプ:

- combat
- gather
- craft

プレイヤー側には、

- `rebirthCombatPt`
- `rebirthGatherPt`
- `rebirthCraftPt`
- `lastRebirthType`

を持つ。

戦闘転生については `rebirthCombatPt * 3` 回の恒久成長ロールが行われる。

採取転生・クラフト転生は、それぞれの専用ポイントを増加させる。

転生時にはレベル・経験値・基礎ステータスがリセットされるが、転生由来の恒久要素やペット側の転生処理は別途保持される。

---

## 16. 職業

職業の定義は `jobs.js` に集約する。

現行コードの主要 ID:

- 0: 戦士
- 1: 魔法使い
- 2: 動物使い
- 100: 大盾兵
- 101: 呪術師
- 102: 獣群使い
- 200: 鍛冶職人
- 201: 武具使い
- 202: 錬金術師
- 203: 道具使い
- 204: 料理人
- 205: 貪食家
- 300: 採集士
- 301: 採取監督官
- 400: 狩猟師
- 401: 漁師
- 402: 農夫

職業判定・職業ボーナス・初期ステータス・使用可能行動・ペット関連権限は `jobs.js` を正史とする。

職業追加時に `game-core-2.js` へ職業定義を再実装しない。

---

## 17. 戦闘

戦闘の中心処理は `game-core-3.js`。

探索中の敵生成は `game-core-5.js`、敵マスタは `enemy-data.js`、敵スキルは `enemy-skills.js`、状態異常は `status-effects-core.js`、アイテム使用は `battle-items.js` / `battle-items-use.js` が担当する。

戦闘開始時には、

- 現在敵
- 敵HP
- ボスフラグ
- 敵状態異常
- 戦闘統計
- スキルツリーボーナスのキャッシュ
- 戦闘UI

を初期化する。

---

## 18. ダメージ計算

共通の攻撃・防御ダメージ計算は `calcAtkDefDamage()` に集約されている。

現行式は基本的に、

`atk * atk / (atk + def)`

を使用し、DEF=0 の場合には特殊処理を行う。

プレイヤー通常攻撃では、さらに、

- 命中
- 回避
- クリティカル
- 攻撃バフ
- 防御側補正
- ステータス異常

などを順次反映する。

同一目的の独立ダメージ式を追加しない。

---

## 19. 状態異常

`status-effects-core.js` が状態異常の定義と処理を担当する。

`enemy-skills.js` は敵固有スキルを定義するが、状態異常そのものを別体系として再定義しない。

敵スキルからプレイヤーへ付与する状態異常は、既存の `addStatusToPlayer()` 経路を使う。

ボスには HP 比率に応じて専用 ULTIMATE スキルを追加する仕組みがある。

---

## 20. 探索

探索・ランダムイベント・敵生成は `game-core-5.js` が担当する。

現行の探索対象は少なくとも次の10段階のエリア構造を持つ。

- field
- forest
- cave
- mine
- desert
- swamp
- ruin
- sky
- ice
- hell

探索時には、

1. 探索状態設定
2. 撤退進行確認
3. ボス発見判定
4. ランダムイベント判定
5. 敵遭遇またはイベント実行

という流れを取る。

---

## 21. 探索ランダムイベント

現行コードでは探索イベントとして、

- 何も起きない
- ランダムイベント
- 敵遭遇

があり、ランダムイベント側には、

- 罠
- 宝箱
- 回復泉
- 条件を満たした場合の野生ペット遭遇

がある。

罠で死亡した場合は、

- 探索終了
- HP/MP/SP 回復
- 所持金半減
- 装備耐久度低下
- 条件によって装備破壊
- 探索連続成功状態リセット

が発生する。

---

## 22. ボス

エリアごとにボス解放状態を持つ。

探索連続回数に応じてボス発見確率が変化し、一度発見可能になるとエリア内ボス戦へ進める。

`areaBossCleared` と `areaBossAvailable` はセーブ対象である。

---

## 23. 採取

採取の中心は `game-core-4.js`、採取対象・採取スキル定義は `gather-data.js`、採取拠点は `gather-base.js`。

通常素材:

- 木
- 鉱石
- 砂
- 布
- 皮
- 水

料理素材の採取は `hunt` / `fish` / `fieldFarm` / `garden` の採取スキルを通して扱う。

採取スキル上限は100。

---

## 24. 採取フィールド

採取フィールドは field1〜field10 の拡張構造を持つ。

現行の Tier 分布は `game-core-4.js` の `FIELD_TIER_DIST` を正史とする。

T1〜T10 の採取を想定するが、すべての個別素材・装備が必ずT10まで存在すると推測してはならない。

---

## 25. 採取拠点・自動採取

自動採取の実体は `gather-base.js` にある。

各基本素材について、

- 拠点レベル
- モード
- ストック
- 最大ストック
- 拠点強化
- 星屑の結晶使用

などを管理する。

`game-core-4.js` に過去の自動採取実装を重複して戻さない。

---

## 26. 採取装備

採取専用装備は `gather-equip-data.js` に分離されている。

採取用武器・防具は現行コード上 T1〜T3 のマスタを持つ。

採取装備の効果・採取量・採取確率への反映は `game-core-4.js` と関連装備処理を経由する。

---

## 27. インベントリ

`inventory-core.js` は手持ち・倉庫の管理を担当する。

現在の手持ち上限:

- ポーション合計10
- 食べ物合計3
- 飲み物合計3
- 武器2
- 防具2
- 道具3

武器・防具はインスタンス管理が主である。

`weaponInstances` / `armorInstances` の `location` が、

- warehouse
- carry
- equipped

を表す。

武器・防具の数量表示用カウンタはインスタンスから同期されるため、個数だけを直接書き換えて正史扱いしない。

---

## 28. 戦闘装備

`combat-equip-data.js` が戦闘用武器・防具マスタを管理する。

- WEAPONS_INIT
- ARMORS_INIT
- T1〜T10 テンプレート生成
- Tier固定ATK/DEF/HP補正
- ITEM_META 登録
- インスタンス初期化

装備の個体差は、

- quality
- enhance
- durability
- location
- options

などのインスタンス情報で保持する。

---

## 29. 装備 API

`equip-api.js` が装備の付け替えを担当する。

代表的な経路:

- 倉庫 → 装備
- 手持ち → 装備
- 装備解除
- 装備後のステータス再計算
- 在庫同期
- UI更新
- ギルドランク・装備許可証チェック

装備操作を UI ファイルに直接再実装しない。

---

## 30. 装備強化

`equip-enhance.js` が強化対象選択と強化実行を担当する。

現行の基本強化上限は5。

成功率テーブル:

- 70%
- 50%
- 35%
- 25%
- 15%

強化にはゴールドと素材を使用し、星屑の結晶を要求する経路も存在する。

強化対象はインスタンスとして扱う。

---

## 31. 装備修理

`repair-core.js` が装備修理を担当する。

現在の修理費は、最大耐久度と現在耐久度の差に基づく。

戦闘中・探索中は修理を使用できない。

---

## 32. クラフト

現行クラフト構成は次の3層を基本とする。

- `craft-item-data.js`: マスタ・生成・レシピ情報
- `craft-core.js`: 共通処理・素材・品質・統計・クラフトスキル
- `craft-actions.js`: 実際のクラフト実行

クラフトカテゴリには、

- weapon
- armor
- potion
- tool
- cooking
- material
- furniture
- petEquip

が存在する。

---

## 33. クラフトスキル

クラフトスキルはカテゴリ別に管理し、上限100。

T1は基本表示、T2以降はスキルレベルに応じて段階的にレシピが解放される。

現行共通ルールでは T2 がLv10、T3がLv20、以降10レベル刻みでT10まで拡張される。

---

## 34. 品質

クラフト品質:

- 0: 普通
- 1: 良品
- 2: 傑作

基礎品質補正として、

- 普通: 1.00
- 良品: 1.05
- 傑作: 1.12

が定義されている。

ペット特性、住宅、日替わりボーナスなどが成功率・品質・EXPへ影響する場合は、それぞれ既存ヘルパーを経由する。

---

## 35. ポーション・道具・料理

`craft-item-data.js` がポーション・道具の Tier マスタを持つ。

ポーション・道具は T1〜T10 の生成構造を持つ。

料理は `cook-data.js` がレシピと料理素材関連メタを持ち、使用処理は `battle-items-use.js` 等へ接続する。

食べ物・飲み物は空腹・渇き、戦闘バフ、ギルド依頼など複数システムへ接続するため、個別の独立効果処理を新設しない。

---

## 36. バトルアイテム

`battle-items.js` と `battle-items-use.js` が、

- ポーション使用
- 道具使用
- 食事
- 飲料
- 戦闘中アイテム UI
- 戦闘報酬処理
- ギルド通知

などを分担する。

アイテム使用時の実在庫消費は既存インベントリ / ITEM_META 経路と整合させる。

---

## 37. スキル

`skill-core-1.js` と `skill-core-2.js` が職業スキルの実行を担当する。

スキルタイプ:

- magic
- phys
- buff
- pet

職業ごとのスキル倍率や特殊効果は `jobs.js` と `skill-core-*` が連携する。

スキル実行後は武器種・防具種・職業・状態異常・スキルツリーなど既存の関連処理を通る。

---

## 38. 共通スキルツリー

`skilltree.js` が共通スキルツリーを管理する。

現在の分類:

- combat
- gather
- craft
- econ

状態:

- `globalSkillTreeUnlocked`
- 選択ノード
- 表示フィルタ

ノード取得時は前提ノードや必要条件を検査し、`getGlobalSkillTreeBonus()` で総合ボーナスを返す。

---

## 39. ペット

ペットの実体は `pet.js` に集約される。

現行設計では旧単体ペット変数を完全に廃止するのではなく、

- `petList` = 実体
- `activePetId` = 現在選択中
- `activePartyIds` = 複数編成

という構造を持ち、旧 `petLevel` 等はアクティブペットのキャッシュとして互換利用される。

---

## 40. ペット種・特性・スキル

ペットには、

- 種族
- 特性
- 個体別スキル
- 成長タイプ
- 親密度
- 装備

がある。

捕獲時にはスキル候補からランダムに複数スキルを付与する処理を持つ。

---

## 41. 複数ペット

獣群使いなどでは `activePartyIds` を用いて複数ペットを同時編成する。

編成人数とステータス計算上の分割係数は同一ではなく、現行コードでは `BEAST_PARTY_STAT_DIVISOR` が別定義される。

複数ペット関連機能を作る場合、従来の単体 `pet*` 変数だけを操作して終わらせてはならない。

---

## 42. ペット装備

ペット専用装備は `pet-equip-data.js` と `pet.js` が担当する。

`petEquipInstances` / `petEquipCounts` を用い、プレイヤー装備とはカテゴリを分離するが、ITEM_META 登録方式は共通化されている。

---

## 43. ペット世話

現在のペット世話には、

- 撫でる
- 食事
- 今日のお世話判定
- 8時間の給餌クールダウン
- 親密度

がある。

ペット特性は採取・クラフト・強化・戦闘など複数システムへボーナスを渡す。

---

## 44. ギルド

ギルド本体は `guild.js`、UI は `guild2.js`、依頼定義は `guild-quests.js`、デイリー定義は `guild-dailies.js`、納品は `guild-deliveries-data.js` が担当する。

主要状態:

- `playerGuildId`
- `guildFame`
- `guildQuestProgress`
- `citizenshipUnlocked`
- `unlockedGuildJobs`
- `guildCoins`
- `guildDailyProgress`

---

## 45. ギルド依頼

戦闘・採取・クラフト・消費・強化など各ゲーム行動からギルド進捗へ通知する。

主要フック:

- `onEnemyKilledForGuild`
- `onRebirthForGuild`
- `onCraftCompletedForGuild`
- `onGatherCompletedForGuild`
- `onEquipEnhancedForGuild`
- `onBuffFoodEatenForGuild`
- `onAlchConsumableUsedForGuild`

新規ゲーム行動を追加するとき、必要なら既存ギルド通知フックへ接続する。

---

## 46. 市民権

市民権フラグはギルド特別依頼の報酬受取側を基準に解放する。

特別依頼定義は `guild-quests.js`、報酬処理は `guild2.js` 側にある。

単に依頼進捗だけを更新して市民権を直接ONにしない。

---

## 47. ギルド職

ギルド報酬によって職業解放状態 `unlockedGuildJobs` を管理する。

`jobs.js` の候補職業リストへギルド解放状態を反映する。

転職そのものは `game-core-2.js` の `applyJobChange()` が既存の入口であり、ギルド UI から別の転職実装を作らない。

---

## 48. ギルドスキルツリー

`guildskill.js` は戦闘ギルド共通スキルツリーを管理する。

状態:

- `combatGuildTreeUnlocked`
- `combatGuildSkillPoints`

主な効果カテゴリ:

- 最大HP
- 物理スキル
- 魔法スキル
- ペット攻撃
- 被ダメージ軽減
- 魔法消費
- ペット共闘相乗効果

---

## 49. ハウジング

`housing-core.js` が拠点・土地・市民権・家賃・住宅バフを管理する。

土地系統:

- ギルド寮
- 街の一室
- 郊外の土地

郊外住宅には現行コード上5種類の家が定義される。

住宅には、

- サイズ
- コスト
- バフ
- 家具スロット
- 野外拡張

などがある。

---

## 50. 家具

`housing-furniture-data.js` が家具アイテム定義を ITEM_META に登録する。

`housing-ui-grid.js` が、

- 屋内
- 野外
- 家具グリッド
- 配置判定
- ギルド条件
- スキル条件
- シードメーカー
- スプリンクラー

などの UI / 配置処理を担当する。

家具状態はハウジング状態と整合させて保存する。

---

## 51. 農園

`farm-core.js` が畑・菜園を管理する。

現行基本仕様:

- 合計4スロット
- 成長必要値20
- 通常収穫4〜6
- 手入れで成長+2
- その他行動による成長+1

作物は ITEM_META 上の `farmGrowable` / `farmCategory` を参照する。

保存は `getFarmSaveData()` / `applyFarmSaveData()` を使用する。

---

## 52. 肥料

`fertilizer-core.js` が肥料の判定・クラフト・自動クラフトを管理する。

肥料コストは料理素材のポイントを使用し、所持数等から消費対象を決定する。

肥料は農園とクラフトの双方へ接続するため、農園側へ肥料消費ロジックを二重実装しない。

---

## 53. 釣り

`fish-data.js` が魚図鑑・魚種・サイズ・出現テーブルを管理する。

`fishDex` は、

- count
- maxSize
- firstTime
- lastTime

等を保持する。

魚種は、

- area
- bait
- timeBand

の組合せから決定する。

---

## 54. 季節

`season-core.js` は現実のカレンダーを基準とし、月曜始まりの週単位で季節を循環させる。

季節:

- spring
- summer
- autumn
- winter

季節外では、

- 成長速度 0.5倍
- 収穫量 0.7倍

の補正が現行コードに定義されている。

---

## 55. 日替わりボーナス

`daily-bonus.js` のボーナスは毎日切り替わり、セーブデータには保存しない。

対象は、

- 採取
- クラフト
- 戦闘

など。

現行定義上、採取量 +10%、クラフト成功率 +5%、対象職業の戦闘ゴールド・ドロップ +10% の経路がある。

日替わり状態を save-system に新規保存しない。

---

## 56. ショップ

`game-shop.js` が購入・売却 UI と処理を担当する。

対象は、

- ポーション
- 食品
- 飲料
- 道具
- 素材
- 中間素材
- 武器
- 防具
- 種
- その他現行登録品

であり、ITEM_META / 実在庫構造と連動する。

---

## 57. 市場クライアント

現行市場は `market-core1.js` / `market-core2.js` に分割されている。

主状態:

- `marketListings`
- `marketBuyOrders`
- `marketAllBuyOrders`
- `marketTradeLogs`
- 出品枠
- キャンセル数
- ペナルティ
- クールダウン

市場では売り注文と買い注文を扱う。

---

## 58. 市場サーバー

`server.js` が Express と Socket.IO を起動し、市場のサーバー側状態を保持する。

サーバー側には、

- `marketListings`
- `marketBuyOrders`

がプロセス内メモリとして存在する。

買い注文は価格優先・同価格では作成時刻優先でマッチングする。

出品マッチ時には Socket.IO で購入者へ通知する。

NPC購入処理は一定間隔でサーバー側で実行される。

サーバー市場状態とブラウザの localStorage セーブ状態は同一ストレージではない。
市場のサーバー状態をブラウザ save データだけで永続化されるものとして設計しない。

---

## 59. Socket.IO

`htmllast.js` がクライアント接続を初期化し `window.globalSocket` を保持する。

接続後、市場同期へ接続する。

`server.js` は Socket.IO を通じ、

- 接続
- 切断
- ping/pong
- 市場一覧
- 買い注文
- 注文キャンセル
- 出品
- 注文マッチ通知
- 市場更新

などを扱う。

新しいオンライン処理を追加する場合、既存 Socket.IO 接続を二重生成しない。

---

## 60. セーブ

`save-system.js` がセーブの正史である。

現行:

- `SAVE_VERSION = 1`
- `SAVE_KEY = "myGatherGameSave_v1"`

`makeSaveData()` によりゲーム状態をプレーンオブジェクト化し、`applySaveData()` で復元する。

---

## 61. セーブ対象

現行コードでは少なくとも次を保存する。

### プレイヤー

- level
- exp
- expToNext
- rebirthCount
- rebirthCombatPt
- rebirthGatherPt
- rebirthCraftPt
- lastRebirthType
- growthType
- STR/VIT/INT_/DEX_/LUK
- HP/MP/SP と最大値
- jobId
- jobChangedOnce
- everBeastTamer
- money
- initialJobStatsApplied

### ペット

- 旧単体ペット状態
- companionTypeId
- companionTraitId
- petList
- activePetId
- activePartyIds
- petEquipInstances
- petEquipCounts

### 生産・在庫

- materials
- gatherSkills
- craftSkills
- intermediateMats
- cookingMats
- rareGatherItems
- byproductMats
- itemCounts
- weapons / armors / potions
- weapon/armor/potion counts
- weapon/armor instances
- carry 系在庫
- toolCounts
- cookedFoods / cookedDrinks

### 探索・戦闘

- isExploring
- exploringArea
- areaBossCleared
- areaBossAvailable
- 戦闘ガード状態
- playerStatuses
- hunger
- thirst
- wellFedUntil
- escapeFailBonus

### 生活

- gatherBases
- gatherBaseStockTicks
- farm
- fishDex
- housingState
- citizenshipUnlocked

### 市場

- marketListings
- marketBuyOrders
- marketTradeLogs
- order/listing sequence
- 出品枠
- キャンセル関連状態

### ギルド

- playerGuildId
- guildFame
- guildQuestProgress
- combatGuildTreeUnlocked
- combatGuildSkillPoints
- guildCoins
- guildLearnedRecipes
- guildEquipLicenses
- guildDeliveryStats
- guildDailyDate
- guildDailyTakenDate
- guildDailyProgress
- guildBuffs
- unlockedGuildJobs

---

## 62. セーブ操作

`saveToLocal()` は localStorage へ JSON 保存する。

現行仕様では戦闘中のセーブを禁止し、探索中はセーブ可能である。

`loadFromLocal()` で JSON を取り込み `applySaveData()` を実行する。

バックアップとして、

- exportSaveData
- importSaveData

によるテキスト入出力も存在する。

---

## 63. UI レイヤ

レイアウトとロジックを分離する。

### レイアウト

- `html1.js`
- `html2.js`

### 共通 UI

- `ui-core.js`
- `htmllast.js`

### 各機能 UI

- `ui-craft-and-farm.js`
- `game-ui-2.js`
- `game-ui-3.js`
- `game-ui-4.js`
- `housing-ui-grid.js`
- `pet-ui.js`
- `gather-stats-ui.js`
- `asobikata.js`

UI からゲーム状態を直接再構成せず、既存コア関数を呼び出して状態を変更する。

---

## 64. UI 初期化

`DOMContentLoaded` を複数ファイルが利用している。

特に、

- `ui-core.js`
- `htmllast.js`

が初期化の中心であり、各機能の初期化関数を順番に呼ぶ。

新規初期化を追加するときは二重登録を避ける。

---

## 65. Teto AI

Teto AI は `teto-ai.js` を基礎とし、

- `teto-ai2.js`
- `teto-ai3.js`
- `teto-ai4.js`
- `teto-ai5.js`

が後段レイヤとして追加される構造である。

Teto は通常ゲームの別エンジンではなく、既存ゲーム関数を呼び出すテストプレイヤー層である。

現行コードでは、

- 採取
- クラフト
- ギルド加入
- ペット
- 転生
- 市場
- その他ゲーム行動

を既存関数経由で操作する。

新機能についても Teto 専用に別のゲームロジックを作るのではなく、必要な場合は既存ゲーム API を利用する。

---

## 66. Teto とデバッグ

Teto の行動評価や戦闘・クラフト等の評価情報は debug 系へ記録する。

ゲーム本体と評価コードを分離し、デバッグ処理が通常ゲームの正史状態を別経路で持たないことを基本とする。

---

## 67. デバッグ統計

`debug-stats-core.js` は、

- 採取
- クラフト
- 戦闘
- 経済
- シナリオ

の統計記録・集計・CSV出力を担当する。

`debug-stats-core2.js` は Teto の行動評価やクラフト・強化・料理バフの戦闘寄与評価を担当する。

デバッグ記録追加はゲーム本体の仕様変更と分離し、既存 debug hook へ接続する。

---

## 68. デバッグマトリクス

`debug-matrix-core.js` は条件×敵の一括戦闘シミュレーションを提供する。

シミュレーションでは `makeSaveData()` / `applySaveData()` を利用して状態を退避・復元する。

この仕組みは本番ゲームの通常進行ではなく、GM/デバッグ評価用である。

---

## 69. 現行の互換層

現行コードには新構造へ移行済みでありながら、旧セーブや旧状態との互換性を維持するコードが存在する。

代表:

- 旧形式材料 → 配列形式への移行
- 旧単体ペット変数 → `petList`
- 旧武器/防具カウント → インスタンス同期
- 未定義旧状態への安全な初期値補完

互換処理を「新しい正史」と誤認して新規機能の中心構造に戻さない。

---

## 70. 削除済み旧モジュール

基準コミットで旧クラフト・旧市場・旧装備系モジュールの整理が行われている。

代表的な旧ファイル:

- `craft-data.js`
- `market-core.js`

など。

これらを現行実装として参照しない。

現行の正史:

- クラフト: `craft-item-data.js` + `craft-core.js` + `craft-actions.js`
- 市場: `market-core1.js` + `market-core2.js`
- 戦闘装備: `combat-equip-data.js` + `equip-api.js` + `equip-enhance.js`

旧コメントや旧ファイル名の記述がコード中に残っていても、実際の script 読込と現行ファイルを基準とする。

---

## 71. 新機能追加の原則

新機能は既存の責務へ接続する。

### アイテム

ITEM_META に登録する。

### 素材

materials / intermediateMats / rareGatherItems / byproductMats 等、既存の在庫種別を使う。

### 装備

インスタンス管理と `equip-api.js` を使う。

### クラフト

`craft-item-data.js` / `craft-core.js` / `craft-actions.js` に責務を分ける。

### 戦闘

`game-core-3.js` の既存戦闘経路へ接続する。

### 探索

`game-core-5.js` を基準とする。

### 採取

`game-core-4.js` / `gather-base.js` を基準とする。

### ペット

`pet.js` / `pet-ui.js` を基準とする。

### ギルド

`guild.js` / `guild2.js` / 既存フックを基準とする。

### 拠点

`housing-core.js` / `housing-ui-grid.js` を基準とする。

### 保存

`makeSaveData()` / `applySaveData()` を更新する。

---

## 72. 重複実装禁止

同じ責務を複数ファイルに新設しない。

特に次を再定義しない。

- ITEM_META
- 材料在庫操作
- 装備インスタンス同期
- ステータス再計算
- 経験値加算
- 転職
- ペット実体管理
- 市場 Socket 同期
- セーブ構築
- ギルド進捗フック
- スキルツリー総合ボーナス

既存関数が存在する場合、それを入口にする。

---

## 73. 状態の正史

原則として、

- アイテム定義 → ITEM_META / 各マスタ
- 一次素材 → materials
- 中間素材 → intermediateMats
- 料理素材 → cookingMats
- レア素材 → rareGatherItems
- 副産物 → byproductMats
- 個体装備 → weaponInstances / armorInstances
- 複数ペット → petList
- 現在ペット → activePetId
- ペット編成 → activePartyIds
- プレイヤー能力 → game-core の状態
- ギルド → window.playerGuildId 等
- 拠点 → window.housingState
- 農園 → window.farmState
- 市場クライアント → market-core 系
- 市場サーバー → server.js

を基準とする。

互換変数を新規設計の主状態に昇格させない。

---

## 74. 実装前の必須確認

すべての変更は次の順で確認する。

1. 最新 `main` を取得する。
2. 本書を読む。
3. `index.html` の実際の読込順を確認する。
4. 対象ファイルを実読する。
5. 対象関数の呼び出し元を確認する。
6. 対象関数の呼び出し先を確認する。
7. 状態の正史を確認する。
8. セーブ対象か確認する。
9. UI 接続を確認する。
10. Socket / Teto / Debug への接続が必要か確認する。
11. 旧実装との重複を確認する。
12. 設計と実装の不一致があれば停止する。

---

## 75. 設計書更新のルール

実装によって以下が変わった場合、本書も更新する。

- 責務分担
- script 読込順
- 状態構造
- セーブ構造
- API/関数の正史
- データレジストリ
- 通信方式
- UI 構成
- 旧実装の削除
- 新しい互換層

実装だけを変更して本書を放置しない。

---

## 76. 停止条件

以下の場合は推測で進めず停止する。

- 最新 main を取得できない。
- 基準コードを実読できない。
- 対象ファイルが特定できない。
- 設計と実コードが一致しない。
- 旧実装と新実装の責務が区別できない。
- セーブ互換性を判断できない。
- UI または Socket の依存関係が不明。
- 同じ責務の既存実装があるが移行経路を特定できない。

---

## 77. 現行設計上の注意点

現行コードは段階的な分割・移行を経ているため、コメントと実コードが完全一致しない箇所が存在する。

代表:

- `index.html` の game-core コメントは1〜8だが、実読込は1〜5。
- 一部コメントには旧ファイル名が残る。
- 互換用の旧状態変数と新状態構造が併存する。
- 市場はブラウザ側保存状態とサーバー側メモリ状態が別系統である。

これらは勝手に修正せず、機能変更の必要性がある場合に個別確認する。

---

## 78. 現行設計の最上位原則

しんぷるRPGの今後の実装は、

`index.html`
→ データ／レジストリ
→ ゲーム状態
→ 各ゲームコア
→ 共通 API
→ UI
→ Socket.IO / Teto / Debug

という現在の責務分担を維持する。

新機能は既存の正史状態と既存 API に接続し、同じ責務を別経路で複製しない。

本書と最新 main の実コードを常に照合し、確認できないものを推測して追加しない。

