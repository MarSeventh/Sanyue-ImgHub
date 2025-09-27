<template>
  <router-view/>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  computed: {
    ...mapGetters(['userConfig', 'useDarkMode'])
  },
  watch: {
    useDarkMode() {
      this.setSiteIcon()
    }
  },
  methods: {
    setSiteIcon() {
      // 同时更改 icon apple-touch-icon 和 mask-icon
      const existingIcons = document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="mask-icon"]');
      existingIcons.forEach(icon => icon.remove());

      const iconLink = document.createElement('link');
      const appleIconLink = document.createElement('link');
      const maskIconLink = document.createElement('link');
      iconLink.rel = 'icon';
      appleIconLink.rel = 'apple-touch-icon';
      maskIconLink.rel = 'mask-icon';

      if (this.useDarkMode) {
          iconLink.href = this.userConfig?.siteIcon || '/logo-dark.png';
          appleIconLink.href = this.userConfig?.siteIcon || '/logo-dark.png';
          maskIconLink.href = this.userConfig?.siteIcon || '/logo-dark.png';
      } else {
          iconLink.href = this.userConfig?.siteIcon || '/logo.png';
          appleIconLink.href = this.userConfig?.siteIcon || '/logo.png';
          maskIconLink.href = this.userConfig?.siteIcon || '/logo.png';
      }

      document.head.appendChild(iconLink);
      document.head.appendChild(appleIconLink);
      document.head.appendChild(maskIconLink);
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

nav {
  padding: 30px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
}

nav a.router-link-exact-active {
  color: #42b983;
}

body {
  margin: 0;
  padding: 0;
  background-color: #f8f8f8;
}
:focus-visible {
    outline: none;
}
</style>
<style>
.el-dropdown__popper.el-popper {
    border-radius: 12px;
    border: none;
    background-color: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    box-shadow: 0 0 10px 2px rgba(0, 0, 0, 0.1);
}
.el-dropdown__popper.el-popper .el-dropdown-menu {
    background: none;
    border: none;
}
.el-dropdown__popper.el-popper .el-dropdown-menu__item {
    border: none;
    background: none;
}
.el-popper.is-light>.el-popper__arrow::before {
    background: none;
    border: none;
}
</style>