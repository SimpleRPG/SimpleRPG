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

  // ★マーケット: 出品する
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

      const listing = {
        id: Date.now().toString() + ":" + Math.random().toString(16).slice(2),
        sellerId: socket.id,
        itemKey,
        category,
        amount,
        price
      };

      marketListings.push(listing);
      console.log("marketListings now:", marketListings);

      // 要求元にACK
      if (typeof ack === "function") {
        ack({ ok: true, listing });
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