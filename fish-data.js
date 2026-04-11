// =======================
// fish-data.js
// 釣り専用データ＆図鑑管理
// =======================

window.fishDex = window.fishDex || {}; 
// fishDex[fishId] = { count, maxSize, firstTime, lastTime }

const FISH_MASTER = {
  fish_small: {
    id: "fish_small",
    name: "小魚",
    rarity: "common",
    baseSizeMin: 5,   // cm
    baseSizeMax: 15,
    value: 1          // 図鑑ポイントなどに使うなら
  },
  fish_river: {
    id: "fish_river",
    name: "川魚",
    rarity: "common",
    baseSizeMin: 10,
    baseSizeMax: 30,
    value: 2
  },
  fish_sea: {
    id: "fish_sea",
    name: "海魚",
    rarity: "uncommon",
    baseSizeMin: 15,
    baseSizeMax: 50,
    value: 3
  },
  fish_big: {
    id: "fish_big",
    name: "大きな魚",
    rarity: "rare",
    baseSizeMin: 40,
    baseSizeMax: 80,
    value: 5
  },
  fish_deep: {
    id: "fish_deep",
    name: "深海魚",
    rarity: "rare",
    baseSizeMin: 30,
    baseSizeMax: 70,
    value: 5
  },
  fish_legend: {
    id: "fish_legend",
    name: "伝説の魚",
    rarity: "legend",
    baseSizeMin: 80,
    baseSizeMax: 150,
    value: 10
  }
};

// =======================
// 出現テーブル
// =======================
// 場所 × 餌 × 時間帯ごとに重みを持たせる
// area: "river" | "sea" | "lake" など、あなたのゲーム側で決める文字列
// bait: "default" | "worm" | "deep" | "strong" etc
// timeBand: "day" | "night" | "dawn" | "evening" など
//
// ★方針: どの area/bait/timeBand でも、FISH_MASTER に定義されている
// すべての魚IDが「重み > 0」で必ず出現候補に入る。
// 重みの大小で出やすさだけを調整する。

