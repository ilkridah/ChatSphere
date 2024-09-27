import { Injectable, } from '@nestjs/common';
import { PongGame } from './pong.service';
import { RoomService } from './room.service';
import { Mode, Room, State } from './interface/room.interface';
import { Socket } from 'socket.io';
import { PongConstants } from './interface/constants.interface';


interface GameVar {
	needUpdate: boolean;
	countDown: number;
	cooldown: number;
};

@Injectable()
export class GameService {
	private infosMap: Map<number, GameVar> = new Map<number, GameVar>;

	constructor(private readonly pongGame: PongGame, private readonly roomService: RoomService) {
		setInterval(async () => {
			await this.roomService.checkRoomLoop(this);
		}, 200);
	};

	async checkRoom(ro: Room) {
		if (ro.isFinished)
			return;
		if (!this.infosMap.get(ro.id) && ro.players.length === 2) {
			this.infosMap.set(ro.id, { needUpdate: false, countDown: 0, cooldown: 0 } as GameVar)
			await this.playGame(ro);
		}
		let gameVars: GameVar = this.infosMap.get(ro.id);
		switch (ro.state) {
			case State.INIT: {
				this.roomService.emitToPlayers(ro, 'time', this.pongGame.formatTime(ro.time, ro.mode));
				ro.state = State.COOLDOWN;
			}
				break;
			case State.COOLDOWN: {
				this.pongGame.updateGame(ro.players[0].socket, ro, false);
				this.pongGame.updateGame(ro.players[1].socket, ro, false);

				if (gameVars.needUpdate) {
					gameVars.needUpdate = false;
					this.pongGame.resetBall(ro);
					this.pongGame.updateGame(ro.players[0].socket, ro, false);
					this.pongGame.updateGame(ro.players[1].socket, ro, false);
					this.roomService.emitToPlayers(ro, "updateScore", ro.players[0].score, ro.players[1].score);
				}
				if (ro.timerInterval) {
					clearInterval(ro.timerInterval);
					clearTimeout(ro.timerTimeout);
				}
				if (gameVars.cooldown < (1000 / PongConstants.GAME_TICK) * 2)
					gameVars.cooldown++;
				else {
					gameVars.cooldown = 0;
					ro.state = State.PLAY;
					this.pongGame.startTimer(ro);
					gameVars.needUpdate = true;
				}
			}
				break;
			case State.WAITING: {
				if (ro.timerInterval) {
					clearInterval(ro.timerInterval);
					clearTimeout(ro.timerTimeout);
					ro.timerInterval = null;
				}

				this.roomService.emitToPlayers(ro, 'text', 'WAITING');
				gameVars.countDown++;
				if (!this.roomService.haveUserDisco(ro.id)) {
					ro.state = State.INIT;
					gameVars.countDown = 0;
				}
				if (gameVars.countDown > (1000 / PongConstants.GAME_TICK) * 5) {
					ro.state = State.ENDGAME;
				}
			}
				break;

			case State.ENDGAME: {
				clearInterval(ro.timerInterval);
				this.roomService.emitToPlayers(ro, 'text', "ENDGAME");
				await this.roomService.endGame(ro);
			}
				break;

			case State.FINAL: {
				this.infosMap.delete(ro.id);
				this.roomService.finalGame(ro);
			}
				break;

			case State.PLAY: {
				gameVars.countDown = 0;
				gameVars.cooldown = 0;
				this.pongGame.updateGame(ro.players[0].socket, ro);
				this.pongGame.updateGame(ro.players[1].socket, ro);
				if (ro.mode === Mode.RANKED && (ro.players[0].score === PongConstants.WIN_SCORE_VALUE || ro.players[1].score === PongConstants.WIN_SCORE_VALUE)) {
					this.roomService.emitToPlayers(ro, "updateScore", ro.players[0].score, ro.players[1].score);
					ro.state = State.ENDGAME;
				}
			}
				break;

			case State.QUEUE: {
				this.roomService.emitToPlayers(ro, 'text', "QUEUEING");
			}
				break;

			default:
				break;
		}
		if (!ro.isFinished) {
			setTimeout(async () => {
				await this.checkRoom(ro);
			}, PongConstants.GAME_TICK)
		}
	}

	async keyHandling(client: Socket) {
		var keyUp: boolean = false;
		var keyDown: boolean = false;
		client.on('arrowUpdate', (data) => {
			if (data === "arrowUp")
				keyUp = true;
			else if (data === "stopArrowUp")
				keyUp = false;
			if (data === "arrowDown")
				keyDown = true;
			else if (data === "stopArrowDown")
				keyDown = false;
			client.data.keyDown = keyDown;
			client.data.keyUp = keyUp;
		});
	}

	async playGame(ro: Room) {
		await this.pongGame.initGame(ro);
		await this.pongGame.startTimer(ro);
		this.roomService.emitToPlayers(ro, "ids", ro.players[0].user.id, ro.players[1].user.id)
	}

}