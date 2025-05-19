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

router.post("/getclass", (req, res) => {
  try {
    let { Id_No } = req.body;
    getConnection((err, connection) => {
      if (err)
        return res.json({
          success: false,
          message: "Database connection error",
        });
      connection.query(
        "SELECT Stu_Class AS Class,Stu_Section AS Section FROM `student_master_data` WHERE Id_No = ?",
        [Id_No],
        (err, rows) => {
          if (err) return res.json({ success: false, message: err });
          return res.json({
            success: true,
            Class: rows[0]["Class"],
            Section: rows[0]["Section"],
          });
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/getclass",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

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
        "SELECT Status FROM `student` WHERE Id_No = ?",
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
    let { Id_No, Sibling_Status } = req.body;

    getConnection((err, connection) => {
      if (err)
        return res.json({
          success: false,
          message: "Database connection error",
        });

      connection.query(
        "SELECT * FROM student_master_data WHERE Id_No = ?",
        [Id_No],
        (err, rows) => {
          connection.release(); // Release the connection back to the pool

          if (err) {
            return res.json({ success: false, message: err.message });
          }
          if (rows.length === 0) {
            return res.json({ success: false, message: "Student Not Found" });
          }
          if (!Sibling_Status) {
            return res.json({ success: true, data: Object.entries(rows[0]) });
          }
          var siblings = rows[0]["Siblings"];
          if (siblings == null || siblings == "") {
            rows[0]["Siblings"] = [];
            return res.json({ success: true, data: Object.entries(rows[0]) });
          } else {
            if (siblings.includes(",")) {
              function getSiblingsDetails(Sibling_Id_No) {
                return new Promise((resolve, reject) => {
                  axios
                    .post("http://18.61.98.208:3000/viewdetails", {
                      Id_No: Sibling_Id_No,
                    })
                    .then((sibling_details) => {
                      let siblings_data = sibling_details.data.data;
                      resolve({
                        Id_No: siblings_data[1][1],
                        Name: siblings_data[3][1],
                        Class: `${siblings_data[11][1]} ${siblings_data[12][1]}`, //Class Section
                      });
                    })
                    .catch((err) => {
                      reject(err);
                    });
                });
              }
              let sibling_promises = [];
              siblings.split(",").forEach((sibling) => {
                sibling_promises.push(getSiblingsDetails(sibling));
              });
              Promise.all(sibling_promises)
                .then((val) => {
                  rows[0]["Siblings"] = val;
                })
                .then(() => {
                  return res.json({
                    success: true,
                    data: Object.entries(rows[0]),
                  });
                })
                .catch((err) => {
                  console.log(err);
                });
            } else {
              axios
                .post("http://18.61.98.208:3000/viewdetails", {
                  Id_No: siblings,
                  Sibling_Status: false,
                })
                .then((sibling_details) => {
                  let siblings_data = sibling_details.data.data;
                  return {
                    Id_No: siblings_data[1][1],
                    Name: siblings_data[3][1],
                    Class: `${siblings_data[11][1]} ${siblings_data[12][1]}`, //Class Section
                  };
                })
                .then((val) => {
                  rows[0]["Siblings"] = [val];
                })
                .then(() => {
                  return res.json({
                    success: true,
                    data: Object.entries(rows[0]),
                  });
                });
            }
          }
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

router.post("/search", (req, res) => {
  try {
    let { SearchBy, Search, Page, Limit } = req.body;

    // Default values for pagination
    Page = parseInt(Page) || 1; // Default to page 1 if not provided
    Limit = parseInt(Limit) || 50; // Default limit is 50 students per page
    let Offset = (Page - 1) * Limit; // Calculate OFFSET

    let query = `
      SELECT Id_No, First_Name, Sur_Name, Father_Name, 
             Stu_Class AS Class, Stu_Section AS Section, Mobile 
      FROM student_master_data 
      WHERE ${SearchBy} LIKE ? 
      ORDER BY Id_No DESC 
      LIMIT ? OFFSET ?`;

    let countQuery = `
      SELECT COUNT(*) AS total FROM student_master_data 
      WHERE ${SearchBy} LIKE ?`;

    getConnection((err, connection) => {
      if (err)
        return res.json({
          success: false,
          message: "Database connection error",
        });

      // First, get the total count of matching records
      connection.query(countQuery, [`%${Search}%`], (err, countResult) => {
        if (err) {
          connection.release();
          return res.json({ success: false, message: err.message });
        }

        let totalRecords = countResult[0].total;
        let totalPages = Math.ceil(totalRecords / Limit); // Calculate total pages

        // Then, get the paginated records
        connection.query(query, [`%${Search}%`, Limit, Offset], (err, rows) => {
          connection.release();
          if (err) {
            return res.json({ success: false, message: err.message });
          }
          if (rows.length === 0) {
            return res.json({ success: false, message: "No Student Found" });
          }

          res.json({
            success: true,
            data: rows,
            totalRecords: totalRecords,
            totalPages: totalPages,
            currentPage: Page,
          });
        });
      });
    });
  } catch (err) {
    logger.error({
      label: "/search",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
    res.json({ success: false, message: "Server Error" });
  }
});

router.post("/individualattendance/view", (req, res) => {
  try {
    let { Id_No, Date } = req.body;

    getConnection((err, connection) => {
      if (err)
        return res.json({
          success: false,
          message: "Database connection error",
        });

      connection.query(
        "SELECT ca.AM_Status,ca.PM_Status FROM `class_attendance` ca JOIN student_master_data smd ON smd.Stu_Class = ca.Class AND smd.Stu_Section = ca.Section WHERE smd.Id_No = ? AND ca.Date = ?",
        [Id_No, Date],
        (err, rows) => {
          if (err) {
            return res.json({ success: false, message: err });
          }
          if (rows.length == 0) {
            return res.json({ success: true, data: { AM: "N", PM: "N" } });
          }
          connection.query(
            "SELECT * FROM `attendance_daily` WHERE Id_No = ? AND Date = ?",
            [Id_No, Date],
            (err, att_rows) => {
              if (err) {
                return res.json({ success: false, message: err });
              }
              let punchdetails = { AM: "N", PM: "N" };
              if (att_rows.length == 0) {
                if (rows[0].AM_Status == "Submitted") {
                  punchdetails["AM"] = "P";
                }
                if (rows[0].PM_Status == "Submitted") {
                  punchdetails["PM"] = "P";
                }
              } else {
                if (rows[0].AM_Status == "Submitted") {
                  punchdetails["AM"] =
                    att_rows[0]["AM"] == null || att_rows[0]["AM"] == ""
                      ? "P"
                      : att_rows[0]["AM"];
                }
                if (rows[0].PM_Status == "Submitted") {
                  punchdetails["PM"] =
                    att_rows[0]["PM"] == null || att_rows[0]["PM"] == ""
                      ? "P"
                      : att_rows[0]["PM"];
                }
              }
              return res.json({ success: true, data: punchdetails });
            }
          );
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/faculty/attendance/view",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/attendance/view", (req, res) => {
  try {
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
        return res.json({
          success: false,
          message: "Database connection error",
        });
      connection.query(query1, (err, rows) => {
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

            connection.query(query2, (e3, rows) => {
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

router.post("/attendance/upload", async (req, res) => {
  try {
    var { Class, Section, Date, Type, Data } = req.body;

    function submitAttendance(connection) {
      return new Promise((resolve, reject) => {
        connection.query(
          "SELECT * FROM class_attendance WHERE Date = ? AND Class = ? AND Section = ?",
          [Date, Class, Section],
          async (err, rows) => {
            if (err) {
              return resolve({ success: false, message: err });
            }
            const currentTime = moment().utcOffset(330).format("hh:mm:ss a");
            if (rows.length == 0) {
              await connection.query(
                `INSERT INTO class_attendance (Date, Class, Section, ${Type}_Status, ${Type}_Punch_Time) 
          VALUES (?, ?, ?, 'Submitted', ?)`,
                [Date, Class, Section, currentTime],
                (er, res) => {
                  if (er) {
                    return resolve({ success: false, message: err });
                  }
                  return resolve({
                    success: true,
                    message: "Class Attendance Inserted Successfully",
                  });
                }
              );
            } else {
              if (
                !rows[0][`${Type}_Status`] ||
                rows[0][`${Type}_Status`] == null
              ) {
                connection.query(
                  `UPDATE class_attendance SET ${Type}_Status = 'Submitted', ${Type}_Punch_Time = ? 
                  WHERE Class = ? AND Section = ? AND Date = ?`,
                  [currentTime, Class, Section, Date],
                  (er, res) => {
                    if (er) {
                      return { success: false, message: err };
                    }
                    return resolve({
                      success: true,
                      message: "Class Attendance Updated Successfully",
                    });
                  }
                );
              }
            }
          }
        );
      });
    }

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
              if (err)
                return res.json({ success: false, message: err.message });
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
          .then(async () => {
            Promise.resolve(submitAttendance(connection)).then((r) => {
              return r;
            });
          })
          .then((v) => {
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

router.post("/vanattendance/view", (req, res) => {
  try {
    let { Route, Type, Date } = req.body;
    let query1, query2;
    query1 =
      "SELECT Id_No,First_Name FROM `student_master_data` WHERE Van_Route = '" +
      Route +
      "' AND (Stu_Class LIKE '%CLASS%' OR Stu_Class ='PreKG' OR Stu_Class ='LKG' OR Stu_Class ='UKG')";
    getConnection((err, connection) => {
      if (err)
        return res.json({
          success: false,
          message: "Database connection error",
        });
      connection.query(query1, (err, rows) => {
        if (err) {
          return res.json({ success: false, message: err.message });
        }
        if (rows.length === 0) {
          return res.json({
            success: false,
            message: "No Student Found in this Route",
          });
        }
        const getAttendanceData = (id, name, Date, Type) => {
          return new Promise((resolve, reject) => {
            const query2 = `SELECT * FROM \`van_attendance_daily\` WHERE Id_No = '${id}' AND Date = '${Date}' AND ${Type} IN ('A')`;

            connection.query(query2, (e3, rows) => {
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
  } catch (err) {
    logger.error({
      label: "/vanattendance/view",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/vanattendance/upload", async (req, res) => {
  try {
    let { Route, Date, Type, Data } = req.body;

    function submitVanAttendance(connection) {
      return new Promise((resolve, reject) => {
        connection.query(
          "SELECT * FROM van_attendance WHERE Date = ? AND Route = ?",
          [Date, Route],
          async (err, rows) => {
            if (err) {
              return resolve({ success: false, message: err });
            }
            const currentTime = moment().utcOffset(330).format("hh:mm:ss a");
            if (rows.length == 0) {
              await connection.query(
                `INSERT INTO van_attendance (Date, Route, ${Type}_Status, ${Type}_Punch_Time) 
          VALUES (?, ?, 'Submitted', ?)`,
                [Date, Route, currentTime],
                (er, res) => {
                  if (er) {
                    return resolve({ success: false, message: err });
                  }
                  return resolve({
                    success: true,
                    message: "Route Attendance Inserted Successfully",
                  });
                }
              );
            } else {
              if (
                !rows[0][`${Type}_Status`] ||
                rows[0][`${Type}_Status`] == null
              ) {
                connection.query(
                  `UPDATE van_attendance SET ${Type}_Status = 'Submitted', ${Type}_Punch_Time = ? 
                  WHERE Route = ? AND Date = ?`,
                  [currentTime, Route, Date],
                  (er, res) => {
                    if (er) {
                      return { success: false, message: err };
                    }
                    return resolve({
                      success: true,
                      message: "Route Attendance Updated Successfully",
                    });
                  }
                );
              }
            }
          }
        );
      });
    }

    try {
      getConnection(async (err, connection) => {
        if (err) return res.json({ success: false, message: err.message });
        // Fetch student IDs
        const students = [];
        new Promise((resolve, reject) => {
          connection.query(
            "SELECT Id_No FROM `student_master_data` WHERE Van_Route = ? AND (Stu_Class LIKE '%CLASS%' OR Stu_Class ='PreKG' OR Stu_Class ='LKG' OR Stu_Class ='UKG')",
            [Route],
            (err, rows) => {
              if (rows.length === 0) {
                return res.json({
                  success: false,
                  message: "No Student Found in this Route",
                });
              }
              if (err)
                return res.json({ success: false, message: err.message });
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
                "SELECT * FROM `van_attendance_daily` WHERE Id_No = ? AND Date = ?",
                [id, Date],
                (err, rows) => {
                  if (err)
                    return res.json({ success: false, message: err.message });
                  if (rows.length === 0 && Object.keys(Data).includes(id)) {
                    connection.query(
                      "INSERT INTO `van_attendance_daily` (Id_No, Date, ??) VALUES (?, ?, ?)",
                      [Type, id, Date, Data[id]]
                    );
                  } else if (rows.length != 0) {
                    if (Object.keys(Data).includes(id)) {
                      connection.query(
                        "UPDATE `van_attendance_daily` SET " +
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
                        "UPDATE `van_attendance_daily` SET " +
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
          .then(async () => {
            Promise.resolve(submitVanAttendance(connection)).then((r) => {
              return r;
            });
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
  } catch (err) {
    logger.error({
      label: "/vanattendance/upload",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/attendance/report", (req, res) => {
  try {
    let { Class, Section, Type, AbsentType, Date } = req.body;
    function getDetails(connection, id, type) {
      return new Promise((resolve, reject) => {
        connection.query(
          "SELECT First_Name AS Name,Stu_Class AS Class,Stu_Section AS Section,Mobile FROM student_master_data WHERE Id_No = '" +
            id +
            "'",
          (err, results) => {
            if (err) {
              return resolve(err);
            } else {
              resolve({
                Id_No: id,
                Name: results[0].Name,
                Class: results[0].Class,
                Section: results[0].Section,
                Mobile: results[0].Mobile,
                Type: type,
              });
            }
          }
        );
      });
    }
    function getAttendanceData(connection, id, name, section, mobile, type) {
      return new Promise((resolve) => {
        let query =
          "SELECT * FROM `attendance_daily` WHERE Id_No = '" +
          id +
          "' AND Date = '" +
          Date +
          "' AND " +
          Type +
          "";
        if (type == "Both") {
          query += " IN ('A','L')";
        } else {
          query += " = '" + type + "'";
        }
        connection.query(query, (err, results) => {
          if (err) {
            return resolve(err);
          }
          if (results.length != 0) {
            return resolve({
              Id_No: id,
              Name: name,
              Class: Class,
              Section: section,
              Mobile: mobile,
              Type: results[0][Type],
            });
          } else {
            return resolve(null);
          }
        });
      });
    }
    getConnection(async (err, connection) => {
      let query =
        "SELECT First_Name AS Name,Id_No,Stu_Section AS Section,Mobile,Van_Route AS Route FROM `student_master_data` WHERE Stu_Class = ";
      if (!Class && !Section) {
        let att_promise = new Promise((resolve) => {
          let query =
            "SELECT * FROM `attendance_daily` ad JOIN `student_master_data` smd ON ad.Id_No = smd.Id_No WHERE Date = '" +
            Date +
            "' AND " +
            Type;
          if (AbsentType == "Both") {
            query += " IN ('A','L')";
          } else {
            query += " = '" + AbsentType + "'";
          }
          query +=
            " ORDER BY FIELD(smd.Stu_Class,'PreKG','LKG','UKG','1 CLASS','2 CLASS','3 CLASS','4 CLASS','5 CLASS','6 CLASS','7 CLASS','8 CLASS','9 CLASS','10 CLASS'),FIELD(Stu_Section,'A','B','C','D')";
          connection.query(query, (err, rows) => {
            if (err) {
              return resolve(err);
            } else {
              if (rows.length == 0) {
                resolve([]);
              } else {
                resolve(rows.map((row) => [row.Id_No, row[Type]]));
              }
            }
          });
        });
        Promise.resolve(att_promise).then((value) => {
          if (value.length == 0) {
            res.json({ success: true, data: [] });
          } else {
            let promises = [];
            value.forEach((student) => {
              promises.push(getDetails(connection, student[0], student[1]));
            });
            Promise.all(promises).then((value) => {
              let data = {};
              value.map((student) => {
                if (
                  !Object.keys(data).includes(student.Class + student.Section)
                ) {
                  data[student.Class + student.Section] = [];
                }
                data[student.Class + student.Section].push(student);
              });
              res.json({ success: true, data: data });
            });
          }
        });
      } else if (!Class && Section) {
        return res.json({
          success: false,
          message: "Section Only not Allowed",
        });
      } else {
        if (Class && !Section) {
          query += "'" + Class + "'";
        } else if (Class && Section) {
          query += "'" + Class + "' AND Stu_Section = '" + Section + "'";
        }
        new Promise((resolve) => {
          connection.query(query, (err, rows) => {
            if (err) resolve(err);
            else
              resolve(
                rows.map((row) => [
                  row.Id_No,
                  row.Name,
                  row.Section,
                  row.Mobile,
                ])
              );
          });
        }).then((ids) => {
          let promises = [];
          ids.forEach((student) => {
            promises.push(
              getAttendanceData(
                connection,
                student[0],
                student[1],
                student[2],
                student[3],
                AbsentType
              )
            );
          });
          Promise.all(promises)
            .then((value) => {
              let data = {};
              value.map((student) => {
                if (student) {
                  if (
                    !Object.keys(data).includes(student.Class + student.Section)
                  ) {
                    data[student.Class + student.Section] = [];
                  }
                  data[student.Class + student.Section].push(student);
                }
              });
              res.json({ success: true, data: data });
            })
            .catch((err) => {
              res.json({ success: false, message: err });
            });
        });
      }
    });
  } catch (err) {
    logger.error({
      label: "/attendance/report",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/vanattendance/report", (req, res) => {
  try {
    let { Route, Type, Date } = req.body;
    function getDetails(connection, id) {
      return new Promise((resolve, reject) => {
        connection.query(
          "SELECT First_Name AS Name,Stu_Class AS Class,Stu_Section AS Section,Mobile,Van_Route FROM student_master_data WHERE Id_No = '" +
            id +
            "'",
          (err, results) => {
            if (err) {
              return resolve(err);
            } else {
              resolve({
                Id_No: id,
                Name: results[0].Name,
                Class: results[0].Class,
                Section: results[0].Section,
                Mobile: results[0].Mobile,
                Route: results[0].Van_Route,
              });
            }
          }
        );
      });
    }
    function getAttendanceData(
      connection,
      id,
      name,
      cls,
      section,
      mobile,
      route
    ) {
      return new Promise((resolve) => {
        let query =
          "SELECT * FROM `van_attendance_daily` WHERE Id_No = '" +
          id +
          "' AND Date = '" +
          Date +
          "' AND " +
          Type +
          " IN ('A')";
        connection.query(query, (err, results) => {
          if (err) {
            return resolve(err);
          }
          if (results.length != 0) {
            return resolve({
              Id_No: id,
              Name: name,
              Class: cls,
              Section: section,
              Mobile: mobile,
              Route: route,
            });
          } else {
            return resolve(null);
          }
        });
      });
    }
    getConnection(async (err, connection) => {
      if (err) {
        return res.json({
          success: false,
          message: "Error connecting to database",
        });
      }
      if (!Route) {
        let routes = [];
        axios
          .post("http://18.61.98.208:3000/getroutes")
          .then((rows) => {
            routes = rows.data.data;
          })
          .then(() => {
            let att_promise = new Promise((resolve) => {
              let query =
                "SELECT * FROM `van_attendance_daily` WHERE Date = '" +
                Date +
                "' AND " +
                Type +
                " IN ('A')";
              connection.query(query, (err, rows) => {
                if (err) {
                  return resolve(err);
                } else {
                  if (rows.length == 0) {
                    resolve([]);
                  } else {
                    resolve(rows.map((row) => row.Id_No));
                  }
                }
              });
            });
            let attendance_submitted_promise = new Promise((resolve) => {
              connection.query(
                "SELECT * FROM `van_attendance` WHERE Date = ? AND Route IN ('" +
                  routes.join("','") +
                  "') AND ?? = 'Submitted'",
                [Date, `${Type}_Status`],
                (err, rows) => {
                  if (err) {
                    return res.json({ success: false, message: err });
                  }
                  if (rows.length != routes.length) {
                    resolve({
                      success: false,
                      message: "Attendance Not Submitted for some Routes",
                    });
                  } else {
                    resolve({
                      success: true,
                      message: "Attendance Submitted for All Routes",
                    });
                  }
                }
              );
            });
            Promise.resolve(attendance_submitted_promise).then((val) => {
              Promise.resolve(att_promise).then((value) => {
                if (value.length == 0) {
                  res.json({ success: true, data: [] });
                } else {
                  let promises = [];
                  value.forEach((id) => {
                    promises.push(getDetails(connection, id));
                  });
                  Promise.all(promises).then((value) => {
                    let data = {};
                    value.map((student) => {
                      if (!Object.keys(data).includes(student.Route)) {
                        data[student.Route] = [];
                      }
                      data[student.Route].push(student);
                    });
                    res.json({
                      success: true,
                      data: data,
                      message: val.message,
                    });
                  });
                }
              });
            });
          });
      } else {
        connection.query(
          "SELECT * FROM `van_attendance` WHERE Date = ? AND Route = ? AND ?? = 'Submitted'",
          [Date, Route, `${Type}_Status`],
          (err, rows) => {
            if (err) {
              return res.json({ success: false, message: err });
            }
            if (rows.length == 0) {
              return res.json({
                success: false,
                message: "Attendance Not Submitted for this Route",
              });
            }
            let query =
              "SELECT Id_No,First_Name AS Name,Stu_Class AS Class,Stu_Section AS Section,Mobile,Van_Route AS Route FROM `student_master_data` WHERE Van_Route = '" +
              Route +
              "' AND (Stu_Class LIKE '%CLASS%' OR Stu_Class ='PreKG' OR Stu_Class ='LKG' OR Stu_Class ='UKG')";
            new Promise((resolve) => {
              connection.query(query, (err, rows) => {
                if (err) resolve(err);
                else
                  resolve(
                    rows.map((row) => [
                      row.Id_No,
                      row.Name,
                      row.Class,
                      row.Section,
                      row.Mobile,
                      row.Route,
                    ])
                  );
              });
            }).then((ids) => {
              let promises = [];
              ids.forEach((student) => {
                promises.push(
                  getAttendanceData(
                    connection,
                    student[0],
                    student[1],
                    student[2],
                    student[3],
                    student[4],
                    student[5]
                  )
                );
              });
              Promise.all(promises)
                .then((value) => {
                  let data = {};
                  value.map((student) => {
                    if (student) {
                      if (!Object.keys(data).includes(student.Route)) {
                        data[student.Route] = [];
                      }
                      data[student.Route].push(student);
                    }
                  });
                  res.json({ success: true, data: data });
                })
                .catch((err) => {
                  res.json({ success: false, message: err });
                });
            });
          }
        );
      }
    });
  } catch (err) {
    logger.error({
      label: "/vanattendance/report",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/getexams", (req, res) => {
  try {
    const { Id_No } = req.body;
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }
      connection.query(
        "SELECT Stu_Class AS Class FROM `student_master_data` WHERE Id_No = ?",
        [Id_No],
        (err, rows) => {
          if (err) {
            return res.json({ success: false, message: err });
          }
          let Class = rows[0]["Class"];
          //Class = "1 CLASS";
          if (
            Class.toString().includes("Drop") ||
            Class.toString().includes("Others")
          ) {
            return res.json({
              success: false,
              message: "Student Passedout or Dropped",
            });
          }
          axios
            .post("http://18.61.98.208:3000/fetchexams", {
              Class: Class,
            })
            .then((val) => {
              if (!val.data.success)
                return res.json({ success: false, message: val.data.message });
              return res.json({ success: true, data: val.data.data });
            });
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/getexams",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/marks", (req, res) => {
  try {
    const { Id_No, Exam } = req.body;
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }
      connection.query(
        "SELECT First_Name AS Name,Stu_Class AS Class,Stu_Section AS Section FROM `student_master_data` WHERE Id_No = ?",
        [Id_No],
        (err, rows) => {
          if (err) {
            return res.json({ success: false, message: err });
          }
          let Class = rows[0]["Class"];
          if (
            Class.toString().includes("Drop") ||
            Class.toString().includes("Others")
          ) {
            return res.json({
              success: false,
              message: "Student Passedout or Dropped",
            });
          }
          connection.query(
            "SELECT Max_Marks FROM `class_wise_examination` WHERE Class = ? AND Exam = ?",
            [Class, Exam],
            (err, resp) => {
              if (err) {
                return res.json({ success: false, message: err });
              }
              let Max_Marks = parseInt(resp[0]["Max_Marks"]);
              let subjects = [],
                sub_max = {},
                Max_Total = 0;
              connection.query(
                "SELECT * FROM `class_wise_subjects` WHERE Class = ? AND Exam = ?",
                [Class, Exam],
                (err, val) => {
                  if (err) {
                    return res.json({ success: false, message: err });
                  }
                  if (val.length == 0) {
                    return res.json({
                      success: false,
                      message: "Subjects Not Found for this Exam",
                    });
                  }
                  val.forEach((subject) => {
                    subjects.push(subject.Subjects);
                    sub_max[subject.Subjects] = parseInt(subject.Max_Marks);
                    Max_Total += parseInt(subject.Max_Marks);
                  });
                  let marks = {
                    Name: rows[0].Name,
                    Class: Class + " " + rows[0].Section,
                    Subjects: {},
                  };

                  connection.query(
                    "SELECT * FROM `stu_marks` WHERE Id_No = ? AND Exam = ?",
                    [Id_No, Exam],
                    (err, result) => {
                      if (err) {
                        return res.json({ success: false, message: err });
                      }
                      if (result.length === 0) {
                        return res.json({
                          success: false,
                          message: "Marks not Available for this Exam",
                        });
                      }
                      let sum = 0;
                      subjects.forEach((subject, index) => {
                        try {
                          if (result[0]["sub" + (index + 1)] != "A") {
                            marks["Subjects"][subject] = parseInt(
                              result[0]["sub" + (index + 1)]
                            );
                          } else {
                            marks["Subjects"][subject] = 0;
                          }
                        } catch (err) {
                          marks["Subjects"][subject] = 0;
                        }
                        sum += marks["Subjects"][subject];
                      });
                      marks["Total"] = sum;
                      //let Max_Total = Max_Marks * subjects.length;
                      let Percentage = parseFloat(
                        (sum / Max_Total) * 100
                      ).toFixed(2);
                      marks["Percentage"] = Percentage;
                      if (
                        marks["Percentage"] >= 80 &&
                        marks["Percentage"] <= 100
                      ) {
                        marks["Grade"] = "Excellent";
                      } else if (
                        marks["Percentage"] >= 70 &&
                        marks["Percentage"] < 80
                      ) {
                        marks["Grade"] = "Good";
                      } else if (
                        marks["Percentage"] >= 60 &&
                        marks["Percentage"] < 70
                      ) {
                        marks["Grade"] = "Satisfactory";
                      } else if (
                        marks["Percentage"] >= 50 &&
                        marks["Percentage"] < 60
                      ) {
                        marks["Grade"] = "Above Average";
                      } else if (
                        marks["Percentage"] >= 35 &&
                        marks["Percentage"] < 50
                      ) {
                        marks["Grade"] = "Average";
                      } else if (
                        marks["Percentage"] > 0 &&
                        marks["Percentage"] < 35
                      ) {
                        marks["Grade"] = "Below Average";
                      } else {
                        marks["Grade"] = "";
                      }
                      return res.json({
                        success: true,
                        data: marks,
                        Sub_Max: sub_max,
                        Max_Total: Max_Total,
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/marks",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/gethomeworks", (req, res) => {
  try {
    const { Id_No, Date } = req.body;
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }
      connection.query(
        "SELECT Stu_Class AS Class,Stu_Section AS Section FROM `student_master_data` WHERE Id_No = ?",
        [Id_No],
        (error, rows) => {
          if (error) {
            console.log(err);
            return res.json({ success: false, message: err });
          }
          axios
            .post("http://18.61.98.208:3000/gethomeworks", {
              Class: rows[0].Class,
              Section: rows[0].Section,
              Date: Date,
            })
            .then((val) => {
              let final_data = [];
              if (!val.data.success) {
                return res.json({ success: false, message: val.data.message });
              }
              val.data.data.forEach((subject) => {
                if (subject["data"][0] || subject["data"][1]) {
                  final_data.push({
                    subject: subject["subject"],
                    path: `https://victoryschools.in/Victory/Files/Homework/${rows[0].Class} ${rows[0].Section}/${Date}/${subject["subject"]}.pdf`,
                  });
                }
              });
              return final_data;
            })
            .then((final_data) => {
              return new Promise((resolve, reject) => {
                connection.query(
                  "SELECT * FROM `student_homework` WHERE Id_No = ? AND Date = ?",
                  [Id_No, Date],
                  (er, rows) => {
                    if (rows.length == 0) {
                      final_data.forEach((sub) => {
                        sub.Image = null;
                        sub.Text = null;
                        sub.Response_Time = null;
                        sub.Viewed_Status = false;
                      });
                    } else {
                      const subjectMap = Object.fromEntries(
                        rows.map((detail) => [
                          detail.Subject,
                          {
                            Image: detail.Image,
                            Text: detail.Text,
                            Response_Time: detail.Response_Time,
                          },
                        ])
                      );
                      final_data.forEach((item) => {
                        const details = subjectMap[item.subject];
                        if (details) {
                          item.Image = details.Image;
                          item.Text = details.Text;
                          item.Response_Time = details.Response_Time;
                          item.Viewed_Status = true;
                        } else {
                          item.Image = null;
                          item.Text = null;
                          item.Response_Time = null;
                          item.Viewed_Status = false;
                        }
                      });
                    }
                    resolve(final_data);
                  }
                );
              });
            })
            .then((final_data) => {
              return res.json({
                success: true,
                data: final_data,
              });
            });
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/gethomeworks",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/homework/recordlog", (req, res) => {
  try {
    const { Id_No, Date, Subject } = req.body;
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }
      connection.query(
        "SELECT * FROM `student_homework` WHERE Date = ? AND Id_No = ? AND Subject = ?",
        [Date, Id_No, Subject],
        (er, rows) => {
          if (er) {
            return res.json({ success: false, message: er });
          }
          if (rows.length == 0) {
            connection.query(
              "SELECT First_Name FROM `student_master_data` WHERE Id_No = ?",
              [Id_No],
              (er, student) => {
                if (er) {
                  return res.json({ success: false, message: er });
                }
                connection.query(
                  `INSERT INTO student_homework (Date, Id_No, Name, Subject, First_View, Latest_View)
                   VALUES (?, ?, ?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE Latest_View = ?`,
                  [
                    Date,
                    Id_No,
                    student[0].First_Name,
                    Subject,
                    moment().utcOffset(330).format("DD-MM-YYYY hh:mm:ss a"),
                    moment().utcOffset(330).format("DD-MM-YYYY hh:mm:ss a"),
                    moment().utcOffset(330).format("DD-MM-YYYY hh:mm:ss a"), // Latest_View update
                  ],
                  (err, result) => {
                    if (err) return res.json({ success: false, message: err });
                    res.json({
                      success: true,
                      message:
                        result.affectedRows === 1
                          ? "Log Record Inserted Successfully"
                          : "Log Record Updated Successfully",
                    });
                  }
                );
              }
            );
          } else {
            connection.query(
              "UPDATE `student_homework` SET Latest_View = ? WHERE Date = ? AND Id_No = ? AND Subject = ?",
              [
                moment().utcOffset(330).format("DD-MM-YYYY hh:mm:ss a"),
                Date,
                Id_No,
                Subject,
              ],
              (err, rows) => {
                if (err) {
                  return res.json({ success: false, message: err });
                }
                if (rows["affectedRows"] != 0) {
                  return res.json({
                    success: true,
                    message: "Log Record Updated Succesfully",
                  });
                } else {
                  return res.json({
                    success: false,
                    message: "Log Record Updation Failed",
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
      label: "/homework/recordlog",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/getmonthlyattendance", (req, res) => {
  try {
    const { Id_No } = req.body;
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }
      let working_days = {};
      let attendance_data = {};
      connection.query(
        "SELECT * FROM `working_days` WHERE Working_Days != 0",
        (err, rows) => {
          if (err) {
            return res.json({ success: false, message: err });
          }
          if (rows.length == 0) {
            return res.json({ success: true, data: [] });
          }
          rows.forEach((row) => {
            working_days[row["Month"]] = row["Working_Days"];
          });
          connection.query(
            "SELECT * FROM `stu_att_master` WHERE Id_No = ?",
            [Id_No],
            (err, rows) => {
              if (err) {
                return res.json({ success: false, message: err });
              }
              if (rows.length == 0) {
                return res.json({
                  success: false,
                  message: "Your Attendance Not Available",
                });
              }
              attendance_data = Object.entries(working_days).map((data) => {
                let temp = {};
                temp[data[0]] = {
                  Total_Days: data[1],
                  Present_Days: rows[0][data[0]],
                  Absent_Days: parseInt(data[1]) - parseInt(rows[0][data[0]]),
                };
                return temp;
              });
              return res.json({ success: true, data: attendance_data });
            }
          );
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/getmonthlyattendance",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/homework/updatedatabase", (req, res) => {
  try {
    const { Id_No, Date, Subject, imgCount, Text, New } = req.body;
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }
      let img_text = "";
      if (imgCount == 0) {
        img_text = null;
      } else {
        for (let i = 1; i <= imgCount; i++) {
          img_text +=
            "../../Files/Homework Homework/" +
            Date +
            "/" +
            Id_No +
            "-" +
            Subject +
            i +
            ".jpg";
          if (i != imgCount) {
            img_text += ",";
          }
        }
      }
      connection.query(
        "UPDATE `student_homework` SET Image = ?,Text = ?,Response_Time = ? WHERE Id_No = ? AND Date = ? AND Subject = ?",
        [
          img_text,
          Text != "" ? Text : null,
          moment().utcOffset(330).format("DD-MM-YYYY hh:mm:ss a"),
          Id_No,
          Date,
          Subject,
        ],
        (t, status) => {
          connection.release();
          if (status["affectedRows"] != 0)
            return res.json({
              success: true,
              message: "Database Updated Successfully",
            });
          return res.json({
            success: false,
            message: "Database Updation Failed",
          });
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/homework/updatedatabase",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/deletehomework", (req, res) => {
  try {
    const { Id_No, Date, Subject } = req.body;
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }

      connection.query(
        "UPDATE `student_homework` SET Image = NULL,Text = NULL,Response_Time = NULL WHERE Id_No = ? AND Date = ? AND Subject = ?",
        [Id_No, Date, Subject],
        (t, val) => {
          if (val["affectedRows"] != 0) {
            res.json({
              success: true,
              message: "Homework Deleted Successfully",
            });
          } else {
            res.json({
              success: false,
              message: "Homework Deletion Failed",
            });
          }
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/deletehomework",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/fee_details", (req, res) => {
  try {
    let { Id_No, Type } = req.body;

    getConnection((err, connection) => {
      if (err) return res.json({ success: false, errcode: 500, message: err });

      if (Type === "Vehicle Fee") {
        connection.query(
          "SELECT * FROM student_master_data WHERE Id_No = ?",
          [Id_No],
          (er, rows) => {
            if (er)
              return res.json({ success: false, errcode: 500, message: er });
            if (rows[0].Van_Route == null || rows[0].Van_Route == "") {
              return res.json({
                success: false,
                errcode: 1,
                message: "No Vehicle Fee",
              });
            }
            let route = rows[0].Van_Route;
            connection.query(
              "SELECT * FROM `stu_fee_master_data` WHERE Id_No = ? AND Type = 'Vehicle Fee'",
              [Id_No],
              (err, fee_rows) => {
                if (err)
                  return res.json({
                    success: false,
                    errcode: 500,
                    message: err,
                  });
                if (fee_rows.length == 0) {
                  return res.json({
                    success: false,
                    errcode: 2,
                    message:
                      "Student Van Details Not Found in Fee Data! Contact School Office",
                  });
                }
                if (route != fee_rows[0].Route) {
                  return res.json({
                    success: false,
                    errcode: 3,
                    message:
                      "Student Van Details does not Match! Contact School Office",
                  });
                }
                if (route == "Drop" || fee_rows[0].Route == "Drop") {
                  return res.json({
                    success: false,
                    errcode: 4,
                    message: "This student is no longer using the van service!",
                  });
                }
                connection.query(
                  "SELECT SUM(Fee) AS Total_Paid FROM stu_paid_fee WHERE Id_No = ? AND Type = ? GROUP BY Id_No, Type",
                  [Id_No, Type],
                  (er, paid_rows) => {
                    if (er)
                      return res.json({
                        success: false,
                        errcode: 500,
                        message: er,
                      });
                    let paid = 0;
                    if (paid_rows.length != 0) {
                      paid = paid_rows[0].Total_Paid;
                    }
                    let final_data = [
                      {
                        Id_No: rows[0].Id_No,
                        First_Name: rows[0].First_Name,
                        Class: rows[0].Stu_Class,
                        Section: rows[0].Stu_Section,
                        Type: Type,
                        Actual_Fee: fee_rows[0].Actual,
                        Committed_Fee: fee_rows[0].Current_Balance,
                        Last_Balance: fee_rows[0].Last_Balance,
                        Total_Paid: paid,
                        Total_Balance:
                          parseInt(fee_rows[0].Current_Balance) +
                          parseInt(fee_rows[0].Last_Balance) -
                          parseInt(paid),
                        Route: rows[0].Van_Route,
                      },
                    ];
                    return res.json({
                      success: true,
                      data: final_data,
                    });
                  }
                );
              }
            );
          }
        );
      } else {
        // Original query for non-vehicle fee
        const query = `
          SELECT 
            smd.Id_No, smd.First_Name, smd.Stu_Class AS Class, smd.Stu_Section AS Section, 
            af.Type, af.Fee AS Actual_Fee, 
            sfd.Current_Balance AS Committed_Fee, sfd.Last_Balance, 
            COALESCE(pf.Total_Paid, 0) AS Total_Paid,
            (sfd.Last_Balance + sfd.Current_Balance - COALESCE(pf.Total_Paid, 0)) AS Total_Balance
          FROM student_master_data smd 
          JOIN actual_fee af ON smd.Stu_Class = af.Class AND af.Type = ?
          JOIN stu_fee_master_data sfd ON smd.Id_No = sfd.Id_No AND af.Type = sfd.Type
          LEFT JOIN (
            SELECT Id_No, Type, SUM(Fee) AS Total_Paid 
            FROM stu_paid_fee 
            GROUP BY Id_No, Type
          ) pf ON sfd.Id_No = pf.Id_No AND sfd.Type = pf.Type
          WHERE smd.Id_No = ?
        `;

        connection.query(query, [Type, Id_No], (er, rows) => {
          if (er)
            return res.json({ success: false, errcode: 500, message: er });

          if (rows.length === 0) {
            return res.json({
              success: false,
              errcode: 1,
              message: "Fee Details Not Available! Contact Admin Office",
            });
          }

          return res.json({ success: true, data: rows });
        });
      }
    });
  } catch (err) {
    logger.error({
      label: "/fee_details",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/classteacher", (req, res) => {
  try {
    let { Id_No } = req.body;
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }
      connection.query(
        "SELECT emd.Emp_Id AS Id_No,emd.Emp_First_Name AS First_Name,emd.Mobile FROM `employee_master_data` emd JOIN class_teacher ct ON ct.Id_No = emd.Emp_Id RIGHT JOIN student_master_data smd ON smd.Id_No = ? WHERE ct.Class = smd.Stu_Class AND ct.Section = smd.Stu_Section",
        [Id_No],
        (er, rows) => {
          if (er) {
            return res.json({ success: false, message: er });
          }
          if (rows.length == 0) {
            return res.json({
              success: false,
              message: "Class Teacher Not Assigned!",
            });
          }
          return res.json({ success: true, data: rows });
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/classteacher",
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
      connection.query(
        "SELECT tt.* FROM time_table tt JOIN student_master_data smd ON smd.Stu_Class = tt.Class AND smd.Stu_Section = tt.Section WHERE smd.Id_No = ?",
        [Id_No],
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
          let period_promises = [],
            final_data = {};
          final_data["Details"] = {
            Class: rows[0].Class,
            Section: rows[0].Section,
          };
          function getFacultyDetails(id_no = null, subject, period) {
            return new Promise((resolve, reject) => {
              if (id_no) {
                connection.query(
                  "SELECT Emp_First_Name,Mobile FROM employee_master_data WHERE Emp_Id = ?",
                  [id_no],
                  (er, rows) => {
                    if (er) {
                      return resolve({
                        success: false,
                        message: er,
                        subject: subject ? subject : null,
                        period: period,
                      });
                    }
                    if (rows.length == 0) {
                      return resolve({
                        success: false,
                        message: "Employee Not Found",
                        subject: subject ? subject : null,
                        period: period,
                      });
                    }
                    return resolve({
                      success: true,
                      data: rows[0],
                      subject: subject ? subject : null,
                      period: period,
                      emp_id: id_no,
                    });
                  }
                );
              } else {
                return resolve({
                  success: true,
                  subject: subject ? subject : null,
                  period: period,
                });
              }
            });
          }
          let i = 1;
          period_data.forEach((period) => {
            period = period ? period.trim() : period;
            if (period && period.length != 0) {
              let faculty = period.split(",")[0];
              let subject =
                period.split(",")[1] && period.split(",")[1].length != 0
                  ? period.split(",")[1]
                  : null;
              period_promises.push(
                getFacultyDetails(faculty, subject, `Period${i}`)
              );
              final_data[`Period${i}`] = [];
            } else {
              period_promises.push(getFacultyDetails(null, null, `Period${i}`));
              final_data[`Period${i}`] = [];
            }
            i++;
          });
          if (period_promises.length != 0) {
            Promise.all(period_promises)
              .then((v) => {
                v.map((sub) => {
                  if (sub.success) {
                    final_data[sub.period] = {
                      ...sub.data,
                      subject: sub.subject,
                      period: sub.period,
                      emp_id: sub.emp_id ? sub.emp_id : null,
                    };
                  } else {
                    final_data[sub.period] = {
                      subject: sub.subject,
                      period: sub.period,
                    };
                  }
                });
              })
              .then(() => {
                return res.json({ success: true, data: final_data });
              })
              .catch(() => {
                return res.json({
                  success: false,
                  message: "Time Table Not Available",
                });
              });
          } else {
            return res.json({
              success: false,
              message: "Time Table Not Available",
            });
          }
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

router.post("/commitdates", (req, res) => {
  try {
    let { Id_No = null, Date = null, Emp_Id = null } = req.body;
    getConnection((err, connection) => {
      if (err) {
        console.log(err);
        return res.json({
          success: false,
          message: "Database Connection Error",
        });
      }
      let query =
        "SELECT emd.Emp_First_Name,smd.*, cd.* FROM commit_date cd JOIN employee_master_data emd ON cd.Emp_Id = emd.Emp_Id JOIN student_master_data smd ON smd.Id_No = cd.Id_No";
      let conditions = [];
      let params = [];

      if (Id_No) {
        conditions.push("cd.Id_No = ?");
        params.push(Id_No);
      }
      if (Date) {
        conditions.push("cd.DOC = ?");
        params.push(Date);
      }
      if (Emp_Id) {
        conditions.push("cd.Emp_Id = ?");
        params.push(Emp_Id);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      query += " ORDER BY cd.DOC";

      connection.query(query, params, (er, rows) => {
        if (er) {
          return res.json({ success: false, message: er });
        }
        if (rows.length == 0) {
          return res.json({
            success: false,
            errcode: 1,
            message: "No Commitment Dates Found on " + Date,
          });
        }
        return res.json({ success: true, data: rows });
      });
    });
  } catch (err) {
    logger.error({
      label: "/commitdates",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/savecommitstatus", (req, res) => {
  try {
    let { Id_No, Date, Type, Status, Emp_Id } = req.body;
    getConnection((err, connection) => {
      if (err) {
        console.log(err);
        return res.json({
          success: false,
          message: "Database Connection Error",
        });
      }
      connection.query(
        "UPDATE commit_date SET Status = ?,Emp_Id = ? WHERE Id_No = ? AND Type = ? AND DOC = ?",
        [Status, Emp_Id, Id_No, Type, Date],
        (er, rows) => {
          if (er) {
            console.log(er);
            return res.json({
              success: false,
              message: er,
            });
          }
          if (rows.affectedRows === 1) {
            return res.json({ success: true });
          } else {
            return res.json({
              success: false,
              message: "Status Updation Failed!",
            });
          }
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/savecommitstatus",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/deletecommitdate", (req, res) => {
  try {
    let { Id_No, Date, Type } = req.body;
    getConnection((err, connection) => {
      if (err) {
        console.log(err);
        return res.json({
          success: false,
          message: "Database Connection Error",
        });
      }
      connection.query(
        "DELETE FROM commit_date WHERE Id_No = ? AND Type = ? AND DOC = ?",
        [Id_No, Type, Date],
        (er, rows) => {
          if (er) {
            console.log(er);
            return res.json({
              success: false,
              message: er,
            });
          }
          if (rows.affectedRows === 1) {
            return res.json({ success: true });
          } else {
            return res.json({
              success: false,
              message: "Commit Date Deletion Failed!",
            });
          }
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/deletecommitdate",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

router.post("/addcommitdate", (req, res) => {
  try {
    let { Id_No, Date, Type, Status, Emp_Id } = req.body;
    getConnection((err, connection) => {
      if (err) {
        console.log(err);
        return res.json({
          success: false,
          message: "Database Connection Error",
        });
      }
      connection.query(
        "INSERT INTO commit_date(Id_No,Type,DOC,Status,Emp_Id) VALUES(?,?,?,?,?)",
        [Id_No, Type, Date, Status, Emp_Id],
        (er, rows) => {
          if (er) {
            console.log(er);
            return res.json({
              success: false,
              message: er,
            });
          }
          if (rows.affectedRows === 1) {
            return res.json({ success: true });
          } else {
            return res.json({
              success: false,
              message: "Commit Date Insertion Failed!",
            });
          }
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/deletecommitdate",
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
        "SELECT * FROM `student` WHERE Id_No = ? AND BINARY Stu_Password = ?",
        [Username, OldPassword],
        (err, result) => {
          if (err) {
            return res.json({ success: false, message: err });
          }
          if (result.length == 0) {
            console.log(1);
            return res.json({
              success: false,
              message: "Invalid Old Password",
            });
          }
          console.log(2);
          bcrypt.hash(NewPassword, 10).then((hashed) => {
            let hashed_pass = hashed.replace("$2b$", "$2y$");
            connection.query(
              "UPDATE `student` SET Stu_Password = ?,Stu_Hash = ? WHERE Id_No = ?",
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
