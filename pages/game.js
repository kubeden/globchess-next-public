// pages/game.js

import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import LoginModal from '../components/LoginModal';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import FinishedGamesModal from '../components/FinishedGamesModal';

const ChessGame = dynamic(() => import('../components/ChessGame'), { ssr: false });

export default function Game() {
  const { data: session } = useSession();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFinishedGamesModalOpen, setIsFinishedGamesModalOpen] = useState(false);

  const handleMoveAttempt = () => {
    if (!session) {
      setShowLoginModal(true);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleFinishedGamesModal = () => {
    setIsFinishedGamesModalOpen(!isFinishedGamesModalOpen);
  };

  return (
    <>
      <Navbar 
        onSidebarToggle={toggleSidebar} 
        onShowFinishedGames={toggleFinishedGamesModal}
      />
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
      />
      <FinishedGamesModal 
        isOpen={isFinishedGamesModalOpen} 
        onClose={() => setIsFinishedGamesModalOpen(false)}
      />
      <main className="flex items-center justify-center min-h-screen bg-neutral-900 py-4 px-4 max-w-full m-auto">
        <div className="w-full max-w-full m-auto">
          <ChessGame onMoveAttempt={handleMoveAttempt} isLoggedIn={!!session} />
          {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
        </div>
      </main>
    </>
  );
}