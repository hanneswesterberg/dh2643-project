import UserProfile from "../components/Profile";
import { getUserProfile } from "../components/userModel";

export default function Profile() {
    const userData = getUserProfile();
    return (
        <main>
            <UserProfile profileProp={userData} />
        </main>
    );
}
