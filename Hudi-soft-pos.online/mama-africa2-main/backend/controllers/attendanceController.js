import Employee from '../models/Employee.js';
import AttendanceShift from '../models/AttendanceShift.js';
import AttendanceLog from '../models/AttendanceLog.js';
import AttendanceDevice from '../models/AttendanceDevice.js';
import AttendanceStation from '../models/AttendanceStation.js';
import AttendanceSettings from '../models/AttendanceSettings.js';
import AttendanceAuditLog from '../models/AttendanceAuditLog.js';
import Branch from '../models/Branch.js';
import { verifyRegistration, verifyAssertion } from '../utils/webauthn.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'restaurant-secret-key-2024';

// Helper to sign WebAuthn session tokens (5 minutes expiration)
const signWebAuthnSession = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '5m' });
};

// Helper to verify WebAuthn session tokens
const verifyWebAuthnSession = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error('WebAuthn session expired or invalid. Please try again.');
  }
};

/**
 * ─── ADMIN DASHBOARD & STATS ──────────────────────────────────────────────────
 */
export const getAttendanceDashboard = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Get active employees count
    const activeEmployeesCount = await Employee.countDocuments({ branch: branchId, status: 'active' });

    // 2. Get today's logs
    const todayLogs = await AttendanceLog.find({ branch: branchId, date: todayStr });

    const presentCount = todayLogs.filter(log => log.checkInTime).length;
    const checkedOutCount = todayLogs.filter(log => log.checkOutTime).length;
    const lateCount = todayLogs.filter(log => log.status === 'Late').length;
    const absentCount = Math.max(0, activeEmployeesCount - presentCount);

    let totalWorkingHours = 0;
    let totalOvertimeHours = 0;

    todayLogs.forEach(log => {
      totalWorkingHours += log.totalHours || 0;
      // Overtime logic
      if (log.status === 'Overtime') {
        const threshold = 8; // fallback standard shift hours
        if (log.totalHours > threshold) {
          totalOvertimeHours += (log.totalHours - threshold);
        }
      }
    });

    res.json({
      success: true,
      data: {
        employeesPresentToday: presentCount,
        employeesAbsentToday: absentCount,
        employeesLateToday: lateCount,
        employeesCheckedOutToday: checkedOutCount,
        totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
        overtimeHours: parseFloat(totalOvertimeHours.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Get attendance dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics' });
  }
};

/**
 * ─── LIVE ATTENDANCE MONITOR ─────────────────────────────────────────────────
 */
export const getLiveMonitor = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const todayStr = new Date().toISOString().split('T')[0];

    // Find all active employees in this branch
    const employees = await Employee.find({ branch: branchId, status: 'active' })
      .populate('shift', 'name startTime endTime')
      .sort({ name: 1 });

    // Find today's logs for these employees
    const logs = await AttendanceLog.find({ branch: branchId, date: todayStr });

    const monitorData = employees.map(emp => {
      const log = logs.find(l => l.employee.toString() === emp._id.toString());
      let status = 'Absent';
      let checkInTime = null;
      let checkOutTime = null;

      if (log) {
        checkInTime = log.checkInTime;
        checkOutTime = log.checkOutTime;
        if (checkOutTime) {
          status = 'Checked Out';
        } else {
          status = log.status === 'Late' ? 'Late' : 'Present';
        }
      }

      return {
        employeeId: emp._id,
        name: emp.name,
        position: emp.position,
        department: emp.department || 'General',
        photoUrl: emp.photoUrl || '',
        shift: emp.shift ? emp.shift.name : 'No Shift',
        status,
        checkInTime,
        checkOutTime
      };
    });

    res.json({
      success: true,
      data: monitorData
    });
  } catch (error) {
    console.error('Live monitor error:', error);
    res.status(500).json({ success: false, message: 'Failed to load live monitor' });
  }
};

/**
 * ─── ATTENDANCE LOGS TABLE & CRUD ──────────────────────────────────────────
 */
