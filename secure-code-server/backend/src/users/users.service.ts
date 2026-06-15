import { Injectable, ConflictException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Role } from './enums/role.enum';
import { Status } from './enums/status.enum';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async onApplicationBootstrap() {
    await this.seedUsers();
  }

  private async seedUsers() {
    const roles = [Role.Admin];
    for (const role of roles) {
      const username = role.toLowerCase();
      const existing = await this.findByUsername(username);
      if (!existing) {
        // Provide a default password and backup code for the admin
        const password = role === Role.Admin ? 'Admin@123' : username;
        await this.create(username, password, role, Status.Active, undefined, undefined, '123456');
        console.log(`[Seed] Seeded default user: ${username}`);
      } else if (!existing.backupCode && username === 'admin') {
        existing.backupCode = '123456';
        await this.usersRepository.save(existing);
        console.log(`[Seed] Updated existing admin user with default backup code`);
      }
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    const users = await this.usersRepository.find({
      relations: { projects: true },
      order: { createdAt: 'DESC' }
    });

    return users.map(user => {
      const { passwordHash, ...rest } = user;
      return rest as User;
    });
  }

  async create(
    username: string,
    passwordPlain: string,
    roleInput: string = Role.Viewer,
    statusInput: string = Status.Active,
    allowIp?: string,
    publicKey?: string,
    backupCode?: string
  ): Promise<User> {
    const existing = await this.findByUsername(username);
    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordPlain, salt);

    const roleString = roleInput.trim().charAt(0).toUpperCase() + roleInput.trim().slice(1).toLowerCase();
    let role = Role.Viewer;
    if (Object.values(Role).includes(roleString as Role)) {
      role = roleString as Role;
    }

    const statusString = statusInput.trim().charAt(0).toUpperCase() + statusInput.trim().slice(1).toLowerCase();
    let status = Status.Active;
    if (Object.values(Status).includes(statusString as Status)) {
      status = statusString as Status;
    }

    const newUser = this.usersRepository.create({
      username,
      passwordHash,
      role,
      status,
      allowIp,
      publicKey,
      backupCode: backupCode || '123456',
    });
    return this.usersRepository.save(newUser);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (user?.username === 'admin') {
      throw new ConflictException('The master admin user cannot be deleted.');
    }
    try {
      const result = await this.usersRepository.delete(id);
      if (result.affected === 0) {
        throw new Error('User not found');
      }
    } catch (err: any) {
      if (err.code === '23503' || err.message.includes('foreign key constraint')) {
        throw new ConflictException('This user is currently assigned to one or more projects. Please unassign them from all projects before deleting.');
      }
      throw err;
    }
  }

  async updateProfile(userId: string, updates: { newUsername?: string; newPassword?: string }): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    if (updates.newUsername) {
      const existing = await this.findByUsername(updates.newUsername);
      if (existing && existing.id !== userId) {
        throw new ConflictException('Username already taken');
      }
      user.username = updates.newUsername;
    }

    if (updates.newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(updates.newPassword, salt);
    }

    return this.usersRepository.save(user);
  }

  async updateBackupCode(userId: string, newBackupCode: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    user.backupCode = newBackupCode;
    return this.usersRepository.save(user);
  }

  async adminUpdateUser(id: string, updates: { username?: string, role?: string, status?: string, allowIp?: string, publicKey?: string }): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new Error('User not found');

    if (updates.username) {
      const existing = await this.findByUsername(updates.username);
      if (existing && existing.id !== id) {
        throw new ConflictException('Username already taken');
      }
      user.username = updates.username;
    }

    if (updates.role) {
      const roleString = updates.role.charAt(0).toUpperCase() + updates.role.slice(1).toLowerCase();
      if (Object.values(Role).includes(roleString as Role)) {
        user.role = roleString as Role;
      }
    }

    if (updates.status) {
      const statusString = updates.status.charAt(0).toUpperCase() + updates.status.slice(1).toLowerCase();
      if (Object.values(Status).includes(statusString as Status)) {
        user.status = statusString as Status;
      }
    }

    if (updates.allowIp !== undefined) user.allowIp = updates.allowIp;
    if (updates.publicKey !== undefined) user.publicKey = updates.publicKey;

    return this.usersRepository.save(user);
  }

  async getStats() {
    const qb = this.usersRepository.createQueryBuilder('user');
    qb.select('user.role', 'role');
    qb.addSelect('COUNT(user.id)', 'count');
    qb.groupBy('user.role');

    const results = await qb.getRawMany();

    // Reduce array into an object: { admin: 1, developer: 1, viewer: 1 }
    const roleCounts = results.reduce((acc, curr) => {
      const normalizedRole = curr.role ? curr.role.toLowerCase() : '';
      if (normalizedRole) acc[normalizedRole] = parseInt(curr.count, 10);
      return acc;
    }, { admin: 0, developer: 0, viewer: 0 });

    const onlineCount = await this.usersRepository.count({ where: { status: Status.Active } });

    return {
      roles: roleCounts,
      online: onlineCount,
    };
  }
}
