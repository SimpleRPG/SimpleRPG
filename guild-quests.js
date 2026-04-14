// guild-quests.js
// ギルド依頼データ定義専用ファイル
// （ロジックは guild.js 側が担当。先にこのファイルを読み込むこと）

// ひとまずギルドごとに簡易依頼を定義
window.GUILD_QUESTS = {
  warrior: [
    {
      id: "warrior_kill_30_phys",
      name: "物理撃破訓練",
      desc: "物理攻撃で敵を30体倒す。",
      fameReward: 15,
      hint: "通常攻撃や物理スキルでトドメを刺すとカウントされる。"
    },
    {
      id: "battle_boss_1",
      name: "スライムキング討伐",
      desc: "草原のボス『スライムキング』を1体倒す。",
      fameReward: 25,
      hint: "草原ボスエリアに出現するスライムキングを倒そう。"
    },
    {
      id: "field_kill_100_any",
      name: "草原の掃討",
      desc: "草原エリアで敵を100体倒す。",
      fameReward: 20,
      hint: "草原での通常戦闘を続ければ自然と達成できる。"
    },
    {
      id: "forest_kill_100_any",
      name: "森の掃討",
      desc: "森エリアで敵を100体倒す。",
      fameReward: 15,
      hint: "森での通常戦闘を続ければ自然と達成できる（ランク1以上で受注可能）。"
    },
    {
      id: "forest_kill_50_phys",
      name: "森の物理討伐",
      desc: "森エリアで物理攻撃で敵を50体倒す。",
      fameReward: 15,
      hint: "森で物理スキルや通常攻撃でとどめを刺そう（ランク1以上）。"
    },
    {
      id: "forest_boss_1",
      name: "森の主討伐",
      desc: "森のボスを1体倒す。",
      fameReward: 20,
      hint: "森ボスエリアのボスを倒そう（ランク1以上）。"
    },
    // ★ 戦士転生依頼
    {
      id: "warrior_rebirth_1",
      name: "戦士としての再出発",
      desc: "戦士として1回転生する。",
      fameReward: 20,
      hint: "戦士の職業で1度転生すると達成される。"
    }
  ],
  mage: [
    {
      id: "mage_kill_30_magic",
      name: "魔法撃破訓練",
      desc: "魔法で敵を30体倒す。",
      fameReward: 15,
      hint: "ファイアボルトやアイスランスなどでトドメを刺すとカウントされる。"
    },
    {
      id: "battle_boss_1",
      name: "スライムキング討伐",
      desc: "草原のボス『スライムキング』を1体倒す。",
      fameReward: 25,
      hint: "草原ボスエリアに出現するスライムキングを倒そう。"
    },
    {
      id: "field_kill_100_any",
      name: "草原の掃討",
      desc: "草原エリアで敵を100体倒す。",
      fameReward: 20,
      hint: "草原での通常戦闘を続ければ自然と達成できる。"
    },
    {
      id: "forest_kill_100_any",
      name: "森の掃討",
      desc: "森エリアで敵を100体倒す。",
      fameReward: 15,
      hint: "森での通常戦闘を続ければ自然と達成できる（ランク1以上で受注可能）。"
    },
    {
      id: "forest_kill_50_magic",
      name: "森の魔法討伐",
      desc: "森エリアで魔法で敵を50体倒す。",
      fameReward: 15,
      hint: "森で魔法スキルでとどめを刺そう（ランク1以上）。"
    },
    {
      id: "forest_boss_1",
      name: "森の主討伐",
      desc: "森のボスを1体倒す。",
      fameReward: 20,
      hint: "森ボスエリアのボスを倒そう（ランク1以上）。"
    },
    // ★ 魔法使い転生依頼
    {
      id: "mage_rebirth_1",
      name: "魔法使いとしての再出発",
      desc: "魔法使いとして1回転生する。",
      fameReward: 20,
      hint: "魔法使いの職業で1度転生すると達成される。"
    }
  ],
  tamer: [
    {
      id: "tamer_kill_30_pet",
      name: "ペット撃破訓練",
      desc: "ペットで敵を30体倒す。",
      fameReward: 15,
      hint: "ペットの攻撃やスキルでトドメを刺すとカウントされる。"
    },
    {
      id: "battle_boss_1",
      name: "スライムキング討伐",
      desc: "草原のボス『スライムキング』を1体倒す。",
      fameReward: 25,
      hint: "草原ボスエリアに出現するスライムキングを倒そう。"
    },
    {
      id: "field_kill_100_any",
      name: "草原の掃討",
      desc: "草原エリアで敵を100体倒す。",
      fameReward: 20,
      hint: "草原での通常戦闘を続ければ自然と達成できる。"
    },
    {
      id: "forest_kill_100_any",
      name: "森の掃討",
      desc: "森エリアで敵を100体倒す。",
      fameReward: 15,
      hint: "森での通常戦闘を続ければ自然と達成できる（ランク1以上で受注可能）。"
    },
    {
      id: "forest_kill_50_pet",
      name: "森のペット討伐",
      desc: "森エリアでペットで敵を50体倒す。",
      fameReward: 15,
      hint: "森でペットにとどめを任せよう（ランク1以上）。"
    },
    {
      id: "forest_boss_1",
      name: "森の主討伐",
      desc: "森のボスを1体倒す。",
      fameReward: 20,
      hint: "森ボスエリアのボスを倒そう（ランク1以上）。"
    },
    // ★ 動物使い転生依頼
    {
      id: "tamer_rebirth_1",
      name: "動物使いとしての再出発",
      desc: "動物使いとして1回転生する。",
      fameReward: 20,
      hint: "動物使いの職業で1度転生すると達成される。"
    }
  ],

  // クラフト／採取ギルド
  smith: [
    // --- T1帯 ---
    {
      id: "smith_craft_weapon_t1",
      name: "T1武器制作の依頼",
      desc: "T1武器を5本クラフトする。",
      fameReward: 10,
      hint: "まずはT1武器レシピで武器を5本作ろう."
    },
    {
      id: "smith_craft_armor_t1",
      name: "T1防具制作の依頼",
      desc: "T1防具を5個クラフトする。",
      fameReward: 10,
      hint: "T1防具レシピで防具を5個作ろう。"
    },
    {
      id: "smith_enhance",
      name: "装備強化の試験",
      desc: "武器か防具を2回強化する。",
      fameReward: 20,
      hint: "強化システムへの誘導。"
    },
    {
      id: "smith_craft_t1_gear_20",
      name: "T1装備量産計画",
      desc: "T1武器またはT1防具を合計20個クラフトする。",
      fameReward: 20,
      hint: "T1装備を量産してギルドに納品しよう。"
    },

    // --- T2帯 ---
    {
      id: "smith_craft_weapon_t2",
      name: "T2武器制作の依頼",
      desc: "T2武器を2本クラフトする。",
      fameReward: 15,
      hint: "T2武器レシピを解放して、少し上位の武器を2本作ろう（ランク1以上で表示）。"
    },
    {
      id: "smith_craft_armor_t2",
      name: "T2防具制作の依頼",
      desc: "T2防具を2個クラフトする。",
      fameReward: 15,
      hint: "T2防具レシピを解放して、少し上位の防具を2個作ろう（ランク1以上で表示）。"
    },
    {
      id: "smith_craft_t2_gear_10",
      name: "T2装備大量生産",
      desc: "T2武器またはT2防具を合計10個クラフトする。",
      fameReward: 15,
      hint: "実戦投入用のT2装備をまとめて鍛造しよう（ランク1以上で表示）。"
    },
    {
      id: "smith_enhance_t2",
      name: "T2装備強化試験",
      desc: "T2武器またはT2防具を合計3回強化する。",
      fameReward: 15,
      hint: "T2装備を実戦向けに強化して、性能を引き出そう。"
    }
  ],

  alchemist: [
    // --- T1帯（合計60） ---
    {
      id: "alch_craft_potion_t1",
      name: "T1ポーション調合の依頼",
      desc: "T1ポーションを5回クラフトする。",
      fameReward: 15,
      hint: "基礎ポーションレシピを使って調合しよう。"
    },
    {
      id: "alch_craft_bomb_t1",
      name: "T1爆弾試作の依頼",
      desc: "T1爆弾系の道具を3個クラフトする。",
      fameReward: 15,
      hint: "初級爆弾レシピで戦闘用道具を作ってみよう。"
    },
    {
      id: "alch_craft_mix",
      name: "実践用消耗品の供給",
      desc: "ポーションまたは爆弾を合計10個クラフトする。",
      fameReward: 15,
      hint: "戦闘で使う消耗品をまとめて作り、ストックを整えよう。"
    },
    {
      id: "alch_use_potion_or_tool",
      name: "実戦投与テスト",
      desc: "ポーションまたは爆弾系の道具を合計5回使用する。",
      fameReward: 15,
      hint: "戦闘や探索中にポーションを飲んだり、爆弾系アイテムを使ってみよう。"
    },

    // --- T2帯（新規追加含む・合計60） ---
    {
      id: "alch_craft_t2_potion",
      name: "改良ポーションの開発",
      desc: "T2ポーションを3回クラフトする。",
      fameReward: 15,
      hint: "T2ポーションレシピを解放して、回復量の高いポーションを作ろう（ランク1以上で表示）。"
    },
    {
      id: "alch_craft_t2_tool",
      name: "高級錬金道具の開発",
      desc: "T2爆弾系やT2道具を3個クラフトする。",
      fameReward: 15,
      hint: "上位爆弾や特殊な錬金道具を作成してみよう（ランク1以上で表示）。"
    },
    {
      id: "alch_use_t2_potion_or_tool",
      name: "高位薬品の実地試験",
      desc: "T2ポーションまたはT2錬金道具を合計5回使用する。",
      fameReward: 15,
      hint: "実戦でT2ポーションやT2爆弾を使い、その効果を確かめてみよう。"
    },
    {
      id: "alch_mass_t2_supply",
      name: "上級消耗品の供給",
      desc: "T2ポーションまたはT2錬金道具を合計10個クラフトする。",
      fameReward: 15,
      hint: "高位の消耗品を量産し、長期戦に備えよう（ランク1以上で表示）。"
    }
  ],

  cooking: [
    // --- T1帯（合計60） ---
    {
      id: "cooking_basic_food_t1",
      name: "基本料理の習得",
      desc: "T1料理を3回作る。",
      fameReward: 10,
      hint: "まずは簡単な料理レシピから慣れていこう。"
    },
    {
      id: "cooking_basic_drink_t1",
      name: "基本飲み物の習得",
      desc: "T1飲み物を3回作る。",
      fameReward: 10,
      hint: "T1ドリンクレシピで飲み物を3回用意しよう。"
    },
    {
      id: "cooking_buff",
      name: "バフ料理の試食会",
      desc: "バフ付き料理を2回食べる。",
      fameReward: 10,
      hint: "フィールドでの料理活用を促す。"
    },
    {
      id: "cooking_variety",
      name: "食卓の彩り",
      desc: "異なる種類の料理または飲み物を5回作る。",
      fameReward: 16,
      hint: "同じレシピだけでなく、いくつかのレシピをローテーションしよう。"
    },
    {
      id: "cooking_use_food_or_drink",
      name: "料理バフの活用",
      desc: "料理または飲み物によるバフを合計5回得る。",
      fameReward: 14,
      hint: "料理や飲み物を使って、バフを積極的に活用してみよう。"
    },

    // --- T2帯（新規追加含む・合計60） ---
    {
      id: "cooking_t2_food",
      name: "上級料理の研鑽",
      desc: "T2料理を3回作る。",
      fameReward: 12,
      hint: "上位料理レシピを使って、栄養価の高い料理を作ろう（ランク1以上で表示）。"
    },
    {
      id: "cooking_t2_drink",
      name: "上級飲み物の研鑽",
      desc: "T2飲み物を3回作る。",
      fameReward: 12,
      hint: "上位ドリンクレシピで、強力なバフが得られる飲み物を用意しよう（ランク1以上で表示）。"
    },
    {
      id: "cooking_t2_any",
      name: "上級メニューの提供",
      desc: "T2料理またはT2飲み物を合計10回作る。",
      fameReward: 12,
      hint: "T2帯のメニューを量産して、常にバフを維持できるようにしよう。"
    },
    {
      id: "cooking_eat_t2_food",
      name: "高級料理の味見",
      desc: "T2料理を5回食べる。",
      fameReward: 12,
      hint: "T2料理を実際に食べて、その効果と味を確かめてみよう。"
    },
    {
      id: "cooking_drink_t2",
      name: "高級飲み物の試飲",
      desc: "T2飲み物を5回飲む。",
      fameReward: 12,
      hint: "T2飲み物を飲んで、バフ効果を体感しよう。"
    }
  ],

  gather: [
    // --- T1帯 任意＋種類別 ---
    {
      id: "gather_t1_any_30",
      name: "T1素材の基礎集め",
      desc: "T1通常素材を合計30個集める。",
      fameReward: 20,
      hint: "木・鉱石・草・布・皮・水など、T1素材を満遍なく集めてみよう。"
    },
    {
      id: "gather_t1_wood_30",
      name: "T1木材の調達",
      desc: "T1木材を30個集める。",
      fameReward: 20,
      hint: "伐採スポットを巡って木材を集めよう。"
    },
    {
      id: "gather_t1_ore_30",
      name: "T1鉱石の調達",
      desc: "T1鉱石を30個集める。",
      fameReward: 20,
      hint: "鉱石採取スポットを重点的に回ろう。"
    },
    {
      id: "gather_t1_herb_30",
      name: "T1薬草の調達",
      desc: "T1草素材を30個集める。",
      fameReward: 20,
      hint: "草が多く採れる場所を中心に採集しよう。"
    },
    {
      id: "gather_t1_cloth_30",
      name: "T1繊維素材の調達",
      desc: "T1布素材を30個集める。",
      fameReward: 20,
      hint: "布素材が採れるポイントを巡ろう。"
    },
    {
      id: "gather_t1_leather_30",
      name: "T1皮素材の調達",
      desc: "T1皮素材を30個集める。",
      fameReward: 20,
      hint: "皮素材が得られる採取や狩りを重ねよう。"
    },
    {
      id: "gather_t1_water_30",
      name: "T1水資源の調達",
      desc: "T1水を30回分採取する。",
      fameReward: 20,
      hint: "水場を回って水を集めよう。"
    },

    // --- T2帯 任意＋種類別（既存T2クエストを内包） ---
    {
      id: "gather_basic",
      name: "T2素材集めの手伝い",
      desc: "T2通常素材を50個集める。",
      fameReward: 8,
      hint: "T2採取スポットを中心に素材を集めよう。"
    },
    {
      id: "gather_t2_any_100",
      name: "T2素材の大量調達",
      desc: "T2通常素材を合計100個集める。",
      fameReward: 20,
      hint: "高ティアの採取ポイントを回ってT2素材を集中的に集めよう。"
    },
    {
      id: "gather_t2_wood_30",
      name: "T2木材の調達",
      desc: "T2木材を30個集める。",
      fameReward: 20,
      hint: "上位の伐採スポットで木材を集めよう。"
    },
    {
      id: "gather_t2_ore_30",
      name: "T2鉱石の調達",
      desc: "T2鉱石を30個集める。",
      fameReward: 20,
      hint: "上位の鉱石採取スポットを巡ろう。"
    },
    {
      id: "gather_t2_herb_30",
      name: "T2薬草の調達",
      desc: "T2草素材を30個集める。",
      fameReward: 20,
      hint: "上位エリアで薬草を採集しよう。"
    },
    {
      id: "gather_t2_cloth_30",
      name: "T2繊維素材の調達",
      desc: "T2布素材を30個集める。",
      fameReward: 20,
      hint: "高品質な布素材を採れるポイントを巡ろう。"
    },
    {
      id: "gather_t2_leather_30",
      name: "T2皮素材の調達",
      desc: "T2皮素材を30個集める。",
      fameReward: 20,
      hint: "高品質な皮素材が得られる採取や狩りを重ねよう。"
    },
    {
      id: "gather_t2_water_30",
      name: "T2水資源の調達",
      desc: "T2水を30回分採取する。",
      fameReward: 20,
      hint: "上位の水場で水を集めよう。"
    },

    // --- T3帯（既存） ---
    {
      id: "gather_t3",
      name: "高品質素材の納品",
      desc: "T3素材を5個集める。",
      fameReward: 12,
      hint: "高ティア狙いの動機付け。"
    }
  ],

  food: [
    // --- T1帯 カテゴリ別（既存30個依頼） ---
    {
      id: "food_hunt_t1_30",
      name: "狩猟食材の調達",
      desc: "狩猟で得られるT1食材を30個集める。",
      fameReward: 20,
      hint: "狩猟スポットで肉や皮などの食材を集めよう。"
    },
    {
      id: "food_fish_t1_30",
      name: "釣り食材の調達",
      desc: "釣りで得られるT1食材を30個集める。",
      fameReward: 20,
      hint: "釣り場に通って魚系の食材を確保しよう。"
    },
    {
      id: "food_farm_t1_30",
      name: "農園食材の調達",
      desc: "農園で得られるT1食材を30個集める。",
      fameReward: 20,
      hint: "畑や農園から穀物・野菜などの食材を集めよう。"
    },

    // --- T1帯 カテゴリ別・50個（ランク1で出したい追加依頼想定） ---
    {
      id: "food_hunt_t1_50",
      name: "狩猟食材の追加調達",
      desc: "狩猟で得られるT1食材を50個集める。",
      fameReward: 25,
      hint: "狩猟スポットで集中的に狩りを行い、食材を確保しよう。"
    },
    {
      id: "food_fish_t1_50",
      name: "釣り食材の追加調達",
      desc: "釣りで得られるT1食材を50個集める。",
      fameReward: 25,
      hint: "さまざまな釣り場で魚系の食材をたくさん釣り上げよう。"
    },
    {
      id: "food_farm_t1_50",
      name: "農園食材の追加調達",
      desc: "農園で得られるT1食材を50個集める。",
      fameReward: 25,
      hint: "畑や農園をフル稼働させて、穀物や野菜を集中的に収穫しよう。"
    },

    // --- 「食材の確保」強化版（150 個） ---
    {
      id: "food_mat_150",
      name: "大規模な食材の確保",
      desc: "料理用素材を150個集める。",
      fameReward: 15,
      hint: "狩猟・釣り・農園などを総動員して、大量の食材を集めよう。"
    },

    // --- 既存クエスト ---
    {
      id: "food_mat",
      name: "食材の確保",
      desc: "料理用素材を70個集める。",
      fameReward: 8,
      hint: "草・釣り・狩猟などを活用して、多めに食材を集めよう。"
    },
    {
      id: "food_rare",
      name: "珍味の発見",
      desc: "レア食材を1つ入手する。",
      fameReward: 15,
      hint: "将来のレア食材テーブルと連動。"
    }
  ]
};

