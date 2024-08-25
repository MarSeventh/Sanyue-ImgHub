import { createStore } from 'vuex'

export default createStore({
  state: {
    userConfig: null,
    bingWallPapers: []
  },
  getters: {
    userConfig: state => state.userConfig,
    bingWallPapers: state => state.bingWallPapers
  },
  mutations: {
    setUserConfig(state, userConfig) {
      state.userConfig = userConfig;
    },
    setBingWallPapers(state, bingWallPapers) {
      state.bingWallPapers = bingWallPapers;
    }
  },
  actions: {
    async fetchUserConfig({ commit }) {
      try {
        const response = await fetch('/userConfig');
        const userConfig = await response.json();
        commit('setUserConfig', userConfig);
      } catch (error) {
        console.log(error);
      }
    },
    async fetchBingWallPapers({ commit }) {
      try {
        const response = await fetch('/api/bing/wallpaper');
        const jsonResponse = await response.json();
        const wallpapers = jsonResponse.data;
        const bingWallPapers = wallpapers.map(wallpaper => {
          return {
            url: 'https://www.bing.com' + wallpaper.url,
          };
        }
        );
        //预加载图片，阻塞直到图片加载完成
        await Promise.all(bingWallPapers.map(wallpaper => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = wallpaper.url;
          });
        }));
        commit('setBingWallPapers', bingWallPapers);
      } catch (error) {
        console.log(error);
      }
    }
  },
  modules: {
  }
})
