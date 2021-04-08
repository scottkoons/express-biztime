/** Routes for companies. */

const express = require("express");
const ExpressError = require("../expressError");
const router = express.Router();
const db = require("../db");
const slugify = require('slugify');

// ********** GET **********
router.get('/', async (req, res, next) => {
    try {
        const results = await db.query(`SELECT * FROM companies`);
        return res.json({ companies: results.rows });
    } catch (e) {
        return next(e);
    }
});

router.get("/:code", async (req, res, next) => {
    try {
        const compCode = req.params.code;
        const companyResult = await db.query(`SELECT code, name, description FROM companies WHERE code=$1`, [compCode]);
        const invoicesResults = await db.query(`SELECT id, comp_code, amt, paid, add_date, paid_date FROM invoices WHERE comp_code=$1`, [compCode]);
        if (!companyResult.rows.length) {
            throw new ExpressError(`No company was found for code ${compCode}`, 404);
        }
        let { code, name, description } = companyResult.rows[0];
        return res.json({ code, name, description, invoices: invoicesResults.rows });
    }
    catch (e) {
        return next(e);
    }
});

router.get('/search', async (req, res, next) => {
    try {
        const { code } = req.query;
        const results = await db.query(`SELECT * FROM companies WHERE code=$1`, [code]);
        return res.json(results.rows);
    } catch (e) {
        return next(e);
    }
});

// ********** POST **********
router.post('/', async (req, res, next) => {
    try {
        const { code, name, description } = req.body;
        // const code = slugify(name, { lower: true });
        const results = await db.query(`INSERT INTO companies (code, name, description) VALUES ($1, $2, $3)RETURNING code, name, description`, [code, name, description]);
        return res.status(201).json({ user: results.rows[0] });
    } catch (e) {
        return next(e);
    }
});

// ********** PUT **********
router.put('/:code', async (req, res, next) => {
    try {
        // const { code } = req.params;
        const code = slugify(req.params.code, { lower: true });
        const { name, description } = req.body;
        const results = await db.query(`UPDATE companies SET name=$1, description=$2 WHERE code=$3 RETURNING code, name, description`, [name, description, code]);
        if (results.rows.length === 0) {
            throw new ExpressError(`No company was found for code ${code}`, 404);
        };
        return res.send({ user: results.rows[0] });
    } catch (e) {
        return next(e);
    };
});

// ********** DELETE **********
router.delete('/:code', async (req, res, next) => {
    try {
        const { code } = req.params;
        const results = db.query(`DELETE FROM companies WHERE code = $1`, [code]);
        if (results.rows.length === 0) {
            throw new ExpressError(`No company was found for code ${code}`, 404);
        };
        return res.send({ msg: "DELETED!" });
    } catch (e) {
        return next(e);
    };
});


module.exports = router;