// 特別依頼（市民権クエスト）定義
window.GUILD_SPECIAL_QUESTS = {
  warrior: {
    id: "warrior_special_citizen",
    name: "特別依頼: 戦士市民権試験",
    desc: "洞窟T3の敵を物理攻撃で40体倒す。",
    fameReward: 0,
    hint: "洞窟の高難度エリアで、物理攻撃でとどめを刺そう。",
    type: "citizen"
  },
  mage: {
    id: "mage_special_citizen",
    name: "特別依頼: 魔法市民権試験",
    desc: "洞窟T3の敵を魔法で40体倒す。",
    fameReward: 0,
    hint: "洞窟の高難度エリアで、魔法スキルでとどめを刺そう。",
    type: "citizen"
  },
  tamer: {
    id: "tamer_special_citizen",
    name: "特別依頼: 動物使い市民権試験",
    desc: "洞窟T3の敵をペットで40体倒す。",
    fameReward: 0,
    hint: "洞窟の高難度エリアで、ペットにとどめを任せよう。",
    type: "citizen"
  },
  smith: {
    id: "smith_special_citizen",
    name: "特別依頼: 鍛冶市民権試験",
    desc: "T3武器またはT3防具を12個クラフトする。",
    fameReward: 0,
    hint: "T3装備レシピを解放して、ひたすら鍛冶に励もう。",
    type: "citizen"
  },
  alchemist: {
    id: "alch_special_citizen",
    name: "特別依頼: 錬金市民権試験",
    desc: "T3ポーションまたはT3爆弾を合計15個クラフトする。",
    fameReward: 0,
    hint: "上位レシピのポーションや爆弾を量産していこう。",
    type: "citizen"
  },
  cooking: {
    id: "cooking_special_citizen",
    name: "特別依頼: 料理市民権試験",
    desc: "T3料理またはT3飲み物を15品作る。",
    fameReward: 0,
    hint: "高級料理や飲み物を作り、街の胃袋を掴もう。",
    type: "citizen"
  },
  gather: {
    id: "gather_special_citizen",
    name: "特別依頼: 採取市民権試験",
    desc: "T3通常素材を60個集める。",
    fameReward: 0,
    hint: "木・鉱石・布・皮・水などの高品質素材を集中的に集めよう。",
    type: "citizen"
  },
  food: {
    id: "food_special_citizen",
    name: "特別依頼: 食材市民権試験",
    desc: "料理素材を300個集める。",
    fameReward: 0,
    hint: "狩猟・釣り・農園などを総動員して、大量の食材を集めよう。",
    type: "citizen"
  }
};