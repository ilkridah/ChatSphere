<template>
    <div class="a-leaderboard">
      <h2>Leaderboard</h2>
      <div v-if="isDataLoaded" class="data">
        <ul>
          <li v-for="(entry, index) in leaderboardData" :key="index" ref="userRef" :data-id="entry.id">
            {{ index + 1 }}. {{ entry.name }} - {{ entry.stats.mmr }}pts
          </li>
        </ul>
      </div>
      <div v-else>Loading...</div>
    </div>
  </template>
  
  <script>
  import {SocketService} from "@/services/SocketService";
  export default {
    name: 'ALeaderBoard',
    data() {
      return {
      leaderboardData: [],
      isDataLoaded: false,
      refreshInterval: null,
    };
  },
  async mounted() {
    await this.refreshLeaderboard();
    this.setupRefreshInterval();
  },
  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },
  methods: {
    async fetchLeaderboardData() {
      const response = await fetch(`http://${import.meta.env.VITE_HOST}:3000/user/leaderboard`);
      const data = await response.json();
      return data;
    },
    async refreshLeaderboard() {
      this.leaderboardData = await this.fetchLeaderboardData();
      this.isDataLoaded = true;
    },
    setupRefreshInterval() {
      this.refreshInterval = setInterval(this.refreshLeaderboard, 30000);
    },
  },
};
</script>
  
  <style scoped>
.a-leaderboard {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-family: 'Poppins', sans-serif;
  overflow-y: auto;
}

.data ul {
  width: 100%;
  padding: 0;
  list-style-type: none;
}

.data li {
  width: 90%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: rgba(80, 179, 236, 0.178);
  border-radius: 20px;
  padding: 10px;
  border-bottom: solid 1px;
  box-sizing: border-box;
  align-items: center;
}

.data::-webkit-scrollbar {
  display: none; 
}

</style>
