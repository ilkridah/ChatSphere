import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { Ball, Mode, Room, State } from './interface/room.interface';
import { Racket } from './interface/racket.interface';
import { PongConstants } from './interface/constants.interface';
import { UserService } from 'src/user/user.service';

@Injectable()
export class PongGame {

	constructor(private readonly userService: UserService) { }

	resetBall(ro: Room) {
		ro.ball.radius = 10;
		ro.ball.position.x = PongConstants.CANVAS_WIDTH / 2;
		ro.ball.position.y = PongConstants.CANVAS_HEIGHT / 2;
		ro.ball.direction.x = this.randomPosition();
		ro.ball.direction.y = (Math.random() - 0.5);
		ro.ball.speed = PongConstants.MIN_BALL_SPEED;
		ro.ball.lastHit = -1;
	}
	
	resetRacket(ro: Room) {
		if (ro.players[0]) {
			ro.players[0].racket.pos.x = (PongConstants.RACKET_WIDTH);
			ro.players[0].racket.pos.y = (PongConstants.CANVAS_HEIGHT / 2) - (PongConstants.RACKET_HEIGHT / 2);
			ro.players[0].racket.size = PongConstants.RACKET_HEIGHT;
			ro.players[0].racket.width = PongConstants.RACKET_WIDTH;
			if (ro.players[0].racket.effectTimeout) {
				clearTimeout(ro.players[0].racket.effectTimeout);
				ro.players[0].racket.effectTimeout = null;
			}
		}
		if (ro.players[1]) {
			ro.players[1].racket.pos.x = (PongConstants.CANVAS_WIDTH - (PongConstants.RACKET_WIDTH * 2));
			ro.players[1].racket.pos.y = (PongConstants.CANVAS_HEIGHT / 2) - (PongConstants.RACKET_HEIGHT / 2);
			ro.players[1].racket.size = PongConstants.RACKET_HEIGHT;
			ro.players[1].racket.width = PongConstants.RACKET_WIDTH;
			if (ro.players[1].racket.effectTimeout) {
				clearTimeout(ro.players[1].racket.effectTimeout);
				ro.players[1].racket.effectTimeout = null;
			}
		}
	}
	
	racketHandling(racket: Racket, ro: Room, dy: number) {
		if (this.hasRacketIntersect(ro.ball, racket))
			return;
		const canMove: boolean = ((dy > 0 && racket.pos.y + racket.size < ro.canvas.height - ro.ball.radius) || (dy < 0 && racket.pos.y > ro.ball.radius));
		racket.pos.y += dy * Number(canMove);
	}
	
	randomPosition() {
		const rand = Math.random();
		const sign = Math.random() < 0.5 ? -1 : 1;
		return sign * (0.5 + rand * 0.5);
	}
	
	getRacketDirection(keyUp: boolean, keyDown: boolean): number {
		return (keyUp && !keyDown ? -1 : keyDown && !keyUp ? 1 : 0);
	}

	updateRacket(client: Socket, ro: Room, keyUp: boolean, keyDown: boolean) {
		if (client === ro.players[0].socket) {
			this.racketHandling(ro.players[0].racket, ro, this.getRacketDirection(keyUp, keyDown) * ro.players[0].racket.speed);
		} else if (client === ro.players[1].socket) {
			this.racketHandling(ro.players[1].racket, ro, this.getRacketDirection(keyUp, keyDown) * ro.players[1].racket.speed);
		}
	}

	racketBallCollision(ro: Room, racket: Racket, playerHit: number) {
		if (ro.ball.lastHit === playerHit)
			return;
		ro.ball.lastHit = playerHit;
		const offset = (ro.ball.position.y + ro.ball.radius - racket.pos.y) / (racket.size + ro.ball.radius)
		const angle = (1 / 4) * Math.PI * (2 * offset - 1);
		ro.ball.direction.x *= -1;
		ro.ball.direction.y = Math.sin(angle);
		if (ro.ball.speed != PongConstants.SPEED_BALL_POWERUP)
			ro.ball.speed = Math.min(ro.ball.speed += 0.5, PongConstants.MAX_BALL_SPEED);
		if (playerHit === 0) {
			ro.ball.position.x = ro.players[0].racket.pos.x + ro.players[0].racket.width + ro.ball.radius + 2;
		}
		else {
			ro.ball.position.x = ro.players[1].racket.pos.x - ro.ball.radius - 2;
		}
	}

