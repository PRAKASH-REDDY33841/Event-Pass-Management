/**
 * Helper to generate and download an iCalendar (.ics) file for an event
 */
export function downloadCalendarEvent(event, ticket) {
  if (!event) return;

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const start = formatDate(event.start_date);
  const end = formatDate(event.end_date);
  const title = event.title;
  const description = `${event.description || ''}\\n\\nTicket Code: ${ticket ? ticket.ticket_code : 'N/A'}\\nAttendee: ${ticket ? ticket.attendee_name : 'Guest'}\\nVenue: ${event.venue_name}, ${event.location}`;
  const location = `${event.venue_name}, ${event.location}`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventPass Ticketing//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:eventpass-${event.id}-${Date.now()}@eventpass.local`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.slug || 'event'}-ticket.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
