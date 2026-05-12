exports.detectSubscriptions = (transactions) => {
  const map = {};

  for (let tx of transactions) {
    const key = tx.merchant.toLowerCase();

    if (!map[key]) {
      map[key] = [];
    }

    map[key].push(tx);
  }

  const subscriptions = [];

  for (let merchant in map) {
    const txs = map[merchant];

    if (txs.length < 2) continue; // minimum 2 to detect pattern

    // sort by date
    txs.sort((a, b) => new Date(a.date) - new Date(b.date));

    const intervals = [];

    for (let i = 1; i < txs.length; i++) {
      const diff =
        (new Date(txs[i].date) - new Date(txs[i - 1].date)) /
        (1000 * 60 * 60 * 24); // days

      intervals.push(diff);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const avgAmount = txs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) / txs.length;
    const lastPaid = txs[txs.length - 1].date;

    let billing_cycle = "repeating";
    if (avgInterval >= 5 && avgInterval <= 12) {
      billing_cycle = "weekly";
    } else if (avgInterval >= 20 && avgInterval <= 40) {
      billing_cycle = "monthly";
    } else if (avgInterval >= 80 && avgInterval <= 100) {
      billing_cycle = "quarterly";
    } else if (avgInterval >= 320 && avgInterval <= 400) {
      billing_cycle = "yearly";
    }

    const nextDue = new Date(lastPaid);
    nextDue.setDate(nextDue.getDate() + Math.round(avgInterval || 30));

    const diffDays = Math.ceil((nextDue - new Date()) / (1000 * 60 * 60 * 24));
    const nextDueLabel = diffDays >= 0
      ? `in ${diffDays} day${diffDays === 1 ? "" : "s"}`
      : `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago`;

    const status =
      new Date(lastPaid) <= new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
        ? "unused"
        : "active";

    subscriptions.push({
      merchant,
      avgAmount: Math.round(avgAmount * 100) / 100,
      billing_cycle,
      lastPaid,
      next_due: nextDue.toISOString(),
      next_due_label: nextDueLabel,
      occurrence_count: txs.length,
      status
    });
  }

  return subscriptions;
};