const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.listModels = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    res.json(response.data);
  } catch (err) {
    console.error("Error listing models:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.classifyTransaction = async (req, res) => {
  try {
    const { merchant, amount, userHistory = [], texts } = req.body;

    // Handle two modes: raw text (parse + classify) or pre-parsed merchant/amount (classify only)
    if (!texts && (!merchant || !amount)) {
      return res.status(400).json({
        message: "either 'texts' (raw OCR) or 'merchant' + 'amount' required"
      });
    }

    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
    });

    // If raw text provided, parse and classify together
    if (texts) {
      const structuredText = texts
          .split("\n")
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .join("\n");

    const prompt = `
    You are an expert financial transaction classifier with deep knowledge of Indian spending patterns, 
    merchant categories, and receipt parsing from OCR-extracted text.

    ## CONTEXT
    The input below is RAW TEXT extracted via OCR from a physical or digital receipt.
    It may contain:
    - Misspellings, garbled characters, or broken words (e.g., "Sw1ggy", "AM4ZON", "Ph@rmacy")
    - Inconsistent formatting, missing newlines, or merged words
    - Multiple line items — focus on the MERCHANT and TOTAL/GRAND TOTAL amount only
    - Noise like store addresses, GST numbers, cashier names — ignore these

    ## TASK
    1. PARSE the OCR text to extract: merchant name, final amount paid, and any loyalty/membership hints.
    2. CLASSIFY the transaction into exactly ONE category.
    3. Return structured JSON with both parsed fields and classification.

    ## OUTPUT CONTRACT
    Respond with ONLY a raw JSON object.
    - No markdown. No backticks. No explanation outside the JSON.
    - Deviate from this format = invalid response.

    {
        "parsed": {
            "merchant": "<best guess at merchant name, cleaned up>",
            "amount": <final numeric amount as a float, no currency symbol>,
            "amount_field": "<label found on receipt e.g. 'Grand Total', 'Net Payable', 'Total'>",
            "ocr_confidence": "<high | medium | low — how clean was the OCR input>"
        },
        "classification": {
            "category": "<exactly one from the allowed list>",
            "confidence": <float 0.00–1.00>,
            "reason": "<≤12 words explaining the key signal>"
        }
    }

    ## AMOUNT EXTRACTION RULES
    - Prefer fields labeled: "Grand Total", "Net Payable", "Total Amount", "Amount Due", "Net Amount"
    - IGNORE: subtotals, tax lines (CGST, SGST, IGST), individual item prices, tip lines
    - If multiple totals exist, take the LARGEST final value
    - Strip currency symbols (₹, Rs, INR) and commas before parsing as float
    - If no amount is found, set amount to null

    ## MERCHANT EXTRACTION RULES
    - Usually appears at the TOP of the receipt (first 3 lines)
    - May be followed by tagline, address, or GSTIN — ignore those
    - Fix obvious OCR errors: "Sw1ggy" → "Swiggy", "McDona1ds" → "McDonalds"
    - If merchant is a branch/franchise (e.g., "Reliance Fresh - Gandhipuram"), extract parent brand only: "Reliance Fresh"

    ## CLASSIFICATION RULES
    1. Merchant name is the PRIMARY signal — weight it highest.
    2. Amount is a SECONDARY signal (e.g., ₹22 → likely Food/Transport, not Travel).
    3. Line items on the receipt are a TIEBREAKER for ambiguous merchants.
    4. If confidence < 0.5, still return your best guess — never return null or "Unknown".
    5. Assign "Other" only when no category fits after exhausting all signals.

    ## ALLOWED CATEGORIES
    Food | Transport | Shopping | Bills | Entertainment | Health | Education | Travel | Finance | Other

    ## FEW-SHOT EXAMPLES

    Input OCR:
    """
    SW1GGY
    Order #45291
    Butter Chicken    ₹280
    Naan x2           ₹80
    -----------
    Subtotal          ₹360
    CGST 2.5%         ₹9
    SGST 2.5%         ₹9
    Grand Total       ₹378
    """
    Output:
    {
        "parsed": { "merchant": "Swiggy", "amount": 378.00, "amount_field": "Grand Total", "ocr_confidence": "medium" },
        "classification": { "category": "Food", "confidence": 0.98, "reason": "Swiggy food delivery with meal line items" }
    }

    ---

    Input OCR:
    """
    APOLLO PHARM4CY
    MRP BILL
    Paracetamol 500mg  ₹32
    Cetirizine 10mg    ₹45
    Vitamin D3         ₹210
    Total Items: 3
    Net Payable: ₹287
    GSTIN: 33AABCA1234B1Z1
    """
    Output:
    {
        "parsed": { "merchant": "Apollo Pharmacy", "amount": 287.00, "amount_field": "Net Payable", "ocr_confidence": "medium" },
        "classification": { "category": "Health", "confidence": 0.97, "reason": "Pharmacy receipt with medicine line items" }
    }

    ---

    Input OCR:
    """
    IRCTC e-Ticket
    Train: 12163 Chennai Exp
    Passenger: RAHUL K
    Fare Breakup
    Base Fare      ₹455
    Reservation    ₹40
    Total          ₹495
    PNR: 4521XXXX
    """
    Output:
    {
        "parsed": { "merchant": "IRCTC", "amount": 495.00, "amount_field": "Total", "ocr_confidence": "high" },
        "classification": { "category": "Travel", "confidence": 0.99, "reason": "IRCTC train ticket with PNR and fare" }
    }

    ## RECEIPT OCR TEXT TO PROCESS
    """
    ${structuredText}
    """
    """

    ## REMINDER
    Output ONLY the raw JSON object. Nothing else.
    `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      let parsed;

      try {
        parsed = JSON.parse(text);
      } catch (err) {
        console.error("❌ JSON parse failed:", text);

        parsed = {
          parsed: {
            merchant: "Unknown",
            amount: 0,
            ocr_confidence: "low"
          },
          classification: {
            category: "Other",
            confidence: 0.5,
            reason: "Fallback parsing failed"
          }
        };
      }

      res.json(parsed);

    } else {
      // Mode 2: Classify with pre-parsed merchant + amount
      const classifyPrompt = `
Classify the following transaction into exactly ONE category.

Merchant: ${merchant}
Amount: ₹${amount}
User History: ${userHistory.length > 0 ? userHistory.join(", ") : "None"}

## ALLOWED CATEGORIES
Food | Transport | Shopping | Bills | Entertainment | Health | Education | Travel | Finance | Other

## OUTPUT CONTRACT
Respond with ONLY a raw JSON object (no markdown, no backticks):

{
  "parsed": {
    "merchant": "${merchant}",
    "amount": ${amount}
  },
  "classification": {
    "category": "<exactly one from allowed list>",
    "confidence": <float 0.00–1.00>,
    "reason": "<brief explanation>"
  }
}
`;

      const result = await model.generateContent(classifyPrompt);
      const response = await result.response;
      const text = response.text();

      let parsed;

      try {
        parsed = JSON.parse(text);
      } catch (err) {
        console.error("❌ JSON parse failed:", text);

        parsed = {
          parsed: { merchant, amount },
          classification: {
            category: "Other",
            confidence: 0.5,
            reason: "Classification failed"
          }
        };
      }

      res.json(parsed);
    }

  } catch (err) {
    console.error("❌ Gemini error:", err.message);

    res.json({
      parsed: {
        merchant: "Unknown",
        amount: null
      },
      classification: {
        category: "Other",
        confidence: 0,
        reason: "LLM failed"
      }
    });
  }
};

