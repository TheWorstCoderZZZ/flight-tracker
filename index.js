const { getJson } = require("serpapi");
const axios = require("axios");
const express = require('express');

// 1. Web Server 設定 (讓 Render 保持運行)
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('<h1>機票監控中：搵緊最平來回飛！✈️</h1>');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// 2. 從環境變數讀取設定
const API_KEY = process.env.SERPAPI_KEY;
const NTFY_TOPIC = process.env.NTFY_TOPIC;
const BUDGET = parseInt(process.env.FLIGHT_BUDGET) || 3000;

// 3. 手機推送函數
async function sendPushNotification(price, airline, details) {
  try {
    await axios.post(`https://ntfy.sh/${NTFY_TOPIC}`, 
      `✈️ 有平來回飛！${airline} 現價 HKD ${price}\n行程: ${details}`, 
      {
        headers: {
          'Title': 'Flight Price Alert',
          'Priority': 'high',
          'Tags': 'airplane,moneybag'
        }
      }
    );
    console.log("📱 手機推送已發送！");
  } catch (err) {
    console.error("推送失敗:", err.message);
  }
}

// 4. 核心監控邏輯 (來回最平版 - 不限航班)
function checkFlights() {
  const now = new Date().toLocaleString("zh-HK", {timeZone: "Asia/Hong_Kong"});
  console.log(`[${now}] 正在檢查 6/21 - 6/28 來回最平機票...`);

  getJson({
    engine: "google_flights",
    departure_id: "HKG",
    arrival_id: "PQC",
    outbound_date: "2026-06-21",
    return_date: "2026-06-28", // 開啟來回模式
    currency: "HKD",
    gl: "hk",
    hl: "zh-tw", 
    api_key: API_KEY
  }, (json) => {
    // 搵出 Google 推薦最平嘅「來回組合」 (Best Flights 第一個)
    if (json.best_flights && json.best_flights.length > 0) {
      const bestOption = json.best_flights[0];
      const currentPrice = bestOption.price;
      
      // 攞航空公司名同簡單行程資訊
      const airline = bestOption.flights[0].airline;
      const details = bestOption.flights.map(f => f.flight_number).join(' & ');

      console.log(`🎯 目前最平來回係: ${airline} (${details}) | 票價: HKD ${currentPrice}`);

      if (currentPrice <= BUDGET) {
        console.log(`🔥 價錢跌破預算 ($${BUDGET})！準備通知...`);
        sendPushNotification(currentPrice, airline, details);
      } else {
        console.log(`💡 目前價格 $${currentPrice} 仍高於預算 $${BUDGET}。`);
      }
    } else {
      console.log("❌ 暫時搵唔到任何來回航班數據。");
    }
  });
}

// 5. 啟動
checkFlights(); 
setInterval(checkFlights, 8 * 60 * 60 * 1000); // 8 小時 Check 一次
