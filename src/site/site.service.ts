import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { publicImageUrl } from '@app/utils/image-url';
import { HeroBanner } from './entities/hero-banner.entity';
import { HeroSlide } from './entities/hero-slide.entity';
import { StoreSetting } from './entities/store-setting.entity';

export const HERO_DEFAULTS = {
  headline: 'Muebles de Madera Artesanales',
  subheadline:
    'Descubrí piezas atemporales que aportan calidez y elegancia a tu hogar',
  ctaLabel: 'Ver Colección',
  ctaHref: '/shop',
};

export interface PublicSlide {
  id: string;
  imageUrl: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface PublicHero {
  imageUrl: string | null;
  slides: PublicSlide[];
  showText: boolean;
  overlayOpacity: number;
  imagePosition: number;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface HeroImageChange {
  hero: HeroBanner;
  /** Storage key of the replaced file, so the caller can delete it. */
  previousPath: string | null;
}

@Injectable()
export class SiteService {
  constructor(
    @InjectRepository(HeroBanner)
    private readonly heroes: Repository<HeroBanner>,
    @InjectRepository(HeroSlide)
    private readonly slides: Repository<HeroSlide>,
    @InjectRepository(StoreSetting)
    private readonly settings: Repository<StoreSetting>,
  ) {}

  /** The hero is a singleton: always read (and lazily create) the first row. */
  async getHero(): Promise<HeroBanner> {
    const rows = await this.heroes.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });
    if (rows.length > 0) return rows[0];

    return this.heroes.save(
      this.heroes.create({
        ...HERO_DEFAULTS,
        imagePath: null,
      }),
    );
  }

  async updateHero(
    patch: Partial<
      Pick<
        HeroBanner,
        | 'headline'
        | 'subheadline'
        | 'ctaLabel'
        | 'ctaHref'
        | 'showText'
        | 'overlayOpacity'
        | 'imagePosition'
      >
    >,
  ): Promise<HeroBanner> {
    const hero = await this.getHero();
    Object.assign(hero, patch);
    return this.heroes.save(hero);
  }

  async setImage(imagePath: string): Promise<HeroImageChange> {
    const hero = await this.getHero();
    const previousPath = hero.imagePath;
    hero.imagePath = imagePath;
    return { hero: await this.heroes.save(hero), previousPath };
  }

  async clearImage(): Promise<HeroImageChange> {
    const hero = await this.getHero();
    const previousPath = hero.imagePath;
    hero.imagePath = null;
    return { hero: await this.heroes.save(hero), previousPath };
  }

  /** Public URL of a stored image, or null when there is none. */
  imageUrlFor(imagePath: string | null): string | null {
    if (!imagePath) return null;
    // Blob CDN in production, the /api/images proxy on local storage.
    return publicImageUrl({ path: imagePath });
  }

  async toPublic(hero: HeroBanner): Promise<PublicHero> {
    return {
      imageUrl: this.imageUrlFor(hero.imagePath),
      slides: await this.publicSlides(),
      showText: hero.showText,
      overlayOpacity: hero.overlayOpacity,
      imagePosition: hero.imagePosition,
      headline: hero.headline,
      subheadline: hero.subheadline,
      ctaLabel: hero.ctaLabel,
      ctaHref: hero.ctaHref,
    };
  }

  // ----- Carousel slides -----

  async listSlides(): Promise<HeroSlide[]> {
    return this.slides.find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } });
  }

  async activeSlides(): Promise<HeroSlide[]> {
    return this.slides.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async publicSlides(): Promise<PublicSlide[]> {
    const rows = await this.activeSlides();
    return rows.map((slide) => ({
      id: slide.id,
      imageUrl: this.imageUrlFor(slide.imagePath) ?? '',
      headline: slide.headline,
      subheadline: slide.subheadline,
      ctaLabel: slide.ctaLabel,
      ctaHref: slide.ctaHref,
    }));
  }

  async createSlide(patch: Partial<HeroSlide>): Promise<HeroSlide> {
    const count = await this.slides.count();
    return this.slides.save(
      this.slides.create({
        imagePath: patch.imagePath ?? '',
        headline: patch.headline ?? '',
        subheadline: patch.subheadline ?? '',
        ctaLabel: patch.ctaLabel ?? '',
        ctaHref: patch.ctaHref ?? '',
        isActive: patch.isActive ?? true,
        sortOrder: patch.sortOrder ?? count,
      }),
    );
  }

  async updateSlide(id: string, patch: Partial<HeroSlide>): Promise<HeroSlide> {
    const slide = await this.slides.findOne({ where: { id } });
    if (!slide) throw new NotFoundException('Slide no encontrado');
    Object.assign(slide, patch);
    return this.slides.save(slide);
  }

  async deleteSlide(id: string): Promise<{ imagePath: string | null }> {
    const slide = await this.slides.findOne({ where: { id } });
    if (!slide) throw new NotFoundException('Slide no encontrado');
    await this.slides.remove(slide);
    return { imagePath: slide.imagePath };
  }

  // ----- Settings -----

  async getSetting<T = Record<string, unknown>>(
    key: string,
  ): Promise<T | null> {
    const row = await this.settings.findOne({ where: { key } });
    return (row?.value as T) ?? null;
  }

  async updateSetting(
    key: string,
    value: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const row =
      (await this.settings.findOne({ where: { key } })) ??
      this.settings.create({ key, value: {} });
    row.value = { ...(row.value ?? {}), ...value };
    const saved = await this.settings.save(row);
    return saved.value;
  }

  async publicSettings() {
    const [marquee, payments, shipping] = await Promise.all([
      this.getSetting('marquee'),
      this.getSetting('payments'),
      this.getSetting('shipping'),
    ]);
    return {
      marquee: marquee ?? { text: '', isActive: false, speed: 40 },
      payments: payments ?? {
        mercadopago: true,
        transfer: true,
        cash: true,
      },
      shipping: shipping ?? { cost: 0, freeFrom: 0, notes: '' },
    };
  }
}
