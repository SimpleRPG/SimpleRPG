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
    { id: "del_w_ore_t2", name: "調達: 蒼鉱石の確保", desc: "前線部隊の装備強化用「蒼鉱石」を8個納品する。", itemType: "mat", itemId: "ore_t2", count: 8, coinReward: 35 }
  ],
  mage: [
    { id: "del_m_herb_t1", name: "調達: 薬草の備蓄", desc: "魔導実験の触媒として「薬草」を10個納品する。", itemType: "mat", itemId: "herb", count: 10, coinReward: 15 },
    { id: "del_m_water_t1", name: "調達: 清らかな水の採取", desc: "儀式用の蒸留水として「きれいな水」を10個納品する。", itemType: "mat", itemId: "water", count: 10, coinReward: 15 },
    { id: "del_m_mana_t1", name: "調達: 魔力回復薬", desc: "研究員向けに「マナポーション」を3本納品する。", itemType: "potion", itemId: "potion_mp_t1", count: 3, coinReward: 20 },
    { id: "del_m_cloth_t2", name: "調達: 魔導布の提供", desc: "法衣の仕立て用「星織の布」を8個納品する。", itemType: "mat", itemId: "cloth_t2", count: 8, coinReward: 35 }
  ],
  tamer: [
    { id: "del_t_meat_t1", name: "調達: ペット用の餌肉", desc: "保護した動物たちの給餌用に「獣肉」を8個納品する。", itemType: "foodMat", itemId: "meat_t1", count: 8, coinReward: 15 },
    { id: "del_t_wood_t1", name: "調達: 獣舎の補修木材", desc: "檻や柵の補修用として「普通の木」を10個納品する。", itemType: "mat", itemId: "wood", count: 10, coinReward: 15 },
    { id: "del_t_leather_t2", name: "調達: 硬質な革", desc: "手綱や首輪の製作に使う「強靭な革」を8個納品する。", itemType: "mat", itemId: "leather_t2", count: 8, coinReward: 35 }
  ],
  smith: [
    { id: "del_s_ore_t1", name: "調達: 粗鉄鉱の買い取り", desc: "炉の燃料・鍛冶資材として「鉄鉱石」を15個納品する。", itemType: "mat", itemId: "ore", count: 15, coinReward: 20 },
    { id: "del_s_wood_t1", name: "調達: 炭材用木材", desc: "炉の火力を維持する「普通の木」を15個納品する。", itemType: "mat", itemId: "wood", count: 15, coinReward: 20 },
    { id: "del_s_sword_t1", name: "調達: 訓練用青銅剣", desc: "新兵支給用の「青銅の剣」を1本納品する。", itemType: "weapon", itemId: "sword_t1", count: 1, coinReward: 25 },
    { id: "del_s_armor_t1", name: "調達: 青銅の胸当て", desc: "新兵支給用の「青銅の胸当て」を1着納品する。", itemType: "armor", itemId: "armor_t1", count: 1, coinReward: 25 },
    { id: "del_s_ore_t2", name: "調達: 蒼鉱石インゴット用", desc: "上位武具の精錬資材「蒼鉱石」を10個納品する。", itemType: "mat", itemId: "ore_t2", count: 10, coinReward: 40 }
  ],
  alchemist: [
    { id: "del_a_herb_t1", name: "調達: 薬草ロット納品", desc: "基礎調合の量産用として「薬草」を15個納品する。", itemType: "mat", itemId: "herb", count: 15, coinReward: 20 },
    { id: "del_a_water_t1", name: "調達: 抽出用清水", desc: "試薬希釈用の「きれいな水」を15個納品する。", itemType: "mat", itemId: "water", count: 15, coinReward: 20 },
    { id: "del_a_potion_t1", name: "調達: 規格ポーション", desc: "ギルド備蓄用「ポーション」を4本納品する。", itemType: "potion", itemId: "potion_hp_t1", count: 4, coinReward: 25 },
    { id: "del_a_bomb_t1", name: "調達: 発破用小爆弾", desc: "坑道開削用の「小爆弾」を2個納品する。", itemType: "tool", itemId: "bomb_t1", count: 2, coinReward: 30 },
    { id: "del_a_herb_t2", name: "調達: 月光草の調達", desc: "上位試薬精製用「月光草」を10個納品する。", itemType: "mat", itemId: "herb_t2", count: 10, coinReward: 40 }
  ],
  cooking: [
    { id: "del_c_wheat_t1", name: "調達: 小麦の袋詰め", desc: "主食調理用の「小麦」を10個納品する。", itemType: "foodMat", itemId: "wheat_t1", count: 10, coinReward: 15 },
    { id: "del_c_meat_t1", name: "調達: 厨房用生肉", desc: "まかない・仕込み用「獣肉」を10個納品する。", itemType: "foodMat", itemId: "meat_t1", count: 10, coinReward: 15 },
    { id: "del_c_soup_t1", name: "調達: 野菜スープの仕出し", desc: "酒場への仕出し用「野菜スープ」を2杯納品する。", itemType: "drink", itemId: "soup_veg_t1", count: 2, coinReward: 25 },
    { id: "del_c_jerky_t1", name: "調達: 保存食の干し肉", desc: "行商人向け保存食「干し肉」を2個納品する。", itemType: "food", itemId: "jerky_t1", count: 2, coinReward: 25 },
    { id: "del_c_grain_t2", name: "調達: 黄金小麦", desc: "特製パンの仕込み用「黄金小麦」を8個納品する。", itemType: "foodMat", itemId: "wheat_t2", count: 8, coinReward: 35 }
  ],
  gather: [
    { id: "del_g_wood_t1", name: "調達: 建材用木材", desc: "街の復興・修理資材「普通の木」を20個納品する。", itemType: "mat", itemId: "wood", count: 20, coinReward: 25 },
    { id: "del_g_ore_t1", name: "調達: 採掘鉱石ロット", desc: "冶金工房向け「鉄鉱石」を20個納品する。", itemType: "mat", itemId: "ore", count: 20, coinReward: 25 },
    { id: "del_g_cloth_t1", name: "調達: 繊維素材", desc: "織物工房向け「粗い布」を20個納品する。", itemType: "mat", itemId: "cloth", count: 20, coinReward: 25 },
    { id: "del_g_wood_t2", name: "調達: 堅牢な硬木", desc: "防壁補強用「堅牢な木」を10個納品する。", itemType: "mat", itemId: "wood_t2", count: 10, coinReward: 40 }
  ],
  food: [
    { id: "del_f_fish_t1", name: "調達: 鮮魚の出荷", desc: "市場への出荷用「川魚」を10匹納品する。", itemType: "foodMat", itemId: "fish_t1", count: 10, coinReward: 20 },
    { id: "del_f_herb_t1", name: "調達: 食用野草", desc: "香草焼きの風味付け「薬草」を12個納品する。", itemType: "mat", itemId: "herb", count: 12, coinReward: 20 },
    { id: "del_f_meat_t1", name: "調達: 狩猟肉の納品", desc: "精肉店への卸し用「獣肉」を10個納品する。", itemType: "foodMat", itemId: "meat_t1", count: 10, coinReward: 20 },
    { id: "del_f_fish_t2", name: "調達: 銀鱗の魚", desc: "高級料亭用「銀鱗魚」を8匹納品する。", itemType: "foodMat", itemId: "fish_t2", count: 8, coinReward: 40 }
  ]
};

