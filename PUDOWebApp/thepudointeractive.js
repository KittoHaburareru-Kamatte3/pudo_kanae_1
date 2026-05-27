
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getDatabase, ref, get, onValue, set } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD3dEKL-e4g_uf1QOBFkbwpj8DOY8o6OtE",
  authDomain: "thesougeiwariate.firebaseapp.com",
  databaseURL: "https://thesougeiwariate-default-rtdb.firebaseio.com",
  projectId: "thesougeiwariate",
  storageBucket: "thesougeiwariate.firebasestorage.app",
  messagingSenderId: "255173728245",
  appId: "1:255173728245:web:60cb8888ba21062560b2bc",
  measurementId: "G-WWQRZ5TE68"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const allowedEmail = 'kanae5173@gmail.com';
const defaultAssignments = {
    'コース1': { vehicle: [], staff: [], users: [] },
    'コース2': { vehicle: [], staff: [], users: [] },
    'コース3': { vehicle: [], staff: [], users: [] },
    'コース4': { vehicle: [], staff: [], users: [] },
    'コース5': { vehicle: [], staff: [], users: [] },
    'コース6': { vehicle: [], staff: [], users: [] },
    'コース7': { vehicle: [], staff: [], users: [] },
    'コース8': { vehicle: [], staff: [], users: [] },
    'コース9': { vehicle: [], staff: [], users: [] },
    'コース10': { vehicle: [], staff: [], users: [] }
};
const masterItems = {
    vehicles: Array.from({length: 10}, (_, i) => ({ name: `車両${i + 1}`, note: '' })),
    staff: Array.from({length: 15}, (_, i) => ({ name: `職員${i + 1}`, note: '' })),
    users: Array.from({length: 60}, (_, i) => ({ name: `利用者${i + 1}`, note: '' }))
};

let currentCourse = null;
let assignments = JSON.parse(JSON.stringify(defaultAssignments));
let available = JSON.parse(JSON.stringify(masterItems));

