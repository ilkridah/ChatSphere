import {
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
	OnGatewayConnection,
	OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { RoomService } from './room.service';
import { GameService } from './game.service';
import { Player } from './interface/player.interface';
import { Room, } from './interface/room.interface';
import { UserService } from 'src/user/user.service';
import { StatsService } from 'src/stats/stats.service';

@WebSocketGateway({ namespace: '/pong' })
export class PongGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer() server: Server;
	private playerMap: Map<string, Player> = new Map<string, Player>;

	constructor(private readonly gameService: GameService,
		private readonly authService: AuthService,
		private readonly roomService: RoomService,
		private readonly userService: UserService,
		private readonly statsService: StatsService) { }

	async handleConnection(client: Socket) {
		client.data.User_id = Number(client.handshake.query['User_id']);
	}

	async handleDisconnect(client: Socket) {
		await this.roomService.leaveRoomSocket(client.id, client);
		client.disconnect();
	}

	@SubscribeMessage('onJoinGame')
	async handleJoinGame(client: Socket, data: string[]) {
		client.data.user = await this.authService.getUserFromToken(data[0]);
		let player: Player = this.playerMap.get(client.data.user["email"]);
		if (!player) {
			player = {
				socket: client,
				score: 0,
				user: client.data.user,
				roomId: -1,
				racket: undefined,
			};
			this.playerMap.set(client.data.user["email"], player);
		}
		else
			player.socket = client;
		await this.roomService.searchRoom(client, player, parseInt(data[1]), parseInt(data[2]));
		this.gameService.keyHandling(client)
	}

}


