const mysql = require("mysql2");
const db = mysql.createPool({
    host               : 'localhost',
    user               : 'root',
    password           : '',
    database           : 'inventaris_bmkg',
    connectionLimit    : 10,
    waitForConnections : true,
});

db.promisePool = db.promise();
module.exports = db;