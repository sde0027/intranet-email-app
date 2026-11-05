const CHANNEL_NAME = "intranet-session-sync";
const STORAGE_KEY = "intranet-session-sync-event";
const EVENT_NAME = "intranet:session-invalidated";
let senderChannel = null;

/**
 * Notify this tab and every other tab in the same browser profile that the
 * authenticated browser session must no longer be displayed.
 * No credentials or user data are sent through the browser messaging APIs.
 */
function broadcastSessionEvent(message) {
  // Broadcast only to sibling tabs. The tab that initiated the action updates
  // its own React state directly and must not invalidate itself.
  if (typeof BroadcastChannel !== "undefined") {
    senderChannel ??= new BroadcastChannel(CHANNEL_NAME);
    senderChannel.postMessage(message);
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(message));
  } catch {
    // The initiating tab still updates its own state if storage is blocked.
  }
}

export function notifySessionInvalidated(reason = "session-ended") {
  const message = {
    type: "SESSION_INVALIDATED",
    reason,
    timestamp: Date.now(),
  };
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: message }));
  broadcastSessionEvent(message);
}

export function notifySessionAuthenticated(reason = "signed-in") {
  broadcastSessionEvent({
    type: "SESSION_AUTHENTICATED",
    reason,
    timestamp: Date.now(),
  });
}

export function subscribeToSessionInvalidation(callback) {
  const handleMessage = (message) => {
    if (
      ["SESSION_INVALIDATED", "SESSION_AUTHENTICATED"].includes(message?.type)
    )
      callback(message);
  };

  const handleLocalEvent = (event) => handleMessage(event.detail);
  window.addEventListener(EVENT_NAME, handleLocalEvent);

  let channel;
  let handleStorage;

  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", (event) => handleMessage(event.data));
  } else {
    handleStorage = (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        handleMessage(JSON.parse(event.newValue));
      } catch {
        // Ignore malformed cross-tab messages.
      }
    };
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    window.removeEventListener(EVENT_NAME, handleLocalEvent);
    if (channel) channel.close();
    if (handleStorage) window.removeEventListener("storage", handleStorage);
  };
}
