// reviews.js
// Clean, fixed, and more robust rewrite of your original script.
// Assumes `db` is exported from ./firebaseConfig.js and that you load
// the Firestore functions the same way you did before.

import { db } from "./firebaseConfig.js";
import {
  addDoc,
  collection
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

/* ---------------------------
   DOM references
   --------------------------- */
const NameEl = document.querySelector('.name');
const EmailEl = document.querySelector('.email');
const TxtEl = document.querySelector('textarea');
const ButtonEl = document.querySelector('.button');

const NotifyEl = document.querySelector('.noffty');
const ProcessEl = document.querySelector('.processing');

/* ---------------------------
   Constants & keys
   --------------------------- */
const LOCAL_QUEUE_KEY = 'studReview';
const IDB_DB_NAME = 'AdexUsers';
const IDB_STORE_NAME = 'users';
const IDB_VERSION = 2;
const FIRESTORE_COLLECTION = 'reviewDB';

/* ---------------------------
   Utility: show notification
   --------------------------- */
let notifyTimer = null;
function status(success, message) {
  if (!NotifyEl) return;
  clearTimeout(notifyTimer);

  NotifyEl.style.bottom = '10px';
  NotifyEl.style.color = success ? 'lightgreen' : 'red';
  NotifyEl.classList.toggle('succ', success);
  NotifyEl.classList.toggle('err', !success);
  NotifyEl.textContent = message;

  notifyTimer = setTimeout(() => {
    NotifyEl.style.bottom = '-100%';
  }, 5000);
}

/* ---------------------------
   Utility: show processing panel
   --------------------------- */
let processTimer = null;
function processMessage(success, htmlOrText) {
  if (!ProcessEl) return;
  clearTimeout(processTimer);

  ProcessEl.style.display = 'flex';
  ProcessEl.style.color = success ? '#4fef32' : 'red';
  if (typeof htmlOrText === 'string' && htmlOrText.trim().startsWith('<')) {
    ProcessEl.innerHTML = htmlOrText;
  } else {
    ProcessEl.textContent = htmlOrText;
  }

  processTimer = setTimeout(() => {
    ProcessEl.style.display = 'none';
  }, 5000);
}

/* ---------------------------
   Update UI with user info
   --------------------------- */
function updateUserUI(name, email) {
  if (NameEl) NameEl.textContent = name || '';
  if (EmailEl) EmailEl.textContent = email || '';
}

/* ---------------------------
   IndexedDB: read currentUser
   Returns a Promise that resolves to the stored user object or null
   --------------------------- */
function readCurrentUserFromIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DB_NAME, IDB_VERSION);

    request.onupgradeneeded = function (e) {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };

    request.onsuccess = function (e) {
      try {
        const db = e.target.result;
        const trx = db.transaction(IDB_STORE_NAME, 'readonly');
        const store = trx.objectStore(IDB_STORE_NAME);
        const getReq = store.get('currentUser');

        getReq.onsuccess = function () {
          resolve(getReq.result || null);
        };

        getReq.onerror = function (evt) {
          console.error('IndexedDB get error', evt);
          resolve(null); // don't reject — just treat as no user
        };
      } catch (err) {
        console.error('IndexedDB read error', err);
        resolve(null);
      }
    };

    request.onerror = function (e) {
      console.error('IndexedDB open error', e);
      resolve(null);
    };
  });
}

/* ---------------------------
   Local queue helpers
   --------------------------- */
