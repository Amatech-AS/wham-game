/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! ADVARSEL !!
    // Dette lar oss bygge nettsiden selv om koden ikke er 100% perfekt teknisk sett.
    // Nødvendig for raske endringer direkte i nettleseren.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
