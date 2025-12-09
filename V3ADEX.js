//original2
// --- Firebase Setup ---mark
import { db } from "./firebaseConfig.js";
import {
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  collection,
  onSnapshot,
  writeBatch,
  doc,
  arrayUnion,
  setDoc,
  updateDoc,
  increment,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

let stdUser;
const dtb = window.localStorage;
//initialization of inputs and display
const Name = document.getElementById('userName');
const RegNM = document.getElementById('regNumber');
const Department = document.querySelector('.department');
let currentCourseDisplay = document.querySelector('.current-class');
const spinnerContainer = document.getElementById('spinner');
const messager = document.querySelector('.messager');
const attView = document.querySelector('.att-view');
const attReview = document.querySelector('.att-review');
const reviewBut = document.querySelector('.reviewBut');
const reviewLog = document.querySelector('.b-review');
const attHpage = document.querySelector('.attdhis-view');
const bodyVerify = document.querySelector('.body-verify');
const cancelVerify = document.querySelector('.cancel-verify');
const proceedVerify = document.querySelector('.proceed-verify');
const textPopup = document.querySelector('.text-pop');

//mark Attendance button
const markBt = document.getElementById('markBtn');

if (!JSON.parse(dtb.getItem('att-his-state')) || JSON.parse(dtb.getItem('att-his-state')) !== 1) {
  dtb.setItem('att-his-state', JSON.stringify(0));
}

//customizer
const modeToggle = document.getElementById("modeToggle");
let theme;
modeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  // (optional) Save preference in localStorage
  if (document.body.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }
});

cancelVerify.addEventListener("click", () => {
  bodyVerify.style.display = "none";
})
proceedVerify.addEventListener("click", () => {
  bodyVerify.style.display = "none";
  window.location.href = "upload.html";
})

// Load saved theme
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}

let inter;
function statusDisplay(state, txt) {
  clearTimeout(inter);
  messager.innerHTML = '';
  messager.style.top = '10px';
  messager.style.color = state ? 'lightgreen' : 'red';
  messager.innerHTML = txt;
  inter = setTimeout(() => {
    messager.style.top = '-100%';
  }, 5000);
}

function enableMarkButton(state) {
  const verify = localStorage.getItem("verifiedAdexid");
  markBt.disabled = !state;
  if (state === true) {
    markBt.classList.remove('disabled');
    markBt.textContent = verify === "true" ? 'Mark Attendance' : 'Verify Face_ID';
  }
  else {
    markBt.classList.add('disabled');
    markBt.textContent = 'Account Disabled';
  }
}

attHpage.addEventListener('click', () => {
  window.location.href = 'attH.html';
});

//getting date function
function getCurrentDate() {
  const now = new Date();
  const day = now.getDate(); // No padStart — gives single digit if needed
  const month = now.getMonth() + 1; // No padStart
  const year = now.getFullYear();
  return `${day}${month}${year}`;
}

function getDashedDate() {
  const now = new Date();
  const day = now.getDate(); // No padStart — gives single digit if needed
  const month = now.getMonth() + 1; // No padStart
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
}

function getFormattedDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

function onloadMark() {
  const request = indexedDB.open('adexrecord', 1);

  request.onupgradeneeded = function (event) {
    const DB = event.target.result;
    if (!DB.objectStoreNames.contains('att-records')) {
      DB.createObjectStore('att-records', {
        keyPath: "id",
        autoIncrement: true
      });
    }
  };

  request.onsuccess = function (event) {
    const DB = event.target.result;

    // Important: Ensure the object store exists before transaction
    if (!DB.objectStoreNames.contains('att-records')) {
      console.error("Object store not found.");
      statusDisplay(false, "Database not ready yet. Try again.");
      return;
    }

    const tx = DB.transaction('att-records', 'readwrite');
    const syncInterval = setInterval(() => {
      trySyncStoredAttendance(DB, syncInterval);
    }, 3000);

  };

  request.onerror = function (event) {
    console.error("Error opening Indexed:", event.target.error);
    statusDisplay(false, "Failed to save offline data.");
  };
}

