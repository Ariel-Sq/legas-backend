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
import { OrderItem } from './order-item.entity';
import { OrderPaymentDetail } from './order-payment-detail.entity';
import { User } from '@app/users/entities/user.entity';

export enum OrderStatus {
  PROCESSING_PAYMENT = 'processing_payment',
  PAID_PREPARING = 'paid_preparing',
  PAID_READY_TO_SHIP = 'paid_ready_to_ship',
  PAID_SHIPPED = 'paid_shipped',
  PAID_DELIVERED = 'paid_delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  sessionId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PROCESSING_PAYMENT,
  })
  status: OrderStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'varchar', nullable: true })
  customerEmail: string | null;

  @Column({ type: 'varchar', nullable: true })
  customerPhone: string | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => OrderPaymentDetail, (paymentDetail) => paymentDetail.order, {
    cascade: true,
  })
  paymentDetails: OrderPaymentDetail[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
