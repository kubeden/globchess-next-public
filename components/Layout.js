// components/Layout.js

import Head from 'next/head';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import FinishedGamesModal from './FinishedGamesModal';
import { useState } from 'react';

export default function Layout({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isFinishedGamesModalOpen, setIsFinishedGamesModalOpen] = useState(false);
  
    const toggleSidebar = () => {
      setIsSidebarOpen(!isSidebarOpen);
    };
  
    const toggleFinishedGamesModal = () => {
      setIsFinishedGamesModalOpen(!isFinishedGamesModalOpen);
    };  

  return (
    <>
      <Head>
        <title>Globchess | The Global Chess Game</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="Globchess is the global chess game anyone can participate in! Join players from around the world in exciting chess matches." />
        <meta name="keywords" content="chess, global chess, online chess, chess game, multiplayer chess" />
        <meta name="author" content="Globchess Team" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.globchess.com/" />
        <meta property="og:title" content="Globchess | The Global Chess Game" />
        <meta property="og:description" content="Globchess is the global chess game anyone can participate in! Join players from around the world in exciting chess matches." />
        <meta property="og:image" content="https://www.globchess.com/assets/img/globchess-background.png" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://www.globchess.com/" />
        <meta property="twitter:title" content="Globchess | The Global Chess Game" />
        <meta property="twitter:description" content="Join players from around the world in exciting chess matches on Globchess!" />
        <meta property="twitter:image" content="https://www.globchess.com/assets/img/globchess-background.png" />

        {/* Favicon */}
        <link rel="icon" href="/assets/img/favicon.ico" />
        {/* <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png" /> */}
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://www.globchess.com/" />
        
        {/* Font Awesome */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" integrity="sha512-Kc323vGBEqzTmouAECnVceyQqyqdsSiqLQISBL29aUW4U/M7pSPA/gEUZQqv1cwx4OnYxTxve5UMg5GT6L4JJg==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
      </Head>
      <Navbar onSidebarToggle={toggleSidebar} onShowFinishedGames={toggleFinishedGamesModal} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <FinishedGamesModal isOpen={isFinishedGamesModalOpen} onClose={() => setIsFinishedGamesModalOpen(false)} />
      <main className={`bg-neutral-900 min-h-screen ${isSidebarOpen ? 'opacity-50' : ''}`}>
        {children}
      </main>
    </>
  );
}