// =======================
// ギルド交換所（製法書・レシピ・図面マスタ）
// =======================
window.GUILD_SHOP_RECIPES = {
  smith: [
    { id: "rec_g_smith_greatsword", name: "製法書: 剛腕の大剣(T2)", desc: "攻撃力と耐久性に優れる両手剣の鍛造製法書。", coinCost: 60, skillCategory: "weapon", skillName: "武器製作", reqSkillLv: 10, type: "weapon", recipeKey: "greatsword_t2" },
    { id: "rec_g_smith_tower_shield", name: "製法書: 鉄壁のタワーシールド(T2)", desc: "防御性能に特化した大盾の鍛造製法書。", coinCost: 60, skillCategory: "armor", skillName: "防具製作", reqSkillLv: 10, type: "armor", recipeKey: "tower_shield_t2" },
    { id: "rec_g_smith_knight_plate", name: "製法書: 騎士の全身甲冑(T3)", desc: "名誉ある騎士が纏う堅固な鋼鉄鎧の製法書。", coinCost: 150, skillCategory: "armor", skillName: "防具製作", reqSkillLv: 20, type: "armor", recipeKey: "knight_plate_t3" },
    { id: "rec_g_smith_dragon_slayer", name: "製法書: 竜断の大刀(T4)", desc: "竜の鱗をも断ち切る古代鍛冶秘伝の製法書。", coinCost: 300, skillCategory: "weapon", skillName: "武器製作", reqSkillLv: 30, type: "weapon", recipeKey: "dragon_slayer_t4" }
  ],
  alchemist: [
    { id: "rec_g_alch_regen_t2", name: "調合書: リジェネポーション(T2)", desc: "戦闘中に持続回復をもたらす薬品の調合書。", coinCost: 50, skillCategory: "potion", skillName: "ポーション調合", reqSkillLv: 10, type: "potion", recipeKey: "potion_regen_t2" },
    { id: "rec_g_alch_flash_bomb", name: "調合書: 閃光煙幕弾(T2)", desc: "敵の視界を奪い暗闇状態にする投擲道具の調合書。", coinCost: 50, skillCategory: "tool", skillName: "道具製作", reqSkillLv: 10, type: "tool", recipeKey: "flash_bomb_t2" },
    { id: "rec_g_alch_elixir_t3", name: "調合書: 活命のエリクサー(T3)", desc: "HPとMPを同時に大幅回復する秘薬の調合書。", coinCost: 140, skillCategory: "potion", skillName: "ポーション調合", reqSkillLv: 20, type: "potion", recipeKey: "elixir_t3" },
    { id: "rec_g_alch_hyper_bomb_t4", name: "調合書: 業火の炸裂弾(T4)", desc: "高濃度の火薬で広範囲を吹き飛ばす爆弾の調合書。", coinCost: 280, skillCategory: "tool", skillName: "道具製作", reqSkillLv: 30, type: "tool", recipeKey: "hyper_bomb_t4" }
  ],
  cooking: [
    { id: "rec_g_cook_steak_t2", name: "調理書: 特選サーロインステーキ(T2)", desc: "攻撃力と最大HPを大幅に高めるごちそうのレシピ。", coinCost: 50, skillCategory: "cooking", skillName: "料理スキル", reqSkillLv: 10, type: "food", recipeKey: "steak_t2" },
    { id: "rec_g_cook_energy_drink_t2", name: "調理書: 薬草ハーブエナジー(T2)", desc: "SP回復と敏捷性を高める特製ドリンクのレシピ。", coinCost: 50, skillCategory: "cooking", skillName: "料理スキル", reqSkillLv: 10, type: "drink", recipeKey: "energy_drink_t2" },
    { id: "rec_g_cook_feast_t3", name: "調理書: 英雄の祝宴大皿(T3)", desc: "全ステータスを一定時間強化する至高のコース料理レシピ。", coinCost: 140, skillCategory: "cooking", skillName: "料理スキル", reqSkillLv: 20, type: "food", recipeKey: "feast_t3" }
  ],
  gather: [
    { id: "rec_g_gather_pro_pickaxe", name: "図面: 探鉱師のツルハシ(T2)", desc: "鉱石の採取速度とレア発見率を高める採取道具の図面。", coinCost: 60, skillCategory: "tool", skillName: "道具製作", reqSkillLv: 10, type: "tool", recipeKey: "pro_pickaxe_t2" },
    { id: "rec_g_gather_pro_axe", name: "図面: 森林官の大斧(T2)", desc: "木材採取時に良質な心材を見つけやすくする図面。", coinCost: 60, skillCategory: "tool", skillName: "道具製作", reqSkillLv: 10, type: "tool", recipeKey: "pro_axe_t2" },
    { id: "rec_g_gather_master_gear_t3", name: "図面: 熟練採取師の装束(T3)", desc: "あらゆる採取での獲得量を安定させる専用装備の図面。", coinCost: 150, skillCategory: "armor", skillName: "防具製作", reqSkillLv: 20, type: "armor", recipeKey: "master_gather_t3" }
  ],
  food: [
    { id: "rec_g_food_pro_rod", name: "図面: 名人の釣り竿(T2)", desc: "大物魚や珍しい魚介を引き寄せる特製釣り竿の図面。", coinCost: 60, skillCategory: "tool", skillName: "道具製作", reqSkillLv: 10, type: "tool", recipeKey: "pro_rod_t2" },
    { id: "rec_g_food_pro_knife", name: "図面: 狩猟解体ナイフ(T2)", desc: "獲物の解体時に肉や毛皮を綺麗に削ぎ落とすナイフの図面。", coinCost: 60, skillCategory: "tool", skillName: "道具製作", reqSkillLv: 10, type: "tool", recipeKey: "skinning_knife_t2" },
    { id: "rec_g_food_harvest_basket_t3", name: "図面: 豊穣の収穫籠(T3)", desc: "畑の収穫量を増やし種を保全する職人籠の図面。", coinCost: 150, skillCategory: "tool", skillName: "道具製作", reqSkillLv: 20, type: "tool", recipeKey: "harvest_basket_t3" }
  ],
  warrior: [
    { id: "rec_g_war_belt", name: "図面: 戦士の剛力ベルト(T2)", desc: "物理攻撃時の威力を底上げする戦闘用装飾品の図面。", coinCost: 60, skillCategory: "armor", skillName: "防具製作", reqSkillLv: 10, type: "armor", recipeKey: "warrior_belt_t2" },
    { id: "rec_g_war_pendant_t3", name: "図面: 不屈の闘志ペンダント(T3)", desc: "HP低下時に防御力を高める護符の図面。", coinCost: 150, skillCategory: "armor", skillName: "防具製作", reqSkillLv: 20, type: "armor", recipeKey: "courage_pendant_t3" }
  ],
  mage: [
    { id: "rec_g_mage_ring", name: "図面: 魔導師の知恵リング(T2)", desc: "魔法消費MPを抑え魔法攻撃力を高める装飾品の図面。", coinCost: 60, skillCategory: "armor", skillName: "防具製作", reqSkillLv: 10, type: "armor", recipeKey: "mage_ring_t2" },
    { id: "rec_g_mage_amulet_t3", name: "図面: エーテル結晶のアミュレット(T3)", desc: "魔力の循環を促しMP自動回復を付与する図面。", coinCost: 150, skillCategory: "armor", skillName: "防具製作", reqSkillLv: 20, type: "armor", recipeKey: "ether_amulet_t3" }
  ],
  tamer: [
    { id: "rec_g_tamer_whistle", name: "図面: 絆の調教笛(T2)", desc: "ペットの攻撃命中率と連携威力を高める笛の図面。", coinCost: 60, skillCategory: "tool", skillName: "道具製作", reqSkillLv: 10, type: "tool", recipeKey: "tamer_whistle_t2" },
    { id: "rec_g_tamer_collar_t3", name: "図面: 野獣の首輪(T3)", desc: "ペットの最大HPと攻撃力を高める専用首輪の図面。", coinCost: 150, skillCategory: "petEquip", skillName: "ペット装備", reqSkillLv: 20, type: "petEquip", recipeKey: "beast_collar_t3" }
  ]
};

