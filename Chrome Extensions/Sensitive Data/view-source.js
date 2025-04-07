chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { fileUrl, highlight } = message;

  fetch(fileUrl)
    .then(response => response.text())
    .then(content => {
      const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedHighlight, 'g');
      const highlightedContent = content.replace(regex, `<span class="highlight">${highlight}</span>`);
      document.getElementById("source").innerHTML = highlightedContent;
    })
    .catch(err => {
      document.getElementById("source").textContent = `Error loading source: ${err}`;
    });
});