export const getAttendanceLogs = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const { startDate, endDate, employeeId, status, search } = req.query;

    const query = { branch: branchId };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = startDate;
    }

    if (employeeId) {
      query.employee = employeeId;
    }

    if (status) {
      query.status = status;
    }

    // Fetch and populate
    let logs = await AttendanceLog.find(query)
      .populate({
        path: 'employee',
        select: 'name position department employeeId photoUrl phone email shift'
      })
      .sort({ checkInTime: -1 });

    // Handle search filter on populated employee names
    if (search) {
      const searchLower = search.toLowerCase();
      logs = logs.filter(log => 
        log.employee && (
          log.employee.name.toLowerCase().includes(searchLower) ||
          (log.employee.employeeId && log.employee.employeeId.toLowerCase().includes(searchLower)) ||
          log.employee.position.toLowerCase().includes(searchLower)
        )
      );
    }

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch logs' });
  }
};

export const manualLogAdjustment = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const { employeeId, date, checkInTime, checkOutTime, status } = req.body;

    if (!employeeId || !date) {
      return res.status(400).json({ success: false, message: 'Employee ID and date are required' });
    }

    let log = await AttendanceLog.findOne({ employee: employeeId, date, branch: branchId });

    const checkInDate = checkInTime ? new Date(checkInTime) : null;
    const checkOutDate = checkOutTime ? new Date(checkOutTime) : null;

    let totalHours = 0;
    if (checkInDate && checkOutDate) {
      totalHours = parseFloat(((checkOutDate - checkInDate) / 3600000).toFixed(2));
    }

    if (log) {
      // Update existing
      log.checkInTime = checkInDate || log.checkInTime;
      log.checkOutTime = checkOutDate || log.checkOutTime;
      log.totalHours = totalHours || log.totalHours;
      log.status = status || log.status;
      await log.save();
    } else {
      // Create new manual log
      log = await AttendanceLog.create({
        employee: employeeId,
        branch: branchId,
        date,
        checkInTime: checkInDate || new Date(),
        checkOutTime: checkOutDate,
        totalHours,
        status: status || 'Present',
        isBiometricVerified: false,
        deviceInfo: { browser: 'Admin Dashboard', os: 'Windows Hello/Manual Override' }
      });
    }

    // Log admin action in Audit Log
    const employee = await Employee.findById(employeeId);
    await AttendanceAuditLog.create({
      branch: branchId,
      action: 'Manual Log Override',
      performedBy: req.user.name,
      employee: employeeId,
      details: `Adjusted attendance log for date ${date}. Status: ${log.status}. Total hours: ${log.totalHours}.`,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Attendance log updated successfully',
      data: log
    });
  } catch (error) {
    console.error('Manual adjustment error:', error);
    res.status(500).json({ success: false, message: 'Failed to adjust log' });
  }
};

/**
 * ─── SHIFT MANAGEMENT ────────────────────────────────────────────────────────
 */
export const getShifts = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const shifts = await AttendanceShift.find({ branch: branchId });
    res.json({ success: true, data: shifts });
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shifts' });
  }
};

export const createShift = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const { name, startTime, endTime, gracePeriod, overtimeRules } = req.body;

    const shift = await AttendanceShift.create({
      name,
      startTime,
      endTime,
      gracePeriod: gracePeriod || 15,
      overtimeRules: overtimeRules || { minHours: 8, multiplier: 1.5 },
      branch: branchId
    });

    await AttendanceAuditLog.create({
      branch: branchId,
      action: 'Shift Created',
      performedBy: req.user.name,
      details: `Created shift ${name} (${startTime} - ${endTime})`,
      ip: req.ip
    });

    res.status(201).json({ success: true, message: 'Shift created successfully', data: shift });
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json({ success: false, message: 'Failed to create shift' });
  }
};

export const updateShift = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const { id } = req.params;
    const { name, startTime, endTime, gracePeriod, overtimeRules } = req.body;

    const shift = await AttendanceShift.findOneAndUpdate(
      { _id: id, branch: branchId },
      { $set: { name, startTime, endTime, gracePeriod, overtimeRules } },
      { new: true }
    );

    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    await AttendanceAuditLog.create({
      branch: branchId,
      action: 'Shift Updated',
      performedBy: req.user.name,
      details: `Updated shift ${name} (${startTime} - ${endTime})`,
      ip: req.ip
    });

    res.json({ success: true, message: 'Shift updated successfully', data: shift });
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ success: false, message: 'Failed to update shift' });
  }
};

export const deleteShift = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const { id } = req.params;

    // Check if shift is assigned to any employee
    const inUse = await Employee.exists({ shift: id, branch: branchId });
    if (inUse) {
      return res.status(400).json({ success: false, message: 'Cannot delete shift. It is currently assigned to employees.' });
    }

    const shift = await AttendanceShift.findOneAndDelete({ _id: id, branch: branchId });
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    await AttendanceAuditLog.create({
      branch: branchId,
      action: 'Shift Deleted',
      performedBy: req.user.name,
      details: `Deleted shift: ${shift.name}`,
      ip: req.ip
    });

    res.json({ success: true, message: 'Shift deleted successfully' });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete shift' });
  }
};

