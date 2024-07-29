// components/FinishedGamesModal.js

import { useEffect, useState } from 'react';
import { db } from '../lib/firebaseConfig';
import { collection, query, where, orderBy, getDocs, limit, startAfter } from 'firebase/firestore';
import { useRouter } from 'next/router';

export default function FinishedGamesModal({ isOpen, onClose }) {
  const [finishedGames, setFinishedGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();
  const gamesPerPage = 8; // Increased to fill the fixed height better

  useEffect(() => {
    if (isOpen) {
      fetchFinishedGames();
    }
  }, [isOpen]);

  async function fetchFinishedGames(loadMore = false) {
    setIsLoading(true);
    setError(null);
    try {
      const gamesRef = collection(db, 'games');
      let q = query(
        gamesRef, 
        where('endedAt', '!=', null),
        orderBy('endedAt', 'desc'),
        limit(gamesPerPage)
      );

      if (loadMore && lastVisible) {
        q = query(q, startAfter(lastVisible));
      } else if (loadMore) {
        return; // No more games to load
      }

      const querySnapshot = await getDocs(q);
      const games = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        endedOn: formatDate(doc.data().endedAt)
      }));

      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMore(querySnapshot.docs.length === gamesPerPage);

      if (loadMore) {
        setFinishedGames(prevGames => [...prevGames, ...games]);
      } else {
        setFinishedGames(games);
      }
    } catch (err) {
      console.error("Error fetching finished games:", err);
      setError("Failed to fetch finished games. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }

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

  const handleGameClick = (gameId) => {
    router.push(`/finished-game/${gameId}`);
    onClose();
  };

  const handleLoadMore = () => {
    fetchFinishedGames(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-neutral-800 p-6 rounded-lg max-w-2xl w-full h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Finished Games</h2>
          <button onClick={onClose} className="text-white">
            <i className="fas fa-times"></i>
          </button>
        </div>
        {isLoading && finishedGames.length === 0 ? (
          <p className="text-white">Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <div className="flex-grow overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4 mb-4">
              {finishedGames.map((game, index) => (
                <div 
                  key={game.id} 
                  className="bg-neutral-700 p-4 rounded cursor-pointer hover:bg-neutral-600 transition-colors"
                  onClick={() => handleGameClick(game.id)}
                >
                  <h3 className="font-bold text-white">Game #{finishedGames.length - index}</h3>
                  <p className="text-neutral-300">Ended On: {game.endedOn}</p>
                  <p className="text-neutral-300">Finish Move By: {game.lastMoveBy || 'Unknown'}</p>
                  <p className="text-neutral-300">Result: {game.result}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <button 
              onClick={handleLoadMore}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}