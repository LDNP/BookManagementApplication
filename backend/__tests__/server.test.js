const request = require('supertest');
const { app, server } = require('../server');

afterAll(() => server.close());

test('GET /books returns array', async () => {
  const res = await request(app).get('/books');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});