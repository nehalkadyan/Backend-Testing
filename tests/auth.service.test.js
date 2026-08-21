'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const User = require('../src/models/user.model');
const { AppError } = require('../src/middlewares/errorHandler');
const logger = require('../src/config/logger');

describe('AuthService - register()', () => {
  let findOneStub, createStub, generateSecureTokenStub, hashTokenStub, sendVerificationEmailStub, loggerErrorStub, AuthService;

  beforeEach(() => {
    // Stub Mongoose User model methods
    findOneStub = sinon.stub(User, 'findOne');
    createStub = sinon.stub(User, 'create');

    // Stubs for utility functions
    generateSecureTokenStub = sinon.stub();
    hashTokenStub = sinon.stub();
    sendVerificationEmailStub = sinon.stub();

    // Stub logger to prevent actual logging during tests
    loggerErrorStub = sinon.stub(logger, 'error');

    // Inject stubs directly into the module
    AuthService = proxyquire('../src/modules/auth/auth.service', {
      '../../utils/crypto.util': {
        generateSecureToken: generateSecureTokenStub,
        hashToken: hashTokenStub,
      },
      '../../utils/email.util': {
        sendVerificationEmail: sendVerificationEmailStub,
      },
      '../../models/user.model': User,
      '../../config/logger': logger,
    });
  });

  afterEach(() => {
    // Restore all stubs after each test
    sinon.restore();
  });

  it('should register a new user successfully when email is unique', async () => {
    const dto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'Password123!',
    };

    const mockRawToken = 'mock-raw-token';
    const mockHashToken = 'mock-hash-token';

    const mockCreatedUser = {
      _id: 'mock-id',
      ...dto,
      emailVerificationToken: mockHashToken,
      toSafeObject: sinon.stub().returns({
        id: 'mock-id',
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
      }),
    };

    // Setup stubs
    findOneStub.resolves(null); // No existing user
    generateSecureTokenStub.returns(mockRawToken);
    hashTokenStub.withArgs(mockRawToken).returns(mockHashToken);
    createStub.resolves(mockCreatedUser);
    sendVerificationEmailStub.resolves(); // Simulate successful email sending

    // Execute
    const result = await AuthService.register(dto);

    // Assertions
    expect(findOneStub.calledOnceWithExactly({ email: dto.email })).to.be.true;
    expect(generateSecureTokenStub.calledOnce).to.be.true;
    expect(hashTokenStub.calledOnceWithExactly(mockRawToken)).to.be.true;

    // Check if User.create was called with correct parameters
    const createArgs = createStub.firstCall.args[0];
    expect(createArgs).to.include({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: dto.password,
      emailVerificationToken: mockHashToken,
    });
    expect(createArgs.emailVerificationTokenExpires).to.be.an.instanceof(Date);

    // Check if email was sent
    expect(sendVerificationEmailStub.calledOnceWithExactly(dto.email, mockRawToken)).to.be.true;

    // Check final result
    expect(result).to.deep.equal({
      id: 'mock-id',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });
    expect(mockCreatedUser.toSafeObject.calledOnce).to.be.true;
  });

  it('should throw AppError if email is already registered', async () => {
    const dto = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'Password123!',
    };

    // Setup stub to return an existing user
    findOneStub.resolves({ _id: 'existing-id', email: dto.email });

    // Execute and assert
    try {
      await AuthService.register(dto);
      expect.fail('Should have thrown an AppError');
    } catch (err) {
      expect(err).to.be.instanceOf(AppError);
      expect(err.statusCode).to.equal(409);
      expect(err.message).to.equal('Email is already registered');
      expect(err.errorCode).to.equal('EMAIL_EXISTS');
    }

    // Ensure downstream logic is not executed
    expect(findOneStub.calledOnceWithExactly({ email: dto.email })).to.be.true;
    expect(createStub.notCalled).to.be.true;
    expect(generateSecureTokenStub.notCalled).to.be.true;
    expect(sendVerificationEmailStub.notCalled).to.be.true;
  });

  it('should still return user object if sendVerificationEmail fails (fire-and-forget)', async () => {
    const dto = {
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'bob@example.com',
      password: 'Password123!',
    };

    const mockCreatedUser = {
      toSafeObject: sinon.stub().returns({ id: 'bob-id' }),
    };

    findOneStub.resolves(null);
    generateSecureTokenStub.returns('token');
    hashTokenStub.returns('hash');
    createStub.resolves(mockCreatedUser);

    // Simulate email sending failure
    const emailError = new Error('SMTP connection failed');
    sendVerificationEmailStub.rejects(emailError);

    const result = await AuthService.register(dto);

    // Give the fire-and-forget promise a moment to catch the error
    await new Promise(setImmediate);

    expect(result).to.deep.equal({ id: 'bob-id' });
    expect(sendVerificationEmailStub.calledOnce).to.be.true;
    expect(loggerErrorStub.calledOnce).to.be.true;
    expect(loggerErrorStub.firstCall.args[0]).to.include('SMTP connection failed');
  });
});
