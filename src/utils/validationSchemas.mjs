export const createUserValidationSchema = {
    username: {
        in: ["body"],
        isString: true,
        trim: true,
        notEmpty: {
            errorMessage: "Username is required",
        },
    },
    email: {
        in: ["body"],
        isEmail: true,
        normalizeEmail: true,
        errorMessage: "Invalid email",
    },
    password: {
        in: ["body"],
        isLength: {
            options: { min: 6 },
            errorMessage: "Password must be at least 6 characters long",
        },
    },
};
