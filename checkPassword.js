import bcrypt from 'bcryptjs';

const hash = '$2a$10$BpDuPyIsxekApwFzhZcJLeJ.sBsg3Q4FOnaNMIKWdeTlUA5scQyWK'; // copy from users table
const password = 'Samsam'; // the password you think is correct

bcrypt.compare(password, hash).then(match => {
    console.log('Password match?', match);
});
