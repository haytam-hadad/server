export const createUserValidationSchema = {
    username: {
        in: ["body"],
        isString: true,
        trim: true,
        notEmpty: { errorMessage: "Username is required" },
    },
    displayname: {
        in: ["body"],
        optional: true,
        isString: true,
        trim: true,
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
    bio: {
        in: ["body"],
        optional: true,
        isString: true,
        trim: true,
    },
    phone: {
        in: ["body"],
        optional: true,
        isMobilePhone: { options: ["any"], errorMessage: "Invalid phone number" },
    },
    website: {
        in: ["body"],
        optional: true,
        isURL: { errorMessage: "Invalid website URL" },
    },
    gender: {
        in: ["body"],
        optional: true,
        isString: true,
        trim: true,
    },
    country: {
        in: ["body"],
        optional: true,
        isString: true,
        trim: true,
    },
    city: {
        in: ["body"],
        optional: true,
        isString: true,
        trim: true,
    },
    zipCode: {
        in: ["body"],
        optional: true,
        isPostalCode: { options: ["any"], errorMessage: "Invalid zip code" },
    },
    birthdate: {
        in: ["body"],
        custom: {
            options: (value) => {
                if (!value) throw new Error("Birthdate is required");

                // Allow both Date objects and ISO 8601 strings
                if (!(value instanceof Date) && isNaN(Date.parse(value))) {
                    throw new Error("Invalid date format (must be YYYY-MM-DD or a valid Date object)");
                }

                return true;
            },
        },
        toDate: true, 
    },
    profilePicture: {
        in: ["body"],
        optional: true,
        isURL: { errorMessage: "Invalid profile picture URL" },
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
