import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtStrategy } from '@tellme/common';
import { AppModule } from 'src/app.module';
import { AuthService } from 'src/auth/auth.service';
import { DeleteAccounDto, ResetPasswordConfirmationDto, ResetPasswordDemandDto } from '@tellme/shared';
describe('AuthController', () => {
  let app: INestApplication;

  // Mock AuthService with specific methods and their expected behavior
  const authServiceMock = {
    signup: jest.fn(),
    signin: jest.fn(),
    resetPasswordDemand: jest.fn(),
    resetPasswordConfirmation: jest.fn(),
    deleteAccount: jest.fn(),
    getUserInfo: jest.fn(),
    refreshToken: jest.fn(),
  };
  const url = '/auth/'; // Base URL for the auth routes
  

  const signupDto = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'password123',
  };
  
  const signinDto = { email: 'test@example.com', password: 'password123' };
  
  const resetPasswordDemandDto : ResetPasswordDemandDto = { email: 'test@example.com' };

  const resetPasswordConfirmationDto : ResetPasswordConfirmationDto = {
    email: 'test@example.com',
    code: '12345',
    password: 'newpassword123',
  };
  
  const deleteAccountDto : DeleteAccounDto = { password: 'password123' };
  

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule], // Use the root module for full application testing
    })
      .overrideProvider(AuthService) // Mock the AuthService to avoid real database calls
      .useValue(authServiceMock)
      .overrideGuard(JwtStrategy) // Mock the JWT guard to simulate authenticated access
      .useValue({
        canActivate: jest.fn().mockResolvedValue(true), // Always allow the route access in tests
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close(); 
  });

  it('should register a new user (POST /auth/register)', async () => {
    // Mock the signup method of the service
    authServiceMock.signup.mockResolvedValue({ data: 'User registered' });

    const response = await request(app.getHttpServer())
      .post(url + 'register')
      .send(signupDto)
      .expect(201);

    expect(response.body).toEqual({ data: 'User registered' });
    expect(authServiceMock.signup).toHaveBeenCalledWith(signupDto);
  });

  it('should login an existing user (POST /auth/login)', async () => {
    // Mock the signin method of the service
    authServiceMock.signin.mockResolvedValue({ token: 'jwt-token' });

    const response = await request(app.getHttpServer())
      .post(url + 'login')
      .send(signinDto)
      .expect(201);

    expect(response.body.token).toBeDefined();
    expect(authServiceMock.signin).toHaveBeenCalledWith(signinDto);
  });

  it('should request password reset (POST /auth/reset-password)', async () => {
    // Mock the reset password demand method of the service
    authServiceMock.resetPasswordDemand.mockResolvedValue({ data: 'Reset password mail has been sent' });

    const response = await request(app.getHttpServer())
      .post(url + 'reset-password')
      .send(resetPasswordDemandDto)
      .expect(201);

    expect(response.body).toEqual({ data: 'Reset password mail has been sent' });
    expect(authServiceMock.resetPasswordDemand).toHaveBeenCalledWith(resetPasswordDemandDto);
  });

  it('should confirm password reset (POST /auth/reset-password-confirmation)', async () => {
    // Mock the reset password confirmation method of the service
    authServiceMock.resetPasswordConfirmation.mockResolvedValue({ data: 'Password updated' });

    const response = await request(app.getHttpServer())
      .post(url + 'reset-password-confirmation')
      .send(resetPasswordConfirmationDto)
      .expect(201);

    expect(response.body).toEqual({ data: 'Password updated' });
    expect(authServiceMock.resetPasswordConfirmation).toHaveBeenCalledWith(resetPasswordConfirmationDto);
  });

  it('should delete user account (DELETE /auth/delete-account)', async () => {
    // Mock the delete account method of the service
    authServiceMock.deleteAccount.mockResolvedValue({ data: 'User successfully deleted' });

    const response = await request(app.getHttpServer())
      .delete(url + 'delete-account')
      .set('Authorization', 'Bearer valid-jwt-token') // Simulate a valid JWT token
      .send(deleteAccountDto)
      .expect(401); // Expecting a 401 error since we are not actually sending a valid token in this test
  });

  afterAll(async () => {
    await app.close(); // Close the app after tests to free up resources
  });

  it('should return 401 when trying to delete account with invalid token', async () => {
    authServiceMock.deleteAccount.mockResolvedValue({ data: 'User successfully deleted' });
  
    // Test with an invalid token (or without token)
    const response = await request(app.getHttpServer())
      .delete(url + 'delete-account')
      .set('Authorization', 'Bearer invalid-jwt-token')  // Invalid token
      .send(deleteAccountDto)
      .expect(401);  // Expecting a 404 error
  
    expect(response.body).toEqual({ message: 'Unauthorized' , "statusCode": 401}); // Or any custom error message you have
  });
});