import React, { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebaseConfig';
import BuyTokens from './BuyTokens';

const ProfileSidebar = ({ isOpen, onClose }) => {
  const { data: session } = useSession();
  const [userStats, setUserStats] = useState(null);
  const [showBuyTokensModal, setShowBuyTokensModal] = useState(false);

  const BuyTokensModal = () => {
    return ReactDOM.createPortal(
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-neutral-800 p-8 rounded-lg shadow-xl max-w-md w-full">
          <BuyTokens />
          <button onClick={() => setShowBuyTokensModal(false)} className="mt-4 text-neutral-400 hover:text-white transition duration-300 w-full text-center">Close</button>
        </div>
      </div>,
      document.body
    );
  };

  useEffect(() => {
    const fetchUserStats = async () => {
      if (session && isOpen) {
        const userRef = doc(db, "users", session.user.id);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setUserStats(userDoc.data());
        }
      }
    };

    fetchUserStats();
  }, [session, isOpen]);

  if (!session) return null;

  return (
    <>
      <div 
        className={`fixed inset-y-0 right-0 w-full max-w-md bg-neutral-800 p-6 transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } transition-transform duration-300 ease-in-out z-50`}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white">
          <i className="fas fa-times"></i>
        </button>
        
        <div className="flex flex-col items-center mt-8">
          <img 
            src={session.user.image || "/assets/img/default-avatar.png"} 
            alt="User" 
            className="w-24 h-24 rounded-full border-2 border-neutral-600"
          />
          <h2 className="mt-4 text-xl font-bold text-white">{session.user.name}</h2>
          
          <div className="mt-8 w-full">
            <p className="text-neutral-300">Total Tokens: {session.user.tokens}</p>
            <p className="text-neutral-300">Total Moves: {userStats?.totalMoves || 'N/A'}</p>
            <p className="text-neutral-300">Average Accuracy: {userStats?.averageAccuracy ? `${userStats.averageAccuracy.toFixed(2)}%` : 'N/A'}</p>
          </div>
          
          <div className="mt-8 w-full space-y-4">
            <button onClick={() => setShowBuyTokensModal(true)} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition">
            Buy Tokens
            </button>
            <button 
              onClick={() => signOut()}
              className="w-full bg-neutral-600 text-white py-2 rounded hover:bg-neutral-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        ></div>
      )}
      {showBuyTokensModal && <BuyTokensModal />}
    </>
  );
};

export default ProfileSidebar;