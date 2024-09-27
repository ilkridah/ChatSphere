<template>
	<div class="home_body" v-show="isChannelLoaded">
		<div class="home_content">
			<div class="left_column">
				<PlayButton />
				<div class="friend_list">
					<ModalManager :selectedChannel="selectedChannel" :sender="sender" @joinChannel="joinChannel"
						@updateButton='selectedChannel.is_protected = true;' ref="ModalManager"
						@click="updateTimestamp = Date.now()" />
					<Transition name="fade2" mode="out-in">
						<ChannelList v-if="ModalManagerData && ModalManagerData.listView" :channels="channels"
							:selectedChannel="selectedChannel" @showChannel="showChannel" />
						<FriendList v-else :updateTimestamp="updateTimestamp" :friendTimestamp="refreshTimestamp"
							@showPrivateMessage="showPrivateMessage" />
					</Transition>
				</div>
			</div>
			<Chat class="chat_container" :selectedChannel="selectedChannel" :sender="sender" @removeChannel="removeChannel"
				@displayChannelOption="displayChannelOption"></Chat>
		</div>
	</div>
</template>

<style>
.home_body {
	height: 90%;
	padding: 2.5%;
	min-height: 600px;
	min-width: 500px;
}

.home_content {
	display: flex;
	height: 100%;
	width: 100%;
	align-items: center;
	justify-content: center;
	gap: 6%;
}

.left_column {
	display: flex;
	height: 100%;
	width: 20%;
	flex-direction: column;
	gap: 4%;
	flex-grow: 0.2;
	min-width: 175px;
	max-width: 450px;
}

.chat_container {
	max-width: 800px;
}

.friend_list {
	display: flex;
	flex-direction: column;
	height: 80%;
	width: 100%;
	background-color: #ffffff;
	border: 3px solid #515151;
	border-radius: 10px;
}

.slide-fade-enter-from {
	opacity: 0;
}

.slide-fade-leave-to {
	opacity: 0;
}

.slide-fade-enter-from .modal-container,
.slide-fade-leave-to .modal-container {
	-webkit-transform: scale(1.5);
	transform: scale(1.5);
}

.fade2-enter-from,
.fade2-leave-to {
	opacity: 0;
}

.fade2-enter-active,
.fade2-leave-active {
	transition: opacity 0.15s ease;
}
</style>

<script lang="ts">
import ModalAdd from '@/components/chat/ModalAdd.vue'
import ModalAddFriend from '@/components/chat/ModalAddFriend.vue'
import { defineComponent } from 'vue';
import { useNotification } from "@kyvg/vue3-notification";
import PlayModal from '@/components/game/PlayModal.vue';
import ChannelList from '@/components/chat/ChannelList.vue';
import ModalManager from '@/components/chat/ModalManager.vue';
import FriendList from '@/components/chat/FriendList.vue';
import Chat from '@/components/chat/Chat.vue';
import PlayButton from '@/components/game/PlayButton.vue';
import { SocketService } from '@/services/SocketService'
import type { Channel } from '@/interfaces/channel.interface';
import type { Message } from '@/interfaces/message.interface';
import type { User } from '@/interfaces/user.interface';
import router from '@/router';

export enum State {
	OFFLINE,
	ONLINE,
	INGAME,
}