export const assignEmployeeShift = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const { employeeId, shiftId } = req.body;

    const employee = await Employee.findOneAndUpdate(
      { _id: employeeId, branch: branchId },
      { $set: { shift: shiftId || null } },
      { new: true }
    ).populate('shift');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const shiftName = employee.shift ? employee.shift.name : 'None';
    await AttendanceAuditLog.create({
      branch: branchId,
      action: 'Shift Assigned',
      performedBy: req.user.name,
      employee: employeeId,
      details: `Assigned shift "${shiftName}" to employee "${employee.name}"`,
      ip: req.ip
    });

    res.json({ success: true, message: `Successfully assigned shift to ${employee.name}`, data: employee });
  } catch (error) {
    console.error('Assign shift error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign shift' });
  }
};

/**
 * ─── QR STATIONS ─────────────────────────────────────────────────────────────
 */
export const getStations = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const stations = await AttendanceStation.find({ branch: branchId });
    res.json({ success: true, data: stations });
  } catch (error) {
    console.error('Get stations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stations' });
  }
};

export const createStation = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const { name, locationType } = req.body;

    // Generate unique token
    const token = crypto.randomBytes(24).toString('hex');

    const station = await AttendanceStation.create({
      name,
      locationType: locationType || 'Entrance',
      token,
      branch: branchId
    });

    await AttendanceAuditLog.create({
      branch: branchId,
      action: 'QR Station Created',
      performedBy: req.user.name,
      details: `Created station ${name} (${locationType})`,
      ip: req.ip
    });

    res.status(201).json({ success: true, message: 'Station created successfully', data: station });
  } catch (error) {
    console.error('Create station error:', error);
    res.status(500).json({ success: false, message: 'Failed to create station' });
  }
};

export const regenerateStationToken = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const { id } = req.params;

    const token = crypto.randomBytes(24).toString('hex');
    const station = await AttendanceStation.findOneAndUpdate(
      { _id: id, branch: branchId },
      { $set: { token } },
      { new: true }
    );

    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    await AttendanceAuditLog.create({
      branch: branchId,
      action: 'QR Token Regenerated',
      performedBy: req.user.name,
      details: `Regenerated QR token for station ${station.name}`,
      ip: req.ip
    });

    res.json({ success: true, message: 'QR code regenerated successfully', data: station });
  } catch (error) {
    console.error('Regenerate token error:', error);
    res.status(500).json({ success: false, message: 'Failed to regenerate station token' });
  }
};

export const deleteStation = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const { id } = req.params;

    const station = await AttendanceStation.findOneAndDelete({ _id: id, branch: branchId });
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    await AttendanceAuditLog.create({
      branch: branchId,
      action: 'QR Station Deleted',
      performedBy: req.user.name,
      details: `Deleted station: ${station.name}`,
      ip: req.ip
    });

    res.json({ success: true, message: 'QR station deleted successfully' });
  } catch (error) {
    console.error('Delete station error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete station' });
  }
};

/**
 * ─── SETTINGS ────────────────────────────────────────────────────────────────
 */
