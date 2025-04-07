document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('toggleButton');

  // Set initial state immediately, then update from storage
  button.textContent = 'Enable Proxy'; // Default state
  chrome.storage.local.get(['proxyEnabled'], (result) => {
    const isEnabled = result.proxyEnabled || false; // Default to false if undefined
    button.textContent = isEnabled ? 'Disable Proxy' : 'Enable Proxy';
    button.classList.toggle('enabled', isEnabled);
  });

  button.addEventListener('click', () => {
    button.disabled = true; // Prevent multiple clicks during transition
    chrome.storage.local.get(['proxyEnabled'], (result) => {
      const newState = !result.proxyEnabled;
      chrome.storage.local.set({ proxyEnabled: newState }, () => {
        button.textContent = newState ? 'Disable Proxy' : 'Enable Proxy';
        button.classList.toggle('enabled', newState);
        chrome.runtime.sendMessage({ action: 'toggleProxy', enabled: newState }, () => {
          button.disabled = false; // Re-enable after message is sent
        });
      });
    });
  });
});