// =======================
// ギルド交換所：特産品・便利品・家具・消耗品マスタ
// =======================
window.GUILD_SHOP_GOODS = {
  smith: [
    { id: "g_good_worktable", itemId: "item_g_worktable", name: "ギルド特製職人作業台", desc: "自宅に設置できる作業台。クラフト時の成功率が+5%上昇する。", coinCost: 80, type: "furniture", icon: "🔨" },
    { id: "g_good_shorten", itemId: "item_g_ticket_shorten", name: "探索短縮の砂時計", desc: "使用すると、探索イベントを即座に3回分一気に進行できる時短アイテム。", coinCost: 20, type: "tool", icon: "⏳" },
    { id: "g_good_bulk", itemId: "item_g_bulk_delivery", name: "ギルド一括納品状", desc: "所持している納品可能アイテムを一度にすべて一括納品する優先状。", coinCost: 15, type: "tool", icon: "📜" },
    { id: "g_good_combat_scroll", itemId: "item_g_combat_scroll", name: "討伐報奨の巻物", desc: "30分間、戦闘での獲得経験値とゴールドが+25%増加する。", coinCost: 25, type: "tool", icon: "⚔️" }
  ],
  alchemist: [
    { id: "g_good_chest", itemId: "item_g_chest_guild", name: "ギルド特製収納チェスト", desc: "自宅に設置して素材や薬品をすっきり整理・保管できる収納家具。", coinCost: 80, type: "furniture", icon: "📦" },
    { id: "g_good_gather_incense", itemId: "item_g_gather_incense", name: "探鉱・採取の集中香", desc: "30分間、素材採取時の獲得数が+1個増加し、レア素材の発見率が上昇する。", coinCost: 25, type: "tool", icon: "✨" },
    { id: "g_good_shorten", itemId: "item_g_ticket_shorten", name: "探索短縮の砂時計", desc: "使用すると、探索イベントを即座に3回分一気に進行できる時短アイテム。", coinCost: 20, type: "tool", icon: "⏳" },
    { id: "g_good_bulk", itemId: "item_g_bulk_delivery", name: "ギルド一括納品状", desc: "所持している納品可能アイテムを一度にすべて一括納品する優先状。", coinCost: 15, type: "tool", icon: "📜" }
  ],
  cooking: [
    { id: "g_good_ration", itemId: "item_g_guild_ration", name: "ギルド特製スタミナレーション", desc: "HP・MPを完全回復し、30分間活力バフ（全能力向上）を付与する。", coinCost: 15, type: "food", icon: "🍲" },
    { id: "g_good_gather_incense", itemId: "item_g_gather_incense", name: "豊穣・採取の集中香", desc: "30分間、素材・食材採取時の獲得数が+1個増加し、レア発見率が上昇する。", coinCost: 25, type: "tool", icon: "✨" },
    { id: "g_good_chest", itemId: "item_g_chest_guild", name: "ギルド特製収納チェスト", desc: "自宅に設置して食材や料理をすっきり整理・保管できる収納家具。", coinCost: 80, type: "furniture", icon: "📦" },
    { id: "g_good_bulk", itemId: "item_g_bulk_delivery", name: "ギルド一括納品状", desc: "所持している納品可能アイテムを一度にすべて一括納品する優先状。", coinCost: 15, type: "tool", icon: "📜" }
  ],
  gather: [
    { id: "g_good_gather_incense", itemId: "item_g_gather_incense", name: "探鉱・伐採の集中香", desc: "30分間、素材採取時の獲得数が+1個増加し、レア素材の発見率が上昇する。", coinCost: 25, type: "tool", icon: "✨" },
    { id: "g_good_shorten", itemId: "item_g_ticket_shorten", name: "探索・採取短縮の砂時計", desc: "使用すると、探索イベントを即座に3回分一気に進行できる時短アイテム。", coinCost: 20, type: "tool", icon: "⏳" },
    { id: "g_good_chest", itemId: "item_g_chest_guild", name: "ギルド特製収納チェスト", desc: "自宅に設置して大量の原木や鉱石を保管できる収納家具。", coinCost: 80, type: "furniture", icon: "📦" },
    { id: "g_good_bulk", itemId: "item_g_bulk_delivery", name: "ギルド一括納品状", desc: "所持している納品可能アイテムを一度にすべて一括納品する優先状。", coinCost: 15, type: "tool", icon: "📜" }
  ],
  food: [
    { id: "g_good_gather_incense", itemId: "item_g_gather_incense", name: "豊穣・採取の集中香", desc: "30分間、魚や肉・作物の採取獲得数が+1個増加し、レア発見率が上昇する。", coinCost: 25, type: "tool", icon: "✨" },
    { id: "g_good_ration", itemId: "item_g_guild_ration", name: "ギルド特製スタミナレーション", desc: "HP・MPを完全回復し、30分間活力バフを付与する特製レーション。", coinCost: 15, type: "food", icon: "🍲" },
    { id: "g_good_chest", itemId: "item_g_chest_guild", name: "ギルド特製収納チェスト", desc: "自宅に設置して食糧や素材を保管できる収納家具。", coinCost: 80, type: "furniture", icon: "📦" },
    { id: "g_good_bulk", itemId: "item_g_bulk_delivery", name: "ギルド一括納品状", desc: "所持している納品可能アイテムを一度にすべて一括納品する優先状。", coinCost: 15, type: "tool", icon: "📜" }
  ],
  warrior: [
    { id: "g_good_combat_scroll", itemId: "item_g_combat_scroll", name: "討伐報奨の巻物", desc: "30分間、戦闘での獲得経験値とゴールドが+25%増加する。", coinCost: 25, type: "tool", icon: "⚔️" },
    { id: "g_good_shorten", itemId: "item_g_ticket_shorten", name: "探索短縮の砂時計", desc: "使用すると、探索イベントを即座に3回分一気に進行できる時短アイテム。", coinCost: 20, type: "tool", icon: "⏳" },
    { id: "g_good_worktable", itemId: "item_g_worktable", name: "ギルド特製職人作業台", desc: "自宅に設置できる作業台。クラフト時の成功率が+5%上昇する。", coinCost: 80, type: "furniture", icon: "🔨" },
    { id: "g_good_bulk", itemId: "item_g_bulk_delivery", name: "ギルド一括納品状", desc: "所持している納品可能アイテムを一度にすべて一括納品する優先状。", coinCost: 15, type: "tool", icon: "📜" }
  ],
  mage: [
    { id: "g_good_combat_scroll", itemId: "item_g_combat_scroll", name: "討伐報奨の巻物", desc: "30分間、戦闘での獲得経験値とゴールドが+25%増加する。", coinCost: 25, type: "tool", icon: "⚔️" },
    { id: "g_good_shorten", itemId: "item_g_ticket_shorten", name: "探索短縮の砂時計", desc: "使用すると、探索イベントを即座に3回分一気に進行できる時短アイテム。", coinCost: 20, type: "tool", icon: "⏳" },
    { id: "g_good_chest", itemId: "item_g_chest_guild", name: "ギルド特製収納チェスト", desc: "自宅に設置して魔導具や素材を整理・保管できる収納家具。", coinCost: 80, type: "furniture", icon: "📦" },
    { id: "g_good_bulk", itemId: "item_g_bulk_delivery", name: "ギルド一括納品状", desc: "所持している納品可能アイテムを一度にすべて一括納品する優先状。", coinCost: 15, type: "tool", icon: "📜" }
  ],
  tamer: [
    { id: "g_good_pet_treat", itemId: "item_g_pet_treat", name: "特製ペットトリート", desc: "パーティ編成中のペット全員に経験値+200と親愛度を付与する。", coinCost: 20, type: "tool", icon: "🍖" },
    { id: "g_good_shorten", itemId: "item_g_ticket_shorten", name: "探索短縮の砂時計", desc: "使用すると、探索イベントを即座に3回分一気に進行できる時短アイテム。", coinCost: 20, type: "tool", icon: "⏳" },
    { id: "g_good_chest", itemId: "item_g_chest_guild", name: "ギルド特製収納チェスト", desc: "自宅に設置してペット用品や素材を整理・保管できる収納家具。", coinCost: 80, type: "furniture", icon: "📦" },
    { id: "g_good_bulk", itemId: "item_g_bulk_delivery", name: "ギルド一括納品状", desc: "所持している納品可能アイテムを一度にすべて一括納品する優先状。", coinCost: 15, type: "tool", icon: "📜" }
  ]
};

