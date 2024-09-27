import { Injectable } from "@nestjs/common";
import { Room, State } from "./interface/room.interface";
import { MatchService } from "src/match/match.service";
import { Mode } from 'src/pong/interface/room.interface';
import { Socket } from "socket.io";
import { Player } from "./interface/player.interface";
import { MatchDto } from "src/match/match.dto";
import { GameService } from "./game.service";
import { PongConstants } from "./interface/constants.interface";
import { StatsService } from "src/stats/stats.service";

@Injectable()
export class RoomService {

	private lastRoomId = 0;
	private roomsMap: Map<Mode, Room[]> = new Map();
	private disconnectedUsers: Map<number, string> = new Map();
	private checkedRooms: Set<Room> = new Set();

	constructor(private readonly matchService: MatchService,
		private readonly statsService: StatsService) {
		this.roomsMap.set(Mode.DEFAULT, []);
		this.roomsMap.set(Mode.RANKED, []);
		this.roomsMap.set(Mode.DUEL_DEFAULT, []);
	}

	async checkRoomLoop(gameService: GameService) {
		const keysArray = Array.from(this.roomsMap.keys());
		for (var key of keysArray as Mode[]) {
			for (var ro of this.roomsMap.get(key) as Room[]) {
				if (!this.checkedRooms.has(ro)) {
					await gameService.checkRoom(ro);
					this.checkedRooms.add(ro);
				}
			}
		}
	}

	async extractRoom(rooms: Room[]) {
		const filteredRooms = rooms.map(ro => {
			const { players, timerInterval, timerTimeout, gameInterval, ...rest } = ro;
			const filteredPlayers = players.map(({ socket, ...player }) => player);
			return { ...rest, players: filteredPlayers };
		});
		return filteredRooms;
	}

	async hasDisconnect(email: string): Promise<Object> {
		let roomId: number = -1;
		for (let [key, value] of this.disconnectedUsers.entries()) {
			if (value === email) {
				roomId = key;
				break;
			}
		}
		return ({ status: roomId !== -1, roomId: roomId });
	}

	async getRooms() {
		let res = [];
		const keysArray = Array.from(this.roomsMap.keys());
		for (var key of keysArray) {
			res.push(await this.extractRoom(this.roomsMap.get(key)));
		}
		return (res);
	}

	async getRoomById(id: number) {
		for (let [key, value] of this.roomsMap) {
			const res = value.find(ro => ro.id === id);
			if (res)
				return (res);
		}
	}

	async createRoom(mode: Mode, id?: number): Promise<Room> {
		const ro: Room = {
			id: this.lastRoomId++,
			state: State.QUEUE,
			mode: mode,
			players: [],
			ball: null,
			time: 0,
			canvas: { width: PongConstants.CANVAS_WIDTH, height: PongConstants.CANVAS_HEIGHT },
			timerInterval: null,
			timerTimeout: null,
			gameInterval: null,
			isFinished: false,
			isSavingData: false,
		};
		if (id)
			ro.id = id;
		this.roomsMap.get(mode).push(ro);
		return ro;
	}

	async joinRoom(client: Socket, ro: Room, player: Player): Promise<Room> {
		if (ro.players.length < 2) {
			player.user.stats = await this.statsService.getUserStats(player.user.stats.id);
			ro.players.push(player);
			client.data.ro = ro;
			if (ro.players.length === 2) {
				if (ro.state === State.QUEUE)
					ro.state = State.INIT;
				player.roomId = ro.id;
			}
			if (ro.players.length === 1)
				client.emit("ids", player.user.id, "");
			return (ro);
		}
		else {
			player.roomId = ro.id;
			player.user.stats = await this.statsService.getUserStats(player.user.stats.id);
			client.data.ro = ro;
			client.emit("ids", ro.players[0].user.id, ro.players[1].user.id);
			return (ro);
		}
	}

	async isSocketInsideRoom(ro: Room, socketId: string): Promise<Boolean> {
		const playerNames: string[] = ro.players.map((player) => player.socket.id);
		return (playerNames.includes(socketId));
	}

	async isEmailInGame(email: string): Promise<Boolean> {
		const keysArray = Array.from(this.roomsMap.keys());
		for (var key of keysArray) {
			for (var ro of this.roomsMap.get(key)) {
				if (this.isEmailInsideRoom(ro, email))
					return (true);
			}
		}
		return (false);
	}

