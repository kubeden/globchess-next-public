// pages/api/update-user-tokens.js
import { adminAuth, adminDb } from '../../lib/firebaseConfig';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { userId, tokens } = req.body;

      // Update the user's tokens in Firestore
      const userRef = adminDb.collection('users').doc(userId);
      await userRef.update({
        tokens: adminDb.FieldValue.increment(tokens)
      });

      res.status(200).json({ message: 'Tokens updated successfully' });
    } catch (err) {
      res.status(500).json({ statusCode: 500, message: err.message });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}