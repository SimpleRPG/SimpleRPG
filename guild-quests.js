// guild-quests.js
// ギルド依頼データ定義専用ファイル
// （ロジックは guild.js 側が担当。先にこのファイルを読み込むこと）

// ひとまずギルドごとに簡易依頼を定義
window.GUILD_QUESTS = {
  warrior: [
    {
      id: "warrior_kill_30_phys",
      name: "物理撃破訓練",
      desc: "物理攻撃で敵を 30 体倒す。",
      fameReward: 15,
      hint: "通常攻撃や物理スキルでトドメを刺すとカウントされる。"
    },
    {
      id: "battle_boss_1",
      name: "スライムキング討伐",
      desc: "草原のボス『スライムキング』を 1 体倒す。",
      fameReward: 25,
      hint: "草原ボスエリアに出現するスライムキングを倒そう。"
    },
    {
      id: "field_kill_100_any",
      name: "草原の掃討",
      desc: "草原エリアで敵を 100 体倒す。",
      fameReward: 20,
      hint: "草原での通常戦闘を続ければ自然と達成できる。"
    },
    {
      id: "forest_kill_100_any",
      name: "森の掃討",
      desc: "森エリアで敵を 100 体倒す。",
      fameReward: 15,
      hint: "森での通常戦闘を続ければ自然と達成できる（ランク 1 以上で受注可能）。",
      minRank: 1
    },
    {
      id: "forest_kill_50_phys",
      name: "森の物理討伐",
      desc: "森エリアで物理攻撃で敵を 50 体倒す。",
      fameReward: 15,
      hint: "森で物理スキルや通常攻撃でとどめを刺そう（ランク 1 以上）。",
      minRank: 1
    },
    {
      id: "forest_boss_1",
      name: "森の主討伐",
      desc: "森のボスを 1 体倒す。",
      fameReward: 20,
      hint: "森ボスエリアのボスを倒そう（ランク 1 以上）。",
      minRank: 1
    },
    // ★ 戦士ギルドの転生依頼（戦闘転生 1 回）
    {
      id: "warrior_rebirth_1",
      name: "戦士ギルドの再出発",
      desc: "戦闘転生を 1 回行う。",
      fameReward: 20,
      hint: "転生時に「戦闘転生」を選んで 1 度転生すると達成される（装備はそのまま残る）。"
    },
    // ★ 職業解放クエスト（戦士ギルド：戦闘カテゴリ → 戦闘転生 1 回）
    {
      id: "warrior_job_unlock_1",
      name: "特別訓練：戦士の極意",
      desc: "戦士ギルド推奨の特別訓練として、戦闘転生を 1 回行う。その先には、大盾を構え仲間を守る新たな戦いの道が待っている。",
      fameReward: 0,
      hint: "転生時に「戦闘転生」を選び、1 度転生すると達成される（装備はそのまま残る）。",
      minRank: 1,
      type: "job_unlock",
      jobReward: 100 // 大盾兵（仮）
    }
  ],
  mage: [
    {
      id: "mage_kill_30_magic",
      name: "魔法撃破訓練",
      desc: "魔法で敵を 30 体倒す。",
      fameReward: 15,
      hint: "ファイアボルトやアイスランスなどでトドメを刺すとカウントされる。"
    },
    {
      id: "battle_boss_1",
      name: "スライムキング討伐",
      desc: "草原のボス『スライムキング』を 1 体倒す。",
      fameReward: 25,
      hint: "草原ボスエリアに出現するスライムキングを倒そう。"
    },
    {
      id: "field_kill_100_any",
      name: "草原の掃討",
      desc: "草原エリアで敵を 100 体倒す。",
      fameReward: 20,
      hint: "草原での通常戦闘を続ければ自然と達成できる。"
    },
    {
      id: "forest_kill_100_any",
      name: "森の掃討",
      desc: "森エリアで敵を 100 体倒す。",
      fameReward: 15,
      hint: "森での通常戦闘を続ければ自然と達成できる（ランク 1 以上で受注可能）。",
      minRank: 1
    },
    {
      id: "forest_kill_50_magic",
      name: "森の魔法討伐",
      desc: "森エリアで魔法で敵を 50 体倒す。",
      fameReward: 15,
      hint: "森で魔法スキルでとどめを刺そう（ランク 1 以上）。",
      minRank: 1
    },
    {
      id: "forest_boss_1",
      name: "森の主討伐",
      desc: "森のボスを 1 体倒す。",
      fameReward: 20,
      hint: "森ボスエリアのボスを倒そう（ランク 1 以上）。",
      minRank: 1
    },
    // ★ 魔法ギルドの転生依頼（戦闘転生 1 回）
    {
      id: "mage_rebirth_1",
      name: "魔法ギルドの再出発",
      desc: "戦闘転生を 1 回行う。",
      fameReward: 20,
      hint: "転生時に「戦闘転生」を選んで 1 度転生すると達成される（装備はそのまま残る）。"
    },
    // ★ 職業解放クエスト（魔法ギルド：戦闘カテゴリ → 戦闘転生 1 回）
    {
      id: "mage_job_unlock_1",
      name: "特別訓練：魔導の極意",
      desc: "魔法ギルド推奨の特別訓練として、戦闘転生を 1 回行う。その先には、呪いと魔導を操り戦場を歪める新たな魔法使いの道が待っている。",
      fameReward: 0,
      hint: "転生時に「戦闘転生」を選び、1 度転生すると達成される（装備はそのまま残る）。",
      minRank: 1,
      type: "job_unlock",
      jobReward: 101 // 呪術師（仮）
    }
  ],
  tamer: [
    {
      id: "tamer_kill_30_pet",
      name: "ペット撃破訓練",
      desc: "ペットで敵を 30 体倒す。",
      fameReward: 15,
      hint: "ペットの攻撃やスキルでトドメを刺すとカウントされる。"
    },
    {
      id: "battle_boss_1",
      name: "スライムキング討伐",
      desc: "草原のボス『スライムキング』を 1 体倒す。",
      fameReward: 25,
      hint: "草原ボスエリアに出現するスライムキングを倒そう。"
    },
    {
      id: "field_kill_100_any",
      name: "草原の掃討",
      desc: "草原エリアで敵を 100 体倒す。",
      fameReward: 20,
      hint: "草原での通常戦闘を続ければ自然と達成できる。"
    },
    {
      id: "forest_kill_100_any",
      name: "森の掃討",
      desc: "森エリアで敵を 100 体倒す。",
      fameReward: 15,
      hint: "森での通常戦闘を続ければ自然と達成できる（ランク 1 以上で受注可能）。",
      minRank: 1
    },
    {
      id: "forest_kill_50_pet",
      name: "森のペット討伐",
      desc: "森エリアでペットで敵を 50 体倒す。",
      fameReward: 15,
      hint: "森でペットにとどめを任せよう（ランク 1 以上）。",
      minRank: 1
    },
    {
      id: "forest_boss_1",
      name: "森の主討伐",
      desc: "森のボスを 1 体倒す。",
      fameReward: 20,
      hint: "森ボスエリアのボスを倒そう（ランク 1 以上）。",
      minRank: 1
    },
    // ★ 動物使いギルドの転生依頼（戦闘転生 1 回）
    {
      id: "tamer_rebirth_1",
      name: "動物使いギルドの再出発",
      desc: "戦闘転生を 1 回行う。",
      fameReward: 20,
      hint: "転生時に「戦闘転生」を選んで 1 度転生すると達成される（装備はそのまま残る）。"
    },
    // ★ 職業解放クエスト（動物使いギルド：戦闘カテゴリ → 戦闘転生 1 回）
    {
      id: "tamer_job_unlock_1",
      name: "特別訓練：獣と歩む者",
      desc: "動物使いギルド推奨の特別訓練として、戦闘転生を 1 回行う。その先には、獣たちを束ね群れを率いる新たな絆の道が待っている。",
      fameReward: 0,
      hint: "転生時に「戦闘転生」を選び、1 度転生すると達成される（装備はそのまま残る）。",
      minRank: 1,
      type: "job_unlock",
      jobReward: 102 // 獣群使い（仮）
    }
  ],

  // クラフト／採取ギルド
  smith: [
    // --- T1 帯 ---
    {
      id: "smith_craft_weapon_t1",
      name: "T1 武器制作の依頼",
      desc: "T1 武器を 5 本クラフトする。",
      fameReward: 10,
      hint: "まずは T1 武器レシピで武器を 5 本作ろう。"
    },
    {
      id: "smith_craft_armor_t1",
      name: "T1 防具制作の依頼",
      desc: "T1 防具を 5 個クラフトする。",
      fameReward: 10,
      hint: "T1 防具レシピで防具を 5 個作ろう。"
    },
    {
      id: "smith_enhance",
      name: "装備強化の試験",
      desc: "武器か防具を 2 回強化する。",
      fameReward: 20,
      hint: "強化システムへの誘導。"
    },
    {
      id: "smith_craft_t1_gear_20",
      name: "T1 装備量産計画",
      desc: "T1 武器または T1 防具を合計 20 個クラフトする。",
      fameReward: 20,
      hint: "T1 装備を量産してギルドに納品しよう。"
    },

    // --- T2 帯 ---
    {
      id: "smith_craft_weapon_t2",
      name: "T2 武器制作の依頼",
      desc: "T2 武器を 2 本クラフトする。",
      fameReward: 15,
      hint: "T2 武器レシピを解放して、少し上位の武器を 2 本作ろう（ランク 1 以上で表示）。",
      minRank: 1
    },
    {
      id: "smith_craft_armor_t2",
      name: "T2 防具制作の依頼",
      desc: "T2 防具を 2 個クラフトする。",
      fameReward: 15,
      hint: "T2 防具レシピを解放して、少し上位の防具を 2 個作ろう（ランク 1 以上で表示）。",
      minRank: 1
    },
    {
      id: "smith_craft_t2_gear_10",
      name: "T2 装備大量生産",
      desc: "T2 武器または T2 防具を合計 10 個クラフトする。",
      fameReward: 15,
      hint: "実戦投入用の T2 装備をまとめて鍛造しよう（ランク 1 以上で表示）。",
      minRank: 1
    },
    {
      id: "smith_enhance_t2",
      name: "T2 装備強化試験",
      desc: "T2 武器または T2 防具を合計 3 回強化する。",
      fameReward: 15,
      hint: "T2 装備を実戦向けに強化して、性能を引き出そう。",
      minRank: 1
    },
    // ★ 職業解放クエスト（鍛冶ギルド：クラフトカテゴリ → クラフト転生 1 回）
    {
      id: "smith_job_unlock_1",
      name: "特別訓練：鍛冶の極意",
      desc: "鍛冶ギルド推奨の特別訓練として、クラフト転生を 1 回行う。その先には、炎と金床を操る熟練の鍛冶職人の道、あるいは戦場で武具を自在に扱う道が待っている。",
      fameReward: 0,
      hint: "転生時に「クラフト転生」を選び、1 度転生すると達成される（装備はそのまま残る）。",
      minRank: 1,
      type: "job_unlock",
      jobReward: [200, 201] // 鍛冶職人 / 武具使い
    }
  ],

  alchemist: [
    // --- T1 帯（合計 60） ---
    {
      id: "alch_craft_potion_t1",
      name: "T1 ポーション調合の依頼",
      desc: "T1 ポーションを 5 回クラフトする。",
      fameReward: 15,
      hint: "基礎ポーションレシピを使って調合しよう。"
    },
    {
      id: "alch_craft_bomb_t1",
      name: "T1 爆弾試作の依頼",
      desc: "T1 爆弾系の道具を 3 個クラフトする。",
      fameReward: 15,
      hint: "初級爆弾レシピで戦闘用道具を作ってみよう。"
    },
    {
      id: "alch_craft_mix",
      name: "実践用消耗品の供給",
      desc: "ポーションまたは爆弾を合計 10 個クラフトする。",
      fameReward: 15,
      hint: "戦闘で使う消耗品をまとめて作り、ストックを整えよう。"
    },
    {
      id: "alch_use_potion_or_tool",
      name: "実戦投与テスト",
      desc: "ポーションまたは爆弾系の道具を合計 5 回使用する。",
      fameReward: 15,
      hint: "戦闘や探索中にポーションを飲んだり、爆弾系アイテムを使ってみよう。"
    },

    // --- T2 帯（新規追加含む・合計 60） ---
    {
      id: "alch_craft_t2_potion",
      name: "改良ポーションの開発",
      desc: "T2 ポーションを 3 回クラフトする。",
      fameReward: 15,
      hint: "T2 ポーションレシピを解放して、回復量の高いポーションを作ろう（ランク 1 以上で表示）。",
      minRank: 1
    },
    {
      id: "alch_craft_t2_tool",
      name: "高級錬金道具の開発",
      desc: "T2 爆弾系や T2 道具を 3 個クラフトする。",
      fameReward: 15,
      hint: "上位爆弾や特殊な錬金道具を作成してみよう（ランク 1 以上で表示）。",
      minRank: 1
    },
    {
      id: "alch_use_t2_potion_or_tool",
      name: "高位薬品の実地試験",
      desc: "T2 ポーションまたは T2 錬金道具を合計 5 回使用する。",
      fameReward: 15,
      hint: "実戦で T2 ポーションや T2 爆弾を使い、その効果を確かめてみよう。",
      minRank: 1
    },
    {
      id: "alch_mass_t2_supply",
      name: "上級消耗品の供給",
      desc: "T2 ポーションまたは T2 錬金道具を合計 10 個クラフトする。",
      fameReward: 15,
      hint: "高位の消耗品を量産し、長期戦に備えよう（ランク 1 以上で表示）。",
      minRank: 1
    },
    // ★ 職業解放クエスト（錬金ギルド：クラフトカテゴリ → クラフト転生 1 回）
    {
      id: "alch_job_unlock_1",
      name: "特別訓練：錬金の極意",
      desc: "錬金ギルド推奨の特別訓練として、クラフト転生を 1 回行う。その先には、薬と爆薬の配合を極める錬金術師の道、あるいは多彩な錬金道具で戦況を操る道が待っている。",
      fameReward: 0,
      hint: "転生時に「クラフト転生」を選び、1 度転生すると達成される（装備はそのまま残る）。",
      minRank: 1,
      type: "job_unlock",
      jobReward: [202, 203] // 錬金術師 / 道具使い
    }
  ],

  cooking: [
    // --- T1 帯（合計 60）---
    {
      id: "cooking_basic_food_t1",
      name: "基本料理の習得",
      desc: "T1 料理を 3 回作る。",
      fameReward: 10,
      hint: "まずは簡単な料理レシピから慣れていこう。"
    },
    {
      id: "cooking_basic_drink_t1",
      name: "基本飲み物の習得",
      desc: "T1 飲み物を 3 回作る。",
      fameReward: 10,
      hint: "T1 ドリンクレシピで飲み物を 3 回用意しよう。"
    },
    {
      id: "cooking_buff",
      name: "バフ料理の試食会",
      desc: "バフ付き料理を 2 回食べる。",
      fameReward: 10,
      hint: "フィールドでの料理活用を促す。"
    },
    {
      id: "cooking_variety",
      name: "食卓の彩り",
      desc: "異なる種類の料理または飲み物を 5 回作る。",
      fameReward: 16,
      hint: "同じレシピだけでなく、いくつかのレシピをローテーションしよう。"
    },
    {
      id: "cooking_use_food_or_drink",
      name: "料理バフの活用",
      desc: "料理または飲み物によるバフを合計 5 回得る。",
      fameReward: 14,
      hint: "料理や飲み物を使って、バフを積極的に活用してみよう。"
    },

    // --- T2 帯（新規追加含む・合計 60） ---
    {
      id: "cooking_t2_food",
      name: "上級料理の研鑽",
      desc: "T2 料理を 3 回作る。",
      fameReward: 12,
      hint: "上位料理レシピを使って、栄養価の高い料理を作ろう（ランク 1 以上で表示）。",
      minRank: 1
    },
    {
      id: "cooking_t2_drink",
      name: "上級飲み物の研鑽",
      desc: "T2 飲み物を 3 回作る。",
      fameReward: 12,
      hint: "上位ドリンクレシピで、強力なバフが得られる飲み物を用意しよう（ランク 1 以上で表示）。",
      minRank: 1
    },
    {
      id: "cooking_t2_any",
      name: "上級メニューの提供",
      desc: "T2 料理または T2 飲み物を合計 10 回作る。",
      fameReward: 12,
      hint: "T2 帯のメニューを量産して、常にバフを維持できるようにしよう。",
      minRank: 1
    },
    {
      id: "cooking_eat_t2_food",
      name: "高級料理の味見",
      desc: "T2 料理を 5 回食べる。",
      fameReward: 12,
      hint: "T2 料理を実際に食べて、その効果と味を確かめてみよう。",
      minRank: 1
    },
    {
      id: "cooking_drink_t2",
      name: "高級飲み物の試飲",
      desc: "T2 飲み物を 5 回飲む。",
      fameReward: 12,
      hint: "T2 飲み物を飲んで、バフ効果を体感しよう。",
      minRank: 1
    },
    // ★ 職業解放クエスト（料理ギルド：クラフトカテゴリ → クラフト転生 1 回）
    {
      id: "cooking_job_unlock_1",
      name: "特別訓練：料理の極意",
      desc: "料理ギルド推奨の特別訓練として、クラフト転生を 1 回行う。その先には、仲間の胃袋を支える料理人の道、あるいは食べることで力を引き出す貪食家の道が待っている。",
      fameReward: 0,
      hint: "転生時に「クラフト転生」を選び、1 度転生すると達成される（装備はそのまま残る）。",
      minRank: 1,
      type: "job_unlock",
      jobReward: [204, 205] // 料理人 / 貪食家
    }
  ],

  gather: [
    // （採取ギルドは職業解放をいったん無しにするので、job_unlock は定義しない）
    {
      id: "gather_t1_any_30",
      name: "T1 素材の基礎集め",
      desc: "T1 通常素材を合計 30 個集める。",
      fameReward: 20,
      hint: "木・鉱石・草・布・皮・水など、T1 素材を満遍なく集めてみよう。"
    },
    {
      id: "gather_t1_wood_30",
      name: "T1 木材の調達",
      desc: "T1 木材を 30 個集める。",
      fameReward: 20,
      hint: "伐採スポットを巡って木材を集めよう。"
    },
    {
      id: "gather_t1_ore_30",
      name: "T1 鉱石の調達",
      desc: "T1 鉱石を 30 個集める。",
      fameReward: 20,
      hint: "鉱石採取スポットを重点的に回ろう。"
    },
    {
      id: "gather_t1_herb_30",
      name: "T1 薬草の調達",
      desc: "T1 草素材を 30 個集める。",
      fameReward: 20,
      hint: "草が多く採れる場所を中心に採集しよう。"
    },
    {
      id: "gather_t1_cloth_30",
      name: "T1 繊維素材の調達",
      desc: "T1 布素材を 30 個集める。",
      fameReward: 20,
      hint: "布素材が採れるポイントを巡ろう。"
    },
    {
      id: "gather_t1_leather_30",
      name: "T1 皮素材の調達",
      desc: "T1 皮素材を 30 個集める。",
      fameReward: 20,
      hint: "皮素材が得られる採取や狩りを重ねよう。"
    },
    {
      id: "gather_t1_water_30",
      name: "T1 水資源の調達",
      desc: "T1 水を 30 回分採取する。",
      fameReward: 20,
      hint: "水場を回って水を集めよう。"
    },
    {
      id: "gather_basic",
      name: "T2 素材集めの手伝い",
      desc: "T2 通常素材を 50 個集める。",
      fameReward: 8,
      hint: "T2 採取スポットを中心に素材を集めよう。",
      minRank: 1
    },
    {
      id: "gather_t2_any_100",
      name: "T2 素材の大量調達",
      desc: "T2 通常素材を合計 100 個集める。",
      fameReward: 20,
      hint: "高ティア狙いの採取ポイントを回って T2 素材を集中的に集めよう。",
      minRank: 1
    },
    {
      id: "gather_t2_wood_30",
      name: "T2 木材の調達",
      desc: "T2 木材を 30 個集める。",
      fameReward: 20,
      hint: "上位の伐採スポットで木材を集めよう。",
      minRank: 1
    },
    {
      id: "gather_t2_ore_30",
      name: "T2 鉱石の調達",
      desc: "T2 鉱石を 30 個集める。",
      fameReward: 20,
      hint: "上位の鉱石採取スポットを巡ろう。",
      minRank: 1
    },
    {
      id: "gather_t2_herb_30",
      name: "T2 薬草の調達",
      desc: "T2 草素材を 30 個集める。",
      fameReward: 20,
      hint: "上位エリアで薬草を採集しよう。",
      minRank: 1
    },
    {
      id: "gather_t2_cloth_30",
      name: "T2 繊維素材の調達",
      desc: "T2 布素材を 30 個集める。",
      fameReward: 20,
      hint: "高品質な布素材を採れるポイントを巡ろう。",
      minRank: 1
    },
    {
      id: "gather_t2_leather_30",
      name: "T2 皮素材の調達",
      desc: "T2 皮素材を 30 個集める。",
      fameReward: 20,
      hint: "高品質な皮素材が得られる採取や狩りを重ねよう。",
      minRank: 1
    },
    {
      id: "gather_t2_water_30",
      name: "T2 水資源の調達",
      desc: "T2 水を 30 回分採取する。",
      fameReward: 20,
      hint: "上位の水場で水を集めよう。",
      minRank: 1
    },
    {
      id: "gather_t3",
      name: "高品質素材の納品",
      desc: "T3 素材を 5 個集める。",
      fameReward: 12,
      hint: "高ティア狙いの動機付け。",
      minRank: 2
    },
    // ★ 職業解放クエスト（採取ギルド：採取カテゴリ → 採取転生 1 回）
    {
      id: "gather_job_unlock_1",
      name: "特別訓練：採取の極意",
      desc: "採取ギルド推奨の特別訓練として、採取転生を 1 回行う。その先には、素材の目利きと採集技術を極める者や、採取現場を束ねる者の道が待っている。",
      fameReward: 0,
      hint: "転生時に「採取転生」を選び、1 度転生すると達成される（装備はそのまま残る）。",
      minRank: 1,
      type: "job_unlock",
      jobReward: [300, 301] // 採集士 / 採取監督官
    }
  ],

  food: [
    // （食材ギルドも職業解放は無し。job_unlock は定義しない）
    {
      id: "food_hunt_t1_30",
      name: "狩猟食材の調達",
      desc: "狩猟で得られる T1 食材を 30 個集める。",
      fameReward: 20,
      hint: "狩猟スポットで肉や皮などの食材を集めよう。"
    },
    {
      id: "food_fish_t1_30",
      name: "釣り食材の調達",
      desc: "釣りで得られる T1 食材を 30 個集める。",
      fameReward: 20,
      hint: "釣り場に通って魚系の食材を確保しよう。"
    },
    {
      id: "food_farm_t1_30",
      name: "農園食材の調達",
      desc: "農園で得られる T1 食材を 30 個集める。",
      fameReward: 20,
      hint: "畑や農園から穀物・野菜などの食材を集めよう。"
    },
    {
      id: "food_hunt_t1_50",
      name: "狩猟食材の追加調達",
      desc: "狩猟で得られる T1 食材を 50 個集める。",
      fameReward: 25,
      hint: "狩猟スポットで集中的に狩りを行い、食材を確保しよう。",
      minRank: 1
    },
    {
      id: "food_fish_t1_50",
      name: "釣り食材の追加調達",
      desc: "釣りで得られる T1 食材を 50 個集める。",
      fameReward: 25,
      hint: "さまざまな釣り場で魚系の食材をたくさん釣り上げよう。",
      minRank: 1
    },
    {
      id: "food_farm_t1_50",
      name: "農園食材の追加調達",
      desc: "農園で得られる T1 食材を 50 個集める。",
      fameReward: 25,
      hint: "畑や農園をフル稼働させて、穀物や野菜を集中的に収穫しよう。",
      minRank: 1
    },
    {
      id: "food_mat_150",
      name: "大規模な食材の確保",
      desc: "料理用素材を 150 個集める。",
      fameReward: 15,
      hint: "狩猟・釣り・農園などを総動員して、大量の食材を集めよう。",
      minRank: 1
    },
    {
      id: "food_mat",
      name: "食材の確保",
      desc: "料理用素材を 70 個集める。",
      fameReward: 8,
      hint: "草・釣り・狩猟などを活用して、多めに食材を集めよう。"
    },
    {
      id: "food_rare",
      name: "珍味の発見",
      desc: "レア食材を 1 つ入手する。",
      fameReward: 15,
      hint: "将来のレア食材テーブルと連動。"
    },
    // ★ 職業解放クエスト（食材ギルド：採取カテゴリ → 採取転生 1 回）
    {
      id: "food_job_unlock_1",
      name: "特別訓練：食材の極意",
      desc: "食材ギルド推奨の特別訓練として、採取転生を 1 回行う。その先には、狩り・釣り・畑仕事を極め、食の流れを支える専門家たちの道が待っている。",
      fameReward: 0,
      hint: "転生時に「採取転生」を選び、1 度転生すると達成される（装備はそのまま残る）。",
      minRank: 1,
      type: "job_unlock",
      jobReward: [400, 401, 402] // 狩猟師 / 漁師 / 農夫
    }
  ]
};

