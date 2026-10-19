'use client';

import { useEffect, useState } from 'react';
import { getSavedEvents, removeSavedEvent } from './Lib/userAPI';
import type { SavedEvent } from './userModel';

export default function SavedEvents() {
  const [events, setEvents] = useState<SavedEvent[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [removingEventId, setRemovingEventId] = useState<number | null>(null);

  useEffect(() => {
    let isCurrent = true;
    getSavedEvents()
      .then((savedEvents) => {
        if (isCurrent) setEvents(savedEvents);
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load your saved events.',
          );
        }
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  async function removeEvent(eventId: number) {
    setError('');
    setRemovingEventId(eventId);
    try {
      await removeSavedEvent(eventId);
      setEvents((savedEvents) =>
        savedEvents.filter((event) => event.id !== eventId),
      );
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'Could not remove this event.',
      );
    } finally {
      setRemovingEventId(null);
    }
  }

  return (
    <section className="mx-auto mt-8 w-full max-w-3xl px-6 pb-10">
      {loading && <p role="status">Loading your events...</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && events.length === 0 && !error && (
        <p>You have not added any events yet.</p>
      )}
      <ul className="space-y-3">
        {events.map((event) => (
          <li
            key={event.id}
            className="saved-event-card flex flex-wrap items-center justify-between gap-4 rounded border border-gray-300 p-4 dark:border-gray-600"
          >
            <div className="flex min-w-0 items-center gap-3">
              {event.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.image_url}
                  alt=""
                  width={133}
                  height={130}
                  className="shrink-0 rounded object-cover"
                  style={{ width: '133px', height: '130px', minWidth: '133px' }}
                />
              )}
              <div className="min-w-0">
                <h3 className="font-semibold">{event.name}</h3>
                <p>
                  Artist:{' '}
                  {event.artists.length > 0
                    ? event.artists.map((artist) => artist.name).join(', ')
                    : 'Unavailable'}
                </p>
                <p>Venue: {event.venue_name || 'Unavailable'}</p>
                <p>Starts: {new Date(event.start).toLocaleString()}</p>
              </div>
            </div>
            <div className="saved-event-actions flex shrink-0 flex-col items-stretch gap-2">
              {event.ticket_url && (
                <a
                  href={event.ticket_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded bg-blue-600 px-4 py-2 text-center font-semibold text-white hover:bg-blue-700"
                >
                  Get tickets
                </a>
              )}
              <button
                type="button"
                onClick={() => void removeEvent(event.id)}
                disabled={removingEventId === event.id}
                className="event-remove-button rounded border border-red-600 bg-transparent px-3 py-2 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                {removingEventId === event.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
