const { defineConfig } = require('@vue/cli-service');
const AutoImport = require('unplugin-auto-import/webpack').default
const Components = require('unplugin-vue-components/webpack').default
const { ElementPlusResolver } = require('unplugin-vue-components/resolvers');
const CompressionPlugin = require("compression-webpack-plugin")
const path = require('path');

module.exports = defineConfig({
  chainWebpack: config => {
    // 首屏资源独立输出内容哈希，不依赖主应用的运行时和样式加载器。
    const entryDirectory = path.resolve(__dirname, 'src/entry');
    config.module.rule('js').exclude.add(entryDirectory);
    config.module.rule('css').exclude.add(entryDirectory);
    config.module.rule('entry-loader-assets')
      .test(/entry-loader\.(css|js)$/)
      .include.add(entryDirectory).end()
      .type('asset/resource')
      .set('generator', { filename: 'entry/[name].[contenthash:8][ext]' });
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