// 特別依頼（市民権クエスト）定義
window.GUILD_SPECIAL_QUESTS = {
  warrior: {
    id: "warrior_special_citizen",
    name: "特別依頼：戦士市民権試験",
    desc: "洞窟 T3 の敵を物理攻撃で 40 体倒す。",
    fameReward: 0,
    hint: "洞窟の高難度エリアで、物理攻撃でとどめを刺そう。",
    type: "citizen"
  },
  mage: {
    id: "mage_special_citizen",
    name: "特別依頼：魔法市民権試験",
    desc: "洞窟 T3 の敵を魔法で 40 体倒す。",
    fameReward: 0,
    hint: "洞窟の高難度エリアで、魔法スキルでとどめを刺そう。",
    type: "citizen"
  },
  tamer: {
    id: "tamer_special_citizen",
    name: "特別依頼：動物使い市民権試験",
    desc: "洞窟 T3 の敵をペットで 40 体倒す。",
    fameReward: 0,
    hint: "洞窟の高難度エリアで、ペットにとどめを任せよう。",
    type: "citizen"
  },
  smith: {
    id: "smith_special_citizen",
    name: "特別依頼：鍛冶市民権試験",
    desc: "T3 武器または T3 防具を 12 個クラフトする。",
    fameReward: 0,
    hint: "T3 装備レシピを解放して、ひたすら鍛冶に励もう。",
    type: "citizen"
  },
  alchemist: {
    id: "alch_special_citizen",
    name: "特別依頼：錬金市民権試験",
    desc: "T3 ポーションまたは T3 爆弾を合計 15 個クラフトする。",
    fameReward: 0,
    hint: "上位レシピのポーションや爆弾を量産していこう。",
    type: "citizen"
  },
  cooking: {
    id: "cooking_special_citizen",
    name: "特別依頼：料理市民権試験",
    desc: "T3 料理または T3 飲み物を 15 品作る。",
    fameReward: 0,
    hint: "高級料理や飲み物を作り、街の胃袋を掴もう。",
    type: "citizen"
  },
  gather: {
    id: "gather_special_citizen",
    name: "特別依頼：採取市民権試験",
    desc: "T3 通常素材を 60 個集める。",
    fameReward: 0,
    hint: "木・鉱石・布・皮・水などの高品質素材を集中的に集めよう。",
    type: "citizen"
  },
  food: {
    id: "food_special_citizen",
    name: "特別依頼：食材市民権試験",
    desc: "料理素材を 300 個集める。",
    fameReward: 0,
    hint: "狩猟・釣り・農園などを総動員して、大量の食材を集めよう。",
    type: "citizen"
  }
};