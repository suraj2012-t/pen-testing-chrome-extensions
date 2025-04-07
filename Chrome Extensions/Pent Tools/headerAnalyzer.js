// headerAnalyzer.js
function runHeaderAnalyzer(payloadList) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      payloadList.innerHTML = "<p>Error: No active tab</p>";
      return;
    }
    const tabId = tabs[0].id;
    const url = tabs[0].url;
    console.log("Running Header Analyzer on tab:", tabId, "url:", url);

    chrome.runtime.sendMessage({ action: "getHeaders", tabId: tabId }, (response) => {
      if (!response || !response.headers || response.headers.length === 0) {
        payloadList.innerHTML = "<p>No headers captured. Try reloading the page.</p>";
        return;
      }

      console.log("Raw headers received:", response.headers);

      const securityHeaders = {
        "cache-control": { present: false, value: "", recommended: "no-store, no-cache, must-revalidate" },
        "content-security-policy": { present: false, value: "", recommended: "default-src 'self'" },
        "permissions-policy": { present: false, value: "", recommended: "" },
        "referrer-policy": { present: false, value: "", recommended: "strict-origin-when-cross-origin" },
        "strict-transport-security": { present: false, value: "", recommended: "max-age=31536000; includeSubDomains" },
        "x-content-type-options": { present: false, value: "", recommended: "nosniff" },
        "x-frame-options": { present: false, value: "", recommended: "DENY or SAMEORIGIN" },
        "x-xss-protection": { present: false, value: "", recommended: "1; mode=block" },
        "access-control-allow-headers": { present: false, value: "", recommended: "Specific Domain" }
      };

      const sensitiveHeaders = ["server", "x-powered-by", "x-aspnet-version", "x-aspnetmvc-version", "x-runtime", "x-version"];
      let disclosedSensitive = [];
      let allHeaders = [];
      let misconfiguredHeaders = [];

      const headerAliases = {
        "strict-transport-security": [
          "strict-transport-security",
          "strict transport security",
          "strict-transport header",
          "strict transports header"
        ]
      };

      function matchSecurityHeader(name) {
        const lowerName = name.toLowerCase();
        for (const [canonical, aliases] of Object.entries(headerAliases)) {
          if (aliases.includes(lowerName)) {
            return canonical;
          }
        }
        return securityHeaders.hasOwnProperty(lowerName) ? lowerName : null;
      }

      response.headers.forEach(header => {
        const name = header.name.toLowerCase();
        const value = header.value;

        const matchedHeader = matchSecurityHeader(name);
        if (matchedHeader) {
          securityHeaders[matchedHeader].present = true;
          securityHeaders[matchedHeader].value = value;
        }

        if (sensitiveHeaders.includes(name)) {
          disclosedSensitive.push({ name: name.toUpperCase(), value });
        }
        allHeaders.push({ name: name.toUpperCase(), value });

        if (name === "content-security-policy" && (value.includes("unsafe-inline") || value.includes("unsafe-eval"))) {
          misconfiguredHeaders.push({ name: name.toUpperCase(), current: value, issue: "Contains 'unsafe-inline' or 'unsafe-eval'." });
        }
        if (name === "cache-control" && value.includes("public")) {
          misconfiguredHeaders.push({ name: name.toUpperCase(), current: value, issue: "Should not be 'public' for intranet security." });
        }
        if (name === "referrer-policy" && (value === "no-referrer-when-downgrade" || value === "unsafe-url")) {
          misconfiguredHeaders.push({ name: name.toUpperCase(), current: value, issue: "Weak referrer-policy detected." });
        }
      });

      let output = `
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>`;

      // Missing Security Headers
      output += `<tr style="background: #ffebee; border-top: 2px solid #d32f2f;">
                  <td colspan="2" class="header-category" style="color: #d32f2f;">Missing Security Headers</td>
                </tr>`;
      let missingFound = false;
      for (const [key, info] of Object.entries(securityHeaders)) {
        if (!info.present) {
          const recommendedText = info.recommended ? ` - Recommended: ${info.recommended}` : "";
          output += `<tr>
                      <td style="width: 30%;"><strong>${key.toUpperCase()}</strong></td>
                      <td style="width: 70%;"><span class="vulnerable">Missing</span>${recommendedText}</td>
                    </tr>`;
          missingFound = true;
        }
      }
      if (!missingFound) {
        output += `<tr><td colspan="2">None</td></tr>`;
      }

      // Misconfigured Headers
      output += `<tr style="background: #fff3e0; border-top: 2px solid #f57c00;">
                  <td colspan="2" class="header-category" style="color: #f57c00;">Misconfigured Headers</td>
                </tr>`;
      if (misconfiguredHeaders.length > 0) {
        misconfiguredHeaders.forEach(item => {
          output += `<tr>
                      <td style="width: 30%;"><strong>${item.name}</strong></td>
                      <td style="width: 70%;"><span class="vulnerable">Current: ${item.current}</span> - Issue: <strong>${item.issue}</strong></td>
                    </tr>`;
        });
      } else {
        output += `<tr><td colspan="2">None</td></tr>`;
      }

      // Sensitive Headers Disclosed
      output += `<tr style="background: #f5f5f5; border-top: 2px dashed #616161;">
                  <td colspan="2" class="header-category" style="color: #616161;">Sensitive Headers Disclosed</td>
                </tr>`;
      if (disclosedSensitive.length > 0) {
        disclosedSensitive.forEach(item => {
          output += `<tr>
                      <td style="width: 30%;"><strong>${item.name}</strong></td>
                      <td style="width: 70%;">${item.value}</td>
                    </tr>`;
        });
      } else {
        output += `<tr><td colspan="2">None</td></tr>`;
      }

      // All Headers (No separate scrollable div)
      output += `<tr style="background: #e8eaf6; border-top: 2px dotted #3f51b5;">
                  <td colspan="2" class="header-category" style="color: #3f51b5;">All Headers</td>
                </tr>`;
      allHeaders.forEach(header => {
        output += `<tr>
                    <td style="width: 30%;"><strong>${header.name}</strong></td>
                    <td style="width: 70%;">${header.value}</td>
                  </tr>`;
      });

      output += `</tbody></table>`;
      payloadList.innerHTML = output;

      // Apply beige background and rounded corners, but let popup.html handle scrolling
      payloadList.style.backgroundColor = "#f5f5dc";
      payloadList.style.borderRadius = "10px";
      payloadList.style.border = "1px solid #ddd";
      // Removed 'overflow: hidden' to preserve popup.html's overflow-y: auto
    });
  });
}