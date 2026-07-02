const { DateTime } = require('luxon');
const { clone, stableId } = require('./utils');

function generateAvailability({ site_id, start, end, patterns, overrides = {}, timezone = 'Europe/London' }) {
  const daily_availability = {};
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const startDate = DateTime.fromISO(start, { zone: timezone });
  const endDate = DateTime.fromISO(end, { zone: timezone });

  for (let date = startDate; date <= endDate; date = date.plus({ days: 1 })) {
    const dayName = weekdays[date.weekday % 7];
    const dateStr = date.toISODate();

    if (overrides[dateStr] !== undefined) {
      daily_availability[dateStr] = {
        date: dateStr,
        site_id,
        sessions: clone(overrides[dateStr])
      };

      daily_availability[dateStr].sessions = daily_availability[dateStr].sessions.map((session, i) => ({
        ...session,
        id: stableId(`${site_id}-${dateStr}-${session.start}-${session.end}-${i}`)
      }));

      continue;
    }

    if (patterns[dayName]) {
      daily_availability[dateStr] = {
        date: dateStr,
        site_id,
        sessions: clone(patterns[dayName])
      };

      daily_availability[dateStr].sessions = daily_availability[dateStr].sessions.map((session, i) => ({
        ...session,
        id: stableId(`${site_id}-${dateStr}-${session.start}-${session.end}-${i}`)
      }));
    }
  }

  return daily_availability;
}

module.exports = generateAvailability;
