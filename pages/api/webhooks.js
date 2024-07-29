// pages/api/webhooks.js
import Stripe from 'stripe';
import { adminAuth, adminDb } from '../../lib/firebaseConfig';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    let event;

    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const rawBody = Buffer.concat(chunks).toString('utf8');
      
      const sig = req.headers['stripe-signature'];

      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
      } catch (err) {
        console.error(`⚠️  Webhook signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      console.log(`✅ Successfully constructed event: ${event.type}`);
      console.log('Event data:', JSON.stringify(event.data.object, null, 2));

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log(`Processing checkout session: ${session.id}`);
        console.log('Session metadata:', session.metadata);

        try {
          // Extract userId and tokens from metadata
          const userId = session.metadata?.userId;
          const tokenAmount = parseInt(session.metadata?.tokens);

          console.log(`Extracted data: userId=${userId}, tokenAmount=${tokenAmount}`);

          if (!userId || isNaN(tokenAmount)) {
            throw new Error(`Invalid userId or tokenAmount: userId=${userId}, tokenAmount=${tokenAmount}`);
          }

          console.log(`Updating tokens for user ${userId}. Adding ${tokenAmount} tokens.`);

          const userRef = adminDb.collection('users').doc(userId);
          
          await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
              throw new Error(`User document does not exist for userId: ${userId}`);
            }
            
            const userData = userDoc.data();
            const currentTokens = userData.tokens || 0;
            const newTokenCount = currentTokens + tokenAmount;

            transaction.update(userRef, {
              tokens: newTokenCount
            });

            console.log(`Updated tokens for user ${userId}. New token count: ${newTokenCount}`);
          });

          console.log(`Successfully processed event: ${event.type}`);
        } catch (error) {
          console.error('Error processing event:', error);
          return res.status(500).json({ error: 'Error processing event', details: error.message });
        }
      } else {
        console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error(`Error processing request:`, err);
      res.status(500).json({ error: 'Error processing request', details: err.message });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}