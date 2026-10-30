import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, Shirt, Radio, BookOpen, Settings, LogIn, LogOut, 
  CheckCircle, XCircle, Clock, Plus, Trash2, Edit3, Save, UserCheck, 
  ChevronRight, Sparkles, Award, AlertTriangle, Eye, RefreshCw, Lock
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, 
  onAuthStateChanged, setPersistence, browserLocalPersistence 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, collection, onSnapshot, 
  query, where, updateDoc, deleteDoc, addDoc, serverTimestamp, orderBy 
} from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForTemplateOnly01234",
  authDomain: "magnatas-01.firebaseapp.com",
  projectId: "magnatas-01",
  storageBucket: "magnatas-01.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
   
  // Dados do Firestore
  const [applications, setApplications] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [radios, setRadios] = useState([]);
  const [rules, setRules] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Estado do formulário de candidatura
  const [candidaturaForm, setCandidaturaForm] = useState({
    idade: '',
    nomeInGame: '',
    id: '',
    kills: '',
    tempoCidade: '',
    motivo: ''
  });

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
         
        if (userSnap.exists()) {
          setUserProfile(userSnap.data());
        } else {
          const newProfile = {
            uid: currentUser.uid,
            name: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            appStatus: 'none',
            roles: ['Candidato'],
            createdAt: new Date().toISOString()
          };
          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubApps = onSnapshot(collection(db, 'applications'), (snap) => {
      setApplications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubOutfits = onSnapshot(collection(db, 'outfits'), (snap) => {
      setOutfits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubRadios = onSnapshot(collection(db, 'radios'), (snap) => {
      setRadios(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubRules = onSnapshot(collection(db, 'rules'), (snap) => {
      setRules(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const isFounder = userProfile?.roles?.includes("01 Founder's");
    let unsubLogs = () => {};
    if (isFounder) {
      const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
      unsubLogs = onSnapshot(q, (snap) => {
        setAuditLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => {
      unsubApps();
      unsubUsers();
      unsubOutfits();
      unsubRadios();
      unsubRules();
      unsubLogs();
    };
  }, [user, userProfile]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro no Login:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleCandidaturaSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const appData = {
      userId: user.uid,
      userEmail: user.email,
      userName: user.displayName,
      userPhoto: user.photoURL,
      ...candidaturaForm,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };

    await addDoc(collection(db, 'applications'), appData);
    await updateDoc(doc(db, 'users', user.uid), {
      appStatus: 'pending',
      inGameName: candidaturaForm.nomeInGame,
      gameId: candidaturaForm.id
    });

    setUserProfile(prev => ({ ...prev, appStatus: 'pending' }));
  };

  const isFounder = userProfile?.roles?.includes("01 Founder's");

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-red-600 animate-spin" />
          <p className="text-neutral-400 text-sm tracking-widest uppercase">A carregar Magnatas 01!...</p>
        </div>
      </div>
    );
  }

  // Ecrã de Login
  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl text-center">
          <div className="inline-flex p-4 bg-red-950/40 border border-red-800/50 rounded-2xl mb-6">
            <Shield className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-black tracking-wider text-red-600 uppercase mb-2">MAGNATAS 01!</h1>
          <p className="text-neutral-400 text-sm mb-8">Plataforma Oficial da Gang / FiveM</p>

          <button
            onClick={handleGoogleLogin}
            className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-3"
          >
            <LogIn className="w-5 h-5" />
            Iniciar Sessão com a Conta Google
          </button>
        </div>
      </div>
    );
  }

  // Ecrã de Candidatura Pendente
  if (userProfile?.appStatus === 'pending') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="inline-flex p-4 bg-amber-950/40 border border-amber
