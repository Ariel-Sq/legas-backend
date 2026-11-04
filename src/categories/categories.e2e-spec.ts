import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriesModule } from './categories.module';
import { Category } from './entities/category.entity';
import { createTestCategoryTree } from '../../test/utils/factories';

// The public CategoriesController only exposes GET /categories/tree (CUD lives
// in the admin module), so this suite covers just that route with a mocked
// repository — no database required.
describe('Categories (e2e)', () => {
  let app: INestApplication;
  let categoryRepository: jest.Mocked<Partial<Repository<Category>>>;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CategoriesModule],
    })
      .overrideProvider(getRepositoryToken(Category))
      .useValue({
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        remove: jest.fn(),
        count: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    categoryRepository = moduleFixture.get(getRepositoryToken(Category));

    await app.init();
    request = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /categories/tree', () => {
    it('should return empty array when no categories exist', async () => {
      (categoryRepository.find as jest.Mock).mockResolvedValue([]);

      const response = await request.get('/categories/tree').expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return the category tree with nested children', async () => {
      const { root, children, grandchildren } = createTestCategoryTree();

      (categoryRepository.find as jest.Mock).mockResolvedValue([
        root,
        ...children,
        ...grandchildren,
      ]);

      const response = await request.get('/categories/tree').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: root.id,
        name: root.name,
        slug: root.slug,
        children: expect.arrayContaining([
          expect.objectContaining({ id: children[0].id }),
        ]),
      });
    });
  });
});
