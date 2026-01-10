import React, { useState, useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Github, LogOut, Send, Copy, Instagram, Camera, 
  MessageSquare, Lock, Terminal, ShieldAlert 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, addDoc, query, where, onSnapshot, 
  serverTimestamp, getDocs, doc, setDoc 
} from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';

// --- UTILS ---
const cn = (...classes) => classes.filter(Boolean).join(" ");

// --- COMPONENTS ---

// 1. 🌌 Animated Background (Lava Lamps)
const Background = () => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
    <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
    <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
    <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]"></div>
  </div>
);

// 2. 🔐 Login Page
const AuthPage = () => {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      // Save user to DB immediately
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        lastLogin: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center z-10 relative">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        className="p-8 rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl max-w-sm w-full"
      >
        <div className="w-20 h-20 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg shadow-purple-500/50">
          <MessageSquare className="text-white w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
          Secret Message
        </h1>
        <p className="text-gray-300 mb-8 text-sm">Receive anonymous messages from your friends. They won't know it's you.</p>
        
        <button 
          onClick={handleLogin}
          className="w-full py-3 px-6 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-95"
        >
          <Github className="w-5 h-5" /> Continue with Google
        </button>
      </motion.div>
    </div>
  );
};

// 3. 🏠 User Dashboard (The Premium UI)
const Dashboard = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [copied, setCopied] = useState(false);
  
  // Admin State
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Use window.location.origin for base URL
  const shareLink = `${window.location.origin}/u/${user.uid}`;

  useEffect(() => {
    const q = query(
      collection(db, "messages"), 
      where("recipientUid", "==", user.uid)
      // Note: Ordering requires an index in Firestore, skipping for simplicity or do client-side sort
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Client side sort desc
      msgs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAdminCheck = () => {
    if (adminPassword === "yasin44") {
      setIsAdminOpen(true);
      setShowAdminLogin(false);
    } else {
      alert("ACCESS DENIED");
    }
  };

  return (
    <div className="min-h-screen p-4 pb-20 relative z-10 max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 pt-4">
        <div className="flex items-center gap-3">
          <img src={user.photoURL} className="w-10 h-10 rounded-full border-2 border-purple-500" alt="Profile" />
          <div>
            <p className="text-xs text-gray-400">Welcome back,</p>
            <p className="font-bold text-sm">{user.displayName}</p>
          </div>
        </div>
        <button onClick={() => signOut(auth)} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
          <LogOut className="w-5 h-5 text-gray-300" />
        </button>
      </div>

      {/* Share Card */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="p-6 rounded-3xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-lg mb-8"
      >
        <h2 className="text-xl font-bold mb-4 text-center">🚀 Get Secret Messages</h2>
        
        <div className="space-y-3">
          {/* WhatsApp */}
          <a 
            href={`whatsapp://send?text=Send me a secret message! I won't know it's you 🤫 ${shareLink}`}
            className="block w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-center font-bold shadow-lg shadow-green-500/30 active:scale-95 transition-transform"
          >
            Share on WhatsApp
          </a>

          {/* Copy Link */}
          <button 
            onClick={copyToClipboard}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-center font-bold shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            {copied ? "Copied!" : <><Instagram className="w-5 h-5" /> Copy Link for Bio</>}
          </button>

          {/* Snapchat */}
          <a 
            href="snapchat://"
            className="block w-full py-3 rounded-xl bg-yellow-400 text-black text-center font-bold shadow-lg shadow-yellow-400/30 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Camera className="w-5 h-5" /> Open Snapchat
          </a>
        </div>
      </motion.div>

      {/* Inbox */}
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-purple-400" /> Inbox 
        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{messages.length}</span>
      </h3>
      
      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-10 text-gray-500 italic">No messages yet. Share your link! 🕸️</div>
        ) : (
          messages.map((msg, idx) => (
            <motion.div 
              key={msg.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
            >
              <p className="text-lg font-medium mb-2">{msg.text}</p>
              <p className="text-xs text-gray-500 text-right">
                {msg.createdAt ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
              </p>
            </motion.div>
          ))
        )}
      </div>

      {/* Footer / Admin Trigger */}
      <div className="mt-20 text-center text-gray-800 text-xs select-none">
        <span onClick={() => setShowAdminLogin(true)}>© 2024 Secret Santa Pro</span>
      </div>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-green-500 p-6 rounded-lg w-full max-w-sm text-center font-mono">
            <h2 className="text-green-500 text-xl mb-4 animate-pulse">SYSTEM OVERRIDE</h2>
            <input 
              type="password" 
              placeholder="ENTER PASSCODE"
              className="w-full bg-black border border-green-800 text-green-500 p-3 mb-4 outline-none focus:border-green-500 text-center"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowAdminLogin(false)} className="flex-1 bg-gray-800 text-gray-400 py-2">CANCEL</button>
              <button onClick={handleAdminCheck} className="flex-1 bg-green-900 text-green-400 py-2 border border-green-700">ACCESS</button>
            </div>
          </div>
        </div>
      )}

      {/* Actual Admin Panel */}
      {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}
    </div>
  );
};

