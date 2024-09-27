<script lang="ts">
import { useNotification } from '@kyvg/vue3-notification';
import ChannelOptionModal from './ChannelOptionModal.vue';
import { SocketService } from '@/services/SocketService';

export default {
	components:{
		ChannelOptionModal
	},

	props: {
		show: Boolean,
		channel_id: Number,
		username: String,
	},

	methods: {
		async MuteUser(time: string) {
			if (/^0*$/.test(time)){
				const notif = useNotification();
				notif.notify({
					title: 'Error',
					text: "Please enter a strictly positive number !",
					type: 'error',
					group: 'notif-center',
				});
				return;
			}
			const user_resp = await fetch('http://' + import.meta.env.VITE_HOST + ':3000/user/' + this.$props.username, {credentials: 'include'});
			if (!user_resp['ok'] || this.$props.username == '') {
				this.$emit('close');
				return ;
			}
			const user = (await user_resp.json())['id'];
			const data = {
				User_id: user,
				channel_id: this.$props.channel_id,
				time: time,
			};
			SocketService.getInstance.emit('mute', data);
			this.$emit('close');
		}
	},
};

</script>

<template>
	<Transition name="slide-fade" mode="out-in">
		<div v-if="show" class="modal_overlay" @click="$emit('close')">
			<ChannelOptionModal @click.stop title="Mute a User" isDigit="true" placeholder="Time in seconds" @callback="MuteUser" ></ChannelOptionModal>
		</div>
	</Transition>
</template>

<style scoped>

.modal_overlay {
	position: fixed;
	display: flex;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.5);
	align-items: center;
	justify-content: center;
	transition: opacity 0.4s ease;
	transition: all 0.4s ease;
	min-height: 600px;
	min-width: 500px;
	z-index: 3;
}


</style>