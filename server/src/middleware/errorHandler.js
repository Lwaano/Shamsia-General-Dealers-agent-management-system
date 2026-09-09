// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  if (statusCode === 500) {
    console.error(err);
  }
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : err.message,
  });
};

module.exports = errorHandler;
