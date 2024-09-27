import { Controller, Param, Get, Req } from "@nestjs/common";
import { ChatService } from "../chat.service";
import { Message } from "../entities/message.entity";
import { AuthService } from "src/auth/auth.service";

@Controller('message')
export class MessageController {
	constructor(
		private readonly chatService: ChatService,
		private readonly authService: AuthService,
	) {}

	@Get(":channel_id/list")
	async get_ChannelMessages(@Param('channel_id') channel_id: number, @Req() request: Request): Promise<Message[] | null> {
		const user = await this.authService.getUserFromToken(request['cookies']['access_token']);
		return (await this.chatService.get_ChannelMessages(user.id, channel_id));
	}

	@Get('/count')
	async get_CountMessages(@Req() request: Request): Promise<number> {
		const user = await this.authService.getUserFromToken(request['cookies']['access_token']);
		if (!user)
			return (0);
		return (await this.chatService.get_CountMessages(user.id));
	}
}