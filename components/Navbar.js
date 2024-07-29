// components/Navbar.js

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import ReactDOM from 'react-dom';
import LoginModal from './LoginModal';
import BuyTokens from './BuyTokens';
import ProfileSidebar from './ProfileSidebar';

export default function Navbar({ onSidebarToggle, onShowFinishedGames }) {
  const { data: session } = useSession();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showBuyTokensModal, setShowBuyTokensModal] = useState(false);
  const [showProfileSidebar, setShowProfileSidebar] = useState(false);

  const handleLoginClick = () => {
    setShowLoginModal(true);
    setShowDropdown(false);
  };

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

  return (
    <>
      <nav className="bg-neutral-900 w-full py-4 text-neutral-100 px-4 grid grid-cols-3 border-b-2 border-neutral-800 fixed top-0 z-10">
        <div className="h-full flex justify-start items-center">
          <button 
            className="text-neutral-200 text-xl font-black px-4" 
            onClick={onSidebarToggle}
          >
            <i className="fas fa-bars"></i>
          </button>
        </div>

        <div className="w-full text-center flex items-center justify-center">
          <Link href="/game" className="flex justify-center items-center">
            <h2 className="font-bold tracking-wide text-normal md:text-2xl text-neutral-100">GLOB</h2>
            <img className="mx-2 w-8 h-8 md:w-10 md:h-10" src="/assets/img/logo.png" alt="" />
            <h2 className="font-bold tracking-wide text-normal md:text-2xl text-neutral-100">CHESS</h2>
          </Link>
        </div>

        <div className="w-full px-4 justify-end items-center text-end flex">
          <button onClick={onShowFinishedGames} className="px-4 text-xl md:text-2xl font-bold" type="button">
            <i className="fas fa-trophy"></i>
          </button>
          <a href="https://x.com/kubeden" target="_blank" rel="noopener noreferrer" className="bg-neutral-900 border-2 border-neutral-800 rounded-xl px-6 py-2 text-neutral-300 hidden md:inline-block">Support</a>
          {session ? (
            <div className="relative md:ml-4 mt-2 md:mt-1">
              <button onClick={() => setShowProfileSidebar(true)} className="focus:outline-none">
                <img src={session?.user?.image || "/assets/img/default-avatar.png"} alt="User" className="w-10 rounded-full border-2 border-neutral-800" />
              </button>
            </div>
          ) : (
            <button onClick={handleLoginClick} className="bg-neutral-900 border-2 border-neutral-800 rounded-xl px-6 py-2 text-neutral-300 hidden md:inline-block">Login</button>
          )}
        </div>
      </nav>
      
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      {showBuyTokensModal && <BuyTokensModal />}
      <ProfileSidebar isOpen={showProfileSidebar} onClose={() => setShowProfileSidebar(false)} />
    </>
  );
}