const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  devServer: {
    proxy: {
      '/': {
        target: process.env.VUE_APP_SITE_URL,
        changeOrigin: true,
        pathRewrite: {
          '^/': '/'
        }
      }
    }
  },
  transpileDependencies: true
})
