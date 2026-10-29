const Student = require('../models/Student');
const mongoose = require('mongoose');

// Helper to determine query filter (supports MongoDB ObjectId or studentId string)
function buildIdQuery(idParam) {
  if (mongoose.Types.ObjectId.isValid(idParam)) {
    return { $or: [{ _id: idParam }, { studentId: idParam.toUpperCase() }] };
  }
  return { studentId: idParam.toUpperCase() };
}

/**
 * @desc   Get all students with optional search filter
 * @route  GET /api/students
 */
exports.getAllStudents = async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      filter = {
        $or: [
          { studentId: regex },
          { name: regex },
          { department: regex },
          { email: regex }
        ]
      };
    }

    const students = await Student.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('Error fetching students:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve students from database',
      error: error.message
    });
  }
};

/**
 * @desc   Get single student by ID (MongoDB _id or studentId)
 * @route  GET /api/students/:id
 */
exports.getStudentById = async (req, res) => {
  try {
    const query = buildIdQuery(req.params.id);
    const student = await Student.findOne(query);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student with ID "${req.params.id}" not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error fetching student:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving student record',
      error: error.message
    });
  }
};

/**
 * @desc   Create a new student record
 * @route  POST /api/students
 */
exports.createStudent = async (req, res) => {
  try {
    const { studentId, name, email, department, semester, contact } = req.body;

    // Basic validation
    if (!studentId || !name || !email || !department || semester === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: studentId, name, email, department, semester.'
      });
    }

    // Check for duplicate studentId or email
    const existing = await Student.findOne({
      $or: [
        { studentId: studentId.trim().toUpperCase() },
        { email: email.trim().toLowerCase() }
      ]
    });

    if (existing) {
      const duplicateField = existing.studentId === studentId.trim().toUpperCase() ? 'Student ID' : 'Email';
      return res.status(409).json({
        success: false,
        message: `A student with this ${duplicateField} already exists.`
      });
    }

    const student = await Student.create({
      studentId: studentId.trim().toUpperCase(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      department: department.trim(),
      semester: Number(semester),
      contact: contact ? contact.trim() : ''
    });

    return res.status(201).json({
      success: true,
      message: 'Student added successfully',
      data: student
    });
  } catch (error) {
    console.error('Error creating student:', error.message);
    return res.status(400).json({
      success: false,
      message: error.message || 'Validation error creating student'
    });
  }
};

/**
 * @desc   Update student details
 * @route  PUT /api/students/:id
 */
exports.updateStudent = async (req, res) => {
  try {
    const query = buildIdQuery(req.params.id);
    const updateData = { ...req.body };

    if (updateData.studentId) {
      updateData.studentId = updateData.studentId.trim().toUpperCase();
    }
    if (updateData.email) {
      updateData.email = updateData.email.trim().toLowerCase();
    }
    if (updateData.semester !== undefined) {
      updateData.semester = Number(updateData.semester);
    }

    const updatedStudent = await Student.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({
        success: false,
        message: `Student with ID "${req.params.id}" not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent
    });
  } catch (error) {
    console.error('Error updating student:', error.message);
    return res.status(400).json({
      success: false,
      message: error.message || 'Error updating student record'
    });
  }
};

/**
 * @desc   Delete a student record
 * @route  DELETE /api/students/:id
 */
exports.deleteStudent = async (req, res) => {
  try {
    const query = buildIdQuery(req.params.id);
    const deletedStudent = await Student.findOneAndDelete(query);

    if (!deletedStudent) {
      return res.status(404).json({
        success: false,
        message: `Student with ID "${req.params.id}" not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Student record deleted successfully',
      deletedId: deletedStudent.studentId
    });
  } catch (error) {
    console.error('Error deleting student:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error deleting student record',
      error: error.message
    });
  }
};
