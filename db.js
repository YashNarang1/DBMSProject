
    const mysql = require('mysql2/promise'); // Using promise-based version for async/await

    const db = mysql.createPool({
        host: 'localhost', // Or your MySQL host
        user: 'root',
        password: 'newpassword',
        database: 'inventorysystem',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    module.exports = db;
