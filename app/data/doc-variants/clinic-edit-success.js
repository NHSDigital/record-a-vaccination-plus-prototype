const CLINIC_EDIT_SUCCESS_DOC_VARIANTS = Object.freeze({
  'updated-default': Object.freeze({
    isSeries: true,
    cancelledBookingsSummary: null,
    unaffectedChildClinics: [],
    unaffectedChildReasonText: 'details'
  }),
  'updated-unaffected-time-single': Object.freeze({
    isSeries: true,
    cancelledBookingsSummary: null,
    unaffectedChildClinics: ['12 Aug 2026'],
    unaffectedChildReasonText: 'start and end times'
  }),
  'updated-unaffected-vaccinators-single': Object.freeze({
    isSeries: true,
    cancelledBookingsSummary: null,
    unaffectedChildClinics: ['19 Aug 2026'],
    unaffectedChildReasonText: 'vaccinators'
  }),
  'updated-cancelled': Object.freeze({
    isSeries: true,
    cancelledBookingsSummary: {
      cancelledCount: 6,
      unnotifiedCount: 0,
      unnotifiedBookings: []
    },
    unaffectedChildClinics: [],
    unaffectedChildReasonText: 'details'
  }),
  'updated-cancelled-unnotified': Object.freeze({
    isSeries: true,
    cancelledBookingsSummary: {
      cancelledCount: 6,
      unnotifiedCount: 2,
      unnotifiedBookings: [
        {
          id: '1001',
          name: 'Example Person One'
        },
        {
          id: '1002',
          name: 'Example Person Two'
        }
      ]
    },
    unaffectedChildClinics: [],
    unaffectedChildReasonText: 'details'
  }),
  'updated-cancelled-unnotified-unaffected': Object.freeze({
    isSeries: true,
    cancelledBookingsSummary: {
      cancelledCount: 6,
      unnotifiedCount: 2,
      unnotifiedBookings: [
        {
          id: '1001',
          name: 'Example Person One'
        },
        {
          id: '1002',
          name: 'Example Person Two'
        }
      ]
    },
    unaffectedChildClinics: ['12 Aug 2026', '26 Aug 2026'],
    unaffectedChildReasonText: 'services'
  })
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getClinicEditSuccessDocVariant(variantId = '') {
  const normalizedId = String(variantId || '').trim();
  if (!normalizedId) return null;

  const variant = CLINIC_EDIT_SUCCESS_DOC_VARIANTS[normalizedId];
  return variant ? clone(variant) : null;
}

function listClinicEditSuccessDocVariantIds() {
  return Object.keys(CLINIC_EDIT_SUCCESS_DOC_VARIANTS).sort();
}

module.exports = {
  getClinicEditSuccessDocVariant,
  listClinicEditSuccessDocVariantIds
};
