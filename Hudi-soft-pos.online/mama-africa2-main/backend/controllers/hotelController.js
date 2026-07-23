import mongoose from 'mongoose';
import RoomType from '../models/RoomType.js';
import Room from '../models/Room.js';
import Reservation from '../models/Reservation.js';
import HousekeepingTask from '../models/HousekeepingTask.js';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import Finance from '../models/Finance.js';

// Helpers
const getBranchId = (req) => {
  return req.user.branch?._id || req.user.branch?.id || req.user.branch;
};

// ==========================================
// ROOM TYPES
// ==========================================
export const getRoomTypes = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const types = await RoomType.find({ branch }).sort({ created_at: -1 });
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createRoomType = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const { name, description, baseRate, amenities, maxOccupancy } = req.body;
    const type = new RoomType({ branch, name, description, baseRate, amenities, maxOccupancy });
    await type.save();
    res.status(201).json({ success: true, data: type });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRoomType = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const { id } = req.params;
    const updated = await RoomType.findOneAndUpdate({ _id: id, branch }, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRoomType = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const { id } = req.params;
    await RoomType.findOneAndDelete({ _id: id, branch });
    res.json({ success: true, message: 'Room type deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// ROOMS
// ==========================================
export const getRooms = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const rooms = await Room.find({ branch }).populate('roomType').sort({ number: 1 });
    res.json({ success: true, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createRoom = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const { number, floor, building, roomType, status } = req.body;
    const room = new Room({ branch, number, floor, building, roomType, status: status || 'available' });
    await room.save();
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const { id } = req.params;
    const updated = await Room.findOneAndUpdate({ _id: id, branch }, req.body, { new: true }).populate('roomType');
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const { id } = req.params;
    await Room.findOneAndDelete({ _id: id, branch });
    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// RESERVATIONS
// ==========================================
export const getReservations = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const list = await Reservation.find({ branch })
      .populate('room')
      .populate('roomType')
      .sort({ checkInDate: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCheckedInGuests = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const checkedIn = await Reservation.find({ branch, status: 'checked_in' })
      .populate('room')
      .populate('roomType')
      .sort({ guestName: 1 });
    res.json({ success: true, data: checkedIn });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createReservation = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const { guestName, guestPhone, guestEmail, room, roomType, checkInDate, checkOutDate, dailyRate, deposit } = req.body;
    
    // Check double booking
    const overlap = await Reservation.findOne({
      branch,
      room,
      status: { $in: ['reserved', 'checked_in'] },
      $or: [
        { checkInDate: { $lt: new Date(checkOutDate) }, checkOutDate: { $gt: new Date(checkInDate) } }
      ]
    });

    if (overlap) {
      return res.status(400).json({ success: false, message: 'Room is already booked for these dates.' });
    }

    const reservation = new Reservation({
      branch,
      guestName,
      guestPhone,
      guestEmail,
      room,
      roomType,
      checkInDate,
      checkOutDate,
      dailyRate,
      deposit: deposit || 0,
      status: 'reserved'
    });

    // Automatically calculate room charges
    const nights = Math.max(1, Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)));
    const totalRoomCharge = dailyRate * nights;

    reservation.charges.push({
      description: `Room Charge (${nights} Nights @ $${dailyRate}/night)`,
      amount: totalRoomCharge,
      type: 'room',
      date: new Date()
    });

    await reservation.save();
    
    // Update room status
    await Room.findByIdAndUpdate(room, { status: 'reserved' });

    // Record initial deposit in Finance and Folio payments if provided
    if (deposit && Number(deposit) > 0) {
      reservation.payments.push({
        amount: Number(deposit),
        method: req.body.paymentMethod || 'cash',
        date: new Date()
      });
      await reservation.save();

      try {
        const financeRecord = new Finance({
          type: 'income',
          amount: Number(deposit),
          description: `Hotel Booking Deposit - Guest: ${guestName}`,
          category: 'Hotel',
          paymentMethod: req.body.paymentMethod || 'cash',
          reference: `RES-${reservation._id}`,
          branch
        });
        await financeRecord.save();
      } catch (fErr) {
        console.error('Failed to create finance entry for hotel deposit:', fErr);
      }
    }

    res.status(201).json({ success: true, data: reservation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkIn = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const { id } = req.params;
    
    const reservation = await Reservation.findOne({ _id: id, branch });
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    reservation.status = 'checked_in';
    await reservation.save();

    await Room.findByIdAndUpdate(reservation.room, { status: 'occupied' });

    res.json({ success: true, data: reservation, message: 'Guest checked in successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkOut = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const { id } = req.params;
    
    const reservation = await Reservation.findOne({ _id: id, branch });
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    reservation.status = 'checked_out';
    await reservation.save();

    // Mark room dirty on checkout
    await Room.findByIdAndUpdate(reservation.room, { status: 'dirty' });

    // Create a housekeeping task
    const task = new HousekeepingTask({
      branch,
      room: reservation.room,
      taskType: 'cleaning',
      status: 'pending',
      notes: `Checkout clean for room number ${reservation.room}`
    });
    await task.save();

    res.json({ success: true, data: reservation, message: 'Guest checked out successfully. Room status set to dirty.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addCharge = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const { id } = req.params; // reservation ID
    const { description, amount, type, sourceOrder } = req.body;

    const reservation = await Reservation.findOne({ _id: id, branch });
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Active Guest Folio not found' });
    }

    reservation.charges.push({
      description,
      amount,
      type: type || 'other',
      sourceOrder: sourceOrder || null,
      date: new Date()
    });

    await reservation.save();
    res.json({ success: true, data: reservation, message: 'Charge posted to guest folio successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addPayment = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const { id } = req.params; // reservation ID
    const { amount, method } = req.body;

    const reservation = await Reservation.findOne({ _id: id, branch });
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Active Guest Folio not found' });
    }

    reservation.payments.push({
      amount: Number(amount),
      method: method || 'cash',
      date: new Date()
    });

    await reservation.save();

    // Create Finance income record for reports and finance dashboard
    try {
      const roomNum = reservation.room?.number || reservation.room || '';
      const financeRecord = new Finance({
        type: 'income',
        amount: Number(amount),
        description: `Hotel Folio Payment - Guest: ${reservation.guestName}${roomNum ? ` (Room ${roomNum})` : ''}`,
        category: 'Hotel',
        paymentMethod: method || 'cash',
        reference: `FOLIO-${reservation._id}`,
        branch
      });
      await financeRecord.save();
    } catch (fErr) {
      console.error('Failed to create finance entry for folio payment:', fErr);
    }

    res.json({ success: true, data: reservation, message: 'Payment recorded in guest folio successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// HOUSEKEEPING
// ==========================================
export const getHousekeepingTasks = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const tasks = await HousekeepingTask.find({ branch }).populate('room').sort({ created_at: -1 });
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createHousekeepingTask = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const { room, staff, taskType, notes } = req.body;
    const task = new HousekeepingTask({ branch, room, staff, taskType, notes });
    await task.save();
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateHousekeepingTask = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const { id } = req.params;
    const { status, notes } = req.body;

    const updatedTask = await HousekeepingTask.findOneAndUpdate(
      { _id: id, branch },
      { status, notes },
      { new: true }
    ).populate('room');

    if (status === 'completed' && updatedTask) {
      // Clean status updates room to clean/available
      await Room.findByIdAndUpdate(updatedTask.room._id, { status: 'available' });
    }

    res.json({ success: true, data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// MAINTENANCE
// ==========================================
export const getMaintenanceRequests = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const requests = await MaintenanceRequest.find({ branch }).populate('room').sort({ created_at: -1 });
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createMaintenanceRequest = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const { room, description, priority, outOfOrder } = req.body;
    
    const request = new MaintenanceRequest({ branch, room, description, priority, outOfOrder });
    await request.save();

    if (outOfOrder) {
      await Room.findByIdAndUpdate(room, { status: 'out_of_order' });
    }

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMaintenanceRequest = async (req, res) => {
  try {
    const branch = getBranchId(req);
    const { id } = req.params;
    const { status, notes } = req.body;

    const updated = await MaintenanceRequest.findOneAndUpdate(
      { _id: id, branch },
      { status, notes },
      { new: true }
    ).populate('room');

    if (status === 'completed' && updated) {
      await Room.findByIdAndUpdate(updated.room._id, { status: 'available' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// HOTEL REPORTS / METRICS
// ==========================================
export const getHotelMetrics = async (req, res) => {
  try {
    const branch = getBranchId(req);
    
    const totalRooms = await Room.countDocuments({ branch });
    const occupiedRooms = await Room.countDocuments({ branch, status: 'occupied' });
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    const reservations = await Reservation.find({ branch, status: 'checked_in' });
    let totalRoomRevenue = 0;
    reservations.forEach(r => {
      totalRoomRevenue += (r.dailyRate || 0);
    });

    const adr = occupiedRooms > 0 ? totalRoomRevenue / occupiedRooms : 0;
    const revpar = totalRooms > 0 ? totalRoomRevenue / totalRooms : 0;

    const pendingHousekeeping = await HousekeepingTask.countDocuments({ branch, status: 'pending' });
    const pendingMaintenance = await MaintenanceRequest.countDocuments({ branch, status: 'open' });

    res.json({
      success: true,
      data: {
        totalRooms,
        occupiedRooms,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        roomRevenueToday: totalRoomRevenue,
        adr: Math.round(adr * 100) / 100,
        revpar: Math.round(revpar * 100) / 100,
        pendingHousekeeping,
        pendingMaintenance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
