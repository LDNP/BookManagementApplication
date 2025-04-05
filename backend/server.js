const path = require('path');
const fs = require('fs');
const https = require('https');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const initSqlJs = require('sql.js');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// More flexible CORS configuration using environment variables
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'https://34.251.18.39:8443',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(bodyParser.json());

let db;
let SQL;

// Certificate processing function
function processCertificates(keyPath, certPath) {
  try {
    if (process.env.NODE_ENV === 'production') {
      let privatekey = fs.readFileSync(keyPath, "utf8");
      let cert = fs.readFileSync(certPath, "utf8");

      // Process Private Key
      const privateKeyHeader = "-----BEGIN PRIVATE KEY-----";
      const privateKeyFooter = "-----END PRIVATE KEY-----";
      privatekey = privatekey.split(privateKeyHeader)[1];
      privatekey = privatekey.split(privateKeyFooter)[0];
      privatekey = privateKeyHeader + "\n" + privatekey.replace(/ /g, "\n") + privateKeyFooter + "\n";

      // Process Certificate
      const certHeader = "-----BEGIN CERTIFICATE-----";
      const certFooter = "-----END CERTIFICATE-----";
      cert = cert.split(certHeader)[1];
      cert = cert.split(certFooter)[0];
      cert = certHeader + "\n" + cert.replace(/ /g, "\n") + certFooter + "\n";

      return { key: privatekey, cert: cert };
    }
    
    // Always return original files
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
  } catch (error) {
    console.error("Error processing certificates:", error);
    return null;
  }
}

// Rest of the file remains exactly the same as in the previous document
// ... (all other functions and code stay unchanged)

startServer();