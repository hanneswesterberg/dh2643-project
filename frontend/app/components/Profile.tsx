import Image from "next/image";
import type { UserProfileData } from "./userModel";
import router from "next/router";


export default function UserProfile({ profileProp }: { profileProp: UserProfileData }) {
    return (
        <section>
            <img
                src="/Kennhed.JPG"
                alt="Profile picture"
                width={200}
                height={200}
                className="img_round"
            />
            <h1>{profileProp.username}</h1>
            <p>This is the profile of {profileProp.name}.</p>
            <div>
                <button onClick={() => router.push('/profile')}>

                </button>
            </div>
        </section>
    );
}
