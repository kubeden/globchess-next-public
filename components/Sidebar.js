// components/Sidebar.js

import { useEffect, useState } from 'react';
import { db } from '../lib/firebaseConfig';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export default function Sidebar({ isOpen, onClose }) {
  const [lastGame, setLastGame] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchLastGame() {
      setIsLoading(true);
      setError(null);
      try {
        const gamesRef = collection(db, 'games');
        let q = query(
          gamesRef, 
          where('status', '==', 'completed'), 
          orderBy('endedAt', 'desc'), 
          limit(1)
        );

        // If the above query fails, try a simpler query
        try {
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const gameData = querySnapshot.docs[0].data();
            setLastGame({
              endedOn: formatDate(gameData.endedAt),
              finishMoveBy: gameData.lastMoveBy || 'Unknown',
              result: gameData.result
            });
          } else {
            setLastGame(null);
          }
        } catch (indexError) {
          console.warn("Index not yet ready, falling back to simpler query");
          q = query(
            gamesRef, 
            where('status', '==', 'completed'),
            limit(1)
          );
          const fallbackSnapshot = await getDocs(q);
          if (!fallbackSnapshot.empty) {
            const gameData = fallbackSnapshot.docs[0].data();
            setLastGame({
              endedOn: formatDate(gameData.endedAt),
              finishMoveBy: gameData.lastMoveBy || 'Unknown',
              result: gameData.result
            });
          } else {
            setLastGame(null);
          }
        }
      } catch (err) {
        console.error("Error fetching last game:", err);
        setError("Failed to fetch the last game. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchLastGame();
  }, []);

  function formatDate(dateValue) {
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString();
    } else if (typeof dateValue === 'object' && dateValue.toDate) {
      return dateValue.toDate().toLocaleDateString();
    } else if (typeof dateValue === 'number') {
      return new Date(dateValue).toLocaleDateString();
    } else if (typeof dateValue === 'string') {
      return new Date(dateValue).toLocaleDateString();
    }
    return 'Unknown Date';
  }

  return (
    <>
      <div className={`fixed inset-y-0 left-0 w-full max-w-full md:max-w-md bg-neutral-800 p-6 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out z-30`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white">
          <i className="fas fa-times"></i>
        </button>
        
        <div className="text-white mt-8">
          <h2 className="text-xl font-bold mb-4">About the creator</h2>
          <p className="mb-4">👋 Hey there. My name is Dennis and I go by Kubeden online. If you like what I built here and you feel like chatting, feel free to do so on my <a href="https://x.com/kubeden" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">x.com/kubeden</a> profile!</p>
          
          <hr className="my-4 border-neutral-600" />
          
          <h2 className="text-xl font-bold mb-4">About the app</h2>
          <p className="mb-4">🌎 The chess game you see on your screen is available to any one in the world! Inspired by Wordle, I aimed to create a similar experience but with chess.</p>
          
          <hr className="my-4 border-neutral-600" />
          
          <h2 className="text-xl font-bold mb-4">LAST GAME</h2>
          {isLoading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : lastGame ? (
            <div className="bg-neutral-700 p-4 rounded">
              <p>Ended On: {lastGame.endedOn}</p>
              <p>Finish Move By: {lastGame.finishMoveBy}</p>
              <p>Result: {lastGame.result}</p>
            </div>
          ) : (
            <p>No finished games yet</p>
          )}
        </div>
      </div>
      {isOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 z-20" onClick={onClose}></div>
      )}
    </>
  );
}