exports.parseReceipt = async (req, res) => {
  try {
    const { text } = req.body;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

    const structuredText = text
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join("\n");

    const prompt = `
You are an expert receipt parser with deep knowledge of Indian and international merchant formats,
billing layouts, and OCR artifact correction.

## CONTEXT
The text below was extracted via OCR from a physical or digital receipt.
It may contain:
- Garbled characters or OCR noise (e.g., "0ct" instead of "Oct", "₹1O0" instead of "₹100")
- Inconsistent spacing, merged words, or broken lines
- Multiple dates (printed date, order date, delivery date) — extract the TRANSACTION date
- Multiple amounts (subtotals, taxes, item prices) — extract only the FINAL amount paid
- Irrelevant noise: GSTIN, cashier ID, store address, loyalty points — ignore these

## TASK
Parse the receipt and extract exactly three fields: merchant, amount, and date.

## OUTPUT CONTRACT
Respond with ONLY a raw JSON object.
- No markdown. No backticks. No prose outside the JSON.
- Deviate from this format = invalid response.

{
  "merchant": "<cleaned merchant/brand name, title case>",
  "amount":   <final amount paid as a float, no currency symbols or commas>,
  "date":     "<transaction date in YYYY-MM-DD format, or null if not found>"
}

## FIELD EXTRACTION RULES

### merchant
- Look in the FIRST 3 lines of the receipt — brand name is almost always at the top
- Strip suffixes: branch names, city, "Pvt Ltd", "Retail Store", store codes
  e.g., "Reliance Fresh - RS Puram, Coimbatore" → "Reliance Fresh"
- Fix obvious OCR errors: "McDona1ds" → "McDonalds", "AMAZCN" → "Amazon"
- Use title case: "APOLLO PHARMACY" → "Apollo Pharmacy"
- If truly unidentifiable, return "Unknown"

### amount  
- Prefer labels in this priority order:
  1. "Grand Total" / "Grand Amt"
  2. "Net Payable" / "Net Amount" / "Amount Due"
  3. "Total Amount" / "Total"
  4. "Amount Paid" / "Paid"
- IGNORE: CGST, SGST, IGST, item prices, subtotals, delivery fee (unless it's the only amount)
- If multiple totals exist → take the LARGEST final value
- Strip ₹, Rs, INR, commas before parsing: "₹1,234.50" → 1234.50
- If no amount found → return 0

### date
- Prefer labels: "Date", "Bill Date", "Order Date", "Transaction Date", "Txn Date"
- Parse any format into YYYY-MM-DD:
  "12/03/2025" → "2025-03-12"
  "12-Mar-25"  → "2025-03-12"  
  "Mar 12 2025" → "2025-03-12"
  "20250312"   → "2025-03-12"
- If day is ambiguous (e.g., "03/04/25"), prefer DD/MM/YY convention for Indian receipts
- If no date found → return null

## FEW-SHOT EXAMPLES

Input:
"""
SW1GGY
Order #48291 | Help: 1800-XXX
Butter Chicken         ₹280
Garlic Naan x2         ₹80
Delivery Fee           ₹30
------------------------------
Subtotal               ₹360
CGST (2.5%)            ₹9.00
SGST (2.5%)            ₹9.00
Grand Total            ₹398
Date: 14-Jan-2025
"""
Output:
{"merchant":"Swiggy","amount":398.00,"date":"2025-01-14"}

---

Input:
"""
RELIANCE FRESH
Store: RF-2291 | RS Puram, CBE
GSTIN: 33AABCR1234B1Z5
Milk 1L                ₹62
Bread                  ₹45
Rice 5kg               ₹320
Subtotal               ₹427
CGST                   ₹10.68
SGST                   ₹10.68
Net Payable: ₹448
Bill Date: 03/02/25    Cashier: EMP-042
"""
Output:
{"merchant":"Reliance Fresh","amount":448.00,"date":"2025-02-03"}

---

Input:
"""
IRCTC eTICKET
PNR: 4521098712
Train: 12163 | Chennai Central Exp
Passenger: RAHUL KUMAR
Base Fare     ₹455.00
Reservation   ₹40.00
Total         ₹495.00
Booking Date: 2025-03-22
"""
Output:
{"merchant":"IRCTC","amount":495.00,"date":"2025-03-22"}

---

Input:
"""
BIGBASKET.COM
Order ID: BB-99812
Tomatoes 1kg      ₹35
Onions 2kg        ₹60
Amount Paid: ₹95
"""
Output:
{"merchant":"BigBasket","amount":95.00,"date":null}

## RECEIPT TO PARSE
"""
${structuredText}
"""

## REMINDER
Output ONLY the raw JSON object. Nothing else.
`;

    const result = await model.generateContent(prompt);
    let output = result.response.text();

    output = output.replace(/```json|```/g, "").trim();

    const jsonMatch = output.match(/\{[\s\S]*\}/);

    if (!jsonMatch) throw new Error("No JSON found");

    const parsed = JSON.parse(jsonMatch[0]);

    res.json(parsed);

  } catch (err) {
    console.error("PARSE RECEIPT ERROR:", err);

    res.json({
      merchant: "Unknown",
      amount: 0,
      date: null
    });
  }
};