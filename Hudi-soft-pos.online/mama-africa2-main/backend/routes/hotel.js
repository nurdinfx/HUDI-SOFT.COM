import express from 'express';
import { auth } from '../middleware/auth.js';
import { licenseCheck } from '../middleware/licenseCheck.js';
import {
  getRoomTypes,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getReservations,
  getCheckedInGuests,
  createReservation,
  checkIn,
  checkOut,
  addCharge,
  addPayment,
  getHousekeepingTasks,
  createHousekeepingTask,
  updateHousekeepingTask,
  getMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  getHotelMetrics
} from '../controllers/hotelController.js';

const router = express.Router();

// Apply auth and license checks to all routes
router.use(auth);
router.use(licenseCheck);

// Room Types
router.get('/room-types', getRoomTypes);
router.post('/room-types', createRoomType);
router.put('/room-types/:id', updateRoomType);
router.delete('/room-types/:id', deleteRoomType);

// Rooms
router.get('/rooms', getRooms);
router.post('/rooms', createRoom);
router.put('/rooms/:id', updateRoom);
router.delete('/rooms/:id', deleteRoom);

// Reservations & Folio
router.get('/reservations', getReservations);
router.get('/guests/checked-in', getCheckedInGuests);
router.post('/reservations', createReservation);
router.post('/reservations/:id/checkin', checkIn);
router.post('/reservations/:id/checkout', checkOut);
router.post('/reservations/:id/charges', addCharge);
router.post('/reservations/:id/payments', addPayment);

// Housekeeping
router.get('/housekeeping', getHousekeepingTasks);
router.post('/housekeeping', createHousekeepingTask);
router.put('/housekeeping/:id', updateHousekeepingTask);

// Maintenance
router.get('/maintenance', getMaintenanceRequests);
router.post('/maintenance', createMaintenanceRequest);
router.put('/maintenance/:id', updateMaintenanceRequest);

// Metrics
router.get('/metrics', getHotelMetrics);

export default router;
