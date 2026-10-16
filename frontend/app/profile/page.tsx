import { useState } from "react";
import SideBar from "../components/sidebar/Sidebar";

export default function Profile() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    return (
        <main>
            <SideBar isOpen={isLoggedIn}></SideBar>
        </main>
    )
}
