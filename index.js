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
  console.log(`[${new Date().toLocaleString()}] 檢查中...`);
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
      console.log(`目前價格: HKD ${price}`);
      if (price <= BUDGET) {
        axios.post(`https://ntfy.sh/${NTFY_TOPIC}`, `✈️ 富國島平飛！現價 HKD ${price}`, {
          headers: { 'Title': 'Flight Price Alert', 'Priority': 'high', 'Tags': 'airplane' }
        });
      }
    }
  });
}

checkFlights();
setInterval(checkFlights, 8 * 60 * 60 * 1000); // 8 小時 Check 一次
