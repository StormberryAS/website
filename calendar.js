const calendarLocations = {
  "2026-04-24": "London",
  "2026-04-27": "Birmingham",
  "2026-05-05": "<a href=\"https://havexpo.no/\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color: inherit; text-decoration: underline;\">HavExpo, Bergen</a>",
  "2026-05-06": "<a href=\"https://havexpo.no/\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color: inherit; text-decoration: underline;\">HavExpo, Bergen</a>",
  "2026-05-07": "<a href=\"https://havexpo.no/\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color: inherit; text-decoration: underline;\">HavExpo, Bergen</a>",
  "2026-05-08": "Edinburgh",
  "2026-05-11": "Glasgow",
  "2026-05-15": "Cardiff",
  "2026-05-18": "Newport",
  "2026-05-22": "Belfast",
  "2026-05-25": "Dublin",
  "2026-05-29": "Paris"
};

// Portugal tour: 14-27 July, all days carry the city list
for (let d = 14; d <= 27; d++) {
  const dateStr = `2026-07-${String(d).padStart(2, '0')}`;
  calendarLocations[dateStr] = "Lisbon, Porto, Braga, Coimbra, Faro";
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('calendar-container');
  if (!container) return;

  const months = [
    { year: 2026, month: 3, name: "April" },
    { year: 2026, month: 4, name: "May" },
    { year: 2026, month: 5, name: "June" },
    { year: 2026, month: 6, name: "July" },
    { year: 2026, month: 7, name: "August" },
    { year: 2026, month: 8, name: "September" },
    { year: 2026, month: 9, name: "October" },
    { year: 2026, month: 10, name: "November" },
    { year: 2026, month: 11, name: "December" }
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let currentIndex = 1; // Default to May 2026

  function renderMonth(index) {
    const m = months[index];
    let html = `<div class="month-wrapper">
      <div class="calendar-controls" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <button id="prev-month" class="btn btn-outline" style="padding: 0.5rem 1rem; opacity: ${index === 0 ? '0.5' : '1'}; pointer-events: ${index === 0 ? 'none' : 'auto'};">&larr; Prev</button>
        <h3 class="month-title" style="margin-bottom: 0; line-height: 1.2;">
          <span style="display: block;">${m.name}</span>
          <span style="display: block; font-size: 0.85em; opacity: 0.9;">${m.year}</span>
        </h3>
        <button id="next-month" class="btn btn-outline" style="padding: 0.5rem 1rem; opacity: ${index === months.length - 1 ? '0.5' : '1'}; pointer-events: ${index === months.length - 1 ? 'none' : 'auto'};">Next &rarr;</button>
      </div>
      <div class="calendar-grid">`;

    daysOfWeek.forEach(day => {
      html += `<div class="day-header">${day}</div>`;
    });

    const firstDay = new Date(m.year, m.month, 1).getDay();
    const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      html += `<div class="day-cell empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(m.year, m.month, day);
      const dayOfWeek = date.getDay();
      const dateString = `${m.year}-${String(m.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Availability rules (effective 2026-05-28):
      //   Green window 1: 2026-06-01 to 2026-07-31, Mon-Sat green, Sun red.
      //   Vacation buffer: 2026-08-01 to 2026-08-02 always red.
      //   Green window 2: 2026-08-03 to 2026-12-19, Mon-Sat green, Sun red.
      //   May 2026: all days red, but city text still shown.
      //   Everything outside those windows: red.
      let isUnavailable;
      const inGreenWindow1 = dateString >= "2026-06-01" && dateString <= "2026-07-31";
      const inGreenWindow2 = dateString >= "2026-08-03" && dateString <= "2026-12-19";
      if (inGreenWindow1 || inGreenWindow2) {
        isUnavailable = (dayOfWeek === 0);
      } else {
        isUnavailable = true;
      }

      // City text shows whenever the data has an entry, regardless of red/green.
      const loc = calendarLocations[dateString] || "";

      const classes = ['day-cell'];
      classes.push(isUnavailable ? 'unavailable' : 'available');
      // has-location adds a green background overlay, so only apply it on available days.
      // Unavailable days still display the city text, but the cell stays red.
      if (loc && !isUnavailable) classes.push('has-location');

      const locText = loc ? loc.replace(/<[^>]*>?/gm, '') : '';
      html += `<div class="${classes.join(' ')}" ${locText ? `title="${locText.replace(/"/g, '&quot;')}"` : ''}>
        <div class="day-number">${day}</div>
        <div class="day-location">${loc}</div>
      </div>`;
    }

    html += `</div></div>`;
    container.innerHTML = html;

    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
          currentIndex--;
          renderMonth(currentIndex);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentIndex < months.length - 1) {
          currentIndex++;
          renderMonth(currentIndex);
        }
      });
    }
  }

  renderMonth(currentIndex);
});
