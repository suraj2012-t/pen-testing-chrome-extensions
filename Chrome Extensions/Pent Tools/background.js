const tabHeadersMap = {};

chrome.webRequest.onHeadersReceived.addListener(
  function(details) {
    if (details.type === "main_frame") {
      tabHeadersMap[details.tabId] = details.responseHeaders;
    }
  },
  { urls: ["<all_urls>"], types: ["main_frame"] },
  ["responseHeaders"]
);

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "getHeaders") {
    const tabId = message.tabId;
    const headers = tabHeadersMap[tabId] || [];
    sendResponse({ headers });
  }
  return true;
});