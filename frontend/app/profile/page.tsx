import UserProfile from "../components/Profile";
import {UserProfileData, getUserProfile} from "../components/userModel";

export default function Profile(){
    const userData : UserProfileData = getUserProfile();
    return (
        <main>
            <UserProfile profileProp={userData}></UserProfile>
        </main>
    );
}
