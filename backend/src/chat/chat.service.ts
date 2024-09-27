import { Inject, Injectable, UseInterceptors } from "@nestjs/common";
import { Channel } from "./entities/channel.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, getConnection } from "typeorm";
import { Message } from "./entities/message.entity";
import { User } from "src/user/user.entity";
import * as bcrypt from 'bcrypt';

@Injectable()
export class ChatService {
	constructor(
		@InjectRepository(Channel)
		private channelRepository: Repository<Channel>,
		@InjectRepository(Message)
		private messageRepository: Repository<Message>,
		@InjectRepository(User)
		private userRepository: Repository<User>,
		) { }
		
		get_All(): Promise<Channel[]> {
			return (this.channelRepository.find());
		}
		get_ById(id: number): Promise<Channel | null> {
			return (this.channelRepository.findOneBy({ id }));
		}
	async get_ChannelMessages(User_id: number, channel_id: number): Promise<Message[] | null> {
		const user = await this.userRepository.findOne({ where: { id: User_id } });
		const channel = await this.channelRepository.findOne({ where: { id: channel_id } });
		if (!user || !channel)
			return (null);
		let messages: Message[];
		if (user.block_list.length) {
			messages = await this.messageRepository.createQueryBuilder('message')
				.select(['message.id', 'message.sender', 'message.text'])
				.where(`message.channel = ${channel.id}`)
				.andWhere(`(message.sender NOT IN (:...block_list))`, { block_list: user.block_list })
				.orderBy('message.id', 'ASC')
				.getRawMany()
			}
			else {
				messages = await this.messageRepository.createQueryBuilder("message")
				.select(['message.id', 'message.sender', 'message.text'])
				.where(`message.channel = ${channel.id}`)
				.orderBy('message.id', 'ASC')
				.getRawMany();
			}
			return (messages);
		}
		fetchByName(name: string): Promise<Channel | null> {
			return (this.channelRepository.findOneBy({ name }));
		}

	async get_ChannelOwner(channel_id: number): Promise<User | null> {
		const channel = await this.channelRepository.findOne({ where: { id: channel_id }, relations: ['owner'] });
		if (!channel)
			return (null);
		return (channel.owner);
	}

	async get_UsersInChannel(channel_id: number): Promise<User[] | null> {
		const channel = await this.channelRepository.findOne({ where: { id: channel_id } });
		if (!channel)return (null);

		const users = await this.userRepository.createQueryBuilder('user')
			.leftJoinAndSelect('user.channels', 'channel')
			.where('channel.id = ' + channel.id)
			.getMany();
	
		if (!users) return (null);
		return (users);
	}

	async create(name: string, password: string, protect: boolean, creator: User, is_private: boolean = false): Promise<Channel | null> {
		
		if (name.match('/^\s*$/')) throw new Error('wrong name format.');
		if (await this.fetchByName(name) !== null) return (null);
		
		const channel = new Channel();
		channel.name = name;
		channel.password = (protect ? await bcrypt.hash(password, 8) : '');
		channel.is_protected = protect;
		channel.owner = creator
		channel.is_private = is_private;
		const createdChannel = await this.channelRepository.save(channel);
		return (createdChannel);
	}

	async delete(name: string) {
		let rm = await this.fetchByName(name);
		if (rm == null)
			return;
		this.channelRepository.delete({ id: rm.id });
	}

	async add_MessageToChannel(msg: { channel_id: number, text: string, sender: number }) {
		const { channel_id, text, sender } = msg;
		const channel = await this.channelRepository.findOne({ where: { id: channel_id } });
		if (!channel)
			return (null);
		let messages = await this.messageRepository.find({ where: { channel: channel_id } });

		const senderUser = await this.userRepository.createQueryBuilder('user')
			.leftJoinAndSelect('user.channels', 'channels')
			.where('user.id = ' + sender)
			.andWhere('channels.id = ' + channel_id)
			.getOne();

		if (!senderUser)
			return (null);
		const message = new Message();
		message.text = text;
		message.channel = channel.id;
		message.sender = senderUser.id;
		const savedMessage = await this.messageRepository.save(message);
		messages.push(savedMessage);

		const user = await this.userRepository.findOne({ where: { id: sender }, relations: ['stats'] });
		user.stats.totalMessages++;
		await this.userRepository.save(user);
		await this.channelRepository.save(channel);
		return (savedMessage);
	}


