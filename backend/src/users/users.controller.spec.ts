import { NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { User, UserRole } from '../database/models';
import { UsersController } from './users.controller';
import { UpdateProfileDto } from './users.dto';

describe('UsersController', () => {
  it('returns a Nest 404 when the current user disappeared', async () => {
    const users = {
      findByPk: jest.fn().mockResolvedValue(null),
    } as unknown as typeof User;
    const controller = new UsersController(users);

    await expect(
      controller.updateMe(
        {
          id: 'missing-user',
          email: 'eva@example.com',
          name: 'Eva',
          role: UserRole.USER,
        },
        { name: 'New name' },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('UpdateProfileDto', () => {
  it('trims a valid profile name', async () => {
    const dto = plainToInstance(UpdateProfileDto, { name: '  Eva  ' });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.name).toBe('Eva');
  });

  it('rejects a profile name containing only whitespace', async () => {
    const dto = plainToInstance(UpdateProfileDto, { name: '   ' });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
