const express = require("express");
const cors = require("cors");
const mysql = require("mysql"); // Use mysql2 for better performance and features
const bcrypt = require("bcrypt"); // Use bcrypt directly
/* const admin = require("firebase-admin");
const adminapp = require("firebase-admin/app"); */
const axios = require("axios");
const app = express();
const PORT = 3000;
/* var serviceAccount = require("./victoryapp-1-firebase-adminsdk-g8vmj-6190eb8890.json");
let fbapp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
}); */
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
            res.json({
              success: true,
              data: { Name: rows[0].Stu_Name },
              message: "",
            });
          }
        );
      }
    );
  });
});

app.post("/student/getclass", (req, res) => {
  let { Id_No } = req.body;
  getConnection((err, connection) => {
    if (err)
      return res.json({ success: false, message: "Database connection error" });
    connection.query(
      "SELECT Stu_Class AS Class FROM `student_master_data` WHERE Id_No = ?",
      [Id_No],
      (err, rows) => {
        if (err) return res.json({ success: false, message: err });
        return res.json({ success: true, Class: rows[0]["Class"] });
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
          return res.json({ success: false, message: "Student Not Found" });
        }
        res.json({ success: true, data: Object.entries(rows[0]) });
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

app.post("/student/vanattendance/view", (req, res) => {
  let { Route, Type, Date } = req.body;
  let query1, query2;
  query1 =
    "SELECT Id_No,First_Name FROM `student_master_data` WHERE Van_Route = '" +
    Route +
    "' AND (Stu_Class LIKE '%CLASS%' OR Stu_Class ='PreKG' OR Stu_Class ='LKG' OR Stu_Class ='UKG')";
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
          message: "No Student Found in this Route",
        });
      }
      const getAttendanceData = (id, name, Date, Type) => {
        return new Promise((resolve, reject) => {
          const query2 = `SELECT * FROM \`van_attendance_daily\` WHERE Id_No = '${id}' AND Date = '${Date}' AND ${Type} IN ('A')`;

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

app.post("/student/vanattendance/upload", async (req, res) => {
  let { Route, Date, Type, Data } = req.body;

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

app.post("/student/attendance/report", (req, res) => {
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
  function sortAttendance(data) {
    let classes = ["PreKG", "LKG", "UKG"];
    for (var i = 1; i <= 10; i++) {
      classes.push(i + " CLASS");
    }
    let sections = ["A", "B", "C", "D"];
    let sortedData = {};
    classes.forEach((cls) => {
      if (
        !Object.keys(sortedData).includes(cls) &&
        Object.keys(data).filter((cls_sec) => {
          if (cls_sec.includes(cls)) {
            return cls_sec;
          }
        }).length != 0
      ) {
        sortedData[cls] = {};
      }
      sections.forEach((sec) => {
        if (Object.keys(sortedData).includes(cls)) {
          if (
            Object.keys(data).filter((cls_sec) => {
              if (
                cls_sec[cls_sec.length - 1] == sec &&
                cls_sec.substring(0, cls_sec.length - 1) == cls
              ) {
                return cls_sec;
              }
            }).length != 0 &&
            !Object.keys(sortedData[cls]).includes(sec)
          ) {
            sortedData[cls][sec] = data[cls + sec];
          }
        }
      });
    });
    return sortedData;
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
          "SELECT * FROM `attendance_daily` WHERE Date = '" +
          Date +
          "' AND " +
          Type;
        if (AbsentType == "Both") {
          query += " IN ('A','L')";
        } else {
          query += " = '" + AbsentType + "'";
        }
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
            data = sortAttendance(data);
            res.json({ success: true, data: data });
          });
        }
      });
    } else if (!Class && Section) {
      return res.json({ success: false, message: "Section Only not Allowed" });
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
              rows.map((row) => [row.Id_No, row.Name, row.Section, row.Mobile])
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
});

app.post("/student/vanattendance/report", (req, res) => {
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
                res.json({ success: true, data: data });
              });
            }
          });
        });
    } else {
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
  });
});

app.post("/fetchexams", (req, res) => {
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
});

