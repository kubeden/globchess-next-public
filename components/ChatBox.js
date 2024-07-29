// components/ChatBox.js

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { db } from '../lib/firebaseConfig';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';

const ChatBox = ({ gameNumber }) => {
    const { data: session } = useSession();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const messagesRef = collection(db, "messages");
        const q = query(messagesRef, orderBy("timestamp", "desc"), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).reverse();
            setMessages(fetchedMessages);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !session) return;

        try {
            await addDoc(collection(db, "messages"), {
                content: newMessage.trim(),
                playerName: session.user.name,
                timestamp: serverTimestamp(),
                gameNumber: gameNumber
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error adding message: ", error);
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="bg-neutral-800 p-4 rounded-none md:rounded-lg h-full w-full flex flex-col max-w-md">
            <h2 className="text-white text-xl font-bold mb-3">Chat</h2>
            <div className="flex-grow break-words overflow-y-scroll mb-4 max-h-full md:max-h-[50vh]">
                {messages.map((message) => (
                    <div key={message.id} className="mb-2">
                        <span className="text-blue-400 font-bold">{message.playerName}: </span>
                        <span className="text-white">{message.content}</span>
                        <div className="text-neutral-400 text-xs">{formatTimestamp(message.timestamp)}</div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="mt-auto">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    maxLength={300}
                    placeholder="Type a message..."
                    className="w-full bg-neutral-700 text-white p-2 rounded"
                />
            </form>

            <style jsx>{`
                // scrollbar little
                ::-webkit-scrollbar {
                    width: 5px;
                }
                ::-webkit-scrollbar-track {
                    background: #333;
                }
                ::-webkit-scrollbar-thumb {
                    background: #555;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #777;
                }
            `}</style>

        </div>
    );
};

export default ChatBox;