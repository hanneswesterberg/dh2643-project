'use client'
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfileData } from "./userModel";
import { checkUsernameAvailability, deleteAccount, loadProfile, updatePassword, updateProfile} from "./Lib/userAPI"
import { useSystemMessage } from "./SystemMessageProvider";

type BioFormat = "bold" | "italic" | "underline";
type UsernameCheckState = "idle" | "checking" | "available" | "taken";
type CropImageDimensions = {
    width: number;
    height: number;
    scale: number;
    viewSize: number;
};

export default function UserProfile() {
    const router = useRouter();
    const showSystemMessage = useSystemMessage();
    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [savedProfile, setSavedProfile] = useState<Pick<UserProfileData, "username" | "display_name" | "email" | "bio"> | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [passwordChangeEnabled, setPasswordChangeEnabled] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [maskedPasswordLength, setMaskedPasswordLength] = useState(8);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [usernameCheckState, setUsernameCheckState] = useState<UsernameCheckState>("idle");
    const [pictureFile, setPictureFile] = useState<File | null>(null);
    const [originalPictureFile, setOriginalPictureFile] = useState<File | null>(null);
    const [picturePreviewUrl, setPicturePreviewUrl] = useState<string | null>(null);
    const pictureInput = useRef<HTMLInputElement>(null);
    const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
    const [choosingNewPicture, setChoosingNewPicture] = useState(false);
    const [isPictureDragOver, setIsPictureDragOver] = useState(false);
    const [cropSourceName, setCropSourceName] = useState("");
    const [cropImageDimensions, setCropImageDimensions] =
        useState<CropImageDimensions | null>(null);
    const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
    const [cropZoom, setCropZoom] = useState(1);
    const [bioLength, setBioLength] = useState(0);
    const [activeFormats, setActiveFormats] = useState<Record<BioFormat, boolean>>({
        bold: false,
        italic: false,
        underline: false,
    });
    const bioEditor = useRef<HTMLDivElement>(null);
    const cropViewport = useRef<HTMLDivElement>(null);
    const cropImageElement = useRef<HTMLImageElement>(null);
    const cropDrag = useRef<{
        pointerId: number;
        pointerX: number;
        pointerY: number;
        imageX: number;
        imageY: number;
    } | null>(null);
    const previousPictureSelection = useRef<{
        file: File | null;
        previewUrl: string | null;
        originalFile: File | null;
    } | null>(null);
    const cropOriginalFile = useRef<File | null>(null);
    const hasChanges = Boolean(
        profile &&
        savedProfile &&
        (
            profile.username !== savedProfile.username ||
            profile.display_name !== savedProfile.display_name ||
            profile.email !== savedProfile.email ||
            profile.bio !== savedProfile.bio ||
            pictureFile
        ),
    );
    const usernameForCheck = profile?.username.trim() ?? "";
    const savedUsername = savedProfile?.username ?? null;

    useEffect(() => {
        if (!usernameForCheck || savedUsername === null || usernameForCheck === savedUsername) return;

        const controller = new AbortController();
        const timeout = window.setTimeout(() => {
            checkUsernameAvailability(usernameForCheck, controller.signal)
                .then((available) => {
                    setUsernameCheckState(available ? "available" : "taken");
                })
                .catch((checkError: unknown) => {
                    if (controller.signal.aborted) return;
                    setUsernameCheckState("idle");
                    showSystemMessage(
                        checkError instanceof Error
                            ? checkError.message
                            : "Could not check username availability.",
                        "error",
                    );
                });
        }, 300);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [usernameForCheck, savedUsername, showSystemMessage]);

    useEffect(() => {
        if (!cropSourceUrl) return;
        return () => URL.revokeObjectURL(cropSourceUrl);
    }, [cropSourceUrl]);

    useEffect(() => {
        if (!picturePreviewUrl) return;
        return () => URL.revokeObjectURL(picturePreviewUrl);
    }, [picturePreviewUrl]);

    useEffect(() => {
        async function load() {
            try {
                const response = await loadProfile()
                setProfile(response);
                setSavedProfile({
                    username: response.username,
                    display_name: response.display_name ?? "",
                    email: response.email,
                    bio: response.bio,
                });
            } catch (loadError) {
                showSystemMessage(
                    loadError instanceof Error ? loadError.message : "Could not load your profile.",
                    "error",
                );
            }
        }
        void load();
    }, [showSystemMessage]);

    useEffect(() => {
        if (bioEditor.current && bioEditor.current.innerHTML !== profile?.bio) {
            bioEditor.current.innerHTML = profile?.bio ?? "";
            setBioLength(bioEditor.current.innerText.length);
        }
    }, [profile?.bio]);

    useEffect(() => {
        function updateActiveFormats() {
            const editor = bioEditor.current;
            const selection = window.getSelection();
            if (!editor || !selection?.anchorNode || !editor.contains(selection.anchorNode)) {
                return;
            }

            setActiveFormats({
                bold: document.queryCommandState("bold"),
                italic: document.queryCommandState("italic"),
                underline: document.queryCommandState("underline"),
            });
        }

        document.addEventListener("selectionchange", updateActiveFormats);
        return () => document.removeEventListener("selectionchange", updateActiveFormats);
    }, []);

    async function saveProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!profile) return;

        setSaving(true);
        try {
            const data = await updateProfile(
                profile.username,
                profile.display_name,
                profile.email,
                pictureFile,
                originalPictureFile,
                profile.bio,
            )
            const updatedProfile = data as UserProfileData;
            setProfile(updatedProfile);
            setSavedProfile({
                username: updatedProfile.username,
                display_name: updatedProfile.display_name ?? "",
                email: updatedProfile.email,
                bio: updatedProfile.bio,
            });
            setUsernameCheckState("idle");
            setPictureFile(null);
            setOriginalPictureFile(null);
            setPicturePreviewUrl(null);
            setPasswordChangeEnabled(false);
            setNewPassword("");
            if (pictureInput.current) pictureInput.current.value = "";
            showSystemMessage("Profile updated.", "success");
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Could not save your profile.";
            showSystemMessage(message, "error");
        } finally {
            setSaving(false);
        }
    }

    function updateField(field: keyof UserProfileData, value: string) {
        if (field === "username") {
            const trimmedUsername = value.trim();
            setUsernameCheckState(
                trimmedUsername && trimmedUsername !== savedUsername ? "checking" : "idle",
            );
        }

        setProfile((current) => current ? { ...current, [field]: value } : current);
    }

    function togglePasswordChange() {
        setPasswordChangeEnabled((enabled) => !enabled);
        setNewPassword("");
        setConfirmNewPassword("");
    }

    async function savePassword() {
        if (!newPassword || newPassword !== confirmNewPassword) {
            showSystemMessage("Passwords do not match.", "error");
            return;
        }

        setPasswordSaving(true);
        try {
            await updatePassword(newPassword);
            setMaskedPasswordLength(newPassword.length);
            setPasswordChangeEnabled(false);
            setNewPassword("");
            setConfirmNewPassword("");
            showSystemMessage("Password updated.", "success");
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Could not update your password.";
            showSystemMessage(message, "error");
        } finally {
            setPasswordSaving(false);
        }
    }

    async function handleDeleteAccount() {
        if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            return;
        }

        setDeletingAccount(true);
        try {
            await deleteAccount();
            showSystemMessage("Account deleted.", "success");
            router.replace("/");
        } catch (deleteError) {
            const message = deleteError instanceof Error
                ? deleteError.message
                : "Could not delete your account.";
            showSystemMessage(message, "error");
        } finally {
            setDeletingAccount(false);
        }
    }

    function updateBioFromEditor() {
        const editor = bioEditor.current;
        if (editor) {
            updateField("bio", editor.innerHTML);
            setBioLength(editor.innerText.length);
        }
    }

    function formatBio(command: BioFormat) {
        bioEditor.current?.focus();
        document.execCommand(command, false);
        updateBioFromEditor();
        setActiveFormats({
            bold: document.queryCommandState("bold"),
            italic: document.queryCommandState("italic"),
            underline: document.queryCommandState("underline"),
        });
    }

    function formatButtonClass(command: BioFormat, textStyle: string) {
        return `cursor-pointer rounded border px-2 py-1 ${textStyle} ${
            activeFormats[command]
                ? "border-gray-600 bg-gray-300 text-gray-950 shadow-inner"
                : "border-gray-300 bg-white hover:bg-gray-100"
        }`;
    }

    function startCrop(file: File, preserveCurrentSelection = false) {
        if (file.size > 2 * 1024 * 1024) {
            showSystemMessage("Profile pictures must be 2 MB or smaller.", "error");
            return;
        }
        if (
            !["image/png", "image/jpeg"].includes(file.type) &&
            !/\.(png|jpe?g)$/i.test(file.name)
        ) {
            showSystemMessage("Choose a PNG or JPEG image.", "error");
            return;
        }

        previousPictureSelection.current = {
            file: preserveCurrentSelection ? pictureFile : null,
            previewUrl: preserveCurrentSelection ? picturePreviewUrl : null,
            originalFile: preserveCurrentSelection ? originalPictureFile : null,
        };
        cropOriginalFile.current = file;
        if (!preserveCurrentSelection) {
            setPictureFile(null);
            setPicturePreviewUrl(null);
        }
        setCropImageDimensions(null);
        setChoosingNewPicture(false);
        setCropPosition({ x: 0, y: 0 });
        setCropZoom(1);
        setCropSourceName(file.name);
        setCropSourceUrl(URL.createObjectURL(file));
    }

    function handlePictureSelection(file: File | null, input: HTMLInputElement) {
        if (!file) return;
        previousPictureSelection.current = null;
        startCrop(file);
        if (file.size > 2 * 1024 * 1024 ||
            (!["image/png", "image/jpeg"].includes(file.type) &&
                !/\.(png|jpe?g)$/i.test(file.name))) {
            input.value = "";
        }
    }

    function chooseNewPicture() {
        if (pictureInput.current) {
            pictureInput.current.value = "";
            setCropImageDimensions(null);
            setChoosingNewPicture(true);
        }
    }

    function handlePictureDrop(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setIsPictureDragOver(false);
        const file = event.dataTransfer.files[0];
        if (!file || !pictureInput.current) return;
        handlePictureSelection(file, pictureInput.current);
    }

    async function openExistingPictureCrop() {
        if (originalPictureFile) {
            startCrop(originalPictureFile, true);
            return;
        }
        if (!profile?.profile_picture) {
            pictureInput.current?.click();
            return;
        }

        try {
            const imageUrl = new URL(
                profile.profile_picture_original || profile.profile_picture,
                window.location.origin,
            );
            const response = await fetch(imageUrl, { credentials: "include" });
            if (!response.ok) {
                throw new Error("Could not load your current profile picture. Choose the image again to recrop it.");
            }

            const blob = await response.blob();
            const contentType = blob.type || response.headers.get("Content-Type") || "";
            if (!["image/png", "image/jpeg"].includes(contentType.split(";")[0])) {
                throw new Error("The current profile picture cannot be recropped. Choose a PNG or JPEG image.");
            }

            const fileName = imageUrl.pathname.split("/").pop() || "profile-picture";
            const extension = contentType.includes("png") ? ".png" : ".jpg";
            const file = new File([blob], /\.[^.]+$/.test(fileName)
                ? fileName
                : `${fileName}${extension}`, { type: contentType });
            startCrop(file, true);
        } catch (cropError) {
            showSystemMessage(
                cropError instanceof Error
                    ? cropError.message
                    : "Could not load your current profile picture for cropping.",
                "error",
            );
        }
    }

    function initializeCrop(event: React.SyntheticEvent<HTMLImageElement>) {
        const image = event.currentTarget;
        const viewSize = cropViewport.current?.clientWidth ?? 320;
        const scale = Math.max(
            viewSize / image.naturalWidth,
            viewSize / image.naturalHeight,
        );
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;

        setCropImageDimensions({
            width: image.naturalWidth,
            height: image.naturalHeight,
            scale,
            viewSize,
        });
        setCropPosition({
            x: (viewSize - width) / 2,
            y: (viewSize - height) / 2,
        });
    }

    function moveCropImage(event: React.PointerEvent<HTMLDivElement>) {
        const drag = cropDrag.current;
        if (!drag || drag.pointerId !== event.pointerId || !cropImageDimensions) return;

        setCropPosition(clampCropPosition(
            drag.imageX + event.clientX - drag.pointerX,
            drag.imageY + event.clientY - drag.pointerY,
            { ...cropImageDimensions, scale: cropImageDimensions.scale * cropZoom },
        ));
    }

    function updateCropZoom(zoom: number) {
        if (!cropImageDimensions) return;

        const previousScale = cropImageDimensions.scale * cropZoom;
        const nextScale = cropImageDimensions.scale * zoom;
        const center = cropImageDimensions.viewSize / 2;
        const scaleRatio = nextScale / previousScale;
        const dimensionsAtZoom = { ...cropImageDimensions, scale: nextScale };

        setCropPosition((position) => clampCropPosition(
            center - (center - position.x) * scaleRatio,
            center - (center - position.y) * scaleRatio,
            dimensionsAtZoom,
        ));
        setCropZoom(zoom);
    }

    function clampCropPosition(x: number, y: number, dimensions: CropImageDimensions) {
        const renderedWidth = dimensions.width * dimensions.scale;
        const renderedHeight = dimensions.height * dimensions.scale;
        return {
            x: Math.min(0, Math.max(dimensions.viewSize - renderedWidth, x)),
            y: Math.min(0, Math.max(dimensions.viewSize - renderedHeight, y)),
        };
    }

    async function confirmCrop() {
        const image = cropImageElement.current;
        if (!image || !cropImageDimensions) return;

        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext("2d");
        if (!context) {
            showSystemMessage("Could not prepare the cropped image. Please try again.", "error");
            return;
        }

        const effectiveScale = cropImageDimensions.scale * cropZoom;
        const sourceSize = cropImageDimensions.viewSize / effectiveScale;
        context.drawImage(
            image,
            -cropPosition.x / effectiveScale,
            -cropPosition.y / effectiveScale,
            sourceSize,
            sourceSize,
            0,
            0,
            canvas.width,
            canvas.height,
        );

        try {
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (result) => result
                        ? resolve(result)
                        : reject(new Error("Could not create the cropped image.")),
                    "image/jpeg",
                    0.92,
                );
            });
            if (blob.size > 2 * 1024 * 1024) {
                showSystemMessage("The cropped image is too large. Please choose a smaller image.", "error");
                return;
            }

            const baseName = cropSourceName.replace(/\.[^.]+$/, "") || "profile-picture";
            const croppedFile = new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
            setPictureFile(croppedFile);
            setOriginalPictureFile(cropOriginalFile.current);
            setPicturePreviewUrl(URL.createObjectURL(croppedFile));
            previousPictureSelection.current = null;
            cropOriginalFile.current = null;
            setCropSourceUrl(null);
            setCropImageDimensions(null);
        } catch (cropError) {
            showSystemMessage(
                cropError instanceof Error
                    ? cropError.message
                    : "Could not crop the image. Please try again.",
                "error",
            );
        }
    }

    function cancelCrop() {
        setCropSourceUrl(null);
        setCropImageDimensions(null);
        setCropSourceName("");
        setCropPosition({ x: 0, y: 0 });
        setCropZoom(1);
        if (previousPictureSelection.current) {
            setPictureFile(previousPictureSelection.current.file);
            setPicturePreviewUrl(previousPictureSelection.current.previewUrl);
            setOriginalPictureFile(previousPictureSelection.current.originalFile);
        } else {
            setPictureFile(null);
            setPicturePreviewUrl(null);
            setOriginalPictureFile(null);
            if (pictureInput.current) pictureInput.current.value = "";
        }
        previousPictureSelection.current = null;
        cropOriginalFile.current = null;
    }

    if (!profile) {
        return <p role="status">Loading profile...</p>;
    }

    return (
        <section className="profile-form mx-auto max-w-xl space-y-5 p-6">
            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="cursor-pointer rounded border px-4 py-2 transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                    Go Back
                </button>
                <button
                    type="submit"
                    form="profile-form"
                    disabled={saving || !hasChanges}
                    className={`rounded px-4 py-2 font-semibold text-white ${
                        saving || !hasChanges
                            ? "cursor-not-allowed bg-gray-400"
                            : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>
            <form id="profile-form" onSubmit={saveProfile} className="space-y-4">
                <div className="flex flex-col items-start gap-4 sm:flex-row">
                    {(picturePreviewUrl || profile.profile_picture) && (
                        <button
                            type="button"
                            aria-label="Change profile picture"
                            onClick={() => void openExistingPictureCrop()}
                            className="group relative block h-32 w-32 shrink-0 cursor-pointer overflow-hidden border-2 border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={picturePreviewUrl ?? profile.profile_picture}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-blue-600/60 text-lg font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                                Change
                            </span>
                        </button>
                    )}
                    <label className="block min-w-0 flex-1">
                        Profile picture (PNG or JPEG, max 2 MB)
                        <input
                            ref={pictureInput}
                            type="file"
                            accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                            onChange={(event) => handlePictureSelection(
                                event.currentTarget.files?.[0] ?? null,
                                event.currentTarget,
                            )}
                            className="mt-1 block w-full rounded border border-gray-400 p-2 file:mr-3 file:cursor-pointer file:rounded file:border-2 file:border-gray-600 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-gray-900 hover:file:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                        />
                        {pictureFile && <span className="mt-1 block">{pictureFile.name}</span>}
                    </label>
                </div>
                <label className="block">
                    Username
                    <input
                        type="text"
                        autoComplete="username"
                        required
                        value={profile.username}
                        onChange={(event) => updateField("username", event.target.value)}
                        className={`mt-1 block w-full rounded border p-2 ${
                            usernameCheckState === "available"
                                ? "border-green-400 bg-green-50"
                                : usernameCheckState === "taken"
                                    ? "border-red-400 bg-red-50"
                                    : ""
                        }`}
                    />
                    {usernameCheckState === "available" && (
                        <span className="mt-1 block text-sm text-green-700" role="status">
                            Username is available
                        </span>
                    )}
                    {usernameCheckState === "taken" && (
                        <span className="mt-1 block text-sm text-red-700" role="status">
                            Username already taken
                        </span>
                    )}
                </label>
                <label className="block">
                    Display Name
                    <input
                        type="text"
                        autoComplete="name"
                        value={profile.display_name ?? ""}
                        onChange={(event) => updateField("display_name", event.target.value)}
                        className="mt-1 block w-full rounded border p-2"
                    />
                </label>
                <label className="block">
                    Email
                    <input
                        type="email"
                        autoComplete="email"
                        required
                        value={profile.email}
                        onChange={(event) => updateField("email", event.target.value)}
                        className="mt-1 block w-full rounded border p-2"
                    />
                </label>
                <div className="block">
                    <label htmlFor="current-password-display">Password</label>
                    <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                        <input
                            id="current-password-display"
                            type="password"
                            autoComplete="current-password"
                            value={"*".repeat(maskedPasswordLength)}
                            readOnly
                            aria-describedby="password-display-help"
                            className="block min-w-0 flex-1 rounded border bg-gray-100 p-2 text-gray-500"
                        />
                        <button
                            type="button"
                            onClick={togglePasswordChange}
                            className="shrink-0 cursor-pointer rounded border px-4 py-2 transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                        >
                            {passwordChangeEnabled ? "Cancel" : "Change Password"}
                        </button>
                    </div>
                    <span id="password-display-help" className="sr-only">
                        The current password is stored securely and cannot be retrieved.
                    </span>
                    {passwordChangeEnabled && (
                        <div className="mt-3 space-y-3">
                            <label className="block">
                                New password
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    value={newPassword}
                                    onChange={(event) => {
                                        setNewPassword(event.target.value);
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            void savePassword();
                                        }
                                    }}
                                    className="mt-1 block w-full rounded border p-2"
                                />
                            </label>
                            <label className="block">
                                Confirm new password
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    value={confirmNewPassword}
                                    onChange={(event) => {
                                        setConfirmNewPassword(event.target.value);
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            void savePassword();
                                        }
                                    }}
                                    className="mt-1 block w-full rounded border p-2"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() => void savePassword()}
                                disabled={
                                    passwordSaving ||
                                    !newPassword ||
                                    newPassword !== confirmNewPassword
                                }
                                className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                            >
                                {passwordSaving ? "Updating password..." : "Save Password"}
                            </button>
                        </div>
                    )}
                </div>
                <div className="block">
                    Bio
                    <div role="toolbar" aria-label="Bio formatting" className="mt-1 flex gap-2">
                        <button
                            type="button"
                            aria-label="Bold"
                            aria-pressed={activeFormats.bold}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => formatBio("bold")}
                            className={formatButtonClass("bold", "font-bold")}
                        >
                            B
                        </button>
                        <button
                            type="button"
                            aria-label="Italic"
                            aria-pressed={activeFormats.italic}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => formatBio("italic")}
                            className={formatButtonClass("italic", "italic")}
                        >
                            I
                        </button>
                        <button
                            type="button"
                            aria-label="Underline"
                            aria-pressed={activeFormats.underline}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => formatBio("underline")}
                            className={formatButtonClass("underline", "underline")}
                        >
                            U
                        </button>
                    </div>
                    <div
                        ref={bioEditor}
                        role="textbox"
                        aria-label="Bio"
                        aria-multiline="true"
                        contentEditable
                        suppressContentEditableWarning
                        onInput={updateBioFromEditor}
                        onKeyUp={() => {
                            setActiveFormats({
                                bold: document.queryCommandState("bold"),
                                italic: document.queryCommandState("italic"),
                                underline: document.queryCommandState("underline"),
                            });
                        }}
                        onMouseUp={() => {
                            setActiveFormats({
                                bold: document.queryCommandState("bold"),
                                italic: document.queryCommandState("italic"),
                                underline: document.queryCommandState("underline"),
                            });
                        }}
                        className="mt-1 min-h-28 w-full rounded border p-2"
                    />
                    <p className="mt-1 text-sm text-gray-600">
                        {bioLength}/500 characters
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => void handleDeleteAccount()}
                    disabled={deletingAccount}
                    className="event-remove-button cursor-pointer rounded border border-red-600 bg-transparent px-3 py-2 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                    {deletingAccount ? "Deleting..." : "Delete account"}
                </button>
            </form>
            {cropSourceUrl && (
                <div
                    role="presentation"
                    className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4"
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="crop-picture-title"
                        className="profile-crop-dialog w-full max-w-md space-y-4 rounded-lg bg-white p-6 text-gray-900 shadow-xl"
                    >
                        <h2 id="crop-picture-title" className="text-xl font-semibold">
                            Crop profile picture
                        </h2>
                        <p className="text-sm text-gray-600">
                            {choosingNewPicture
                                ? "Choose an image to use as your profile picture."
                                : "Drag the image to choose a square crop."}
                        </p>
                        {choosingNewPicture ? (
                            <div
                                role="button"
                                tabIndex={0}
                                aria-label="Choose a new profile picture by dropping an image or clicking to browse"
                                onClick={() => pictureInput.current?.click()}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        pictureInput.current?.click();
                                    }
                                }}
                                onDragEnter={(event) => {
                                    event.preventDefault();
                                    setIsPictureDragOver(true);
                                }}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    setIsPictureDragOver(true);
                                }}
                                onDragLeave={(event) => {
                                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                        setIsPictureDragOver(false);
                                    }
                                }}
                                onDrop={handlePictureDrop}
                                className={`mx-auto flex aspect-square w-full max-w-[320px] cursor-pointer items-center justify-center p-8 text-center outline-offset-2 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${
                                    isPictureDragOver
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-300 text-gray-800 hover:bg-gray-400"
                                }`}
                            >
                                Drag and drop your image, or click this square!
                            </div>
                        ) : (
                        <div
                            ref={cropViewport}
                            tabIndex={0}
                            aria-label="Square image crop. Drag the image or use the arrow keys to adjust it."
                            className="relative mx-auto aspect-square w-full max-w-[320px] touch-none cursor-grab overflow-hidden bg-black outline-offset-2 active:cursor-grabbing"
                            onPointerDown={(event) => {
                                if (!cropImageDimensions) return;
                                cropDrag.current = {
                                    pointerId: event.pointerId,
                                    pointerX: event.clientX,
                                    pointerY: event.clientY,
                                    imageX: cropPosition.x,
                                    imageY: cropPosition.y,
                                };
                                event.currentTarget.setPointerCapture(event.pointerId);
                            }}
                            onPointerMove={moveCropImage}
                            onPointerUp={() => {
                                cropDrag.current = null;
                            }}
                            onPointerCancel={() => {
                                cropDrag.current = null;
                            }}
                            onKeyDown={(event) => {
                                if (!cropImageDimensions) return;
                                const movement = event.shiftKey ? 25 : 10;
                                const offsets: Record<string, [number, number]> = {
                                    ArrowLeft: [movement, 0],
                                    ArrowRight: [-movement, 0],
                                    ArrowUp: [0, movement],
                                    ArrowDown: [0, -movement],
                                };
                                const offset = offsets[event.key];
                                if (offset) {
                                    event.preventDefault();
                                    setCropPosition((position) => clampCropPosition(
                                        position.x + offset[0],
                                        position.y + offset[1],
                                        {
                                            ...cropImageDimensions,
                                            scale: cropImageDimensions.scale * cropZoom,
                                        },
                                    ));
                                }
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                ref={cropImageElement}
                                src={cropSourceUrl}
                                alt="Drag to adjust the square crop"
                                draggable={false}
                                onLoad={initializeCrop}
                                onError={() => showSystemMessage("Upload a valid PNG or JPEG image.", "error")}
                                className="pointer-events-none absolute max-w-none select-none"
                                style={cropImageDimensions ? {
                                    left: cropPosition.x,
                                    top: cropPosition.y,
                                    width: cropImageDimensions.width * cropImageDimensions.scale * cropZoom,
                                    height: cropImageDimensions.height * cropImageDimensions.scale * cropZoom,
                                } : { visibility: "hidden" }}
                            />
                        </div>
                        )}
                        {!choosingNewPicture && (
                            <label className="block text-sm">
                                Zoom
                                <input
                                    type="range"
                                    min="1"
                                    max="3"
                                    step="0.05"
                                    value={cropZoom}
                                    onChange={(event) => updateCropZoom(Number(event.target.value))}
                                    disabled={!cropImageDimensions}
                                    aria-label="Zoom profile picture"
                                    className="mt-2 block w-full accent-blue-600"
                                />
                                <span className="text-gray-600">{cropZoom.toFixed(1)}×</span>
                            </label>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            {!choosingNewPicture && (
                                <button
                                    type="button"
                                    onClick={chooseNewPicture}
                                    className="mr-auto rounded border border-gray-400 px-4 py-2 hover:bg-gray-100"
                                >
                                    Choose new picture
                                </button>
                            )}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={cancelCrop}
                                    className="rounded border border-gray-400 px-4 py-2 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmCrop}
                                    disabled={!cropImageDimensions}
                                    className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </section>
    );
}
