import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { MailerService } from '@tellme/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthCacheService } from '@tellme/shared';
import { UserRepository } from '@tellme/shared';
import { SnowflakeService } from '@tellme/common';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';

import * as speakeasy from 'speakeasy';
jest.mock('speakeasy');

describe('AuthService', () => {
  let service: AuthService;
  const mockMailerService = { sendSignupConfirmation: jest.fn(), sendResetPassword: jest.fn(), };
  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'JWT_EXPIRES_IN':
          return "3600";
        case 'SECRET_KEY':
          return 'secret-key';
        case 'OTP_SECRET_CODE':
          return 'secret-key';
        case 'OTP_STEP_TIME':
          return '30';
        case 'HOST':
          return 'http://localhost';
        case 'HEIMDALL_SERVICE_API_GATEWAY_PORT':
          return '3000';
        default:
          return "";
      }
    }),
  };

  const mockAuthCacheService = { storeToken: jest.fn(), updateToken: jest.fn(), removeAllToken: jest.fn() };
  const mockUserRepository = { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
  const mockSnowflakeService = { generate: jest.fn().mockReturnValue('123456') };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: MailerService, useValue: mockMailerService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthCacheService, useValue: mockAuthCacheService },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: SnowflakeService, useValue: mockSnowflakeService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks(); // Clear mocks before each test
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('AuthService - signup', () => {
    it('should create a new user and send a confirmation email', async () => {
      const signupDto = { email: 'test@example.com', password: 'password123', username: 'testuser' };
      const mockUser = {
        email: signupDto.email,
        username: signupDto.username,
        password: signupDto.password, // Use plain password for tests
        id: '123456',
      };
      mockUserRepository.findUnique.mockResolvedValue(null); // No existing user
      mockUserRepository.create.mockResolvedValue(mockUser); // User is created successfully
      mockMailerService.sendSignupConfirmation.mockResolvedValue(true); // Simulate sending confirmation email

      await service.signup(signupDto);

      // Check that the create method was called with the correct user
      expect(mockUserRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        email: signupDto.email,
        username: signupDto.username,
        password: expect.any(String), // Password should be hashed, so just check that it's a string
      }));

      // Verify that the confirmation email was sent
      expect(mockMailerService.sendSignupConfirmation).toHaveBeenCalledWith(signupDto.email);
    });

    it('should throw a ConflictException if the user already exists', async () => {
      const signupDto = { email: 'test@example.com', password: 'password123', username: 'testuser' };
      const mockUser = {
        email: signupDto.email,
        username: signupDto.username,
        password: signupDto.password, // Use plain password for tests
        id: '123456',
      };
      mockUserRepository.findUnique.mockResolvedValue(mockUser); // User already exists

      // Check that the promise is rejected with ConflictException
      const result = await service.signup(signupDto);
      expect(result).toEqual(new ConflictException('User already exists'));

      // Verify that the create method was not called if the user already exists
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });


  describe('AuthService - signin', () => {
    it('should return a token and user info if credentials are correct', async () => {
      const signinDto = { email: 'test@example.com', password: 'password123' };
      const mockUser = {
        id: '123456',
        email: signinDto.email,
        username: 'testuser',
        checkPassword: jest.fn().mockReturnValue(true), // Simulate correct password match
      };
      mockUserRepository.findUnique.mockResolvedValue(mockUser); // User exists
      mockJwtService.sign.mockReturnValue('jwt-token'); // Simulate JWT token generation

      const result = await service.signin(signinDto);

      // Verify that the user was found
      expect(mockUserRepository.findUnique).toHaveBeenCalledWith({ where: { email: signinDto.email } });

      // Check that the password check was done correctly
      expect(mockUser.checkPassword).toHaveBeenCalledWith(signinDto.password);

      // Check that the JWT token was signed with the correct payload
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: mockUser.id, userId: mockUser.id, email: mockUser.email },
        { expiresIn: parseInt(mockConfigService.get("JWT_EXPIRES_IN")), secret: mockConfigService.get("SECRET_KEY") }
      );

      // Verify that the token is stored in the cache
      expect(mockAuthCacheService.storeToken).toHaveBeenCalledWith(mockUser.id, 'jwt-token');

      // Check the result
      expect(result).toEqual({
        token: 'jwt-token',
        user: { username: mockUser.username, email: mockUser.email },
      });
    });

    it('should return a NotFoundException if the user does not exist', async () => {
      const signinDto = { email: 'nonexistent@example.com', password: 'password123' };
      mockUserRepository.findUnique.mockResolvedValue(null); // User does not exist

      const result = await service.signin(signinDto);

      // Check that the correct error is returned
      expect(result).toEqual(new NotFoundException('User not found'));
    });

    it('should return an UnauthorizedException if the password does not match', async () => {
      const signinDto = { email: 'test@example.com', password: 'wrongpassword' };
      const mockUser = {
        id: '123456',
        email: signinDto.email,
        username: 'testuser',
        checkPassword: jest.fn().mockReturnValue(false), // Simulate incorrect password match
      };
      mockUserRepository.findUnique.mockResolvedValue(mockUser); // User exists

      const result = await service.signin(signinDto);

      // Check that the password mismatch error is returned
      expect(result).toEqual(new UnauthorizedException('Password does not match'));
    });
  });

  describe('AuthService - refreshToken', () => {

    it('should refresh token if expired recently and update cache', async () => {
      const oldToken = 'expired-token';
      const now = Math.floor(Date.now() / 1000);

      const decodedPayload = {
        userId: 'user123',
        email: 'test@example.com',
        exp: now - 100, // Expiré il y a 100 secondes
      };

      mockJwtService.verify.mockReturnValue(decodedPayload);
      mockJwtService.sign.mockReturnValue('new-token');

      const result = await service.refreshToken(oldToken);

      expect(mockJwtService.verify).toHaveBeenCalledWith(oldToken, {
        ignoreExpiration: true,
        secret: 'secret-key', // ou `JWT_SECRET_KEY` selon config
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: decodedPayload.userId,
          userId: decodedPayload.userId,
          email: decodedPayload.email,
        },
        {
          expiresIn: 3600,
          secret: 'secret-key',
        }
      );

      expect(mockAuthCacheService.updateToken).toHaveBeenCalledWith(
        decodedPayload.userId,
        oldToken,
        'new-token'
      );

      expect(result).toEqual({ refreshToken: 'new-token' });
    });

    it('should throw UnauthorizedException if token expired more than 5 minutes ago', async () => {
      const oldToken = 'too-old-token';
      const now = Math.floor(Date.now() / 1000);

      const decodedPayload = {
        userId: 'user123',
        email: 'test@example.com',
        exp: now - 400, // 400s ago > 300s threshold
      };

      mockJwtService.verify.mockReturnValue(decodedPayload);

      const result = await service.refreshToken(oldToken);
      expect(result).toEqual(new UnauthorizedException("The token has expired too long ago, login please."));
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      const oldToken = 'invalid-token';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      const result = await service.refreshToken(oldToken);
      expect(result).toEqual(new UnauthorizedException("Invalid token"));
    });
  });

  describe('AuthService - resetPasswordDemand', () => {
    it('should return confirmation message if user exists and mail is sent', async () => {
      const email = 'test@example.com';
      const dto = { email };
      const otpCode = '12345';

      jest.spyOn(speakeasy, 'totp').mockReturnValue(otpCode);

      mockUserRepository.findUnique.mockResolvedValue({ id: 'user123', email });
      mockMailerService.sendResetPassword.mockResolvedValue(undefined);

      const result = await service.resetPasswordDemand(dto);

      expect(mockUserRepository.findUnique).toHaveBeenCalledWith({
        where: { email },
      });

      expect(speakeasy.totp).toHaveBeenCalledWith({
        secret: mockConfigService.get('OTP_SECRET_CODE'),
        digits: 5,
        step: mockConfigService.get('OTP_STEP_TIME'),
        encoding: 'base32',
      });

      expect(mockMailerService.sendResetPassword).toHaveBeenCalledWith(
        email,
        'http://localhost:3000/auth/reset-password-confirmation',
        otpCode,
      );

      expect(result).toEqual({ data: 'Reset password mail has been sent' });
    });

    it('should return NotFoundException if user is not found', async () => {
      const email = 'unknown@example.com';
      const dto = { email };

      mockUserRepository.findUnique.mockResolvedValue(null);

      const result: any = await service.resetPasswordDemand(dto);

      expect(mockUserRepository.findUnique).toHaveBeenCalledWith({
        where: { email },
      });

      expect(result).toBeInstanceOf(NotFoundException);
      expect(result.message).toEqual('User not found');
    });
  });

  describe('AuthService - resetPasswordConfirmation', () => {
    const email = 'test@example.com';
    const password = 'newPassword123';
    const code = '12345';
    const dto = { email, password, code };

    it('should return confirmation message if code is valid and user exists', async () => {
      const mockUser = {
        id: 'user123',
        email,
        editPassword: jest.fn(),
        password: 'hashedPassword',
      };

      mockUserRepository.findUnique.mockResolvedValue(mockUser);
      (speakeasy.totp as any).verify = jest.fn().mockReturnValue(true);
      mockUserRepository.update.mockResolvedValue(undefined);

      const result = await service.resetPasswordConfirmation(dto);

      expect(mockUserRepository.findUnique).toHaveBeenCalledWith({ where: { email } });

      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: mockConfigService.get('OTP_SECRET_CODE'),
        token: code,
        digits: 5,
        step: mockConfigService.get('OTP_STEP_TIME'),
        encoding: 'base32',
      });

      expect(mockUser.editPassword).toHaveBeenCalledWith(password);
      expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser.id, {
        password: mockUser.password,
      });

      expect(result).toEqual({ data: 'Password updated' });
    });

    it('should return NotFoundException if user does not exist', async () => {
      mockUserRepository.findUnique.mockResolvedValue(null);

      const result: any = await service.resetPasswordConfirmation(dto);

      expect(mockUserRepository.findUnique).toHaveBeenCalledWith({ where: { email } });
      expect(result).toBeInstanceOf(NotFoundException);
      expect(result.message).toBe('User not found');
    });

    it('should return UnauthorizedException if the code is invalid', async () => {
      const mockUser = {
        id: 'user123',
        email,
        editPassword: jest.fn(),
        password: 'hashedPassword',
      };

      mockUserRepository.findUnique.mockResolvedValue(mockUser);
      (speakeasy.totp as any).verify = jest.fn().mockReturnValue(false);

      const result: any = await service.resetPasswordConfirmation(dto);

      expect(speakeasy.totp.verify).toHaveBeenCalled();
      expect(result).toBeInstanceOf(UnauthorizedException);
      expect(result.message).toBe('Invalid/expired token');
    });
  });

  describe('AuthService - deleteAccount', () => {
    const userId = 1;
    const password = 'correctPassword';
    const dto = { password };

    it('should return NotFoundException if user does not exist', async () => {
      mockUserRepository.findUnique.mockResolvedValue(null); // No user found

      const result: any = await service.deleteAccount(userId, dto);

      expect(result).toBeInstanceOf(NotFoundException);
      expect(result.message).toBe('User not found');
    });

    it('should return UnauthorizedException if the password does not match', async () => {
      const mockUser = {
        id: userId,
        checkPassword: jest.fn().mockResolvedValue(false),  // Password mismatch
      };

      mockUserRepository.findUnique.mockResolvedValue(mockUser);

      const result: any = await service.deleteAccount(userId, dto);

      expect(result).toBeInstanceOf(UnauthorizedException);
      expect(result.message).toBe('Password does not match');
    });

    it('should return success message and delete the user if the password is correct', async () => {
      const mockUser = {
        id: userId,
        checkPassword: jest.fn().mockResolvedValue(true),  // Password match
      };

      mockUserRepository.findUnique.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockResolvedValue(undefined);

      const result = await service.deleteAccount(userId, dto);

      expect(mockUserRepository.findUnique).toHaveBeenCalledWith({ where: { id: userId } });
      expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
      expect(mockAuthCacheService.removeAllToken).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ data: 'User successfully deleted' });
    });
  });


  describe('AuthService - getUserInfo', () => {
    it('should return user info if the user exists', async () => {
      const userId = 1;
      const mockUser = {
        userId,
        email: 'user@example.com',
        username: 'user1',
      };

      mockUserRepository.findUnique.mockResolvedValue(mockUser); // Mock la réponse de findUnique

      const result = await service.getUserInfo(userId); // Appel de la méthode

      expect(mockUserRepository.findUnique).toHaveBeenCalledWith({
        where: { userId: userId },
        select: { userId: true, email: true, username: true },
      });

      expect(result).toEqual(mockUser); 
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = 1;

      mockUserRepository.findUnique.mockResolvedValue(null); 

      try {
        await service.getUserInfo(userId);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('User not found');
      }
    });
  });

});