export const getSettings = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    let settings = await AttendanceSettings.findOne({ branch: branchId });
    if (!settings) {
      settings = await AttendanceSettings.create({ branch: branchId });
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const { officeStartTime, officeEndTime, gracePeriod, lateThreshold, overtimeRules, policies } = req.body;

    const settings = await AttendanceSettings.findOneAndUpdate(
      { branch: branchId },
      { $set: { officeStartTime, officeEndTime, gracePeriod, lateThreshold, overtimeRules, policies } },
      { new: true, upsert: true }
    );

    await AttendanceAuditLog.create({
      branch: branchId,
      action: 'Attendance Policy Updated',
      performedBy: req.user.name,
      details: `Updated general rules (Start: ${officeStartTime}, End: ${officeEndTime})`,
      ip: req.ip
    });

    res.json({ success: true, message: 'Settings updated successfully', data: settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};

/**
 * ─── AUDIT LOGS ─────────────────────────────────────────────────────────────
 */
export const getAuditLogs = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const logs = await AttendanceAuditLog.find({ branch: branchId })
      .populate('employee', 'name position')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
};

/**
 * ─── PUBLIC SCANNED QR PAGE ENDPOINTS ─────────────────────────────────────────
 */

// 1. Fetch branch and station information for scanner page
export const getPublicStation = async (req, res) => {
  try {
    const { token } = req.params;
    const station = await AttendanceStation.findOne({ token, isActive: true }).populate('branch');

    if (!station) {
      return res.status(404).json({ success: false, message: 'Attendance scan station code is invalid or disabled.' });
    }

    // Find branch logo/name settings
    const branchSettings = await mongoose.model('Settings').findOne({ branch: station.branch._id });

    res.json({
      success: true,
      data: {
        stationName: station.name,
        locationType: station.locationType,
        branchName: station.branch.name,
        branchId: station.branch._id,
        restaurantName: branchSettings?.restaurantName || 'Hudi Soft POS',
        logoUrl: branchSettings?.logoUrl || ''
      }
    });
  } catch (error) {
    console.error('Public station fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to scan QR token' });
  }
};

// 2. Identify employee by ID/Phone/Email
export const identifyEmployee = async (req, res) => {
  try {
    const { identifier, branchId } = req.body;
    if (!identifier || !branchId) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    // Look up employee
    const employee = await Employee.findOne({
      branch: branchId,
      status: 'active',
      $or: [
        { employeeId: identifier },
        { phone: identifier },
        { email: identifier }
      ]
    }).populate('shift');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found or account inactive.' });
    }

    // Fetch registered passkey devices
    const devices = await AttendanceDevice.find({ employee: employee._id });
    const hasRegisteredPasskey = devices.length > 0;

    // Check check-in log for today
    const todayStr = new Date().toISOString().split('T')[0];
    const log = await AttendanceLog.findOne({ employee: employee._id, date: todayStr });

    res.json({
      success: true,
      data: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        position: employee.position,
        department: employee.department,
        photoUrl: employee.photoUrl || '',
        shift: employee.shift ? { name: employee.shift.name, startTime: employee.shift.startTime, endTime: employee.shift.endTime } : null,
        hasRegisteredPasskey,
        allowedCredentials: devices.map(d => ({ id: d.credentialId, type: 'public-key' })),
        currentStatus: log ? (log.checkOutTime ? 'Checked Out' : 'Checked In') : 'Not Checked In',
        lastCheckInTime: log ? log.checkInTime : null,
        lastCheckOutTime: log ? log.checkOutTime : null
      }
    });
  } catch (error) {
    console.error('Identify employee error:', error);
    res.status(500).json({ success: false, message: 'Authentication identity check failed' });
  }
};

/**
 * ─── WEBAUTHN CHALLENGE GENERATION ──────────────────────────────────────────
 */

// 1. Register WebAuthn Options
export const registerOptions = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Create random 32-byte challenge
    const challenge = crypto.randomBytes(32).toString('base64url');

    // Create a secure signed session containing the challenge
    const registrationSession = signWebAuthnSession({
      employeeId: employee._id.toString(),
      challenge,
      type: 'register'
    });

    const rpName = 'Hudi Soft QR Attendance';
    const rpId = req.hostname === 'localhost' ? 'localhost' : req.hostname;

    res.json({
      success: true,
      data: {
        registrationSession,
        publicKeyOptions: {
          challenge,
          rp: { name: rpName, id: rpId },
          user: {
            id: employee._id.toString(),
            name: employee.email || employee.employeeId || employee.name,
            displayName: employee.name
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },  // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // TouchID / FaceID / Fingerprint API
            userVerification: 'required',
            residentKey: 'preferred'
          },
          attestation: 'none'
        }
      }
    });
  } catch (error) {
    console.error('Register options error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate registration options' });
  }
};

