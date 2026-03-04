"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Loader2,
    ArrowLeft,
    ArrowRight,
    Camera,
    UserPlus,
    Check,
} from "lucide-react";
// @ts-ignore
import Webcam from "react-webcam";
import api from "@/api/axios";

// ─── Schemas ──────────────────────────────────────────────────────────

const profileSchema = z.object({
    full_name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    phone_number: z
        .string()
        .min(10, { message: "Please enter a valid phone number." }),
    email: z.string().email().optional().or(z.literal("")),
});

const addressSchema = z.object({
    street: z.string().min(1, { message: "Street address is required." }),
    city: z.string().min(1, { message: "City is required." }),
    state: z.string().min(1, { message: "State is required." }),
    pincode: z
        .string()
        .min(5, { message: "Enter a valid pincode." })
        .max(6),
});

const otpSchema = z.object({
    otp: z.string().length(4, { message: "OTP must be 4 digits." }),
});

type ProfileValues = z.infer<typeof profileSchema>;
type AddressValues = z.infer<typeof addressSchema>;
type OtpValues = z.infer<typeof otpSchema>;

// ─── Types ────────────────────────────────────────────────────────────

type SignupStep = "profile" | "address" | "face" | "review" | "otp";

interface SignupProps {
    onToggle: () => void;
}

// ─── Animations ───────────────────────────────────────────────────────

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08 },
    },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const slideVariants = {
    enter: { x: 30, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -30, opacity: 0 },
};

// ─── Steps config ─────────────────────────────────────────────────────

const steps: { key: SignupStep; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "address", label: "Address" },
    { key: "face", label: "Photo" },
    { key: "review", label: "Verify" },
];

// ─── Component ────────────────────────────────────────────────────────

