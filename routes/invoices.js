const express = require("express");
const router = new express.Router();
const db = require("../db");
const app = express();
const ExpressError = require("../expressError");

app.use(express.json());

// ********** GET **********
router.get('/', async (req, res, next) => {
    try {
        const results = await db.query(`SELECT * FROM invoices`);
        return res.json({
            invoices: results.rows
        });
    } catch (e) {
        return next(e);
    }
});


router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db.query(`
      SELECT id, amt, paid, add_date, paid_date, companies.code, companies.name, companies.description
      FROM invoices
      JOIN companies ON comp_code=companies.code
      WHERE id=$1`, [id]);
        if (!result.rows.length) {
            throw new ExpressError(`No invoice found`, 404);
        }
        const invoice = result.rows[0];
        return res.json({
            invoice: {
                id: invoice.id,
                amt: invoice.amt,
                paid: invoice.paid,
                add_date: invoice.add_date,
                paid_date: invoice.paid_date,
                company: {
                    code: invoice.code,
                    name: invoice.name,
                    description: invoice.description
                }
            }
        });
    } catch (e) {
        return next(e);
    }
});

// ********** POST **********
router.post('/', async (req, res, next) => {
    try {
        const { comp_code, amt } = req.body;
        const result = await db.query(`
      INSERT INTO invoices
      (comp_code, amt)
      VALUES ($1, $2)
      RETURNING id, amt, paid, add_date, paid_date
    `, [comp_code, amt]);
        return res.json({
            invoice: result.rows[0]
        }, 201);
    } catch (e) {
        return next(e);
    }
});

// ********** PUT **********
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amt, paid } = req.body;
        let paidDate = null;

        // get current payment state of id
        const currentState = await db.query(`SELECT paid, paid_date FROM invoices WHERE id=$1`, [id]);

        // throw error if above query does not return a match
        if (currentState.rows.length === 0) {
            throw new ExpressError(`Cannot find invoice: ${id}`, 404);
        }
        const currDate = currentState.rows[0].paid_date;
        if (!currDate && paid) {
            // this is where the paid_date is null and the passed 'paid' data is true. This means its being marked as paid at this moment so update the paidDate
            paidDate = new Date();
        } else if (!paid) {
            // "paid" is false in request body let's make sure paidDate is null here
            paidDate = null;
        } else {
            // keep current paid_date since its not being updated
            paidDate = currDate;
        }

        const results = await db.query(
            `UPDATE invoices SET amt=$1, paid=$2, paid_date=$3 WHERE id=$4 RETURNING id, comp_code, amt, paid, add_date, paid_date`,
            [amt, paid, paidDate, id]
        );

        return res.json({ invoice: results.rows[0] });
    } catch (e) {
        return next(e);
    }
});

// ********** DELETE **********
router.delete('/:id', async (req, res, next) => {
    try {
        const result = await db.query(`
      DELETE FROM invoices
      WHERE id=$1
    `, [req.params.id]);
        if (!result.rowCount) {
            throw new ExpressError(`No invoice was found`, 404);
        }
        return res.json({ status: 'deleted' });
    }
    catch (e) {
        return next(e);
    }
});

module.exports = router;