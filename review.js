import { db } from "./firebaseConfig.js";
import {
  addDoc,
  collection
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

//init content

const Name = document.querySelector('.name');
const Email = document.querySelector('.email');

const Txt = document.querySelector('textarea');
const button = document.querySelector('.button');

const Notify = document.querySelector('.noffty');
const Process = document.querySelector('.processing');

//updating user credentials
function updateUser(name,email){
  Name.innerHTML = name;
  Email.innerHTML = email;
}

//notification system
let inter,pro;
function status(state, txt) {
  clearTimeout(inter);
  Notify.innerHTML = '';
  Notify.style.bottom = '10px';
  Notify.style.color = state ? 'lightgreen' : 'red';
  if(state){
    Notify.classList.remove('err');
    Notify.classList.add('succ');
  }else{
    Notify.classList.remove('succ');
    Notify.classList.add('err');
  }
  Notify.innerHTML = txt;
  inter = setTimeout(() => {
    Notify.style.bottom = '-100%';
  }, 5000);
}

function process(state, txt) {
  clearTimeout(pro);
  Process.innerHTML = '';
  Process.style.display = 'flex';
  Process.style.color = state ? '#4fef32' : red;
  Process.innerHTML = txt;
  pro = setTimeout(() => {
    Process.style.display = 'none';
  }, 5000);
}

//on page load
document.addEventListener('DOMContentLoaded',()=>{
  //open indexedDB
  const request = indexedDB.open('adexusers',1);
  
  request.onupgradeneeded = function(e){
    const DB = e.target.result;
    if(!DB.objectStoreNames.contains('users')){
      DB.createObjectStore('users');
    }
  };
  
  request.onsuccess = function(e){
    const DB = e.target.result;
    
    const trx = DB.transaction('users','readonly');
    const store = trx.objectStore('users');
    
    const req = store.get('currentUser');
    
    req.onsuccess = ()=>{
      const user = req.result;
      
      if(Object.keys(user).length > 0){
        updateUser(user.name,user.email);
        //success message
        status(true,'Page updated');
      }else{
        status(false,'No student record found!');
      }
    }
    req.onerror = ()=>{
      status(false,`Error reading from DB ${err}`)
    }
  }
  
  request.onerror = (e)=>{
    console.log(e.message);
    status(false,'Error from database')
  }
  
});

button.addEventListener('click',async()=>{
  const txt = Txt.value.trim();
  const name = Name.textContent.trim();
  const email = Email.textContent.trim();
  
  //checking connectivity
  if(!navigator.onLine) return status(false,'You are offline')
  
  //validate inputs
  if(!txt || !name || !email) return status(false,'You must fill all inputs');
  
  const userObj = {
    name : name,
    email : email,
    txt : txt,
  };
  
  let text = `
      <div class="processed-image">
        <div class="spinner-container" id="spinner">
          <div class="spinner"></div>
        </div>
      </div>
      <div class="processed-text">Processing, please wait...</div>
    `;
  
  try{
    Process.innerHTML = text;
    Process.display = 'flex';
    await sendReview(userObj);
    text = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="24" height="24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
      <div class="processed-text">successful</div>
    `;
    process(true,text);
  }catch(err){
    text = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
      <div class="processed-text">error sending...check connection</div>
    `;
    process(false,text)
  }
  
})

async function sendReview(updateUser){
  const collect = collection(db,'reviewDB');
  await addDoc(collect,updateUser);
  
  console.log('successfully')
}

