/* eslint-disable no-console */
/**
 * Seed the Legas Muebles catalogue: categories, product templates,
 * variations (size → price) and images.
 *
 * Source: legas/catalogo.md (láminas 01–17). Prices in ARS, cash/transfer.
 * Business rules baked in:
 * - One template per model; one variation per size (size drives price).
 * - Free-choice options that do NOT change price (fabric, tint, lacquer
 *   color) live in description/specifications, not as SKUs ("option B").
 * - stock = 10 on every variation (made-to-order placeholder).
 * - All variations of a lámina share the same catalogue photo for now.
 *   TODO: replace with per-model photos when Froid provides them.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-legas.ts
 *
 * Idempotent: templates are skipped when their slug already exists,
 * categories are upserted by slug.
 */
import dataSource from '../src/typeorm.config';
import { Category } from '../src/categories/entities/category.entity';
import { ProductTemplate } from '../src/products/entities/product-template.entity';
import { ProductVariation } from '../src/products/entities/product-variation.entity';
import { ProductImage } from '../src/products/entities/product-image.entity';

const STOCK = 10;
const IMAGE_DIR = 'products/legas';

interface VariationDef {
  /** Human-readable size, e.g. "100 cm" or "140x90 cm" */
  medida: string;
  precio: number;
}

interface TemplateDef {
  slug: string;
  name: string;
  description: string;
  specifications: Record<string, string>;
  /** category slug */
  category: string;
  material: string;
  /** photo filename inside IMAGE_DIR */
  photo: string;
  featured?: boolean;
  variations: VariationDef[];
}

const CATEGORIES: { name: string; slug: string; sort: number }[] = [
  { name: 'Mesas de comedor', slug: 'mesas-de-comedor', sort: 1 },
  { name: 'Sillas', slug: 'sillas', sort: 2 },
  { name: 'Racks', slug: 'racks', sort: 3 },
  { name: 'Vajilleros', slug: 'vajilleros', sort: 4 },
  { name: 'Escritorios', slug: 'escritorios', sort: 5 },
  { name: 'Cómodas', slug: 'comodas', sort: 6 },
  { name: 'Mesas ratonas', slug: 'mesas-ratonas', sort: 7 },
  { name: 'Mesas de luz', slug: 'mesas-de-luz', sort: 8 },
  { name: 'Respaldos de cama', slug: 'respaldos-de-cama', sort: 9 },
  { name: 'Pie de cama', slug: 'pie-de-cama', sort: 10 },
  { name: 'Recibidores', slug: 'recibidores', sort: 11 },
  { name: 'Percheros', slug: 'percheros', sort: 12 },
  { name: 'Espejos', slug: 'espejos', sort: 13 },
];

const ACABADO = 'Laca poliuretánica';
const TINTE_ALAMO = 'Petiribí o nogal, a elección (se coordina al confirmar el pedido)';

