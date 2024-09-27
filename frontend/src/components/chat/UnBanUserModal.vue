<script lang="ts">

import { useNotification } from '@kyvg/vue3-notification';
import ChannelOptionModal from './ChannelOptionModal.vue';

export default {
	components:{
		ChannelOptionModal
	},
	data() {
		return ({
			username: '' as string,
			channel_id: -1 as number,
		});
	},

	props: {
		show: Boolean,
		channel_id: Number,
	},

	methods: {
		async UnbanUser(username: string) {
			if (!username.length || !username.match(/^(?=.{1,15}$)[\p{L}\p{N}_]+$/u)){
				const notif = useNotification();
				notif.notify({
					title: 'Error',
					text: "Please enter a valid username !",
					type: 'error',
					group: 'notif-center',
				});
				return;
			}
			const user_resp = await fetch('http://' + import.meta.env.VITE_HOST + ':3000/user/' + username, {credentials: 'include'});
			if (!user_resp['ok'] || username == '') {
				this.$emit('close');
				return ;
			}
			const notif = useNotification();
			try {
				const user = await user_resp.json();
				const isUserInChan = await (await fetch('http://' + import.meta.env.VITE_HOST +
						':3000/chat/' + this.$props.channel_id + '/is_UserBan/'
							+ user['id'], { credentials: 'include' })).json();
				if (!isUserInChan){
					notif.notify({
						title: 'Error',
						text: "This user is not banned !",
						type: 'error',
						group: 'notif-center',
					});
					return;
				}
				await fetch('http://' + import.meta.env.VITE_HOST + ':3000/user/' + user['id'] + '/channels/'
							+ this.$props.channel_id + '/unban', {credentials: 'include', method: 'POST'});
				this.$emit('close');
				notif.notify({
					title: 'Moderation',
					text: "Ban revoked !",
					type: 'success',
					group: 'notif-center',
				});
			} catch (error) {
				notif.notify({
					title: 'Error',
					text: "This user does not exist !",
					type: 'error',
					group: 'notif-center',
				});
			}
		}
	},
};

</script>

<template>
	<Transition name="slide-fade" mode="out-in">
		
		<div v-if="show" class="modal_overlay" @click="$emit('close')">
			<ChannelOptionModal @click.stop title="UnBan a User" placeholder="User Name" @callback="UnbanUser" ></ChannelOptionModal>
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

.modal {
	display: flex;
	flex-direction: column;
	align-items: end;
	width: 75%;
	max-width: 500px;
	height: 70%;
	background-color: #DBEFFC;
	border-radius: 20px;
}
.modal button {
	display: flex;
	background-color: #DBEFFC;
	height: 6%;
	width: 6%;
	align-items: center;
	justify-content: center;
	border: none;
	font-size: 1.3em;
	border-radius: 20px;
}

.modal button:hover {
	background-color: rgb(182, 227, 238);
}
.form {
	display: flex;
	border-radius: 20px;
	width: 100%;
	height: 80%;
	flex-direction: column;
	align-items: center;
	padding-top: 5%;
}

.field {
	display: flex;
	flex-direction: column;
	width: 70%;
	height: 70%;
	gap: 12%;
	align-items: center;
	padding-top: 2%;
}
.entry {
	display: flex;
	border-radius: 20px;
	width: 100%;
	height: 30%;
	outline: none;
	border: none;
	text-align: center;
	font-size: larger;
}

.choice {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;
	height: 25%;
}

.choice button {
	display: flex;
	width: 25%;
	height: 80%;
	background-color: #036280;;
	border: 1px solid #000000;
	border-radius: 20px;
}
</style>