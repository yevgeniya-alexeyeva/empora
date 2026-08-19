import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { configureApp, originProtection } from './configure-app';

describe('configureApp', () => {
  it('installs the production middleware and global Nest configuration', () => {
    const setGlobalPrefix = jest.fn();
    const use = jest.fn();
    const enableCors = jest.fn();
    const useGlobalPipes = jest.fn();
    const useGlobalFilters = jest.fn();
    const app = {
      setGlobalPrefix,
      use,
      enableCors,
      useGlobalPipes,
      useGlobalFilters,
    } as unknown as INestApplication;
    const config = {
      getOrThrow: jest.fn().mockReturnValue('https://frontend.example'),
    } as unknown as ConfigService;

    configureApp(app, config);

    expect(setGlobalPrefix).toHaveBeenCalledWith('api');
    expect(use).toHaveBeenCalledTimes(3);
    expect(enableCors).toHaveBeenCalledWith({
      origin: 'https://frontend.example',
      credentials: true,
    });
    expect(useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(useGlobalFilters).toHaveBeenCalledTimes(1);
  });
});

describe('originProtection', () => {
  function invoke(method: string, origin?: string, host = 'api.example') {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const request = {
      method,
      protocol: 'https',
      get: jest.fn((header: string) => (header === 'origin' ? origin : host)),
    } as unknown as Request;
    const response = {
      status,
      json,
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    originProtection('https://frontend.example')(request, response, next);
    return { status, json, next };
  }

  it('rejects unsafe cross-origin requests', () => {
    const { status, json, next } = invoke('POST', 'https://attacker.example');

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      message: 'Origin is not allowed',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ['GET', 'https://attacker.example'],
    ['POST', undefined],
    ['POST', 'https://frontend.example'],
    ['POST', 'https://api.example'],
  ])('allows %s requests from %s', (method, origin) => {
    const { status, next } = invoke(method, origin);

    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
