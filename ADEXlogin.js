import { db, auth } from "./firebaseConfig.js";
import {
  getDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";

// DOM elements
const DB = window.localStorage;
const loginButton = document.getElementById('loginForm');
const RegNM = document.getElementById('regNm');
//const Department = document.getElementById('department');
const spin = document.querySelector('.spinner-container');
const messager = document.querySelector('.messager');

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

/*document.addEventListener('DOMContentLoaded',()=>{
  const passwordInput = document.getElementById('passwordInput');
  const togglePassword = document.getElementById('togglePassword');
  const eyeOpen = document.getElementById('eyeOpen');
  const eyeClosed = document.getElementById('eyeClosed');
  eyeOpen.style.display = 'none';
  togglePassword.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    eyeOpen.style.display = isHidden ? 'inline' : 'none';
    eyeClosed.style.display = isHidden ? 'none' : 'inline';
  });
})*/

// Format reg number
function standardizeRegNumber(regNumber) {
  const separators = [',', '-', ':', '_', ' ', ';', '|', ')', '(', '[', ']', '..'];
  const pattern = new RegExp(separators.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  return regNumber.replace(pattern, '/').replace(/\/+/g, '/');
}

function displayDeptfromReg(reg){
  const depath = `${reg.split('/')[1]}${reg.split('/')[2]}`;
  const objDept = {
    'EGCO':'COMPUTER_ENGINEERING',
    'EGCV':'CIVIL_ENGINEERING',
    'EGCE':'CHEMICAL_ENGINEERING',
    'EGEE':'ELECTRICAL_AND_ELECTRONICS_ENGINEERING',
  };
  
  return objDept[depath];
}

// Correct user lookup
async function findUserInFirestore(regNm) {
  const reg = regNm.replace(/\//g,'-');
  const dept = displayDeptfromReg(regNm);
  const level = regNm.split('/')[0];
  const docm = doc(db,'UNIUYO',level,dept,reg);
  try{
    const user = await getDoc(docm);
    if(user.exists()){
      return user.data();
    }
  }catch(err){
    console.error('error finding user',err.message);
  }
  return false;
}

function clearUserData() {
  DB.removeItem('att-his');
  DB.removeItem('att-his-state');
  DB.removeItem('currentUser');
  let request = indexedDB.deleteDatabase('AdexUsers');
  request.onblock = ()=>{
    console.log('failed to delete ...pls make sure to close all tabs concerning ADEX before proceeding ')
  }
  request.onsuccess = function (event) {
    console.log('successfully cleared previous user')
  };
  request.onerror = ()=>{
    console.error('an error occurred trying to clear db',request.error );
  }
  
  let request2 = indexedDB.deleteDatabase('warn');
  request2.onblock = ()=>{
    console.log('failed to delete ...pls make sure to close all tabs concerning ADEX before proceeding ')
  }
  request2.onsuccess = function (event) {
    console.log('successfully cleared previous warn')
  };
  request2.onerror = ()=>{
    console.error('an error occurred trying to clear db',request2.error );
  }
}

//function for adding current user to database...
function addUserToIndexedDB(userObj) {
  DB.setItem('currentUser',JSON.stringify(userObj));
  console.log('added data to localStorage');
  const request = indexedDB.open('AdexUsers',2);
  request.onupgradeneeded = function (event) {
    const db = event.target.result;
    if (!db.objectStoreNames.contains('users')) {
      db.createObjectStore('users');
      console.log('onupgradeneeded successful');
    }
  };
  request.onsuccess = function (event) {
    const db = event.target.result;
    const tx = db.transaction('users', 'readwrite');
    tx.objectStore('users').put(userObj,'currentUser');
    tx.oncomplete = () => db.close();
    console.log('New user added');
  };
  request.onerror = ()=>{
    console.error('an error occurred trying to add User to IndexedDB db',request.error );
    db.close();
  }
}

//network function
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

// Form submission
loginButton.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  //checking connection to internet
  const connection = await isReallyOnline();
  if(!connection) return statusDisplay(false,'You don\'t have an internet connection!');
  
  spin.style.display = 'block';
  //const department = Department.value.trim();
  const regNm = standardizeRegNumber(RegNM.value.trim().toUpperCase());

  if (!regNm) {
    spin.style.display = 'none';
    return statusDisplay(false, "Registration number is required.");
  }

  try {

    const userData = await findUserInFirestore(regNm);

    if (!userData) {
      spin.style.display = 'none';
      statusDisplay(false, 'User not found. Please sign up.');
      clearUserData();
      return window.location.href = 'index.html';
    }

    if (userData.regNm === regNm) {
      clearUserData(); // clear previous user
      addUserToIndexedDB(userData); // add current user
      //storeUser(userData) your existing backup store (if needed)

      spin.style.display = 'none';
      statusDisplay(true, 'Login successful!');
      setTimeout(() => window.location.href = 'V3ADEX.html', 1500);
    }else {
      spin.style.display = 'none';
      statusDisplay(false, 'Credentials do not match our records.');
      clearUserData();
      setTimeout(() => window.location.href = 'index.html', 1500);
    }
  } catch (err) {
    spin.style.display = 'none';
    statusDisplay(false, `Login failed: ${err.message}`);
  }
});

const footer = document.querySelector('.footer');
footer.addEventListener('click',()=>{
  clearUserData();
  window.location.href = 'index.html';
})