// 2. Verify Registration and Save Passkey
export const registerVerify = async (req, res) => {
  try {
    const { registrationSession, credentialPayload, deviceName, browser, os } = req.body;

    if (!registrationSession || !credentialPayload) {
      return res.status(400).json({ success: false, message: 'Payload missing' });
    }

    // Verify session
    const decoded = verifyWebAuthnSession(registrationSession);
    if (decoded.type !== 'register') {
      return res.status(400).json({ success: false, message: 'Invalid session token' });
    }

    const employee = await Employee.findById(decoded.employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Run verification
    const verifiedData = verifyRegistration(credentialPayload);
    if (!verifiedData.success) {
      return res.status(400).json({ success: false, message: verifiedData.error || 'Passkey verification failed' });
    }

    // Save credential in DB
    const device = await AttendanceDevice.create({
      employee: employee._id,
      credentialId: verifiedData.credentialId,
      publicKey: verifiedData.jwk,
      deviceName: deviceName || 'Mobile Biometrics',
      browser: browser || 'Mobile Browser',
      os: os || 'Device OS'
    });

    await AttendanceAuditLog.create({
      branch: employee.branch,
      action: 'Biometrics Registered',
      performedBy: employee.name,
      employee: employee._id,
      details: `Registered device passkey: ${device.deviceName} (${device.browser} on ${device.os})`,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Biometrics passkey registered successfully!',
      data: {
        credentialId: device.credentialId,
        deviceName: device.deviceName
      }
    });
  } catch (error) {
    console.error('Register verify error:', error);
    res.status(500).json({ success: false, message: error.message || 'Passkey verification failed' });
  }
};

// 3. Login options (Check-in/out biometrics trigger)
export const loginOptions = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const devices = await AttendanceDevice.find({ employee: employee._id });
    if (devices.length === 0) {
      return res.status(400).json({ success: false, message: 'No registered biometric credentials found for this employee.' });
    }

    // Generate random 32-byte challenge
    const challenge = crypto.randomBytes(32).toString('base64url');

    const loginSession = signWebAuthnSession({
      employeeId: employee._id.toString(),
      challenge,
      type: 'login'
    });

    res.json({
      success: true,
      data: {
        loginSession,
        publicKeyOptions: {
          challenge,
          rpId: req.hostname === 'localhost' ? 'localhost' : req.hostname,
          allowCredentials: devices.map(d => ({
            id: d.credentialId,
            type: 'public-key'
          })),
          userVerification: 'required'
        }
      }
    });
  } catch (error) {
    console.error('Login options error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate login options' });
  }
};

// 4. Verify login and execute Check-In / Check-Out
export const loginVerify = async (req, res) => {
  try {
    const { loginSession, assertionPayload, location, deviceName, browser, os } = req.body;

    if (!loginSession || !assertionPayload) {
      return res.status(400).json({ success: false, message: 'Required data missing' });
    }

    // Verify session
    const decoded = verifyWebAuthnSession(loginSession);
    if (decoded.type !== 'login') {
      return res.status(400).json({ success: false, message: 'Invalid verification session token' });
    }

    const employee = await Employee.findById(decoded.employeeId).populate('shift');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    // Lookup passkey matching the assertion credential ID
    const credentialId = assertionPayload.id;
    const device = await AttendanceDevice.findOne({ employee: employee._id, credentialId });

    if (!device) {
      return res.status(400).json({ success: false, message: 'Unrecognized biometric device credential' });
    }

    // Perform signature check
    const isVerified = verifyAssertion(assertionPayload.response, device.publicKey);
    if (!isVerified) {
      return res.status(401).json({ success: false, message: 'Biometrics signature verification failed' });
    }

    // Trigger log entry
    const logDetails = await performCheckAction(employee, location, {
      browser: browser || device.browser,
      os: os || device.os,
      ip: req.ip
    }, true);

    res.json({
      success: true,
      message: logDetails.message,
      data: logDetails.data
    });
  } catch (error) {
    console.error('Login verify error:', error);
    res.status(500).json({ success: false, message: error.message || 'Verification execution failed' });
  }
};

/**
 * ─── PIN / PASSCODE FALLBACK ENDPOINTS ───
 * Allows testing and bypass on local network / non-secure contexts
 */
export const pinVerifyFallback = async (req, res) => {
  try {
    const { employeeId, pin, location, browser, os } = req.body;

    const employee = await Employee.findById(employeeId).populate('shift');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Simplified fallback verification: compare pin against employee's phone number suffix (last 4 digits)
    const phone = employee.phone || '0000';
    const cleanPhone = phone.replace(/\D/g, '');
    const expectedPin = cleanPhone.slice(-4) || '1234';

    if (pin !== expectedPin && pin !== '1234') { // Allow 1234 as global override
      return res.status(401).json({ success: false, message: 'Invalid device fallback passcode verification.' });
    }

    // Perform log entry
    const logDetails = await performCheckAction(employee, location, {
      browser: browser || 'Browser',
      os: os || 'OS',
      ip: req.ip
    }, false);

    res.json({
      success: true,
      message: logDetails.message + ' (Fallback Authenticated)',
      data: logDetails.data
    });
  } catch (error) {
    console.error('PIN fallback error:', error);
    res.status(500).json({ success: false, message: error.message || 'Verification execution failed' });
  }
};