// ギルドバフ管理
window.guildBuffs = window.guildBuffs || {
  gatherBuffUntil: 0,
  combatBuffUntil: 0
};

// =======================
// ギルドコイン・納品・ショップ ロジック
// =======================

function getGuildCoins() {
  return typeof window.guildCoins === "number" ? window.guildCoins : 0;
}
window.getGuildCoins = getGuildCoins;

function addGuildCoins(amount) {
  if (typeof amount !== "number" || isNaN(amount) || amount <= 0) return;
  window.guildCoins = (typeof window.guildCoins === "number" ? window.guildCoins : 0) + amount;
  if (typeof window.renderGuildHeader === "function") {
    window.renderGuildHeader();
  }
}
window.addGuildCoins = addGuildCoins;

function spendGuildCoins(amount) {
  if (typeof amount !== "number" || isNaN(amount) || amount <= 0) return false;
  const current = getGuildCoins();
  if (current < amount) return false;
  window.guildCoins = current - amount;
  if (typeof window.renderGuildHeader === "function") {
    window.renderGuildHeader();
  }
  return true;
}
window.spendGuildCoins = spendGuildCoins;

// 納品アイテムの所持数を取得
function getDeliveryItemCount(itemDef) {
  if (!itemDef) return 0;
  const { itemType, itemId, tier } = itemDef;

  // 1. 一次素材 (mat)
  if (itemType === "mat") {
    const t = tier || (typeof parseTieredId === "function" && parseTieredId(itemId) ? parseTieredId(itemId).tier : (itemId && itemId.includes("_t2") ? 2 : 1));
    let key = (itemId || "").replace(/_t\d+$/i, "").replace(/^T\d+_/, "");
    if (typeof getMatTierCount === "function") {
      return getMatTierCount(key, t);
    }
    if (window.materials && window.materials[key]) {
      return window.materials[key][t - 1] || 0;
    }
    return 0;
  }

  // 2. 料理素材 (foodMat / cookingMat)
  if (itemType === "foodMat" || itemType === "cookingMat") {
    let count = 0;
    if (window.cookingMats) {
      if (window.cookingMats[itemId]) {
        const val = window.cookingMats[itemId];
        if (typeof val === "number") count += val;
        else if (val && typeof val.total === "number") count += val.total;
      }
      // エイリアスチェック
      const aliases = {
        wheat_t1: ["wheat", "wheat_t1", "grain_refined", "grain_mochi", "T1_wheat"],
        wheat_t2: ["wheat_t2", "grain_ancient", "grain_golden", "T2_wheat"],
        meat_t1: ["meat", "meat_t1", "meat_soft", "meat_fatty", "T1_meat"],
        meat_t2: ["meat_t2", "meat_premium", "meat_magic", "T2_meat"],
        fish_t1: ["fish", "fish_t1", "fish_small", "fish_river_t1", "T1_fish"],
        fish_t2: ["fish_t2", "fish_silver", "fish_lake_t2", "T2_fish"]
      };
      if (count === 0 && aliases[itemId]) {
        for (const alias of aliases[itemId]) {
          const val = window.cookingMats[alias];
          if (typeof val === "number" && val > 0) { count += val; break; }
          if (val && typeof val.total === "number" && val.total > 0) { count += val.total; break; }
        }
      }
    }
    if (count === 0 && typeof getItemCountByMeta === "function") {
      count = getItemCountByMeta(itemId);
    }
    return count;
  }

  // 3. ポーション (potion)
  if (itemType === "potion") {
    let count = 0;
    const aliases = [itemId, itemId.replace("potion_hp_t1", "T1_potion_heal"), itemId.replace("potion_mp_t1", "T1_potion_mana"), "potion_1", "potion_hp_1", "potion_hp_t1", "T1_potion_heal", "potion_mp_1", "T1_potion_mana"];
    if (window.carryPotions) {
      aliases.forEach(a => { if (window.carryPotions[a]) count += window.carryPotions[a]; });
    }
    if (window.potions) {
      aliases.forEach(a => { if (typeof window.potions[a] === "number") count += window.potions[a]; });
    }
    if (count === 0 && typeof getItemCountByMeta === "function") {
      count = getItemCountByMeta(itemId);
    }
    return count;
  }

  // 4. 道具 (tool)
  if (itemType === "tool") {
    let count = 0;
    const aliases = [itemId, itemId.replace("bomb_t1", "T1_bomb"), "bomb_1", "bomb_t1", "T1_bomb"];
    if (window.carryTools) {
      aliases.forEach(a => { if (window.carryTools[a]) count += window.carryTools[a]; });
    }
    if (window.toolCounts) {
      aliases.forEach(a => { if (window.toolCounts[a]) count += window.toolCounts[a]; });
    }
    if (count === 0 && typeof getItemCountByMeta === "function") {
      count = getItemCountByMeta(itemId);
    }
    return count;
  }

  // 5. 料理・飲み物 (food / drink)
  if (itemType === "food" || itemType === "drink") {
    let count = 0;
    const store = itemType === "food" ? (window.cookedFoods || {}) : (window.cookedDrinks || {});
    const carry = itemType === "food" ? (window.carryFoods || {}) : (window.carryDrinks || {});
    const aliases = [itemId, itemId.replace("soup_veg_t1", "food_meat_basic_T1"), itemId.replace("jerky_t1", "food_meat_basic_T1"), "food_meat_basic_T1", "drink_tea_relax_T1"];
    aliases.forEach(a => {
      if (store[a]) count += store[a];
      if (carry[a]) count += carry[a];
    });
    if (count === 0) {
      Object.keys(store).forEach(k => {
        if (k.toLowerCase().includes((itemId || "").toLowerCase()) || (itemId.includes("soup") && k.includes("soup")) || (itemId.includes("jerky") && k.includes("meat"))) {
          count += store[k];
        }
      });
    }
    return count;
  }

  // 6. 武器・防具 (weapon / armor)
  if (itemType === "weapon") {
    let count = 0;
    if (Array.isArray(window.weaponInstances)) {
      count = window.weaponInstances.filter(w => w && !w.equipped && (w.id === itemId || w.baseId === itemId || (w.name && (w.name.includes("青銅") || w.name.includes("剣") || w.name.includes("ダガー"))))).length;
    }
    if (count === 0 && window.carryWeapons && window.carryWeapons[itemId]) count += window.carryWeapons[itemId];
    return count;
  }
  if (itemType === "armor") {
    let count = 0;
    if (Array.isArray(window.armorInstances)) {
      count = window.armorInstances.filter(a => a && !a.equipped && (a.id === itemId || a.baseId === itemId || (a.name && (a.name.includes("青銅") || a.name.includes("胸当て") || a.name.includes("服"))))).length;
    }
    if (count === 0 && window.carryArmors && window.carryArmors[itemId]) count += window.carryArmors[itemId];
    return count;
  }

  // 7. 中間素材など汎用
  if (typeof getItemCountByMeta === "function") {
    return getItemCountByMeta(itemId);
  }
  return 0;
}
window.getDeliveryItemCount = getDeliveryItemCount;

