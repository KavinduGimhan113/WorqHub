<<<<<<< Updated upstream
/**
 * Server entry: connect DB and start Express.
 */
const app = require('./src/app');
const { connectDB } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
=======
/**
 * Server entry: connect DB and start Express.
 */
const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const { port } = require('./src/config/env');

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
>>>>>>> Stashed changes
