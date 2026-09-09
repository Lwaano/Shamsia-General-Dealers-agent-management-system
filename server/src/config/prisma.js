const { PrismaClient } = require('@prisma/client');

const basePrisma = new PrismaClient();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Neon (and similar serverless Postgres) suspends its compute after a short idle
// period; the first query after that lands on a connection that isn't up yet and
// fails with P1001 even though the database is fine a moment later. Retrying a
// couple of times with a short delay absorbs that cold-start instead of surfacing
// it to the user as a 500.
const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ operation, model, args, query }) {
      const maxAttempts = 6;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await query(args);
        } catch (err) {
          // The connectivity error surfaces as different Prisma error classes depending on
          // exactly when the dropped connection is noticed, so match on the message too —
          // `err.code`/`err.errorCode` aren't reliably populated for every one of them.
          const isColdStart =
            err.code === 'P1001' ||
            err.code === 'P1017' ||
            err.errorCode === 'P1001' ||
            err.errorCode === 'P1017' ||
            /Can't reach database server|Server has closed the connection/.test(err.message || '');
          if (!isColdStart || attempt === maxAttempts) throw err;
          await sleep(attempt * 500);
        }
      }
    },
  },
});

module.exports = prisma;
