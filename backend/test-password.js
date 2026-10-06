const bcrypt = require('bcrypt');

const password = 'Admin@123';
const hash = '$2b$10$uY2pZetmb0CU2kZ0iJ8tiu3vCQGzR4LI.pRnx9Sme8a.SYb1SeYEa';

bcrypt.compare(password, hash).then(result => {
    console.log('Password match:', result);
    process.exit(result ? 0 : 1);
});