// 納品アイテムを消費
function consumeDeliveryItem(itemDef, reqCount) {
  if (!itemDef || reqCount <= 0) return false;
  let remain = reqCount;
  const { itemType, itemId, tier } = itemDef;

  // 1. 一次素材
  if (itemType === "mat") {
    const t = tier || (typeof parseTieredId === "function" && parseTieredId(itemId) ? parseTieredId(itemId).tier : (itemId && itemId.includes("_t2") ? 2 : 1));
    let key = (itemId || "").replace(/_t\d+$/i, "").replace(/^T\d+_/, "");
    if (typeof addMatTierCount === "function") {
      addMatTierCount(key, t, -remain);
      return true;
    }
    if (window.materials && window.materials[key]) {
      window.materials[key][t - 1] = Math.max(0, (window.materials[key][t - 1] || 0) - remain);
      return true;
    }
    return false;
  }

  // 2. 料理素材
  if (itemType === "foodMat" || itemType === "cookingMat") {
    if (window.cookingMats) {
      const aliases = [itemId, itemId.replace("_t1", ""), itemId.replace("_t2", ""), "wheat", "meat", "fish", "grain_refined", "meat_soft", "fish_small"];
      for (const alias of aliases) {
        const val = window.cookingMats[alias];
        if (typeof val === "number" && val > 0) {
          const sub = Math.min(remain, val);
          window.cookingMats[alias] = val - sub;
          remain -= sub;
          if (remain <= 0) break;
        } else if (val && typeof val.total === "number" && val.total > 0) {
          const sub = Math.min(remain, val.total);
          val.total -= sub;
          remain -= sub;
          if (remain <= 0) break;
        }
      }
    }
    return remain <= 0;
  }

  // 3. ポーション
  if (itemType === "potion") {
    const aliases = [itemId, itemId.replace("potion_hp_t1", "T1_potion_heal"), itemId.replace("potion_mp_t1", "T1_potion_mana"), "potion_1", "potion_hp_1", "potion_hp_t1", "T1_potion_heal", "potion_mp_1", "T1_potion_mana"];
    if (window.carryPotions) {
      for (const a of aliases) {
        if (window.carryPotions[a] > 0) {
          const sub = Math.min(remain, window.carryPotions[a]);
          window.carryPotions[a] -= sub;
          remain -= sub;
          if (remain <= 0) break;
        }
      }
    }
    if (remain > 0 && window.potions) {
      for (const a of aliases) {
        if (window.potions[a] > 0) {
          const sub = Math.min(remain, window.potions[a]);
          window.potions[a] -= sub;
          remain -= sub;
          if (remain <= 0) break;
        }
      }
    }
    return remain <= 0;
  }

  // 4. 道具
  if (itemType === "tool") {
    const aliases = [itemId, itemId.replace("bomb_t1", "T1_bomb"), "bomb_1", "bomb_t1", "T1_bomb"];
    if (window.carryTools) {
      for (const a of aliases) {
        if (window.carryTools[a] > 0) {
          const sub = Math.min(remain, window.carryTools[a]);
          window.carryTools[a] -= sub;
          remain -= sub;
          if (remain <= 0) break;
        }
      }
    }
    if (remain > 0 && window.toolCounts) {
      for (const a of aliases) {
        if (window.toolCounts[a] > 0) {
          const sub = Math.min(remain, window.toolCounts[a]);
          window.toolCounts[a] -= sub;
          remain -= sub;
          if (remain <= 0) break;
        }
      }
    }
    return remain <= 0;
  }

  // 5. 料理・飲み物
  if (itemType === "food" || itemType === "drink") {
    const store = itemType === "food" ? (window.cookedFoods || {}) : (window.cookedDrinks || {});
    const carry = itemType === "food" ? (window.carryFoods || {}) : (window.carryDrinks || {});
    for (const k of Object.keys(store)) {
      if (store[k] > 0) {
        const sub = Math.min(remain, store[k]);
        store[k] -= sub;
        remain -= sub;
        if (remain <= 0) break;
      }
    }
    if (remain > 0) {
      for (const k of Object.keys(carry)) {
        if (carry[k] > 0) {
          const sub = Math.min(remain, carry[k]);
          carry[k] -= sub;
          remain -= sub;
          if (remain <= 0) break;
        }
      }
    }
    return remain <= 0;
  }

  // 6. 武器・防具
  if (itemType === "weapon" && Array.isArray(window.weaponInstances)) {
    for (let i = window.weaponInstances.length - 1; i >= 0 && remain > 0; i--) {
      const w = window.weaponInstances[i];
      if (w && !w.equipped) {
        window.weaponInstances.splice(i, 1);
        remain--;
      }
    }
    return remain <= 0;
  }
  if (itemType === "armor" && Array.isArray(window.armorInstances)) {
    for (let i = window.armorInstances.length - 1; i >= 0 && remain > 0; i--) {
      const a = window.armorInstances[i];
      if (a && !a.equipped) {
        window.armorInstances.splice(i, 1);
        remain--;
      }
    }
    return remain <= 0;
  }

  if (typeof consumeItemByMeta === "function") {
    return consumeItemByMeta(itemId, reqCount);
  }
  return false;
}
window.consumeDeliveryItem = consumeDeliveryItem;

