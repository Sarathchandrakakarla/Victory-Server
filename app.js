const express = require("express");
const cors = require("cors");
const mysql = require("mysql"); // Use mysql2 for better performance and features
const bcrypt = require("bcrypt"); // Use bcrypt directly
const axios = require("axios");
const moment = require("moment");
const app = express();
const PORT = 3000;
const TokenFile = require("./token");
const fs = require("fs");
const { createLogger, format, transports } = require("winston");
const { combine, prettyPrint } = format;
const logger = createLogger({
  /* format: combine(prettyPrint()), */
  transports: [new transports.File({ filename: "activity.log" })],
});
// Middleware
app.use(cors());
app.use(express.json());
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

// Routes
app.get("/", (req, res) => {
  res.send("Welcome Sarath");
});

app.post("/logout", (req, res) => {
  try {
    const { Username, UserType } = req.body;
    logger.info({
      label: "Authentication",
      message: {
        user: UserType,
        username: Username,
        task: "logged out",
      },
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
    res.json({ success: true });
  } catch (err) {
    console.log(err);
  }
});

app.post("/video_gallery", (req, res) => {
  try {
    getConnection((err, connection) => {
      if (err)
        return res.json({
          success: false,
          message: "Database connection error",
        });
      connection.query("SELECT * FROM youtube", (err, rows) => {
        connection.release(); // Release the connection back to the pool

        if (err) {
          return res.json({ success: false, message: err.message });
        }
        function parseDate(dateString) {
          const [datePart, timePart] = dateString.split(" ");
          const [day, month, year] = datePart.split("-");
          const [hours, minutes, seconds] = timePart.split(":");
          return new Date(year, month - 1, day, hours, minutes, seconds); // months are 0-indexed
        }

        rows.sort((a, b) => {
          const dateA = parseDate(a.Published_Date);
          const dateB = parseDate(b.Published_Date);
          return dateB - dateA; // Sort from latest to oldest
        });
        res.json(rows);
      });
    });
  } catch (err) {
    logger.error({
      label: "/video_gallery",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/admin_login", (req, res) => {
  try {
    let { Username, Password } = req.body;
    getConnection((err, connection) => {
      if (err)
        return res.json({
          success: false,
          message: "Database connection error",
        });

      connection.query(
        "SELECT * FROM admin WHERE Admin_Id_No = ?",
        [Username],
        (err, rows) => {
          connection.release(); // Release the connection back to the pool

          if (err) {
            return res.json({ success: false, message: err.message });
          }
          if (rows.length === 0) {
            return res.json({ success: false, message: "User Not Found" });
          }
          bcrypt.compare(
            Password,
            rows[0].Admin_Hash.toString().replace("$2y$", "$2b$"),
            (err, result) => {
              if (err) {
                return res.json({ success: false, message: err.message });
              }
              if (!result) {
                return res.json({
                  success: false,
                  message: "Incorrect Password",
                });
              }
              logger.info({
                label: "Authentication",
                message: {
                  user: "Admin",
                  username: Username,
                  password: Password,
                  task: "logged in",
                },
                timestamp: new Date().toLocaleString(undefined, {
                  timeZone: "Asia/Kolkata",
                }),
              });
              res.json({
                success: true,
                data: { Name: rows[0].Admin_Name },
                message: "",
              });
            }
          );
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/admin_login",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/faculty_login", (req, res) => {
  try {
    let { Username, Password } = req.body;

    getConnection((err, connection) => {
      if (err)
        return res.json({
          success: false,
          message: "Database connection error",
        });

      connection.query(
        "SELECT * FROM faculty WHERE Id_No = ?",
        [Username],
        (err, rows) => {
          connection.release(); // Release the connection back to the pool

          if (err) {
            return res.json({ success: false, message: err.message });
          }
          if (rows.length === 0) {
            return res.json({ success: false, message: "User Not Found" });
          }
          bcrypt.compare(
            Password,
            rows[0].Fac_Hash.toString().replace("$2y$", "$2b$"),
            (err, result) => {
              if (err) {
                return res.json({ success: false, message: err.message });
              }
              if (!result) {
                return res.json({
                  success: false,
                  message: "Incorrect Password",
                });
              }
              logger.info({
                label: "Authentication",
                message: {
                  user: "Faculty",
                  username: Username,
                  password: Password,
                  task: "logged in",
                },
                timestamp: new Date().toLocaleString(undefined, {
                  timeZone: "Asia/Kolkata",
                }),
              });
              res.json({
                success: true,
                data: { Name: rows[0].Faculty_Name, Role: rows[0].Role },
                message: "",
              });
            }
          );
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/faculty_login",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/student_login", (req, res) => {
  try {
    let { Username, Password } = req.body;

    getConnection((err, connection) => {
      if (err)
        return res.json({
          success: false,
          message: "Database connection error",
        });

      connection.query(
        "SELECT smd.First_Name,s.* FROM student s JOIN student_master_data smd ON smd.Id_No = s.Id_No WHERE s.Id_No = ?",
        [Username],
        (err, rows) => {
          connection.release(); // Release the connection back to the pool

          if (err) {
            return res.json({ success: false, message: err.message });
          }
          if (rows.length === 0) {
            return res.json({ success: false, message: "User Not Found" });
          }
          bcrypt.compare(
            Password,
            rows[0].Stu_Hash.toString().replace("$2y$", "$2b$"),
            (err, result) => {
              if (err) {
                return res.json({ success: false, message: err.message });
              }
              if (!result) {
                return res.json({
                  success: false,
                  message: "Incorrect Password",
                });
              }
              if (rows[0].Status == "Disabled") {
                return res.json({
                  success: false,
                  message: "Your Login has been Disabled..Contact Admin Office",
                });
              }
              /* logger.info({
                label: "Authentication",
                message: {
                  user: "Student",
                  username: Username,
                  password: Password,
                  task: "logged in",
                },
                timestamp: new Date().toLocaleString(undefined, {
                  timeZone: "Asia/Kolkata",
                }),
              }); */
              res.json({
                success: true,
                data: { Name: rows[0].First_Name },
                message: "",
              });
            }
          );
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/student_login",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/student/getclass", (req, res) => {
  try {
    let { Id_No } = req.body;
    getConnection((err, connection) => {
      if (err)
        return res.json({
          success: false,
          message: "Database connection error",
        });
      connection.query(
        "SELECT Stu_Class AS Class FROM `student_master_data` WHERE Id_No = ?",
        [Id_No],
        (err, rows) => {
          if (err) return res.json({ success: false, message: err });
          return res.json({ success: true, Class: rows[0]["Class"] });
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/student/getclass",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/student/getaccessstatus", (req, res) => {
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
      label: "/student/getclass",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/student/viewdetails", (req, res) => {
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
                    .post("http://18.61.98.208:3000/student/viewdetails", {
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
                .post("http://18.61.98.208:3000/student/viewdetails", {
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
      label: "/student/viewdetails",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/student/search", (req, res) => {
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
      label: "/student/search",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
    res.json({ success: false, message: "Server Error" });
  }
});

app.post("/student/individualattendance/view", (req, res) => {
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

app.post("/student/attendance/view", (req, res) => {
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
      label: "/student/attendance/view",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/student/attendance/upload", async (req, res) => {
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
            const currentTime = moment().format("hh:mm:ss a");
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
      label: "/student/attendance/upload",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/student/vanattendance/view", (req, res) => {
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
      label: "/student/vanattendance/view",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/student/vanattendance/upload", async (req, res) => {
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
            const currentTime = moment().format("hh:mm:ss a");
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
      label: "/student/vanattendance/upload",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/student/attendance/report", (req, res) => {
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
                  if (!Object.keys(data).includes(student.Class)) {
                    data[student.Class] = {};
                  }
                  if (
                    !Object.keys(data[student.Class]).includes(student.Section)
                  ) {
                    data[student.Class][student.Section] = [];
                  }
                  data[student.Class][student.Section].push(student);
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
      label: "/student/attendance/report",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/student/vanattendance/report", (req, res) => {
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
      label: "/student/vanattendance/report",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/fetchexams", (req, res) => {
  try {
    const { Class } = req.body;
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }
      connection.query(
        "SELECT * FROM `class_wise_examination` WHERE Class = ?",
        [Class],
        (err, rows) => {
          if (err) {
            return res.json({ success: false, message: err });
          }
          if (rows.length == 0) {
            return res.json({ success: true, data: ["No Exam Found"] });
          }
          return res.json({ success: true, data: rows.map((row) => row.Exam) });
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/fetchexams",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/fetchsubjects", (req, res) => {
  try {
    const { Class } = req.body;
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }
      connection.query(
        "SELECT DISTINCT Subjects FROM `class_wise_subjects` WHERE Class = ?",
        [Class],
        (err, rows) => {
          if (err) {
            return res.json({ success: false, message: err });
          }
          if (rows.length == 0) {
            return res.json({ success: true, data: ["No Subjects Found"] });
          }
          return res.json({
            success: true,
            data: rows.map((row) => row.Subjects),
          });
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/fetchsubjects",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/student/getexams", (req, res) => {
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
      label: "/student/getexams",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/student/marks", (req, res) => {
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
      label: "/student/marks",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/student/gethomeworks", (req, res) => {
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
      label: "/student/gethomeworks",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/student/homework/recordlog", (req, res) => {
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
                  "INSERT INTO `student_homework`(Date,Id_No,Name,Subject,First_View,Latest_View) VALUES(?,?,?,?,?,?)",
                  [
                    Date,
                    Id_No,
                    student[0].First_Name,
                    Subject,
                    moment().format("hh:mm:ss a"),
                    moment().format("hh:mm:ss a"),
                  ],
                  (err, rows) => {
                    if (err) {
                      return res.json({ success: false, message: err });
                    }
                    if (rows["affectedRows"] != 0) {
                      return res.json({
                        success: true,
                        message: "Log Record Inserted Succesfully",
                      });
                    } else {
                      return res.json({
                        success: false,
                        message: "Log Record Insertion Failed",
                      });
                    }
                  }
                );
              }
            );
          } else {
            connection.query(
              "UPDATE `student_homework` SET Latest_View = ? WHERE Date = ? AND Id_No = ? AND Subject = ?",
              [moment().format("hh:mm:ss a"), Date, Id_No, Subject],
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
      label: "/student/homework/recordlog",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/gethomeworklogs", (req, res) => {
  try {
    const { Date, Class, Section, Subject } = req.body;
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }
      connection.query(
        "SELECT smd.Id_No, smd.First_Name, CASE WHEN sh.Id_No IS NULL THEN 'Not Viewed Yet' ELSE 'Viewed' END AS View_Status, CASE WHEN sh.Id_No IS NULL THEN NULL ELSE sh.First_View END AS First_View, CASE WHEN sh.Id_No IS NULL THEN NULL ELSE sh.Latest_View END AS Latest_View FROM student_master_data smd LEFT JOIN student_homework sh ON smd.Id_No = sh.Id_No AND sh.Date = ? AND sh.Subject = ? WHERE smd.Stu_Class = ? AND smd.Stu_Section = ?",
        [Date, Subject, Class, Section],
        (er, rows) => {
          if (er) {
            return res.json({ success: false, message: er });
          }
          return res.json({ success: true, data: rows });
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/gethomeworklogs",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/student/getmonthlyattendance", (req, res) => {
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
          rows.forEach((row) => {
            working_days[row["Month"]] = row["Working_Days"];
          });
        }
      );
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
    });
  } catch (err) {
    logger.error({
      label: "/student/getmonthlyattendance",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/classwisemarks", (req, res) => {
  try {
    let { Class, Section, Exam, MarksType } = req.body;
    let Max;
    function getMarks(connection, id, name, cls, subjects, max_subjects) {
      return new Promise((resolve, reject) => {
        connection.query(
          "SELECT * FROM stu_marks WHERE Id_No = ? AND Exam = ?",
          [id, Exam],
          (err, rows) => {
            if (err) {
              reject(err);
            }
            let marks = { [id]: { Name: name, Class: cls, Subjects: {} } };
            let Max_Sum = 0;
            if (rows.length == 0) {
              subjects.forEach((subject) => {
                marks[id]["Subjects"][subject] = 0;
              });
              marks[id]["Total"] = 0;
              marks[id]["Percentage"] = "";
              marks[id]["Grade"] = "";
            } else {
              let sum = 0,
                max_sum = parseInt(Max) * subjects.length;
              Max_Sum = max_sum;
              for (let i = 0; i < subjects.length; i++) {
                marks[id]["Subjects"][subjects[i]] = rows[0]["sub" + (i + 1)];
                try {
                  if (
                    marks[id]["Subjects"][subjects[i]] == "A" ||
                    marks[id]["Subjects"][subjects[i]] == ""
                  ) {
                    sum += 0;
                  } else {
                    sum += parseInt(marks[id]["Subjects"][subjects[i]]);
                  }
                } catch (err) {
                  sum = 0;
                }
                marks[id]["Total"] = sum;
                if (MarksType == "Normal") {
                  marks[id]["Percentage"] = parseFloat(
                    (sum / parseInt(max_sum)) * 100
                  ).toFixed(2);
                  if (
                    marks[id]["Percentage"] >= 80 &&
                    marks[id]["Percentage"] <= 100
                  ) {
                    marks[id]["Grade"] = "Excellent";
                  } else if (
                    marks[id]["Percentage"] >= 70 &&
                    marks[id]["Percentage"] < 80
                  ) {
                    marks[id]["Grade"] = "Good";
                  } else if (
                    marks[id]["Percentage"] >= 60 &&
                    marks[id]["Percentage"] < 70
                  ) {
                    marks[id]["Grade"] = "Satisfactory";
                  } else if (
                    marks[id]["Percentage"] >= 50 &&
                    marks[id]["Percentage"] < 60
                  ) {
                    marks[id]["Grade"] = "Above Average";
                  } else if (
                    marks[id]["Percentage"] >= 35 &&
                    marks[id]["Percentage"] < 50
                  ) {
                    marks[id]["Grade"] = "Average";
                  } else if (
                    marks[id]["Percentage"] > 0 &&
                    marks[id]["Percentage"] < 35
                  ) {
                    marks[id]["Grade"] = "Below Average";
                  } else {
                    marks[id]["Grade"] = "";
                  }
                } else if (MarksType == "GPA") {
                  let sum = 0;
                  subjects.forEach((subject, index) => {
                    let mark =
                      (marks[id]["Subjects"][subject] / max_subjects[index]) *
                      100;
                    if (mark >= 91 && mark <= 100) {
                      sum += 10;
                    } else if (mark >= 81 && mark <= 90) {
                      sum += 9;
                    } else if (mark >= 71 && mark <= 80) {
                      sum += 8;
                    } else if (mark >= 61 && mark <= 70) {
                      sum += 7;
                    } else if (mark >= 51 && mark <= 60) {
                      sum += 6;
                    } else if (mark >= 41 && mark <= 50) {
                      sum += 5;
                    } else if (mark >= 35 && mark <= 40) {
                      sum += 4;
                    } else if (mark >= 0 && mark <= 34) {
                      sum += 3;
                    }
                  });
                  let avg = parseFloat(sum / subjects.length).toFixed(1),
                    grade;
                  if (avg == 10) {
                    grade = "A1";
                  } else if (avg >= 9 && avg < 10) {
                    grade = "A2";
                  } else if (avg >= 8 && avg < 9) {
                    grade = "B1";
                  } else if (avg >= 7 && avg < 8) {
                    grade = "B2";
                  } else if (avg >= 6 && avg < 7) {
                    grade = "C1";
                  } else if (avg >= 5 && avg < 6) {
                    grade = "C2";
                  } else if (avg >= 4 && avg < 5) {
                    grade = "D1";
                  } else if (avg >= 3 && avg < 4) {
                    grade = "D2";
                  } else if (avg >= 0 && avg < 3) {
                    grade = "E1";
                  }
                  marks[id]["GPA"] = avg;
                  marks[id]["Grade"] = grade;
                }
              }
            }
            resolve([marks, Max_Sum]);
          }
        );
      });
    }

    function checkData(data) {
      let dataexists = false;
      data.forEach((student_details) => {
        if (Object.values(student_details)[0].Total != 0) {
          dataexists = true;
        }
        if (dataexists) return;
      });
      return dataexists;
    }

    function sortMarks(data) {
      if (!checkData(data)) {
        return "Data Not Found";
      }
      let sortedData = data.sort((a, b) => {
        const totalA = Object.values(a)[0].Total;
        const totalB = Object.values(b)[0].Total;
        return totalB - totalA;
      });
      return ranking(sortedData);
    }

    function ranking(data) {
      let rank = 0;
      let lastTotal = null;
      data.forEach((item) => {
        const currentTotal = Object.values(item)[0].Total;
        if (currentTotal !== lastTotal) {
          rank = rank + 1;
        }
        Object.values(item)[0]["Rank"] = rank;

        lastTotal = currentTotal;
      });
      return data;
    }
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }
      let query =
        "SELECT Id_No,First_Name,Stu_Section AS Section FROM `student_master_data` WHERE Stu_Class = '" +
        Class +
        "'";
      if (Section) query += " AND Stu_Section = '" + Section + "'";
      connection.query(query, (err, rows) => {
        if (err) return res.json({ success: false, message: err });
        if (rows.length == 0)
          return res.json({
            success: false,
            message: "Class and Section Not Available",
          });
        Promise.resolve(
          new Promise((resolve) => {
            connection.query(
              "SELECT Max_Marks FROM `class_wise_examination` WHERE Class = ? AND Exam = ?",
              [Class, Exam],
              (err, max_marks) => {
                if (err) return res.json({ success: false, message: err });
                Max = max_marks[0].Max_Marks;
                resolve();
              }
            );
          })
        ).then(() => {
          Promise.resolve(
            new Promise((resolve) => {
              connection.query(
                "SELECT * FROM `class_wise_subjects` WHERE Class = ? AND Exam = ?",
                [Class, Exam],
                (err, subjects) => {
                  if (err) return res.json({ success: false, message: err });
                  if (subjects.length == 0)
                    return res.json({
                      success: false,
                      message: "No Subjects Found for this Class and Exam",
                    });
                  resolve([
                    subjects.map((subject) => subject.Subjects),
                    subjects.map((subject) => subject.Max_Marks),
                  ]);
                }
              );
            })
          ).then((subjects) => {
            let promises = [];
            rows.forEach((row) => {
              promises.push(
                getMarks(
                  connection,
                  row.Id_No,
                  row.First_Name,
                  Class + " " + row.Section,
                  subjects[0],
                  subjects[1]
                )
              );
            });
            Promise.all(promises).then((val) => {
              let Max_Sum = val[0][1];
              let data = [];
              val.forEach((obj) => {
                data.push(obj[0]);
              });
              data = sortMarks(data);
              if (data == "Data Not Found") {
                return res.json({ success: false, message: "Data Not Found" });
              }
              return res.json({
                success: true,
                data: data,
                Subjects: subjects[0],
                Max_Sum: Max_Sum,
              });
            });
          });
        });
      });
    });
  } catch (err) {
    logger.error({
      label: "/classwisemarks",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/gethomeworks", (req, res) => {
  try {
    const { Class, Section, Date } = req.body;
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }
      axios
        .post("http://18.61.98.208:3000/fetchsubjects", { Class: Class })
        .then((val) => {
          if (!val.data.success) {
            return res.json({ success: false, message: val.data.message });
          }
          const subjects = val.data.data;
          if (subjects.length === 0) {
            return res.json({ success: false, message: "No Subjects Found" });
          }

          // Convert each subject into a promise for the database query
          const promises = subjects.map((subject) => {
            return new Promise((resolve, reject) => {
              connection.query(
                "SELECT * FROM `homework` WHERE Class = ? AND Section = ? AND Date = ? AND Subject = ?",
                [Class, Section, Date, subject],
                (err, rows) => {
                  if (err) {
                    reject(err);
                  } else if (rows.length === 0) {
                    resolve({ subject, data: [null, null] }); // No data found for subject
                  } else {
                    resolve({
                      subject,
                      data: [rows[0].Image, rows[0].Text],
                    });
                  }
                }
              );
            });
          });

          // Run all queries in parallel
          return Promise.all(promises);
        })
        .then((results) => {
          return res.json({ success: true, data: results });
        })
        .catch((err) => {
          return res.json({ success: false, message: err.message || err });
        });
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

app.post("/homework/updatedatabase", (req, res) => {
  try {
    const { Class, Section, Date, Subject, imgCount, Text, New } = req.body;
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
            "../../Files/Homework/" +
            Class +
            " " +
            Section +
            "/" +
            Date +
            "/" +
            Subject +
            i +
            ".jpg"; //Date;
          if (i != imgCount) {
            img_text += ",";
          }
        }
      }
      if (New) {
        connection.query(
          "INSERT INTO `homework`(Class,Section,Date,Subject,Text,Image) VALUES(?,?,?,?,?,?)",
          [Class, Section, Date, Subject, Text != "" ? Text : null, img_text],
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
      } else {
        connection.query(
          "UPDATE `homework` SET Image = ?,Text = ? WHERE Class = ? AND Section = ? AND Date = ? AND Subject = ?",
          [img_text, Text != "" ? Text : null, Class, Section, Date, Subject],
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
      }
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

app.post("/deletehomework", (req, res) => {
  try {
    const { Class, Section, Date, Subject } = req.body;
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }

      connection.query(
        "DELETE FROM `homework` WHERE Class = ? AND Section = ? AND Date = ? AND Subject = ?",
        [Class, Section, Date, Subject],
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

app.post("/faculty/viewdetails", (req, res) => {
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
      label: "/faculty/viewdetails",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/faculty/attendance/view", (req, res) => {
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
      label: "/faculty/attendance/view",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/faculty/attendance/upload", (req, res) => {
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
      label: "/faculty/attendance/upload",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/getfacultyattendance", (req, res) => {
  try {
    let { Date } = req.body;

    getConnection(async (err, connection) => {
      if (err)
        return res.json({
          success: false,
          message: "Database connection error",
        });
      connection.query(
        "SELECT emd.Emp_Id, emd.Emp_First_Name, COALESCE(CASE WHEN ea.AM = 'A' THEN 'Absent' WHEN ea.AM = 'L' THEN 'Leave' WHEN ea.AM = 'P' THEN 'Present' WHEN ea.AM IS NULL THEN 'Not Punched' ELSE 'Not Punched' END, 'Not Punched') AS AM_Status, COALESCE(CASE WHEN ea.PM = 'A' THEN 'Absent' WHEN ea.PM = 'L' THEN 'Leave' WHEN ea.PM = 'P' THEN 'Present' WHEN ea.PM IS NULL THEN 'Not Punched' ELSE 'Not Punched' END, 'Not Punched') AS PM_Status, COALESCE(ea.AM_Punch_Time, '') AS AM_Punch_Time, COALESCE(ea.PM_Punch_Time, '') AS PM_Punch_Time FROM employee_master_data emd LEFT JOIN employee_attendance ea ON emd.Emp_Id = ea.Id_No AND ea.Date = ? WHERE emd.Status = 'Working' ORDER BY emd.Emp_Id",
        [Date],
        (err, rows) => {
          if (err) {
            return res.json({ success: false, message: err });
          }
          let filtered_rows = { AM: {}, PM: {}, Today: {} };
          filtered_rows["AM"]["Present"] = rows.filter(
            (emp) => emp.AM_Status == "Present"
          );

          filtered_rows["AM"]["Absent"] = rows.filter(
            (emp) => emp.AM_Status == "Absent"
          );

          filtered_rows["AM"]["Leave"] = rows.filter(
            (emp) => emp.AM_Status == "Leave"
          );

          filtered_rows["AM"]["Not Punched"] = rows.filter(
            (emp) => emp.AM_Status == "Not Punched"
          );

          filtered_rows["PM"]["Absent"] = rows.filter(
            (emp) => emp.PM_Status == "Absent"
          );

          filtered_rows["PM"]["Present"] = rows.filter(
            (emp) => emp.PM_Status == "Present"
          );

          filtered_rows["PM"]["Leave"] = rows.filter(
            (emp) => emp.PM_Status == "Leave"
          );

          filtered_rows["PM"]["Not Punched"] = rows.filter(
            (emp) => emp.PM_Status == "Not Punched"
          );

          // Categorize based on the given conditions

          filtered_rows["Today"]["Present"] = rows.filter((emp) => {
            return (
              emp.AM_Status === "Present" || emp.PM_Status === "Present" // Present in AM or PM
            );
          });

          filtered_rows["Today"]["Absent"] = rows.filter((emp) => {
            return (
              // Absent should only be categorized as Absent if neither is present or on leave
              (emp.AM_Status === "Absent" || emp.PM_Status === "Absent") &&
              !(emp.AM_Status === "Present" || emp.PM_Status === "Present") && // Not Present
              !(emp.AM_Status === "Leave" || emp.PM_Status === "Leave") // Not Leave
            );
          });

          filtered_rows["Today"]["Leave"] = rows.filter((emp) => {
            return (
              // Leave is categorized if either AM or PM is Leave, but the other shouldn't be Present
              (emp.AM_Status === "Leave" || emp.PM_Status === "Leave") &&
              !(emp.AM_Status === "Present" || emp.PM_Status === "Present") // Not Present in either AM or PM
            );
          });

          filtered_rows["Today"]["Not Punched"] = rows.filter((emp) => {
            return (
              emp.AM_Status === "Not Punched" && emp.PM_Status === "Not Punched"
            ); // Both AM and PM are Not Punched
          });

          return res.json({
            success: true,
            data: rows,
            filtered_data: filtered_rows,
          });
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/getfacultyattendance",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/getstudentattendance", (req, res) => {
  try {
    let { Date } = req.body;
    getConnection((err, connection) => {
      if (err)
        return res.json({
          success: false,
          message: "Database connection error",
        });
      let submitted_classes = { AM: [], PM: [] };
      connection.query(
        "SELECT * FROM `class_attendance` WHERE Date = ?",
        [Date],
        (err, rows) => {
          if (err) {
            return res.json({ success: false, message: err });
          }
          submitted_classes["AM"] = rows
            .filter((row) => row["AM_Status"] == "Submitted")
            .map((row) => `${row["Class"]} ${row["Section"]}`);

          submitted_classes["PM"] = rows
            .filter((row) => row["PM_Status"] == "Submitted")
            .map((row) => `${row["Class"]} ${row["Section"]}`);
        }
      );
      connection.query(
        "SELECT smd.Id_No,smd.First_Name,smd.Stu_Class AS Class,smd.Stu_Section AS Section,COALESCE( CASE WHEN ad.AM = 'A' THEN 'Absent' WHEN ad.AM = 'L' THEN 'Leave' ELSE 'Present' END, 'Present' ) AS AM_Status, COALESCE( CASE WHEN ad.PM = 'A' THEN 'Absent' WHEN ad.PM = 'L' THEN 'Leave' ELSE 'Present' END, 'Present' ) AS PM_Status FROM student_master_data smd LEFT JOIN attendance_daily ad ON smd.Id_No = ad.Id_No AND ad.Date = ? WHERE smd.Stu_Class IN ('PreKG','LKG','UKG','1 CLASS','2 CLASS','3 CLASS','4 CLASS','5 CLASS','6 CLASS','7 CLASS','8 CLASS','9 CLASS','10 CLASS') ORDER BY FIELD(smd.Stu_Class, 'PreKG', 'LKG', 'UKG', '1 CLASS', '2 CLASS', '3 CLASS', '4 CLASS', '5 CLASS', '6 CLASS', '7 CLASS', '8 CLASS', '9 CLASS', '10 CLASS'),FIELD(smd.Stu_Section, 'A', 'B', 'C', 'D');",
        [Date],
        (err, rows) => {
          if (err) {
            return res.json({ success: false, message: err });
          }
          let filtered_rows = { AM: {}, PM: {}, Today: {} };
          filtered_rows["AM"]["Present"] = rows.filter(
            (student) =>
              submitted_classes["AM"].includes(
                `${student.Class} ${student.Section}`
              ) && student.AM_Status == "Present"
          );
          filtered_rows["AM"]["Absent"] = rows.filter(
            (student) =>
              submitted_classes["AM"].includes(
                `${student.Class} ${student.Section}`
              ) && student.AM_Status == "Absent"
          );
          filtered_rows["AM"]["Leave"] = rows.filter(
            (student) =>
              submitted_classes["AM"].includes(
                `${student.Class} ${student.Section}`
              ) && student.AM_Status == "Leave"
          );
          filtered_rows["AM"]["Not Submitted"] = rows.filter(
            (student) =>
              !submitted_classes["AM"].includes(
                `${student.Class} ${student.Section}`
              )
          );
          filtered_rows["PM"]["Present"] = rows.filter(
            (student) =>
              submitted_classes["PM"].includes(
                `${student.Class} ${student.Section}`
              ) && student.PM_Status == "Present"
          );
          filtered_rows["PM"]["Absent"] = rows.filter(
            (student) =>
              submitted_classes["PM"].includes(
                `${student.Class} ${student.Section}`
              ) && student.PM_Status == "Absent"
          );
          filtered_rows["PM"]["Leave"] = rows.filter(
            (student) =>
              submitted_classes["PM"].includes(
                `${student.Class} ${student.Section}`
              ) && student.PM_Status == "Leave"
          );
          filtered_rows["PM"]["Not Submitted"] = rows.filter(
            (student) =>
              !submitted_classes["PM"].includes(
                `${student.Class} ${student.Section}`
              )
          );
          filtered_rows["Today"]["Present"] = rows.filter(
            (student) =>
              (submitted_classes["AM"].includes(
                `${student.Class} ${student.Section}`
              ) ||
                submitted_classes["PM"].includes(
                  `${student.Class} ${student.Section}`
                )) &&
              (student.AM_Status === "Present" ||
                student.PM_Status === "Present")
          );

          filtered_rows["Today"]["Leave"] = rows.filter(
            (student) =>
              (submitted_classes["AM"].includes(
                `${student.Class} ${student.Section}`
              ) ||
                submitted_classes["PM"].includes(
                  `${student.Class} ${student.Section}`
                )) &&
              (student.AM_Status === "Leave" ||
                student.PM_Status === "Leave") &&
              student.AM_Status !== "Present" &&
              student.PM_Status !== "Present"
          );

          filtered_rows["Today"]["Absent"] = rows.filter(
            (student) =>
              (submitted_classes["AM"].includes(
                `${student.Class} ${student.Section}`
              ) ||
                submitted_classes["PM"].includes(
                  `${student.Class} ${student.Section}`
                )) &&
              (student.AM_Status === "Absent" ||
                student.PM_Status === "Absent") &&
              student.AM_Status !== "Present" &&
              student.PM_Status !== "Present" &&
              student.AM_Status !== "Leave" &&
              student.PM_Status !== "Leave"
          );
          filtered_rows["Today"]["Not Submitted"] = rows.filter(
            (student) =>
              !submitted_classes["AM"].includes(
                `${student.Class} ${student.Section}`
              ) &&
              !submitted_classes["PM"].includes(
                `${student.Class} ${student.Section}`
              )
          );

          return res.json({
            success: true,
            data: rows,
            filtered_data: filtered_rows,
          });
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/getstudentattendance",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/getvanattendance", (req, res) => {
  try {
    let { Date } = req.body;
    getConnection((err, connection) => {
      if (err)
        return res.json({
          success: false,
          message: "Database connection error",
        });
      let submitted_routes = { AM: [], PM: [] };
      let routes = [];
      function getRoutes() {
        return new Promise((resolve, reject) => {
          connection.query(
            "SELECT Van_Route FROM `van_route` ORDER BY Van_Route",
            (er, rows) => {
              if (er) {
                return res.json({ success: false, message: er });
              }
              routes = rows.map((route) => route["Van_Route"]);
              resolve(routes);
            }
          );
        });
      }
      function getSubmittedRoutes() {
        return new Promise((resolve, reject) => {
          connection.query(
            "SELECT * FROM `van_attendance` WHERE Date = ?",
            [Date],
            (err, rows) => {
              if (err) {
                return res.json({ success: false, message: err });
              }
              submitted_routes["AM"] = rows
                .filter((row) => row["AM_Status"] == "Submitted")
                .map((row) => row["Route"]);

              submitted_routes["PM"] = rows
                .filter((row) => row["PM_Status"] == "Submitted")
                .map((row) => row["Route"]);
              resolve(submitted_routes);
            }
          );
        });
      }
      function getAttendanceData() {
        return new Promise((resolve, reject) => {
          connection.query(
            "SELECT smd.Id_No,smd.First_Name,smd.Stu_Class AS Class,smd.Stu_Section AS Section,smd.Van_Route,COALESCE( CASE WHEN vad.AM = 'A' THEN 'Absent' ELSE 'Present' END, 'Present' ) AS AM_Status, COALESCE( CASE WHEN vad.PM = 'A' THEN 'Absent' ELSE 'Present' END, 'Present' ) AS PM_Status FROM student_master_data smd LEFT JOIN van_attendance_daily vad ON smd.Id_No = vad.Id_No AND vad.Date = ? WHERE smd.Stu_Class IN ('PreKG','LKG','UKG','1 CLASS','2 CLASS','3 CLASS','4 CLASS','5 CLASS','6 CLASS','7 CLASS','8 CLASS','9 CLASS','10 CLASS') AND smd.Van_Route IN ('" +
              routes.join("','") +
              "') ORDER BY Van_Route",
            [Date],
            (err, rows) => {
              if (err) {
                return res.json({ success: false, message: err });
              }
              let filtered_rows = { AM: {}, PM: {}, Today: {} };
              filtered_rows["AM"]["Present"] = rows.filter(
                (student) =>
                  submitted_routes["AM"].includes(student.Van_Route) &&
                  student.AM_Status == "Present"
              );
              filtered_rows["AM"]["Absent"] = rows.filter(
                (student) =>
                  submitted_routes["AM"].includes(student.Van_Route) &&
                  student.AM_Status == "Absent"
              );
              filtered_rows["AM"]["Not Submitted"] = rows.filter(
                (student) => !submitted_routes["AM"].includes(student.Van_Route)
              );
              filtered_rows["PM"]["Present"] = rows.filter(
                (student) =>
                  submitted_routes["PM"].includes(student.Van_Route) &&
                  student.PM_Status == "Present"
              );
              filtered_rows["PM"]["Absent"] = rows.filter(
                (student) =>
                  submitted_routes["PM"].includes(student.Van_Route) &&
                  student.PM_Status == "Absent"
              );
              filtered_rows["PM"]["Not Submitted"] = rows.filter(
                (student) => !submitted_routes["PM"].includes(student.Van_Route)
              );
              filtered_rows["Today"]["Present"] = rows.filter(
                (student) =>
                  (submitted_routes["AM"].includes(student.Van_Route) ||
                    submitted_routes["PM"].includes(student.Van_Route)) &&
                  (student.AM_Status === "Present" ||
                    student.PM_Status === "Present")
              );

              filtered_rows["Today"]["Absent"] = rows.filter(
                (student) =>
                  (submitted_routes["AM"].includes(student.Van_Route) ||
                    submitted_routes["PM"].includes(student.Van_Route)) &&
                  (student.AM_Status === "Absent" ||
                    student.PM_Status === "Absent") &&
                  student.AM_Status !== "Present" &&
                  student.PM_Status !== "Present"
              );
              filtered_rows["Today"]["Not Submitted"] = rows.filter(
                (student) =>
                  !submitted_routes["AM"].includes(student.Van_Route) &&
                  !submitted_routes["PM"].includes(student.Van_Route)
              );
              resolve(filtered_rows);

              return res.json({
                success: true,
                data: rows,
                filtered_data: filtered_rows,
              });
            }
          );
        });
      }
      Promise.resolve(getRoutes()).then(() => {
        Promise.resolve(getSubmittedRoutes()).then(() => {
          Promise.resolve(getAttendanceData()).then(() => {
            //console.log("Done");
          });
        });
      });
    });
  } catch (err) {
    logger.error({
      label: "/getvanattendance",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/admin/resetpassword", (req, res) => {
  try {
    let { Username, OldPassword, NewPassword } = req.body;
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }
      connection.query(
        "SELECT * FROM `admin` WHERE Admin_Id_No = ? AND BINARY Admin_Password = ?",
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
              "UPDATE `admin` SET Admin_Password = ?,Admin_Hash = ? WHERE Admin_Id_No = ?",
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
      label: "/admin/resetpassword",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/faculty/resetpassword", (req, res) => {
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
      label: "/faculty/resetpassword",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/student/resetpassword", (req, res) => {
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
      label: "/student/resetpassword",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/getroutes", (req, res) => {
  try {
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }
      connection.query(
        "SELECT * FROM `van_route` ORDER BY Van_Route",
        (er, rows) => {
          if (er) {
            return res.json({ success: false, message: er });
          }
          return res.json({
            success: true,
            data: rows.map((row) => row.Van_Route),
          });
        }
      );
    });
  } catch (err) {
    logger.error({
      label: "/getroutes",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/notifications/fetchall", (req, res) => {
  try {
    let { Topics } = req.body;
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }
      let promises = [];
      Topics.forEach((Topic) => {
        promises.push(
          new Promise((resolve, reject) => {
            connection.query(
              "SELECT * FROM `notifications` WHERE Topic = ?",
              [Topic],
              (er, rows) => {
                if (er) {
                  return resolve({ success: false, message: er });
                }
                if (rows.length == 0) {
                  return resolve(null);
                }
                return resolve(rows);
              }
            );
          })
        );
      });
      Promise.all(promises)
        .then((results) => {
          let data = [];
          results.forEach((result) => {
            if (result) {
              result.forEach((notification) => {
                data.push(notification);
              });
            }
          });
          return res.json({
            success: true,
            data: data,
          });
        })
        .catch((er) => {
          return res.json({ success: false, message: er });
        });
    });
  } catch (err) {
    logger.error({
      label: "/notifications/fetchall",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/notifications/send", (req, res) => {
  try {
    function getDate() {
      var d = new Date();
      var date = d.getDate();
      var month = d.getMonth() + 1;
      var year = d.getFullYear();
      date = date < 10 ? "0" + date : date;
      month = month < 10 ? "0" + month : month;
      return date + "-" + month + "-" + year;
    }
    function InsertNotification() {
      let date = getDate();
      getConnection((err, connection) => {
        if (err) {
          return res.json({ success: false, message: err });
        }
        connection.query(
          "SELECT Id FROM `notifications` ORDER BY Id DESC LIMIT 1",
          (er, rows) => {
            if (er) {
              return res.json({ success: false, message: er });
            }
            let id;
            if (rows.length == 0) {
              id = 1;
            } else {
              id = rows[0].Id + 1;
            }
            connection.query(
              "INSERT INTO `notifications` VALUES('',?,?,?,?,?)",
              [id, Topic, Text, date, isLink],
              (e, result) => {
                if (e) {
                  return res.json({ success: false, message: e });
                }
                return true;
              }
            );
          }
        );
      });
    }
    let { Topic, Text, Temporary, isLink } = req.body;
    if (Topic == "All Members") {
      Topic = "All";
    }
    const message = {
      message: {
        topic: Topic,
        notification: {
          title: "Important Alert",
          body: Text,
        },
      },
    };
    if (isLink) {
      let url = Text.split("#link")[1].trim();
      message.message["data"] = {
        url: url,
      };
      let modified_text = Text.replace(/#link.*?#link/g, "").trim();
      message.message.notification.body =
        modified_text.length == 0 ? "Open this Link " + url : modified_text;
    }
    if (!Temporary) InsertNotification();
    let Token = "";
    TokenFile.getToken()
      .then((token) => {
        Token = token;
      })
      .then(() => {
        fetch(
          "https://fcm.googleapis.com/v1/projects/victoryapp-1/messages:send",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + Token,
            },
            body: JSON.stringify(message),
          }
        )
          .then((r) => {
            if (r.ok) {
              return res.json({
                success: true,
                message: "Notifications Sent Successfully",
              });
            }
          })
          .catch((err) => {
            res.json({ success: false, message: err });
          });
      });
  } catch (err) {
    logger.error({
      label: "/notifications/send",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.post("/notifications/delete", (req, res) => {
  try {
    let { Id } = req.body;
    getConnection((err, connection) => {
      if (err) {
        return res.json({ success: false, message: err });
      }
      let query = 'DELETE FROM notifications WHERE Id = "' + Id + '"';
      connection.query(query, (err, results) => {
        if (err) {
          return res.json({ success: false, message: err });
        }
        return res.json({
          success: true,
          message: "Notification Deleted Successfully",
        });
      });
    });
  } catch (err) {
    logger.error({
      label: "/notifications/delete",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});

app.get("/getactivity", async (req, res) => {
  function parseLogFile() {
    return new Promise((resolve, reject) => {
      fs.readFile("activity.log", "utf-8", (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        // Split the file content by lines or however your logs are structured
        const logs = data
          .split("\n")
          .filter((line) => line.trim() !== "")
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch (e) {
              console.error("Error parsing JSON:", e);
              return null;
            }
          })
          .filter((log) => log !== null);

        resolve(logs);
      });
    });
  }

  try {
    // Parse the log file
    const logs = await parseLogFile();
    // Apply filters based on query parameters, e.g.:
    const { label, level, task, user, username, start, end } = req.query;

    // Filter logs based on query parameters
    let filteredLogs = logs;

    if (label) {
      filteredLogs = filteredLogs.filter(
        (log) => log.label && log.label.toLowerCase() === label.toLowerCase()
      );
    }

    if (level) {
      filteredLogs = filteredLogs.filter(
        (log) => log.level && log.level.toLowerCase() === level.toLowerCase()
      );
    }

    if (task) {
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.message &&
          log.message.task &&
          log.message.task.toLowerCase() === task.toLowerCase()
      );
    }

    if (user) {
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.message &&
          log.message.user &&
          log.message.user.toLowerCase() === user.toLowerCase()
      );
    }

    if (username) {
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.message &&
          log.message.username &&
          log.message.username.toLowerCase() === username.toLowerCase()
      );
    }

    if (start) {
      // Filter logs based on timestamp (start date)
      filteredLogs = filteredLogs.filter(
        (log) => new Date(log.timestamp) >= new Date(start)
      );
    }

    if (end) {
      // Filter logs based on timestamp (end date)
      filteredLogs = filteredLogs.filter(
        (log) => new Date(log.timestamp) <= new Date(end)
      );
    }

    // Send the filtered logs as JSON response
    res.json(filteredLogs);
  } catch (err) {
    res.status(500).json({ error: "Failed to read or parse the log file." });
  }
});

app.listen(PORT, "0.0.0.0", (error) => {
  try {
    if (!error) {
      console.log(
        "Server is successfully running, and app is listening on port " + PORT
      );
    } else {
      console.log("Error occurred, server can't start", error);
    }
  } catch (err) {
    logger.error({
      label: "/app/listen",
      message: err,
      timestamp: new Date().toLocaleString(undefined, {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
});