	hasRacketIntersect(ball: Ball, racket: Racket): boolean {
		const distX = Math.abs(ball.position.x - racket.pos.x - racket.width / 2);
		const distY = Math.abs(ball.position.y - racket.pos.y - racket.size / 2);
		if (distX > (racket.width / 2 + ball.radius))
			return (false);
		if (distY > (racket.size / 2 + ball.radius))
			return (false);
		if (distX <= (racket.width / 2))
			return (true);
		if (distY <= (racket.size / 2))
			return (true);
		const dx = distX - racket.width / 2;
		const dy = distY - racket.size / 2;
		return (dx * dx + dy * dy <= ball.radius * ball.radius);
	}

	updateBall(ro: Room) {
		const next = {
			x: ro.ball.direction.x * ro.ball.speed + ro.ball.radius,
			y: ro.ball.direction.y * ro.ball.speed + ro.ball.radius,
		}
		if (ro.ball.position.y + next.y >= ro.canvas.height
			|| ro.ball.position.y + next.y <= ro.ball.radius * 2) {
			ro.ball.direction.y *= -1;
		}

		if (this.hasRacketIntersect(ro.ball, ro.players[0].racket))
			this.racketBallCollision(ro, ro.players[0].racket, 0);

		else if (this.hasRacketIntersect(ro.ball, ro.players[1].racket))
			this.racketBallCollision(ro, ro.players[1].racket, 1);

		else {
			ro.ball.position.x += ro.ball.direction.x * ro.ball.speed;
			ro.ball.position.y += ro.ball.direction.y * ro.ball.speed;
		}
		let indexPlayer = -1;
		if (ro.ball.position.x > ro.canvas.width)
			indexPlayer = 0;
		else if (ro.ball.position.x < ro.ball.radius)
			indexPlayer = 1;

		if (indexPlayer != -1) {
			ro.players[indexPlayer].score++;
			ro.state = State.COOLDOWN;
			this.resetBall(ro);
			this.resetRacket(ro);
			return;
		}
	}

	updateGame(client: Socket, ro: Room, updatePhysics: boolean = true) {
		client.emit('time', this.formatTime(ro.time, ro.mode))
		if (updatePhysics){
			this.updateBall(ro);
			this.updateRacket(client, ro, client.data.keyUp, client.data.keyDown);
		}
		const { ["effectTimeout"]: timeOut1, ...racket1 } = ro.players[0].racket;
		const { ["effectTimeout"]: timeOut2, ...racket2 } = ro.players[1].racket;

		client.emit("updateBall", ro.ball);
		client.emit("updatePads", racket1, racket2);
		client.emit("updateGame");
	}

	async initGame(ro: Room) {
		if (!ro.ball) {
			ro.ball = new Ball();
			this.resetBall(ro);
		}

		ro.players[0].score = 0;
		if (!ro.players[0].racket)
			ro.players[0].racket = new Racket()

		if (ro.players[1]) {
			ro.players[1].score = 0;
			if (!ro.players[1].racket)
				ro.players[1].racket = new Racket()
		}

		if (ro.players[1] && ro.players[1].racket)
			this.resetRacket(ro);
		ro.canvas.width = PongConstants.CANVAS_WIDTH;
		ro.canvas.height = PongConstants.CANVAS_HEIGHT;
	}

	formatTime(total: number, mode: Mode): string {
		let time;
		if (mode !== Mode.RANKED)
			time = PongConstants.GAME_DURATION - total;
		else
			time = total;
		time = Math.max(time, 0);
		const minutes = Math.floor(time / 60);
		const seconds = time % 60;
		const formattedMinutes = String(minutes).padStart(2, "0");
		const formattedSeconds = String(seconds).padStart(2, "0");
		return `${formattedMinutes}:${formattedSeconds}`;
	}

	async startTimer(ro: Room) {
		if (ro.players.length != 2) {
			return;
		}
		ro.timerInterval = setInterval(() => {
			ro.time++;
			ro.players[0].socket.emit('time', this.formatTime(ro.time, ro.mode));
			ro.players[1].socket.emit('time', this.formatTime(ro.time, ro.mode));
		}, 1000);
		if (ro.mode !== Mode.RANKED) {
			ro.timerTimeout = setTimeout(() => {
				ro.state = State.ENDGAME;
				ro.players[0].socket.emit('time', this.formatTime(ro.time + 1, ro.mode));
				ro.players[1].socket.emit('time', this.formatTime(ro.time + 1, ro.mode));
				clearInterval(ro.timerInterval);
			}, (PongConstants.GAME_DURATION - ro.time) * 1000);
		}
	}

	randInt(min: number, max: number): number {
		return Math.floor(Math.random() * (max - min + 1) + min)
	}

	
}