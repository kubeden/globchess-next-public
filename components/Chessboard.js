// components/Chessboard.js

import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

export default function ChessboardComponent({ onMove }) {
  const [game, setGame] = useState(new Chess());

  // start useReducer here and move slowly

  return <Chessboard position={game.fen()} onPieceDrop={onDrop} />;
}