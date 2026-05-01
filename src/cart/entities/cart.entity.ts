import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '@app/users/entities/user.entity';
import { CartItem } from './cart-item.entity';

/**
 * Cart entity to store shopping cart data
 * Can be associated with either a registered user or an anonymous session
 */
@Entity('carts')
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, type: 'varchar' })
  userId: string | null;

  @Column({ nullable: true, type: 'varchar' })
  sessionId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => CartItem, (cartItem: CartItem) => cartItem.cart, {
    cascade: true,
    eager: true,
  })
  items: CartItem[];

  @Column({ default: 0 })
  totalItems: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalPrice: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
