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

export const updateUserValidationSchema = {
    username: {
        in: ["body"],
        isString: true,
        trim: true,
        optional: { options: { nullable: true } },  // Allow empty or missing values
        isLength: {
            options: { min: 6 },
            errorMessage: "Username must be at least 6 characters long",
        },
        custom: {
            options: (value) => {
                if (value === "") {
                    throw new Error("Username cannot be empty");
                }
                return true;
            },
        },
    },
    email: {
        in: ["body"],
        isEmail: true,
        normalizeEmail: true,
        optional: { options: { nullable: true } },  // Allow empty or missing values
        errorMessage: "Invalid email",
        custom: {
            options: (value) => {
                if (value === "") {
                    throw new Error("Email cannot be empty");
                }
                return true;
            },
        },
    },
};
