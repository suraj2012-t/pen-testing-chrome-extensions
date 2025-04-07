// httpchecker.js
(async function () {
  const url = window.location.href;

  const methods = [
    "OPTIONS", "GET", "HEAD", "POST", "PUT", "DELETE", "TRACE", "TRACK", "DEBUG", "PURGE",
    "CONNECT", "PROPFIND", "PROPPATCH", "MKCOL", "COPY", "MOVE", "LOCK", "UNLOCK",
    "VERSION-CONTROL", "REPORT", "CHECKOUT", "CHECKIN", "UNCHECKOUT", "MKWORKSPACE",
    "UPDATE", "LABEL", "MERGE", "BASELINE-CONTROL", "MKACTIVITY", "ORDERPATCH", "ACL",
    "PATCH", "SEARCH", "ARBITRARY", "BIND", "LINK", "MKCALENDAR", "MKREDIRECTREF", "PRI",
    "QUERY", "REBIND", "UNBIND", "UNLINK", "UPDATEREDIRECTREF"
  ];

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  function isUnsupportedMethod(method) {
    try {
      new Request(url, { method });
      return false;
    } catch (error) {
      console.warn(`Skipping unsupported method: ${method}`);
      return true;
    }
  }

  async function testMethod(method) {
    if (isUnsupportedMethod(method)) {
      return {
        method,
        allowed: false,
        status: "Unsupported by browser"
      };
    }

    try {
      let response = await fetch(url, {
        method: method,
        mode: "cors",
        credentials: "include",
        redirect: "manual"
      });
      return {
        method,
        allowed: response.ok, // Only 200-299 are allowed, not 405
        status: response.status
      };
    } catch (error) {
      console.error(`Error with ${method}:`, error);
      try {
        let response = await fetch(url, {
          method: method,
          mode: "no-cors",
          redirect: "manual"
        });
        return {
          method,
          allowed: true, // Opaque responses still assumed allowed
          status: "Opaque (assumed allowed)"
        };
      } catch (fallbackError) {
        console.error(`Fallback error for ${method}:`, fallbackError);
        return {
          method,
          allowed: false,
          status: `Error: ${fallbackError.message}`
        };
      }
    }
  }

  let results = [];
  for (let method of methods) {
    let result = await testMethod(method);
    results.push(result);
    await delay(0);
  }

  console.log("Final results:", results);

  chrome.runtime.sendMessage(
    {
      action: "httpMethodsScanComplete",
      results: results
    },
    () => {
      if (chrome.runtime.lastError) {
        console.warn("Message not received by extension:", chrome.runtime.lastError.message);
      }
    }
  );
})();