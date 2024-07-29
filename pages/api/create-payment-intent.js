// pages/api/create-payment-intent.js
import Stripe from 'stripe';
import { adminAuth, adminDb } from '../../lib/firebaseConfig';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { amount, userId } = req.body;

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Stripe expects the amount in cents
        currency: 'usd',
        metadata: { userId },
      });

      res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      res.status(500).json({ statusCode: 500, message: err.message });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}