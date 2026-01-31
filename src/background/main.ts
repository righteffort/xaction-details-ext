import browser from 'webextension-polyfill';

// Setup Side Panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Simple State Hub
// TODO: fix all uses of any wherever possible
// eslint-disable-next-line
let latestActualData: any[] = [];

// eslint-disable-next-line
browser.runtime.onMessage.addListener((msg: any, sender: any) => {
  if (msg.action === 'ACTUAL_DATA_RECEIVED') {
    latestActualData = msg.data;
    console.log("Background: Received Actual Data", latestActualData.length);
    // Notify Side Panel
    browser.runtime.sendMessage({ action: 'STATE_UPDATED', count: latestActualData.length });

    // --- POC LOGIC ---
    if (sender.tab?.id) {
      runPocLogic(latestActualData, sender.tab.id);
    }
    return;
  }
  // 2. Handle Manual Import Trigger from Side Panel
  if (msg.action === 'RUN_POC_IMPORT_ONE' || msg.action === 'RUN_POC_IMPORT_TWO') {
    // both values will use the same imported_id, to validate that dedup works
    const tabId = msg.tabId;

    // TODO: Hardcoded!
    const targetAccount = 'ae36485d-4509-4477-b9e5-4926c5b951ff';

    if (!targetAccount) {
      console.error("POC: Cannot import - No account ID found in cached data.");
      return;
    }

    const importPayload = {
      id: crypto.randomUUID(),
      account: targetAccount,
      date: new Date().toLocaleDateString('en-CA'), // Today in local time zone
      amount: -1250,
      imported_payee: 'Side Panel Import Test',
      payee_name: 'Side Panel Import Test',  // We'll replace this with payee_id
      notes: msg.action,
      imported_id: 'manual-poc-1',  // dedup key, it is imperfect since we bypass backend
      cleared: false
    };

    console.log("POC: importPayload", JSON.stringify(importPayload, null,2));

    // Send to Content Script
    browser.tabs.sendMessage(tabId, {
      action: 'TRIGGER_IMPORT',
      data: importPayload
    });
    console.log('sent IMPORT_TRANSACTION')
    return;
  }
});

// eslint-disable-next-line
function runPocLogic(transactions: any[], tabId: number) {
  transactions.forEach((tx) => {
    if (!tx.notes) return;

    // 1. Simple Note Update
    if (tx.notes.includes('extension test updateme')) {
      console.log(`POC: Updating notes for ${tx.id}`);

      const updatedTx = {
        ...tx,
        notes: tx.notes.replace('extension test updateme', 'extension test update complete')
      };

      // Send back to the tab
      browser.tabs.sendMessage(tabId, {
        action: 'TRIGGER_SAVE',
        data: updatedTx
      });
    }

    // 2. Split Transaction
    if (tx.notes.includes('extension test split me')) {
      console.log(`POC: Splitting transaction ${tx.id}`);

      const splitA = Math.floor(tx.amount / 2);
      const splitB = tx.amount - splitA;

      console.log('tx', JSON.stringify(tx, null, 20));
      const updatedTx = {
        ...tx,
        is_parent: true,
	// TODO: should category be null here?
        notes: tx.notes.replace('extension test split me', 'extension test split complete'),
        subtransactions: [
          { id: crypto.randomUUID(), is_child: true, parent_id: tx.id, account: tx.account, date: tx.date, payee: '', amount: splitA, notes: 'Split Part A', category: null },
          { id: crypto.randomUUID(), is_child: true, parent_id: tx.id, account: tx.account, date: tx.date, payee: '', amount: splitB, notes: 'Split Part B', category: null }
        ]
      };
      console.log('updatedTx', JSON.stringify(updatedTx, null, 2));
      browser.tabs.sendMessage(tabId, {
        action: 'TRIGGER_SAVE',
        data: updatedTx
      });
    }
  });
}
