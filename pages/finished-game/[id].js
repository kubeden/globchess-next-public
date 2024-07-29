import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { db } from '../../lib/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { Chess } from 'chess.js';

const Chessboard = dynamic(() => import('react-chessboard').then((mod) => mod.Chessboard), { ssr: false });

export default function FinishedGame() {
  const router = useRouter();
  const { id } = router.query;
  const [game, setGame] = useState(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [chessInstance, setChessInstance] = useState(new Chess());
  const [highlightedSquares, setHighlightedSquares] = useState({});

  useEffect(() => {
    if (id) {
      fetchGame(id);
    }
  }, [id]);

  const fetchGame = async (gameId) => {
    try {
      const gameDoc = await getDoc(doc(db, 'games', gameId));
      if (gameDoc.exists()) {
        const gameData = gameDoc.data();
        setGame(gameData);
        const finalChessInstance = new Chess();
        gameData.moves.forEach(move => finalChessInstance.move(move.move));
        setChessInstance(finalChessInstance);
        setCurrentMoveIndex(gameData.moves.length - 1);
      } else {
        console.error('No such game!');
      }
    } catch (error) {
      console.error('Error fetching game:', error);
    }
  };

  const goToMove = (index) => {
    const newChessInstance = new Chess();
    for (let i = 0; i <= index; i++) {
      newChessInstance.move(game.moves[i].move);
    }
    setChessInstance(newChessInstance);
    setCurrentMoveIndex(index);

    // Highlight the squares
    if (index >= 0) {
      const move = newChessInstance.history({ verbose: true })[index];
      setHighlightedSquares({
        [move.from]: { backgroundColor: '#a59681' },
        [move.to]: { backgroundColor: '#a59681' },
      });
    } else {
      setHighlightedSquares({});
    }
  };

  const goToNextMove = () => {
    if (currentMoveIndex < game.moves.length - 1) {
      goToMove(currentMoveIndex + 1);
    }
  };

  const goToPreviousMove = () => {
    if (currentMoveIndex > -1) {
      goToMove(currentMoveIndex - 1);
    }
  };

  if (!game) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen pt-[87px] px-2 md:px-4">
      <div className="w-full max-w-full md:max-w-[1250px] flex flex-col lg:flex-row gap-2 lg:gap-4">
        <div className="w-full lg:w-1/2 flex flex-col items-center">
          <div className="font-bold text-white w-full text-start lg:hidden px-4 bg-neutral-800 py-4 rounded-md mb-2">
            <h1 className="text-2xl">Finished Game</h1>
            <p className="text-xl"># {id}</p>
          </div>
          
          {/* Chessboard Section */}
          <div className="w-full max-w-[600px]">
            <Chessboard 
              position={chessInstance.fen()} 
              customSquareStyles={highlightedSquares}
            />
          </div>
          
          <div className="w-full max-w-[600px] mt-2">
            <div className="flex justify-between mt-0 gap-x-4 hidden md:flex">
              <button
                onClick={goToPreviousMove}
                className="bg-blue-700 px-10 text-neutral-100 font-bold rounded-md transition hover:bg-blue-800 disabled:bg-neutral-800 disabled:cursor-not-allowed"
                disabled={currentMoveIndex === -1}
              >
                <span className="fas fa-arrow-left font-black"></span>
              </button>
              <div className="flex flex-col items-center bg-neutral-800 p-2 rounded w-full">
                {currentMoveIndex >= 0 && (
                  <>
                    <div className="text-white text-sm">
                      Move: <span className="font-bold">{game.moves[currentMoveIndex].move}</span>
                    </div>
                    <div className="text-white text-sm">
                      By: <span className="font-bold">{game.moves[currentMoveIndex].playerHandle}</span>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={goToNextMove}
                className="bg-blue-700 px-10 text-neutral-100 font-bold rounded-md transition hover:bg-blue-800 disabled:bg-neutral-800 disabled:cursor-not-allowed"
                disabled={currentMoveIndex === game.moves.length - 1}
              >
                <span className="fas fa-arrow-right font-black"></span>
              </button>
            </div>
            <div className="grid grid-cols-2 justify-between mt-2 gap-x-2 md:hidden">
              <div className="flex flex-col items-center bg-neutral-800 p-2 rounded w-full col-span-2 mb-2">
                {currentMoveIndex >= 0 && (
                  <>
                    <div className="text-white text-sm">
                      Move: <span className="font-bold">{game.moves[currentMoveIndex].move}</span>
                    </div>
                    <div className="text-white text-sm">
                      By: <span className="font-bold">{game.moves[currentMoveIndex].playerHandle}</span>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={goToPreviousMove}
                className="py-4 bg-blue-700 px-10 text-neutral-100 font-bold rounded-md transition hover:bg-blue-800 disabled:bg-neutral-800 disabled:cursor-not-allowed w-full"
                disabled={currentMoveIndex === -1}
              >
                <span className="fas fa-arrow-left font-black"></span>
              </button>
              <button
                onClick={goToNextMove}
                className="py-4 bg-blue-700 px-10 text-neutral-100 font-bold rounded-md transition hover:bg-blue-800 disabled:bg-neutral-800 disabled:cursor-not-allowed w-full"
                disabled={currentMoveIndex === game.moves.length - 1}
              >
                <span className="fas fa-arrow-right font-black"></span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Move History Section */}
        <div className="w-full lg:w-1/2">
          <div className="bg-neutral-800 p-4 rounded-md h-[calc(100vh-8rem)] max-h-[712px] md:max-h-[665px] overflow-hidden flex flex-col">
            <h1 className="text-3xl font-bold mb-6 text-white hidden lg:block">Finished Game #{id}</h1>
            <h2 className="text-2xl font-bold mb-4 text-white">Move History</h2>
            <div className="overflow-y-auto flex-grow">
              <table className="w-full text-sm text-left text-neutral-300">
                <thead className="text-xs uppercase bg-neutral-700 text-neutral-300 sticky top-0">
                  <tr>
                    <th scope="col" className="px-6 py-3">Move</th>
                    <th scope="col" className="px-6 py-3">Player</th>
                    <th scope="col" className="px-6 py-3">Time & Date</th>
                  </tr>
                </thead>
                <tbody>
                  {game.moves.map((move, index) => (
                    <tr 
                      key={index} 
                      className={`border-b border-neutral-700 cursor-pointer ${
                        index === currentMoveIndex
                          ? 'bg-neutral-700 hover:bg-neutral-900'
                          : 'bg-neutral-800 hover:bg-neutral-700'
                      }`}
                      onClick={() => goToMove(index)}
                    >
                      <td className="px-6 py-4">{move.move}</td>
                      <td className="px-6 py-4">{move.playerHandle}</td>
                      <td className="px-6 py-4">{new Date(move.moveTimestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}