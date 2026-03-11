const { getJson } = require("serpapi");
const axios = require("axios");

const API_KEY = "aabf8222b0b06e5429e95e81d0f07005f40ca2319fed213c7ad6c6be16c64fd5";
const NTFY_TOPIC = "ch_wong_flight_alert_2026"; // 必須跟你手機 App 填的一模一樣
const BUDGET = 900;

async function sendPushNotification(price) {
  try {
    await axios.post(`https://ntfy.sh/${NTFY_TOPIC}`, 
      `✈️ 富國島平機票！現價 HKD ${price}`, // 中文字放喺呢度係 OK 嘅
      {
        headers: {
          'Title': 'Flight Price Alert', // 呢度改返做英文
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

function checkFlights() {
  console.log(`[${new Date().toLocaleTimeString()}] 檢查中...`);

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
      console.log(`目前最平: HKD ${price}`);

      if (price <= BUDGET) {
        sendPushNotification(price);
      }
    }
  });
}

// 立即執行一次
checkFlights();
// 每 8 小時檢查一次 (符合免費額度)
setInterval(checkFlights, 8 * 60 * 60 * 1000);