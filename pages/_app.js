// pages/_app.js

import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import Layout from '../components/Layout';

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </SessionProvider>
  );
}

export default MyApp;