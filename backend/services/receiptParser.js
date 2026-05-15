const { callLLM } = require("./llmRouter");

const ensureNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

exports.parseReceipt = async (text) => {
  const structuredText = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  const prompt = `You are an expert receipt parser with deep knowledge of merchant formats,
billing layouts, and OCR artifact correction.

## CONTEXT
The text below was extracted via OCR from a receipt image. It may contain garbled
characters, broken lines, extra metadata, or duplicated fields.

## TASK
Parse the receipt and extract:
- merchant name
- transaction date
- final total amount paid
- every purchased line item with name and amount

## OUTPUT CONTRACT
Return ONLY a raw JSON object with this exact structure:
{
  "merchant": "<cleaned merchant name>",
  "date": "<YYYY-MM-DD or null>",
  "total": <float>,
  "items": [
    { "name": "<item name>", "amount": <float> }
  ]
}

If you cannot find a value, return null for strings and 0 for numeric fields.
If no items can be identified, return an empty array.
Do not return markdown, backticks, or extra explanation.

## OCR TEXT
"""
${structuredText}
"""
`;

  let output = await callLLM(prompt);
  output = output.replace(/```json|```/g, "").trim();
  const jsonMatch = output.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Receipt parser did not return valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    merchant: parsed.merchant || "Unknown",
    date: parsed.date || null,
    total: ensureNumber(parsed.total),
    items: Array.isArray(parsed.items)
      ? parsed.items.map((item) => ({
          name: item.name || "",
          amount: ensureNumber(item.amount)
        }))
      : []
  };
};
