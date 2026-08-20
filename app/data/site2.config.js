// app/data/site2.config.js
const { DateTime } = require('luxon');

const today = DateTime.now().startOf('day');

const pastSeriesStart = today.minus({ months: 4 }).toISODate();
const pastSeriesEnd = today.minus({ months: 2 }).toISODate();
const pastSingleDate = today.minus({ days: 45 }).toISODate();
const ongoingSeriesStart = today.minus({ days: 21 }).toISODate();
const ongoingSeriesEnd = today.plus({ months: 2 }).toISODate();
const futureSingleDate = today.plus({ days: 3 }).toISODate();
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
    label: 'Mon, Thu clinic series 10:00',
    startDate: pastSeriesStart,
    endDate: pastSeriesEnd,
    recurrencePattern: {
      frequency: 'Weekly',
      interval: 1,
      byDay: ['Monday', 'Thursday']
    },
    from: '10:00',
    until: '14:00',
    slotLength: 15,
    services: [SERVICE_IDS.COVID_ADULT, SERVICE_IDS.FLU_65_PLUS],
    capacity: 2,
    childSessions: [],
    closures: [
      {
        startDate: pastSeriesStart,
        endDate: pastSeriesStart,
        label: 'Bank holiday'
      },
      {
        startDate: DateTime.fromISO(pastSeriesStart).plus({ days: 14 }).toISODate(),
        endDate: DateTime.fromISO(pastSeriesStart).plus({ days: 17 }).toISODate(),
        label: 'Maintenance window'
      }
    ]
  },
  {
    label: 'One off RSV',
    startDate: pastSingleDate,
    endDate: pastSingleDate,
    recurrencePattern: {
      frequency: 'Weekly',
      interval: 1,
      byDay: ['Wednesday']
    },
    from: '09:00',
    until: '12:00',
    slotLength: 10,
    services: [SERVICE_IDS.RSV_ADULT],
    capacity: 1,
    childSessions: [],
    closures: [
      {
        startDate: pastSingleDate,
        endDate: pastSingleDate,
        label: 'One-off closure'
      }
    ]
  },
  {
    label: 'Adult Flu and Covid clinics',
    startDate: ongoingSeriesStart,
    endDate: ongoingSeriesEnd,
    recurrencePattern: {
      frequency: 'Weekly',
      interval: 1,
      byDay: ['Monday','Tuesday','Wednesday','Thursday','Friday']
    },
    from: '11:00',
    until: '15:00',
    slotLength: 20,
    services: [
      SERVICE_IDS.COVID_ADULT, 
      SERVICE_IDS.COVID_FLU_18_64,
      SERVICE_IDS.COVID_FLU_65_PLUS,
      SERVICE_IDS.FLU_18_64,
      SERVICE_IDS.FLU_65_PLUS
    ],
    capacity: 2,
    childSessions: [],
    closures: [
      {
        startDate: today.plus({ days: 7 }).toISODate(),
        endDate: today.plus({ days: 7 }).toISODate(),
        label: 'Staff training day'
      },
      {
        startDate: today.plus({ days: 21 }).toISODate(),
        endDate: today.plus({ days: 23 }).toISODate(),
        label: 'Planned refurbishment'
      }
    ]
  },
  {
    label: 'One off RSV',
    startDate: futureSingleDate,
    endDate: futureSingleDate,
    recurrencePattern: {
      frequency: 'Weekly',
      interval: 1,
      byDay: ['Friday']
    },
    from: '13:00',
    until: '16:00',
    slotLength: 15,
    services: [SERVICE_IDS.RSV_ADULT],
    capacity: 1
  }
];

module.exports = {
  // ---- Static site data ----
  site: {
    id: 2,
    status_id: 'online',
    name: 'Cedar Lane Pharmacy',
    address: [
      '64 Cedar Lane',
      'Brighton',
      'BN1 1AG'
    ],
    phone: '01234 567890',
    ods: 'FCVFR42',
    icb: 'NHS Sussex Integrated Care Board',
    region: 'South East'
  },

  user: {
    name: 'Rima Patel',
    email: 'rima.patel@nhs.net'
  },

  // ---- Clinics ----
  clinics,

  // ---- Bookings generation ----
  bookings: {
    services: [
      SERVICE_IDS.COVID_ADULT,
      SERVICE_IDS.FLU_18_64,
      SERVICE_IDS.FLU_65_PLUS,
      SERVICE_IDS.RSV_ADULT
    ],
    statuses: ['scheduled', 'cancelled', 'orphaned'],
    fillRate: 0.35,
    fillRatesByStatus: { scheduled: 0.75, cancelled: 0.25, orphaned: 0 },
    overrides: [
      {
        datetime: `${nextTuesdayDate}T11:00`,
        service: SERVICE_IDS.COVID_ADULT,
        name: 'Alex Example',
        status: 'scheduled',
        contact: {}
      },
      {
        datetime: `${nextTuesdayDate}T11:20`,
        service: SERVICE_IDS.RSV_ADULT,
        name: 'Sam Example',
        status: 'cancelled'
      },
      {
        datetime: `${DateTime.fromISO(nextTuesdayDate).plus({ days: 7 }).toISODate()}T12:00`,
        service: SERVICE_IDS.COVID_ADULT,
        name: 'Taylor Example',
        status: 'scheduled'
      },
      {
        datetime: `${futureSingleDate}T13:00`,
        service: SERVICE_IDS.RSV_ADULT,
        name: 'Morgan Example',
        status: 'scheduled',
        contact: {
          landline: '01234 111222'
        }
      }
    ]
  }
};
