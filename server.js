// server.js
const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

// 環境変数から許可オリジンを指定できるようにする（未設定なら *）
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "*";

// Express アプリケーションを作成
const app = express();

// public ディレクトリ（または実際のフロント配置先）を静的配信
// 例: server.js と同じ階層に index.html 等がある場合は __dirname を使う
const PUBLIC_DIR = path.join(__dirname);
app.use(express.static(PUBLIC_DIR));

// ルートアクセスで index.html を返す（念のため明示）
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// HTTP サーバーを Express アプリから作成
const httpServer = http.createServer(app);

// Socket.io サーバー
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST"]
  }
});

// ★サーバー共通の市場データ（超シンプル版）
// listing 形式: { id, sellerId, itemKey, category, amount, price }
let marketListings = [];

// ★サーバー共通の買い注文データ（プレイヤー同士用）
// order 形式: { id, buyerId, itemKey, category, price, maxAmount, remainAmount, createdAt }
let marketBuyOrders = [];

// =======================
// NPC 買いロジック（サーバ側）
// =======================

// NPC が一度にチェックする最大件数
const MAX_NPC_CHECK = 20;

// 基準価格の簡易取得（クライアント版の getMarketBaseValue の超簡略版）
// ここでは「同じ itemKey の現在の最安値」を基準として使う。
function getMarketBaseValueServer(category, itemKey) {
  if (!Array.isArray(marketListings) || !marketListings.length) return 0;
  let minPrice = Infinity;
  for (const l of marketListings) {
    if (!l) continue;
    if (l.category !== category) continue;
    if (l.itemKey !== itemKey) continue;
    if (typeof l.price !== "number") continue;
    if (l.price < minPrice) {
      minPrice = l.price;
    }
  }
  if (!isFinite(minPrice)) return 0;
  return minPrice;
}

// クライアント版と同じ確率テーブルをサーバ側にも再現
function getNpcBuyProbServer(baseValue, price, category) {
  if (price <= 0 || baseValue <= 0) return 0;

  const ratio = price / baseValue;
  let prob = 0;

  if (ratio < 0.5) {
    prob = 0.05;
  } else if (ratio < 1.0) {
    prob = 0.02;
  } else if (ratio < 1.5) {
    prob = 0.005;
  } else if (ratio < 2.5) {
    prob = 0.001;
  } else {
    prob = 0.0001;
  }

  // ホットカテゴリなどのイベント補正はクライアント側だけにあり、
  // サーバ側では特に持っていないので、ここでは何もしない。
  // 必要になったらイベント状態をサーバにも持たせて同様の補正をかける。

  if (prob > 0.25) prob = 0.25;
  return prob;
}

// サーバ側で NPC が市場から買う処理
function serverSideRollNpcBuy() {
  try {
    if (!Array.isArray(marketListings) || marketListings.length === 0) return;

    // index 配列を作ってシャッフル
    const indices = [...marketListings.keys()];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const maxCheck = Math.min(MAX_NPC_CHECK, indices.length);
    let updated = false;

    for (let idx = 0; idx < maxCheck; idx++) {
      const li = marketListings[indices[idx]];
      if (!li || li.amount <= 0) continue;

      const category = li.category;
      const itemKey = li.itemKey;
      if (!category || !itemKey) continue;

      const baseValue = getMarketBaseValueServer(category, itemKey);
      if (baseValue <= 0) continue;

      const prob = getNpcBuyProbServer(baseValue, li.price, category);
      if (prob <= 0) continue;

      if (Math.random() >= prob) continue;

      // 買う量: 在庫の20%（最低1個）
      const buyAmount = Math.max(1, Math.floor(li.amount * 0.2)) || 1;
      const actualBuy = Math.min(li.amount, buyAmount);
      if (actualBuy <= 0) continue;

      // 金額はここでは使わない（money はクライアントで管理）
      // const totalPrice = actualBuy * li.price;

      li.amount -= actualBuy;
      if (li.amount <= 0) {
        // 実際に削除するのはループの外で filter してもよいが、
        // ここでは簡単に null マークして最後に一括フィルタ
        marketListings[indices[idx]] = null;
      }

      updated = true;
    }

    if (updated) {
      // null を取り除きつつ amount > 0 のものだけ残す
      marketListings = marketListings.filter(
        (l) => l && typeof l.amount === "number" && l.amount > 0
      );
      console.log(
        "[NPC] market updated by NPC buy, remaining listings:",
        marketListings.length
      );
      // 全クライアントへ最新リストを通知
      io.emit("market:update", marketListings);
    }
  } catch (e) {
    console.error("serverSideRollNpcBuy error:", e);
  }
}

// サーバ起動後、一定間隔で NPC 買いを実行（例: 30秒ごと）
const NPC_BUY_INTERVAL_MS = 30 * 1000;
setInterval(serverSideRollNpcBuy, NPC_BUY_INTERVAL_MS);

// =======================
// 買い注文ヘルパー（プレイヤー同士用）
// =======================

