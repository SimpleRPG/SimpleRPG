// guild-deliveries-data.js
// ギルド調達・納品依頼（ギルドコイン獲得用）＆ ギルドショップ（製法書・特殊レシピ交換）
// プレイヤー経済型: 納品報酬はギルドコインのみ。完成品ではなく製法書（レシピ）をコインで交換。

window.guildCoins = typeof window.guildCoins === "number" ? window.guildCoins : 0;
window.guildLearnedRecipes = Array.isArray(window.guildLearnedRecipes) ? window.guildLearnedRecipes : [];
window.guildUnlockedFeatures = Array.isArray(window.guildUnlockedFeatures) ? window.guildUnlockedFeatures : [];

// =======================
// 調達・納品依頼マスタ（ギルドごと）
// =======================
window.GUILD_DELIVERY_POOLS = {
  warrior: [
    { id: "del_w_ore_t1", name: "調達: 鉄鉱石の補給", desc: "武器・武具の手入れ用に「鉄鉱石」を10個納品する。", itemType: "mat", itemId: "ore", count: 10, coinReward: 15 },
    { id: "del_w_leather_t1", name: "調達: 丈夫な皮の納品", desc: "防具の補修資材として「動物の皮」を10枚納品する。", itemType: "mat", itemId: "leather", count: 10, coinReward: 15 },
    { id: "del_w_potion_t1", name: "調達: 遠征用回復薬", desc: "部隊の常備薬として「ポーション」を3本納品する。", itemType: "potion", itemId: "potion_hp_t1", count: 3, coinReward: 20 },
    { id: "del_w_ore_t2", name: "調達: 蒼鉱石の確保", desc: "前線部隊の装備強化用「蒼鉱石」を8個納品する。", itemType: "mat", itemId: "ore_t2", count: 8, coinReward: 35, minRank: 2 }
  ],
  mage: [
    { id: "del_m_herb_t1", name: "調達: 薬草の備蓄", desc: "魔導実験の触媒として「薬草」を10個納品する。", itemType: "mat", itemId: "herb", count: 10, coinReward: 15 },
    { id: "del_m_water_t1", name: "調達: 清らかな水の採取", desc: "儀式用の蒸留水として「きれいな水」を10個納品する。", itemType: "mat", itemId: "water", count: 10, coinReward: 15 },
    { id: "del_m_mana_t1", name: "調達: 魔力回復薬", desc: "研究員向けに「マナポーション」を3本納品する。", itemType: "potion", itemId: "potion_mp_t1", count: 3, coinReward: 20 },
    { id: "del_m_cloth_t2", name: "調達: 魔導布の提供", desc: "法衣の仕立て用「星織の布」を8個納品する。", itemType: "mat", itemId: "cloth_t2", count: 8, coinReward: 35, minRank: 2 }
  ],
  tamer: [
    { id: "del_t_meat_t1", name: "調達: ペット用の餌肉", desc: "保護した動物たちの給餌用に「獣肉」を8個納品する。", itemType: "foodMat", itemId: "meat_t1", count: 8, coinReward: 15 },
    { id: "del_t_wood_t1", name: "調達: 獣舎の補修木材", desc: "檻や柵の補修用として「普通の木」を10個納品する。", itemType: "mat", itemId: "wood", count: 10, coinReward: 15 },
    { id: "del_t_leather_t2", name: "調達: 硬質な革", desc: "手綱や首輪の製作に使う「強靭な革」を8個納品する。", itemType: "mat", itemId: "leather_t2", count: 8, coinReward: 35, minRank: 2 }
  ],
  smith: [
    { id: "del_s_ore_t1", name: "調達: 粗鉄鉱の買い取り", desc: "炉の燃料・鍛冶資材として「鉄鉱石」を15個納品する。", itemType: "mat", itemId: "ore", count: 15, coinReward: 20 },
    { id: "del_s_wood_t1", name: "調達: 炭材用木材", desc: "炉の火力を維持する「普通の木」を15個納品する。", itemType: "mat", itemId: "wood", count: 15, coinReward: 20 },
    { id: "del_s_sword_t1", name: "調達: 訓練用青銅剣", desc: "新兵支給用の「青銅の剣」を1本納品する。", itemType: "weapon", itemId: "sword_t1", count: 1, coinReward: 25 },
    { id: "del_s_armor_t1", name: "調達: 青銅の胸当て", desc: "新兵支給用の「青銅の胸当て」を1着納品する。", itemType: "armor", itemId: "armor_t1", count: 1, coinReward: 25 },
    { id: "del_s_ore_t2", name: "調達: 蒼鉱石インゴット用", desc: "上位武具の精錬資材「蒼鉱石」を10個納品する。", itemType: "mat", itemId: "ore_t2", count: 10, coinReward: 40, minRank: 2 }
  ],
  alchemist: [
    { id: "del_a_herb_t1", name: "調達: 薬草ロット納品", desc: "基礎調合の量産用として「薬草」を15個納品する。", itemType: "mat", itemId: "herb", count: 15, coinReward: 20 },
    { id: "del_a_water_t1", name: "調達: 抽出用清水", desc: "試薬希釈用の「きれいな水」を15個納品する。", itemType: "mat", itemId: "water", count: 15, coinReward: 20 },
    { id: "del_a_potion_t1", name: "調達: 規格ポーション", desc: "ギルド備蓄用「ポーション」を4本納品する。", itemType: "potion", itemId: "potion_hp_t1", count: 4, coinReward: 25 },
    { id: "del_a_bomb_t1", name: "調達: 発破用小爆弾", desc: "坑道開削用の「小爆弾」を2個納品する。", itemType: "tool", itemId: "bomb_t1", count: 2, coinReward: 30 },
    { id: "del_a_herb_t2", name: "調達: 月光草の調達", desc: "上位試薬精製用「月光草」を10個納品する。", itemType: "mat", itemId: "herb_t2", count: 10, coinReward: 40, minRank: 2 }
  ],
  cooking: [
    { id: "del_c_wheat_t1", name: "調達: 小麦の袋詰め", desc: "主食調理用の「小麦」を10個納品する。", itemType: "foodMat", itemId: "wheat_t1", count: 10, coinReward: 15 },
    { id: "del_c_meat_t1", name: "調達: 厨房用生肉", desc: "まかない・仕込み用「獣肉」を10個納品する。", itemType: "foodMat", itemId: "meat_t1", count: 10, coinReward: 15 },
    { id: "del_c_soup_t1", name: "調達: 野菜スープの仕出し", desc: "酒場への仕出し用「野菜スープ」を2杯納品する。", itemType: "drink", itemId: "soup_veg_t1", count: 2, coinReward: 25 },
    { id: "del_c_jerky_t1", name: "調達: 保存食の干し肉", desc: "行商人向け保存食「干し肉」を2個納品する。", itemType: "food", itemId: "jerky_t1", count: 2, coinReward: 25 },
    { id: "del_c_grain_t2", name: "調達: 黄金小麦", desc: "特製パンの仕込み用「黄金小麦」を8個納品する。", itemType: "foodMat", itemId: "wheat_t2", count: 8, coinReward: 35, minRank: 2 }
  ],
  gather: [
    { id: "del_g_wood_t1", name: "調達: 建材用木材", desc: "街の復興・修理資材「普通の木」を20個納品する。", itemType: "mat", itemId: "wood", count: 20, coinReward: 25 },
    { id: "del_g_ore_t1", name: "調達: 採掘鉱石ロット", desc: "冶金工房向け「鉄鉱石」を20個納品する。", itemType: "mat", itemId: "ore", count: 20, coinReward: 25 },
    { id: "del_g_cloth_t1", name: "調達: 繊維素材", desc: "織物工房向け「粗い布」を20個納品する。", itemType: "mat", itemId: "cloth", count: 20, coinReward: 25 },
    { id: "del_g_wood_t2", name: "調達: 堅牢な硬木", desc: "防壁補強用「堅牢な木」を10個納品する。", itemType: "mat", itemId: "wood_t2", count: 10, coinReward: 40, minRank: 2 }
  ],
  food: [
    { id: "del_f_fish_t1", name: "調達: 鮮魚の出荷", desc: "市場への出荷用「川魚」を10匹納品する。", itemType: "foodMat", itemId: "fish_t1", count: 10, coinReward: 20 },
    { id: "del_f_herb_t1", name: "調達: 食用野草", desc: "香草焼きの風味付け「薬草」を12個納品する。", itemType: "mat", itemId: "herb", count: 12, coinReward: 20 },
    { id: "del_f_meat_t1", name: "調達: 狩猟肉の納品", desc: "精肉店への卸し用「獣肉」を10個納品する。", itemType: "foodMat", itemId: "meat_t1", count: 10, coinReward: 20 },
    { id: "del_f_fish_t2", name: "調達: 銀鱗の魚", desc: "高級料亭用「銀鱗魚」を8匹納品する。", itemType: "foodMat", itemId: "fish_t2", count: 8, coinReward: 40, minRank: 2 }
  ]
};

