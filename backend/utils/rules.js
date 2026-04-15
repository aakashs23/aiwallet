exports.ruleBasedCategory = (name) => {
  if (!name) return null;

  const n = name.toLowerCase();

  // 🍔 FOOD (very common)
  if (
    n.includes("coffee") ||
    n.includes("tea") ||
    n.includes("coke") ||
    n.includes("pepsi") ||
    n.includes("burger") ||
    n.includes("pizza") ||
    n.includes("sandwich") ||
    n.includes("meal") ||
    n.includes("lunch") ||
    n.includes("dinner") ||
    n.includes("breakfast") ||
    n.includes("restaurant") ||
    n.includes("cafe")
  ) return "Food";

  // 🚕 TRANSPORT
  if (
    n.includes("uber") ||
    n.includes("ola") ||
    n.includes("rapido") ||
    n.includes("taxi") ||
    n.includes("metro") ||
    n.includes("bus") ||
    n.includes("train") ||
    n.includes("fuel") ||
    n.includes("petrol") ||
    n.includes("diesel")
  ) return "Transport";

  // 🛒 SHOPPING (groceries + retail)
  if (
    n.includes("milk") ||
    n.includes("bread") ||
    n.includes("rice") ||
    n.includes("flour") ||
    n.includes("oil") ||
    n.includes("vegetable") ||
    n.includes("fruit") ||
    n.includes("grocery") ||
    n.includes("mart") ||
    n.includes("store") ||
    n.includes("supermarket") ||
    n.includes("amazon") ||
    n.includes("flipkart")
  ) return "Shopping";

  // 💡 BILLS
  if (
    n.includes("electricity") ||
    n.includes("water") ||
    n.includes("wifi") ||
    n.includes("internet") ||
    n.includes("bill") ||
    n.includes("recharge") ||
    n.includes("postpaid")
  ) return "Bills";

  // 🎬 ENTERTAINMENT
  if (
    n.includes("netflix") ||
    n.includes("spotify") ||
    n.includes("hotstar") ||
    n.includes("prime") ||
    n.includes("movie") ||
    n.includes("cinema") ||
    n.includes("game")
  ) return "Entertainment";

  // 💊 HEALTH
  if (
    n.includes("pharmacy") ||
    n.includes("apollo") ||
    n.includes("hospital") ||
    n.includes("clinic") ||
    n.includes("medicine") ||
    n.includes("tablet") ||
    n.includes("doctor")
  ) return "Health";

  // 🎓 EDUCATION
  if (
    n.includes("school") ||
    n.includes("college") ||
    n.includes("course") ||
    n.includes("udemy") ||
    n.includes("coursera") ||
    n.includes("exam") ||
    n.includes("tuition")
  ) return "Education";

  // ✈️ TRAVEL
  if (
    n.includes("flight") ||
    n.includes("hotel") ||
    n.includes("booking") ||
    n.includes("airbnb") ||
    n.includes("irctc") ||
    n.includes("trip")
  ) return "Travel";

  // 💰 FINANCE
  if (
    n.includes("bank") ||
    n.includes("interest") ||
    n.includes("loan") ||
    n.includes("emi") ||
    n.includes("upi") ||
    n.includes("payment") ||
    n.includes("fee")
  ) return "Finance";

  return null;
};