<template>
	<div class="pong_body">
		<div class="pong_content">
			<div class="left_column_pong">
				<PongPlayerCard v-if="dataLoaded" :id="player1Id" side="0" ></PongPlayerCard>
			</div>
			<div class="middle_column_pong" v-if="dataLoaded">
				<div class="top_infos" v-if="state === 1">
					<div class="timer">
						<span>{{ timer }}</span>
						<label>-</label>
					</div>
					<div class="scores">
						<span id="score1">{{ score1 }}</span>
						<span id="score1">{{ score2 }}</span>
					</div>
				</div>
				<div v-else class="top_infos">
					<span id="state_msg">{{ messageTop }}</span>
				</div>
				<PongCanvas :socket="socket" :playId1="player1Id" :playId2="player2Id"
					:score1="score1" :score2="score2" @toggleBackground="toggleBackground" 
					@setState="setState"/>
				<div class="button_panel">
					<BlueButton id="exit_button" text="Leave Game" @click="$router.push('/')"></BlueButton>
				</div>
			</div>
			<div class="right_column_pong">
				<PongPlayerCard v-if="dataLoaded && player2Id.length !== 0" :id="player2Id" side="1">
				</PongPlayerCard>
			</div>
		</div>
	</div>
</template>


<style>
.image {
	aspect-ratio: 1;
	width: 100%;
	border-radius: 50%;
	border: 2px solid #b5dbdb;
}

.pong_body {
	width: 100vw;
	height: 90%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.pong_content {
	position: relative;
	height: 90%;
	width: 90%;
	display: flex;
	justify-content: center;
	align-items: center;
	background: white;
	min-height: 300px;
	border: 3px solid #515151;
	border-radius: 20px;
	gap: 10px;
}

.left_column_pong, .right_column_pong {
	height: 100%;
	width: 15%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.middle_column_pong {
	height: 100%;
	width: 80%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.timer {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	align-items: center;
	justify-content: center;
	font-family: 'digital-clock-font', monospace;
	font-size: clamp(1.25rem, 0.5769rem + 2.1538vw, 2.125rem);
	margin-bottom: -10px;
	margin-top: 10px;
}

.timer label{
	height: min-content;
	margin-top: clamp(-10px, -4%, -20px);
}

.button_panel {
	display: flex;
	height: 10%;
	width: 100%;
	align-items: center;
	justify-content: center;
}

.reaction_panel {
	display: flex;
	flex-direction: row;
	gap: 0.1vw;
	margin-left: 20px;
}

#exit_button {
	position: relative;
	min-width: 100px;
	font-size: clamp(0.6875rem, 0.2548rem + 1.3846vw, 1.25rem);
	padding: 10px;
	margin-right: 1vw;
	border-radius: 40px;
}

@font-face {
	font-family: 'digital-clock-font';
	src: url('@/font/Amatic-bold.ttf');
}

.scores {
	display: flex;
	flex-direction: row;
	width: 100%;
	justify-content: center;
	gap: 50%;
	font-size: clamp(3rem, 1.1731rem + 1.8462vw, 4rem);
	margin-top: -25px;
	text-align: center;
	height: 100%;
	font-family: 'digital-clock-font', regular;
}

.top_infos {
	min-height: 80px;
	width: 100%;
	display: flex;
	height: 10%;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	max-width: 1200px;
}

#state_msg {
	color: white;
	font-size: clamp(1.25rem, 0.5769rem + 2.1538vw, 2.125rem);
}


</style>

<script lang="ts">

import io from 'socket.io-client';
import { useRoute } from 'vue-router';
import PongPlayerCard from '@/components/game/PongPlayerCard.vue';
import PongCanvas from '@/components/game/PongCanvas.vue'
import { SocketService } from '@/services/SocketService';
import { State } from './Home.vue';
import BlueButton from '@/components/BlueButton.vue';

export default {
	data() {
		return {
			myUser: {} as any,
			player1Id: "",
			player2Id: "",
			dataLoaded: false,
			socket: io(),
			timer: "",
			score1: 0,
			score2: 0,
			state: 0,
		};
	},
	components: {
		PongPlayerCard,
		PongCanvas,
		BlueButton
	},
	
	methods: {
		setState(newState: number){
			this.state = newState;
		},
		getIdMode(mode: string) {
			const modes: string[] = ["classic", "ranked", "duelClassic"];
			if (!modes.includes(mode)) {
				this.$router.push('/notfound');
				return;
			}
			return modes.indexOf(mode);
		},

		toggleBackground(){
			this.$emit('toggleBackground');
		},



		initKeyHandler() {
			var keyArrowUp: Boolean = false
			var keyArrowDown: Boolean = false
			document.addEventListener('keydown', (event) => {
				if (event.key === "ArrowUp" && !keyArrowUp) {
					keyArrowUp = true;
					this.socket.emit("arrowUpdate", "arrowUp");
				}
				if (event.key === "ArrowDown" && !keyArrowDown) {
					keyArrowDown = true;
					this.socket.emit("arrowUpdate", "arrowDown");
				}
			});
			document.addEventListener('keyup', (event) => {
				if (event.key === "ArrowUp" && keyArrowUp) {
					keyArrowUp = false;
					this.socket.emit("arrowUpdate", "stopArrowUp");
				}
				if (event.key === "ArrowDown" && keyArrowDown) {
					keyArrowDown = false;
					this.socket.emit("arrowUpdate", "stopArrowDown");
				}
			});
		},
	},
	async mounted() {

		const route = useRoute();
		const mode: string | undefined = route.query["mode"]?.toString();
		if (!mode) {
			this.$router.push('notfound');
			return;
		}

		this.myUser = await (await fetch("http://" + import.meta.env.VITE_HOST + ":3000/user/me", { credentials: 'include' })).json()
		SocketService.getInstance.emit('setStatus', this.myUser["id"], State.INGAME);

		this.socket = io("http://" + import.meta.env.VITE_HOST + ":3000/pong", { query: { User_id: this.myUser["id"] } }); //CHANGE TO GET ID
		this.socket.emit('onJoinGame', sessionStorage.getItem('token'), this.getIdMode(mode), route.query["id"]);

		this.initKeyHandler();

		this.socket.on('disconnect', () => {
			this.socket.disconnect();
			sessionStorage.setItem('timer', this.timer);
		});

		this.socket.on('ids', (player1: string, player2: string) => {
			this.player1Id = player1;
			this.player2Id = player2;
			this.dataLoaded = true;
		});

		this.socket.on('updateScore', (score1, score2) => {
			this.score1 = score1;
			this.score2 = score2;
		});

		this.socket.on('time', (time) => {
			this.timer = time;
		});

	},
	async beforeUnmount() {
		this.socket.disconnect();
		this.dataLoaded = false;
	}
}
</script>