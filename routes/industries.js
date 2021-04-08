const express = require('express');
const router = new express.Router();
const db = require('../db');
const ExpressError = require('../expressError');

router.get('/', async (req, res, next) => {
    try {
        const results = await db.query(`SELECT code, industry FROM industries`);
        let industries = [];
        for (let row of results.rows) {
            const comps = await db.query(
                `SELECT i.code, i.industry, ci.company_code FROM industries AS i LEFT JOIN companies_industries AS ci ON i.code = ci.industry_code INNER JOIN companies AS c ON ci.company_code = c.code WHERE i.code='${row.code}'`
            );
            let companies = comps.rows.map((r) => r.company_code);

            industries.push({ code: row.code, industry: row.industry, companies: companies });
        }
        return res.json({ industries });
    } catch (error) {
        return next(error);
    }
});

router.get('/:code', async (req, res, next) => {
    try {
        const results = await db.query(
            `SELECT i.code, i.industry, ci.company_code FROM industries AS i LEFT JOIN companies_industries AS ci ON i.code = ci.industry_code LEFT JOIN companies AS c ON ci.company_code = c.code WHERE i.code=$1`,
            [req.params.code]
        );
        if (results.rows.length === 0) {
            throw new ExpressError(`Industry with code: ${req.params.code} cannot be found`, 404);
        }
        const { code, industry } = results.rows[0];
        const companies = results.rows.map((r) => r.company_code);
        return res.json({ code, industry, companies });
    } catch (error) {
        return next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { code, industry } = req.body;
        const results = await db.query(
            `INSERT INTO industries (code, industry) VALUES ($1, $2) RETURNING code, industry`,
            [code, industry]
        );

        return res.status(201).json({ industry: results.rows[0] });
    } catch (error) {
        return next(error);
    }
});

router.post('/:code/add-company', async (req, res, next) => {
    try {
        const { code } = req.params;
        const { company } = req.body;

        const checkIndustry = await db.query(`SELECT code FROM industries WHERE code=$1`, [code]);
        if (checkIndustry.rows.length === 0) {
            throw new ExpressError(`Industry with code ${code} not found`, 404);
        }
        const checkCompany = await db.query(`SELECT code FROM companies WHERE code=$1`, [
            company
        ]);
        if (checkCompany.rows.length === 0) {
            throw new ExpressError(`Company with code ${company} not found`, 404);
        }

        const results = await db.query(
            `INSERT INTO companies_industries(company_code, industry_code) VALUES ($1, $2) RETURNING company_code, industry_code`,
            [company, code]
        );

        const { company_code, industry_code } = results.rows[0];

        return res.status(201).json({
            message: `industry "${industry_code}" now associated with company "${company_code}"`
        });
    } catch (error) {
        return next(error);
    }
});
module.exports = router;