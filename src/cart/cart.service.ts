import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ProductVariationsService } from '@app/products/products.service';
import { rewriteCartItemImageUrls } from '@app/utils/image-url';
import { randomUUID as uuidv4 } from 'node:crypto';

const toMoney = (n: number | string) => Math.round(Number(n) * 100) / 100;

/**
 * Service for managing shopping cart operations
 * Handles both anonymous and authenticated users' carts
 */
@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    private productVariationsService: ProductVariationsService,
  ) {}

  async findAll(): Promise<Cart[]> {
    const carts = await this.cartRepository.find({
      relations: [
        'items',
        'items.productVariation',
        'items.productVariation.images',
      ],
    });
    carts.forEach((c) => rewriteCartItemImageUrls(c.items));
    return carts;
  }

  private withImageUrls(cart: Cart): Cart {
    rewriteCartItemImageUrls(cart.items);
    return cart;
  }

  /**
   * Get or create a cart for a user or session
   * @param userId - Optional user ID for authenticated users
   * @param sessionId - Optional session ID for anonymous users
   * @returns The cart instance
   */
  async getOrCreateCart(userId?: string, sessionId?: string): Promise<Cart> {
    let cart: Cart | null = null;

    if (userId) {
      // Find cart by user ID
      cart = await this.cartRepository.findOne({
        where: { userId },
        relations: [
          'items',
          'items.productVariation',
          'items.productVariation.images',
        ],
      });
    } else if (sessionId) {
      // Find cart by session ID (anonymous users)
      cart = await this.cartRepository.findOne({
        where: { sessionId },
        relations: [
          'items',
          'items.productVariation',
          'items.productVariation.images',
        ],
      });
    }

    // Create a new cart if none exists
    if (!cart) {
      const newCart = new Cart();
      newCart.userId = userId || null;
      newCart.sessionId = sessionId || (userId ? null : uuidv4()); // Generate new sessionId if needed
      newCart.items = [];
      newCart.totalItems = 0;
      newCart.totalPrice = 0;

      cart = await this.cartRepository.save(newCart);
    }

    return this.withImageUrls(cart);
  }

  /**
   * Add a product to the cart.
   *
   * NOTE: stock check here is advisory (UX hint only). Authoritative
   * reservation happens in PaymentsService.createCheckoutPreferenceFromCart
   * under a pessimistic_write lock + atomic decrement. Two carts can both
   * pass this check — the loser will fail at checkout, not here.
   *
   * @param userId - Optional user ID for authenticated users
   * @param sessionId - Optional session ID for anonymous users
   * @param addToCartDto - DTO with product ID and quantity
   * @returns Updated cart
   */
  async addToCart(
    userId: string | undefined,
    sessionId: string | undefined,
    addToCartDto: AddToCartDto,
  ): Promise<Cart> {
    const { productId, quantity } = addToCartDto;

    // Verify product variation exists
    const productVariation =
      await this.productVariationsService.findByIdWithDetails(productId);
    if (!productVariation) {
      throw new NotFoundException(
        `Product variation with ID ${productId} not found`,
      );
    }

    // Check stock availability - comprehensive validation
    if (productVariation.stock <= 0) {
      throw new BadRequestException(
        `Product ${productVariation.name} is out of stock`,
      );
    }

    // Check if there's enough stock for the requested quantity
    if (productVariation.stock < quantity) {
      throw new BadRequestException(
        `Only ${productVariation.stock} units available for ${productVariation.name}. Requested: ${quantity}`,
      );
    }

    // Get or create cart
    const cart = await this.getOrCreateCart(userId, sessionId);

    // Check if product variation is already in cart
    const existingItem = cart.items.find(
      (item) => item.productVariationId === productId,
    );

    if (existingItem) {
      // Update quantity if item exists
      existingItem.quantity += quantity;
      const unitPrice = await this.productVariationsService.getPriceForQuantity(
        productId,
        existingItem.quantity,
      );
      existingItem.price = toMoney(unitPrice * existingItem.quantity);
      await this.cartItemRepository.save(existingItem);
    } else {
      // Create new item if it doesn't exist
      const cartItem = new CartItem();
      cartItem.cartId = cart.id;
      cartItem.productVariationId = productId;
      cartItem.quantity = quantity;
      const unitPrice = await this.productVariationsService.getPriceForQuantity(
        productId,
        quantity,
      );
      cartItem.price = toMoney(unitPrice * quantity);
      cartItem.productVariation = productVariation;

      const savedItem = await this.cartItemRepository.save(cartItem);
      cart.items.push(savedItem);
    }

    // Update cart totals
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalPrice = toMoney(
      cart.items.reduce((sum, item) => sum + Number(item.price), 0),
    );

    const saved = await this.cartRepository.save(cart);
    return this.withImageUrls(saved);
  }

  /**
   * Update quantity of a product in the cart
   * @param cartId - Cart ID
   * @param itemId - Cart item ID to update
   * @param updateCartItemDto - DTO with new quantity
   * @returns Updated cart
   */
  async updateCartItem(
    cartId: string,
    itemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<Cart> {
    const { quantity } = updateCartItemDto;

    const cart = await this.cartRepository.findOne({
      where: { id: cartId },
      relations: [
        'items',
        'items.productVariation',
        'items.productVariation.images',
      ],
    });

    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    const cartItem = cart.items.find((item) => item.id === itemId);

    if (!cartItem) {
      throw new NotFoundException(`Item with ID ${itemId} not found in cart`);
    }

    // Check stock availability for new quantity
    const productVariation =
      await this.productVariationsService.findByIdWithDetails(
        cartItem.productVariationId,
      );

    if (!productVariation) {
      throw new NotFoundException(
        `Product variation with ID ${cartItem.productVariationId} not found`,
      );
    }

    if (productVariation.stock < quantity) {
      throw new BadRequestException(
        `Only ${productVariation.stock} units available for ${productVariation.name}. Requested: ${quantity}`,
      );
    }

    // Update quantity and price
    cartItem.quantity = quantity;
    const unitPrice = await this.productVariationsService.getPriceForQuantity(
      cartItem.productVariationId,
      quantity,
    );
    cartItem.price = toMoney(unitPrice * quantity);

    await this.cartItemRepository.save(cartItem);

    // Update cart totals
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalPrice = toMoney(
      cart.items.reduce((sum, item) => sum + Number(item.price), 0),
    );

    const saved = await this.cartRepository.save(cart);
    return this.withImageUrls(saved);
  }

  // Remove a product from the cart
  async removeFromCart(cartId: string, itemId: string): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { id: cartId },
      relations: [
        'items',
        'items.productVariation',
        'items.productVariation.images',
      ],
    });

    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    const itemIndex = cart.items.findIndex((item) => item.id === itemId);

    if (itemIndex === -1) {
      throw new NotFoundException(
        `Item with ID ${itemId} not found in the cart`,
      );
    }

    // Remove the item from the array first to avoid relationship issues
    cart.items.splice(itemIndex, 1);

    // Then delete from database
    await this.cartItemRepository.delete(itemId);

    // Update cart totals
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalPrice = toMoney(
      cart.items.reduce((sum, item) => sum + Number(item.price), 0),
    );

    const saved = await this.cartRepository.save(cart);
    return this.withImageUrls(saved);
  }

  async clearAll(): Promise<void> {
    await this.cartItemRepository.createQueryBuilder().delete().execute();
    await this.cartRepository.createQueryBuilder().delete().execute();
  }

  async clearCart(cartId: string): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { id: cartId },
    });

    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    // Remove all items
    await this.cartItemRepository.delete({ cartId });

    // Update cart
    cart.items = [];
    cart.totalItems = 0;
    cart.totalPrice = 0;

    const saved = await this.cartRepository.save(cart);
    return this.withImageUrls(saved);
  }

  /**
   * Delete anonymous carts untouched for `maxAgeDays` (default matches the
   * 30-day session cookie). When an anon logs in, cart lookup switches to
   * userId and the sessionId-keyed cart is orphaned forever — this is the
   * periodic sweep (daily cron). cart_items cascade on delete. Age compares
   * against the DB clock (naive timestamp columns + JS Date params skew
   * across timezones).
   */
  async cleanupOrphanAnonymousCarts(maxAgeDays = 30): Promise<number> {
    const result = await this.cartRepository
      .createQueryBuilder()
      .delete()
      .where('"userId" IS NULL')
      .andWhere('"updatedAt" < now() - make_interval(days => :days)', {
        days: maxAgeDays,
      })
      .execute();
    return result.affected ?? 0;
  }
}
