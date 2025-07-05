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
        "SELECT emd.Status AS Working_Status,f.Status AS Status FROM employee_master_data emd JOIN `faculty` f ON emd.Emp_Id = f.Id_No WHERE emd.Emp_Id = ? AND f.Id_No = ?",
        [Id_No, Id_No],
        (err, rows) => {
          if (err) return res.json({ success: false, message: err });
          if (rows.length == 0) {
            return res.json({ success: true, Status: "Disabled" });
          }
          const status =
            rows[0]["Working_Status"] === "Left Service" ||
            rows[0]["Status"] == "Disabled"
              ? "Disabled"
              : "Enabled";

          return res.json({ success: true, Status: status });
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
    Time = Time.replace(/[\u202F\u00A0]/g, "").trim();

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

router.post("/timetable", (req, res) => {
  try {
    let { Id_No } = req.body;
    getConnection((err, connection) => {
      if (err) {
        console.log(err);
        return res.json({
          success: false,
          message: "Database Connection Error",
        });
      }
      const params = Array(16).fill(Id_No);

      connection.query(
        "SELECT GROUP_CONCAT(CASE WHEN SUBSTRING_INDEX(Period1, ',', 1) = ? THEN CONCAT(Class, ' ', Section, '|', IFNULL(NULLIF(SUBSTRING_INDEX(Period1, ',', -1), ?), 'No Subject')) ELSE NULL END SEPARATOR '; |') AS Period1, GROUP_CONCAT(CASE WHEN SUBSTRING_INDEX(Period2, ',', 1) = ? THEN CONCAT(Class, ' ', Section, '|', IFNULL(NULLIF(SUBSTRING_INDEX(Period2, ',', -1), ?), 'No Subject')) ELSE NULL END SEPARATOR '; |') AS Period2, GROUP_CONCAT(CASE WHEN SUBSTRING_INDEX(Period3, ',', 1) = ? THEN CONCAT(Class, ' ', Section, '|', IFNULL(NULLIF(SUBSTRING_INDEX(Period3, ',', -1), ?), 'No Subject')) ELSE NULL END SEPARATOR '; |') AS Period3, GROUP_CONCAT(CASE WHEN SUBSTRING_INDEX(Period4, ',', 1) = ? THEN CONCAT(Class, ' ', Section, '|', IFNULL(NULLIF(SUBSTRING_INDEX(Period4, ',', -1), ?), 'No Subject')) ELSE NULL END SEPARATOR '; |') AS Period4, GROUP_CONCAT(CASE WHEN SUBSTRING_INDEX(Period5, ',', 1) = ? THEN CONCAT(Class, ' ', Section, '|', IFNULL(NULLIF(SUBSTRING_INDEX(Period5, ',', -1), ?), 'No Subject')) ELSE NULL END SEPARATOR '; |') AS Period5, GROUP_CONCAT(CASE WHEN SUBSTRING_INDEX(Period6, ',', 1) = ? THEN CONCAT(Class, ' ', Section, '|', IFNULL(NULLIF(SUBSTRING_INDEX(Period6, ',', -1), ?), 'No Subject')) ELSE NULL END SEPARATOR '; |') AS Period6, GROUP_CONCAT(CASE WHEN SUBSTRING_INDEX(Period7, ',', 1) = ? THEN CONCAT(Class, ' ', Section, '|', IFNULL(NULLIF(SUBSTRING_INDEX(Period7, ',', -1), ?), 'No Subject')) ELSE NULL END SEPARATOR '; |') AS Period7, GROUP_CONCAT(CASE WHEN SUBSTRING_INDEX(Period8, ',', 1) = ? THEN CONCAT(Class, ' ', Section, '|', IFNULL(NULLIF(SUBSTRING_INDEX(Period8, ',', -1), ?), 'No Subject')) ELSE NULL END SEPARATOR '; |') AS Period8 FROM time_table",
        params,
        (er, rows) => {
          if (er) {
            return res.json({ success: false, message: er });
          }
          if (rows.length == 0) {
            return res.json({
              success: false,
              message: "Time Table Not Available!",
            });
          }
          let period_data = [];
          for (let i = 1; i <= 8; i++) {
            period_data.push(rows[0][`Period${i}`]);
          }
          if (
            Array.isArray(period_data) &&
            period_data.length === 8 &&
            period_data.every((item) => item === null)
          ) {
            return res.json({ success: true, data: [] });
          }
          return res.json({ success: true, data: period_data });
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/timetable",
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
