import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('wraps Nest validation errors in the common error contract', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/surveys' }),
      }),
    } as unknown as ArgumentsHost;
    const exception = new BadRequestException([
      'title should not be empty',
      'title must be a string',
    ]);

    new HttpExceptionFilter().catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      error: expect.objectContaining({
        message: ['title should not be empty', 'title must be a string'],
      }) as unknown,
      path: '/api/surveys',
      timestamp: expect.any(String) as unknown,
    });
  });

  it('does not expose internal exception details', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/users/me' }),
      }),
    } as unknown as ArgumentsHost;

    new HttpExceptionFilter().catch(new Error('database secret'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: { message: 'Internal server error' },
      }) as unknown,
    );
  });
});
