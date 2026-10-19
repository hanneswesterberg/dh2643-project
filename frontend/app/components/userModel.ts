
export type UserProfileData = {
    username: string;
    display_name: string;
    email: string;
    profile_picture: string;
    profile_picture_original: string;
    bio: string;
};

export type SavedEvent = {
    id: number;
    tickster_id: string;
    name: string;
    start: string;
    end: string | null;
    ticket_url: string;
    image_url: string;
    venue_name: string;
    artists: { id: number; name: string }[];
    genre: string;
};
