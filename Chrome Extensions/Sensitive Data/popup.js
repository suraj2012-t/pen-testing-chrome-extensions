document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup.js loaded - starting scan");

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    const currentPageUrl = tab.url;
    document.getElementById("url").textContent = `Scanning: ${currentPageUrl}`;
    console.log("Current page URL:", currentPageUrl);

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "Scanning...";
    resultsDiv.style.cssText = `
      flex-grow: 1;
      overflow-y: auto;
    `;

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: getPageSourceAndScripts
    }, (results) => {
      if (!results || !results[0] || !results[0].result) {
        console.error("Script execution failed or returned no result");
        resultsDiv.textContent = "Error: Unable to scan page";
        return;
      }

      const { pageSource, scriptSrcs } = results[0].result;
      console.log("HTML length:", pageSource.length, "Script sources:", scriptSrcs);

      const findings = {};
      const patterns = {
        emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        passwords: /\b(password|passwd|pwd)\s*[:=]\s*['"]?([^'"\s]{6,})['"]?/gi,
        tokens: /\b(eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+)\b/g,
        apiKeys: /\b(api[-_]?key|token)\s*[:=]\s*['"]?[a-zA-Z0-9]{16,64}['"]?/gi,
        usernames: /\b(username|user|login)\s*[:=]\s*['"]?([a-zA-Z0-9_-]{4,})['"]?/gi,
        creditCards: /\b(?:\d[ -]*?){13,16}\b/g,
        ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
        phoneNumbers: /\b(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g
      };

      // Scan and display HTML findings immediately
      for (const [type, regex] of Object.entries(patterns)) {
        const matches = pageSource.match(regex);
        if (matches) {
          console.log(`Found ${matches.length} ${type} in HTML`);
          findings[type] = (findings[type] || []).concat(matches.map(value => ({ value, location: currentPageUrl })));
        }
      }
      renderFindings(findings);

      // Scan JS files with timeout
      const fetchWithTimeout = (url, timeout = 3000) => {
        return Promise.race([
          fetch(url),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeout))
        ]);
      };

      scriptSrcs.forEach(src => {
        fetchWithTimeout(src)
          .then(response => response.text())
          .then(scriptContent => {
            console.log(`Fetched ${src}, content length: ${scriptContent.length}`);
            const jsFindings = {};
            for (const [type, regex] of Object.entries(patterns)) {
              const matches = scriptContent.match(regex);
              if (matches) {
                console.log(`Found ${matches.length} ${type} in ${src}`);
                jsFindings[type] = matches.map(value => ({ value, location: src }));
              }
            }
            if (Object.keys(jsFindings).length > 0) {
              for (const [type, matches] of Object.entries(jsFindings)) {
                findings[type] = (findings[type] || []).concat(matches);
              }
              renderFindings(findings);
            }
          })
          .catch(err => console.log(`Skipped ${src}: ${err.message}`));
      });
    });

    function renderFindings(findings) {
      resultsDiv.innerHTML = ""; // Clear previous content
      if (Object.keys(findings).length === 0) {
        resultsDiv.textContent = "No sensitive data found yet...";
        return;
      }

      console.log("Rendering findings:", findings);
      for (const [type, matches] of Object.entries(findings)) {
        let section = resultsDiv.querySelector(`.finding-section[data-type="${type}"]`);
        if (!section) {
          section = document.createElement("div");
          section.className = "finding-section";
          section.dataset.type = type;
          const title = document.createElement("h3");
          title.textContent = type.charAt(0).toUpperCase() + type.slice(1);
          section.appendChild(title);
          resultsDiv.appendChild(section);
        }

        matches.forEach(({ value, location }) => {
          // Avoid duplicates
          if (section.querySelector(`[data-value="${value}"][data-location="${location}"]`)) return;

          const item = document.createElement("div");
          item.style.cssText = `
            display: flex;
            flex-direction: column;
            background: #fff8e1;
            border: 1px solid #ffb300;
            border-radius: 8px;
            padding: 8px;
            margin: 2px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
            word-break: break-all;
          `;
          item.dataset.value = value;
          item.dataset.location = location;
          item.onmouseover = () => {
            item.style.transform = "scale(1.02)";
            item.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
          };
          item.onmouseout = () => {
            item.style.transform = "scale(1)";
            item.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
          };

          const content = document.createElement("div");
          content.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
          `;

          const text = document.createElement("span");
          text.textContent = value;
          text.style.cssText = `
            flex-grow: 1;
            font-family: monospace;
            font-size: 14px;
            color: #333;
            margin-right: 10px;
            word-wrap: break-word;
          `;
          content.appendChild(text);

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
            navigator.clipboard.writeText(value).then(() => {
              copyButton.textContent = "Copied!";
              copyButton.style.background = "#4CAF50";
              setTimeout(() => {
                copyButton.textContent = "Copy";
                copyButton.style.background = "#ffb300";
              }, 1000);
            });
          });
          content.appendChild(copyButton);

          item.appendChild(content);

          const filePath = document.createElement("span");
          filePath.textContent = `Found in: ${location}`;
          filePath.className = "file-path";
          filePath.addEventListener("click", () => {
            console.log("Opening view-source for:", location);
            chrome.tabs.create({ url: `view-source:${location}` });
          });
          item.appendChild(filePath);

          section.appendChild(item);
        });
      }
    }
  });
});

function getPageSourceAndScripts() {
  return {
    pageSource: document.documentElement.outerHTML,
    scriptSrcs: Array.from(document.getElementsByTagName("script"))
      .filter(script => script.src)
      .map(script => script.src)
  };
}