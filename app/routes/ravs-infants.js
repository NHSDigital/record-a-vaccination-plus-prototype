module.exports = router => {

  const VACCINE_NAME_FROM_ROUTE = {
    '/ravs-infants/concept-covid': 'COVID-19',
    '/ravs-infants/concept-flu': 'Flu',
    '/ravs-infants/concept-6in1': '6-in-1',
    '/ravs-infants/concept-bcg': 'BCG'
  }

  function formatNhsNumber(nhs) {
    if (!nhs) return nhs

    const raw = nhs.replace(/\s/g, '')
    if (raw.length !== 10) return nhs

    return `${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6, 10)}`
  }

  const VACCINE_JOURNEY_MAP = [
    {
      checkboxValue: 'ZeroToFiveYearsCovid',
      route: '/ravs-infants/concept-covid'
    },
    {
      checkboxValue: 'ZeroToFiveYearsFlu',
      route: '/ravs-infants/concept-flu'
    },
    {
      checkboxValue: 'ZeroToFiveYears6-in-1',
      route: '/ravs-infants/concept-6in1'
    },
    {
      checkboxValue: 'ZeroToFiveYearsBCG',
      route: '/ravs-infants/concept-bcg'
    }
  ]

  // do-you-have-the-patients-number
  router.post('/ravs-infants/do-you-have-the-patients-number', function (req, res) {
    const data = req.session.data

    const allowedNhsNumbers = ['9449306001', '9165325681']

    let nhsNumber = data.nhsNumber

    if (!allowedNhsNumbers.includes(nhsNumber)) {
      nhsNumber = '9449306001'
      data.nhsNumber = nhsNumber
    }

    data.patient ??= {}
    data.patient.vaccinationHistory ??= []

    if (data.previousNhsNumber && data.previousNhsNumber !== nhsNumber) {
      data.patient.vaccinationHistory = []

      data.firstName = null
      data.lastName = null
      data.vaccineHistory = null
      data.dobFormatted = null
      data.ageLabel = null
      data.address = null
      data.gpAddress = null
    }

    data.previousNhsNumber = nhsNumber

    const formatDate = (d) =>
      d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })

    const dateFromToday = ({ years = 0, months = 0 }) => {
      const d = new Date()
      d.setFullYear(d.getFullYear() + years)
      d.setMonth(d.getMonth() + months)
      return d
    }

    const patientLookup = {
      "9449306001": {
        firstName: "Nadia",
        lastName: "Hillaker",
        vaccineHistory: "no",

        dobOffset: { months: -6 },
        ageLabel: "6 months",

        address: "73 Roman Rd<br>Leeds<br>LS2 5ZN",
        gpAddress: "Beech House Surgery<br>1 Ash Tree Road<br>Knaresborough<br>HG5 0UB"
      },

      "9165325681": {
        firstName: "Thomas",
        lastName: "Smith",
        vaccineHistory: "yes",

        dobOffset: { years: -3, months: -2 },
        ageLabel: "3 years 2 months",

        address: "Flat 4, Rose Court<br>Wakefield<br>WF1 7QP",
        gpAddress: "Trinity Medical Centre<br>Thornhill Street<br>Wakefield<br>WF1 1PG",

        seededVaccinations: [
          {
            date: "26 April 2023",
            vaccine: "MenB<br>(2nd dose)",
            product: "4CMenB (Bexsero)"
          },
          {
            date: "26 April 2023",
            vaccine: "6-in-1<br>(3rd dose)",
            product: "Infanrix Hexa"
          },
          {
            date: "15 March 2023",
            vaccine: "Pneumococcal<br>(1st dose)",
            product: "PCV13 (Prevenar 13)"
          },
          {
            date: "15 March 2023",
            vaccine: "6-in-1<br>(2nd dose)",
            product: "Infanrix Hexa"
          },
          {
            date: "15 March 2023",
            vaccine: "RotaVirus<br>(2nd dose)",
            product: "Rotarix"
          },
          {
            date: "10 February 2023",
            vaccine: "MenB<br>(1st dose)",
            product: "4CMenB (Bexsero)"
          },
          {
            date: "10 February 2023",
            vaccine: "6-in-1<br>(1st dose)",
            product: "Infanrix Hexa"
          },
          {
            date: "10 February 2023",
            vaccine: "RotaVirus<br>(1st dose)",
            product: "Rotarix"
          }
        ]
      }
    }

    const patient = patientLookup[nhsNumber]

    if (patient) {
      data.firstName = patient.firstName
      data.lastName = patient.lastName
      data.vaccineHistory = patient.vaccineHistory

      const dobDate = dateFromToday(patient.dobOffset)
      data.dobFormatted = formatDate(dobDate)
      data.ageLabel = patient.ageLabel

      data.address = patient.address
      data.gpAddress = patient.gpAddress

      if (
        patient.seededVaccinations &&
        data.patient.vaccinationHistory.length === 0
      ) {
        data.patient.vaccinationHistory.push(
          ...patient.seededVaccinations
        )
      }
    }

    data.nhsNumberFormatted = formatNhsNumber(nhsNumber)

    return res.redirect('patient-history')
  })

  // concept-do-you-have-the-patients-number
  router.post('/ravs-infants/concept-do-you-have-the-patients-number', function (req, res) {
    return res.redirect('concept-vaccine?frstName=Nadir&lastName=Hillaker#zero-to-five-years')
  })
  
  // patient-history
  router.post('/ravs-infants/patient-history', function (req, res) {
    const data = req.session.data
    if (data.repeatPatient === 'yes') {
      return res.redirect('vaccine')
    }
    return res.redirect('is-the-vaccination-today')
  })

  // is-the-vaccination-today
  router.post('/ravs-infants/is-the-vaccination-today', function (req, res) {
    return res.redirect('delivery-team')
  })

  // delivery-team
  router.post('/ravs-infants/delivery-team', function (req, res) {
    //const vaccinatorId = req.session.data.vaccinatorId

    //if (!vaccinatorId) {
    //  return res.render('ravs-infants/vaccinator', { vaccinatorError: 'Select who the vaccinator is' })
    //}

    return res.redirect('vaccinator')
  })

  // vaccinator
  router.post('/ravs-infants/vaccinator', function (req, res) {
    //const vaccinatorId = req.session.data.vaccinatorId

    //if (!vaccinatorId) {
    //  return res.render('ravs-infants/vaccinator', { vaccinatorError: 'Select who the vaccinator is' })
    //}

    return res.redirect('vaccine')
  })

  // vaccine
  router.post('/ravs-infants/vaccine', function (req, res) {
    const whichVaccine = req.session.data.whichVaccine
    const vaccineProduct = req.session.data.vaccineProduct

    if (vaccineProduct === 'Fluenz (LAIV)' && req.session.data.nhsNumber === '9449306001') {
      return res.redirect('flu/too-young-warning')
    }

    if (whichVaccine === '6-in-1' || whichVaccine === 'Flu' ||  whichVaccine === 'MenB' ||  whichVaccine === 'Pneumococcal' ||  whichVaccine === 'MMRV') {
      return res.redirect('dosage')
    }

    res.redirect('batch')
  })

  // dosage
  router.post('/ravs-infants/dosage', function (req, res) {
    const whichVaccine = req.session.data.whichVaccine
    const selectedDose = req.session.data.dosage

    if ((whichVaccine === '6-in-1' && selectedDose !== '1st dose' && req.session.data.nhsNumber === '9449306001') || (whichVaccine === '6-in-1' && selectedDose !== '4th dose' && req.session.data.nhsNumber === '9165325681')) {
      return res.redirect('6in1/interval-warning')
    }

    res.redirect('batch')
  })

  // batch
  router.post('/ravs-infants/batch', function (req, res) {
    const whichVaccine = req.session.data.whichVaccine

    res.redirect('eligibility')
  })

  // eligibility
  router.post('/ravs-infants/eligibility', function (req, res) {
    const whichVaccine = req.session.data.whichVaccine

    res.redirect('consent')
  })

  // consent
  router.post('/ravs-infants/consent', function (req, res) {
    const whichVaccine = req.session.data.whichVaccine

    res.redirect('injection-site')
  })

  // injection-site
  router.post('/ravs-infants/injection-site', function (req, res) {
    const whichVaccine = req.session.data.whichVaccine

    res.redirect('check')
  })

  // check
  router.post('/ravs-infants/check', function (req, res) {
    const whichVaccine = req.session.data.whichVaccine

    res.redirect('done')
  })

  // done
  router.post('/ravs-infants/done', (req, res) => {
    const data = req.session.data

    data.selectedVaccines ??= []
    if (data.whichVaccine && !data.selectedVaccines.includes(data.whichVaccine)) {
      data.selectedVaccines.push(data.whichVaccine)
    }

    data.patient ??= {}
    data.patient.vaccinationHistory ??= []

    const recordDate = (data.vaccinationToday === 'yes')
      ? new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : data.vaccinationDateFormatted || data.vaccinationDate

    const vaccineDisplay =
      (data.dosage && data.dosage !== '')
        ? `${data.whichVaccine}<br>(${data.dosage})`
        : data.whichVaccine

    const record = {
      date: recordDate,
      vaccine: vaccineDisplay,
      product: data.vaccineProduct
    }

    const signature = `${record.date}|${record.vaccine}|${record.product}`
    data.lastSavedVaccinationSignature ??= null

    if (data.lastSavedVaccinationSignature !== signature) {
      data.patient.vaccinationHistory.unshift(record)
      data.lastSavedVaccinationSignature = signature
    }

    switch (data.nextStep) {

      case 'same-patient-another-vaccination':
        // Same patient, different vaccine
        req.session.data.deliveryTeam = ''
        req.session.data.vaccinator = ''
        req.session.data.whichVaccine = ''
        req.session.data.whichProduct = ''
        req.session.data.dosage = ''
        req.session.data.vaccineBatch = ''
        req.session.data.eligibility = ''
        //req.session.data.consent = ''
        //req.session.data.consentParentName = ''
        req.session.data.injectionSite = ''
        req.session.data.otherInjectionSite = ''

        return res.redirect('/ravs-infants/patient-history?repeatPatient=yes&repeatVaccination=no&vaccineHistory=yes')

      case 'same-vaccination-another-patient':
        // New patient, same vaccine
        req.session.data.nhsNumber = ''
        req.session.data.vaccinationToday = ''
        req.session.data.deliveryTeam = ''
        req.session.data.vaccinator = ''
        req.session.data.dosage = ''
        req.session.data.eligibility = ''
        req.session.data.consent = ''
        req.session.data.consentParentName = ''
        req.session.data.injectionSite = ''
        req.session.data.otherInjectionSite = ''

        delete req.session.data.selectedVaccines

        return res.redirect('/ravs-infants/review-previous?repeatVaccination=yes&repeatPatient=no')

      case 'different-vaccination-another-patient':
        // New patient, new vaccine
        req.session.data.nhsNumber = ''
        req.session.data.vaccinationToday = ''
        req.session.data.deliveryTeam = ''
        req.session.data.vaccinator = ''
        req.session.data.whichVaccine = ''
        req.session.data.whichProduct = ''
        req.session.data.dosage = ''
        req.session.data.vaccineBatch = ''
        req.session.data.eligibility = ''
        req.session.data.consent = ''
        req.session.data.consentParentName = ''
        req.session.data.injectionSite = ''
        req.session.data.otherInjectionSite = ''
        
        delete req.session.data.selectedVaccines
        
        return res.redirect('/ravs-infants/do-you-have-the-patients-number?repeatPatient=no&repeatVaccination=no')

      default:
        // Safety fallback and reset all values
        req.session.data.nhsNumber = ''
        req.session.data.vaccinationToday = ''
        req.session.data.deliveryTeam = ''
        req.session.data.vaccinator = ''
        req.session.data.whichVaccine = ''
        req.session.data.whichProduct = ''
        req.session.data.dosage = ''
        req.session.data.vaccineBatch = ''
        req.session.data.eligibility = ''
        req.session.data.consent = ''
        req.session.data.consentParentName = ''
        req.session.data.injectionSite = ''
        req.session.data.otherInjectionSite = ''

        return res.redirect('/ravs-infants/?repeatPatient=no&repeatVaccination=no')
    }

  })

  // concept-1-vaccine
  router.post('/ravs-infants/concept-1-vaccine', function (req, res) {
    res.redirect('concept-1-6in1')
  })

  // concept-1-6in1
  router.post('/ravs-infants/concept-1-6in1', function (req, res) {
    //res.redirect('to-be-covid')
  })

  // concept-2-vaccine
  router.post('/ravs-infants/concept-2-vaccine', function (req, res) {
    res.redirect('concept-2-6in1')
  })

  // concept-2-6in1
  router.post('/ravs-infants/concept-2-6in1', function (req, res) {
    //res.redirect('to-be-covid')
  })

  // concept-3a-vaccine
  router.post('/ravs-infants/concept-3a-vaccine', function (req, res) {
    res.redirect('concept-3a-6in1')
  })

  // concept-3a-6in1
  router.post('/ravs-infants/concept-3a-6in1', function (req, res) {
    //res.redirect('to-be-covid')
  })

  // concept-3b-vaccine
  router.post('/ravs-infants/concept-3b-vaccine', function (req, res) {
    res.redirect('concept-3b-6in1')
  })

  // concept-3b-6in1
  router.post('/ravs-infants/concept-3b-6in1', function (req, res) {
    //res.redirect('to-be-covid')
  })

  //////////////////////////////////

  // concept-vaccine
  router.post('/ravs-infants/concept-vaccine', function (req, res) {
    const data = req.session.data

    const selectedVaccines = [
      ...(data.ZeroToFiveYearsSeasonal || []),
      ...(data.ZeroToFiveYearsNonseasonal || [])
    ]

    data.vaccineJourney = VACCINE_JOURNEY_MAP
      .filter(v => selectedVaccines.includes(v.checkboxValue))
      .map(v => v.route)

    data.currentVaccineIndex = 0

    if (!data.vaccineJourney.length) {
      return res.redirect('/ravs-infants/concept-vaccine')
    }

    return res.redirect(data.vaccineJourney[0])
  })

  // concept-covid
  //router.get('/ravs-infants/concept-covid', function (req, res) {
  //  const data = req.session.data

  //  hydrateConsentForPage(data, 'COVID')

  //  const errors = data.errors || []
  //  data.errors = null

  //  return res.render('ravs-infants/concept-covid', {
  //    ...res.locals,
  //    errors
  //  })
  //})

  // concept-flu
  //router.get('/ravs-infants/concept-flu', function (req, res) {
  //  const data = req.session.data

  //  hydrateConsentForPage(data, 'flu')

  //  const errors = data.errors || []
  //  data.errors = null

  //  return res.render('ravs-infants/concept-flu', {
  //    ...res.locals,
  //    errors
  //  })
  //})

  // concept-6in1
  //router.get('/ravs-infants/concept-6in1', function (req, res) {
  //  const data = req.session.data

  //  hydrateConsentForPage(data, '')

  //  const errors = data.errors || []
  //  data.errors = null

  //  return res.render('ravs-infants/concept-6in1', {
  //    ...res.locals,
  //    errors
  //  })
  //})

  // next-vaccine
  router.post('/ravs-infants/next-vaccine', function (req, res) {
    const data = req.session.data

    if (
      data.whichVaccine === '6-in-1' &&
      data.productDose &&
      data.productDose !== 'Dose 1'
    ) {
      data.errors = [
        {
          text: 'This patient has not had their first dose',
          href: '#productDose'
        }
      ]

      return res.redirect('/ravs-infants/concept-6in1')
    }

    data.sessionVaccinations ??= []
    const index = data.currentVaccineIndex
    //const vaccine = data.whichVaccine
    const vaccine =
      data.whichVaccine === 'DTaP/IPV/Hib/HepB (6-in-1)'
        ? '6-in-1'
        : data.whichVaccine

    let consentType = null
    let consentName = null

    if (data.consent === 'Parent or guardian' && data.consentParentName) {
      consentType = data.consent
      consentName = data.consentParentName
    }

    if (data.fluConsent === 'Parent or guardian' && data.fluConsentParentName) {
      consentType = data.fluConsent
      consentName = data.fluConsentParentName
    }

    if (data.COVIDConsent === 'Parent or guardian' && data.COVIDConsentParentName) {
      consentType = data.COVIDConsent
      consentName = data.COVIDConsentParentName
    }

    // If consent was submitted on this page, update sessionConsent
    if (consentType && consentName) {
      data.sessionConsent = {
        type: consentType,
        name: consentName,
        html: `${consentName}<br>${consentType}`
      }
    }

    // After setting sessionConsent
    if (data.sessionConsent) {
      data.consent = data.sessionConsent.type
      data.consentParentName = data.sessionConsent.name

      data.fluConsent = data.sessionConsent.type
      data.fluConsentParentName = data.sessionConsent.name

      data.COVIDConsent = data.sessionConsent.type
      data.COVIDConsentParentName = data.sessionConsent.name

      data.bcgConsent = data.sessionConsent.type
      data.bcgConsentParentName = data.sessionConsent.name
    }

    let dose = null
    if (vaccine !== 'COVID-19') {
      dose = data.productDose || data.fluDose || null
    }

    let eligibility = null

    if (data['6in1Eligibility'] === 'For another reason') {
      eligibility = data['6in1EligibilityReason']
    } else if (data.fluEligibility === 'For another reason') {
      eligibility = data.fluEligibilityReason
    } else if (data.COVIDEligibility === 'For another reason') {
      eligibility = data.COVIDEligibilityReason
    } else if (data.BCGEligibility === 'For another reason') {
      eligibility = data.BCGEligibilityReason
    } else {
      eligibility =
        data['6in1Eligibility'] ||
        data.fluEligibility ||
        data.COVIDEligibility ||
        data.BCGEligibility ||
        null
    }

    let injectionSite = null
    if (data.injectionSite === 'other') {
      injectionSite =
        data['6in1InjectionSitesomewhereElse'] ||
        data.fluInjectionSitesomewhereElse ||
        data.COVIDInjectionSitesomewhereElse ||
        data.BCGInjectionSitesomewhereElse ||
        null
    } else {
      injectionSite = data.injectionSite || null
    }

    // Pick product based on current vaccine only (no fall-through)
    let product = null

    if (vaccine === '6-in-1') product = data.which6in1product || null
    else if (vaccine === 'Flu') product = data.whichFluProduct || null
    else if (vaccine === 'COVID-19') product = data.whichCOVIDProduct || null
    else if (vaccine === 'BCG') product = data.whichBCGproduct || null

    data.sessionVaccinations[index] = {
      vaccine,
      product,
      dose,
      batch:
        data.vaccineInfanrixHexaBatch ||
        data.vaccineVaxelisBatch ||
        data.vaccineFluBatch ||
        data.vaccineCOVIDBatch ||
        null,
      eligibility,
      consentHtml: data.sessionConsent?.html || null,
      injectionSite,
      skipped: false
    }

    delete data.productDose
    delete data.fluDose

    delete data['6in1Eligibility']
    delete data.fluEligibility
    delete data.COVIDEligibility
    delete data['6in1EligibilityReason']
    delete data.fluEligibilityReason
    delete data.COVIDEligibilityReason

    delete data.injectionSite
    delete data['6in1InjectionSitesomewhereElse']
    delete data.fluInjectionSitesomewhereElse
    delete data.COVIDInjectionSitesomewhereElse

    delete data.BCGEligibility
    delete data.BCGEligibilityReason
    delete data.BCGInjectionSitesomewhereElse

    data.currentVaccineIndex += 1

    if (data.currentVaccineIndex < data.vaccineJourney.length) {
      return res.redirect(data.vaccineJourney[data.currentVaccineIndex])
    }

    return res.redirect('/ravs-infants/concept-check')
  })

  // skip-vaccine
  router.get('/ravs-infants/skip-vaccine', function (req, res) {
    const data = req.session.data

    data.sessionVaccinations ??= []

    const index = data.currentVaccineIndex
    const route = data.vaccineJourney[index]

    data.sessionVaccinations[index] = {
      vaccine: VACCINE_NAME_FROM_ROUTE[route],
      skipped: true
    }

    data.currentVaccineIndex += 1

    if (data.currentVaccineIndex < data.vaccineJourney.length) {
      return res.redirect(
        data.vaccineJourney[data.currentVaccineIndex]
      )
    }

    return res.redirect('/ravs-infants/concept-check')
  })

  // confirm not recorded
  router.post('/ravs-infants/confirm-not-recorded', function (req, res) {
    const data = req.session.data
    const index = Number(req.body.index)

    if (
      Number.isNaN(index) ||
      !data.vaccineJourney ||
      !data.vaccineJourney[index]
    ) {
      return res.redirect('/ravs-infants/concept-check')
    }

    const route = data.vaccineJourney[index]

    let vaccineName = null
    if (route.includes('concept-covid')) vaccineName = 'COVID-19'
    else if (route.includes('concept-flu')) vaccineName = 'Flu'
    else if (route.includes('concept-6in1')) vaccineName = '6-in-1'
    else if (route.includes('concept-bcg')) vaccineName = 'BCG'

    data.sessionVaccinations ??= []

    data.sessionVaccinations[index] = {
      vaccine: vaccineName,
      skipped: true
    }

    data.currentVaccineIndex += 1

    if (data.currentVaccineIndex < data.vaccineJourney.length) {
      return res.redirect(data.vaccineJourney[data.currentVaccineIndex])
    }

    return res.redirect('/ravs-infants/concept-check')
  })

  // not recorded confirmation page
  router.get('/ravs-infants/not-recorded', function (req, res) {
    const data = req.session.data
    const index = Number(req.query.index)

    if (
      Number.isNaN(index) ||
      !data.vaccineJourney ||
      !data.vaccineJourney[index]
    ) {
      return res.redirect('/ravs-infants/concept-check')
    }

    const route = data.vaccineJourney[index]

    let vaccineName = null
    if (route.includes('concept-covid')) vaccineName = 'COVID-19'
    else if (route.includes('concept-flu')) vaccineName = 'Flu'
    else if (route.includes('concept-6in1')) vaccineName = '6-in-1'
    else if (route.includes('concept-bcg')) vaccineName = 'BCG'

    if (!vaccineName) {
      return res.redirect('/ravs-infants/concept-check')
    }

    res.render('ravs-infants/not-recorded', {
      vaccineName,
      index
    })
  })

  // previous-vaccine
  router.get('/ravs-infants/previous-vaccine', function (req, res) {
    const data = req.session.data
    if (!data.vaccineJourney || typeof data.currentVaccineIndex !== 'number') {
      return res.redirect('/ravs-infants/concept-vaccine')
    }
    if (data.currentVaccineIndex === 0) {
      return res.redirect('/ravs-infants/concept-vaccine#zero-to-five-years')
    }
    data.currentVaccineIndex -= 1
    return res.redirect(
      data.vaccineJourney[data.currentVaccineIndex]
    )
  })

  // change-vaccine
  router.get('/ravs-infants/change-vaccine', function (req, res) {
    const data = req.session.data

    const index = Number(req.query.index)

    if (
      Number.isNaN(index) ||
      !data.vaccineJourney ||
      index < 0 ||
      index >= data.vaccineJourney.length
    ) {
      return res.redirect('/ravs-infants/concept-check')
    }

    data.currentVaccineIndex = index

    if (Array.isArray(data.sessionVaccinations)) {
      data.sessionVaccinations.splice(index, 1)
    }

    return res.redirect(
      data.vaccineJourney[index]
    )
  })

  // concept-check
  router.post('/ravs-infants/concept-check', function (req, res) {
    const data = req.session.data

    // Filter out skipped vaccinations
    data.recordedVaccinations = (data.sessionVaccinations || [])
      .filter(v => !v.skipped)

    return res.redirect('/ravs-infants/concept-done')
  })

  // concept-done
  router.post('/ravs-infants/concept-done', function (req, res) {
    const data = req.session.data

    if (data.nextStep === 'same-patient') {
      data.vaccineJourney = null
      data.currentVaccineIndex = null
      data.sessionVaccinations = []

      return res.redirect('/ravs-infants/concept-vaccine#zero-to-five-years')
    }

    // Force clear consent data
    delete data.sessionConsent
    delete data.consent
    delete data.consentParentName
    delete data.fluConsent
    delete data.fluConsentParentName
    delete data.COVIDConsent
    delete data.COVIDConsentParentName
    delete data.bcgConsent
    delete data.bcgConsentParentName

    return res.redirect('/ravs-infants/concept-do-you-have-the-patients-number')
  })

  // concept-eligibility-choose
  router.post('/ravs-infants/concept-eligibility-choose', function (req, res) {
    return res.redirect('concept-eligibility-check')
  })

  // concept-eligibility-check
  router.post('/ravs-infants/concept-eligibility-check', function (req, res) {
    const data = req.session.data
    const decision = data.confirmEligibility

    if (!decision) {
      return res.redirect('/ravs-infants/concept-eligibility-check?error=missing')
    } else if (decision === 'yes') {
      return res.redirect('concept-eligibility-done')
    } else if (decision === 'no') {
      return res.redirect('concept-eligibility-choose')
    } else if (decision === 'cancel') {
      return res.redirect('/ravs-infants/')
    } else {
      return res.redirect('concept-eligibility-done')
    }

  })

}