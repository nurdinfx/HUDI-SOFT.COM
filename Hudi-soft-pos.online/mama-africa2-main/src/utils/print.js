/**
 * Prints HTML content using a hidden iframe to avoid opening extra windows/tabs.
 * Compatible with Chrome --kiosk-printing flag for true silent printing.
 * @param {string} htmlContent - The full HTML content to print.
 */
export const printToIframe = (htmlContent) => {
  // If running in Electron, use silent printing
  if (window.electronAPI && window.electronAPI.printSilent) {
    window.electronAPI.printSilent(htmlContent);
    return;
  }

  // Remove any existing print iframe to avoid conflicts
  const existing = document.getElementById('__silent_print_iframe__');
  if (existing) existing.remove();

  // Create a hidden iframe embedded in the main page
  // With Chrome --kiosk-printing flag this prints silently with no dialog
  const iframe = document.createElement('iframe');
  iframe.id = '__silent_print_iframe__';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  iframe.onload = () => {
    // Wait for QR codes and images to render before printing
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.warn('Silent print failed:', e);
      }
      // Clean up iframe after print completes
      setTimeout(() => {
        if (document.body.contains(iframe)) iframe.remove();
      }, 2000);
    }, 600);
  };

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();
};

