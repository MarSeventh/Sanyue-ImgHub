const { defineConfig } = require('@vue/cli-service');
const AutoImport = require('unplugin-auto-import/webpack').default
const Components = require('unplugin-vue-components/webpack').default
const { ElementPlusResolver } = require('unplugin-vue-components/resolvers');
const CompressionPlugin = require("compression-webpack-plugin")

module.exports = defineConfig({
  chainWebpack: config => {
    config.plugin('html').tap(options => {
      // 显式输出入口脚本，避免 CDN 延迟执行打乱主题、加载动画与应用的启动顺序。
      options[0].inject = false;
      options[0].entryConfigUrl = process.env.NODE_ENV === 'production' ? '/api/userConfig' : '/api/api/userConfig';
      return options;
    });
  },
  configureWebpack: {
    plugins: [
      new CompressionPlugin(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
      }),
      Components({
        resolvers: [ElementPlusResolver()],
      }),
    ],
  },
  devServer: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VUE_APP_BACKEND_URL,
        changeOrigin: true,
        pathRewrite: {
          '^/api': '',
        },
      },
    },
  },
  transpileDependencies: true,
});
