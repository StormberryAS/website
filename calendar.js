const calendarLocations = {
  "2026-04-24": "London, GBR",
  "2026-04-27": "Birmingham, GBR",
  "2026-05-08": "Edinburgh, GBR",
  "2026-05-11": "Glasgow, GBR",
  "2026-05-15": "Cardiff, GBR",
  "2026-05-18": "Newport, GBR",
  "2026-05-22": "Belfast, GBR",
  "2026-05-25": "Dublin, IRL",
  "2026-05-29": "Paris, FRA",
  "2026-06-01": "Toulouse, FRA",
  "2026-06-05": "Frankfurt, DEU",
  "2026-06-08": "Munich, DEU",
  "2026-06-12": "Brussels, BEL",
  "2026-06-15": "Antwerp, BEL",
  "2026-06-19": "Amsterdam, NLD",
  "2026-06-22": "Rotterdam, NLD",
  "2026-06-26": "Zurich, CHE",
  "2026-06-29": "Vienna, AUT",
  "2026-07-03": "Helsinki, FIN",
  "2026-07-06": "Copenhagen, DNK",
  "2026-09-04": "Madrid, ESP",
  "2026-09-07": "Barcelona, ESP",
  "2026-09-11": "Milan, ITA",
  "2026-09-14": "Rome, ITA",
  "2026-09-18": "Athens, GRC",
  "2026-09-25": "Warsaw, POL",
  "2026-09-28": "Prague, CZE",
  "2026-10-02": "Vilnius, LTU",
  "2026-10-05": "Riga, LVA",
  "2026-10-09": "Tallinn, EST"
};

// Portugal Tour explicitly populating remaining days 14-27 Jul
for (let d = 14; d <= 27; d++) {
  const dateStr = `2026-07-${String(d).padStart(2, '0')}`;
  calendarLocations[dateStr] = "Lisbon, Porto, Braga, Coimbra, Faro, PRT";
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

  let currentIndex = 0;

  function renderMonth(index) {
    const m = months[index];
    let html = `<div class="month-wrapper">
      <div class="calendar-controls" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <button id="prev-month" class="btn btn-outline" style="padding: 0.5rem 1rem; opacity: ${index === 0 ? '0.5' : '1'}; pointer-events: ${index === 0 ? 'none' : 'auto'};">&larr; Prev</button>
        <h3 class="month-title" style="margin-bottom: 0;">${m.name} ${m.year}</h3>
        <button id="next-month" class="btn btn-outline" style="padding: 0.5rem 1rem; opacity: ${index === months.length - 1 ? '0.5' : '1'}; pointer-events: ${index === months.length - 1 ? 'none' : 'auto'};">Next &rarr;</button>
      </div>
      <div class="calendar-grid">`;
    
    // Headers
    daysOfWeek.forEach(day => {
      html += `<div class="day-header">${day}</div>`;
    });

    const firstDay = new Date(m.year, m.month, 1).getDay();
    const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();

    // Empty cells for alignment
    for (let i = 0; i < firstDay; i++) {
      html += `<div class="day-cell empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(m.year, m.month, day);
      const dayOfWeek = date.getDay();
      const dateString = `${m.year}-${String(m.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      let isPortugalTour = (dateString >= "2026-07-14" && dateString <= "2026-07-27");
      
      let isUnavailable = false;
      const explicitGreenDates = [
        "2026-05-12", "2026-05-13", "2026-05-14",
        "2026-12-08", "2026-12-09", "2026-12-10",
        "2026-12-14", "2026-12-15", "2026-12-16",
        "2026-12-17", "2026-12-18", "2026-12-19"
      ];
      
      if (explicitGreenDates.includes(dateString)) {
         isUnavailable = false;
      } else if (dateString < "2026-04-23" || dateString === "2026-05-01" || dateString === "2026-05-02" || dateString > "2026-12-17") {
         isUnavailable = true;
      } else if (dateString >= "2026-08-01" && dateString <= "2026-08-18") {
         isUnavailable = true;
      } else if (dateString >= "2026-08-19" && dateString <= "2026-08-31") {
         isUnavailable = (dayOfWeek !== 1 && dayOfWeek !== 5); // Exclusively Mondays and Fridays are green in August>18
      } else if (isPortugalTour) {
         isUnavailable = (dayOfWeek === 0);
      } else {
         isUnavailable = (dayOfWeek === 0 || dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4);
      }
      
      let loc = '';
      if (!isUnavailable) {
        loc = calendarLocations[dateString] || "";
      }

      let classes = ['day-cell'];
      if (isUnavailable) {
        classes.push('unavailable');
      } else {
        classes.push('available');
        if (loc) {
          classes.push('has-location');
        }
      }

      html += `<div class="${classes.join(' ')}" ${loc ? `title="${loc}"` : ''}>
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

  // Initialize
  renderMonth(currentIndex);
});
