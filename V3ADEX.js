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
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

const userRef = collection(db, "users");
let stdUser;

//initialization of inputs and display
const Name = document.getElementById('userName');
const RegNM = document.getElementById('regNumber');
const Department = document.querySelector('.department');
let currentCourseDisplay = document.querySelector('.current-class');
const spinnerContainer = document.querySelector('.spinner-container');
const messager = document.querySelector('.messager');
const attView = document.querySelector('.att-view');
const attReview = document.querySelector('.att-review');
const reviewBut = document.querySelector('.reviewBut');

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

//mark Attendance button
const markBt = document.getElementById('markBtn');

function enableMarkButton(state){
  markBt.disabled = !state;
  if(state === true){
    markBt.classList.remove('disabled');
    markBt.innerHTML ='Mark Attendance';
  }
  else{
    markBt.classList.add('disabled');
    markBt.innerHTML ='Account Disabled';
  }
}

//getting date function
function getCurrentDate() {
  const now = new Date();
  const day = now.getDate(); // No padStart — gives single digit if needed
  const month = now.getMonth() + 1; // No padStart
  const year = now.getFullYear();
  return `${day}${month}${year}`;
}

function getFormattedDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

function onLoadCheck() {
  const request = indexedDB.open('warnDB');

  request.onupgradeneeded = function (e) {
    const DB = e.target.result;
    if (!DB.objectStoreNames.contains('warn')) {
      DB.createObjectStore('warn');
      console.log('onLoadCheck upgraded warnDB successfully');
    }
  };

  request.onsuccess = function (e) {
    const DB = e.target.result;

    if (!DB.objectStoreNames.contains('warn')) {
      console.log('Error from onLoadCheck /request.onsuccess: warning DB not found');
      return;
    }

    const tx = DB.transaction('warn', 'readonly');
    const store = tx.objectStore('warn');
    const getLockObj = store.get('currentLock');

    getLockObj.onsuccess = async function () {
      const result = getLockObj.result;

      if (!result) {
        console.log('No lock data found');
        return;
      }

      const { lockState, lockStateTime, lockStateDate } = result;

      if (lockState === 0) {
        console.log('no warning');
        await updateWarnDBOnline();
        return;
      }

      console.log('from offline:', result);

      const currentDate = new Date().toISOString().slice(0, 10);
      const currentTime = getTimeInSecs();
      const diff = (parseInt(currentTime) - parseInt(lockStateTime)) / 60;

      if (currentDate !== lockStateDate || diff >= 1) {
        updateWarnDB(DB);
        await updateWarnDBOnline();
        return;
      }

      enableMarkButton(false);
    };

    getLockObj.onerror = function (e) {
      console.error('Error reading from warnDB:', e.target.error);
    };
  };

  request.onerror = function (e) {
    console.error('Error opening warnDB:', e.target.error);
  };
}
function onloadMark(){
  const request = indexedDB.open('adexDBrecord', 1);

  request.onupgradeneeded = function (event) {
    const DB = event.target.result;
    if (!DB.objectStoreNames.contains('att-records')) {
      DB.createObjectStore('att-records', {
        keyPath : "id",
        autoIncrement: true });
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
    console.error("Error opening IndexedDB:", event.target.error);
    statusDisplay(false, "Failed to save offline data.");
  };
}

function onloadCheckInterval(){
  const request = indexedDB.open('warnDB');
  request.onupgradeneeded = function(e){
    const DB = e.target.result;
    if(!DB.objectStoreNames.contains('warn')){
      DB.createObjectStore('warn');
      console.log('Success creating warn database')
    };
  }
  request.onsuccess = function(e){
    const DB = e.target.result;
    const syncInterval = setInterval(() => {
      checkDisability(DB,syncInterval);
    }, 20000);
  }
  request.onerror = (e)=>{
    console.error('error trying to upgrade Warn database :',e.target.error);
  }
}

window.addEventListener('DOMContentLoaded',async () => {
  await onLoadCheck();
  onloadCheckInterval();
  onloadMark();
  reviewBut.addEventListener('click',()=>{
    window.location.href = 'review.html';
  })
  let cancelState = false;
  const cancelStateButton = document.querySelector('.cancle');
  const sideBar = document.querySelector('.side-bar');
  cancelStateButton.addEventListener('click',()=>{
    sideBar.style.width = !cancelState ? '100%' : '0%';
    cancelState = !cancelState;
  })
  document.querySelector('.bar').addEventListener('click',()=>{
    sideBar.style.width = !cancelState ? '100%' : '0%';
    cancelState = !cancelState;
  })
  
  const request = indexedDB.open('adexusers', 1);
  
  request.onupgradeneeded = function (event) {
    const DB = event.target.result;
    if (!DB.objectStoreNames.contains('users')) {
      DB.createObjectStore('users');
    }
  };

  request.onsuccess = function (event) {
    const DB = event.target.result;

    if (!DB.objectStoreNames.contains('users')) {
      console.error("Object store 'users' does not exist.");
      return;
    }

    const tx = DB.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const getRequest = store.get('currentUser');

    getRequest.onsuccess = function () {
      stdUser = getRequest.result;
      if (stdUser) {
        displayUserDetails(stdUser);
      } else {
        window.location.href = 'ADEXlogin.html'; // redirect if not logged in
      }
    };
  };

  request.onerror = function (event) {
    console.error('Error opening IndexedDB:', event.target.error);
  };
  
  //drawing on ADEX...
  const canvas = document.querySelector(".canvas");
  const ctx = canvas.getContext("2d");
  ctx.strokeStyle = "black";
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

function displayUserDetails(user) {
  document.getElementById('userName').textContent = user.name || 'USER NAME';
  document.getElementById('regNumber').textContent = user.regNm || 'USER_REG NUMBER';
  document.querySelector('.user-nm').innerHTML = user.name || `<a href="ADEXlogin.html">Login</a>`;
  document.querySelector('.department').textContent = user.dept || 'Department';
}

//log out function
document.querySelector('.log-out').addEventListener('click',()=>{
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
    return ;
  } 
}

// --- Time-based Attendance Activation ---00p1
function checkAttendanceState() {
  const day = new Date().getDay();
  const hour = new Date().getHours();
  

  switch (day) {
    case 1: // Monday
      if (hour >= 8 && hour < 10) changeCourse(8, 10, "GST121");
      else if (hour >= 13 && hour < 14) changeCourse(13, 14, "GET121");
      else if (hour >= 14 && hour < 16) changeCourse(14, 16, "CHM121");
      break;
    case 2: // Tuesday
      if (hour >= 8 && hour < 10) changeCourse(8, 10, "MTH122");
      else if (hour >= 10 && hour < 12) changeCourse(10, 12, "PHY128");
      else if (hour >= 13 && hour < 15) changeCourse(13, 15, "GST121");
      else if (hour >= 15 && hour < 17) changeCourse(15, 17, "STA121");
      break;
    case 3: // Wednesday
      if (hour >= 8 && hour < 10) changeCourse(8, 10, "MTH121");
      else if (hour >= 10 && hour < 12) changeCourse(10, 12, "CPE121");
      else if (hour >= 15 && hour < 17) changeCourse(15, 17, "PHY121");
      break;
    case 4: // Thursday
      if (hour >= 8 && hour < 10) changeCourse(8, 10, "CHM123");
      break;
    case 5: // Friday
      if (hour >= 8 && hour < 10) changeCourse(8, 10, "PHY122");
      else if (hour >= 10 && hour < 12) changeCourse(
        10, 12, "CPE121");
      else if (hour >= 13 && hour < 14) changeCourse(13, 14, "MTH122");
      else if (hour >= 14 && hour < 16) changeCourse(14, 16, "GET121");
      break;
    default :
      alert('No classes today')
      clearInterval(interval);
  }
}
async function loadAttendane(){
  let check = await isReallyOnline();
  if(!check){
    attView.classList.add('errorView')
    return attView.innerHTML = 'You are currently offline';
  }
  const dept = Department.textContent;
  const course = currentCourseDisplay.textContent;
  if(course === 'No class') return attView.innerHTML = '<h3>No class yet!</h3>';
  const date = getCurrentDate();
  const CD = `${course}_${date}`;
  
  const docRef = doc(db,course,CD);
  await onSnapshot(docRef,(snap)=>{
    if(snap.exists()){
      attView.innerHTML = '<h2>Students who mark</h2>';
      const attendees = snap.data()[dept];
      if(!attendees || attendees.length === 0) return attView.innerHTML = 'No student Mark yet!';
      let users = '';
      for(const student of attendees){
        users += `<p>${student.name}  RegNo: ${student.regNm} just mark Attendance</p>`;
      };
      attView.innerHTML = users
    }else{
      attView.innerHTML = '<h3>No student marked yet</h3>';
    }
  })
}
let reviewSt = false;
attReview.addEventListener('click',async ()=>{
  await loadAttendane();
  attView.style.height = reviewSt ? '0em':'20em';
  attView.style.padding = reviewSt ? '0px':'10px 5px';
  reviewSt = !reviewSt;
}) ;

let interval = setInterval(()=>{
  checkAttendanceState();
},1000);
//marking Attendance programmes
async function markAttendance(name, reg, dept, course, date) {
  const courseDate = `${course}_${date}`;
  const docRef = doc(db, course, courseDate);
  const userObject = {
    name: name,
    regNm: reg,
  };

  try {
    await setDoc(docRef, {
      [dept]: arrayUnion(userObject)
    }, { merge: true }); // ensures it creates or updates without overwriting other depts
    spinnerContainer.style.display ='none';
    setTimeout(() => {
      statusDisplay(true, 'Attendance submitted successfully! Thank you for using ADEX');
    }, 1000);

  } catch (err) {
    spinnerContainer.style.display = 'none';
    setTimeout(() => {
      statusDisplay(true, 'Error marking Attendance, please check your network');
    }, 1000);
  
    syncAttendanceData(name, reg, dept, course, date);
  }
}

//geolocation
/*
async function getGeoLocsUI() {
  const userLocs = [];
  const coor = [5.0385, 7.9754, 5.0398, 7.9765];
  const [minLat, minLong, maxLat, maxLong] = coor;

  function getLocation() {
!!!    return new Promise((resolve, reject) => {
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
  const batch = writeBatch(db);
  const CD = `${course}_${date}`;
  const docRef = doc(db, course, CD);

  studentList.forEach(({ name, regNm, dept }) => {
    if (!name || !regNm || !dept) {
      console.warn("Skipping invalid student record:", { name, regNm, dept });
      return;
    }

    const userObject = { name, regNm };

    batch.set(docRef, {
      [dept]: arrayUnion(userObject)
    }, { merge: true });
  });

  try {
    await batch.commit();
    console.log("✅ Batch attendance submitted");
  } catch (err) {
    console.error("❌ Batch submission failed:", err.message);
  }
}

//warninig code...
function storeWarn(lockState,lockStateTime,lockStateDate){
  const lockObj = {
    lockState,
    lockStateTime,
    lockStateDate
  };
  const request = indexedDB.open('warnDB');
  request.onupgradeneeded = function(e){
    const DB = e.target.result;
    if(!DB.objectStoreNames.contains('warn')){
      DB.createObjectStore('warn');
    };
  }
  request.onsuccess = function(e){
    const DB = e.target.result;
    const tx = DB.transaction('warn','readwrite');
    const store = tx.objectStore('warn');
    const storeRequest = store.put(lockObj,'currentLock');
    storeRequest.onsuccess = (e)=>{
      console.log('successfully updated Warn database');
    }
    storeRequest.onerror = (e)=>{
      console.error('error from updating warn database ',err);
    }
  }
  request.onerror = (e)=>{
    console.error('error trying to upgrade Warn database :',err);
  }
}

async function updateWarnDBOnline(){
  const level = stdUser.level;
  const dept = stdUser.dept;
  console.log(stdUser);
  const collect = collection(db, `user_${level}`, 'department', dept);
  isReallyOnline().then(async (online)=>{
    try{
      if(online){
        const stdDocs = await getDocs(collect);
        const studentDoc = stdDocs.docs.find(docSnap =>
          docSnap.data().email === stdUser.email &&
          docSnap.data().regNm === stdUser.regNm
        );
        const studentRef = studentDoc.ref;
        await updateDoc(studentRef, {
          'stdObj.lockState': 0,
          'stdObj.lockStateTime': 0,
          'stdObj.lockStateDate': '',
        });
        enableMarkButton(true);
        console.log('✅ Student lock state updated.Acct unlocked');
      }
    }catch(err){
      console.log('Error from checkDisability: failed to update online',err.message)
    }
  })
}
function updateWarnDB(DB){
  const lockObj = {
    lockState : 0,
    lockStateTime : 0,
    lockStateDate : '',
  };
  const tx = DB.transaction('warn','readwrite');
  const warnDatabase = tx.objectStore('warn');
  const warnDatabaseAction = warnDatabase.put(lockObj,'currentLock');
  warnDatabaseAction.onsuccess = ()=>{
    enableMarkButton(true);
    console.log('successful updated warnDB...offline');
  }
  warnDatabaseAction.onerror = (e)=>{
    console.log('Error trying to update warnDB :',e.target.error)
  }
}


function getTimeInSecs(){
  const now = new Date();
  const hour = now.getHours();
  const Min = now.getMinutes();
  const Sec = now.getSeconds();
  return hour*3600 + Min*60 + Sec;
}

async function warning(student){
  statusDisplay(false,'Warning Portal is not open,if too many attempts acct will be lock for 30min...mark when portal is open! ');
  await warn(student);
}

async function warn(student) {
  const level = stdUser.level;
  const dept = stdUser.dept;
  console.log(stdUser);
  const collect = collection(db, `user_${level}`, 'department', dept);

  try {
    const stdDocs = await getDocs(collect);
    const studentDoc = stdDocs.docs.find(docSnap =>
      docSnap.data().email === stdUser.email &&
      docSnap.data().regNm === stdUser.regNm
    );

    if (!studentDoc) {
      console.log('❌ Student not found in collection.');
      return;
    }

    const studentRef = studentDoc.ref;
    let lockNum = studentDoc.data().stdObj.lockState;
    if(lockNum >= 3){
      alert('Too many attempts your acct has been disabled for 30 miuntes');
      enableMarkButton(false);
      const lockTime = studentDoc.data().stdObj.lockStateTime;
      const lockDate = studentDoc.data().stdObj.lockStateDate;
      storeWarn(lockNum,lockTime,lockDate);
      
      const request = indexedDB.open('warnDB');
      request.onupgradeneeded = function(e){
        const DB = e.target.result;
        if(!DB.objectStoreNames.contains('warn')){
          DB.createObjectStore('warn');
        };
      }
      request.onsuccess = function(e){
        const DB = e.target.result;
        const syncInterval = setInterval(() => {
          checkDisability(DB,syncInterval);
        }, 10000);
      }
      request.onerror = (e)=>{
        console.error('error trying to upgrade Warn database :',e.target.error);
      }
      return;
    }
    await updateDoc(studentRef, {
      'stdObj.lockState': increment(1),
      'stdObj.lockStateTime': student,
      'stdObj.lockStateDate': new Date().toISOString().slice(0,10),
    });
    
    

    console.log('✅ Student lock state updated.');
  } catch (err) {
    console.error('⚠️ Error trying to warn student:', err.message);
  }
}

function verifyOffline(db, callback,callback2) {
  const tx = db.transaction('warn', 'readonly');
  const store = tx.objectStore('warn');
  const getLockObj = store.get('currentLock');

  getLockObj.onsuccess = function () {
    const result = getLockObj.result;

    if (!result) {
      console.log('No lock data found');
      return;
    }

    const { lockState, lockStateTime, lockStateDate } = result;

    if (lockState === 0) {
      console.log('it f*cking works!');
      clearInterval(callback);
      if(callback2){
        clearInterval(callback2);
      }
      return;
    }

    console.log('from offline :', result);

    const currentDate = new Date().toISOString().slice(0, 10);
    if (currentDate !== lockStateDate) {
      updateWarnDB(db);
      clearInterval(callback);
      if(callback2){
        clearInterval(callback2);
      }
      return;
    }

    let currentTime = getTimeInSecs();
    const diff = (parseInt(currentTime) - parseInt(lockStateTime)) / 1800;

    if (diff >= 1) {
      updateWarnDB(db);
      clearInterval(callback);
      if(callback2){
        clearInterval(callback2);
      }
      return;
    }

    enableMarkButton(false);
  };

  getLockObj.onerror = function (e) {
    console.error('Error reading from warnDB:', e.target.error);
  };
}
async function verifyOnline(callback){
  
  let level = stdUser.level;
  let dept = stdUser.dept;
  const cllct = collection(db,`user_${level}`,'department',dept);
  try{
    const userSnap = await getDocs(cllct);
    const userSnapData = userSnap.docs.find(std=> 
      std.data().email === stdUser.email && std.data().regNm === stdUser.regNm
    );
    if(!userSnapData){
      alert('pls check INTERNET connection and reload app.If error presist then your account is not found on our database an this may result to issues...pls resolve to contact ADEX');
      clearInterval(callback);
      return;
    } 
    const { lockState,lockStateTime,lockStateDate } = userSnapData.data().stdObj;
    if(lockState === 0){
      console.log('online fetched successful but lock is 0, acct enabled successfully!');
      await updateWarnDBOnline();
      clearInterval(callback);
      return;
    }
    console.log('from online',userSnapData.data().stdObj);
    const currentDate = new Date().toISOString().slice(0,10);
    if(currentDate !== lockStateDate ){
      await updateWarnDBOnline();
      return clearInterval(callback);
    }
    let currentTime = getTimeInSecs();
    const diff = (parseInt(currentTime) - parseInt(lockStateTime))/1800;
    if(diff >= 1){
      await updateWarnDBOnline();
      return clearInterval(callback);
    }
    enableMarkButton(false);
  }catch(err){
    console.log('Error from verifyOnline :',err.message);
  }
}

function checkDisability(db,callback,callback2){
  isReallyOnline().then(async (online)=>{
    try{
      if(online){
        await verifyOnline(callback);
      }else{
        verifyOffline(db,callback,callback2);
      }
    }catch(err){
      console.log('Error from checkDisability: ',err.message)
    }
  })
}

async function verifyStudentsPortal(student,course,date){
  const docm = doc(db,'Portal',course);
  const Student = Number(student);
  try{
    const result = await getDoc(docm);
    if(!result.exists()){
      return { state : false };
    }
    const fetched = result.data()[`${course}_${date}`];
    if(!fetched){
      return { state : false };
    }
    const output = fetched[fetched.length - 1];
    console.log(output);
    if(!output.startTime || !output.endTime){
      return {state : false};
    }
    if(Student < Number(output.startTime)){
      return {state : false};
    }
    if(Student > Number(output.startTime) && Student < Number(output.endTime)){
      return { state : true };
    }
    if(Student > Number(output.endTime)){
      return { state : 'Time_past'};
    }
  }catch(err){
    console.error('Error from checking if portal exist:',err.message);
    statusDisplay(false,'check your internet connectivity');
  }
}

async function markPortal(output,name,regNm,department,course,date,student){
  
  try{
    switch(output.state){
      case false :
        return await warning(student);
      case 'Time_past':
        return alert('Portal has already been CLOSED...pls meet with the class Rep or ADEX to show you were present in class!');
      case true:
        return markAttendance(name,regNm,department,course,date);
    }
  }catch(err){
    console.log('Error from markPortal :',err.message);
    alert('network error');
  }
}

//Marking Attendance logic
markBt.addEventListener('click',async (e)=>{
  e.preventDefault();
  
  const name = (Name.textContent.trim() !== 'USER NAME')? Name.textContent.trim() : false;
  const regNm =  (RegNM.textContent.trim() !== 'USER_REG NUMBER') ? RegNM.textContent.trim() : false;
  const department = (Department.textContent.trim() !== 'Department') ? Department.textContent.trim() : false;
  let cours = (currentCourseDisplay.textContent.trim() !== 'No class') ? currentCourseDisplay.textContent.trim() : false;
  
  if(!name || !regNm || !department || !cours) return alert('All ADEX field must be filled!');

  const course = cours.replace(/\s+/g, '').toUpperCase();
  
  
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
  spinnerContainer.style.display = 'block';
  const dateSlash = getFormattedDate();
  const date = getCurrentDate(); 
  const student = getTimeInSecs();
  //check internet connection...
  try{
    const internet = await isReallyOnline();
    if(internet){
      const output = await verifyStudentsPortal(student,course,dateSlash);
      await markPortal(output,name,regNm,department,course,date,student);
      spinnerContainer.style.display = 'none';
      return;
    } 
    
    spinnerContainer.style.display = 'none';
    syncAttendanceData(name,regNm,department,course,date,dateSlash,student);
  }catch(err){
    spinnerContainer.style.display = 'none';
    console.log('Error checking internet connection',err);
    alert('Error checking internet connection');
  }
  
})

//Attendance marking offline...
function syncAttendanceData(name, reg, dept, course, date,dateSlash,student) {
  const userConsent = confirm("No internet connection detected. Do you want to continue with offline attendance? Your data will be synced later.");

  if (!userConsent) {
    statusDisplay(false, "Offline marking cancelled.");
    return;
  }

  const offlineUser = { name, regNm: reg, dept, course, date, dateSlash,student};

  const request = indexedDB.open('adexDBrecord', 1);

  request.onupgradeneeded = function (event) {
    const db = event.target.result;
    if (!db.objectStoreNames.contains('att-records')) {
      db.createObjectStore('att-records', {
        keyPath : "id",
        autoIncrement: true });
    }
  };

  request.onsuccess = function (event) {
    const db = event.target.result;

    // Important: Ensure the object store exists before transaction
    if (!db.objectStoreNames.contains('att-records')) {
      console.error("Object store not found.");
      statusDisplay(false, "Database not ready yet. Try again.");
      return;
    }

    const tx = db.transaction('att-records', 'readwrite');
    const store = tx.objectStore('att-records');
    store.add(offlineUser);
    statusDisplay(true, "Offline attendance saved and will sync automatically.");

    // Trigger syncing every 3 seconds
    const syncInterval = setInterval(() => {
      trySyncStoredAttendance(db, syncInterval);
    }, 3000);
  };

  request.onerror = function (event) {
    console.error("Error opening IndexedDB:", event.target.error);
    statusDisplay(false, "Failed to save offline data.");
  };
}
function deleteAdexDB() {
  const deleteRequest = indexedDB.deleteDatabase('adexDBrecord');

  deleteRequest.onsuccess = function () {
    console.log("adexDB successfully deleted.");
  };

  deleteRequest.onerror = function (event) {
    console.error("Error deleting adexDB:", event.target.error);
    alert("Failed to delete offline attendance data.");
  };

  deleteRequest.onblocked = function () {
    console.warn("Delete blocked: Close all other tabs using this database.");
    alert("Delete blocked. Please close other tabs using the site and try again.");
  };
}

//syncing data on internet connection...
function trySyncStoredAttendance(db, interval) {
  isReallyOnline().then(async (online) => {
    if (!online) return;

    const tx = db.transaction('att-records', 'readwrite');
    const store = tx.objectStore('att-records');
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = async function () {
      const records = getAllRequest.result;

      if (!records.length) {
        clearInterval(interval);
        console.log('cleared interval for attendance syncing');
        return;
      }

      try {
        if (records.length >= 1) {
          // Group by course and date for batching
          const grouped = {};
          for(const r of records){
            const output = await verifyStudentsPortal(r.student,r.course, r.dateSlash);
            if(output.state){
              const key = `${r.course}_${r.date}`;
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(r);
              console.log('marked', r.course);
            }
            console.log('did not ',r.course)
          };
          
          if(Object.keys(grouped).length <= 0){
            console.log('group is empty')
          }else{
            for (const key in grouped) {
              const [course, date] = key.split('_');
              await batchMarkAttendance(grouped[key], course, date);
            }
          }
        } else {
          // Less than 5: sync individually
          for (const record of records) {
            const output = await verifyStudentsPortal(record.student,record.course, record.dateSlash);
            await markPortal(output,record.name, record.regNm, record.dept, record.course, record.date);
          }
          clearInterval(interval);
        }
        db.close();
        // Clear records after successful sync
        deleteAdexDB();

      } catch (err) {
        console.error("Sync failed:", err.message);
        
      }
    };

    getAllRequest.onerror = function () {
      console.error("Failed to read from IndexedDB during sync.");
    };
  });
  }
