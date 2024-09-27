import { Injectable, NotAcceptableException, ValidationError } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { AuthRegisterDto } from 'src/auth/dtos/auth.dto';
import { AuthLogin42Dto } from 'src/auth/dtos/auth42.dto';
import { StatsDetail } from 'src/stats/stats.entity';
import { validate } from 'class-validator';
import { Channel } from 'src/chat/entities/channel.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private usersRepository: Repository<User>,
		@InjectRepository(Channel)
		private channelRepository: Repository<Channel>,
	) { }

	async get_ErrorMsg(errors: ValidationError[]): Promise<string> {
		let res: string = "";
		if (errors[0]["property"] === "email")
			res += "Email ";
		else if (errors[0]["property"] === "password")
			res += "Password ";
		return (res += "invalide !");
	}

	getPartialUser(user: User): Partial<User> {
		return {
			id: user.id,
			email: user.email,
			name: user.name,
			avatar_Link: user.avatar_Link,
			stats: user.stats,
		}
	}
	
	getAllUsers(): Promise<string[]> {
		const names = this.usersRepository
		.createQueryBuilder('entity')
		.select('entity.name', 'name')
		.getRawMany();
		return names.then(names => names.map((res) => res.name))
	}
	
	async getByEmail(email: string): Promise<User> {
		const retUser = await this.usersRepository.findOne({ where: { email: email } });
		return (retUser);
	}

	async fetchByName(name: string): Promise<User> {
		const retUser = await this.usersRepository.findOne({ where: { name: name } });
		return (retUser);
	}

	async get_ById(id: number): Promise<User> {
		const retUser = await this.usersRepository.findOne({ where: { id: id } });
		return (retUser);
	}
	
	async getEmailByUsername(username: string): Promise<string> {
		const user = (await this.usersRepository.findOne({ where: { name: username } }));
		if (!user)
			throw new NotAcceptableException('User not found');
		return (user.email);
	}

	async saveUser(user: Partial<User>) {
		await this.usersRepository.save(user);
	}

	async get_JoinedChannels(User_id: number): Promise<Channel[] | null> {
		const user = await this.usersRepository.findOne({ where: { id: User_id }, relations: ['channels'] });
		if (!user)
			return (null);
		return (user.channels);
	}

	async get_BlockList(User_id: number) {
		if (!User_id)
			return ([]);
		let user = await this.usersRepository.findOne({ where: { id: User_id } });
		return (user.block_list);
	}

	async get_LeaderBoard() {
		const users = (await this.usersRepository.find()).map((user) => this.getPartialUser(user));
		users.sort((a, b) => b.stats.mmr - a.stats.mmr);
		return (users);
	}
	
	async Create_user(user: AuthRegisterDto): Promise<User> {
		const errors: ValidationError[] = await validate(user);

		if (errors.length) throw new NotAcceptableException(await this.get_ErrorMsg(errors));
		if (await this.getByEmail(user.email) != null) throw new NotAcceptableException('E-mail already exists');
		if (await this.fetchByName(user.name) != null) throw new NotAcceptableException('Username already used !');
		
		const newUser = await this.usersRepository.create(user);
		newUser.stats = new StatsDetail();
		await this.usersRepository.save(newUser);
		this.updatePictureLink(user.email);
		return newUser;
	}
	
	async createUser42(data: AuthLogin42Dto): Promise<User> {
		let i: number = 1;
		while (await this.fetchByName(data.name) != null)
			data.name += i++;
		data.password = Math.random().toString(36).slice(-8);
		const user = await this.usersRepository.create(data);
		user.stats = new StatsDetail();
		await this.usersRepository.save(user);
		return user;
	}
	
	async set2faSecret(secret: string, id: number) {
		const user = await this.get_ById(id);
		user.auth2fSecret = secret;
		await this.usersRepository.save(user);
	}

	async enableTwoFactorAuth(id: number) {
		const user = await this.get_ById(id);
		user.auth2f = true;
		this.usersRepository.save(user);
	}

	async disableTwoFactorAuth(id: number) {
		const user = await this.get_ById(id);
		user.auth2f = false;
		this.usersRepository.save(user);
	}

	async updatePictureLink(email: string, link: string = "http://" + process.env.HOST + ":3000/avatar/oop.jpeg") {
		const user = await this.getByEmail(email);
		user.avatar_Link = link;
		await this.usersRepository.save(user);
	}

	async Update_username(email: string, username: string) {
		const user = await this.getByEmail(email);
		if (await this.fetchByName(username) != null)
			return (false);
		user.name = username;
		await this.usersRepository.save(user);
		return (true);
	}



	async add_UserToChannel(User_id: number, channel_id: number, password: string) {
		const user = await this.usersRepository.findOne({ where: { id: User_id }, relations: ['channels'] });
		const channel = await this.channelRepository.findOne({ where: { id: channel_id } });
		if (password === undefined)
			return;

		for (let banned of channel.Banned_Users) {
			if (banned == User_id)
				throw new Error('User banned.');
		}
		if (channel.is_protected && await bcrypt.compare(password, channel.password) === false)
			throw new Error('Bad password.');
		user.channels.push(channel);
		await this.usersRepository.save(user);
	}

	async Rm_UserFromChannel(User_id: number, channel_id: number) {
		const user = await this.usersRepository.findOne({ where: { id: User_id }, relations: ['channels'] });
		const channel = await this.channelRepository.findOne({ where: { id: channel_id }, relations: ['owner'] });
		user.channels = user.channels.filter((c) => c.id !== channel.id);
		let users = await this.usersRepository.createQueryBuilder('user')
			.leftJoinAndSelect('user.channels', 'channel')
			.where('channel.id = ' + channel.id)
			.getMany();
		const Users_id: number[] = users.map((user) => user.id);
		let is_inChannel: boolean = false;
		for (let id of Users_id) {
			if (id == User_id) {
				is_inChannel = true;
				break;
			}
		}
		if (!is_inChannel) return;
		if (!(users.length - 1)) {
			await this.channelRepository.delete(channel.id);
			return (null);
		}
		if (user.id === channel.owner.id) {
			if (channel.admins.length) {
				let idx = Math.floor(Math.random() * (channel.admins.length));
				channel.owner = await this.get_ById(channel.admins[idx]);
			}
			else {
				let idx = Math.floor(Math.random() * (users.length));
				while (users[idx].id === user.id)
					idx = Math.floor(Math.random() * (users.length));
				channel.owner = users[idx];
			}
			await this.channelRepository.save(channel);
		}
		return (await this.usersRepository.save(user));
	}

	async kick_UserFromChannel(User_id: number, channel_id: number) {
		const user = await this.usersRepository.findOne({ where: { id: User_id } });
		const channel = await this.channelRepository.findOne({ where: { id: channel_id }, relations: ['owner'] });
		const channel_users = await this.usersRepository.createQueryBuilder('user')
			.leftJoinAndSelect('user.channels', 'channel')
			.where('channel.id = ' + channel.id)
			.getMany();

		if (!user) return;
		if (user.id === channel.owner.id) throw new Error('You cannot kick the owner of the channel.');

		for (let channel_user of channel_users)
			if (channel_user.id === user.id)
				return (await this.Rm_UserFromChannel(user.id, channel.id));
		throw new Error("This user is not in the channel !");
	}

	async Ban_UserFromChannel(User_id: number, channel_id: number) {
		const user = await this.usersRepository.findOne({ where: { id: User_id } });
		const channel = await this.channelRepository.findOne({ where: { id: channel_id }, relations: ['owner'] });

		if (!user || !channel)
			return;
		if (user.id === channel.owner.id)
			throw new Error('You cannot ban the channel owner !');
		for (let ban of channel.Banned_Users) {
			if (ban == user.id) {
				throw new Error('This user is already banned !');
			}
		}
		await this.Rm_UserFromChannel(User_id, channel_id);
		channel.Banned_Users.push(user.id);
		await this.channelRepository.save(channel);
	}

	async Unban_UserFromChannel(User_id: number, channel_id: number) {
		const user = await this.usersRepository.findOne({ where: { id: User_id } });
		const channel = await this.channelRepository.findOne({ where: { id: channel_id } });

		if (!user || !channel || channel.is_private) return;
		channel.Banned_Users = channel.Banned_Users.filter((toRemove) => toRemove !== user.id);
		await this.channelRepository.save(channel);
	}


	async block_User(User_id: number, blockId: number) {
		const user = await this.usersRepository.findOne({ where: { id: User_id } });
		if (!user.block_list.includes(blockId, 0)) {
			user.block_list.push(blockId);
			await this.usersRepository.save(user);
		}
	}

	async Unblock_User(User_id: number, unblockId: number) {
		const user = await this.usersRepository.findOne({ where: { id: User_id } });
		if (user.block_list.includes(unblockId, 0)) {
			user.block_list = user.block_list.filter((elem) => elem != unblockId);
			await this.usersRepository.save(user);
		}
	}

}
