document.addEventListener("DOMContentLoaded", () => {
  const urlDiv = document.getElementById("url");
  const statusItem = document.querySelector("#status .item");
  const headersItem = document.querySelector("#headers .item");
  const targetFrame = document.getElementById("targetFrame");
  const loaderDiv = document.getElementById("loader");

  const loadTimeout = 5000;
  let testComplete = false;

  function checkHeaders(url) {
    fetch(url, { method: "HEAD" })
      .then(response => {
        const xFrameHeader = response.headers.get("X-Frame-Options") || "Not set";
        const cspHeader = response.headers.get("Content-Security-Policy") || "Not set";

        headersItem.innerHTML = `<strong>X-Frame-Options:</strong> ${xFrameHeader}<br>
                                 <strong>Content-Security-Policy:</strong> ${cspHeader}`;

        // Determine vulnerability based on headers
        const xFrame = xFrameHeader.toUpperCase();
        const csp = cspHeader.toLowerCase();
        const protectionFromHeaders =
          (xFrame.includes("DENY") || xFrame.includes("SAMEORIGIN")) ||
          (csp.includes("frame-ancestors") && !csp.includes("frame-ancestors *"));

        if (protectionFromHeaders) {
          statusItem.textContent = "Not vulnerable: Headers prevent framing.";
          statusItem.classList.add("protected");
          loaderDiv.style.display = "none";
          testComplete = true; // Mark as complete
        } else if (xFrameHeader === "Not set" && cspHeader === "Not set") {
          statusItem.textContent = "Vulnerable to clickjacking: No protection headers.";
          statusItem.classList.add("vulnerable");
          loaderDiv.style.display = "none";
          testComplete = true; // Mark as complete
        }
      })
      .catch(err => {
        console.error("Error fetching headers:", err);
        headersItem.textContent = "Could not retrieve headers.";
      });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "iframeContentCheck" && !testComplete) {
      testComplete = true;
      loaderDiv.style.display = "none";

      if (message.loadedWithContent) {
        statusItem.textContent = "Vulnerable to clickjacking: Site loaded in frame.";
        statusItem.classList.add("vulnerable");
      } else {
        statusItem.textContent = "Not vulnerable: Site refused to load content.";
        statusItem.classList.add("protected");
      }
    }
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      loaderDiv.style.display = "none";
      statusItem.textContent = "Error: No active tab found.";
      statusItem.classList.add("vulnerable");
      return;
    }

    const url = tabs[0].url;
    urlDiv.textContent = `Testing: ${url}`;
    targetFrame.src = url;
    checkHeaders(url);

    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ["content.js"]
    }).catch(err => {
      console.error("Script injection error:", err);
      loaderDiv.style.display = "none";
      statusItem.textContent = "Error: Could not test iframe.";
      statusItem.classList.add("vulnerable");
    });

    setTimeout(() => {
      if (!testComplete) {
        loaderDiv.style.display = "none";
        statusItem.textContent = "Inconclusive: Could not determine status.";
        statusItem.classList.add("inconclusive");
      }
    }, loadTimeout);
  });
});
