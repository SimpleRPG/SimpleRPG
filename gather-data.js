// gather-data.js
// 採取対象と採取スキルの初期値・パラメータ

// 採取対象のメタ情報（必要なら今後ここにレアドロップなども追加）
const GATHER_TARGETS = [
  { id: "wood",    name: "木"    },
  { id: "ore",     name: "鉱石"  },
  { id: "herb",    name: "草"    },
  { id: "cloth",   name: "布"    },
  { id: "leather", name: "皮"    },
  { id: "water",   name: "水"    }
];

// 採取スキルの最大レベル
const GATHER_SKILL_MAX_LV = 100;

// 採取スキルの初期状態
// game-core.js 側でそのまま mutate して使う前提
const GATHER_SKILLS_INIT = {
  wood:    { lv: 0, exp: 0, expToNext: 5 },
  ore:     { lv: 0, exp: 0, expToNext: 5 },
  herb:    { lv: 0, exp: 0, expToNext: 5 },
  cloth:   { lv: 0, exp: 0, expToNext: 5 },
  leather: { lv: 0, exp: 0, expToNext: 5 },
  water:   { lv: 0, exp: 0, expToNext: 5 }
};

// 採取量計算用のパラメータ
// lv に応じて、最低保証・追加判定などをいじりたいときはここを変える
const GATHER_AMOUNT_PARAMS = {
  // base: 0 or 1 をランダムで決めるときの 1 側の確率
  baseOneProb: 0.5,

  // guaranteedCoeff: floor( guaranteedCoeff * (lv / 100) ) が最低保証量
  guaranteedCoeff: 2,

  // extraChanceCoeff: extraChanceCoeff * (lv / 100) が追加 +1 の確率
  extraChanceCoeff: 0.2
};