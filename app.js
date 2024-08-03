const express = require("express");
const cors = require("cors");
const mysql = require("mysql"); // Use mysql2 for better performance and features
const bcrypt = require("bcrypt"); // Use bcrypt directly
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: "68.178.145.230",
  user: "kakarla",
  password: "Kscr2004",
  database: "vtest1",
  connectionLimit: 10, // Adjust the connection limit as needed
});

// Utility function to get a connection from the pool
const getConnection = (callback) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error getting connection from pool:", err);
      callback(err, null);
    } else {
      callback(null, connection);
    }
  });
};

// Routes
app.get("/", (req, res) => {
  res.send("Welcome Sarath");
});

app.post("/admin_login", (req, res) => {
  let { Username, Password } = req.body;

  getConnection((err, connection) => {
    if (err)
      return res.json({ success: false, message: "Database connection error" });

    connection.query(
      "SELECT * FROM admin WHERE Admin_Id_No = ?",
      [Username],
      (err, rows) => {
        connection.release(); // Release the connection back to the pool

        if (err) {
          return res.json({ success: false, message: err.message });
        }
        if (rows.length === 0) {
          return res
            .status(404)
            .json({ success: false, message: "User Not Found" });
        }
        bcrypt.compare(Password, rows[0].Admin_Hash, (err, result) => {
          if (err) {
            return res.json({ success: false, message: err.message });
          }
          if (!result) {
            return res
              .status(401)
              .json({ success: false, message: "Incorrect Password" });
          }
          res.json({
            success: true,
            data: { Admin_Name: rows[0].Admin_Name },
            message: "",
          });
        });
      }
    );
  });
});

app.post("/faculty_login", (req, res) => {
  let { Username, Password } = req.body;

  getConnection((err, connection) => {
    if (err)
      return res.json({ success: false, message: "Database connection error" });

    connection.query(
      "SELECT * FROM faculty WHERE Id_No = ?",
      [Username],
      (err, rows) => {
        connection.release(); // Release the connection back to the pool

        if (err) {
          return res.json({ success: false, message: err.message });
        }
        if (rows.length === 0) {
          return res
            .status(404)
            .json({ success: false, message: "User Not Found" });
        }
        bcrypt.compare(Password, rows[0].Fac_Hash, (err, result) => {
          if (err) {
            return res.json({ success: false, message: err.message });
          }
          if (!result) {
            return res
              .status(401)
              .json({ success: false, message: "Incorrect Password" });
          }
          res.json({ success: true, message: "" });
        });
      }
    );
  });
});

app.post("/student_login", (req, res) => {
  let { Username, Password } = req.body;

  getConnection((err, connection) => {
    if (err)
      return res.json({ success: false, message: "Database connection error" });

    connection.query(
      "SELECT * FROM student WHERE Id_No = ?",
      [Username],
      (err, rows) => {
        connection.release(); // Release the connection back to the pool

        if (err) {
          return res.json({ success: false, message: err.message });
        }
        if (rows.length === 0) {
          return res
            .status(404)
            .json({ success: false, message: "User Not Found" });
        }
        bcrypt.compare(Password, rows[0].Stu_Hash, (err, result) => {
          if (err) {
            return res.json({ success: false, message: err.message });
          }
          if (!result) {
            return res
              .status(401)
              .json({ success: false, message: "Incorrect Password" });
          }
          res.json({ success: true, message: "" });
        });
      }
    );
  });
});

app.post("/student/viewdetails", (req, res) => {
  let { Id_No } = req.body;

  getConnection((err, connection) => {
    if (err)
      return res.json({ success: false, message: "Database connection error" });

    connection.query(
      "SELECT * FROM student_master_data WHERE Id_No = ?",
      [Id_No],
      (err, rows) => {
        connection.release(); // Release the connection back to the pool

        if (err) {
          return res.json({ success: false, message: err.message });
        }
        if (rows.length === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Student Not Found" });
        }
        res.json({ success: true, data: rows[0] });
      }
    );
  });
});

app.post("/student/search", (req, res) => {
  let { SearchBy, Search } = req.body;
  let query;
  query =
    "SELECT Id_No,First_Name,Sur_Name,Father_Name,Stu_Class AS Class,Stu_Section AS Section,Mobile FROM `student_master_data` WHERE " +
    SearchBy +
    " LIKE '%" +
    Search +
    "%' ORDER BY Id_No DESC";
  getConnection((err, connection) => {
    if (err)
      return res.json({ success: false, message: "Database connection error" });

    connection.query(query, (err, rows) => {
      connection.release();
      if (err) {
        return res.json({ success: false, message: err.message });
      }
      if (rows.length === 0) {
        return res.json({ success: false, message: "No Student Found" });
      }
      res.json({ success: true, data: rows });
    });
  });
});