const FISH_SPAWN_TABLE = {
  // =======================
  // 川: 一番ライト、小魚・川魚多め、深海かなり薄い
  // =======================
  river: {
    // UI 上の bait "normal" → "default"
    default: {
      day: {
        fish_small: 70,
        fish_river: 55,
        fish_sea:   3,
        fish_big:   8,
        fish_deep:  2,
        fish_legend: 1
      },
      night: {
        fish_small: 50,
        fish_river: 65,
        fish_sea:   6,
        fish_big:   15,
        fish_deep:  3,
        fish_legend: 1
      },
      dawn: {
        fish_small: 65,
        fish_river: 50,
        fish_sea:   3,
        fish_big:   7,
        fish_deep:  2,
        fish_legend: 1
      },
      evening: {
        fish_small: 55,
        fish_river: 60,
        fish_sea:   5,
        fish_big:   10,
        fish_deep:  3,
        fish_legend: 1
      }
    },
    // UI 上の bait "small" → "worm"（虫の餌）: 川でもっとも小魚・川魚寄り
    worm: {
      day: {
        fish_small: 85,
        fish_river: 70,
        fish_sea:   2,
        fish_big:   5,
        fish_deep:  1,
        fish_legend: 1
      },
      night: {
        fish_small: 65,
        fish_river: 75,
        fish_sea:   3,
        fish_big:   8,
        fish_deep:  1,
        fish_legend: 1
      },
      dawn: {
        fish_small: 80,
        fish_river: 65,
        fish_sea:   2,
        fish_big:   5,
        fish_deep:  1,
        fish_legend: 1
      },
      evening: {
        fish_small: 70,
        fish_river: 75,
        fish_sea:   3,
        fish_big:   7,
        fish_deep:  1,
        fish_legend: 1
      }
    },
    // deep（重り付きの餌: default より大物・深海寄り、strong より控えめ）
    deep: {
      day: {
        fish_small: 55,
        fish_river: 50,
        fish_sea:   4,
        fish_big:   16,
        fish_deep:  6,
        fish_legend: 1
      },
      night: {
        fish_small: 38,
        fish_river: 60,
        fish_sea:   7,
        fish_big:   22,
        fish_deep:  7,
        fish_legend: 2
      },
      dawn: {
        fish_small: 50,
        fish_river: 45,
        fish_sea:   4,
        fish_big:   13,
        fish_deep:  5,
        fish_legend: 1
      },
      evening: {
        fish_small: 42,
        fish_river: 55,
        fish_sea:   6,
        fish_big:   19,
        fish_deep:  6,
        fish_legend: 2
      }
    },
    // strong（肉の餌: 川で最もレア寄り）
    strong: {
      day: {
        fish_small: 35,
        fish_river: 35,
        fish_sea:   4,
        fish_big:   26,
        fish_deep:  12,
        fish_legend: 4
      },
      night: {
        fish_small: 22,
        fish_river: 35,
        fish_sea:   6,
        fish_big:   34,
        fish_deep:  18,
        fish_legend: 6
      },
      dawn: {
        fish_small: 30,
        fish_river: 32,
        fish_sea:   4,
        fish_big:   24,
        fish_deep:  12,
        fish_legend: 4
      },
      evening: {
        fish_small: 26,
        fish_river: 38,
        fish_sea:   6,
        fish_big:   28,
        fish_deep:  12,
        fish_legend: 5
      }
    }
  },

  // =======================
  // 海: 一番ヘビー、海魚＋大物・深海がかなり出やすい
  // =======================
  sea: {
    // UI 上の bait "normal" → "default"
    default: {
      day: {
        fish_small: 15,
        fish_river: 3,
        fish_sea:   80,
        fish_big:   30,
        fish_deep:  18,
        fish_legend: 3
      },
      night: {
        fish_small: 8,
        fish_river: 3,
        fish_sea:   70,
        fish_big:   38,
        fish_deep:  22,
        fish_legend: 4
      },
      dawn: {
        fish_small: 12,
        fish_river: 3,
        fish_sea:   75,
        fish_big:   26,
        fish_deep:  18,
        fish_legend: 3
      },
      evening: {
        fish_small: 12,
        fish_river: 3,
        fish_sea:   70,
        fish_big:   30,
        fish_deep:  20,
        fish_legend: 4
      }
    },
    // worm（虫の餌）: 海でも「数寄り」、small + sea 多めで big/deep は控えめ
    worm: {
      day: {
        fish_small: 32,
        fish_river: 8,
        fish_sea:   70,
        fish_big:   22,
        fish_deep:  12,
        fish_legend: 2
      },
      night: {
        fish_small: 20,
        fish_river: 8,
        fish_sea:   64,
        fish_big:   28,
        fish_deep:  16,
        fish_legend: 3
      },
      dawn: {
        fish_small: 24,
        fish_river: 8,
        fish_sea:   68,
        fish_big:   20,
        fish_deep:  12,
        fish_legend: 2
      },
      evening: {
        fish_small: 24,
        fish_river: 8,
        fish_sea:   64,
        fish_big:   24,
        fish_deep:  14,
        fish_legend: 3
      }
    },
    // deep（重り付きの餌: 深場・大物寄りだが strong よりレア控えめ）
    deep: {
      day: {
        fish_small: 12,
        fish_river: 3,
        fish_sea:   68,
        fish_big:   38,
        fish_deep:  28,
        fish_legend: 3
      },
      night: {
        fish_small: 6,
        fish_river: 3,
        fish_sea:   60,
        fish_big:   42,
        fish_deep:  30,
        fish_legend: 4
      },
      dawn: {
        fish_small: 9,
        fish_river: 3,
        fish_sea:   64,
        fish_big:   34,
        fish_deep:  24,
        fish_legend: 3
      },
      evening: {
        fish_small: 9,
        fish_river: 3,
        fish_sea:   60,
        fish_big:   36,
        fish_deep:  26,
        fish_legend: 4
      }
    },
    // strong（肉の餌: 海で最もレア寄り）
    strong: {
      day: {
        fish_small: 8,
        fish_river: 3,
        fish_sea:   60,
        fish_big:   46,
        fish_deep:  35,
        fish_legend: 7
      },
      night: {
        fish_small: 4,
        fish_river: 3,
        fish_sea:   50,
        fish_big:   52,
        fish_deep:  40,
        fish_legend: 9
      },
      dawn: {
        fish_small: 6,
        fish_river: 3,
        fish_sea:   54,
        fish_big:   44,
        fish_deep:  32,
        fish_legend: 7
      },
      evening: {
        fish_small: 6,
        fish_river: 3,
        fish_sea:   52,
        fish_big:   46,
        fish_deep:  34,
        fish_legend: 8
      }
    }
  },

  // =======================
  // 湖: 川よりレア寄り、海ほど極端ではない中間
  // =======================
  lake: {
    // default: 小魚・川魚メイン、少し海魚と大物・深海が混ざる
    default: {
      day: {
        fish_small: 60,
        fish_river: 58,
        fish_sea:   6,
        fish_big:   14,
        fish_deep:  4,
        fish_legend: 1
      },
      night: {
        fish_small: 42,
        fish_river: 66,
        fish_sea:   10,
        fish_big:   20,
        fish_deep:  6,
        fish_legend: 2
      },
      dawn: {
        fish_small: 55,
        fish_river: 54,
        fish_sea:   6,
        fish_big:   12,
        fish_deep:  4,
        fish_legend: 1
      },
      evening: {
        fish_small: 48,
        fish_river: 62,
        fish_sea:   8,
        fish_big:   16,
        fish_deep:  5,
        fish_legend: 2
      }
    },
    // worm: 湖でもっとも小魚・川魚寄り＝「安定して数」
    worm: {
      day: {
        fish_small: 78,
        fish_river: 70,
        fish_sea:   4,
        fish_big:   9,
        fish_deep:  3,
        fish_legend: 1
      },
      night: {
        fish_small: 58,
        fish_river: 74,
        fish_sea:   6,
        fish_big:   14,
        fish_deep:  4,
        fish_legend: 2
      },
      dawn: {
        fish_small: 72,
        fish_river: 64,
        fish_sea:   4,
        fish_big:   8,
        fish_deep:  3,
        fish_legend: 1
      },
      evening: {
        fish_small: 64,
        fish_river: 72,
        fish_sea:   6,
        fish_big:   11,
        fish_deep:  4,
        fish_legend: 2
      }
    },
    // deep: 小魚少し減らして、大物・深海をしっかり増やす
    deep: {
      day: {
        fish_small: 52,
        fish_river: 52,
        fish_sea:   7,
        fish_big:   20,
        fish_deep:  10,
        fish_legend: 2
      },
      night: {
        fish_small: 36,
        fish_river: 60,
        fish_sea:   11,
        fish_big:   26,
        fish_deep:  11,
        fish_legend: 3
      },
      dawn: {
        fish_small: 48,
        fish_river: 48,
        fish_sea:   7,
        fish_big:   17,
        fish_deep:  9,
        fish_legend: 2
      },
      evening: {
        fish_small: 42,
        fish_river: 56,
        fish_sea:   9,
        fish_big:   21,
        fish_deep:  10,
        fish_legend: 3
      }
    },
    // strong: 湖で一番レア寄りだが、海ほど極端にしない
    strong: {
      day: {
        fish_small: 40,
        fish_river: 40,
        fish_sea:   7,
        fish_big:   26,
        fish_deep:  14,
        fish_legend: 4
      },
      night: {
        fish_small: 28,
        fish_river: 46,
        fish_sea:   9,
        fish_big:   32,
        fish_deep:  16,
        fish_legend: 5
      },
      dawn: {
        fish_small: 36,
        fish_river: 38,
        fish_sea:   7,
        fish_big:   24,
        fish_deep:  14,
        fish_legend: 4
      },
      evening: {
        fish_small: 32,
        fish_river: 44,
        fish_sea:   9,
        fish_big:   26,
        fish_deep:  14,
        fish_legend: 5
      }
    }
  }
  // 必要に応じて他エリアも追加（同じ方針で、全魚IDを weight>0 で入れる）
};

