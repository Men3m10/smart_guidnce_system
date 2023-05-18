const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const keys = require("../config/key");

///////////////////////////////////////////////////////////////////////////////

const Student = require("../models/Students");
const Subject = require("../models/Subjects");
const Mark = require("../models/marks");
const Instructor = require("../models/Instructor");
const Attendence = require("../models/attendence");

////////////////////// Validation //////////////////////////////////////////////////////////

const validateInstructorLogin = require("../validation/instructorLogin");
const validateFetchStudentsInput = require("../validation/instructorFetchStudents");
const validateFacultyUploadMarks = require("../validation/instructorUploadMarkes");
const validateFacultyUpdatePassword = require("../validation/instructorUpdatePass");
const validateStudentSectionbySSID = require("../validation/getSectionBySSIDvalidation");
const validateAttendence = require("../validation/validationAttendence");
const validateSubByDepartAndYear = require("../validation/validateSubByDepYear");

///////////////////////////////////////////////////////////////////////////////////////////

module.exports = {
  instructorLogin: async (req, res) => {
    try {
      const { errors, isValid } = validateInstructorLogin(req.body);

      //check validation
      if (!isValid) {
        return res.status(400).json(errors);
      }

      const { ssid_Hash, password_hash } = req.body;
      const admin = await Instructor.findOne({ ssid_Hash });
      if (!admin) {
        //errors.ssid_Hash = "National Id not found";
        return res
          .status(404)
          .json({ message: "this National Id is not existed" });
      }
      const isCorrect = await bcrypt.compare(
        password_hash,
        admin.password_hash
      );
      if (!isCorrect) {
        // errors.password_hash = "Invalid Password";
        return res
          .status(404)
          .json({ message: "please enter correct password" });
      }
      const payload = {
        id: admin.id,
        name: admin.name,
        department: admin.department,
      };
      jwt.sign(payload, keys.secretOrKey, { expiresIn: 7200 }, (err, token) => {
        res.json({
          success: true,
          token: "Bearer " + token,
          message: "welcome" + " " + payload.name,
        });
      });
    } catch (err) {
      return res
        .status(400)
        .json({ message: "National Id Or Password is not correct" });
    }
  },
  // instructorLogin: async (req, res) => {
  //   try {
  //     const { errors, isValid } = validateInstructorLogin(req.body);

  //     if (!isValid) {
  //       return res.status(400).json(errors);
  //     }

  //     const { ssid_Hash, password } = req.body;

  //     const instructor = await Instructor.findOne({ ssid_Hash });
  //     if (!instructor) {
  //       return res
  //         .status(404)
  //         .json({ message: "this National Id is not existed" });
  //     }
  //     const isCorrect = await bcrypt.compare(password, instructor.password);
  //     if (!isCorrect) {
  //       return res
  //         .status(404)
  //         .json({ message: "please enter correct password" });
  //     }
  //     const payload = {
  //       id: instructor.id,
  //       instructor,
  //     };
  //     jwt.sign(payload, keys.secretOrKey, { expiresIn: 3600 }, (err, token) => {
  //       res.json({
  //         success: true,
  //         token: "Bearer " + token,
  //         message: "welcome",
  //       });
  //     });
  //   } catch (err) {
  //     return res
  //       .status(400)
  //       .json({ message: "National Id Or Password is not correct" });
  //   }
  // },
  //////////////////////////////////////////////////////////////////////////
  fetchStudents: async (req, res, next) => {
    try {
      const { errors, isValid } = validateFetchStudentsInput(req.body);
      if (!isValid) {
        return res.status(400).json(errors);
      }
      const { department, year, section } = req.body;

      const students = await Student.find({ department, year, section });
      if (students.length === 0) {
        errors.department = "No Student found";
        return res.status(404).json({ message: errors, result: students });
      }
      res.status(200).json({
        result: students.map((student) => {
          var student = {
            _id: student._id,
            code_Hash: student.code_Hash,
            name: student.name,
            section: student.section,
            year: student.year,
            ssid_Hash: student.ssid_Hash,
            department: student.department,
          };
          return student;
        }),
        message: "Enrolled",
      });
    } catch (err) {
      console.log("error in instructor fetchStudents", err.message);
    }
  },
  ///////////////////////////////////////////////////////////////////
  findSubBydepAndYear: async (req, res) => {
    try {
      const { errors, isValid } = validateSubByDepartAndYear(req.body);
      if (!isValid) {
        return res.status(400).json(errors);
      }
      const { department, year } = req.body;
      const subjectList = await Subject.find({ department, year });
      // const sub = await Subject.findOne({ subjectCode });
      //console.log(subjectList);
      if (subjectList.length === 0) {
        errors.department = "No Subject found in given department";
        return res.status(404).json(errors);
      }
      res.status(200).json({
        result: subjectList.map((sub) => {
          var subData = {
            name: sub.subjectName,
            code: sub.subjectCode,
          };
          return subData;
        }),
        message: "enrolled successfully",
      });
    } catch (err) {
      console.log("error in instructor fetchStudents", err.message);
    }
  },
  ///////////////////////////////////////////////////////////////////
  findSectionByID: async (req, res) => {
    try {
      const { errors, isValid } = validateStudentSectionbySSID(req.body);
      if (!isValid) {
        return res.status(400).json(errors);
      }
      const { ssid_Hash } = req.body;
      const studentInfo = await Student.findOne({ ssid_Hash }).select(
        "section name -_id"
      );
      if (!studentInfo) {
        return res.status(404).json({ message: "no data" });
      }
      res.status(200).json({ studentInfo });
    } catch (error) {
      console.log("error in instructor findSectionByID", error.message);
    }
  },
  ////////////////////////////////////////////////////////////////////////////////////////////////
  markAttendence: async (req, res, next) => {
    try {
      const { selectedStudents, subjectCode, department, year, section } =
        req.body;
      console.log(req.body);

      // const find = await Attendence.findOne({ subjectCode, selectedStudents });
      // if (find) {
      //   return res
      //     .status(404)
      //     .json({ message: "attendence to this student is marked " });
      // }

      const sub = await Subject.findOne({ subjectCode });

      //All Students
      const allStudents = await Student.find({ department, year, section });
      var filteredArr = allStudents.filter((item) => {
        return selectedStudents.indexOf(item.id) === -1;
      });
      //console.log(filteredArr.length);
      // Attendence mark
      for (let i = 0; i < filteredArr.length; i++) {
        const pre = await Attendence.findOne({
          student: filteredArr[i]._id,
          subject: sub._id,
        });
        if (!pre) {
          const attendence = new Attendence({
            student: filteredArr[i],
            subject: sub._id,
          });
          attendence.totalLecturesByinstructor += 1;
          await attendence.save();
        } else {
          pre.totalLecturesByinstructor += 1;
          await pre.save();
        }
      }
      for (var a = 0; a < selectedStudents.length; a++) {
        const pre = await Attendence.findOne({
          student: selectedStudents[a],
          subject: sub._id,
        });
        if (!pre) {
          const attendence = new Attendence({
            student: selectedStudents[a],
            subject: sub._id,
          });
          attendence.totalLecturesByinstructor += 1;
          attendence.lectureAttended += 1;
          await attendence.save();
        } else {
          pre.totalLecturesByinstructor += 1;
          pre.lectureAttended += 1;
          await pre.save();
        }
      }
      res.status(200).json({
        success: true,
        message: "success!",
        response: filteredArr,
      });
    } catch (err) {
      console.log("error", err.message);
      return res
        .status(400)
        .json({ message: `Error in marking attendence  ${err.message}` });
    }
  },
  //////////////////////////////////////////////////////////////
  getAllSubjects: async (req, res, next) => {
    try {
      const allSubjects = await Subject.find({});
      if (!allSubjects) {
        return res
          .status(404)
          .json({ message: "You havent registered any subject yet." });
      }
      res.status(200).json({ allSubjects });
    } catch (err) {
      res
        .status(400)
        .json({ message: `error in getting all Subjects", ${err.message}` });
    }
  },
  ///////////////////////////////////////////////////////////////////////////////////////
  uploadMarks: async (req, res, next) => {
    try {
      const { errors, isValid } = validateFacultyUploadMarks(req.body);
      // Check Validation
      if (!isValid) {
        return res.status(400).json(errors);
      }
      const {
        subjectCode,
        exam,
        totalMarks,
        marks,
        department,
        year,
        section,
      } = req.body;
      const subject = await Subject.findOne({ subjectCode });
      const allStudent = await Student.find({ department, year, section });
      // const isAlready = await Mark.findOne({
      //   subjectCode: subject._id,
      //   exam,
      //   department,
      //   section,
      // });
      // if (isAlready.length !== 0) {
      //   return res.status(400).json({
      //     message: "You have already uploaded marks of given exam",
      //   });
      // }
      for (var i = 0; i < allStudent.length; i++) {
        //console.log(allStudent[i]._id);
        const newMarks = await new Mark({
          Students: allStudent[i]._id,
          subject: subject._id,
          exam,
          department,
          section,
          marks: marks[i],
          totalMarks,
        });

        console.log(newMarks);
        await newMarks.save();
      }
      res.status(200).json({
        success: true,
        message: "Marks uploaded successfully",
      });
    } catch (err) {
      console.log("error", err.message);
      return res
        .status(400)
        .json({ message: `Error in uploading marks  ${err.message}` });
    }
  },
};

// uploadMarks: async (req, res, next) => {
//   try {
//     const { errors, isValid } = validateFacultyUploadMarks(req.body);

//     // Check Validation
//     if (!isValid) {
//       return res.status(400).json(errors);
//     }
//     const {
//       student,
//       subjectCode,
//       exam,
//       totalMarks,
//       marks,
//       department,
//       year,
//       section,
//     } = req.body;
//     const subjectid = await Subject.findOne({ subjectCode });
//     const subject = subjectid._id;
//     const isAlready = await Mark.find({
//       student,
//       exam,
//       department,
//       section,
//       subject,
//     });

//     if (isAlready.length !== 0) {
//       errors.exam = "You have already uploaded marks of given exam";
//       return res.status(400).json(errors);
//     }

//     const newMarks = await new Mark({
//       student,
//       subject,
//       exam,
//       department,
//       section,
//       marks,
//       totalMarks,
//     });
//     console.log(newMarks);
//     await newMarks.save();
//     res.status(200).json({ message: "Marks uploaded successfully" });
//   } catch (err) {
//     console.log("Error in uploading marks", err.message);
//   }
// },
// };
