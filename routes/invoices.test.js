const request = require('supertest');
const app = require('../app');
process.env.NODE_ENV = 'test';
const db = require('../db');

let testCompany;
let testInvoice;

beforeEach(async () => {
    const companyResult = await db.query(
        `INSERT INTO companies (code, name, description) VALUES('tst', 'Test Inc', 'Test company meant for route testing') RETURNING code, name, description`
    );
    testCompany = companyResult.rows[0];
    const invoiceResult = await db.query(
        `INSERT INTO invoices (comp_code, amt) VALUES('tst', '100') RETURNING id, comp_code, amt, paid, add_date, paid_date`
    );
    testInvoice = invoiceResult.rows[0];
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

describe('GET /invoices', () => {
    test('get list with a single invoice', async () => {
        const res = await request(app).get('/invoices');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            invoices: [{ id: testInvoice.id, comp_code: testInvoice.comp_code }]
        });
    });
});

describe('GET /invoices/:id', () => {
    test('get single invoice', async () => {
        const res = await request(app).get(`/invoices/${testInvoice.id}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            invoice: {
                id: testInvoice.id,
                amt: testInvoice.amt,
                paid: testInvoice.paid,
                add_date: expect.any(String),
                paid_date: null,
                company: {
                    code: testInvoice.comp_code,
                    name: testCompany.name,
                    description: testCompany.description
                }
            }
        });
    });
    test('Returns 404 if invoice is not found', async () => {
        const res = await request(app).get('/invoices/0');
        expect(res.statusCode).toBe(404);
    });
});

describe('POST /invoices', () => {
    test('Adds a single invoice', async () => {
        const res = await request(app).post('/invoices').send({ comp_code: 'tst', amt: 1000 });
        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual({
            invoice: {
                id: expect.any(Number),
                comp_code: 'tst',
                amt: 1000,
                paid: false,
                add_date: expect.any(String),
                paid_date: null
            }
        });
    });
});

describe('PUT /invoices/:id', () => {
    test('Updates a single invoice', async () => {
        const res = await request(app).put(`/invoices/${testInvoice.id}`).send({ amt: 5000 });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            invoice: {
                id: testInvoice.id,
                comp_code: testInvoice.comp_code,
                amt: 5000,
                paid: testInvoice.paid,
                add_date: expect.any(String),
                paid_date: null
            }
        });
    });
    test('returns 404 if invoice is not found', async () => {
        const res = await request(app).put(`/invoices/0`).send({ amt: 5000 });
        expect(res.statusCode).toBe(404);
    });
});

describe('DELETE /invoices/:id', () => {
    test('Deletes a single invoice', async () => {
        const res = await request(app).delete(`/invoices/${testInvoice.id}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ status: 'deleted' });
    });

    test('returns 404 if invoice is not found', async () => {
        const res = await request(app).put(`/invoices/0`).send({ amt: 5000 });
        expect(res.statusCode).toBe(404);
    });
});