// =======================
// ギルド交換所（製法書・レシピ・図面マスタ）
// =======================
window.GUILD_SHOP_RECIPES = {
  smith: [
    { id: "rec_g_smith_greatsword", name: "製法書: 剛腕の大剣(T2)", desc: "攻撃力と耐久性に優れる両手剣の鍛造製法書。", coinCost: 60, minRank: 1, type: "weapon", recipeKey: "greatsword_t2" },
    { id: "rec_g_smith_tower_shield", name: "製法書: 鉄壁のタワーシールド(T2)", desc: "防御性能に特化した大盾の鍛造製法書。", coinCost: 60, minRank: 1, type: "armor", recipeKey: "tower_shield_t2" },
    { id: "rec_g_smith_knight_plate", name: "製法書: 騎士の全身甲冑(T3)", desc: "名誉ある騎士が纏う堅固な鋼鉄鎧の製法書。", coinCost: 150, minRank: 2, type: "armor", recipeKey: "knight_plate_t3" },
    { id: "rec_g_smith_dragon_slayer", name: "製法書: 竜断の大刀(T4)", desc: "竜の鱗をも断ち切る古代鍛冶秘伝の製法書。", coinCost: 300, minRank: 3, type: "weapon", recipeKey: "dragon_slayer_t4" }
  ],
  alchemist: [
    { id: "rec_g_alch_regen_t2", name: "調合書: リジェネポーション(T2)", desc: "戦闘中に持続回復をもたらす薬品の調合書。", coinCost: 50, minRank: 1, type: "potion", recipeKey: "potion_regen_t2" },
    { id: "rec_g_alch_flash_bomb", name: "調合書: 閃光煙幕弾(T2)", desc: "敵の視界を奪い暗闇状態にする投擲道具の調合書。", coinCost: 50, minRank: 1, type: "tool", recipeKey: "flash_bomb_t2" },
    { id: "rec_g_alch_elixir_t3", name: "調合書: 活命のエリクサー(T3)", desc: "HPとMPを同時に大幅回復する秘薬の調合書。", coinCost: 140, minRank: 2, type: "potion", recipeKey: "elixir_t3" },
    { id: "rec_g_alch_hyper_bomb_t4", name: "調合書: 業火の炸裂弾(T4)", desc: "高濃度の火薬で広範囲を吹き飛ばす爆弾の調合書。", coinCost: 280, minRank: 3, type: "tool", recipeKey: "hyper_bomb_t4" }
  ],
  cooking: [
    { id: "rec_g_cook_steak_t2", name: "調理書: 特選サーロインステーキ(T2)", desc: "攻撃力と最大HPを大幅に高めるごちそうのレシピ。", coinCost: 50, minRank: 1, type: "food", recipeKey: "steak_t2" },
    { id: "rec_g_cook_energy_drink_t2", name: "調理書: 薬草ハーブエナジー(T2)", desc: "SP回復と敏捷性を高める特製ドリンクのレシピ。", coinCost: 50, minRank: 1, type: "drink", recipeKey: "energy_drink_t2" },
    { id: "rec_g_cook_feast_t3", name: "調理書: 英雄の祝宴大皿(T3)", desc: "全ステータスを一定時間強化する至高のコース料理レシピ。", coinCost: 140, minRank: 2, type: "food", recipeKey: "feast_t3" }
  ],
  gather: [
    { id: "rec_g_gather_pro_pickaxe", name: "図面: 探鉱師のツルハシ(T2)", desc: "鉱石の採取速度とレア発見率を高める採取道具の図面。", coinCost: 60, minRank: 1, type: "tool", recipeKey: "pro_pickaxe_t2" },
    { id: "rec_g_gather_pro_axe", name: "図面: 森林官の大斧(T2)", desc: "木材採取時に良質な心材を見つけやすくする図面。", coinCost: 60, minRank: 1, type: "tool", recipeKey: "pro_axe_t2" },
    { id: "rec_g_gather_master_gear_t3", name: "図面: 熟練採取師の装束(T3)", desc: "あらゆる採取での獲得量を安定させる専用装備の図面。", coinCost: 150, minRank: 2, type: "armor", recipeKey: "master_gather_t3" }
  ],
  food: [
    { id: "rec_g_food_pro_rod", name: "図面: 名人の釣り竿(T2)", desc: "大物魚や珍しい魚介を引き寄せる特製釣り竿の図面。", coinCost: 60, minRank: 1, type: "tool", recipeKey: "pro_rod_t2" },
    { id: "rec_g_food_pro_knife", name: "図面: 狩猟解体ナイフ(T2)", desc: "獲物の解体時に肉や毛皮を綺麗に削ぎ落とすナイフの図面。", coinCost: 60, minRank: 1, type: "tool", recipeKey: "skinning_knife_t2" },
    { id: "rec_g_food_harvest_basket_t3", name: "図面: 豊穣の収穫籠(T3)", desc: "畑の収穫量を増やし種を保全する職人籠の図面。", coinCost: 150, minRank: 2, type: "tool", recipeKey: "harvest_basket_t3" }
  ],
  warrior: [
    { id: "rec_g_war_belt", name: "図面: 戦士の剛力ベルト(T2)", desc: "物理攻撃時の威力を底上げする戦闘用装飾品の図面。", coinCost: 60, minRank: 1, type: "armor", recipeKey: "warrior_belt_t2" },
    { id: "rec_g_war_pendant_t3", name: "図面: 不屈の闘志ペンダント(T3)", desc: "HP低下時に防御力を高める護符の図面。", coinCost: 150, minRank: 2, type: "armor", recipeKey: "courage_pendant_t3" }
  ],
  mage: [
    { id: "rec_g_mage_ring", name: "図面: 魔導師の知恵リング(T2)", desc: "魔法消費MPを抑え魔法攻撃力を高める装飾品の図面。", coinCost: 60, minRank: 1, type: "armor", recipeKey: "mage_ring_t2" },
    { id: "rec_g_mage_amulet_t3", name: "図面: エーテル結晶のアミュレット(T3)", desc: "魔力の循環を促しMP自動回復を付与する図面。", coinCost: 150, minRank: 2, type: "armor", recipeKey: "ether_amulet_t3" }
  ],
  tamer: [
    { id: "rec_g_tamer_whistle", name: "図面: 絆の調教笛(T2)", desc: "ペットの攻撃命中率と連携威力を高める笛の図面。", coinCost: 60, minRank: 1, type: "tool", recipeKey: "tamer_whistle_t2" },
    { id: "rec_g_tamer_collar_t3", name: "図面: 野獣の首輪(T3)", desc: "ペットの最大HPと攻撃力を高める専用首輪の図面。", coinCost: 150, minRank: 2, type: "tool", recipeKey: "beast_collar_t3" }
  ]
};
