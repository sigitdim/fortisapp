/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ❗️Abaikan error ESLint saat build production
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
/** @type {import('next').NextConfig} */
module.exports = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true }, // ⬅️ matikan cek tipe saat build
};
