// app/data/site1.config.js
const { DateTime } = require('luxon');

const today = DateTime.now().startOf('day');

const pastSeriesStart = today.minus({ months: 4 }).toISODate();
const pastSeriesEnd = today.minus({ months: 2 }).toISODate();
const pastSingleDate = today.minus({ days: 45 }).toISODate();
const ongoingSeriesStart = today.minus({ days: 21 }).toISODate();
const ongoingSeriesEnd = today.plus({ months: 2 }).toISODate();
const futureSingleDate = today.plus({ days: 3 }).toISODate();
const childSessionIn2Days = today.plus({ days: 2 }).toISODate();
const childSessionIn3Days = today.plus({ days: 3 }).toISODate();
const childSessionIn4Days = today.plus({ days: 4 }).toISODate();
const childSessionIn5Days = today.plus({ days: 5 }).toISODate();
const childSessionIn6Days = today.plus({ days: 6 }).toISODate();
const childSessionIn7Days = today.plus({ days: 7 }).toISODate();
const nextTuesdayDate = today.plus({ days: (2 - today.weekday + 7) % 7 }).toISODate();

const SERVICE_IDS = {
  COVID_ADULT: 'COVID:18+',
  FLU_18_64: 'FLU:18-64',
  FLU_65_PLUS: 'FLU:65+',
  COVID_FLU_18_64: 'COVID_FLU:18-64',
  COVID_FLU_65_PLUS: 'COVID_FLU:65+',
  RSV_ADULT: 'RSV:Adult'
};

const clinics = [
  {
    label: '',
    startDate: '2026-04-13',
    endDate: '2026-04-30',
    recurrencePattern: {
      frequency: 'Weekly',
      interval: 1,
      byDay: ['Monday', 'Thursday', 'Wednesday', 'Tuesday', 'Friday']
    },
    from: '09:30',
    until: '17:00',
    slotLength: 5,
    services: [SERVICE_IDS.COVID_ADULT],
    capacity: 1,
    childSessions: [],
    closures: []
  },
  {
    label: '',
    startDate: '2026-05-05',
    endDate: '2026-06-30',
    recurrencePattern: {
      frequency: 'Weekly',
      interval: 1,
      byDay: ['Monday','Tuesday','Wednesday','Thursday','Friday']
    },
    from: '09:30',
    until: '17:00',
    slotLength: 5,
    services: [
      SERVICE_IDS.COVID_ADULT
    ],
    capacity: 1,
    childSessions: [
     
    ]
  }
];

const legacyClinics = [
  {
    services: [SERVICE_IDS.COVID_ADULT],
    date: today.plus({ days: 1 }),
    from: '10:00',
    until: '18:00',
    numberOfOccurances: 50
  }
];

module.exports = {
  // ---- Static site data ----
  site: {
    id: 3,
    status_id: 'online',
    name: 'Cooper’s Pharmacy',
    address: [
      '123 Fake Street',
      'Faketown',
      'FK1 2AB'
    ],
    phone: '01234 567890',
    ods: 'A123458',
    icb: 'South East London Integrated Care Board',
    region: 'London'
  },

  // ---- Clinics ----
  clinics,

  // ---- Legacy clinics ----
  legacyClinics,

  // ---- Bookings generation ----
  bookings: {
    services: [
      SERVICE_IDS.COVID_ADULT
    ],
    statuses: ['scheduled', 'cancelled', 'orphaned'],
    fillRate: 0.05,
    fillRatesByStatus: { scheduled: 0.98, cancelled: 0.02, orphaned: 0 },
    overrides: []
  }
};