// レシピの要求スキル情報を取得
function getGuildRecipeSkillInfo(rec) {
  if (!rec) return { category: "weapon", name: "製作", reqLv: 0, curLv: 0, isMet: true };
  const category = rec.skillCategory || rec.type || "weapon";
  const catNames = {
    weapon: "武器製作",
    armor: "防具製作",
    potion: "ポーション調合",
    tool: "道具製作",
    cooking: "料理スキル",
    food: "料理スキル",
    drink: "料理スキル",
    furniture: "家具製作",
    petEquip: "ペット装備",
    material: "素材加工"
  };
  const name = rec.skillName || catNames[category] || "製作";
  let reqLv = typeof rec.reqSkillLv === "number" ? rec.reqSkillLv : 0;
  if (!reqLv && rec.tier) {
    reqLv = Math.max(0, (rec.tier - 1) * 10);
  }

  let curLv = 0;
  if (typeof getCraftSkillLevel === "function") {
    curLv = getCraftSkillLevel(category);
  } else if (typeof craftSkills !== "undefined" && craftSkills && craftSkills[category]) {
    curLv = craftSkills[category].lv || 0;
  }

  return {
    category,
    name,
    reqLv,
    curLv,
    isMet: curLv >= reqLv
  };
}
window.getGuildRecipeSkillInfo = getGuildRecipeSkillInfo;

