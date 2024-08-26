<template>
  <router-view/>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  computed: {
    ...mapGetters(['userConfig'])
  },
  mounted() {
    this.setSiteTitle(),
    this.setSiteIcon()
  },
  methods: {
    setSiteTitle() {
      document.title = this.userConfig?.siteTitle || 'Sanyue ImgHub'
    },
    setSiteIcon() {
      const link = document.createElement('link')
      link.rel = 'icon'
      link.href = this.userConfig?.siteIcon || '/logo.png'
      document.head.appendChild(link)
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
</style>
