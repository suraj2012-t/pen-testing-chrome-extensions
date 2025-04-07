document.getElementById('clearCookiesButton').addEventListener('click', function() {
  chrome.runtime.sendMessage({ action: "clearCookiesAndLogout" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error:', chrome.runtime.lastError);
    } else {
      console.log('Logout response:', response);
    }
  });
});