const sanitizeText = value => value.replace(/[^0-9A-Za-z\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g, '');

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const statusEl = document.getElementById('status');

loginBtn.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(error => {
        showError('ログインに失敗しました。' + error.message);
    });
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

onAuthStateChanged(auth, user => {
    if (user) {
        if (user.email === allowedEmail) {
            statusEl.textContent = `${user.email} としてログインしています`;
            loginBtn.hidden = true;
            logoutBtn.hidden = false;
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('app-section').style.display = 'block';
            initApp();
        } else {
            signOut(auth);
            showStatus('アクセス権のあるアカウントでログインしてください。');
            showAuthSection();
        }
    } else {
        showAuthSection();
    }
});

function initApp() {
    renderCourseList();
    attachDatabaseListeners();
}

function showAuthSection() {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('app-section').style.display = 'none';
    logoutBtn.hidden = true;
    loginBtn.hidden = false;
}

function showStatus(message) {
    statusEl.textContent = message;
}

function attachDatabaseListeners() {
    const assignmentsRef = ref(database, 'assignments');
    get(assignmentsRef).then(snapshot => {
        if (!snapshot.exists()) {
            set(assignmentsRef, defaultAssignments);
        }
    }).catch(error => showError('データ読み込みに失敗しました。' + error.message));

    onValue(assignmentsRef, snapshot => {
        assignments = snapshot.val() || JSON.parse(JSON.stringify(defaultAssignments));
        computeAvailable();
        renderAvailableCards();
        if (!currentCourse) {
            selectCourse('コース1');
        } else {
            renderAssignments();
        }
    });
}

function computeAvailable() {
    const assigned = {
        vehicles: new Set(),
        staff: new Set(),
        users: new Set()
    };

    Object.values(assignments).forEach(course => {
        course.vehicle.forEach(v => assigned.vehicles.add(v.name));
        course.staff.forEach(s => assigned.staff.add(s.name));
        course.users.forEach(u => assigned.users.add(u.name));
    });

    available = {
        vehicles: masterItems.vehicles.filter(v => !assigned.vehicles.has(v.name)),
        staff: masterItems.staff.filter(s => !assigned.staff.has(s.name)),
        users: masterItems.users.filter(u => !assigned.users.has(u.name))
    };
}

function renderCourseList() {
    const list = document.getElementById('course-list');
    list.innerHTML = '';
    Object.keys(defaultAssignments).forEach(courseName => {
        const item = document.createElement('input');
        item.type = 'text';
        item.className = 'course-item';
        item.value = courseName;
        item.maxLength = 10;
        item.onblur = () => {
            const newName = item.value.trim();
            if (newName && newName !== courseName) {
                defaultAssignments[newName] = defaultAssignments[courseName];
                delete defaultAssignments[courseName];
                assignments[newName] = assignments[courseName];
                delete assignments[courseName];
                if (currentCourse === courseName) {
                    currentCourse = newName;
                    document.getElementById('course-title').textContent = newName;
                }
                renderCourseList();
                saveAssignments();
            } else if (!newName) {
                item.value = courseName; // 空の場合は元に戻す
            }
        };
        item.onclick = () => selectCourse(item.value);
        list.appendChild(item);
    });
}

function selectCourse(courseName) {
    currentCourse = courseName;
    document.getElementById('course-title').textContent = courseName;
    renderAssignments();
}

function renderAvailableCards() {
    const vehicleDiv = document.getElementById('vehicle-cards');
    vehicleDiv.innerHTML = '';
    available.vehicles.forEach(v => vehicleDiv.appendChild(createCard(v, 'vehicle')));

    const staffDiv = document.getElementById('staff-cards');
    staffDiv.innerHTML = '';
    available.staff.forEach(s => staffDiv.appendChild(createCard(s, 'staff')));

    const userDiv = document.getElementById('user-cards');
    userDiv.innerHTML = '';
    available.users.forEach(u => userDiv.appendChild(createCard(u, 'user')));
}

function createCard(item, type) {
    const card = document.createElement('div');
    card.className = `card ${type}-card`;
    card.draggable = true;
    card.ondragstart = (ev) => {
        ev.dataTransfer.setData('text', JSON.stringify(item));
        ev.dataTransfer.setData('type', type);
    };

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.maxLength = 10;
    nameInput.value = item.name || item;
    nameInput.oninput = () => {
        nameInput.value = sanitizeText(nameInput.value);
        if (typeof item === 'object') {
            item.name = nameInput.value;
        }
        saveAssignments();
    };
    card.appendChild(nameInput);

    if (type !== 'course') {
        const noteInput = document.createElement('input');
        noteInput.type = 'text';
        noteInput.placeholder = '備考 (15文字まで)';
        noteInput.maxLength = 15;
        noteInput.value = item.note || '';
        noteInput.oninput = () => {
            noteInput.value = sanitizeText(noteInput.value);
            item.note = noteInput.value;
            saveAssignments();
        };
        card.appendChild(noteInput);
    }

    card.dataset.type = type;
    return card;
}

function renderAssignments() {
    if (!currentCourse) return;
    const assign = assignments[currentCourse] || { vehicle: [], staff: [], users: [] };
    renderZone('vehicle-zone', assign.vehicle);
    renderZone('staff-zone', assign.staff);
    renderZone('user-zone', assign.users);
}

function renderZone(zoneId, items) {
    const zone = document.getElementById(zoneId);
    zone.innerHTML = '';
    items.forEach(item => {
        const card = createCard(item, zoneId.split('-')[0]);
        card.classList.add('assigned');
        zone.appendChild(card);
    });
}

function allowDrop(ev) {
    ev.preventDefault();
}

function drop(ev) {
    ev.preventDefault();
    const data = JSON.parse(ev.dataTransfer.getData('text'));
    const type = ev.dataTransfer.getData('type');
    const targetZone = ev.target.closest('.drop-zone');
    if (!targetZone || !currentCourse) return;

    const zoneType = targetZone.id.split('-')[0];
    if (type !== zoneType) {
        showError('不適切なカードです。');
        return;
    }

    const assign = assignments[currentCourse];
    if (zoneType === 'vehicle' && assign.vehicle.length > 1) {
        showError('車両は1台までです。');
        return;
    }
    if (zoneType === 'staff' && assign.staff.length > 3) {
        showError('職員は3名までです。');
        return;
    }
    if (zoneType === 'user' && assign.users.length > 9) {
        showError('利用者は9名までです。');
        return;
    }

    assignments[currentCourse][zoneType === 'user' ? 'users' : zoneType].push(data);
    saveAssignments();
    clearError();
}

window.allowDrop = allowDrop;
window.drop = drop;

function saveAssignments() {
    set(ref(database, 'assignments'), assignments).catch(error => {
        showError('保存に失敗しました。' + error.message);
    });
}

function showError(msg) {
    document.getElementById('error-message').textContent = msg;
}

function clearError() {
    document.getElementById('error-message').textContent = '';
}
