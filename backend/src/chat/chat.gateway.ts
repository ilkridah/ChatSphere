import {
	SubscribeMessage,
	WebSocketGateway,
	OnGatewayInit,
	WebSocketServer,
	OnGatewayConnection,
	OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { ChatService } from './chat.service';
import { State } from 'src/user/user.entity';
import { FriendService } from 'src/friend/friend.service';
import { UserService } from 'src/user/user.service';

interface Mute {
	User_id: number,
	time: number,
}

interface StateInfo {
	client_socket: Socket;
	state: State;
	displayUpdate: boolean;
}

interface InviteInfo {
	User_id: number;
	mode: string;
}

@WebSocketGateway({
	cors: {
		origin: true,
	}
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	constructor(
		private readonly chatService: ChatService,
		private readonly friendService: FriendService,
		private readonly userService: UserService,
	) { }
	@WebSocketServer() server: Server;
	private logger: Logger = new Logger('ChatGateway');
	private clients: Map<number, StateInfo> = new Map<number, StateInfo>;
	private invites: Map<number, InviteInfo> = new Map<number, InviteInfo>; // invited -> sender
	private muteds: Map<number, Mute[]> = new Map<number, Mute[]>;

	private searchMute(User_id: number, muted_list: Mute[]): Mute {
		if (!muted_list)
			return (undefined);
		for (let muted of muted_list) {
			if (muted.User_id === User_id)
				return (muted);
		}
		return (undefined);
	}

	@SubscribeMessage('message')
	async handleMessage(client: Socket, payload: any) {
		let { channel_id, text, sender } = payload;
		channel_id = Number(channel_id);
		text = String(text);
		sender = Number(sender);
		const users = await this.chatService.get_UsersInChannel(channel_id);
		if (!users)
			return (payload);
		const muted = this.muteds.get(channel_id);
		const mute_instance = this.searchMute(sender, muted);
		if (!mute_instance) {
			for (let user of users) {
				if (!user.block_list.includes(sender))
					this.clients.get(user.id)?.client_socket.emit('message', payload);
			}
			await this.chatService.add_MessageToChannel({ channel_id, text, sender });
			this.logger.log(`message received: ${text}`);
		}
		return (payload);
	}

	@SubscribeMessage('mute')
	async handleMute(client: Socket, payload: any) {
		let { User_id, channel_id, time } = payload;
		User_id = Number(User_id);
		channel_id = Number(channel_id);
		time = Number(time);
		const target = this.clients.get(User_id);
		const channel = await this.chatService.get_ById(channel_id);
		const channelOwner = await this.chatService.get_ChannelOwner(channel_id);
		const data = {
			started: true,
			channelName: channel.name,
			id: channel_id,
			error: false,
			message: '',
		}
		if (time <= 0) {
			data.error = true;
			data.message = 'Enter a positive number.';
			target?.client_socket.emit('mute', data);
			return;
		}
		if (channel.is_private) {
			data.error = true;
			data.message = "You cannot perform operations on a private channel.";
			target?.client_socket.emit('mute', data);
			return;
		}
		if (User_id === channelOwner.id) {
			data.error = true;
			data.message = 'You cannot mute the channel owner.';
			target?.client_socket.emit('mute', data);
			return;
		}
		if (client.data.User_id !== channelOwner.id) {
			data.error = true;
			data.message = 'Only the channel owner can mute.';
			target?.client_socket.emit('mute', data);
			return;
		}
		let users = (await this.chatService.get_UsersInChannel(channel_id));
		const usersId = users.map((user) => user.id);
		if (!usersId.includes(User_id)) {
			data.error = true;
			data.message = 'This user is not in the channel!';
			client.emit('mute', data);
			return;
		}
		const mute_instance = {
			User_id: User_id,
			time: time * 1000,
		};
		if (!this.muteds.get(channel_id)) {
			let array: Mute[] = [];
			array.push(mute_instance);
			this.muteds.set(channel_id, array);
		}
		else {
			const arr = this.muteds.get(channel_id);
			for (var el of arr) {
				if (el.User_id === User_id) {
					data.error = true;
					data.message = 'This user is already mute';
					client.emit('mute', data);
					return;
				}
			}
			this.muteds.get(channel_id).push(mute_instance);
		}
		let muted = this.muteds.get(channel_id);
		target?.client_socket.emit('mute', data);
		setTimeout(() => {
			muted.splice(muted.indexOf(mute_instance), 1);
			data.started = false;
			target?.client_socket.emit('mute', data);
		}, mute_instance.time);
	}

	@SubscribeMessage('getMute')
	async handleGetMute(client: Socket, payload: number) {
		let response = [];
		const channels = await this.userService.get_JoinedChannels(payload);
		for (let channel of channels) {
			const muted = this.muteds.get(channel.id);
			const mute_instance = this.searchMute(payload, muted);
			if (mute_instance)
				response.push(channel.id);
		}
		this.clients.get(payload).client_socket.emit('getMute', response);
	}

	@SubscribeMessage('getStatus')
	async handleGetStatus(client: Socket, payload: number) {
		const friends = await this.friendService.get_FriendsFromUser(Number(payload));
		if (!friends)
			return;
		for (let friend of friends) {
			const user = this.clients.get(payload);
			if (!user)
				this.clients.get(friend)?.client_socket.emit('getStatus', { User_id: payload, state: State.OFFLINE });
			else
				this.clients.get(friend)?.client_socket.emit('getStatus', { User_id: payload, state: user.state });
		}
	}

	@SubscribeMessage('getClientStatus')
	getClientStatus(client: Socket, payload: number) {
		return (client.emit('getClientStatus', this.clients.get(payload).state));
	}

	@SubscribeMessage('setStatus')
	async setStatus(client: Socket, payload: any) {
		this.clients.set(payload[0], { client_socket: client, state: payload[1], displayUpdate: false });
		await this.handleGetStatus(client, payload[0]);
	}

	@SubscribeMessage('kick')
	handleKick(client: Socket, payload: any) {
		this.clients.get(Number(payload[1])).client_socket.emit('kick', payload);
		return (payload);
	}

	@SubscribeMessage('changeAdmin')
	handleChangeAdmin(client: Socket, payload: any) {
		this.server.emit('changeAdmin', payload);
		return (payload);
	}

	@SubscribeMessage('changeOwner')
	async changeOwner(client: Socket, payload: any) {
		await this.chatService.set_Owner(payload.channel_id, payload.new_owner_id);
		this.server.emit('changeOwner', payload);
	}

	async afterInit(server: Server) {
		this.logger.log('Websocket server has started up !');
	}

	handleDisconnect(client: Socket) {
		this.logger.log(`Client disconnected: ${client.id}`);
		if (!this.clients.get(client.data.User_id)) {
			client.disconnect();
			return;
		}

		this.clients.get(client.data.User_id).displayUpdate = true;
		if (this.clients.get(client.data.User_id)?.displayUpdate) {
			setTimeout(() => {
				if (this.clients.get(client.data.User_id)?.displayUpdate) {
					this.handleGetStatus(client, client.data.User_id);
					this.clients.delete(client.data.User_id);
				}
			}, 1000);
		}
		client.disconnect();
	}

	async handleConnection(client: Socket, ...args: any[]) {
		client.data.User_id = Number(client.handshake.query['User_id']);
		if (!this.clients.get(client.data.User_id))
			this.clients.set(client.data.User_id, { client_socket: client, state: State.ONLINE, displayUpdate: false });
		else
			this.clients.get(client.data.User_id).client_socket = client;
		client.data.canInvite = true;
		await this.handleGetStatus(client, client.data.User_id);
		this.logger.log(`Client connected: ${client.id}`);
	}

	@SubscribeMessage('pongInvite')
	async sendPongInvite(client: Socket, payload: any) {
		if (this.invites.get(payload[1]) || this.invites.get(payload[0]) || !client.data.canInvite ||
			this.clients.get(payload[1]).state !== State.ONLINE)
			return;
		this.clients.get(payload[0])?.client_socket.emit('displayInvite', true, payload[2], payload[3]);
		this.clients.get(payload[1])?.client_socket.emit('displayInvite', false, payload[2], payload[3]);
		this.invites.set(payload[1], { User_id: payload[0], mode: payload[3] });
		client.data.canInvite = false;
	}

	@SubscribeMessage('handlingInvite')
	async pongInviteHandler(client: Socket, payload: any) {
		const inviteInfo: InviteInfo = this.invites.get(client.data.User_id);
		if (payload) {
			this.clients.get(inviteInfo.User_id).client_socket.emit('joinGame',
				inviteInfo.User_id, inviteInfo.mode);
			setTimeout(() => {
				this.clients.get(client.data.User_id).client_socket.emit('joinGame',
					inviteInfo.User_id, inviteInfo.mode);
			}, 25);
		}
		if (inviteInfo)
			this.clients.get(inviteInfo.User_id).client_socket.emit('closeInvite');
		if (this.clients.get(client.data.User_id))
			this.clients.get(client.data.User_id).client_socket.emit('closeInvite');
		this.invites.delete(client.data.User_id);
		client.data.canInvite = true;
	}

	@SubscribeMessage('refreshFriendList')
	async refreshFriendList(client: Socket, payload: string) {
		const target = await this.userService.fetchByName(payload);
		this.clients.get(target.id).client_socket.emit('updateFriendList');
	}

	@SubscribeMessage('refreshFriendListId')
	async refreshFriendListId(client: Socket, payload: number) {
		const target = await this.userService.get_ById(payload);
		this.clients.get(target?.id)?.client_socket.emit('updateFriendList');
	}

	@SubscribeMessage('hideChan')
	async hideChan(client: Socket, payload: string[]) {
		const target = await this.userService.get_ById(parseInt(payload[0]));
		this.clients.get(target?.id)?.client_socket.emit('hideChan', payload[1]);
	}

	@SubscribeMessage('addFriendNotif')
	async displayFriendNotif(client: Socket, payload: string) {
		const target = await this.userService.fetchByName(payload);
		if (!target.block_list.includes(client.data.User_id))
			this.clients.get(target?.id)?.client_socket.emit('friendNotif');
	}

	@SubscribeMessage('setAdmin')
	async setAdmin(client: Socket, payload: any[]) {
		this.clients.get(payload[0]).client_socket.emit('upgradeAdmin', (await this.chatService.get_ById(payload[1])).name);
	}

	@SubscribeMessage('unsetAdmin')
	async unsetAdmin(client: Socket, payload: any[]) {
		this.clients.get(payload[0]).client_socket.emit('downgradeAdmin', (await this.chatService.get_ById(payload[1])).name);
	}
}