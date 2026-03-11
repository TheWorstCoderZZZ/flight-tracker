const { getJson } = require("serpapi");
const axios = require("axios");
const express = require('express');

// 1. 建立 Web Server (讓 Render 免費版能運行)
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('<h1>機票監控機器人運行中！✈️</h1><p>24/7 監測香港往返富國島機票中。</p>');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// 2. 核心監控參數
const API_KEY = "aabf8222b0b06e5429e95e81d0f07005f40ca2319fed213c7ad6c6be16c64fd5";
const NTFY_TOPIC = "ch_wong_flight_alert_2026"; // 確保與手機 App 訂閱的主題一致
const BUDGET = 1100; // 你的目標預算

// 3. 手機推送函數 (ntfy.sh)
async function sendPushNotification(price) {
  try {
    await axios.post(`https://ntfy.sh/${NTFY_TOPIC}`, 
      `✈️ 富國島平機票！現價 HKD ${price}`, 
      {
        headers: {
          'Title': 'Flight Price Alert', // 必須是英文以免 Header 報錯
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

// 4. 機票檢查邏輯
function checkFlights() {
  const now = new Date().toLocaleString("zh-HK", {timeZone: "Asia/Hong_Kong"});
  console.log(`[${now}] 正在檢查機票...`);

  getJson({
    engine: "google_flights",
    departure_id: "HKG",
    arrival_id: "PQC",
    outbound_date: "2026-06-21",
    return_date: "2026-06-28",
    currency: "HKD",
    api_key: API_KEY
  }, (json) => {
    if (json.best_flights && json.best_flights.length > 0) {
      const price = json.best_flights[0].price;
      console.log(`目前最平價格: HKD ${price}`);

      if (price <= BUDGET) {
        sendPushNotification(price);
      } else {
        console.log(`❌ 價格 ${price} 高於預算 ${BUDGET}。`);
      }
    } else {
      console.log("無法獲取航班數據，請檢查 API 狀態或日期設定。");
    }
  });
}

// 5. 啟動設定
checkFlights(); // 啟動時立即執行一次

// 每 8 小時檢查一次 (符合 SerpApi 每月 100 次免費額度)
// 計算方式：(30天 * 24小時) / 8小時 = 90次，安全不爆額
setInterval(checkFlights, 8 * 60 * 60 * 1000);