/**
 * ─── CORE ATTENDANCE ENGINE (CHECK IN & CHECK OUT FLOW) ───
 */
async function performCheckAction(employee, location, clientInfo, isBiometric) {
  const branchId = employee.branch;
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Fetch Branch Shift & Defaults
  const settings = await AttendanceSettings.findOne({ branch: branchId });
  const shift = employee.shift;

  // Defaults
  const shiftStart = shift ? shift.startTime : (settings?.officeStartTime || '08:00');
  const shiftEnd = shift ? shift.endTime : (settings?.officeEndTime || '17:00');
  const graceMinutes = shift ? shift.gracePeriod : (settings?.gracePeriod || 15);

  // Check if log exists for today
  let log = await AttendanceLog.findOne({ employee: employee._id, date: todayStr });

  if (!log) {
    // ────────────── CHECK IN FLOW ──────────────
    const checkInTime = new Date();

    // Calculate Late status
    const [startH, startM] = shiftStart.split(':').map(Number);
    const scheduledIn = new Date();
    scheduledIn.setHours(startH, startM, 0, 0);

    let status = 'Present';
    const differenceMinutes = (checkInTime - scheduledIn) / 60000;

    if (differenceMinutes > graceMinutes) {
      status = 'Late';
    }

    log = await AttendanceLog.create({
      employee: employee._id,
      branch: branchId,
      date: todayStr,
      checkInTime,
      status,
      isBiometricVerified: isBiometric,
      deviceInfo: {
        browser: clientInfo.browser,
        os: clientInfo.os,
        ip: clientInfo.ip
      },
      location: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
      } : undefined
    });

    // Send notifications if Late
    if (status === 'Late') {
      console.log(`🔔 NOTIFICATION ALERT: Employee ${employee.name} arrived late at ${checkInTime.toLocaleTimeString()}`);
    }

    await AttendanceAuditLog.create({
      branch: branchId,
      action: 'Check In',
      employee: employee._id,
      performedBy: employee.name,
      details: `Checked In at ${checkInTime.toLocaleTimeString()} [Status: ${status}]`,
      ip: clientInfo.ip
    });

    const formatTime = checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      message: `Welcome Back, ${employee.name}`,
      data: {
        action: 'CHECK_IN',
        timestamp: formatTime,
        status: status,
        log
      }
    };
  } else {
    // ────────────── CHECK OUT FLOW ──────────────
    if (log.checkOutTime) {
      throw new Error('You have already checked out for today.');
    }

    const checkOutTime = new Date();
    log.checkOutTime = checkOutTime;

    // Calculate hours worked
    const hours = parseFloat(((checkOutTime - log.checkInTime) / 3600000).toFixed(2));
    log.totalHours = hours;

    // Determine status updates (Overtime or Early Departure)
    const [endH, endM] = shiftEnd.split(':').map(Number);
    const scheduledOut = new Date();
    scheduledOut.setHours(endH, endM, 0, 0);

    const overtimeThreshold = shift?.overtimeRules?.minHours || settings?.overtimeRules?.minHoursForOvertime || 8;

    let finalStatus = log.status; // Keep Present or Late check-in status as base

    if (hours >= overtimeThreshold) {
      finalStatus = 'Overtime';
    } else if (checkOutTime < scheduledOut) {
      const minutesEarly = (scheduledOut - checkOutTime) / 60000;
      if (minutesEarly > 15) { // Early exit buffer
        finalStatus = 'Early Departure';
      }
    }

    log.status = finalStatus;
    await log.save();

    await AttendanceAuditLog.create({
      branch: branchId,
      action: 'Check Out',
      employee: employee._id,
      performedBy: employee.name,
      details: `Checked Out at ${checkOutTime.toLocaleTimeString()} [Hours: ${hours}, Status: ${finalStatus}]`,
      ip: clientInfo.ip
    });

    const formatTime = checkOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      message: 'Have a Great Day!',
      data: {
        action: 'CHECK_OUT',
        timestamp: formatTime,
        hoursWorked: hours,
        status: finalStatus,
        log
      }
    };
  }
}
