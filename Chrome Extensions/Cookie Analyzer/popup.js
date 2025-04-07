document.addEventListener('DOMContentLoaded', () => {
  const totalLengthDiv = document.getElementById('totalLength');
  const increaseBtn = document.getElementById('increaseBtn');
  const removeBtn = document.getElementById('removeBtn');
  const updateStatusDiv = document.getElementById('updateStatus');

  const COOKIE_PREFIX = 'randCookie_';
  const MAX_TOTAL_LENGTH = 128 * 1024; // 128KB total for random cookies
  const NEW_COOKIE_LENGTH = 4000; // 4000 characters (~4KB), safely under the 4096 bytes limit

  // Utility: Generate a random alphanumeric string of a given length
  function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  // Update the displayed total length of all cookies for the current domain
  function updateTotalLength() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs.length) return;
      const currentUrl = new URL(tabs[0].url);
      const domain = currentUrl.hostname;
      chrome.cookies.getAll({ domain: domain }, (cookies) => {
        let totalLength = 0;
        cookies.forEach(cookie => {
          totalLength += cookie.value.length;
        });
        totalLengthDiv.textContent = `Total Length: ${totalLength} bytes`;
      });
    });
  }

  // Create a new random cookie with NEW_COOKIE_LENGTH characters if within limits
  function createRandomCookie() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs.length) return;
      const currentUrl = new URL(tabs[0].url);
      const origin = currentUrl.origin;
      const domain = currentUrl.hostname;
      
      // Calculate current total length of our random cookies only
      chrome.cookies.getAll({ domain: domain }, (cookies) => {
        let currentTotal = 0;
        cookies.forEach(cookie => {
          if (cookie.name.startsWith(COOKIE_PREFIX)) {
            currentTotal += cookie.value.length;
          }
        });
        if (currentTotal + NEW_COOKIE_LENGTH > MAX_TOTAL_LENGTH) {
          updateStatusDiv.textContent = "Maximum total random cookie length reached (128KB).";
          return;
        }
        // Create a unique cookie name using timestamp
        const cookieName = `${COOKIE_PREFIX}${Date.now()}`;
        const newValue = generateRandomString(NEW_COOKIE_LENGTH);
  
        chrome.cookies.set({
          url: origin,
          name: cookieName,
          value: newValue,
          path: '/'
        }, (cookie) => {
          if (chrome.runtime.lastError) {
            console.error('Error setting cookie:', chrome.runtime.lastError.message);
            updateStatusDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
          } else {
            updateStatusDiv.textContent = `Cookie "${cookieName}" added.`;
            updateTotalLength();
          }
        });
      });
    });
  }

  // Remove all cookies that have our designated prefix
  function removeRandomCookies() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs.length) return;
      const currentUrl = new URL(tabs[0].url);
      const origin = currentUrl.origin;
      const domain = currentUrl.hostname;
      
      chrome.cookies.getAll({ domain: domain }, (cookies) => {
        const removalPromises = [];
        cookies.forEach(cookie => {
          if (cookie.name.startsWith(COOKIE_PREFIX)) {
            removalPromises.push(new Promise((resolve) => {
              chrome.cookies.remove({
                url: origin,
                name: cookie.name
              }, () => resolve());
            }));
          }
        });
        Promise.all(removalPromises).then(() => {
          updateStatusDiv.textContent = "All random cookies removed.";
          updateTotalLength();
        });
      });
    });
  }

  // Attach event listeners
  increaseBtn.addEventListener('click', createRandomCookie);
  removeBtn.addEventListener('click', removeRandomCookies);

  // Initial update of total cookie length when popup loads
  updateTotalLength();
});
