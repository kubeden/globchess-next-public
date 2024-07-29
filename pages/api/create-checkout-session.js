// pages/api/create-checkout-session.js
import Stripe from 'stripe';
import { adminAuth, adminDb } from '../../lib/firebaseConfig';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      console.log('Received request to create checkout session');
      console.log('Request body:', req.body);
      const { amount, userId } = req.body;
      console.log(`Creating session for user ${userId} to buy ${amount} tokens`);

      if (!userId || !amount) {
        throw new Error('Missing userId or amount');
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Globchess Tokens',
                images: ['https://globchess.com/assets/img/token.png'],
              },
              unit_amount: 100, // $1 per token
            },
            quantity: amount,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/game?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/game`,
        metadata: {
          userId: userId,
          tokens: amount.toString(), // Convert to string to ensure it's stored correctly
        },
      });

      console.log(`Checkout session created successfully: ${session.id}`);
      console.log(`Session metadata:`, session.metadata);
      res.status(200).json({ sessionId: session.id });
    } catch (err) {
      console.error('Error creating checkout session:', err);
      res.status(500).json({ statusCode: 500, message: err.message });
    }
  } else {
    console.log(`Received non-POST request: ${req.method}`);
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}