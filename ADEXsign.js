
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
const Email = document.getElementById('email');
const Password = document.getElementById('password');

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

//update create Acct page!
/*function updateCreateAcctPage(name, regNm, dept, level, email, password) {
  Name.value = name;
  RegNM.value = regNm;
  Department.value = dept;
  Level.value = level;
  Email.value = email;
  Password.value = password;
}

// Save data into IndexedDB
function saveForVerification(name, regNm, dept, level, email, password) {
  const saveUser = { name, regNm, dept, level, email, password };
  const request = indexedDB.open('savedRecord'); // version required for onupgradeneeded

  request.onupgradeneeded = function (e) {
    const idb = e.target.result;
    if (!idb.objectStoreNames.contains('saved_record')) {
      idb.createObjectStore('saved_record');
    }
  };

  request.onsuccess = function (e) {
    const idb = e.target.result;

    const trx = idb.transaction('saved_record', 'readwrite');
    const store = trx.objectStore('saved_record');
    const saveRequest = store.put(saveUser, 'saveUser');
    console.log(saveUser);
    
    saveRequest.onsuccess = function () {
      console.log('Saved successfully');
    };
    saveRequest.onerror = (e) => {
      console.error('Error saving', e.target.error.message);
    };
  };

  request.onerror = (e) => {
    console.error('Error opening savedRecord DB', e.target.error.message);
  };
}

// Load data back from IndexedDB and fill page
function getForVerification() {
  alert('lì');
  const request = indexedDB.open('savedRecord');

  request.onsuccess = function (e) {
    const idb = e.target.result;
    
    if(!idb.objectStoreNames.contains('saved_record')){
      console.log('no new user yet...proceed');
      return;
    }

    const trx = idb.transaction('saved_record', 'readonly');
    const store = trx.objectStore('saved_record');
    const getRequest = store.get('saveUser');

    getRequest.onsuccess = () => {
      const result = getRequest.result;
      if (result) {
        const { name, regNm, dept, level, email, password } = result;
        updateCreateAcctPage(name, regNm, dept, level, email, password);
        console.log('Page data displayed successfully');
        
        onAuthStateChanged(auth, async (user) => {
          if (user && user.emailVerified) {
            console.log("User verified. Proceeding to create account...");
            await createUserAcct(user); // Your function to finally create the account
          } else {
            console.log("User not verified yet or not logged in");
          }
        });
      } else {
        console.log('No saved user data found.');
      }
    };

    getRequest.onerror = (e) => {
      console.error('Error getting saved user', e.target.error.message);
    };
  };

  request.onerror = (e) => {
    console.error('Error opening DB for reading', e.target.error.message);
  };
}*/

// Ensure DB and store exist, then check if user exists
function initAndCheckUser(callback) {
  const request = indexedDB.open("adexDBusers", 1);

  request.onupgradeneeded = function(event) {
    const idb = event.target.result;

    // Create "users" store if it doesn't exist
    if (!idb.objectStoreNames.contains("users")) {
      idb.createObjectStore("users"); // Manual key needed
    }
  };

  request.onsuccess = function(event) {
    const idb = event.target.result;

    // Now safe to check if user exists
    const tx = idb.transaction("users", "readonly");
    const store = tx.objectStore("users");

    const getRequest = store.get("currentUser");
    getRequest.onsuccess = function() {
      if (getRequest.result) {
        console.log("User found in IndexedDB.");
        callback(true);
      } else {
        console.log("No user found.");
        callback(false);
      }
      idb.close();
    };

    getRequest.onerror = function() {
      console.error("Error reading from IndexedDB.");
      callback(false);
      idb.close();
    };
  };

  request.onerror = function(event) {
    console.error("IndexedDB open error:", event.target.error);
    callback(false);
  };
}

