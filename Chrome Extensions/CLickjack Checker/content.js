if (window.top !== window.self) {
  const hasContent = document.body && document.body.innerHTML.trim().length > 0;
  chrome.runtime.sendMessage({
    action: "iframeContentCheck",
    loadedWithContent: hasContent
  });
}