const categories = {
  Food: ["swiggy", "zomato", "kfc", "mcdonalds", "restaurant"],
  Transport: ["uber", "ola", "bus", "train", "metro"],
  Shopping: ["amazon", "flipkart", "myntra"],
  Entertainment: ["netflix", "spotify", "youtube"],
  Bills: ["electricity", "water", "rent", "internet"]
};

function categorizeTransaction(merchant) {
  const lowerMerchant = merchant.toLowerCase();

  for (let category in categories) {
    for (let keyword of categories[category]) {
      if (lowerMerchant.includes(keyword)) {
        return category;
      }
    }
  }

  return "Other";
}

module.exports = categorizeTransaction;

function ruleBasedCategory(merchant) {
  const lower = merchant.toLowerCase();

  for (let category in keywordRules) {
    for (let word of keywordRules[category]) {
      if (lower.includes(word)) {
        return category;
      }
    }
  }

  return null;
}