window.addEventListener('DOMContentLoaded', async () => {
  onloadMark();
  reviewBut.addEventListener('click', () => {
    window.location.href = 'review.html';
  });
  reviewLog.addEventListener('click', () => {
    window.location.href = 'review.html';
  });
  const cancel = document.querySelector('.cancel');
  cancel.addEventListener('click', () => {
    sideBar.style.width = '0%';
    cancelState = !cancelState;
  });
  let cancelState = false;
  const sideBar = document.querySelector('.nav-bar');
  document.querySelector('.menu').addEventListener('click', () => {
    sideBar.style.width = !cancelState ? '55%' : '0%';
    cancelState = !cancelState;
  })
  const request = indexedDB.open('AdexUsers', 2);
  const localStdObj = JSON.parse(dtb.getItem('currentUser'));
  console.log(localStdObj);
  console.log(localStdObj ? 'successfully gotten data from localStorage' : 'no data found on localStorage');
  request.onupgradeneeded = function (event) {
    const DB = event.target.result;
    if (!DB.objectStoreNames.contains('users')) {
      DB.createObjectStore('users');
      console.log('onupgradeneeded successful...sending students to be displayed on screen')
    }
  };

  request.onsuccess = function (event) {
    const DB = event.target.result;

    if (!DB.objectStoreNames.contains('users') && !localStdObj) {
      console.error("Object store 'users' does not exist.");
      return;
    }

    const tx = DB.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const getRequest = store.get('currentUser');
    console.log('successfully gotten it');
    getRequest.onsuccess = async function () {
      stdUser = getRequest.result;
      if (stdUser) {
        await displayUserDetails(stdUser);
        console.log('display student from Indexed');
      }
      else if (localStdObj) {
        await displayUserDetails(localStdObj);
        console.log('display student from localStorage');
      }
      else {
        window.location.href = 'ADEXlogin.html'; // redirect if not logged in
      }
      DB.close()
    };
    getRequest.onerror = async (e) => {
      if (localStdObj) {
        await displayUserDetails(localStdObj);
        console.log('display student from localStorage');
      }
      console.log(localStdObj ? 'failed to fetch from Indexed but fetched from local' : 'fail to fetch and localStorage empty!');
    }
    DB.close();
  };

  request.onerror = async function (event) {
    if (localStdObj) {
      await displayUserDetails(localStdObj);
      console.log('display student from localStorage');
    }
    console.log(localStdObj ? 'failed to fetch from Indexed but fetched from local' : 'fail to fetch and localStorage empty!');
    console.error('Error opening Indexed:', event.target.error);
  };
  //checking if acct disabled
  await checkDisability();

  //drawing on ADEX...
  const canvas = document.querySelector(".canvas");
  const ctx = canvas.getContext("2d");
  ctx.strokeStyle = "green";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  let drawing = false;

  function getTouchPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  }

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    drawing = true;
    const pos = getTouchPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  });

  canvas.addEventListener("touchmove", (e) => {
    if (!drawing) return;
    e.preventDefault();
    const pos = getTouchPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  });

  canvas.addEventListener("touchend", () => drawing = false);

  const clearBtn = document.querySelector(".clear-canvas");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => ctx.clearRect(0, 0, canvas.width, canvas.height));
  }


});

//tracker code
async function trackPageView() {
  const key = "NOTP";
  const today = new Date().toISOString().split("T")[0]; // e.g. "2025-10-05"

  // Get current count from localStorage
  let count = Number(JSON.parse(localStorage.getItem(key))) || 0;
  count++;
  localStorage.setItem(key, JSON.stringify(count));
  console.log("Page view updated locally:", count);

  // Try syncing with backend if online
  if (navigator.onLine) {
    try {
      const response = await fetch("https://attd-backend.onrender.com/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date: today, count }),
      });

      if (response.ok) {
        console.log("Synced with backend successfully");
        localStorage.removeItem(key); // clear after successful sync
      } else {
        console.warn("Failed to sync with backend:", response.status);
      }
    } catch (err) {
      console.warn("Error syncing with backend:", err.message);
    }
  }
}

function checkingForReferencePic() {
  const user = JSON.parse(dtb.getItem("currentUser"));
  if (!user.referencePic) {
    bodyVerify.style.display = "flex";
    localStorage.setItem("take_Image", true);
    textPopup.innerHTML = ` ${user.name}, you have not uploaded a reference picture. For enhanced security, please upload one by clicking 'Proceed' below.`;
    return;
  }
}

async function displayUserDetails(user) {
  document.getElementById('userName').textContent = user.name;
  document.getElementById('regNumber').textContent = user.regNm;
  document.querySelector('.user-nm').innerHTML = user.name || `<a href="ADEXlogin.html">Login</a>`;
  document.querySelector('.department').textContent = user.dept;
  const date = getDashedDate();
  // Call this on page load
  await trackPageView();
  checkingForReferencePic();
}