export default defineComponent({
	components: {
		ModalAddFriend,
		ModalAdd,
		PlayModal,
		ChannelList,
		ModalManager,
		FriendList,
		Chat,
		PlayButton,
	},

	data() {
		return {
			sender: {} as User,
			channels: [] as Channel[],
			selectedChannel: {} as Channel,
			ModalManagerData: null as unknown,
			updateTimestamp: 0 as number,
			refreshTimestamp: 0 as number,
			isChannelLoaded: false,
		}
	},

	props: {
		removedChannel: Number
	},

	async mounted() {
		const user = await (await fetch('http://' + import.meta.env.VITE_HOST + ':3000/user/me', { credentials: 'include' })).json()
		if (user.error) {
			router.push('/auth');
			return;
		}
		if (SocketService.getStatus)
			SocketService.getInstance.emit('setStatus', SocketService.getUser.id, State.ONLINE);
		this.ModalManagerData = this.$refs['ModalManager'];
		if (user) {
		}
		this.sender.id = user['id'];
		this.sender.name = user['name'];
		this.sender.img = user['avatar_Link'];
		SocketService.getInstance.emit('getMute', this.sender.id);
		this.channels = await this.get_JoinedChannels();
		if (sessionStorage.getItem('channel_id')) {
			const channel = this.findChannel(Number(sessionStorage.getItem('channel_id')));
			if (channel)
				this.showChannel(channel);
		}
		this.isChannelLoaded = true;
		await this.init();
		await fetch("http://" + import.meta.env.VITE_HOST + ":3000/auth/refresh", { credentials: 'include', method: 'POST' });
	},

	methods: {
		async init() {
			this.$emit('socketReady');
			SocketService.getInstance.on('getMute', (data: number[]) => {
				for (let response of data) {
					const channel = this.findChannel(response);
					channel.muted = true;
				}
			});

			SocketService.getInstance.on('mute', (data: any) => {
				if (data.error) {
					const notif = useNotification();
					notif.notify({
						title: "Mute",
						type: 'error',
						text: data.message,
						group: 'notif-center',
					});
					return;
				}
				const { started, channelName, id } = data;
				let message;
				const channel = this.findChannel(id);
				if (!channel)
					return;
				if (started) {
					message = `You have been muted from the channel: ${channelName}.`;
					channel.muted = true;
				}
				else {
					message = `You have been unmuted from the channel: ${channelName}.`;
					channel.muted = false;
				}
				const notif = useNotification();
				notif.notify({
					title: "Mute",
					type: started ? 'error' : 'success',
					text: message,
					group: 'notif-center',
				});
			});
			SocketService.getInstance.on('message',
				(data: {
					channel_id: number,
					text: string,
					sender: number,
					sender_name: string,
					sender_img: string
				}) => {
					const { channel_id, text, sender, sender_name, sender_img } = data;
					const channel = this.findChannel(channel_id);
					if (channel) {
						channel.messages.push({
							channel_id: channel_id,
							text: text,
							sender: sender,
							sender_name: sender_name,
							sender_img: sender_img,
						});
						if (this.selectedChannel.id === channel_id)
							this.selectedChannel = channel;
					}
				});
			SocketService.getInstance.on('kick', async (data: any) => {
				const channel_id = data[0];
				const User_id = data[1];
				const ban = data[2];
				if (this.sender.id === User_id) {
					for (let i = 0; i < this.channels.length; i++) {
						if (this.channels[i].id === channel_id) {
							const channel_name = this.channels[i].name;
							this.channels.splice(i, 1);
							if (this.selectedChannel.id === channel_id)
								await this.updateSelectedChannel(undefined);
							const notif = useNotification()
							notif.notify({
								title: 'Error',
								text: `You have been ${ban ? 'ban' : 'excluded'} of the channel: ${channel_name}`,
								type: 'error',
								group: 'notif-center',
							});
							break;
						}
					}
				}
			});
			SocketService.getInstance.on('changeAdmin', async (payload) => {
				if (this.selectedChannel.id === payload.channel_id)
					this.selectedChannel.admins = await (await fetch('http://' + import.meta.env.VITE_HOST + ':3000/chat/' + sessionStorage.getItem('channel_id') + '/Fetch_admins')).json();
			});

			SocketService.getInstance.on('changeOwner', async (data) => {
				const { channel_id, new_owner_id } = data;
				if (this.selectedChannel.id === channel_id)
					this.selectedChannel.owner = new_owner_id;
				if (SocketService.getUser.id === new_owner_id) {
					const chanName = (await (await fetch("http://" + import.meta.env.VITE_HOST + ":3000/chat/" + channel_id,
						{ method: "get", credentials: "include" })).json())["name"];
					const notif = useNotification();
					notif.notify({
						title: 'new ownership',
						text: `You have been promoted to channel owner ${chanName}`,
						type: 'success',
						group: 'notif-center',
					});
				}
			})

			SocketService.getInstance.on('updateFriendList', async () => {
				this.refreshTimestamp = Date.now();
				this.channels = await this.get_JoinedChannels();
				for (let channel of this.channels) {
					channel.messages = await this.get_ChannelMessages(channel.id);
					if (channel.id === this.selectedChannel.id)
						await this.updateSelectedChannel(channel)
				}

			});

			SocketService.getInstance.on('hideChan', async (payload) => {
				if (this.selectedChannel.name === payload)
					await this.updateSelectedChannel(undefined)
			})

			SocketService.getInstance.on('upgradeAdmin', (chanName) => {
				const notif = useNotification();
				notif.notify({
					title: 'Moderation',
					text: `You have been promoted to channel admin ${chanName}`,
					type: 'success',
					group: 'notif-center',
				});
			})

			SocketService.getInstance.on('downgradeAdmin', (chanName) => {
				const notif = useNotification();
				notif.notify({
					title: 'Moderation',
					text: `You have been removed from channel admins ${chanName}`,
					type: 'error',
					group: 'notif-center',
				});
			})
		},

		async showChannel(chan: Channel) {
			await this.updateSelectedChannel(chan)
		},

		async get_JoinedChannels(): Promise<Channel[]> {
			const channels_json = await (await fetch('http://' + import.meta.env.VITE_HOST + ':3000/user/' + this.sender.id + '/joinedChannels', { credentials: 'include' })).json();
			let channels: Channel[] = [];
			for (let i = 0; i < channels_json.length; i++) {
				channels.push({
					id: channels_json[i]['id'],
					owner: (await (await fetch('http://' + import.meta.env.VITE_HOST + ':3000/chat/' + channels_json[i]['id'] + '/owner', { credentials: 'include' })).json())['id'],
					name: channels_json[i]['name'],
					messages: await this.get_ChannelMessages(channels_json[i]['id']),
					is_private: channels_json[i]['is_private'],
					is_protected: channels_json[i]['is_protected'],
					admins: channels_json[i]['admins'],
					muted: false,
					Banned_Users: channels_json[i]['Banned_Users'],
				});
			}
			return (channels);
		},

		async joinChannel(channel: Channel, password: string) {
			const found = this.findChannel(channel.id);
			if (found) {
				this.showChannel(found);
				return;
			}
			const response = await fetch('http://' + import.meta.env.VITE_HOST + ':3000/user/' + this.sender.id + '/channels/' + channel['id'] + '/add', {
				credentials: 'include',
				method: "POST",
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					password: password,
				}),
			});
			const response_json = await response.json();
			if (response_json['ok'] === true) {
				channel.owner = (await (await fetch('http://' + import.meta.env.VITE_HOST + ':3000/chat/' + channel.id + '/owner', { credentials: 'include' })).json())['id'];
				this.channels.push(channel);
				await this.updateSelectedChannel(channel);
				this.selectedChannel.messages = await this.get_ChannelMessages(channel.id);
			}
			else {
				const notif = useNotification()
				notif.notify({
					title: 'Error',
					text: `Unable to join channel: ${response_json['message']}`,
					type: 'error',
					group: 'notif-center',
				});
			}
		},

		async removeChannel(id: number) {
			for (let i = 0; i < this.channels.length; i++) {
				if (this.channels[i].id === this.selectedChannel.id) {
					if (this.selectedChannel.owner === this.sender.id) {
						const owner_response = await fetch('http://' + import.meta.env.VITE_HOST + ':3000/chat/' + this.channels[i].id + '/owner');
						try {
							const new_owner_id = (await owner_response.json())['id'];
							let channel_id = this.channels[i].id;
							SocketService.getInstance.emit('changeOwner', { channel_id, new_owner_id });
						}
						catch { }
					}
					this.channels.splice(i, 1);
					await this.updateSelectedChannel(undefined);
					break;
				}
			}
		},

		displayChannelOption(str: string) {
			if (str === 'unban')
				this.ModalManagerData.showUnBanModal = true;
			else if (str === 'ban')
				this.ModalManagerData.showBanModal = true;
			else if (str === 'add_admin')
				this.ModalManagerData.showAddAdminModal = true;
			else if (str === 'remove_admin')
				this.ModalManagerData.showRemoveAdminModal = true;
			else if (str === 'add_password')
				this.ModalManagerData.showAddPasswordModal = true;
			else if (str === 'remove_password')
				this.ModalManagerData.showRemovePasswordModal = true;
		},

		findChannel(id: number): Channel | null {
			for (let i = 0; i < this.channels.length; i++)
				if (this.channels[i].id === id)
					return (this.channels[i]);
			return (null);
		},

		async get_ChannelMessages(channel_id: number): Promise<Message[]> {
			const userMaps: Map<number, any> = new Map<number, any>;
			const message_response = await fetch('http://' + import.meta.env.VITE_HOST + ':3000/message/' + channel_id + '/list', { credentials: 'include' });
			let messages = [] as Message[];
			try {
				const messages_json = await message_response.json();
				for (let i = 0; i < messages_json.length; i++) {
					if (!userMaps.get(messages_json[i].message_sender))
						userMaps.set(messages_json[i].message_sender, await (await fetch('http://' + import.meta.env.VITE_HOST + ':3000/user/id/' + messages_json[i].message_sender, { credentials: 'include' })).json());
					messages.push({
						channel_id: channel_id,
						text: messages_json[i].message_text,
						sender: userMaps.get(messages_json[i].message_sender)['id'],
						sender_name: userMaps.get(messages_json[i].message_sender)['name'],
						sender_img: userMaps.get(messages_json[i].message_sender)['avatar_Link'],
					});
				}
				return (messages);
			}
			catch {
				return ([] as Message[]);
			}
		},

		showPrivateMessage(channel_id: number) {
			const channel = this.findChannel(channel_id);
			if (!channel) {
				return;
			}
			this.showChannel(channel);
		},

		async updateSelectedChannel(newChan: Channel | undefined) {
			if (newChan) {
				this.selectedChannel = newChan;
				this.selectedChannel.owner = (await (await fetch('http://'
					+ import.meta.env.VITE_HOST + ':3000/chat/'
					+ this.selectedChannel.id + '/owner', { credentials: 'include' })).json())['id'];
				sessionStorage.setItem('channel_id', String(newChan.id));
			}
			else {
				this.selectedChannel = {} as Channel;
				sessionStorage.removeItem('channel_id');
			}
		},
	},
});

</script>