// Firebase設定（環境に応じて変更が必要）
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "YOUR_API_KEY",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || "YOUR_DATABASE_URL",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const { useState, useEffect, useRef } = React;

// ================================
// ログイン画面コンポーネント
// ================================
function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            // ログイン成功 - apphontai.htmlへ遷移
            window.location.href = './apphontai.html';
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            setError('アカウントを作成しました。ログインしています...');
            setTimeout(() => {
                window.location.href = './apphontai.html';
            }, 1500);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>PUDO送迎割り当て</h1>
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="email">メールアドレス</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@example.com"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">パスワード</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="パスワードを入力"
                            required
                        />
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                        {loading ? 'ログイン中...' : 'ログイン'}
                    </button>
                </form>
                <button
                    className="btn btn-secondary"
                    onClick={handleSignUp}
                    disabled={loading}
                >
                    {loading ? '作成中...' : 'アカウント作成'}
                </button>
                {error && <div className="error-message">{error}</div>}
            </div>
        </div>
    );
}

// ================================
// 割り当てカードコンポーネント
// ================================
function AssignmentCard({ item, onDragStart, isDragging }) {
    return (
        <div
            className={`card ${isDragging ? 'dragging' : ''}`}
            draggable="true"
            onDragStart={onDragStart}
            data-item-id={item.id}
        >
            <h3>{item.name || 'サービス利用者'}</h3>
            <p><strong>時間:</strong> {item.time || '未設定'}</p>
            <p><strong>場所:</strong> {item.location || '未設定'}</p>
            {item.notes && <p><strong>備考:</strong> {item.notes}</p>}
        </div>
    );
}