//log out function
document.querySelector('.log-out').addEventListener('click', () => {
  window.location.href = 'ADEXlogin.html';
})
//online checking programmes
async function isReallyOnline() {
  try {
    const response = await fetch("https://www.gstatic.com/generate_204", {
      method: "GET",
      cache: "no-cache",
      mode: "no-cors"
    });
    // If fetch does not throw, assume online
    return true;
  } catch (err) {
    return false;
  }
}

// --- Assign Course by Time ---
function changeCourse(startHour, endHour, course) {
  const currentHour = new Date().getHours();
  if (currentHour >= startHour && currentHour < endHour) {
    if (currentCourseDisplay) currentCourseDisplay.textContent = course;
    return;
  }
}


function checkAttendanceState() {
  const day = new Date().getDay();
  const hour = new Date().getHours();


  switch (day) {
    case 1: // Monday
      if (hour >= 8 && hour < 10) changeCourse(8, 10, "GST211");
      else if (hour >= 12 && hour < 2) changeCourse(12, 2, "CEE211");
      break;
    case 2: // Tuesday
      if (hour >= 8 && hour < 10) changeCourse(8, 10, "GST211");
      else if (hour >= 10 && hour < 12) changeCourse(10, 12, "FDE2110");
      else if (hour >= 12 && hour < 14) changeCours0e(12, 14, "GST215");
      else if (hour >= 14 && hour < 15) changeCourse(14, 15, "GET213");
      else if (hour >= 15 && hour < 17) changeCourse(15, 17, "GET212");
      break;
    case 3: // Wednesday
      if (hour >= 8 && hour < 10) changeCourse(8, 10, "ENT211");
      else if (hour >= 10 && hour < 11) changeCourse(10, 11, "GET213");
      else if (hour >= 13 && hour < 14) changeCourse(13, 14, "ENT211");
      else if (hour >= 14 && hour < 16) changeCourse(14, 16, "CEE211");
      else if (hour >= 16 && hour < 21) changeCourse(16, 21, "GET215");
      break;
    case 4: // Thursday
      if (hour >= 9 && hour < 11) changeCourse(9, 11, "CHE212");
      else if (hour >= 12 && hour < 14) changeCourse(12, 14, "GET214");
      else if (hour >= 14 && hour < 16) changeCourse(14, 16, "GET211");
      else if (hour >= 16 && hour < 17) changeCourse(16, 17, "PEE211");
      break;
    case 0: // Friday
      if (hour >= 2 && hour < 18) changeCourse(2, 18, "GET214");
      else if (hour >= 9 && hour < 10) changeCourse(
        9, 10, "GET212");
      else if (hour >= 10 && hour < 11) changeCourse(10, 11, "GET211")
      else if (hour >= 11 && hour < 13) changeCourse(11, 13, "PEE211");
      else if (hour >= 14 && hour < 15) changeCourse(14, 15, "CHE211");
      else if (hour >= 15 && hour < 17) changeCourse(15, 17, "ENT211");
      break;
    default:
      alert('No classes today')
      clearInterval(interval);
  }
}
async function loadAttendance() {
  const isOnline = await isReallyOnline();
  if (!navigator.onLine) {
    attView.classList.add('errorView');
    attView.innerHTML = `
    <p style='display:flex;justify-content:center;align-items:center;gap:5px;'>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wifi-off-icon lucide-wifi-off"><path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/></svg>
      You are currently offline</p>`;
    return;
  }
  if (!isOnline) {
    attView.classList.add('errorView');
    attView.innerHTML = `
    <p style='display:flex;justify-content:center;align-items:center;gap:5px;'>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wifi-off-icon lucide-wifi-off"><path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/></svg>
      You're having a poor connectivity</p>`;
    return;
  }
  const dept = Department.textContent.trim();
  const course = currentCourseDisplay.textContent.trim().toUpperCase();
  if (course === 'no class') {
    attView.innerHTML = '<h3>No class yet!</h3>';
    return;
  }

  const date = getCurrentDate();
  const collectionRef = collection(db, course, date, dept); // /course/date/dept

  onSnapshot(collectionRef, (snapshot) => {
    if (snapshot.empty) {
      attView.innerHTML = `<h3>No student marked yet</h3>`;
      return;
    }

    attView.innerHTML = `<h2>${dept} Students who marked</h2>`;
    let users = '';
    snapshot.forEach((doc) => {
      const data = doc.data();
      users += `<p>${data.name} RegNo: ${data.regNm} just mark Attendance</p>`;
    });
    attView.innerHTML += users;
  });
}
let reviewSt = false;
attReview.addEventListener('click', async () => {
  await loadAttendance();
  attView.style.height = reviewSt ? '0em' : '20em';
  attView.style.padding = reviewSt ? '0px' : '10px 5px';

  reviewSt = !reviewSt;
});

