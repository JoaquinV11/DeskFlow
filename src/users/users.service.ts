import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAssignable() {
    return this.prisma.user.findMany({
      where: {
        role: {
          in: ['AGENT', 'ADMIN'],
        },
      },
      orderBy: [
        { role: 'asc' }, // AGENT / ADMIN (el orden exacto depende del enum)
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }
}
