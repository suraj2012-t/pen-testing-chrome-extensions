// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const toolSelector = document.getElementById("toolSelector");
  const scanButton = document.getElementById("scanButton");
  const payloadList = document.getElementById("payloadList");

  console.log("DOM loaded:", { toolSelector, scanButton, payloadList });
  if (!toolSelector || !scanButton || !payloadList) {
    console.error("Missing DOM elements:", { toolSelector, scanButton, payloadList });
    payloadList.innerHTML = "<p>Error: UI elements not found</p>";
    return;
  }

  function loadXssPayloads() {
    console.log("Loading xss.txt...");
    fetch(chrome.runtime.getURL("xss.txt"))
      .then(response => {
        if (!response.ok) throw new Error("Failed to load xss.txt");
        return response.text();
      })
      .then(text => {
        const payloads = text.split("\n").map(line => line.trim()).filter(line => line !== "");
        console.log("Payloads loaded:", payloads.length);
        payloadList.innerHTML = "";
        if (payloads.length === 0) {
          payloadList.innerHTML = "<p>No payloads found in xss.txt</p>";
        } else {
          const container = document.createElement("div");
          container.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 10px;
            max-height: 400px;
            overflow-y: auto;
          `;

          payloads.forEach((payload, index) => {
            const payloadCard = document.createElement("div");
            payloadCard.style.cssText = `
              display: flex;
              align-items: center;
              justify-content: space-between;
              background: #fff8e1;
              border: 1px solid #ffb300;
              border-radius: 5px;
              padding: 10px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              transition: transform 0.2s, box-shadow 0.2s;
            `;
            payloadCard.onmouseover = () => {
              payloadCard.style.transform = "scale(1.02)";
              payloadCard.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
            };
            payloadCard.onmouseout = () => {
              payloadCard.style.transform = "scale(1)";
              payloadCard.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
            };

            const payloadText = document.createElement("span");
            payloadText.textContent = payload;
            payloadText.style.cssText = `
              flex-grow: 1;
              font-family: monospace;
              font-size: 14px;
              color: #333;
              word-break: break-all;
              margin-right: 10px;
            `;

            const copyButton = document.createElement("button");
            copyButton.textContent = "Copy";
            copyButton.style.cssText = `
              background: #ffb300;
              color: white;
              border: none;
              border-radius: 3px;
              padding: 5px 10px;
              cursor: pointer;
              font-size: 12px;
              transition: background 0.3s;
            `;
            copyButton.onmouseover = () => { copyButton.style.background = "#ffca28"; };
            copyButton.onmouseout = () => { copyButton.style.background = "#ffb300"; };

            copyButton.addEventListener("click", () => {
              navigator.clipboard.writeText(payload).then(() => {
                copyButton.textContent = "Copied!";
                copyButton.style.background = "#4CAF50";
                setTimeout(() => {
                  copyButton.textContent = "Copy";
                  copyButton.style.background = "#ffb300";
                }, 1000);
              });
            });

            payloadCard.appendChild(payloadText);
            payloadCard.appendChild(copyButton);
            container.appendChild(payloadCard);
          });

          payloadList.appendChild(container);
        }
      })
      .catch(error => {
        console.error("Error loading xss.txt:", error);
        payloadList.innerHTML = `<p>Error: ${error.message}</p>`;
      });
  }

  // Cookie Analyzer
  function runCookieAnalyzer() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        payloadList.innerHTML = "<p>Error: No active tab</p>";
        return;
      }
      const tabId = tabs[0].id;
      const url = tabs[0].url;
      console.log("Running Storage Analyzer on tab:", tabId, "url:", url);

      chrome.scripting.executeScript({
        target: { tabId },
        function: () => {
          return {
            sessionStorage: Object.entries(sessionStorage),
            localStorage: Object.entries(localStorage)
          };
        }
      }, (results) => {
        if (!results || !results[0] || !results[0].result) {
          console.error("Failed to retrieve storage data");
          payloadList.innerHTML = "<p>Error retrieving storage data</p>";
          return;
        }

        const { sessionStorage, localStorage } = results[0].result;
        console.log("Session Storage:", sessionStorage);
        console.log("Local Storage:", localStorage);

        const jwtPattern = /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/;

        let output = `
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              <tr style="background: #e8f5e9; border-top: 2px dashed #4CAF50;">
                <td colspan="2" class="header-category" style="color: #4CAF50; padding: 10px; font-size: 16px;">Session Storage</td>
              </tr>`;

        if (sessionStorage.length === 0) {
          output += `<tr><td colspan="2" style="padding: 10px; background: #f9f9f9;">No session storage items detected</td></tr>`;
        } else {
          sessionStorage.forEach(([key, value], index) => {
            const rowBgColor = index % 2 === 0 ? '#f5f5dc' : '#e0d5a6';
            const isJwt = jwtPattern.test(value);
            const textColor = isJwt ? 'color: red;' : '';
            
            output += `
              <tr style="background: ${rowBgColor}; border-bottom: 1px solid #ddd;">
                <td style="padding: 10px; width: 20%; ${textColor}"><strong>${key}</strong></td>
                <td style="padding: 10px; width: 80%; ${textColor}">${value}</td>
              </tr>`;
            
            if (isJwt) {
              output += `
                <tr style="background: ${rowBgColor}; border-bottom: 1px solid #ddd;">
                  <td style="padding: 5px 10px; ${textColor}">Issues:</td>
                  <td style="padding: 5px 10px; ${textColor}">JWT Token</td>
                </tr>`;
            }
          });
        }

        output += `
              <tr style="background: #f3e5f5; border-top: 2px dotted #8e24aa;">
                <td colspan="2" class="header-category" style="color: #8e24aa; padding: 10px; font-size: 16px;">Local Storage</td>
              </tr>`;

        if (localStorage.length === 0) {
          output += `<tr><td colspan="2" style="padding: 10px; background: #f9f9f9;">No local storage items detected</td></tr>`;
        } else {
          localStorage.forEach(([key, value], index) => {
            const rowBgColor = index % 2 === 0 ? '#f5f5dc' : '#e0d5a6';
            const isJwt = jwtPattern.test(value);
            const textColor = isJwt ? 'color: red;' : '';
            
            output += `
              <tr style="background: ${rowBgColor}; border-bottom: 1px solid #ddd;">
                <td style="padding: 10px; width: 20%; ${textColor}"><strong>${key}</strong></td>
                <td style="padding: 10px; width: 80%; ${textColor}">${value}</td>
              </tr>`;
            
            if (isJwt) {
              output += `
                <tr style="background: ${rowBgColor}; border-bottom: 1px solid #ddd;">
                  <td style="padding: 5px 10px; ${textColor}">Issues:</td>
                  <td style="padding: 5px 10px; ${textColor}">JWT Token</td>
                </tr>`;
            }
          });
        }

        output += `</tbody></table>`;
        payloadList.innerHTML = output;
      });
    });
  }

  // Open Redirect Analyzer
  function runOpenRedirectAnalyzer() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        payloadList.innerHTML = "<p>Error: No active tab</p>";
        return;
      }
      const tabId = tabs[0].id;

      console.log("Injecting openredirect.js into tab:", tabId);

      chrome.scripting.executeScript({
        target: { tabId },
        files: ["openredirect.js"]
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Script injection failed:", chrome.runtime.lastError.message);
          payloadList.innerHTML = `<p>Error: ${chrome.runtime.lastError.message}</p>`;
        } else {
          console.log("openredirect.js injected successfully");
          payloadList.innerHTML = "<p>Scanning for open redirects...</p>";

          const listener = (message) => {
            if (message.action === "openRedirectScanComplete") {
              if (message.results.length > 0) {
                let resultHTML = "<h3>Open Redirects Found:</h3><ul>";
                message.results.forEach(result => {
                  resultHTML += `<li>Param: <b>${result.param}</b>, URL: <a href="${result.url}" target="_blank">${result.url}</a></li>`;
                });
                resultHTML += "</ul>";
                payloadList.innerHTML = resultHTML;
              } else {
                payloadList.innerHTML = "<p>No Open Redirect vulnerabilities detected.</p>";
              }
              chrome.runtime.onMessage.removeListener(listener);
            }
          };

          chrome.runtime.onMessage.addListener(listener);

          setTimeout(() => {
            if (payloadList.innerHTML === "<p>Scanning for open redirects...</p>") {
              payloadList.innerHTML = "<p>Scan likely complete. Check console for more info.</p>";
              chrome.runtime.onMessage.removeListener(listener);
            }
          }, 5000);
        }
      });
    });
  }

  // HTTP Methods Scanner
  function runHttpMethodsScanner() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        payloadList.innerHTML = "<p>Error: No active tab</p>";
        return;
      }
      const tabId = tabs[0].id;

      console.log("Injecting httpchecker.js into tab:", tabId);

      chrome.scripting.executeScript({
        target: { tabId },
        files: ["httpchecker.js"]
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Script injection failed:", chrome.runtime.lastError.message);
          payloadList.innerHTML = `<p>Error: ${chrome.runtime.lastError.message}</p>`;
        } else {
          console.log("httpchecker.js injected successfully");
          payloadList.innerHTML = "<p>Scanning HTTP methods...</p>";

          const listener = (message) => {
            if (message.action === "httpMethodsScanComplete") {
              console.log("Scan completed, results sent to tab console");
              payloadList.innerHTML = "<p>Scan complete. Check console for more info.</p>";
              chrome.runtime.onMessage.removeListener(listener);
            }
          };
          chrome.runtime.onMessage.addListener(listener);

          setTimeout(() => {
            if (payloadList.innerHTML === "<p>Scanning HTTP methods...</p>") {
              payloadList.innerHTML = "<p>Scan likely complete. Check console for more info.</p>";
              chrome.runtime.onMessage.removeListener(listener);
            }
          }, 5000);
        }
      });
    });
  }

  toolSelector.addEventListener("change", () => {
    const selectedTool = toolSelector.value;
    console.log("Tool changed to:", selectedTool);
    payloadList.innerHTML = "";
    if (selectedTool === "xss") {
      scanButton.style.display = "none";
      loadXssPayloads();
    } else {
      scanButton.style.display = "block";
      payloadList.innerHTML = "<p>Click Scan to run the test.</p>";
    }
  });

  scanButton.addEventListener("click", () => {
    const selectedTool = toolSelector.value;
    console.log("Scan button clicked for:", selectedTool);
    payloadList.innerHTML = `<p>Scanning for ${selectedTool}...</p>`;
    if (selectedTool === "headers") {
      runHeaderAnalyzer(payloadList); // Call the function from headerAnalyzer.js
    } else if (selectedTool === "cookies") {
      runCookieAnalyzer();
    } else if (selectedTool === "openredirect") {
      runOpenRedirectAnalyzer();
    } else if (selectedTool === "httpmethods") {
      runHttpMethodsScanner();
    } else {
      payloadList.innerHTML = `<p>Scanning ${selectedTool}... This is a test!</p>`;
    }
  });

  console.log("Initial tool:", toolSelector.value);
  if (toolSelector.value === "xss") {
    scanButton.style.display = "none";
    loadXssPayloads();
  } else {
    scanButton.style.display = "block";
    payloadList.innerHTML = "<p>Click Scan to run the test.</p>";
  }
});