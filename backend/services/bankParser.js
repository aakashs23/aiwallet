const { callLLM } = require("./llmRouter");

const ensureNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const num = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(num) ? num : 0;
};

const normalizeDate = (dateText) => {
  const [month, day, year] = dateText.split("/");
  if (!month || !day || !year) return null;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

const extractTransactionsFromText = (text) => {
  const dateRegex = /(\d{1,2}\/\d{1,2}\/\d{4})/g;
  const amountRegex = /([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d+)?)/g;
  const matches = [...text.matchAll(dateRegex)];
  const transactions = [];

  for (let i = 0; i < matches.length; i++) {
    const currentDate = matches[i][1];
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const segmentStart = matches[i].index + currentDate.length;
    const segment = text.slice(segmentStart, nextIndex).trim();
    if (!segment) continue;

    const amountMatch = segment.match(amountRegex);
    if (!amountMatch || amountMatch.length === 0) continue;

    const amountText = amountMatch[0];
    const amount = ensureNumber(amountText);
    if (amount === 0) continue;

    let merchant = segment.replace(amountRegex, "").trim();
    merchant = merchant.replace(/[\|\-–—]+/g, " ").replace(/\s{2,}/g, " ").trim();
    if (!merchant) {
      const remainder = segment.replace(amountText, "").trim();
      merchant = remainder || "Unknown";
    }

    transactions.push({
      date: normalizeDate(currentDate),
      merchant: merchant || "Unknown",
      amount
    });
  }

  return transactions;
};

exports.parseBankStatement = async (text) => {
  const structuredText = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  // For now, skip LLM and use regex fallback to avoid rate limits
  console.log("Bank statement: using regex fallback parser");
  const fallbackTransactions = extractTransactionsFromText(structuredText);
  return { transactions: fallbackTransactions };

  // TODO: Re-enable LLM parsing when rate limits are resolved
  /*
  const prompt = `You are an expert financial document parser specialized in bank statements.

## CONTEXT
The input below is raw OCR text extracted from a PDF bank statement.
It may contain transaction rows, opening/closing balances, column headers,
reconciliation summaries, account metadata, and noise.

## TASK
Extract only the detailed transaction rows. Each transaction must include:
- date
- merchant/payee description
- transaction amount

Ignore summary lines, balances, headers, footers, account numbers, and non-transaction metadata.

## OUTPUT CONTRACT
Return ONLY a raw JSON object with this structure:
{
  "transactions": [
    {
      "date": "<YYYY-MM-DD or null>",
      "merchant": "<merchant or payee description>",
      "amount": <float>
    }
  ]
}

If date is unavailable for a row, set it to null. If amount is unavailable, omit that row.
If there are no valid transactions, return {"transactions": []}.
Do not emit markdown, backticks, or extra explanation.

## OCR TEXT
"""
${structuredText}
"""
`;

  let llmOutput;

  try {
    llmOutput = await callLLM(prompt);
    llmOutput = llmOutput.replace(/```json|```/g, "").trim();
    const jsonMatch = llmOutput.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const transactions = Array.isArray(parsed.transactions)
        ? parsed.transactions
            .filter((txn) => txn && txn.merchant && txn.amount !== undefined)
            .map((txn) => ({
              date: txn.date || null,
              merchant: txn.merchant || "Unknown",
              amount: ensureNumber(txn.amount)
            }))
        : [];

      if (transactions.length > 0) {
        return { transactions };
      }
    }

    console.warn("Bank statement LLM returned empty or invalid transaction list; falling back to regex parser.");
  } catch (err) {
    console.error("Bank statement LLM parse failed:", err.message);
  }

  const fallbackTransactions = extractTransactionsFromText(structuredText);
  return { transactions: fallbackTransactions };
  */
};