// 新しい買い注文を登録
function addBuyOrder(buyerId, category, itemKey, price, amount) {
  const now = Date.now();
  const order = {
    id: now.toString() + ":" + Math.random().toString(16).slice(2),
    buyerId,
    category,
    itemKey,
    price,
    maxAmount: amount,
    remainAmount: amount,
    createdAt: now
  };
  marketBuyOrders.push(order);
  return order;
}

// 買い注文一覧を（オプションでフィルタして）返す
function getBuyOrders(filter = {}) {
  const { buyerId, category, itemKey } = filter;
  return marketBuyOrders.filter(o => {
    if (!o) return false;
    if (buyerId && o.buyerId !== buyerId) return false;
    if (category && o.category !== category) return false;
    if (itemKey && o.itemKey !== itemKey) return false;
    return true;
  });
}

// 買い注文をキャンセル（buyerId が自分のものだけ消せる）
function cancelBuyOrder(buyerId, orderId) {
  const idx = marketBuyOrders.findIndex(o => o && o.id === orderId && o.buyerId === buyerId);
  if (idx === -1) return false;
  marketBuyOrders.splice(idx, 1);
  return true;
}

// 出品時に、同じアイテムの買い注文にだけマッチングする
// 戻り値: { matchedAmount, remainingAmount, matchedOrders: [{ orderId, buyerId, price, amount }] }
function matchBuyOrdersForListing(listing) {
  const { category, itemKey, price: sellPrice } = listing;
  let remain = listing.amount;
  const matchedOrders = [];

  // 対象アイテムの買い注文を抽出
  const candidates = getBuyOrders({ category, itemKey });

  if (!candidates.length) {
    return {
      matchedAmount: 0,
      remainingAmount: remain,
      matchedOrders
    };
  }

  // 高い価格優先、同値は古い順
  candidates.sort((a, b) => {
    if (b.price !== a.price) return b.price - a.price;
    return a.createdAt - b.createdAt;
  });

  for (const order of candidates) {
    if (remain <= 0) break;

    // 注文価格が出品価格より低ければマッチしない
    if (order.price < sellPrice) continue;

    if (order.remainAmount <= 0) continue;

    const use = Math.min(order.remainAmount, remain);
    if (use <= 0) continue;

    order.remainAmount -= use;
    remain -= use;

    matchedOrders.push({
      orderId: order.id,
      buyerId: order.buyerId,
      price: order.price,
      amount: use
    });

    // 残量ゼロの注文はここではそのままにしておき、
    // 別途クリーンアップする（必要なら）
  }

  // remainAmount <= 0 の注文を掃除
  marketBuyOrders = marketBuyOrders.filter(o => o && o.remainAmount > 0);

  const matchedAmount = listing.amount - remain;

  return {
    matchedAmount,
    remainingAmount: remain,
    matchedOrders
  };
}

// =======================
// Socket.io 接続ハンドラ
// =======================

