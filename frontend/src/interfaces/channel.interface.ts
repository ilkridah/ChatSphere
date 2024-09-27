import type { Message } from './message.interface.ts';

export interface Channel {
	id: number;
	name: string;
	owner: number;
	messages: Message[];
	is_protected: boolean;
	is_private: boolean;
	admins: number[];
	muted: boolean;
	Banned_Users: number[];
}