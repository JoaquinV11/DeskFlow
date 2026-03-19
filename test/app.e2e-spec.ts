import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

type LoginResponse = {
  accessToken: string;
};

describe('DeskFlow API (e2e)', () => {
  let app: INestApplication;

  async function loginAs(email: string, password: string) {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(201);

    return response.body as LoginResponse;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health responds with API heartbeat', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.ok).toBe(true);
        expect(res.body.service).toBe('deskflow-api');
      });
  });

  it('POST /api/auth/login returns access token for demo admin', async () => {
    const result = await loginAs('admin@demo.com', 'demo123');

    expect(result.accessToken).toEqual(expect.any(String));
  });

  it('GET /api/tickets requires authentication', () => {
    return request(app.getHttpServer()).get('/api/tickets').expect(401);
  });

  it('allows authenticated admin to create and list a ticket', async () => {
    const { accessToken } = await loginAs('admin@demo.com', 'demo123');

    const uniqueTitle = `E2E ticket ${Date.now()}`;

    const createResponse = await request(app.getHttpServer())
      .post('/api/tickets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: uniqueTitle,
        description: 'Ticket creado desde test E2E',
        priority: 'MEDIUM',
      })
      .expect(201);

    expect(createResponse.body.title).toBe(uniqueTitle);
    expect(createResponse.body.status).toBe('OPEN');

    const listResponse = await request(app.getHttpServer())
      .get('/api/tickets')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(listResponse.body.items)).toBe(true);
    expect(listResponse.body.items.length).toBeGreaterThan(0);
    expect(
      listResponse.body.items.some(
        (item: { id: string }) => item.id === createResponse.body.id,
      ),
    ).toBe(true);
  });
});
