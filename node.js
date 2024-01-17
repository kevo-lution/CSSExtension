const { Client } = require('ssh2');
const mysql = require('mysql2');
const fs = require('fs');

// SSH configuration
const sshConfig = {
  host: 'database-gateway.trackhs.com',
  port: 8022,
  username: 'brettrobinson-bi',
  privateKey: fs.readFileSync('C:/Users/kevinr/PycharmProjects/TRACKing/tryrsa.pem'), // Specify the path to your private key
  readyTimeout: 50000
};

// Database configuration (after SSH tunneling)
const databaseConfig = {
  host: '127.0.0.1', // Localhost after SSH tunneling
  port: 3306,
  user: 'brettrobinson-bi', // Adjust as needed
  password: 'OvQWFKI+jDPbq]]RO.v3uU*_dVuE@W', // New database password
  database: 'brett_robinson', // Adjust as needed
};

// Create SSH tunnel using ssh2
const sshConnection = new (require('ssh2')).Client();

sshConnection.on('ready', () => {
  console.log('SSH connection established.');

  // Create a TCP connection through the SSH tunnel
  sshConnection.forwardOut(
    '127.0.0.1', // Localhost address
    0, // Use a dynamic port (0) to automatically assign an available local port
    'clientbi.us-east.trackhs.com', // Destination host (localhost in this case)
    3306, // Destination port on the remote server (MySQL default port)
    (err, stream) => {
      if (err) {
        console.error(`Error creating SSH tunnel: ${err.message}`);
        sshConnection.end();
        return;
      }

      // Adjust the database configuration to use the stream as the connection
      const connection = mysql.createConnection({
        stream,
        ...databaseConfig,
      });

      // Perform MySQL queries using the connection
      const sqlQuery = `
      SELECT units.id, units.short_name, units.name, pms_units_custom.pms_units_rotation_value
      FROM units
      INNER JOIN pms_units_custom ON units.id = pms_units_custom.id;
    `;
    
    connection.query(sqlQuery, (err, results) => {
      if (err) {
        console.error(`Error querying MySQL: ${err.message}`);
      } else {
        console.log('Query results:', results);
      }

        // Close MySQL connection and SSH connection
        connection.end();
        sshConnection.end();
      });
    }
  );
});

sshConnection.on('error', (err) => {
  console.error(`Error establishing SSH connection: ${err.message}`);
});

sshConnection.connect(sshConfig);
