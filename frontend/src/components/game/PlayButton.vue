<template>
	<button v-if="!recoButton" class="play_button" @click="showModalPlay = true">
		<span>Play</span>
		
		<font-awesome-icon icon="fa-solid fa-table-tennis-paddle-ball" class="play_icon"/>
	</button>
	<button v-else class="play_button" @click="showModalPlay = true" >
		Play
	</button>
	<Teleport to="body">
		<transition name="slide-fade" mode="out-in">
			<PlayModal v-show="showModalPlay" @close-modal="showModalPlay = false"></PlayModal>
		</transition>
	</Teleport>
</template>
<script lang="ts">
import PlayModal from './PlayModal.vue';
import { SocketService } from '@/services/SocketService';

export default {
	components: {
		PlayModal,
	},

	data() {
		return {
			recoButton: false as Boolean,
			recoMode: -1 as number,
			gameId: -1 as number,
			showModalPlay: false as boolean,
		}
	},

	async mounted() {
		const disconnectObject = await ((await fetch("http://" + import.meta.env.VITE_HOST + ":3000/pong/status", { credentials: 'include' })).json());
		this.recoButton = disconnectObject["disconnect"];
		this.recoMode = disconnectObject["mode"];
		this.gameId = disconnectObject["id"];
		if (!this.recoButton)
			return;
		const it = setInterval(async () => {
			const disconnectObject = await ((await fetch("http://" + import.meta.env.VITE_HOST + ":3000/pong/status", { credentials: 'include' })).json());
			this.recoButton = disconnectObject["disconnect"];
			if (!this.recoButton){
				this.recoButton = false;
				clearInterval(it);
			}
		}, 10);
	},

	methods: {
		reconnectToRoom(){
			const mode = ["classic", "ranked", "duelClassic"][this.recoMode];
			this.recoMode >= 3 ? this.$router.push({ path: '/pong', query: 
													{ mode: mode, id: this.gameId }}) :
								this.$router.push({ path: '/pong', query:
													{ mode: mode }});
		},
	}
}
</script>
<style>
.play_button {
	font-family: 'Poppins', sans-serif;
	width: 100%;
	min-width: max-content;
	height: 20%;
	border: 3px solid #ffffff;
	border-radius: 75px;
	color: white;
	text-shadow: 4px 3px 0px #7A7A7A;
	font-size: clamp(1.875rem, 0.9135rem + 3.0769vw, 3.125rem);
	cursor: pointer;
	background-color: #0b2d39
}

.play_icon{
	font-size: clamp(1.875rem, 0.9135rem + 3.0769vw, 3.125rem);
}


</style>