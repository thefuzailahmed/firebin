// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getDocs, query, where, deleteDoc, doc } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDoc, updateDoc } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentFileId = null;

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDMp1eAYzRp0EyaCJvfFKkWAAU2gEgRkoU",
  authDomain: "firebin-app.firebaseapp.com",
  projectId: "firebin-app",
  storageBucket: "firebin-app.firebasestorage.app",
  messagingSenderId: "1055816237071",
  appId: "1:1055816237071:web:efc5dd90ee7a018f36e37a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Signup function
window.signup = function () {
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            showToast("Signup successful!");
            window.location.href = "login.html";
        })
        .catch((error) => {
            showToast(error.message);
        });
};

// Login function
window.login = function () {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            showToast("Login successful!");
            window.location.href = "dashboard.html";
        })
        .catch((error) => {
            showToast(error.message);
        });
};

// Upload function
window.uploadFile = function () {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];

    if (!file) {
        showToast("Please select a file");
        return;
    }

    const reader = new FileReader();

    reader.onload = async function () {
        const base64 = reader.result;

        try {
            await addDoc(collection(db, "files"), {
                userId: auth.currentUser.uid,
                fileName: file.name,
                fileData: base64,
                sharedWith: []
            });

            showToast("File uploaded successfully!");
        } catch (error) {
            showToast(error.message);
        }
    };

    reader.readAsDataURL(file);
};

// Load Function
window.loadFiles = async function () {
    const user = auth.currentUser;

    if (!user) {
        showToast("User not logged in");
        return;
    }

    const q = query(collection(db, "files"));
    const querySnapshot = await getDocs(q);

    const fileList = document.getElementById("fileList");
    fileList.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
    
        if (
            data.userId === user.uid ||
            (data.sharedWith && data.sharedWith.includes(user.email)) ||
            data.isPublic === true
        ) {
            const div = document.createElement("div");
    
            let deleteButton = "";

    // Show delete only if owner
         if (data.userId === user.uid) {
           deleteButton = `<button onclick="deleteFile('${docSnap.id}')">Delete</button>`;
        }

        div.innerHTML = `
        <strong>📄 ${data.fileName}</strong><br><br>
        <button onclick="downloadFile('${data.fileData}', '${data.fileName}')">⬇ Download</button>
        <button onclick="openShareModal('${docSnap.id}')">🔗 Share</button>
        ${deleteButton}
        `;
    
            fileList.appendChild(div);
        }
    });
};

// Download Function
window.downloadFile = function (base64, fileName) {
    const a = document.createElement("a");
    a.href = base64;
    a.download = fileName;
    a.click();
};

//Delete Function
window.deleteFile = async function (id) {
    const fileRef = doc(db, "files", id);
    const docSnap = await getDoc(fileRef);

    const data = docSnap.data();

    if (data.userId !== auth.currentUser.uid) {
        showToast("You are not allowed to delete this file!");
        return;
    }

    await deleteDoc(fileRef);
    showToast("File deleted");
    loadFiles();
};

// Share Function
window.shareFile = async function (id) {
    const choice = prompt(
        "Type:\n1 → Share with email\n2 → Make public (anyone with link)"
    );

    const fileRef = doc(db, "files", id);

    try {
        if (choice === "1") {
            const email = prompt("Enter email:");
            if (!email) return;

            const docSnap = await getDoc(fileRef);
            let sharedWith = docSnap.data().sharedWith || [];

            if (!sharedWith.includes(email)) {
                sharedWith.push(email);
            }

            await updateDoc(fileRef, {
                sharedWith: sharedWith
            });

            showToast("Shared with user!");

        } else if (choice === "2") {

            await updateDoc(fileRef, {
                isPublic: true
            });

            // generate link
            const link = window.location.origin + "/view.html?id=" + id;

            showToast("Public link:\n" + link);
        }

    } catch (error) {
        showToast(error.message);
    }
};

