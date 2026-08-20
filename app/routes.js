// External dependencies
const express = require('express');
const { getPDUs } = require('./helpers')
const router = express.Router();

// Make /javascripts resolve to both MOJ and GOV.UK bundles
router.use('/javascripts', [
  express.static('node_modules/@ministryofjustice/frontend/moj'),
  express.static('node_modules/govuk-frontend/dist/govuk')
])

require('./routes/prototype-admin')(router)

// user-management/add-user
//router.post('/user-management/add-user', function (req, res) {
//  const choice = req.session.data['ravsplus']; 
//  if (choice === 'yes') {
//    res.redirect('/user-management/add-features')
//  } else {
//    res.redirect('/user-management/check')
//  }
//});

// mvp-patient-list-and-export/export-patients
router.post('/mvp-patient-list-and-export/export-patients', function (req, res) {
  const choice = req.session.data['exportPatients']; 
  if (choice === 'filteredPatients') {
    res.redirect('/mvp-patient-list-and-export/export-patients-completed?filtersApplied=true')
  } else {
    res.redirect('/mvp-patient-list-and-export/export-patients-completed?filtersApplied')
  }
});

// occupational-health/export-patients
router.post('/occupational-health/export-patients', function (req, res) {
  const choice = req.session.data['exportPatients']; 
  if (choice === 'filteredPatients') {
    res.redirect('/occupational-health/export-patients-completed?filtersApplied=true')
  } else {
    res.redirect('/occupational-health/export-patients-completed?filtersApplied')
  }
});

router.get(/.*/, function (req, res, next) {
  // These functions are available on all pages in the prototype.
  // To use call the function inside curly brackets, for example {{ example_function() }}

  // Examples of date
  //
  // {{ date() }} shows todays date in the format 5 May 2022
  // {{ date({day: 'numeric', month: 'numeric', year: 'numeric'}) }} shows todays date in the format 05/05/2022
  // {{ date({day: 'numeric'}) }} shows the just the date of date, 5
  // {{ date({day: '2-digit'}) }} shows the date with a leading zero, 05
  // {{ date({day: 'numeric'}, {'day': -1}) }} shows just the date of yesterday
  // {{ date({weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}) }} shows todays date in the format Tuesday, 5 July 2022.
  // {{ date({day: 'numeric', month: 'numeric', year: 'numeric'}, {'day': +2}) }}

  
  res.locals.date = function (
    format = { day: 'numeric', month: 'long', year: 'numeric' },
    diff = { year: 0, month: 0, day: 0 },
  ) {
    var date = new Date()
    if ('day' in diff) {
      date.setDate(date.getDate() + diff.day)
    }
    if ('month' in diff) {
      date.setMonth(date.getMonth() + diff.month)
    }
    if ('year' in diff) {
      date.setYear(date.getFullYear() + diff.year)
    }
    const formattedDate = new Intl.DateTimeFormat('en-GB', format).format(date)
    return `${formattedDate}`
  }

  // Examples of today
  //
  // Useful for pre-populating date fields
  //
  // {{ today().day }} shows just todays day
  // {{ today().month }} shows just todays month as a number
  // {{ today().year }} shows just todays year as a number
  res.locals.today = () => ({
    day: res.locals.date({ day: 'numeric' }),
    month: res.locals.date({ month: 'numeric' }),
    year: res.locals.date({ year: 'numeric' }),
  })

  // Examples of yesterday
  //
  // Useful for pre-populating date fields
  //
  // {{ yesterday().day }} shows just todays day
  // {{ yesterday().month }} shows just todays month as a number
  // {{ yesterday().year }} shows just todays year as a number
  res.locals.yesterday = () => ({
    day: res.locals.date({ day: 'numeric' }, (diff = { day: -1 })),
    month: res.locals.date({ month: 'numeric' }, (diff = { day: -1 })),
    year: res.locals.date({ year: 'numeric' }, (diff = { day: -1 })),
  })

  next()
})

module.exports = router;