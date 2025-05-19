const express = require("express");
const router = express.Router();
const cors = require("cors");
const mysql = require("mysql"); // Use mysql2 for better performance and features
const bcrypt = require("bcrypt"); // Use bcrypt directly
const axios = require("axios");
const moment = require("moment");
const PORT = 3000;
const TokenFile = require("./token");
const fs = require("fs");
const { createLogger, format, transports } = require("winston");
const { combine, prettyPrint } = format;
const logger = createLogger({
  /* format: combine(prettyPrint()), */
  transports: [new transports.File({ filename: "activity.log" })],
});
// Create a MySQL connection pool
const pool = mysql.createPool({
  host: "68.178.145.230",
  user: "kakarla",
  password: "Kscr2004",
  database: "vtest1",
  connectionLimit: 50,
  waitForConnections: true,
  queueLimit: 0,
  acquireTimeout: 30000,
  connectTimeout: 10000,
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

router.post("/getaccessstatus", (req, res) => {
  try {
    let { Id_No } = req.body;
    getConnection((err, connection) => {
      if (err)
        return res.json({
          success: false,
          message: "Database connection error",
        });
      connection.query(
        "SELECT Status FROM `faculty` WHERE Id_No = ?",
        [Id_No],
        (err, rows) => {
          if (err) return res.json({ success: false, message: err });
          if (rows.length == 0) {
            return res.json({ success: true, Status: "Disabled" });
          }
          return res.json({ success: true, Status: rows[0]["Status"] });
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/getaccessstatus",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/viewdetails", (req, res) => {
  try {
    let { Id_No } = req.body;

    getConnection((err, connection) => {
      if (err)
        return res.json({
          success: false,
          message: "Database connection error",
        });

      connection.query(
        "SELECT * FROM employee_master_data WHERE Emp_Id = ?",
        [Id_No],
        (err, rows) => {
          connection.release(); // Release the connection back to the pool

          if (err) {
            return res.json({ success: false, message: err.message });
          }
          if (rows.length === 0) {
            return res.json({ success: false, message: "Employee Not Found" });
          }
          return res.json({ success: true, data: Object.entries(rows[0]) });
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/viewdetails",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/attendance/view", (req, res) => {
  try {
    let { Id_No, Date } = req.body;

    getConnection((err, connection) => {
      if (err)
        return res.json({
          success: false,
          message: "Database connection error",
        });

      connection.query(
        "SELECT * FROM `employee_attendance` WHERE Id_No = ? AND Date = ?",
        [Id_No, Date],
        (err, rows) => {
          connection.release(); // Release the connection back to the pool
          if (err) {
            return res.json({ success: false, message: err });
          }
          return res.json({ success: true, data: rows });
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/attendance/view",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/attendance/upload", (req, res) => {
  try {
    let { Id_No, Date, Meridiem, Status, Time } = req.body;

    getConnection((err, connection) => {
      if (err)
        return res.json({
          success: false,
          message: "Database connection error",
        });
      connection.query(
        "SELECT * FROM `employee_attendance` WHERE Id_No = ? AND Date = ?",
        [Id_No, Date],
        (err, rows) => {
          if (err) {
            return res.json({ success: false, message: err });
          }
          if (rows.length == 0) {
            connection.query(
              "INSERT INTO `employee_attendance`(Id_No,Date,??,??) VALUES(?,?,?,?)",
              [
                Meridiem.toUpperCase(),
                Meridiem.toUpperCase() + "_Punch_Time",
                Id_No,
                Date,
                Status,
                Time,
              ],
              (val, val2) => {
                connection.release(); // Release the connection back to the pool
                if (val2["affectedRows"] != 0) {
                  return res.json({
                    success: true,
                    message: "Attendance Updated Successfully",
                  });
                } else {
                  return res.json({
                    success: false,
                    message: "Attendance Updation Failed",
                  });
                }
              }
            );
          } else {
            connection.query(
              "UPDATE `employee_attendance` SET ?? = ?,?? = ? WHERE Id_No = ? AND Date = ?",
              [
                Meridiem.toUpperCase(),
                Status,
                Meridiem.toUpperCase() + "_Punch_Time",
                Time,
                Id_No,
                Date,
              ],
              (val, val2) => {
                connection.release(); // Release the connection back to the pool
                if (val2["affectedRows"] != 0) {
                  return res.json({
                    success: true,
                    message: "Attendance Updated Successfully",
                  });
                } else {
                  return res.json({
                    success: false,
                    message: "Attendance Updation Failed",
                  });
                }
              }
            );
          }
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/attendance/upload",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/resetpassword", (req, res) => {
  try {
    let { Username, OldPassword, NewPassword } = req.body;
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }
      connection.query(
        "SELECT * FROM `faculty` WHERE Id_No = ? AND BINARY Password = ?",
        [Username, OldPassword],
        (err, result) => {
          if (err) {
            return res.json({ success: false, message: err });
          }
          if (result.length == 0) {
            return res.json({
              success: false,
              message: "Invalid Old Password",
            });
          }
          bcrypt.hash(NewPassword, 10).then((hashed) => {
            let hashed_pass = hashed.replace("$2b$", "$2y$");
            connection.query(
              "UPDATE `faculty` SET Password = ?,Fac_Hash = ? WHERE Id_No = ?",
              [NewPassword, hashed_pass, Username],
              (err, result) => {
                if (err) {
                  return res.json({ success: false, message: err });
                }
                return res.json({
                  success: true,
                  message: "Password Updated Successfully",
                });
              }
            );
          });
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/resetpassword",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

module.exports = router;
