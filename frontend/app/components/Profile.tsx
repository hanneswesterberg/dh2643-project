'use client'
import { UserProfileData } from "./userModel";


export default function UserProfile({profileProp}: {profileProp: UserProfileData}){
    return (
        <main>
            <h1>{profileProp.username}</h1>
            <p>This is the profile of {profileProp.name}.</p>
        </main>
    );
}

