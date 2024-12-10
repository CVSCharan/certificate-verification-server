const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const app = express();
const port = 9090;

app.use(express.json()); // Middleware to parse JSON data
app.use(cors());

// const allowedOrigins = [
//   "http://localhost:3000", // Local development URL
//   "https://certificate-verification-client-l8jxxzadu-cvs-charans-projects.vercel.app", // Your production frontend URL
// ];

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         console.error("Blocked by CORS:", origin);
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     methods: ["GET", "POST", "OPTIONS"], // Ensure OPTIONS is included for preflight requests
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );

// Initialize the SQLite database
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("Could not connect to database", err);
  } else {
    console.log("Connected to SQLite database");
    createTable(); // Create the table when the server starts
  }
});

// Function to create the 'certificates' table
function createTable() {
  db.run(
    `CREATE TABLE IF NOT EXISTS certificates (
      certificate_id TEXT PRIMARY KEY,
      certificate_name TEXT NOT NULL,
      holder_name TEXT NOT NULL,
      created_on TEXT NOT NULL,
      valid_till TEXT NOT NULL
    )`,
    (err) => {
      if (err) {
        console.error("Error creating table", err);
      } else {
        console.log("Certificates table created successfully");
      }
    }
  );
}

// Function to generate a unique 7-digit certificate ID
function generateUniqueCertificateId(callback) {
  const randomId = Math.floor(1000000 + Math.random() * 9000000).toString(); // 7-digit random number

  db.get(
    `SELECT certificate_id FROM certificates WHERE certificate_id = ?`,
    [randomId],
    (err, row) => {
      if (err) {
        callback(err, null);
      } else if (row) {
        // If ID already exists, recursively generate a new one
        generateUniqueCertificateId(callback);
      } else {
        callback(null, randomId);
      }
    }
  );
}

// Route to add a new certificate
app.post("/certificates", (req, res) => {
  const { certificate_name, holder_name, created_on, valid_till } = req.body;

  if (!certificate_name || !holder_name || !created_on || !valid_till) {
    return res.status(400).json({ error: "All fields are required" });
  }

  generateUniqueCertificateId((err, certificate_id) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Failed to generate certificate ID" });
    }

    const sql = `INSERT INTO certificates (certificate_id, certificate_name, holder_name, created_on, valid_till) VALUES (?, ?, ?, ?, ?)`;
    db.run(
      sql,
      [certificate_id, certificate_name, holder_name, created_on, valid_till],
      function (err) {
        if (err) {
          console.error("Error inserting certificate", err);
          res.status(500).json({ error: "Failed to add certificate" });
        } else {
          res.status(201).json({
            message: "Certificate added successfully",
            certificate_id,
          });
        }
      }
    );
  });
});

// Route to get all certificates
app.get("/certificates", (req, res) => {
  const sql = "SELECT * FROM certificates";
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Error fetching certificates", err);
      res.status(500).json({ error: "Failed to fetch certificates" });
    } else {
      res.status(200).json(rows);
    }
  });
});

// Route to get all Certificates Id's
app.get("/certificates/id-list", (req, res) => {
  const sql = "SELECT certificate_id FROM certificates";
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Error fetching certificates", err);
      res.status(500).json({ error: "Failed to fetch certificates" });
    } else {
      res.status(200).json(rows);
    }
  });
});

// Route to verify a certificate by its ID
app.get("/certificates/verify/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM certificates WHERE certificate_id = ?";

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error("Error verifying certificate", err);
      res.status(500).json({ error: "Failed to verify certificate" });
    } else if (!row) {
      res.status(404).json({ message: "Certificate not found" });
    } else {
      const currentDate = new Date();
      const validTillDate = new Date(row.valid_till);

      if (currentDate <= validTillDate) {
        res
          .status(200)
          .json({ message: "Certificate is valid", certificate: row });
      } else {
        res
          .status(200)
          .json({ message: "Certificate has expired", certificate: row });
      }
    }
  });
});

// Root route
app.get("/", (req, res) => {
  res.status(200).send("Welcome to Certificate Verification Server");
});

// Poling the server for activeness
app.get("/api/ping", (req, res) => {
  console.info("Server is alive!");
  res.status(200).send("Server is alive!");
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
