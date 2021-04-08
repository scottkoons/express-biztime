const request = require('supertest');
const app = require('../app');
process.env.NODE_ENV = 'test';
const db = require('../db');

let testCompany;
let testInvoice;

beforeEach(async () => {
    const result = await db.query(
        `INSERT INTO companies (code, name, description) VALUES('tst', 'Test Inc', 'Test company meant for route testing') RETURNING code, name, description`
    );
    testCompany = result.rows[0];
});

// clean up database between tests
afterEach(async () => {
    await db.query(`DELETE FROM companies`);
    await db.query(`DELETE FROM invoices`);
});

// disconnect from db after all tests are run
afterAll(async () => {
    await db.end();
});

// test route to get all companies
describe('GET /companies', () => {
    test('Get a list with one company', async () => {
        const res = await request(app).get('/companies');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            companies: [{ code: testCompany.code, name: testCompany.name }]
        });
    });
});

describe('GET /companies/:code', () => {
    test('Gets a single company that has no invoice associated', async () => {
        const res = await request(app).get(`/companies/${testCompany.code}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ company: testCompany });
    });
    test('Gets a company with an invoice', async () => {
        const Invoice = await db.query(
            `INSERT INTO invoices (comp_code, amt) VALUES('${testCompany.code}', 300) RETURNING id, amt, paid`
        );
        testInvoice = Invoice.rows[0];

        const res = await request(app).get(`/companies/${testCompany.code}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            company: {
                code: testCompany.code,
                description: testCompany.description,
                invoices: [testInvoice],
                name: testCompany.name
            }
        });
    });
    test('return 404 when company cannot be found', async () => {
        const res = await request(app).get(`/companies/aiosdfoja`);
        expect(res.statusCode).toBe(404);
    });
});

describe('POST /companies', () => {
    test('Creates a single company', async () => {
        const res = await request(app)
            .post(`/companies`)
            .send({ code: 'tst2', name: 'Test2', description: 'Another test' });
        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual({
            company: { code: 'tst2', name: 'Test2', description: 'Another test' }
        });
    });
});

describe('PUT /companies/:code', () => {
    test('Updates a single company', async () => {
        const res = await request(app)
            .put(`/companies/${testCompany.code}`)
            .send({ name: 'TestUpdate', description: 'TestCompany is updated' });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            company: {
                code: testCompany.code,
                name: 'TestUpdate',
                description: 'TestCompany is updated'
            }
        });
    });
    test('return 404 when company cannot be found', async () => {
        const res = await request(app).get(`/companies/aiosdfoja`);
        expect(res.statusCode).toBe(404);
    });
});

describe('DELETE /companies/:code', () => {
    test('Deletes a single company', async () => {
        const res = await request(app).delete(`/companies/${testCompany.code}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ status: 'deleted' });
    });
    test('Returns 404 when company to delete cannot be found', async () => {
        const res = await request(app).get(`/companies/aiosdfoja`);
        expect(res.statusCode).toBe(404);
    });
});