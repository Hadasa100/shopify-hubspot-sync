const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    ['/sync', '/skus'],
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      ws: false,
    })
  );
};
