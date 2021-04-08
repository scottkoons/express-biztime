/** BizTime express application. */

const express = require("express");
const app = express();
const ExpressError = require("./expressError");

// Parse request bodies for JSON
app.use(express.json());

const companiesRoutes = require("./routes/companies");
app.use("/companies", companiesRoutes);

const invoiceRoutes = require("./routes/invoices");
app.use("/invoices", invoiceRoutes);

const industriesRoutes = require("./routes/industries");
app.use("/industries", industriesRoutes);


/** 404 handler */

app.use(function (req, res, next) {
  const err = new ExpressError("404 Not Found", 404);
  return next(err);
});

/** general error handler */

app.use((err, req, res, next) => {
  res.status(err.status || 500);

  return res.json({
    error: err,
    message: err.message
  });
});

module.exports = app;
