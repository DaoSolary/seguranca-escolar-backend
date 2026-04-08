const bcrypt = require('bcrypt');

const plainPassword = '123456';

bcrypt.hash(plainPassword, 10, (err, hash) => {
  if (err) throw err;
  console.log('Hash gerado:', hash);
});