// 4. 🕵️ Public Profile (Sender View)
const PublicProfile = ({ params }) => {
  const { username: targetUid } = params;
  const [targetUser, setTargetUser] = useState(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch target user info
    const fetchUser = async () => {
      const docRef = doc(db, "users", targetUid);
      const docSnap = await getDocs(query(collection(db, "users"), where("uid", "==", targetUid)));
      if (!docSnap.empty) {
        setTargetUser(docSnap.docs[0].data());
      }
    };
    fetchUser();
  }, [targetUid]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);

    try {
      // 🕵️ IP TRACKING LOGIC
      let ip = "unknown";
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        ip = data.ip;
      } catch (e) { console.log("IP Blocked"); }

      // Save Message
      await addDoc(collection(db, "messages"), {
        text: message,
        recipientUid: targetUid,
        senderIp: ip,
        createdAt: serverTimestamp()
      });

      setSent(true);
      setMessage("");
    } catch (error) {
      alert("Error sending message");
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 relative z-10">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-green-500 rounded-full p-4 mb-4">
          <Send className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold">Message Sent! 🤫</h2>
        <p className="text-gray-400 mt-2 mb-8">They will never know it was you.</p>
        <a href="/" className="px-6 py-3 bg-white/10 rounded-xl font-bold">Create Your Own Link</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-6 pt-20 relative z-10 max-w-md mx-auto">
      {targetUser ? (
        <>
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full blur-lg opacity-50"></div>
            <img src={targetUser.photoURL} className="w-24 h-24 rounded-full border-4 border-white/20 relative z-10" alt="Target" />
          </div>
          <h1 className="text-xl font-bold mb-1">Send a secret message to</h1>
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-8">
            {targetUser.displayName}
          </h2>

          <div className="w-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-4 shadow-xl">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your secret message here..."
              className="w-full h-32 bg-transparent text-white placeholder-gray-500 outline-none resize-none text-lg"
            />
          </div>

          <button 
            onClick={handleSend}
            disabled={loading}
            className="w-full mt-6 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-lg shadow-lg shadow-purple-500/30 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? "Encrypting & Sending..." : "Send Secret Message 🚀"}
          </button>
          
          <p className="mt-6 text-xs text-gray-500">
             🔒 Anonymous • Safe • Free
          </p>
        </>
      ) : (
        <div className="text-gray-400">Loading user...</div>
      )}
    </div>
  );
};

// 5. 👮‍♂️ ADMIN HACKER PANEL
const AdminPanel = ({ onClose }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Users
        const usersSnap = await getDocs(collection(db, "users"));
        const userMap = {}; // Map UID -> User Data
        usersSnap.forEach(doc => { userMap[doc.data().uid] = doc.data(); });

        // 2. Fetch Messages
        const msgsSnap = await getDocs(collection(db, "messages"));
        
        // 3. JOIN Data
        const joinedData = msgsSnap.docs.map(doc => {
          const msg = doc.data();
          const recipient = userMap[msg.recipientUid] || { displayName: "Unknown", email: "N/A", photoURL: "" };
          return {
            id: doc.id,
            ...msg,
            recipient
          };
        });

        // Sort by newest
        joinedData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
        setData(joinedData);
      } catch (error) {
        console.error("HACK FAILED", error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-[100] overflow-auto font-mono text-xs md:text-sm">
      <div className="sticky top-0 bg-black border-b border-green-800 p-4 flex justify-between items-center z-50">
        <h1 className="text-green-500 font-bold text-lg animate-pulse flex items-center gap-2">
           <Terminal className="w-5 h-5" /> ADMIN_OVERRIDE // ROOT_ACCESS
        </h1>
        <button onClick={onClose} className="text-red-500 hover:bg-red-900/20 px-3 py-1 border border-red-800">
          [EXIT_TERMINAL]
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-green-800 animate-pulse"> decrypting_database... </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-green-800 text-green-400">
                  <th className="p-2">TIME</th>
                  <th className="p-2 text-red-500">SENDER_IP</th>
                  <th className="p-2 text-white">MESSAGE_CONTENT</th>
                  <th className="p-2 text-blue-400">TARGET (RECIPIENT)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-b border-green-900/30 hover:bg-green-900/10">
                    <td className="p-2 text-gray-500">
                      {row.createdAt ? new Date(row.createdAt.seconds * 1000).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="p-2 text-red-400 font-bold tracking-wider">
                      {row.senderIp || "HIDDEN"}
                    </td>
                    <td className="p-2 text-gray-200">
                      {row.text}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {row.recipient.photoURL && <img src={row.recipient.photoURL} className="w-6 h-6 rounded-full grayscale" />}
                        <div className="flex flex-col">
                          <span className="text-green-300">{row.recipient.displayName}</span>
                          <span className="text-green-700 text-[10px]">{row.recipient.email}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="bg-gray-950 h-screen w-screen text-white flex items-center justify-center">Loading...</div>;

  return (
    <>
      <Background />
      <Switch>
        {/* Public Profile Route */}
        <Route path="/u/:username" component={PublicProfile} />
        
        {/* Main Route (Login or Dashboard) */}
        <Route path="/">
          {user ? <Dashboard user={user} /> : <AuthPage />}
        </Route>
      </Switch>
    </>
  );
}

export default App;