function readLocalQueue() {
  try {
    const raw = localStorage.getItem(LOCAL_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to parse local queue', err);
    return [];
  }
}

function pushToLocalQueue(item) {
  const queue = readLocalQueue();
  queue.push(item);
  try {
    localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to write to localStorage queue', err);
  }
}

function clearLocalQueue() {
  localStorage.removeItem(LOCAL_QUEUE_KEY);
}

/* ---------------------------
   Firestore: send single review
   --------------------------- */
async function sendReviewToFirestore(reviewObj) {
  try {
    const collectRef = collection(db, FIRESTORE_COLLECTION);
    const docRef = await addDoc(collectRef, reviewObj);
    console.log('Uploaded review to Firestore, id:', docRef.id);
    return true;
  } catch (err) {
    console.error('Failed to send review to Firestore', err);
    throw err;
  }
}

/* ---------------------------
   Network probe: verify usable connection
   This tries a lightweight request to Google's generate_204 endpoint.
   Use try/catch; return boolean.
   --------------------------- */
async function isReallyOnline() {
  try {
    // `no-cors` mode yields an opaque response but will throw if blocked,
    // so we use it as a pragmatic probe for many browsers/environments.
    await fetch('https://www.gstatic.com/generate_204', {
      method: 'GET',
      cache: 'no-cache',
      mode: 'no-cors'
    });
    return true;
  } catch (err) {
    console.warn('Network probe failed', err);
    return false;
  }
}

/* ---------------------------
   Sync: attempt to upload queued reviews
   --------------------------- */
let syncing = false;
async function syncQueuedReviews() {
  if (syncing) return;
  syncing = true;

  const queue = readLocalQueue();
  if (!queue.length) {
    syncing = false;
    return;
  }

  const usable = await isReallyOnline();
  if (!usable) {
    console.log('Still offline — aborting sync');
    syncing = false;
    return;
  }

  processMessage(true, 'Syncing saved reviews — please wait...');

  // Send sequentially (so partial failures won't lose data)
  const remaining = [];
  for (const item of queue) {
    try {
      await sendReviewToFirestore(item);
    } catch (err) {
      // keep this item for retry later
      remaining.push(item);
    }
  }

  if (remaining.length === 0) {
    clearLocalQueue();
    status(true, 'All offline reviews synced');
  } else {
    try {
      localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(remaining));
    } catch (err) {
      console.error('Failed to update local queue after partial sync', err);
    }
    status(false, `${remaining.length} review(s) failed to sync`);
  }

  syncing = false;
}

/* ---------------------------
   Form submit handler
   --------------------------- */
async function handleSubmit() {
  const text = TxtEl?.value?.trim() ?? '';
  const name = NameEl?.textContent?.trim() ?? '';
  const email = EmailEl?.textContent?.trim() ?? '';

  // Validate inputs
  if (!text || !name || !email) {
    return status(false, 'You must fill all inputs');
  }

  // Prepare object to send
  const reviewObj = {
    name,
    email,
    txt: text,
    createdAt: new Date().toISOString()
  };

  // Quick offline check
  if (!navigator.onLine) {
    pushToLocalQueue(reviewObj);
    processMessage(true, "You're offline. Your review was saved and will be sent when you're back online.");
    return;
  }

  // Confirm network usability
  const usable = await isReallyOnline();
  if (!usable) {
    pushToLocalQueue(reviewObj);
    processMessage(true, "You appear to be offline. Review saved locally and will be retried later.");
    return;
  }

  // Show processing UI while sending
  const spinnerHtml = `
    <div class="processed-image">
      <div class="spinner-container" id="spinner">
        <div class="spinner"></div>
      </div>
    </div>
    <div class="processed-text">Processing, please wait...</div>
  `;

  ProcessEl.style.display = 'flex';
  ProcessEl.innerHTML = spinnerHtml;

  try {
    await sendReviewToFirestore(reviewObj);

    const okHtml = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="24" height="24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
      </svg>
      <div class="processed-text">Thanks for the review</div>
    `;
    processMessage(true, okHtml);
    status(true, 'Review sent successfully');
    // Optionally clear textarea after success
    if (TxtEl) TxtEl.value = '';
  } catch (err) {
    // Save to queue for retry later
    pushToLocalQueue(reviewObj);

    const errHtml = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
      </svg>
      <div class="processed-text">Error sending — saved locally and will retry when online</div>
    `;
    processMessage(false, errHtml);
    status(false, 'Error sending — saved locally for retry');
  }
}

/* ---------------------------
   Initialization on DOMContentLoaded
   --------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  // Load current user from IndexedDB and update UI if present
  const currentUser = await readCurrentUserFromIDB();
  if (currentUser && typeof currentUser === 'object' && Object.keys(currentUser).length > 0) {
    updateUserUI(currentUser.name || '', currentUser.email || '');
    status(true, 'Page updated with user info');
  } else {
    status(false, 'No student record found');
  }

  // Attach submit handler
  if (ButtonEl) {
    ButtonEl.addEventListener('click', (e) => {
      e.preventDefault();
      handleSubmit();
    });
  }

  // Try syncing any queued reviews now
  await syncQueuedReviews();
});

/* ---------------------------
   Network event listeners
   --------------------------- */
// When browser 'online' event fires, attempt a sync. Also listen to visibilitychange
// for cases where the tab regains focus after connectivity was restored.
window.addEventListener('online', () => {
  console.log('browser online event');
  // small delay to let network stabilize
  setTimeout(syncQueuedReviews, 1000);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    setTimeout(syncQueuedReviews, 500);
  }
});

/* ---------------------------
   Public: optional manual sync trigger (if you need a button)
   --------------------------- */
// Example usage: call `syncQueuedReviews()` from dev console or from a UI button.

export {
  readLocalQueue,
  pushToLocalQueue,
  syncQueuedReviews
};
