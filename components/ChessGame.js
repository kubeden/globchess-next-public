// components/ChessGame.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { db, auth } from '../lib/firebaseConfig';
import { doc, getDoc, getDocs, updateDoc, onSnapshot, addDoc, collection, query, orderBy, serverTimestamp, deleteDoc, limit, runTransaction, writeBatch } from 'firebase/firestore';
import BuyTokens from './BuyTokens';
import ReactDOM from 'react-dom';
import ChatBox from './ChatBox';  // Import the new ChatBox component
import LoginModal from './LoginModal';
import MoveModal from './MoveModal';
import { useMediaQuery } from 'react-responsive';

export default function ChessGame({ onMoveAttempt, isLoggedIn }) {
    const { data: session } = useSession();
    const [game, setGame] = useState(new Chess());
    const [boardOrientation, setBoardOrientation] = useState('white');
    const [userTokens, setUserTokens] = useState(0);
    const [lastMove, setLastMove] = useState(null);
    const [lockUntil, setLockUntil] = useState(null);
    const [moveHistory, setMoveHistory] = useState([]);
    const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
    const [errorMessage, setErrorMessage] = useState('');
    const isCompletingGameRef = useRef(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [pendingMove, setPendingMove] = useState(null);
    const [isBoardLocked, setIsBoardLocked] = useState(false);
    const [lockedByUser, setLockedByUser] = useState(null);
    const [lockedByUserName, setLockedByUserName] = useState(null);
    const [showBuyTokensModal, setShowBuyTokensModal] = useState(false);
    const [currentMoveAttempt, setCurrentMoveAttempt] = useState(null);
    const [currentGameNumber, setCurrentGameNumber] = useState(0);
    const [selectedMove, setSelectedMove] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const movesPerPage = 10;
    const [kingInCheck, setKingInCheck] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [showMoveHistory, setShowMoveHistory] = useState(false);
    const [displayedMove, setDisplayedMove] = useState(null);
    const [isEvaluatingMove, setIsEvaluatingMove] = useState(false);
    // Modify the movesSinceLastMove state
    const [movesSinceLastMove, setMovesSinceLastMove] = useState({});
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [lastMoveDetails, setLastMoveDetails] = useState(null);
    const [isDraggingEnabled, setIsDraggingEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userStats, setUserStats] = useState({ averageAccuracy: 0, totalMoves: 0 });

    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
    
    const customSquareStyles = {};
    if (selectedMove) {
        customSquareStyles[selectedMove.from] = { backgroundColor: '#a59681' };
        customSquareStyles[selectedMove.to] = { backgroundColor: '#a59681' };
    } else if (lastMove) {
        customSquareStyles[lastMove.from] = { backgroundColor: '#a59681' };
        customSquareStyles[lastMove.to] = { backgroundColor: '#a59681' };
    }
    if (currentMoveAttempt) {
        customSquareStyles[currentMoveAttempt.from] = { 
            ...customSquareStyles[currentMoveAttempt.from],
            backgroundColor: '#7fa650'
        };
        customSquareStyles[currentMoveAttempt.to] = { 
            ...customSquareStyles[currentMoveAttempt.to],
            backgroundColor: '#7fa650'
        };
    }
    if (kingInCheck) {
        customSquareStyles[kingInCheck] = {
            ...customSquareStyles[kingInCheck],
            backgroundColor: '#ae4646'
        };
    }
    
    const boardClasses = `rounded-md flex items-center justify-center border-2 border-neutral-600 ${
        isBoardLocked && lockedByUser !== session?.user.id ? 'animate-pulse-opacity' : ''
    }`;

    const triggerLoginModal = () => {
        if (!session) {
          setShowLoginModal(true);
        }
    };

    useEffect(() => {
        if (session?.user?.id) {
            const userRef = doc(db, "users", session.user.id);
            const unsubscribe = onSnapshot(userRef, (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    setUserStats({
                        averageAccuracy: data.averageAccuracy || 0,
                        totalMoves: data.totalMoves || 0
                    });
                }
            });
    
            return () => unsubscribe();
        }
    }, [session]);
    
    const calculateMoveAccuracy = useCallback(async (prevFen, newFen) => {
        try {
            const prevEvalResponse = await fetch('/api/evaluate-position', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fen: prevFen }),
            });
            const prevEvalData = await prevEvalResponse.json();

            const newEvalResponse = await fetch('/api/evaluate-position', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fen: newFen }),
            });
            const newEvalData = await newEvalResponse.json();

            const prevEval = prevEvalData.eval;
            const newEval = newEvalData.eval;

            // Check if the game has ended
            const chessInstance = new Chess(newFen);
            if (chessInstance.isGameOver()) {
                // Handle game-over scenarios
                if (chessInstance.isCheckmate()) {
                    return 100; // Checkmate is always considered a perfect move
                } else if (chessInstance.isDraw()) {
                    return 50; // Draw might be considered an average move
                }
            }

            // Calculate accuracy based on the difference between the evaluations
            const evalDifference = Math.abs(newEval - prevEval);
            let accuracy;

            if (evalDifference === 0) {
                accuracy = 100;
            } else if (evalDifference <= 0.5) {
                accuracy = 90;
            } else if (evalDifference <= 1) {
                accuracy = 80;
            } else if (evalDifference <= 2) {
                accuracy = 70;
            } else if (evalDifference <= 3) {
                accuracy = 60;
            } else {
                accuracy = Math.max(0, 50 - (evalDifference - 3) * 10);
            }

            return Math.round(accuracy);
        } catch (error) {
            console.error('Error calculating move accuracy:', error);
            return 50; // Fallback to a neutral accuracy
        }
    }, []);

    function setGameNumber() {
        // get all games
        const gamesRef = collection(db, 'games');
        // get the number of games and set the current game number
        getDocs(gamesRef).then((snapshot) => {
            setCurrentGameNumber(snapshot.size
                ? snapshot.size
                : 0
            );
        });
    }

    const handleBuyTokensAndPlay = () => {
        setShowBuyTokensModal(true);
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

    // Modify the useEffect hook that listens to game changes
    // the problem is probably here
    // reducer is like a huge switch statement

    // const [state, dispatch] = useReducer(reducer, initialArg, init?)

    // now I am updating the state multiple times but with a useReducer I will be updating the state once

    useEffect(() => {
        const gameRef = doc(db, "games", "currentGame");
        const unsubscribeGame = onSnapshot(gameRef, async (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                const newGame = new Chess(data.fen);
                
                // useReducer to send the whole data object ... 
                setGame(newGame);
                setBoardOrientation(newGame.turn() === 'w' ? 'white' : 'black');
                setLastMove(data.lastMove || null);
                setLockUntil(data.lockUntil || null);
                setIsBoardLocked(data.lockUntil ? data.lockUntil > Date.now() : false);
                setLockedByUser(data.lockedByUser || null);
                setLockedByUserName(data.lockedByUserName || null);
                setGameNumber();

                const kingSquare = findKingSquare(newGame);
                if (newGame.inCheck()) {
                    setKingInCheck(kingSquare);
                } else {
                    setKingInCheck(null);
                }

                if (isGameOver(newGame) && !isCompletingGameRef.current) {
                    handleGameCompletion(newGame, data.lastMove);
                }

                // Update movesSinceLastMove when a new move is made
                // if (data.lastMove && data.lastMove.playerHandle) {
                //     setMovesSinceLastMove(prevState => {
                //         const newState = { ...prevState };
                //         Object.keys(newState).forEach(userId => {
                //             if (userId !== data.lastMove.playerHandle) {
                //                 newState[userId] = (newState[userId] || 0) + 1;
                //             } else {
                //                 newState[userId] = 0;
                //             }
                //         });
                //         return newState;
                //     });
                // }

                // Fetch the latest moveCount data from Firestore
                const moveCountRef = doc(db, "moveCount", "current");
                const moveCountDoc = await getDoc(moveCountRef);
                if (moveCountDoc.exists()) {
                    setMovesSinceLastMove(moveCountDoc.data());
                }

                setIsLoading(false);
            } else {
                initializeNewGame();
            }
        });

        const movesQuery = query(collection(db, "moves"), orderBy("moveTimestamp", "desc"));
        const unsubscribeMoves = onSnapshot(movesQuery, (snapshot) => {
            const moves = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));
            setMoveHistory(moves);
            setCurrentMoveIndex(0);
        });

        if (session) {
            const userRef = doc(db, "users", session.user.id);
            const unsubscribeUser = onSnapshot(userRef, (userDoc) => {
                if (userDoc.exists()) {
                    setUserTokens(userDoc.data().tokens);
                }
            });

            return () => {
                unsubscribeGame();
                unsubscribeUser();
            };
        }

        return () => {
            unsubscribeGame();
            unsubscribeMoves();
        };
    }, [session]);

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        return date.toLocaleString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            month: 'short', 
            day: 'numeric'
        });
    };

    const initializeNewGame = async () => {
        const newGame = new Chess();
        try {
            await runTransaction(db, async (transaction) => {
                const gameRef = doc(db, "games", "currentGame");
                const moveCountRef = doc(db, "moveCount", "current");
    
                transaction.set(gameRef, {
                    fen: newGame.fen(),
                    lastMove: null,
                    lockUntil: null
                });
    
                // Reset move count
                transaction.set(moveCountRef, {});
            });
    
            // Reset local state
            setMovesSinceLastMove({});
            setGame(newGame);
            setLastMove(null);
            setCurrentMoveIndex(-1);
            setMoveHistory([]);
            
        } catch (error) {
            console.error("Error initializing new game:", error);
        }
    };
    

    // Modify the lockBoard function
    async function lockBoard() {
        if (!isLoggedIn || userTokens < 1) return;

        try {
            await runTransaction(db, async (transaction) => {
                const gameRef = doc(db, "games", "currentGame");
                const userRef = doc(db, "users", session.user.id);
                const moveCountRef = doc(db, "moveCount", "current");

                const gameDoc = await transaction.get(gameRef);
                const userDoc = await transaction.get(userRef);
                const moveCountDoc = await transaction.get(moveCountRef);

                if (!gameDoc.exists() || !userDoc.exists()) {
                    throw new Error("Game or user document not found");
                }

                const currentTokens = userDoc.data().tokens;
                if (currentTokens < 1) {
                    throw new Error("Insufficient tokens");
                }

                const currentMoveCount = moveCountDoc.exists() ? moveCountDoc.data() : {};

                // Check if the user has made 5 or more moves since their last move
                // if (session.user.id in currentMoveCount && currentMoveCount[session.user.id] < 5) {
                //     throw new Error(`You need to wait for ${5 - currentMoveCount[session.user.id]} more moves before making another move.`);
                // }

                const lockDuration = 60000; // 1 minute in milliseconds
                const lockUntil = Date.now() + lockDuration;

                transaction.update(gameRef, {
                    lockUntil: lockUntil,
                    lockedByUser: session.user.id,
                    lockedByUserName: session.user.name
                });

                // Deduct the token here
                transaction.update(userRef, {
                    tokens: currentTokens - 1
                });
            });

            setIsBoardLocked(true);
            setLockedByUser(session.user.id);
            setLockUntil(Date.now() + 60000);
            setLockedByUserName(session.user.name);
            setUserTokens(userTokens - 1);
            setIsDraggingEnabled(true);

            // Automatically unlock the board after 1 minute
            setTimeout(() => {
                unlockBoard();
            }, 60000);

        } catch (error) {
            console.error("Error locking board:", error);
            setErrorMessage(error.message);
        }
    }

    // Update the onDrop function to set the current move attempt
    const onDrop = useCallback((sourceSquare, targetSquare) => {
        if (!isLoggedIn) {
            onMoveAttempt();
            return false;
        }

        if (!isDraggingEnabled) {
            // Optionally, you can show a message to the user here
            return false;
        }

        if (isBoardLocked && lockedByUser !== session.user.id) return false;

        const move = {
            from: sourceSquare,
            to: targetSquare,
            promotion: 'q' // Always promote to queen for simplicity
        };

        try {
            const gameCopy = new Chess(game.fen());
            const result = gameCopy.move(move);

            if (result === null) {
                return false;
            }

            setPendingMove({ ...move, playerHandle: session.user.name });
            setGame(gameCopy);
            setCurrentMoveAttempt({ from: sourceSquare, to: targetSquare }); // Set the current move attempt
            return true;
        } catch (error) {
            return false;
        }
    }, [game, isLoggedIn, isBoardLocked, lockedByUser, onMoveAttempt, session, isDraggingEnabled]);

    // Add a new useEffect to update isDraggingEnabled
    useEffect(() => {
        setIsDraggingEnabled(isBoardLocked && lockedByUser === session?.user.id);
    }, [isBoardLocked, lockedByUser, session]);

    // Modify the makeMove function
    async function makeMove() {
        if (!isLoggedIn || !pendingMove || lockedByUser !== session?.user.id) return;

        setIsEvaluatingMove(true);

        try {
            await runTransaction(db, async (transaction) => {
                const gameRef = doc(db, "games", "currentGame");
                const moveCountRef = doc(db, "moveCount", "current");
                const userRef = doc(db, "users", session.user.id);
                const gameDoc = await transaction.get(gameRef);
                const moveCountDoc = await transaction.get(moveCountRef);
                const userDoc = await transaction.get(userRef);
                
                if (!gameDoc.exists()) {
                    throw new Error("Game document not found");
                }

                let currentMoveCount = moveCountDoc.exists() ? moveCountDoc.data() : {};

                // Check if the user has made 5 or more moves since their last move
                // if (session.user.id in currentMoveCount && currentMoveCount[session.user.id] < 5) {
                //     throw new Error(`You need to wait for ${5 - currentMoveCount[session.user.id]} more moves before making another move.`);
                // }

                const currentGameState = new Chess(gameDoc.data().fen);
                const prevFen = currentGameState.fen();
                
                const result = currentGameState.move({
                    from: pendingMove.from,
                    to: pendingMove.to,
                    promotion: pendingMove.promotion
                });

                if (result === null) {
                    throw new Error("Invalid move");
                }

                const newFen = currentGameState.fen(); // Get the new FEN after the move

                const accuracy = await calculateMoveAccuracy(prevFen, newFen);

                const moveData = {
                    move: result.san,
                    playerHandle: pendingMove.playerHandle,
                    moveTimestamp: serverTimestamp(),
                    accuracy: accuracy
                };

                // Set lastMoveDetails
                setLastMoveDetails({
                    move: {
                        from: pendingMove.from,
                        to: pendingMove.to,
                        san: result.san
                    },
                    fen: currentGameState.fen(),
                    accuracy: accuracy
                });

                const newMoveRef = doc(collection(db, "moves"));
                transaction.set(newMoveRef, moveData);

                transaction.update(gameRef, {
                    fen: currentGameState.fen(),
                    lastMove: {
                        from: pendingMove.from,
                        to: pendingMove.to,
                        promotion: pendingMove.promotion,
                        playerHandle: pendingMove.playerHandle,
                        san: result.san,
                        accuracy: accuracy
                    },
                    lockUntil: null,
                    lockedByUser: null,
                    lockedByUserName: null
                });

                // Update user statistics and save move
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const totalMoves = (userData.totalMoves || 0) + 1;
                    const totalAccuracy = (userData.totalAccuracy || 0) + accuracy;
                    const averageAccuracy = totalAccuracy / totalMoves;

                    // Save the move to the user's document
                    const userMoves = userData.moves || [];
                    userMoves.push({
                        move: {
                            from: pendingMove.from,
                            to: pendingMove.to,
                            san: result.san,
                        },
                        accuracy: accuracy,
                        gameFen: newFen,
                        timestamp: new Date().toISOString()
                    });

                    transaction.update(userRef, {
                        totalMoves: totalMoves,
                        totalAccuracy: totalAccuracy,
                        averageAccuracy: averageAccuracy,
                        moves: userMoves
                    });

                    // Update local state
                    setUserStats({
                        averageAccuracy: averageAccuracy,
                        totalMoves: totalMoves
                    });
                } else {
                    // If user document doesn't exist, create it with the first move
                    transaction.set(userRef, {
                        totalMoves: 1,
                        totalAccuracy: accuracy,
                        averageAccuracy: accuracy,
                        moves: [{
                            move: result.san,
                            accuracy: accuracy,
                            gameFen: newFen,
                            timestamp: serverTimestamp()
                        }]
                    });
                }

                // Update move counts for all players
                Object.keys(currentMoveCount).forEach(userId => {
                    if (userId !== session.user.id) {
                        currentMoveCount[userId] = (currentMoveCount[userId] || 0) + 1;
                    } else {
                        currentMoveCount[userId] = 0;
                    }
                });

                // If the current user isn't in the moveCount, add them
                if (!(session.user.id in currentMoveCount)) {
                    currentMoveCount[session.user.id] = 0;
                }

                // Update the move count in Firestore
                transaction.set(moveCountRef, currentMoveCount);
            });

            setPendingMove(null);
            setCurrentMoveAttempt(null);
            setIsBoardLocked(false);
            setLockedByUser(null);
            setLockUntil(null);
            setLockedByUserName(null);

            // Show the move modal
            setShowMoveModal(true);

        } catch (error) {
            console.error("Error making move:", error);
            // setErrorMessage('Failed to make move. Please try again.');
        } finally {
            setIsEvaluatingMove(false);
        }
    }

    const formatAccuracy = (accuracy) => {
        if (accuracy === undefined || accuracy === null) return 'N/A';
        return `${accuracy.toFixed(1)}%`;
    };

    // Update the unlockBoard function
    async function unlockBoard() {
        try {
            await updateDoc(doc(db, "games", "currentGame"), {
                lockUntil: null,
                lockedByUser: null
            });

            setIsBoardLocked(false);
            setLockedByUser(null);
            setLockUntil(null);
            setLockedByUserName(null);
            setIsDraggingEnabled(false);
        } catch (error) {
            console.error("Error unlocking board:", error);
            setErrorMessage('Failed to unlock board. Please try refreshing the page.');
        }
    }


    async function resetMove() {
        setPendingMove(null);
        setCurrentMoveAttempt(null); // Clear the current move attempt
    
        try {
            const gameRef = doc(db, "games", "currentGame");
            const docSnap = await getDoc(gameRef);
    
            if (docSnap.exists()) {
                const newGame = new Chess(docSnap.data().fen);
                setGame(newGame);
            } else {
                console.error("No such document in Firestore!");
                // setErrorMessage('Game data not found. Please try again.');
            }
        } catch (error) {
            console.error("Error fetching game data:", error);
            // setErrorMessage('An error occurred while resetting the move. Please try again.');
        }
    }

    function isGameOver(chess) {
        return chess.isCheckmate() || chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial();
    }

    async function handleGameCompletion(finalGameState, lastMove) {
        isCompletingGameRef.current = true;
        try {
            await runTransaction(db, async (transaction) => {
                const movesSnapshot = await getDocs(query(collection(db, "moves"), orderBy("moveTimestamp", "asc")));
                let movesToSave = movesSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        move: data.move,
                        playerHandle: data.playerHandle,
                        moveTimestamp: data.moveTimestamp.toMillis() // Convert Timestamp to milliseconds
                    };
                });
    
                const finishedGame = {
                    fen: finalGameState.fen(),
                    moves: movesToSave,
                    endedAt: Date.now(),
                    lastMoveBy: lastMove.playerHandle,
                    result: getGameResult(finalGameState),
                    status: 'completed'
                };
    
                // Save the finished game
                const newGameRef = await addDoc(collection(db, "games"), finishedGame);
                await updateDoc(newGameRef, { gameId: newGameRef.id });
    
                // Delete all moves
                movesSnapshot.docs.forEach((doc) => {
                    transaction.delete(doc.ref);
                });
    
                // Start a new game with an empty moves collection
                const newGame = new Chess();
                transaction.set(doc(db, "games", "currentGame"), {
                    fen: newGame.fen(),
                    lastMove: null,
                    lockUntil: null
                });
    
                // Reset the move count
                transaction.set(doc(db, "moveCount", "current"), {});
    
                // Explicitly delete the 'moves' collection
                const movesCollectionRef = collection(db, "moves");
                const allMovesSnapshot = await getDocs(movesCollectionRef);
                allMovesSnapshot.docs.forEach((doc) => {
                    transaction.delete(doc.ref);
                });
    
                // Add game end message to chat
                const gameEndMessage = `Game #${currentGameNumber} has ended. Result: ${getGameResult(finalGameState)}`;
                await addDoc(collection(db, "messages"), {
                    content: gameEndMessage,
                    playerName: "System",
                    timestamp: serverTimestamp(),
                    gameNumber: currentGameNumber
                });
            });
    
            // Reset local state
            setMoveHistory([]);
            setCurrentMoveIndex(-1);
            setLastMove(null);
            setMovesSinceLastMove({}); // Reset local move count state
    
        } catch (error) {
            console.error("Error handling game completion:", error);
            throw error;
        } finally {
            isCompletingGameRef.current = false;
        }
    }

    // Add a new function to find the king's square
    function findKingSquare(chess) {
        const color = chess.turn();
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const square = String.fromCharCode(97 + j) + (8 - i);
                const piece = chess.get(square);
                if (piece && piece.type === 'k' && piece.color === color) {
                    return square;
                }
            }
        }
        return null;
    }

    function getGameResult(chess) {
        if (chess.isCheckmate()) return chess.turn() === 'w' ? 'Black wins' : 'White wins';
        if (chess.isDraw()) return 'Draw';
        if (chess.isStalemate()) return 'Stalemate';
        if (chess.isThreefoldRepetition()) return 'Draw by repetition';
        if (chess.isInsufficientMaterial()) return 'Draw by insufficient material';
        return 'Unknown';
    }

    // Modify the processMove function to handle SAN notation
    function processMove(move) {
        if (typeof move === 'string') {
            // If the move is already in SAN notation, return it as is
            return move;
        } else if (typeof move === 'object' && move.from && move.to) {
            // If it's an object with from and to, convert it to SAN
            const tempGame = new Chess(game.fen());
            const result = tempGame.move({
                from: move.from,
                to: move.to,
                promotion: move.promotion || 'q'
            });
            return result ? result.san : null;
        }
        console.error("Invalid move format:", move);
        throw new Error("Invalid move format");
    }

    // Modify the displayMoveOnBoard function
    function displayMoveOnBoard(moveIndex) {
        const newGame = new Chess();
        try {
            for (let i = moveHistory.length - 1; i >= moveIndex; i--) {
                const moveData = moveHistory[i].move;
                const result = newGame.move(moveData);
                if (i === moveIndex) {
                    setSelectedMove({
                        from: result.from,
                        to: result.to
                    });
                    setDisplayedMove(moveHistory[i]); // Set the displayed move
                }
            }
            setGame(newGame);
            setCurrentMoveIndex(moveIndex);
        } catch (error) {
            console.error("Error in displayMoveOnBoard:", error);
            setErrorMessage('Unable to display move. Please try again.');
        }
    }

    // Modify the goToPreviousMove function
    function goToPreviousMove() {
        if (currentMoveIndex < moveHistory.length - 1) {
            const newIndex = currentMoveIndex + 1;
            const newGame = new Chess();
            try {
                for (let i = moveHistory.length - 1; i >= newIndex; i--) {
                    const result = newGame.move(moveHistory[i].move);
                    if (i === newIndex) {
                        setSelectedMove({
                            from: result.from,
                            to: result.to
                        });
                        setDisplayedMove(moveHistory[i]); // Set the displayed move
                    }
                }
                setGame(newGame);
                setCurrentMoveIndex(newIndex);
            } catch (error) {
                console.error("Error in goToPreviousMove:", error);
                setErrorMessage('Unable to show previous move. Please try again.');
            }
        }
    }

    // Modify the goToNextMove function
    function goToNextMove() {
        if (currentMoveIndex > 0) {
            const newIndex = currentMoveIndex - 1;
            const newGame = new Chess();
            try {
                for (let i = moveHistory.length - 1; i >= newIndex; i--) {
                    const result = newGame.move(moveHistory[i].move);
                    if (i === newIndex) {
                        setSelectedMove({
                            from: result.from,
                            to: result.to
                        });
                        setDisplayedMove(moveHistory[i]); // Set the displayed move
                    }
                }
                setGame(newGame);
                setCurrentMoveIndex(newIndex);
            } catch (error) {
                console.error("Error in goToNextMove:", error);
                setErrorMessage('Unable to show next move. Please try again.');
            }
        }
    }

    // Add a useEffect to update displayedMove when lastMove changes
    useEffect(() => {
        if (lastMove) {
            setDisplayedMove({
                move: lastMove.san,
                playerHandle: lastMove.playerHandle
            });
        }
    }, [lastMove]);


    // Add a useEffect to reset selectedMove when a new move is made
    useEffect(() => {
        setSelectedMove(null);
    }, [lastMove]);

    // Modify the pagination logic
    const indexOfFirstMove = (currentPage - 1) * movesPerPage;
    const indexOfLastMove = currentPage * movesPerPage;
    const currentMoves = moveHistory.slice(indexOfFirstMove, indexOfLastMove);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const Pagination = ({ movesPerPage, totalMoves, paginate, currentPage }) => {
        const pageNumbers = [];
        for (let i = 1; i <= Math.ceil(totalMoves / movesPerPage); i++) {
            pageNumbers.push(i);
        }

        return (
            <nav className="mt-4">
                <ul className="flex justify-center">
                    {pageNumbers.map(number => (
                        <li key={number} className="mx-1">
                            <button
                                onClick={() => paginate(number)}
                                className={`px-3 py-1 rounded ${currentPage === number ? 'bg-neutral-200 text-neutral-700' : 'text-neutral-200'}`}
                            >
                                {number}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        );
    };

    // function to reset the game and clear the board

    const resetGame = async () => {
        try {
            await runTransaction(db, async (transaction) => {
                const gameRef = doc(db, "games", "currentGame");
                const moveCountRef = doc(db, "moveCount", "current");
                const userRef = doc(db, "users", session.user.id);
                const gameDoc = await transaction.get(gameRef);
                const moveCountDoc = await transaction.get(moveCountRef);
                const userDoc = await transaction.get(userRef);
                
                if (!gameDoc.exists()) {
                    throw new Error("Game document not found");
                }

                const currentGameState = new Chess(gameDoc.data().fen);
                const prevFen = currentGameState.fen();
                
                const newFen = currentGameState.fen(); // Get the new FEN after the move

                // Reset the game
                const newGame = new Chess();
                transaction.set(gameRef, {
                    fen: newGame.fen(),
                    lastMove: null,
                    lockUntil: null
                });

                // Reset move count
                transaction.set(moveCountRef, {});

                // Reset user statistics
                transaction.update(userRef, {
                    totalMoves: 0,
                    totalAccuracy: 0,
                    averageAccuracy: 0,
                    moves: []
                });

                // Update local state
                setUserStats({
                    averageAccuracy: 0,
                    totalMoves: 0
                });

                // Update local state
                setMovesSinceLastMove({});
                setGame(newGame);
                setLastMove(null);
                setCurrentMoveIndex(-1);
                setMoveHistory([]);
            });
        } catch (error) {
            console.error("Error resetting game:", error);
            setErrorMessage('Failed to reset the game. Please try again.');
        }

        // Reset local state
        setPendingMove(null);
        setCurrentMoveAttempt(null);
        setIsBoardLocked(false);
        setLockedByUser(null);
        setLockUntil(null);
        setLockedByUserName(null);
        setIsDraggingEnabled(false);

        // reset the moves in the collection
        const movesCollectionRef = collection(db, "moves");
        const allMovesSnapshot = await getDocs(movesCollectionRef);
        allMovesSnapshot.docs.forEach((doc) => {
            deleteDoc(doc.ref);
        });
    }

    // resetGame();

    

    return (
        <div className="flex flex-col lg:flex-row w-full max-w-[1450px] mx-auto px-4 gap-2 mt-0 md:mt-[75px]">
            {/* Chat Section */}
            {(!isMobile || (isMobile && showChat)) && (
                <div className={`${isMobile ? 'fixed inset-0 z-50 bg-neutral-900 bg-opacity-95 pt-0 md:pt-24' : 'lg:w-1/4'} order-3 lg:order-1`}>
                    <div className="bg-neutral-800 p-4 rounded-none md:rounded-lg mb-1 md:mb-2">
                        <div className="flex items-center space-x-2">
                            <img src="/assets/img/token.png" alt="Token" className="w-6 h-6" />
                            <h2 className="text-white text-xl font-bold">Available Tokens:</h2>
                            <span className="text-white font-bold text-xl">{userTokens}</span>
                        </div>
                    </div>
                    <div className={`bg-neutral-800 rounded-none md:rounded-lg ${isMobile ? 'h-[calc(100vh-160px)]' : 'h-[calc(100vh-184px)] max-h-[645px]'} overflow-hidden relative`}>
                        {isMobile && (
                            <button 
                                onClick={() => setShowChat(false)} 
                                className="absolute top-4 right-4 text-white text-2xl"
                            >
                                &times;
                            </button>
                        )}
                        <ChatBox gameNumber={currentGameNumber} />
                    </div>
                </div>
            )}
            
            {/* Chessboard Section */}
            <div className="lg:w-1/2 flex flex-col items-center order-1 lg:order-2">
                <div className={`${boardClasses} w-full max-w-[600px]`}>
                    <Chessboard 
                        position={game.fen()} 
                        onPieceDrop={onDrop}
                        boardOrientation={boardOrientation}
                        customSquareStyles={customSquareStyles}
                        animationDuration={200}
                        draggablePieces={isDraggingEnabled}
                    />
                </div>
                
                <div className="w-full max-w-[600px] mt-2">
                    {errorMessage && (
                        <div className="bg-red-500 text-white p-2 rounded mb-4">
                            {errorMessage}
                        </div>
                    )}
                    <div className="flex justify-between gap-x-2 mb-2">
                        <button 
                            onClick={goToPreviousMove} 
                            disabled={currentMoveIndex >= moveHistory.length - 1}
                            className="bg-blue-700 px-4 py-2 text-neutral-100 font-bold rounded-md transition hover:bg-blue-800 disabled:bg-neutral-800 disabled:cursor-not-allowed"
                        >
                            <span className="fas fa-arrow-left"></span>
                        </button>
                        <div className="flex flex-col items-center justify-center bg-neutral-800 p-2 rounded flex-grow">
                            {displayedMove && (
                                <>
                                <div className="text-white text-sm">
                                    Move: <span className="font-bold">{displayedMove.move}</span>
                                </div>
                                <div className="text-white text-sm">
                                    By: <span className="font-bold">{displayedMove.playerHandle}</span>
                                </div>
                                </>
                            )}
                        </div>
                        <button 
                            onClick={goToNextMove} 
                            disabled={currentMoveIndex <= 0}
                            className="bg-blue-700 px-4 py-2 text-neutral-100 font-bold rounded-md transition hover:bg-blue-800 disabled:bg-neutral-800 disabled:cursor-not-allowed"
                        >
                            <span className="fas fa-arrow-right"></span>
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={
                                isLoggedIn 
                                    ? isBoardLocked
                                        ? lockedByUser === session?.user.id
                                            ? makeMove
                                            : () => {}
                                        : userTokens === 0 
                                            ? handleBuyTokensAndPlay 
                                            : lockBoard 
                                    : onMoveAttempt
                            }
                            disabled={isLoading ||
                                (isBoardLocked && lockedByUser !== session?.user.id) ||
                                (isBoardLocked && lockedByUser === session?.user.id && !pendingMove) || isEvaluatingMove
                                // || (session?.user.id in movesSinceLastMove && movesSinceLastMove[session?.user.id] < 5)
                            }
                            className={`
                                ${
                                    isLoading ? 'bg-neutral-600' :
                                    !isLoggedIn
                                        ? 'bg-neutral-800 hover:bg-neutral-900'
                                        : isBoardLocked
                                            ? lockedByUser === session?.user.id
                                                ? pendingMove
                                                    ? 'bg-green-500 hover:bg-green-600'
                                                    : 'bg-gray-500'
                                                : 'bg-gray-500'
                                            : userTokens === 0
                                                ? 'bg-yellow-600 hover:bg-yellow-700'
                                                // : session?.user.id in movesSinceLastMove && movesSinceLastMove[session?.user.id] < 5
                                                //     ? 'bg-red-500'
                                                    : 'bg-green-800 hover:bg-green-900'
                                } 
                                px-4 py-2 text-white font-bold rounded-md transition 
                                ${isLoggedIn ? 'disabled:bg-neutral-600 disabled:cursor-not-allowed' : ''}
                            `}
                            >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                </div>
                            ) : isEvaluatingMove ? (
                                <>
                                    <span className="opacity-0">Evaluating Move</span>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                    </div>
                                </>
                            ) : (
                                !isLoggedIn
                                    ? 'Login to Play'
                                    : isBoardLocked
                                        ? lockedByUser === session?.user.id
                                            ? 'Make Move'
                                            : 'Board Locked'
                                        : userTokens === 0
                                            ? 'Buy Tokens & Play'
                                            // : session?.user.id in movesSinceLastMove && movesSinceLastMove[session?.user.id] < 5
                                            //     ? `Available after ${5 - movesSinceLastMove[session?.user.id]} moves`
                                            : 'Lock Board & Make Move'
                            )}
                        </button>
                        <button 
                            onClick={resetMove} 
                            disabled={!isLoggedIn || !pendingMove || (isBoardLocked && lockedByUser !== session?.user.id) || isEvaluatingMove}
                            className="bg-red-700 hover:bg-red-800 px-4 py-2 text-white font-bold rounded-md transition disabled:bg-neutral-800 disabled:cursor-not-allowed"
                        >
                            Reset Move
                        </button>
                    </div>
                </div>
                {showBuyTokensModal && <BuyTokensModal />}

                {isMobile && (
                    <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-[600px]">
                        <button 
                            onClick={() => setShowChat(!showChat)} 
                            className="bg-blue-700 px-4 py-4 text-white rounded"
                        >
                            <span className="fa fa-comments"></span> Chat
                        </button>
                        <button 
                            onClick={() => setShowMoveHistory(!showMoveHistory)} 
                            className="bg-blue-700 px-4 py-4 text-white rounded"
                        >
                            <span className="fa fa-history"></span> Move History
                        </button>
                    </div>
                )}
            </div>
            
            {/* Move History Section */}
            {(!isMobile || (isMobile && showMoveHistory)) && (
                <div className={`${isMobile ? 'fixed inset-0 z-50 bg-neutral-900 bg-opacity-95 pt-0 md:pt-24' : 'lg:w-1/3'} order-2 lg:order-3`}>
                    <div className={`bg-neutral-800 p-4 rounded-none md:rounded-lg ${isMobile ? 'h-[calc(100vh-100px)]' : 'h-[calc(100vh-110px)] max-h-[712px]'} overflow-hidden flex flex-col relative`}>
                        {isMobile && (
                            <button 
                                onClick={() => setShowMoveHistory(false)} 
                                className="absolute top-4 right-4 text-white text-2xl"
                            >
                                &times;
                            </button>
                        )}
                        <h2 className="text-white text-xl font-bold mb-3">Game #{currentGameNumber} | Move History</h2>
                        <div className="overflow-y-auto flex-grow">
                            <table className="w-full text-sm text-left text-neutral-300">
                                <thead className="text-xs uppercase bg-neutral-700 text-neutral-300 sticky top-0">
                                    <tr>
                                        <th scope="col" className="px-2 py-2">Player</th>
                                        <th scope="col" className="px-2 py-2">Move</th>
                                        <th scope="col" className="px-2 py-2">Accuracy</th>
                                        <th scope="col" className="px-2 py-2">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentMoves.map((move, index) => (
                                        <tr 
                                            key={move.id} 
                                            className={`border-b border-neutral-700 cursor-pointer ${
                                                indexOfFirstMove + index === currentMoveIndex
                                                    ? 'bg-neutral-700 hover:bg-neutral-900'
                                                    : 'bg-neutral-800 hover:bg-neutral-700'
                                            }`}
                                            onClick={() => displayMoveOnBoard(indexOfFirstMove + index)}
                                        >
                                            <td className="px-2 py-2 truncate max-w-[80px]">{move.playerHandle}</td>
                                            <td className="px-2 py-2">{move.move}</td>
                                            <td className={`px-2 py-2 ${
                                                move.accuracy >= 90 ? 'text-green-500' :
                                                move.accuracy >= 70 ? 'text-yellow-500' :
                                                'text-red-500'
                                            }`}>
                                                {formatAccuracy(move.accuracy)}
                                            </td>
                                            <td className="px-2 py-2 text-xs">{formatTimestamp(move.moveTimestamp)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4">
                            <Pagination 
                                movesPerPage={movesPerPage} 
                                totalMoves={moveHistory.length} 
                                paginate={paginate}
                                currentPage={currentPage}
                            />
                        </div>
                    </div>
                </div>
            )}

            {lastMoveDetails && (
                <MoveModal
                    isOpen={showMoveModal}
                    onClose={() => setShowMoveModal(false)}
                    move={lastMoveDetails.move}
                    fen={lastMoveDetails.fen}
                    accuracy={lastMoveDetails.accuracy}
                    playerName={session?.user?.name || 'Player'}
                    averageAccuracy={userStats.averageAccuracy}
                    totalMoves={userStats.totalMoves}
                />
            )}
            
            {isBoardLocked && (
                <div className="fixed bottom-4 right-4 w-full bg-yellow-500 text-black p-2 text-center z-50 max-w-md rounded-md">
                    {lockedByUser === session?.user.id
                        ? `You have locked the board. You have 1 minute to make a move.`
                        : `Board is locked by ${lockedByUserName || 'another player'}. Please wait.`
                    }
                </div>
            )}
        </div>
    );
}