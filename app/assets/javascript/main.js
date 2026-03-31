// ES6 or Vanilla JavaScript

document.addEventListener('DOMContentLoaded', function () {
    // Functions
    initAutocompletes()
});

// Accessible Autocomplete
const initAutocompletes = () => {
    const allAutocompleteElements = document.querySelectorAll('[data-module="nhsuk-autocomplete"]')
    allAutocompleteElements.forEach(element => 
        accessibleAutocomplete.enhanceSelectElement({
            defaultValue: '',
            selectElement: element,
            inputClasses: element.classList
        })
    )
}

// Charting
(function () {
  if (typeof Chart === 'undefined') return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== NHS colour palette (WCAG-friendly starting points) =====
  // Order chosen for clear separation across multiple series.
  const NHS_COLOURS = [
    '#00A499', // Aqua Green
    '#FFB81C', // Yellow'
    '#AE2573', // Pink
    '#ED8B00', // Orange
    '#006747', // Dark Green
    '#330072', // Purple
    '#003087', // Dark Blue
    '#6B7F99', // Mid Grey-ish
    '#DA291C', // Emergency Red
    '#007F7F', // Teal
    '#005EB8', // NHS Blue
    '#0072CE'  // Bright Blue
  ];

  // Slight alpha for bar fills so stacks remain readable
  const withAlpha = (hex, alpha = 0.25) => {
    // hex → rgba(r,g,b,alpha)
    const h = hex.replace('#', '');
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // ===== Parse table into datasets =====
  // First column = labels (<th scope="row">). Remaining columns = series.
  // Optional: <thead><th data-stack="Group"> and/or data-color="#RRGGBB"
  function parseTable(table) {
    const headCells = Array.from(table.querySelectorAll('thead th'));
    if (headCells.length < 2) return null;

    const seriesHeaders = headCells.slice(1);
    const seriesMeta = seriesHeaders.map(th => ({
      label: th.textContent.trim(),
      stack: th.getAttribute('data-stack') || null,
      color: th.getAttribute('data-color') || null
    }));

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const labels = [];
    const columns = seriesHeaders.map(() => []);

    rows.forEach(tr => {
      const labelCell = tr.querySelector('th');
      labels.push(labelCell ? labelCell.textContent.trim() : '');

      const dataCells = Array.from(tr.querySelectorAll('td'));
      seriesHeaders.forEach((_, i) => {
        const raw = (dataCells[i] ? dataCells[i].textContent : '').replace(/,/g, '').trim();
        const val = raw === '' ? null : Number(raw);
        columns[i].push(isNaN(val) ? null : val);
      });
    });

    const datasets = seriesMeta.map((meta, i) => ({
      label: meta.label,
      data: columns[i],
      tension: 0.3,         // line smoothing
      pointRadius: 3,
      spanGaps: true,
      ...(meta.stack ? { stack: meta.stack } : {}),
      // placeholder; colours applied later
      _preferredColor: meta.color
    }));

    return { labels, datasets, seriesMeta };
  }

  // ===== Apply palette (canvas data-attribute or header overrides) =====
  function applyPalette(datasets, type, canvas) {
    const paletteName = (canvas.getAttribute('data-palette') || 'nhs').toLowerCase();
    const useNHS = paletteName === 'nhs';

    datasets.forEach((ds, i) => {
      const base = ds._preferredColor || (useNHS ? NHS_COLOURS[i % NHS_COLOURS.length] : null);

      if (type === 'line') {
        const stroke = base || ds.borderColor || '#666';
        ds.borderColor = stroke;
        ds.backgroundColor = 'transparent';
        ds.pointBorderColor = stroke;
        ds.pointBackgroundColor = stroke;
        ds.borderWidth = 2;
      } else if (type === 'bar') {
        const stroke = base || ds.borderColor || '#666';
        ds.borderColor = stroke;
        ds.backgroundColor = withAlpha(stroke, 0.25);
        ds.borderWidth = 1;
      }
    });
  }

  function createChart(canvas, type, data, extraOptions = {}) {
    const ctx = canvas.getContext('2d');

    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: prefersReduced ? false : { duration: 600 },
      plugins: {
        legend: { display: true, labels: { usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: (item) => {
              const val = (item.parsed && typeof item.parsed.y !== 'undefined')
                ? item.parsed.y
                : item.parsed;
              return `${item.dataset.label}: ${Number(val).toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => Number(v).toLocaleString() },
          title: { display: false, text: '' }
        },
        x: {
          title: { display: false, text: '' }
        }
      }
    };

    return new Chart(ctx, {
      type,
      data,
      options: merge(baseOptions, extraOptions)
    });
  }

  // Tiny deep merge helper
  function merge(target, source) {
    const out = { ...target };
    for (const [k, v] of Object.entries(source || {})) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        out[k] = merge(target[k] || {}, v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  // ===== Initialise all charts =====
  document.querySelectorAll('canvas[data-chart]').forEach(canvas => {
    const type = canvas.getAttribute('data-chart'); // "line" | "bar"
    const sourceSel = canvas.getAttribute('data-source');
    const table = sourceSel ? document.querySelector(sourceSel) : null;
    if (!table) return;

    const parsed = parseTable(table);
    if (!parsed) return;

    const xTitle = canvas.getAttribute('data-x-title') || '';
    const yTitle = canvas.getAttribute('data-y-title') || '';
    const stacked = canvas.getAttribute('data-stacked') === 'true';

    // Legend position logic:
    const explicitLegend = canvas.getAttribute('data-legend-position');
    const legendPosition =
      explicitLegend ||
      ((type === 'bar' && stacked) ? 'bottom' : 'top');

    const legendWrap = canvas.getAttribute('data-legend-wrap') === 'true';

    // Apply palette colours before creating the chart
    applyPalette(parsed.datasets, type, canvas);

    const stackedBarOptions = (type === 'bar' && stacked) ? {
      scales: {
        x: { stacked: true, title: { display: !!xTitle, text: xTitle } },
        y: { stacked: true, beginAtZero: true, title: { display: !!yTitle, text: yTitle } }
      },
      datasets: { bar: { borderWidth: 1 } }
    } : {};

    const lineOptions = (type === 'line') ? {
      elements: { line: { fill: false } },
      scales: {
        x: { title: { display: !!xTitle, text: xTitle } },
        y: { title: { display: !!yTitle, text: yTitle } }
      }
    } : {};

    const legendOptions = {
      plugins: {
        legend: {
          position: legendPosition,
          align: (legendWrap && legendPosition === 'bottom') ? 'center' : 'start',
          labels: {
            usePointStyle: true,
            ...(legendWrap ? {
              boxWidth: 10,
              padding: 15,
              maxWidth: 200
            } : {})
          }
        }
      }
    };

    createChart(canvas, type, parsed, merge(
      lineOptions,
      stackedBarOptions,
      legendOptions
    ));
  });
})();
