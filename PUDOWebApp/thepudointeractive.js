
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getDatabase, ref, get, onValue, set, update } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";

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

setPersistence(auth, browserLocalPersistence).catch(error => {
    showError('認証設定の初期化に失敗しました。' + error.message);
});
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
let masterItems = {
    vehicles: [],
    staff: [],
    users: []
};

let currentCourse = null;
let assignments = JSON.parse(JSON.stringify(defaultAssignments));
let available = JSON.parse(JSON.stringify(masterItems));
let editableItems = [];
const defaultEditableItems = {
    item1: { label: 'サンプル1', note: 'ここを編集できます' },
    item2: { label: 'サンプル2', note: '簡単に更新できます' }
};

function normalizeMasterItems(value) {
    const normalizeList = list => Array.isArray(list)
        ? list.map(item => typeof item === 'string'
            ? { name: item, note: '' }
            : { name: item.name || '', note: item.note || '' })
        : [];

    return {
        vehicles: normalizeList(value.vehicles),
        staff: normalizeList(value.staff),
        users: normalizeList(value.users)
    };
}

async function loadMasterItemsFromDatabase() {
    const masterItemsRef = ref(database, 'masterItems');

    try {
        const snapshot = await get(masterItemsRef);
        if (snapshot.exists()) {
            masterItems = normalizeMasterItems(snapshot.val());
            console.log('Loaded masterItems from Firebase:', masterItems);
        } else {
            throw new Error('Firebase masterItems not found');
        }
    } catch (error) {
        console.error('Failed to load masterItems from Firebase:', error);
        masterItems = {
            vehicles: Array.from({length: 10}, (_, i) => ({ name: `車両${i + 1}`, note: '' })),
            staff: Array.from({length: 15}, (_, i) => ({ name: `職員${i + 1}`, note: '' })),
            users: Array.from({length: 60}, (_, i) => ({ name: `利用者${i + 1}`, note: '' }))
        };
    }
}

const sanitizeText = value => value.replace(/[^0-9A-Za-z\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g, '');

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const statusEl = document.getElementById('status');

loginBtn.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(error => {
        handleAuthError(error, 'ログイン');
    });
});

logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showStatus('ログアウトしました。ログイン画面に戻ります。');
        showAuthSection();
    } catch (error) {
        handleAuthError(error, 'ログアウト');
    }
});

onAuthStateChanged(auth, user => {
    if (user) {
        if (user.email === allowedEmail) {
            statusEl.textContent = `${user.email} としてログインしています`;
            loginBtn.hidden = true;
            logoutBtn.hidden = false;
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('app-section').style.display = 'block';
            clearError();
            initApp();
        } else {
            signOut(auth).catch(error => handleAuthError(error, '認証確認'));
            showStatus('アクセス権のあるアカウントでログインしてください。');
            showAuthSection();
        }
    } else {
        showAuthSection();
    }
});

async function initApp() {
    await loadMasterItemsFromDatabase();
    available = JSON.parse(JSON.stringify(masterItems));
    renderCourseList();
    attachDatabaseListeners();
    attachEditableListListeners();
}

function showAuthSection() {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('app-section').style.display = 'none';
    logoutBtn.hidden = true;
    loginBtn.hidden = false;
    clearError();
}

function showStatus(message) {
    statusEl.textContent = message;
}

function handleAuthError(error, action) {
    const code = error?.code || '';
    let message = `${action}に失敗しました。`;

    if (code === 'auth/popup-closed-by-user') {
        message = 'ログイン画面を閉じたため、ログインは中止されました。もう一度お試しください。';
    } else if (code === 'auth/popup-blocked') {
        message = 'ポップアップがブロックされました。ポップアップを許可してから再度お試しください。';
    } else if (code === 'auth/network-request-failed') {
        message = 'ネットワーク接続を確認してから、もう一度お試しください。';
    } else if (code === 'auth/unauthorized-domain') {
        message = 'このサイトは Google 認証の許可ドメインに追加されていません。管理者にお問い合わせください。';
    } else if (error?.message) {
        message = `${message}\n${error.message}`;
    }

    showError(message);
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

function attachEditableListListeners() {
    const editableItemsRef = ref(database, 'editableItems');

    get(editableItemsRef).then(snapshot => {
        if (!snapshot.exists()) {
            set(editableItemsRef, defaultEditableItems);
        }
    }).catch(error => showError('一覧データの初期化に失敗しました。' + error.message));

    onValue(editableItemsRef, snapshot => {
        const value = snapshot.val() || {};
        editableItems = Object.entries(value).map(([id, item]) => ({
            id,
            label: item?.label || '',
            note: item?.note || ''
        }));
        renderEditableList();
    });
}

function renderEditableList() {
    const container = document.getElementById('editable-list');
    container.innerHTML = '';

    if (!editableItems.length) {
        const emptyState = document.createElement('p');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'まだデータがありません。';
        container.appendChild(emptyState);
        return;
    }

    const list = document.createElement('div');
    list.className = 'editable-list';

    editableItems.forEach(item => {
        const row = document.createElement('div');
        row.className = 'editable-row';

        const summary = document.createElement('div');
        summary.className = 'editable-summary';

        const title = document.createElement('strong');
        title.textContent = item.label || '（名称未設定）';

        const note = document.createElement('small');
        note.textContent = item.note || '備考なし';

        summary.appendChild(title);
        summary.appendChild(note);

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'edit-button';
        editButton.textContent = '編集';
        editButton.addEventListener('click', () => showEditableEditor(item.id));

        row.appendChild(summary);
        row.appendChild(editButton);
        list.appendChild(row);
    });

    container.appendChild(list);
}

function showEditableEditor(id) {
    const item = editableItems.find(entry => entry.id === id);
    if (!item) return;

    const container = document.getElementById('editable-list');
    container.querySelectorAll('.editable-editor').forEach(element => element.remove());

    const editor = document.createElement('div');
    editor.className = 'editable-editor';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.value = item.label || '';
    labelInput.placeholder = '項目名';

    const noteInput = document.createElement('input');
    noteInput.type = 'text';
    noteInput.value = item.note || '';
    noteInput.placeholder = '備考';

    const actions = document.createElement('div');
    actions.className = 'editable-editor-actions';

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'save-button';
    saveButton.textContent = '保存';
    saveButton.addEventListener('click', async () => {
        const updatedLabel = sanitizeText(labelInput.value.trim());
        const updatedNote = sanitizeText(noteInput.value.trim());
        labelInput.value = updatedLabel;
        noteInput.value = updatedNote;
        await update(ref(database, `editableItems/${id}`), {
            label: updatedLabel,
            note: updatedNote
        });
        clearError();
    });

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'cancel-button';
    cancelButton.textContent = 'キャンセル';
    cancelButton.addEventListener('click', () => editor.remove());

    actions.appendChild(saveButton);
    actions.appendChild(cancelButton);
    editor.appendChild(labelInput);
    editor.appendChild(noteInput);
    editor.appendChild(actions);
    container.appendChild(editor);
}

function showError(msg) {
    document.getElementById('error-message').textContent = msg;
}

function clearError() {
    document.getElementById('error-message').textContent = '';
}