app.post("/student/attendance/view", (req, res) => {
  let { Class, Section, Type, Date } = req.body;
  let query1, query2;
  query1 =
    "SELECT Id_No,First_Name FROM `student_master_data` WHERE Stu_Class = '" +
    Class +
    "' AND Stu_Section = '" +
    Section +
    "'";
  getConnection((err, connection) => {
    if (err)
      return res.json({ success: false, message: "Database connection error" });
    connection.query(query1, (err, rows) => {
      connection.release();
      if (err) {
        return res.json({ success: false, message: err.message });
      }
      if (rows.length === 0) {
        return res.json({
          success: false,
          message: "Class and Section not Available",
        });
      }
      const getAttendanceData = (id, name, Date, Type) => {
        return new Promise((resolve, reject) => {
          const query2 = `SELECT * FROM \`attendance_daily\` WHERE Id_No = '${id}' AND Date = '${Date}' AND ${Type} IN ('A','L')`;

          getConnection((e2, conn) => {
            if (e2) {
              return reject({
                success: false,
                message: "Database connection error",
              });
            }

            conn.query(query2, (e3, rows) => {
              conn.release();

              if (e3) {
                return reject({ success: false, message: e3.message });
              }

              if (rows.length === 0) {
                resolve({ Id_No: id, Name: name, Attendance: "P" });
              } else {
                resolve({ Id_No: id, Name: name, Attendance: rows[0][Type] });
              }
            });
          });
        });
      };
      const ids = rows.map((row) => [row.Id_No, row.First_Name]);
      const promises = ids.map((id) =>
        getAttendanceData(id[0], id[1], Date, Type)
      );
      Promise.all(promises)
        .then((attendance) => {
          res.json({ success: true, data: attendance });
        })
        .catch((error) => {
          res.json(error); // This will send either the database error or connection error
        });
    });
  });
});

app.post("/student/attendance/upload", async (req, res) => {
  let { Class, Section, Date, Type, Data } = req.body;

  try {
    getConnection(async (err, connection) => {
      if (err) return res.json({ success: false, message: err.message });
      // Fetch student IDs
      const students = [];
      new Promise((resolve, reject) => {
        connection.query(
          "SELECT Id_No FROM `student_master_data` WHERE Stu_Class = ? AND Stu_Section = ?",
          [Class, Section],
          (err, rows) => {
            if (rows.length === 0) {
              return res.json({
                success: false,
                message: "Class and Section Not Available",
              });
            }
            if (err) return res.json({ success: false, message: err.message });
            rows.forEach((row) => {
              students.push(row.Id_No);
            });
            resolve(students);
          }
        );
      })
        .then((all_students) => {
          // Process each student
          for (const student of Object.values(all_students)) {
            let id = student;
            connection.query(
              "SELECT * FROM `attendance_daily` WHERE Id_No = ? AND Date = ?",
              [id, Date],
              (err, rows) => {
                if (err)
                  return res.json({ success: false, message: err.message });
                if (rows.length === 0 && Object.keys(Data).includes(id)) {
                  connection.query(
                    "INSERT INTO `attendance_daily` (Id_No, Date, ??) VALUES (?, ?, ?)",
                    [Type, id, Date, Data[id]]
                  );
                } else if (rows.length != 0) {
                  if (Object.keys(Data).includes(id)) {
                    connection.query(
                      "UPDATE `attendance_daily` SET " +
                        Type +
                        " = '" +
                        Data[id] +
                        "' WHERE Id_No = '" +
                        id +
                        "' AND Date = '" +
                        Date +
                        "'"
                    );
                  } else {
                    connection.query(
                      "UPDATE `attendance_daily` SET " +
                        Type +
                        " = NULL WHERE Id_No = '" +
                        id +
                        "' AND Date = '" +
                        Date +
                        "'"
                    );
                  }
                }
              }
            );
          }
        })
        .then(() => {
          // Send success response
          res.json({
            success: true,
            message: "Attendance data processed successfully",
          });
        })
        .catch((err) => {
          console.log(err);
        });
    });
  } catch (error) {
    // Handle errors
    res.json({ success: false, message: error.message });
  }
});

app.listen(PORT, "0.0.0.0", (error) => {
  if (!error) {
    console.log(
      "Server is successfully running, and app is listening on port " + PORT
    );
  } else {
    console.log("Error occurred, server can't start", error);
  }
});
