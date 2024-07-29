// pages/api/evaluate-position.js

import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { fen } = req.body;

    try {
      const response = await fetch('https://chess-api.com/v1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fen }),
      });

      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error evaluating position:', error);
      res.status(500).json({ error: 'Failed to evaluate position' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}