const TEMPLATES: TemplateDef[] = [
  // ── Lámina 01 — Mesas de comedor de petiribí macizo ──────────────────
  {
    slug: 'mesa-comedor-gerbasoni-petiribi-pata-cruz',
    name: 'Mesa Gerbasoni — petiribí macizo (pata cruz)',
    description:
      'Mesa de comedor redonda de petiribí macizo, modelo Gerbasoni con pata cruz. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Petiribí macizo', Forma: 'Redonda', Pata: 'Cruz', Acabado: ACABADO },
    category: 'mesas-de-comedor',
    material: 'Petiribí macizo',
    photo: '01-mesas-comedor-petiribi.jpg',
    featured: true,
    variations: [
      { medida: '100 cm', precio: 949000 },
      { medida: '120 cm', precio: 1049000 },
      { medida: '140 cm', precio: 1199000 },
    ],
  },
  {
    slug: 'mesa-comedor-gerbasoni-petiribi-pata-central',
    name: 'Mesa Gerbasoni — petiribí macizo (pata central de tablillas)',
    description:
      'Mesa de comedor redonda de petiribí macizo, modelo Gerbasoni con pata central de tablillas. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Petiribí macizo', Forma: 'Redonda', Pata: 'Central de tablillas', Acabado: ACABADO },
    category: 'mesas-de-comedor',
    material: 'Petiribí macizo',
    photo: '01-mesas-comedor-petiribi.jpg',
    variations: [
      { medida: '100 cm', precio: 1099000 },
      { medida: '120 cm', precio: 1199000 },
      { medida: '140 cm', precio: 1329000 },
    ],
  },
  {
    slug: 'mesa-comedor-tradicional-petiribi',
    name: 'Mesa Tradicional — petiribí macizo',
    description:
      'Mesa de comedor rectangular de petiribí macizo, modelo Tradicional. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Petiribí macizo', Forma: 'Rectangular', Acabado: ACABADO },
    category: 'mesas-de-comedor',
    material: 'Petiribí macizo',
    photo: '01-mesas-comedor-petiribi.jpg',
    variations: [
      { medida: '140x90 cm', precio: 1099000 },
      { medida: '160x90 cm', precio: 1199000 },
      { medida: '180x90 cm', precio: 1299000 },
      { medida: '200x100 cm', precio: 1399000 },
    ],
  },

  // ── Lámina 02 — Mesas de comedor de álamo macizo ─────────────────────
  {
    slug: 'mesa-comedor-gerbasoni-alamo-pata-central',
    name: 'Mesa Gerbasoni — álamo macizo (pata central de tablillas)',
    description:
      'Mesa de comedor redonda de álamo macizo, modelo Gerbasoni con pata central de tablillas. Tinte a elección: petiribí o nogal. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo macizo', Forma: 'Redonda', Pata: 'Central de tablillas', Tinte: TINTE_ALAMO, Acabado: ACABADO },
    category: 'mesas-de-comedor',
    material: 'Álamo',
    photo: '02-mesas-comedor-alamo.jpg',
    variations: [
      { medida: '100 cm', precio: 459000 },
      { medida: '120 cm', precio: 499000 },
      { medida: '140 cm', precio: 549000 },
    ],
  },
  {
    slug: 'mesa-comedor-griega-alamo',
    name: 'Mesa Griega — álamo macizo (pata en V)',
    description:
      'Mesa de comedor rectangular de álamo macizo, modelo Griega con pata en V. Tinte a elección: petiribí o nogal. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo macizo', Forma: 'Rectangular', Pata: 'En V', Tinte: TINTE_ALAMO, Acabado: ACABADO },
    category: 'mesas-de-comedor',
    material: 'Álamo',
    photo: '02-mesas-comedor-alamo.jpg',
    variations: [
      { medida: '140x90 cm', precio: 389000 },
      { medida: '160x90 cm', precio: 429000 },
      { medida: '180x90 cm', precio: 489000 },
      { medida: '200x100 cm', precio: 529000 },
    ],
  },
  {
    slug: 'mesa-comedor-ovalada-alamo',
    name: 'Mesa Ovalada — álamo macizo',
    description:
      'Mesa de comedor ovalada de álamo macizo. Tinte a elección: petiribí o nogal. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo macizo', Forma: 'Ovalada', Tinte: TINTE_ALAMO, Acabado: ACABADO },
    category: 'mesas-de-comedor',
    material: 'Álamo',
    photo: '02-mesas-comedor-alamo.jpg',
    variations: [
      { medida: '140x90 cm', precio: 399000 },
      { medida: '160x90 cm', precio: 449000 },
      { medida: '180x90 cm', precio: 499000 },
      { medida: '200x100 cm', precio: 549000 },
    ],
  },

  // ── Lámina 03 — Mesas con base de petiribí (tapa microcemento/enchapada) ──
  {
    slug: 'mesa-comedor-redonda-microcemento',
    name: 'Mesa redonda — base petiribí, tapa microcemento',
    description:
      'Mesa de comedor redonda con base de petiribí macizo y tapa de microcemento. Acabado en laca poliuretánica.',
    specifications: { Base: 'Petiribí macizo', Tapa: 'Microcemento', Forma: 'Redonda', Acabado: ACABADO },
    category: 'mesas-de-comedor',
    material: 'Petiribí + microcemento',
    photo: '03-mesas-base-petiribi-microcemento.jpg',
    variations: [
      { medida: '100 cm', precio: 459000 },
      { medida: '120 cm', precio: 499000 },
      { medida: '140 cm', precio: 599000 },
    ],
  },
  {
    slug: 'mesa-comedor-trapecio-microcemento',
    name: 'Mesa Trapecio — base petiribí, tapa microcemento',
    description:
      'Mesa de comedor rectangular modelo Trapecio con base de petiribí macizo y tapa de microcemento. Acabado en laca poliuretánica.',
    specifications: { Base: 'Petiribí macizo', Tapa: 'Microcemento', Forma: 'Rectangular', Acabado: ACABADO },
    category: 'mesas-de-comedor',
    material: 'Petiribí + microcemento',
    photo: '03-mesas-base-petiribi-microcemento.jpg',
    variations: [
      { medida: '140x90 cm', precio: 549000 },
      { medida: '160x90 cm', precio: 599000 },
      { medida: '180x90 cm', precio: 649000 },
      { medida: '200x100 cm', precio: 699000 },
    ],
  },
  {
    slug: 'mesa-comedor-trapecio-enchapada-petiribi',
    name: 'Mesa Trapecio — enchapada en petiribí',
    description:
      'Mesa de comedor rectangular modelo Trapecio, enchapada en petiribí. Acabado en laca poliuretánica.',
    specifications: { Material: 'Enchapado petiribí', Forma: 'Rectangular', Acabado: ACABADO },
    category: 'mesas-de-comedor',
    material: 'Enchapado petiribí',
    photo: '03-mesas-base-petiribi-microcemento.jpg',
    variations: [
      { medida: '140x90 cm', precio: 649000 },
      { medida: '160x90 cm', precio: 749000 },
      { medida: '180x90 cm', precio: 799000 },
      { medida: '200x100 cm', precio: 859000 },
    ],
  },

  // ── Lámina 04 — Sillas de petiribí ────────────────────────────────────
  ...(
    [
      { slug: 'silla-bali-madera', name: 'Silla Bali Madera', precio: 169000, tapizada: false, featured: false },
      { slug: 'silla-bali-tapizada', name: 'Silla Bali Tapizada', precio: 179000, tapizada: true, featured: true },
      { slug: 'silla-bali-hilo-kraft', name: 'Silla Bali Hilo Kraft', precio: 229000, tapizada: false, featured: false },
      { slug: 'silla-ibiza-tapizada', name: 'Silla Ibiza (tapizada)', precio: 219000, tapizada: true, featured: false },
      { slug: 'silla-moller-hilo-kraft', name: 'Silla Moller Hilo Kraft', precio: 229000, tapizada: false, featured: false },
      { slug: 'silla-palermo-tapizada', name: 'Silla Palermo (tapizada)', precio: 229000, tapizada: true, featured: false },
    ] as const
  ).map(
    (s): TemplateDef => ({
      slug: s.slug,
      name: s.name,
      description:
        `${s.name} de madera de petiribí. Acabado en laca poliuretánica.` +
        (s.tapizada
          ? ' Telas de lino y pana, colores a elección — se coordinan al confirmar el pedido.'
          : s.slug.includes('hilo-kraft')
            ? ' Asiento de hilo kraft.'
            : ''),
      specifications: {
        Madera: 'Petiribí',
        Acabado: ACABADO,
        ...(s.tapizada
          ? { Tapizado: 'Lino o pana, colores a elección (se coordina al confirmar el pedido)' }
          : {}),
        ...(s.slug.includes('hilo-kraft') ? { Asiento: 'Hilo kraft' } : {}),
      },
      category: 'sillas',
      material: 'Petiribí',
      photo: '04-sillas-petiribi.jpg',
      featured: s.featured,
      variations: [{ medida: 'Única', precio: s.precio }],
    }),
  ),

  // ── Lámina 05 — Percheros de álamo ────────────────────────────────────
  {
    slug: 'perchero-alamo-simple',
    name: 'Perchero de álamo — simple',
    description: 'Perchero de álamo, modelo simple. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Acabado: ACABADO },
    category: 'percheros',
    material: 'Álamo',
    photo: '05-percheros-alamo.jpg',
    variations: [{ medida: '170x60 cm', precio: 189000 }],
  },
  {
    slug: 'perchero-alamo-cajon',
    name: 'Perchero de álamo — con cajón',
    description: 'Perchero de álamo con un cajón. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Cajones: '1', Acabado: ACABADO },
    category: 'percheros',
    material: 'Álamo',
    photo: '05-percheros-alamo.jpg',
    variations: [
      { medida: '170x60x40 cm', precio: 279000 },
      { medida: '180x70x40 cm', precio: 299000 },
    ],
  },

  // ── Lámina 06 — Racks enchapados en petiribí ─────────────────────────
  {
    slug: 'rack-enchapado-petiribi-2-puertas-estante',
    name: 'Rack enchapado en petiribí — dos puertas y un estante',
    description: 'Rack para TV enchapado en petiribí, con dos puertas y un estante. Acabado en laca poliuretánica.',
    specifications: { Material: 'Enchapado petiribí', Puertas: '2', Estantes: '1', Acabado: ACABADO },
    category: 'racks',
    material: 'Enchapado petiribí',
    photo: '06-rack-enchapado-petiribi.jpg',
    variations: [
      { medida: '160x70 cm', precio: 749000 },
      { medida: '180x70 cm', precio: 799000 },
      { medida: '200x70 cm', precio: 849000 },
    ],
  },
  {
    slug: 'rack-enchapado-petiribi-4-puertas',
    name: 'Rack enchapado en petiribí — cuatro puertas',
    description: 'Rack para TV enchapado en petiribí, con cuatro puertas. Acabado en laca poliuretánica.',
    specifications: { Material: 'Enchapado petiribí', Puertas: '4', Acabado: ACABADO },
    category: 'racks',
    material: 'Enchapado petiribí',
    photo: '06-rack-enchapado-petiribi.jpg',
    variations: [
      { medida: '160x70 cm', precio: 899000 },
      { medida: '180x70 cm', precio: 949000 },
      { medida: '200x70 cm', precio: 999000 },
    ],
  },
  {
    slug: 'rack-enchapado-petiribi-3-puertas',
    name: 'Rack enchapado en petiribí — tres puertas',
    description: 'Rack para TV enchapado en petiribí, con tres puertas. Acabado en laca poliuretánica.',
    specifications: { Material: 'Enchapado petiribí', Puertas: '3', Acabado: ACABADO },
    category: 'racks',
    material: 'Enchapado petiribí',
    photo: '06-rack-enchapado-petiribi.jpg',
    variations: [
      { medida: '160x70 cm', precio: 899000 },
      { medida: '180x70 cm', precio: 949000 },
      { medida: '200x70 cm', precio: 999000 },
    ],
  },

  // ── Lámina 07 — Racks de álamo ────────────────────────────────────────
  {
    slug: 'rack-alamo-2-puertas',
    name: 'Rack de álamo — dos puertas',
    description: 'Rack para TV de álamo con dos puertas. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Puertas: '2', Acabado: ACABADO },
    category: 'racks',
    material: 'Álamo',
    photo: '07-rack-alamo.jpg',
    featured: true,
    variations: [
      { medida: '160x70 cm', precio: 359000 },
      { medida: '180x70 cm', precio: 399000 },
      { medida: '200x70 cm', precio: 439000 },
    ],
  },
  {
    slug: 'rack-alamo-2-puertas-estante',
    name: 'Rack de álamo — dos puertas y un estante',
    description: 'Rack para TV de álamo con dos puertas y un estante. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Puertas: '2', Estantes: '1', Acabado: ACABADO },
    category: 'racks',
    material: 'Álamo',
    photo: '07-rack-alamo.jpg',
    variations: [
      { medida: '160x70 cm', precio: 389000 },
      { medida: '180x70 cm', precio: 419000 },
      { medida: '200x70 cm', precio: 459000 },
    ],
  },
  {
    slug: 'rack-alamo-2-cajones-4-puertas',
    name: 'Rack de álamo — dos cajones y cuatro puertas',
    description: 'Rack para TV de álamo con dos cajones y cuatro puertas. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Puertas: '4', Cajones: '2', Acabado: ACABADO },
    category: 'racks',
    material: 'Álamo',
    photo: '07-rack-alamo.jpg',
    variations: [
      { medida: '160x70 cm', precio: 419000 },
      { medida: '180x70 cm', precio: 449000 },
      { medida: '200x70 cm', precio: 489000 },
    ],
  },

  // ── Lámina 08 — Espejos ───────────────────────────────────────────────
  {
    slug: 'espejo-cuadrado-alamo',
    name: 'Espejo cuadrado — marco de álamo',
    description: 'Espejo cuadrado con marco de álamo. Acabado en laca poliuretánica.',
    specifications: { Marco: 'Álamo', Forma: 'Cuadrado', Acabado: ACABADO },
    category: 'espejos',
    material: 'Álamo',
    photo: '08-espejos.jpg',
    variations: [
      { medida: '70x70 cm', precio: 119000 },
      { medida: '80x80 cm', precio: 129000 },
    ],
  },
  {
    slug: 'espejo-rectangular-alamo',
    name: 'Espejo rectangular — marco de álamo',
    description: 'Espejo rectangular con marco de álamo. Acabado en laca poliuretánica.',
    specifications: { Marco: 'Álamo', Forma: 'Rectangular', Acabado: ACABADO },
    category: 'espejos',
    material: 'Álamo',
    photo: '08-espejos.jpg',
    variations: [
      { medida: '150x50 cm', precio: 179000 },
      { medida: '170x65 cm', precio: 199000 },
    ],
  },
  {
    slug: 'espejo-rectangular-petiribi',
    name: 'Espejo rectangular — marco de petiribí macizo',
    description: 'Espejo rectangular con marco de petiribí macizo. Acabado en laca poliuretánica.',
    specifications: { Marco: 'Petiribí macizo', Forma: 'Rectangular', Acabado: ACABADO },
    category: 'espejos',
    material: 'Petiribí macizo',
    photo: '08-espejos.jpg',
    variations: [
      { medida: '160x50 cm', precio: 349000 },
      { medida: '180x50 cm', precio: 369000 },
    ],
  },

  // ── Lámina 09 — Vajilleros de pie vertical ───────────────────────────
  {
    slug: 'vajillero-alamo-2-puertas-2-estantes',
    name: 'Vajillero de álamo — dos puertas y dos estantes',
    description: 'Vajillero de pie vertical de álamo, con dos puertas y dos estantes. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Puertas: '2', Estantes: '2', Acabado: ACABADO },
    category: 'vajilleros',
    material: 'Álamo',
    photo: '09-vajilleros.jpg',
    variations: [
      { medida: '140x100x40 cm', precio: 349000 },
      { medida: '160x100x40 cm', precio: 379000 },
      { medida: '180x100x40 cm', precio: 399000 },
    ],
  },
  {
    slug: 'vajillero-alamo-2-puertas-2-cajones',
    name: 'Vajillero de álamo — dos puertas y dos cajones (incluye vidrio)',
    description: 'Vajillero de pie vertical de álamo, con dos puertas y dos cajones. Incluye vidrio. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Puertas: '2', Cajones: '2', Vidrio: 'Incluido', Acabado: ACABADO },
    category: 'vajilleros',
    material: 'Álamo',
    photo: '09-vajilleros.jpg',
    variations: [
      { medida: '140x100x40 cm', precio: 449000 },
      { medida: '180x100x40 cm', precio: 499000 },
      { medida: '200x100x40 cm', precio: 549000 },
    ],
  },
  {
    slug: 'vajillero-enchapado-petiribi-2-cajones',
    name: 'Vajillero enchapado en petiribí — dos cajones internos (incluye vidrio)',
    description: 'Vajillero de pie vertical enchapado en petiribí, con dos cajones internos. Incluye vidrio. Acabado en laca poliuretánica.',
    specifications: { Material: 'Enchapado petiribí', Cajones: '2 internos', Vidrio: 'Incluido', Acabado: ACABADO },
    category: 'vajilleros',
    material: 'Enchapado petiribí',
    photo: '09-vajilleros.jpg',
    variations: [
      { medida: '180x80x40 cm', precio: 1359000 },
      { medida: '200x80x40 cm', precio: 1499000 },
    ],
  },

  // ── Lámina 10 — Mesas Gerbasoni de álamo (opciones de acabado) ───────
  {
    slug: 'mesa-comedor-gerbasoni-alamo-pata-cruz',
    name: 'Mesa Gerbasoni — álamo macizo (pata cruz)',
    description:
      'Mesa de comedor redonda de álamo macizo, modelo Gerbasoni con pata cruz. Tinte a elección: petiribí o nogal. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo macizo', Forma: 'Redonda', Pata: 'Cruz', Tinte: TINTE_ALAMO, Acabado: ACABADO },
    category: 'mesas-de-comedor',
    material: 'Álamo',
    photo: '10-mesas-alamo-gerbasoni-acabados.jpg',
    variations: [
      { medida: '100 cm', precio: 379000 },
      { medida: '120 cm', precio: 399000 },
      { medida: '140 cm', precio: 462000 },
    ],
  },
  {
    slug: 'mesa-comedor-gerbasoni-alamo-sin-nudos',
    name: 'Mesa Gerbasoni — álamo macizo sin nudos',
    description:
      'Mesa de comedor redonda de álamo macizo seleccionado sin nudos, modelo Gerbasoni. Tinte a elección: petiribí o nogal. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo macizo sin nudos', Forma: 'Redonda', Tinte: TINTE_ALAMO, Acabado: ACABADO },
    category: 'mesas-de-comedor',
    material: 'Álamo',
    photo: '10-mesas-alamo-gerbasoni-acabados.jpg',
    variations: [
      { medida: '100 cm', precio: 429000 },
      { medida: '120 cm', precio: 459000 },
      { medida: '140 cm', precio: 489000 },
    ],
  },
  {
    slug: 'mesa-comedor-gerbasoni-alamo-laqueada',
    name: 'Mesa Gerbasoni — álamo laqueada blanco o negro',
    description:
      'Mesa de comedor redonda de álamo macizo, modelo Gerbasoni, laqueada en blanco o negro (color a elección, se coordina al confirmar el pedido).',
    specifications: { Madera: 'Álamo macizo', Forma: 'Redonda', Color: 'Blanco o negro, a elección (se coordina al confirmar el pedido)', Acabado: 'Laqueado' },
    category: 'mesas-de-comedor',
    material: 'Álamo',
    photo: '10-mesas-alamo-gerbasoni-acabados.jpg',
    variations: [
      { medida: '100 cm', precio: 459000 },
      { medida: '120 cm', precio: 499000 },
      { medida: '140 cm', precio: 549000 },
    ],
  },

  // ── Lámina 11 — Pie de cama / bancos de álamo ────────────────────────
  {
    slug: 'banco-pie-de-cama-sin-estante',
    name: 'Banco pie de cama — sin estante',
    description: 'Banco pie de cama de álamo, sin estante inferior. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Estante: 'No', Acabado: ACABADO },
    category: 'pie-de-cama',
    material: 'Álamo',
    photo: '11-pie-de-cama.jpg',
    variations: [
      { medida: '100x40x45 cm', precio: 180000 },
      { medida: '120x40x45 cm', precio: 190000 },
    ],
  },
  {
    slug: 'banco-pie-de-cama-con-estante',
    name: 'Banco pie de cama — con estante',
    description: 'Banco pie de cama de álamo, con estante inferior. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Estante: 'Sí', Acabado: ACABADO },
    category: 'pie-de-cama',
    material: 'Álamo',
    photo: '11-pie-de-cama.jpg',
    variations: [
      { medida: '100x40x45 cm', precio: 219000 },
      { medida: '120x40x45 cm', precio: 229000 },
    ],
  },
  {
    slug: 'banco-pie-de-cama-hilo-kraft',
    name: 'Banco pie de cama — con hilo kraft',
    description: 'Banco pie de cama de álamo con asiento de hilo kraft. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Asiento: 'Hilo kraft', Acabado: ACABADO },
    category: 'pie-de-cama',
    material: 'Álamo',
    photo: '11-pie-de-cama.jpg',
    variations: [
      { medida: '100x40x45 cm', precio: 289000 },
      { medida: '120x40x45 cm', precio: 299000 },
    ],
  },

  // ── Lámina 12 — Mesas ratonas de álamo ───────────────────────────────
  {
    slug: 'mesa-ratona-redonda',
    name: 'Mesa ratona redonda — álamo',
    description: 'Mesa ratona redonda de álamo. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Forma: 'Redonda', Acabado: ACABADO },
    category: 'mesas-ratonas',
    material: 'Álamo',
    photo: '12-mesas-ratonas.jpg',
    variations: [
      { medida: '50x50 cm', precio: 170000 },
      { medida: '60x50 cm', precio: 199000 },
    ],
  },
  {
    slug: 'mesa-ratona-ovalada',
    name: 'Mesa ratona ovalada — álamo',
    description: 'Mesa ratona ovalada de álamo. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Forma: 'Ovalada', Acabado: ACABADO },
    category: 'mesas-ratonas',
    material: 'Álamo',
    photo: '12-mesas-ratonas.jpg',
    variations: [
      { medida: '100x50x50 cm', precio: 199000 },
      { medida: '120x50x50 cm', precio: 229000 },
    ],
  },
  {
    slug: 'mesa-ratona-rectangular',
    name: 'Mesa ratona rectangular — álamo',
    description: 'Mesa ratona rectangular de álamo. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Forma: 'Rectangular', Acabado: ACABADO },
    category: 'mesas-ratonas',
    material: 'Álamo',
    photo: '12-mesas-ratonas.jpg',
    variations: [
      { medida: '100x50x50 cm', precio: 199000 },
      { medida: '120x50x50 cm', precio: 229000 },
    ],
  },

  // ── Lámina 13 — Escritorios ───────────────────────────────────────────
  {
    slug: 'escritorio-alamo-1-cajon',
    name: 'Escritorio de álamo — un cajón',
    description: 'Escritorio de álamo con un cajón. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Cajones: '1', Acabado: ACABADO },
    category: 'escritorios',
    material: 'Álamo',
    photo: '13-escritorios.jpg',
    variations: [
      { medida: '90x40 cm', precio: 279000 },
      { medida: '100x50 cm', precio: 299000 },
      { medida: '120x50 cm', precio: 319000 },
    ],
  },
  {
    slug: 'escritorio-alamo-2-cajones',
    name: 'Escritorio de álamo — dos cajones',
    description: 'Escritorio de álamo con dos cajones. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Cajones: '2', Acabado: ACABADO },
    category: 'escritorios',
    material: 'Álamo',
    photo: '13-escritorios.jpg',
    variations: [
      { medida: '90x40 cm', precio: 299000 },
      { medida: '100x50 cm', precio: 329000 },
      { medida: '120x50 cm', precio: 349000 },
    ],
  },
  {
    slug: 'escritorio-enchapado-petiribi-2-cajones',
    name: 'Escritorio enchapado en petiribí — dos cajones',
    description: 'Escritorio enchapado en petiribí con dos cajones. Acabado en laca poliuretánica.',
    specifications: { Material: 'Enchapado petiribí', Cajones: '2', Acabado: ACABADO },
    category: 'escritorios',
    material: 'Enchapado petiribí',
    photo: '13-escritorios.jpg',
    variations: [
      { medida: '90x40 cm', precio: 459000 },
      // Catalogue lists "109x50" here — assumed typo for 100x50 (matches the
      // other two desk models). TODO: confirm with Froid.
      { medida: '100x50 cm', precio: 499000 },
      { medida: '120x50 cm', precio: 539000 },
    ],
  },

  // ── Lámina 14 — Cómodas de álamo ─────────────────────────────────────
  {
    slug: 'comoda-alamo-3-cajones',
    name: 'Cómoda de álamo — tres cajones',
    description: 'Cómoda de álamo con tres cajones. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Cajones: '3', Acabado: ACABADO },
    category: 'comodas',
    material: 'Álamo',
    photo: '14-comodas.jpg',
    variations: [{ medida: '50x70 cm', precio: 299000 }],
  },
  {
    slug: 'comoda-alamo-4-cajones',
    name: 'Cómoda de álamo — cuatro cajones',
    description: 'Cómoda de álamo con cuatro cajones. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Cajones: '4', Acabado: ACABADO },
    category: 'comodas',
    material: 'Álamo',
    photo: '14-comodas.jpg',
    variations: [
      { medida: '100x80 cm', precio: 369000 },
      { medida: '120x80 cm', precio: 399000 },
    ],
  },
  {
    slug: 'comoda-alamo-6-cajones',
    name: 'Cómoda de álamo — seis cajones',
    description: 'Cómoda de álamo con seis cajones. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Cajones: '6', Acabado: ACABADO },
    category: 'comodas',
    material: 'Álamo',
    photo: '14-comodas.jpg',
    variations: [
      { medida: '100x80 cm', precio: 399000 },
      { medida: '120x80 cm', precio: 449000 },
    ],
  },

  // ── Lámina 15 — Recibidores ───────────────────────────────────────────
  {
    slug: 'recibidor-alamo-sin-cajones',
    name: 'Recibidor de álamo — sin cajones',
    description: 'Recibidor de álamo sin cajones. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Cajones: 'No', Acabado: ACABADO },
    category: 'recibidores',
    material: 'Álamo',
    photo: '15-recibidor.jpg',
    variations: [
      { medida: '100x80x30 cm', precio: 190000 },
      { medida: '120x80x30 cm', precio: 219000 },
    ],
  },
  {
    slug: 'recibidor-alamo-1-cajon',
    name: 'Recibidor de álamo — un cajón',
    description: 'Recibidor de álamo con un cajón. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Cajones: '1', Acabado: ACABADO },
    category: 'recibidores',
    material: 'Álamo',
    photo: '15-recibidor.jpg',
    variations: [
      { medida: '100x80x30 cm', precio: 219000 },
      { medida: '120x80x30 cm', precio: 239000 },
    ],
  },
  {
    slug: 'recibidor-enchapado-petiribi',
    name: 'Recibidor enchapado en petiribí — sin cajones',
    description: 'Recibidor enchapado en petiribí, sin cajones. Acabado en laca poliuretánica.',
    specifications: { Material: 'Enchapado petiribí', Cajones: 'No', Acabado: ACABADO },
    category: 'recibidores',
    material: 'Enchapado petiribí',
    photo: '15-recibidor.jpg',
    variations: [
      { medida: '100x80x30 cm', precio: 379000 },
      { medida: '120x80x30 cm', precio: 399000 },
    ],
  },

  // ── Lámina 16 — Respaldos de cama de álamo ───────────────────────────
  {
    slug: 'respaldo-cama-liso',
    name: 'Respaldo de cama liso — álamo',
    description: 'Respaldo de cama liso de álamo. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Modelo: 'Liso', Acabado: ACABADO },
    category: 'respaldos-de-cama',
    material: 'Álamo',
    photo: '16-respaldo-de-cama.jpg',
    variations: [{ medida: '160x120 cm', precio: 239000 }],
  },
  {
    slug: 'respaldo-cama-varillado',
    name: 'Respaldo de cama varillado — álamo',
    description: 'Respaldo de cama varillado de álamo. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Modelo: 'Varillado', Acabado: ACABADO },
    category: 'respaldos-de-cama',
    material: 'Álamo',
    photo: '16-respaldo-de-cama.jpg',
    variations: [{ medida: '160x120 cm', precio: 259000 }],
  },
  {
    slug: 'respaldo-cama-hilo-kraft',
    name: 'Respaldo de cama con hilo kraft — álamo',
    description: 'Respaldo de cama de álamo con tejido de hilo kraft. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Modelo: 'Hilo kraft', Acabado: ACABADO },
    category: 'respaldos-de-cama',
    material: 'Álamo',
    photo: '16-respaldo-de-cama.jpg',
    variations: [{ medida: '160x120 cm', precio: 649000 }],
  },

  // ── Lámina 17 — Mesas de luz de álamo ────────────────────────────────
  {
    slug: 'mesa-de-luz-1-cajon',
    name: 'Mesa de luz — un cajón',
    description: 'Mesa de luz de álamo con un cajón. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Cajones: '1', Acabado: ACABADO },
    category: 'mesas-de-luz',
    material: 'Álamo',
    photo: '17-mesas-de-luz.jpg',
    variations: [{ medida: '40x60x40 cm', precio: 180000 }],
  },
  {
    slug: 'mesa-de-luz-rectangular',
    name: 'Mesa de luz rectangular',
    description: 'Mesa de luz rectangular de álamo. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Forma: 'Rectangular', Acabado: ACABADO },
    category: 'mesas-de-luz',
    material: 'Álamo',
    photo: '17-mesas-de-luz.jpg',
    variations: [{ medida: '50x65x40 cm', precio: 199000 }],
  },
  {
    slug: 'mesa-de-luz-2-cajones',
    name: 'Mesa de luz — dos cajones',
    description: 'Mesa de luz de álamo con dos cajones. Acabado en laca poliuretánica.',
    specifications: { Madera: 'Álamo', Cajones: '2', Acabado: ACABADO },
    category: 'mesas-de-luz',
    material: 'Álamo',
    photo: '17-mesas-de-luz.jpg',
    variations: [{ medida: '50x65x40 cm', precio: 229000 }],
  },
];