	async isPlayerInsideRoom(ro: Room, player: Player): Promise<Boolean> {
		const playerNames: string[] = ro.players.map((player) => player.user.email);
		return (playerNames.includes(player.user.email) && ro.players.length === 1);
	}

	async isEmailInsideRoom(ro: Room, email: string): Promise<Boolean> {
		const playerNames: string[] = ro.players.map((player) => player.user.email);
		return (playerNames.includes(email));
	}

	async duelHandling(client: Socket, player: Player, mode: Mode, id: number) {
		for (var ro of this.roomsMap.get(mode) as Room[]) {
			if (ro.id === id) {
				if (this.disconnectedUsers.get(ro.id))
					this.disconnectedUsers.delete(ro.id);
				return (this.joinRoom(client, ro, player));
			}
		}
		const newRoom: Room = await this.createRoom(mode, id);
		player.roomId = newRoom.id;
		return (this.joinRoom(client, newRoom, player));
	}

	async searchRoom(client: Socket, player: Player, mode: Mode, id?: any): Promise<Room> {
		if (mode === Mode.DUEL_DEFAULT) {
			return (this.duelHandling(client, player, mode, id));
		}
		if (this.roomsMap.get(mode)) {
			for (var ro of this.roomsMap.get(mode) as Room[]) {
				if ((ro.id === player.roomId || ro.state === State.QUEUE) && !await this.isPlayerInsideRoom(ro, player)) {
					if (this.disconnectedUsers.get(ro.id))
						this.disconnectedUsers.delete(ro.id);
					return (this.joinRoom(client, ro, player));
				}
			}
		}
		const newRoom: Room = await this.createRoom(mode);
		player.roomId = newRoom.id;
		return (this.joinRoom(client, newRoom, player));
	}

	async leaveRoomSocket(socketId: string, client: Socket) {
		const keysArray = Array.from(this.roomsMap.keys());
		for (var key of keysArray as Mode[]) {
			for (var ro of this.roomsMap.get(key) as Room[]) {
				if (!await this.isSocketInsideRoom(ro, socketId))
					continue;
				if (ro.players.length === 2 && ro.state !== State.ENDGAME) {
					ro.state = State.WAITING;
					if (this.disconnectedUsers.get(ro.id)) {
						ro.state = State.ENDGAME;
					}
					else
						this.disconnectedUsers.set(ro.id, client.data.user.email);
				}
				else if (ro.players.length === 1) {
					ro.state = State.FINAL;
				}
			}
		}
	}

	emitToPlayers(ro: Room, event: string, ...args: any[]) {
		ro.players.forEach(player => {
			if (player) player.socket.emit(event, ...args);
		  });
	}

	async endGame(ro: Room) {
		if (ro.players.length != 2)
			return;
		if (ro.timerInterval)
			clearInterval(ro.timerInterval);
		const modes: string[] = ["Classic", "Ranked", "Duel Classic"];
		const matchDto: MatchDto = {
			player1Id: ro.players[0].user["id"], player2Id: ro.players[1].user["id"],
			scorePlayer1: ro.players[0].score, scorePlayer2: ro.players[1].score,
			mode: modes[ro.mode], leaverId: -1
		}
		const leaverEmail: string = this.disconnectedUsers.get(ro.id);
		if (leaverEmail && ro.players[0].user["email"] === leaverEmail)
			matchDto.leaverId = matchDto.player1Id;
		else if (leaverEmail && ro.players[1].user["email"] === leaverEmail)
			matchDto.leaverId = matchDto.player2Id;
		if (matchDto.leaverId !== -1) {
			this.emitToPlayers(ro, 'userDisco', matchDto.leaverId);
		}
		ro.state = State.FINAL;
		return (await this.matchService.createMatch(matchDto, ro.mode === Mode.RANKED, ro));
	}

	haveUserDisco(roomId: number): Boolean {
		return (this.disconnectedUsers.get(roomId) !== undefined);
	}


	finalGame(ro: Room) {
		this.disconnectedUsers.delete(ro.id);
		this.roomsMap.set(ro.mode, this.roomsMap.get(ro.mode).filter((el) => el !== ro));
		this.emitToPlayers(ro, 'text', "ENDGAME");
		this.checkedRooms.delete(ro);
		ro.isFinished = true;
	}

	getRoomFromSocket(client: Socket): Room {
		for (var ro of this.checkedRooms) {
			const sockets = ro.players.map((player) => { return player.socket; });
			if (sockets.includes(client))
				return ro
		}
	}

}