// =======================
// 時間帯のバンド判定
// =======================
function getTimeBandForFishing(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 10) return "dawn"; // 夜明け
  if (h >= 10 && h < 18) return "day";
  if (h >= 18 && h < 22) return "evening";
  return "night";
}

// =======================
// 魚種ロール
// =======================
// area: "river" / "sea" / "lake" など
// bait: "default" / "worm" / "deep" / "strong" など（未指定なら "default"）
// date: 時刻（省略可）
function rollFishKind(area, bait, date = new Date()) {
  const band = getTimeBandForFishing(date);
  const areaTable = FISH_SPAWN_TABLE[area];
  if (!areaTable) {
    // 未定義エリアはとりあえず小魚
    return "fish_small";
  }

  const baitKey = bait && areaTable[bait] ? bait : "default";
  const baitTable = areaTable[baitKey];
  if (!baitTable) {
    return "fish_small";
  }
  const bandTable = baitTable[band] || baitTable["day"]; // なければ昼をfallback

  if (!bandTable) {
    return "fish_small";
  }

  let totalWeight = 0;
  const entries = [];
  Object.keys(bandTable).forEach(id => {
    const w = bandTable[id];
    if (w > 0) {
      totalWeight += w;
      entries.push({ id, w });
    }
  });

  if (!entries.length) {
    return "fish_small";
  }

  let r = Math.random() * totalWeight;
  for (const e of entries) {
    if (r < e.w) {
      return e.id;
    }
    r -= e.w;
  }
  return entries[entries.length - 1].id;
}

