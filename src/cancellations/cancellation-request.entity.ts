import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * A consumer's purchase-revocation request submitted through the "botón de
 * arrepentimiento" (Resolución 424/2020). The `code` is the trámite
 * identifier the provider must hand back to the consumer; processing is
 * done by the admin via chat (no admin endpoints by design).
 */
@Entity('cancellation_requests')
@Index(['status'])
export class CancellationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
