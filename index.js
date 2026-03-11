const { getJson } = require("serpapi");
const axios = require("axios");
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

// Web Server 讓 Render 保持運行
app.get('/', (req, res) => {
  res.send('<h1>機票監控機器人運行中！✈️</h1>');
});
app.listen(port, () => console.log(`Server running on port ${port}`));

// 從 Environment Variables 讀取設定
const API_KEY = process.env.SERPAPI_KEY;
const NTFY_TOPIC = process.env.NTFY_TOPIC;
const BUDGET = parseInt(process.env.FLIGHT_BUDGET) || 1100;

function checkFlights() {
  const now = new Date().toLocaleString("zh-HK", {timeZone: "Asia/Hong_Kong"});
  console.log(`[${now}] 正在掃描 UO 航班 (HKG <-> PQC)...`);

  getJson({
    engine: "google_flights",
    departure_id: "HKG",
    arrival_id: "PQC",
    outbound_date: "2026-06-21",
    return_date: "2026-06-28",
    currency: "HKD",
    gl: "hk",           // 強制指定地區為香港
    hl: "zh-hk",        // 強制指定語言為繁體中文
    api_key: API_KEY
  }, (json) => {
    // 1. 合併所有回傳嘅航班組合
    const allOptions = [
      ...(json.best_flights || []),
      ...(json.other_flights || [])
    ];

    if (allOptions.length === 0) {
      console.log("❌ API 無回傳任何航班數據。");
      return;
    }

    // 2. 搵出包含 UO 598 同 UO 597 嘅組合
    const myFlight = allOptions.find(itinerary => {
      const flights = itinerary.flights;
      // 只要航班編號包含 598 同 597 就算中
      const has598 = flights.some(f => f.flight_number.includes("598"));
      const has597 = flights.some(f => f.flight_number.includes("597"));
      return has598 && has597;
    });

    if (myFlight) {
      const currentPrice = myFlight.price;
      console.log(`🎯 搵到喇！UO598/597 來回票價: HKD ${currentPrice}`);

      if (currentPrice <= BUDGET) {
        console.log(`🔥 價錢跌破預算 ($${BUDGET})！發送推送通知...`);
        sendPushNotification(currentPrice);
      } else {
        console.log(`💡 目前價格 $${currentPrice} 仲係貴過預算 $${BUDGET}。`);
      }
    } else {
      console.log("⚠️ 喺搜尋結果入面搵唔到 UO598 + UO597 嘅組合。");
      // 印出第一班機嘅名嚟 debug
      if (allOptions[0]) console.log(`搜尋結果首選係: ${allOptions[0].flights[0].airline}`);
    }
  });
}
checkFlights();
setInterval(checkFlights, 8 * 60 * 60 * 1000); // 8 小時 Check 一次


