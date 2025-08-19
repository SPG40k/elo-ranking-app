import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { Link } from 'react-router-dom';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matchType, setMatchType] = useState('All');
  const [eventType, setEventType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(25);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      setError(null);
      try {
        // Fetch both CSVs in parallel
        const [singlesRes, teamsRes] = await Promise.all([
          fetch(process.env.PUBLIC_URL + '/singles_matches.csv'),
          fetch(process.env.PUBLIC_URL + '/teams_matches.csv'),
        ]);
        const [singlesText, teamsText] = await Promise.all([
          singlesRes.text(),
          teamsRes.text(),
        ]);
        const singlesParsed = Papa.parse(singlesText, { header: true, skipEmptyLines: true });
        const teamsParsed = Papa.parse(teamsText, { header: true, skipEmptyLines: true });
        // Combine all matches
        const allMatches = [...singlesParsed.data, ...teamsParsed.data];
        // Group matches by event (date + name)
        const eventMap = new Map();
        for (const row of allMatches) {
          const date = row.date;
          const name = row.eventName;
          if (!date || !name) continue;
          const key = date + '|' + name;
          if (!eventMap.has(key)) eventMap.set(key, []);
          eventMap.get(key).push(row);
        }
        const uniqueEvents = [];
        for (const [key, matches] of eventMap.entries()) {
          const [date, name] = key.split('|');
          // Determine match type: all games have score1+score2==20 => Teams, else Singles
          let isTeams = true;
          for (const match of matches) {
            const s1 = Number(match.score1);
            const s2 = Number(match.score2);
            if (s1 + s2 !== 20) {
              isTeams = false;
              break;
            }
          }
          // Determine event type by number of rounds (unique gameNumbers)
          const roundSet = new Set(matches.map(m => m.gameNumber));
          const numRounds = roundSet.size;
          let eventType = '';
          if (numRounds >= 1 && numRounds <= 3) eventType = 'RTT';
          else if (numRounds >= 4 && numRounds <= 5) eventType = 'GT';
          else if (numRounds >= 6) eventType = 'Super Major';
          uniqueEvents.push({ date, name, matchType: isTeams ? 'Teams' : 'Singles', eventType });
        }
        // Sort by date descending (newest first)
        uniqueEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
        setEvents(uniqueEvents);
      } catch (e) {
        setError('Failed to load events.');
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function getDayMonth(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  }
  function getYear(dateStr) {
    const d = new Date(dateStr);
    return d.getFullYear();
  }

  function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  function dateToDDMMYY(dateStr) {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}${mm}${yy}`;
  }

  // Helper to get event type from event object
  function getEventType(event) {
    return event.eventType || '';
  }

  // Filter events based on selected filters
  const filteredEvents = events.filter(event => {
    const et = getEventType(event);
    const matchTypeOk = matchType === 'All' || event.matchType === matchType;
    const eventTypeOk = eventType === 'All' || et === eventType;
    const nameMatch = event.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchTypeOk && eventTypeOk && nameMatch;
  });
  const visibleEvents = filteredEvents.slice(0, visibleCount);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-indigo-700 dark:text-indigo-200 mb-4">Events</h1>
      {/* Event name search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search events by name..."
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            setVisibleCount(25);
          }}
          className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Match Type</label>
          <select
            className="rounded border-gray-300 dark:bg-gray-800 dark:text-gray-100 px-2 py-1"
            value={matchType}
            onChange={e => setMatchType(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Singles">Singles</option>
            <option value="Teams">Teams</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Event Type</label>
          <select
            className="rounded border-gray-300 dark:bg-gray-800 dark:text-gray-100 px-2 py-1"
            value={eventType}
            onChange={e => setEventType(e.target.value)}
          >
            <option value="All">All</option>
            <option value="RTT">RTT</option>
            <option value="GT">GT</option>
            <option value="Super Major">Super Major</option>
          </select>
        </div>
      </div>
      {loading ? (
        <div className="text-gray-600 dark:text-gray-300">Loading events...</div>
      ) : error ? (
        <div className="text-red-600 dark:text-red-400">{error}</div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-gray-600 dark:text-gray-300">No events found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white dark:bg-gray-900 shadow rounded-xl overflow-hidden">
            <thead className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
              <tr>
                <th className="text-left px-4 py-2">Event Name</th>
                <th className="text-left px-4 py-2" colSpan="2">Date</th>
              </tr>
            </thead>
            <tbody>
              {visibleEvents.map((event) => (
                <tr key={event.date + event.name} className="border-t border-gray-200 dark:border-gray-700 hover:opacity-90 transition">
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                    {(() => {
                      const slug = slugify(event.name);
                      const datePart = dateToDDMMYY(event.date);
                      const to = `/events/${slug}/${datePart}`;
                      return (
                        <Link to={to} className="text-indigo-700 dark:text-indigo-300 hover:underline">
                          {event.name}
                        </Link>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{getDayMonth(event.date)}</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{getYear(event.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
         {/* Show More / Show All buttons */}
         {filteredEvents.length > visibleEvents.length && (
           <div className="flex gap-4 justify-center mt-6">
             <button
               onClick={() => setVisibleCount(c => Math.min(c + 10, filteredEvents.length))}
               className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
             >
               Show More
             </button>
             {visibleCount + 10 < filteredEvents.length && (
               <button
                 onClick={() => setVisibleCount(filteredEvents.length)}
                 className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
               >
                 Show All
               </button>
             )}
           </div>
         )}
        </div>
      )}
    </div>
  );
} 