// 納品実行（ギルド名声は付与せず、ギルドコインのみ獲得）
function submitGuildDelivery(deliveryId) {
  if (!deliveryId) return;
  const gid = window.playerGuildId;
  if (!gid) {
    if (typeof appendLog === "function") appendLog("ギルドに所属していません。");
    return;
  }
  const pool = window.GUILD_DELIVERY_POOLS && window.GUILD_DELIVERY_POOLS[gid];
  if (!pool) return;
  const del = pool.find(d => d.id === deliveryId);
  if (!del) return;

  // 所持数チェック
  const have = getDeliveryItemCount(del);
  if (have < del.count) {
    if (typeof appendLog === "function") appendLog(`納品に必要なアイテムが足りません（所持: ${have} / 必要: ${del.count}）`);
    return;
  }

  // 消費
  const consumed = consumeDeliveryItem(del, del.count);
  if (!consumed) {
    if (typeof appendLog === "function") appendLog("アイテムの消費に失敗しました。");
    return;
  }

  // 報酬付与（ギルドコインのみ）
  const coinReward = del.coinReward || 15;
  addGuildCoins(coinReward);

  // 統計記録
  window.guildDeliveryStats = window.guildDeliveryStats || {};
  window.guildDeliveryStats[deliveryId] = (window.guildDeliveryStats[deliveryId] || 0) + 1;
  window.guildDeliveryStats._total = (window.guildDeliveryStats._total || 0) + 1;

  // ログ出力
  if (typeof appendLog === "function") {
    appendLog(`【ギルド調達納品】「${del.name}」を納品しました！ 🪙ギルドコイン +${coinReward}枚 を獲得！`);
  }

  // UI再描画
  if (typeof renderGuildDeliveries === "function") renderGuildDeliveries();
  if (typeof renderGuildHeader === "function") renderGuildHeader();
  if (typeof updateStatsUI === "function") updateStatsUI();
}
window.submitGuildDelivery = submitGuildDelivery;

// レシピ交換・習得（スキルレベルを条件に判定）
function buyGuildRecipe(recipeId) {
  if (!recipeId) return;
  const gid = window.playerGuildId;
  if (!gid) {
    if (typeof appendLog === "function") appendLog("ギルドに所属していません。");
    return;
  }
  const pool = window.GUILD_SHOP_RECIPES && window.GUILD_SHOP_RECIPES[gid];
  if (!pool) return;
  const rec = pool.find(r => r.id === recipeId);
  if (!rec) return;

  window.guildLearnedRecipes = Array.isArray(window.guildLearnedRecipes) ? window.guildLearnedRecipes : [];
  if (window.guildLearnedRecipes.includes(rec.recipeKey)) {
    if (typeof appendLog === "function") appendLog("この製法書はすでに習得済みです。");
    return;
  }

  // スキルレベルチェック
  const skillInfo = getGuildRecipeSkillInfo(rec);
  if (!skillInfo.isMet) {
    if (typeof appendLog === "function") appendLog(`この製法書は【${skillInfo.name} Lv${skillInfo.reqLv}以上】で交換・習得可能です。（現在: Lv${skillInfo.curLv}）`);
    return;
  }

  // コインチェック＆消費
  const cost = rec.coinCost || 50;
  if (!spendGuildCoins(cost)) {
    if (typeof appendLog === "function") appendLog(`ギルドコインが足りません（所持: ${getGuildCoins()} / 必要: ${cost}）`);
    return;
  }

  window.guildLearnedRecipes.push(rec.recipeKey);

  if (typeof appendLog === "function") {
    appendLog(`【ギルド交換所】「${rec.name}」を交換・習得しました！（コイン -${cost}）`);
  }

  if (typeof renderGuildShop === "function") renderGuildShop();
  if (typeof renderGuildHeader === "function") renderGuildHeader();
}
window.buyGuildRecipe = buyGuildRecipe;

// 特産品・家具・消耗品購入
function buyGuildGoods(goodId) {
  if (!goodId) return;
  const gid = window.playerGuildId;
  if (!gid) {
    if (typeof appendLog === "function") appendLog("ギルドに所属していません。");
    return;
  }
  const pool = window.GUILD_SHOP_GOODS && window.GUILD_SHOP_GOODS[gid];
  if (!pool) return;
  const good = pool.find(g => g.id === goodId);
  if (!good) return;

  const cost = good.coinCost || 20;
  if (!spendGuildCoins(cost)) {
    if (typeof appendLog === "function") appendLog(`ギルドコインが足りません（所持: ${getGuildCoins()} / 必要: ${cost}）`);
    return;
  }

  if (typeof addItemByMeta === "function") {
    addItemByMeta(good.itemId, 1);
  }

  if (typeof appendLog === "function") {
    appendLog(`【ギルド交換所】「${good.name}」を購入しました！（コイン -${cost}）`);
  }

  if (typeof renderGuildShop === "function") renderGuildShop();
  if (typeof renderGuildHeader === "function") renderGuildHeader();
  if (typeof refreshCarryPotionSelects === "function") refreshCarryPotionSelects();
}
window.buyGuildGoods = buyGuildGoods;

