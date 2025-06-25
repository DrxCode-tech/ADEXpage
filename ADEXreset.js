import { db, auth } from "./firebaseConfig.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";

const Email = document.querySelector('.email');
const reset = document.querySelector('.reset');

// Add the event listener directly
reset.addEventListener('click', async () => {
  const email = Email.value.trim();

  if (!email) {
    alert("Email is required!");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent. Check your inbox.");
  } catch (error) {
    console.error("Reset error:", error.message);
    alert("Reset message: ",err.message);
  }
});
