<script lang="ts">

import { useNotification } from '@kyvg/vue3-notification';
import BlueButton from '../BlueButton.vue';
import { SocketService } from '@/services/SocketService';

export default {
	components: {
		BlueButton,
	},

	props: ["myId", "Friend_id", "show"],

	methods: {
		goToPong(mode: string) {
			SocketService.getInstance.emit('getClientStatus', this.Friend_id);
			SocketService.getInstance.on('getClientStatus', (payload) =>{
				if (payload !== 1){
					const notif = useNotification();
					notif.notify({
						title: 'Error',
						text: "This player is already in play !",
						type: 'error',
						group: 'notif-center',
					});
				}
			});
			SocketService.getInstance.emit('pongInvite', this.myId, this.Friend_id,
				SocketService.getUser.name, mode);
			this.$emit('close-modals');
		}
	}
}

</script>

<template>
	<transition name="slide-fade" mode="out-in">
		<div v-if="show" class="play-modal-overlay" @click="$emit('close')">
			<div class="modal" @click.stop>
				<div class="play-modal-title">Chose Game Mode</div>
				<div class="buttons-play-modal">
					<BlueButton class="button-play-modal" text="Classic" @click="goToPong('duelClassic')"></BlueButton>
				</div>

			</div>
		</div>
	</transition>
</template>

<style></style>



