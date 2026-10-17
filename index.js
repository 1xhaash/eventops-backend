import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import dbConnection from './db/dbConnection.js';

import { userRoutes } from './src/modules/users/users.routes.js';
import { organizerApplicationRoutes } from './src/modules/organizerApplication/organizerApplication.routes.js';
import adminRoutes from './src/modules/admin/admin.routes.js';
import { supportTicketRoutes } from './src/modules/support/support.routes.js';
import eventRoutes from './src/modules/event/eventRoutes.js';
import bookingRoutes from './src/modules/booking/booking.routes.js';
import paymentRoutes from './src/modules/payments/paymentRoutes.js';
import {
  eventTicketRoutes,
  bookingTicketRoutes,
} from './src/modules/tickets/ticket.routes.js';
import { errorHandler } from './src/middleware/auth.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use(userRoutes);
app.use(organizerApplicationRoutes);
app.use(adminRoutes);
app.use(supportTicketRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events', eventTicketRoutes);
app.use('/api/bookings', bookingTicketRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', bookingRoutes);

// Home route
app.get('/', (req, res) => {
    res.send('EventOps Backend is running!');
});

// Serve the frontend (Front/) so fixed links like /login.html work
app.use(express.static(path.join(__dirname, 'Front')));

// Handle routes that do not exist
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// Handle other errors
app.use(errorHandler);

// Database Connection and Server
dbConnection()
    .then(() => {
        const server = app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`Port ${port} is already in use by another process.`);
            } else {
                console.error('Server error:', err.message);
            }
        });
    })
    .catch((err) => {
        console.error('Database Connection Failed:', err.message);
    });
