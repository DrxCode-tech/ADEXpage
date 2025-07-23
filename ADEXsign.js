import { db, auth } from "./firebaseConfig.js";
import {
  query,
  getDocs,
  addDoc,
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";

// Initialization of inputs
const signUpButton = document.getElementById('signupForm');
const Name = document.getElementById('name');
const RegNM = document.getElementById('regNumber');
const Department = document.getElementById('department');
const Level = document.getElementById('level');
let Email ;


// Messaging route
const message = document.getElementById('statusMessage');
const spinner = document.querySelector('.spinner-container');

// Status function
let inter;
function statusDisplay(state, txt) {
  clearTimeout(inter);
  message.innerHTML = txt;
  message.style.color = state ? 'green' : 'red';
  message.style.top = '15px';
  inter = setTimeout(() => {
    message.style.top = '-100%';
    message.innerHTML = '';
  }, 7000);
}

// Store user data under key "currentUser"
function storeUser(user) {
  const request = indexedDB.open("adexUsers", 1);

  request.onupgradeneeded = function(event) {
    const db = event.target.result;
    if (!db.objectStoreNames.contains("users")) {
      db.createObjectStore("users");
    }
  };

  request.onsuccess = function(event) {
    const db = event.target.result;
    const tx = db.transaction("users", "readwrite");
    const store = tx.objectStore("users");

    store.put(user, "currentUser");

    tx.oncomplete = function () {
      console.log("User stored successfully.");
      db.close();
    };

    tx.onerror = function() {
      console.error("Failed to store user.");
      db.close();
    };
  };

  request.onerror = function(event) {
    console.error("IndexedDB error while storing:", event.target.error);
  };
}

// Checking regNum - standardize format
function standardizeRegNumber(regNumber) {
  // Prioritize longer separators first to avoid partial matches
  const separators = [
      '),', ')-', ')(', '].[',  // Multi-character separators first
      ',', '-', ':', '_', ' ', ';', '|', ')', '(', '[', ']',  // Single-character
      '..'  // Only treat double-dots as separator, not single dots
  ];
  
  // Create regex pattern that matches any separator
  const separatorPattern = new RegExp(
      separators.map(sep => escapeRegExp(sep)).join('|'),
      'g'
  );
  
  // First pass: replace known separators
  let result = regNumber.replace(separatorPattern, '/');
  
  // Second pass: clean up any resulting duplicate slashes
  result = result.replace(/\/+/g, '/');
  
  return result;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Check level validity
function checkLevel(value) {
  const validValues = ['100', '200', '300', '400', '500'];
  return validValues.includes(value);
}

// Checking if user exists on DB
async function checkUser(level, email, dept, regNm) {
  const reg = regNm.replace('/', '-');
  const docm = doc(db, 'UNIUYO', level, dept, reg);
  try {
    const snapUserData = await getDoc(docm);
    return snapUserData.exists();
  } catch (err) {
    console.error('Error checking user:', err.message);
    return false;
  }
}

async function verifyAndOpen(email, regNm, level, dept) {
  const reg = regNm.replace('/', '-');
  const docm = doc(db, 'UNIUYO', level, dept, reg);

  try {
    const snapUserData = await getDoc(docm);
    if (snapUserData.exists()) {
      const userDt = snapUserData.data();
      if (userDt && userDt.email === email && userDt.regNm === regNm) {
        const newUser = {
          uid: userDt.uid,
          name: userDt.name,
          regNm: userDt.regNm,
          email: userDt.email,
          dept: userDt.dept,
          date: userDt.date,
        };
        storeUser(newUser);
        spinner.style.display = 'none';
        statusDisplay(true, `Welcome back ${newUser.name}!`);
        window.location.href = "V3ADEX.html";
      } else {
        spinner.style.display = 'none';
        return statusDisplay(false, 'Invalid email or regNumber!');
      }
    } else {
      spinner.style.display = 'none';
      return statusDisplay(false, 'User not found.');
    }
  } catch (err) {
    statusDisplay(false, 'Please check your internet connectivity!');
    spinner.style.display = 'none';
  }
}


// Sign up new user and store in Firebase & IndexedDB
async function createUserAcct(user,name,regNm,email,dept,level){
  const newUser = {
    uid: user.uid,
    name,
    level,
    regNm,
    email,
    dept,
    date: new Date().toISOString(),
    stdObj:{
      lockState:0,
      lockStateTime:0,
      lockStateDate:'',
    }
  };
  const reg = regNm.replace('/','-');
  try{
    const docm = doc(db,'UNIUYO',level,dept,reg);
    const emailDocm = doc(db,'EmailIndex',level,email,reg);
    await setDoc(docm, newUser);
    await setDoc(emailDocm,newUser);

    storeUser(newUser);
    spinner.style.display = 'none';
    statusDisplay(true, 'SignUp successfully.');
    indexedDB.deleteDatabase('savedRecord');
    window.location.href = 'V3ADEX.html';
  }catch(err){
    statusDisplay(false,`Error adding user to database:${err.message} `)
  }
}

function getCurrentUser(){
  return new Promise((res,rej)=>{
    onAuthStateChanged(auth,user=>{
      if(user){
        res(user);
      }else{
        rej('user not logged in');
      }
    })
  })
}

async function signUpUser(newUser,fullName,email,level, dept, regNm) {
  try {
    await createUserAcct(newUser, fullName, regNm,email, dept, level);
    spinner.style.display = 'none';
  } catch (error) {
    spinner.style.display = 'none';
    statusDisplay(false, "Sign-up failed: " + error.message);
    console.error("Signup failed:", error);
  }
}

// Form submission mechanism
signUpButton.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if(!navigator.onLine) return statusDisplay(false,'You are currently offline');
  
  const name = Name.value.trim();
  const regNm = standardizeRegNumber(RegNM.value.trim()).toUpperCase();
  const department = Department.value.trim();
  //const email = Email.value.trim();
  const levelInput = Level.value.trim();
  //const passwordInput = Password.value.trim();

  // Basic empty field check
  if (!name || !regNm || !department || !levelInput) {
    return statusDisplay(false, "All fields are required.");
  }

  if (!checkLevel(levelInput)) {
    return statusDisplay(false, 'Level value is not valid');
  }


  spinner.style.display = 'block';
  const result = await getCurrentUser();
  const email = result.email.toLowerCase();
  // Check if user already exists
  const userPresence = await checkUser(levelInput,email ,department,regNm);
  if (userPresence) {
    await verifyAndOpen(email,regNm, levelInput, department);
    return;
  }

  try{
    await signUpUser(result,name, email, levelInput, department, regNm);
     }catch(err){
    statusDisplay(false, `${err}`);
  }
  
})
