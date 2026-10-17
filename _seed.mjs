/* One-off seed for local frontend testing. Does NOT delete anything. */
import 'dotenv/config';
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { userModel } from './db/models/users.model.js';
import Event from './db/models/eventModel.js';
import { seatModel } from './db/models/seat.model.js';
import { bookingModel } from './db/models/booking.model.js';
import { organizerApplicationModel } from './db/models/organizerApplicationModel.js';

const PASS = 'Test1234';

async function ensureUser({ name, email, role, status }) {
  let user = await userModel.findOne({ email });
  if (user) return user;
  const legacyEmail = email.replace(/@eventops\.com$/, '@eventops.test');
  const legacy = await userModel.findOne({ email: legacyEmail });
  if (legacy) {
    legacy.email = email;
    await legacy.save();
    return legacy;
  }
  user = await userModel.create({
    name,
    email,
    passwordHash: bcrypt.hashSync(PASS, 8),
    role,
    status,
  });
  return user;
}

async function ensureEvent(organizerId, data) {
  let event = await Event.findOne({ organizer: organizerId, title: data.title });
  if (event) return event;
  event = await Event.create({ organizer: organizerId, ...data });
  return event;
}

async function ensureSeats(event) {
  const existing = await seatModel.countDocuments({ event: event._id });
  if (existing > 0) return;
  const seats = Array.from({ length: event.capacity }, (_, i) => ({
    event: event._id,
    label: `S${i + 1}`,
    status: 'available',
  }));
  await seatModel.insertMany(seats, { ordered: false });
}

async function ensureBooking(event, user, seatIndex, mode) {
  const active = await bookingModel.findOne({
    event: event._id,
    user: user._id,
    status: { $in: ['pending_payment', 'confirmed'] },
  });
  if (active) return active;

  const seat = await seatModel.findOne({ event: event._id }).skip(seatIndex);
  if (!seat) return null;

  const isFree = Number(event.price) === 0;
  const holdExpiresAt = isFree ? null : new Date(Date.now() + 10 * 60 * 1000);

  seat.status = isFree ? 'booked' : 'held';
  seat.heldBy = isFree ? null : user._id;
  seat.holdExpiresAt = holdExpiresAt;
  await seat.save();

  return bookingModel.create({
    event: event._id,
    user: user._id,
    seat: seat._id,
    status: isFree ? 'confirmed' : 'pending_payment',
    expiresAt: holdExpiresAt,
  });
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');

  const participant = await ensureUser({ name: 'Sara Participant', email: 'sara.participant@eventops.com', role: 'user', status: 'approved' });
  const organizer = await ensureUser({ name: 'Omar Organizer', email: 'omar.organizer@eventops.com', role: 'organizer', status: 'approved' });
  const admin = await ensureUser({ name: 'Aya Admin', email: 'admin@eventops.com', role: 'admin', status: 'approved' });
  const applicant = await ensureUser({ name: 'Nour Applicant', email: 'nour.applicant@eventops.com', role: 'user', status: 'approved' });

  const start = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const deadline = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

  const summit = await ensureEvent(organizer._id, {
    title: 'Indigo Tech Summit',
    description: 'A full day of talks about building modern event platforms.',
    venue: 'Cairo Convention Center',
    startsAt: start,
    endsAt: end,
    registrationDeadline: deadline,
    capacity: 60,
    price: 250,
    visibility: 'public',
    invitedEmails: [],
    status: 'scheduled',
  });

  const workshop = await ensureEvent(organizer._id, {
    title: 'Design Systems Workshop',
    description: 'Hands-on workshop about design tokens and component libraries.',
    venue: 'Nile Innovation Hub',
    startsAt: start,
    endsAt: end,
    registrationDeadline: deadline,
    capacity: 40,
    price: 0,
    visibility: 'public',
    invitedEmails: [],
    status: 'scheduled',
  });

  const founders = await ensureEvent(organizer._id, {
    title: 'Private Founders Meetup',
    description: 'Invite-only meetup for founders and investors.',
    venue: 'Downtown Rooftop',
    startsAt: start,
    endsAt: end,
    registrationDeadline: deadline,
    capacity: 30,
    price: 500,
    visibility: 'private',
    invitedEmails: [participant.email, applicant.email],
    status: 'scheduled',
  });

  for (const ev of [summit, workshop, founders]) await ensureSeats(ev);

  const b1 = await ensureBooking(summit, participant, 4, 'paid');
  const b2 = await ensureBooking(workshop, participant, 2, 'free');

  let application = await organizerApplicationModel.findOne({ user: applicant._id, status: 'pending' });
  if (!application) {
    application = await organizerApplicationModel.create({
      user: applicant._id,
      organizationName: 'Nour Events Co.',
      status: 'pending',
    });
  }

  console.log('\n=== SEED DONE (login password for all: ' + PASS + ') ===');
  console.log('Participant : sara.participant@eventops.com  (user, approved)');
  console.log('Organizer   : omar.organizer@eventops.com    (organizer, approved)');
  console.log('Admin       : admin@eventops.com             (admin, approved)');
  console.log('Applicant   : nour.applicant@eventops.com    (user, approved)');
  console.log('\nEvents (organizer-owned):');
  console.log('  ' + summit._id + '  Indigo Tech Summit (paid 250)');
  console.log('  ' + workshop._id + '  Design Systems Workshop (free)');
  console.log('  ' + founders._id + '  Private Founders Meetup (private)');
  console.log('\nBookings (participant):');
  console.log('  ' + b1._id + '  pending_payment @ Indigo Tech Summit');
  console.log('  ' + b2._id + '  confirmed       @ Design Systems Workshop');
  console.log('\nPending application: ' + application._id + ' (Nour Events Co.)');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Seed failed:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