// =======================
// サイズロール
// =======================
function rollFishSize(fishId) {
  const m = FISH_MASTER[fishId];
  if (!m) return null;
  const min = m.baseSizeMin;
  const max = m.baseSizeMax;
  // シンプルに線形ランダム、後で正規分布風にしてもOK
  const size = min + Math.random() * (max - min);
  return Math.round(size * 10) / 10; // 小数1桁 cm
}

// =======================
// 図鑑更新
// =======================
// meta: { area, bait, size, date }
function updateFishDex(fishId, meta) {
  if (!fishId) return;
  const now = meta && meta.date ? meta.date : new Date();
  const size = meta && typeof meta.size === "number" ? meta.size : null;

  const entry = window.fishDex[fishId] || {
    id: fishId,
    count: 0,
    maxSize: size || 0,
    firstTime: now.toISOString(),
    lastTime:  now.toISOString()
  };

  entry.count += 1;
  if (size != null && size > entry.maxSize) {
    entry.maxSize = size;
  }
  if (!entry.firstTime) {
    entry.firstTime = now.toISOString();
  }
  entry.lastTime = now.toISOString();

  // 必要なら area/bait ごとの統計も持てる
  // entry.byArea = { river: { count, maxSize }, ... } みたいに拡張も可

  window.fishDex[fishId] = entry;
}

// =======================
// 図鑑一覧取得ヘルパー
// =======================
function getFishDexList() {
  const list = [];
  Object.keys(FISH_MASTER).forEach(id => {
    const m = FISH_MASTER[id];
    const d = window.fishDex[id] || null;
    list.push({
      id,
      name: m.name,
      rarity: m.rarity,
      count: d ? d.count : 0,
      maxSize: d ? d.maxSize : 0,
      discovered: !!d
    });
  });
  return list;
}

window.FISH_MASTER = FISH_MASTER;
window.getFishDexList = getFishDexList;
window.rollFishKind = rollFishKind;
window.rollFishSize = rollFishSize;
window.updateFishDex = updateFishDex;
window.getTimeBandForFishing = getTimeBandForFishing;