// ================================
// ドラッグ&ドロップエリアコンポーネント
// ================================
function DropZone({ title, items, onDragOver, onDragLeave, onDrop, isDragOver }) {
    return (
        <div className="drag-drop-section">
            <h2>{title}</h2>
            <div
                className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${items.length === 0 ? 'empty' : ''}`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
            >
                {items.length === 0 ? (
                    <p>ここにドラッグ&ドロップしてください</p>
                ) : (
                    items.map((item) => (
                        <AssignmentCard
                            key={item.id}
                            item={item}
                            onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('itemId', item.id);
                            }}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

// ================================
// アプリメインコンポーネント
// ================================
function AppMain() {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [masterItems, setMasterItems] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [dragOverZone, setDragOverZone] = useState(null);
    const [editableItems, setEditableItems] = useState([]);
    const draggedItemId = useRef(null);

    // ================================
    // 認証状態の監視
    // ================================
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                setCurrentUser(user);
                loadDataFromDatabase();
            } else {
                window.location.href = './index.html';
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // ================================
    // データベースからデータを読み込む
    // ================================
    const loadDataFromDatabase = async () => {
        try {
            // masterItems を読み込み
            const masterRef = db.ref('masterItems');
            masterRef.on('value', (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const items = Object.entries(data).map(([key, value]) => ({
                        id: key,
                        ...value
                    }));
                    setMasterItems(items);
                }
            });

            // assignments を読み込み
            const assignRef = db.ref('assignments');
            assignRef.on('value', (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const items = Object.entries(data).map(([key, value]) => ({
                        id: key,
                        ...value
                    }));
                    setAssignments(items);
                }
            });

            // editableItems を読み込み
            const editRef = db.ref('editableItems');
            editRef.on('value', (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const items = Object.entries(data).map(([key, value]) => ({
                        id: key,
                        ...value
                    }));
                    setEditableItems(items);
                }
            });
        } catch (error) {
            console.error('データ読み込みエラー:', error);
        }
    };

    // ================================
    // ドラッグ&ドロップハンドラ
    // ================================
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropToAssignments = (e) => {
        e.preventDefault();
        setDragOverZone(null);
        
        const itemId = e.dataTransfer.getData('itemId');
        if (!itemId) return;

        const item = masterItems.find(i => i.id === itemId);
        if (item) {
            moveItemToAssignments(item);
        }
    };

    const handleDropToEditable = (e) => {
        e.preventDefault();
        setDragOverZone(null);
        
        const itemId = e.dataTransfer.getData('itemId');
        if (!itemId) return;

        const item = assignments.find(i => i.id === itemId);
        if (item) {
            moveItemToEditable(item);
        }
    };

    // ================================
    // データベースへの操作
    // ================================
    const moveItemToAssignments = (item) => {
        const assignmentData = {
            ...item,
            assignedAt: new Date().toISOString()
        };

        db.ref(`assignments/${item.id}`).set(assignmentData)
            .then(() => {
                console.log('項目を割り当てに移動しました');
            })
            .catch(err => console.error('移動エラー:', err));
    };

    const moveItemToEditable = (item) => {
        const editableData = {
            ...item,
            editedAt: new Date().toISOString()
        };

        db.ref(`editableItems/${item.id}`).set(editableData)
            .then(() => {
                db.ref(`assignments/${item.id}`).remove();
                console.log('項目を編集可能に移動しました');
            })
            .catch(err => console.error('移動エラー:', err));
    };

    const handleLogout = async () => {
        try {
            await auth.signOut();
            window.location.href = './index.html';
        } catch (error) {
            console.error('ログアウトエラー:', error);
        }
    };

    // ================================
    // レンダリング
    // ================================
    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!currentUser) {
        return null;
    }

    return (
        <div>
            <header>
                <h1>PUDO送迎割り当てシステム</h1>
                <div className="user-info">
                    <span>{currentUser.email}</span>
                    <button className="logout-btn" onClick={handleLogout}>
                        ログアウト
                    </button>
                </div>
            </header>

            <main>
                <div className="content-area">
                    <DropZone
                        title="利用可能なサービス"
                        items={masterItems}
                        onDragOver={handleDragOver}
                        onDragLeave={() => setDragOverZone(null)}
                        onDrop={handleDropToAssignments}
                        isDragOver={dragOverZone === 'assignments'}
                    />

                    <DropZone
                        title="割り当て済み"
                        items={assignments}
                        onDragOver={(e) => {
                            handleDragOver(e);
                            setDragOverZone('editable');
                        }}
                        onDragLeave={() => setDragOverZone(null)}
                        onDrop={handleDropToEditable}
                        isDragOver={dragOverZone === 'editable'}
                    />
                </div>

                <div className="table-container">
                    <h2>編集可能な項目</h2>
                    {editableItems.length > 0 ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>名前</th>
                                    <th>時間</th>
                                    <th>場所</th>
                                    <th>編集日時</th>
                                </tr>
                            </thead>
                            <tbody>
                                {editableItems.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.name || '-'}</td>
                                        <td>{item.time || '-'}</td>
                                        <td>{item.location || '-'}</td>
                                        <td>{item.editedAt ? new Date(item.editedAt).toLocaleString('ja-JP') : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>編集可能な項目はありません</p>
                    )}
                </div>
            </main>
        </div>
    );
}

// ================================
// ルートコンポーネント
// ================================
function RootApp() {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 現在のページを確認
        const currentPage = window.location.pathname;
        
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    // index.html での表示判定
    const isLoginPage = window.location.pathname.includes('index.html') || 
                        window.location.pathname === '/' ||
                        window.location.pathname.endsWith('/');

    if (isLoginPage) {
        return currentUser ? (
            <div style={{ padding: '20px' }}>
                <p>既にログイン済みです。<a href="./apphontai.html">アプリへ進む</a></p>
            </div>
        ) : (
            <LoginPage />
        );
    }

    // apphontai.html での表示判定
    return currentUser ? <AppMain /> : null;
}

// ReactDOMでレンダリング
const rootElement = document.getElementById('root') || document.getElementById('app-root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<RootApp />);
}
