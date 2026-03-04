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
import { Checkbox } from "@/components/ui/checkbox";
import {
    Loader2,
    Mail,
    Lock,
    Phone,
    ShieldCheck,
    ArrowLeft,
    Scan,
    KeyRound,
} from "lucide-react";
// @ts-ignore — react-webcam doesn't ship types
import Webcam from "react-webcam";
import { useAuth } from "@/context/AuthContext";
import api from "@/api/axios";

// ─── Validation Schemas ───────────────────────────────────────────────

const staffSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email." }),
    password: z
        .string()
        .min(1, { message: "Password is required." }),
    rememberMe: z.boolean().default(false).optional(),
});

const phoneSchema = z.object({
    phone_number: z
        .string()
        .min(10, { message: "Please enter a valid phone number." }),
});

const otpSchema = z.object({
    otp: z
        .string()
        .length(4, { message: "OTP must be 4 digits." }),
});

type StaffFormValues = z.infer<typeof staffSchema>;
type PhoneFormValues = z.infer<typeof phoneSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

// ─── Types ────────────────────────────────────────────────────────────

type LoginStep = "main" | "visitor-methods" | "otp" | "face" | "staff";

interface LoginProps {
    onToggle: () => void;
}

// ─── Animation helpers ────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────

export default function Login({ onToggle }: LoginProps) {
    const [step, setStep] = React.useState<LoginStep>("main");
    const [phoneNumber, setPhoneNumber] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [timer, setTimer] = React.useState(0);
    const [cameraReady, setCameraReady] = React.useState(false);
    const [cameraError, setCameraError] = React.useState("");
    const { login } = useAuth();
    const webcamRef = React.useRef<any>(null);

    const videoConstraints = {
        width: 640,
        height: 480,
        facingMode: "user",
    };

    // Staff login form
    const staffForm = useForm<StaffFormValues>({
        resolver: zodResolver(staffSchema),
        defaultValues: { email: "", password: "", rememberMe: false },
    });

    // Phone form
    const phoneForm = useForm<PhoneFormValues>({
        resolver: zodResolver(phoneSchema),
        defaultValues: { phone_number: "" },
    });

    // OTP form
    const otpForm = useForm<OtpFormValues>({
        resolver: zodResolver(otpSchema),
        defaultValues: { otp: "" },
    });

    // ─── Timer ───────────────────────────────

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

    // ─── Handlers ────────────────────────────

    const handleStaffLogin = async (data: StaffFormValues) => {
        setIsLoading(true);
        setError("");
        try {
            const response = await api.post("/auth/login/staff", {
                email: data.email,
                password: data.password,
            });
            login(
                {
                    id: response.data.user_id,
                    full_name: response.data.full_name,
                    email: data.email,
                    role: response.data.role,
                },
                response.data.access_token,
                response.data.password_reset_required
            );
        } catch (err: any) {
            setError(err.response?.data?.detail || "Login failed. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendOtp = async (data: PhoneFormValues) => {
        setIsLoading(true);
        setError("");
        try {
            setPhoneNumber(data.phone_number);
            await api.post("/auth/login/request", { phone_number: data.phone_number });
            setStep("otp");
            startTimer();
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to send OTP");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (data: OtpFormValues) => {
        setIsLoading(true);
        setError("");
        try {
            const response = await api.post("/auth/login/verify", {
                phone_number: phoneNumber,
                otp: data.otp,
            });
            login(
                {
                    id: response.data.user_id,
                    full_name: response.data.full_name,
                    phone_number: phoneNumber,
                    role: response.data.role,
                },
                response.data.access_token
            );
        } catch (err: any) {
            setError(err.response?.data?.detail || "Invalid OTP");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFaceLogin = React.useCallback(async () => {
        const pn = phoneNumber || phoneForm.getValues("phone_number");
        if (!pn) {
            setError("Phone number is required for face verification");
            return;
        }
        const imageSrc = webcamRef.current?.getScreenshot();
        if (!imageSrc) {
            setError("Could not capture face");
            return;
        }
        setIsLoading(true);
        setError("");
        try {
            const response = await api.post("/auth/login/face", {
                phone_number: pn,
                face_image: imageSrc,
            });
            login(
                {
                    id: response.data.user_id,
                    full_name: response.data.full_name,
                    phone_number: pn,
                    role: response.data.role,
                },
                response.data.access_token
            );
        } catch (err: any) {
            setError(err.response?.data?.detail || "Face recognition failed");
        } finally {
            setIsLoading(false);
        }
    }, [phoneNumber, phoneForm, login]);

    const handleResendOtp = async () => {
        if (timer > 0) return;
        setError("");
        try {
            await api.post("/auth/login/request", { phone_number: phoneNumber });
            startTimer();
        } catch {
            setError("Failed to resend OTP");
        }
    };

    // ─── Step titles ─────────────────────────

    const stepInfo: Record<LoginStep, { title: string; description: string }> = {
        main: {
            title: "Welcome Back!",
            description: "Sign in to the Visitor Management System",
        },
        "visitor-methods": {
            title: "Visitor Login",
            description: "Choose your preferred verification method",
        },
        otp: {
            title: "Verify Identity",
            description: `Enter the 4-digit code sent to ${phoneNumber}`,
        },
        face: {
            title: "Face Recognition",
            description: "Align your face within the frame to verify",
        },
        staff: {
            title: "Staff Portal",
            description: "Authenticate with your staff credentials",
        },
    };

    const currentStep = stepInfo[step];

    // ─── Render ──────────────────────────────

    return (
        <div className="relative flex min-h-screen w-full flex-col md:flex-row">
            {/* Left Panel: Form */}
            <div className="flex w-full flex-col items-center justify-center bg-background p-6 sm:p-8 md:w-1/2">
                <div className="w-full max-w-md">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col gap-6"
                    >
                        {/* Logo */}
                        <motion.div variants={itemVariants} className="mb-2">
                            <h1 className="text-xl font-bold tracking-wider text-primary">
                                SmartVisit
                            </h1>
                        </motion.div>

                        {/* Step header */}
                        <motion.div variants={itemVariants} className="text-left">
                            <h2 className="text-2xl font-semibold tracking-tight">
                                {currentStep.title}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {currentStep.description}
                            </p>
                        </motion.div>

                        {/* Error */}
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
                        </AnimatePresence>

                        {/* ───── Main step: Staff email/password ───── */}
                        <AnimatePresence mode="wait">
                            {step === "main" && (
                                <motion.div
                                    key="main"
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.25 }}
                                >
                                    <Form {...staffForm}>
                                        <form
                                            onSubmit={staffForm.handleSubmit(handleStaffLogin)}
                                            className="space-y-4"
                                        >
                                            <FormField
                                                control={staffForm.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Email Address</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="admin@vms.com"
                                                                {...field}
                                                                disabled={isLoading}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={staffForm.control}
                                                name="password"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Password</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="password"
                                                                placeholder="••••••••••••"
                                                                {...field}
                                                                disabled={isLoading}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="flex items-center justify-between">
                                                <FormField
                                                    control={staffForm.control}
                                                    name="rememberMe"
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value}
                                                                    onCheckedChange={field.onChange}
                                                                    disabled={isLoading}
                                                                />
                                                            </FormControl>
                                                            <div className="space-y-1 leading-none">
                                                                <FormLabel className="font-normal">
                                                                    Remember Me
                                                                </FormLabel>
                                                            </div>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <Button
                                                type="submit"
                                                className="w-full"
                                                disabled={isLoading}
                                            >
                                                {isLoading && (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                )}
                                                Sign In
                                            </Button>
                                        </form>
                                    </Form>

                                    {/* Visitor login switch */}
                                    <div className="mt-6 flex flex-col items-center gap-3">
                                        <div className="relative w-full">
                                            <div className="absolute inset-0 flex items-center">
                                                <span className="w-full border-t" />
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-background px-2 text-muted-foreground">
                                                    Or continue as
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline"
                                            className="w-full gap-2"
                                            onClick={() => {
                                                setError("");
                                                setStep("visitor-methods");
                                            }}
                                        >
                                            <Phone className="h-4 w-4" />
                                            Visitor Login
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ───── Visitor method selection ───── */}
                            {step === "visitor-methods" && (
                                <motion.div
                                    key="visitor-methods"
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.25 }}
                                    className="space-y-4"
                                >
                                    <Form {...phoneForm}>
                                        <form
                                            onSubmit={phoneForm.handleSubmit(handleSendOtp)}
                                            className="space-y-4"
                                        >
                                            <FormField
                                                control={phoneForm.control}
                                                name="phone_number"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Registered Phone Number</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="+91..."
                                                                {...field}
                                                                disabled={isLoading}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="flex h-auto flex-col gap-2 py-4"
                                                    disabled={isLoading}
                                                    onClick={() => {
                                                        const pn = phoneForm.getValues("phone_number");
                                                        if (!pn || pn.length < 10) {
                                                            phoneForm.setError("phone_number", {
                                                                message: "Enter phone number first",
                                                            });
                                                            return;
                                                        }
                                                        setPhoneNumber(pn);
                                                        setError("");
                                                        setStep("face");
                                                    }}
                                                >
                                                    <Scan className="h-6 w-6 text-primary" />
                                                    <span className="text-xs">Face Identity</span>
                                                </Button>

                                                <Button
                                                    type="submit"
                                                    variant="outline"
                                                    className="flex h-auto flex-col gap-2 py-4"
                                                    disabled={isLoading}
                                                >
                                                    {isLoading ? (
                                                        <Loader2 className="h-6 w-6 animate-spin" />
                                                    ) : (
                                                        <KeyRound className="h-6 w-6 text-primary" />
                                                    )}
                                                    <span className="text-xs">Mobile OTP</span>
                                                </Button>
                                            </div>
                                        </form>
                                    </Form>

                                    <Button
                                        variant="ghost"
                                        className="w-full gap-2 text-muted-foreground"
                                        onClick={() => {
                                            setError("");
                                            setStep("main");
                                        }}
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to Staff Login
                                    </Button>
                                </motion.div>
                            )}

                            {/* ───── OTP Verification ───── */}
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
                                                {isLoading && (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                )}
                                                Verify Identity
                                            </Button>

                                            <div className="flex items-center justify-between text-sm">
                                                {timer > 0 ? (
                                                    <p className="text-muted-foreground">
                                                        Resend in <strong>{timer}s</strong>
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
                                                <button
                                                    type="button"
                                                    className="font-medium text-muted-foreground hover:text-foreground hover:underline"
                                                    onClick={() => {
                                                        setError("");
                                                        setStep("visitor-methods");
                                                    }}
                                                >
                                                    Switch Method
                                                </button>
                                            </div>
                                        </form>
                                    </Form>
                                </motion.div>
                            )}

                            {/* ───── Face Login ───── */}
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
                                            videoConstraints={videoConstraints}
                                            onUserMedia={() => { setCameraReady(true); setCameraError(""); }}
                                            onUserMediaError={(err: any) => {
                                                setCameraReady(false);
                                                const msg = typeof err === "string" ? err : err?.message || "Camera access denied";
                                                setCameraError(
                                                    msg.includes("SSL") || msg.includes("secure") || msg.includes("https")
                                                        ? "Camera requires HTTPS. Please use a secure connection."
                                                        : `Camera error: ${msg}`
                                                );
                                            }}
                                            width={640}
                                            height={480}
                                            style={{ width: "100%", height: "auto", transform: "scaleX(-1)", display: "block" }}
                                        />
                                        {/* Loading / error overlay */}
                                        {!cameraReady && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                                                {cameraError ? (
                                                    <div className="px-6 text-center">
                                                        <Scan className="mx-auto mb-3 h-10 w-10 text-destructive opacity-80" />
                                                        <p className="text-sm text-red-300">{cameraError}</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                                                        <p className="text-sm text-gray-300">Initializing camera…</p>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        {/* Scanning line */}
                                        {cameraReady && (
                                            <div className="absolute inset-0 pointer-events-none">
                                                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{ top: "50%" }} />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-center text-sm text-muted-foreground">
                                        Align your face within the frame
                                    </p>

                                    <Button
                                        className="w-full"
                                        onClick={handleFaceLogin}
                                        disabled={isLoading || !cameraReady}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Comparing…
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck className="mr-2 h-4 w-4" />
                                                Verify Face
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        className="w-full gap-2 text-muted-foreground"
                                        onClick={() => {
                                            setError("");
                                            setCameraReady(false);
                                            setCameraError("");
                                            setStep("visitor-methods");
                                        }}
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to Selection
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Footer: create account */}
                        {(step === "main" || step === "visitor-methods") && (
                            <motion.p
                                variants={itemVariants}
                                className="px-8 text-center text-sm text-muted-foreground"
                            >
                                Don't have an account?{" "}
                                <button
                                    onClick={onToggle}
                                    className="font-medium text-primary hover:underline"
                                >
                                    Create one here
                                </button>
                                .
                            </motion.p>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Right Panel: Image */}
            <div className="relative hidden w-1/2 md:block">
                <img
                    src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200"
                    alt="Modern office building entrance"
                    className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                <div className="absolute bottom-12 left-12 right-12">
                    <h2 className="text-3xl font-bold text-white drop-shadow-lg">
                        Secure Visitor
                        <br />
                        Management
                    </h2>
                    <p className="mt-2 text-white/80 drop-shadow">
                        Streamlined check-in, real-time tracking, and complete visitor oversight.
                    </p>
                </div>
            </div>
        </div>
    );
}