let interval = setInterval(() => {
  checkAttendanceState();
}, 1000);
//marking Attendance programmes
async function updateDeptDate(dept, date) {
  const struc = doc(db, dept, date);
  try {
    await setDoc(struc, {
      date: arrayUnion(date),
    }, { merge: true, });
    console.log('successful merge date from updateDeptDate');
  } catch (err) {
    console.error('Error from trying to update Department date: ', err);
  }
}

//attedance history function...
async function attHistory(course, date, level, dept, reg) {
  let arrHis = [];
  const attDoc = doc(db, 'UNIUYO', level, dept, reg);

  const his = await getDoc(attDoc);
  if (his.exists()) {
    arrHis = his.data().attH || [];

    // Keep max 30 history records
    while (arrHis.length >= 30) {
      arrHis.shift();
    }
  }

  // Add new record
  arrHis.push({ course, date });

  // Save back to Firestore
  await updateDoc(attDoc, { attH: arrHis });

  // Save to localStorage (just a flag for now)
  dtb.setItem('att-his-state', JSON.stringify(1));
}

async function markAttendance(name, regNm, dept, course, date, level) {
  const userObject = {
    name,
    regNm,
  };
  const reg = regNm.replace(/\//g, '-');
  const studPath = doc(db, 'UNIUYO', level, dept, reg);
  const docRef = doc(db, course, date, dept, reg);
  const DeptPath = doc(db, course, date, 'DP', 'deptList');
  try {
    const result = await Promise.allSettled([
      setDoc(DeptPath, { deptName: arrayUnion(dept) }, { merge: true }),
      setDoc(docRef, userObject),
      updateDeptDate(dept, date),
      attHistory(course, date, level, dept, reg)
    ]);

    console.log(`result from all mark attend func :`, result);


    // ensures it creates or updates without overwriting other depts
    spinnerContainer.style.display = 'none';
    setTimeout(() => {
      localStorage.setItem("verifiedAdexid", "false");
      statusDisplay(true, 'Attendance submitted successfully! Thank you for using ADEX');
    }, 1000);

  } catch (err) {
    spinnerContainer.style.display = 'none';
    setTimeout(() => {
      statusDisplay(true, 'Error marking Attendance, please check your network');
    }, 1000);

    syncAttendanceData(name, regNm, dept, course, date);
  }
}

//geolocation
let markGeoState = false;
let watchId = null;

const coor = [5.039920, 5.040392, 7.974900, 7.975612];

function runGeoWatch() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("Geolocation not supported.");
      return;
    }

    const readings = [];
    const maxRuns = 5;

    const opts = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    };

    watchId = navigator.geolocation.watchPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        readings.push({ lat, lon });
        console.log(`Reading ${readings.length}:`, lat, lon);

        // Once we have 5 readings → stop + resolve
        if (readings.length >= maxRuns) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;

          const avgLat =
            readings.reduce((s, r) => s + r.lat, 0) / readings.length;

          const avgLon =
            readings.reduce((s, r) => s + r.lon, 0) / readings.length;

          console.log("Average Latitude:", avgLat);
          console.log("Average Longitude:", avgLon);

          // Zone check
          markGeoState =
            avgLat >= coor[0] &&
            avgLat <= coor[1] &&
            avgLon >= coor[2] &&
            avgLon <= coor[3];

          console.log("markGeoState =", markGeoState);

          // Resolve the final result to the caller
          resolve({
            avgLat,
            avgLon,
            markGeoState
          });
        }
      },
      err => {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        reject(err); // reject the promise on error
      },
      opts
    );
  });
}


/*
async function getGeoLocsUI() {
  const userLocs = [];
  const coor = [5.0385, 7.9754, 5.0398, 7.9765];
  const [minLat, minLong, maxLat, maxLong] = coor;

  function getLocation() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({ latitude, longitude });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  console.log("Trying multiple location attempts...")
  try {
    for (let i = 0; i < 5; i++) {
      const { latitude, longitude } = await getLocation();
      let loc = latitude+" "+longitude;
      alert(loc);
      userLocs.push({ latitude, longitude });
    }

    const filtered = userLocs.filter(loc => {
      return (
        loc.latitude >= minLat && loc.latitude <= maxLat &&
        loc.longitude >= minLong && loc.longitude <= maxLong
      );
    });

    if (filtered.length >= 2) {
      console.log("✅ You are at the correct location.");
      return true;
    } else {
      console.log("❌ You are not at the expected location.");
      
    }
  } catch (err) {
    statusDisplay(false,`⚠️ Location error: ${err.message}`);
  }
}*/

