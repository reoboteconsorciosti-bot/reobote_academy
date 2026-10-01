/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera .next/standalone: servidor mínimo (server.js + dependências usadas) para a imagem Docker.
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  logging: {
    // Não imprimir /auth/callback no terminal de dev: a URL carrega code e state.
    incomingRequests: {
      ignore: [/\/auth\/callback/],
    },
  },
}

export default nextConfig
