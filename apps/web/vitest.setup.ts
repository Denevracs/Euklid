import '@testing-library/jest-dom';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.NEXTAUTH_SECRET ??= 'test-secret';
process.env.NEXTAUTH_URL ??= 'http://localhost:3000';
process.env.EMAIL_SERVER ??= 'smtp://user:pass@localhost:1025';
process.env.EMAIL_FROM ??= 'test@example.com';
process.env.API_INTERNAL_SECRET ??= 'internal-test-secret';
process.env.API_BASE_URL ??= 'http://localhost:4000';