// ギルド消耗品の使用
function useGuildConsumableItem(itemId) {
  if (!itemId) return false;
  if (typeof consumeItemByMeta !== "function") return false;

  const haveCount = (typeof getItemCountByMeta === "function") ? getItemCountByMeta(itemId) : 0;
  if (haveCount <= 0) {
    if (typeof appendLog === "function") appendLog("対象アイテムを所持していません。");
    return false;
  }

  if (itemId === "item_g_ticket_shorten") {
    consumeItemByMeta(itemId, 1);
    if (typeof appendLog === "function") {
      appendLog("⏳【探索短縮の砂時計】を使用！ 時間を短縮し、探索を3回一気に進めました！");
    }
    if (typeof doExploreEvent === "function") {
      for (let i = 0; i < 3; i++) {
        try { doExploreEvent(); } catch (e) {}
      }
    }
    if (typeof renderGuildShop === "function") renderGuildShop();
    return true;
  }

  if (itemId === "item_g_bulk_delivery") {
    consumeItemByMeta(itemId, 1);
    executeBulkGuildDelivery();
    if (typeof renderGuildShop === "function") renderGuildShop();
    return true;
  }

  if (itemId === "item_g_gather_incense") {
    consumeItemByMeta(itemId, 1);
    window.guildBuffs = window.guildBuffs || {};
    window.guildBuffs.gatherBuffUntil = Date.now() + 30 * 60 * 1000;
    if (typeof appendLog === "function") {
      appendLog("✨【探鉱・採取の集中香】を使用しました！ 30分間、素材採取量+1＆レア発見率がアップします。");
    }
    if (typeof renderGuildShop === "function") renderGuildShop();
    return true;
  }

  if (itemId === "item_g_combat_scroll") {
    consumeItemByMeta(itemId, 1);
    window.guildBuffs = window.guildBuffs || {};
    window.guildBuffs.combatBuffUntil = Date.now() + 30 * 60 * 1000;
    if (typeof appendLog === "function") {
      appendLog("⚔️【討伐報奨の巻物】を使用しました！ 30分間、戦闘での獲得Exp＆ゴールド+25%になります。");
    }
    if (typeof renderGuildShop === "function") renderGuildShop();
    return true;
  }

  if (itemId === "item_g_pet_treat") {
    consumeItemByMeta(itemId, 1);
    if (typeof addPetExpToParty === "function") {
      addPetExpToParty(200);
    } else if (typeof addPetExp === "function") {
      addPetExp(200);
    }
    if (typeof appendLog === "function") {
      appendLog("🍖【特製ペットトリート】を与えました！ ペット全員に経験値+200と親愛度が付与されました！");
    }
    if (typeof renderGuildShop === "function") renderGuildShop();
    return true;
  }

  if (itemId === "item_g_guild_ration") {
    consumeItemByMeta(itemId, 1);
    if (typeof hpMax === "number" && typeof hp === "number") hp = hpMax;
    if (typeof mpMax === "number" && typeof mp === "number") mp = mpMax;
    window.guildBuffs = window.guildBuffs || {};
    window.guildBuffs.gatherBuffUntil = Math.max(window.guildBuffs.gatherBuffUntil || 0, Date.now() + 15 * 60 * 1000);
    if (typeof appendLog === "function") {
      appendLog("🍲【ギルド特製スタミナレーション】を食べました！ HP・MPが全快し、活力がみなぎりました！");
    }
    if (typeof updateHpMpDisplay === "function") updateHpMpDisplay();
    if (typeof renderGuildShop === "function") renderGuildShop();
    return true;
  }

  if (itemId === "item_g_chest_guild" || itemId === "item_g_worktable") {
    if (typeof appendLog === "function") {
      appendLog("🏠 家具アイテムは【拠点】タブの家具置き場に設置して効果を発揮します。");
    }
    return false;
  }

  return false;
}
window.useGuildConsumableItem = useGuildConsumableItem;

// ギルド一括納品
function executeBulkGuildDelivery() {
  const gid = window.playerGuildId;
  if (!gid) {
    if (typeof appendLog === "function") appendLog("ギルドに所属していません。");
    return;
  }
  const pool = window.GUILD_DELIVERY_POOLS && window.GUILD_DELIVERY_POOLS[gid];
  if (!pool || pool.length === 0) {
    if (typeof appendLog === "function") appendLog("納品可能な調達依頼がありません。");
    return;
  }

  let totalCoinGained = 0;
  let deliveredCount = 0;

  pool.forEach(del => {
    let have = getDeliveryItemCount(del);
    while (have >= del.count) {
      const consumed = consumeDeliveryItem(del, del.count);
      if (!consumed) break;
      const coinReward = del.coinReward || 15;
      totalCoinGained += coinReward;
      deliveredCount++;
      window.guildDeliveryStats = window.guildDeliveryStats || {};
      window.guildDeliveryStats[del.id] = (window.guildDeliveryStats[del.id] || 0) + 1;
      window.guildDeliveryStats._total = (window.guildDeliveryStats._total || 0) + 1;
      have = getDeliveryItemCount(del);
    }
  });

  if (deliveredCount > 0) {
    addGuildCoins(totalCoinGained);
    if (typeof appendLog === "function") {
      appendLog(`📜【ギルド一括納品】合計 ${deliveredCount} 件の納品を完了！ 🪙 ギルドコイン +${totalCoinGained}枚 を獲得しました！`);
    }
  } else {
    if (typeof appendLog === "function") {
      appendLog("📜【ギルド一括納品】納品可能なアイテムが手持ちにありませんでした。");
    }
  }

  if (typeof renderGuildDeliveries === "function") renderGuildDeliveries();
  if (typeof renderGuildHeader === "function") renderGuildHeader();
  if (typeof updateStatsUI === "function") updateStatsUI();
}
window.executeBulkGuildDelivery = executeBulkGuildDelivery;

