<template>
  <div id="app">
    <LogIn v-if="!isAuthenticated" @loginSuccess="handleLoginSuccess"/>
    <RegisterUser v-if="!isAuthenticated"/>
    <SocialMedia v-if="isAuthenticated"/>
  </div>
</template>

<script>
import LogIn from './components/LogIn.vue';
import RegisterUser from './components/RegisterUser.vue';
import SocialMedia from './components/SocialMedia.vue';
import axios from 'axios';

export default {
  name: 'App',
  components: {
    LogIn,
    RegisterUser,
    SocialMedia
  },
  data() {
    return {
      isAuthenticated: false 
    }
  },
  created() {
    this.checkAuth(); // 应用初始化时检查登录状态
  },
  methods: {
    async checkAuth() {
      const token = sessionStorage.getItem("token");
      if (token) {
        try {
          // 使用 JWT 令牌验证用户是否仍然有效
          const response = await axios.get("http://localhost:8090/api/check-auth", {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.status === 200) {
            this.isAuthenticated = true;
          } else {
            this.logout();
          }
        } catch (error) {
          console.error("身份验证失败", error);
          this.logout();
        }
      }
    },
    logout() {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("userId");
      sessionStorage.removeItem("userName");
      this.isAuthenticated = false;
      this.$router.push("/login"); // 退出后跳转到登录页
    },
    handleLoginSuccess() {
      const token = sessionStorage.getItem("token");
      if (token) {
        this.isAuthenticated = true; 
      }
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
  margin-top: 60px;
}
</style>