// クライアント接続時
io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // ping / pong テスト
  socket.on("ping-from-client", () => {
    console.log("Ping from client:", socket.id);
    socket.emit("pong-from-server");
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
  });

  // ★マーケット: 出品一覧を要求
  socket.on("market:list", () => {
    try {
      console.log("market:list from", socket.id);
      // 単純に現在の配列を返す
      socket.emit("market:listResult", marketListings);
      console.log("market:listResult sent, count =", marketListings.length);
    } catch (e) {
      console.error("market:list error", e);
    }
  });

  // ★買い注文: 一覧要求（必要ならクライアントから呼ぶ前提）
  socket.on("market:buyOrder:list", () => {
    try {
      const myOrders = getBuyOrders({ buyerId: socket.id });
      socket.emit("market:buyOrder:listResult", myOrders);
    } catch (e) {
      console.error("market:buyOrder:list error", e);
    }
  });

  // ★買い注文: 登録
  // payload: { category, itemKey, price, amount }
  socket.on("market:buyOrder", (payload, ack) => {
    try {
      console.log("market:buyOrder payload:", payload);
      const { category, itemKey, price, amount } = payload || {};

      if (!category || !itemKey ||
          typeof price !== "number" || typeof amount !== "number") {
        if (typeof ack === "function") {
          ack({ ok: false, error: "invalid_payload" });
        }
        return;
      }
      if (price <= 0 || amount <= 0) {
        if (typeof ack === "function") {
          ack({ ok: false, error: "invalid_value" });
        }
        return;
      }

      const order = addBuyOrder(socket.id, category, itemKey, price, amount);

      if (typeof ack === "function") {
        ack({ ok: true, order });
      }

      // 自分の最新注文一覧を返しておく（UI用）
      const myOrders = getBuyOrders({ buyerId: socket.id });
      socket.emit("market:buyOrder:listResult", myOrders);
    } catch (e) {
      console.error("market:buyOrder error", e);
      if (typeof ack === "function") {
        ack({ ok: false, error: "server_error" });
      }
    }
  });

  // ★買い注文: キャンセル
  // payload: { orderId }
  socket.on("market:buyOrder:cancel", (payload, ack) => {
    try {
      console.log("market:buyOrder:cancel payload:", payload);
      const { orderId } = payload || {};
      if (!orderId) {
        if (typeof ack === "function") {
          ack({ ok: false, error: "invalid_payload" });
        }
        return;
      }

      const ok = cancelBuyOrder(socket.id, orderId);
      if (!ok) {
        if (typeof ack === "function") {
          ack({ ok: false, error: "not_found" });
        }
        return;
      }

      if (typeof ack === "function") {
        ack({ ok: true });
      }

      const myOrders = getBuyOrders({ buyerId: socket.id });
      socket.emit("market:buyOrder:listResult", myOrders);
    } catch (e) {
      console.error("market:buyOrder:cancel error", e);
      if (typeof ack === "function") {
        ack({ ok: false, error: "server_error" });
      }
    }
  });

  // ★マーケット: 出品する（買い注文とマッチングしてから残りを掲載）
  socket.on("market:sell", (payload, ack) => {
    // payload: { itemKey, category, amount, price }
    try {
      console.log("market:sell payload:", payload);

      const { itemKey, category, amount, price } = payload || {};

      // 最低限のバリデーション
      if (!itemKey || !category ||
          typeof amount !== "number" || typeof price !== "number") {
        console.log("market:sell invalid_payload");
        if (typeof ack === "function") {
          ack({ ok: false, error: "invalid_payload" });
        }
        return;
      }
      if (amount <= 0 || price <= 0) {
        console.log("market:sell invalid_value");
        if (typeof ack === "function") {
          ack({ ok: false, error: "invalid_value" });
        }
        return;
      }

      // まず仮の listing を作って、買い注文とマッチングを試みる
      const tempListing = {
        id: "temp",
        sellerId: socket.id,
        itemKey,
        category,
        amount,
        price
      };

      const matchResult = matchBuyOrdersForListing(tempListing);
      const matchedAmount = matchResult.matchedAmount || 0;
      let remainingAmount = matchResult.remainingAmount || 0;

      console.log(
        "market:sell match result:",
        { matchedAmount, remainingAmount, matchedOrders: matchResult.matchedOrders }
      );

      // matchedOrders の内容（誰がいくつ買えたか）は、
      // 現時点ではサーバ側に保持しておくだけで、
      // money やログの処理はクライアント側の detectSellFromDiff に任せる。

      let listing = null;

      // 残りがあれば、残量だけを通常の出品として marketListings に追加
      if (remainingAmount > 0) {
        listing = {
          id: Date.now().toString() + ":" + Math.random().toString(16).slice(2),
          sellerId: socket.id,
          itemKey,
          category,
          amount: remainingAmount,
          price
        };
        marketListings.push(listing);
      }

      console.log("marketListings now:", marketListings);

      // 要求元にACK（残量の listing だけ返す）
      if (typeof ack === "function") {
        ack({ ok: true, listing, matchedAmount });
      }

      // 全クライアントへ最新リストを通知
      console.log("emitting market:update, count =", marketListings.length);
      io.emit("market:update", marketListings);
    } catch (e) {
      console.error("market:sell error", e);
      if (typeof ack === "function") {
        ack({ ok: false, error: "server_error" });
      }
    }
  });

  // ★マーケット: 出品を減らす／削除する（購入されたとき用）
  socket.on("market:consume", (payload, ack) => {
    // payload: { id, consumeAmount }
    try {
      console.log("market:consume payload:", payload);

      const { id, consumeAmount } = payload || {};
      if (!id || typeof consumeAmount !== "number" || consumeAmount <= 0) {
        console.log("market:consume invalid_payload");
        if (typeof ack === "function") {
          ack({ ok: false, error: "invalid_payload" });
        }
        return;
      }

      const idx = marketListings.findIndex(l => l && l.id === id);
      if (idx === -1) {
        console.log("market:consume not_found:", id);
        if (typeof ack === "function") {
          ack({ ok: false, error: "not_found" });
        }
        return;
      }

      const listing = marketListings[idx];
      if (listing.amount < consumeAmount) {
        console.log("market:consume not_enough_amount:", id);
        if (typeof ack === "function") {
          ack({ ok: false, error: "not_enough_amount" });
        }
        return;
      }

      listing.amount -= consumeAmount;
      if (listing.amount <= 0) {
        marketListings.splice(idx, 1);
      }

      if (typeof ack === "function") {
        ack({ ok: true });
      }

      console.log("market:consume done, remaining listings:", marketListings.length);
      // 最新状態をブロードキャスト
      io.emit("market:update", marketListings);
    } catch (e) {
      console.error("market:consume error", e);
      if (typeof ack === "function") {
        ack({ ok: false, error: "server_error" });
      }
    }
  });
});

// ポート（Render では PORT は環境変数で渡される）
const port = process.env.PORT || 3001;
httpServer.listen(port, () => {
  console.log("Server (HTTP + Socket.io) listening on port " + port);
});