app.post("/student/getexams", (req, res) => {
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
          .post("http://192.168.53.107:3000/fetchexams", {
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
});

app.post("/student/marks", (req, res) => {
  const { Id_No, Exam } = req.body;
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
                let marks = { Subjects: {} };
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
                    let Max_Total = Max_Marks * subjects.length;
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
});

app.post("/classwisemarks", (req, res) => {
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
});

app.post("/admin/resetpassword", (req, res) => {
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
          return res.json({ success: false, message: "Invalid Old Password" });
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
});

app.post("/faculty/resetpassword", (req, res) => {
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
          return res.json({ success: false, message: "Invalid Old Password" });
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
});

app.post("/student/resetpassword", (req, res) => {
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
          return res.json({ success: false, message: "Invalid Old Password" });
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
});

app.post("/getroutes", (req, res) => {
  getConnection((err, connection) => {
    if (err) {
      return res.json({ success: false, message: err });
    }
    connection.query("SELECT * FROM `van_route`", (er, rows) => {
      if (er) {
        return res.json({ success: false, message: er });
      }
      return res.json({
        success: true,
        data: rows.map((row) => row.Van_Route),
      });
    });
  });
});

app.post("/notifications/send", (req, res) => {
  let { Topic, Text } = req.body;
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
  fetch("https://fcm.googleapis.com/v1/projects/victoryapp-1/messages:send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      /* Authorization:
        "Bearer ya29.c.c0ASRK0GaXioupB2uDC0I6Dk8fLrOGbdPS2z0_eMDjztqei5FRJoNvzzASOs8fhStvByVbN8KSbcNOgaJLgHOTRltgjFtGZOZ5ysuaXWbi7-dwUavqQyGBt7_PzJVYTfIvCR9RwhKjiLhOXlTbNT7GU_H0t-FXWfI_O1v36jlkXEu7SpZnS1wFBusx3cmUGr-AeQVgnwn7VFO18byb7a8tENTJowadUUQtmaxf9rtyo42ESn1hiXWeLhChC-2jmVFGAU1nBmMSphqv9LnFbuHIt863t4Nnd7C4tpsimQZaeS0VsoxWu8P6SoqRW_rUJ6L-tn5VZXZBppPsXQFgWyOqKbglB1yAA4fGKp61gnnoboGmqI68_Ckztm5pG385K2QbOmtg8FkxkY-apVFlv2MyxzfUU6gUhYszbqsZ9lYV0kcp66mh61ohtvvJ6aB7yqV6nwUhOfttev0gURqYjdxg5ffdXWXJUOQ_R9OdrrSciZwo1peosnrwdXu_tf6prjaYwri44fs32zFMgWtVe13-oaw8hWmUvpOwxe-_1n-xJmolaiz5ppw3VMwi-FcMwQk40WzkuyxpSrl6nJxWXMrw-euk21toJiUpkczQZMbagQep3m5Ylpn2ZIsMY1RvxsO5-xio5a6UY2ipOvRIW5XxYxmoy-rU-e0MQk3Fye-3f69ooxdQOklo8nOZQ8rpj4lldcixRwMk1ekanOrMpQ-IljnwwIFf57hegsl2BMZ402s4qgsWBhMhp7xR05iRxyg5IkZ7bo3s6ivy070jYrWz1umZcsfXcrzlj6cWwRzkuIzWpbhBOls_fJMbnniMfWusysn1gIZMhimzYxwjx1srOIo_szQ2f-UfmgiRaocBXsxvX3_8WyWxstuc53hcQImzzncl5tg0MZM0Og5S26U94OolqZbf-UVxe29MFiX0UujpiiOofg5_YpO3jlpesq8cdIB80jFs2fq95ewclhXsS9zW1Oc7wzF8zqp_4apcoftQVJv21kZyyoJ", */
      Authorization:
        "Bearer ya29.c.c0ASRK0GYCGNj32bVBuXa-TTgASsgP5w68mrt3yL5ZPs9aO6VZW-wDzq1Jui3uGbyVO2JPkES6uXp5pjX1gMwAVF40VKVoe9p7d0OD1ZoG9TET2aRiuEF4pnfPlv0BrpqTn-6PGC_CQt1v10LHCUhIxFOffxFOuaFk5IruQbl9aEFIFZKcw9xmfF3ys4B01ZK6Kqmtenx7r5ARQWhRn4_bQ6qWw5QzSnYqzXuZHFwJGJ8s0xg-nDHKqlGfIyx_V-TzUSWFNzAP3E9-S3rt9wvQIiEoZsucq6h9Jypk90Nm5cgM8ZAdoKd5Sl0q3CgcOyLoKVPLZyYUOUW9oK-zJOxeWgiEXJbCmOCnU4N7joVAeZYifxqv9Or-bpsG384DUZg9pOI-R_ZeObfkvkWQ6g-_Qq32VXgZddkg7WjFfp54Og4bfnXjZR-ahzdhypjR79294aRem6ksQa8yx75hjBy2JBehf3Y9euX0xe2S9Sod8kUiMFUexcnFeR85gflnit8fMRQuSvVh2iBMx9f3zc1IrdZIfMwVY5rkfp5cV9OXvtmzYhwdjSa0b2uxMlqyigJdO1mfjhjv-F-yBVlklpi5dbyfwUnOi-8_JbiatzlmrYJlgByItQp4iX6o6q_Jg0l1tUmeuuO5x3WuQ6sZrb3136v1qBYnb3dIo_6leBXYXuQS5IVtr3g9UVfxgxiu42-svpJ77netWMZx6oz-ZZd8pQxZt33YwotoliBjddXaJRb8MexWOFesBhXQyeeJanfaQiv89I-_6nY-1lpZcbhtqyB7YJQWBbJkcas2JjgX00mfVnBaob8xpfrm5-Zlc0VBO3lRUeRSIf-y_bM32sz_Z5pO8pbfd218rF42s17WRJ-BZzz_OenSp5ZgbhYawSMtuOQMvbj_Z7tVyxw6jXYsvQYmxsjRd3IYw9Y1ZBzj3msQejvtXbjJdxuRe7l19vaUrO4uIOb-akr5RIWQ-46bI790j7j1zw1V8fZj_yz9RXse8gaaxoVIde_",
    },
    body: JSON.stringify(message),
  })
    .then((r) => {
      if (r.ok) {
        return res.json({
          success: true,
          message: "Notifications Sent Successfully",
        });
      }
      console.log(r);
    })
    .catch((err) => {
      res.json({ success: false, message: err });
    });
  /* admin
    .messaging()
    .send(message)
    .then((response) => {
      res.json({ success: true, message: "Notifications Sent Successfully" });
    })
    .catch((error) => {
      res.json({ success: false, message: error });
    }); */
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
