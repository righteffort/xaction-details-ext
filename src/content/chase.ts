import browser from "webextension-polyfill";

// Inject the main world script
const script = document.createElement("script");
script.src = browser.runtime.getURL("content/injected-actual.js");
script.onload = function () {
  (this as HTMLScriptElement).remove();
};
(document.head || document.documentElement).appendChild(script);

// Proxy messages: Background -> Isolated -> Main World
// eslint-disable-next-line
browser.runtime.onMessage.addListener((msg: any) => {
  if (msg.action === "FETCH_ACTUAL_DATA") {
    window.postMessage(
      { type: "ACTUAL_BRIDGE_CMD", command: "GET_TRANSACTIONS" },
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
