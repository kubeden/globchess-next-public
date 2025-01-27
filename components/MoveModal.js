import React, { useEffect, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';

const MoveModal = ({ isOpen, onClose, move, fen, accuracy, playerName, averageAccuracy, totalMoves }) => {
  const modalRef = useRef();
  const [boardWidth, setBoardWidth] = useState(400);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleResize = () => {
      setBoardWidth(Math.min(400, window.innerWidth - 40, window.innerHeight - 200));
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
      window.addEventListener('resize', handleResize);
      handleResize();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const customSquareStyles = {
    [move.from]: { backgroundColor: 'rgba(255, 255, 0, 0.5)' },
    [move.to]: { backgroundColor: 'rgba(255, 255, 0, 0.5)' }
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 90) return 'text-green-500';
    if (accuracy >= 70) return 'text-yellow-500';
    if (accuracy >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const handleShareTwitter = () => {
    const tweetText = `I just made the move on @globchess! \n\nMove: ${move.san} \nAccuracy: ${accuracy.toFixed(1)}%\nMy Average Accuracy: ${averageAccuracy.toFixed(1)}\nMy Total Moves: ${totalMoves} \n\nCurrent position: ${fen}`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(tweetUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-neutral-900 rounded-lg p-4 sm:p-6 w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-3xl overflow-y-auto flex flex-col items-center justify-center">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-center text-gray-200">You made a move, <br/> {playerName}!</h2>
        <div className="text-center mb-4 sm:mb-6 flex flex-col sm:flex-row gap-y-2 sm:gap-y-0 sm:gap-x-6 items-center justify-center">
          <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-200">{move.san}</p>
          <p className="text-base sm:text-lg md:text-xl text-gray-200">
            Move Accuracy: 
            <span className={`font-semibold ${getAccuracyColor(accuracy)}`}>
              {' '}{accuracy.toFixed(1)}%
            </span>
          </p>
        </div>
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-y-2 sm:gap-y-0 sm:gap-x-6 items-center justify-center text-gray-200">
          <p className="text-base sm:text-lg">
            Average Accuracy: 
            <span className={`font-semibold ${getAccuracyColor(averageAccuracy)}`}>
              {' '}{averageAccuracy.toFixed(1)}%
            </span>
          </p>
          <p className="text-base sm:text-lg">
            Total Moves: <span className="font-semibold">{totalMoves}</span>
          </p>
        </div>
        <div className="mb-4 sm:mb-6 flex justify-center">
          <Chessboard 
            position={fen} 
            boardWidth={boardWidth}
            customSquareStyles={customSquareStyles}
          />
        </div>
        <button
          onClick={handleShareTwitter}
          className="bg-black w-full max-w-md hover:bg-white hover:text-black text-white font-bold py-2 px-4 rounded flex items-center justify-center transition duration-300"
        >
          Share on <i className="fab fa-x-twitter ml-2"></i>
        </button>
      </div>
    </div>
  );
};

export default MoveModal;