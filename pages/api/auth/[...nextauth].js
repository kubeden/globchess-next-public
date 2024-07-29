import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { adminAuth, adminDb } from '../../../lib/firebaseConfig';

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Firebase',
      credentials: {
        token: { label: 'Token', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials.token) {
          throw new Error('No token provided');
        }

        try {
          const decodedToken = await adminAuth.verifyIdToken(credentials.token);
          const user = await adminAuth.getUser(decodedToken.uid);

          // Determine the actual provider
          const provider = user.providerData[0]?.providerId || 'unknown';

          return {
            id: user.uid,
            name: user.displayName,
            email: user.email,
            image: user.photoURL,
            provider: provider, // Add the actual provider
          };
        } catch (error) {
          console.error('Error during token verification:', error);
          throw new Error('Invalid token');
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.provider = user.provider; // Pass the provider to the token
      }
      return token;
    },
    async session({ session, token }) {
      try {
        const firebaseUser = await adminAuth.getUser(token.id);
        
        // Get the user document from Firestore
        const userDocRef = adminDb.collection('users').doc(firebaseUser.uid);
        let userDoc = await userDocRef.get();
        let userData;

        if (!userDoc.exists) {
          // If the user document doesn't exist, create it with initial data
          userData = {
            tokens: 300,
            createdAt: new Date(),
            provider: token.provider, // Add the actual provider information
          };
          await userDocRef.set(userData);
        } else {
          userData = userDoc.data();
          // Update the provider if it's not set or different
          if (!userData.provider || userData.provider !== token.provider) {
            await userDocRef.update({ provider: token.provider });
            userData.provider = token.provider;
          }
        }

        // Update session with Firebase user data
        session.user.id = firebaseUser.uid;
        session.user.tokens = userData.tokens;
        session.user.provider = userData.provider;

        // Add provider-specific information
        if (userData.provider === 'google.com') {
          session.user.googleEmail = firebaseUser.email;
        } else if (userData.provider === 'twitter.com') {
          const twitterProvider = firebaseUser.providerData.find(p => p.providerId === 'twitter.com');
          session.user.twitterUsername = twitterProvider ? twitterProvider.screenName : null;
        }
      } catch (error) {
        console.error('Error in session callback:', error);
      }
      
      return session;
    },
  },
  pages: {
    signIn: '/game',
  },
});