// Sharing Modal
window.openShareModal = function (id) {
    currentFileId = id;
    document.getElementById("shareModal").style.display = "block";

    document.getElementById("emailSection").style.display = "none";
    document.getElementById("linkSection").style.display = "none";
};

window.closeModal = function () {
    document.getElementById("shareModal").style.display = "none";
};

//Email Sharing
window.showEmailShare = function () {
    document.getElementById("emailSection").style.display = "block";
    document.getElementById("linkSection").style.display = "none";
};

window.shareWithEmails = async function () {
    const emailsInput = document.getElementById("shareEmails").value;

    if (!emailsInput) return;

    const emails = emailsInput.split(",").map(e => e.trim());

    const fileRef = doc(db, "files", currentFileId);
    const docSnap = await getDoc(fileRef);

    let sharedWith = docSnap.data().sharedWith || [];

    emails.forEach(email => {
        if (!sharedWith.includes(email)) {
            sharedWith.push(email);
        }
    });

    await updateDoc(fileRef, { sharedWith });

    showToast("Shared successfully!");
};

// Link Sharing
window.showLinkShare = async function () {
    document.getElementById("linkSection").style.display = "block";
    document.getElementById("emailSection").style.display = "none";

    const fileRef = doc(db, "files", currentFileId);

    await updateDoc(fileRef, { isPublic: true });

    const link = window.location.origin + "/view.html?id=" + currentFileId;

    document.getElementById("shareLink").value = link;
};

// Copy to Clipboard
window.copyLink = function () {
    const linkInput = document.getElementById("shareLink");

    linkInput.select();
    document.execCommand("copy");

    showToast("Link copied!");
};

// Log out function
window.logout = function () {
    signOut(auth)
        .then(() => {
            showToast("Logged out successfully");
            window.location.href = "login.html";
        })
        .catch((error) => {
            showToast(error.message);
        });
};

// Uploading animation
window.uploadFile = function () {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];
    const uploadBtn = document.getElementById("uploadBtn");

    if (!file) {
        showToast("Please select a file");
        return;
    }

    // Disable button
    uploadBtn.disabled = true;
    uploadBtn.innerText = "Uploading...";

    const loader = document.getElementById("loader");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");

    loader.style.display = "block";

    let progress = 0;

    const interval = setInterval(() => {
        if (progress < 90) {
            progress += 10;
            progressBar.style.width = progress + "%";
            progressText.innerText = "Uploading... " + progress + "%";
        }
    }, 200);

    const reader = new FileReader();

    reader.onload = async function () {
        const base64 = reader.result;

        try {
            await addDoc(collection(db, "files"), {
                userId: auth.currentUser.uid,
                fileName: file.name,
                fileData: base64,
                sharedWith: [],
                isPublic: false
            });

            clearInterval(interval);

            progressBar.style.width = "100%";
            progressText.innerText = "Upload Complete!";

            setTimeout(() => {
                loader.style.display = "none";
                progressBar.style.width = "0%";
                progressText.innerText = "Uploading... 0%";
            }, 1000);

            // Enable button again
            uploadBtn.disabled = false;
            uploadBtn.innerText = "Upload";

            showToast("File uploaded successfully!");
            loadFiles();

        } catch (error) {
            clearInterval(interval);
            loader.style.display = "none";

            // Enable button on error too
            uploadBtn.disabled = false;
            uploadBtn.innerText = "Upload";

            showToast(error.message);
        }
    };

    reader.readAsDataURL(file);
};

// showToast function
function showToast(message) {
    const toast = document.getElementById("toast");

    if (!toast) return; // prevent crash

    toast.innerText = message;
    toast.style.display = "block";

    setTimeout(() => {
        toast.style.display = "none";
    }, 2000);
}

// Run ONLY on dashboard
if (window.location.pathname.includes("dashboard.html")) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadFiles();
            document.getElementById("userEmail").innerText = "Logged in as: " + user.email;
        } else {
            window.location.href = "login.html";
        }
    });
}