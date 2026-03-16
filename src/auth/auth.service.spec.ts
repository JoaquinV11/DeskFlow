import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

const bcryptCompareMock = bcrypt.compare as jest.MockedFunction<
  typeof bcrypt.compare
>;

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const jwtMock = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('returns an access token and safe user on valid credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'usr_1',
      email: 'admin@demo.com',
      name: 'Admin',
      role: 'ADMIN',
      passwordHash: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    bcryptCompareMock.mockImplementationOnce(async () => true);
    jwtMock.signAsync.mockResolvedValueOnce('jwt-token');

    const result = await service.login({
      email: 'admin@demo.com',
      password: 'demo123',
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@demo.com' },
    });
    expect(jwtMock.signAsync).toHaveBeenCalledWith({
      sub: 'usr_1',
      email: 'admin@demo.com',
      role: 'ADMIN',
    });
    expect(result.accessToken).toBe('jwt-token');
    expect(result.user).toMatchObject({
      id: 'usr_1',
      email: 'admin@demo.com',
      name: 'Admin',
      role: 'ADMIN',
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('throws unauthorized when user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.login({ email: 'missing@demo.com', password: 'demo123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws unauthorized when password is invalid', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'usr_2',
      email: 'agent@demo.com',
      name: 'Agent',
      role: 'AGENT',
      passwordHash: 'hashed',
    });
    bcryptCompareMock.mockImplementationOnce(async () => false);

    await expect(
      service.login({ email: 'agent@demo.com', password: 'wrong-pass' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
