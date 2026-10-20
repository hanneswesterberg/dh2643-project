'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSavedEvents, removeSavedEvent } from './Lib/userAPI';
import type { SavedEvent } from './userModel';
import { useSystemMessage } from './SystemMessageProvider';

type EventSortOrder = 'name' | 'date' | 'added';

export default function SavedEvents() {
  const [events, setEvents] = useState<SavedEvent[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [removingEventId, setRemovingEventId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<EventSortOrder>('name');
  const showSystemMessage = useSystemMessage();

  const sortedEvents = [...events].sort((first, second) => {
    let comparison = 0;
    if (sortOrder === 'name') {
      comparison = first.name.localeCompare(second.name, undefined, {
        sensitivity: 'base',
      });
    } else if (sortOrder === 'date') {
      comparison = Date.parse(first.start) - Date.parse(second.start);
    } else if (first.added_at === null && second.added_at === null) {
      comparison = 0;
    } else if (first.added_at === null) {
      comparison = 1;
    } else if (second.added_at === null) {
      comparison = -1;
    } else {
      comparison = Date.parse(second.added_at) - Date.parse(first.added_at);
    }
    return comparison || first.id - second.id;
  });

  useEffect(() => {
    let isCurrent = true;
    getSavedEvents()
      .then((savedEvents) => {
        if (isCurrent) setEvents(savedEvents);
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setLoadFailed(true);
          showSystemMessage(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load your saved events.',
            'error',
          );
        }
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [showSystemMessage]);

  async function removeEvent(eventId: number) {
    setRemovingEventId(eventId);
    try {
      await removeSavedEvent(eventId);
      setEvents((savedEvents) =>
        savedEvents.filter((event) => event.id !== eventId),
      );
      showSystemMessage('Event removed from your events.', 'success');
    } catch (removeError) {
      const message = removeError instanceof Error
        ? removeError.message
        : 'Could not remove this event.';
      showSystemMessage(message, 'error');
    } finally {
      setRemovingEventId(null);
    }
  }

  return (
    <section className="saved-events">
      <div className="saved-events__toolbar">
        <Link
          href="/"
          className="saved-events__back"
        >
          Go Back
        </Link>
        {!loading && events.length > 0 && (
          <div className="saved-events__sort">
            <label htmlFor="saved-events-sort" className="saved-events__sort-label">
              Sort by
            </label>
            <select
              id="saved-events-sort"
              value={sortOrder}
              onChange={(event) => {
                const value = event.currentTarget.value;
                if (value === 'name' || value === 'date' || value === 'added') {
                  setSortOrder(value);
                }
              }}
              className="saved-events__sort-select"
            >
              <option value="name">Name (A-Z)</option>
              <option value="date">Event date</option>
              <option value="added">Recently added</option>
            </select>
          </div>
        )}
      </div>
      {loading && <p role="status">Loading your events...</p>}
      {!loading && events.length === 0 && !loadFailed && (
        <p>You have not added any events yet.</p>
      )}
      <ul className="saved-events__list">
        {sortedEvents.map((event) => (
          <li
            key={event.id}
            className="saved-event-card"
          >
            <div className="saved-event-card__content">
              {event.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.image_url}
                  alt=""
                  width={133}
                  height={130}
                  className="saved-event-card__image"
                />
              )}
              <div className="saved-event-card__details">
                <h3 className="saved-event-card__name">{event.name}</h3>
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
            <div className="saved-event-actions">
              {event.ticket_url && (
                <a
                  href={event.ticket_url}
                  target="_blank"
                  rel="noreferrer"
                  className="saved-event-actions__action saved-event-actions__ticket-link"
                >
                  Get tickets
                </a>
              )}
              <button
                type="button"
                onClick={() => void removeEvent(event.id)}
                disabled={removingEventId === event.id}
                className="saved-event-actions__action saved-event-actions__remove-button"
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
