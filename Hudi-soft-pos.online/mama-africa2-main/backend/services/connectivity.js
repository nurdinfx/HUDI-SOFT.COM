import mongoose from 'mongoose';

/**
 * Checks if the system is currently connected to MongoDB.
 * MongoDB Online Version
 * @returns {Promise<boolean>}
 */
export const checkConnectivity = async () => {
    return mongoose.connection.readyState === 1;
};

/**
 * Returns the current connectivity status.
 * @returns {boolean}
 */
export const getConnectivityStatus = () => mongoose.connection.readyState === 1;

/**
 * Starts a background loop to monitor connectivity.
 * @param {number} interval - Interval in milliseconds.
 */
export const startConnectivityMonitoring = (interval = 5000) => {
    console.log('🌐 Connectivity monitoring: Online MongoDB mode active');
    
    setInterval(async () => {
        const connected = await checkConnectivity();
        if (!connected) {
            console.warn('⚠️ MongoDB connection lost. POS operations may be limited.');
        }
    }, interval);
};

export default {
    checkConnectivity,
    getConnectivityStatus,
    startConnectivityMonitoring
};

