// Vercel serverless bridge — plain CommonJS so Vercel's esbuild doesn't
// recompile the NestJS sources (they need tsc's emitDecoratorMetadata,
// which esbuild does not support). `npm run build` produces dist/ first
// (see vercel.json buildCommand + includeFiles).
const { getServer } = require('../dist/serverless');

module.exports = async (req, res) => {
  const server = await getServer();
  return server(req, res);
};
