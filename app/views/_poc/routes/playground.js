// Returns a date object from a valid year, month, and day.
// Note: inputs can be strings, and month is based on 1 = Jan
// rather than 0 = Jan
// Time is set to midday
function dateFromYearMonthDay(year, month, day) {
  const yearInt = parseInt(year)
  const monthInt = parseInt(month)
  const dayInt = parseInt(day)

  if (yearInt > 0 && monthInt > 0 && dayInt > 0) {
    return new Date(yearInt, (monthInt - 1), dayInt, 12)
  } else {
    return null
  }
}

// If date2 is after date1 return positive number of days,
// if it’s before then negative, if it’s the same then 0.
function daysBetweenDates(date1, date2) {
  if (!date1 || !date2) {
    return null
  }
  const millisecondsInADay = (24 * 3600 * 1000)
  const differenceInMilliseconds = date2.getTime() - date1.getTime()
  const differenceInDays = differenceInMilliseconds / millisecondsInADay

  return Math.floor(differenceInDays)
}

module.exports = router => {

  router.get('/patient-upload', function (req, res) {
    res.render('patient-upload', {
      latestUpload: req.session.latestUpload,
      previousUploads: req.session.previousUploads || []
    })
  })

  // handle POST and store to session (demo only)
  router.post('/patient-upload', function (req, res) {
    // handle file in your middleware (e.g. multer); then set session values
    // req.session.latestUpload = { ... }
    // req.session.previousUploads = [ ... ]
    res.redirect('/patient-upload')
  })

}
