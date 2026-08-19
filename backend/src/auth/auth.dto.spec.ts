import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto, RegisterDto } from './auth.dto';

describe('auth DTO validation', () => {
  it('trims email and optional name without changing password', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: '  eva@example.com  ',
      password: '  password  ',
      name: '  Eva  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({
      email: 'eva@example.com',
      password: '  password  ',
      name: 'Eva',
    });
  });

  it('normalizes a blank optional name to undefined', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'eva@example.com',
      password: 'password',
      name: '   ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.name).toBeUndefined();
  });

  it('rejects login passwords longer than bcrypt can safely handle', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'eva@example.com',
      password: 'x'.repeat(73),
    });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'password')).toBeDefined();
  });
});
