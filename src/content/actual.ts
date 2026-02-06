import browser from "webextension-polyfill";
import { LocalBridge } from "@righteffort/actual-ext-bridge";

const actualBridge = new LocalBridge();
await actualBridge.connect();

// Proxy messages: Background -> Isolated -> Main World
// eslint-disable-next-line
browser.runtime.onMessage.addListener((msg: any) => {
  console.log(
    "actual.ts onMessage listener received",
    JSON.stringify(msg, null, 2),
  );
  if (msg.action === "FETCH_ACTUAL_DATA") {
    window.postMessage(
      { type: "ACTUAL_BRIDGE_CMD", command: "GET_TRANSACTIONS" },
      "*",
    );
  }

  if (msg.action === "TRIGGER_SAVE") {
    window.postMessage(
      {
        type: "ACTUAL_BRIDGE_CMD",
        command: "SAVE_TRANSACTION",
        payload: msg.data,
      },
      "*",
    );
    return;
  }
  if (msg.action === "TRIGGER_IMPORT") {
    window.postMessage(
      {
        type: "ACTUAL_BRIDGE_CMD",
        command: "IMPORT_TRANSACTION",
        payload: msg.data,
      },
      "*",
    );
  }
});

// Proxy messages: Main World -> Isolated -> Background
window.addEventListener("message", (event) => {
  if (event.data.type === "ACTUAL_BRIDGE_DATA") {
    browser.runtime.sendMessage({
      action: "ACTUAL_DATA_RECEIVED",
      data: event.data.payload,
    });
  }
});