function skuFor(templateSlug: string, medida: string): string {
  const suffix = medida
    .toLowerCase()
    .replace(/\s*cm$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${templateSlug}-${suffix}`.slice(0, 100);
}

async function main() {
  await dataSource.initialize();
  try {
    const categoryRepo = dataSource.getRepository(Category);
    const templateRepo = dataSource.getRepository(ProductTemplate);

    // Upsert categories by slug
    const categoriesBySlug = new Map<string, Category>();
    for (const def of CATEGORIES) {
      let category = await categoryRepo.findOne({ where: { slug: def.slug } });
      if (!category) {
        category = categoryRepo.create({
          name: def.name,
          slug: def.slug,
          level: 1,
          sort_order: def.sort,
          is_active: true,
        });
        category = await categoryRepo.save(category);
        console.log(`+ category ${def.slug}`);
      }
      categoriesBySlug.set(def.slug, category);
    }

    let created = 0;
    let skipped = 0;
    for (const def of TEMPLATES) {
      const exists = await templateRepo.findOne({ where: { slug: def.slug } });
      if (exists) {
        skipped++;
        continue;
      }

      const category = categoriesBySlug.get(def.category);
      if (!category) throw new Error(`Unknown category slug: ${def.category}`);

      const template = templateRepo.create({
        name: def.name,
        slug: def.slug,
        description: def.description,
        specifications: def.specifications,
        categories: [category],
        is_active: true,
        is_featured: def.featured ?? false,
        variations: def.variations.map((v, idx) => {
          const variation = new ProductVariation();
          variation.sku = skuFor(def.slug, v.medida);
          variation.name = v.medida === 'Única' ? def.name : `${def.name} — ${v.medida}`;
          variation.price = v.precio;
          variation.stock = STOCK;
          variation.is_active = true;
          variation.sort_order = idx;
          variation.attributes = {
            ...(v.medida !== 'Única' ? { medida: v.medida } : {}),
            material: def.material,
          };
          const image = new ProductImage();
          image.path = `${IMAGE_DIR}/${def.photo}`;
          // Rewritten to `${BACKEND_URL}/api/images?path=...` at read time.
          image.url = `/api/images?path=${IMAGE_DIR}/${def.photo}`;
          image.isMain = true;
          image.sortOrder = 0;
          image.altText = variation.name;
          variation.images = [image];
          return variation;
        }),
      });

      await templateRepo.save(template);
      created++;
      console.log(`+ template ${def.slug} (${def.variations.length} variations)`);
    }

    const totalVariations = TEMPLATES.reduce((n, t) => n + t.variations.length, 0);
    console.log(
      `Done. Templates created: ${created}, skipped (already present): ${skipped}. ` +
        `Catalogue defines ${TEMPLATES.length} templates / ${totalVariations} variations.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('seed-legas failed:', err);
  process.exit(1);
});
