chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleProxy') {
    if (message.enabled) {
      const proxySettings = {
        mode: 'fixed_servers',
        rules: {
          singleProxy: {
            scheme: 'http',
            host: '127.0.0.1',
            port: 8080
          },
          bypassList: ['<local>']
        }
      };
      chrome.proxy.settings.set(
        { value: proxySettings, scope: 'regular' },
        () => {
          console.log('Proxy enabled');
          sendResponse({ status: 'success' });
        }
      );
    } else {
      chrome.proxy.settings.clear(
        { scope: 'regular' },
        () => {
          console.log('Proxy disabled');
          sendResponse({ status: 'success' });
        }
      );
    }
    return true; // Keep channel open for async response
  }
});

chrome.proxy.onProxyError.addListener((error) => {
  console.error('Proxy error:', error);
});