export default function Signup({ onToggle }: SignupProps) {
    const [step, setStep] = React.useState<SignupStep>("profile");
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [success, setSuccess] = React.useState("");
    const [faceImage, setFaceImage] = React.useState<string | null>(null);
    const [timer, setTimer] = React.useState(0);
    const webcamRef = React.useRef<any>(null);

    // Profile stored values (saved when stepping forward)
    const [profileData, setProfileData] = React.useState<ProfileValues>({
        full_name: "",
        phone_number: "",
        email: "",
    });
    const [addressData, setAddressData] = React.useState<AddressValues>({
        street: "",
        city: "",
        state: "",
        pincode: "",
    });

    const profileForm = useForm<ProfileValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: profileData,
    });

    const addressForm = useForm<AddressValues>({
        resolver: zodResolver(addressSchema),
        defaultValues: addressData,
    });

    const otpForm = useForm<OtpValues>({
        resolver: zodResolver(otpSchema),
        defaultValues: { otp: "" },
    });

    // Timer
    const startTimer = () => {
        setTimer(30);
        const interval = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Step index for progress
    const currentStepIndex = steps.findIndex((s) => s.key === step);

    // ─── Handlers ──────────────────────────────

    const onProfileNext = (data: ProfileValues) => {
        setProfileData(data);
        setError("");
        setStep("address");
    };

    const onAddressNext = (data: AddressValues) => {
        setAddressData(data);
        setError("");
        setStep("face");
    };

    const capturePhoto = React.useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setFaceImage(imageSrc);
            setStep("review");
        } else {
            setError("Could not capture face. Please try again.");
        }
    }, []);

    const handleSignup = async () => {
        setIsLoading(true);
        setError("");
        try {
            const payload = {
                full_name: profileData.full_name,
                phone_number: profileData.phone_number,
                email: profileData.email || undefined,
                address: {
                    street: addressData.street,
                    city: addressData.city,
                    state: addressData.state,
                    pincode: addressData.pincode,
                },
                face_image: faceImage,
            };
            await api.post("/auth/signup", payload);
            await api.post("/auth/send-otp", null, {
                params: { phone_number: profileData.phone_number },
            });
            setStep("otp");
            startTimer();
        } catch (err: any) {
            setError(err.response?.data?.detail || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (data: OtpValues) => {
        setIsLoading(true);
        setError("");
        try {
            await api.post("/auth/verify-otp", {
                phone_number: profileData.phone_number,
                otp: data.otp,
            });
            setSuccess("Verification successful! Redirecting to login…");
            setTimeout(onToggle, 2000);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Invalid OTP");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (timer > 0) return;
        setError("");
        try {
            await api.post("/auth/send-otp", null, {
                params: { phone_number: profileData.phone_number },
            });
            setSuccess("A new OTP has been sent!");
            startTimer();
        } catch {
            setError("Failed to resend OTP");
        }
    };

    // ─── Step info ──────────────────────────────

    const stepInfo: Record<SignupStep, { title: string; description: string }> = {
        profile: { title: "Create Account", description: "Let's start with your basic information" },
        address: { title: "Your Address", description: "Where can we reach you?" },
        face: { title: "Face Capture", description: "Take a photo for identity verification" },
        review: { title: "Review & Register", description: "Confirm your details and register" },
        otp: { title: "Verify Phone", description: `We've sent a 4-digit code to ${profileData.phone_number}` },
    };

    const currentInfo = stepInfo[step];

    // ─── Render ──────────────────────────────

    return (
        <div className="relative flex min-h-screen w-full flex-col md:flex-row">
            {/* Left Panel */}
            <div className="flex w-full flex-col items-center justify-center bg-background p-6 sm:p-8 md:w-1/2">
                <div className="w-full max-w-md">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col gap-5"
                    >
                        {/* Logo */}
                        <motion.div variants={itemVariants}>
                            <h1 className="text-xl font-bold tracking-wider text-primary">
                                SmartVisit
                            </h1>
                        </motion.div>

                        {/* Step progress */}
                        {step !== "otp" && (
                            <motion.div variants={itemVariants} className="flex items-center gap-2">
                                {steps.map((s, i) => (
                                    <React.Fragment key={s.key}>
                                        <div
                                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${i < currentStepIndex
                                                ? "bg-primary text-primary-foreground"
                                                : i === currentStepIndex
                                                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                                                    : "bg-muted text-muted-foreground"
                                                }`}
                                        >
                                            {i < currentStepIndex ? (
                                                <Check className="h-4 w-4" />
                                            ) : (
                                                i + 1
                                            )}
                                        </div>
                                        {i < steps.length - 1 && (
                                            <div
                                                className={`h-0.5 flex-1 rounded-full transition-all ${i < currentStepIndex ? "bg-primary" : "bg-muted"
                                                    }`}
                                            />
                                        )}
                                    </React.Fragment>
                                ))}
                            </motion.div>
                        )}

                        {/* Title */}
                        <motion.div variants={itemVariants} className="text-left">
                            <h2 className="text-2xl font-semibold tracking-tight">
                                {currentInfo.title}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {currentInfo.description}
                            </p>
                        </motion.div>

                        {/* Error / Success */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                                >
                                    {error}
                                </motion.div>
                            )}
                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700"
                                >
                                    {success}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence mode="wait">
                            {/* ── Profile step ── */}
                            {step === "profile" && (
                                <motion.div
                                    key="profile"
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.25 }}
                                >
                                    <Form {...profileForm}>
                                        <form
                                            onSubmit={profileForm.handleSubmit(onProfileNext)}
                                            className="space-y-4"
                                        >
                                            <FormField
                                                control={profileForm.control}
                                                name="full_name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Full Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="John Doe" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={profileForm.control}
                                                name="phone_number"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Phone Number</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="+91..." {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={profileForm.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Email{" "}
                                                            <span className="text-muted-foreground font-normal">
                                                                (optional)
                                                            </span>
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="john@example.com"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <Button type="submit" className="w-full gap-2">
                                                Next: Address
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </form>
                                    </Form>
                                </motion.div>
                            )}

                            {/* ── Address step ── */}
                            {step === "address" && (
                                <motion.div
                                    key="address"
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.25 }}
                                >
                                    <Form {...addressForm}>
                                        <form
                                            onSubmit={addressForm.handleSubmit(onAddressNext)}
                                            className="space-y-4"
                                        >
                                            <FormField
                                                control={addressForm.control}
                                                name="street"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Street Address</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="123 Main St" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <FormField
                                                    control={addressForm.control}
                                                    name="city"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>City</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Mumbai" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={addressForm.control}
                                                    name="state"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>State</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Maharashtra" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <FormField
                                                control={addressForm.control}
                                                name="pincode"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Pincode</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="400001"
                                                                maxLength={6}
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="flex gap-3">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="flex-1"
                                                    onClick={() => setStep("profile")}
                                                >
                                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                                    Back
                                                </Button>
                                                <Button type="submit" className="flex-1 gap-2">
                                                    Next: Photo
                                                    <ArrowRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </form>
                                    </Form>
                                </motion.div>
                            )}

                            {/* ── Face capture step ── */}
                            {step === "face" && (
                                <motion.div
                                    key="face"
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.25 }}
                                    className="space-y-4"
                                >
                                    <div className="relative overflow-hidden rounded-lg border-2 border-primary/20 bg-black">
                                        <Webcam
                                            audio={false}
                                            ref={webcamRef}
                                            screenshotFormat="image/jpeg"
                                            className="aspect-[4/3] w-full object-cover"
                                            style={{ transform: "scaleX(-1)" }}
                                        />
                                    </div>
                                    <p className="text-center text-sm text-muted-foreground">
                                        Position your face in the center and click capture
                                    </p>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setStep("address")}
                                        >
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Back
                                        </Button>
                                        <Button className="flex-1 gap-2" onClick={capturePhoto}>
                                            <Camera className="h-4 w-4" />
                                            Capture Face
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── Review step ── */}
                            {step === "review" && (
                                <motion.div
                                    key="review"
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.25 }}
                                    className="space-y-4"
                                >
                                    {faceImage && (
                                        <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border-4 border-primary/20">
                                            <img
                                                src={faceImage}
                                                alt="Face capture"
                                                className="h-full w-full object-cover"
                                                style={{ transform: "scaleX(-1)" }}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-3 rounded-lg border bg-muted/50 p-4 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Name</span>
                                            <span className="font-medium">{profileData.full_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Phone</span>
                                            <span className="font-medium">{profileData.phone_number}</span>
                                        </div>
                                        {profileData.email && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Email</span>
                                                <span className="font-medium">{profileData.email}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Address</span>
                                            <span className="text-right font-medium">
                                                {addressData.street}, {addressData.city},{" "}
                                                {addressData.pincode}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setStep("face")}
                                        >
                                            Retake
                                        </Button>
                                        <Button
                                            className="flex-1 gap-2"
                                            onClick={handleSignup}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Processing…
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="h-4 w-4" />
                                                    Register & Verify
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── OTP step ── */}
                            {step === "otp" && (
                                <motion.div
                                    key="otp"
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.25 }}
                                >
                                    <Form {...otpForm}>
                                        <form
                                            onSubmit={otpForm.handleSubmit(handleVerifyOtp)}
                                            className="space-y-4"
                                        >
                                            <FormField
                                                control={otpForm.control}
                                                name="otp"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Enter 4-digit OTP</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="0000"
                                                                maxLength={4}
                                                                className="text-center text-2xl tracking-[0.5em]"
                                                                {...field}
                                                                disabled={isLoading}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <Button
                                                type="submit"
                                                className="w-full"
                                                disabled={isLoading}
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Verifying…
                                                    </>
                                                ) : (
                                                    "Verify & Complete"
                                                )}
                                            </Button>

                                            <div className="flex justify-center text-sm">
                                                {timer > 0 ? (
                                                    <p className="text-muted-foreground">
                                                        Resend OTP in <strong>{timer}s</strong>
                                                    </p>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="font-medium text-primary hover:underline"
                                                        onClick={handleResendOtp}
                                                    >
                                                        Resend OTP
                                                    </button>
                                                )}
                                            </div>
                                        </form>
                                    </Form>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Footer */}
                        <motion.p
                            variants={itemVariants}
                            className="px-8 text-center text-sm text-muted-foreground"
                        >
                            Already have an account?{" "}
                            <button
                                onClick={onToggle}
                                className="font-medium text-primary hover:underline"
                            >
                                Sign in
                            </button>
                        </motion.p>
                    </motion.div>
                </div>
            </div>

            {/* Right Panel: Image */}
            <div className="relative hidden w-1/2 md:block">
                <img
                    src="https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&q=80&w=1200"
                    alt="Modern corporate workspace"
                    className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                <div className="absolute bottom-12 left-12 right-12">
                    <h2 className="text-3xl font-bold text-white drop-shadow-lg">
                        Join Us Today
                    </h2>
                    <p className="mt-2 text-white/80 drop-shadow">
                        Register once and enjoy seamless visitor check-in for all your visits.
                    </p>
                </div>
            </div>
        </div>
    );
}
