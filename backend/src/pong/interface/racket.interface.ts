import { Pos } from "./room.interface";

export class Racket {
	constructor(){
		this.pos = {x: 0, y: 0};
		this.size = 0;
		this.width = 0;
		this.speed = 15;
		this.effectTimeout = null;
	}
	pos: Pos;
	size: number;
	width: number;
	speed: number;
	effectTimeout: NodeJS.Timeout;
}