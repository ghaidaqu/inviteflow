/**
 * navigator.clipboard.writeText() silently rejects in some genuinely
 * common contexts this app's links get opened in — most notably
 * WhatsApp's own in-app browser (where a guest actually taps their
 * invitation link from), which blocks the Clipboard API entirely for
 * security reasons. With no fallback, the "copy link" buttons looked
 * broken there — no error, just nothing happened, since the failed
 * promise was never caught. Falls back to the older execCommand('copy')
 * trick (a temporary, invisible, selected textarea), which still works in
 * several of those restrictive contexts even when the modern API doesn't.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy method below.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
