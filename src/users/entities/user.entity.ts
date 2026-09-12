import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  CUSTOMER = 'customer',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  APPLE = 'apple',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', nullable: true, select: false }) // 'select: false' prevents password from being selected by default
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider: AuthProvider;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  @Exclude({ toPlainOnly: true })
  verificationToken: string;

  @Column({ type: 'varchar', nullable: true })
  @Exclude({ toPlainOnly: true })
  resetPasswordToken: string;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude({ toPlainOnly: true })
  resetPasswordExpires: Date;

  @Column({ type: 'varchar', nullable: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  dni: string;

  @Column({ type: 'varchar', nullable: true })
  address: string;

  @Column({ type: 'varchar', nullable: true })
  city: string;

  @Column({ type: 'varchar', nullable: true })
  state: string;

  @Column({ type: 'varchar', nullable: true })
  zipCode: string;

  @Column({ type: 'varchar', nullable: true })
  country: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin: Date;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Only hash the password if it has been modified and this is a local auth user
    if (this.password && this.authProvider === AuthProvider.LOCAL) {
      const salt = await bcrypt.genSalt();
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    // If no password set (e.g., Google login) or not a local auth user, always fail password validation
    if (!this.password || this.authProvider !== AuthProvider.LOCAL) {
      return false;
    }
    return await bcrypt.compare(password, this.password);
  }
}
