/** @type {import('next').NextConfig} */
const nextConfig = {
  // The retrieval pipeline reads the corpus and the generated embeddings.json
  // from disk at runtime, so nothing special is needed here. Kept minimal on
  // purpose.
  reactStrictMode: true,
};

export default nextConfig;
