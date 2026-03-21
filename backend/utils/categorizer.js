const keywordRules = {
  Food: ["swiggy", "zomato", "kfc", "mcdonalds", "restaurant"],
  Transport: ["uber", "ola", "bus", "train", "metro"],
  Shopping: ["amazon", "flipkart", "myntra", "bigbasket"],
  Entertainment: ["netflix", "spotify", "youtube"],
  Bills: ["electricity", "water", "rent", "internet"]
};

function ruleBasedCategory(merchant) {
  const lower = merchant.toLowerCase();

  for (let category in keywordRules) {
    for (let word of keywordRules[category]) {
      if (lower.includes(word)) {
        return {
          category,
          confidence: 1.0,
          source: "rule",
          reason: `Matched keyword: ${word}`
        };
      }
    }
  }

  return null;
}

module.exports = { ruleBasedCategory };