	async add_AdminInChannel(channel_id: number, User_id: number): Promise<Channel> {
		const channel = await this.channelRepository.findOne({ where: { id: channel_id }, relations: ['owner'] });
		const user = await this.userRepository.findOne({ where: { id: User_id } });

		if (!channel) throw new Error("Could not find channel.");
		if (!user) throw new Error("Could not find user.");
		if (user.id === channel.owner.id) throw new Error("This user is the owner of this channel !");
		if (channel.Banned_Users.includes(user.id)) throw new Error("This user is banned from this channel!");
		if (channel.admins.includes(user.id)) throw new Error("This user is already an admin of this channel !");

		channel.admins.push(user.id);
		return (await this.channelRepository.save(channel));
	}

	async delete_AdminInChannel(channel_id: number, User_id: number): Promise<Channel> {
		const channel = await this.channelRepository.findOne({ where: { id: channel_id }, relations: ['owner'] });
		const user = await this.userRepository.findOne({ where: { id: User_id } });

		if (!channel) throw new Error("Could not find channel.");
		if (!user) throw new Error("Could not find user.");
		if (!channel.admins.includes(user.id)) throw new Error("This user is not an admin of this channel !");
		for (let admin of channel.admins) {
			if (admin === user.id) {
				channel.admins.splice(channel.admins.indexOf(user.id), 1);
				return (await this.channelRepository.save(channel));
			}
		}
	}

	async delete_Password(User_id: number, channel_id: number) {
		const user = await this.userRepository.findOne({ where: { id: User_id } });
		const channel = await this.channelRepository.findOne({ where: { id: channel_id }, relations: ['owner'] });

		if (!user) throw new Error('Could not find user.');
		if (!channel) throw new Error("Could not find channel.");
		if (!channel.is_protected) throw new Error("Channel is already not is_protected.");
		if (user.id !== channel.owner.id) throw new Error('User is not the owner of the channel');
	
		channel.is_protected = false;
		channel.password = '';
		return (await this.channelRepository.save(channel));
	}

	async change_Password(User_id: number, channel_id: number, password: string) {
		const user = await this.userRepository.findOne({ where: { id: User_id } });
		const channel = await this.channelRepository.findOne({ where: { id: channel_id }, relations: ['owner'] });

		if (!user) throw new Error('Could not find user.');
		if (!channel) throw new Error("Could not find channel.");
		if (user.id !== channel.owner.id) throw new Error('User is not the owner of the channel');

		channel.is_protected = true;
		channel.password = await bcrypt.hash(password, 8);
		return (await this.channelRepository.save(channel));
	}

	async Fetch_admins(channel_id: number): Promise<number[]> {
		const channel = await this.channelRepository.findOne({ where: { id: channel_id } });
		if (!channel)
			return (undefined);
		return (channel.admins);
	}

	async set_Owner(channel_id: number, User_id: number): Promise<Channel> {
		const channel = await this.channelRepository.findOne({ where: { id: channel_id }, relations: ['owner'] });
		const user = await this.userRepository.findOne({ where: { id: User_id } });

		if (!channel || !user)
			return (undefined);
		channel.owner = user;
		if (channel.admins.includes(user.id)) {
			for (let admin of channel.admins) {
				if (admin === user.id) {
					channel.admins.splice(channel.admins.indexOf(user.id), 1);
					break;
				}
			}
		}
		return (await this.channelRepository.save(channel));
	}

	async is_UserInChannel(channel_id: number, User_id: number): Promise<boolean> {
		const user = await this.userRepository.findOne({ where: { id: User_id } });
		const channel = await this.channelRepository.findOne({ where: { id: channel_id } });
		if (!user || !channel)
			return (false);
		const result = await this.userRepository.createQueryBuilder('user')
			.innerJoinAndSelect('user.channels', 'channel', `channel.id = ${channel.id}`)
			.where(`user.id = ${user.id}`)
			.getOne();
		return (!!result);
	}

	async get_CountMessages(User_id: number): Promise<number> {
		const user = await this.userRepository.findOne({ where: { id: User_id }, relations: ['stats'] });
		if (!user)
			return (0);
		return (user.stats.totalMessages);
	}

	async is_UserBan(channel_id: number, User_id: number): Promise<boolean> {
		const channel = await this.channelRepository.findOne({ where: { id: channel_id } });
		for (let id of channel.Banned_Users) {
			if (id == User_id)
				return (true);
		}
		return (false);
	}

	async get_BanList(channel_id: number): Promise<number[]> {
		const channel = await this.channelRepository.createQueryBuilder('channel')
			.leftJoinAndSelect('channel.Banned_Users', 'Banned_Users')
			.where('channel.id = :channel_id', { channel_id })
			.getOne();
		return (channel.Banned_Users);
	}
}
