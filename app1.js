// app.js
const express = require("express");
const cors = require("cors");
const mysql = require("mysql");
const enc = require("bcrypt");
const app = express();
const PORT = 3000;

app.use(cors())
app.use(express.json());
//For Cpanel Connection
/* let conn = mysql.createConnection({
  host: "68.178.145.230",
  user: "kakarla", 
  password: "Kscr2004",
  database: "victory_db",
}); */
let conn = mysql.createConnection({
  host: "localhost",
  user: "root", 
  password: "",
  database: "vtest1",
});

conn.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("Connected to database");
  }
});

app.get("/", (req, res) => {
  res.send(`Welcome Sarath`);
});

app.post("/admin_login", (req, res) => {
  let { Username, Password } = req.body;
  /* var hashed_pass;
  enc.hash("kscr", 10).then((hashed) => {
    hashed_pass = hashed;
    conn.query(
      "INSERT INTO admin VALUES('','VHST02675','Sarathchandra Reddy','9515744884','kscr','" +
        hashed_pass +
        "','Super_Admin')",
      (err, rows) => {
        if (err) {
          throw err;
        }
      }
    );
  }); */

  conn.query(
    "SELECT * FROM admin WHERE Admin_Id_No = '" + Username + "'",
    (err, rows, fields) => {
      if (err) {
        res.json({ success: false, message: err });
        return;
      }
      if (rows.length == 0) {
        res.json({ success: false, message: "User Not Found" });
      } else {
        enc.compare(Password, rows[0].Admin_Hash).then((result) => {
          if (!result) {
            res.json({ success: false, message: "Incorrect Password" });
          } else {
            res.json({ success: true, message: "" });
          }
        });
      }
    }
  );
});

app.post("/faculty_login", (req, res) => {
  let { Username, Password } = req.body;
  /* var hashed_pass;
    enc.hash("kscr", 10).then((hashed) => {
      hashed_pass = hashed;
      conn.query(
        "INSERT INTO admin VALUES('','VHST02675','Sarathchandra Reddy','9515744884','kscr','" +
          hashed_pass +
          "','Super_Admin')",
        (err, rows) => {
          if (err) {
            throw err;
          }
        }
      );
    }); */

  conn.query(
    "SELECT * FROM faculty WHERE Id_No = '" + Username + "'",
    (err, rows, fields) => {
      if (err) {
        res.json({ success: false, message: err });
        return;
      }
      if (rows.length == 0)
        res.json({ success: false, message: "User Not Found" });
      else {
        enc.compare(Password, rows[0].Fac_Hash).then((result) => {
          if (!result) {
            res.json({ success: false, message: "Incorrect Password" });
          } else {
            res.json({ success: true, message: "" });
          }
        });
      }
    }
  );
});

app.post("/student_login", (req, res) => {
  let { Username, Password } = req.body;
  /* var hashed_pass;
    enc.hash("kscr", 10).then((hashed) => {
      hashed_pass = hashed;
      conn.query(
        "INSERT INTO admin VALUES('','VHST02675','Sarathchandra Reddy','9515744884','kscr','" +
          hashed_pass +
          "','Super_Admin')",
        (err, rows) => {
          if (err) {
            throw err;
          }
        }
      );
    }); */

  conn.query(
    "SELECT * FROM student WHERE Id_No = '" + Username + "'",
    (err, rows, fields) => {
      if (err) {
        res.json({ success: false, message: err });
        return;
      }
      if (rows.length == 0)
        res.json({ success: false, message: "User Not Found" });
      else {
        enc.compare(Password, rows[0].Stu_Hash).then((result) => {
          if (!result) {
            res.json({ success: false, message: "Incorrect Password" });
          } else {
            res.json({ success: true, message: "" });
          }
        });
      }
    }
  );
});

app.post("/student/viewdetails", (req, res) => {
  let { Id_No } = req.body;
  conn.query(
    "SELECT * FROM student_master_data WHERE Id_No = '" + Id_No + "'",
    (err, rows, fields) => {
      if (err) {
        res.json({ success: false, message: err });
        return;
      }
      if (rows.length == 0) {
        res.json({ success: false, message: "Student Not Found" });
      } else {
        //fields.forEach((field) => console.log(field.name));
        /* let data = {};
        Object.entries(rows[0]).forEach((col) => {
          if (col[0] != "S_No") {
            data[col[0]] = col[1];
          }
        });
        console.log(data) */ 
        res.json({ success: true, data:Object.entries(rows[0]) });
      }
    }
  );
});

app.listen(PORT,"0.0.0.0", (error) => {
  if (!error)
    console.log(
      "Server is Successfully Running, and App is listening on port " + PORT
    );
  else console.log("Error occurred, server can't start", error);
});
