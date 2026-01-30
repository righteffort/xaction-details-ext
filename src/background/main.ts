import browser from 'webextension-polyfill';

// Setup Side Panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Simple State Hub
// TODO: fix any from gemini if possible
// eslint-disable-next-line
let latestActualData: any[] = [];

// eslint-disable-next-line
browser.runtime.onMessage.addListener((msg: any) => {
  if (msg.action === 'ACTUAL_DATA_RECEIVED') {
    latestActualData = msg.data;
    console.log("Background: Received Actual Data", latestActualData.length);
    // Notify Side Panel
    browser.runtime.sendMessage({ action: 'STATE_UPDATED', count: latestActualData.length });
  }
});
