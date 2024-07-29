// components/BuyTokens.js
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { loadStripe } from '@stripe/stripe-js';

let stripePromise = null;

export default function BuyTokens() {
  const [tokenAmount, setTokenAmount] = useState('');
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (stripePromise) {
        stripePromise.then(stripe => {
          if (stripe && stripe._controller) {
            stripe._controller.abort();
          }
        });
        stripePromise = null;
      }
    };
  }, []);

  const handleTokenChange = (e) => {
    const value = e.target.value;
    if (value === '' || parseInt(value) >= 5) {
      setTokenAmount(value);
    }
  };

  const handlePurchase = async () => {
    if (!session) {
      alert('Please log in to purchase tokens');
      return;
    }

    setIsLoading(true);

    try {
      if (!stripePromise) {
        stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      }
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to initialize');

      // Create a Checkout Session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseInt(tokenAmount),
          userId: session.user.id,
        }),
      });

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId: sessionId,
      });

      if (result.error) {
        alert(result.error.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isButtonDisabled = isLoading || tokenAmount === '' || parseInt(tokenAmount) < 5;

  return (
    <div className="bg-neutral-800 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-white">Buy Tokens</h2>
      <input
        type="number"
        value={tokenAmount}
        onChange={handleTokenChange}
        min="5"
        placeholder="Enter token amount (min 5)"
        className="w-full p-2 mb-4 bg-neutral-700 text-white rounded"
      />
      <button
        onClick={handlePurchase}
        disabled={isButtonDisabled}
        className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 transition duration-300 disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : `Buy ${tokenAmount || 0} Tokens for $${tokenAmount || 0}`}
      </button>
    </div>
  );
}