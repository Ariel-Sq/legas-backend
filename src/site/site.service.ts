import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeroBanner } from './entities/hero-banner.entity';

export const HERO_DEFAULTS = {
  headline: 'Muebles de Madera Artesanales',
  subheadline:
    'Descubrí piezas atemporales que aportan calidez y elegancia a tu hogar',
  ctaLabel: 'Ver Colección',
  ctaHref: '/shop',
};

export interface PublicHero {
  imageUrl: string | null;
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
      Pick<HeroBanner, 'headline' | 'subheadline' | 'ctaLabel' | 'ctaHref'>
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
    const base = (process.env.BACKEND_URL ?? '').replace(/\/$/, '');
    return `${base}/api/images/${imagePath}`;
  }

  toPublic(hero: HeroBanner): PublicHero {
    return {
      imageUrl: this.imageUrlFor(hero.imagePath),
      headline: hero.headline,
      subheadline: hero.subheadline,
      ctaLabel: hero.ctaLabel,
      ctaHref: hero.ctaHref,
    };
  }
}
