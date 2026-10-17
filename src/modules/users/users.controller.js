import { userModel } from "../../../db/models/users.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../../utilities/email.js";

const signup = async (req, res) => {
    try {
        let { name, email, password, role } = req.body;

        // Prevent direct admin registration
        if (role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Registration as admin is not allowed.",
            });
        }

        // Allow only participant/user and organizer roles
        if (!["user", "participant", "organizer"].includes(role)) {
            role = "user";
        }

        const existingUser = await userModel.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists with this email",
            });
        }

        const passwordHash = bcrypt.hashSync(password, 8);
        const verificationToken = crypto.randomBytes(32).toString("hex");

        const newUser = await userModel.create({
            name,
            email,
            passwordHash,
            role,
            status: "pending",
            verificationToken,
        });

        const deployHost =
            process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
        const baseUrl =
            process.env.BASE_URL || (deployHost ? `https://${deployHost}` : "");
        const verificationUrl =
            `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;

        await sendEmail({
            email: newUser.email,
            subject: "Email Verification - EventOps",
            html: `
                <h2>Welcome to EventOps, ${name}!</h2>
                <p>Please click the link below to verify your email and activate your account:</p>
                <a href="${verificationUrl}"
                   style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                   Verify Email
                </a>
            `,
        });

        return res.status(201).json({
            success: true,
            message:
                "User registered successfully. Please check your email to verify your account.",
            data: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                status: newUser.status,
            },
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Error in signup",
            error: err.message,
        });
    }
};

const verifyEmail = async (req, res) => {
    const FRONTEND_URL = process.env.FRONTEND_URL || "";
    const toResult = (status) =>
        res.redirect(`${FRONTEND_URL}/verified.html?status=${status}`);

    try {
        const { token } = req.query;

        if (!token) {
            return toResult("missing");
        }

        const user = await userModel.findOne({ verificationToken: token });

        if (!user) {
            return toResult("invalid");
        }

        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;

        // Keep organizers pending until the organizer approval process finishes
        if (user.role === "organizer") {
            user.status = "pending";
        } else {
            user.status = "approved";
        }

        await user.save();

        return toResult("success");
    } catch (err) {
        if (res.headersSent) return res.end();
        return toResult("error");
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userModel.findOne({ email }).select("+passwordHash");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const match = bcrypt.compareSync(password, user.passwordHash);

        if (!match) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (user.verificationToken) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email before logging in.",
            });
        }

        const verifiedOrganizerAwaitingApproval =
            user.role === "organizer" && user.status === "pending";

        if (user.status === "pending" && !verifiedOrganizerAwaitingApproval) {
            return res.status(403).json({
                success: false,
                message: "Your account is pending verification or approval.",
            });
        }

        if (user.status === "rejected") {
            return res.status(403).json({
                success: false,
                message: "Your account has been rejected.",
            });
        }

        if (user.status === "blocked") {
            return res.status(403).json({
                success: false,
                message: "Your account has been blocked. Contact support.",
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
            },
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Error in login",
            error: err.message,
        });
    }
};

const getProfile = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            data: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
                status: req.user.status,
            },
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Error fetching profile",
            error: err.message,
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name } = req.body;

        if (name) {
            req.user.name = name;
        }

        await req.user.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
                status: req.user.status,
            },
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Error updating profile",
            error: err.message,
        });
    }
};

export {
    signup,
    verifyEmail,
    login,
    getProfile,
    updateProfile,
};
