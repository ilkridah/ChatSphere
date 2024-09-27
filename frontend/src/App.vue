<template>
	<body>

		<Head v-if="!$route.fullPath.includes('auth') && $route.fullPath.length !== 1" :updateTimestamp="timestampRef" @socketReady="socketReady">
		</Head>
		<transition name="fade" mode="out-in">
			<div v-if="displayModalInvite" class="invite_modal">
				<ModalInvite :sender-name="senderName" :mode="modeRef" @close="displayModalInvite = false"></ModalInvite>
			</div>
			<div v-else-if="displayModalSend" class="invite_modal">
				<div class="invite_modal_content">
					En attente ...
				</div>
			</div>
		</transition>
		<notifications position="top center" group="notif-center" max="2" />
		<div class="background"></div>


		<router-view v-slot="{ Component }" appear>
			<transition name="grow-in" mode="out-in">
				<Component v-if="$route.fullPath.includes('auth') || socketReadyRef" :key="$route.fullPath" :is="Component" @update="test" @socketReady="socketReady" @toggleBackground="displayBackground = !displayBackground"/>
			</transition>
		</router-view>
	</body>
</template>

<script setup lang="ts">

import { ref } from 'vue'
import Head from './components/Head.vue';
import { SocketService } from './services/SocketService';
import router from '@/router';

import ModalInvite from './components/chat/ModalInvite.vue'; 


const timestampRef = ref()

const displayModalInvite = ref(false)
const displayModalSend = ref(false)
const senderName = ref("");
const modeRef = ref("");
const socketReadyRef = ref(false);


let timeoutId: number = -1;

function socketReady() {
	socketReadyRef.value = true;
	SocketService.getInstance.on('displayInvite', (isSender: boolean, name: string, mode: string) => {
		senderName.value = name;
		const ref = isSender ? displayModalSend : displayModalInvite;
		ref.value = true;
		modeRef.value = mode;
		if (timeoutId !== -1)
			clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			ref.value = false;
			SocketService.getInstance.emit('handlingInvite', false);
		}, 5000);
	})

	SocketService.getInstance.on('joinGame', (senderId: number, mode: string) => {
		router.push({ path: '/pong', query: { mode: mode, id: senderId } });
	});

	SocketService.getInstance.on('closeInvite', () => {
		displayModalSend.value = false;
	});
}
function test() {
	timestampRef.value = Date.now();
}



</script>

<style scoped lang="scss">
@import url('https://fonts.googleapis.com/css?family=Poppins:400,500,600,700&display=swap');


* {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
	font-family: 'Poppins', sans-serif;
}

body {
	margin: -8px;
	position: absolute;
	height: 100vh;
	width: 100vw;
}
.background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url(./assets/img/home1.png);
  background-repeat: no-repeat;
  background-size: cover; 
  z-index: -1;
}

</style>
