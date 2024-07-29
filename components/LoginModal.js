// components/LoginModal.js

import { signIn } from 'next-auth/react';
import { auth } from '../lib/firebaseConfig';
import { signInWithPopup, TwitterAuthProvider, GoogleAuthProvider } from 'firebase/auth';
import ReactDOM from 'react-dom';

export default function LoginModal({ onClose }) {
  const handleLogin = async (provider) => {
    try {
      let authProvider;
      if (provider === 'twitter') {
        authProvider = new TwitterAuthProvider();
      } else if (provider === 'google') {
        authProvider = new GoogleAuthProvider();
      } else {
        throw new Error('Invalid provider');
      }

      const result = await signInWithPopup(auth, authProvider);
      const idToken = await result.user.getIdToken();
      
      const response = await signIn('credentials', { 
        token: idToken,
        redirect: false
      });

      if (response.error) {
        throw new Error(response.error);
      }

      window.location.href = '/game';
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-neutral-800 p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-center mb-6">
          <img src="/assets/img/logo.png" alt="Glob Chess Logo" className="w-20 h-20" />
        </div>
        <h2 className="text-3xl font-bold mb-6 text-center text-white">GLOB CHESS</h2>
        <p className="text-neutral-300 mb-6 text-center">Login to make your move in the global chess game!</p>
        <button 
          onClick={() => handleLogin('twitter')} 
          className="w-full bg-black text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center hover:bg-blue-500 transition duration-300 mb-4"
        >
          <i className="fab fa-x-twitter mr-2"></i>
          Login with Twitter
        </button>
        <button 
          onClick={() => handleLogin('google')} 
          className="w-full bg-white text-black px-4 py-3 rounded-lg font-bold flex items-center justify-center hover:bg-gray-200 transition duration-300"
        >
          <i className="fab fa-google mr-2"></i>
          Login with Google
        </button>
        <button 
          onClick={onClose} 
          className="mt-4 text-neutral-400 hover:text-white transition duration-300 w-full text-center"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  // Use React Portal to render the modal at the root level
  return typeof window !== 'undefined'
    ? ReactDOM.createPortal(modalContent, document.body)
    : null;
}