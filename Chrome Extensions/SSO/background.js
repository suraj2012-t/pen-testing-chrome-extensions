chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "clearCookiesAndLogout") {
    clearCookiesAndLogout()
      .then((result) => sendResponse({ success: true, message: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Indicates async response
  }
});

async function clearCookiesAndLogout() {
  try {
    // Step 1: Get the current tab's URL to check if it's an SSO URL
    const [currentTab] = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });

    let ssoUrl = 'https://ssoprep.capgemini.com/idp/startSLO.ping'; // Default logout URL
    if (currentTab?.url?.includes('signin.capgemini.com')) {
      ssoUrl = currentTab.url; // Use the current SSO URL if available
      console.log('Captured SSO URL:', ssoUrl);
    }

    // Step 2: Get and clear all cookies
    const cookies = await new Promise((resolve) => {
      chrome.cookies.getAll({}, resolve);
    });

    if (!cookies || cookies.length === 0) {
      console.log("No cookies found to clear.");
    } else {
      const removalPromises = cookies.map(cookie => {
        const url = `${cookie.secure ? 'https://' : 'http://'}${cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain}${cookie.path}`;
        return new Promise((resolve) => {
          chrome.cookies.remove({ url: url, name: cookie.name }, resolve);
        });
      });
      await Promise.all(removalPromises);
      console.log(`Cleared ${cookies.length} cookies`);
    }

    // Step 3: Clear additional storage
    await new Promise((resolve) => {
      chrome.browsingData.remove({
        since: 0
      }, {
        localStorage: true,
        sessionStorage: true
      }, resolve);
    });

    // Step 4: Navigate to the SSO URL (either captured or default)
    await new Promise((resolve) => {
      chrome.tabs.update({
        url: ssoUrl
      }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error('Tab update error:', chrome.runtime.lastError);
          // Fallback to default logout URL if the captured URL fails
          chrome.tabs.update({
            url: 'https://ssoprep.capgemini.com/idp/startSLO.ping'
          }, () => setTimeout(resolve, 1000));
        } else {
          setTimeout(resolve, 1000); // Wait for navigation
        }
      });
    });

    return `Logout completed using URL: ${ssoUrl}`;
  } catch (error) {
    console.error('Error in clearCookiesAndLogout:', error);
    throw error;
  }
}