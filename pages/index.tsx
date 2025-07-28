import type { NextPage } from 'next'
import Head from 'next/head'

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>PostCrafter API</title>
        <meta name="description" content="PostCrafter API for WordPress publishing" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>PostCrafter API</h1>
        <p>API is running successfully!</p>
        <p>Available endpoints:</p>
        <ul>
          <li><code>/api/health</code> - Health check</li>
          <li><code>/api/publish</code> - Publish to WordPress</li>
        </ul>
      </main>
    </div>
  )
}

export default Home 