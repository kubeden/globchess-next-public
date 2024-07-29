## todo

start with ChessGame <--> Chessboard, useReducer

the problem is most probably inside

```
useEffect(() => {
        const gameRef = doc(db, "games", "currentGame");
        const unsubscribeGame = onSnapshot(gameRef, async (docSnapshot) => {
```

check about skew protection