// Store user data under key "currentUser"
function storeUser(user) {
  const request = indexedDB.open("adexDBusers", 1);

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

// Check strong password criteria
function isStrongPassword(password) {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return hasUppercase && hasLowercase && hasNumber && hasSymbol;
}

// Checking if user exists on DB
async function checkUser(email, level, dept) {
  const collect = collection(db, `user_${level}`, 'department', dept);
  const snapUserData = await getDocs(collect);
  if(snapUserData.size > 0){
    return snapUserData.docs.some(doc => {
    const docm = doc.data();
    return docm.email === email;
    }); 
  }else{
    console.error('no users found !');
  }
  
}

async function verifyAndOpen(email,regNm,level,dept){
  const collect = collection(db, `user_${level}`, 'department', dept);
  try{
    const snapUserData = await getDocs(collect);
    if(snapUserData.size > 0){
      const docum = snapUserData.docs.find(doc=>{
      return doc.data().email === email && standardizeRegNumber(doc.data().regNm) === regNm;
      });
      if (docum) {
        const userDt = docum.data();
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
        statusDisplay(true, "Welcome back!");
        window.location.href = "V3ADEX.html";
      }else{
        return statusDisplay(false,'invalide email or regNumber!');
        spinner.style.display = 'none';
      }
    }else{
      console.error('Error no users! ',error.message );
      spinner.style.display = 'none';
    }
  }catch(err){
    statusDisplay(false,'Pls, check your internet connectivety!');
    spinner.style.display = 'none';
  }
}


// Sign up new user and store in Firebase & IndexedDB
async function createUserAcct(user,name,regNm,email,dept,level){
  const newUser = {
    uid: user.uid,
    name,
    regNm,
    email,
    dept,
    date: new Date().toISOString(),
  };
  
  try{
    const collect = collection(db, `user_${level}`, 'department', dept);
    await addDoc(collect, newUser);

    storeUser(newUser);
    spinner.style.display = 'none';
    statusDisplay(true, 'SignUp successfully.');
    indexedDB.deleteDatabase('savedRecord');
    window.location.href = 'V3ADEX.html';
  }catch(err){
    statusDisplay(false,`Error adding user to database:${err.message} `)
  }
}

async function signUpUser(fullName, email, password, level, dept, regNm) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    /*await sendEmailVerification(user, {url: 'https://drxcode-tech.github.io/AttendanceAPP/index.html?verified=true', 
    // your create account page URL
    handleCodeInApp: true,
    });
    saveForVerification(fullName,regNm,dept,level,email,password);*/
    await createUserAcct(user,fullName,regNm,email,dept,level);
    
    statusDisplay(true, 'Verification email sent! Please check your inbox.');
    spinner.style.display = 'none';

    
  } catch (error) {
    spinner.style.display = 'none';

    if (error.code === "auth/email-already-in-use") {
      statusDisplay(false, "Email already registered.");
    } else {
      statusDisplay(false, "Sign-up failed: " + error.message);
      console.error("Signup failed:", error);
    }
  }
}
document.addEventListener('DOMContentLoaded', () => {
 /* if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let reg of registrations) {
      reg.unregister().then(() => {
        console.log('✅ Service worker unregistered');
      });
    }
  });

  // Clear caches
  if (window.caches) {
    caches.keys().then((names) => {
      for (let name of names) {
        caches.delete(name);
        console.log(`🗑️ Cache ${name} deleted`);
      }
    });
  }
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => {
          console.log('Service Worker registered:', reg);

          // Listen for update notification
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'UPDATE_AVAILABLE') {
              const confirmed = confirm("A new version is available. Reload now?");
              if (confirmed) {
                window.location.reload();
              }
            }
          });
        })
        .catch(err => console.error('Service Worker registration failed:', err));
    });
  }*/
  initAndCheckUser(function(userExists) {
    if (userExists) {
      document.querySelector('.spinner-container1').style.display = 'flex';
      console.log("User already logged in.");
      setTimeout(() => {
        window.location.href = "V2ADEX.html"; // redirect after 1.5 sec
      }, 1500);
    } else {
      console.log("No user found.");
    }
  });
  
  //toogle eye password
  const passwordInput = document.getElementById('password');
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
  
  /*getForVerification();*/
});

// Form submission mechanism
signUpButton.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if(!navigator.onLine) return statusDisplay(false,'You are currently offline');
  
  const name = Name.value.trim();
  const regNm = standardizeRegNumber(RegNM.value.trim()).toUpperCase();
  const department = Department.value.trim();
  const email = Email.value.trim();
  const levelInput = Level.value.trim();
  const passwordInput = Password.value.trim();

  // Basic empty field check
  if (!name || !regNm || !department || !email || !levelInput || !passwordInput) {
    return statusDisplay(false, "All fields are required.");
  }

  if (!checkLevel(levelInput)) {
    return statusDisplay(false, 'Level value is not valid');
  }

  if (!isStrongPassword(passwordInput)) {
    let text = `
      <p>Password must have:</p>
      <ul>
        <li>at least one Uppercase</li>
        <li>at least one Lowercase</li>
        <li>at least one Number</li>
        <li>at least one Symbol</li>
      </ul>
    `;
    return statusDisplay(false, text);
  }

  spinner.style.display = 'block';

  // Check if user already exists
  const userPresence = await checkUser(email, levelInput, department);
  if (userPresence) {
    await verifyAndOpen(email,regNm, levelInput, department);
    return;
  }

  await signUpUser(name, email, passwordInput, levelInput, department, regNm);
})