async function batchMarkAttendance(studentList, course, date) {
  const batch = writeBatch();

  studentList.forEach(async ({ name, regNm, dept, level }) => {
    if (!name || !regNm || !dept) {
      console.warn("Skipping invalid student record:", { name, regNm, dept });
      return;
    }
    const reg = regNm.replace(/\//g, '-');
    const docRef = doc(db, course, date, dept, reg);
    const userObject = { name, regNm };
    await attHistory(course, date, level, dept, reg);
    batch.set(docRef, userObject);
  });

  try {
    await batch.commit();
    console.log("✅ Batch attendance submitted");
    statusDisplay(true, 'ADEX has synced your attendance');
  } catch (err) {
    console.error("❌ Batch submission failed:", err.message);
  }
}

//warninig code...
function storeWarn(lockState, lockStateTime, lockStateDate) {
  const lockObj = {
    lockState,
    lockStateTime,
    lockStateDate
  };
  const request = indexedDB.open('warn');
  request.onupgradeneeded = function (e) {
    const DB = e.target.result;
    if (!DB.objectStoreNames.contains('warn')) {
      DB.createObjectStore('warn');
    };
  }
  request.onsuccess = function (e) {
    const DB = e.target.result;
    const tx = DB.transaction('warn', 'readwrite');
    const store = tx.objectStore('warn');
    const storeRequest = store.put(lockObj, 'currentLock');
    storeRequest.onsuccess = (e) => {
      console.log('successfully updated Warn database');
      DB.close();
    }
    storeRequest.onerror = (e) => {
      console.error('error from updating warn database ', err);
      DB.close();
    }
  }
  request.onerror = (e) => {
    console.error('error trying to upgrade Warn database :', err);
  }
}

async function updateWarnOnline() {
  const level = stdUser.level;
  const dept = stdUser.dept;
  const regNm = stdUser.regNm;

  console.log(stdUser);
  const reg = regNm.replace(/\//g, '-');
  const docm = doc(db, 'UNIUYO', level, dept, reg);

  isReallyOnline().then(async (online) => {
    try {
      if (online) {
        const stdDoc = await getDoc(docm);
        if (stdDoc.exists()) {
          await updateDoc(docm, {
            'stdObj.lockState': 0,
            'stdObj.lockStateTime': 0,
            'stdObj.lockStateDate': '',
          });
          enableMarkButton(true);
          console.log('✅ Student lock state updated. Account unlocked');
        } else {
          console.warn('⚠️ Document does not exist.');
        }
      }
    } catch (err) {
      console.log('❌ Error updating lock state:', err.message);
    }
  });
}
function updateWarn(DB) {
  const lockObj = {
    lockState: 0,
    lockStateTime: 0,
    lockStateDate: '',
  };
  const tx = DB.transaction('warn', 'readwrite');
  const warnDatabase = tx.objectStore('warn');
  const warnDatabaseAction = warnDatabase.put(lockObj, 'currentLock');
  warnDatabaseAction.onsuccess = () => {
    enableMarkButton(true);
    console.log('successful updated warn...offline');
  }
  warnDatabaseAction.onerror = (e) => {
    console.log('Error trying to update warn :', e.target.error)
  }
}


function getTimeInSecs() {
  const now = new Date();
  const hour = now.getHours();
  const Min = now.getMinutes();
  const Sec = now.getSeconds();
  return hour * 3600 + Min * 60 + Sec;
}

async function warning(student) {
  statusDisplay(false, 'Warning Portal is not open,if too many attempts acct will be lock for 30min...mark when portal is open! ');
  await warn(student);
}

async function warn(student) {
  const level = stdUser.level;
  const dept = stdUser.dept;
  const regNm = stdUser.regNm;
  console.log(stdUser);
  const reg = regNm.replace(/\//g, '-');
  const docm = doc(db, 'UNIUYO', level, dept, reg);

  try {
    const stdDoc = await getDoc(docm);

    if (!stdDoc.exists()) {
      console.log('❌ Student not found in collection.');
      alert('Student not found in collection,pls check INTERNET connection and reload app.If error presist then your account is not found on our database an this may result to issues...pls resolve to contact ADEX')
      return;
    }

    let lockNum = stdDoc.data().stdObj.lockState;
    if (lockNum >= 3) {
      alert('Too many attempts your acct has been disabled for 30 miuntes');
      enableMarkButton(false);
      const lockTime = stdDoc.data().stdObj.lockStateTime;
      const lockDate = stdDoc.data().stdObj.lockStateDate;
      storeWarn(lockNum, lockTime, lockDate);

      await checkDisability();
      return;
    }
    await updateDoc(docm, {
      'stdObj.lockState': increment(1),
      'stdObj.lockStateTime': student,
      'stdObj.lockStateDate': new Date().toISOString().slice(0, 10),
    });

    console.log('✅ Student lock state updated.');
  } catch (err) {
    console.error('⚠️ Error trying to warn student:', err.message);
  }
}

function verifyOffline() {
  const request = indexedDB.open('warn');
  request.onupgradeneeded = function (e) {
    const DB = e.target.result;
    if (!DB.objectStoreNames.contains('warn')) {
      DB.createObjectStore('warn');
    };
  }
  request.onsuccess = function (e) {
    const DB = e.target.result;
    const tx = DB.transaction('warn', 'readonly');
    const store = tx.objectStore('warn');
    const getLockObj = store.get('currentLock');

    getLockObj.onsuccess = function () {
      const result = getLockObj.result;

      if (!result) {
        console.log('No lock data found');
        DB.close();
        return;
      }

      const { lockState, lockStateTime, lockStateDate } = result;

      if (lockState < 0) {
        console.log('it f*cking works!');
        DB.close();
        return;
      }

      console.log('from offline :', result);

      const currentDate = new Date().toISOString().slice(0, 10);
      if (currentDate !== lockStateDate) {
        updateWarn(DB);
        DB.close();
        return;
      }

      let currentTime = getTimeInSecs();
      const diff = parseInt(currentTime) - parseInt(lockStateTime);
      if (diff >= 1800) {
        updateWarn(DB);
        DB.close();
        return;
      }
      const difff = parseInt(lockStateTime) + 1800 - diff + 10;
      setTimeout(() => {
        checkDisability()
      }, difff);
      enableMarkButton(false);
    };

    getLockObj.onerror = function (e) {
      console.error('Error reading from warn:', e.target.error);
      DB.close();
    };
  }
  request.onerror = (e) => {
    console.error('error trying to upgrade Warn database :', e.target.error);
  }
}
async function verifyOnline() {
  console.log('running check');
  let level = stdUser.level;
  let dept = stdUser.dept;
  let regNm = stdUser.regNm;
  const reg = regNm.replace(/\//g, '-');
  const docm = doc(db, 'UNIUYO', level, dept, reg);
  try {
    const userSnapData = await getDoc(docm);
    if (!userSnapData.exists()) {
      alert('pls check INTERNET connection and reload app.If error presist then your account is not found on our database an this may result to issues...pls resolve to contact ADEX');
      return;
    }
    const { lockState, lockStateTime, lockStateDate } = userSnapData.data().stdObj;
    if (lockState < 3) {
      console.log('online fetched successful but lock is 0, acct enabled successfully!');
      await updateWarnOnline();
      return;
    }
    console.log('from online', userSnapData.data().stdObj);
    const currentDate = new Date().toISOString().slice(0, 10);
    if (currentDate !== lockStateDate) {
      await updateWarnOnline();
      return;
    }
    let currentTime = getTimeInSecs();
    const diff = parseInt(currentTime) - parseInt(lockStateTime);
    if (diff >= 1800) {
      await updateWarnOnline();
      return;
    }
    storeWarn(lockState, lockStateTime, lockStateDate);
    enableMarkButton(false);
    const difff = parseInt(lockStateTime) + 1800 - diff + 10;
    setTimeout(() => {
      checkDisability()
    }, difff);
  } catch (err) {
    console.log('Error from verifyOnline :', err.message);
  }
}

async function checkDisability() {
  try {
    const isOnline = await isReallyOnline();
    if (isOnline) {
      await verifyOnline();
      verifyOffline();
    } else {
      verifyOffline();
    }
  } catch (err) {
    console.log('Error from checkDisability: ', err.message)
  }
}

async function verifyStudentsPortal(student, course, date) {
  const docm = doc(db, 'Portal', course);
  const Student = Number(student);
  try {
    const result = await getDoc(docm);
    if (!result.exists()) {
      console.log('im here');
      return { state: false };
    }
    const fetched = result.data()[`${course}_${date}`];
    if (!fetched) {
      return { state: false };
    }
    const output = fetched[fetched.length - 1];
    console.log('output : ', output);
    if (!output.startTime || !output.endTime) {
      return { state: false };
    }
    if (Student < Number(output.startTime)) {
      return { state: false };
    }
    if (Student > Number(output.startTime) && Student < Number(output.endTime)) {
      return { state: true };
    }
    if (Student > Number(output.endTime)) {
      return { state: 'Time_past' };
    }
  } catch (err) {
    console.error('Error from checking if portal exist:', err.message);
    statusDisplay(false, 'check your internet connectivity');
  }
}

async function markPortal(output, name, regNm, department, course, date, student, level) {

  try {
    localStorage.setItem("verifiedAdexid", "false");
    switch (output.state) {
      case false:
        return await warning(student);
      case 'Time_past':
        return alert('Portal has already been CLOSED...pls meet with the class Rep or ADEX to show you were present in class!');
      case true:
        logs.textContent = 'Checking portal...';
        return await markAttendance(name, regNm, department, course, date, level);
    }
  } catch (err) {
    console.log('Error from markPortal :', err.message);
    alert('network error');
  }
}

function confirmFaceVerification() {
  window.location.href = "verify.html";
}

if(localStorage.getItem("verifiedAdexid") !== "true"){
  markBt.textContent = "Verify Face_ID";
}else{
  markBt.textContent = "Mark Attendance";
}

//Marking Attendance logic
markBt.addEventListener('click', async (e) => {
  e.preventDefault();

  const logs = document.querySelector('.logs');
  const level = stdUser.level;
  const name = (Name.textContent.trim() !== 'USER NAME') ? Name.textContent.trim() : false;
  const regNm = (RegNM.textContent.trim() !== 'USER_REG NUMBER') ? RegNM.textContent.trim() : false;
  const department = (Department.textContent.trim() !== 'Department') ? Department.textContent.trim() : false;
  let cours = (currentCourseDisplay.textContent.trim() !== 'No class') ? currentCourseDisplay.textContent.trim() : false;

  if (!name || !regNm || !cours || !department || !level) return alert('All ADEX field must be filled!');

  const course = cours.replace(/\s+/g, '').toUpperCase();
  checkingForReferencePic();
  const verified = localStorage.getItem("verifiedAdexid");
  if (verified !== "true"){
    return confirmFaceVerification()
  }else{
    console.log('Face verified, proceeding to mark attendance...');
    markBt.textContent = "Mark Attendance";
  };

  /*if(!navigator.geolocation) return statusDisplay(false,'Geolocation is not supported by your brower!');
  spinnerContainer.style.display = 'block';
  try{
    const verifyGeo = await getGeoLocsUI();
    if(!verifyGeo){
      spinnerContainer.style.display = 'none';
      statusDisplay(false,'Warning you are not in class!');
      return;
    }
  }catch(err){
    statusDisplay(false,'Internet error check connection');
    return;
  }
  */
  spinnerContainer.style.display = 'flex';
  logs.textContent = 'Verifying your location, please wait...';
  await runGeoWatch();
  if (!markGeoState) {
    statusDisplay(false, 'You are not in the class location, please move to the class location to mark attendance.');
    localStorage.setItem("verifiedAdexid", "false");
    markBt.textContent = "Verify Face_ID";
    spinnerContainer.style.display = 'none';
    return;
  }
  const dateSlash = getFormattedDate();
  const date = getCurrentDate();
  const student = getTimeInSecs();
  //check internet connection...
  try {
    const internet = await isReallyOnline();
    if (internet) {
      const output = await verifyStudentsPortal(student, course, dateSlash);
      console.log('output.state: ', output.state);
      await markPortal(output, name, regNm, department, course, date, student, level);
      localStorage.setItem("verifiedAdexid", "false");
      spinnerContainer.style.display = 'none';
      return;
    }

    spinnerContainer.style.display = 'none';
    localStorage.setItem("verifiedAdexid", "false");
    syncAttendanceData(name, regNm, department, course, date, dateSlash, student, level);
  } catch (err) {
    spinnerContainer.style.display = 'none';
    console.log('Error checking internet connection', err);
    alert('Error checking internet connection');
  }

})

//Attendance marking offline...
function syncAttendanceData(name, reg, dept, course, date, dateSlash, student, level) {
  const userConsent = confirm("No internet connection detected. Do you want to continue with offline attendance? Your data will be synced later.");

  if (!userConsent) {
    statusDisplay(false, "Offline marking cancelled.");
    return;
  }

  const offlineUser = { name, regNm: reg, dept, course, date, dateSlash, student, level };

  const request = indexedDB.open('adexrecord', 1);

  request.onupgradeneeded = function (event) {
    const DB = event.target.result;
    if (!DB.objectStoreNames.contains('att-records')) {
      DB.createObjectStore('att-records', {
        keyPath: "id",
        autoIncrement: true
      });
    }
  };

  request.onsuccess = function (event) {
    const DB = event.target.result;

    // Important: Ensure the object store exists before transaction
    if (!DB.objectStoreNames.contains('att-records')) {
      console.error("Object store not found.");
      statusDisplay(false, "Database not ready yet. Try again.");
      return;
    }

    const tx = DB.transaction('att-records', 'readwrite');
    const store = tx.objectStore('att-records');
    store.add(offlineUser);
    statusDisplay(true, "Offline attendance saved and will sync automatically.");

    // Trigger syncing every 3 seconds
    const syncInterval = setInterval(() => {
      trySyncStoredAttendance(DB, syncInterval);
    }, 3000);
  };

  request.onerror = function (event) {
    console.error("Error opening Indexed:", event.target.error);
    statusDisplay(false, "Failed to save offline data.");
  };
}
function deleteAdex() {
  const deleteRequest = indexedDB.deleteDatabase('adexrecord');

  deleteRequest.onsuccess = function () {
    console.log("adex successfully deleted.");
  };

  deleteRequest.onerror = function (event) {
    console.error("Error deleting adex:", event.target.error);
    alert("Failed to delete offline attendance data.");
  };

  deleteRequest.onblocked = function () {
    console.warn("Delete blocked: Close all other tabs using this database.");
    alert("Delete blocked. Please close other tabs using the site and try again.");
  };
}

//syncing data on internet connection...
function trySyncStoredAttendance(DB, interval) {
  isReallyOnline().then(async (online) => {
    if (!online) return;

    const tx = DB.transaction('att-records', 'readwrite');
    const store = tx.objectStore('att-records');
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = async function () {
      const records = getAllRequest.result;

      if (!records.length) {
        clearInterval(interval);
        DB.close();
        console.log('cleared interval for attendance syncing');
        return;
      }

      try {
        if (records.length >= 5) {
          // Group by course and date for batching
          const grouped = {};
          for (const r of records) {
            const output = await verifyStudentsPortal(r.student, r.course, r.dateSlash);
            if (output.state) {
              const key = `${r.course}_${r.date}`;
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(r);
              console.log('marked', r.course);
            }
            console.log(`${r.course} was not mark as we found invalid data`);
            statusDisplay(false, `Attendance for ${r.course} date: ${r.dateSlash} was not marked!`);
          };

          if (Object.keys(grouped).length <= 0) {
            console.log('group is empty')
          } else {
            for (const key in grouped) {
              const [course, date] = key.split('_');
              await batchMarkAttendance(grouped[key], course, date);
            }
          }
        } else {
          // Less than 5: sync individually
          for (const record of records) {
            const output = await verifyStudentsPortal(record.student, record.course, record.dateSlash);
            if (output.state) {
              const name = record.name;
              const regNm = record.regNm;
              const course = record.course;
              const date = record.date;
              const userObject = { name, regNm };
              const reg = regNm.replace(/\//g, '-');
              const docRef = doc(db, course, date, record.dept, reg);
              const studPath = doc(db, 'UNIUYO', record.level, record.dept, reg);

              await Promise.allSettled([
                setDoc(docRef, userObject),
                attHistory(course, date, record.level, record.dept, reg)
              ]);
              console.log('marked', record.course);
            }
            console.log(`${record.course} was not mark as we found invalid data`);
            statusDisplay(false, `Attendance for ${record.course} date: ${record.dateSlash} was not marked!`);
          }
          clearInterval(interval);
          statusDisplay(true, 'ADEX has sync your attendance');
        }
        DB.close();
        // Clear records after successful sync
        deleteAdex();

      } catch (err) {
        console.error("Sync failed:", err.message);

      }
    };

    getAllRequest.onerror = function () {
      DB.close();
      console.error("Failed to read from Indexed during sync.");
    };
  });
}



