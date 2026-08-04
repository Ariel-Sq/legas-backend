import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, AuthProvider } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByIdSafe(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findAllPaginated(
    page: number,
    limit: number,
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.usersRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, limit };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .addSelect('user.password')
      .getOne();
  }

  /**
   * Provision a user that signed in through an OAuth provider. No password
   * column is set; `authProvider` is whatever the caller provides (google,
   * facebook, …). If the email is already known, returns the existing user
   * untouched so the OAuth callback is idempotent.
   */
  async createOrFindOAuthUser(dto: {
    email: string;
    firstName: string;
    lastName: string;
    authProvider: User['authProvider'];
  }): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) return existing;

    const user = this.usersRepository.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      authProvider: dto.authProvider,
      isEmailVerified: true,
    });
    return this.usersRepository.save(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    // Handle email change: check if new email already exists
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException(
          `User with email ${updateUserDto.email} already exists`,
        );
      }
    }

    // Update user properties
    Object.assign(user, updateUserDto);

    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.usersRepository.remove(user);
  }

  async findOrCreateFromOAuth(
    email: string,
    firstName: string,
    lastName: string,
    provider: AuthProvider,
  ): Promise<User> {
    // Check if user exists with this email
    let user = await this.findByEmail(email);

    // If user exists, update provider details if they're different
    if (user) {
      if (user.authProvider !== provider) {
        user.authProvider = provider;
        user = await this.usersRepository.save(user);
      }
      return user;
    }

    // If user doesn't exist, create a new one
    const newUser = this.usersRepository.create({
      email,
      firstName,
      lastName,
      authProvider: provider,
      isEmailVerified: true, // OAuth emails are considered verified
    });

    return this.usersRepository.save(newUser);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      lastLogin: new Date(),
    });
  }
}
